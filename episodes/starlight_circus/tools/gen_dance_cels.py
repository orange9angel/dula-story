#!/usr/bin/env python3
"""按 config/dance_cels_borrow_a_melody.json 串行调用 codex 生成舞蹈 cel（幂等：已存在即跳过）。
用法（剧集目录）：python tools/gen_dance_cels.py [id ...]"""
import json
import subprocess
import sys
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
GEN = EP.parents[2] / "dula-skills/build-continuous-story-images/scripts/gen_image_codex.py"
cfg = json.loads((EP / "config/dance_cels_borrow_a_melody.json").read_text(encoding="utf-8"))
STYLE = (EP / "hybrid/dance/prompts/_style.txt").read_text(encoding="utf-8").strip()
CU_STYLE = ("Match the reference's soft painterly oil rendering, visible brush texture, muted palette, small naturalistic eyes, "
            "soft warm stage key light from upper left, cool moonlight rim, deep red curtain and dark softly blurred bokeh background. "
            "Same face, same costume, same lighting and same painter as the reference; newly painted pose, not a copy. No text, no border.")
REF = EP / "hybrid/dance/refs"
only = set(sys.argv[1:])
for j in cfg["jobs"]:
    if only and j["id"] not in only:
        continue
    out = EP / "hybrid/dance/cels" / f"{j['id']}.png"
    if out.exists():
        print("skip", j["id"], flush=True)
        continue
    who = j["who"].split("+")
    if j["kind"] == "cu":
        refs = [EP / "hybrid/assets" / j["ref"]]
        prompt = (f"Image 1 is the identity, costume and style reference. Paint a NEW 1672x941 landscape close-up of "
                  f"{cfg['locks'][who[0]]}. {j['pose']}. {CU_STYLE}")
        size = "1672x941"
    else:
        locks = " ".join(f"COSTUME LOCK for the {w} figure: {cfg['locks'][w]}." for w in who)
        refs = [REF / f"{w}.png" for w in who] + ([REF / "pair.png"] if j["kind"] == "pair" else [])
        names = ", ".join(f"image {i + 1} = {w} identity" for i, w in enumerate(who))
        canvas = ("1024x1536 portrait canvas" if j["kind"] == "solo" else
                  "1536x1024 landscape canvas, all figures at the same scale as each other, full bodies")
        prompt = f"Reference images: {names}. Paint {canvas}. {locks} POSE: {j['pose']}. {STYLE}"
        size = "1024x1536" if j["kind"] == "solo" else "1536x1024"
    out.parent.mkdir(parents=True, exist_ok=True)
    (EP / "hybrid/dance/prompts" / f"{j['id']}.txt").write_text(prompt, encoding="utf-8")
    cmd = [sys.executable, str(GEN), "--out", str(out), "--prompt", prompt, "--size", size, "--timeout", "500"]
    for r in refs:
        cmd += ["--ref", str(r)]
    for attempt in range(2):
        r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        if r.returncode == 0:
            print("ok", j["id"], flush=True)
            break
        print("FAIL", j["id"], attempt, (r.stdout + r.stderr)[-400:], flush=True)
