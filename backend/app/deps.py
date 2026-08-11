"""Shared FastAPI dependencies: current user resolution and role guards."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ROLE_ADMIN, ROLE_STUDENT, ROLE_TEACHER, ROLE_VIEWER, TeacherBatch, User
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

BLOCKED_MESSAGE = "Please contact MOP administration"


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    payload = decode_access_token(creds.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")

    # Blocking takes effect immediately, even on an already-issued token.
    if user.is_blocked:
        raise HTTPException(status.HTTP_403_FORBIDDEN, BLOCKED_MESSAGE)

    return user


def get_active_user(user: User = Depends(get_current_user)) -> User:
    """Current user who has already cleared the forced password change.

    Everything except /auth/me and /auth/change-password sits behind this, so a
    first-login user cannot roam the app without setting a real password.
    """
    if user.must_change_password:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Password change required before continuing",
        )
    return user


def require_admin(user: User = Depends(get_active_user)) -> User:
    if user.role != ROLE_ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


def require_teacher(user: User = Depends(get_active_user)) -> User:
    if user.role != ROLE_TEACHER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Teacher access required")
    return user


def require_student(user: User = Depends(get_active_user)) -> User:
    if user.role != ROLE_STUDENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student access required")
    return user


def require_staff(user: User = Depends(get_active_user)) -> User:
    """Admins and teachers.

    A viewer is deliberately NOT staff. This guard sits on the teacher router,
    which marks days complete, uploads notes and takes attendance — adding a
    read-only role here would hand it every one of those writes in one line.
    Viewers get their own router instead.
    """
    if user.role not in (ROLE_ADMIN, ROLE_TEACHER):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Staff access required")
    return user


def require_viewer(user: User = Depends(get_active_user)) -> User:
    """The read-only coordinator view. Admins are allowed through so they can
    see exactly what a viewer sees without a second account."""
    if user.role not in (ROLE_ADMIN, ROLE_VIEWER):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Viewer access required")
    return user


# --- scoping helpers ------------------------------------------------------
def teacher_batch_ids(db: Session, teacher: User) -> list[int]:
    return list(
        db.scalars(select(TeacherBatch.batch_id).where(TeacherBatch.teacher_id == teacher.id)).all()
    )


def assert_batch_access(db: Session, user: User, batch_id: int) -> None:
    """Admins reach any batch; teachers only their assigned ones.

    Raises 404 rather than 403 for an unassigned batch so the API does not leak
    which batch ids exist.
    """
    if user.role == ROLE_ADMIN:
        return
    if user.role == ROLE_TEACHER and batch_id in teacher_batch_ids(db, user):
        return
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")


def assert_student_access(db: Session, user: User, student: User) -> None:
    """Who may read one student's records: the student, an admin, or a teacher
    assigned to that student's batch."""
    if user.role == ROLE_ADMIN:
        return
    if user.id == student.id:
        return
    if (
        user.role == ROLE_TEACHER
        and student.batch_id is not None
        and student.batch_id in teacher_batch_ids(db, user)
    ):
        return
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")


def get_student_or_404(db: Session, student_id: int) -> User:
    student = db.get(User, student_id)
    if student is None or student.role != ROLE_STUDENT:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")
    return student
