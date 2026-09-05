#!/usr/bin/env python3
"""Local feature edit via DashScope wanx2.1-imageedit (description_edit_with_mask).

Replacement for the codex crop-edit path: crop the feature region from the
base frame, upscale to the API's >=512px requirement, send with an elliptical
mask over the feature, then paste ONLY the masked area back onto the base
(dilated + feathered). Locality is enforced twice: by the API mask and by the
paste mask.

Usage:
  wanx_crop_edit.py BASE OUT --crop X Y W H --ellipse X Y W H [--ellipse ...] \
      --prompt "..." [--scale 3]

Coordinates are in native base-image pixels; ellipses mark the feature(s) to
edit and are also used as the paste-back region.
"""

from __future__ import annotations

import argparse
import base64
import os
import urllib.request
from pathlib import Path

import dashscope
from dashscope import ImageSynthesis
from PIL import Image, ImageDraw, ImageFilter

EPISODE = Path(__file__).resolve().parents[1]
WORKDIR = EPISODE / "tmp" / "wanx_edits"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("base")
    ap.add_argument("out")
    ap.add_argument("--crop", type=int, nargs=4, required=True)
    ap.add_argument("--ellipse", type=int, nargs=4, action="append", required=True)
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--scale", type=float, default=3.0)
    args = ap.parse_args()

    dashscope.api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not dashscope.api_key:
        raise SystemExit("DASHSCOPE_API_KEY not set")

    WORKDIR.mkdir(parents=True, exist_ok=True)
    base = Image.open(args.base).convert("RGB")
    cx, cy, cw, ch = args.crop
    crop = base.crop((cx, cy, cx + cw, cy + ch))
    scale = args.scale
    while crop.size[1] * scale < 512:
        scale += 1.0
    big = crop.resize((int(cw * scale), int(ch * scale)), Image.LANCZOS)
    stem = Path(args.out).stem
    big_path = WORKDIR / f"{stem}_crop.png"
    big.save(big_path)

    mask = Image.new("L", big.size, 0)
    d = ImageDraw.Draw(mask)
    for ex, ey, ew, eh in args.ellipse:
        d.ellipse([int((ex - cx) * scale), int((ey - cy) * scale),
                   int((ex - cx + ew) * scale), int((ey - cy + eh) * scale)], fill=255)
    mask_path = WORKDIR / f"{stem}_mask.png"
    mask.save(mask_path)

    def b64(p: Path) -> str:
        return base64.b64encode(p.read_bytes()).decode()

    rsp = ImageSynthesis.call(
        model="wanx2.1-imageedit",
        function="description_edit_with_mask",
        prompt=args.prompt,
        base_image_url=f"data:image/png;base64,{b64(big_path)}",
        mask_image_url=f"data:image/png;base64,{b64(mask_path)}",
        n=1,
    )
    out_info = rsp.output
    if rsp.status_code != 200 or out_info.get("task_status") != "SUCCEEDED":
        raise SystemExit(f"wanx edit failed: {out_info.get('message')}")
    url = out_info["results"][0]["url"]
    edited_path = WORKDIR / f"{stem}_edited.png"
    urllib.request.urlretrieve(url, edited_path)

    edited = Image.open(edited_path).convert("RGB").resize(big.size, Image.LANCZOS)
    small = edited.resize(crop.size, Image.LANCZOS)

    # paste back only the (dilated, feathered) mask area
    paste_mask = mask.filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(6))
    paste_mask = paste_mask.resize(crop.size, Image.LANCZOS)
    out = base.copy()
    out.paste(small, (cx, cy), paste_mask)
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
