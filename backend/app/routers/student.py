"""Student endpoints. Every query is scoped to the authenticated student — a
student can never read another student's records.
"""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_student
from sqlalchemy.orm import selectinload

from app.models import (
    DAY_COMPLETED,
    DAY_PENDING,
    TOTAL_CURRICULUM_DAYS,
    Application,
    Attendance,
    Batch,
    CurriculumDay,
    Milestone,
    User,
)
from app.schemas import (
    CurriculumDayOut,
    InterviewRoundOut,
    MilestoneOut,
    StudentApplicationOut,
    StudentDashboard,
    StudentDayView,
)

router = APIRouter(prefix="/student", tags=["student"])


def _own_attendance_map(db: Session, student: User) -> dict[int, bool]:
    return {
        a.curriculum_day_id: a.present
        for a in db.scalars(
            select(Attendance).where(Attendance.student_id == student.id)
        ).all()
    }


def _days_for(db: Session, student: User) -> list[CurriculumDay]:
    if student.batch_id is None:
        return []
    return list(
        db.scalars(
            select(CurriculumDay)
            .where(CurriculumDay.batch_id == student.batch_id)
            .order_by(CurriculumDay.day_number)
        ).all()
    )


@router.get("/curriculum", response_model=list[StudentDayView])
def my_curriculum(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> list[StudentDayView]:
    """All 55 days for the student's own batch, each with their own attendance."""
    attendance = _own_attendance_map(db, student)
    out: list[StudentDayView] = []
    for day in _days_for(db, student):
        view = StudentDayView.model_validate(day)
        # Attendance is only meaningful once the class has actually happened.
        view.present = attendance.get(day.id, False) if day.status == DAY_COMPLETED else None
        out.append(view)
    return out


@router.get("/missed", response_model=list[StudentDayView])
def missed_classes(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> list[StudentDayView]:
    """Completed classes the student was marked absent for."""
    attendance = _own_attendance_map(db, student)
    out: list[StudentDayView] = []
    for day in _days_for(db, student):
        if day.status == DAY_COMPLETED and not attendance.get(day.id, False):
            view = StudentDayView.model_validate(day)
            view.present = False
            out.append(view)
    return out


@router.get("/schedule", response_model=list[CurriculumDayOut])
def schedule(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> list[CurriculumDayOut]:
    """Upcoming classes — anything not yet completed, dated ones first."""
    today = date.today()
    upcoming = [
        d
        for d in _days_for(db, student)
        if d.status == DAY_PENDING and (d.scheduled_date is None or d.scheduled_date >= today)
    ]
    upcoming.sort(key=lambda d: (d.scheduled_date is None, d.scheduled_date or today, d.day_number))
    return [CurriculumDayOut.model_validate(d) for d in upcoming]


@router.get("/dashboard", response_model=StudentDashboard)
def dashboard(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> StudentDashboard:
    days = _days_for(db, student)
    attendance = _own_attendance_map(db, student)

    completed_days = [d for d in days if d.status == DAY_COMPLETED]
    classes_held = len(completed_days)
    attended = sum(1 for d in completed_days if attendance.get(d.id, False))
    missed = classes_held - attended

    # Next class: earliest pending day with a date, else the lowest pending number.
    pending = [d for d in days if d.status == DAY_PENDING]
    dated = sorted(
        (d for d in pending if d.scheduled_date and d.scheduled_date >= date.today()),
        key=lambda d: (d.scheduled_date, d.day_number),
    )
    next_class = dated[0] if dated else (pending[0] if pending else None)

    batch = db.get(Batch, student.batch_id) if student.batch_id else None
    milestone = db.scalar(select(Milestone).where(Milestone.student_id == student.id))

    return StudentDashboard(
        student_name=student.name,
        batch_name=batch.name if batch else None,
        total_days=TOTAL_CURRICULUM_DAYS,
        classes_held=classes_held,
        classes_attended=attended,
        attendance_percent=round(attended / classes_held * 100, 1) if classes_held else 0.0,
        mocks_taken=0,               # Phase 4
        latest_resume_score=None,    # Phase 3
        next_class=CurriculumDayOut.model_validate(next_class) if next_class else None,
        missed_count=missed,
        milestones=MilestoneOut.model_validate(milestone) if milestone else MilestoneOut(),
    )


@router.get("/applications", response_model=list[StudentApplicationOut])
def my_applications(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> list[StudentApplicationOut]:
    """Read-only. Scoped to the authenticated student, and the admin's private
    per-application notes are deliberately not exposed.

    There is no student-facing fee endpoint anywhere — fees are admin-only.
    """
    apps = db.scalars(
        select(Application)
        .options(selectinload(Application.company), selectinload(Application.rounds))
        .where(Application.student_id == student.id)
        .order_by(Application.created_at.desc())
    ).all()

    return [
        StudentApplicationOut(
            id=a.id,
            company_name=a.company.name if a.company else "",
            role_title=a.role_title,
            status=a.status,
            package_lpa=float(a.package_lpa) if a.package_lpa is not None else None,
            applied_on=a.applied_on,
            rounds=[InterviewRoundOut.model_validate(r) for r in a.rounds],
        )
        for a in apps
    ]


@router.get("/milestones", response_model=MilestoneOut)
def my_milestones(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> MilestoneOut:
    milestone = db.scalar(select(Milestone).where(Milestone.student_id == student.id))
    return MilestoneOut.model_validate(milestone) if milestone else MilestoneOut()
