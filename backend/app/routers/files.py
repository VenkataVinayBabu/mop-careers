"""Authenticated file downloads.

Notes are served through this endpoint rather than as static files so that
access is checked: a student may only download notes for their own batch, and a
teacher only for batches assigned to them.

The permission check is the whole point of this module and it happens BEFORE
any URL is handed out. On S3 the bucket is private and the response is a
redirect to a link that expires in a few minutes; on local disk the file is
streamed directly. Either way an unauthorised caller gets a 404 and never sees
a URL at all.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app import storage
from app.database import get_db
from app.deps import get_active_user, teacher_batch_ids
from app.models import ROLE_ADMIN, ROLE_STUDENT, ROLE_TEACHER, CurriculumDay, User

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/notes/{day_id}")
def download_notes(
    day_id: int, db: Session = Depends(get_db), user: User = Depends(get_active_user)
):
    day = db.get(CurriculumDay, day_id)
    if day is None or not day.notes_file:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No notes available for this day")

    allowed = (
        user.role == ROLE_ADMIN
        or (user.role == ROLE_STUDENT and user.batch_id == day.batch_id)
        or (user.role == ROLE_TEACHER and day.batch_id in teacher_batch_ids(db, user))
    )
    if not allowed:
        # Deliberately the same 404 as a missing file: a 403 would confirm that
        # notes exist for a batch this user has no business knowing about.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No notes available for this day")

    filename = f"MOP_Day{day.day_number}_Notes.pdf"

    if storage.using_s3():
        # 307 keeps the method and, more usefully here, tells browsers and any
        # proxy in between not to cache the redirect — the target expires in
        # minutes, so a cached one would break the next download.
        return RedirectResponse(
            storage.download_url(day.notes_file, filename),
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    path = storage.local_path(day.notes_file)
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notes file is missing")

    return FileResponse(path, media_type="application/pdf", filename=filename)
