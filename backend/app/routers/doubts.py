"""Doubt Support.

Routing per spec: a class_doubt emails the student's batch teacher, while
technical/other go to ADMIN_DOUBTS_EMAIL. Teachers only ever see doubts from
students in batches assigned to them.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import site_settings
from app.database import get_db
from app.deps import get_active_user, require_student, teacher_batch_ids
from app.mail import send_email
from app.models import (
    DOUBT_ANSWERED,
    DOUBT_CLASS,
    ROLE_ADMIN,
    ROLE_CONTRIBUTOR,
    ROLE_MEMBER,
    ROLE_STUDENT,
    ROLE_TEACHER,
    Batch,
    CurriculumDay,
    Doubt,
    TeacherBatch,
    User,
)
from app.schemas import DoubtCreate, DoubtOut, DoubtStatusUpdate

logger = logging.getLogger("mop.doubts")
router = APIRouter(prefix="/doubts", tags=["doubts"])

# Who may work the shared inbox. Written as an allowlist on purpose: this file
# guards itself inline rather than through `require_staff`, so widening that
# dependency does not reach here — which is exactly how a member ended up with
# a Doubts entry in their sidebar and a 403 behind it.
INBOX_ROLES = (ROLE_ADMIN, ROLE_MEMBER, ROLE_CONTRIBUTOR, ROLE_TEACHER)

TYPE_LABEL = {
    "class_doubt": "Class doubt",
    "technical": "Technical",
    "other": "Other",
}


def _day_topic(db: Session, batch_id: int | None, day_number: int | None) -> str | None:
    if batch_id is None or day_number is None:
        return None
    day = db.scalar(
        select(CurriculumDay).where(
            CurriculumDay.batch_id == batch_id, CurriculumDay.day_number == day_number
        )
    )
    return day.topic if day else None


def _out(db: Session, doubt: Doubt) -> DoubtOut:
    student = doubt.student
    batch = db.get(Batch, student.batch_id) if student and student.batch_id else None
    data = DoubtOut.model_validate(doubt)
    data.student_name = student.name if student else ""
    data.batch_name = batch.name if batch else None
    data.day_topic = _day_topic(db, student.batch_id if student else None, doubt.related_day)
    return data


def _batch_teachers(db: Session, batch_id: int | None) -> list[User]:
    if batch_id is None:
        return []
    return list(
        db.scalars(
            select(User)
            .join(TeacherBatch, TeacherBatch.teacher_id == User.id)
            .where(TeacherBatch.batch_id == batch_id)
        ).all()
    )


@router.post("", response_model=DoubtOut, status_code=status.HTTP_201_CREATED)
def raise_doubt(
    payload: DoubtCreate,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
) -> DoubtOut:
    doubt = Doubt(
        student_id=student.id,
        query_type=payload.query_type,
        related_day=payload.related_day,
        description=payload.description.strip(),
    )
    db.add(doubt)
    db.commit()
    db.refresh(doubt)

    topic = _day_topic(db, student.batch_id, doubt.related_day)
    day_part = f"Day {doubt.related_day}" if doubt.related_day else "General"
    topic_part = f" — {topic}" if topic else ""
    subject = f"[MOP Doubt] {day_part}{topic_part} — {student.name}"

    batch = db.get(Batch, student.batch_id) if student.batch_id else None
    body = f"""A student has raised a doubt.

Student: {student.name} ({student.email})
Batch:   {batch.name if batch else 'Not assigned'}
Type:    {TYPE_LABEL.get(doubt.query_type, doubt.query_type)}
Day:     {day_part}{topic_part}

Query:
{doubt.description}

--
Doubt #{doubt.id}
"""

    # class_doubt goes to the batch's teacher(s); everything else to admin.
    # The admin address comes from the settings table when one has been set,
    # falling back to ADMIN_DOUBTS_EMAIL in .env.
    admin_address = site_settings.doubts_email(db)
    if doubt.query_type == DOUBT_CLASS:
        teachers = _batch_teachers(db, student.batch_id)
        recipients = [t.email for t in teachers] or [admin_address]
        if not teachers:
            logger.warning(
                "Doubt #%s is a class doubt but batch %s has no teacher; sent to admin instead",
                doubt.id, student.batch_id,
            )
    else:
        recipients = [admin_address]

    send_email(recipients, subject, body)
    return _out(db, doubt)


@router.get("/mine", response_model=list[DoubtOut])
def my_doubts(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> list[DoubtOut]:
    doubts = db.scalars(
        select(Doubt)
        .options(selectinload(Doubt.student))
        .where(Doubt.student_id == student.id)
        .order_by(Doubt.created_at.desc())
    ).all()
    return [_out(db, d) for d in doubts]


@router.get("", response_model=list[DoubtOut])
def list_doubts(
    doubt_status: str | None = Query(default=None, alias="status", pattern="^(open|answered)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_active_user),
) -> list[DoubtOut]:
    """The shared inbox. Organisation-wide staff see everything; teachers only
    their own batches' students.

    Students are pushed to /doubts/mine rather than served here, so this route
    can never leak one student's queries to another.
    """
    if user.role == ROLE_STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Use /doubts/mine")
    if user.role not in INBOX_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Staff access required")

    stmt = select(Doubt).options(selectinload(Doubt.student))

    if user.role == ROLE_TEACHER:
        allowed = teacher_batch_ids(db, user)
        if not allowed:
            return []
        stmt = stmt.join(User, Doubt.student_id == User.id).where(User.batch_id.in_(allowed))

    if doubt_status:
        stmt = stmt.where(Doubt.status == doubt_status)

    doubts = db.scalars(stmt.order_by(Doubt.created_at.desc())).all()
    return [_out(db, d) for d in doubts]


@router.patch("/{doubt_id}", response_model=DoubtOut)
def set_status(
    doubt_id: int,
    payload: DoubtStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_active_user),
) -> DoubtOut:
    """Who may mark a doubt answered: organisation-wide staff, and the assigned
    batch's teachers.

    Checked against an allowlist rather than "anyone who is not a student".
    That used to mean the same thing, back when the only other roles were admin
    and teacher — but it silently started letting a viewer write the
    moment a fourth role existed, and a viewer is meant to write nothing.
    """
    if user.role == ROLE_STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Students cannot change a doubt's status")
    if user.role not in INBOX_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Staff access required")

    doubt = db.scalar(
        select(Doubt).options(selectinload(Doubt.student)).where(Doubt.id == doubt_id)
    )
    if doubt is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doubt not found")

    if user.role == ROLE_TEACHER:
        student = doubt.student
        if student is None or student.batch_id not in teacher_batch_ids(db, user):
            # 404 rather than 403, so the endpoint does not confirm the id exists.
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Doubt not found")

    doubt.status = payload.status
    doubt.answered_at = (
        datetime.now(timezone.utc) if payload.status == DOUBT_ANSWERED else None
    )
    db.commit()
    db.refresh(doubt)
    return _out(db, doubt)
