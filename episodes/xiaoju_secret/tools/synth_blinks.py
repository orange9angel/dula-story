#!/usr/bin/env python3
"""Procedural blink synthesis for xiaoju_secret (no imagegen quota needed).

Closes eyes by covering the eye area with adjacent skin/fur texture sampled
from the SAME frame (so tone/grain match), keeping or redrawing a thin lash
line. Proven acceptable for the 0.13 s blink duration (frame_09 shipped this).

Per-target config: eye ellipses + texture source + optional lash arc.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

EPISODE = Path(__file__).resolve().parents[1]


def cover(base: Image.Image, eye_rect, tex_src, out: Image.Image,
          feather=9, expand=1.0):
    """Paste texture from tex_src over eye_rect with an elliptical mask."""
    x, y, w, h = eye_rect
    sx, sy, sw, sh = tex_src
    tex = base.crop((sx, sy, sx + sw, sy + sh)).resize((w, h), Image.LANCZOS)
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    m = int(min(w, h) * (1 - expand) / 2) if expand < 1 else 0
    d.ellipse([4 + m, 4 + m, w - 4 - m, h - 4 - m], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    out.paste(tex, (x, y), mask)


def lash(out: Image.Image, cx0, cx1, y_mid, bow, width, color):
    """Draw a closed-lash arc bowed downward at the ends (higher in middle)."""
    d = ImageDraw.Draw(out)
    n = 24
    pts = []
    for i in range(n + 1):
        t = i / n
        x = cx0 + (cx1 - cx0) * t
        y = y_mid - bow * (1 - (2 * t - 1) ** 2)  # middle up, ends down
        pts.append((x, y))
    d.line(pts, fill=color, width=width, joint="curve")


def main() -> None:
    # ---- frame_26: close the remaining open (image-right) eye of the girl ----
    p = EPISODE / "assets/eye_variants/frame_26_eyes_closed_locked_v1.png"
    base = Image.open(EPISODE / "assets/keyframes/frame_26.png").convert("RGB")
    out = Image.open(p).convert("RGB")
    # open eye approx x 965-1030, y 212-262 (measured on full-size image)
    cover(out, (960, 208, 75, 62), (960, 278, 75, 62), out, feather=7)
    lash(out, 966, 1028, 234, 7, 4, (48, 30, 24))
    out.save(p)
    print("frame_26 second eye closed")

    # ---- frame_03: cat blink (door mat shot, 10 s) ----
    base3 = Image.open(EPISODE / "assets/keyframes/frame_03.png").convert("RGB")
    out3 = base3.copy()
    # eyes measured on full-size: left (675-730, 295-335), right (790-840, 285-325)
    # texture = striped forehead fur directly above each eye
    cover(base3, (668, 291, 74, 50), (668, 246, 74, 45), out3, feather=7)
    cover(base3, (784, 281, 68, 50), (784, 238, 68, 43), out3, feather=7)
    out3.save(EPISODE / "assets/eye_variants/frame_03_eyes_closed_locked_v1.png")
    print("frame_03 cat blink synthesized")

    # ---- frame_17: cat blink (wall look-back shot, 54 s) ----
    base17 = Image.open(EPISODE / "assets/keyframes/frame_17.png").convert("RGB")
    out17 = base17.copy()
    # eyes measured on full-size: left (635-685, 140-175), right (715-765, 135-170)
    # texture = rim-lit cheek fur left of the face (whisker-free)
    cover(base17, (631, 136, 62, 44), (572, 140, 62, 44), out17, feather=6)
    cover(base17, (709, 131, 64, 44), (572, 140, 64, 44), out17, feather=6)
    out17.save(EPISODE / "assets/eye_variants/frame_17_eyes_closed_locked_v1.png")
    print("frame_17 cat blink synthesized")


if __name__ == "__main__":
    main()
