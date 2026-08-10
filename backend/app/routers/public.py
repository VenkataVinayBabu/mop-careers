"""Public, unauthenticated endpoints for the marketing site.

The enquiry form and the site settings the marketing pages render. The enquiry
form is the one write path on the whole API that anyone on the internet can
reach, so it carries its own throttle on top of Pydantic validation.
"""
import logging
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import site_settings
from app.database import get_db
from app.mail import send_email
from app.models import Enquiry, Mentor
from app.schemas import EnquiryCreate, MentorOut, MessageResponse, SiteSettingsPublic

logger = logging.getLogger("mop.public")
router = APIRouter(prefix="/public", tags=["public"])

# Simple in-process throttle: enough to stop a form being hammered, and it
# needs no extra dependency. A multi-process deployment would want Redis.
_RATE_WINDOW_SECONDS = 3600
_RATE_MAX_PER_IP = 5
_recent: dict[str, list[float]] = defaultdict(list)


def _rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    hits = [t for t in _recent[ip] if now - t < _RATE_WINDOW_SECONDS]
    if len(hits) >= _RATE_MAX_PER_IP:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many enquiries from this address. Please try again later.",
        )
    hits.append(now)
    _recent[ip] = hits


@router.get("/site-settings", response_model=SiteSettingsPublic)
def read_site_settings(db: Session = Depends(get_db)) -> SiteSettingsPublic:
    """Contact details, announcement and social links for the marketing site.

    Unthrottled and unauthenticated: it is a read of content that is already
    printed in the page footer. The site renders its own baked-in copy first
    and overlays this when it arrives, so a slow or failed call here shows a
    slightly stale footer rather than an empty page.
    """
    return SiteSettingsPublic(**site_settings.typed(site_settings.load_public(db)))


@router.get("/mentors", response_model=list[MentorOut])
def read_mentors(db: Session = Depends(get_db)) -> list[Mentor]:
    """Published mentors, in the order an admin arranged them.

    An empty list is a real answer, not a missing one: if an admin deletes
    every mentor the site must show none, rather than falling back to the copy
    baked into the bundle. That is why the table is seeded rather than
    starting empty — see the mentors migration.
    """
    return list(
        db.scalars(
            select(Mentor).where(Mentor.published.is_(True)).order_by(Mentor.sort_order, Mentor.id)
        ).all()
    )


@router.post("/enquiries", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def submit_enquiry(
    payload: EnquiryCreate, request: Request, db: Session = Depends(get_db)
) -> MessageResponse:
    _rate_limit(request)

    enquiry = Enquiry(
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=payload.email.lower(),
        programme=(payload.programme or "").strip() or None,
        message=payload.message.strip(),
    )
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)

    body = f"""New enquiry from the MOP Careers website.

Name:      {enquiry.name}
Phone:     {enquiry.phone}
Email:     {enquiry.email}
Programme: {enquiry.programme or 'Not specified'}

Message:
{enquiry.message}

--
Enquiry #{enquiry.id}
"""
    # The programme is in the subject so the team can triage from the inbox.
    subject = f"[MOP Enquiry] {enquiry.name}"
    if enquiry.programme:
        subject += f" — {enquiry.programme}"

    # The enquiry is already saved, so a mail failure never loses the lead.
    # The address comes from the settings table when an admin has set one,
    # falling back to ENQUIRY_EMAIL in .env — changing where leads land no
    # longer needs a redeploy.
    send_email(site_settings.enquiry_email(db), subject, body)

    logger.info("Enquiry #%s received from %s", enquiry.id, enquiry.email)
    return MessageResponse(
        message="Thanks for getting in touch. The MOP Careers team will contact you shortly."
    )
