#!/usr/bin/env python3
"""R4 转圈重画 + 张臂中间画。R3 的转圈是「正面→右侧→背→右侧→正面」来回扭（缺左侧面），且 0_0≈0_1。
R4：12 个 30° 递进朝向（3 张 2x2 宫格，每格 512x768），refs = [身份锚, 上一张已出宫格(连续性/比例)]；
张臂中间画 noya_open_mid = 单人 1024x1536，refs = [身份锚, open_low, open_high]。串行、幂等。
用法（剧集目录）：python tools/gen_r4_twirl.py [id ...]"""
import json
import subprocess
import sys
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
GEN = EP.parents[2] / "dula-skills/build-continuous-story-images/scripts/gen_image_codex.py"
ID = json.loads((EP / "config/identity_anchors.json").read_text(encoding="utf-8"))
A = EP / "hybrid/anchors"
R3 = EP / "hybrid/r3/cels"
OUT = EP / "hybrid/r4/cels"
OUT.mkdir(parents=True, exist_ok=True)
STYLE = ID["style"]
SPEC = ID["characters"]["noya"]["spec"]
ALPHA = "FULLY TRANSPARENT background (real PNG alpha): no backdrop, no floor, no shadow, no text, no grid lines."
HAND = ("Throughout every cell one hand stays raised high directly above her head, wrist softly bent, as if a partner "
        "off to the VIEWER'S RIGHT holds it for the twirl; the raised hand stays at the same spot above the turning axis. "
        "She spins in place on the ball of one foot; the vertical turning axis runs through the raised hand, the head "
        "and the supporting foot, and stays at the horizontal centre of every cell.")
SHEETS = {
    "twirl_a": ["0 degrees: body and face facing the viewer straight on, skirt just starting to swing",
                "30 degrees: body turned three-quarters toward the VIEWER'S RIGHT, face still clearly visible",
                "60 degrees: turned further toward the viewer's right, face seen in steep three-quarter",
                "90 degrees: full profile facing the VIEWER'S RIGHT, skirt hem flaring out behind toward the viewer's left"],
    "twirl_b": ["120 degrees: three-quarter BACK view, face turned away, only the cheek line visible on the viewer's right",
                "150 degrees: almost full back view, curls fanning out",
                "180 degrees: back fully to the viewer, cloak and skirt flared widest",
                "210 degrees: three-quarter back view, only the cheek line visible on the VIEWER'S LEFT"],
    "twirl_c": ["240 degrees: steep three-quarter toward the VIEWER'S LEFT, face starting to appear",
                "270 degrees: full profile facing the VIEWER'S LEFT, skirt hem flaring out behind toward the viewer's right",
                "300 degrees: three-quarters facing the viewer's left, face clearly visible, mouth open singing",
                "330 degrees: nearly facing the viewer, turned slightly to the viewer's left, skirt settling, mouth open singing"],
}
PREV = {"twirl_a": R3 / "noya_twirl_0.png", "twirl_b": OUT / "twirl_a.png", "twirl_c": OUT / "twirl_b.png"}


def run(out, prompt, refs, size):
    if out.exists():
        print("skip", out.name, flush=True)
        return True
    out.with_suffix(".prompt.txt").write_text(prompt, encoding="utf-8")
    cmd = [sys.executable, str(GEN), "--out", str(out), "--prompt", prompt, "--size", size, "--timeout", "900"]
    for r in refs:
        cmd += ["--ref", str(r)]
    for attempt in range(2):
        r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        if r.returncode == 0:
            print("ok", out.name, flush=True)
            return True
        print("FAIL", out.name, attempt, (r.stdout + r.stderr)[-300:].replace("\n", " "), flush=True)
    return False


only = set(sys.argv[1:])
for k, cells in SHEETS.items():
    if only and k not in only:
        continue
    listing = "; ".join(f"cell {i + 1} ({['top-left', 'top-right', 'bottom-left', 'bottom-right'][i]}) = {c}" for i, c in enumerate(cells))
    p = (f"Image 1 is the IDENTITY ANCHOR of the curly-haired woman: copy her face, hair, body proportions and every costume "
         f"piece and colour exactly. Image 2 is the PREVIOUS animation sheet of this same twirl: match its character scale, "
         f"line quality and colours exactly so the sheets cut together (do not copy its poses). Paint ONE animation sheet, "
         f"1024x1536 portrait canvas, a grid of 2 columns x 2 rows = 4 equal cells (each 512x768), read left-to-right then "
         f"top-to-bottom. These are four consecutive phases of ONE continuous full-body spin, the body rotating steadily "
         f"by 30 degrees per cell (0 degrees = facing the viewer; she turns so that she first faces the viewer's right, "
         f"then shows her back, then faces the viewer's left). {listing}. {HAND} Each cell shows her full body head to "
         f"feet at EXACTLY the same scale with the supporting foot on the same baseline near the bottom of the cell, with "
         f"at least 40 pixels of empty margin on every side (skirt, cloak and raised hand never touch a cell edge). Skirt "
         f"and cloak swing with the rotation (they trail behind the turning direction). Identical face, hair and costume "
         f"in every cell. {SPEC} {STYLE} {ALPHA}")
    if not run(OUT / f"{k}.png", p, [A / "noya_full.png", PREV[k]], "1024x1536"):
        sys.exit(1)
if not only or "noya_open_mid" in only:
    p = (f"Image 1 is the IDENTITY ANCHOR: copy this exact character, face, hair, proportions, costume and colours exactly. "
         f"Images 2 and 3 are two key poses of hers (arms opening low, arms lifted high); paint the in-between drawing "
         f"EXACTLY halfway between them: both arms sweeping up wide at shoulder height, palms turning up, chest lifting, "
         f"chin rising, weight rising onto the balls of her feet, cloak lifting with the arms, mouth open on a sustained "
         f"sung note. Same framing and scale as images 2 and 3. ONE full-body image, head to feet with margin, 1024x1536 "
         f"portrait canvas. {SPEC} {STYLE} {ALPHA}")
    run(OUT / "noya_open_mid.png", p, [A / "noya_full.png", EP / "hybrid/r3/clean/noya_open_low.png",
                                         EP / "hybrid/r3/clean/noya_open_high.png"], "1024x1536")
