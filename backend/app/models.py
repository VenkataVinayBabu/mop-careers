"""ORM models (Phases 1-2).

Enum-like columns are plain strings validated at the Pydantic layer rather than
native PostgreSQL ENUMs — native enums require a migration to add a value, which
would make later phases needlessly painful.
"""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    JSON,
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

# How many class days a batch gets when nothing says otherwise. Each programme
# carries its own `total_days`, and a batch's real length is the number of
# curriculum_days rows it actually has — never a constant, so a 45-day Java
# batch and a 55-day legacy Python batch can coexist. This is only the fallback
# for a batch created without a programme.
DEFAULT_CURRICULUM_DAYS = 45

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
    # The programme name as it stood when the batch was created — a snapshot,
    # not a lookup. Renaming a programme must not silently rename the course on
    # a certificate already issued from this batch.
    course_type: Mapped[str] = mapped_column(String(80), default="Python Full Stack", nullable=False)
    # Which programme's curriculum template this batch was built from. Kept for
    # provenance only: the days are materialised at creation, so a batch keeps
    # working if the programme is later edited or deleted (hence SET NULL).
    program_id: Mapped[int | None] = mapped_column(
        ForeignKey("programs.id", ondelete="SET NULL"), index=True
    )
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
    program: Mapped[Program | None] = relationship()


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


# ==========================================================================
#  Website content management
# ==========================================================================
class SiteSetting(Base):
    """One editable field of the public website, stored as key/value.

    Key/value rather than a single wide row on purpose. The set of fields the
    marketing site exposes is still moving, and a key/value store lets a new
    field ship as a schema change in Pydantic and a form field in React,
    without a migration each time. The API still presents a typed object, so
    nothing downstream sees loose keys.

    A missing row means "not set" and the default in SITE_SETTING_DEFAULTS
    applies — the table only ever holds what an admin has actually changed.
    """

    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    # Who last touched it. SET NULL rather than CASCADE: deleting the admin who
    # set the phone number must not delete the phone number.
    updated_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    updated_by: Mapped[User | None] = relationship()


class Mentor(Base):
    """A mentor shown on the public site.

    Unlike site settings, this table is **seeded** with the mentors that used
    to be hardcoded in the frontend, and it is the source of truth from then
    on. That distinction matters: with an unseeded table there is no way to
    tell "nobody has set this up yet" from "the admin deleted them all", and
    deleting the last mentor would silently bring the hardcoded list back.
    """

    __tablename__ = "mentors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    # "Ex-TCS · 8 yrs" — one line, free text, because it is sometimes an
    # employer, sometimes just a number of years.
    former: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    focus: Mapped[str] = mapped_column(String(400), default="", nullable=False)
    # A URL, not an upload: Render's free tier wipes local disk on deploy, so
    # uploads wait on the object-storage decision. A link to an image MOP
    # already hosts works today and costs nothing.
    photo_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    # Program slugs this mentor teaches, e.g. ["python-full-stack"]. Free text
    # rather than a foreign key, the same way Enquiry.programme is: the public
    # catalogue is still frontend data and changes independently of any table.
    programs: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    # Fabricated stand-ins carried over from the seed. The public card renders
    # them visibly marked, and it is the flag the admin list sorts to the top.
    is_placeholder: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Story(Base):
    """A learner testimonial. Seeded like mentors, and for the same reason."""

    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    # Capped at 200 in the schema, not just here. A longer quote does not break
    # the layout, it drags the whole row taller and hollows out the cards
    # beside it — so the limit belongs at the input rather than truncating what
    # someone actually said.
    quote: Mapped[str] = mapped_column(String(400), default="", nullable=False)
    photo_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class HiringPartner(Base):
    """A company shown on the marketing site.

    Deliberately NOT the Phase 2 `Company` above, which is an employer a
    student actually applied to and is joined to applications and offers. This
    one is a name in the hiring-network grid — marketing copy that changes for
    entirely different reasons. Sharing a table would tie the public site to
    the placement records.

    One table covers both places a company appears on that site: every
    published row is in the hiring-network grid, and the ones that also carry a
    `package_lpa` appear in the placements ticker. Those were two hardcoded
    lists overlapping in ten of twelve entries — two lists to keep in agreement
    for no gain.
    """

    __tablename__ = "hiring_partners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    logo_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    # Free text, e.g. "₹28 LPA" — it is a display string beside a company name,
    # not a number anything computes with. Blank keeps them out of the ticker.
    package_lpa: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Program(Base):
    """A programme in the public catalogue, and its own detail page.

    STORAGE SHAPE, because it is the one decision here worth arguing about.
    The columns below are the fields something actually filters, sorts or
    looks up by — slug, published, featured, category, sort_order. Everything
    the detail page renders (headline, why, roles, syllabus phases, projects,
    FAQ) lives in one JSON `detail` document.

    Normalising that into phase/project/role/faq tables was the alternative.
    It would mean five more tables, five more sets of CRUD and five more
    ordering columns, to gain integrity over content that is only ever written
    as a whole page and only ever read as a whole page. Nothing joins to a
    syllabus phase. `detail` is a document, so it is stored as one.

    The JSON keeps exactly the shape the frontend already had, which is what
    makes swapping the hardcoded catalogue for this an import change rather
    than a rewrite of the pages.
    """

    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # The URL. Unique because /programs/{slug} has to resolve to one page.
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(20), default="", nullable=False)
    badge: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    duration: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    ctc_avg: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    ctc_high: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    for_whom: Mapped[str] = mapped_column(Text, default="", nullable=False)
    skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # False for the two programmes that appear only in the prototype and that
    # MOP has never confirmed it runs. Admin-facing only; the public site does
    # not read it — `published` is what hides a programme.
    confirmed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Everything the programme's own page renders. Every key optional: a
    # section with no data does not render at all, so a programme can be
    # published with nothing but the basics and filled in over time.
    detail: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # --- the training side, which the public site never sees -------------
    # How many class days a batch of this programme runs for, and the day-by-day
    # plan it starts from: [{day_number, topic, description}]. Sparse — only the
    # days somebody has actually written; the rest are created as editable
    # placeholders. Separate columns rather than keys inside `detail` on
    # purpose: the website editor replaces `detail` wholesale, and someone
    # correcting marketing copy must not be able to wipe the syllabus a live
    # batch is taught from.
    total_days: Mapped[int] = mapped_column(
        Integer, default=DEFAULT_CURRICULUM_DAYS, nullable=False
    )
    curriculum: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


STAT_HERO = "hero"
STAT_OUTCOMES = "outcomes"
STAT_SECTIONS = (STAT_HERO, STAT_OUTCOMES)


class Statistic(Base):
    """One counted-up figure on the public site.

    Both places these appear live in one table, told apart by `section`: the
    strip under the hero, and the outcomes grid further down. They were two
    hardcoded lists sharing three of their four figures, which is two lists
    that have to agree — the same trap the hiring partners were in.

    They are also **the least verified claims on the whole site**: 1,050
    placements, ₹47.6L, 500 partners, 87%. Being a table rather than a
    constant is what lets someone correct them the day the real numbers are
    known.
    """

    __tablename__ = "statistics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    # The number the counter animates to. Float because one of them is 47.6;
    # how many decimals to show is derived from the value rather than stored,
    # so the form has one less technical field to get wrong.
    value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    # Rendered either side of the animated digits so they do not flicker:
    # "₹" before, "+" / "%" / "L" after.
    prefix: Mapped[str] = mapped_column(String(8), default="", nullable=False)
    suffix: Mapped[str] = mapped_column(String(8), default="", nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
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
