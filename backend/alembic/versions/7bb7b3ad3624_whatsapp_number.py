"""whatsapp number

Revision ID: 7bb7b3ad3624
Revises: c79fb49ee5c4
Create Date: 2026-08-15 09:35:40.439254
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7bb7b3ad3624'
down_revision: Union[str, None] = 'c79fb49ee5c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Digits with the country code and nothing else: wa.me rejects '+', spaces and
# dashes, so 6364805505 becomes 916364805505. Only the link uses this form —
# the number is displayed normally wherever the site shows it.
WHATSAPP = '916364805505'


def upgrade() -> None:
    """Bala's WhatsApp number, which had never been supplied.

    Until now every WhatsApp button on the site fell back to the enquiry form,
    and the footer read "WhatsApp — pending". It is a settings row rather than
    code, so it needs seeding to reach production at all.

    Written as an upsert that only fills a blank: settings are Bala's to change
    at Admin > Website, and a migration that lands after he has corrected the
    number must not overwrite him. If a real value is already there, this does
    nothing.
    """
    op.execute(
        sa.text(
            "INSERT INTO site_settings (key, value) VALUES ('whatsapp', :v) "
            "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value "
            "WHERE site_settings.value = '' OR site_settings.value IS NULL"
        ).bindparams(v=WHATSAPP)
    )


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM site_settings WHERE key = 'whatsapp' AND value = :v")
        .bindparams(v=WHATSAPP)
    )
