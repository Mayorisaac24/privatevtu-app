#!/usr/bin/env python3
"""Regenerate boot-splash.png and splash-icon.png from the canonical app icon."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICON = ROOT / 'assets' / 'icon.png'
BOOT_OUT = ROOT / 'assets' / 'boot-splash.png'
SPLASH_ICON_OUT = ROOT / 'assets' / 'splash-icon.png'

BOOT_W = 720
BOOT_H = 420
ICON_HEIGHT = 168
TEXT = 'Datamart'
TEXT_COLOR = (26, 26, 46, 255)
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


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        '/System/Library/Fonts/SFNS.ttf',
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def make_boot_splash(icon: Image.Image) -> Image.Image:
    canvas = Image.new('RGBA', (BOOT_W, BOOT_H), (255, 255, 255, 255))
    fitted = icon.copy()
    fitted.thumbnail((ICON_HEIGHT, ICON_HEIGHT), Image.Resampling.LANCZOS)
    icon_x = (BOOT_W - fitted.width) // 2
    icon_y = 72
    canvas.paste(fitted, (icon_x, icon_y), fitted)

    draw = ImageDraw.Draw(canvas)
    font = load_font(34)
    text_bbox = draw.textbbox((0, 0), TEXT, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_x = (BOOT_W - text_w) // 2
    text_y = icon_y + fitted.height + 18
    draw.text((text_x, text_y), TEXT, fill=TEXT_COLOR, font=font)
    return canvas


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
    boot = make_boot_splash(icon)
    splash_icon = make_splash_icon(icon)
    boot.save(BOOT_OUT, optimize=True)
    splash_icon.save(SPLASH_ICON_OUT, optimize=True)
    print(f'Wrote {BOOT_OUT} ({BOOT_W}x{BOOT_H})')
    print(f'Wrote {SPLASH_ICON_OUT} ({SPLASH_ICON_SIZE}x{SPLASH_ICON_SIZE})')


if __name__ == '__main__':
    main()
