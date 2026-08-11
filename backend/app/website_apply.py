"""Applying a change to the public website — the one place it happens.

Two routes lead here and they must not drift apart:

    an admin or member saves          applied immediately
    a contributor's change approved   applied by the member's approval

If those were two implementations, the second would slowly stop matching the
first — a validation rule added to one, a slug check forgotten in the other —
and the difference would only ever show up as "it worked when Bala did it".
So the mutation lives here, and both callers use it.

The entity registry below is also what makes the change-request table generic:
one row can describe an edit to any content type because every content type is
described here in the same terms.
"""
from __future__ import annotations

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import site_settings
from app.models import (
    CHANGE_CREATE,
    CHANGE_DELETE,
    CHANGE_REORDER,
    CHANGE_UPDATE,
    HiringPartner,
    Mentor,
    Program,
    Statistic,
    Story,
    User,
)
from app.schemas import (
    HiringPartnerCreate,
    HiringPartnerUpdate,
    MentorCreate,
    MentorUpdate,
    ProgramCreate,
    ProgramUpdate,
    SiteSettingsUpdate,
    StatisticCreate,
    StatisticUpdate,
    StoryCreate,
    StoryUpdate,
)
from app.website_content import apply_reorder, get_or_404, next_sort_order, ordered


class EntitySpec:
    def __init__(self, key, model, label, create_schema, update_schema, ordered_list=True):
        self.key = key
        self.model = model
        self.label = label
        self.create_schema = create_schema
        self.update_schema = update_schema
        self.ordered_list = ordered_list


# Site settings is the odd one out and is handled separately below: it is
# key/value rather than rows, so it has no id, no ordering, and only ever
# updates.
ENTITIES: dict[str, EntitySpec] = {
    "mentor": EntitySpec("mentor", Mentor, "Mentor", MentorCreate, MentorUpdate),
    "story": EntitySpec("story", Story, "Story", StoryCreate, StoryUpdate),
    "partner": EntitySpec(
        "partner", HiringPartner, "Hiring partner", HiringPartnerCreate, HiringPartnerUpdate
    ),
    "statistic": EntitySpec(
        "statistic", Statistic, "Statistic", StatisticCreate, StatisticUpdate
    ),
    "program": EntitySpec("program", Program, "Program", ProgramCreate, ProgramUpdate),
}
SETTINGS_ENTITY = "settings"
ENTITY_KEYS = tuple(ENTITIES) + (SETTINGS_ENTITY,)


def _row_label(entity: str, obj) -> str:
    """How a row is named in the approval queue."""
    if entity == SETTINGS_ENTITY:
        return "Site settings"
    spec = ENTITIES[entity]
    name = getattr(obj, "name", None) or getattr(obj, "label", None) or f"#{obj.id}"
    return f"{spec.label}: {name}"


# --- validation -----------------------------------------------------------
def _parse(schema, payload: dict, **dump_kwargs) -> dict:
    """Build a schema from a proposed payload, turning a validation failure
    into the 422 FastAPI would have produced.

    Needed because this validation happens *inside* a handler rather than on
    the way in: a raw Pydantic ValidationError raised here is an unhandled
    exception and becomes a 500, so a contributor typing a two-letter name
    would be told "Internal Server Error". Re-raised in FastAPI's own shape so
    the form highlights the offending field exactly as it does elsewhere.
    """
    try:
        return schema(**payload).model_dump(**dump_kwargs)
    except ValidationError as exc:
        detail = []
        for err in exc.errors(include_url=False):
            detail.append({
                "type": err.get("type", "value_error"),
                # The payload sits under a "payload" key in the request body,
                # so the location is reported relative to it.
                "loc": ["body", "payload", *[str(p) for p in err.get("loc", ())]],
                "msg": err.get("msg", "Invalid value"),
            })
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail) from exc


def validate(entity: str, action: str, payload: dict) -> dict:
    """Check a proposed change against the same schema the direct endpoint uses.

    Run at submit time so a contributor is told about a bad value straight
    away, and again at approval, because the world may have moved since.
    """
    if entity == SETTINGS_ENTITY:
        if action != CHANGE_UPDATE:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "Site settings can only be updated, not created or deleted",
            )
        return _parse(SiteSettingsUpdate, payload, exclude_unset=True)

    spec = ENTITIES[entity]
    if action == CHANGE_CREATE:
        return _parse(spec.create_schema, payload)
    if action == CHANGE_UPDATE:
        return _parse(spec.update_schema, payload, exclude_unset=True)
    if action == CHANGE_DELETE:
        return {}
    if action == CHANGE_REORDER:
        ids = payload.get("ids")
        if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT, "Reordering needs a list of ids"
            )
        return {"ids": ids}
    raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown action '{action}'")


# --- programme-specific rules --------------------------------------------
def _assert_slug_free(db: Session, slug: str, ignore_id: int | None = None) -> None:
    existing = db.scalar(select(Program).where(Program.slug == slug))
    if existing is not None and existing.id != ignore_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"The web address '{slug}' is already used by {existing.name}.",
        )


def _assert_template_fits(curriculum: list, total_days: int) -> None:
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


# --- the mutation ---------------------------------------------------------
def apply(db: Session, entity: str, action: str, entity_id: int | None, payload: dict, actor: User):
    """Perform the change. Commits. Returns the affected row, or None.

    `actor` is whoever is causing it to happen now — the admin saving directly,
    or the member approving. Settings rows record it as the last editor, which
    is the truthful answer: the member is who put that value live.

    Raises the same HTTPExceptions the direct endpoints raise, so an approval
    that cannot be applied — a slug taken since it was submitted, a row deleted
    meanwhile — fails loudly rather than half-applying.
    """
    data = validate(entity, action, payload)

    if entity == SETTINGS_ENTITY:
        site_settings.save(db, site_settings.as_text(data), actor)
        return None

    spec = ENTITIES[entity]

    if action == CHANGE_REORDER:
        apply_reorder(db, spec.model, data["ids"])
        return None

    if action == CHANGE_CREATE:
        if entity == "program":
            _assert_slug_free(db, data["slug"])
            _assert_template_fits(data["curriculum"], data["total_days"])
            data["detail"] = dict(data["detail"])
        obj = spec.model(**data, sort_order=next_sort_order(db, spec.model))
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    obj = get_or_404(db, spec.model, entity_id, spec.label)

    if action == CHANGE_DELETE:
        db.delete(obj)
        db.commit()
        return obj

    # update
    if entity == "program":
        if "slug" in data:
            _assert_slug_free(db, data["slug"], ignore_id=obj.id)
        _assert_template_fits(
            data.get("curriculum", obj.curriculum or []),
            data.get("total_days", obj.total_days),
        )
    for key, value in data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def describe(db: Session, entity: str, action: str, entity_id: int | None, payload: dict) -> str:
    """The queue's one-line label for a proposed change, worked out at submit
    time while the row it refers to still exists."""
    if entity == SETTINGS_ENTITY:
        fields = ", ".join(sorted(payload)) or "nothing"
        return f"Site settings — {fields}"

    spec = ENTITIES[entity]
    if action == CHANGE_REORDER:
        return f"Reorder {spec.label.lower()}s"
    if action == CHANGE_CREATE:
        name = payload.get("name") or payload.get("label") or "new"
        return f"Add {spec.label.lower()}: {name}"

    obj = db.get(spec.model, entity_id)
    current = _row_label(entity, obj) if obj is not None else f"{spec.label} #{entity_id}"
    if action == CHANGE_DELETE:
        return f"Delete {current}"
    return f"Edit {current}"


def can_publish_directly(user: User) -> bool:
    from app.models import ROLES_PUBLISH_DIRECTLY

    return user.role in ROLES_PUBLISH_DIRECTLY
