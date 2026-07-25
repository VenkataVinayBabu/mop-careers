"""The 55-day curriculum template.

Days 1-11 are fixed and pre-seeded per spec. Days 12-55 are created as editable
placeholders that a teacher or admin fills in as the batch progresses.
"""
from sqlalchemy.orm import Session

from app.models import TOTAL_CURRICULUM_DAYS, CurriculumDay

SEEDED_DAYS: dict[int, tuple[str, str]] = {
    1: ("Intro to Python & Setup", "What Python is, where it's used, installing Python and VS Code, running your first script."),
    2: ("Variables & Data Types", "Naming rules, dynamic typing, int/float/str/bool, type() and casting."),
    3: ("Operators", "Arithmetic, comparison, logical, assignment, membership and identity operators."),
    4: ("Strings", "Indexing, slicing, immutability, f-strings and the common string methods."),
    5: ("Lists", "Creating, indexing, slicing, mutating, list methods and list comprehensions."),
    6: ("Tuples & Sets", "Immutable sequences, tuple packing/unpacking, set operations and deduplication."),
    7: ("Dictionaries", "Key-value pairs, nesting, dictionary methods and safe key access."),
    8: ("Conditionals", "if / elif / else, truthiness, nesting and the conditional expression."),
    9: ("Loops", "for and while loops, range(), iterating sequences and dictionaries, nested loops."),
    10: ("Loop Control: break/continue/pass", "Exiting early, skipping iterations, placeholder bodies and the loop-else clause."),
    11: ("Functions", "def, parameters vs arguments, return values, default and keyword args, scope."),
}

PLACEHOLDER_TOPIC = "To be announced"
PLACEHOLDER_DESCRIPTION = "Topic to be finalised by the instructor."


def build_curriculum_days(batch_id: int) -> list[CurriculumDay]:
    """Return all 55 unsaved CurriculumDay rows for a newly created batch."""
    days: list[CurriculumDay] = []
    for n in range(1, TOTAL_CURRICULUM_DAYS + 1):
        topic, description = SEEDED_DAYS.get(n, (PLACEHOLDER_TOPIC, PLACEHOLDER_DESCRIPTION))
        days.append(
            CurriculumDay(
                batch_id=batch_id,
                day_number=n,
                topic=topic,
                description=description,
            )
        )
    return days


def ensure_curriculum(db: Session, batch_id: int) -> None:
    """Create any missing curriculum days for a batch. Safe to call repeatedly."""
    existing = {
        n
        for (n,) in db.query(CurriculumDay.day_number).filter(
            CurriculumDay.batch_id == batch_id
        )
    }
    for day in build_curriculum_days(batch_id):
        if day.day_number not in existing:
            db.add(day)
