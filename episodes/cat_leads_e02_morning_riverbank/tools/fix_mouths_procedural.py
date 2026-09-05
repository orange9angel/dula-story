#!/usr/bin/env python3
"""Procedural flat-color mouth cels for E02's girl dialogue frames.

V1/V2 failure: qwen-image-edit draws shout-scale open mouths that read as a
black hole on the face. In the sunprint flat style a mouth interior IS a flat
dark shape, so we draw it directly: palette sampled from the codex-made
frame_01 variants (interior #5D120A, tongue #DC674B, outline #3D0101),
supersampled 4x for clean edges. Output overwrites the qwen *_locked_v2.png
files so rig configs stay unchanged.

Mouth positions measured at native resolution (see generation_prompts.md).
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

EP = Path(__file__).resolve().parents[1]
A = EP / "assets"

INTERIOR = (93, 18, 10)      # #5D120A
OUTLINE = (61, 1, 1)         # #3D0101
TONGUE = (220, 103, 75)      # #DC674B
SS = 4  # supersample factor

# base -> (cx, cy, w) of the closed mouth line, native px (measured)
MOUTHS = {
    "frame_03": (1137, 186, 22),
    "frame_06": (836, 185, 20),
    "frame_11": (755, 294, 26),
    "frame_16": (697, 412, 20),
}
OPEN_H = 15
HALF_H = 7


def skin_color(img: Image.Image, cx: int, cy: int) -> tuple[int, int, int]:
    """Median skin tone just above the mouth."""
    import numpy as np
    patch = np.asarray(img.crop((cx - 8, cy - 22, cx + 8, cy - 12))).reshape(-1, 3)
    return tuple(int(v) for v in np.median(patch, axis=0))


def draw_mouth(base: Image.Image, cx: int, cy: int, w: int, h: int, tongue: bool) -> Image.Image:
    big = base.resize((base.width * SS, base.height * SS), Image.LANCZOS)
    d = ImageDraw.Draw(big)
    skin = skin_color(base, cx, cy)
    # 1. erase the closed smile line with a soft skin patch
    d.ellipse([(cx - w / 2 - 4) * SS, (cy - 6) * SS, (cx + w / 2 + 4) * SS, (cy + 8) * SS],
              fill=skin)
    # 2. interior
    x0, y0 = (cx - w / 2) * SS, (cy - h / 2 + 2) * SS
    x1, y1 = (cx + w / 2) * SS, (cy + h / 2 + 2) * SS
    d.ellipse([x0, y0, x1, y1], fill=INTERIOR, outline=OUTLINE, width=SS)
    # 3. tongue in the lower half (open state only)
    if tongue:
        tw, th = w * 0.62, h * 0.5
        d.ellipse([(cx - tw / 2) * SS, (cy + 2 + h / 2 - th * 0.9) * SS,
                   (cx + tw / 2) * SS, (cy + 2 + h / 2 + th * 0.35) * SS],
                  fill=TONGUE)
        # re-cover the tongue's top edge overflow with interior color
        d.chord([(cx - tw / 2) * SS, (cy + 2) * SS - th * 0.2 * SS,
                 (cx + tw / 2) * SS, (cy + 2 + h / 2) * SS], 180, 360, fill=INTERIOR)
    out = big.resize(base.size, Image.LANCZOS)
    return out


def main() -> None:
    for base_name, (cx, cy, w) in MOUTHS.items():
        base = Image.open(A / "keyframes" / f"{base_name}.png").convert("RGB")
        for variant, h, tongue in (("half", HALF_H, False), ("open", OPEN_H, True)):
            out = draw_mouth(base, cx, cy, w, h, tongue)
            out_path = A / "mouth_variants" / f"{base_name}_{variant}_locked_v2.png"
            out.save(out_path)
            print(f"OK {base_name}_{variant}_locked_v2.png")
    print("done")


if __name__ == "__main__":
    main()
