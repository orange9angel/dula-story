#!/usr/bin/env python3
"""近景/中近景脸 = 肖像身份锚的同图局部编辑（照 borrowed_moonlight A2：锚即特写，不另画新脸）。
裁区 → codex 局部编辑 → 贴回 → lock_region_variant 窗内锁定（窗外逐像素等于锚）。串行、幂等。
用法（剧集目录）：python tools/gen_anchor_faces.py"""
import subprocess
import sys
from pathlib import Path

import cv2

EP = Path(__file__).resolve().parents[1]
SK = EP.parents[2] / "dula-skills"
GEN = SK / "build-continuous-story-images/scripts/gen_image_codex.py"
LOCK = SK / "image-lipsync/scripts/lock_region_variant.py"
A = EP / "hybrid/anchors"
OUT = EP / "hybrid/anchors/noya_face_variants"
OUT.mkdir(parents=True, exist_ok=True)

MOUTH = dict(crop=(820, 320, 240, 150), lock=(868, 352, 140, 72))
EYES = dict(crop=(820, 180, 240, 140), lock=(848, 204, 184, 92))
FACE = dict(crop=(770, 150, 330, 340), lock=(815, 185, 245, 270))
KEEP = ("Every other pixel stays exactly the same: same hair strands, skin, freckles, lighting, brushwork and colours. "
        "Soft painterly oil rendering identical to image 1; small naturalistic eyes. No text.")
# (名称, 基底, 区域, 改动)
JOBS = [
    ("inhale", "base", MOUTH, "only the mouth changes: lips just slightly parted as she takes a breath, a narrow dark gap, no teeth"),
    ("e", "base", MOUTH, "only the mouth changes: singing an 'eh/ee' vowel, lips spread a little with a medium horizontal opening, upper teeth just visible"),
    ("o", "base", MOUTH, "only the mouth changes: singing an 'oh/oo' vowel, lips rounded and pushed slightly forward into an open round shape"),
    ("a", "base", MOUTH, "only the mouth changes: singing an open 'ah' vowel, jaw dropped, mouth a relaxed tall oval, upper teeth and a little tongue visible"),
    ("blink", "base", EYES, "only the eyes change: both eyes gently closed, drawn as fine light short curved lashes, no heavy dark eyeliner"),
    ("plead", "base", FACE, "only the face expression changes: brows lifted and drawn slightly together in pleading longing, eyes glistening and "
                            "looking UP toward the light at the upper right, lips parted singing an open 'ah' vowel with upper teeth visible; "
                            "the head, hair, ear and face outline stay exactly where they are"),
    ("plead_u", "plead", MOUTH, "only the mouth changes: lips rounded and pushed slightly forward into a small open round 'oo' shape"),
    ("plead_i", "plead", MOUTH, "only the mouth changes: lips spread with a narrow horizontal opening, upper teeth visible, a sustained 'ee' vowel"),
    ("plead_closed", "plead", MOUTH, "only the mouth changes: lips gently closed in a soft relaxed line with the faintest smile"),
    ("plead_inhale", "plead", MOUTH, "only the mouth changes: lips just slightly parted for a quick breath, narrow dark gap, no teeth"),
]

for name, base_name, reg, how in JOBS:
    final = OUT / f"{name}.png"
    if final.exists():
        print("skip", name, flush=True)
        continue
    base = A / "noya_face.png" if base_name == "base" else OUT / f"{base_name}.png"
    if not base.exists():
        print("WAIT", name, "needs", base.name, flush=True)
        continue
    im = cv2.imread(str(base))
    x, y, w, h = reg["crop"]
    src = OUT / f"_crop_{name}_src.png"
    cv2.imwrite(str(src), im[y:y + h, x:x + w])
    raw = OUT / f"_crop_{name}_edit.png"
    if not raw.exists():
        prompt = f"Edit image 1, a {w}x{h} crop of a painted portrait of a curly-haired young woman. Output exactly {w}x{h}. {how}. {KEEP}"
        r = subprocess.run([sys.executable, str(GEN), "--out", str(raw), "--ref", str(src), "--prompt", prompt,
                            "--size", f"{w}x{h}", "--timeout", "500"], capture_output=True, text=True, stdin=subprocess.DEVNULL)
        if r.returncode:
            print("FAIL", name, (r.stdout + r.stderr)[-200:].replace("\n", " "), flush=True)
            continue
    full = im.copy()
    full[y:y + h, x:x + w] = cv2.resize(cv2.imread(str(raw)), (w, h), interpolation=cv2.INTER_AREA)
    fr = OUT / f"_full_{name}_raw.png"
    cv2.imwrite(str(fr), full)
    subprocess.run([sys.executable, "-W", "ignore", str(LOCK), str(base), str(fr), str(final), "--window", *map(str, reg["lock"]),
                    "--threshold", "25", "--margin", "18", "--feather", "7", "--max-area-frac", "0.12"], capture_output=True)
    print("locked" if final.exists() else "LOCKFAIL", name, flush=True)
