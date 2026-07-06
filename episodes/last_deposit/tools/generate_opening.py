#!/usr/bin/env python3
"""
Generate a 15-second 2D animated opening title sequence for Last Deposit.

Effect:
  - Energetic mecha/rock intro music
  - Deep space/circuit background with energon particles
  - Show title "LAST DEPOSIT" slams in with metallic impact
  - Character title cards slide through (雷恩, 布洛克, 斯凯, 达什, 维克)
  - Final group card + episode title placeholder
  - Cuts cleanly to the main episode

Outputs:
  - ../output/opening.mp4
"""
import os
import math
import random
import subprocess
import numpy as np
from scipy import signal
from scipy.io import wavfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT, "output")
TMP_DIR = os.path.join(OUTPUT_DIR, "opening_tmp")
os.makedirs(TMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIDTH, HEIGHT = 1920, 1080
FPS = 30
DURATION = 15.0
TOTAL_FRAMES = int(DURATION * FPS)
SAMPLE_RATE = 48000
TOTAL_SAMPLES = int(DURATION * SAMPLE_RATE)

random.seed(2026)
np.random.seed(2026)

# Theme colors
CYBER_PURPLE = (12, 6, 28)
STEEL_DARK = (35, 38, 48)
CYAN_ENERGON = (0, 230, 255)
MAGENTA_NEON = (255, 0, 170)
CHROME_LIGHT = (220, 235, 255)

CHARACTERS = [
    {"name": "雷恩", "role": "队长", "color": (255, 45, 35), "accent": (0, 230, 255)},
    {"name": "布洛克", "role": "重盾", "color": (35, 120, 255), "accent": (0, 230, 255)},
    {"name": "斯凯", "role": "空战", "color": (230, 240, 255), "accent": (0, 230, 255)},
    {"name": "达什", "role": "火力", "color": (255, 140, 25), "accent": (0, 230, 255)},
    {"name": "维克", "role": "宿敌", "color": (160, 90, 210), "accent": (255, 0, 170)},
]


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


def soft_clip(data, threshold=0.7):
    return np.tanh(data / threshold) * threshold


# ───────────────────────────── Visual helpers ─────────────────────────────

def make_starfield_background(seed=2026):
    """Pre-render a deep space background with faint circuit traces and stars."""
    rng = random.Random(seed)
    img = Image.new("RGB", (WIDTH, HEIGHT), CYBER_PURPLE)
    draw = ImageDraw.Draw(img)

    # Subtle circuit traces
    for _ in range(30):
        x = rng.randint(0, WIDTH)
        y = rng.randint(0, HEIGHT)
        length = rng.randint(60, 300)
        angle = rng.choice([0, math.pi / 2])
        x2 = int(x + length * math.cos(angle))
        y2 = int(y + length * math.sin(angle))
        alpha = rng.randint(12, 35)
        draw.line([(x, y), (x2, y2)], fill=(alpha, alpha + 8, alpha + 20), width=rng.choice([1, 2]))
        if rng.random() > 0.6:
            draw.ellipse([x2 - 2, y2 - 2, x2 + 2, y2 + 2], fill=(alpha + 20, alpha + 30, alpha + 50))

    # Stars
    for _ in range(800):
        x = rng.randint(0, WIDTH - 1)
        y = rng.randint(0, HEIGHT - 1)
        brightness = rng.randint(40, 200)
        size = rng.choice([1, 1, 1, 2])
        draw.ellipse([x, y, x + size, y + size], fill=(brightness, brightness, int(brightness * 1.1)))

    return img


def add_vignette(img, intensity=0.5):
    overlay = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(overlay)
    cx, cy = WIDTH // 2, HEIGHT // 2
    max_r = math.sqrt(cx ** 2 + cy ** 2)
    for r in range(int(max_r), -1, -20):
        alpha = int(255 * intensity * (r / max_r) ** 1.6)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=alpha)
    return Image.composite(Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0)), img, overlay)


def get_font(size, bold=True):
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/impact.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        if path and os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def make_metallic_text(text, size, glow_color=(0, 230, 255), outline_width=4):
    """Render chrome metallic text with glow and bevel."""
    font = get_font(size)
    tmp = Image.new("L", (1, 1), 0)
    tdraw = ImageDraw.Draw(tmp)
    bbox = tdraw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = int(size * 0.5)
    txt_w, txt_h = tw + pad * 2, th + pad * 2

    text_mask = Image.new("L", (txt_w, txt_h), 0)
    mdraw = ImageDraw.Draw(text_mask)
    tx = (txt_w - tw) // 2 - bbox[0]
    ty = (txt_h - th) // 2 - bbox[1]
    mdraw.text((tx, ty), text, font=font, fill=255)

    # Outer glow
    glow = text_mask.filter(ImageFilter.GaussianBlur(radius=int(size * 0.3)))
    glow_rgba = Image.merge("RGBA", [
        Image.new("L", glow.size, glow_color[0]),
        Image.new("L", glow.size, glow_color[1]),
        Image.new("L", glow.size, glow_color[2]),
        glow.point(lambda v: min(255, int(v * 1.6)))
    ])

    # Chrome fill
    fill = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(fill)
    for row in range(txt_h):
        t = row / txt_h
        sweep = math.sin(t * math.pi) * 0.5 + 0.5
        r = int(170 + 85 * sweep)
        g = int(180 + 75 * sweep)
        b = int(200 + 55 * sweep)
        fdraw.line([(0, row), (txt_w, row)], fill=(r, g, b, 255))
    fill.putalpha(text_mask)

    # Hard outline
    outline = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(outline)
    for dx in range(-outline_width, outline_width + 1, 2):
        for dy in range(-outline_width, outline_width + 1, 2):
            if dx == 0 and dy == 0:
                continue
            odraw.text((tx + dx, ty + dy), text, font=font, fill=(25, 30, 40, 90))
    outline_mask = text_mask.filter(ImageFilter.GaussianBlur(radius=2)).point(lambda v: int(v * 0.2))
    outline_masked = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    outline_masked.paste(outline, (0, 0), outline_mask)

    # Horizontal highlights
    highlight = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(highlight)
    hl_y = int(txt_h * 0.28)
    hdraw.line([(0, hl_y), (txt_w, hl_y + max(4, size // 10))], fill=(255, 255, 255, 220))
    hl_y2 = int(txt_h * 0.58)
    hdraw.line([(0, hl_y2), (txt_w, hl_y2 + max(2, size // 18))], fill=(220, 235, 255, 140))
    highlight_masked = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    highlight_masked.paste(highlight, (0, 0), text_mask)

    comp = Image.alpha_composite(glow_rgba, outline_masked)
    comp = Image.alpha_composite(comp, fill)
    comp = Image.alpha_composite(comp, highlight_masked)
    return comp


def set_alpha(img, factor):
    if factor >= 1.0:
        return img
    r, g, b, a = img.split()
    a = a.point(lambda v: int(v * factor))
    return Image.merge("RGBA", (r, g, b, a))


def place_on_canvas(img, x, y):
    """Paste a smaller RGBA image onto a full WIDTHxHEIGHT canvas."""
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    canvas.paste(img, (int(x), int(y)), img)
    return canvas


def hexagon_points(cx, cy, radius):
    return [
        (cx + radius * math.cos(math.pi / 3 * i - math.pi / 2),
         cy + radius * math.sin(math.pi / 3 * i - math.pi / 2))
        for i in range(6)
    ]


# ───────────────────────────── Audio generation ─────────────────────────────

def generate_audio():
    """Synthesize an energetic mecha/rock opening theme."""
    out = np.zeros(TOTAL_SAMPLES)

    # Driving bass line: eighth-note pulses
    def bass_note(start, duration, freq, amp=0.55):
        n = sample_count(duration)
        t = np.linspace(0, duration, n, endpoint=False)
        sig = np.sign(np.sin(2 * np.pi * freq * t)) * amp
        sig = lowpass(sig, 160)
        # Sub octave
        sig += np.sign(np.sin(2 * np.pi * freq * 0.5 * t)) * amp * 0.4
        sig *= np.exp(-np.linspace(0, 3, n))
        write_clip(out, start, sig)

    bpm = 128
    beat = 60 / bpm
    for i in range(int(DURATION / beat) + 1):
        t = i * beat
        root = [42, 42, 40, 38, 36, 36, 38, 40][i % 8]
        bass_note(t, beat * 0.9, root, 0.5)

    # Power chord stabs on beats 2 and 4
    def power_chord(start, duration, root_freq, amp=0.35):
        n = sample_count(duration)
        t = np.linspace(0, duration, n, endpoint=False)
        sig = np.zeros(n)
        for f in [root_freq, root_freq * 1.5, root_freq * 2.0]:
            sig += np.sign(np.sin(2 * np.pi * f * t)) * amp
        sig = bandpass(sig, 250, 3500)
        sig *= np.exp(-np.linspace(0, 5, n))
        write_clip(out, start, sig)

    chord_roots = [130, 130, 123, 116, 110, 110, 116, 123]
    for bar in range(4):
        for beat_i in [1, 3]:
            i = bar * 8 + beat_i
            t = i * beat / 2  # half-beat grid
            # Snap to actual chord change every 2 beats
            chord_idx = (i // 2) % 8
            power_chord(t, beat * 0.8, chord_roots[chord_idx], 0.28)

    # Gritty guitar-like power riff (avoid electronic beep/signal tone)
    def guitar_riff(start, duration=8.0, amp=0.22):
        n = sample_count(duration)
        t = np.linspace(0, duration, n, endpoint=False)
        # Chunked power-fifth riff using sawtooth for raw edge
        notes = [196, 196, 174, 164, 147, 147, 164, 174]
        sec_per_note = duration / len(notes)
        sig = np.zeros(n)
        for idx, note in enumerate(notes):
            s = int(idx * sec_per_note * SAMPLE_RATE)
            e = min(int((idx + 1) * sec_per_note * SAMPLE_RATE), n)
            chunk_t = np.linspace(0, (e - s) / SAMPLE_RATE, e - s, endpoint=False)
            # Sawtooth + fifth + octave for power-chord thickness
            chunk = np.zeros(e - s)
            for f in [note, note * 1.5, note * 2.0]:
                chunk += 2 * (chunk_t * f - np.floor(chunk_t * f + 0.5))
            # Amp envelope: staccato chugs
            gate = np.ones(e - s)
            gate[int(0.55 * (e - s)):] *= np.linspace(1, 0, e - s - int(0.55 * (e - s))) ** 2
            chunk = chunk * gate * amp
            sig[s:e] += chunk
        # Distort / lowpass for guitar-ish tone, keep highs tame
        sig = bandpass(sig, 200, 4500)
        sig = soft_clip(sig, 0.6)
        write_clip(out, start, sig)

    guitar_riff(4.0, 8.0, 0.18)

    # Drum kit
    def kick(start, amp=0.9):
        n = sample_count(0.25)
        t = np.linspace(0, 0.25, n, endpoint=False)
        freq = 60 + 80 * np.exp(-t * 30)
        sig = np.sin(phase_from_freq(freq, n)) * amp
        sig *= np.exp(-np.linspace(0, 12, n))
        sig = lowpass(sig, 250)
        write_clip(out, start, sig)

    def snare(start, amp=0.55):
        n = sample_count(0.2)
        sig = noise(0.2, amp)
        sig = bandpass(sig, 800, 7000)
        sig *= np.exp(-np.linspace(0, 20, n))
        write_clip(out, start, sig)

    def hihat(start, amp=0.18):
        n = sample_count(0.08)
        sig = noise(0.08, amp)
        sig = highpass(sig, 7000)
        sig *= np.exp(-np.linspace(0, 35, n))
        write_clip(out, start, sig)

    for i in range(int(DURATION / (beat / 2)) + 1):
        t = i * beat / 2
        if i % 2 == 0:
            kick(t, 0.85)
        if i % 4 == 2:
            snare(t, 0.5)
        if i % 2 == 1:
            hihat(t, 0.15)

    # Cymbal crash at title slam
    crash_t = 2.0
    n_crash = sample_count(1.2)
    crash = noise(1.2, 0.5)
    crash = highpass(crash, 3000)
    crash *= np.exp(-np.linspace(0, 8, n_crash))
    write_clip(out, crash_t, crash)

    # Cymbal swell into final group card (no electronic signal sweep)
    n_swell = sample_count(2.5)
    swell = noise(2.5, 0.35)
    swell = highpass(swell, 2000)
    amp_env = np.linspace(0, 1, n_swell) ** 0.4 * np.linspace(1, 0, n_swell) ** 0.15
    swell *= amp_env
    write_clip(out, 14.5, swell)

    # Final impact on group card reveal
    impact = noise(0.3, 0.6)
    impact = bandpass(impact, 150, 6000)
    impact *= np.exp(-np.linspace(0, 15, sample_count(0.3)))
    write_clip(out, 16.8, impact)

    # Master
    out = soft_clip(out, 0.72)
    return out


# ───────────────────────────── Frame generation ─────────────────────────────

def render_frames():
    bg = make_starfield_background()
    cx, cy = WIDTH // 2, HEIGHT // 2

    for frame in range(TOTAL_FRAMES):
        t = frame / FPS
        base = bg.copy()

        # Animated energon particles / sparks
        spark_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(spark_layer)
        rng = random.Random(frame)
        for _ in range(40):
            sx = rng.randint(0, WIDTH)
            sy = rng.randint(0, HEIGHT)
            size = rng.choice([1, 1, 2])
            alpha = rng.randint(80, 200)
            sdraw.ellipse([sx, sy, sx + size, sy + size], fill=(0, 230, 255, alpha))
        base = Image.alpha_composite(base.convert("RGBA"), spark_layer).convert("RGB")

        # ── Phase 1: Title slam (1.5 - 4.5s) ──
        if t < 5.5:
            # "LAST DEPOSIT" main title
            title_phase = max(0.0, min(1.0, (t - 1.5) / 1.0))
            title_scale = 1.0 + (1.0 - title_phase) * 0.4
            title_alpha = min(1.0, title_phase * 1.5)
            title_img = make_metallic_text("LAST DEPOSIT", int(220 * title_scale), glow_color=CYAN_ENERGON)
            title_w, title_h = title_img.size
            paste_x = (WIDTH - title_w) // 2
            paste_y = cy - 120 - int(title_h // 2)
            title_img = set_alpha(title_img, title_alpha)
            title_img = place_on_canvas(title_img, paste_x, paste_y)
            base = Image.alpha_composite(base.convert("RGBA"), title_img).convert("RGB")

            # 副标题：EPISODE 01
            sub_phase = max(0.0, min(1.0, (t - 2.5) / 0.7))
            sub_scale = 1.0 + (1.0 - sub_phase) * 0.3
            sub_alpha = min(1.0, sub_phase * 1.5)
            sub_img = make_metallic_text("EPISODE 01", int(90 * sub_scale), glow_color=MAGENTA_NEON)
            sub_w, sub_h = sub_img.size
            sub_x = (WIDTH - sub_w) // 2
            sub_y = cy + 70
            sub_img = set_alpha(sub_img, sub_alpha)
            sub_img = place_on_canvas(sub_img, sub_x, sub_y)
            base = Image.alpha_composite(base.convert("RGBA"), sub_img).convert("RGB")

            # Hex core behind subtitle
            if t > 2.3:
                core_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
                cdraw = ImageDraw.Draw(core_layer)
                pulse = 0.5 + 0.5 * math.sin(t * 10)
                for i in range(8, 0, -1):
                    alpha_c = int(40 * (1 - i / 8) * pulse + 10)
                    pts = hexagon_points(cx, cy + 120 + sub_h // 2, 180 * i / 8 * sub_phase)
                    cdraw.polygon(pts, fill=(MAGENTA_NEON[0], MAGENTA_NEON[1], MAGENTA_NEON[2], alpha_c))
                base = Image.alpha_composite(base.convert("RGBA"), core_layer).convert("RGB")

        # ── Phase 2: Character cards (4.5 - 12.5s) ──
        if 4.5 <= t <= 12.5:
            card_duration = 1.6
            card_t = (t - 4.5) % card_duration
            card_index = int((t - 4.5) // card_duration)
            char = CHARACTERS[min(card_index, len(CHARACTERS) - 1)]

            # Slide in / settle / slide out
            if card_t < 0.3:
                phase = card_t / 0.3
                offset_x = int((1 - phase) * WIDTH * 0.6)
                alpha = phase
            elif card_t < 1.5:
                offset_x = 0
                alpha = 1.0
            else:
                phase = (card_t - 1.5) / 0.5
                offset_x = int(-phase * WIDTH * 0.6)
                alpha = 1.0 - phase

            if card_index < len(CHARACTERS):
                card_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
                cdraw = ImageDraw.Draw(card_layer)

                # Card frame
                card_w, card_h = 760, 460
                card_x = (WIDTH - card_w) // 2 + offset_x
                card_y = (HEIGHT - card_h) // 2

                # Background panel
                cdraw.rectangle([card_x, card_y, card_x + card_w, card_y + card_h],
                                fill=(18, 20, 28, 220), outline=char["accent"] + (200,), width=4)

                # Inner accent lines
                margin = 24
                cdraw.rectangle([card_x + margin, card_y + margin,
                                 card_x + card_w - margin, card_y + card_h - margin],
                                outline=char["color"] + (120,), width=2)

                # Character name
                name_img = make_metallic_text(char["name"], 110, glow_color=char["color"])
                nw, nh = name_img.size
                name_x = card_x + (card_w - nw) // 2
                name_y = card_y + 80
                card_layer.paste(name_img, (name_x, name_y), name_img)

                # Role
                role_img = make_metallic_text(char["role"], 56, glow_color=char["accent"])
                rw, rh = role_img.size
                role_x = card_x + (card_w - rw) // 2
                role_y = card_y + 230
                card_layer.paste(role_img, (role_x, role_y), role_img)

                # Decorative hexagon
                hx, hy = card_x + card_w // 2, card_y + 360
                pts = hexagon_points(hx, hy, 55)
                cdraw.polygon(pts, outline=char["color"] + (180,), width=4)

                card_layer = set_alpha(card_layer, alpha)
                base = Image.alpha_composite(base.convert("RGBA"), card_layer).convert("RGB")

        # ── Phase 3: Final group card (12.5 - 15s) ──
        if t >= 12.5:
            final_phase = min(1.0, (t - 12.5) / 1.0)
            final_alpha = min(1.0, final_phase * 1.5)
            final_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            fdraw = ImageDraw.Draw(final_layer)

            # Main title emblem
            title_img2 = make_metallic_text("LAST DEPOSIT", 140, glow_color=CYAN_ENERGON)
            title_img2 = set_alpha(title_img2, final_alpha)
            gw, gh = title_img2.size
            final_layer.paste(title_img2, ((WIDTH - gw) // 2, cy - 220), title_img2)

            # Character roster strip
            strip_w = 1400
            strip_h = 110
            strip_x = (WIDTH - strip_w) // 2
            strip_y = cy + 80
            fdraw.rectangle([strip_x, strip_y, strip_x + strip_w, strip_y + strip_h],
                            fill=(18, 20, 28, 200), outline=CYAN_ENERGON + (180,), width=3)

            n_chars = len(CHARACTERS)
            cell_w = strip_w // n_chars
            for i, char in enumerate(CHARACTERS):
                cx_cell = strip_x + i * cell_w + cell_w // 2
                # Small hex icon
                pts = hexagon_points(cx_cell, strip_y + strip_h // 2, 30)
                fdraw.polygon(pts, fill=char["color"] + (180,), outline=char["accent"] + (220,), width=2)
                # Name below
                name_img = make_metallic_text(char["name"].replace(" ", "\n"), 28, glow_color=char["color"])
                nw, nh = name_img.size
                name_x = cx_cell - nw // 2
                name_y = strip_y + strip_h + 15
                final_layer.paste(name_img, (name_x, name_y), name_img)

            # Episode title placeholder
            ep_img = make_metallic_text("EPISODE 01: THE DROP", 48, glow_color=CYAN_ENERGON)
            ep_img = set_alpha(ep_img, final_alpha)
            ew, eh = ep_img.size
            final_layer.paste(ep_img, ((WIDTH - ew) // 2, HEIGHT - 160), ep_img)

            final_layer = set_alpha(final_layer, final_alpha)
            base = Image.alpha_composite(base.convert("RGBA"), final_layer).convert("RGB")

        # Vignette and fade
        base = add_vignette(base, intensity=0.35)
        if t < 0.5:
            base = Image.blend(Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0)), base, t / 0.5)
        if t > 14.5:
            base = Image.blend(base, Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0)), (t - 14.5) / 0.5)

        base.save(os.path.join(TMP_DIR, f"frame_{frame:05d}.png"))
        if frame % 30 == 0:
            print(f"Rendered opening frame {frame}/{TOTAL_FRAMES}")


# ───────────────────────────── Combine ─────────────────────────────

def combine_video():
    # Prefer a downloaded real-music clip if available; otherwise fall back to synthesis.
    external_music = os.path.join(OUTPUT_DIR, "opening_music_15s.mp3")
    if os.path.exists(external_music):
        audio_path = external_music
        audio_input = f'-i "{audio_path}" -c:a aac -b:a 192k -ac 1 -shortest'
        print(f"Using external music track: {audio_path}")
    else:
        audio_path = os.path.join(TMP_DIR, "audio.wav")
        save_wav(audio_path, generate_audio())
        audio_input = f'-i "{audio_path}" -c:a aac -b:a 192k -ac 1 -shortest'
        print("Using synthesized opening audio")

    frame_pattern = os.path.join(TMP_DIR, "frame_%05d.png")
    output_path = os.path.join(OUTPUT_DIR, "opening.mp4")

    cmd = (
        f'ffmpeg -y -framerate {FPS} -i "{frame_pattern}" {audio_input} '
        f'-c:v libx264 -pix_fmt yuv420p "{output_path}"'
    )
    print("Combining opening frames and audio with ffmpeg...")
    print(cmd)
    os.system(cmd)
    print(f"Done. Opening saved to {output_path}")


def generate_previews():
    video_path = os.path.join(OUTPUT_DIR, "opening.mp4")
    if not os.path.exists(video_path):
        return
    timestamps = [1.0, 3.0, 6.5, 9.5, 13.5]
    for idx, ts in enumerate(timestamps, start=1):
        out = os.path.join(OUTPUT_DIR, f"opening_preview_{idx:02d}.jpg")
        cmd = (
            f'ffmpeg -y -ss {ts} -i "{video_path}" -vframes 1 -update 1 '
            f'-q:v 2 -s {WIDTH}x{HEIGHT} "{out}"'
        )
        os.system(cmd)
        print(f"Opening preview saved: {out}")


if __name__ == "__main__":
    print("Rendering opening frames...")
    render_frames()
    print("Generating opening audio...")
    combine_video()
    print("Generating opening previews...")
    generate_previews()
