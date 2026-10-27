#!/usr/bin/env python3
"""A4 并排对照片：3D 底稿（craft3d_full_v2）vs cel-cinema 成片（art_pass_full）同秒抽帧横拼。

用法：
  python make_a4_comparison.py --ep <episode_dir> [--pairs 39:m05,158:m21,370:m49,466:m63]
输出 storyboard/a4/compare/compare_<shot>.png（左=3D 底稿，右=cel-cinema，含标签）。
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT = "C:/Windows/Fonts/msyh.ttc"


def grab(video: Path, t: float, out: Path) -> None:
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(t), "-i", str(video),
                        "-frames:v", "1", "-q:v", "2", str(out)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg {video}@{t}: {r.stderr[-300:]}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ep", type=Path, required=True)
    ap.add_argument("--left", default="output/craft3d_full_v2.mp4")
    ap.add_argument("--right", default="output/art_pass_full.mp4")
    ap.add_argument("--pairs", default="39:m05,158:m21,370:m49,466:m63")
    ap.add_argument("--out", default="storyboard/a4/compare")
    args = ap.parse_args()
    ep = args.ep.resolve()
    outdir = ep / args.out
    outdir.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype(FONT, 28)
    for pair in args.pairs.split(","):
        t_s, shot = pair.split(":")
        t = float(t_s)
        with tempfile.TemporaryDirectory() as td:
            lp, rp = Path(td) / "l.jpg", Path(td) / "r.jpg"
            grab(ep / args.left, t, lp)
            grab(ep / args.right, t, rp)
            li, ri = Image.open(lp).convert("RGB"), Image.open(rp).convert("RGB")
        bar = 44
        canvas = Image.new("RGB", (li.width + ri.width, li.height + bar), (18, 18, 24))
        canvas.paste(li, (0, bar))
        canvas.paste(ri, (li.width, bar))
        d = ImageDraw.Draw(canvas)
        d.text((16, 8), f"3D 底稿 craft3d_full_v2  {shot} t={t}s", font=font, fill=(220, 220, 230))
        d.text((li.width + 16, 8), f"cel-cinema art_pass_full  {shot} t={t}s", font=font, fill=(220, 220, 230))
        out = outdir / f"compare_{shot}_t{t:g}s.png"
        canvas.save(out)
        print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
