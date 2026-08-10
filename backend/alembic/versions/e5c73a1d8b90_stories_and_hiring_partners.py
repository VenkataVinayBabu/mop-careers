"""stories and hiring partners

Revision ID: e5c73a1d8b90
Revises: d84b2e6f0a17
Create Date: 2026-08-10 16:41:09.220517

Seeded from `frontend/src/data/site.js` for the same reason the mentors table
is: with an empty table there is no way to tell "not set up yet" from "the
admin deleted them all", so deleting the last row would bring the hardcoded
list back.

`hiring_partners` merges what were two lists — COMPANIES (the hiring-network
grid) and PLACEMENTS_TICKER (company plus package). They overlapped in ten of
twelve entries. A row with a package appears in both; a row without appears
only in the grid.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5c73a1d8b90'
down_revision: Union[str, None] = 'd84b2e6f0a17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (name, role, quote)
STORIES = [
    ('Sivaprasad', 'Software Developer',
     'I came in from a non-technical degree and finished able to build and deploy an application on my own.'),
    ('Bharath P', 'Data Analyst',
     'The mock interviews were the difference. By the real one I had already answered most of those questions out loud.'),
    ('Raji K', 'Data Analyst',
     'Classes were live and recorded, so missing one for a shift at work never meant falling behind.'),
    ('Bavana K', 'Data Scientist',
     'Not paying tuition up front is what made it possible for me to start at all.'),
]

# (name, package). Order follows the old COMPANIES grid, with Cred — which was
# only ever in the ticker — appended.
PARTNERS = [
    ('Infosys', '₹9 LPA'),
    ('TCS', ''),
    ('Wipro', ''),
    ('Accenture', ''),
    ('Deloitte', '₹14 LPA'),
    ('Capgemini', ''),
    ('IBM', ''),
    ('Razorpay', '₹20 LPA'),
    ('PhonePe', '₹22 LPA'),
    ('Flipkart', '₹22 LPA'),
    ('Swiggy', '₹19 LPA'),
    ('EY', '₹11 LPA'),
    ('Cred', '₹28 LPA'),
]


def upgrade() -> None:
    stories = op.create_table(
        'stories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('role', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('quote', sa.String(length=400), nullable=False, server_default=''),
        sa.Column('photo_url', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('published', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_stories_sort_order'), 'stories', ['sort_order'])

    partners = op.create_table(
        'hiring_partners',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('logo_url', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('package_lpa', sa.String(length=40), nullable=False, server_default=''),
        sa.Column('published', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hiring_partners_sort_order'), 'hiring_partners', ['sort_order'])

    op.bulk_insert(stories, [
        {'name': n, 'role': r, 'quote': q, 'photo_url': '',
         'published': True, 'sort_order': (i + 1) * 10}
        for i, (n, r, q) in enumerate(STORIES)
    ])
    op.bulk_insert(partners, [
        {'name': n, 'logo_url': '', 'package_lpa': p,
         'published': True, 'sort_order': (i + 1) * 10}
        for i, (n, p) in enumerate(PARTNERS)
    ])


def downgrade() -> None:
    op.drop_index(op.f('ix_hiring_partners_sort_order'), table_name='hiring_partners')
    op.drop_table('hiring_partners')
    op.drop_index(op.f('ix_stories_sort_order'), table_name='stories')
    op.drop_table('stories')
