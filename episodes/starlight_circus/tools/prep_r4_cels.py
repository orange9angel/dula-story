#!/usr/bin/env python3
"""R4 原画前处理：hybrid/r4/cels 的转圈宫格（twirl_a/b/c → 12 格）与 noya_open_mid 清理、对齐锚色、写元数据。
复用 prep_r3_cels 的 clean/meta/match_anchor；额外写 axis（头部 alpha 列中心，转圈按竖轴对齐而非脚底）
与 face（嘴眼裁区估计：头顶下 2%–15% 身高处 alpha 列中心）。输出 hybrid/r4/clean/<key>.png + meta.json，
以及转圈身份门 hybrid/r4/qa/twirl_strip.png（12 格按顺序原生缩放并排，主代理目检单向旋转与比例）。"""
import json
from pathlib import Path

import cv2
import numpy as np

from prep_r3_cels import ANCHOR_STATS, clean, lab_stats, match_anchor, meta

EP = Path(__file__).resolve().parents[1]
SRC, OUT, QA = EP / "hybrid/r4/cels", EP / "hybrid/r4/clean", EP / "hybrid/r4/qa"
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)


def axis_of(im):
    a = im[..., 3] > 60
    rows = np.where(a.any(axis=1))[0]
    h = rows.max() - rows.min()
    # 头部带：举起的手在最上方，跳过它取头顶下 8%–16% 的行（脸/头发）
    band = a[rows.min() + int(.08 * h):rows.min() + int(.16 * h)]
    cols = np.where(band.any(axis=0))[0]
    # 取该带里最宽连通段（头），而不是手臂
    segs, s = [], cols[0]
    for p, q in zip(cols, cols[1:]):
        if q - p > 3:
            segs.append((s, p))
            s = q
    segs.append((s, cols[-1]))
    l, r = max(segs, key=lambda z: z[1] - z[0])
    return int((l + r) / 2)


def head_top(im):
    """举手不算头顶：第一行在中间 60% 列内 alpha 宽度 > 14% 图宽的行。"""
    a = im[..., 3] > 60
    w = a.shape[1]
    mid = a[:, int(w * .2):int(w * .8)].sum(axis=1)
    return int(np.argmax(mid > .14 * w))


def shared_match(sheets, strength=0.7):
    """全部转圈宫格合并统计、一个 Lab 变换，逐格共用（逐格匹配会因背面斗篷多而闪色）。"""
    labs = [cv2.cvtColor(s[..., :3], cv2.COLOR_BGR2LAB).astype(np.float32)[s[..., 3] > 200] for s in sheets]
    allp = np.concatenate(labs)
    mu, sd = allp.mean(0), allp.std(0) + 1e-3
    rm, rs = ANCHOR_STATS["noya"]

    def apply(im):
        lab = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2LAB).astype(np.float32)
        lab = lab + (((lab - mu) * (rs / sd) + rm) - lab) * strength
        out = im.copy()
        out[..., :3] = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
        return out
    return apply


md = {}
cells = []
# 按宫格分别做色彩对齐：同一宫格内一个变换（逐格匹配会闪），不同宫格各自对齐到锚（R4b 的 twirl_d 裙色偏浅粉）
sheet_match = {p.stem: shared_match([cv2.imread(str(p), cv2.IMREAD_UNCHANGED)]) for p in sorted(SRC.glob("twirl_*.png"))}
def hand_tip(im):
    """举起的手尖：最上方 alpha 像素（转圈格里举手始终最高）。"""
    ys, xs = np.nonzero(im[..., 3] > 100)
    i = int(ys.argmin())
    return [int(xs[i]), int(ys[i])]


for p in sorted(SRC.glob("*.png")):
    if p.stem.startswith("_"):  # 姿势参考等辅助图
        continue
    im = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
    if p.stem.startswith("twirl_"):
        H, W = im.shape[0] // 2, im.shape[1] // 2
        parts = [(f"noya_{p.stem}{i + 1}", im[(i // 2) * H:(i // 2 + 1) * H, (i % 2) * W:(i % 2 + 1) * W]) for i in range(4)]
    else:
        parts = [(p.stem, im)]
    for key, c in parts:
        c = clean(c)
        if c is None:
            print("EMPTY", key)
            continue
        c = sheet_match[p.stem](c) if key.startswith("noya_twirl") else match_anchor(c, "noya")
        cv2.imwrite(str(OUT / f"{key}.png"), c)
        m = meta(c)
        m["axis"] = axis_of(c)
        m["head_top"] = head_top(c)
        m["hand"] = hand_tip(c)
        md[key] = m
        if key.startswith("noya_twirl"):
            cells.append((key, c))
# 镜像格：模型画 240-330° 时总把脸转回右侧（望向右侧舞伴），转圈来回扭。后半圈取 360-θ 的水平镜像，
# 镜像件存为独立原画（嘴型在它自己的裁区做），元数据按镜像重算。
MIRROR = {"noya_twirl_mb2": "noya_twirl_b2", "noya_twirl_mb1": "noya_twirl_b1", "noya_twirl_ma4": "noya_twirl_a4",
          "noya_twirl_ma3": "noya_twirl_a3", "noya_twirl_ma2": "noya_twirl_a2"}
for mk, src in MIRROR.items():
    if src in md:
        c = cv2.flip(cv2.imread(str(OUT / f"{src}.png"), cv2.IMREAD_UNCHANGED), 1)
        cv2.imwrite(str(OUT / f"{mk}.png"), c)
        m = meta(c)
        m["axis"] = axis_of(c)
        m["head_top"] = head_top(c)
        m["mirrorOf"] = src
        m["hand"] = hand_tip(c)
        md[mk] = m
        cells.append((mk, c))
tw = [k for k in md if k.startswith("noya_twirl")]
# 按宫格共用比例：同一宫格画法同尺度（逐格按身高缩放会忽大忽小）；宫格之间尺度不同（实测身体 a≈650/b≈605/d≈460px），
# 共用一个全局比例会让人物转到后半圈缩小 30%。镜像格继承其源格所在宫格。
sheet_of = lambda k: (md[k].get("mirrorOf") or k)[len("noya_twirl_")]
for sh in {sheet_of(k) for k in tw}:
    ks = [k for k in tw if sheet_of(k) == sh and "mirrorOf" not in md[k]]
    ref = float(np.median([md[k]["size"][1] - md[k]["head_top"] for k in ks]))
    for k in tw:
        if sheet_of(k) == sh:
            md[k]["scaleRef"] = ref
(OUT / "meta.json").write_text(json.dumps(md, indent=1), encoding="utf-8")
tiles = []
for key, c in sorted(cells):
    s = 420 / c.shape[0]
    t = cv2.resize(c, (int(c.shape[1] * s), 420), interpolation=cv2.INTER_AREA)
    a = t[..., 3:] / 255.
    t = (t[..., :3] * a + 215 * (1 - a)).astype(np.uint8)
    ax = int(md[key]["axis"] * s)
    cv2.line(t, (ax, 0), (ax, 419), (0, 0, 255), 1)
    t = cv2.copyMakeBorder(t, 18, 0, 2, 2, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    cv2.putText(t, key[10:], (3, 13), 0, .42, (0, 0, 0), 1)
    tiles.append(t)
if tiles:
    hmax = max(t.shape[0] for t in tiles)
    cv2.imwrite(str(QA / "twirl_strip.png"), np.hstack([cv2.copyMakeBorder(t, 0, hmax - t.shape[0], 0, 0, cv2.BORDER_CONSTANT, value=(255, 255, 255)) for t in tiles]))
print(json.dumps({k: [v["size"], v["axis"]] for k, v in md.items()}))
