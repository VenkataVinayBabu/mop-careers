"""Admin content management for the public website.

Site settings, mentors, learner stories, hiring partners and programmes —
every piece of the marketing site an admin can now change without a deploy.

The admin guard is declared on the router rather than on each endpoint, the
same way the fees router does it, so an endpoint added to this file later
cannot be exposed by forgetting a dependency. Everything here edits what the
whole internet sees, which is exactly the wrong place for that mistake.

The four list entities share their ordering, publishing and reorder rules —
that logic lives in `app.website_content` rather than four times over.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import site_settings
from app.database import get_db
from app.deps import require_publisher, require_website_editor
from app.models import (
    HiringPartner, JobOpening, Leader, Mentor, Program, Statistic, Story, User,
)
from app.schemas import (
    HiringPartnerCreate,
    HiringPartnerOut,
    HiringPartnerUpdate,
    JobOpeningCreate,
    JobOpeningOut,
    JobOpeningUpdate,
    LeaderCreate,
    LeaderOut,
    LeaderUpdate,
    MentorCreate,
    MentorOut,
    MentorUpdate,
    MessageResponse,
    ProgramAdminOut,
    ProgramCreate,
    ProgramUpdate,
    ReorderRequest,
    SiteSettingsAdmin,
    SiteSettingsUpdate,
    StatisticCreate,
    StatisticOut,
    StatisticUpdate,
    StoryCreate,
    StoryOut,
    StoryUpdate,
)
from app.website_content import apply_reorder, get_or_404, next_sort_order, ordered

logger = logging.getLogger("mop.website")

router = APIRouter(
    prefix="/admin/website",
    tags=["website"],
    dependencies=[Depends(require_website_editor)],
)


@router.get("/settings", response_model=SiteSettingsAdmin)
def read_settings(db: Session = Depends(get_db)) -> SiteSettingsAdmin:
    return SiteSettingsAdmin(**site_settings.typed(site_settings.load_all(db)))


@router.put("/settings", response_model=SiteSettingsAdmin)
def update_settings(
    payload: SiteSettingsUpdate,
    db: Session = Depends(get_db),
    publisher: User = Depends(require_publisher),
) -> SiteSettingsAdmin:
    """Partial update. `exclude_unset` is what makes it partial: a field the
    form did not send keeps its current value, rather than a half-populated
    request quietly blanking the phone number.
    """
    changes = payload.model_dump(exclude_unset=True)
    values = site_settings.save(db, site_settings.as_text(changes), publisher)

    if changes:
        logger.info("Site settings updated by %s: %s", publisher.email, ", ".join(sorted(changes)))
    return SiteSettingsAdmin(**site_settings.typed(values))


# ==========================================================================
#  Mentors, stories, hiring partners and programmes
# ==========================================================================
#  All four follow the same five endpoints. They are written out rather than
#  generated, because a reader wants to see what each one does — but every
#  behaviour they share (ordering, 404s, appending, reordering) comes from
#  `app.website_content`, so it is fixed in one place.
#
#  A list endpoint here never filters by `published`: the public endpoints do
#  that, and an unpublished row still has to be editable.
def _save_new(db: Session, obj, publisher: User, label: str):
    db.add(obj)
    db.commit()
    db.refresh(obj)
    logger.info("%s '%s' added by %s", label, obj.name, publisher.email)
    return obj


def _apply_changes(db: Session, obj, payload, publisher: User, label: str):
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    if changes:
        logger.info("%s #%s updated by %s: %s", label, obj.id, publisher.email, ", ".join(sorted(changes)))
    return obj


def _remove(db: Session, obj, publisher: User, label: str) -> MessageResponse:
    name = obj.name
    db.delete(obj)
    db.commit()
    logger.info("%s '%s' deleted by %s", label, name, publisher.email)
    return MessageResponse(message=f"{name} removed from the website.")


# --- mentors --------------------------------------------------------------
@router.get("/mentors", response_model=list[MentorOut])
def list_mentors(db: Session = Depends(get_db)) -> list[Mentor]:
    return ordered(db, Mentor)


@router.post("/mentors", response_model=MentorOut, status_code=status.HTTP_201_CREATED)
def create_mentor(
    payload: MentorCreate, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> Mentor:
    return _save_new(
        db, Mentor(**payload.model_dump(), sort_order=next_sort_order(db, Mentor)), publisher, "Mentor"
    )


@router.put("/mentors/{mentor_id}", response_model=MentorOut)
def update_mentor(
    mentor_id: int,
    payload: MentorUpdate,
    db: Session = Depends(get_db),
    publisher: User = Depends(require_publisher),
) -> Mentor:
    return _apply_changes(db, get_or_404(db, Mentor, mentor_id, "Mentor"), payload, publisher, "Mentor")


@router.delete("/mentors/{mentor_id}", response_model=MessageResponse)
def delete_mentor(
    mentor_id: int, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> MessageResponse:
    return _remove(db, get_or_404(db, Mentor, mentor_id, "Mentor"), publisher, "Mentor")


@router.post("/mentors/reorder", response_model=list[MentorOut])
def reorder_mentors(
    payload: ReorderRequest, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> list[Mentor]:
    logger.info("Mentors reordered by %s", publisher.email)
    return apply_reorder(db, Mentor, payload.ids)


# --- leadership (About page) ----------------------------------------------
@router.get("/leaders", response_model=list[LeaderOut])
def list_leaders(db: Session = Depends(get_db)) -> list[Leader]:
    return ordered(db, Leader)


@router.post("/leaders", response_model=LeaderOut, status_code=status.HTTP_201_CREATED)
def create_leader(
    payload: LeaderCreate, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> Leader:
    return _save_new(
        db, Leader(**payload.model_dump(), sort_order=next_sort_order(db, Leader)), publisher, "Leader"
    )


@router.put("/leaders/{leader_id}", response_model=LeaderOut)
def update_leader(
    leader_id: int,
    payload: LeaderUpdate,
    db: Session = Depends(get_db),
    publisher: User = Depends(require_publisher),
) -> Leader:
    return _apply_changes(db, get_or_404(db, Leader, leader_id, "Leader"), payload, publisher, "Leader")


@router.delete("/leaders/{leader_id}", response_model=MessageResponse)
def delete_leader(
    leader_id: int, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> MessageResponse:
    return _remove(db, get_or_404(db, Leader, leader_id, "Leader"), publisher, "Leader")


@router.post("/leaders/reorder", response_model=list[LeaderOut])
def reorder_leaders(
    payload: ReorderRequest, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> list[Leader]:
    logger.info("Leaders reordered by %s", publisher.email)
    return apply_reorder(db, Leader, payload.ids)


# --- job openings ---------------------------------------------------------
@router.get("/openings", response_model=list[JobOpeningOut])
def list_openings(db: Session = Depends(get_db)) -> list[JobOpening]:
    return ordered(db, JobOpening)


@router.post("/openings", response_model=JobOpeningOut, status_code=status.HTTP_201_CREATED)
def create_opening(
    payload: JobOpeningCreate,
    db: Session = Depends(get_db),
    publisher: User = Depends(require_publisher),
) -> JobOpening:
    return _save_new(
        db,
        JobOpening(**payload.model_dump(), sort_order=next_sort_order(db, JobOpening)),
        publisher,
        "Job opening",
    )


@router.put("/openings/{opening_id}", response_model=JobOpeningOut)
def update_opening(
    opening_id: int,
    payload: JobOpeningUpdate,
    db: Session = Depends(get_db),
    publisher: User = Depends(require_publisher),
) -> JobOpening:
    return _apply_changes(
        db, get_or_404(db, JobOpening, opening_id, "Job opening"), payload, publisher, "Job opening"
    )


@router.delete("/openings/{opening_id}", response_model=MessageResponse)
def delete_opening(
    opening_id: int, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> MessageResponse:
    return _remove(
        db, get_or_404(db, JobOpening, opening_id, "Job opening"), publisher, "Job opening"
    )


@router.post("/openings/reorder", response_model=list[JobOpeningOut])
def reorder_openings(
    payload: ReorderRequest, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> list[JobOpening]:
    logger.info("Job openings reordered by %s", publisher.email)
    return apply_reorder(db, JobOpening, payload.ids)


# --- learner stories ------------------------------------------------------
@router.get("/stories", response_model=list[StoryOut])
def list_stories(db: Session = Depends(get_db)) -> list[Story]:
    return ordered(db, Story)


@router.post("/stories", response_model=StoryOut, status_code=status.HTTP_201_CREATED)
def create_story(
    payload: StoryCreate, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> Story:
    return _save_new(
        db, Story(**payload.model_dump(), sort_order=next_sort_order(db, Story)), publisher, "Story"
    )


@router.put("/stories/{story_id}", response_model=StoryOut)
def update_story(
    story_id: int,
    payload: StoryUpdate,
    db: Session = Depends(get_db),
    publisher: User = Depends(require_publisher),
) -> Story:
    return _apply_changes(db, get_or_404(db, Story, story_id, "Story"), payload, publisher, "Story")


@router.delete("/stories/{story_id}", response_model=MessageResponse)
def delete_story(
    story_id: int, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> MessageResponse:
    return _remove(db, get_or_404(db, Story, story_id, "Story"), publisher, "Story")


@router.post("/stories/reorder", response_model=list[StoryOut])
def reorder_stories(
    payload: ReorderRequest, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> list[Story]:
    logger.info("Stories reordered by %s", publisher.email)
    return apply_reorder(db, Story, payload.ids)


# --- hiring partners ------------------------------------------------------
@router.get("/partners", response_model=list[HiringPartnerOut])
def list_partners(db: Session = Depends(get_db)) -> list[HiringPartner]:
    return ordered(db, HiringPartner)


@router.post("/partners", response_model=HiringPartnerOut, status_code=status.HTTP_201_CREATED)
def create_partner(
    payload: HiringPartnerCreate,
    db: Session = Depends(get_db),
    publisher: User = Depends(require_publisher),
) -> HiringPartner:
    return _save_new(
        db,
        HiringPartner(**payload.model_dump(), sort_order=next_sort_order(db, HiringPartner)),
        publisher,
        "Hiring partner",
    )


@router.put("/partners/{partner_id}", response_model=HiringPartnerOut)
def update_partner(
    partner_id: int,
    payload: HiringPartnerUpdate,
    db: Session = Depends(get_db),
    publisher: User = Depends(require_publisher),
) -> HiringPartner:
    return _apply_changes(
        db, get_or_404(db, HiringPartner, partner_id, "Hiring partner"), payload, publisher, "Hiring partner"
    )


@router.delete("/partners/{partner_id}", response_model=MessageResponse)
def delete_partner(
    partner_id: int, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> MessageResponse:
    return _remove(
        db, get_or_404(db, HiringPartner, partner_id, "Hiring partner"), publisher, "Hiring partner"
    )


@router.post("/partners/reorder", response_model=list[HiringPartnerOut])
def reorder_partners(
    payload: ReorderRequest, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> list[HiringPartner]:
    logger.info("Hiring partners reordered by %s", publisher.email)
    return apply_reorder(db, HiringPartner, payload.ids)


# --- programmes -----------------------------------------------------------
# The only entity here with a unique slug, so it is the only one that can
# collide on create. 409 rather than a 500 from the database constraint.
def _assert_slug_free(db: Session, slug: str, ignore_id: int | None = None) -> None:
    existing = db.scalar(select(Program).where(Program.slug == slug))
    if existing is not None and existing.id != ignore_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"The web address '{slug}' is already used by {existing.name}.",
        )


def _assert_template_fits(curriculum: list[dict], total_days: int) -> None:
    """A planned day past the end of the programme would never be built into a
    batch. Silently dropping it is the kind of thing nobody notices until a
    class is missing, so it is refused."""
    over = [
        d["day_number"]
        for d in curriculum
        if isinstance(d, dict) and isinstance(d.get("day_number"), int)
        and d["day_number"] > total_days
    ]
    if over:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"This programme runs for {total_days} days, so day "
            f"{over[0]} cannot be planned. Raise the length or move the day.",
        )


@router.get("/programs", response_model=list[ProgramAdminOut])
def list_programs(db: Session = Depends(get_db)) -> list[Program]:
    return ordered(db, Program)


@router.post("/programs", response_model=ProgramAdminOut, status_code=status.HTTP_201_CREATED)
def create_program(
    payload: ProgramCreate, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> Program:
    _assert_slug_free(db, payload.slug)
    data = payload.model_dump()
    data["detail"] = payload.detail.model_dump()
    _assert_template_fits(data["curriculum"], data["total_days"])
    return _save_new(
        db, Program(**data, sort_order=next_sort_order(db, Program)), publisher, "Program"
    )


@router.put("/programs/{program_id}", response_model=ProgramAdminOut)
def update_program(
    program_id: int,
    payload: ProgramUpdate,
    db: Session = Depends(get_db),
    publisher: User = Depends(require_publisher),
) -> Program:
    program = get_or_404(db, Program, program_id, "Program")
    changes = payload.model_dump(exclude_unset=True)

    if "slug" in changes:
        _assert_slug_free(db, changes["slug"], ignore_id=program.id)
    # The detail block is one document: replaced wholesale, never merged. The
    # curriculum template is the same — half a syllabus merged into another is
    # not something anyone means to do.
    if "detail" in changes and payload.detail is not None:
        changes["detail"] = payload.detail.model_dump()

    # Checked against the merged pair, not the payload: raising the day count
    # and adding a day that needs it can arrive in one request, and either half
    # on its own is valid.
    _assert_template_fits(
        changes.get("curriculum", program.curriculum or []),
        changes.get("total_days", program.total_days),
    )

    for key, value in changes.items():
        setattr(program, key, value)
    db.commit()
    db.refresh(program)
    if changes:
        logger.info("Program #%s updated by %s: %s", program.id, publisher.email, ", ".join(sorted(changes)))
    return program


@router.delete("/programs/{program_id}", response_model=MessageResponse)
def delete_program(
    program_id: int, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> MessageResponse:
    return _remove(db, get_or_404(db, Program, program_id, "Program"), publisher, "Program")


@router.post("/programs/reorder", response_model=list[ProgramAdminOut])
def reorder_programs(
    payload: ReorderRequest, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> list[Program]:
    logger.info("Programs reordered by %s", publisher.email)
    return apply_reorder(db, Program, payload.ids)


# --- headline statistics --------------------------------------------------
# `name` is `label` on this one, so the shared _save_new/_remove helpers would
# log and message the wrong attribute. Written out instead of contorting them.
@router.get("/statistics", response_model=list[StatisticOut])
def list_statistics(db: Session = Depends(get_db)) -> list[Statistic]:
    return ordered(db, Statistic)


@router.post("/statistics", response_model=StatisticOut, status_code=status.HTTP_201_CREATED)
def create_statistic(
    payload: StatisticCreate, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> Statistic:
    stat = Statistic(**payload.model_dump(), sort_order=next_sort_order(db, Statistic))
    db.add(stat)
    db.commit()
    db.refresh(stat)
    logger.info("Statistic '%s' added by %s", stat.label, publisher.email)
    return stat


@router.put("/statistics/{statistic_id}", response_model=StatisticOut)
def update_statistic(
    statistic_id: int,
    payload: StatisticUpdate,
    db: Session = Depends(get_db),
    publisher: User = Depends(require_publisher),
) -> Statistic:
    stat = get_or_404(db, Statistic, statistic_id, "Statistic")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(stat, key, value)
    db.commit()
    db.refresh(stat)
    if changes:
        logger.info("Statistic #%s updated by %s: %s", stat.id, publisher.email, ", ".join(sorted(changes)))
    return stat


@router.delete("/statistics/{statistic_id}", response_model=MessageResponse)
def delete_statistic(
    statistic_id: int, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> MessageResponse:
    stat = get_or_404(db, Statistic, statistic_id, "Statistic")
    label = stat.label
    db.delete(stat)
    db.commit()
    logger.info("Statistic '%s' deleted by %s", label, publisher.email)
    return MessageResponse(message=f"{label} removed from the website.")


@router.post("/statistics/reorder", response_model=list[StatisticOut])
def reorder_statistics(
    payload: ReorderRequest, db: Session = Depends(get_db), publisher: User = Depends(require_publisher)
) -> list[Statistic]:
    logger.info("Statistics reordered by %s", publisher.email)
    return apply_reorder(db, Statistic, payload.ids)
