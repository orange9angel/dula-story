#!/usr/bin/env python3
"""中全景口型核对修正：两句之间换气（33.39–33.74s，诺娅分轨实测无声）时，画面里诺娅的嘴不能还张着。
做法：在宫格原图里定位诺娅（左侧人物）脸部 → 裁区放大 4 倍 → codex 局部改闭口微笑 → 缩回 → 羽化锁回宫格。
用法（剧集目录）：python tools/fix_wide_mouth.py  ——处理 p1 第二张宫格第 4 格及其 qa/i1/qb 同格。"""
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

EP = Path(__file__).resolve().parents[1]
SK = EP.parents[2] / "dula-skills"
GEN = SK / "build-continuous-story-images/scripts/gen_image_codex.py"
P8 = EP / "hybrid/pilot8"
WORK = P8 / "v3/mouthfix"
WORK.mkdir(parents=True, exist_ok=True)
TARGETS = [(P8 / "v2/p1_k1.png", 3), (P8 / "v3/p1_qa.png", 3), (P8 / "v2/p1_i1.png", 3), (P8 / "v3/p1_qb.png", 3)]
UP = 4

for sheet, cell in TARGETS:
    im = cv2.imread(str(sheet), cv2.IMREAD_UNCHANGED)
    ch, cw = im.shape[0] // 2, im.shape[1] // 2
    ox, oy = (cell % 2) * cw, (cell // 2) * ch
    a = im[oy:oy + ch, ox:ox + cw, 3] > 96
    cols = np.where(a.any(axis=0))[0]
    left = a[:, :cols.min() + int((cols.max() - cols.min()) * 0.45)]
    top = np.where(left.any(axis=1))[0].min()                    # 诺娅头顶
    hcols = np.where(left[top:top + 30].any(axis=0))[0]
    hx = int(hcols.mean())
    fh = int((np.where(a.any(axis=1))[0].max() - top) * 0.13)    # 头高约为身高 13%
    x0, y0 = ox + hx - fh + int(fh * 0.6), oy + top + int(fh * 0.25)   # 三分之四侧脸朝右：脸心在头顶列右侧
    box = (x0, y0, 2 * fh, int(fh * 1.3))
    x, y, w, h = box
    crop = im[y:y + h, x:x + w, :3]
    big = cv2.resize(crop, (w * UP, h * UP), interpolation=cv2.INTER_CUBIC)
    tag = f"{sheet.stem}_c{cell}"
    src = WORK / f"{tag}_src.png"
    cv2.imwrite(str(src), big)
    out = WORK / f"{tag}_edit.png"
    if "--dry" in sys.argv:
        continue
    if not out.exists():
        prompt = (f"Edit image 1, an enlarged crop of a small painted face of a curly-haired woman seen in three-quarter view. "
                  f"Output exactly {w * UP}x{h * UP}. Only the mouth changes: her lips are gently CLOSED in a soft warm smile, "
                  f"as she breathes between sung phrases. Every other pixel stays exactly the same: eyes, nose, hair, skin, light, "
                  f"colours and brushwork. No text.")
        r = subprocess.run([sys.executable, str(GEN), "--out", str(out), "--ref", str(src), "--prompt", prompt,
                            "--size", f"{w * UP}x{h * UP}", "--timeout", "500"], capture_output=True, text=True,
                           stdin=subprocess.DEVNULL)
        print(("ok " if r.returncode == 0 else "FAIL ") + tag, flush=True)
        if r.returncode:
            continue
    ed = cv2.resize(cv2.imread(str(out)), (w, h), interpolation=cv2.INTER_AREA).astype(np.float32)
    # 只锁回下半脸：嘴部椭圆羽化遮罩，框外逐像素不变
    m = np.zeros((h, w), np.float32)
    cv2.ellipse(m, (w // 2 + int(w * .08), int(h * .62)), (int(w * .26), int(h * .16)), 0, 0, 360, 1, -1)
    m = cv2.GaussianBlur(m, (0, 0), max(1.0, w / 40))[..., None]
    res = im.copy()
    base = res[y:y + h, x:x + w, :3].astype(np.float32)
    res[y:y + h, x:x + w, :3] = np.clip(base * (1 - m) + ed * m, 0, 255).astype(np.uint8)
    bak = sheet.with_name(sheet.stem + "_premouthfix.png")
    if not bak.exists():
        cv2.imwrite(str(bak), im)
    cv2.imwrite(str(sheet), res)
    cv2.imwrite(str(WORK / f"{tag}_check.png"),
                np.hstack([cv2.resize(im[y:y + h, x:x + w, :3], (w * 4, h * 4), interpolation=cv2.INTER_NEAREST),
                           cv2.resize(res[y:y + h, x:x + w, :3], (w * 4, h * 4), interpolation=cv2.INTER_NEAREST)]))
    print("locked", tag, box, flush=True)
