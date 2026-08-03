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
    batch_name: str | None = None


class ProfileUpdate(BaseModel):
    """What a student may change about their own account. Deliberately excludes
    email, role, batch and blocked status — those stay with the admin."""

    name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    yoe_it: float | None = Field(default=None, ge=0, le=50)


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


# ==========================================================================
#  Phase 2 — fees and placements
# ==========================================================================
# Money is stored as NUMERIC(10,2) in Postgres, which is the source of truth.
# It crosses the API as a float purely so the JSON is a number rather than a
# quoted string; sums are computed with Decimal before conversion.

PaymentMode = Literal["UPI", "cash", "bank"]
ApplicationStatus = Literal[
    "applied", "shortlisted", "interviewing", "offered", "rejected", "joined"
]
RoundResult = Literal["pending", "passed", "failed"]


# --- fees -----------------------------------------------------------------
class FeeSetRequest(BaseModel):
    total_fee: float = Field(ge=0, le=10_000_000)
    notes: str | None = None


class FeePaymentCreate(BaseModel):
    amount: float = Field(gt=0, le=10_000_000)
    paid_on: date
    mode: PaymentMode
    reference: str | None = Field(default=None, max_length=120)


class FeePaymentOut(ORMModel):
    id: int
    student_id: int
    amount: float
    paid_on: date
    mode: PaymentMode
    reference: str | None = None


class StudentFeeOut(BaseModel):
    student_id: int
    student_name: str
    email: EmailStr
    batch_id: int | None = None
    batch_name: str | None = None
    total_fee: float
    paid: float
    balance: float
    notes: str | None = None
    payments: list[FeePaymentOut] = []


class FeeSummaryRow(BaseModel):
    student_id: int
    student_name: str
    batch_name: str | None = None
    total_fee: float
    paid: float
    balance: float


class BatchCollectionSummary(BaseModel):
    batch_id: int
    batch_name: str
    student_count: int
    total_billed: float
    total_collected: float
    outstanding: float
    collection_percent: float


# --- placements -----------------------------------------------------------
class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    website: str | None = Field(default=None, max_length=300)
    location: str | None = Field(default=None, max_length=150)
    notes: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    website: str | None = Field(default=None, max_length=300)
    location: str | None = Field(default=None, max_length=150)
    notes: str | None = None


class CompanyOut(ORMModel):
    id: int
    name: str
    website: str | None = None
    location: str | None = None
    notes: str | None = None
    application_count: int = 0


class InterviewRoundCreate(BaseModel):
    round_name: str = Field(min_length=1, max_length=120)
    scheduled_on: date | None = None
    result: RoundResult = "pending"
    feedback: str | None = None


class InterviewRoundUpdate(BaseModel):
    round_name: str | None = Field(default=None, min_length=1, max_length=120)
    scheduled_on: date | None = None
    result: RoundResult | None = None
    feedback: str | None = None


class InterviewRoundOut(ORMModel):
    id: int
    application_id: int
    round_name: str
    scheduled_on: date | None = None
    result: RoundResult
    feedback: str | None = None


class ApplicationCreate(BaseModel):
    student_id: int
    company_id: int
    role_title: str = Field(min_length=1, max_length=150)
    status: ApplicationStatus = "applied"
    package_lpa: float | None = Field(default=None, ge=0, le=1000)
    applied_on: date | None = None
    notes: str | None = None


class ApplicationUpdate(BaseModel):
    role_title: str | None = Field(default=None, min_length=1, max_length=150)
    status: ApplicationStatus | None = None
    package_lpa: float | None = Field(default=None, ge=0, le=1000)
    applied_on: date | None = None
    notes: str | None = None


class ApplicationOut(ORMModel):
    id: int
    student_id: int
    student_name: str = ""
    company_id: int
    company_name: str = ""
    role_title: str
    status: ApplicationStatus
    package_lpa: float | None = None
    applied_on: date | None = None
    notes: str | None = None
    rounds: list[InterviewRoundOut] = []


class StudentApplicationOut(BaseModel):
    """Read-only view a student sees of their own applications.

    Deliberately omits the admin's private `notes` field.
    """

    id: int
    company_name: str
    role_title: str
    status: ApplicationStatus
    package_lpa: float | None = None
    applied_on: date | None = None
    rounds: list[InterviewRoundOut] = []


# ==========================================================================
#  Phase 5 — enquiries, doubts, certificate
# ==========================================================================
EnquiryStatus = Literal["New", "Contacted", "Converted", "Closed"]
DoubtType = Literal["class_doubt", "technical", "other"]
DoubtStatus = Literal["open", "answered"]


class EnquiryCreate(BaseModel):
    """Public, unauthenticated. Validated tightly because anyone can post here."""

    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=6, max_length=20)
    email: EmailStr
    programme: str | None = Field(default=None, max_length=80)
    message: str = Field(min_length=5, max_length=2000)

    @field_validator("phone")
    @classmethod
    def _clean_phone(cls, v: str) -> str:
        cleaned = v.strip()
        digits = [c for c in cleaned if c.isdigit()]
        if len(digits) < 6:
            raise ValueError("Enter a valid phone number")
        return cleaned


class EnquiryOut(ORMModel):
    id: int
    name: str
    phone: str
    email: EmailStr
    programme: str | None = None
    message: str
    status: EnquiryStatus
    created_at: datetime


class EnquiryStatusUpdate(BaseModel):
    status: EnquiryStatus


class DoubtCreate(BaseModel):
    query_type: DoubtType
    related_day: int | None = Field(default=None, ge=1, le=55)
    description: str = Field(min_length=5, max_length=4000)


class DoubtOut(ORMModel):
    id: int
    student_id: int
    student_name: str = ""
    batch_name: str | None = None
    query_type: DoubtType
    related_day: int | None = None
    day_topic: str | None = None
    description: str
    status: DoubtStatus
    answered_at: datetime | None = None
    created_at: datetime


class DoubtStatusUpdate(BaseModel):
    status: DoubtStatus


class CertificateStatus(BaseModel):
    unlocked: bool
    student_name: str
    course_name: str
    batch_name: str | None = None
    start_date: date | None = None
    completed_on: date | None = None
    linkedin_url: str | None = None


class PlacementStats(BaseModel):
    batch_id: int | None = None
    batch_name: str
    total_students: int
    placed_count: int
    placed_percent: float
    average_package: float | None = None
    highest_package: float | None = None
    applications: int = 0


# Resolve the forward reference in TokenResponse.
TokenResponse.model_rebuild()
