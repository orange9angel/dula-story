#!/usr/bin/env python3
"""
Generate a 5-second Transformers-style logo transition for last_deposit.

Effect:
  - Dark cybertronian steel / circuit background
  - Space-station blast doors slide open with hydraulic warning lights
  - Chrome metallic text "MECHA LEGENDS G2" emerges from cyan energon core
  - Doors slam shut / lock with heavy impact, sparks and energon flash
  - Robotic voice announces "MECHA LEGENDS G TWO"
  - Fades out

Outputs:
  - ../output/transition_logo.mp4
"""
import os
import math
import random
import subprocess
import numpy as np
from scipy import signal
from scipy.io import wavfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT, "output")
TMP_DIR = os.path.join(OUTPUT_DIR, "transition_tmp")
os.makedirs(TMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIDTH, HEIGHT = 1920, 1080
FPS = 30
DURATION = 5.0
TOTAL_FRAMES = int(DURATION * FPS)
SAMPLE_RATE = 48000
TOTAL_SAMPLES = int(DURATION * SAMPLE_RATE)

random.seed(42)
np.random.seed(42)

# Theme colors
CYBER_PURPLE = (18, 8, 32)
STEEL_DARK = (35, 38, 48)
CYAN_ENERGON = (0, 230, 255)
MAGENTA_NEON = (255, 0, 170)
HOT_ORANGE = (200, 160, 40)  # muted industrial warning yellow, not spider-orange
CHROME_LIGHT = (220, 235, 255)
CHROME_SHADOW = (80, 90, 110)


def sample_count(duration):
    return int(round(duration * SAMPLE_RATE))


def normalize(x):
    peak = np.max(np.abs(x))
    return x / peak if peak > 0 else x


def save_wav(path, data):
    wavfile.write(path, SAMPLE_RATE, (np.clip(normalize(data), -1, 1) * 32767).astype(np.int16))


def lowpass(data, cutoff, order=4):
    sos = signal.butter(order, cutoff, btype="low", fs=SAMPLE_RATE, output="sos")
    return signal.sosfilt(sos, data)


def highpass(data, cutoff, order=4):
    sos = signal.butter(order, cutoff, btype="high", fs=SAMPLE_RATE, output="sos")
    return signal.sosfilt(sos, data)


def bandpass(data, low, high, order=4):
    sos = signal.butter(order, [low, high], btype="band", fs=SAMPLE_RATE, output="sos")
    return signal.sosfilt(sos, data)


def phase_from_freq(freq, n):
    return np.cumsum(2 * np.pi * freq / SAMPLE_RATE)


def sine_wave(freq, duration, amp=1.0):
    n = sample_count(duration)
    t = np.linspace(0, n / SAMPLE_RATE, n, endpoint=False)
    if np.isscalar(freq):
        return amp * np.sin(2 * np.pi * freq * t)
    return amp * np.sin(phase_from_freq(freq, n))


def noise(duration, amp=1.0):
    return amp * (np.random.random(sample_count(duration)) * 2 - 1)


def shaped_envelope(data, attack=0.01, decay=0.1, sustain=0.7, release=0.2):
    duration = len(data) / SAMPLE_RATE
    n = len(data)
    a = int(attack * SAMPLE_RATE)
    d = int(decay * SAMPLE_RATE)
    r = int(release * SAMPLE_RATE)
    s = max(0, n - a - d - r)
    env = np.concatenate([
        np.linspace(0, 1, a),
        np.linspace(1, sustain, d),
        np.full(s, sustain),
        np.linspace(sustain, 0, r),
    ])
    if len(env) < n:
        env = np.concatenate([env, np.zeros(n - len(env))])
    return data * env[:n]


def write_clip(track, start, clip):
    s = max(0, min(sample_count(start), len(track)))
    e = min(s + len(clip), len(track))
    if e <= s:
        return
    track[s:e] += clip[:e - s]


# ───────────────────────────── Visual helpers ─────────────────────────────

def make_circuit_background(seed=42):
    """Pre-render a dark cybertronian circuit/steel background."""
    rng = random.Random(seed)
    # Base dark steel gradient
    img = Image.new("RGB", (WIDTH, HEIGHT), CYBER_PURPLE)
    draw = ImageDraw.Draw(img)

    # Subtle circuit traces
    for _ in range(40):
        x = rng.randint(0, WIDTH)
        y = rng.randint(0, HEIGHT)
        length = rng.randint(80, 400)
        angle = rng.choice([0, math.pi / 2])
        x2 = int(x + length * math.cos(angle))
        y2 = int(y + length * math.sin(angle))
        alpha = rng.randint(15, 45)
        draw.line([(x, y), (x2, y2)], fill=(alpha, alpha + 10, alpha + 20), width=rng.choice([1, 2]))
        # Circuit nodes
        if rng.random() > 0.5:
            draw.ellipse([x2 - 3, y2 - 3, x2 + 3, y2 + 3], fill=(alpha + 20, alpha + 30, alpha + 50))

    # Distant stars / sparks
    for _ in range(600):
        x = rng.randint(0, WIDTH - 1)
        y = rng.randint(0, HEIGHT - 1)
        brightness = rng.randint(40, 180)
        size = rng.choice([1, 1, 1, 2])
        draw.ellipse([x, y, x + size, y + size], fill=(brightness, brightness, int(brightness * 1.1)))

    return img


def add_vignette(img, intensity=0.55):
    """Darken the corners."""
    overlay = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(overlay)
    cx, cy = WIDTH // 2, HEIGHT // 2
    max_r = math.sqrt(cx ** 2 + cy ** 2)
    for r in range(int(max_r), -1, -20):
        alpha = int(255 * intensity * (r / max_r) ** 1.6)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=alpha)
    return Image.composite(Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0)), img, overlay)


def door_open_amount(t):
    """Return gap between blast doors (0 = closed, 1 = fully open)."""
    final_gap = 0.12  # Keep a small locked gap so title stays framed/visible
    if t < 0.35:
        return 0.0
    if t < 1.35:
        # Ease out cubic
        p = (t - 0.35) / 1.0
        return 1.0 - (1.0 - p) ** 3
    if t < 2.25:
        return 1.0
    if t < 2.48:
        # Slam shut to locked gap
        p = (t - 2.25) / 0.23
        return 1.0 - (1.0 - final_gap) * p ** 0.5
    return final_gap


def make_hazard_stripes(w, h, stripe_w=14, color=HOT_ORANGE):
    """Create an RGBA layer with diagonal hazard stripes clipped to size."""
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for i in range(int((w + h) / stripe_w) + 2):
        x0 = i * stripe_w
        x1 = x0 - h
        draw.polygon([
            (x0, 0),
            (x0 + stripe_w, 0),
            (x1 + stripe_w, h),
            (x1, h),
        ], fill=(*color, 200))
    return layer


def _polygon_row_xspan(pts, row):
    """Return (min_x, max_x) where horizontal line y=row crosses polygon."""
    xs = []
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        if (y1 <= row < y2) or (y2 <= row < y1):
            dy = y2 - y1
            if dy != 0:
                xi = x1 + (row - y1) * (x2 - x1) / dy
                xs.append(xi)
    if len(xs) < 2:
        return None
    return min(xs), max(xs)


def draw_blast_door(layer, x, y, w, h, is_left, open_amt, t):
    """Draw one metallic blast door panel with a jagged/irregular mating edge."""
    w, h = int(w), int(h)
    x, y = int(x), int(y)
    margin = 18
    tooth_h = max(30, h // 7)
    tooth_depth = min(55, max(25, w // 5))
    gap_h = max(12, tooth_h // 2)

    # Build jagged panel polygon in local coords.
    # Left door: body from x=0..w, teeth protrude right to x=w+tooth_depth.
    # Right door: body from x=tooth_depth..w+tooth_depth, teeth protrude left to x=0.
    if is_left:
        pts = [(0, 0), (w, 0)]
        cy = margin
        while cy + tooth_h < h - margin:
            pts.append((w, cy))
            pts.append((w + tooth_depth, cy))
            pts.append((w + tooth_depth, cy + tooth_h))
            pts.append((w, cy + tooth_h))
            cy += tooth_h + gap_h
        pts.append((w, h))
        pts.append((0, h))
        bbox_w = w + tooth_depth
        paste_x = x
    else:
        # Right door: outer edge is straight, teeth protrude left from inner edge.
        pts = [(tooth_depth, 0), (w + tooth_depth, 0)]
        pts.append((w + tooth_depth, h))
        pts.append((tooth_depth, h))
        cy = h - margin
        while cy - tooth_h > margin:
            pts.append((tooth_depth, cy))
            pts.append((0, cy))
            pts.append((0, cy - tooth_h))
            pts.append((tooth_depth, cy - tooth_h))
            cy -= tooth_h + gap_h
        pts.append((tooth_depth, 0))
        bbox_w = w + tooth_depth
        paste_x = x - tooth_depth

    panel = Image.new("RGBA", (bbox_w + 1, h + 1), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(panel)

    # Space-station metallic panel fill.
    for row in range(h):
        span = _polygon_row_xspan(pts, row)
        if span is None:
            continue
        x_min, x_max = span
        t_row = row / h
        # Top-lit cool steel gradient
        base = 38 + 22 * (1 - t_row) ** 0.5
        # Very faint brushed texture
        brush = 1.0 + 0.04 * math.sin(row * 0.35)
        r = int((base + 8) * brush)
        g = int((base + 10) * brush)
        b = int((base + 14) * brush)
        pdraw.line([(x_min, row), (x_max, row)], fill=(r, g, b, 250))

    # Strong diagonal specular highlight for metallic luster
    for row in range(h):
        span = _polygon_row_xspan(pts, row)
        if span is None:
            continue
        t_row = row / h
        # Highlight runs diagonally from upper-left to lower-right
        hl_center = 0.28 + 0.50 * t_row
        hl_w = 0.10
        dist = abs(0.5 - hl_center)
        if dist > hl_w:
            continue
        fade = 1.0 - dist / hl_w
        alpha = int(160 * fade)
        x_c = (span[0] + span[1]) / 2
        x_r = (span[1] - span[0]) / 2
        pdraw.line([(x_c - x_r * 0.65, row), (x_c + x_r * 0.65, row)],
                   fill=(235, 245, 255, alpha))

    # Panel outline + bevel
    pdraw.polygon(pts, outline=(130, 145, 165, 255), width=3)
    # Inset shadow just inside the outline for depth
    inset_pts = [(px + (1 if is_left else -1), py + 1) for px, py in pts]
    pdraw.polygon(inset_pts, outline=(30, 35, 45, 120), width=2)

    # Horizontal reinforcement ribs (subtle raised strips)
    rib_count = 4
    for i in range(1, rib_count):
        ry = int(h * i / rib_count)
        span = _polygon_row_xspan(pts, ry)
        if span is None:
            continue
        # Top edge of rib
        pdraw.line([(span[0] + margin, ry - 2), (span[1] - margin, ry - 2)],
                   fill=(100, 112, 130, 180), width=2)
        # Bottom edge of rib
        pdraw.line([(span[0] + margin, ry + 2), (span[1] - margin, ry + 2)],
                   fill=(35, 40, 50, 180), width=2)

    # Hazard stripes on inner mating edge (subtle)
    stripe_w = 14
    stripe_h = h - margin * 2 - 20
    stripe_y = margin + 10
    if is_left:
        stripe_x = w - stripe_w - 6
    else:
        stripe_x = tooth_depth + 6
    stripes = make_hazard_stripes(stripe_w, stripe_h, stripe_w=9, color=HOT_ORANGE)
    r, g, b, a = stripes.split()
    a = a.point(lambda v: int(v * 0.45))
    stripes = Image.merge("RGBA", (r, g, b, a))
    panel.paste(stripes, (int(stripe_x), int(stripe_y)), stripes)

    # Rivets / bolts grid
    rows = 4
    cols = max(2, int(w / 140))
    for r in range(rows):
        for c in range(cols):
            bx = margin + 20 + c * ((bbox_w - margin * 2 - 40) / max(cols - 1, 1))
            by = margin + 20 + r * ((h - margin * 2 - 40) / (rows - 1))
            # Skip rivets too close to jagged edge
            span = _polygon_row_xspan(pts, int(by))
            if span and (bx < span[0] + 30 or bx > span[1] - 30):
                continue
            pdraw.ellipse([bx - 5, by - 5, bx + 5, by + 5], fill=(90, 100, 120, 255),
                          outline=(150, 165, 190, 255))

    # Thin vertical status LED strip on inner edge (no round handle)
    led_x = w - 5 if is_left else tooth_depth + 5
    led_w = 4
    blink = 0.5 + 0.5 * math.sin(t * 18)
    if open_amt > 0.01 and open_amt < 0.99:
        pdraw.rectangle([led_x - led_w // 2, margin + 20,
                         led_x + led_w // 2, h - margin - 20],
                        fill=(int(HOT_ORANGE[0] * blink), int(HOT_ORANGE[1] * blink),
                              int(HOT_ORANGE[2] * blink), 200),
                        outline=(255, 200, 100, 220))

    layer.paste(panel, (paste_x, y), panel)


def make_blast_door_layer(t):
    """Return RGBA space-station blast door layer, centered and smaller."""
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = WIDTH // 2, HEIGHT // 2

    open_amt = door_open_amount(t)
    door_h = int(HEIGHT * 0.58)
    door_y = (HEIGHT - door_h) // 2
    frame_w = int(WIDTH * 0.68)
    frame_x = (WIDTH - frame_w) // 2
    max_gap = int(frame_w * 0.42)
    current_gap = int(max_gap * open_amt)
    door_w = (frame_w - current_gap) // 2

    left_x = frame_x
    right_x = frame_x + frame_w - door_w

    # Outer frame / bulkhead
    frame_margin = 18
    draw.rectangle([frame_x - frame_margin, door_y - frame_margin,
                    frame_x + frame_w + frame_margin, door_y + door_h + frame_margin],
                   fill=(20, 22, 30, 235), outline=(75, 88, 108, 255), width=4)

    # Track grooves above and below doors
    draw.rectangle([frame_x - frame_margin, door_y - 10,
                    frame_x + frame_w + frame_margin, door_y + 4],
                   fill=(35, 40, 50, 255), outline=(80, 92, 110, 255), width=2)
    draw.rectangle([frame_x - frame_margin, door_y + door_h - 4,
                    frame_x + frame_w + frame_margin, door_y + door_h + 10],
                   fill=(35, 40, 50, 255), outline=(80, 92, 110, 255), width=2)

    # Draw doors
    draw_blast_door(layer, left_x, door_y, door_w, door_h, True, open_amt, t)
    draw_blast_door(layer, right_x, door_y, door_w, door_h, False, open_amt, t)

    # Lock indicators at seam when doors close (small glowing hexagons, not handles)
    if open_amt < 0.18:
        bolt_alpha = int(255 * (1 - open_amt / 0.18))
        tooth_h = max(30, door_h // 7)
        gap_h = max(12, tooth_h // 2)
        margin = 18
        cy_local = margin
        lock_ys = []
        while cy_local + tooth_h < door_h - margin:
            lock_ys.append(door_y + cy_local + tooth_h // 2)
            cy_local += tooth_h + gap_h
        for ly in lock_ys:
            size = 7
            pts = []
            for i in range(6):
                ang = math.pi / 3 * i - math.pi / 2
                pts.append((cx + size * math.cos(ang), ly + size * math.sin(ang)))
            draw.polygon(pts, fill=(CYAN_ENERGON[0], CYAN_ENERGON[1], CYAN_ENERGON[2], bolt_alpha),
                         outline=(255, 255, 255, bolt_alpha))

    # Corner brackets on the outer frame (sci-fi framing, attached to door)
    bracket = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bracket)
    br_len = 28
    br_w = 4
    corners = [
        (frame_x - frame_margin, door_y - frame_margin, 1, 1),
        (frame_x + frame_w + frame_margin, door_y - frame_margin, -1, 1),
        (frame_x - frame_margin, door_y + door_h + frame_margin, 1, -1),
        (frame_x + frame_w + frame_margin, door_y + door_h + frame_margin, -1, -1),
    ]
    for fx, fy, sx, sy in corners:
        bdraw.line([(fx, fy), (fx + br_len * sx, fy)], fill=CYAN_ENERGON + (180,), width=br_w)
        bdraw.line([(fx, fy), (fx, fy + br_len * sy)], fill=CYAN_ENERGON + (180,), width=br_w)
    layer = Image.alpha_composite(layer, bracket)

    return layer


def make_mechanical_plate(t):
    """Draw corner mechanical plates with bolts."""
    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    plate_w, plate_h = 320, 180
    corners = [
        (0, 0),
        (WIDTH - plate_w, 0),
        (0, HEIGHT - plate_h),
        (WIDTH - plate_w, HEIGHT - plate_h),
    ]

    for x, y in corners:
        # Plate background
        draw.rectangle([x, y, x + plate_w, y + plate_h], fill=(20, 22, 30, 160),
                       outline=(60, 70, 90, 180), width=2)
        # Decorative lines
        draw.line([(x + 20, y + 20), (x + plate_w - 20, y + 20)], fill=CYAN_ENERGON + (120,), width=2)
        draw.line([(x + 20, y + plate_h - 20), (x + plate_w - 20, y + plate_h - 20)], fill=CYAN_ENERGON + (120,), width=2)
        # Bolts
        for bx, by in [(x + 12, y + 12), (x + plate_w - 12, y + 12),
                       (x + 12, y + plate_h - 12), (x + plate_w - 12, y + plate_h - 12)]:
            draw.ellipse([bx - 6, by - 6, bx + 6, by + 6], fill=(100, 110, 130, 220),
                         outline=(160, 175, 200, 255))

    return layer


def get_font(size):
    """Try a few common fonts, fallback to default."""
    candidates = [
        "C:/Windows/Fonts/impact.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        if path and os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def make_mechanical_text(text, size, region_top, region_height, sheen=0.0,
                         glow_color=CYAN_ENERGON, chrome=True):
    """Render chrome metallic text with angular mechanical style and outer glow."""
    mask_size = int(size * 1.2)
    font = get_font(mask_size)
    tmp = Image.new("L", (1, 1), 0)
    tdraw = ImageDraw.Draw(tmp)
    bbox = tdraw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    pad = int(mask_size * 0.5)
    txt_w, txt_h = tw + pad * 2, th + pad * 2
    text_mask = Image.new("L", (txt_w, txt_h), 0)
    mdraw = ImageDraw.Draw(text_mask)
    tx = (txt_w - tw) // 2 - bbox[0]
    ty = (txt_h - th) // 2 - bbox[1]
    mdraw.text((tx, ty), text, font=font, fill=255)

    # Outer glow - cyan/magenta energon
    glow = text_mask.filter(ImageFilter.GaussianBlur(radius=int(mask_size * 0.35)))
    glow_rgba = Image.merge("RGBA", [
        Image.new("L", glow.size, glow_color[0]),
        Image.new("L", glow.size, glow_color[1]),
        Image.new("L", glow.size, glow_color[2]),
        glow.point(lambda v: min(255, int(v * 1.8)))
    ])

    # Chrome metallic fill
    fill = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(fill)
    for row in range(txt_h):
        t = row / txt_h
        sweep = math.sin(t * math.pi + sheen) * 0.5 + 0.5
        r = int(180 + 75 * sweep)
        g = int(190 + 65 * sweep)
        b = int(210 + 45 * sweep)
        fdraw.line([(0, row), (txt_w, row)], fill=(r, g, b, 255))
    fill.putalpha(text_mask)

    # Inner core highlight
    core = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(core)
    cx_c, cy_c = txt_w // 2, txt_h // 2
    max_rc = max(cx_c, cy_c)
    for i in range(10, 0, -1):
        r_c = max_rc * (i / 10) ** 1.4
        a_c = int(80 * (1 - i / 10))
        cdraw.ellipse([cx_c - r_c, cy_c - r_c, cx_c + r_c, cy_c + r_c],
                      fill=(230, 245, 255, a_c))
    core_masked = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    core_masked.paste(core, (0, 0), text_mask)

    # Hard mechanical outline / bevel
    outline = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(outline)
    for dx in range(-4, 5, 2):
        for dy in range(-4, 5, 2):
            if dx == 0 and dy == 0:
                continue
            odraw.text((tx + dx, ty + dy), text, font=font, fill=(25, 30, 40, 90))
    outline_mask = text_mask.filter(ImageFilter.GaussianBlur(radius=2)).point(lambda v: int(v * 0.15))
    outline_masked = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    outline_masked.paste(outline, (0, 0), outline_mask)

    # Horizontal chrome highlights
    highlight = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(highlight)
    hl_y = int(txt_h * (0.25 + 0.04 * math.sin(sheen * 2)))
    hdraw.line([(0, hl_y), (txt_w, hl_y + max(5, mask_size // 7))], fill=(255, 255, 255, 230))
    hl_y2 = int(txt_h * (0.55 + 0.03 * math.sin(sheen * 2)))
    hdraw.line([(0, hl_y2), (txt_w, hl_y2 + max(3, mask_size // 14))], fill=(220, 235, 255, 150))
    highlight_masked = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    highlight_masked.paste(highlight, (0, 0), text_mask)

    # Composite: glow -> outline -> fill -> core -> highlight
    comp = Image.alpha_composite(glow_rgba, outline_masked)
    comp = Image.alpha_composite(comp, fill)
    comp = Image.alpha_composite(comp, core_masked)
    comp = Image.alpha_composite(comp, highlight_masked)

    # Radial bloom behind text
    bloom = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bloom)
    cx_b, cy_b = txt_w // 2, txt_h // 2
    max_r = max(cx_b, cy_b)
    for i in range(10, 0, -1):
        r_b = max_r * i / 10
        alpha_b = int(50 * (1 - i / 10))
        bdraw.ellipse([cx_b - r_b, cy_b - r_b, cx_b + r_b, cy_b + r_b],
                      fill=(glow_color[0], glow_color[1], glow_color[2], alpha_b))
    comp = Image.alpha_composite(bloom, comp)

    # Scale to requested region
    scale = min(WIDTH / txt_w, region_height / txt_h)
    new_w, new_h = int(txt_w * scale), int(txt_h * scale)
    comp_resized = comp.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    paste_x = (WIDTH - new_w) // 2
    paste_y = region_top + (region_height - new_h) // 2
    canvas.paste(comp_resized, (paste_x, paste_y), comp_resized)
    return canvas


def add_cyan_flash(img, intensity):
    """Add a cool cyan energon flash overlay."""
    if intensity <= 0:
        return img
    overlay = Image.new("RGB", (WIDTH, HEIGHT), (210, 245, 255))
    return Image.blend(img, overlay, min(1.0, intensity * 0.25))


def set_alpha(img, factor):
    """Multiply the alpha channel of an RGBA image by factor (0..1)."""
    if factor >= 1.0:
        return img
    r, g, b, a = img.split()
    a = a.point(lambda v: int(v * factor))
    return Image.merge("RGBA", (r, g, b, a))


def add_lens_flare(img, cx, cy, size, intensity):
    """Add a cool mechanical lens flare burst."""
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    colors = [
        ((200, 245, 255), 0.9),
        ((120, 220, 255), 0.7),
        ((80, 160, 255), 0.5),
        ((180, 0, 255), 0.3),
    ]
    for color, ratio in colors:
        r = size * ratio
        a = int(255 * intensity * ratio)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    # Cross rays
    ray = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ray)
    rdraw.line([(cx - size * 1.5, cy), (cx + size * 1.5, cy)], fill=(220, 245, 255, int(200 * intensity)), width=int(size * 0.08))
    rdraw.line([(cx, cy - size * 1.2), (cx, cy + size * 1.2)], fill=(220, 245, 255, int(200 * intensity)), width=int(size * 0.08))
    overlay = Image.alpha_composite(overlay, ray)
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


# ───────────────────────────── Audio generation ─────────────────────────────

def synthesize_voice(text, output_wav, voice="en-US-GuyNeural", rate="+0%"):
    """Use Microsoft Edge online TTS to create a cool English announcer voice."""
    mp3_path = output_wav.replace(".wav", ".mp3")
    edge_tts = "D:/opensource/movie/dula-story/.venv/Scripts/edge-tts.exe"
    if not os.path.exists(edge_tts):
        return False
    try:
        ret = subprocess.run(
            [edge_tts, "-t", text, "-v", voice, "--rate", rate,
             "--write-media", mp3_path],
            check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
    except Exception:
        return False
    if not os.path.exists(mp3_path):
        return False
    subprocess.run(
        ["ffmpeg", "-y", "-i", mp3_path, "-ar", str(SAMPLE_RATE), "-ac", "1", output_wav],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    os.remove(mp3_path)
    return os.path.exists(output_wav)


def load_voice_clip(path):
    """Load a WAV file and return a float64 mono array at SAMPLE_RATE."""
    rate, data = wavfile.read(path)
    if data.ndim > 1:
        data = data.mean(axis=1)
    data = data.astype(np.float64)
    if data.max() > 1.0:
        data /= 32767.0
    if rate != SAMPLE_RATE:
        num_samples = int(len(data) * SAMPLE_RATE / rate)
        data = signal.resample(data, num_samples)
    return data


def robotize_voice(data, carrier=160, mod_depth=0.6, echo_ms=50, echo_decay=0.4):
    """Turn a natural voice into a metallic Transformers-style announcer."""
    n = len(data)
    t = np.arange(n) / SAMPLE_RATE

    carrier_wave = np.sin(
        2 * np.pi * carrier * t + 0.5 * np.sin(2 * np.pi * 4.5 * t)
    )
    carrier_wave2 = np.sin(
        2 * np.pi * (carrier * 2.0) * t + 0.35 * np.sin(2 * np.pi * 6.5 * t)
    )

    modulated = (
        data * (1.0 - mod_depth)
        + data * carrier_wave * mod_depth
        + data * carrier_wave2 * (mod_depth * 0.4)
    )

    delay_samples = int(SAMPLE_RATE * echo_ms / 1000)
    echoed = np.zeros(n + delay_samples)
    echoed[:n] = modulated
    echoed[delay_samples:delay_samples + n] += modulated * echo_decay
    modulated = echoed[:n]

    modulated = bandpass(modulated, 200, 6500)
    return normalize(modulated)


def generate_audio():
    """Synthesize a Transformers-style audio sting with mechanical elements."""
    out = np.zeros(TOTAL_SAMPLES)
    t = np.arange(TOTAL_SAMPLES) / SAMPLE_RATE

    # 1. Low mechanical rumble
    rumble = noise(5.0, 0.4)
    rumble = lowpass(rumble, 140)
    rumble *= np.linspace(0, 1, TOTAL_SAMPLES) ** 0.5
    rumble *= np.linspace(1, 0, TOTAL_SAMPLES) ** 0.25
    out += rumble * 0.55

    # 2. Warning alarm beeps before door opens
    def warning_beep(start, dur=0.08, freq=880, amp=0.12):
        n = sample_count(dur)
        sig = sine_wave(freq, dur, amp)
        sig *= np.exp(-np.linspace(0, 6, n))
        sig = bandpass(sig, 700, 2000)
        write_clip(out, start, sig)

    for st in [0.05, 0.15, 0.25]:
        warning_beep(st, 0.06, 920, 0.10)

    # 3. Blast door opening: hydraulic + air hiss + metal scrape
    def door_open_sound(start, end, amp=0.5):
        n = sample_count(end - start)
        # Low hydraulic motor
        t_local = np.linspace(0, end - start, n, endpoint=False)
        freq = 60 + 40 * np.sin(np.pi * t_local / (end - start))
        motor = np.sign(np.sin(phase_from_freq(freq, n))) * amp * 0.6
        motor = lowpass(motor, 350)
        # Air hiss
        hiss = noise(end - start, amp * 0.35)
        hiss = bandpass(hiss, 800, 6000)
        hiss *= np.linspace(0.2, 1.0, n) * np.linspace(1.0, 0.2, n)
        # Metal scrape
        scrape = noise(end - start, amp * 0.25)
        scrape = bandpass(scrape, 1200, 9000)
        scrape *= np.linspace(0, 1, n) ** 0.5
        sig = motor + hiss + scrape
        sig *= np.linspace(0, 1, n) ** 0.3 * np.linspace(1, 0, n) ** 0.3
        write_clip(out, start, sig)

    door_open_sound(0.32, 1.38, 0.55)

    # 4. Door open lock clank
    def lock_clank(start, dur=0.18, amp=0.6):
        n = sample_count(dur)
        sig = noise(dur, amp)
        sig = bandpass(sig, 800, 8500)
        sig *= np.exp(-np.linspace(0, 18, n))
        write_clip(out, start, sig)

    lock_clank(1.32, 0.18, 0.5)

    # 5. Robot announcer voice
    voice_path = os.path.join(TMP_DIR, "voice.wav")
    if synthesize_voice("Mecha Legends G Two", voice_path, voice="en-US-GuyNeural", rate="+0%"):
        voice = load_voice_clip(voice_path)
        voice = normalize(voice)
        voice_mod = robotize_voice(voice, carrier=160, mod_depth=0.6, echo_ms=50, echo_decay=0.4)
        write_clip(out, 0.85, voice_mod * 0.72)
    else:
        def robot_syllable(start, duration, freq, amp=0.5, vibrato=6.0):
            n = sample_count(duration)
            t_local = np.linspace(0, duration, n, endpoint=False)
            f = freq * (1 + 0.04 * np.sin(2 * np.pi * vibrato * t_local))
            sig = np.sign(np.sin(phase_from_freq(f, n))) * amp
            sig = bandpass(sig, 400, 3200)
            sig += bandpass(noise(duration, 0.2), 1200, 6000) * np.linspace(1, 0, n)
            sig = shaped_envelope(sig, attack=0.015, decay=0.05, sustain=0.8, release=0.08)
            write_clip(out, start, sig)

        robot_syllable(1.10, 0.18, 135, 0.55, 5.0)
        robot_syllable(1.28, 0.16, 110, 0.50, 5.5)
        robot_syllable(1.60, 0.22, 125, 0.55, 4.5)
        robot_syllable(1.82, 0.24, 100, 0.50, 4.0)
        robot_syllable(2.50, 0.14, 180, 0.55, 7.0)
        robot_syllable(2.64, 0.18, 140, 0.55, 6.0)

    # 6. Door slam / lock impact
    def door_slam(start, amp=1.0):
        n = sample_count(0.5)
        # Heavy low boom
        boom = sine_wave(45, 0.5, amp) * np.exp(-np.linspace(0, 12, n))
        boom = lowpass(boom, 140)
        # Metal crash
        crash = noise(0.5, amp * 0.6)
        crash = bandpass(crash, 600, 9000)
        crash *= np.exp(-np.linspace(0, 25, n))
        # Hydraulic compressor release
        release = noise(0.3, amp * 0.25)
        release = bandpass(release, 1000, 5000)
        release *= np.linspace(1, 0, sample_count(0.3)) ** 0.8
        write_clip(out, start, boom + crash)
        write_clip(out, start + 0.05, release)

    door_slam(2.32, 1.0)

    # 7. Bright energon shimmer / rising sweep on lock
    n_sweep = sample_count(0.7)
    freq = np.linspace(250, 3200, n_sweep)
    sweep = np.sin(phase_from_freq(freq, n_sweep)) * 0.45
    sweep *= np.linspace(0, 1, n_sweep) ** 0.5 * np.linspace(1, 0, n_sweep) ** 0.2
    sweep = highpass(sweep, 250)
    write_clip(out, 2.30, sweep)

    # 8. Ambient drone after impact
    drone = sine_wave(65, 5.0, 0.18) + sine_wave(105, 5.0, 0.12)
    drone += sine_wave(145, 5.0, 0.09)
    drone = lowpass(drone, 320)
    drone *= np.linspace(0, 1, TOTAL_SAMPLES) ** 0.3
    drone *= np.linspace(1, 0, TOTAL_SAMPLES) ** 0.12
    out += drone

    # 9. End fade-out
    fade_end = int(0.4 * SAMPLE_RATE)
    out[-fade_end:] *= np.linspace(1, 0, fade_end)

    out = soft_clip(out, 0.72)
    return out


def soft_clip(data, threshold=0.7):
    return np.tanh(data / threshold) * threshold


# ───────────────────────────── Frame generation ─────────────────────────────

def render_frames():
    bg = make_circuit_background()
    cx, cy = WIDTH // 2, HEIGHT // 2

    for frame in range(TOTAL_FRAMES):
        t = frame / FPS
        base = bg.copy()

        flash = 0.0
        flare_intensity = 0.0
        flare_size = 0.0

        text_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))

        # Space-station blast doors (centered, metallic, irregular seam)
        door_layer = make_blast_door_layer(t)
        base = Image.alpha_composite(base.convert("RGBA"), door_layer).convert("RGB")

        # Text "MECHA" flies in from energon core
        if 0.7 <= t <= 2.5:
            phase = min(1.0, (t - 0.7) / 0.9)
            approach = max(0, 1.0 - phase * 1.8)
            scale = 1.0 + approach * 0.6
            region_top = int(120 + approach * 160)
            alpha = 1.0 if phase > 0.15 else phase / 0.15
            size = int(260 * scale)
            sheen = t * 3.0
            txt = make_mechanical_text("MECHA", size, region_top, 380, sheen,
                                       glow_color=CYAN_ENERGON)
            txt = set_alpha(txt, alpha)
            text_layer = Image.alpha_composite(text_layer, txt)

        # Text "LEGENDS" flies in
        if 1.3 <= t <= 2.8:
            phase = min(1.0, (t - 1.3) / 0.85)
            approach = max(0, 1.0 - phase * 1.8)
            scale = 1.0 + approach * 0.55
            region_top = int(430 + approach * 180)
            alpha = 1.0 if phase > 0.15 else phase / 0.15
            size = int(210 * scale)
            txt = make_mechanical_text("LEGENDS", size, region_top, 330, sheen=-t * 2.5,
                                       glow_color=CYAN_ENERGON)
            txt = set_alpha(txt, alpha)
            text_layer = Image.alpha_composite(text_layer, txt)

        # G2 badge / impact
        if t >= 2.0:
            phase = min(1.0, (t - 2.0) / 0.45)
            approach = max(0, 1.0 - phase * 1.8)
            scale = 1.0 + approach * 0.7
            region_top = int(610 + approach * 140)
            alpha = 1.0 if phase > 0.12 else phase / 0.12
            badge_size = int(340 * scale)
            badge = make_mechanical_text("G2", badge_size, region_top, 330, sheen=t * 4.5,
                                         glow_color=MAGENTA_NEON)
            badge = set_alpha(badge, alpha)
            text_layer = Image.alpha_composite(text_layer, badge)

            # Hexagonal energon core behind G2 (mechanical, not circular target)
            g2_glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            gdraw = ImageDraw.Draw(g2_glow)
            r_glow = int(260 * scale)
            pulse = 0.5 + 0.5 * math.sin(t * 14)

            def hexagon(cx_h, cy_h, radius):
                return [
                    (cx_h + radius * math.cos(math.pi / 3 * i - math.pi / 2),
                     cy_h + radius * math.sin(math.pi / 3 * i - math.pi / 2))
                    for i in range(6)
                ]

            for i in range(10, 0, -1):
                alpha_glow = int(55 * (1 - i / 10) * pulse + 15)
                pts = hexagon(cx, cy, r_glow * i / 10)
                gdraw.polygon(pts, fill=(MAGENTA_NEON[0], MAGENTA_NEON[1], MAGENTA_NEON[2], alpha_glow))
            # Hex core ring lines
            for ri in [0.85, 0.55, 0.3]:
                pts = hexagon(cx, cy, r_glow * ri)
                gdraw.polygon(pts, outline=(CYAN_ENERGON[0], CYAN_ENERGON[1], CYAN_ENERGON[2], int(100 * pulse)), width=2)
            base = Image.alpha_composite(base.convert("RGBA"), g2_glow).convert("RGB")

            # Corner lock brackets around G2 (mechanical, not circular)
            bracket = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            bdraw = ImageDraw.Draw(bracket)
            br = int(90 * scale)
            bw = 8
            corners = [
                (cx - br, cy - br), (cx + br, cy - br),
                (cx - br, cy + br), (cx + br, cy + br),
            ]
            for bx, by in corners:
                # L-shaped brackets
                if bx < cx:
                    bdraw.line([(bx - 25, by), (bx, by), (bx, by + (25 if by < cy else -25))],
                               fill=CYAN_ENERGON + (200,), width=bw)
                else:
                    bdraw.line([(bx + 25, by), (bx, by), (bx, by + (25 if by < cy else -25))],
                               fill=CYAN_ENERGON + (200,), width=bw)
            base = Image.alpha_composite(base.convert("RGBA"), bracket).convert("RGB")

        # Composite text
        base = Image.alpha_composite(base.convert("RGBA"), text_layer).convert("RGB")

        # Energon flash at door lock impact
        if 2.35 <= t <= 2.50:
            flash = 1.0 - abs(t - 2.42) / 0.075
            flash = max(0, flash)
            flare_intensity = flash * 0.16
            flare_size = 160 + flash * 100

        if flare_size > 0:
            base = add_lens_flare(base, cx, cy, flare_size, flare_intensity)
        if flash > 0:
            base = add_cyan_flash(base, flash * 0.12)

        # Sparks overlay during door lock
        if 2.30 <= t <= 2.60:
            spark_intensity = 1.0 - abs(t - 2.45) / 0.15
            spark_intensity = max(0, spark_intensity)
            spark_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            sdraw = ImageDraw.Draw(spark_layer)
            rng = random.Random(frame)
            for _ in range(int(100 * spark_intensity)):
                # Sparks fly from center seam outward
                angle = rng.random() * 2 * math.pi
                dist = rng.randint(50, 350)
                sx = cx + int(dist * math.cos(angle))
                sy = cy + int(dist * math.sin(angle) * 0.6)
                size = rng.randint(2, 6)
                color = rng.choice([CYAN_ENERGON, MAGENTA_NEON, HOT_ORANGE])
                sdraw.ellipse([sx, sy, sx + size, sy + size], fill=(*color, 220))
            base = Image.alpha_composite(base.convert("RGBA"), spark_layer).convert("RGB")

        base = add_vignette(base, intensity=0.18)

        # Fade in / out
        if t < 0.2:
            base = Image.blend(Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0)), base, t / 0.2)
        if t > 4.5:
            base = Image.blend(base, Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0)), (t - 4.5) / 0.5)

        base.save(os.path.join(TMP_DIR, f"frame_{frame:05d}.png"))

        if frame % 30 == 0:
            print(f"Rendered frame {frame}/{TOTAL_FRAMES}")


# ───────────────────────────── Combine ─────────────────────────────

def combine_video():
    audio_path = os.path.join(TMP_DIR, "audio.wav")
    save_wav(audio_path, generate_audio())

    frame_pattern = os.path.join(TMP_DIR, "frame_%05d.png")
    output_path = os.path.join(OUTPUT_DIR, "transition_logo.mp4")

    cmd = (
        f'ffmpeg -y -framerate {FPS} -i "{frame_pattern}" -i "{audio_path}" '
        f'-c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "{output_path}"'
    )
    print("Combining frames and audio with ffmpeg...")
    print(cmd)
    os.system(cmd)
    print(f"Done. Video saved to {output_path}")


def generate_previews():
    """Extract a few representative frames from the final video."""
    video_path = os.path.join(OUTPUT_DIR, "transition_logo.mp4")
    if not os.path.exists(video_path):
        return
    timestamps = [0.7, 1.5, 2.4, 3.5]
    for idx, ts in enumerate(timestamps, start=1):
        out = os.path.join(OUTPUT_DIR, f"transition_preview_{idx:02d}.jpg")
        cmd = (
            f'ffmpeg -y -ss {ts} -i "{video_path}" -vframes 1 -update 1 '
            f'-q:v 2 -s {WIDTH}x{HEIGHT} "{out}"'
        )
        os.system(cmd)
        print(f"Preview saved: {out}")


if __name__ == "__main__":
    print("Rendering frames...")
    render_frames()
    print("Generating audio...")
    combine_video()
    print("Generating previews...")
    generate_previews()
