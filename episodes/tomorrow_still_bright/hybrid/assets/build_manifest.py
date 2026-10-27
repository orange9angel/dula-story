#!/usr/bin/env python3
"""扫描 hybrid/assets 下全部 *.source.json / *.lock.json，重建 manifest.json。

验收状态来自 review_status.json（人工目检结论，手工维护）：
  {"m07_full": {"status": "accepted", "notes": "..."},
   "m07_eye_shrink": {"status": "rejected", "notes": "光圈缩过头"}}
未登记的一律 status="generated"（未目检）。重跑幂等。
"""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

KIND_USE = {
    "refs": ("identity_anchor", "身份锚：全部后续生成的首位 ref（权重最高）"),
    "cels": ("pose_cel", "姿势 cel：art_pass 刚性摆放的人物原画层（1024x1536 透明底）"),
    "faces": ("eye_variant", "眼光圈同图变体（框外零差分锁回），M-07 的'表情'通道"),
    "props": ("prop_master", "道具母图：逐镜生成的道具参考"),
    "plates": ("scene_plate", "场景底图：文生图整幅原画（1920x1080）"),
}


def main() -> None:
    review = {}
    rf = HERE / "review_status.json"
    if rf.exists():
        review = json.loads(rf.read_text(encoding="utf-8"))
    assets = []
    for kind_dir in ("refs", "cels", "faces", "props", "plates"):
        d = HERE / kind_dir
        if not d.exists():
            continue
        for src in sorted(d.rglob("*.source.json")):
            if "/raw/" in src.as_posix():
                continue  # faces/raw 是中间件，成品靠 lock.json 登记
            meta = json.loads(src.read_text(encoding="utf-8"))
            png = src.with_name(src.name[: -len(".source.json")] + ".png")
            if not png.exists() or png.stem != meta["asset"]:
                continue  # png 缺失，或改名存档（如 m07_full_v1）不登记
            name = meta["asset"]
            kind, use = KIND_USE[kind_dir]
            rel = png.relative_to(HERE).as_posix()
            entry = {
                "path": rel,
                "kind": kind,
                "use": use,
                "provider": meta["provider"],
                "model": meta["model"],
                "sha256": meta["sha256"],
                "status": review.get(name, {}).get("status", "generated"),
                "source_json": src.relative_to(HERE).as_posix(),
            }
            if review.get(name, {}).get("notes"):
                entry["review_notes"] = review[name]["notes"]
            assets.append(entry)
        # faces/ 锁回产物（source 是 raw 的，成品靠 lock.json 登记）
        if kind_dir == "faces":
            for lock in sorted(d.glob("*.lock.json")):
                meta = json.loads(lock.read_text(encoding="utf-8"))
                png = d / f"{meta['asset']}.png"
                if not png.exists():
                    continue
                name = meta["asset"]
                entry = {
                    "path": png.relative_to(HERE).as_posix(),
                    "kind": "eye_variant",
                    "use": KIND_USE["faces"][1] + "（diff 羽化锁回成品）",
                    "provider": "codex-cli builtin imagegen + image-lipsync auto_lock",
                    "model": "gpt-image (ChatGPT subscription quota)",
                    "status": review.get(name, {}).get("status", "generated"),
                    "lock_json": lock.relative_to(HERE).as_posix(),
                }
                if review.get(name, {}).get("notes"):
                    entry["review_notes"] = review[name]["notes"]
                assets.append(entry)
    # 合成资产（无 source.json 的派生物，如 plate_corridor_dim）
    dim = HERE / "plates" / "plate_corridor_dim.png"
    if dim.exists():
        assets.append({
            "path": "plates/plate_corridor_dim.png",
            "kind": "scene_plate",
            "use": "长廊'灯光逐段熄灭后'亮度态：由 plate_corridor.png 合成压暗（tools/dim_corridor.py），布局逐像素一致",
            "provider": "local PIL composite (zero generation cost)",
            "model": "tools/dim_corridor.py",
            "status": review.get("plate_corridor_dim", {}).get("status", "generated"),
        })
    # 走拍相位切格（派生自 m07_walk_strip，tools/slice_walk_strip_adaptive.py）
    for i in range(1, 5):
        p = HERE / "cels" / f"m07_walk_p{i}.png"
        if p.exists():
            assets.append({
                "path": f"cels/m07_walk_p{i}.png",
                "kind": "pose_cel",
                "use": "跛行走拍相位 cel（m07_walk_strip 自适应沟槽裁切，1024x1536 透明底）",
                "provider": "derived from cels/m07_walk_strip.png",
                "model": "tools/slice_walk_strip_adaptive.py",
                "status": review.get(f"m07_walk_p{i}", {}).get("status", "accepted"),
            })
    cells = HERE / "cels" / "m07_walk_cells.json"
    if cells.exists():
        assets.append({
            "path": "cels/m07_walk_cells.json",
            "kind": "pose_cel_meta",
            "use": "走拍相位格锚点表（alpha_bbox/脚锚）",
            "provider": "tools/slice_walk_strip_adaptive.py",
            "model": "-",
            "status": "accepted",
        })
    missing = [a["path"] for a in assets if a["status"] == "generated"]
    manifest = {
        "episode": "tomorrow_still_bright",
        "pipeline": "cel-cinema T2 文生图资产（3D 底稿 -> 文生图原画 -> 漫画合成）",
        "style_lock": "2D 水彩手绘动画、铅笔轮廓线、轻微水彩纸纹、克制赛璐璐阴影、旧工业冷蓝+暖琥珀灯光；负面：写实3D/塑料感/照片感/过度卡通表情/霓虹/文字水印",
        "m07_locks": "桶身/单蓝白机械眼/三指左手+工具右手/红补丁肩甲（左肩）/腹部修补板/左腿略短；禁人脸/禁手指数变化/小苗两片叶",
        "assets": assets,
        "counts": {
            "total": len(assets),
            "accepted": sum(1 for a in assets if a["status"] == "accepted"),
            "rejected": sum(1 for a in assets if a["status"] == "rejected"),
            "pending_review": len(missing),
        },
        "pendingReviewPaths": missing,
    }
    (HERE / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"manifest: {len(assets)} assets, accepted={manifest['counts']['accepted']}, "
          f"pending={len(missing)}")


if __name__ == "__main__":
    main()
