"""Where uploaded files live: local disk in development, S3 in production.

WHY THIS EXISTS. Teachers' notes PDFs have been silently deleted on every
deploy since Phase 1, because the containers Render and App Runner run are
ephemeral — the disk is part of the deployment, not something that outlives it.
Nobody noticed for a long time, which is the worst property a bug can have.

WHY AN ABSTRACTION rather than calling boto3 from the routers. A developer
should not need AWS credentials to run this app, and the local setup has worked
since the beginning. So: set S3_BUCKET and files go to S3; leave it empty and
they go to disk exactly as before. That is the same arrangement app/mail.py
uses — log in development, send in production — and it means the tests and the
local workflow are unchanged.

ACCESS CONTROL IS NOT HERE. The bucket is private and nothing in it is
world-readable. Permission to read a file is decided in app/routers/files.py,
which checks that the student owns the batch before asking this module for a
link. Keep it that way: a signed URL is a key, and this module hands one to
anybody who asks.
"""
import logging
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

from app.config import NOTES_DIR, settings

logger = logging.getLogger("mop.storage")

# How long a download link stays valid. Long enough to click, short enough that
# a copied URL is useless by the time it is pasted anywhere. The permission
# check has already happened by the time one of these is issued.
URL_TTL_SECONDS = 300

# Everything this app stores lives under one prefix, so the bucket can be
# shared later without the objects mixing.
NOTES_PREFIX = "notes/"


def using_s3() -> bool:
    return bool(settings.S3_BUCKET)


@lru_cache(maxsize=1)
def _client():
    # Imported lazily so a local install without AWS configured never touches
    # boto3 at all.
    import boto3

    return boto3.client("s3", region_name=settings.S3_REGION)


def save(name: str, data: bytes, content_type: str = "application/pdf") -> None:
    """Store `data` under `name`. Raises on failure — an upload that silently
    does nothing is how this project lost files for a year."""
    if using_s3():
        _client().put_object(
            Bucket=settings.S3_BUCKET,
            Key=NOTES_PREFIX + name,
            Body=data,
            ContentType=content_type,
        )
        logger.info("Stored %s in s3://%s/%s%s", name, settings.S3_BUCKET, NOTES_PREFIX, name)
    else:
        (NOTES_DIR / name).write_bytes(data)


def delete(name: str) -> None:
    """Remove a stored file. Never raises: a failure to delete the old copy
    must not fail the upload that replaced it — the worst case is an orphaned
    object costing a fraction of a paisa."""
    try:
        if using_s3():
            _client().delete_object(Bucket=settings.S3_BUCKET, Key=NOTES_PREFIX + name)
        else:
            path = NOTES_DIR / name
            # The parent check is defence against a tampered notes_file value
            # in the database escaping the directory.
            if path.is_file() and path.parent == NOTES_DIR:
                path.unlink(missing_ok=True)
    except Exception:
        logger.exception("Could not delete stored file %r", name)


def download_url(name: str, filename: str) -> str:
    """A short-lived URL that downloads the file under a friendly name.

    S3 only — callers must check using_s3() first. `filename` is what the
    browser saves it as; without ResponseContentDisposition the student would
    get the internal storage name, which carries the batch id and a random
    token and means nothing to them.
    """
    return _client().generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.S3_BUCKET,
            "Key": NOTES_PREFIX + name,
            "ResponseContentDisposition": f'attachment; filename="{quote(filename)}"',
            "ResponseContentType": "application/pdf",
        },
        ExpiresIn=URL_TTL_SECONDS,
    )


def local_path(name: str) -> Path | None:
    """The on-disk path, or None if it is missing or escapes NOTES_DIR.

    Local mode only.
    """
    path = (NOTES_DIR / name).resolve()
    if path.parent != NOTES_DIR.resolve() or not path.is_file():
        return None
    return path
