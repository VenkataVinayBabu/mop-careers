"""viewer chase log and delivery timestamps

Revision ID: c9e4a1b73d52
Revises: b3f8c92a41d6
Create Date: 2026-08-11 15:41:52.118904

The viewer's follow-up list already closed itself when a teacher
uploaded, but it kept no record of any of it: not when the file arrived, and
not that anybody had rung about it. This adds both halves of the trail.

    curriculum_days.taught_marked_at        when the class was marked taught
    curriculum_days.recording_uploaded_at   when the recording link appeared
    curriculum_days.notes_uploaded_at       when the notes PDF appeared
    class_chases                            who rang about it, and when

Every existing row gets NULL for the three timestamps, and that is the honest
answer: those uploads happened before anything was recording the date. The API
returns null and the screens say "date not recorded" rather than backfilling a
made-up one from created_at, which would look like data and be fiction.

Chases attach to a class day rather than to a particular missing item. One
phone call covers "day 9 has neither the recording nor the notes".
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9e4a1b73d52'
down_revision: Union[str, None] = 'b3f8c92a41d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('curriculum_days',
                  sa.Column('taught_marked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('curriculum_days',
                  sa.Column('recording_uploaded_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('curriculum_days',
                  sa.Column('notes_uploaded_at', sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        'class_chases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('curriculum_day_id', sa.Integer(), nullable=False),
        sa.Column('chased_by_id', sa.Integer(), nullable=True),
        sa.Column('chased_by_name', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('chased_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('note', sa.String(length=300), nullable=False, server_default=''),
        sa.ForeignKeyConstraint(['curriculum_day_id'], ['curriculum_days.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chased_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_class_chases_curriculum_day_id'), 'class_chases',
                    ['curriculum_day_id'])
    op.create_index(op.f('ix_class_chases_chased_by_id'), 'class_chases', ['chased_by_id'])


def downgrade() -> None:
    op.drop_index(op.f('ix_class_chases_chased_by_id'), table_name='class_chases')
    op.drop_index(op.f('ix_class_chases_curriculum_day_id'), table_name='class_chases')
    op.drop_table('class_chases')
    op.drop_column('curriculum_days', 'notes_uploaded_at')
    op.drop_column('curriculum_days', 'recording_uploaded_at')
    op.drop_column('curriculum_days', 'taught_marked_at')
