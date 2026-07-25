"""Password hashing and JWT issuing/verification.

bcrypt is used directly instead of passlib. passlib 1.7.4 (last released 2020) is
incompatible with bcrypt 5.x — it reads `bcrypt.__about__`, which no longer
exists, and then fails hashing outright. Pinning passlib would mean freezing a
security-sensitive dependency at a stale release, so the underlying library is
used directly.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.config import settings

# bcrypt only considers the first 72 bytes of a password and raises on anything
# longer, so inputs are truncated at the byte level before hashing or verifying.
_BCRYPT_MAX_BYTES = 72
_BCRYPT_ROUNDS = 12


def _prepare(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare(password), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed or legacy hash — treat as a failed login, never a 500.
        return False


def create_access_token(user_id: int, role: str, expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {"sub": str(user_id), "role": role, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


# --- password reset tokens ------------------------------------------------
def generate_reset_token() -> tuple[str, str]:
    """Return (raw_token, sha256_hash). Only the hash is persisted."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_reset_token(raw)


def hash_reset_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
