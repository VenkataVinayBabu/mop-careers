"""Milestone helpers.

Lives in its own module so both the admin and teacher routers can use it without
importing each other.

Which milestones are automatic and which are admin-ticked:

    enrolled          auto - when the student account is created
    batch_assigned    auto - when the student is put into a batch
    batch_started     auto - when the batch status flips to "active"
    midpoint_day28    auto - when day 28 of the batch is marked complete
    course_completed  auto - when all 55 days of the batch are complete
    internship        admin-ticked
    placement_ready   admin-ticked
    offer_received    admin-ticked
"""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    DAY_COMPLETED,
    ROLE_STUDENT,
    TOTAL_CURRICULUM_DAYS,
    CurriculumDay,
    Milestone,
    User,
)

MIDPOINT_DAY = 28


def get_or_create_milestone(db: Session, student_id: int) -> Milestone:
    ms = db.scalar(select(Milestone).where(Milestone.student_id == student_id))
    if ms is None:
        ms = Milestone(student_id=student_id)
        db.add(ms)
        db.flush()
    return ms


def sync_curriculum_milestones(db: Session, batch_id: int) -> None:
    """Stamp the curriculum-driven milestones for every student in a batch.

    Called after a class day changes status. Existing dates are never overwritten,
    so a milestone reflects when it was first reached.
    """
    completed_numbers = set(
        db.scalars(
            select(CurriculumDay.day_number).where(
                CurriculumDay.batch_id == batch_id, CurriculumDay.status == DAY_COMPLETED
            )
        ).all()
    )
    if not completed_numbers:
        return

    midpoint_done = MIDPOINT_DAY in completed_numbers
    course_done = len(completed_numbers) >= TOTAL_CURRICULUM_DAYS

    if not (midpoint_done or course_done):
        return

    today = date.today()
    students = db.scalars(
        select(User).where(User.batch_id == batch_id, User.role == ROLE_STUDENT)
    ).all()

    for student in students:
        ms = get_or_create_milestone(db, student.id)
        if midpoint_done and ms.midpoint_day28 is None:
            ms.midpoint_day28 = today
        if course_done and ms.course_completed is None:
            ms.course_completed = today


def batch_completed_day_count(db: Session, batch_id: int) -> int:
    return (
        db.scalar(
            select(func.count(CurriculumDay.id)).where(
                CurriculumDay.batch_id == batch_id, CurriculumDay.status == DAY_COMPLETED
            )
        )
        or 0
    )
