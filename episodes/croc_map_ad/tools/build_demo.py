#!/usr/bin/env python3
"""Croc map ad demo post: pin drop + map UI overlay + zoom/swipe transitions
+ beat-synced BGM + freeze ending. PIL + numpy + ffmpeg only (no GUI).

Timeline (beats from BGM onset grid, events snapped to beats):
  0 .. e_pin      croc_ref push-in; red map pin drops at e_pin with bounce
  e_pin .. t1     hold, then 0.35s zoom-blur into Sanya
  Sanya (map UI 三亚) .. t2, then 0.35s horizontal swipe into Harbin
  Harbin (map UI 哈尔滨, speech from video audio) .. t3
  t3: freeze frame 1.0s (push 1.0->1.08) + 0.1s white flash + shutter click

Run with dula-story/.venv python.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path("D:/opensource/movie/dula-story/episodes/croc_map_ad")
SKILL_BEATCUT = "D:/opensource/movie/dula-skills/beatcut-edit/scripts"
sys.path.insert(0, SKILL_BEATCUT)
from beatcut import load_mono, detect_onsets  # noqa: E402

W, H = 720, 1280
FPS = 24
BGM = "D:/opensource/movie/dula-story/episodes/anime_girl_basketball_5s/assets/audio/music/cheerful.wav"
OUT = ROOT / "output" / "croc_map_ad_demo.mp4"
TMP = ROOT / "tmp" / "post"
FONT = "C:/Windows/Fonts/msyh.ttc"

ZOOM_T = 0.35   # zoom-blur transition duration
SWIPE_T = 0.35  # swipe transition duration
FREEZE_D = 1.0

CITIES = {
    "sanya":  {"name": "三亚", "sub": "海南省·中国", "poi": ["亚龙湾", "天涯海角", "椰梦长廊"]},
    "harbin": {"name": "哈尔滨", "sub": "黑龙江省·中国", "poi": ["圣索菲亚教堂", "中央大街", "松花江"]},
}


def decode(video: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(video), "-f", "rawvideo",
         "-pix_fmt", "rgb24", "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}", "-"],
        capture_output=True, check=True).stdout
    n = len(raw) // (W * H * 3)
    return np.frombuffer(raw, dtype=np.uint8)[: n * W * H * 3].reshape(n, H, W, 3)


def encode(frames: list[np.ndarray], audio_wav: Path, out: Path):
    TMP.mkdir(parents=True, exist_ok=True)
    pipe = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", str(audio_wav),
         "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out)],
        stdin=subprocess.PIPE)
    for f in frames:
        pipe.stdin.write(f.tobytes())
    pipe.stdin.close()
    pipe.wait()
    assert pipe.returncode == 0, "ffmpeg encode failed"


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size)


def rrect(d: ImageDraw.ImageDraw, box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)


def draw_pin(size=90) -> Image.Image:
    im = Image.new("RGBA", (size, int(size * 1.4)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy, r = size // 2, size // 2, size // 2 - 4
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(232, 45, 56, 255))
    d.polygon([(cx - r + 8, cy + r - 14), (cx + r - 8, cy + r - 14), (cx, int(size * 1.35))],
              fill=(232, 45, 56, 255))
    d.ellipse([cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2], fill=(255, 255, 255, 255))
    d.ellipse([cx - r // 4, cy - r // 4, cx + r // 4, cy + r // 4], fill=(232, 45, 56, 255))
    return im


PIN = draw_pin(70)


def map_ui(city: dict) -> Image.Image:
    """Map-app chrome overlay (RGBA): search bar, POI labels, bottom card."""
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # top search bar
    rrect(d, [28, 40, W - 28, 116], 38, (255, 255, 255, 245))
    d.text((64, 56), city["name"], font=font(40), fill=(30, 30, 30, 255))
    d.text((W - 92, 56), "×", font=font(44), fill=(120, 120, 120, 255))
    # POI labels
    f_poi = font(26)
    for i, poi in enumerate(city["poi"]):
        x, y = [(60, 420), (W - 260, 700), (80, 900)][i]
        d.ellipse([x, y, x + 16, y + 16], fill=(255, 255, 255, 230))
        d.ellipse([x + 4, y + 4, x + 12, y + 12], fill=(46, 155, 214, 255))
        d.text((x + 24, y - 8), poi, font=f_poi, fill=(255, 255, 255, 240),
               stroke_width=2, stroke_fill=(0, 0, 0, 120))
    # right nav circles
    for j in range(2):
        cy = 560 + j * 110
        d.ellipse([W - 110, cy, W - 40, cy + 70], fill=(255, 255, 255, 235))
        d.polygon([(W - 88, cy + 18), (W - 62, cy + 35), (W - 88, cy + 52)],
                  fill=(46, 155, 214, 255) if j == 0 else (60, 60, 60, 255))
    # bottom card
    rrect(d, [28, H - 280, W - 28, H - 40], 28, (255, 255, 255, 248))
    d.text((64, H - 262), city["name"], font=font(52), fill=(20, 20, 20, 255))
    d.text((64, H - 190), city["sub"], font=font(28), fill=(110, 110, 110, 255))
    f_btn = font(26)
    labels = ["路 线", "分 享", "添加标签"]
    widths = [150, 150, 190]
    x = 64
    for lab, wd in zip(labels, widths):
        teal = lab == "路 线"
        rrect(d, [x, H - 118, x + wd, H - 62], 26,
              (46, 155, 214, 255) if teal else (235, 243, 248, 255))
        tw = d.textlength(lab, font=f_btn)
        d.text((x + (wd - tw) / 2, H - 108), lab, font=f_btn,
               fill=(255, 255, 255, 255) if teal else (46, 120, 170, 255))
        x += wd + 20
    return ov


def to_pil(f: np.ndarray) -> Image.Image:
    return Image.fromarray(f, "RGB")


def zoom_frame(img: Image.Image, z: float) -> Image.Image:
    if z >= 1.0:
        w2, h2 = int(W / z), int(H / z)
        x0, y0 = (W - w2) // 2, (H - h2) // 2
        return img.crop((x0, y0, x0 + w2, y0 + h2)).resize((W, H), Image.LANCZOS)
    # zoom out: replicate edge pixels outward (works on flat/gradient backdrops)
    a = np.asarray(img)
    px, py = int(W * (1 / z - 1) / 2) + 1, int(H * (1 / z - 1) / 2) + 1
    padded = np.pad(a, ((py, py), (px, px), (0, 0)), mode="edge")
    return Image.fromarray(padded).resize((W, H), Image.LANCZOS)


def hblur(img: Image.Image, radius: int) -> Image.Image:
    if radius <= 0:
        return img
    a = np.asarray(img).astype(np.float32)
    pad = np.pad(a, ((0, 0), (radius, radius), (0, 0)), mode="edge")
    c = np.cumsum(pad, axis=1)
    out = (c[:, 2 * radius:, :] - c[:, : -2 * radius, :]) / (2 * radius)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")


def main() -> int:
    croc = Image.open(ROOT / "assets/frames/croc_ref_916.png").convert("RGB").resize((W, H))
    sanya = decode(ROOT / "assets/i2v/seg_sanya.mp4")
    harbin = decode(ROOT / "assets/i2v/seg_harbin.mp4")
    ui_sanya, ui_harbin = map_ui(CITIES["sanya"]), map_ui(CITIES["harbin"])

    # ---- beat grid from BGM ----
    sr, y = load_mono(BGM)
    onsets = [t for t, s in detect_onsets(y, sr) if t > 6.0]
    # pick a base onset; events at +0/+8/+16/+24 beats (~0.3s each)
    base = onsets[0]
    b = [onsets[i] - base for i in (0, 8, 16, 24, 32)]
    e_pin, t_zoom, t_swipe, t_freeze = b[0] + 0.9, b[1] + 0.9, b[2] + 0.9, b[4] + 0.9
    bgm_start = base - 0.9
    total = t_freeze + FREEZE_D
    print(f"beats: pin={e_pin:.2f} zoom={t_zoom:.2f} swipe={t_swipe:.2f} freeze={t_freeze:.2f} total={total:.2f}")

    n_total = int(total * FPS)
    frames: list[np.ndarray] = []
    sanya_start = t_zoom + ZOOM_T
    swipe_start = t_swipe
    harbin_start = t_swipe + SWIPE_T

    for i in range(n_total):
        t = i / FPS
        if t < t_zoom:  # S1 intro: croc push-in (zoom-out start -> headroom for pin)
            z = 0.85 + 0.10 * (t / t_zoom)
            im = zoom_frame(croc, z).convert("RGBA")
            if t >= e_pin:
                dt = t - e_pin
                # drop with two bounces, 0.5s settle
                target_y = 20
                if dt < 0.35:
                    p = dt / 0.35
                    yy = -140 + (target_y + 140) * (1 - (1 - p) ** 3)
                elif dt < 0.5:
                    p = (dt - 0.35) / 0.15
                    yy = target_y - 34 * (1 - p) * (1 - p)
                else:
                    yy = target_y
                im.alpha_composite(PIN, (W // 2 - PIN.width // 2, int(yy)))
        elif t < sanya_start:  # zoom-blur into Sanya
            p = (t - t_zoom) / ZOOM_T
            a = zoom_frame(croc, 0.95 + 1.03 * p)
            bb = zoom_frame(to_pil(sanya[0]), 1.98 - 0.9 * p)
            a = a.filter(ImageFilter.GaussianBlur(6 + 10 * p))
            bb = bb.filter(ImageFilter.GaussianBlur(16 - 10 * p))
            im = Image.blend(a.convert("RGBA"), bb.convert("RGBA"), min(1.0, p * 1.2))
        elif t < swipe_start:  # Sanya with UI
            k = min(int((t - sanya_start) * FPS), len(sanya) - 1)
            im = to_pil(sanya[k]).convert("RGBA")
            im.alpha_composite(ui_sanya)
        elif t < harbin_start:  # horizontal swipe Sanya -> Harbin
            p = (t - swipe_start) / SWIPE_T
            e = p * p * (3 - 2 * p)  # smoothstep
            ks = min(int((sanya_start + (1 - p) * 0.1) * FPS) , len(sanya) - 1)
            a = to_pil(sanya[-1]).resize((W, H))
            bb = to_pil(harbin[0]).resize((W, H))
            canvas_a = Image.new("RGB", (W * 2, H), (0, 0, 0))
            canvas_a.paste(a, (0, 0))
            canvas_a.paste(bb, (W, 0))
            off = int(W * e)
            im = canvas_a.crop((off, 0, off + W, H))
            im = hblur(im, int(24 * (1 - abs(2 * e - 1))))
            im = im.convert("RGBA")
            # bottom card slides with the swipe: crossfade UI
            im.alpha_composite(ui_sanya, (0, 0))
            if e > 0.5:
                im2 = im.copy()
                im2.alpha_composite(ui_harbin)
                im = Image.blend(im, im2, (e - 0.5) * 2)
        elif t < t_freeze:  # Harbin with UI (speech lives in video audio)
            k = min(int((t - harbin_start) * FPS), len(harbin) - 1)
            im = to_pil(harbin[k]).convert("RGBA")
            im.alpha_composite(ui_harbin)
        else:  # freeze ending: push + white flash head
            dt = t - t_freeze
            im = zoom_frame(to_pil(harbin[-1]), 1.0 + 0.08 * dt).convert("RGBA")
            im.alpha_composite(ui_harbin)
            if dt < 0.1:
                flash = Image.new("RGBA", (W, H), (255, 255, 255, int(220 * (1 - dt / 0.1))))
                im.alpha_composite(flash)
        frames.append(np.asarray(im.convert("RGB")))

    # ---- audio: BGM slice + speech from harbin video + shutter click ----
    n_audio = int(total * sr)
    sr2, bgm = load_mono(BGM)
    bgm_seg = bgm[int(bgm_start * sr2): int(bgm_start * sr2) + n_audio]
    if len(bgm_seg) < n_audio:
        bgm_seg = np.pad(bgm_seg, (0, n_audio - len(bgm_seg)))
    mix = bgm_seg * 0.9
    # harbin speech: extract audio from video, place at harbin_start, duck BGM
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(ROOT / "assets/i2v/seg_harbin.mp4"),
         "-f", "f32le", "-ac", "1", "-ar", "44100", "-"],
        capture_output=True, check=True).stdout
    speech = np.frombuffer(raw, dtype=np.float32)
    sp0 = int(harbin_start * sr2)
    n_sp = min(len(speech), n_audio - sp0)
    mix[sp0: sp0 + n_sp] = mix[sp0: sp0 + n_sp] * 0.25 + speech[:n_sp] * 1.2
    # shutter click at freeze (promo-cut recipe)
    t_sh = int(t_freeze * sr2)
    click = np.zeros(int(0.12 * sr2), dtype=np.float32)
    click[: int(0.02 * sr2)] = np.random.default_rng(7).uniform(-1, 1, int(0.02 * sr2)) * 0.8
    ring = np.sin(2 * np.pi * 2000 * np.arange(int(0.1 * sr2)) / sr2) * np.exp(-np.arange(int(0.1 * sr2)) / (0.02 * sr2))
    click[int(0.02 * sr2):] += ring.astype(np.float32) * 0.5
    n_c = min(len(click), n_audio - t_sh)
    mix[t_sh: t_sh + n_c] += click[:n_c]
    # normalize to 0.85 then limit (promo-cut lesson)
    mix = mix / max(1e-6, np.abs(mix).max()) * 0.85
    peak = np.abs(mix).max()
    if peak > 0.95:
        mix *= 0.95 / peak
    TMP.mkdir(parents=True, exist_ok=True)
    audio_wav = TMP / "mix.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", "44100",
                    "-ac", "1", "-i", "-", str(audio_wav)],
                   input=mix.astype(np.float32).tobytes(), check=True)

    encode(frames, audio_wav, OUT)
    print(f"wrote {OUT} ({len(frames)} frames)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
