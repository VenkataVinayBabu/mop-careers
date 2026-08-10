"""statistics

Revision ID: a2d40b8e5c19
Revises: f6a19c4e2d73
Create Date: 2026-08-10 22:07:44.512908

The last hardcoded content on the marketing site: the four figures under the
hero and the four in the outcomes grid. Seeded from STATS and OUTCOMES in
`frontend/src/data/site.js`, for the same reason as every other list here — an
empty table cannot be told apart from one an admin has emptied.

Both sections share one table. They were two lists agreeing on three of their
four figures, which is two lists to keep in step for no gain.

These are the least verified claims on the site. Making them a table does not
make them true; it makes them correctable.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a2d40b8e5c19'
down_revision: Union[str, None] = 'f6a19c4e2d73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (section, label, value, prefix, suffix)
SEED = [
    ('hero', 'Learners placed', 1050, '', '+'),
    ('hero', 'Highest package', 47.6, '₹', 'L'),
    ('hero', 'Hiring partners', 500, '', '+'),
    ('hero', 'Placement rate', 87, '', '%'),
    ('outcomes', 'Total placements', 1050, '', '+'),
    ('outcomes', 'Placed at top product firms', 150, '', '+'),
    ('outcomes', 'Highest package', 47.6, '₹', 'L'),
    ('outcomes', 'Hiring partners', 500, '', '+'),
]


def upgrade() -> None:
    statistics = op.create_table(
        'statistics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('section', sa.String(length=20), nullable=False),
        sa.Column('label', sa.String(length=80), nullable=False),
        sa.Column('value', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
        sa.Column('prefix', sa.String(length=8), nullable=False, server_default=''),
        sa.Column('suffix', sa.String(length=8), nullable=False, server_default=''),
        sa.Column('published', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_statistics_section'), 'statistics', ['section'])
    op.create_index(op.f('ix_statistics_sort_order'), 'statistics', ['sort_order'])

    op.bulk_insert(statistics, [
        {'section': section, 'label': label, 'value': value,
         'prefix': prefix, 'suffix': suffix,
         'published': True, 'sort_order': (i + 1) * 10}
        for i, (section, label, value, prefix, suffix) in enumerate(SEED)
    ])


def downgrade() -> None:
    op.drop_index(op.f('ix_statistics_sort_order'), table_name='statistics')
    op.drop_index(op.f('ix_statistics_section'), table_name='statistics')
    op.drop_table('statistics')
