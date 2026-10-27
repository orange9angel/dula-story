#!/usr/bin/env python3
"""眼光圈同图变体批量锁回：faces/raw/<name>.png --锁回--> faces/<name>.png。

纪律（image-lipsync）：codex 局部编辑是全图重渲染，必须用 diff 羽化锁回底图，
保证框外逐像素一致。raw 与底图尺寸不同则先 LANCZOS 缩到底图尺寸。
底图：refs/m07_eye.png。产物旁写 faces/<name>.lock.json（rect/面积比/自检结果）。

用法：
  python lock_eye_variants.py            # 全部未锁的
  python lock_eye_variants.py --only m07_eye_shrink
"""
from __future__ import annotations

import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent              # hybrid/tools
ASSETS = HERE.parent / "assets"                     # hybrid/assets
EP = ASSETS.parents[1]                              # episodes/tomorrow_still_bright
SKILL_SCRIPTS = EP.parents[2] / "dula-skills" / "image-lipsync" / "scripts"

spec = importlib.util.spec_from_file_location("auto_lock_variants", SKILL_SCRIPTS / "auto_lock_variants.py")
alv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(alv)

RAW = ASSETS / "faces" / "raw"
OUT = ASSETS / "faces"
RECTS_FILE = OUT / "rects.json"  # 可选手工窗 {"m07_eye_shrink": [x,y,w,h]}
BASE = ASSETS / "refs" / "m07_eye.png"


def lock_one(name: str, rects: dict) -> bool:
    raw_p, out_p = RAW / f"{name}.png", OUT / f"{name}.png"
    if not raw_p.exists():
        print(f"skip {name}: 无 raw")
        return False
    base = Image.open(BASE).convert("RGBA")
    var = Image.open(raw_p).convert("RGBA")
    if var.size != base.size:
        var = var.resize(base.size, Image.LANCZOS)
    tmp, tmpv = OUT / "_tmp_base.png", OUT / "_tmp_var.png"
    base.save(tmp)
    var.save(tmpv)
    rect = tuple(rects[name]) if name in rects else None
    try:
        res = alv.lock_one(tmp, tmpv, out_p, rect_override=rect)
    finally:
        tmp.unlink(missing_ok=True)
        tmpv.unlink(missing_ok=True)
    meta = {
        "asset": name,
        "base": str(BASE),
        "raw": str(raw_p),
        "lock": res,
        "locked_at": datetime.now(timezone.utc).isoformat(),
    }
    out_p.with_suffix(".lock.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK {name}: {res}")
    return True


def main() -> int:
    only = None
    if "--only" in sys.argv:
        i = sys.argv.index("--only")
        only = sys.argv[i + 1:]
    rects = {}
    if RECTS_FILE.exists():
        rects = json.loads(RECTS_FILE.read_text(encoding="utf-8"))
    names = only or sorted(p.stem for p in RAW.glob("*.png"))
    fails = 0
    for n in names:
        if (OUT / f"{n}.png").exists() and only is None:
            print(f"skip {n}（已锁回）")
            continue
        if not lock_one(n, rects):
            fails += 1
    print(f"done: {len(names) - fails}/{len(names)}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
