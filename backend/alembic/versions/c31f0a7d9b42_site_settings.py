"""site settings

Revision ID: c31f0a7d9b42
Revises: 5f5f76aedd76
Create Date: 2026-08-10 10:12:04.118325
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c31f0a7d9b42'
down_revision: Union[str, None] = '5f5f76aedd76'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'site_settings',
        sa.Column('key', sa.String(length=60), nullable=False),
        sa.Column('value', sa.Text(), nullable=False, server_default=''),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('key'),
    )


def downgrade() -> None:
    op.drop_table('site_settings')
