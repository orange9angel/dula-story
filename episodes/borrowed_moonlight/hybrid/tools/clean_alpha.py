#!/usr/bin/env python3
"""透明 PNG 杂点清理：删除与主体不连通的小 alpha 孤岛 + 极低 alpha 噪点。

做法：alpha>10 的连通域（8 邻接），面积 < --min-area（默认 24px）的孤岛置全透明；
alpha<=10 的像素直接清零（半透明薄雾边保留）。输出覆盖原文件（先备份到 _preclean/）。

用法：
  python clean_alpha.py file1.png [file2.png ...] [--min-area 24] [--dry-run]
"""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage  # type: ignore


def clean(path: Path, min_area: int, dry: bool) -> str:
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    alpha = a[..., 3]
    solid = alpha > 10
    lab, n = ndimage.label(solid, structure=np.ones((3, 3)))
    removed = 0
    if n > 1:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        for i, s in enumerate(sizes, start=1):
            if s < min_area:
                removed += int(s)
                a[..., 3][lab == i] = 0
    haze = int((alpha <= 10).sum())
    a[..., 3][alpha <= 10] = 0
    if not dry:
        bak = path.parent / "_preclean"
        bak.mkdir(exist_ok=True)
        if not (bak / path.name).exists():
            shutil.copyfile(path, bak / path.name)
        Image.fromarray(a).save(path)
    return f"{path.name}: islands_removed_px={removed} haze_zeroed_px={haze}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--min-area", type=int, default=24)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    for f in args.files:
        print(clean(f, args.min_area, args.dry_run))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
