#!/usr/bin/env python3
"""R4c 全景嘴型锁回（借月光的少女同法：每个嘴形 = 与原画同尺寸、仅嘴区不同的锁回图）。
图集编辑格被 codex 整格重渲染，嘴区周围皮肤与原画色差 ΔE 5–58（用户：「看起来是文生图做的」）。这里对每个变体：
  1. sourceAffine 把编辑格映回原画坐标；
  2. 用嘴核外圈（pad 环）上 编辑→原画 的逐通道 Lab 线性拟合做局部色彩迁移（只校色，不动形状）；
  3. 嘴核内全不透明、外圈 smoothstep 羽化合成到原画 → hybrid/r4/mouths/<key>__<state>.png；
  4. 报告校色前后外圈 ΔE（门：< 3）与核外零泄漏。
重写 config/face_rigs_r4.json 为锁回形式（variants[].src 指锁回图，无 sourceAffine）。"""
import json
import os
from pathlib import Path

import cv2
import numpy as np

EP = Path(__file__).resolve().parents[1]
OUT = EP / "hybrid/r4/mouths"
OUT.mkdir(parents=True, exist_ok=True)
rigs_path = EP / "config/face_rigs_r4.json"
R = json.loads(rigs_path.read_text(encoding="utf-8"))
src_of = lambda k: EP / ("hybrid/r4/clean" if (EP / f"hybrid/r4/clean/{k}.png").exists() else "hybrid/r3/clean") / f"{k}.png"
report = {}
for key, rig in R["rigs"].items():
    base = cv2.imread(str(src_of(key)), cv2.IMREAD_UNCHANGED)
    H, W = base.shape[:2]
    bl = cv2.cvtColor(base[..., :3], cv2.COLOR_BGR2LAB).astype(np.float32)
    new = {}
    for st, v in rig["variants"].items():
        if "sourceAffine" not in v:  # 已是锁回形式
            new[st] = v
            continue
        ed = cv2.imread(str(EP / "hybrid" / v["src"]), cv2.IMREAD_UNCHANGED)
        A = np.array(v["sourceAffine"], np.float64)
        A[:, 0] /= ed.shape[1] / v["sourceSize"][0]
        A[:, 1] /= ed.shape[0] / v["sourceSize"][1]
        w = cv2.warpAffine(ed, A, (W, H), flags=cv2.INTER_LINEAR)
        wl = cv2.cvtColor(w[..., :3], cv2.COLOR_BGR2LAB).astype(np.float32)
        x, y, cw, ch, pad = v["cores"][0]
        pad = max(pad, 8)
        yy, xx = np.mgrid[0:H, 0:W]
        dx = np.maximum.reduce([x - xx, np.zeros_like(xx), xx - (x + cw)])
        dy = np.maximum.reduce([y - yy, np.zeros_like(yy), yy - (y + ch)])
        dist = np.hypot(dx, dy)
        ring = (dist > 0) & (dist <= pad * 2) & (base[..., 3] > 200) & (w[..., 3] > 200)
        before = float(np.linalg.norm((wl - bl)[ring], axis=1).mean())
        # 逐通道线性拟合 编辑→原画（外圈），作用到核+羽化区
        fit = wl.copy()
        for c in range(3):
            a, b = np.polyfit(wl[ring][:, c], bl[ring][:, c], 1)
            fit[..., c] = wl[..., c] * a + b
        after = float(np.linalg.norm((fit - bl)[ring], axis=1).mean())
        t = np.clip(1 - dist / pad, 0, 1)
        alpha = (t * t * (3 - 2 * t))[..., None]
        fixed = cv2.cvtColor(np.clip(fit, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
        out = base.copy()
        out[..., :3] = np.clip(base[..., :3] * (1 - alpha) + fixed * alpha, 0, 255).astype(np.uint8)
        leak = int((np.abs(out.astype(int) - base.astype(int)).max(axis=2)[dist > pad] > 0).sum())
        name = f"{key}__{st}.png"
        cv2.imwrite(str(OUT / name), out)
        rx, ry = max(0, x - pad), max(0, y - pad)
        new[st] = {"src": f"r4/mouths/{name}", "rect": [rx, ry, min(W, x + cw + pad) - rx, min(H, y + ch + pad) - ry],
                   "cores": [[x, y, cw, ch, pad]]}
        report.setdefault(key, {})[st] = {"ringDeltaE_before": round(before, 1), "ringDeltaE_after": round(after, 1), "leakPx": leak}
    rig["variants"] = new
R["note"] = "locked same-size mouth variants (borrowed_moonlight method); colour-transferred from atlas edits on the pad ring"
R["lockReport"] = report
rigs_path.write_text(json.dumps(R, indent=1), encoding="utf-8")
for k, v in report.items():
    print(f"{k:15s}", " ".join(f"{s}:{d['ringDeltaE_before']}->{d['ringDeltaE_after']}" for s, d in v.items()))
