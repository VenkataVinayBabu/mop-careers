"""Editable settings for the public website.

The first piece of content management: the handful of fields Bala needs to
change without a developer and a git push — the phone number, the WhatsApp
number, the announcement strip, the social links, and where enquiry and doubt
notifications are delivered.

Two groups of keys, and the split matters:

  PUBLIC_KEYS  are served unauthenticated to the marketing site.
  ADMIN_KEYS   are internal routing addresses. They are never in the public
               payload — the site displays `email` (hello@…), while enquiries
               are delivered to `enquiry_email`, which nobody outside the
               admin screens has any business reading.

DEFAULTS mirror `frontend/src/data/site.js` deliberately. The public site
renders its own baked-in copy immediately and overlays whatever the API
returns a moment later, so if the two disagree the page visibly changes under
the reader. Change one, change the other.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import SiteSetting, User

# --- vocabulary -----------------------------------------------------------
PUBLIC_KEYS: tuple[str, ...] = (
    "whatsapp",
    "whatsapp_message",
    "phone",
    "email",
    "address",
    "announcement",
    "announcement_tag",
    "announcement_enabled",
    "social_linkedin",
    "social_instagram",
    "social_youtube",
    "social_facebook",
    # The standard fee structure, shown on every programme page. A programme
    # can override any of these from its own editor; these are the fallback,
    # and the only figures most programmes will ever show.
    "fee_registration",
    "fee_registration_was",
    "fee_registration_note",
    "fee_tuition",
    "fee_tuition_was",
    "fee_tuition_note",
    "fee_emi",
)

ADMIN_KEYS: tuple[str, ...] = (
    "enquiry_email",
    "doubts_email",
)

ALL_KEYS: tuple[str, ...] = PUBLIC_KEYS + ADMIN_KEYS

# Booleans are stored as "true"/"false" strings, since the column is text.
BOOL_KEYS: frozenset[str] = frozenset({"announcement_enabled"})

DEFAULTS: dict[str, str] = {
    # Blank until MOP confirms which number takes WhatsApp. Blank is a real
    # answer here: the buttons fall back to the enquiry form rather than
    # opening a chat with nobody.
    "whatsapp": "",
    "whatsapp_message": "Hi MOP Careers, I'd like to know more about your programs.",
    "phone": "+91 98908 13235",
    "email": "hello@mopcareers.com",
    "address": "HSR Layout, Bengaluru — Karnataka 560102",
    "announcement": "Applications open for the next cohort",
    "announcement_tag": "Now enrolling",
    "announcement_enabled": "true",
    "social_linkedin": "",
    "social_instagram": "",
    "social_youtube": "",
    "social_facebook": "",
    # These came from MOP's own programme page and are NOT independently
    # verified. A `*_was` value renders struck through; blank hides the strike.
    "fee_registration": "₹50,000",
    "fee_registration_was": "₹90,000",
    "fee_registration_note": "Inclusive of taxes · pay to start classes",
    "fee_tuition": "₹1,20,000 + GST",
    "fee_tuition_was": "₹1,60,000",
    "fee_tuition_note": "Payable only after you accept an offer at your agreed CTC. No loans.",
    "fee_emi": "₹5,000 / month",
    # Empty means "fall back to the .env value", which is how these worked
    # before this table existed. Setting one here overrides the environment
    # without a redeploy.
    "enquiry_email": "",
    "doubts_email": "",
}


# --- reads ----------------------------------------------------------------
def load_all(db: Session) -> dict[str, str]:
    """Every setting, defaults filled in for keys with no row yet."""
    values = dict(DEFAULTS)
    for row in db.scalars(select(SiteSetting)).all():
        # Ignore rows for keys that no longer exist, so removing a field from
        # the vocabulary does not break the read path.
        if row.key in values:
            values[row.key] = row.value
    return values


def load_public(db: Session) -> dict[str, str]:
    all_values = load_all(db)
    return {k: all_values[k] for k in PUBLIC_KEYS}


def enquiry_email(db: Session) -> str:
    """Where a new website enquiry is delivered.

    The database wins when set; otherwise the .env value, which is what this
    was before the setting existed.
    """
    return load_all(db)["enquiry_email"].strip() or settings.ENQUIRY_EMAIL


def doubts_email(db: Session) -> str:
    """Where technical/other doubts are delivered, and the fallback for a
    class doubt whose batch has no teacher assigned."""
    return load_all(db)["doubts_email"].strip() or settings.ADMIN_DOUBTS_EMAIL


# --- string store <-> typed payload ---------------------------------------
def typed(values: dict[str, str]) -> dict[str, str | bool]:
    """The store is all text; the API is typed. Coerce on the way out."""
    return {
        k: (v.strip().lower() == "true" if k in BOOL_KEYS else v)
        for k, v in values.items()
    }


def as_text(changes: dict[str, object]) -> dict[str, str]:
    """And back on the way in. Anything not a string becomes one here, so the
    column never has to care what a field is declared as."""
    out: dict[str, str] = {}
    for key, value in changes.items():
        if isinstance(value, bool):
            out[key] = "true" if value else "false"
        else:
            out[key] = str(value)
    return out


# --- writes ---------------------------------------------------------------
def save(db: Session, changes: dict[str, str], admin: User) -> dict[str, str]:
    """Apply a partial update and return the full settings afterwards.

    A value equal to its default still writes a row. Trying to be clever and
    delete the row instead would make "the admin deliberately set this to the
    same thing" indistinguishable from "never touched", and the audit columns
    are worth more than the saved row.
    """
    existing = {row.key: row for row in db.scalars(select(SiteSetting)).all()}

    for key, value in changes.items():
        if key not in ALL_KEYS:
            continue
        row = existing.get(key)
        if row is None:
            db.add(SiteSetting(key=key, value=value, updated_by_id=admin.id))
        else:
            row.value = value
            row.updated_by_id = admin.id

    db.commit()
    return load_all(db)
