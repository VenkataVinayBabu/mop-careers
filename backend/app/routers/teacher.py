"""Teacher workspace. Admins may use these endpoints too (they can do everything);
teachers are restricted to their assigned batches by assert_batch_access.
"""
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import NOTES_DIR
from app.curriculum import batch_total_days
from app.database import get_db
from app.deps import assert_batch_access, require_staff, teacher_batch_ids
from app.milestones import sync_curriculum_milestones
from app.models import (
    DAY_COMPLETED,
    ROLE_ADMIN,
    ROLE_STUDENT,
    Assignment,
    AssignmentSubmission,
    Attendance,
    Batch,
    CurriculumDay,
    TeacherBatch,
    User,
)
from app.schemas import (
    AssignmentCreate,
    AssignmentOut,
    AssignmentProgressRow,
    AssignmentUpdate,
    AttendanceBulkUpdate,
    AttendanceRow,
    BatchOut,
    BatchSummary,
    CurriculumDayOut,
    CurriculumDayUpdate,
    MessageResponse,
    StudentProgressRow,
    TeacherBrief,
)

router = APIRouter(prefix="/teacher", tags=["teacher"])

MAX_NOTES_BYTES = 10 * 1024 * 1024   # 10 MB
_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]")


def _get_day(db: Session, day_id: int, user: User) -> CurriculumDay:
    day = db.get(CurriculumDay, day_id)
    if day is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Class day not found")
    assert_batch_access(db, user, day.batch_id)
    return day


@router.get("/batches", response_model=list[BatchOut])
def my_batches(
    db: Session = Depends(get_db), user: User = Depends(require_staff)
) -> list[BatchOut]:
    """Admins see every batch; teachers see only the ones assigned to them."""
    stmt = select(Batch)
    if user.role != ROLE_ADMIN:
        allowed = teacher_batch_ids(db, user)
        if not allowed:
            return []
        stmt = stmt.where(Batch.id.in_(allowed))

    out: list[BatchOut] = []
    for batch in db.scalars(stmt.order_by(Batch.created_at.desc())).all():
        data = BatchOut.model_validate(batch)
        data.student_count = db.scalar(
            select(func.count(User.id)).where(
                User.batch_id == batch.id, User.role == ROLE_STUDENT
            )
        ) or 0
        data.total_days = batch_total_days(db, batch.id)
        data.teachers = [
            TeacherBrief.model_validate(link.teacher) for link in batch.teacher_links
        ]
        out.append(data)
    return out


@router.get("/batches/{batch_id}/days", response_model=list[CurriculumDayOut])
def batch_days(
    batch_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
) -> list[CurriculumDayOut]:
    assert_batch_access(db, user, batch_id)
    days = db.scalars(
        select(CurriculumDay)
        .where(CurriculumDay.batch_id == batch_id)
        .order_by(CurriculumDay.day_number)
    ).all()
    return [CurriculumDayOut.model_validate(d) for d in days]


@router.patch("/days/{day_id}", response_model=CurriculumDayOut)
def update_day(
    day_id: int,
    payload: CurriculumDayUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> CurriculumDayOut:
    """Set the date, paste a recording link, edit the topic, mark complete."""
    day = _get_day(db, day_id, user)
    updates = payload.model_dump(exclude_unset=True)

    # What the viewer's trail needs: when each thing actually arrived.
    # Compared before and after rather than on the presence of the key, so
    # re-saving a day that already has a recording does not restamp it and
    # make an old upload look like today's work.
    had_recording = bool(day.recording_url and day.recording_url.strip())
    was_taught = day.status == DAY_COMPLETED

    for field, value in updates.items():
        setattr(day, field, value)

    now = datetime.now(timezone.utc)
    if not had_recording and bool(day.recording_url and day.recording_url.strip()):
        day.recording_uploaded_at = now
    elif not (day.recording_url and day.recording_url.strip()):
        # The link was cleared, so the date it arrived is no longer true.
        day.recording_uploaded_at = None

    if not was_taught and day.status == DAY_COMPLETED:
        day.taught_marked_at = now
    elif day.status != DAY_COMPLETED:
        day.taught_marked_at = None

    # Completing day 28 or the final day advances the students' roadmap.
    if "status" in updates:
        db.flush()
        sync_curriculum_milestones(db, day.batch_id)

    db.commit()
    db.refresh(day)
    return CurriculumDayOut.model_validate(day)


@router.post("/days/{day_id}/notes", response_model=CurriculumDayOut)
async def upload_notes(
    day_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> CurriculumDayOut:
    day = _get_day(db, day_id, user)

    if (file.content_type or "") != "application/pdf" and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Notes must be a PDF file")

    contents = await file.read()
    if len(contents) > MAX_NOTES_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Notes PDF must be 10 MB or smaller"
        )
    if not contents.startswith(b"%PDF"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That file is not a valid PDF")

    # Rebuild the filename from scratch — never trust the client-supplied one,
    # which could contain path traversal segments.
    original = _SAFE_NAME.sub("_", Path(file.filename or "notes.pdf").name)[:60]
    stored = f"b{day.batch_id}_day{day.day_number}_{secrets.token_hex(4)}_{original}"
    if not stored.lower().endswith(".pdf"):
        stored += ".pdf"

    target = NOTES_DIR / stored
    target.write_bytes(contents)

    # Drop the previous file so uploads do not pile up.
    if day.notes_file:
        old = NOTES_DIR / day.notes_file
        if old.is_file() and old.parent == NOTES_DIR:
            old.unlink(missing_ok=True)

    day.notes_file = stored
    # A replacement is a real delivery too — a new file genuinely arrived, and
    # the viewer chasing a corrected PDF wants today's date, not the
    # date of the one that was wrong.
    day.notes_uploaded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(day)
    return CurriculumDayOut.model_validate(day)


@router.delete("/days/{day_id}/notes", response_model=CurriculumDayOut)
def delete_notes(
    day_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
) -> CurriculumDayOut:
    day = _get_day(db, day_id, user)
    if day.notes_file:
        path = NOTES_DIR / day.notes_file
        if path.is_file() and path.parent == NOTES_DIR:
            path.unlink(missing_ok=True)
        day.notes_file = None
        day.notes_uploaded_at = None
        db.commit()
        db.refresh(day)
    return CurriculumDayOut.model_validate(day)


# --- attendance -----------------------------------------------------------
@router.get("/days/{day_id}/attendance", response_model=list[AttendanceRow])
def day_attendance(
    day_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
) -> list[AttendanceRow]:
    """Full roster for the day — students with no record yet default to absent."""
    day = _get_day(db, day_id, user)

    students = db.scalars(
        select(User)
        .where(User.batch_id == day.batch_id, User.role == ROLE_STUDENT)
        .order_by(User.name)
    ).all()
    marked = {
        a.student_id: a.present
        for a in db.scalars(
            select(Attendance).where(Attendance.curriculum_day_id == day_id)
        ).all()
    }
    return [
        AttendanceRow(
            student_id=s.id, student_name=s.name, present=marked.get(s.id, False)
        )
        for s in students
    ]


@router.put("/days/{day_id}/attendance", response_model=list[AttendanceRow])
def save_attendance(
    day_id: int,
    payload: AttendanceBulkUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> list[AttendanceRow]:
    day = _get_day(db, day_id, user)

    roster = {
        s.id
        for s in db.scalars(
            select(User).where(User.batch_id == day.batch_id, User.role == ROLE_STUDENT)
        ).all()
    }
    existing = {
        a.student_id: a
        for a in db.scalars(
            select(Attendance).where(Attendance.curriculum_day_id == day_id)
        ).all()
    }

    for entry in payload.entries:
        # Silently skip anyone not in this batch rather than trusting the payload.
        if entry.student_id not in roster:
            continue
        record = existing.get(entry.student_id)
        if record is None:
            db.add(
                Attendance(
                    student_id=entry.student_id,
                    curriculum_day_id=day_id,
                    present=entry.present,
                )
            )
        else:
            record.present = entry.present

    db.commit()
    return day_attendance(day_id, db, user)


# --- summaries ------------------------------------------------------------
@router.get("/batches/{batch_id}/summary", response_model=BatchSummary)
def batch_summary(
    batch_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
) -> BatchSummary:
    assert_batch_access(db, user, batch_id)
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    completed = db.scalar(
        select(func.count(CurriculumDay.id)).where(
            CurriculumDay.batch_id == batch_id, CurriculumDay.status == DAY_COMPLETED
        )
    ) or 0
    student_count = db.scalar(
        select(func.count(User.id)).where(User.batch_id == batch_id, User.role == ROLE_STUDENT)
    ) or 0

    present_total = db.scalar(
        select(func.count(Attendance.id))
        .join(CurriculumDay, Attendance.curriculum_day_id == CurriculumDay.id)
        .where(
            CurriculumDay.batch_id == batch_id,
            CurriculumDay.status == DAY_COMPLETED,
            Attendance.present.is_(True),
        )
    ) or 0

    possible = completed * student_count
    average = round(present_total / possible * 100, 1) if possible else 0.0

    return BatchSummary(
        batch_id=batch.id,
        batch_name=batch.name,
        total_days=batch_total_days(db, batch_id),
        completed_days=completed,
        student_count=student_count,
        average_attendance=average,
    )


@router.get("/batches/{batch_id}/students", response_model=list[StudentProgressRow])
def batch_students(
    batch_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
) -> list[StudentProgressRow]:
    assert_batch_access(db, user, batch_id)

    completed = db.scalar(
        select(func.count(CurriculumDay.id)).where(
            CurriculumDay.batch_id == batch_id, CurriculumDay.status == DAY_COMPLETED
        )
    ) or 0

    students = db.scalars(
        select(User)
        .where(User.batch_id == batch_id, User.role == ROLE_STUDENT)
        .order_by(User.name)
    ).all()

    rows: list[StudentProgressRow] = []
    for s in students:
        attended = db.scalar(
            select(func.count(Attendance.id))
            .join(CurriculumDay, Attendance.curriculum_day_id == CurriculumDay.id)
            .where(
                Attendance.student_id == s.id,
                Attendance.present.is_(True),
                CurriculumDay.status == DAY_COMPLETED,
            )
        ) or 0
        rows.append(
            StudentProgressRow(
                student_id=s.id,
                name=s.name,
                email=s.email,
                classes_attended=attended,
                attendance_percent=round(attended / completed * 100, 1) if completed else 0.0,
                is_blocked=s.is_blocked,
            )
        )
    return rows


# --- assignments ----------------------------------------------------------
# Set by anyone who runs a class: teachers, admins, and the back-office roles.
# `require_staff` is already that set, and it is deliberately the same guard the
# rest of this file uses — a contributor keeping the schedule and curriculum up
# to date is expected to set the work that goes with it.
def _get_assignment(db: Session, assignment_id: int, user: User) -> Assignment:
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    # Scoped through its day's batch, so a teacher cannot reach another
    # teacher's assignment by guessing an id.
    assert_batch_access(db, user, assignment.day.batch_id)
    return assignment


def _progress(db: Session, assignment: Assignment) -> tuple[int, int, float | None]:
    """How many have handed it in, out of how many are in the batch."""
    student_count = db.scalar(
        select(func.count(User.id)).where(
            User.role == ROLE_STUDENT, User.batch_id == assignment.day.batch_id
        )
    ) or 0
    rows = db.scalars(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment.id
        )
    ).all()
    average = None
    if rows:
        # Percentage rather than raw marks: assignments differ in length, so an
        # average of 7 means nothing without knowing 7 out of what.
        average = round(
            sum((s.score / s.total * 100) if s.total else 0 for s in rows) / len(rows), 1
        )
    return len(rows), student_count, average


def _assignment_out(db: Session, assignment: Assignment) -> AssignmentOut:
    submitted, students, average = _progress(db, assignment)
    out = AssignmentOut.model_validate(assignment)
    out.submitted_count = submitted
    out.student_count = students
    out.average_score = average
    return out


@router.get("/days/{day_id}/assignments", response_model=list[AssignmentOut])
def day_assignments(
    day_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
) -> list[AssignmentOut]:
    day = _get_day(db, day_id, user)
    rows = db.scalars(
        select(Assignment).where(Assignment.curriculum_day_id == day.id).order_by(Assignment.id)
    ).all()
    return [_assignment_out(db, a) for a in rows]


@router.post(
    "/days/{day_id}/assignments", response_model=AssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_assignment(
    day_id: int,
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> AssignmentOut:
    day = _get_day(db, day_id, user)
    assignment = Assignment(
        curriculum_day_id=day.id,
        title=payload.title,
        instructions=payload.instructions,
        questions=[q.model_dump() for q in payload.questions],
        published=payload.published,
        due_on=payload.due_on,
        created_by_id=user.id,
        created_by_name=user.name,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return _assignment_out(db, assignment)


@router.patch("/assignments/{assignment_id}", response_model=AssignmentOut)
def update_assignment(
    assignment_id: int,
    payload: AssignmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> AssignmentOut:
    assignment = _get_assignment(db, assignment_id, user)
    data = payload.model_dump(exclude_unset=True)

    # Changing the questions after people have answered would leave their marks
    # referring to questions that no longer exist. Refused rather than silently
    # regraded: whoever is editing needs to know somebody has already sat it.
    if "questions" in data and assignment.submissions:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{len(assignment.submissions)} student(s) have already submitted this, "
            "so the questions can no longer be changed. Create a new assignment instead.",
        )

    if "questions" in data:
        data["questions"] = [dict(q) for q in data["questions"]]
    for field, value in data.items():
        setattr(assignment, field, value)
    db.commit()
    db.refresh(assignment)
    return _assignment_out(db, assignment)


@router.delete("/assignments/{assignment_id}", response_model=MessageResponse)
def delete_assignment(
    assignment_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
) -> MessageResponse:
    assignment = _get_assignment(db, assignment_id, user)
    db.delete(assignment)
    db.commit()
    return MessageResponse(message="Assignment deleted")


@router.get("/assignments/{assignment_id}/results", response_model=list[dict])
def assignment_results(
    assignment_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
) -> list[dict]:
    """Every student in the batch, whether or not they have submitted.

    Listing only the submissions would answer "who scored what" while hiding
    the more useful question, which is who has not done it.
    """
    assignment = _get_assignment(db, assignment_id, user)
    students = db.scalars(
        select(User)
        .where(User.role == ROLE_STUDENT, User.batch_id == assignment.day.batch_id)
        .order_by(User.name)
    ).all()
    by_student = {
        s.student_id: s
        for s in db.scalars(
            select(AssignmentSubmission).where(
                AssignmentSubmission.assignment_id == assignment.id
            )
        ).all()
    }
    out = []
    for s in students:
        sub = by_student.get(s.id)
        out.append({
            "student_id": s.id,
            "name": s.name,
            "email": s.email,
            "submitted": sub is not None,
            "score": sub.score if sub else None,
            "total": sub.total if sub else None,
            "percent": round(sub.score / sub.total * 100, 1) if sub and sub.total else None,
            "submitted_at": sub.submitted_at if sub else None,
        })
    return out


@router.get("/batches/{batch_id}/assignments", response_model=list[AssignmentProgressRow])
def batch_assignment_progress(
    batch_id: int, db: Session = Depends(get_db), user: User = Depends(require_staff)
) -> list[AssignmentProgressRow]:
    """Every assignment in a batch with its completion count."""
    assert_batch_access(db, user, batch_id)
    rows = db.scalars(
        select(Assignment)
        .join(CurriculumDay, Assignment.curriculum_day_id == CurriculumDay.id)
        .where(CurriculumDay.batch_id == batch_id)
        .order_by(CurriculumDay.day_number)
    ).all()
    out = []
    for a in rows:
        submitted, students, average = _progress(db, a)
        out.append(AssignmentProgressRow(
            assignment_id=a.id,
            day_number=a.day.day_number,
            title=a.title,
            published=a.published,
            due_on=a.due_on,
            submitted_count=submitted,
            student_count=students,
            average_score=average,
        ))
    return out
