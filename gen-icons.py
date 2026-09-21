#!/usr/bin/env python3
"""
Rugby Watch — icon generation script.
Generates:
  - iOS universal AppIcon set (20@2x, 20@3x, 29@2x, 29@3x, 40@2x, 40@3x,
    60@2x, 60@3x, 76@2x, 76@3x, 83.5@2x, 1024, 512@2x) into
    ios/App/App/Assets.xcassets/AppIcon.appiconset/
  - Android adaptive icon foreground PNGs at mdpi/xhdpi/xxhdpi/xxxhdpi
    into android/app/src/main/res/mipmap-{mdpi,xhdpi,xxhdpi,xxxhdpi}/
  - Android splash foreground PNG at mdpi
    into android/app/src/main/res/drawable/splash.png

Source logo: a rugby ball on a green (#16722e) background, drawn with Pillow.
"""

from PIL import Image, ImageDraw, ImageFont
import os, math

ROOT = '/Users/joker/rugbywatch-app'

GREEN = (0x16, 0x72, 0x2e)
GREEN_LIGHT = (0x1f, 0x8a, 0x3e)
WHITE = (0xff, 0xff, 0xff)
OFFWHITE = (0xf5, 0xf5, 0xf0)

IOS_ICONS_DIR = os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset')
ANDROID_ICONS_DIR = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

# ── draw rugby ball on a square canvas ───────────────────────────────────
def draw_ball(size):
    """Return a square RGBA image of size×size with a green bg and a white rugby
    ball (rounded oval with a central seam)."""
    img = Image.new('RGBA', (size, size), GREEN + (255,))
    d = ImageDraw.Draw(img)
    # Ball stats
    ball_w = int(size * 0.62)
    ball_h = int(size * 0.34)
    cx = size // 2
    cy = size // 2
    # Rounded oval (rugby ball shape) — ellipse with rx > ry
    rx = ball_w // 2
    ry = ball_h // 2
    # white fill
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=WHITE + (255,), outline=(0xdd, 0xdd, 0xdd, 255), width=max(2, size // 64))
    # subtle inner shading — a lighter ellipse slightly smaller
    d.ellipse([cx - rx + size//20, cy - ry + size//20, cx + rx - size//20, cy + ry - size//20],
              outline=(0xee, 0xee, 0xee, 200), width=max(1, size // 80))
    # central seam (a vertical line through the middle, with a slight S curve)
    seam_color = (0xcc, 0xcc, 0xcc, 200)
    seam_w = max(2, size // 36)
    steps = 20
    for i in range(steps):
        t = i / (steps - 1)
        x = cx - rx + (2 * rx) * t
        # slight S-curve: y offset wiggles a bit
        y_off = int(math.sin(t * math.pi * 2) * (size * 0.03))
        y = cy + y_off
        d.ellipse([x - seam_w//2, y - seam_w//2, x + seam_w//2, y + seam_w//2],
                  fill=seam_color)
    # outline belt / stitch hints (two small parallel lines to either side of seam)
    for side in (-1, 1):
        for j in range(8):
            t = j / 7
            x = cx - rx + (2 * rx) * t
            y_off = int(math.sin(t * math.pi * 2) * (size * 0.03)) + side * int(size * 0.04)
            y = cy + y_off
            d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(0xbb, 0xbb, 0xbb, 180))
    # highlight on the top-left for a 3-D feel
    d.ellipse([cx - rx + size//18, cy - ry + size//18, cx - rx + size//6, cy - ry + size//6],
              fill=(0xff, 0xff, 0xff, 70))
    return img

def save_icon(path, img):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # iOS: PNG with alpha, no interlacing
    img.save(path, 'PNG', optimize=True)

# ── iOS universal icon set ────────────────────────────────────────────────
# Each entry: (filename, width_px, height_px, scale_factor)
IOS_SIZES = [
    # platform=ios, idiom=universal, size in points, scale
    ('AppIcon-20@2x.png',   40,  40,  '2x'),   # 20pt @2x
    ('AppIcon-20@3x.png',   60,  60,  '3x'),   # 20pt @3x
    ('AppIcon-29@2x.png',   58,  58,  '2x'),   # 29pt @2x
    ('AppIcon-29@3x.png',   87,  87,  '3x'),   # 29pt @3x
    ('AppIcon-40@2x.png',   80,  80,  '2x'),   # 40pt @2x
    ('AppIcon-40@3x.png',   120, 120, '3x'),   # 40pt @3x
    ('AppIcon-60@2x.png',   120, 120, '2x'),   # 60pt @2x
    ('AppIcon-60@3x.png',   180, 180, '3x'),   # 60pt @3x
    ('AppIcon-76@2x.png',   152, 152, '2x'),   # 76pt @2x (iPad)
    ('AppIcon-76@3x.png',   228, 228, '3x'),   # 76pt @3x (iPad)
    ('AppIcon-83.5@2x.png', 167, 167, '2x'),   # 83.5pt @2x (iPad Pro)
    ('AppIcon-1024.png',    1024,1024, '1x'),  # 1024pt universal (App Store)
    ('AppIcon-512@2x.png',  1024,1024, '2x'),  # 512pt @2x (= 1024×1024, legacy)
]

def make_ios_contents():
    images = []
    for (fname, w, h, scale) in IOS_SIZES:
        images.append({
            'idiom': 'universal',
            'filename': fname,
            'scale': scale,
            'size': f'{w}x{h}' if w == h else f'{w}x{h}',
        })
    return {
        'images': images,
        'info': {
            'author': 'xcode',
            'version': 1,
        }
    }

print('Generating iOS icons...')
for (fname, w, h, scale) in IOS_SIZES:
    img = draw_ball(max(w, h))
    # crop to exact size if needed
    if img.size != (w, h):
        left = (img.width - w) // 2
        top = (img.height - h) // 2
        img = img.crop((left, top, left + w, top + h))
    out = os.path.join(IOS_ICONS_DIR, fname)
    save_icon(out, img)
    print(f'  ✓ {fname}  ({w}×{h})')

# Update Contents.json
contents = make_ios_contents()
with open(os.path.join(IOS_ICONS_DIR, 'Contents.json'), 'w') as f:
    import json
    json.dump(contents, f, indent=2)
print('  ✓ Contents.json updated')

# ── Android adaptive icon foreground PNGs ─────────────────────────────────
# Android adaptive icon: foreground at mdpi/xhdpi/xxhdpi/xxxhdpi, each a
# 108×108dp icon (the actual PNGs are 48×48 / 72×72 / 96×96 / 144×144 px at
# those densities). We'll generate at 144×144 (xxxhdpi) and scale down.
ANDROID_FOREGROUND_DENSITIES = {
    'mdpi':   48,
    'xhdpi':  72,
    'xxhdpi': 96,
    'xxxhdpi': 144,
}

print('Generating Android adaptive icon foregrounds...')
source_144 = draw_ball(144)
for density, px in ANDROID_FOREGROUND_DENSITIES.items():
    folder = os.path.join(ANDROID_ICONS_DIR, 'mipmap-' + density)
    if density == 'xxxhdpi':
        img = source_144
    else:
        img = source_144.resize((px, px), Image.LANCZOS)
    out = os.path.join(folder, 'ic_launcher_foreground.png')
    save_icon(out, img)
    out_r = os.path.join(folder, 'ic_launcher_round_foreground.png')
    save_icon(out_r, img)
    print(f'  ✓ {density}  ({px}×{px})  ic_launcher_foreground.png + ic_launcher_round_foreground.png')

# ── Android splash foreground PNG (1 drawable) ────────────────────────────
# The splash is a full-screen image; we'll make a 1080×1920 vertical splash
# with green background and rugby ball centred, plus a small "Rugby Watch" label
print('Generating Android splash...')
splash_w, splash_h = 1080, 1920
splash = Image.new('RGBA', (splash_w, splash_h), GREEN + (255,))
sd = ImageDraw.Draw(splash)
# Bigger ball
ball = draw_ball(int(splash_w * 0.38))
bx = (splash_w - ball.width) // 2
by = (splash_h - ball.height) // 2 - int(splash_h * 0.05)
splash.paste(ball, (bx, by), ball)
# Label: "Rugby Watch" in white, attempt to use a system font
try:
    font_large = ImageFont.truetype('/System/Library/Fonts/SFNSDisplay.ttf', 72)
except Exception:
    font_large = ImageFont.load_default()
try:
    font_small = ImageFont.truetype('/System/Library/Fonts/SFNSDisplay.ttf', 40)
except Exception:
    font_small = ImageFont.load_default()

label = 'Rugby Watch'
label_w = sd.textlength(label, font=font_large)
label_x = (splash_w - label_w) // 2
label_y = by + ball.height + int(splash_h * 0.03)
sd.text((label_x, label_y), label, font=font_large, fill=OFFWHITE + (255,))
# tagline
tag = 'Irish rugby · pub watchability'
tag_w = sd.textlength(tag, font=font_small)
sd.text(((splash_w - tag_w)//2, label_y + 80), tag, font=font_small, fill=OFFWHITE + (200,))
out_splash = os.path.join(ANDROID_ICONS_DIR, 'mipmap-mdpi', 'splash.png')
os.makedirs(os.path.dirname(out_splash), exist_ok=True)
# Save as full res; Android drawable will scale. We'll save one at 1080×1920.
save_icon(out_splash, splash)
print(f'  ✓ splash.png  ({splash_w}×{splash_h})  → mipmap-mdpi (scales to all densities)')

# Also generate a generic 512×512 app icon (for store / general use)
print('Generating store icon (512×512)...')
store_icon = draw_ball(512)
save_icon(os.path.join(ROOT, 'assets', 'app-icon-512.png'), store_icon)
print('  ✓ assets/app-icon-512.png')

print('ICON GENERATION COMPLETE')
