#!/usr/bin/env python3
"""R4 全景嘴型：同图原生脸部裁区打包（image-lipsync pack_edit_targets），供 codex 一次局部编辑多格嘴形。
  pack  —— 自动定位每张诺娅原画的脸（头顶下最宽头部带的中心），裁原生方块，每张脸重复 N 格（每格一个目标嘴形），
           写 config/face_atlas_r4_<group>.json + hybrid/r4/faces/atlas_<group>.png 和对应编辑提示词。
  rigs  —— 读取 codex 返回的 hybrid/r4/faces/edit_<group>.png，register_edit_atlas 逐格相似变换，
           以「编辑格 vs 原格」的致密差分在下半脸定位嘴区（cores），写 config/face_rigs_r4.json。
用法（剧集目录）：python tools/build_face_atlas_r4.py pack | rigs"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

EP = Path(__file__).resolve().parents[1]
SK = EP.parents[2] / "dula-skills/image-lipsync/scripts"
FACES = EP / "hybrid/r4/faces"
FACES.mkdir(parents=True, exist_ok=True)
STATES = {"rest": "lips gently CLOSED, relaxed, no teeth",
          "narrow": "singing an 'ee' vowel: lips slightly parted and spread wide, top teeth just visible",
          "open": "singing an 'ah' vowel: jaw dropped, mouth open in a tall soft oval, dark mouth interior and tongue visible",
          "round": "singing an 'oo' vowel: lips rounded and pushed forward into a small round 'o'"}
REJECT = ["noya_twirl_a1", "noya_twirl_a2", "noya_twirl_a3", "noya_twirl_a4", "noya_twirl_ma4", "noya_twirl_ma3",
          "noya_twirl_ma2", "noya_twirl_c4"]
# 原生裁区手工标定（自动差分核落在 alpha 边缘/头发上时）：[x, y, w, h] 原画坐标，覆盖旧嘴 ∪ 新嘴形
CORE_OVERRIDE = {"noya_open_high": [515, 148, 46, 34]}
GROUPS = {
    # 单人原画：256 原生格
    "solo": {"cell": 256, "states": ["rest", "narrow", "open", "round"],
             "keys": ["noya_step", "noya_reach", "noya_touch", "noya_open_low", "noya_open_mid", "noya_open_high"]},  # open_high 由 high 组覆盖
    # open_high 首轮编辑无效，单独重做（2x2）
    "high": {"cell": 256, "states": ["rest", "narrow", "open", "round"], "keys": ["noya_open_high"], "columns": 2},
    # 转圈可见脸格 + 双人画里的诺娅：160 原生格
    "small": {"cell": 160, "states": ["rest", "narrow", "open"],
              "keys": ["noya_twirl_a1", "noya_twirl_a2", "noya_twirl_a3", "noya_twirl_a4", "noya_twirl_ma4",
                       "noya_twirl_ma3", "noya_twirl_ma2", "noya_twirl_c4", "pair_hold", "pair_turnend"]},
}


def src_of(key):
    p = EP / "hybrid/r4/clean" / f"{key}.png"
    return p if p.exists() else EP / "hybrid/r3/clean" / f"{key}.png"


def face_box(key, cell):
    im = cv2.imread(str(src_of(key)), cv2.IMREAD_UNCHANGED)
    if key.startswith("pair"):  # 诺娅在画面左半
        im = im[:, :im.shape[1] // 2]
    a = im[..., 3] > 60
    H, W = a.shape
    w = a[:, int(W * .1):int(W * .9)].sum(axis=1)
    top = int(np.argmax(w > .12 * W))
    body = H - top
    band = a[top + int(.03 * body):top + int(.10 * body)]
    cols = np.where(band.any(axis=0))[0]
    segs, s = [], cols[0]
    for p, q in zip(cols, cols[1:]):
        if q - p > 3:
            segs.append((s, p))
            s = q
    segs.append((s, cols[-1]))
    l, r = max(segs, key=lambda z: z[1] - z[0])
    cx, cy = (l + r) // 2, top + int(.075 * body)
    # 按肤色质心居中（头发中心会让三四分侧脸贴到格边）
    y0b, y1b = top + int(.02 * body), top + int(.13 * body)
    hsv = cv2.cvtColor(im[y0b:y1b, :, :3], cv2.COLOR_BGR2HSV)
    skin = (hsv[..., 0] >= 3) & (hsv[..., 0] <= 22) & (hsv[..., 1] > 70) & (hsv[..., 2] > 140) & a[y0b:y1b]
    skin[:, :max(0, l - 20)] = False
    skin[:, r + 20:] = False
    if skin.sum() > 50:
        ys, xs = np.nonzero(skin)
        cx, cy = int(xs.mean()), y0b + int(np.percentile(ys, 60))
    x0 = int(np.clip(cx - cell // 2, 0, im.shape[1] - cell))
    y0 = int(np.clip(cy - cell // 2, 0, im.shape[0] - cell))
    return [x0, y0, cell, cell]


def pack(only=None):
    for gname, gr in GROUPS.items():
        if only and gname not in only:
            continue
        targets = []
        for k in gr["keys"]:
            if not src_of(k).exists():
                print("missing", k)
                continue
            box = face_box(k, gr["cell"])
            for st in gr["states"]:
                targets.append({"id": f"{k}__{st}", "source": "../" + str(src_of(k).relative_to(EP)).replace("\\", "/"),
                                "crop": box, "state": st})
        cols = gr.get("columns", 4 if gname == "solo" else 6)
        conf = {"cell": [gr["cell"], gr["cell"]], "columns": cols, "targets": targets}
        cp = EP / f"config/face_atlas_r4_{gname}.json"
        cp.write_text(json.dumps(conf, ensure_ascii=False, indent=1), encoding="utf-8")
        subprocess.run([sys.executable, str(SK / "pack_edit_targets.py"), "--config", str(cp), "--output",
                        str(FACES / f"atlas_{gname}.png")], check=True)
        rows = (len(targets) + cols - 1) // cols
        lines = [f"row {i // cols + 1} col {i % cols + 1}: {STATES[t['state']]}" for i, t in enumerate(targets)]
        prompt = (f"This image is an atlas of {len(targets)} cells ({cols} columns x {rows} rows, each {gr['cell']}x{gr['cell']} px) "
                  f"cropped from finished animation drawings of the same curly-haired woman. Edit ONLY THE MOUTH inside each "
                  f"cell; keep every other pixel - face shape, eyes, brows, nose, freckles, hair, skin, lighting, line style, "
                  f"framing and position - exactly identical to the input cell, at the same size, no new background, no "
                  f"redrawn faces, no grid lines or text. Keep the mouth in the same painted style and lip colour as the "
                  f"original. Per cell: " + "; ".join(lines) + ".")
        (FACES / f"atlas_{gname}.prompt.txt").write_text(prompt, encoding="utf-8")
        print(gname, len(targets), "cells")


def rigs():
    out = {"note": "same-image feathered mouth variants from codex atlas edits; registration + dense diff cores", "rigs": {}}
    for gname, gr in GROUPS.items():
        cp = EP / f"config/face_atlas_r4_{gname}.json"
        donor = FACES / f"edit_{gname}.png"
        if not donor.exists():
            print("no edit for", gname)
            continue
        reg = EP / f"config/face_registration_r4_{gname}.json"
        conf = json.loads(cp.read_text(encoding="utf-8"))
        c = gr["cell"]
        for t in conf["targets"]:  # 配准只看上半脸（眼鼻不变），嘴区本来就改了
            t["registrationROI"] = [int(c * .12), int(c * .08), int(c * .76), int(c * .5)]
        cp.write_text(json.dumps(conf, ensure_ascii=False, indent=1), encoding="utf-8")
        subprocess.run([sys.executable, str(SK / "register_edit_atlas.py"), "--config", str(cp), "--donor", str(donor),
                        "--output", str(reg)], check=True)
        R = {r["id"]: r for r in json.loads(reg.read_text(encoding="utf-8"))["registrations"]}
        atlas = cv2.imread(str(donor), cv2.IMREAD_UNCHANGED)
        cols = conf["columns"]
        rows = (len(conf["targets"]) + cols - 1) // cols
        sx, sy = atlas.shape[1] / (cols * c), atlas.shape[0] / (rows * c)
        for i, t in enumerate(conf["targets"]):
            key, st = t["id"].split("__")
            base = cv2.imread(str(EP / "config" / t["source"]), cv2.IMREAD_UNCHANGED)
            M = np.array(R[t["id"]]["sourceAffine"])
            # 把编辑格按 sourceAffine 映到原画坐标（与 feathered-variant-face 相同的映射），在脸框内比差分
            A = M.copy()
            A[:, 0] /= sx
            A[:, 1] /= sy
            warped = cv2.warpAffine(atlas, A, (base.shape[1], base.shape[0]), flags=cv2.INTER_LINEAR)
            x, y, w, h = t["crop"]
            d = np.abs(warped[y:y + h, x:x + w, :3].astype(int) - base[y:y + h, x:x + w, :3].astype(int)).max(axis=2)
            d[:int(h * .45)] = 0  # 只在下半脸找嘴
            m = cv2.morphologyEx((d > 40).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            n, lab, stt, _ = cv2.connectedComponentsWithStats(m)
            if n <= 1:
                print("NO MOUTH DIFF", t["id"])
                continue
            j = 1 + int(np.argmax(stt[1:, 4]))
            bx, by, bw, bh, _ = stt[j]
            rig = out["rigs"].setdefault(key, {"variants": {}, "mouth": {}})
            pad = max(4, int(c * .03))
            rig["variants"][st] = {"src": f"r4/faces/edit_{gname}.png", "rect": [x, y, w, h],
                                   "cores": [[x + int(bx), y + int(by), int(bw), int(bh), pad]],
                                   "sourceAffine": M.tolist(), "sourceSize": [cols * c, rows * c]}
        print(gname, "rigs", len(R))
    # 原生嘴形矩阵目检拒收（hybrid/r4/qa/mouth_matrix.png）：160 格转圈小脸 codex 未改嘴（差分=配准/背景偏差，
    # 三态差分相同、核贴格边）；open_high 首轮编辑无效（差分 11-14、核横跨整格）。拒收件保持原画嘴，探针报 drawn。
    out["rejected"] = {k: "edit did not change the mouth (native matrix review)" for k in REJECT if k in out["rigs"]}
    for k in REJECT:
        out["rigs"].pop(k, None)
    for key, rig in out["rigs"].items():
        v = rig["variants"]
        # 运行时嘴形 → 变体；缺 round 的小脸用 narrow；吸气用微开的 narrow
        rig["mouth"] = {"rest": "rest", "labial": "rest", "narrow": "narrow", "open": "open",
                        "round": "round" if "round" in v else "narrow", "inhale": "rest"}
        # 所有变体共用嘴区并集（旧嘴与新嘴的并集都要盖住）
        boxes = [c for vv in v.values() for c in vv["cores"]]
        x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
        x1, y1 = max(b[0] + b[2] for b in boxes), max(b[1] + b[3] for b in boxes)
        if key in CORE_OVERRIDE:  # open_high：自动核落在脸右侧的头发/透明边（编辑图背景 alpha 变化最大处），嘴从未被替换
            x0, y0, w0, h0 = CORE_OVERRIDE[key]
            x1, y1 = x0 + w0, y0 + h0
        for vv in v.values():
            vv["cores"] = [[x0, y0, x1 - x0, y1 - y0, vv["cores"][0][4]]]
    (EP / "config/face_rigs_r4.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print("rigs:", {k: list(v["variants"]) for k, v in out["rigs"].items()})


if sys.argv[1] == "pack":
    pack(sys.argv[2:])
else:
    rigs()
