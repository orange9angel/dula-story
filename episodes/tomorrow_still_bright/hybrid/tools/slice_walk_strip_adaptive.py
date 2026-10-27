#!/usr/bin/env python3
"""自适应宫格裁切：按每行/列带内的最小 alpha 质量沟槽切分，避免固定中线裁到越界肢体。

用法：
  python slice_walk_strip_adaptive.py <strip.png> --cols 2 --rows 2 \
      --prefix m07_walk --outdir . --cell 1024x1536
产物：每格居中放进 --cell 透明画布；写 <prefix>_cells.json（gutter 坐标+bbox）。
幂等：产物已存在则跳过（除非 --overwrite）。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


def gutter(score: np.ndarray, lo: int, hi: int, prefer: int) -> int:
    """在 [lo,hi] 内找分数最低、离 prefer 最近的位置。"""
    seg = score[lo:hi + 1]
    best_val, best_i = None, prefer
    for i, v in enumerate(seg):
        d = abs(lo + i - prefer)
        key = (v, d)
        if best_val is None or key < best_val:
            best_val, best_i = key, lo + i
    return best_i


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("strip", type=Path)
    ap.add_argument("--cols", type=int, required=True)
    ap.add_argument("--rows", type=int, required=True)
    ap.add_argument("--prefix", required=True)
    ap.add_argument("--outdir", type=Path, default=None)
    ap.add_argument("--cell", default="1024x1536")
    ap.add_argument("--overwrite", action="store_true")
    args = ap.parse_args()

    im = Image.open(args.strip).convert("RGBA")
    W, H = im.size
    a = np.array(im)[..., 3]
    mask = (a > 10).astype(np.uint32)
    cw, ch = (int(v) for v in args.cell.lower().split("x"))

    col_score = mask.sum(axis=0)  # 每列 alpha 质量
    row_score = mask.sum(axis=1)

    # 行沟槽（水平切分线）：全宽范围找低质量行
    ys = [0]
    for r in range(1, args.rows):
        ideal = H * r // args.rows
        ys.append(gutter(row_score, int(ideal - H * 0.15), int(ideal + H * 0.15), ideal))
    ys.append(H)
    # 列沟槽（竖直切分线）：每个行带内分别找
    cells = []
    for r in range(args.rows):
        y0, y1 = ys[r], ys[r + 1]
        band = mask[y0:y1]
        band_col = band.sum(axis=0)
        xs = [0]
        for c in range(1, args.cols):
            ideal = W * c // args.cols
            xs.append(gutter(band_col, int(ideal - W * 0.15), int(ideal + W * 0.15), ideal))
        xs.append(W)
        for c in range(args.cols):
            cells.append((xs[c], y0, xs[c + 1], y1))

    outdir = args.outdir or args.strip.parent
    outdir.mkdir(parents=True, exist_ok=True)
    info = {"strip": str(args.strip), "cell": [cw, ch], "cells": []}
    for i, (x0, y0, x1, y1) in enumerate(cells):
        crop = im.crop((x0, y0, x1, y1))
        ca = np.array(crop)[..., 3]
        ys2, xs2 = np.where(ca > 10)
        bbox = [int(xs2.min()), int(ys2.min()), int(xs2.max()), int(ys2.max())] if len(xs2) else None
        # 贴边检测：gutter 两侧是否仍有质量（说明越界被切）
        clipped = bool(bbox and (bbox[0] == 0 or bbox[2] == crop.size[0] - 1
                                 or bbox[1] == 0 or bbox[3] == crop.size[1] - 1))
        canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        if bbox:
            body = crop.crop((bbox[0], bbox[1], bbox[2] + 1, bbox[3] + 1))
            scale = min(cw * 0.94 / body.size[0], ch * 0.94 / body.size[1], 1.0)
            if scale < 1.0:
                body = body.resize((max(1, round(body.size[0] * scale)),
                                    max(1, round(body.size[1] * scale))), Image.LANCZOS)
            canvas.paste(body, ((cw - body.size[0]) // 2, (ch - body.size[1]) // 2), body)
        out = outdir / f"{args.prefix}_p{i + 1}.png"
        if out.exists() and not args.overwrite:
            print(f"skip {out.name}")
        else:
            canvas.save(out)
            print(f"OK {out.name} rect=({x0},{y0},{x1},{y1}) clipped={clipped}")
        info["cells"].append({"file": out.name, "rect": [x0, y0, x1, y1],
                              "alpha_bbox": bbox, "edge_clipped": clipped})
    (outdir / f"{args.prefix}_cells.json").write_text(
        json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
