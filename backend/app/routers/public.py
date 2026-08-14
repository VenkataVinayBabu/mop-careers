"""Public, unauthenticated endpoints for the marketing site.

The enquiry form and the site settings the marketing pages render. The enquiry
form is the one write path on the whole API that anyone on the internet can
reach, so it carries its own throttle on top of Pydantic validation.
"""
import logging
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import site_settings
from app.database import get_db
from app.mail import send_email
from app.models import (
    Enquiry, HiringPartner, JobApplication, JobOpening, Leader, Mentor, Program, Statistic,
    Story,
)
from app.schemas import (
    EnquiryCreate,
    JobApplicationCreate,
    JobOpeningOut,
    LeaderOut,
    HiringPartnerOut,
    MentorOut,
    MessageResponse,
    ProgramOut,
    SiteSettingsPublic,
    StatisticOut,
    StoryOut,
)
from app.website_content import ordered

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
    starting empty — see the mentors migration. The same applies to the two
    endpoints below.
    """
    return ordered(db, Mentor, published_only=True)


@router.get("/stories", response_model=list[StoryOut])
def read_stories(db: Session = Depends(get_db)) -> list[Story]:
    return ordered(db, Story, published_only=True)


@router.get("/programs", response_model=list[ProgramOut])
def read_programs(db: Session = Depends(get_db)) -> list[Program]:
    """Published programmes, in the order an admin arranged them.

    One request carries the whole catalogue including every detail block. That
    is roughly 60KB for eight programmes, which is cheaper than a second round
    trip to a backend that may be waking from idle — and it means clicking
    through to a programme page needs no fetch at all.
    """
    return ordered(db, Program, published_only=True)


@router.get("/partners", response_model=list[HiringPartnerOut])
def read_partners(db: Session = Depends(get_db)) -> list[HiringPartner]:
    """Every published company, for the hiring-network grid.

    The placements ticker is the subset carrying a `package_lpa`, filtered on
    the frontend rather than served as a second endpoint — it is the same
    dozen rows, and two requests for one list would be wasteful on a connection
    that may be waking a sleeping backend.
    """
    return ordered(db, HiringPartner, published_only=True)


@router.get("/statistics", response_model=list[StatisticOut])
def read_statistics(db: Session = Depends(get_db)) -> list[Statistic]:
    """The headline figures for both the hero strip and the outcomes grid.

    One list; the frontend splits it by `section`. These are the least
    verified claims on the site — see CLAUDE.md.
    """
    return ordered(db, Statistic, published_only=True)


@router.get("/leaders", response_model=list[LeaderOut])
def read_leaders(db: Session = Depends(get_db)) -> list[Leader]:
    """The About page's leadership section."""
    return ordered(db, Leader, published_only=True)


@router.get("/openings", response_model=list[JobOpeningOut])
def read_openings(db: Session = Depends(get_db)) -> list[JobOpening]:
    """The careers page's open roles. Unpublished ones are how a filled
    position comes off the site without being deleted, so they are excluded
    here and stay editable in the admin list."""
    return ordered(db, JobOpening, published_only=True)


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


@router.post(
    "/job-applications", response_model=MessageResponse, status_code=status.HTTP_201_CREATED
)
def submit_job_application(
    payload: JobApplicationCreate, request: Request, db: Session = Depends(get_db)
) -> MessageResponse:
    """The careers page's Apply form. Shares the enquiry form's throttle, being
    the other write path anyone on the internet can reach."""
    _rate_limit(request)

    application = JobApplication(
        position=payload.position.strip(),
        name=payload.name.strip(),
        email=payload.email.lower(),
        phone=payload.phone.strip(),
        years_experience=payload.years_experience.strip(),
        resume_url=payload.resume_url,
        portfolio_url=payload.portfolio_url,
        cover_letter=(payload.cover_letter or "").strip() or None,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    body = f"""New job application from the MOP Careers website.

Position:   {application.position}
Name:       {application.name}
Email:      {application.email}
Phone:      {application.phone}
Experience: {application.years_experience}
Resume:     {application.resume_url}
Portfolio:  {application.portfolio_url or 'Not provided'}

Cover letter:
{application.cover_letter or 'Not provided'}

--
Application #{application.id}
"""
    # Saved before the mail goes out, so a mail failure never loses a candidate
    # — which matters more here than for enquiries, because SMTP is still
    # unconfigured and these currently only exist in the database.
    send_email(
        site_settings.enquiry_email(db),
        f"[MOP Careers] Application — {application.position} — {application.name}",
        body,
    )

    logger.info(
        "Job application #%s for %r from %s",
        application.id, application.position, application.email,
    )
    return MessageResponse(
        message="Thanks for applying. The MOP Careers team will be in touch if there is a fit."
    )
