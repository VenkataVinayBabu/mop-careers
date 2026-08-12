"""The viewer workspace — read-only, every batch, nothing to click that writes.

A viewer is a non-technical member of MOP staff. Their job is to know, across all
batches, which classes have actually been taught and whether the teacher
uploaded the recording and the notes, and to ring the teacher who has not. So
this router answers three questions and no others:

    what is outstanding, and who do I call about it   /follow-ups
    how is each batch doing                           /batches
    who is in this batch and what happened in it      /batches/{id}

RBAC is at router level, the same way fees is, and for the mirror-image
reason: fees locks a router nobody outside admin may read, this one locks a
router whose only write is the viewer's own notebook.

THAT ONE WRITE, because the rule used to be "no writes at all" and it is worth
saying why it changed. Logging "I rang Ravi on the 5th" is the viewer's
own record of their own phone call. It touches no class record, no student, no
teacher, and it cannot resolve or hide a follow-up — the list is still
computed from whether the file is actually there. Everything else here is a
GET, and the suite asserts that `POST /viewer/days/{id}/chase` is the only
exception, so a second one cannot appear unnoticed.

Note what is NOT here: fees, placements, enquiries, doubts, website content,
and any student's contact details. A viewer chases teachers, so teachers'
phone numbers are in these payloads; students appear as a name and an
attendance figure, which is what "how many are there and who are they" needs.
"""
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_viewer
from app.models import (
    DAY_COMPLETED,
    DAY_PENDING,
    ROLE_STUDENT,
    ROLE_TEACHER,
    Attendance,
    Batch,
    ClassChase,
    CurriculumDay,
    TeacherBatch,
    User,
)
from app.schemas import (
    ChaseCreate,
    ChaseOut,
    TeacherContact,
    ViewerBatchDetail,
    ViewerBatchRow,
    ViewerClosedItem,
    ViewerDayRow,
    ViewerFollowUp,
    ViewerOverview,
    ViewerStudentRow,
)

logger = logging.getLogger("mop.viewer")

router = APIRouter(
    prefix="/viewer",
    tags=["viewer"],
    dependencies=[Depends(require_viewer)],
)


def _has(value: str | None) -> bool:
    """A column that is NULL or an empty string both mean "not uploaded"."""
    return bool(value and value.strip())


def _chases_by_day(db: Session, day_ids: list[int] | None = None) -> dict[int, list[ChaseOut]]:
    """Chase history keyed by class day, in one query."""
    stmt = select(ClassChase).order_by(ClassChase.chased_at)
    if day_ids is not None:
        if not day_ids:
            return {}
        stmt = stmt.where(ClassChase.curriculum_day_id.in_(day_ids))
    out: dict[int, list[ChaseOut]] = {}
    for chase in db.scalars(stmt).all():
        out.setdefault(chase.curriculum_day_id, []).append(
            ChaseOut.model_validate(chase, from_attributes=True)
        )
    return out


def _teachers_by_batch(db: Session) -> dict[int, list[TeacherContact]]:
    """Every batch's teachers in one query, rather than one per batch."""
    rows = db.execute(
        select(TeacherBatch.batch_id, User)
        .join(User, TeacherBatch.teacher_id == User.id)
        .order_by(User.name)
    ).all()
    out: dict[int, list[TeacherContact]] = {}
    for batch_id, teacher in rows:
        out.setdefault(batch_id, []).append(TeacherContact.model_validate(teacher, from_attributes=True))
    return out


def _student_counts(db: Session) -> dict[int, int]:
    rows = db.execute(
        select(User.batch_id, func.count(User.id))
        .where(User.role == ROLE_STUDENT, User.batch_id.is_not(None))
        .group_by(User.batch_id)
    ).all()
    return {batch_id: count for batch_id, count in rows}


def _batch_rows(db: Session) -> list[ViewerBatchRow]:
    """Every batch with its counts. Built from three grouped queries rather
    than a loop of per-batch ones, because this is the screen a viewer lands
    on and it should not cost a query per batch."""
    today = date.today()
    teachers = _teachers_by_batch(db)
    students = _student_counts(db)

    days = db.scalars(select(CurriculumDay)).all()
    per_batch: dict[int, dict[str, int]] = {}
    for d in days:
        stats = per_batch.setdefault(
            d.batch_id,
            {"total": 0, "taught": 0, "overdue": 0, "no_rec": 0, "no_notes": 0},
        )
        stats["total"] += 1
        if d.status == DAY_COMPLETED:
            stats["taught"] += 1
            if not _has(d.recording_url):
                stats["no_rec"] += 1
            if not _has(d.notes_file):
                stats["no_notes"] += 1
        elif d.scheduled_date is not None and d.scheduled_date < today:
            # Dated, in the past, still not marked taught.
            stats["overdue"] += 1

    rows: list[ViewerBatchRow] = []
    for batch in db.scalars(select(Batch).order_by(Batch.created_at.desc())).all():
        stats = per_batch.get(
            batch.id, {"total": 0, "taught": 0, "overdue": 0, "no_rec": 0, "no_notes": 0}
        )
        rows.append(
            ViewerBatchRow(
                batch_id=batch.id,
                name=batch.name,
                course_type=batch.course_type,
                status=batch.status,
                start_date=batch.start_date,
                student_count=students.get(batch.id, 0),
                total_days=stats["total"],
                classes_taught=stats["taught"],
                overdue_classes=stats["overdue"],
                recordings_missing=stats["no_rec"],
                notes_missing=stats["no_notes"],
                teachers=teachers.get(batch.id, []),
            )
        )
    return rows


@router.get("/overview", response_model=ViewerOverview)
def overview(db: Session = Depends(get_db)) -> ViewerOverview:
    rows = _batch_rows(db)
    overdue = sum(r.overdue_classes for r in rows)
    no_rec = sum(r.recordings_missing for r in rows)
    no_notes = sum(r.notes_missing for r in rows)
    return ViewerOverview(
        batches=len(rows),
        active_batches=sum(1 for r in rows if r.status == "active"),
        students=sum(r.student_count for r in rows),
        teachers=db.scalar(select(func.count(User.id)).where(User.role == ROLE_TEACHER)) or 0,
        follow_ups=overdue + no_rec + no_notes,
        overdue_classes=overdue,
        recordings_missing=no_rec,
        notes_missing=no_notes,
    )


@router.get("/batches", response_model=list[ViewerBatchRow])
def batches(db: Session = Depends(get_db)) -> list[ViewerBatchRow]:
    """Every batch. A viewer is not scoped to any of them — that is the role."""
    return _batch_rows(db)


@router.get("/batches/{batch_id}", response_model=ViewerBatchDetail)
def batch_detail(batch_id: int, db: Session = Depends(get_db)) -> ViewerBatchDetail:
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    row = next((r for r in _batch_rows(db) if r.batch_id == batch_id), None)
    if row is None:                                    # pragma: no cover - defensive
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    days = db.scalars(
        select(CurriculumDay)
        .where(CurriculumDay.batch_id == batch_id)
        .order_by(CurriculumDay.day_number)
    ).all()

    # Attendance for the whole batch in one query, keyed by day.
    present_by_day = dict(
        db.execute(
            select(Attendance.curriculum_day_id, func.count(Attendance.id))
            .join(CurriculumDay, Attendance.curriculum_day_id == CurriculumDay.id)
            .where(CurriculumDay.batch_id == batch_id, Attendance.present.is_(True))
            .group_by(Attendance.curriculum_day_id)
        ).all()
    )

    students = db.scalars(
        select(User)
        .where(User.batch_id == batch_id, User.role == ROLE_STUDENT)
        .order_by(User.name)
    ).all()

    attended_by_student = dict(
        db.execute(
            select(Attendance.student_id, func.count(Attendance.id))
            .join(CurriculumDay, Attendance.curriculum_day_id == CurriculumDay.id)
            .where(
                CurriculumDay.batch_id == batch_id,
                CurriculumDay.status == DAY_COMPLETED,
                Attendance.present.is_(True),
            )
            .group_by(Attendance.student_id)
        ).all()
    )

    chases = _chases_by_day(db, [d.id for d in days])

    return ViewerBatchDetail(
        batch=row,
        days=[
            ViewerDayRow(
                day_id=d.id,
                day_number=d.day_number,
                topic=d.topic,
                scheduled_date=d.scheduled_date,
                status=d.status,
                has_recording=_has(d.recording_url),
                has_notes=_has(d.notes_file),
                recording_url=d.recording_url or None,
                notes_file=d.notes_file or None,
                taught_marked_at=d.taught_marked_at,
                recording_uploaded_at=d.recording_uploaded_at,
                notes_uploaded_at=d.notes_uploaded_at,
                chases=chases.get(d.id, []),
                attended=present_by_day.get(d.id, 0),
                student_count=row.student_count,
            )
            for d in days
        ],
        students=[
            ViewerStudentRow(
                student_id=s.id,
                name=s.name,
                classes_attended=attended_by_student.get(s.id, 0),
                attendance_percent=(
                    round(attended_by_student.get(s.id, 0) / row.classes_taught * 100, 1)
                    if row.classes_taught
                    else 0.0
                ),
                is_blocked=s.is_blocked,
            )
            for s in students
        ],
    )


@router.get("/follow-ups", response_model=list[ViewerFollowUp])
def follow_ups(
    kind: str | None = Query(default=None, pattern="^(not_taught|no_recording|no_notes)$"),
    db: Session = Depends(get_db),
) -> list[ViewerFollowUp]:
    """Everything somebody needs to be chased about.

    Three kinds, and the first is the one a read-only screen would otherwise
    miss entirely:

      not_taught     dated in the past and still not marked complete
      no_recording   taught, no recording link
      no_notes       taught, no notes file

    An undated class is never overdue — a batch that has not scheduled day 40
    yet is not behind on it, and reporting it as such would bury the real
    ones. Sorted oldest first, because that is the order to work through.
    """
    today = date.today()
    teachers = _teachers_by_batch(db)
    chases = _chases_by_day(db)

    days = db.scalars(
        select(CurriculumDay)
        .options(selectinload(CurriculumDay.batch))
        .where(
            (CurriculumDay.status == DAY_COMPLETED)
            | (
                (CurriculumDay.status == DAY_PENDING)
                & CurriculumDay.scheduled_date.is_not(None)
                & (CurriculumDay.scheduled_date < today)
            )
        )
        .order_by(CurriculumDay.scheduled_date, CurriculumDay.day_number)
    ).all()

    out: list[ViewerFollowUp] = []
    for d in days:
        if d.batch is None:                            # pragma: no cover - defensive
            continue

        logged = chases.get(d.id, [])

        def item(what: str) -> ViewerFollowUp:
            return ViewerFollowUp(
                kind=what,
                batch_id=d.batch_id,
                batch_name=d.batch.name,
                day_id=d.id,
                day_number=d.day_number,
                topic=d.topic,
                scheduled_date=d.scheduled_date,
                days_overdue=(today - d.scheduled_date).days if d.scheduled_date else None,
                teachers=teachers.get(d.batch_id, []),
                # Every outstanding item for a day carries that day's calls:
                # one call was about the whole day, so it answers for both the
                # missing recording and the missing notes.
                chases=logged,
                last_chased_at=logged[-1].chased_at if logged else None,
            )

        if d.status == DAY_PENDING:
            out.append(item("not_taught"))
            continue
        if not _has(d.recording_url):
            out.append(item("no_recording"))
        if not _has(d.notes_file):
            out.append(item("no_notes"))

    if kind:
        out = [f for f in out if f.kind == kind]
    return out


@router.post("/days/{day_id}/chase", response_model=ChaseOut, status_code=status.HTTP_201_CREATED)
def log_chase(
    day_id: int,
    payload: ChaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_viewer),
) -> ClassChase:
    """Record that somebody rang the teacher about this class.

    The only write on this router. It deliberately does **not** resolve
    anything: the follow-up stays exactly where it was until the file actually
    turns up, and simply gains "chased twice, still nothing". A button that
    made the item disappear would let the screen say "all clear" while a
    student still had no recording.

    Chases are appended, never edited. Two calls on two days are two lines,
    which is the point — "we have asked three times" is the useful fact.
    """
    day = db.get(CurriculumDay, day_id)
    if day is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Class day not found")

    chase = ClassChase(
        curriculum_day_id=day.id,
        chased_by_id=user.id,
        chased_by_name=user.name,
        note=payload.note,
    )
    db.add(chase)
    db.commit()
    db.refresh(chase)
    logger.info(
        "Class day #%s chased by %s%s", day.id, user.email,
        f" ({payload.note})" if payload.note else "",
    )
    return chase


@router.get("/closed", response_model=list[ViewerClosedItem])
def closed(db: Session = Depends(get_db)) -> list[ViewerClosedItem]:
    """Chases that ended — the class was chased, and the teacher delivered.

    This is the trail: rang on these dates, arrived on that one. Only days
    with a logged chase appear, because a day nobody had to chase is not a
    follow-up story and would bury the ones that are.

    Most recently closed first, since the usual question is "what came in this
    week" rather than "what happened in July".
    """
    chases = _chases_by_day(db)
    if not chases:
        return []

    days = db.scalars(
        select(CurriculumDay)
        .options(selectinload(CurriculumDay.batch))
        .where(CurriculumDay.id.in_(list(chases)))
    ).all()

    out: list[ViewerClosedItem] = []
    for d in days:
        # Still outstanding on any count? Then the chase has not ended.
        if d.status != DAY_COMPLETED or not _has(d.recording_url) or not _has(d.notes_file):
            continue

        # When the last recorded delivery landed. Built from the stamps that
        # exist rather than demanding all three: a class marked taught before
        # these columns existed, whose recording and notes arrived after,
        # genuinely closed on the later upload — insisting on the missing
        # third would leave every such class with no close date forever.
        # None only when nothing at all was dated. The three individual dates
        # are on the payload too, each saying "not recorded" for itself, so
        # nothing here has to be inferred from this one number.
        known = [s for s in (d.taught_marked_at, d.recording_uploaded_at, d.notes_uploaded_at)
                 if s is not None]
        closed_at = max(known) if known else None

        out.append(
            ViewerClosedItem(
                batch_id=d.batch_id,
                batch_name=d.batch.name if d.batch else "",
                day_id=d.id,
                day_number=d.day_number,
                topic=d.topic,
                scheduled_date=d.scheduled_date,
                chases=chases.get(d.id, []),
                taught_marked_at=d.taught_marked_at,
                recording_uploaded_at=d.recording_uploaded_at,
                notes_uploaded_at=d.notes_uploaded_at,
                closed_at=closed_at,
            )
        )

    # Anything with no recorded close date sorts last rather than first — an
    # unknown date is not "the beginning of time". Reduced to a number so two
    # unknowns never end up comparing None with None.
    out.sort(
        key=lambda i: (i.closed_at is not None, i.closed_at.timestamp() if i.closed_at else 0.0),
        reverse=True,
    )
    return out
