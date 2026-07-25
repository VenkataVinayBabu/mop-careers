"""Phase 1 ORM models.

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
