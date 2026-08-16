#!/usr/bin/env python3
"""qwen-image-edit based local edit: better identity preservation than
wanx2.1-imageedit for our anime characters.

Two modes:
  --full-frame   : edit the whole image (for alternate-pose frames like the
                   nuzzle); output is the model's re-render saved as-is.
  --eye-region   : crop a generous region around the eyes, edit with a
                   composition-locked prompt, paste back ONLY the eye
                   ellipses (feathered) onto the pristine base.

Usage:
  qwen_edit.py BASE OUT --full-frame --prompt "..."
  qwen_edit.py BASE OUT --crop X Y W H --ellipse X Y W H [--ellipse ...] --prompt "..."
"""

from __future__ import annotations

import argparse
import base64
import os
import urllib.request
from pathlib import Path

import dashscope
from dashscope import MultiModalConversation
from PIL import Image, ImageDraw, ImageFilter

EPISODE = Path(__file__).resolve().parents[1]
WORKDIR = EPISODE / "tmp" / "qwen_edits"


def qwen_edit(image: Image.Image, prompt: str, stem: str) -> Image.Image:
    WORKDIR.mkdir(parents=True, exist_ok=True)
    src = WORKDIR / f"{stem}_in.png"
    image.save(src)
    b64 = base64.b64encode(src.read_bytes()).decode()
    rsp = MultiModalConversation.call(
        model="qwen-image-edit",
        messages=[{"role": "user", "content": [
            {"image": f"data:image/png;base64,{b64}"},
            {"text": prompt}]}],
    )
    if rsp.status_code != 200:
        raise SystemExit(f"qwen-image-edit failed: {rsp.code} {rsp.message}")
    url = rsp.output.choices[0].message.content[0]["image"]
    out_path = WORKDIR / f"{stem}_out.png"
    urllib.request.urlretrieve(url, out_path)
    return Image.open(out_path).convert("RGB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("base")
    ap.add_argument("out")
    ap.add_argument("--full-frame", action="store_true")
    ap.add_argument("--crop", type=int, nargs=4)
    ap.add_argument("--ellipse", type=int, nargs=4, action="append")
    ap.add_argument("--prompt", required=True)
    args = ap.parse_args()

    dashscope.api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not dashscope.api_key:
        raise SystemExit("DASHSCOPE_API_KEY not set")

    base = Image.open(args.base).convert("RGB")
    stem = Path(args.out).stem

    if args.full_frame:
        edited = qwen_edit(base, args.prompt, stem)
        edited = edited.resize(base.size, Image.LANCZOS)
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        edited.save(args.out)
        print(f"OK {stem} (full-frame)")
        return

    cx, cy, cw, ch = args.crop
    crop = base.crop((cx, cy, cx + cw, cy + ch))
    edited = qwen_edit(crop, args.prompt, stem)
    edited = edited.resize(crop.size, Image.LANCZOS)

    # paste back only the eye ellipses (feathered)
    out = base.copy()
    for ex, ey, ew, eh in args.ellipse:
        region = edited.crop((ex - cx, ey - cy, ex - cx + ew, ey - cy + eh))
        mask = Image.new("L", (ew, eh), 0)
        d = ImageDraw.Draw(mask)
        d.ellipse([3, 3, ew - 3, eh - 3], fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(5))
        out.paste(region, (ex, ey), mask)

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    out.save(args.out)
    import numpy as np
    b = np.asarray(base, dtype=np.int16)
    v = np.asarray(out, dtype=np.int16)
    d2 = np.abs(v - b).sum(axis=2)
    ys, xs = (d2 > 30).nonzero()
    print(f"OK {stem}: diffpx={len(xs)} bbox=({xs.min()},{ys.min()})-({xs.max()},{ys.max()})")


if __name__ == "__main__":
    main()
