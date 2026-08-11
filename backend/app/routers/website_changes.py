"""The approval queue for public-website edits.

A contributor cannot publish. Their save arrives here as a proposal, sits in
`website_changes`, and only touches the live tables when a member approves it —
at which point it is applied through `website_apply.apply`, the same function
an admin's direct save uses. One implementation, so an approved change does
exactly what the same edit would have done by hand.

Who does what:

    contributor   submits, sees their own proposals and the feedback on them,
                  withdraws one they no longer want
    member        sees everything pending, approves or rejects with feedback
    admin         everything a member can, and never needs the queue itself

The load-bearing property, asserted in the suite: between submit and approve,
the public site does not change. Nothing here writes to a content table except
`approve`.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_active_user, require_member
from app.models import (
    CHANGE_APPROVED,
    CHANGE_PENDING,
    CHANGE_REJECTED,
    CHANGE_WITHDRAWN,
    ROLE_ADMIN,
    ROLE_CONTRIBUTOR,
    ROLE_MEMBER,
    User,
    WebsiteChange,
)
from app.schemas import ChangeReview, ChangeSubmit, MessageResponse, WebsiteChangeOut
from app.website_apply import ENTITY_KEYS, apply, describe, validate

logger = logging.getLogger("mop.website.changes")

router = APIRouter(prefix="/admin/website/changes", tags=["website-changes"])

# Who may see and use the queue at all. Teachers, students and coordinators
# have no business here.
QUEUE_ROLES = (ROLE_ADMIN, ROLE_MEMBER, ROLE_CONTRIBUTOR)


def require_queue_access(user: User = Depends(get_active_user)) -> User:
    if user.role not in QUEUE_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not available for your role")
    return user


def _from_now(db: Session, change: WebsiteChange, reviewer: User, status_value: str,
              feedback: str) -> WebsiteChange:
    change.status = status_value
    change.reviewed_by_id = reviewer.id
    change.reviewed_by_name = reviewer.name
    change.feedback = feedback
    from datetime import datetime, timezone

    change.reviewed_at = datetime.now(timezone.utc)
    return change


@router.post("", response_model=WebsiteChangeOut, status_code=status.HTTP_201_CREATED)
def submit(
    payload: ChangeSubmit,
    db: Session = Depends(get_db),
    user: User = Depends(require_queue_access),
) -> WebsiteChange:
    """Propose a change. Nothing on the public site moves.

    Validated here against the schema the direct endpoint uses, so a bad value
    is a 422 to the person who typed it rather than a surprise for whoever
    reviews it.
    """
    if payload.entity not in ENTITY_KEYS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown content type")

    # Raises 422 with the offending field if the proposal is malformed.
    validate(payload.entity, payload.action, payload.payload)

    change = WebsiteChange(
        entity=payload.entity,
        entity_id=payload.entity_id,
        action=payload.action,
        payload=payload.payload,
        summary=describe(db, payload.entity, payload.action, payload.entity_id, payload.payload),
        submitted_by_id=user.id,
        submitted_by_name=user.name,
    )
    db.add(change)
    db.commit()
    db.refresh(change)
    logger.info("Website change #%s proposed by %s: %s", change.id, user.email, change.summary)
    return change


@router.get("", response_model=list[WebsiteChangeOut])
def list_changes(
    change_status: str | None = Query(
        default=None, alias="status", pattern="^(pending|approved|rejected|withdrawn)$"
    ),
    mine: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_queue_access),
) -> list[WebsiteChange]:
    """The queue.

    A contributor only ever sees their own proposals — somebody else's rejected
    draft and the feedback on it is not their business. Members and admins see
    everything.
    """
    stmt = select(WebsiteChange).order_by(WebsiteChange.submitted_at.desc())
    if user.role == ROLE_CONTRIBUTOR or mine:
        stmt = stmt.where(WebsiteChange.submitted_by_id == user.id)
    if change_status:
        stmt = stmt.where(WebsiteChange.status == change_status)
    return list(db.scalars(stmt).all())


def _get_change(db: Session, change_id: int, user: User) -> WebsiteChange:
    change = db.get(WebsiteChange, change_id)
    if change is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Change not found")
    # A contributor asking about someone else's proposal gets the same answer
    # as for one that does not exist.
    if user.role == ROLE_CONTRIBUTOR and change.submitted_by_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Change not found")
    return change


@router.get("/{change_id}", response_model=WebsiteChangeOut)
def read_change(
    change_id: int, db: Session = Depends(get_db), user: User = Depends(require_queue_access)
) -> WebsiteChange:
    return _get_change(db, change_id, user)


@router.post("/{change_id}/approve", response_model=WebsiteChangeOut)
def approve(
    change_id: int,
    payload: ChangeReview,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_member),
) -> WebsiteChange:
    """Approve, and put it live.

    Applied through the same function a direct save uses, and re-validated on
    the way: the proposal may have been written days ago, and a slug it wanted
    could have been taken since. A change that cannot be applied stays pending
    with the error, rather than being marked approved having done nothing.
    """
    change = _get_change(db, change_id, reviewer)
    if change.status != CHANGE_PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"This change was already {change.status}"
        )
    if change.submitted_by_id == reviewer.id and reviewer.role != ROLE_ADMIN:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "You cannot approve a change you submitted yourself",
        )

    apply(db, change.entity, change.action, change.entity_id, change.payload, reviewer)

    _from_now(db, change, reviewer, CHANGE_APPROVED, payload.feedback)
    db.commit()
    db.refresh(change)
    logger.info("Website change #%s approved by %s: %s", change.id, reviewer.email, change.summary)
    return change


@router.post("/{change_id}/reject", response_model=WebsiteChangeOut)
def reject(
    change_id: int,
    payload: ChangeReview,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_member),
) -> WebsiteChange:
    """Send it back with a reason.

    Feedback is required. "Rejected" with no explanation is the thing that
    makes an approval queue hated — the contributor cannot act on it, so they
    resubmit the same thing.
    """
    if not payload.feedback:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Say why, so the contributor knows what to change",
        )

    change = _get_change(db, change_id, reviewer)
    if change.status != CHANGE_PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"This change was already {change.status}"
        )

    _from_now(db, change, reviewer, CHANGE_REJECTED, payload.feedback)
    db.commit()
    db.refresh(change)
    logger.info("Website change #%s rejected by %s", change.id, reviewer.email)
    return change


@router.post("/{change_id}/withdraw", response_model=WebsiteChangeOut)
def withdraw(
    change_id: int, db: Session = Depends(get_db), user: User = Depends(require_queue_access)
) -> WebsiteChange:
    """Take back a proposal nobody has looked at yet."""
    change = _get_change(db, change_id, user)
    if change.status != CHANGE_PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"This change was already {change.status}"
        )
    if change.submitted_by_id != user.id and user.role == ROLE_CONTRIBUTOR:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "That is not your change")

    change.status = CHANGE_WITHDRAWN
    db.commit()
    db.refresh(change)
    return change


@router.delete("/{change_id}", response_model=MessageResponse)
def discard(
    change_id: int, db: Session = Depends(get_db), reviewer: User = Depends(require_member)
) -> MessageResponse:
    """Clear a settled change out of the history. Pending ones must be
    approved, rejected or withdrawn first — deleting one silently would lose
    the record of somebody asking."""
    change = _get_change(db, change_id, reviewer)
    if change.status == CHANGE_PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Approve, reject or withdraw this before removing it from the history",
        )
    db.delete(change)
    db.commit()
    return MessageResponse(message="Removed from the history.")
