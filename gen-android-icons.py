#!/usr/bin/env python3
"""Regenerate Android adaptive icon foregrounds at CORRECT capacitor sizes.
Capacitor generates the adaptive icon at 108dp, so the PNG densities are:
  mdpi:   108px  (108dp × 1.0)
  hdpi:   162px  (108dp × 1.5)
  xhdpi:  216px  (108dp × 2.0)
  xxhdpi: 324px  (108dp × 3.0)
  xxxhdpi:432px  (108dp × 4.0)
These match what 'npx cap add android' originally wrote before gen-icons.py overwrote
them with wrong (48dp-based) sizes.
"""

from PIL import Image, ImageDraw
import os, math

ROOT = '/Users/joker/rugbywatch-app'
DRAWABLE_DIR = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

GREEN = (0x16, 0x72, 0x2e)
WHITE = (0xff, 0xff, 0xff)

def draw_ball(size):
    """Return a square RGBA image of size×size: green background + white rugby ball."""
    img = Image.new('RGBA', (size, size), GREEN + (255,))
    d = ImageDraw.Draw(img)
    ball_w = int(size * 0.62)
    ball_h = int(size * 0.34)
    cx = size // 2
    cy = size // 2
    rx = ball_w // 2
    ry = ball_h // 2
    # ball outline
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry],
              fill=WHITE + (255,),
              outline=(0xdd, 0xdd, 0xdd, 255),
              width=max(2, size // 64))
    # inner subtle shading
    d.ellipse([cx - rx + size//20, cy - ry + size//20,
               cx + rx - size//20, cy + ry - size//20],
              outline=(0xee, 0xee, 0xee, 200),
              width=max(1, size // 80))
    # central seam (S-curve)
    seam_color = (0xcc, 0xcc, 0xcc, 200)
    seam_w = max(2, size // 36)
    steps = 20
    for i in range(steps):
        t = i / (steps - 1)
        x = cx - rx + (2 * rx) * t
        y_off = int(math.sin(t * math.pi * 2) * (size * 0.03))
        y = cy + y_off
        d.ellipse([x - seam_w//2, y - seam_w//2, x + seam_w//2, y + seam_w//2],
                  fill=seam_color)
    # stitch hints either side of seam
    for side in (-1, 1):
        for j in range(8):
            t = j / 7
            x = cx - rx + (2 * rx) * t
            y_off = int(math.sin(t * math.pi * 2) * (size * 0.03)) + side * int(size * 0.04)
            y = cy + y_off
            d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(0xbb, 0xbb, 0xbb, 180))
    # highlight
    d.ellipse([cx - rx + size//18, cy - ry + size//18,
               cx - rx + size//6, cy - ry + size//6],
              fill=(0xff, 0xff, 0xff, 70))
    return img

# Sizes: 108dp at each density
SIZES = {
    'mdpi':   108,
    'hdpi':   162,
    'xhdpi':  216,
    'xxhdpi': 324,
    'xxxhdpi':432,
}

print('Regenerating Android adaptive icon foregrounds at correct sizes...\n')
for density, px in SIZES.items():
    folder = os.path.join(DRAWABLE_DIR, 'mipmap-' + density)
    os.makedirs(folder, exist_ok=True)
    img = draw_ball(px)
    for name in ['ic_launcher_foreground.png', 'ic_launcher_round_foreground.png']:
        out = os.path.join(folder, name)
        img.save(out, 'PNG', optimize=True)
    print(f'  ✓ {density:8s}  {px}×{px}px  → ic_launcher_foreground.png, ic_launcher_round_foreground.png')

# Verify
print('\nVerifying (5 densities × 2 files):')
all_ok = True
for density, px in SIZES.items():
    folder = os.path.join(DRAWABLE_DIR, 'mipmap-' + density)
    for name in ['ic_launcher_foreground.png', 'ic_launcher_round_foreground.png']:
        p = os.path.join(folder, name)
        im = Image.open(p)
        ok = im.size[0] == px and im.size[1] == px
        if not ok: all_ok = False
        print(f'  {density:8s} {name:35s} {im.size[0]}×{im.size[1]}px  [{"OK" if ok else "WRONG"}]')
print('\n' + ('ALL CORRECT ✓' if all_ok else 'ISSUES ✗'))

# Also regenerate the splash at full 1080×1920 (already there but regenerate to be safe)
print('\nRegenerating splash (1080×1920) at mipmap-mdpi/...')
splash = Image.new('RGBA', (1080, 1920), GREEN + (255,))
sd = ImageDraw.Draw(splash)
ball = draw_ball(int(1080 * 0.38))
bx = (1080 - ball.width) // 2
by = (1920 - ball.height) // 2 - int(1920 * 0.05)
splash.paste(ball, (bx, by), ball)
try:
    font_large = ImageFont.truetype('/System/Library/Fonts/SFNSDisplay.ttf', 72)
except Exception:
    font_large = ImageFont.load_default()
try:
    font_small = ImageFont.truetype('/System/Library/Fonts/SFNSDisplay.ttf', 40)
except Exception:
    font_small = ImageFont.load_default()
label = 'WatchRugby'
lw = sd.textlength(label, font=font_large)
sd.text(((1080 - lw)//2, by + ball.height + int(1920 * 0.03)), label, font=font_large, fill=OFFWHITE + (255,))
tag = 'Irish rugby · pub watchability'
tw = sd.textlength(tag, font=font_small)
sd.text(((1080 - tw)//2, by + ball.height + int(1920 * 0.03) + 80), tag, font=font_small, fill=OFFWHITE + (200,))
splash_out = os.path.join(DRAWABLE_DIR, 'mipmap-mdpi', 'splash.png')
os.makedirs(os.path.dirname(splash_out), exist_ok=True)
splash.save(splash_out, 'PNG', optimize=True)
print(f'  ✓ splash.png  (1080×1920)  → mipmap-mdpi (scales to all densities)')

print('\nDONE')
