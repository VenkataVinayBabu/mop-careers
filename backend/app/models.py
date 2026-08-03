"""ORM models (Phases 1-2).

Enum-like columns are plain strings validated at the Pydantic layer rather than
native PostgreSQL ENUMs — native enums require a migration to add a value, which
would make later phases needlessly painful.
"""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# --- role / status vocabularies -------------------------------------------
ROLE_ADMIN = "admin"
ROLE_TEACHER = "teacher"
ROLE_STUDENT = "student"
ROLES = (ROLE_ADMIN, ROLE_TEACHER, ROLE_STUDENT)

DAY_PENDING = "pending"
DAY_COMPLETED = "completed"

BATCH_UPCOMING = "upcoming"
BATCH_ACTIVE = "active"
BATCH_COMPLETED = "completed"

TOTAL_CURRICULUM_DAYS = 55

# --- Phase 2 vocabularies -------------------------------------------------
PAYMENT_MODES = ("UPI", "cash", "bank")

APP_APPLIED = "applied"
APP_SHORTLISTED = "shortlisted"
APP_INTERVIEWING = "interviewing"
APP_OFFERED = "offered"
APP_REJECTED = "rejected"
APP_JOINED = "joined"
APPLICATION_STATUSES = (
    APP_APPLIED,
    APP_SHORTLISTED,
    APP_INTERVIEWING,
    APP_OFFERED,
    APP_REJECTED,
    APP_JOINED,
)

# A student counts as placed once an offer exists — joining is a later step that
# should not reduce the placement count.
PLACED_STATUSES = (APP_OFFERED, APP_JOINED)

ROUND_PENDING = "pending"
ROUND_PASSED = "passed"
ROUND_FAILED = "failed"
ROUND_RESULTS = (ROUND_PENDING, ROUND_PASSED, ROUND_FAILED)

# --- Phase 5 vocabularies -------------------------------------------------
ENQUIRY_NEW = "New"
ENQUIRY_CONTACTED = "Contacted"
ENQUIRY_CONVERTED = "Converted"
ENQUIRY_CLOSED = "Closed"
ENQUIRY_STATUSES = (ENQUIRY_NEW, ENQUIRY_CONTACTED, ENQUIRY_CONVERTED, ENQUIRY_CLOSED)

DOUBT_CLASS = "class_doubt"
DOUBT_TECHNICAL = "technical"
DOUBT_OTHER = "other"
DOUBT_TYPES = (DOUBT_CLASS, DOUBT_TECHNICAL, DOUBT_OTHER)

DOUBT_OPEN = "open"
DOUBT_ANSWERED = "answered"
DOUBT_STATUSES = (DOUBT_OPEN, DOUBT_ANSWERED)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Students only
    yoe_it: Mapped[float | None] = mapped_column(Numeric(4, 1))
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("batches.id", ondelete="SET NULL"), index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    batch: Mapped[Batch | None] = relationship(back_populates="students", foreign_keys=[batch_id])
    taught_batches: Mapped[list[TeacherBatch]] = relationship(
        back_populates="teacher", cascade="all, delete-orphan"
    )
    attendance: Mapped[list[Attendance]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    milestone: Mapped[Milestone | None] = relationship(
        back_populates="student", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def batch_name(self) -> str | None:
        """Convenience for UserOut, so the UI can show a student's batch without
        a second request."""
        return self.batch.name if self.batch else None

    @property
    def is_admin(self) -> bool:
        return self.role == ROLE_ADMIN

    @property
    def is_teacher(self) -> bool:
        return self.role == ROLE_TEACHER

    @property
    def is_student(self) -> bool:
        return self.role == ROLE_STUDENT


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    course_type: Mapped[str] = mapped_column(String(80), default="Python Full Stack", nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default=BATCH_UPCOMING, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    students: Mapped[list[User]] = relationship(
        back_populates="batch", foreign_keys=[User.batch_id]
    )
    teacher_links: Mapped[list[TeacherBatch]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )
    curriculum_days: Mapped[list[CurriculumDay]] = relationship(
        back_populates="batch", cascade="all, delete-orphan", order_by="CurriculumDay.day_number"
    )


class TeacherBatch(Base):
    """Link table — which teachers are assigned to which batches."""

    __tablename__ = "teacher_batches"
    __table_args__ = (UniqueConstraint("teacher_id", "batch_id", name="uq_teacher_batch"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_id: Mapped[int] = mapped_column(
        ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True
    )

    teacher: Mapped[User] = relationship(back_populates="taught_batches")
    batch: Mapped[Batch] = relationship(back_populates="teacher_links")


class CurriculumDay(Base):
    __tablename__ = "curriculum_days"
    __table_args__ = (UniqueConstraint("batch_id", "day_number", name="uq_batch_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    batch_id: Mapped[int] = mapped_column(
        ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    topic: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    scheduled_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default=DAY_PENDING, nullable=False)
    recording_url: Mapped[str | None] = mapped_column(String(500))
    notes_file: Mapped[str | None] = mapped_column(String(300))

    batch: Mapped[Batch] = relationship(back_populates="curriculum_days")
    attendance: Mapped[list[Attendance]] = relationship(
        back_populates="curriculum_day", cascade="all, delete-orphan"
    )


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("student_id", "curriculum_day_id", name="uq_student_day_attendance"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    curriculum_day_id: Mapped[int] = mapped_column(
        ForeignKey("curriculum_days.id", ondelete="CASCADE"), nullable=False, index=True
    )
    present: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    marked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    student: Mapped[User] = relationship(back_populates="attendance")
    curriculum_day: Mapped[CurriculumDay] = relationship(back_populates="attendance")


class Milestone(Base):
    """Roadmap tracking for one student. Some dates are set automatically, others
    are ticked by an admin."""

    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )

    enrolled: Mapped[date | None] = mapped_column(Date)
    batch_assigned: Mapped[date | None] = mapped_column(Date)
    batch_started: Mapped[date | None] = mapped_column(Date)
    midpoint_day28: Mapped[date | None] = mapped_column(Date)
    course_completed: Mapped[date | None] = mapped_column(Date)
    internship: Mapped[date | None] = mapped_column(Date)
    placement_ready: Mapped[date | None] = mapped_column(Date)
    offer_received: Mapped[date | None] = mapped_column(Date)

    student: Mapped[User] = relationship(back_populates="milestone")


MILESTONE_FIELDS = (
    "enrolled",
    "batch_assigned",
    "batch_started",
    "midpoint_day28",
    "course_completed",
    "internship",
    "placement_ready",
    "offer_received",
)


# ==========================================================================
#  Phase 2 — fees and placements
# ==========================================================================
class FeeRecord(Base):
    """The agreed total fee for one student. Balance is never stored — it is
    derived from total_fee minus the sum of payments, so the two can't drift."""

    __tablename__ = "fee_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    total_fee: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped[User] = relationship()


class FeePayment(Base):
    __tablename__ = "fee_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    paid_on: Mapped[date] = mapped_column(Date, nullable=False)
    mode: Mapped[str] = mapped_column(String(10), nullable=False)   # UPI / cash / bank
    reference: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped[User] = relationship()


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    website: Mapped[str | None] = mapped_column(String(300))
    location: Mapped[str | None] = mapped_column(String(150))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    applications: Mapped[list[Application]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_title: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=APP_APPLIED, nullable=False, index=True)
    package_lpa: Mapped[float | None] = mapped_column(Numeric(6, 2))
    applied_on: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped[User] = relationship()
    company: Mapped[Company] = relationship(back_populates="applications")
    rounds: Mapped[list[InterviewRound]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="InterviewRound.id",
    )


class InterviewRound(Base):
    __tablename__ = "interview_rounds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    round_name: Mapped[str] = mapped_column(String(120), nullable=False)
    scheduled_on: Mapped[date | None] = mapped_column(Date)
    result: Mapped[str] = mapped_column(String(20), default=ROUND_PENDING, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text)

    application: Mapped[Application] = relationship(back_populates="rounds")


# ==========================================================================
#  Phase 5 — enquiries and doubt support
# ==========================================================================
class Enquiry(Base):
    """Submitted from the public site with no authentication."""

    __tablename__ = "enquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # Which programme the lead asked about. Free text rather than an FK: the
    # public catalogue is marketing copy and changes independently of batches.
    programme: Mapped[str | None] = mapped_column(String(80))
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=ENQUIRY_NEW, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Doubt(Base):
    __tablename__ = "doubts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    query_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # Day number (1-55), not a CurriculumDay FK — a doubt should survive the
    # batch's curriculum rows being edited or rebuilt.
    related_day: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=DOUBT_OPEN, nullable=False, index=True)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped[User] = relationship()


class PasswordResetToken(Base):
    """Single-use, expiring token backing the forgot-password flow.

    Only the SHA-256 of the token is stored, so a database leak does not hand an
    attacker working reset links.
    """

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship()
