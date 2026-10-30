#!/usr/bin/env python3
"""尾奏中间画「姿势阶梯」（codex，串行、幂等）。
每张 refs：① 身份锚 maiden_full ② 上一张已验收帧（姿势连续）③ 本段目标姿势；提示词写明本张走到动作的百分比。
A：站立 → 低头看双手（a1–a4）；B：看手 → 捧心微笑（b1–b4）。输出 hybrid/cels/inb/<id>.png。
用法（剧集目录）：python tools/gen_inbetweens.py
"""
import json, subprocess, sys
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
GEN = EP.parents[2] / "dula-skills/build-continuous-story-images/scripts/gen_image_codex.py"
OUT = EP / "hybrid/cels/inb"
ANCHOR = EP / "assets/anchors/maiden/maiden_full.png"
SPEC = json.loads((EP / "config/identity_anchors.json").read_text(encoding="utf-8"))["maiden"]

STEPS = {
    "A": {"from": EP / "assets/anchors/maiden/maiden_full.png", "to": EP / "hybrid/cels/maiden_hands.png",
          "move": "from standing with arms relaxed at her sides (image 1) to looking DOWN at her own two open palms held in front of her waist (image 3)",
          "frames": [("a1", 20, "her hands have just begun to lift from her sides, elbows bending a little, head still level, gaze starting to lower"),
                     ("a2", 45, "her forearms are rising toward the front of her waist, palms turning upward, head tilting down a little"),
                     ("a3", 70, "her hands are almost in front of her waist, palms nearly up, head mostly lowered toward her hands"),
                     ("a4", 90, "her palms are up in front of her waist just short of the final position, head lowered, eyes on her palms")]},
    "B": {"from": EP / "hybrid/cels/maiden_hands.png", "to": EP / "hybrid/cels/maiden_joy.png",
          "move": "from looking down at her open palms (image 2's pose family) to clasping both hands at the center of her chest and smiling at the viewer (image 3)",
          "frames": [("b1", 20, "her head is starting to lift, palms beginning to close toward each other, expression turning from wonder to dawning joy"),
                     ("b2", 45, "her hands are rising and coming together in front of her lower chest, head half raised, a smile starting"),
                     ("b3", 70, "her hands are almost clasped near her chest, head nearly up and tilting slightly to HER left, smile widening"),
                     ("b4", 90, "her hands are clasped at her chest just short of the final position, looking at the viewer with a bright smile")]},
}


def run(out: Path, refs, prompt: str) -> None:
    if out.exists() and out.stat().st_size > 0:
        print("skip", out.name); return
    cmd = [sys.executable, str(GEN), "--out", str(out), "--prompt", prompt, "--size", "1024x1536", "--timeout", "720"]
    for r in refs:
        cmd += ["--ref", str(r)]
    r = subprocess.run(cmd, stdin=subprocess.DEVNULL, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(out.name, (r.stdout.strip().splitlines() or [""])[-1], r.stderr[-300:] if r.returncode else "")


# 第二轮：每两张已验收帧之间补一张「正好中间」的画（refs：锚、前一张、后一张）
MIDS = [("A", "am0", "assets/anchors/maiden/maiden_full.png", "hybrid/cels/inb/a1.png"),
        ("A", "am1", "hybrid/cels/inb/a1.png", "hybrid/cels/inb/a2.png"),
        ("A", "am2", "hybrid/cels/inb/a2.png", "hybrid/cels/inb/a3.png"),
        ("A", "am3", "hybrid/cels/inb/a3.png", "hybrid/cels/inb/a4.png"),
        ("A", "am4", "hybrid/cels/inb/a4.png", "hybrid/cels/maiden_hands.png"),
        ("B", "bm0", "hybrid/cels/maiden_hands.png", "hybrid/cels/inb/b1.png"),
        ("B", "bm1", "hybrid/cels/inb/b1.png", "hybrid/cels/inb/b2.png"),
        ("B", "bm2", "hybrid/cels/inb/b2.png", "hybrid/cels/inb/b3.png"),
        ("B", "bm3", "hybrid/cels/inb/b3.png", "hybrid/cels/inb/b4.png"),
        ("B", "bm4", "hybrid/cels/inb/b4.png", "hybrid/cels/maiden_joy.png")]


def mids() -> None:
    for key, fid, a, b in MIDS:
        prompt = (f"In-between animation drawing EXACTLY HALFWAY between two consecutive frames of one continuous motion "
                  f"({STEPS[key]['move']}). Image 1 is the identity anchor: SAME face, hair, gown, sleeves, colors, painterly style. "
                  f"Image 2 is the frame BEFORE and image 3 is the frame AFTER this one. Draw the pose precisely midway between image 2 and image 3: "
                  f"arms, hands, head angle, gaze and expression each halfway; keep her exact scale, framing, position, gown silhouette, hem and feet "
                  f"identical to image 2 and image 3. It must read as the natural tween of those two frames, not a new drawing. "
                  f"Full body from the top of the bun to the floor-length hem, centered, 1024x1536. Character: {SPEC['spec']}. "
                  f"FULLY TRANSPARENT background (real PNG alpha), no backdrop, no ground, no shadow, no text. Generate exactly one image.")
        run(OUT / f"{fid}.png", [ANCHOR, EP / a, EP / b], prompt)


def write_index() -> None:
    ids = sorted(p.stem for p in OUT.glob("*.png"))
    (OUT / "index.json").write_text(json.dumps(ids), encoding="utf-8"); print("index", ids)


def main() -> int:
    if sys.argv[1:] == ["index"]:
        write_index(); return 0
    if sys.argv[1:] == ["mids"]:
        mids(); write_index(); return 0
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:]
    for key, st in STEPS.items():
        prev = st["from"]
        for fid, pct, desc in st["frames"]:
            out = OUT / f"{fid}.png"
            if only and fid not in only:
                prev = out if out.exists() else prev; continue
            prompt = (f"In-between animation drawing {pct}% of the way through one continuous motion: {st['move']}. "
                      f"Image 1 is the identity anchor: SAME face, hair, gown, sleeves, colors, painterly style. "
                      f"Image 2 is the PREVIOUS frame of this motion: keep her exact scale, framing, position, gown silhouette, hem and feet identical to image 2; "
                      f"change only what this step of the motion needs. Image 3 is the target pose at the end of the motion. "
                      f"This frame: {desc}. The motion must look like a natural small step from image 2, not a new drawing. "
                      f"Full body from the top of the bun to the floor-length hem, centered, 1024x1536. Character: {SPEC['spec']}. "
                      f"FULLY TRANSPARENT background (real PNG alpha), no backdrop, no ground, no shadow, no text. Generate exactly one image.")
            run(out, [ANCHOR, prev, st["to"]], prompt)
            prev = out
    return 0


if __name__ == "__main__":
    sys.exit(main())
