#!/usr/bin/env python3
"""身份锚生成（codex，串行、幂等）：全身透明底 + 肖像。造型源 = piano_master_v2 的原生裁区（只锁身份与配色）。
用法（剧集目录）：python tools/gen_identity_anchors.py"""
import json
import subprocess
import sys
from pathlib import Path

import cv2

EP = Path(__file__).resolve().parents[1]
GEN = EP.parents[2] / "dula-skills/build-continuous-story-images/scripts/gen_image_codex.py"
cfg = json.loads((EP / "config/identity_anchors.json").read_text(encoding="utf-8"))
OUT = EP / "hybrid/anchors"
OUT.mkdir(parents=True, exist_ok=True)
MASTER = EP / "hybrid/assets/piano_master_v2.png"

m = cv2.imread(str(MASTER))
for who, c in cfg["characters"].items():
    x0, y0, x1, y1 = c["ref_crop"]
    crop = m[y0:y1, x0:x1]
    s = 1400 / crop.shape[0]
    cv2.imwrite(str(OUT / f"_src_{who}.png"), cv2.resize(crop, None, fx=s, fy=s, interpolation=cv2.INTER_LANCZOS4))

for j in cfg["jobs"]:
    out = OUT / f"{j['id']}.png"
    if out.exists():
        print("skip", out.name, flush=True)
        continue
    spec = cfg["characters"][j["who"]]["spec"]
    refs = [OUT / f"_src_{j['who']}.png", MASTER]
    if j["kind"] == "full":
        head = ("Full-body CHARACTER DESIGN ANCHOR, single character, calm neutral standing pose, body turned slightly toward "
                "the VIEWER'S RIGHT, arms relaxed at her sides, whole body visible head to toe with margin, centred, 1024x1536 "
                "portrait canvas. FULLY TRANSPARENT background (real PNG alpha): no backdrop, no floor, no shadow, no other people.")
    else:
        anchor = OUT / f"{j['who']}_full.png"
        if anchor.exists():
            refs = [anchor] + refs
        head = ("PORTRAIT ANCHOR of the same character, 1672x941 landscape, framed from just above her head to mid-chest, "
                "head turned three-quarters toward the VIEWER'S RIGHT, calm gentle expression, lips softly closed, eyes open "
                "looking off-frame to the viewer's right. Background: the deep red velvet stage curtain of the reference stage "
                "painting, softly out of focus, golden light shaft from the upper left, faint floating dust.")
    prompt = (f"{head} {spec} {cfg['style']} The attached image 1 (and image 2 if present) shows the character; use them to lock "
              f"her identity, proportions, costume pieces, their placement and colour palette, but paint a completely NEW, clean, "
              f"high-detail design image. Image of the full stage painting is for painting style only. One image only, no text.")
    out.with_suffix(".prompt.txt").write_text(prompt, encoding="utf-8")
    cmd = [sys.executable, str(GEN), "--out", str(out), "--prompt", prompt, "--size", j["size"], "--timeout", "600"]
    for r in refs:
        cmd += ["--ref", str(r)]
    r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    print(("ok " if r.returncode == 0 else "FAIL ") + out.name, (r.stdout + r.stderr)[-200:].replace("\n", " ") if r.returncode else "",
          flush=True)
