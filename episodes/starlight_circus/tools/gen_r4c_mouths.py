#!/usr/bin/env python3
"""R4c 全景嘴型：借月光的少女同法——每张原画、每个嘴形单独一次 codex 局部编辑（原生分辨率，整张原画为输入），
再 image-lipsync lock_region_variant 按嘴窗锁回（窗外逐像素=原画）。替代 R4 的多脸图集（整格重渲染 → 嘴周 ΔE 5–58）。
原画（已清理、裁到人物外框）补透明边到 codex 画幅再送，返回后裁回，不缩放。嘴窗取 R4 rig 的嘴核（原画坐标）外扩。
输出 hybrid/r4/mouths_native/<key>__<state>.png（锁回图）+ config/face_rigs_r4.json（锁回形式）。串行、幂等。"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

EP = Path(__file__).resolve().parents[1]
GEN = EP.parents[2] / "dula-skills/build-continuous-story-images/scripts/gen_image_codex.py"
LOCK = EP.parents[2] / "dula-skills/image-lipsync/scripts/lock_region_variant.py"
RAW, OUT = EP / "hybrid/r4/mouths_native/raw", EP / "hybrid/r4/mouths_native"
RAW.mkdir(parents=True, exist_ok=True)
# 每张原画：画死的嘴是什么 → 需要补哪两态（三态 = 闭口 / 半开 / 张开，同借月光）
DRAWN = {"noya_step": "open", "noya_reach": "open", "noya_touch": "open", "noya_open_low": "open", "noya_open_mid": "open",
         "noya_open_high": "open", "pair_hold": "rest", "pair_turnend": "open"}
NEED = {"open": ["rest", "narrow"], "rest": ["narrow", "open"]}
TXT = {"rest": "lips gently CLOSED and relaxed, no teeth showing, the corners soft",
       "narrow": "lips just parted mid-word while singing, a small opening with the top teeth barely visible",
       "open": "mouth open singing a sustained 'ah', jaw dropped, a soft tall oval with the dark mouth interior visible"}
WHO = {"pair_hold": "the curly-haired woman on the LEFT (do not touch the silver-haired woman at all)",
       "pair_turnend": "the curly-haired woman on the LEFT (do not touch the silver-haired woman at all)"}
src_of = lambda k: EP / ("hybrid/r4/clean" if (EP / f"hybrid/r4/clean/{k}.png").exists() else "hybrid/r3/clean") / f"{k}.png"
rigs = json.loads((EP / "tmp/face_rigs_r4_atlas.json").read_text(encoding="utf-8"))["rigs"]


def canvas_for(w, h):
    return (1536, 1024) if w > h else (1024, 1536)


out_rigs = {}
for key, drawn in DRAWN.items():
    base = Image.open(src_of(key)).convert("RGBA")
    W, H = base.size
    CW, CH = canvas_for(W, H)
    if W > CW or H > CH:
        s = min(CW / W, CH / H)
        sys.exit(f"{key}: base {W}x{H} larger than codex canvas; would need scaling ({s:.2f})")
    ox, oy = (CW - W) // 2, (CH - H) // 2
    padded = RAW / f"{key}__base_padded.png"
    if not padded.exists():
        cv = Image.new("RGBA", (CW, CH))
        cv.paste(base, (ox, oy))
        cv.save(padded)
    x, y, cw, ch, pad = rigs[key]["variants"]["rest"]["cores"][0]
    win = [max(0, x - 14), max(0, y - 12), cw + 28, ch + 24]
    variants = {}
    for st in NEED[drawn]:
        raw = RAW / f"{key}__{st}_raw.png"
        if not raw.exists():
            who = WHO.get(key, "her")
            p = (f"Edit this exact finished animation drawing. Change ONLY THE MOUTH of {who}: {TXT[st]}. Keep every other "
                 f"pixel identical - same face, eyes, brows, nose, freckles, hair, skin tone, lighting, line weight, costume, pose, "
                 f"position and size; keep the mouth in the same painted style and lip colour. Keep the transparent background "
                 f"fully transparent (real PNG alpha). No new elements, no text.")
            r = subprocess.run([sys.executable, str(GEN), "--out", str(raw), "--prompt", p, "--size", f"{CW}x{CH}", "--ref", str(padded),
                                "--timeout", "900"], capture_output=True, text=True, stdin=subprocess.DEVNULL)
            if r.returncode:
                print("FAIL", key, st, (r.stdout + r.stderr)[-200:].replace("\n", " "), flush=True)
                continue
        ed = Image.open(raw).convert("RGBA")
        if ed.size != (CW, CH):
            ed = ed.resize((CW, CH), Image.Resampling.LANCZOS)
        var = RAW / f"{key}__{st}_aligned.png"
        ed.crop((ox, oy, ox + W, oy + H)).save(var)
        locked = OUT / f"{key}__{st}.png"
        r = subprocess.run([sys.executable, str(LOCK), str(src_of(key)), str(var), str(locked), "--window", *map(str, win),
                            "--threshold", "25", "--margin", "6", "--feather", "6", "--max-area-frac", "0.02"],
                           capture_output=True, text=True)
        print(key, st, (r.stdout + r.stderr).strip().replace("\n", " ")[-160:], flush=True)
        if r.returncode or not locked.exists():
            continue
        # lock_region_variant 输出 RGB：拼回原画 alpha（嘴窗不改轮廓），否则窗内透明背景被贴成不透明
        li, bi = cv2.imread(str(locked), cv2.IMREAD_UNCHANGED), cv2.imread(str(src_of(key)), cv2.IMREAD_UNCHANGED)
        cv2.imwrite(str(locked), np.dstack([li[..., :3], bi[..., 3]]))
        # 嘴窗外圈色差（锁回图 vs 原画）
        b = cv2.cvtColor(cv2.imread(str(src_of(key)))[..., :3], cv2.COLOR_BGR2LAB).astype(np.float32)
        l = cv2.cvtColor(cv2.imread(str(locked))[..., :3], cv2.COLOR_BGR2LAB).astype(np.float32)
        d = np.linalg.norm(l - b, axis=2)
        changed = d > 1
        variants[st] = {"src": f"r4/mouths_native/{key}__{st}.png", "rect": win, "islands": None,
                        "changedPx": int(changed.sum()), "meanDeltaEChanged": round(float(d[changed].mean()), 1) if changed.any() else 0}
    out_rigs[key] = {"drawn": drawn, "variants": variants}
    print("done", key, {k: (v["changedPx"], v["meanDeltaEChanged"]) for k, v in variants.items()}, flush=True)

rig_out = {"note": "borrowed_moonlight method: per-drawing native codex mouth edits locked by lock_region_variant", "rigs": {}}
for key, r in out_rigs.items():
    # 锁回图在窗外已逐像素=原画、窗内已羽化：运行时整窗贴（全不透明核），不再叠椭圆羽化
    v = {st: {"src": d["src"], "rect": d["rect"], "cores": [[*d["rect"], 1]]} for st, d in r["variants"].items()}
    if not v:
        continue
    # 画死的嘴本身就是一态：用原画（不贴补丁）
    mouth = {r["drawn"]: None}
    for st in v:
        mouth[st] = st
    full = {"rest": mouth.get("rest"), "narrow": mouth.get("narrow"), "open": mouth.get("open")}
    full.update(round=full["narrow"], labial=full["rest"], inhale=full["rest"])
    rig_out["rigs"][key] = {"variants": v, "mouth": full, "drawn": r["drawn"]}
(EP / "config/face_rigs_r4c.json").write_text(json.dumps(rig_out, indent=1), encoding="utf-8")
print("wrote config/face_rigs_r4c.json", list(rig_out["rigs"]))
