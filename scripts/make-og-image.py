"""Generate the 1200x630 card shown when a mopcareers.com link is shared.

WHY THIS IS A SCRIPT rather than a hand-made file: the card carries the brand
colours and the site's own headline, and both change. Regenerating is one
command; re-cutting a PNG by hand in a year is not, so it would silently go
stale instead.

Run from the repo root:
    backend/.venv/Scripts/python.exe scripts/make-og-image.py

Writes frontend/public/og-card.png, which ships with the build and is what
`og:image` points at. 1200x630 is the size WhatsApp, LinkedIn, X, Slack and
Facebook all crop from; anything much smaller renders as a tiny thumbnail
beside the link rather than a full-width card — which is what pointing
`og:image` at a 180px touch icon was getting.

Windows-only as written: it reads the system fonts. Swap FONTS for any two
faces if this ever runs elsewhere.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "frontend" / "public" / "og-card.png"

W, H = 1200, 630
NAVY = (11, 30, 70)        # brand primary
NAVY_DEEP = (7, 20, 48)
TEAL = (0, 152, 157)       # brand secondary
ORANGE = (238, 89, 5)      # brand CTA
WHITE = (255, 255, 255)
MUTED = (168, 182, 208)

FONTS = Path("C:/Windows/Fonts")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def main() -> None:
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)

    # Vertical wash, drawn as one line per row. Pillow has no gradient
    # primitive and 630 lines is instant, so this is simpler than compositing.
    for y in range(H):
        k = y / H
        d.line(
            [(0, y), (W, y)],
            fill=tuple(int(a + (b - a) * k) for a, b in zip(NAVY, NAVY_DEEP)),
        )

    # Teal glow, top right — concentric translucent ellipses, the cheapest
    # approximation of the radial gradient the site's own hero uses.
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(26):
        r = 520 - i * 18
        gd.ellipse([W - 250 - r, -190 - r // 2, W - 250 + r, -190 + r], fill=(*TEAL, 5))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    d = ImageDraw.Draw(img)

    PAD = 78

    d.text((PAD, 92), "MOP CAREERS", font=font("seguibl.ttf", 30), fill=TEAL)

    # Headline, hand-broken rather than auto-wrapped: two lines is the shape
    # that stays readable at thumbnail size, and where it breaks is part of it.
    y = 176
    for line in ("Learn now.", "Pay after you're placed."):
        d.text((PAD, y), line, font=font("seguibl.ttf", 70), fill=WHITE)
        y += 86

    d.rectangle([PAD, y + 28, PAD + 96, y + 34], fill=ORANGE)

    d.text(
        (PAD, y + 70),
        "Live, mentor-led career programmes built with\nthe teams who do the hiring.",
        font=font("segoeui.ttf", 31),
        fill=MUTED,
        spacing=12,
    )

    d.text((PAD, H - 82), "mopcareers.com", font=font("segoeuib.ttf", 30), fill=WHITE)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)}  {OUT.stat().st_size // 1024} KB  {W}x{H}")


if __name__ == "__main__":
    main()
