#!/usr/bin/env python3
"""R3 全景原画（cel-cinema 开工门禁）：refs[0]=身份锚，refs[1]=已验收姿势（只锁姿势）。单人 1024x1536 透明底；
仅牵手接触帧用双锚双人 1536x1024；诺娅转圈 = 2x2 竖宫格（每格 512x768）两张。串行、幂等。
用法（剧集目录）：python tools/gen_r3_cels.py [id ...]"""
import json
import subprocess
import sys
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
GEN = EP.parents[2] / "dula-skills/build-continuous-story-images/scripts/gen_image_codex.py"
ID = json.loads((EP / "config/identity_anchors.json").read_text(encoding="utf-8"))
A = EP / "hybrid/anchors"
PR = EP / "hybrid/r3/pose_refs"
OUT = EP / "hybrid/r3/cels"
OUT.mkdir(parents=True, exist_ok=True)
STYLE = ID["style"]
ALPHA = "FULLY TRANSPARENT background (real PNG alpha): no backdrop, no floor, no shadow, no text."

SOLO = {
    "noya_step": "a light forward step toward the VIEWER'S RIGHT, front boot just landed, weight moving forward, one hand lifting from her side, mouth open singing, brows lifted pleading",
    "noya_reach": "planted, leaning slightly forward, the arm on the VIEWER'S RIGHT extended toward someone palm up, tender pleading face, mouth open singing",
    "noya_touch": "arm fully extended, fingertips reaching out toward the VIEWER'S RIGHT, soft smile, mouth softly open on a sustained sung vowel",
    "noya_open_low": "facing the viewer three-quarters to the right, arms opening low and wide at hip height, chest lifting, chin rising, mouth open singing",
    "noya_open_high": "rising onto her toes, both arms lifted wide and high, palms up, chin up, eyes up toward the light, mouth open on a sustained note",
    "selene_listen": "standing shy, both hands clasped together at her chest, head slightly bowed, eyes looking toward the VIEWER'S LEFT, lips closed",
    "selene_lift": "her hand on the VIEWER'S LEFT side lifting gently toward someone on the left, palm turned up, the other hand at her chest, eyes wide with wonder, lips closed",
    "selene_raise": "her arm on the VIEWER'S LEFT side raised high above her head as if holding someone's hand up for a twirl, the other hand lifting her skirt, delighted smile, lips closed",
    "selene_chest": "standing still, one hand pressed to her chest, the other arm low, eyes glistening, moved, looking toward the VIEWER'S LEFT, lips closed",
}
PAIR = {
    "pair_hold": "the curly-haired woman on the VIEWER'S LEFT and the silver-haired woman on the VIEWER'S RIGHT have just joined hands between them at waist height, fingers gently curled around each other; the curly-haired woman smiles warmly with lips closed, taking a breath; the silver-haired woman lifts her face with a small surprised smile, lips closed",
    "pair_turnend": "the curly-haired woman has just finished twirling and faces the silver-haired woman, their joined hands lowered to shoulder height between them, her skirt and cloak still settling, both laughing softly face to face, the curly-haired woman's mouth open singing",
}
TWIRL = {
    "noya_twirl_0": "four consecutive phases of one twirl turning AWAY from the viewer toward the VIEWER'S LEFT, her raised hand held high above her head throughout (as if held by a partner off to the right): cell 1 facing the viewer three-quarters right, cell 2 facing the viewer directly rising onto the ball of one foot, cell 3 full profile facing the viewer's left with skirt flaring, cell 4 three-quarter back view with skirt and cloak flared wide",
    "noya_twirl_1": "the next four phases of the same twirl, continuing the same rotation: cell 1 back fully to the viewer with the cloak fanned out, cell 2 profile facing the VIEWER'S RIGHT, cell 3 nearly facing the viewer's right with the raised hand lowering, cell 4 turn completed facing the viewer's right, hand at shoulder height, skirt settling, mouth open singing",
}


def run(out, prompt, refs, size):
    if out.exists():
        print("skip", out.name, flush=True)
        return
    out.with_suffix(".prompt.txt").write_text(prompt, encoding="utf-8")
    cmd = [sys.executable, str(GEN), "--out", str(out), "--prompt", prompt, "--size", size, "--timeout", "700"]
    for r in refs:
        cmd += ["--ref", str(r)]
    for attempt in range(2):
        r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        if r.returncode == 0:
            print("ok", out.name, flush=True)
            return
        print("FAIL", out.name, attempt, (r.stdout + r.stderr)[-200:].replace("\n", " "), flush=True)


only = set(sys.argv[1:])
for k, pose in SOLO.items():
    if only and k not in only:
        continue
    who = k.split("_")[0]
    p = (f"Image 1 is the IDENTITY ANCHOR: copy this exact character, her face, hair, body proportions and every costume piece "
         f"and colour exactly. Image 2 is a POSE REFERENCE ONLY: copy its body pose, limb angles, head angle and cloth swing; "
         f"ignore its face, hair colour, colours, rendering and any other person or fragment in it. Paint ONE full-body image of "
         f"the image-1 character, head to feet with margin, 1024x1536 portrait canvas. POSE: {pose}. {ID['characters'][who]['spec']} "
         f"{STYLE} {ALPHA}")
    run(OUT / f"{k}.png", p, [A / f"{who}_full.png", PR / f"{k}.png"], "1024x1536")
for k, pose in PAIR.items():
    if only and k not in only:
        continue
    p = (f"Image 1 = IDENTITY ANCHOR of the curly-haired woman (Noya), image 2 = IDENTITY ANCHOR of the silver-haired woman "
         f"(Selene): copy their faces, hair, proportions and costumes exactly. Image 3 is a POSE REFERENCE ONLY for the two of them "
         f"(ignore its faces and colours). Paint ONE 1536x1024 landscape image of both full bodies at the same scale, head to feet "
         f"with margin, nothing touching the edges. POSE: {pose}. Noya: {ID['characters']['noya']['spec']} Selene: "
         f"{ID['characters']['selene']['spec']} {STYLE} {ALPHA}")
    run(OUT / f"{k}.png", p, [A / "noya_full.png", A / "selene_full.png", PR / f"{k}.png"], "1536x1024")
for k, phases in TWIRL.items():
    if only and k not in only:
        continue
    p = (f"Image 1 is the IDENTITY ANCHOR of the curly-haired woman: copy her face, hair, proportions and costume exactly. Image 2 "
         f"is a POSE REFERENCE sheet only (ignore its faces and colours). Paint ONE animation sheet, 1024x1536 portrait canvas, a "
         f"grid of 2 columns x 2 rows = 4 equal cells (each 512x768), read left-to-right then top-to-bottom; each cell shows her "
         f"full body at EXACTLY the same scale with her feet on the same baseline near the bottom of the cell, centred, with at "
         f"least 40 pixels of empty margin on every side (skirt, cloak and raised hand never touch a cell edge); cell N copies the "
         f"pose of cell N in image 2. The cells are {phases}. Identical face, hair and costume in every cell. "
         f"{ID['characters']['noya']['spec']} {STYLE} {ALPHA}")
    run(OUT / f"{k}.png", p, [A / "noya_full.png", PR / f"{k}.png"], "1024x1536")
