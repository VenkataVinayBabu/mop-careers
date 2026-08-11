"""Building a batch's class days from its programme's curriculum template.

There used to be one template here — the 55-day Python outline from the
original brief — and every batch got it regardless of what it was teaching, so
a Java batch was created holding 55 days of Python topics.

The template now belongs to the programme (`programs.total_days` and
`programs.curriculum`), and this module is only the part that turns one into
rows. A batch's days are **materialised once, at creation**: editing a
programme's template afterwards changes what the *next* batch starts from and
leaves running batches — with their scheduled dates, recordings and attendance
— alone.

That also means a batch's real length is the number of `curriculum_days` rows
it has, not a constant and not a column. `batch_total_days` is the one way to
ask, so a 45-day Java batch and a 55-day legacy Python batch can coexist
without anything having to remember which is which.
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import DEFAULT_CURRICULUM_DAYS, Batch, CurriculumDay, Program

PLACEHOLDER_TOPIC = "To be announced"
PLACEHOLDER_DESCRIPTION = "Topic to be finalised by the instructor."

# A programme's template is a sparse list of {day_number, topic, description}.
# Only the days somebody has actually written need to be in it; everything else
# becomes an editable placeholder, which is how days 12-55 have always worked.
TemplateDay = dict


def template_map(curriculum: list | None) -> dict[int, tuple[str, str]]:
    """Index a programme's template by day number, ignoring malformed entries.

    Defensive because this JSON is a document: a row written by an older
    version of the schema must not stop a batch being created.
    """
    out: dict[int, tuple[str, str]] = {}
    for entry in curriculum or []:
        if not isinstance(entry, dict):
            continue
        try:
            number = int(entry.get("day_number"))
        except (TypeError, ValueError):
            continue
        topic = (entry.get("topic") or "").strip()
        if number < 1 or not topic:
            continue
        out[number] = (topic, (entry.get("description") or "").strip() or None)
    return out


def resolve_program(db: Session, batch: Batch) -> Program | None:
    """Which programme's template a batch should be built from.

    A batch created through the admin form carries `program_id`. One created by
    typing a course name — the older shape, still accepted by the API — is
    matched on that name instead, so "Python Full Stack" still gets the Python
    outline rather than 45 blank days.
    """
    if batch.program_id:
        program = db.get(Program, batch.program_id)
        if program is not None:
            return program

    course = (batch.course_type or "").strip()
    if not course:
        return None
    return db.scalar(select(Program).where(func.lower(Program.name) == course.lower()))


def build_curriculum_days(
    batch_id: int, curriculum: list | None = None, total_days: int = DEFAULT_CURRICULUM_DAYS
) -> list[CurriculumDay]:
    """Every unsaved CurriculumDay row for a newly created batch."""
    written = template_map(curriculum)
    days: list[CurriculumDay] = []
    for n in range(1, max(1, total_days) + 1):
        topic, description = written.get(n, (PLACEHOLDER_TOPIC, PLACEHOLDER_DESCRIPTION))
        days.append(
            CurriculumDay(
                batch_id=batch_id,
                day_number=n,
                topic=topic,
                description=description,
            )
        )
    return days


def ensure_curriculum(db: Session, batch: Batch) -> Program | None:
    """Create any class days the batch is missing. Safe to call repeatedly.

    Only ever adds. A batch that already has 55 days keeps all 55 even if its
    programme now says 45 — shortening a batch would mean deleting days that
    may already carry attendance, which is not something creating or re-seeding
    should do silently.
    """
    program = resolve_program(db, batch)
    if program is not None and batch.program_id is None:
        batch.program_id = program.id

    existing = {
        n
        for (n,) in db.query(CurriculumDay.day_number).filter(CurriculumDay.batch_id == batch.id)
    }
    total = program.total_days if program is not None else DEFAULT_CURRICULUM_DAYS
    for day in build_curriculum_days(batch.id, program.curriculum if program else None, total):
        if day.day_number not in existing:
            db.add(day)
    return program


def batch_total_days(db: Session, batch_id: int) -> int:
    """How long this batch is — the number of class days it actually has.

    Derived, never stored, for the same reason a fee balance is derived: a
    stored length and a set of day rows are two things that can disagree.
    """
    return (
        db.scalar(select(func.count(CurriculumDay.id)).where(CurriculumDay.batch_id == batch_id))
        or 0
    )
