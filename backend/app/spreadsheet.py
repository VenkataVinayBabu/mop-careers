"""Building the .xlsx files the admin screens download.

WHY NOT A CSV, WHICH THIS REPLACED. A CSV is text with commas: it carries no
column types, so Excel guesses. It guessed that 9876543210 was a number and
displayed it as 9.88E+09 — the digits were not merely ugly, they were gone,
and copying the cell gave 9880000000. On a sales list the phone number is the
column that matters most, so that is a broken file, not an untidy one.

A real workbook says what each cell IS, which is the whole point.
"""
from datetime import datetime

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

# Navy from the brand palette, so a downloaded sheet still looks like MOP's.
HEADER_FILL = PatternFill("solid", fgColor="0B1E46")
HEADER_FONT = Font(bold=True, color="FFFFFF")

# Anything wider than this wraps instead of stretching off the screen. Message
# and Description columns run to whole paragraphs; without a ceiling one long
# enquiry makes the sheet unreadable sideways.
MAX_WIDTH = 60
MIN_WIDTH = 8


def build(sheet_title: str, header: list[str], rows: list[list], text_columns: set[str] = frozenset()) -> bytes:
    """A formatted workbook as bytes.

    `text_columns` names headers whose values must stay text. Phone numbers are
    the reason it exists: left alone, Excel treats a 10-digit string as a
    number and mangles it.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_title

    ws.append(header)
    for cell in ws[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(vertical="center")

    text_idx = {i for i, h in enumerate(header) if h in text_columns}

    for row in rows:
        ws.append(row)
        written = ws[ws.max_row]
        for i, cell in enumerate(written):
            if i in text_idx:
                # "@" is Excel's text format. Without it a phone number becomes
                # a float and loses its digits.
                cell.number_format = "@"
            elif isinstance(cell.value, datetime):
                cell.number_format = "yyyy-mm-dd hh:mm"
            cell.alignment = Alignment(vertical="top", wrap_text=True)

    # Width from the widest value actually present, so nothing shows as ####.
    for i, name in enumerate(header, start=1):
        longest = max(
            [len(str(name))] + [len(str(r[i - 1])) for r in rows if r[i - 1] is not None],
            default=len(str(name)),
        )
        ws.column_dimensions[get_column_letter(i)].width = max(MIN_WIDTH, min(MAX_WIDTH, longest + 3))

    # The header stays put when scrolling, and the filter arrows let whoever
    # opens this narrow it to one status without touching the data.
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions

    from io import BytesIO

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
