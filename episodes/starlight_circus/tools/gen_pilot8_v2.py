#!/usr/bin/env python3
"""8秒试片 v2 原画：每乐句 8 个关键帧 = 两张 2x2 宫格（第二张以第一张为连续性参考），
再各配一张同版式中间画宫格（第 4 格的中间画跨到下一张宫格的第 1 格）。串行、幂等。"""
import json
import subprocess
import sys
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
GEN = EP.parents[2] / "dula-skills/build-continuous-story-images/scripts/gen_image_codex.py"
cfg = json.loads((EP / "config/pilot8_atlases_v2.json").read_text(encoding="utf-8"))
OUT = EP / "hybrid/pilot8/v2"
OUT.mkdir(parents=True, exist_ok=True)
IDS = [EP / "hybrid/dance/refs/noya.png", EP / "hybrid/dance/refs/selene.png", EP / "hybrid/dance/cels/pair_heart.png"]
LAYOUT = ("ONE animation sheet, 1536x1024 landscape, a grid of 2 columns x 2 rows = 4 equal cells (each 768x512), "
          "read left-to-right then top-to-bottom.")


def codex(out, prompt, refs):
    if out.exists():
        print("skip", out.name, flush=True)
        return
    out.with_suffix(".prompt.txt").write_text(prompt, encoding="utf-8")
    cmd = [sys.executable, str(GEN), "--out", str(out), "--prompt", prompt, "--size", "1536x1024", "--timeout", "700"]
    for r in refs:
        cmd += ["--ref", str(r)]
    for attempt in range(2):
        r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        if r.returncode == 0:
            print("ok", out.name, flush=True)
            return
        print("FAIL", out.name, attempt, (r.stdout + r.stderr)[-300:].replace("\n", " "), flush=True)


for ph in cfg["phrases"]:
    for half in (0, 1):
        keys = ph["keys"][half * 4:half * 4 + 4]
        cells = " ".join(f"Cell {i + 1}: {c}." for i, c in enumerate(keys))
        refs = list(IDS)
        cont = ""
        if half == 1:
            refs.append(OUT / f"{ph['id']}_k0.png")
            cont = ("Image 4 is the previous sheet of this same movement: continue directly from its last cell, with identical "
                    "camera, scale, baseline and figure positions. ")
        prompt = (f"Image 1 = identity of the curly-haired woman, image 2 = identity of the silver-haired woman, image 3 = how "
                  f"the two look together and the painting style. {cont}Paint {LAYOUT} The 4 cells are consecutive KEY POSES, "
                  f"evenly spaced in time, of one continuous movement ({ph['action']}). {cells} {cfg['common']}")
        codex(OUT / f"{ph['id']}_k{half}.png", prompt, refs)
    for half in (0, 1):
        src = OUT / f"{ph['id']}_k{half}.png"
        if half == 0:
            last, refs = "between key 4 of image 1 and key 1 of image 2 (the next sheet)", [src, OUT / f"{ph['id']}_k1.png"]
        else:
            last, refs = "key 4 of image 1 a moment later, with cloth and hair a little more settled", [src]
        prompt = (f"Image 1 is a sheet of 4 animation key frames in a 2 columns x 2 rows grid. Paint a NEW sheet with exactly the "
                  f"same 1536x1024 size, the same 2x2 layout, camera, scale, cell positions and floor baseline, containing the "
                  f"IN-BETWEEN frames: new cell 1 is exactly halfway in time between key 1 and key 2, new cell 2 halfway "
                  f"between key 2 and key 3, new cell 3 halfway between key 3 and key 4, new cell 4 is {last}. Every in-between "
                  f"places each figure exactly where the motion passes: positions, limb angles, head turns, cloth and hair are "
                  f"averaged between the two keys, not copied from either, and hands keep their contact. Identical faces, "
                  f"costumes, colours, proportions and painting style to image 1. {cfg['common']}")
        codex(OUT / f"{ph['id']}_i{half}.png", prompt, refs)
