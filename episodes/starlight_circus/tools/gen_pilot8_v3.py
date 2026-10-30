#!/usr/bin/env python3
"""8秒试片 v3 追加素材（codex，串行、幂等）：
  q   —— 第二层中间画：p1/p2 后半（关键帧 5–8）在 关键帧↔中间画 之间再各插一张（qa: key j↔inb j，qb: inb j↔key j+1）
  mcu —— 诺娅中近景底图 + 逐字口型/眨眼变体（裁区局部编辑后锁回）
  aud —— 前排观众剪影前景条（透明底）
用法（剧集目录）：python tools/gen_pilot8_v3.py [q|mcu|aud|all]"""
import json
import subprocess
import sys
from pathlib import Path

import cv2

EP = Path(__file__).resolve().parents[1]
SK = EP.parents[2] / "dula-skills"
GEN = SK / "build-continuous-story-images/scripts/gen_image_codex.py"
LOCK = SK / "image-lipsync/scripts/lock_region_variant.py"
V2 = EP / "hybrid/pilot8/v2"
V3 = EP / "hybrid/pilot8/v3"
V3.mkdir(parents=True, exist_ok=True)
COMMON = json.loads((EP / "config/pilot8_atlases_v2.json").read_text(encoding="utf-8"))["common"]


def codex(out, prompt, refs, size="1536x1024", timeout=700):
    if out.exists():
        print("skip", out.name, flush=True)
        return True
    out.with_suffix(".prompt.txt").write_text(prompt, encoding="utf-8")
    cmd = [sys.executable, str(GEN), "--out", str(out), "--prompt", prompt, "--size", size, "--timeout", str(timeout)]
    for r in refs:
        cmd += ["--ref", str(r)]
    for attempt in range(2):
        r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        if r.returncode == 0:
            print("ok", out.name, flush=True)
            return True
        print("FAIL", out.name, attempt, (r.stdout + r.stderr)[-300:].replace("\n", " "), flush=True)
    return False


def quarter():
    for sheet in ("p1", "p2"):
        k, i = V2 / f"{sheet}_k1.png", V2 / f"{sheet}_i1.png"
        for tag, a, b, desc in (("qa", k, i, "halfway in time between cell N of image 1 (a key pose) and cell N of image 2 (the "
                                                 "in-between that follows it)"),
                                ("qb", i, k, "halfway in time between cell N of image 1 (an in-between) and cell N+1 of image 2 "
                                             "(the next key pose); for cell 4 use cell 4 of image 1 a moment later, more settled")):
            prompt = (f"Image 1 and image 2 are two sheets of the same animation, each a 2 columns x 2 rows grid of 4 cells, same "
                      f"camera and layout. Paint a NEW sheet, same 1536x1024 size, same 2x2 layout, camera, scale, cell positions "
                      f"and floor baseline, where new cell N is {desc}. Positions, limb angles, head turns, cloth and hair are "
                      f"averaged between the two source frames, not copied from either; hands keep their contact. Identical faces, "
                      f"costumes, colours, proportions and painting style. {COMMON}")
            codex(V3 / f"{sheet}_{tag}.png", prompt, [a, b])


MCU_BOX = (760, 300, 300, 210)       # 口部裁区（底图生成后按实测修正，见 mcu_box.json）
VISEMES = {
    "closed": "lips gently closed in a soft relaxed line",
    "inhale": "lips just slightly parted as she takes a breath, a narrow dark gap, no teeth",
    "e": "singing an 'eh/ee' vowel: lips spread a little with a medium horizontal opening, upper teeth just visible",
    "o": "singing an 'oh/oo' vowel: lips rounded and pushed slightly forward into an open round shape",
    "a": "singing an open 'ah' vowel: jaw dropped, mouth open in a relaxed tall oval, upper teeth and a little tongue visible",
}


def mcu():
    base = V3 / "mcu_base.png"
    prompt = ("Image 1 is the identity, costume and painting-style reference of the curly-haired woman. Image 2 is the stage she "
              "stands on. Paint a NEW 1672x941 landscape MEDIUM CLOSE-UP (framed from just above her head to her waist) of the SAME "
              "woman standing on that stage, body turned three-quarters toward the VIEWER'S RIGHT, looking off-frame to the "
              "VIEWER'S RIGHT at someone she is about to sing to, head slightly tilted, brows gently raised in tender pleading, "
              "eyes warm and glistening, lips gently closed, one hand resting lightly on her own chest just below the brass bell. "
              "Leave generous looking space on the right. Background: the same deep red velvet curtain and brass moon-ring of image 2, "
              "softly out of focus, the golden light shaft from the VIEWER'S UPPER LEFT falling across her hair and cheek, a cool "
              "moonlight rim on her right shoulder, floating dust in the light. Same soft painterly oil storybook rendering, visible "
              "brushwork, small naturalistic eyes, no clean anime line art. No text, no border.")
    if not codex(base, prompt, [EP / "hybrid/dance/cels/cu_noya_plead.png", EP / "hybrid/dance/plates/plate_empty.png"],
                 "1672x941"):
        return
    boxf = V3 / "mcu_box.json"
    if not boxf.exists():
        print("NEED mcu_box.json (inspect mcu_base.png mouth/eyes)", flush=True)
        return
    box = json.loads(boxf.read_text())
    im = cv2.imread(str(base))
    for name, how, (x, y, w, h), window in (
            [(n, f"only the mouth changes: {d}", box["mouth"], box["mouth_lock"]) for n, d in VISEMES.items()] +
            [("blink", "only the eyes change: both eyes gently closed, drawn as fine light short curved lashes, no heavy dark "
                       "eyeliner, eyelids softly shaded", box["eyes"], box["eyes_lock"])]):
        final = V3 / f"mcu_{name}.png"
        if final.exists():
            continue
        crop = im[y:y + h, x:x + w]
        cp = V3 / f"mcu_crop_src_{'eyes' if name == 'blink' else 'mouth'}.png"
        cv2.imwrite(str(cp), crop)
        raw = V3 / f"mcu_crop_{name}.png"
        if not codex(raw, f"Edit image 1, a {w}x{h} crop of a painted close-up of a woman's face. Output exactly {w}x{h}. {how}. "
                          f"Every other pixel stays exactly the same: same skin, hair strands, lighting, brushwork and colours. "
                          f"Soft painterly oil rendering identical to image 1. No text.", [cp], f"{w}x{h}", 500):
            continue
        full = im.copy()
        full[y:y + h, x:x + w] = cv2.resize(cv2.imread(str(raw)), (w, h), interpolation=cv2.INTER_AREA)
        fr = V3 / f"mcu_full_{name}_raw.png"
        cv2.imwrite(str(fr), full)
        subprocess.run([sys.executable, "-W", "ignore", str(LOCK), str(base), str(fr), str(final), "--window", *map(str, window),
                        "--threshold", "25", "--margin", "18", "--feather", "7", "--max-area-frac", "0.08"],
                       check=False, capture_output=True)
        print("locked", name, flush=True)


def audience():
    prompt = ("Paint a 1536x1024 landscape image: the backs of the heads and shoulders of the FRONT ROW of a theatre audience, seen "
              "from directly behind them, occupying ONLY the bottom 22 percent of the canvas in one continuous row from the left edge "
              "to the right edge: about eleven people of varied heights and hairstyles (a lady's updo, a man's short hair, a small "
              "hat, a child), a few shoulders of dark coats. They are near-black silhouettes (very dark warm brown-black, not pure "
              "black) with only a thin warm rim of stage light along the tops of heads and shoulders, softly out of focus as a "
              "foreground. Everything above them is FULLY TRANSPARENT (real PNG alpha). Painterly oil storybook style. No faces, "
              "no seats visible, no text.")
    codex(V3 / "audience_row.png", prompt, [EP / "hybrid/dance/plates/plate_empty.png"])


if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else "all"
    if step in ("q", "all"):
        quarter()
    if step in ("aud", "all"):
        audience()
    if step in ("mcu", "all"):
        mcu()
