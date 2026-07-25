"""Pydantic request/response models for Phase 1."""
from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Role = Literal["admin", "teacher", "student"]
BatchStatus = Literal["upcoming", "active", "completed"]
DayStatus = Literal["pending", "completed"]

PasswordStr = Annotated[str, Field(min_length=8, max_length=128)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- auth -----------------------------------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool
    user: UserOut


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: PasswordStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: PasswordStr


# --- users ----------------------------------------------------------------
class UserOut(ORMModel):
    id: int
    name: str
    email: EmailStr
    phone: str | None = None
    role: Role
    is_blocked: bool
    must_change_password: bool
    yoe_it: float | None = None
    batch_id: int | None = None


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    role: Literal["teacher", "student"]
    password: PasswordStr | None = None
    yoe_it: float | None = Field(default=None, ge=0, le=50)
    batch_id: int | None = None

    @field_validator("role")
    @classmethod
    def _no_admin_creation(cls, v: str) -> str:
        # Admins are provisioned by the seed script only.
        if v == "admin":
            raise ValueError("Admin accounts cannot be created through the API")
        return v


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    yoe_it: float | None = Field(default=None, ge=0, le=50)
    batch_id: int | None = None


class BlockToggleRequest(BaseModel):
    is_blocked: bool


# --- batches --------------------------------------------------------------
class BatchCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    course_type: str = Field(default="Python Full Stack", max_length=80)
    start_date: date | None = None
    status: BatchStatus = "upcoming"


class BatchUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    course_type: str | None = Field(default=None, max_length=80)
    start_date: date | None = None
    status: BatchStatus | None = None


class TeacherBrief(ORMModel):
    id: int
    name: str
    email: EmailStr


class BatchOut(ORMModel):
    id: int
    name: str
    course_type: str
    start_date: date | None = None
    status: BatchStatus
    student_count: int = 0
    teachers: list[TeacherBrief] = []


class AssignTeacherRequest(BaseModel):
    teacher_id: int


# --- curriculum -----------------------------------------------------------
class CurriculumDayOut(ORMModel):
    id: int
    batch_id: int
    day_number: int
    topic: str
    description: str | None = None
    scheduled_date: date | None = None
    status: DayStatus
    recording_url: str | None = None
    notes_file: str | None = None


class CurriculumDayUpdate(BaseModel):
    topic: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    scheduled_date: date | None = None
    status: DayStatus | None = None
    recording_url: str | None = Field(default=None, max_length=500)

    @field_validator("recording_url")
    @classmethod
    def _validate_url(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("Recording link must start with http:// or https://")
        return v


class StudentDayView(CurriculumDayOut):
    """A curriculum day plus the requesting student's own attendance."""

    present: bool | None = None


# --- attendance -----------------------------------------------------------
class AttendanceMark(BaseModel):
    student_id: int
    present: bool


class AttendanceBulkUpdate(BaseModel):
    entries: list[AttendanceMark]


class AttendanceRow(BaseModel):
    student_id: int
    student_name: str
    present: bool


# --- milestones -----------------------------------------------------------
class MilestoneOut(ORMModel):
    enrolled: date | None = None
    batch_assigned: date | None = None
    batch_started: date | None = None
    midpoint_day28: date | None = None
    course_completed: date | None = None
    internship: date | None = None
    placement_ready: date | None = None
    offer_received: date | None = None


class MilestoneUpdate(BaseModel):
    enrolled: date | None = None
    batch_assigned: date | None = None
    batch_started: date | None = None
    midpoint_day28: date | None = None
    course_completed: date | None = None
    internship: date | None = None
    placement_ready: date | None = None
    offer_received: date | None = None


# --- dashboards -----------------------------------------------------------
class StudentDashboard(BaseModel):
    student_name: str
    batch_name: str | None = None
    total_days: int
    classes_held: int
    classes_attended: int
    attendance_percent: float
    mocks_taken: int = 0          # wired up in Phase 4
    latest_resume_score: int | None = None   # wired up in Phase 3
    next_class: CurriculumDayOut | None = None
    missed_count: int = 0
    milestones: MilestoneOut


class BatchSummary(BaseModel):
    batch_id: int
    batch_name: str
    total_days: int
    completed_days: int
    student_count: int
    average_attendance: float


class StudentProgressRow(BaseModel):
    student_id: int
    name: str
    email: EmailStr
    classes_attended: int
    attendance_percent: float
    is_blocked: bool


class MessageResponse(BaseModel):
    message: str


# Resolve the forward reference in TokenResponse.
TokenResponse.model_rebuild()
