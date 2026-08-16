#!/usr/bin/env python3
"""Crop-forced local variant edit via codex imagegen.

Whole-image "local edit" prompts drift (the model re-renders everything).
This tool crops the feature rect out of the base frame, sends ONLY the crop
to codex (optionally upscaled), then feather-pastes the edited crop back onto
the base. Locality is guaranteed by construction; a post-paste verification
prints the diff bbox for review.

Usage:
  variant_crop_edit.py BASE RECT_X RECT_Y RECT_W RECT_H PROMPT OUT [--scale 2]

The codex session id is parsed from its stdout and the newest call_*.png /
exec-*.png is salvaged from ~/.codex/generated_images/<session-id>/ (same
strategy as the gen_*.sh lanes).
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

EPISODE = Path(__file__).resolve().parents[1]
WORKDIR = EPISODE / "tmp" / "crop_edits"
GEN_ROOT = Path.home() / ".codex" / "generated_images"


def feather_paste(base: Image.Image, patch: Image.Image, rect: tuple[int, int, int, int], feather: float = 8.0) -> Image.Image:
    x, y, w, h = rect
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    inset = max(2, int(feather * 1.25))
    radius = int(min(w, h) * 0.18)
    draw.rounded_rectangle([inset, inset, w - inset, h - inset], radius=radius, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    out = base.copy()
    out.paste(patch, (x, y), mask)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("base")
    ap.add_argument("rx", type=int)
    ap.add_argument("ry", type=int)
    ap.add_argument("rw", type=int)
    ap.add_argument("rh", type=int)
    ap.add_argument("prompt")
    ap.add_argument("out")
    ap.add_argument("--scale", type=float, default=2.0)
    args = ap.parse_args()

    WORKDIR.mkdir(parents=True, exist_ok=True)
    base_path = Path(args.base)
    out_path = Path(args.out)
    rect = (args.rx, args.ry, args.rw, args.rh)

    base = Image.open(base_path).convert("RGB")
    crop = base.crop((rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]))
    if args.scale != 1.0:
        edit_size = (int(crop.size[0] * args.scale), int(crop.size[1] * args.scale))
    else:
        edit_size = crop.size
    crop_big = crop.resize(edit_size, Image.LANCZOS) if edit_size != crop.size else crop
    stem = out_path.stem
    crop_path = WORKDIR / f"{stem}_crop.png"
    crop_big.save(crop_path)

    prompt = (f"{args.prompt}。输出与输入完全相同的尺寸（{edit_size[0]}x{edit_size[1]}）PNG。"
              f"只调用 imagegen 生成图片即可，不要执行任何 shell/PowerShell 后处理或文件操作")
    log_path = WORKDIR / f"{stem}.log"
    with open(log_path, "w", encoding="utf-8", errors="replace") as log:
        cmd = ["codex", "exec", prompt, "--skip-git-repo-check", "--ephemeral",
               "-s", "workspace-write", "-i", str(crop_path)]
        subprocess.run(
            cmd if os.name != "nt" else subprocess.list2cmdline(cmd),
            shell=os.name == "nt",
            stdout=log, stderr=subprocess.STDOUT, cwd=EPISODE, timeout=1800,
        )
    text = log_path.read_text(encoding="utf-8", errors="replace")
    match = re.search(r"session id: (\S+)", text)
    salvaged = None
    if match:
        session_dir = GEN_ROOT / match.group(1)
        if session_dir.is_dir():
            candidates = sorted(
                list(session_dir.glob("call_*.png")) + list(session_dir.glob("exec-*.png")),
                key=lambda p: p.stat().st_mtime, reverse=True)
            if candidates:
                salvaged = candidates[0]
    if not salvaged:
        print(f"MISSING {stem}: no generated image salvaged (see {log_path})")
        sys.exit(1)

    edited = Image.open(salvaged).convert("RGB")
    if edited.size != edit_size:
        dw = edit_size[0] - edited.size[0]
        dh = edit_size[1] - edited.size[1]
        if 0 <= dw <= 2 and 0 <= dh <= 2:
            padded = Image.new("RGB", edit_size)
            padded.paste(edited, (0, 0))
            edited = padded
        else:
            edited = edited.resize(edit_size, Image.LANCZOS)
    if edit_size != crop.size:
        edited = edited.resize(crop.size, Image.LANCZOS)

    result = feather_paste(base, edited, rect)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(out_path)

    # verify the paste changed something and nothing outside rect+feather moved
    import numpy as np
    b = np.asarray(base, dtype=np.int16)
    r = np.asarray(result, dtype=np.int16)
    d = np.abs(r - b).sum(axis=2)
    ys, xs = (d > 30).nonzero()
    if len(xs) == 0:
        print(f"WARNING {stem}: paste produced no visible change (codex echoed the crop?)")
    else:
        print(f"OK {stem}: diffpx={len(xs)} bbox=({xs.min()},{ys.min()})-({xs.max()},{ys.max()}) rect={rect}")


if __name__ == "__main__":
    main()
