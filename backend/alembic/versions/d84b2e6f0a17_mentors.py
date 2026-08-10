"""mentors

Revision ID: d84b2e6f0a17
Revises: c31f0a7d9b42
Create Date: 2026-08-10 14:02:51.673004

Creates the table AND seeds it with the mentors that were hardcoded in
`frontend/src/data/site.js`, so the database is the source of truth from the
first deploy. Without the seed there is no way to tell "not set up yet" from
"the admin deleted them all", and deleting the last mentor would bring the
hardcoded list back from the dead.

The rows below are a snapshot on purpose. A migration must keep doing the same
thing years from now, so it does not import the app's models or read the
frontend file — both of which will have moved on.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd84b2e6f0a17'
down_revision: Union[str, None] = 'c31f0a7d9b42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (name, former, focus, programs, is_placeholder)
SEED = [
    ('Balaram', 'Ex-TCS · 8 yrs',
     'Full stack development. Mentors the web and Java tracks.',
     ['full-stack-web-development', 'java-full-stack'], False),
    ('Vinay K', 'Ex-AT&T · 6 yrs',
     'Python full stack — backend, APIs and deployment.',
     ['python-full-stack', 'full-stack-web-development'], False),
    ('Josna P', 'Ex-Infosys · 8 yrs',
     'Data analysis. SQL, reporting and analytics workflows.',
     ['data-science-with-ai'], False),
    ('Bharath David', '10 yrs experience',
     'Data science and machine learning, from fundamentals to deployment.',
     ['data-science-with-ai'], False),
    # --- fabricated stand-ins, carried over still flagged -------------------
    ('Aarav Menon', 'Placeholder · 7 yrs',
     'Backend and API engineering. Placeholder mentor — replace before launch.',
     ['java-full-stack', 'python-full-stack'], True),
    ('Divya Raghavan', 'Placeholder · 9 yrs',
     'LLM applications and retrieval systems. Placeholder mentor — replace before launch.',
     ['gen-ai-agentic-ai'], True),
    ('Nikhil Sarma', 'Placeholder · 6 yrs',
     'Agents, evaluation and production AI. Placeholder mentor — replace before launch.',
     ['gen-ai-agentic-ai'], True),
    ('Sneha Kulkarni', 'Placeholder · 8 yrs',
     'Cloud architecture and infrastructure as code. Placeholder mentor — replace before launch.',
     ['cloud-computing'], True),
    ('Rohit Deshpande', 'Placeholder · 10 yrs',
     'Kubernetes, CI/CD and reliability. Placeholder mentor — replace before launch.',
     ['cloud-computing'], True),
    ('Farhan Qureshi', 'Placeholder · 9 yrs',
     'Penetration testing and application security. Placeholder mentor — replace before launch.',
     ['cyber-security'], True),
    ('Ananya Iyer', 'Placeholder · 7 yrs',
     'Security operations and incident response. Placeholder mentor — replace before launch.',
     ['cyber-security'], True),
    ('Karthik Nair', 'Placeholder · 8 yrs',
     'Performance marketing and paid media. Placeholder mentor — replace before launch.',
     ['digital-marketing-with-ai'], True),
    ('Meera Joshi', 'Placeholder · 6 yrs',
     'SEO, content strategy and analytics. Placeholder mentor — replace before launch.',
     ['digital-marketing-with-ai'], True),
]


def upgrade() -> None:
    mentors = op.create_table(
        'mentors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('former', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('focus', sa.String(length=400), nullable=False, server_default=''),
        sa.Column('photo_url', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('programs', sa.JSON(), nullable=False),
        sa.Column('is_placeholder', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('published', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_mentors_sort_order'), 'mentors', ['sort_order'])

    # sort_order steps by 10 so a later "move between these two" has room
    # without renumbering the whole table.
    op.bulk_insert(mentors, [
        {
            'name': name,
            'former': former,
            'focus': focus,
            'photo_url': '',
            'programs': programs,
            'is_placeholder': placeholder,
            'published': True,
            'sort_order': (i + 1) * 10,
        }
        for i, (name, former, focus, programs, placeholder) in enumerate(SEED)
    ])


def downgrade() -> None:
    op.drop_index(op.f('ix_mentors_sort_order'), table_name='mentors')
    op.drop_table('mentors')
