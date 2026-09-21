#!/usr/bin/env python3
"""Fix Android adaptive icon hdpi + verify everything is consistent."""

from PIL import Image, ImageDraw
import os

ROOT = '/Users/joker/rugbywatch-app'
DRAWABLE_DIR = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
IOS_DIR = os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset')

GREEN = (0x16, 0x72, 0x2e)
WHITE = (0xff, 0xff, 0xff)
OFFWHITE = (0xf5, 0xf5, 0xf0)

def draw_ball(size):
    img = Image.new('RGBA', (size, size), GREEN + (255,))
    d = ImageDraw.Draw(img)
    ball_w = int(size * 0.62)
    ball_h = int(size * 0.34)
    cx = size // 2
    cy = size // 2
    rx = ball_w // 2
    ry = ball_h // 2
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=WHITE + (255,), outline=(0xdd, 0xdd, 0xdd, 255), width=max(2, size // 64))
    d.ellipse([cx - rx + size//20, cy - ry + size//20, cx + rx - size//20, cy + ry - size//20], outline=(0xee, 0xee, 0xee, 200), width=max(1, size // 80))
    import math
    seam_color = (0xcc, 0xcc, 0xcc, 200)
    seam_w = max(2, size // 36)
    steps = 20
    for i in range(steps):
        t = i / (steps - 1)
        x = cx - rx + (2 * rx) * t
        y_off = int(math.sin(t * math.pi * 2) * (size * 0.03))
        y = cy + y_off
        d.ellipse([x - seam_w//2, y - seam_w//2, x + seam_w//2, y + seam_w//2], fill=seam_color)
    for side in (-1, 1):
        for j in range(8):
            t = j / 7
            x = cx - rx + (2 * rx) * t
            y_off = int(math.sin(t * math.pi * 2) * (size * 0.03)) + side * int(size * 0.04)
            y = cy + y_off
            d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(0xbb, 0xbb, 0xbb, 180))
    d.ellipse([cx - rx + size//18, cy - ry + size//18, cx - rx + size//6, cy - ry + size//6], fill=(0xff, 0xff, 0xff, 70))
    return img

# ── Fix Android hdpi foreground (72x72) ──────────────────────────────────
print('Fixing Android hdpi adaptive icon foregrounds...')
source_72 = draw_ball(72)
hdpi_dir = os.path.join(DRAWABLE_DIR, 'mipmap-hdpi')
for name in ['ic_launcher_foreground.png', 'ic_launcher_round_foreground.png']:
    out = os.path.join(hdpi_dir, name)
    source_72.save(out, 'PNG', optimize=True)
    print(f'  ✓ {name}  (72×72)  → mipmap-hdpi')

# ── Regenerate splash at proper densities ─────────────────────────────────
# We already have 1080x1920 in mipmap-mdpi/splash.png which scales for all.
# That's the right approach (one high-res source). Leave it.

# ── Verify ALL Android adaptive icon PNGs are correctly sized ─────────────
print('\nVerifying Android adaptive icon foregrounds:')
expected = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
all_ok = True
for density, exp in expected.items():
    for name in ['ic_launcher_foreground.png', 'ic_launcher_round_foreground.png']:
        p = os.path.join(DRAWABLE_DIR, 'mipmap-' + density, name)
        if os.path.exists(p):
            im = Image.open(p)
            ok = im.size[0] == exp and im.size[1] == exp
            status = 'OK' if ok else 'WRONG'
            if not ok:
                all_ok = False
            print(f'  {density:8s} {name:35s} {im.size[0]}×{im.size[1]}px  (expect {exp}×{exp})  [{status}]')
        else:
            print(f'  {density:8s} {name:35s} MISSING')
            all_ok = False
print('\n' + ('ALL CORRECT ✓' if all_ok else 'SOME ISSUES'))
