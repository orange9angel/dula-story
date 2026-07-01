#!/usr/bin/env python3
"""
Generate a 5-second Transformers-style logo transition for mecha_legends_g2.

Effect:
  - Stars/black screen
  - Mechanical logo flies in from the distance
  - Bright flash / impact
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

def make_star_field(seed=42):
    """Pre-render a dark star field background."""
    rng = random.Random(seed)
    img = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 2))
    draw = ImageDraw.Draw(img)
    for _ in range(900):
        x = rng.randint(0, WIDTH - 1)
        y = rng.randint(0, HEIGHT - 1)
        brightness = rng.randint(30, 220)
        size = rng.choice([1, 1, 1, 2, 2, 3])
        draw.ellipse([x, y, x + size, y + size], fill=(brightness, brightness, int(brightness * 0.95)))
    return img


def add_vignette(img, intensity=0.6):
    """Darken the corners."""
    overlay = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(overlay)
    cx, cy = WIDTH // 2, HEIGHT // 2
    max_r = math.sqrt(cx ** 2 + cy ** 2)
    for r in range(int(max_r), -1, -20):
        alpha = int(255 * intensity * (r / max_r) ** 1.5)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=alpha)
    return Image.composite(Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0)), img, overlay)


def draw_glow(draw, xy, radius, color, alpha=128):
    """Draw a soft radial glow."""
    for i in range(10, 0, -1):
        r = radius * i / 10
        a = int(alpha * (i / 10) ** 2)
        glow_color = (*color, a)
        draw.ellipse([xy[0] - r, xy[1] - r, xy[0] + r, xy[1] + r], fill=glow_color)


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


def make_metallic_text(text, size, region_top, region_height, sheen=0.0, glow_color=(255, 180, 60)):
    """Render bright metallic text with outer glow and bevel.

    Returns a full-screen (WIDTH, HEIGHT) RGBA image with the text centered
    inside the vertical region [region_top, region_top + region_height].
    """
    # 1. Render crisp text mask at a slightly larger size for quality
    mask_size = int(size * 1.2)
    font = get_font(mask_size)
    # Measure text
    tmp = Image.new("L", (1, 1), 0)
    tdraw = ImageDraw.Draw(tmp)
    bbox = tdraw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    # Create a padded canvas for the text
    pad = int(mask_size * 0.5)
    txt_w, txt_h = tw + pad * 2, th + pad * 2
    text_mask = Image.new("L", (txt_w, txt_h), 0)
    mdraw = ImageDraw.Draw(text_mask)
    tx = (txt_w - tw) // 2 - bbox[0]
    ty = (txt_h - th) // 2 - bbox[1]
    mdraw.text((tx, ty), text, font=font, fill=255)

    # 2. Outer glow (blurred mask tinted with glow_color) - strong and bright
    glow = text_mask.filter(ImageFilter.GaussianBlur(radius=int(mask_size * 0.32)))
    glow_rgba = Image.merge("RGBA", [
        Image.new("L", glow.size, glow_color[0]),
        Image.new("L", glow.size, glow_color[1]),
        Image.new("L", glow.size, glow_color[2]),
        glow.point(lambda v: min(255, int(v * 1.7)))
    ])

    # 3. Inner metallic fill - bright gold/silver with high contrast
    fill = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(fill)
    for row in range(txt_h):
        t = row / txt_h
        # Sweep between rich gold and near-white
        sweep = math.sin(t * math.pi + sheen) * 0.5 + 0.5
        r = 255
        g = int(225 + 30 * sweep)
        b = int(155 + 100 * sweep)
        fdraw.line([(0, row), (txt_w, row)], fill=(r, g, b, 255))
    fill.putalpha(text_mask)

    # 3b. Bright inner core so the center never goes dark
    core = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(core)
    cx_c, cy_c = txt_w // 2, txt_h // 2
    max_rc = max(cx_c, cy_c)
    for i in range(10, 0, -1):
        r_c = max_rc * (i / 10) ** 1.3
        a_c = int(90 * (1 - i / 10))
        cdraw.ellipse([cx_c - r_c, cy_c - r_c, cx_c + r_c, cy_c + r_c],
                      fill=(255, 250, 220, a_c))
    core_masked = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    core_masked.paste(core, (0, 0), text_mask)

    # 4. Very subtle inner shadow for 3D depth
    outline = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(outline)
    for dx in range(-3, 4, 2):
        for dy in range(-3, 4, 2):
            if dx == 0 and dy == 0:
                continue
            odraw.text((tx + dx, ty + dy), text, font=font, fill=(40, 45, 60, 80))
    outline_mask = text_mask.filter(ImageFilter.GaussianBlur(radius=2)).point(lambda v: int(v * 0.10))
    outline_masked = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    outline_masked.paste(outline, (0, 0), outline_mask)

    # 5. Highlight strips
    highlight = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(highlight)
    hl_y = int(txt_h * (0.26 + 0.05 * math.sin(sheen * 2)))
    hdraw.line([(0, hl_y), (txt_w, hl_y + max(6, mask_size // 6))], fill=(255, 255, 255, 240))
    hl_y2 = int(txt_h * (0.52 + 0.03 * math.sin(sheen * 2)))
    hdraw.line([(0, hl_y2), (txt_w, hl_y2 + max(3, mask_size // 12))], fill=(255, 250, 220, 160))
    highlight_masked = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    highlight_masked.paste(highlight, (0, 0), text_mask)

    # Composite: glow -> outline -> fill -> core -> highlight
    comp = Image.alpha_composite(glow_rgba, outline_masked)
    comp = Image.alpha_composite(comp, fill)
    comp = Image.alpha_composite(comp, core_masked)
    comp = Image.alpha_composite(comp, highlight_masked)

    # 6. Add a bright radial bloom behind the text for extra pop
    bloom = Image.new("RGBA", (txt_w, txt_h), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bloom)
    cx_b, cy_b = txt_w // 2, txt_h // 2
    max_r = max(cx_b, cy_b)
    for i in range(10, 0, -1):
        r_b = max_r * i / 10
        alpha_b = int(55 * (1 - i / 10))
        bdraw.ellipse([cx_b - r_b, cy_b - r_b, cx_b + r_b, cy_b + r_b],
                      fill=(glow_color[0], glow_color[1], glow_color[2], alpha_b))
    comp = Image.alpha_composite(bloom, comp)

    # 6. Scale to fit the requested region and center on a full-screen canvas
    scale = min(WIDTH / txt_w, region_height / txt_h)
    new_w, new_h = int(txt_w * scale), int(txt_h * scale)
    comp_resized = comp.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    paste_x = (WIDTH - new_w) // 2
    paste_y = region_top + (region_height - new_h) // 2
    canvas.paste(comp_resized, (paste_x, paste_y), comp_resized)
    return canvas


def add_flash(img, intensity):
    """Add a warm gold flash overlay."""
    if intensity <= 0:
        return img
    overlay = Image.new("RGB", (WIDTH, HEIGHT), (255, 240, 210))
    return Image.blend(img, overlay, min(1.0, intensity * 0.22))


def set_alpha(img, factor):
    """Multiply the alpha channel of an RGBA image by factor (0..1)."""
    if factor >= 1.0:
        return img
    r, g, b, a = img.split()
    a = a.point(lambda v: int(v * factor))
    return Image.merge("RGBA", (r, g, b, a))


def add_lens_flare(img, cx, cy, size, intensity):
    """Add a simple lens flare burst."""
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    colors = [
        ((255, 250, 220), 0.9),
        ((255, 230, 180), 0.7),
        ((200, 220, 255), 0.5),
        ((100, 150, 255), 0.3),
    ]
    for color, ratio in colors:
        r = size * ratio
        a = int(255 * intensity * ratio)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    # Cross rays
    ray = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ray)
    rdraw.line([(cx - size * 1.5, cy), (cx + size * 1.5, cy)], fill=(255, 255, 240, int(180 * intensity)), width=int(size * 0.08))
    rdraw.line([(cx, cy - size * 1.2), (cx, cy + size * 1.2)], fill=(255, 255, 240, int(180 * intensity)), width=int(size * 0.08))
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


def robotize_voice(data, carrier=175, mod_depth=0.55, echo_ms=45, echo_decay=0.35):
    """Turn a natural voice into a metallic Transformers-style announcer.

    Uses ring modulation + harmonic overtones + short metallic echo,
    then band-limits to keep speech intelligible.
    """
    n = len(data)
    t = np.arange(n) / SAMPLE_RATE

    # Carrier with slow vibrato for a warbling machine feel
    carrier_wave = np.sin(
        2 * np.pi * carrier * t + 0.4 * np.sin(2 * np.pi * 5.5 * t)
    )
    carrier_wave2 = np.sin(
        2 * np.pi * (carrier * 2.0) * t + 0.3 * np.sin(2 * np.pi * 7.0 * t)
    )

    # Ring-mod blend: original + modulated + 2nd harmonic
    modulated = (
        data * (1.0 - mod_depth)
        + data * carrier_wave * mod_depth
        + data * carrier_wave2 * (mod_depth * 0.35)
    )

    # Short metallic delay / echo ( Comb-filter-ish )
    delay_samples = int(SAMPLE_RATE * echo_ms / 1000)
    echoed = np.zeros(n + delay_samples)
    echoed[:n] = modulated
    echoed[delay_samples:delay_samples + n] += modulated * echo_decay
    modulated = echoed[:n]

    # Bandpass to keep it crisp and radio-like
    modulated = bandpass(modulated, 220, 6500)
    return normalize(modulated)


def generate_audio():
    """Synthesize a Transformers-style audio sting."""
    out = np.zeros(TOTAL_SAMPLES)
    t = np.arange(TOTAL_SAMPLES) / SAMPLE_RATE

    # 1. Low mechanical rumble / build-up
    rumble = noise(5.0, 0.35)
    rumble = lowpass(rumble, 120)
    rumble *= np.linspace(0, 1, TOTAL_SAMPLES) ** 0.5
    rumble *= np.linspace(1, 0, TOTAL_SAMPLES) ** 0.3
    out += rumble * 0.5

    # 2. Servo / gear sweeps
    def servo_sweep(start, end, f0, f1, amp=0.3):
        n = sample_count(end - start)
        freq = np.linspace(f0, f1, n)
        sig = np.sign(np.sin(phase_from_freq(freq, n))) * amp
        sig = lowpass(sig, 1800)
        sig *= np.linspace(0, 1, n) * np.linspace(1, 0, n)
        write_clip(out, start, sig)

    servo_sweep(0.2, 0.7, 60, 300, 0.25)
    servo_sweep(0.9, 1.3, 200, 80, 0.2)
    servo_sweep(2.3, 2.8, 100, 400, 0.35)

    # 3. Metallic scrape hits
    def metal_hit(start, dur=0.25, amp=0.6):
        n = sample_count(dur)
        sig = noise(dur, amp)
        sig = bandpass(sig, 800, 9000)
        sig *= np.exp(-np.linspace(0, 20, n))
        write_clip(out, start, sig)

    metal_hit(0.5, 0.15, 0.5)
    metal_hit(1.15, 0.2, 0.4)
    metal_hit(2.0, 0.2, 0.45)
    metal_hit(2.5, 0.35, 0.8)

    # 4. Cool English announcer voice (edge-tts) with robotized fallback
    voice_path = os.path.join(TMP_DIR, "voice.wav")
    if synthesize_voice("Mecha Legends G Two", voice_path, voice="en-US-GuyNeural", rate="+0%"):
        voice = load_voice_clip(voice_path)
        voice = normalize(voice)
        # Heavy robotic/metallic treatment
        voice_mod = robotize_voice(voice, carrier=175, mod_depth=0.55, echo_ms=45, echo_decay=0.35)
        write_clip(out, 0.90, voice_mod * 0.78)
    else:
        # Fallback procedural robotic syllables
        def robot_syllable(start, duration, freq, amp=0.5, vibrato=6.0):
            n = sample_count(duration)
            t_local = np.linspace(0, duration, n, endpoint=False)
            f = freq * (1 + 0.04 * np.sin(2 * np.pi * vibrato * t_local))
            sig = np.sign(np.sin(phase_from_freq(f, n))) * amp
            sig = bandpass(sig, 400, 3200)
            sig += bandpass(noise(duration, 0.2), 1200, 6000) * np.linspace(1, 0, n)
            sig = shaped_envelope(sig, attack=0.015, decay=0.05, sustain=0.8, release=0.08)
            write_clip(out, start, sig)

        robot_syllable(1.20, 0.18, 135, 0.55, 5.0)
        robot_syllable(1.38, 0.16, 110, 0.50, 5.5)
        robot_syllable(1.70, 0.22, 125, 0.55, 4.5)
        robot_syllable(1.92, 0.24, 100, 0.50, 4.0)
        robot_syllable(2.60, 0.14, 180, 0.55, 7.0)
        robot_syllable(2.74, 0.18, 140, 0.55, 6.0)

    # 5. Impact boom
    n_impact = sample_count(0.6)
    boom = sine_wave(55, 0.6, 0.9) * np.exp(-np.linspace(0, 10, n_impact))
    boom = lowpass(boom, 160)
    write_clip(out, 2.48, boom)

    # 6. Bright shimmer / rising sweep for the flash
    n_sweep = sample_count(0.8)
    freq = np.linspace(400, 3000, n_sweep)
    sweep = np.sin(phase_from_freq(freq, n_sweep)) * 0.35
    sweep *= np.linspace(0, 1, n_sweep) ** 0.5 * np.linspace(1, 0, n_sweep) ** 0.2
    sweep = highpass(sweep, 400)
    write_clip(out, 2.45, sweep)

    # 7. Ambient drone after impact
    drone = sine_wave(80, 5.0, 0.15) + sine_wave(120, 5.0, 0.1)
    drone += sine_wave(160, 5.0, 0.08)
    drone = lowpass(drone, 300)
    drone *= np.linspace(0, 1, TOTAL_SAMPLES) ** 0.3
    drone *= np.linspace(1, 0, TOTAL_SAMPLES) ** 0.15
    out += drone

    # 8. End fade-out
    fade_end = int(0.4 * SAMPLE_RATE)
    out[-fade_end:] *= np.linspace(1, 0, fade_end)

    out = soft_clip(out, 0.75)
    return out


def soft_clip(data, threshold=0.7):
    return np.tanh(data / threshold) * threshold


# ───────────────────────────── Frame generation ─────────────────────────────

def render_frames():
    star_bg = make_star_field()
    cx, cy = WIDTH // 2, HEIGHT // 2

    for frame in range(TOTAL_FRAMES):
        t = frame / FPS
        base = star_bg.copy()

        # Progress markers
        flash = 0.0
        flare_intensity = 0.0
        flare_size = 0.0

        # All text is accumulated on a full-screen layer so sizes match.
        text_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))

        # Mechanical grid / gear lines appear behind text
        if t > 0.4:
            overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            grid_alpha = int(60 * min(1.0, (t - 0.4) / 0.6) * (1.0 if t < 4.5 else max(0, (5.0 - t) / 0.5)))
            # Concentric hexagons
            for r in range(50, 600, 60):
                pts = []
                for i in range(6):
                    angle = i * math.pi / 3 + t * 0.3
                    pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
                draw.polygon(pts, outline=(80, 120, 200, grid_alpha))
            # Radial spokes
            for i in range(12):
                angle = i * math.pi / 6 + t * 0.15
                x2 = cx + 800 * math.cos(angle)
                y2 = cy + 800 * math.sin(angle)
                draw.line([(cx, cy), (x2, y2)], fill=(60, 100, 180, grid_alpha // 2), width=2)
            base = Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")

        # Text "MECHA" flies in (top)
        if 0.8 <= t <= 2.6:
            phase = min(1.0, (t - 0.8) / 1.0)
            # Approach: starts lower/smaller and snaps into place
            approach = max(0, 1.0 - phase * 1.8)  # 1..0 quickly
            scale = 1.0 + approach * 0.6
            region_top = int(140 + approach * 180)
            alpha = 1.0 if phase > 0.15 else phase / 0.15
            size = int(260 * scale)
            sheen = t * 3.0
            txt = make_metallic_text("MECHA", size, region_top, 360, sheen, glow_color=(255, 200, 80))
            # Motion streak during fast approach
            if approach > 0.2:
                streak_alpha = int(180 * (approach - 0.2) / 0.8)
                streak = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
                sdraw = ImageDraw.Draw(streak)
                y_base = region_top + 180
                sdraw.line([(cx - 600, y_base), (cx + 600, y_base)], fill=(255, 220, 160, streak_alpha), width=int(18 * scale))
                base = Image.alpha_composite(base.convert("RGBA"), streak).convert("RGB")
            txt = set_alpha(txt, alpha)
            text_layer = Image.alpha_composite(text_layer, txt)

        # Text "LEGENDS" flies in (middle)
        if 1.4 <= t <= 2.9:
            phase = min(1.0, (t - 1.4) / 0.9)
            approach = max(0, 1.0 - phase * 1.8)
            scale = 1.0 + approach * 0.6
            region_top = int(460 + approach * 200)
            alpha = 1.0 if phase > 0.15 else phase / 0.15
            size = int(210 * scale)
            txt = make_metallic_text("LEGENDS", size, region_top, 320, sheen=-t * 2.5, glow_color=(255, 190, 70))
            txt = set_alpha(txt, alpha)
            text_layer = Image.alpha_composite(text_layer, txt)

        # G2 badge / impact (bottom)
        if t >= 2.1:
            phase = min(1.0, (t - 2.1) / 0.5)
            approach = max(0, 1.0 - phase * 1.8)
            scale = 1.0 + approach * 0.8
            region_top = int(620 + approach * 160)
            alpha = 1.0 if phase > 0.12 else phase / 0.12
            badge_size = int(360 * scale)
            badge = make_metallic_text("G2", badge_size, region_top, 340, sheen=t * 4.5, glow_color=(180, 245, 255))
            badge = set_alpha(badge, alpha)
            text_layer = Image.alpha_composite(text_layer, badge)

            # Bright radial glow behind G2
            g2_glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            gdraw = ImageDraw.Draw(g2_glow)
            r_glow = int(260 * scale)
            pulse = 0.5 + 0.5 * math.sin(t * 12)
            for i in range(10, 0, -1):
                alpha_glow = int(55 * (1 - i / 10) * pulse + 20)
                gdraw.ellipse([cx - r_glow * i / 10, 790 - r_glow * i / 10,
                               cx + r_glow * i / 10, 790 + r_glow * i / 10],
                              fill=(100, 190, 255, alpha_glow))
            base = Image.alpha_composite(base.convert("RGBA"), g2_glow).convert("RGB")

            # Glowing ring behind G2
            ring = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            rdraw = ImageDraw.Draw(ring)
            r = int(180 * scale)
            for i in range(6, 0, -1):
                alpha_ring = int(110 * i * pulse)
                rdraw.ellipse([cx - r * i / 2, 790 - r * i / 2, cx + r * i / 2, 790 + r * i / 2],
                              outline=(150, 220, 255, alpha_ring), width=6)
            base = Image.alpha_composite(base.convert("RGBA"), ring).convert("RGB")

        # Composite the full text layer onto the base
        base = Image.alpha_composite(base.convert("RGBA"), text_layer).convert("RGB")

        # Flash at impact (short and localized)
        if 2.50 <= t <= 2.60:
            flash = 1.0 - abs(t - 2.55) / 0.05
            flash = max(0, flash)
            flare_intensity = flash * 0.12
            flare_size = 120 + flash * 80

        # Add lens flare and flash
        if flare_size > 0:
            base = add_lens_flare(base, cx, 790, flare_size, flare_intensity)
        if flash > 0:
            base = add_flash(base, flash * 0.08)

        # Vignette and subtle color grade
        base = add_vignette(base, intensity=0.15)

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
    timestamps = [1.5, 2.0, 2.55, 3.5]
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
