"""website change requests, for the contributor/member approval flow

Revision ID: d1c73f9b2e46
Revises: c9e4a1b73d52
Create Date: 2026-08-11 17:02:41.774310

A contributor edits the public site but publishes nothing: their save becomes
a row here for a member to approve or reject. One table describes any change —
create, update, delete or reorder — to any of the six content types, so the
live tables stay exactly as they are until somebody signs off.

No role migration is needed for `contributor` and `member` themselves:
`users.role` is a plain String(20) rather than a native enum, which is the
whole reason adding a role costs nothing here.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd1c73f9b2e46'
down_revision: Union[str, None] = 'c9e4a1b73d52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'website_changes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity', sa.String(length=20), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=10), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('summary', sa.String(length=200), nullable=False, server_default=''),
        sa.Column('status', sa.String(length=12), nullable=False, server_default='pending'),
        sa.Column('submitted_by_id', sa.Integer(), nullable=True),
        sa.Column('submitted_by_name', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('submitted_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('reviewed_by_id', sa.Integer(), nullable=True),
        sa.Column('reviewed_by_name', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=False, server_default=''),
        sa.ForeignKeyConstraint(['submitted_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_website_changes_entity'), 'website_changes', ['entity'])
    op.create_index(op.f('ix_website_changes_status'), 'website_changes', ['status'])
    op.create_index(op.f('ix_website_changes_submitted_by_id'), 'website_changes',
                    ['submitted_by_id'])


def downgrade() -> None:
    op.drop_index(op.f('ix_website_changes_submitted_by_id'), table_name='website_changes')
    op.drop_index(op.f('ix_website_changes_status'), table_name='website_changes')
    op.drop_index(op.f('ix_website_changes_entity'), table_name='website_changes')
    op.drop_table('website_changes')
