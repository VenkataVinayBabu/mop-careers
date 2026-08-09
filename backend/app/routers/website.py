"""Admin content management for the public website.

Site settings today; courses, mentors and stories will join them here.

The admin guard is declared on the router rather than on each endpoint, the
same way the fees router does it, so an endpoint added to this file later
cannot be exposed by forgetting a dependency. Everything here edits what the
whole internet sees, which is exactly the wrong place for that mistake.
"""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import site_settings
from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.schemas import SiteSettingsAdmin, SiteSettingsUpdate

logger = logging.getLogger("mop.website")

router = APIRouter(
    prefix="/admin/website",
    tags=["website"],
    dependencies=[Depends(require_admin)],
)


@router.get("/settings", response_model=SiteSettingsAdmin)
def read_settings(db: Session = Depends(get_db)) -> SiteSettingsAdmin:
    return SiteSettingsAdmin(**site_settings.typed(site_settings.load_all(db)))


@router.put("/settings", response_model=SiteSettingsAdmin)
def update_settings(
    payload: SiteSettingsUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SiteSettingsAdmin:
    """Partial update. `exclude_unset` is what makes it partial: a field the
    form did not send keeps its current value, rather than a half-populated
    request quietly blanking the phone number.
    """
    changes = payload.model_dump(exclude_unset=True)
    values = site_settings.save(db, site_settings.as_text(changes), admin)

    if changes:
        logger.info("Site settings updated by %s: %s", admin.email, ", ".join(sorted(changes)))
    return SiteSettingsAdmin(**site_settings.typed(values))
