"""Working the enquiries that came off the public website.

WHY THIS IS NOT IN admin.py. That router carries `require_back_office` at the
router level, which every route inside it inherits — and sales is not back
office. Splitting the three endpoints a sales executive needs into their own
router with its own guard is the honest way to say "these, and only these":
the alternative was loosening the guard on the whole admin surface and
re-tightening it route by route, which is the kind of change that gives a role
something nobody meant it to have.

Deleting an enquiry stays in admin.py, at member and above. Sales chases leads;
removing the record of one is somebody else's decision.
"""
import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_enquiries, require_enquiries_export
from app.models import Enquiry, User
from app.schemas import EnquiryOut, EnquiryStatusUpdate

router = APIRouter(prefix="/admin", tags=["enquiries"])


@router.get("/enquiries", response_model=list[EnquiryOut])
def list_enquiries(
    enquiry_status: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_enquiries),
) -> list[EnquiryOut]:
    stmt = select(Enquiry)
    if enquiry_status:
        stmt = stmt.where(Enquiry.status == enquiry_status)
    rows = db.scalars(stmt.order_by(Enquiry.created_at.desc())).all()
    return [EnquiryOut.model_validate(e) for e in rows]


@router.patch("/enquiries/{enquiry_id}", response_model=EnquiryOut)
def update_enquiry_status(
    enquiry_id: int,
    payload: EnquiryStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_enquiries),
) -> EnquiryOut:
    """Move a lead along. Sales can do this: they are the ones making the
    calls, and a status column only the office can change is a status column
    that stays on "New" forever."""
    enquiry = db.get(Enquiry, enquiry_id)
    if enquiry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found")
    enquiry.status = payload.status
    db.commit()
    db.refresh(enquiry)
    return EnquiryOut.model_validate(enquiry)


@router.get("/enquiries/export")
def export_enquiries(
    db: Session = Depends(get_db), _: User = Depends(require_enquiries_export)
) -> Response:
    """The list as a CSV that Excel opens.

    The BOM is not optional. Excel assumes the system codepage for a .csv
    unless the file starts with one, so without it every accented name and
    rupee sign arrives as mojibake — and whoever opens it has no idea the file
    was fine and their spreadsheet mangled it.
    """
    rows = db.scalars(select(Enquiry).order_by(Enquiry.created_at.desc())).all()
    buf = io.StringIO()
    # csv.writer already ends lines with CRLF, which is what Excel expects.
    w = csv.writer(buf)
    w.writerow(["ID", "Received", "Name", "Phone", "Email", "Programme", "Status", "Message"])
    w.writerows(
        [
            [
                e.id,
                # Excel reads this as a date; an ISO string with a timezone it
                # treats as text and will not sort chronologically.
                e.created_at.strftime("%Y-%m-%d %H:%M") if e.created_at else "",
                e.name,
                e.phone,
                e.email,
                e.programme or "",
                e.status,
                e.message,
            ]
            for e in rows
        ]
    )
    return Response(
        content=buf.getvalue().encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition":
                f'attachment; filename="mop-enquiries-{date.today().isoformat()}.csv"'
        },
    )
