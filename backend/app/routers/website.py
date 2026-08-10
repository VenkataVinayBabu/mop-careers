"""Admin content management for the public website.

Site settings today; courses, mentors and stories will join them here.

The admin guard is declared on the router rather than on each endpoint, the
same way the fees router does it, so an endpoint added to this file later
cannot be exposed by forgetting a dependency. Everything here edits what the
whole internet sees, which is exactly the wrong place for that mistake.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import site_settings
from app.database import get_db
from app.deps import require_admin
from app.models import Mentor, User
from app.schemas import (
    MentorCreate,
    MentorOut,
    MentorReorder,
    MentorUpdate,
    MessageResponse,
    SiteSettingsAdmin,
    SiteSettingsUpdate,
)

logger = logging.getLogger("mop.website")

router = APIRouter(
    prefix="/admin/website",
    tags=["website"],
    dependencies=[Depends(require_admin)],
)


@router.get("/settings", response_model=SiteSettingsAdmin)
def read_settings(db: Session = Depends(get_db)) -> SiteSettingsAdmin:
    return SiteSettingsAdmin(**site_settings.typed(site_settings.load_all(db)))


@router.put("/settings", response_model=SiteSettingsAdmin)
def update_settings(
    payload: SiteSettingsUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SiteSettingsAdmin:
    """Partial update. `exclude_unset` is what makes it partial: a field the
    form did not send keeps its current value, rather than a half-populated
    request quietly blanking the phone number.
    """
    changes = payload.model_dump(exclude_unset=True)
    values = site_settings.save(db, site_settings.as_text(changes), admin)

    if changes:
        logger.info("Site settings updated by %s: %s", admin.email, ", ".join(sorted(changes)))
    return SiteSettingsAdmin(**site_settings.typed(values))


# ==========================================================================
#  Mentors
# ==========================================================================
def _get_mentor_or_404(db: Session, mentor_id: int) -> Mentor:
    mentor = db.get(Mentor, mentor_id)
    if mentor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mentor not found")
    return mentor


@router.get("/mentors", response_model=list[MentorOut])
def list_mentors(db: Session = Depends(get_db)) -> list[Mentor]:
    """Every mentor, published or not. The public endpoint filters; this one
    must not, or an unpublished mentor becomes uneditable."""
    return list(db.scalars(select(Mentor).order_by(Mentor.sort_order, Mentor.id)).all())


@router.post("/mentors", response_model=MentorOut, status_code=status.HTTP_201_CREATED)
def create_mentor(
    payload: MentorCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Mentor:
    # Appended at the end. Steps of 10 leave room to slot one between two
    # others later without renumbering the table.
    highest = db.scalar(select(func.max(Mentor.sort_order))) or 0
    mentor = Mentor(**payload.model_dump(), sort_order=highest + 10)
    db.add(mentor)
    db.commit()
    db.refresh(mentor)
    logger.info("Mentor '%s' added by %s", mentor.name, admin.email)
    return mentor


@router.put("/mentors/{mentor_id}", response_model=MentorOut)
def update_mentor(
    mentor_id: int,
    payload: MentorUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Mentor:
    mentor = _get_mentor_or_404(db, mentor_id)
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(mentor, key, value)
    db.commit()
    db.refresh(mentor)
    if changes:
        logger.info("Mentor #%s updated by %s: %s", mentor.id, admin.email, ", ".join(sorted(changes)))
    return mentor


@router.delete("/mentors/{mentor_id}", response_model=MessageResponse)
def delete_mentor(
    mentor_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> MessageResponse:
    mentor = _get_mentor_or_404(db, mentor_id)
    name = mentor.name
    db.delete(mentor)
    db.commit()
    logger.info("Mentor '%s' deleted by %s", name, admin.email)
    return MessageResponse(message=f"{name} removed from the website.")


@router.post("/mentors/reorder", response_model=list[MentorOut])
def reorder_mentors(
    payload: MentorReorder,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[Mentor]:
    """Rewrite the order from the full list of ids.

    Ids that no longer exist are ignored rather than rejected: an admin
    reordering a list while someone else deletes a row should still get their
    order applied, not a 404 and a lost edit. Anything the payload omits keeps
    a position after the ones it names.
    """
    mentors = {m.id: m for m in db.scalars(select(Mentor)).all()}
    position = 0
    for mentor_id in payload.ids:
        mentor = mentors.pop(mentor_id, None)
        if mentor is None:
            continue
        position += 10
        mentor.sort_order = position

    # Whatever was not named keeps its relative order, appended at the end.
    for mentor in sorted(mentors.values(), key=lambda m: (m.sort_order, m.id)):
        position += 10
        mentor.sort_order = position

    db.commit()
    logger.info("Mentors reordered by %s", admin.email)
    return list(db.scalars(select(Mentor).order_by(Mentor.sort_order, Mentor.id)).all())
