"""MOP-branded completion certificate, rendered with reportlab.

Generated on demand into an in-memory buffer rather than written to disk —
there is nothing worth caching, and it keeps the certificate impossible to
fetch by guessing a filename.
"""
from datetime import date
from io import BytesIO

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

NAVY = HexColor("#0B1E46")
TEAL = HexColor("#00989D")
ORANGE = HexColor("#EE5905")
GREY = HexColor("#5A6B85")

COURSE_NAME = "Python Full Stack Development"


def _fit_font(c: canvas.Canvas, text: str, font: str, start: int, max_width: float) -> int:
    """Shrink the font until the text fits, so a long name cannot overflow."""
    size = start
    while size > 12 and c.stringWidth(text, font, size) > max_width:
        size -= 2
    return size


def build_certificate(
    student_name: str,
    batch_name: str | None,
    start_date: date | None,
    completed_on: date,
) -> bytes:
    buf = BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    # --- border ---------------------------------------------------------
    c.setStrokeColor(NAVY)
    c.setLineWidth(3)
    c.rect(12 * mm, 12 * mm, width - 24 * mm, height - 24 * mm)
    c.setStrokeColor(TEAL)
    c.setLineWidth(1)
    c.rect(16 * mm, 16 * mm, width - 32 * mm, height - 32 * mm)

    # --- header band ----------------------------------------------------
    c.setFillColor(NAVY)
    c.rect(16 * mm, height - 48 * mm, width - 32 * mm, 32 * mm, stroke=0, fill=1)

    # Wordmark: "MOP" in white, "CAREERS" in teal, matching the app.
    c.setFont("Helvetica-Bold", 26)
    mop_w = c.stringWidth("MOP ", "Helvetica-Bold", 26)
    careers_w = c.stringWidth("CAREERS", "Helvetica-Bold", 26)
    start_x = (width - (mop_w + careers_w)) / 2
    c.setFillColor(HexColor("#FFFFFF"))
    c.drawString(start_x, height - 36 * mm, "MOP ")
    c.setFillColor(TEAL)
    c.drawString(start_x + mop_w, height - 36 * mm, "CAREERS")

    # --- title ----------------------------------------------------------
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(width / 2, height - 70 * mm, "Certificate of Completion")

    c.setStrokeColor(ORANGE)
    c.setLineWidth(2)
    c.line(width / 2 - 40 * mm, height - 75 * mm, width / 2 + 40 * mm, height - 75 * mm)

    c.setFillColor(GREY)
    c.setFont("Helvetica", 13)
    c.drawCentredString(width / 2, height - 88 * mm, "This is to certify that")

    # --- student name ---------------------------------------------------
    name_size = _fit_font(c, student_name, "Helvetica-Bold", 34, width - 90 * mm)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", name_size)
    c.drawCentredString(width / 2, height - 104 * mm, student_name)

    c.setStrokeColor(HexColor("#C3CFE3"))
    c.setLineWidth(0.8)
    c.line(width / 2 - 70 * mm, height - 108 * mm, width / 2 + 70 * mm, height - 108 * mm)

    # --- body -----------------------------------------------------------
    c.setFillColor(GREY)
    c.setFont("Helvetica", 13)
    c.drawCentredString(
        width / 2, height - 120 * mm, "has successfully completed the 55-day programme in"
    )

    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width / 2, height - 133 * mm, COURSE_NAME)

    c.setFillColor(GREY)
    c.setFont("Helvetica", 11)
    if start_date:
        period = (
            f"{start_date.strftime('%d %B %Y')}  to  {completed_on.strftime('%d %B %Y')}"
        )
    else:
        period = f"Completed on {completed_on.strftime('%d %B %Y')}"
    c.drawCentredString(width / 2, height - 145 * mm, period)

    if batch_name:
        c.setFont("Helvetica-Oblique", 10)
        c.drawCentredString(width / 2, height - 153 * mm, f"Batch {batch_name}")

    # --- footer ---------------------------------------------------------
    baseline = 34 * mm
    c.setStrokeColor(HexColor("#C3CFE3"))
    c.setLineWidth(0.8)
    c.line(45 * mm, baseline, 105 * mm, baseline)
    c.line(width - 105 * mm, baseline, width - 45 * mm, baseline)

    c.setFillColor(GREY)
    c.setFont("Helvetica", 9.5)
    c.drawCentredString(75 * mm, baseline - 6 * mm, "Programme Director")
    c.drawCentredString(width - 75 * mm, baseline - 6 * mm, "Date of Issue")

    c.setFont("Helvetica-Bold", 10.5)
    c.setFillColor(NAVY)
    c.drawCentredString(75 * mm, baseline + 3 * mm, "MOP Careers")
    c.drawCentredString(width - 75 * mm, baseline + 3 * mm, completed_on.strftime("%d %B %Y"))

    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor("#95A8CB"))
    c.drawCentredString(
        width / 2, 20 * mm, "MOP Careers  ·  Python Full Stack Development Programme"
    )

    c.showPage()
    c.save()
    return buf.getvalue()


def linkedin_add_to_profile_url(completed_on: date) -> str:
    """LinkedIn's 'Add to profile' deep link for a certification."""
    from urllib.parse import urlencode

    params = {
        "startTask": "CERTIFICATION_NAME",
        "name": f"{COURSE_NAME} — MOP Careers",
        "organizationName": "MOP Careers",
        "issueYear": completed_on.year,
        "issueMonth": completed_on.month,
    }
    return f"https://www.linkedin.com/profile/add?{urlencode(params)}"
