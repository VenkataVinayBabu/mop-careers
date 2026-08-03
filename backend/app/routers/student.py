"""Student endpoints. Every query is scoped to the authenticated student — a
student can never read another student's records.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.certificate import (
    DEFAULT_COURSE_NAME,
    build_certificate,
    linkedin_add_to_profile_url,
)

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
    Doubt,
    InterviewRound,
    Milestone,
    User,
)
from app.schemas import (
    CertificateStatus,
    CurriculumDayOut,
    InterviewRoundOut,
    MilestoneOut,
    ProfileUpdate,
    ProgressDayRow,
    ProgressReport,
    StudentApplicationOut,
    StudentDashboard,
    StudentDayView,
    UserOut,
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


@router.get("/progress", response_model=ProgressReport)
def progress_report(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
) -> ProgressReport:
    """Progress over a date range, scoped to the authenticated student.

    Class days are matched on their scheduled date, so a day with no date set
    yet is excluded rather than silently counted as absent.
    """
    if to_date < from_date:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "The end date must not be before the start date"
        )

    attendance = _own_attendance_map(db, student)

    in_range = [
        d
        for d in _days_for(db, student)
        if d.scheduled_date and from_date <= d.scheduled_date <= to_date
    ]
    held = [d for d in in_range if d.status == DAY_COMPLETED]
    present = sum(1 for d in held if attendance.get(d.id, False))

    rows = [
        ProgressDayRow(
            day_number=d.day_number,
            topic=d.topic,
            scheduled_date=d.scheduled_date,
            present=attendance.get(d.id, False),
        )
        for d in held
    ]

    doubts = db.scalars(
        select(Doubt).where(
            Doubt.student_id == student.id,
            func.date(Doubt.created_at) >= from_date,
            func.date(Doubt.created_at) <= to_date,
        )
    ).all()

    rounds = db.scalars(
        select(InterviewRound)
        .join(Application, InterviewRound.application_id == Application.id)
        .where(
            Application.student_id == student.id,
            InterviewRound.scheduled_on.is_not(None),
            InterviewRound.scheduled_on >= from_date,
            InterviewRound.scheduled_on <= to_date,
        )
    ).all()

    return ProgressReport(
        from_date=from_date,
        to_date=to_date,
        classes_held=len(held),
        classes_present=present,
        classes_absent=len(held) - present,
        attendance_percent=round(present / len(held) * 100, 1) if held else 0.0,
        topics_covered=len(held),
        total_days=TOTAL_CURRICULUM_DAYS,
        doubts_raised=len(doubts),
        doubts_answered=sum(1 for d in doubts if d.status == "answered"),
        doubts_open=sum(1 for d in doubts if d.status == "open"),
        rounds_total=len(rounds),
        rounds_passed=sum(1 for r in rounds if r.result == "passed"),
        rounds_failed=sum(1 for r in rounds if r.result == "failed"),
        rounds_pending=sum(1 for r in rounds if r.result == "pending"),
        days=rows,
    )


# --- certificate (Phase 5) ------------------------------------------------
def _certificate_context(db: Session, student: User) -> tuple[Milestone | None, Batch | None]:
    milestone = db.scalar(select(Milestone).where(Milestone.student_id == student.id))
    batch = db.get(Batch, student.batch_id) if student.batch_id else None
    return milestone, batch


@router.get("/certificate", response_model=CertificateStatus)
def certificate_status(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> CertificateStatus:
    """Whether the certificate is unlocked, and the details it will carry."""
    milestone, batch = _certificate_context(db, student)
    completed = milestone.course_completed if milestone else None
    # The batch's course_type is the source of truth for which programme this is.
    course = (batch.course_type if batch and batch.course_type else DEFAULT_COURSE_NAME)

    return CertificateStatus(
        unlocked=completed is not None,
        student_name=student.name,
        course_name=course,
        batch_name=batch.name if batch else None,
        start_date=batch.start_date if batch else None,
        completed_on=completed,
        linkedin_url=(
            linkedin_add_to_profile_url(completed, course) if completed else None
        ),
    )


@router.get("/certificate/download")
def download_certificate(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> Response:
    """Locked until the course_completed milestone is stamped."""
    milestone, batch = _certificate_context(db, student)
    completed = milestone.course_completed if milestone else None

    if completed is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Your certificate unlocks once you complete the course.",
        )

    pdf = build_certificate(
        student_name=student.name,
        batch_name=batch.name if batch else None,
        start_date=batch.start_date if batch else None,
        completed_on=completed,
        course_name=(batch.course_type if batch and batch.course_type else None),
    )
    safe_name = "".join(ch for ch in student.name if ch.isalnum() or ch in " -_").strip()
    filename = f"MOP_Certificate_{safe_name.replace(' ', '_') or 'Student'}.pdf"

    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch("/profile", response_model=UserOut)
def update_my_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
) -> UserOut:
    """A student updating their own details.

    Only name, phone and years of experience — email, role, batch and blocked
    status stay under admin control, so this cannot be used to escalate.
    """
    student.name = payload.name.strip()
    student.phone = (payload.phone or "").strip() or None
    student.yoe_it = payload.yoe_it
    db.commit()
    db.refresh(student)
    return UserOut.model_validate(student)


@router.get("/milestones", response_model=MilestoneOut)
def my_milestones(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> MilestoneOut:
    milestone = db.scalar(select(Milestone).where(Milestone.student_id == student.id))
    return MilestoneOut.model_validate(milestone) if milestone else MilestoneOut()
