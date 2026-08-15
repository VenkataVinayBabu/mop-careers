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
    ROLE_STUDENT,
    Application,
    Assignment,
    AssignmentSubmission,
    Attendance,
    Batch,
    CurriculumDay,
    Doubt,
    InterviewRound,
    Milestone,
    User,
)
from app.schemas import (
    AnswerReview,
    AssignmentPaper,
    AssignmentStudentOut,
    CertificateStatus,
    CurriculumDayOut,
    LeaderboardRow,
    StudentQuestion,
    SubmissionCreate,
    SubmissionResult,
    InterviewRoundOut,
    MilestoneOut,
    ProgressDayRow,
    ProgressReport,
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
    """Every class day of the student's own batch, each with their own attendance."""
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
        # The batch's own length — days already loaded, so nothing extra to ask.
        total_days=len(days),
        classes_held=classes_held,
        classes_attended=attended,
        attendance_percent=round(attended / classes_held * 100, 1) if classes_held else 0.0,
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

    all_days = _days_for(db, student)
    in_range = [
        d for d in all_days if d.scheduled_date and from_date <= d.scheduled_date <= to_date
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

    # Assignments set on the class days in this range. Scoped to days rather
    # than to the due date so the card lines up with the class counts beside
    # it — "in this period you had 7 classes and 2 assignments" reads as one
    # period, which is the point of the report.
    day_ids = [d.id for d in in_range]
    assignments = (
        db.scalars(
            select(Assignment).where(
                Assignment.curriculum_day_id.in_(day_ids),
                Assignment.published.is_(True),
            )
        ).all()
        if day_ids
        else []
    )
    mine = {
        s.assignment_id: s
        for s in (
            db.scalars(
                select(AssignmentSubmission).where(
                    AssignmentSubmission.student_id == student.id,
                    AssignmentSubmission.assignment_id.in_([a.id for a in assignments]),
                )
            ).all()
            if assignments
            else []
        )
    }
    done = [mine[a.id] for a in assignments if a.id in mine]
    # Averaged as a percentage: assignments differ in length, so a mean of raw
    # marks would compare a score out of 4 with one out of 20.
    assignments_average = (
        round(sum((s.score / s.total * 100) if s.total else 0 for s in done) / len(done), 1)
        if done
        else None
    )

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
        total_days=len(all_days),
        doubts_raised=len(doubts),
        doubts_answered=sum(1 for d in doubts if d.status == "answered"),
        doubts_open=sum(1 for d in doubts if d.status == "open"),
        rounds_total=len(rounds),
        rounds_passed=sum(1 for r in rounds if r.result == "passed"),
        rounds_failed=sum(1 for r in rounds if r.result == "failed"),
        rounds_pending=sum(1 for r in rounds if r.result == "pending"),
        assignments_set=len(assignments),
        assignments_done=len(done),
        assignments_pending=len(assignments) - len(done),
        assignments_average=assignments_average,
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


# Editing your own details lives at PATCH /auth/me, which every role reaches —
# a student's version of it used to live here and did the same thing.


@router.get("/milestones", response_model=MilestoneOut)
def my_milestones(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> MilestoneOut:
    milestone = db.scalar(select(Milestone).where(Milestone.student_id == student.id))
    return MilestoneOut.model_validate(milestone) if milestone else MilestoneOut()


# --- assignments ----------------------------------------------------------
# The rule that shapes all of this: a student never receives the answer key
# before they submit. `StudentQuestion` has no `answer` field at all rather
# than one set to None, so a serialiser change cannot start leaking it.
def _student_assignments(db: Session, student: User) -> list[Assignment]:
    if student.batch_id is None:
        return []
    return list(db.scalars(
        select(Assignment)
        .join(CurriculumDay, Assignment.curriculum_day_id == CurriculumDay.id)
        .where(CurriculumDay.batch_id == student.batch_id, Assignment.published.is_(True))
        .order_by(CurriculumDay.day_number)
    ).all())


def _my_submission(db: Session, assignment_id: int, student: User) -> AssignmentSubmission | None:
    return db.scalar(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_id == student.id,
        )
    )


def _brief(assignment: Assignment, submission: AssignmentSubmission | None) -> dict:
    return {
        "id": assignment.id,
        "day_number": assignment.day.day_number,
        "day_topic": assignment.day.topic,
        "title": assignment.title,
        "instructions": assignment.instructions,
        "due_on": assignment.due_on,
        "question_count": len(assignment.questions or []),
        "submitted": submission is not None,
        "score": submission.score if submission else None,
        "total": submission.total if submission else None,
    }


@router.get("/assignments", response_model=list[AssignmentStudentOut])
def my_assignments(
    db: Session = Depends(get_db), student: User = Depends(require_student)
) -> list[AssignmentStudentOut]:
    """Published assignments for this student's batch, with their own result."""
    return [
        AssignmentStudentOut(**_brief(a, _my_submission(db, a.id, student)))
        for a in _student_assignments(db, student)
    ]


def _get_published(db: Session, assignment_id: int, student: User) -> Assignment:
    assignment = db.get(Assignment, assignment_id)
    # 404 rather than 403 for an unpublished one or another batch's: the reply
    # must not confirm that an assignment with that id exists.
    if (
        assignment is None
        or not assignment.published
        or student.batch_id is None
        or assignment.day.batch_id != student.batch_id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    return assignment


@router.get("/assignments/{assignment_id}", response_model=AssignmentPaper)
def open_assignment(
    assignment_id: int, db: Session = Depends(get_db), student: User = Depends(require_student)
) -> AssignmentPaper:
    assignment = _get_published(db, assignment_id, student)
    submission = _my_submission(db, assignment.id, student)
    return AssignmentPaper(
        **_brief(assignment, submission),
        questions=[
            StudentQuestion(question=q["question"], options=q["options"])
            for q in (assignment.questions or [])
        ],
    )


@router.post("/assignments/{assignment_id}/submit", response_model=SubmissionResult)
def submit_assignment(
    assignment_id: int,
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    student: User = Depends(require_student),
) -> SubmissionResult:
    """Grade and store one attempt. There is only ever one."""
    assignment = _get_published(db, assignment_id, student)

    if _my_submission(db, assignment.id, student) is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "You have already submitted this assignment."
        )

    questions = assignment.questions or []
    if len(payload.answers) != len(questions):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"This assignment has {len(questions)} questions, "
            f"but {len(payload.answers)} answers were sent.",
        )

    # Graded now rather than on read, so a mark cannot move under a student
    # because somebody edited the answer key afterwards.
    score = sum(1 for i, q in enumerate(questions) if payload.answers[i] == q["answer"])

    submission = AssignmentSubmission(
        assignment_id=assignment.id,
        student_id=student.id,
        answers=list(payload.answers),
        score=score,
        total=len(questions),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # The answer key is fair game now — they have committed to their answers,
    # and seeing what was right is the point of doing it.
    return SubmissionResult(
        score=submission.score,
        total=submission.total,
        submitted_at=submission.submitted_at,
        review=[
            AnswerReview(
                question=q["question"],
                options=q["options"],
                chosen=payload.answers[i],
                correct=q["answer"],
            )
            for i, q in enumerate(questions)
        ],
    )


@router.get("/assignments/{assignment_id}/result", response_model=SubmissionResult)
def my_result(
    assignment_id: int, db: Session = Depends(get_db), student: User = Depends(require_student)
) -> SubmissionResult:
    assignment = _get_published(db, assignment_id, student)
    submission = _my_submission(db, assignment.id, student)
    if submission is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You have not submitted this yet.")
    questions = assignment.questions or []
    return SubmissionResult(
        score=submission.score,
        total=submission.total,
        submitted_at=submission.submitted_at,
        review=[
            AnswerReview(
                question=q["question"],
                options=q["options"],
                chosen=submission.answers[i] if i < len(submission.answers) else -1,
                correct=q["answer"],
            )
            for i, q in enumerate(questions)
        ],
    )


@router.get("/assignments/{assignment_id}/leaderboard", response_model=list[LeaderboardRow])
def leaderboard(
    assignment_id: int, db: Session = Depends(get_db), student: User = Depends(require_student)
) -> list[LeaderboardRow]:
    """Ranked results for one assignment, within this student's batch.

    **Locked until the student has submitted.** This is what reconciles a
    leaderboard with the rule that students never see other students' data:
    you see the ranking by earning it, and nobody can browse the class's
    results without sitting the test themselves.

    First names only — enough to recognise yourself and the person above you,
    without publishing a full roster of who scored what.
    """
    assignment = _get_published(db, assignment_id, student)

    if _my_submission(db, assignment.id, student) is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Submit this assignment to see how the rest of the batch did.",
        )

    rows = db.scalars(
        select(AssignmentSubmission)
        .join(User, AssignmentSubmission.student_id == User.id)
        .where(
            AssignmentSubmission.assignment_id == assignment.id,
            User.batch_id == student.batch_id,
        )
        # Ties broken by who got there first, so the order is stable between
        # requests rather than shuffling on every load.
        .order_by(AssignmentSubmission.score.desc(), AssignmentSubmission.submitted_at)
    ).all()

    out: list[LeaderboardRow] = []
    for i, s in enumerate(rows, start=1):
        out.append(LeaderboardRow(
            rank=i,
            name=(s.student.name or "").split(" ")[0] or "Student",
            score=s.score,
            total=s.total,
            is_me=s.student_id == student.id,
        ))
    return out
