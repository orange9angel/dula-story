#!/usr/bin/env python3
"""脸部同图变体批量锁回：faces/raw/<name>.png --锁回--> faces/<name>.png。

纪律（image-lipsync）：codex 局部编辑是全图重渲染，必须用 diff 羽化锁回底图，
保证框外逐像素一致。raw 与底图尺寸不同则先 LANCZOS 缩到底图尺寸。
每角色底图：refs/<char>_face.png。
产物旁写 faces/<name>.lock.json（rect/面积比/自检结果）。

用法：
  python lock_face_variants.py            # 全部未锁的
  python lock_face_variants.py --only eileen_blink
"""
from __future__ import annotations

import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent            # hybrid/tools
ASSETS = HERE.parent / "assets"                   # hybrid/assets
EP = ASSETS.parents[1]                             # episodes/borrowed_moonlight
SKILL_SCRIPTS = EP.parents[2] / "dula-skills" / "image-lipsync" / "scripts"

spec = importlib.util.spec_from_file_location("auto_lock_variants", SKILL_SCRIPTS / "auto_lock_variants.py")
alv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(alv)

RAW = ASSETS / "faces" / "raw"
OUT = ASSETS / "faces"
# 可选手工窗：faces/rects.json {"eileen_blink": [x,y,w,h], ...} —— codex 重渲染噪点
# 撑大自动 diff 框时用（"贴回框收紧到特征本身"）。
RECTS_FILE = OUT / "rects.json"

BASES = {
    "eileen": ASSETS / "refs" / "eileen_face.png",
    "alder": ASSETS / "refs" / "alder_face.png",
    "ladymoon": ASSETS / "refs" / "ladymoon_face.png",
}


def lock_one(name: str, rects: dict) -> bool:
    char = name.split("_", 1)[0]
    base_p, raw_p = BASES[char], RAW / f"{name}.png"
    out_p = OUT / f"{name}.png"
    if not raw_p.exists():
        print(f"skip {name}: 无 raw")
        return False
    base = Image.open(base_p).convert("RGBA")
    var = Image.open(raw_p).convert("RGBA")
    if var.size != base.size:
        var = var.resize(base.size, Image.LANCZOS)
    tmp = OUT / "_tmp_base.png"
    tmpv = OUT / "_tmp_var.png"
    base.save(tmp)
    var.save(tmpv)
    rect = tuple(rects[name]) if name in rects else None
    try:
        res = alv.lock_one(tmp, tmpv, out_p, rect_override=rect)
    finally:
        tmp.unlink(missing_ok=True)
        tmpv.unlink(missing_ok=True)
    (OUT / f"{name}.lock.json").write_text(json.dumps({
        "asset": name, "base": str(base_p), "raw": str(raw_p), "rect": rect,
        "lock_result": res, "locked_at": datetime.now(timezone.utc).isoformat(),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
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
        try:
            if not lock_one(n, rects):
                fails += 1
        except Exception as e:  # noqa: BLE001 - 逐个报告继续
            print(f"FAIL {n}: {e}", file=sys.stderr)
            fails += 1
    print(f"done: {len(names) - fails}/{len(names)}")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
