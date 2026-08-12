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
    Attendance,
    Batch,
    CurriculumDay,
    TeacherBatch,
    User,
)
from app.schemas import (
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
