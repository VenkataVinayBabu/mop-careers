"""Admin content management for the public website.

Site settings, mentors, learner stories and hiring partners. Courses are the
one remaining entity, and they will not fit this shape — see CLAUDE.md.

The admin guard is declared on the router rather than on each endpoint, the
same way the fees router does it, so an endpoint added to this file later
cannot be exposed by forgetting a dependency. Everything here edits what the
whole internet sees, which is exactly the wrong place for that mistake.

The three list entities share their ordering, publishing and reorder rules —
that logic lives in `app.website_content` rather than three times over.
"""
import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app import site_settings
from app.database import get_db
from app.deps import require_admin
from app.models import HiringPartner, Mentor, Story, User
from app.schemas import (
    HiringPartnerCreate,
    HiringPartnerOut,
    HiringPartnerUpdate,
    MentorCreate,
    MentorOut,
    MentorUpdate,
    MessageResponse,
    ReorderRequest,
    SiteSettingsAdmin,
    SiteSettingsUpdate,
    StoryCreate,
    StoryOut,
    StoryUpdate,
)
from app.website_content import apply_reorder, get_or_404, next_sort_order, ordered

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
#  Mentors, stories and hiring partners
# ==========================================================================
#  All three follow the same five endpoints. They are written out rather than
#  generated, because a reader wants to see what each one does — but every
#  behaviour they share (ordering, 404s, appending, reordering) comes from
#  `app.website_content`, so it is fixed in one place.
#
#  A list endpoint here never filters by `published`: the public endpoints do
#  that, and an unpublished row still has to be editable.
def _save_new(db: Session, obj, admin: User, label: str):
    db.add(obj)
    db.commit()
    db.refresh(obj)
    logger.info("%s '%s' added by %s", label, obj.name, admin.email)
    return obj


def _apply_changes(db: Session, obj, payload, admin: User, label: str):
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    if changes:
        logger.info("%s #%s updated by %s: %s", label, obj.id, admin.email, ", ".join(sorted(changes)))
    return obj


def _remove(db: Session, obj, admin: User, label: str) -> MessageResponse:
    name = obj.name
    db.delete(obj)
    db.commit()
    logger.info("%s '%s' deleted by %s", label, name, admin.email)
    return MessageResponse(message=f"{name} removed from the website.")


# --- mentors --------------------------------------------------------------
@router.get("/mentors", response_model=list[MentorOut])
def list_mentors(db: Session = Depends(get_db)) -> list[Mentor]:
    return ordered(db, Mentor)


@router.post("/mentors", response_model=MentorOut, status_code=status.HTTP_201_CREATED)
def create_mentor(
    payload: MentorCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)
) -> Mentor:
    return _save_new(
        db, Mentor(**payload.model_dump(), sort_order=next_sort_order(db, Mentor)), admin, "Mentor"
    )


@router.put("/mentors/{mentor_id}", response_model=MentorOut)
def update_mentor(
    mentor_id: int,
    payload: MentorUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Mentor:
    return _apply_changes(db, get_or_404(db, Mentor, mentor_id, "Mentor"), payload, admin, "Mentor")


@router.delete("/mentors/{mentor_id}", response_model=MessageResponse)
def delete_mentor(
    mentor_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)
) -> MessageResponse:
    return _remove(db, get_or_404(db, Mentor, mentor_id, "Mentor"), admin, "Mentor")


@router.post("/mentors/reorder", response_model=list[MentorOut])
def reorder_mentors(
    payload: ReorderRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)
) -> list[Mentor]:
    logger.info("Mentors reordered by %s", admin.email)
    return apply_reorder(db, Mentor, payload.ids)


# --- learner stories ------------------------------------------------------
@router.get("/stories", response_model=list[StoryOut])
def list_stories(db: Session = Depends(get_db)) -> list[Story]:
    return ordered(db, Story)


@router.post("/stories", response_model=StoryOut, status_code=status.HTTP_201_CREATED)
def create_story(
    payload: StoryCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)
) -> Story:
    return _save_new(
        db, Story(**payload.model_dump(), sort_order=next_sort_order(db, Story)), admin, "Story"
    )


@router.put("/stories/{story_id}", response_model=StoryOut)
def update_story(
    story_id: int,
    payload: StoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Story:
    return _apply_changes(db, get_or_404(db, Story, story_id, "Story"), payload, admin, "Story")


@router.delete("/stories/{story_id}", response_model=MessageResponse)
def delete_story(
    story_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)
) -> MessageResponse:
    return _remove(db, get_or_404(db, Story, story_id, "Story"), admin, "Story")


@router.post("/stories/reorder", response_model=list[StoryOut])
def reorder_stories(
    payload: ReorderRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)
) -> list[Story]:
    logger.info("Stories reordered by %s", admin.email)
    return apply_reorder(db, Story, payload.ids)


# --- hiring partners ------------------------------------------------------
@router.get("/partners", response_model=list[HiringPartnerOut])
def list_partners(db: Session = Depends(get_db)) -> list[HiringPartner]:
    return ordered(db, HiringPartner)


@router.post("/partners", response_model=HiringPartnerOut, status_code=status.HTTP_201_CREATED)
def create_partner(
    payload: HiringPartnerCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> HiringPartner:
    return _save_new(
        db,
        HiringPartner(**payload.model_dump(), sort_order=next_sort_order(db, HiringPartner)),
        admin,
        "Hiring partner",
    )


@router.put("/partners/{partner_id}", response_model=HiringPartnerOut)
def update_partner(
    partner_id: int,
    payload: HiringPartnerUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> HiringPartner:
    return _apply_changes(
        db, get_or_404(db, HiringPartner, partner_id, "Hiring partner"), payload, admin, "Hiring partner"
    )


@router.delete("/partners/{partner_id}", response_model=MessageResponse)
def delete_partner(
    partner_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)
) -> MessageResponse:
    return _remove(
        db, get_or_404(db, HiringPartner, partner_id, "Hiring partner"), admin, "Hiring partner"
    )


@router.post("/partners/reorder", response_model=list[HiringPartnerOut])
def reorder_partners(
    payload: ReorderRequest, db: Session = Depends(get_db), admin: User = Depends(require_admin)
) -> list[HiringPartner]:
    logger.info("Hiring partners reordered by %s", admin.email)
    return apply_reorder(db, HiringPartner, payload.ids)
