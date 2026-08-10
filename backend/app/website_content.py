"""Shared behaviour for the ordered, publishable content the site shows.

Mentors, stories and hiring partners are three tables with the same rules:
ordered by `sort_order`, hidden from the public when `published` is false, and
rearranged as a whole list rather than one row at a time. That logic is written
once here so a fix to the ordering applies to all three, and so a fourth
entity is a model plus a handful of endpoints rather than another copy.

The endpoints themselves stay explicit in the router. Only the parts that are
genuinely identical live here — a generic CRUD generator would hide the one
thing a reader needs to see, which is what each endpoint actually does.
"""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

# The gap between adjacent rows. Wide enough to slot something between two
# existing entries later without renumbering the table.
ORDER_STEP = 10


def ordered(db: Session, model, published_only: bool = False) -> list:
    """Rows in display order.

    `id` is the tiebreaker so the order is total: two rows sharing a
    `sort_order` (possible after a partial reorder) must not swap places
    between two requests.
    """
    stmt = select(model)
    if published_only:
        stmt = stmt.where(model.published.is_(True))
    return list(db.scalars(stmt.order_by(model.sort_order, model.id)).all())


def get_or_404(db: Session, model, obj_id: int, label: str):
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} not found")
    return obj


def next_sort_order(db: Session, model) -> int:
    """Place a new row at the end of the list."""
    highest = db.scalar(select(func.max(model.sort_order))) or 0
    return highest + ORDER_STEP


def apply_reorder(db: Session, model, ids: list[int]) -> list:
    """Rewrite the order from a full list of ids.

    Whole-list rather than "move this one up": a single request cannot leave
    the table half-sorted, and two admins reordering at once end with one of
    the two orders rather than an interleaving of both.

    Ids that no longer exist are ignored rather than rejected — an admin
    reordering while someone else deletes a row should still get their order
    applied, not a 404 and a lost edit. Rows the payload omits keep their
    relative order, appended after the ones it names.
    """
    remaining = {obj.id: obj for obj in db.scalars(select(model)).all()}
    position = 0

    for obj_id in ids:
        obj = remaining.pop(obj_id, None)
        if obj is None:
            continue
        position += ORDER_STEP
        obj.sort_order = position

    for obj in sorted(remaining.values(), key=lambda o: (o.sort_order, o.id)):
        position += ORDER_STEP
        obj.sort_order = position

    db.commit()
    return ordered(db, model)
