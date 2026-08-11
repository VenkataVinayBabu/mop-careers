"""per-programme curriculum templates

Revision ID: b3f8c92a41d6
Revises: a2d40b8e5c19
Create Date: 2026-08-11 10:12:04.331028

Until now every batch was built from one hardcoded 55-day Python outline,
whatever it was teaching — so a Java batch was created holding 55 days of
Python topics. The template moves onto the programme:

    programs.total_days   how many class days a batch of this programme runs
    programs.curriculum   [{day_number, topic, description}], sparse
    batches.program_id    which programme a batch was built from

`total_days` starts at 45 for all eight, which is what MOP publishes on the
public site ("45-day course + 45-day internship") and what the user stated.
Batches that already exist keep the 55 day rows they were created with — those
rows carry scheduled dates, recordings and attendance, and nothing here
deletes them. It is a template for the *next* batch, not a rewrite of running
ones.

Only Python Full Stack gets a template with real topics: days 1-11 from the
original brief, which is the only day-by-day curriculum MOP has supplied. The
other seven start empty, so their batches get correctly-counted placeholder
days for a teacher to fill in — no longer somebody else's syllabus.

The rows below are a snapshot rather than an import of app code, for the same
reason the earlier content migrations carry their own copies.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3f8c92a41d6'
down_revision: Union[str, None] = 'a2d40b8e5c19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_TOTAL_DAYS = 45

# Days 1-11 of the Python Full Stack programme, fixed by the original brief.
PYTHON_TEMPLATE = [
    {"day_number": 1, "topic": "Intro to Python & Setup",
     "description": "What Python is, where it's used, installing Python and VS Code, running your first script."},
    {"day_number": 2, "topic": "Variables & Data Types",
     "description": "Naming rules, dynamic typing, int/float/str/bool, type() and casting."},
    {"day_number": 3, "topic": "Operators",
     "description": "Arithmetic, comparison, logical, assignment, membership and identity operators."},
    {"day_number": 4, "topic": "Strings",
     "description": "Indexing, slicing, immutability, f-strings and the common string methods."},
    {"day_number": 5, "topic": "Lists",
     "description": "Creating, indexing, slicing, mutating, list methods and list comprehensions."},
    {"day_number": 6, "topic": "Tuples & Sets",
     "description": "Immutable sequences, tuple packing/unpacking, set operations and deduplication."},
    {"day_number": 7, "topic": "Dictionaries",
     "description": "Key-value pairs, nesting, dictionary methods and safe key access."},
    {"day_number": 8, "topic": "Conditionals",
     "description": "if / elif / else, truthiness, nesting and the conditional expression."},
    {"day_number": 9, "topic": "Loops",
     "description": "for and while loops, range(), iterating sequences and dictionaries, nested loops."},
    {"day_number": 10, "topic": "Loop Control: break/continue/pass",
     "description": "Exiting early, skipping iterations, placeholder bodies and the loop-else clause."},
    {"day_number": 11, "topic": "Functions",
     "description": "def, parameters vs arguments, return values, default and keyword args, scope."},
]


def upgrade() -> None:
    op.add_column(
        'programs',
        sa.Column('total_days', sa.Integer(), nullable=False,
                  server_default=str(DEFAULT_TOTAL_DAYS)),
    )
    op.add_column(
        'programs',
        sa.Column('curriculum', sa.JSON(), nullable=False, server_default='[]'),
    )
    op.add_column('batches', sa.Column('program_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_batches_program_id'), 'batches', ['program_id'])
    op.create_foreign_key(
        'fk_batches_program_id', 'batches', 'programs', ['program_id'], ['id'],
        ondelete='SET NULL',
    )

    # The one programme with a real day-by-day curriculum.
    op.execute(
        sa.text("UPDATE programs SET curriculum = :days WHERE slug = 'python-full-stack'").bindparams(
            sa.bindparam('days', value=PYTHON_TEMPLATE, type_=sa.JSON())
        )
    )

    # Batches predate the link, so match them to a programme on the course name
    # they were created with. An unmatched batch keeps program_id NULL and its
    # existing days — nothing depends on the link being present.
    op.execute(
        """
        UPDATE batches
           SET program_id = p.id
          FROM programs p
         WHERE lower(batches.course_type) = lower(p.name)
        """
    )


def downgrade() -> None:
    op.drop_constraint('fk_batches_program_id', 'batches', type_='foreignkey')
    op.drop_index(op.f('ix_batches_program_id'), table_name='batches')
    op.drop_column('batches', 'program_id')
    op.drop_column('programs', 'curriculum')
    op.drop_column('programs', 'total_days')
