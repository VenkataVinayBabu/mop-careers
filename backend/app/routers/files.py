"""Authenticated file downloads.

Notes are served through this endpoint rather than as static files so that
access is checked: a student may only download notes for their own batch, and a
teacher only for batches assigned to them.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import NOTES_DIR
from app.database import get_db
from app.deps import get_active_user, teacher_batch_ids
from app.models import ROLE_ADMIN, ROLE_STUDENT, ROLE_TEACHER, CurriculumDay, User

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/notes/{day_id}")
def download_notes(
    day_id: int, db: Session = Depends(get_db), user: User = Depends(get_active_user)
) -> FileResponse:
    day = db.get(CurriculumDay, day_id)
    if day is None or not day.notes_file:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No notes available for this day")

    allowed = (
        user.role == ROLE_ADMIN
        or (user.role == ROLE_STUDENT and user.batch_id == day.batch_id)
        or (user.role == ROLE_TEACHER and day.batch_id in teacher_batch_ids(db, user))
    )
    if not allowed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No notes available for this day")

    path = (NOTES_DIR / day.notes_file).resolve()
    # Defence in depth against a tampered notes_file value.
    if path.parent != NOTES_DIR.resolve() or not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notes file is missing")

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"MOP_Day{day.day_number}_Notes.pdf",
    )
