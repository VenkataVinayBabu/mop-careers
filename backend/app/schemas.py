"""Pydantic request/response models for Phase 1."""
from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

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


class ProgramOut(ORMModel):
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


# Resolve the forward reference in TokenResponse.
TokenResponse.model_rebuild()
