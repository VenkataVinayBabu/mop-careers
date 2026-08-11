"""Pydantic request/response models for Phase 1."""
from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

# The only thing this module takes from the ORM layer, and it is taken rather
# than copied: a default day count written out twice is two numbers that can
# drift apart.
from app.models import DEFAULT_CURRICULUM_DAYS

Role = Literal["admin", "teacher", "student", "viewer", "contributor", "member"]
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
    role: Literal["teacher", "student", "viewer", "contributor", "member"]
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
    # Which programme's curriculum template to build the batch's days from.
    # Optional: a batch can still be created by typing a course name, which is
    # matched against the programme list, and falls back to blank days.
    program_id: int | None = None
    course_type: str = Field(default="Python Full Stack", max_length=80)
    start_date: date | None = None
    status: BatchStatus = "upcoming"


class BatchUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    # Changing this re-points the label, not the days: a batch's class days are
    # built once and then belong to the batch. Moving a running batch onto a
    # different programme's syllabus would orphan its attendance.
    program_id: int | None = None
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
    program_id: int | None = None
    start_date: date | None = None
    status: BatchStatus
    student_count: int = 0
    # How long this batch actually is — counted from its class days rather than
    # assumed, because batches created before per-programme lengths are 55 days
    # and new ones follow their programme.
    total_days: int = 0
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
    # Bounded to keep nonsense out, not to a course length: batches no longer
    # all run 55 days, and a student raising a doubt about day 60 of a long
    # programme must not be turned away by a constant.
    related_day: int | None = Field(default=None, ge=1, le=365)
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


class ProgressDayRow(BaseModel):
    day_number: int
    topic: str
    scheduled_date: date | None = None
    present: bool


class ProgressReport(BaseModel):
    """Everything on the student progress report is derived from data that
    actually exists: attendance, curriculum, doubts and interview rounds."""

    from_date: date
    to_date: date

    # Classes
    classes_held: int
    classes_present: int
    classes_absent: int
    attendance_percent: float

    # Curriculum
    topics_covered: int
    total_days: int

    # Doubt support
    doubts_raised: int
    doubts_answered: int
    doubts_open: int

    # Interview rounds
    rounds_total: int
    rounds_passed: int
    rounds_failed: int
    rounds_pending: int

    days: list[ProgressDayRow] = []


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


# --- website content management -------------------------------------------
class SiteSettingsPublic(BaseModel):
    """Served unauthenticated to the marketing site.

    Deliberately does NOT carry `enquiry_email` or `doubts_email` — those are
    internal delivery addresses, not something the site displays.
    """

    whatsapp: str = ""
    whatsapp_message: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    announcement: str = ""
    announcement_tag: str = ""
    announcement_enabled: bool = True
    social_linkedin: str = ""
    social_instagram: str = ""
    social_youtube: str = ""
    social_facebook: str = ""
    # The standard fee structure every programme page falls back to.
    fee_registration: str = ""
    fee_registration_was: str = ""
    fee_registration_note: str = ""
    fee_tuition: str = ""
    fee_tuition_was: str = ""
    fee_tuition_note: str = ""
    fee_emi: str = ""


class SiteSettingsAdmin(SiteSettingsPublic):
    enquiry_email: str = ""
    doubts_email: str = ""


def _optional_email(v: str | None) -> str | None:
    """Blank is a legitimate value on every address field here — it means
    "fall back to the environment" for the routing addresses, and "not
    published" for the displayed one. EmailStr rejects '', so validate by
    hand rather than making blank impossible to enter."""
    if v is None:
        return None
    v = v.strip()
    if not v:
        return ""
    if v.count("@") != 1 or " " in v or "." not in v.split("@")[1]:
        raise ValueError("Enter a valid email address")
    return v.lower()


def _optional_url(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    if not v:
        return ""
    if not v.startswith(("http://", "https://")):
        raise ValueError("Enter a full link starting with https://")
    return v


class SiteSettingsUpdate(BaseModel):
    """Every field optional — the admin form sends only what changed, and a
    field left out keeps its current value rather than being blanked."""

    # Digits only including the country code, e.g. 919890813235. wa.me will not
    # accept spaces, '+' or dashes, so they are stripped rather than rejected —
    # nobody types a phone number the way a URL wants it.
    whatsapp: str | None = Field(default=None, max_length=20)
    whatsapp_message: str | None = Field(default=None, max_length=300)
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None, max_length=200)
    announcement: str | None = Field(default=None, max_length=160)
    announcement_tag: str | None = Field(default=None, max_length=40)
    announcement_enabled: bool | None = None
    social_linkedin: str | None = Field(default=None, max_length=255)
    social_instagram: str | None = Field(default=None, max_length=255)
    social_youtube: str | None = Field(default=None, max_length=255)
    social_facebook: str | None = Field(default=None, max_length=255)
    fee_registration: str | None = Field(default=None, max_length=60)
    fee_registration_was: str | None = Field(default=None, max_length=60)
    fee_registration_note: str | None = Field(default=None, max_length=200)
    fee_tuition: str | None = Field(default=None, max_length=60)
    fee_tuition_was: str | None = Field(default=None, max_length=60)
    fee_tuition_note: str | None = Field(default=None, max_length=200)
    fee_emi: str | None = Field(default=None, max_length=60)
    enquiry_email: str | None = Field(default=None, max_length=255)
    doubts_email: str | None = Field(default=None, max_length=255)

    @field_validator("whatsapp")
    @classmethod
    def _clean_whatsapp(cls, v: str | None) -> str | None:
        if v is None:
            return None
        digits = "".join(c for c in v if c.isdigit())
        if not digits:
            return ""
        if not 8 <= len(digits) <= 15:
            raise ValueError("Enter the number with its country code, digits only")
        return digits

    @field_validator("email", "enquiry_email", "doubts_email")
    @classmethod
    def _check_emails(cls, v: str | None) -> str | None:
        return _optional_email(v)

    @field_validator("social_linkedin", "social_instagram", "social_youtube", "social_facebook")
    @classmethod
    def _check_socials(cls, v: str | None) -> str | None:
        return _optional_url(v)

    @field_validator("phone", "address", "announcement", "announcement_tag", "whatsapp_message",
                     "fee_registration", "fee_registration_was", "fee_registration_note",
                     "fee_tuition", "fee_tuition_was", "fee_tuition_note", "fee_emi")
    @classmethod
    def _trim(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None


class MentorOut(ORMModel):
    id: int
    name: str
    former: str = ""
    focus: str = ""
    photo_url: str = ""
    programs: list[str] = []
    is_placeholder: bool = False
    published: bool = True
    sort_order: int = 0


def _clean_slugs(v: list[str] | None) -> list[str] | None:
    """Programme slugs are free text — the catalogue is still frontend data.
    Deduplicated and order-preserving, so the form cannot send one twice."""
    if v is None:
        return None
    out: list[str] = []
    for raw in v:
        slug = str(raw).strip().lower()
        if slug and slug not in out:
            out.append(slug)
    return out


class MentorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    former: str = Field(default="", max_length=120)
    focus: str = Field(default="", max_length=400)
    photo_url: str = Field(default="", max_length=500)
    programs: list[str] = Field(default_factory=list, max_length=20)
    is_placeholder: bool = False
    published: bool = True

    @field_validator("name", "former", "focus")
    @classmethod
    def _trim_text(cls, v: str) -> str:
        return v.strip()

    @field_validator("photo_url")
    @classmethod
    def _check_photo(cls, v: str) -> str:
        return _optional_url(v) or ""

    @field_validator("programs")
    @classmethod
    def _clean_programs(cls, v: list[str]) -> list[str]:
        return _clean_slugs(v) or []


class MentorUpdate(BaseModel):
    """Every field optional — the form sends only what changed, and an absent
    field keeps its current value."""

    name: str | None = Field(default=None, min_length=2, max_length=120)
    former: str | None = Field(default=None, max_length=120)
    focus: str | None = Field(default=None, max_length=400)
    photo_url: str | None = Field(default=None, max_length=500)
    programs: list[str] | None = Field(default=None, max_length=20)
    is_placeholder: bool | None = None
    published: bool | None = None

    @field_validator("name", "former", "focus")
    @classmethod
    def _trim_text(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None

    @field_validator("photo_url")
    @classmethod
    def _check_photo(cls, v: str | None) -> str | None:
        return _optional_url(v)

    @field_validator("programs")
    @classmethod
    def _clean_programs(cls, v: list[str] | None) -> list[str] | None:
        return _clean_slugs(v)


class ReorderRequest(BaseModel):
    """The full list of ids in the order they should appear.

    Whole-list rather than "move this one up": a single request cannot leave
    the table half-reordered, and two admins reordering at once end with one
    of the two orders rather than an interleaving of both. Shared by mentors,
    stories and hiring partners.
    """

    ids: list[int] = Field(min_length=1)


# The quote cap is 200, not the column's 400. A longer testimonial does not
# break the layout — it drags the whole row taller and hollows out the cards
# beside it. Constrain the input rather than truncating what someone said.
STORY_QUOTE_MAX = 200


class StoryOut(ORMModel):
    id: int
    name: str
    role: str = ""
    quote: str = ""
    photo_url: str = ""
    published: bool = True
    sort_order: int = 0


class StoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    role: str = Field(default="", max_length=120)
    quote: str = Field(default="", max_length=STORY_QUOTE_MAX)
    photo_url: str = Field(default="", max_length=500)
    published: bool = True

    @field_validator("name", "role", "quote")
    @classmethod
    def _trim_text(cls, v: str) -> str:
        return v.strip()

    @field_validator("photo_url")
    @classmethod
    def _check_photo(cls, v: str) -> str:
        return _optional_url(v) or ""


class StoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    role: str | None = Field(default=None, max_length=120)
    quote: str | None = Field(default=None, max_length=STORY_QUOTE_MAX)
    photo_url: str | None = Field(default=None, max_length=500)
    published: bool | None = None

    @field_validator("name", "role", "quote")
    @classmethod
    def _trim_text(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None

    @field_validator("photo_url")
    @classmethod
    def _check_photo(cls, v: str | None) -> str | None:
        return _optional_url(v)


class HiringPartnerOut(ORMModel):
    id: int
    name: str
    logo_url: str = ""
    package_lpa: str = ""
    published: bool = True
    sort_order: int = 0


class HiringPartnerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    logo_url: str = Field(default="", max_length=500)
    # Free text: it is a string printed beside a company name, not a number
    # anything computes with. Blank keeps the company out of the ticker.
    package_lpa: str = Field(default="", max_length=40)
    published: bool = True

    @field_validator("name", "package_lpa")
    @classmethod
    def _trim_text(cls, v: str) -> str:
        return v.strip()

    @field_validator("logo_url")
    @classmethod
    def _check_logo(cls, v: str) -> str:
        return _optional_url(v) or ""


class HiringPartnerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    logo_url: str | None = Field(default=None, max_length=500)
    package_lpa: str | None = Field(default=None, max_length=40)
    published: bool | None = None

    @field_validator("name", "package_lpa")
    @classmethod
    def _trim_text(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None

    @field_validator("logo_url")
    @classmethod
    def _check_logo(cls, v: str | None) -> str | None:
        return _optional_url(v)


# --- headline statistics --------------------------------------------------
StatSection = Literal["hero", "outcomes"]


class StatisticOut(ORMModel):
    id: int
    section: StatSection
    label: str
    value: float
    prefix: str = ""
    suffix: str = ""
    published: bool = True
    sort_order: int = 0


class StatisticCreate(BaseModel):
    section: StatSection
    label: str = Field(min_length=1, max_length=80)
    # Negative figures make no sense for any of these — every one is a count,
    # a package or a percentage.
    value: float = Field(ge=0, le=99_999_999)
    prefix: str = Field(default="", max_length=8)
    suffix: str = Field(default="", max_length=8)
    published: bool = True

    @field_validator("label", "prefix", "suffix")
    @classmethod
    def _trim(cls, v: str) -> str:
        return v.strip()


class StatisticUpdate(BaseModel):
    section: StatSection | None = None
    label: str | None = Field(default=None, min_length=1, max_length=80)
    value: float | None = Field(default=None, ge=0, le=99_999_999)
    prefix: str | None = Field(default=None, max_length=8)
    suffix: str | None = Field(default=None, max_length=8)
    published: bool | None = None

    @field_validator("label", "prefix", "suffix")
    @classmethod
    def _trim(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None


# --- programmes -----------------------------------------------------------
# The detail block is typed rather than an open dict. It is stored as one JSON
# document, but that is a storage decision — it does not mean the API should
# accept any shape. These models are also the only readable description of
# what a programme page can contain.
class ProgramWhy(BaseModel):
    title: str = Field(max_length=120)
    body: str = Field(default="", max_length=600)


class ProgramRole(BaseModel):
    title: str = Field(max_length=120)
    salary: str = Field(default="", max_length=60)
    body: str = Field(default="", max_length=600)
    companies: list[str] = Field(default_factory=list, max_length=12)


class ProgramPhase(BaseModel):
    """One syllabus phase.

    `exit` is the Placements Exit — the calibre of employer a learner is ready
    for by the end of this phase. It is the strongest claim on a programme
    page, so it is content an admin can correct rather than a constant.
    """

    title: str = Field(max_length=160)
    body: str = Field(default="", max_length=800)
    topics: list[str] = Field(default_factory=list, max_length=30)
    exit: list[str] = Field(default_factory=list, max_length=12)


class ProgramProject(BaseModel):
    title: str = Field(max_length=160)
    body: str = Field(default="", max_length=800)
    tech: list[str] = Field(default_factory=list, max_length=12)


class ProgramFees(BaseModel):
    """A programme's own fee structure, overriding the standard one.

    Present only when a programme charges something different. Absent — which
    is the normal case — the page shows the standard figures from site
    settings. Merged per field rather than all-or-nothing, so overriding the
    tuition alone does not blank the registration note.
    """

    registration: str = Field(default="", max_length=60)
    registrationWas: str = Field(default="", max_length=60)
    registrationNote: str = Field(default="", max_length=200)
    tuition: str = Field(default="", max_length=60)
    tuitionWas: str = Field(default="", max_length=60)
    tuitionNote: str = Field(default="", max_length=200)
    emi: str = Field(default="", max_length=60)


class ProgramDetail(BaseModel):
    """Everything a programme's own page renders. Every field optional — a
    section with no data does not render at all, so a programme can go live
    with nothing but the basics and be filled in over time."""

    headline: str = Field(default="", max_length=200)
    intro: str = Field(default="", max_length=1200)
    highlights: list[str] = Field(default_factory=list, max_length=8)
    why: list[ProgramWhy] = Field(default_factory=list, max_length=12)
    roles: list[ProgramRole] = Field(default_factory=list, max_length=12)
    syllabus: list[ProgramPhase] = Field(default_factory=list, max_length=12)
    technologies: list[str] = Field(default_factory=list, max_length=60)
    projects: list[ProgramProject] = Field(default_factory=list, max_length=12)
    # [question, answer] pairs, kept as pairs because that is the shape the
    # page already renders and the global FAQ already uses.
    faq: list[tuple[str, str]] = Field(default_factory=list, max_length=12)
    # None means "use the standard fee structure from site settings", which is
    # what almost every programme does. This field has to exist even though
    # nothing sets it today: the page reads `detail.fees`, so leaving it off
    # the model made Pydantic drop any override on the way through.
    fees: ProgramFees | None = None


class CurriculumTemplateDay(BaseModel):
    """One planned class day of a programme.

    The template is sparse — only the days somebody has actually written. Every
    other day of the batch is created as an editable placeholder, which is how
    days 12-55 have always worked.
    """

    day_number: int = Field(ge=1, le=365)
    topic: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)

    # `mode="before"` matters here. An "after" validator runs *after* the
    # length constraints, so a topic of three spaces satisfies min_length=1,
    # gets trimmed to nothing, and is stored — then fails on the way back out
    # as a 500 with the row already written. Trimming first makes min_length
    # mean what it looks like it means.
    @field_validator("topic", "description", mode="before")
    @classmethod
    def _trim(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v


def _clean_template(days: list[CurriculumTemplateDay]) -> list[CurriculumTemplateDay]:
    """Reject duplicate day numbers and keep the list in day order.

    Two entries for day 3 is a form mistake with no sensible resolution — one
    of them would silently win — so it is a 422 rather than a guess.
    """
    seen: set[int] = set()
    for day in days:
        if day.day_number in seen:
            raise ValueError(f"Day {day.day_number} appears more than once")
        seen.add(day.day_number)
    return sorted(days, key=lambda d: d.day_number)


class ProgramOut(ORMModel):
    """The public shape. Deliberately carries no curriculum template: that is
    the internal training plan, it is not on the marketing page, and the
    catalogue is served to every visitor in one request."""

    id: int
    slug: str
    name: str
    category: str = ""
    badge: str = ""
    duration: str = ""
    ctc_avg: str = ""
    ctc_high: str = ""
    summary: str = ""
    for_whom: str = ""
    skills: list[str] = []
    featured: bool = False
    confirmed: bool = True
    published: bool = True
    detail: ProgramDetail = ProgramDetail()
    sort_order: int = 0


class ProgramAdminOut(ProgramOut):
    """What the admin screens see: the public programme plus its training plan."""

    total_days: int = DEFAULT_CURRICULUM_DAYS
    curriculum: list[CurriculumTemplateDay] = []


def _slugify(value: str) -> str:
    """A URL-safe slug. Not clever — lowercase, non-alphanumerics to hyphens,
    no doubled or trailing hyphens. The admin form shows the result before it
    is saved, so surprising output is visible rather than mysterious."""
    out = []
    for ch in value.strip().lower():
        if ch.isalnum():
            out.append(ch)
        elif out and out[-1] != "-":
            out.append("-")
    return "".join(out).strip("-")


class ProgramCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    # Optional on create: derived from the name when left out.
    slug: str = Field(default="", max_length=80)
    category: str = Field(default="", max_length=20)
    badge: str = Field(default="", max_length=40)
    duration: str = Field(default="", max_length=60)
    ctc_avg: str = Field(default="", max_length=60)
    ctc_high: str = Field(default="", max_length=60)
    summary: str = Field(default="", max_length=1000)
    for_whom: str = Field(default="", max_length=600)
    skills: list[str] = Field(default_factory=list, max_length=12)
    featured: bool = False
    confirmed: bool = True
    published: bool = True
    detail: ProgramDetail = Field(default_factory=ProgramDetail)
    total_days: int = Field(default=DEFAULT_CURRICULUM_DAYS, ge=1, le=365)
    curriculum: list[CurriculumTemplateDay] = Field(default_factory=list, max_length=365)

    @field_validator("curriculum")
    @classmethod
    def _order_template(cls, v: list[CurriculumTemplateDay]) -> list[CurriculumTemplateDay]:
        return _clean_template(v)

    @field_validator("name", "category", "badge", "duration", "ctc_avg", "ctc_high",
                     "summary", "for_whom")
    @classmethod
    def _trim(cls, v: str) -> str:
        return v.strip()

    @field_validator("skills")
    @classmethod
    def _clean_skills(cls, v: list[str]) -> list[str]:
        return [s.strip() for s in v if s and s.strip()]

    @field_validator("slug")
    @classmethod
    def _clean_slug(cls, v: str) -> str:
        return _slugify(v)

    @model_validator(mode="after")
    def _slug_from_name(self):
        if not self.slug:
            self.slug = _slugify(self.name)
        if not self.slug:
            raise ValueError("Enter a name that can become a web address")
        return self


class ProgramUpdate(BaseModel):
    """Every field optional. `detail` is replaced wholesale when sent — it is
    one document, and merging half a syllabus into another is not a thing
    anyone means to do."""

    name: str | None = Field(default=None, min_length=2, max_length=120)
    slug: str | None = Field(default=None, min_length=1, max_length=80)
    category: str | None = Field(default=None, max_length=20)
    badge: str | None = Field(default=None, max_length=40)
    duration: str | None = Field(default=None, max_length=60)
    ctc_avg: str | None = Field(default=None, max_length=60)
    ctc_high: str | None = Field(default=None, max_length=60)
    summary: str | None = Field(default=None, max_length=1000)
    for_whom: str | None = Field(default=None, max_length=600)
    skills: list[str] | None = Field(default=None, max_length=12)
    featured: bool | None = None
    confirmed: bool | None = None
    published: bool | None = None
    detail: ProgramDetail | None = None
    total_days: int | None = Field(default=None, ge=1, le=365)
    # Replaced wholesale when sent, the same way `detail` is. Merging one
    # syllabus into another is not something anyone means to do.
    curriculum: list[CurriculumTemplateDay] | None = Field(default=None, max_length=365)

    @field_validator("curriculum")
    @classmethod
    def _order_template(
        cls, v: list[CurriculumTemplateDay] | None
    ) -> list[CurriculumTemplateDay] | None:
        return _clean_template(v) if v is not None else None

    @field_validator("name", "category", "badge", "duration", "ctc_avg", "ctc_high",
                     "summary", "for_whom")
    @classmethod
    def _trim(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None

    @field_validator("skills")
    @classmethod
    def _clean_skills(cls, v: list[str] | None) -> list[str] | None:
        return None if v is None else [s.strip() for s in v if s and s.strip()]

    @field_validator("slug")
    @classmethod
    def _clean_slug(cls, v: str | None) -> str | None:
        if v is None:
            return None
        slug = _slugify(v)
        if not slug:
            raise ValueError("Enter a web address using letters or numbers")
        return slug


# ==========================================================================
#  Viewer — the read-only coordinator view
# ==========================================================================
# A viewer watches every batch and chases whoever has fallen behind: a class
# that should have been taught and has not been marked, or one that was taught
# with no recording or no notes uploaded. So these payloads carry two things
# the other roles' schemas do not bother with — what is *missing*, and the
# phone number of the person to ring about it.
FollowUpKind = Literal["not_taught", "no_recording", "no_notes"]


class TeacherContact(BaseModel):
    """Who to call. The whole point of the role, so the phone number is not an
    optional extra here."""

    id: int
    name: str
    phone: str | None = None
    email: EmailStr


class ViewerBatchRow(BaseModel):
    batch_id: int
    name: str
    course_type: str
    status: BatchStatus
    start_date: date | None = None
    student_count: int
    total_days: int
    classes_taught: int
    # The three things a viewer chases, counted per batch so the list itself
    # says where the problem is.
    overdue_classes: int
    recordings_missing: int
    notes_missing: int
    teachers: list[TeacherContact] = []


class ViewerDayRow(BaseModel):
    day_id: int
    day_number: int
    topic: str
    scheduled_date: date | None = None
    status: DayStatus
    has_recording: bool
    has_notes: bool
    taught_marked_at: datetime | None = None
    recording_uploaded_at: datetime | None = None
    notes_uploaded_at: datetime | None = None
    chases: list[ChaseOut] = []
    # The link itself, so a viewer can check it actually opens rather than
    # trusting a tick. Notes are reported as a filename only — handing out the
    # download would be a new file-access path for a read-only role.
    recording_url: str | None = None
    notes_file: str | None = None
    attended: int
    student_count: int


class ViewerStudentRow(BaseModel):
    student_id: int
    name: str
    classes_attended: int
    attendance_percent: float
    is_blocked: bool


class ViewerBatchDetail(BaseModel):
    batch: ViewerBatchRow
    days: list[ViewerDayRow]
    students: list[ViewerStudentRow]


class ChaseOut(ORMModel):
    """One logged phone call."""

    id: int
    chased_by_name: str
    chased_at: datetime
    note: str = ""


class ChaseCreate(BaseModel):
    note: str = Field(default="", max_length=300)

    @field_validator("note", mode="before")
    @classmethod
    def _trim(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v


class ViewerFollowUp(BaseModel):
    kind: FollowUpKind
    batch_id: int
    batch_name: str
    day_id: int
    day_number: int
    topic: str
    scheduled_date: date | None = None
    # None when the class has no date set, which is why it is not simply a
    # count of days since: an undated class cannot be overdue.
    days_overdue: int | None = None
    teachers: list[TeacherContact] = []
    # The chase trail so far. Present on an item that is still outstanding —
    # a chase records that somebody rang, it does not resolve anything.
    chases: list[ChaseOut] = []
    last_chased_at: datetime | None = None


class ViewerClosedItem(BaseModel):
    """A class somebody chased that has since been delivered.

    Only days with at least one logged chase appear here. A day that was never
    chased and simply got uploaded on time is not a follow-up story, and
    listing it would drown the ones that are.
    """

    batch_id: int
    batch_name: str
    day_id: int
    day_number: int
    topic: str
    scheduled_date: date | None = None
    chases: list[ChaseOut] = []
    # Null means the delivery predates these columns — "not recorded", never a
    # guess. See the migration.
    taught_marked_at: datetime | None = None
    recording_uploaded_at: datetime | None = None
    notes_uploaded_at: datetime | None = None
    # The last of whatever was actually needed, which is when the chase ended.
    closed_at: datetime | None = None


class ViewerOverview(BaseModel):
    batches: int
    active_batches: int
    students: int
    teachers: int
    follow_ups: int
    overdue_classes: int
    recordings_missing: int
    notes_missing: int


# ==========================================================================
#  Website change requests — the contributor / member approval flow
# ==========================================================================
ChangeEntity = Literal["settings", "program", "mentor", "story", "partner", "statistic"]
ChangeAction = Literal["create", "update", "delete", "reorder"]
ChangeStatus = Literal["pending", "approved", "rejected", "withdrawn"]


class ChangeSubmit(BaseModel):
    """A proposed edit to the public site.

    The payload is whatever the matching direct endpoint would have taken, and
    is validated against that same schema before this is accepted — so a
    contributor hears about a bad value now, not when a member tries to
    approve it.
    """

    entity: ChangeEntity
    action: ChangeAction
    # Null when creating, or for settings and reorder, which have no single row.
    entity_id: int | None = None
    payload: dict = Field(default_factory=dict)


class ChangeReview(BaseModel):
    feedback: str = Field(default="", max_length=2000)

    @field_validator("feedback", mode="before")
    @classmethod
    def _trim(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v


class WebsiteChangeOut(ORMModel):
    id: int
    entity: ChangeEntity
    entity_id: int | None = None
    action: ChangeAction
    payload: dict = {}
    summary: str = ""
    status: ChangeStatus
    submitted_by_name: str = ""
    submitted_at: datetime
    reviewed_by_name: str = ""
    reviewed_at: datetime | None = None
    feedback: str = ""


# Resolve the forward reference in TokenResponse.
TokenResponse.model_rebuild()
