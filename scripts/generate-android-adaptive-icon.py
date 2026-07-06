#!/usr/bin/env python3
"""Build Android adaptive foreground — purple squircle inset like iOS, not edge-to-edge."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICON = ROOT / 'assets' / 'icon.png'
OUT = ROOT / 'assets' / 'adaptive-icon-foreground.png'
CANVAS = 1024
# Android adaptive safe zone is ~66% of the canvas; match peer icons on the launcher.
MAX_CONTENT_RATIO = 0.68


def is_purple_pixel(r: int, g: int, b: int, a: int) -> bool:
    return a > 200 and b > 180 and r < 140


def purple_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    px = img.load()
    w, h = img.size
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_purple_pixel(r, g, b, a):
                xs.append(x)
                ys.append(y)
    if not xs:
        bbox = img.getbbox()
        if not bbox:
            raise SystemExit('icon.png has no opaque content')
        return bbox
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def main() -> None:
    src = Image.open(ICON).convert('RGBA')
    bbox = purple_bbox(src)
    squircle = src.crop(bbox)

    max_dim = int(CANVAS * MAX_CONTENT_RATIO)
    fitted = squircle.copy()
    fitted.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    ox = (CANVAS - fitted.width) // 2
    oy = (CANVAS - fitted.height) // 2
    canvas.paste(fitted, (ox, oy), fitted)
    canvas.save(OUT, optimize=True)

    fill = fitted.width / CANVAS
    print(
        f'Wrote {OUT} (squircle {fitted.width}x{fitted.height}, '
        f'{fill:.0%} of canvas, centered)'
    )


if __name__ == '__main__':
    main()
