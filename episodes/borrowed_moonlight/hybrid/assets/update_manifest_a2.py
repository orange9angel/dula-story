#!/usr/bin/env python3
"""把 A2 产物（cels/、cels/walk/、faces/）登记进 hybrid/assets/manifest.json。

幂等：按 path 去重覆盖；仅登记有对应 .source.json（生成类）或 .lock.json（锁回类）
的产物。相位裁格（cels/walk/*_pN.png）引用其 strip 的 source.json。
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"

KINDS = {
    "cels/walk": ("walk_phase", "走拍相位画：整拍冻结逐相位换画（atlas/逐格摆放）"),
    "cels": ("pose_cel", "姿势 cel：art_pass 刚性摆放的人物原画层（1024x1536 透明底）"),
    "faces": ("face_variant", "表情/嘴/眼同图变体：codex 局部编辑+diff 羽化锁回（框外零差分）"),
}


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main() -> int:
    mf = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assets = {a["path"]: a for a in mf["assets"]}
    added = 0
    for sub in ("cels/walk", "cels", "faces"):
        for png in sorted((HERE / sub).glob("*.png")):
            rel = f"{sub}/{png.name}"
            if rel in assets or "_grid" in png.stem:
                continue
            kind, use = KINDS[sub]
            src = png.with_suffix(".source.json")
            entry = {"path": rel, "kind": kind, "use": use,
                     "provider": "codex-cli builtin imagegen",
                     "model": "gpt-image (ChatGPT subscription quota)",
                     "sha256": sha256(png), "status": "accepted"}
            if src.exists():
                entry["source_json"] = f"{sub}/{src.name}"
            lock = png.with_suffix(".lock.json")
            if lock.exists():
                entry["lock_json"] = f"{sub}/{lock.name}"
            if sub == "cels/walk" and "_p" in png.stem:
                strip = png.parent / (png.stem.rsplit("_p", 1)[0] + "_strip.source.json")
                if strip.exists():
                    entry["source_json"] = f"{sub}/{strip.name}"
            assets[rel] = entry
            added += 1
    mf["assets"] = sorted(assets.values(), key=lambda a: a["path"])
    MANIFEST.write_text(json.dumps(mf, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"manifest: {len(mf['assets'])} assets (+{added})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
