"""Login, forced password change, and the forgot/reset password flow.

There is deliberately no registration endpoint — accounts are created by an
admin or the seed script only.
"""
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import BLOCKED_MESSAGE, get_active_user, get_current_user
from app.mail import send_password_reset
from app.models import ROLE_STUDENT, PasswordResetToken, User
from app.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ProfileUpdate,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)
from app.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)

logger = logging.getLogger("mop.auth")
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))

    # Same message for unknown email and wrong password, so the endpoint cannot
    # be used to enumerate which addresses have accounts.
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    if user.is_blocked:
        raise HTTPException(status.HTTP_403_FORBIDDEN, BLOCKED_MESSAGE)

    token = create_access_token(user.id, user.role)
    return TokenResponse(
        access_token=token,
        must_change_password=user.must_change_password,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_active_user),
) -> UserOut:
    """Anyone signed in correcting their own details.

    Every role reaches this, not just students: a teacher whose phone number
    changed had no way to say so, and that number is what a viewer rings when a
    recording is missing.

    Name and phone only — years of experience is a student field and is ignored
    for everyone else. Email, role, batch and blocked status stay with the
    administration, so this cannot be used to escalate a role or to point
    somebody else's login at an address you control.
    """
    user.name = payload.name.strip()
    user.phone = (payload.phone or "").strip() or None
    if user.role == ROLE_STUDENT:
        user.yoe_it = payload.yoe_it
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Used both for the forced first-login change and voluntary changes.

    Depends on get_current_user rather than get_active_user — a user who must
    change their password has to be able to reach this endpoint.
    """
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")

    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "New password must differ from the current one"
        )

    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = False
    db.commit()
    return MessageResponse(message="Password updated successfully")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest, db: Session = Depends(get_db)
) -> MessageResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))

    # Always report success — a differing response would reveal which addresses
    # are registered.
    generic = MessageResponse(
        message="If that email is registered, a reset link has been sent."
    )
    if user is None or user.is_blocked:
        return generic

    # Invalidate any outstanding tokens so only the newest link works.
    now = datetime.now(timezone.utc)
    for old in db.scalars(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None)
        )
    ).all():
        old.used_at = now

    raw, token_hash = generate_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES),
        )
    )
    db.commit()

    send_password_reset(user.email, user.name, raw)
    return generic


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest, db: Session = Depends(get_db)
) -> MessageResponse:
    record = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == hash_reset_token(payload.token)
        )
    )
    now = datetime.now(timezone.utc)

    if record is None or record.used_at is not None or record.expires_at <= now:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "This reset link is invalid or has expired"
        )

    user = db.get(User, record.user_id)
    if user is None or user.is_blocked:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link is no longer valid")

    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = False   # they just chose it themselves
    record.used_at = now
    db.commit()

    logger.info("Password reset completed for user_id=%s", user.id)
    return MessageResponse(message="Password reset successfully. You can now sign in.")
