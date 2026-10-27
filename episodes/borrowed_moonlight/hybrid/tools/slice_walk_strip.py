#!/usr/bin/env python3
"""把宫格走拍相位条裁成等格 cel，并输出逐格 alpha bbox 信息。

用法：
  python slice_walk_strip.py <strip.png> --cols 4 --rows 2 --prefix eileen_walk --outdir .
幂等：产物已存在则跳过（除非 --overwrite）。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("strip", type=Path)
    ap.add_argument("--cols", type=int, required=True)
    ap.add_argument("--rows", type=int, required=True)
    ap.add_argument("--prefix", required=True)
    ap.add_argument("--outdir", type=Path, default=None)
    ap.add_argument("--overwrite", action="store_true")
    args = ap.parse_args()

    im = Image.open(args.strip).convert("RGBA")
    W, H = im.size
    cw, ch = W // args.cols, H // args.rows
    outdir = args.outdir or args.strip.parent
    outdir.mkdir(parents=True, exist_ok=True)
    info = {"strip": str(args.strip), "cols": args.cols, "rows": args.rows,
            "cell": [cw, ch], "cells": []}
    n = args.cols * args.rows
    for i in range(n):
        col, row = i % args.cols, i // args.cols
        cell = im.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
        a = np.array(cell)[..., 3]
        ys, xs = np.where(a > 10)
        bbox = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else None
        out = outdir / f"{args.prefix}_p{i + 1}.png"
        if out.exists() and not args.overwrite:
            print(f"skip {out.name}")
        else:
            cell.save(out)
            print(f"OK {out.name} bbox={bbox} fill={round(100 * (a > 10).mean(), 1)}%")
        info["cells"].append({"file": out.name, "alpha_bbox": bbox})
    (outdir / f"{args.prefix}_cells.json").write_text(
        json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
