"""team section profile

Revision ID: a79a85b6fc24
Revises: 102c0b5b1f66
Create Date: 2026-08-14 23:28:28.622222
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a79a85b6fc24'
down_revision: Union[str, None] = '102c0b5b1f66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BIO = (
    "Venkata Vinay Babu Kuppala is a full stack developer with over four years of experience "
    "building web applications in Python, currently at TCS and previously at Oracle. He has "
    "worked across the healthcare, education and e-commerce domains.\n\n"
    "He designed and developed the entire MOP Careers platform — the public website and the "
    "signed-in application behind it, covering student and batch management, attendance, class "
    "schedules, fee records and placements, along with a role-based admin system that lets the "
    "MOP team manage the site's content themselves.\n\n"
    "His focus is on practical, maintainable software: FastAPI and PostgreSQL on the backend, "
    "React on the front, and building tools that the people who use them can operate without "
    "needing a developer."
)


def upgrade() -> None:
    """The first person in the new "Our Team" section on the About page.

    Seeded here rather than added through the admin screen because a profile is
    a database row: pushing the code alone would put the photo on the server
    and leave production's About page unchanged, and the same details would
    have to be retyped against the live site. The two leaders and the four job
    openings arrived the same way.

    Anything here is editable at Admin > Website > Leadership & team
    afterwards — this only decides what the row starts as. The photo it points
    at is committed at `frontend/public/team/vinay.jpg`.
    """
    op.bulk_insert(
        sa.table(
            'leaders',
            sa.column('section', sa.String),
            sa.column('name', sa.String),
            sa.column('role', sa.String),
            sa.column('tags', sa.JSON),
            sa.column('meta', sa.String),
            sa.column('bio', sa.Text),
            sa.column('photo_url', sa.String),
            sa.column('published', sa.Boolean),
            sa.column('sort_order', sa.Integer),
        ),
        [
            {
                'section': 'team',
                'name': 'Venkata Vinay Babu Kuppala',
                'role': 'Full Stack Developer',
                'tags': ['Ex-Oracle', 'TCS'],
                'meta': '4+ Years · Python Full Stack',
                'bio': BIO,
                'photo_url': '/team/vinay.jpg',
                'published': True,
                'sort_order': 30,
            },
        ],
    )


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM leaders WHERE name = :name AND section = 'team'").bindparams(
            name='Venkata Vinay Babu Kuppala'
        )
    )
