#!/usr/bin/env python3
"""R4 全景嘴型图集的 codex 局部编辑（build_face_atlas_r4.py pack 之后）。图集补成 codex 支持的画幅比例再送，
返回后缩回补齐尺寸、裁掉补边 → hybrid/r4/faces/edit_<group>.png（与 atlas 同尺寸，供 register_edit_atlas）。幂等。"""
import subprocess
import sys
from pathlib import Path

from PIL import Image

EP = Path(__file__).resolve().parents[1]
GEN = EP.parents[2] / "dula-skills/build-continuous-story-images/scripts/gen_image_codex.py"
F = EP / "hybrid/r4/faces"
SIZES = {(2, 3): "1024x1536", (1, 1): "1024x1024", (3, 2): "1536x1024"}
for g in sys.argv[1:] or ["solo", "small"]:
    out = F / f"edit_{g}.png"
    if out.exists():
        print("skip", out.name)
        continue
    atlas = Image.open(F / f"atlas_{g}.png").convert("RGBA")
    w, h = atlas.size
    # 选最接近的比例，只在右/下补透明边（不缩放原像素）
    (rw, rh), size = min(SIZES.items(), key=lambda kv: abs(kv[0][0] / kv[0][1] - w / h))
    pw, ph = max(w, round(h * rw / rh)), max(h, round(w * rh / rw))
    padded = Image.new("RGBA", (pw, ph))
    padded.paste(atlas, (0, 0))
    src = F / f"atlas_{g}_padded.png"
    padded.save(src)
    prompt = (F / f"atlas_{g}.prompt.txt").read_text(encoding="utf-8") + (
        " Empty transparent areas stay empty." if (pw, ph) != (w, h) else "")
    raw = F / f"edit_{g}_raw.png"
    r = subprocess.run([sys.executable, str(GEN), "--out", str(raw), "--prompt", prompt, "--size", size, "--ref", str(src),
                        "--timeout", "900"], capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if r.returncode:
        print("FAIL", g, (r.stdout + r.stderr)[-300:])
        continue
    im = Image.open(raw).convert("RGBA").resize((pw, ph), Image.Resampling.LANCZOS).crop((0, 0, w, h))
    im.save(out)
    print("ok", out.name, size)
