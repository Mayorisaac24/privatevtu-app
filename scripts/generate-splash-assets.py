#!/usr/bin/env python3
"""Regenerate splash-icon.png from the canonical app icon."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICON = ROOT / 'assets' / 'icon.png'
SPLASH_ICON_OUT = ROOT / 'assets' / 'splash-icon.png'

SPLASH_ICON_SIZE = 512


def purple_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    px = img.load()
    w, h = img.size
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 200 and b > 180 and r < 140:
                xs.append(x)
                ys.append(y)
    if not xs:
        bbox = img.getbbox()
        if not bbox:
            raise SystemExit('icon.png has no opaque content')
        return bbox
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def make_splash_icon(icon: Image.Image) -> Image.Image:
    squircle = icon.crop(purple_bbox(icon))
    fitted = squircle.copy()
    fitted.thumbnail((SPLASH_ICON_SIZE, SPLASH_ICON_SIZE), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (SPLASH_ICON_SIZE, SPLASH_ICON_SIZE), (0, 0, 0, 0))
    ox = (SPLASH_ICON_SIZE - fitted.width) // 2
    oy = (SPLASH_ICON_SIZE - fitted.height) // 2
    canvas.paste(fitted, (ox, oy), fitted)
    return canvas


def main() -> None:
    icon = Image.open(ICON).convert('RGBA')
    splash_icon = make_splash_icon(icon)
    splash_icon.save(SPLASH_ICON_OUT, optimize=True)
    print(f'Wrote {SPLASH_ICON_OUT} ({SPLASH_ICON_SIZE}x{SPLASH_ICON_SIZE})')


if __name__ == '__main__':
    main()
