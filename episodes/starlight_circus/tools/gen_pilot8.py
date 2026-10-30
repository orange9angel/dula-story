#!/usr/bin/env python3
"""8秒歌剧试片素材：双人关键帧宫格 → 同版式中间画宫格 → 近景元音口型（裁区局部编辑再锁回）。
全部走 codex（会员额度），串行、幂等。用法（剧集目录）：python tools/gen_pilot8.py [keys|inb|cu]"""
import json
import subprocess
import sys
from pathlib import Path

import cv2

EP = Path(__file__).resolve().parents[1]
SK = EP.parents[2] / "dula-skills"
GEN = SK / "build-continuous-story-images/scripts/gen_image_codex.py"
LOCK = SK / "image-lipsync/scripts/lock_region_variant.py"
cfg = json.loads((EP / "config/pilot8_atlases.json").read_text(encoding="utf-8"))
OUT = EP / "hybrid/pilot8"
OUT.mkdir(parents=True, exist_ok=True)
REFS = [EP / "hybrid/dance/refs/noya.png", EP / "hybrid/dance/refs/selene.png", EP / "hybrid/dance/cels/pair_heart.png"]


def codex(out, prompt, refs, size, timeout=700):
    if out.exists():
        print("skip", out.name, flush=True)
        return True
    (out.with_suffix(".prompt.txt")).write_text(prompt, encoding="utf-8")
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


def keys():
    for a in cfg["atlases"]:
        cells = " ".join(f"Cell {i + 1}: {c}." for i, c in enumerate(a["cells"]))
        prompt = (f"Image 1 = identity of the curly-haired woman, image 2 = identity of the silver-haired woman, "
                  f"image 3 = how the two look together and the painting style. Paint ONE animation key-frame sheet, "
                  f"1536x1024 landscape, a grid of 3 columns x 2 rows = 6 equal square cells, read left-to-right then "
                  f"top-to-bottom. The 6 cells are consecutive KEY POSES of one continuous movement ({a['action']}). "
                  f"{cells} {cfg['common']}")
        codex(OUT / f"{a['id']}_keys.png", prompt, REFS, "1536x1024")


def inbetweens():
    for a in cfg["atlases"]:
        src = OUT / f"{a['id']}_keys.png"
        prompt = ("Image 1 is a sheet of 6 animation key frames in a 3 columns x 2 rows grid (read left-to-right, then "
                  "top-to-bottom). Paint a NEW sheet with exactly the same 1536x1024 size, the same 3x2 layout, the same "
                  "camera, scale, cell positions and floor baseline, containing the IN-BETWEEN frames: new cell 1 is "
                  "exactly halfway in time between key 1 and key 2, new cell 2 halfway between key 2 and key 3, new cell 3 "
                  "halfway between key 3 and key 4, new cell 4 halfway between key 4 and key 5, new cell 5 halfway between "
                  "key 5 and key 6, new cell 6 is key 6 a moment later with cloth and hair a little more settled. Every "
                  "in-between keeps each figure exactly where the motion passes: positions, limb angles, head turns, cloth "
                  "and hair are averaged between the two keys, not copied from either, and hands keep their contact. "
                  "Identical faces, costumes, colours, proportions and painting style to image 1. " + cfg["common"])
        codex(OUT / f"{a['id']}_inb.png", prompt, [src], "1536x1024")


def cu():
    base = EP / cfg["cu"]["base"]
    im = cv2.imread(str(base))
    h, w = im.shape[:2]
    # 嘴部裁区：近景脸在画面中上，按基图实测（cu_noya_plead 1672x941）
    box = json.loads((OUT / "cu_mouth_box.json").read_text()) if (OUT / "cu_mouth_box.json").exists() else None
    if box is None:
        raise SystemExit("write hybrid/pilot8/cu_mouth_box.json {x,y,w,h} after inspecting the base first")
    x, y, bw, bh = box["x"], box["y"], box["w"], box["h"]
    crop = im[y:y + bh, x:x + bw]
    cp = OUT / "cu_crop_base.png"
    cv2.imwrite(str(cp), crop)
    for name, how in cfg["cu"]["variants"].items():
        if (OUT / f"cu_{name}.png").exists():
            continue  # 已锁定（可能经手工收紧窗口）不重锁
        raw = OUT / f"cu_crop_{name}.png"
        ok = codex(raw, (f"Edit image 1, a {bw}x{bh} crop of a painted close-up of a singing woman's lower face. Output exactly "
                         f"{bw}x{bh}. {how}. Every other pixel stays exactly the same: same skin, nose, chin, hair strands, "
                         f"lighting, brushwork and colours. Soft painterly oil rendering identical to image 1. No text."),
                   [cp], f"{bw}x{bh}", 500)
        if not ok:
            continue
        full = im.copy()
        v = cv2.resize(cv2.imread(str(raw)), (bw, bh), interpolation=cv2.INTER_AREA)
        full[y:y + bh, x:x + bw] = v
        fv = OUT / f"cu_full_{name}_raw.png"
        cv2.imwrite(str(fv), full)
        subprocess.run([sys.executable, str(LOCK), str(base), str(fv), str(OUT / f"cu_{name}.png"),
                        "--window", str(x + 20), str(y + 20), str(bw - 40), str(bh - 40),
                        "--threshold", "25", "--margin", "30", "--feather", "8", "--max-area-frac", "0.08"], check=False)
        print("locked", name, flush=True)


if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else "all"
    if step in ("keys", "all"):
        keys()
    if step in ("inb", "all"):
        inbetweens()
    if step in ("cu", "all"):
        cu()
