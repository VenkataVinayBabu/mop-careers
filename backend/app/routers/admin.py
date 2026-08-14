"""Admin-only endpoints: batches, teacher assignment, accounts, milestones."""
import secrets
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.curriculum import batch_total_days, ensure_curriculum
from app.database import get_db
from app.deps import get_student_or_404, require_back_office, require_member
from app.mail import send_new_account
from app.milestones import get_or_create_milestone as _get_or_create_milestone
from app.models import (
    ROLE_ADMIN,
    ROLE_CONTRIBUTOR,
    ROLE_STUDENT,
    ROLE_TEACHER,
    ROLE_VIEWER,
    ROLE_MANAGES,
    Attendance,
    Batch,
    CurriculumDay,
    Enquiry,
    JobApplication,
    Milestone,
    Program,
    TeacherBatch,
    User,
    manages,
)
from app.schemas import (
    AssignTeacherRequest,
    BatchCreate,
    BatchOut,
    BatchUpdate,
    BlockToggleRequest,
    EnquiryOut,
    EnquiryStatusUpdate,
    JobApplicationOut,
    MessageResponse,
    MilestoneOut,
    MilestoneUpdate,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.security import hash_password

# The floor is the back office — admin, member, contributor. It is NOT the
# whole permission story: almost everything below carries its own tighter
# guard, and the two that do not (reading batches, reading accounts) are the
# lookups a contributor needs to do their job.
#
# Written per endpoint rather than per router because this file is where the
# three back-office roles actually differ. Fees and the website queue get
# router-level locks precisely because they do not.
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_back_office)])


def _batch_out(db: Session, batch: Batch) -> BatchOut:
    count = db.scalar(
        select(func.count(User.id)).where(User.batch_id == batch.id, User.role == ROLE_STUDENT)
    )
    data = BatchOut.model_validate(batch)
    data.student_count = count or 0
    data.total_days = batch_total_days(db, batch.id)
    data.teachers = [link.teacher for link in batch.teacher_links]  # type: ignore[misc]
    return data


# --- batches --------------------------------------------------------------
@router.get("/batches", response_model=list[BatchOut])
def list_batches(db: Session = Depends(get_db)) -> list[BatchOut]:
    batches = db.scalars(
        select(Batch)
        .options(selectinload(Batch.teacher_links).selectinload(TeacherBatch.teacher))
        .order_by(Batch.created_at.desc())
    ).all()
    return [_batch_out(db, b) for b in batches]


@router.post("/batches", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
def create_batch(payload: BatchCreate, db: Session = Depends(get_db),
                 _: User = Depends(require_member)) -> BatchOut:
    if db.scalar(select(Batch).where(func.lower(Batch.name) == payload.name.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "A batch with that name already exists")

    data = payload.model_dump()
    program = None
    if data.get("program_id") is not None:
        program = db.get(Program, data["program_id"])
        if program is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Programme not found")
        # The course name is a snapshot of the programme's name at creation, so
        # a later rename does not change what an issued certificate says.
        data["course_type"] = program.name[:80]

    batch = Batch(**data)
    db.add(batch)
    db.flush()                       # assign batch.id before building curriculum
    # Days come from the programme's own template and day count. A batch with no
    # programme falls back to matching the course name, then to blank days.
    ensure_curriculum(db, batch)
    db.commit()
    db.refresh(batch)
    return _batch_out(db, batch)


@router.patch("/batches/{batch_id}", response_model=BatchOut)
def update_batch(
    batch_id: int, payload: BatchUpdate, db: Session = Depends(get_db)
) -> BatchOut:
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"]:
        clash = db.scalar(
            select(Batch).where(
                func.lower(Batch.name) == updates["name"].lower(), Batch.id != batch_id
            )
        )
        if clash:
            raise HTTPException(status.HTTP_409_CONFLICT, "A batch with that name already exists")

    if updates.get("program_id") is not None:
        program = db.get(Program, updates["program_id"])
        if program is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Programme not found")
        # Moving a batch to another programme re-labels it; it does not rebuild
        # its class days, which by now carry dates, recordings and attendance.
        updates.setdefault("course_type", program.name[:80])

    for field, value in updates.items():
        setattr(batch, field, value)

    # Starting a batch stamps the batch_started milestone for its students.
    if updates.get("status") == "active":
        stamp = batch.start_date or date.today()
        for student in db.scalars(
            select(User).where(User.batch_id == batch.id, User.role == ROLE_STUDENT)
        ).all():
            ms = _get_or_create_milestone(db, student.id)
            if ms.batch_started is None:
                ms.batch_started = stamp

    db.commit()
    db.refresh(batch)
    return _batch_out(db, batch)


@router.delete("/batches/{batch_id}", response_model=MessageResponse)
def delete_batch(batch_id: int, db: Session = Depends(get_db),
                 _: User = Depends(require_member)) -> MessageResponse:
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    enrolled = db.scalar(
        select(func.count(User.id)).where(User.batch_id == batch_id, User.role == ROLE_STUDENT)
    )
    if enrolled:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot delete — {enrolled} student(s) are still assigned to this batch",
        )

    db.delete(batch)
    db.commit()
    return MessageResponse(message="Batch deleted")


# --- teacher assignment ---------------------------------------------------
@router.post("/batches/{batch_id}/teachers", response_model=BatchOut)
def assign_teacher(
    batch_id: int, payload: AssignTeacherRequest, db: Session = Depends(get_db)
) -> BatchOut:
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    teacher = db.get(User, payload.teacher_id)
    if teacher is None or teacher.role != ROLE_TEACHER:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Teacher not found")

    already = db.scalar(
        select(TeacherBatch).where(
            TeacherBatch.batch_id == batch_id, TeacherBatch.teacher_id == teacher.id
        )
    )
    if not already:
        db.add(TeacherBatch(batch_id=batch_id, teacher_id=teacher.id))
        db.commit()

    db.refresh(batch)
    return _batch_out(db, batch)


@router.delete("/batches/{batch_id}/teachers/{teacher_id}", response_model=BatchOut)
def unassign_teacher(
    batch_id: int, teacher_id: int, db: Session = Depends(get_db)
) -> BatchOut:
    link = db.scalar(
        select(TeacherBatch).where(
            TeacherBatch.batch_id == batch_id, TeacherBatch.teacher_id == teacher_id
        )
    )
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That teacher is not assigned to this batch")

    db.delete(link)
    db.commit()

    batch = db.get(Batch, batch_id)
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")
    db.refresh(batch)
    return _batch_out(db, batch)


# --- accounts -------------------------------------------------------------
@router.get("/users", response_model=list[UserOut])
def list_users(
    role: str | None = Query(
        default=None, pattern="^(teacher|student|admin|viewer|contributor|member)$"
    ),
    batch_id: int | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_back_office),
) -> list[UserOut]:
    """Accounts the caller may administer, plus their own.

    Scoped by the same ladder that governs creating and blocking. This screen
    was admin-only when it was written, so it returned everybody; opening it to
    members and contributors without narrowing it would have handed a
    contributor every member's and every student's email address.

    An admin sees everyone, including other admins — there is nobody above
    them for the rule to protect.
    """
    stmt = select(User)
    if actor.role != ROLE_ADMIN:
        visible = list(ROLE_MANAGES.get(actor.role, ()))
        # Their own account too, so a member can still find themselves on the
        # screen even though they do not outrank their own role.
        stmt = stmt.where(or_(User.role.in_(visible), User.id == actor.id))
    if role:
        stmt = stmt.where(User.role == role)
    if batch_id is not None:
        stmt = stmt.where(User.batch_id == batch_id)
    users = db.scalars(stmt.order_by(User.role, User.name)).all()
    return [UserOut.model_validate(u) for u in users]


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_back_office),
) -> UserOut:
    # You create only what you administer: a contributor onboards learners and
    # their teachers, a member adds contributors and viewers on top, and
    # neither creates their own level. A member creating a member would be
    # minting their own peer — the same objection as a contributor creating
    # their own approver, one rung up.
    if not manages(actor.role, payload.role):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Only an administrator can create a {payload.role} account.",
        )

    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with that email already exists")

    if payload.batch_id is not None and db.get(Batch, payload.batch_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    if payload.role == ROLE_STUDENT and payload.batch_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Students must be assigned to a batch")

    # A viewer watches every batch, so being put in one means nothing. Refused
    # rather than ignored: an admin who picked a batch expected it to matter.
    if payload.role == ROLE_VIEWER and payload.batch_id is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Viewers see every batch, so they are not assigned to one",
        )

    # No self-registration exists, so a generated temporary password is emailed
    # to the account holder when the admin does not supply one.
    temp_password = payload.password or f"Mop@{secrets.randbelow(900000) + 100000}"

    user = User(
        name=payload.name,
        email=email,
        phone=payload.phone,
        role=payload.role,
        password_hash=hash_password(temp_password),
        must_change_password=True,
        yoe_it=payload.yoe_it if payload.role == ROLE_STUDENT else None,
        batch_id=payload.batch_id if payload.role == ROLE_STUDENT else None,
    )
    db.add(user)
    db.flush()

    if user.role == ROLE_STUDENT:
        today = date.today()
        db.add(
            Milestone(
                student_id=user.id,
                enrolled=today,
                batch_assigned=today if user.batch_id else None,
            )
        )

    db.commit()
    db.refresh(user)

    send_new_account(user.email, user.name, user.role, temp_password)
    return UserOut.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db),
                actor: User = Depends(require_member)) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    # Same ladder as creation: a member does not get to edit another member's
    # account, or an admin's.
    if user.id != actor.id and not manages(actor.role, user.role):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Only an administrator can change a {user.role} account.",
        )

    updates = payload.model_dump(exclude_unset=True)

    # Changing the email changes who can sign in, so it is done deliberately or
    # not at all — a blank one would lock the account out of its own login, and
    # a duplicate would collide with the unique index as a 500 instead of a
    # message the person editing can act on.
    if "email" in updates:
        if not updates["email"]:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email cannot be blank")
        email = updates["email"].lower()
        if email != user.email and db.scalar(select(User).where(User.email == email)):
            raise HTTPException(
                status.HTTP_409_CONFLICT, "An account with that email already exists"
            )
        updates["email"] = email

    if "batch_id" in updates:
        if user.role != ROLE_STUDENT:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only students belong to a batch")
        if updates["batch_id"] is not None and db.get(Batch, updates["batch_id"]) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")

    for field, value in updates.items():
        setattr(user, field, value)

    if updates.get("batch_id"):
        ms = _get_or_create_milestone(db, user.id)
        if ms.batch_assigned is None:
            ms.batch_assigned = date.today()

    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/users/{user_id}/block", response_model=UserOut)
def toggle_block(
    user_id: int,
    payload: BlockToggleRequest,
    db: Session = Depends(get_db),
    # Cutting off somebody's access is a member-and-above decision, not part of
    # the onboarding a contributor does.
    admin: User = Depends(require_member),
) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot block your own account")
    # Blocking is the sharpest thing on this screen — it cuts somebody off
    # mid-session. A member does not get to do it to a peer or to Bala.
    if not manages(admin.role, user.role):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Only an administrator can block a {user.role} account.",
        )

    user.is_blocked = payload.is_blocked
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


# --- milestones -----------------------------------------------------------
@router.get("/students/{student_id}/milestones", response_model=MilestoneOut)
def get_milestones(student_id: int, db: Session = Depends(get_db),
                   _: User = Depends(require_member)) -> MilestoneOut:
    get_student_or_404(db, student_id)
    return MilestoneOut.model_validate(_get_or_create_milestone(db, student_id))


@router.patch("/students/{student_id}/milestones", response_model=MilestoneOut)
def update_milestones(
    student_id: int, payload: MilestoneUpdate, db: Session = Depends(get_db),
    _: User = Depends(require_member),
) -> MilestoneOut:
    get_student_or_404(db, student_id)
    ms = _get_or_create_milestone(db, student_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(ms, field, value)
    db.commit()
    db.refresh(ms)
    return MilestoneOut.model_validate(ms)


# --- enquiries (Phase 5) --------------------------------------------------
# Member and above. An enquiry is a named member of the public with their phone
# number on it, and handling leads was not part of the contributor's job.
@router.get("/enquiries", response_model=list[EnquiryOut])
def list_enquiries(
    enquiry_status: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_member),
) -> list[EnquiryOut]:
    stmt = select(Enquiry)
    if enquiry_status:
        stmt = stmt.where(Enquiry.status == enquiry_status)
    rows = db.scalars(stmt.order_by(Enquiry.created_at.desc())).all()
    return [EnquiryOut.model_validate(e) for e in rows]


@router.patch("/enquiries/{enquiry_id}", response_model=EnquiryOut)
def update_enquiry_status(
    enquiry_id: int, payload: EnquiryStatusUpdate, db: Session = Depends(get_db),
    _: User = Depends(require_member),
) -> EnquiryOut:
    enquiry = db.get(Enquiry, enquiry_id)
    if enquiry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found")
    enquiry.status = payload.status
    db.commit()
    db.refresh(enquiry)
    return EnquiryOut.model_validate(enquiry)


@router.delete("/enquiries/{enquiry_id}", response_model=MessageResponse)
def delete_enquiry(enquiry_id: int, db: Session = Depends(get_db),
                   _: User = Depends(require_member)) -> MessageResponse:
    enquiry = db.get(Enquiry, enquiry_id)
    if enquiry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found")
    db.delete(enquiry)
    db.commit()
    return MessageResponse(message="Enquiry deleted")


# --- job applications (careers page) --------------------------------------
# The whole back office, contributors included — which is a deliberate
# departure from the line above, where an enquiry is member-and-above.
#
# The distinction: an enquiry is a sales lead, sitting beside the fees a
# contributor must never see. An application is hiring, and the user asked for
# all three roles to read them. Both still hold somebody's phone number, so if
# that judgement is ever revisited, this is the guard to change.
@router.get("/job-applications", response_model=list[JobApplicationOut])
def list_job_applications(
    db: Session = Depends(get_db), _: User = Depends(require_back_office)
) -> list[JobApplicationOut]:
    rows = db.scalars(
        select(JobApplication).order_by(JobApplication.created_at.desc())
    ).all()
    return [JobApplicationOut.model_validate(a) for a in rows]


# Deleting is member-and-above even though reading is not: the form is open to
# the whole internet, so spam will arrive and needs clearing — but throwing away
# a real person's application is not something to hand to every role that can
# read one.
@router.delete("/job-applications/{application_id}", response_model=MessageResponse)
def delete_job_application(
    application_id: int, db: Session = Depends(get_db), _: User = Depends(require_member)
) -> MessageResponse:
    application = db.get(JobApplication, application_id)
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    db.delete(application)
    db.commit()
    return MessageResponse(message="Application deleted")


# --- overview -------------------------------------------------------------
@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _: User = Depends(require_member)) -> dict:
    return {
        "batches": db.scalar(select(func.count(Batch.id))) or 0,
        "students": db.scalar(select(func.count(User.id)).where(User.role == ROLE_STUDENT)) or 0,
        "teachers": db.scalar(select(func.count(User.id)).where(User.role == ROLE_TEACHER)) or 0,
        "blocked": db.scalar(select(func.count(User.id)).where(User.is_blocked.is_(True))) or 0,
        "classes_completed": db.scalar(
            select(func.count(CurriculumDay.id)).where(CurriculumDay.status == "completed")
        ) or 0,
        "attendance_records": db.scalar(select(func.count(Attendance.id))) or 0,
    }
