#!/usr/bin/env python3
"""R3 原画入片前处理与一致性门：
  1. alpha 清理（硬核 alpha>96 连通域，保 ≥最大域 2% 的组件，膨胀回收软边）→ 裁到人物外框；转圈宫格切成单格
  2. 元数据：外框、脚底接触点（最下 3% 行的列簇）、头顶 y（取中间 40% 列的最高 alpha，避开举手）
  3. 身份门证据：每张画的头部原生裁区与身份锚头部并排（hybrid/r3/qa/identity_gate_<who>.png），由主代理目检
输出 hybrid/r3/clean/<key>.png + hybrid/r3/clean/meta.json。用法（剧集目录）：python tools/prep_r3_cels.py"""
import json
from pathlib import Path

import cv2
import numpy as np

EP = Path(__file__).resolve().parents[1]
SRC = EP / "hybrid/r3/cels"
OUT = EP / "hybrid/r3/clean"
QA = EP / "hybrid/r3/qa"
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)


def clean(im):
    a = im[..., 3]
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 96).astype(np.uint8))
    if n <= 1:
        return None
    big = st[1:, 4].max()
    keep = np.isin(lab, [j for j in range(1, n) if st[j, 4] >= 0.02 * big]).astype(np.uint8)
    keep = cv2.dilate(keep, np.ones((9, 9), np.uint8))
    im = im.copy()
    im[..., 3] = (a * keep).astype(np.uint8)
    im[..., 3][im[..., 3] < 40] = 0
    ys, xs = np.where(im[..., 3] > 0)
    return im[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def meta(im):
    a = im[..., 3] > 60
    h, w = a.shape
    rows = np.where(a.any(axis=1))[0]
    band = a[int(rows.max() - 0.03 * h):].any(axis=0)
    xs = np.where(band)[0]
    feet, s = [], xs[0]
    for p, q in zip(xs, xs[1:]):
        if q - p > 6:
            feet.append([int(s), int(p)])
            s = q
    feet.append([int(s), int(xs[-1])])
    mid = a[:, int(w * .3):int(w * .7)]
    head_top = int(np.where(mid.any(axis=1))[0].min())
    return dict(size=[w, h], feet=feet, head_top=head_top)


def cells_of(path):
    im = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if path.stem.startswith("noya_twirl"):
        H, W = im.shape[0] // 2, im.shape[1] // 2
        return [(f"{path.stem}_{i}", im[(i // 2) * H:(i // 2 + 1) * H, (i % 2) * W:(i % 2 + 1) * W]) for i in range(4)]
    return [(path.stem, im)]


def lab_stats(im):
    m = im[..., 3] > 200
    lab = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2LAB).astype(np.float32)[m]
    return lab.mean(0), lab.std(0) + 1e-3


ANCHOR_STATS = {w: lab_stats(cv2.imread(str(EP / f"hybrid/anchors/{w}_full.png"), cv2.IMREAD_UNCHANGED)) for w in ("noya", "selene")}


def match_anchor(im, who, strength=0.7):
    """单人画的人物像素 Lab 均值/方差对齐到该角色身份锚（R3 实测诺娅舞蹈画裙色比锚偏橙）。"""
    lab = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2LAB).astype(np.float32)
    mu, sd = lab_stats(im)
    rm, rs = ANCHOR_STATS[who]
    lab = lab + (((lab - mu) * (rs / sd) + rm) - lab) * strength
    out = im.copy()
    out[..., :3] = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
    return out


def main():
    md = {}
    heads = {"noya": [], "selene": []}
    for p in sorted(SRC.glob("*.png")):
        for key, im in cells_of(p):
            if im.shape[2] != 4:
                print("OPAQUE", key)
                continue
            c = clean(im)
            if c is None:
                print("EMPTY", key)
                continue
            if not key.startswith("pair"):
                c = match_anchor(c, key.split("_")[0])
            cv2.imwrite(str(OUT / f"{key}.png"), c)
            md[key] = meta(c)
            # 身份门：头部原生裁区（头顶下 ~13% 身高）
            whos = ["noya", "selene"] if key.startswith("pair") else [key.split("_")[0]]
            for i, who in enumerate(whos):
                sub = c if len(whos) == 1 else (c[:, :c.shape[1] // 2] if i == 0 else c[:, c.shape[1] // 2:])
                a = sub[..., 3] > 60
                r0 = np.where(a.any(axis=1))[0].min()
                hh = int(sub.shape[0] * 0.16)
                cols = np.where(a[r0:r0 + hh].any(axis=0))[0]
                cx = int(cols.mean())
                crop = sub[r0:r0 + hh, max(0, cx - hh // 2):cx + hh // 2]
                al = crop[..., 3:4] / 255.0
                flat = (crop[..., :3] * al + 128 * (1 - al)).astype(np.uint8)
                heads[who].append((key, cv2.resize(flat, (200, 200), interpolation=cv2.INTER_AREA)))
    (OUT / "meta.json").write_text(json.dumps(md, indent=1), encoding="utf-8")

    for who, lst in heads.items():
        anchor = cv2.imread(str(EP / f"hybrid/anchors/{who}_full.png"), cv2.IMREAD_UNCHANGED)
        a = anchor[..., 3] > 60
        r0 = np.where(a.any(axis=1))[0].min()
        hh = int((np.where(a.any(axis=1))[0].max() - r0) * 0.16)
        cols = np.where(a[r0:r0 + hh].any(axis=0))[0]
        cx = int(cols.mean())
        crop = anchor[r0:r0 + hh, cx - hh // 2:cx + hh // 2]
        al = crop[..., 3:4] / 255.0
        tiles = [("ANCHOR", cv2.resize((crop[..., :3] * al + 128 * (1 - al)).astype(np.uint8), (200, 200)))] + lst
        row = []
        for k, t in tiles:
            t = t.copy()
            cv2.putText(t, k[:22], (4, 14), 0, .4, (255, 255, 255), 1)
            row.append(t)
        if row:
            cv2.imwrite(str(QA / f"identity_gate_{who}.png"), np.hstack(row))
    print(json.dumps({k: v["size"] for k, v in md.items()}))


if __name__ == "__main__":
    main()
