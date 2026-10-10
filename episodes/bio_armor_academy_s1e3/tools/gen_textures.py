#!/usr/bin/env python3
"""craft3d-hybrid：Seedream 文生图纹理/背景板（接进 RuinsDuskScene 的 applyHybrid）。

生成 assets3d/tex/{ground,concrete,steel,tarp,sand,backdrop}.png + 逐文件 source.json。
skip-if-exists；重生成删文件再跑。

用法（dula-story 根目录）：
  set -a && source .env.ark && set +a
  .venv/Scripts/python.exe episodes/bio_armor_academy_s1e2/tools/gen_textures.py
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
OUT = EP / "assets3d/tex"
API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
MODEL = "doubao-seedream-5-0-pro-260628"

JOBS = {
    # 可平铺材质：正俯视/正视 + 均匀光 + 无方向性阴影（贴图纪律，光影归 3D 灯光管）
    "ground": ("1024x1024", "无缝平铺材质贴图：建筑工地潮湿泥土地面正俯视，深棕灰湿泥，"
               "隐约车辙压痕与零星小石子，均匀散射光，无强烈方向性阴影，无文字无人物，"
               "写实材质细节，四方连续可平铺"),
    "concrete": ("1024x1024", "无缝平铺材质贴图：预制混凝土管外壁正视，浅灰米色风化混凝土，"
                 "水渍流痕与细微裂纹，均匀散射光，无强阴影，无文字，写实材质，四方连续"),
    "steel": ("1024x1024", "无缝平铺材质贴图：深色锈蚀钢材梁表面正视，铁锈斑驳的深棕灰金属，"
              "焊点与划痕，均匀散射光，无文字，写实材质细节，四方连续"),
    "tarp": ("1024x1024", "无缝平铺材质贴图：灰绿色工地防尘篷布织物，布料褶皱与泥渍，"
             "均匀散射光，无文字，写实材质，四方连续"),
    "sand": ("1024x1024", "无缝平铺材质贴图：建筑沙堆湿润细沙表面正俯视，暖棕黄细沙夹小砾石，"
             "均匀散射光，无强阴影，无文字，写实材质，四方连续"),
    # 远景背景板（matte painting）：下三分之一暗色楼群轮廓，太阳在左三分处，
    # 地平线在 2/3 高度附近——与场景相机 y≈1.4 的视线匹配
    "backdrop": ("2048x768", "动画电影背景美术宽幅横图：黄昏时分从废弃建筑工地远眺城市住宅天际线，"
                 "金橙色低空渐变到紫罗兰色高空，低垂落日半沉入画面左三分之一处的楼群后方，"
                 "楼群为深紫黑剪影并带零星暖黄窗灯，最右侧远处一座塔吊剪影，"
                 "画面下方约五分之一为近黑的地面轮廓，地平线在整个画面下三分之一附近，"
                 "柔和笔触的日式动画背景画风格，无文字，无人物，无近景物体"),
}


def gen(name: str, size: str, prompt: str) -> bool:
    out = OUT / f"{name}.png"
    if out.exists():
        print(f"skip {name}（已存在）")
        return True
    api_key = os.environ.get("ARK_API_KEY", "")
    if not api_key:
        print("ERROR: ARK_API_KEY 未设置（先 source .env.ark）", file=sys.stderr)
        return False
    payload = {"model": MODEL, "prompt": prompt, "size": size,
               "response_format": "b64_json", "watermark": False, "output_format": "png"}
    req = urllib.request.Request(API_URL, data=json.dumps(payload).encode(),
                                 headers={"Authorization": f"Bearer {api_key}",
                                          "Content-Type": "application/json"})
    import http.client
    body = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                body = json.loads(r.read())
            break
        except http.client.IncompleteRead as exc:
            print(f"WARN {name} 响应截断（{attempt + 1}/3）", file=sys.stderr)
        except urllib.error.HTTPError as exc:
            print(f"FAIL {name}: HTTP {exc.code}: {exc.read().decode()[:300]}", file=sys.stderr)
            return False
    if body is None:
        print(f"FAIL {name}: 响应 3 次截断", file=sys.stderr)
        return False
    data = (body.get("data") or [{}])[0]
    raw = base64.b64decode(data["b64_json"]) if data.get("b64_json") else None
    if raw is None and data.get("url"):
        with urllib.request.urlopen(data["url"], timeout=300) as r:
            raw = r.read()
    if not raw:
        print(f"FAIL {name}: 响应无图像 {str(body)[:200]}", file=sys.stderr)
        return False
    out.write_bytes(raw)
    (OUT / f"{name}.source.json").write_text(json.dumps({
        "provider": "volcano-ark/seedream", "model": MODEL, "size": size,
        "prompt": prompt, "sha256": hashlib.sha256(raw).hexdigest(),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK {name} {len(raw)}B")
    return True


def gen_edit(name: str, base: str, prompt: str, size: str) -> bool:
    """文生图局部编辑（如日轮移除），输出独立文件。"""
    out = OUT / f"{name}.png"
    if out.exists():
        print(f"skip {name}（已存在）")
        return True
    api_key = os.environ.get("ARK_API_KEY", "")
    if not api_key:
        print("ERROR: ARK_API_KEY 未设置", file=sys.stderr)
        return False
    src = (OUT / base).read_bytes()
    payload = {"model": MODEL, "prompt": prompt,
               "image": f"data:image/png;base64,{base64.b64encode(src).decode()}",
               "size": size, "response_format": "b64_json",
               "watermark": False, "output_format": "png"}
    req = urllib.request.Request(API_URL, data=json.dumps(payload).encode(),
                                 headers={"Authorization": f"Bearer {api_key}",
                                          "Content-Type": "application/json"})
    import http.client
    body = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                body = json.loads(r.read())
            break
        except http.client.IncompleteRead:
            print(f"WARN {name} 响应截断（{attempt + 1}/3）", file=sys.stderr)
        except urllib.error.HTTPError as exc:
            print(f"FAIL {name}: HTTP {exc.code}: {exc.read().decode()[:300]}", file=sys.stderr)
            return False
    if body is None:
        return False
    data = (body.get("data") or [{}])[0]
    raw = base64.b64decode(data["b64_json"]) if data.get("b64_json") else None
    if not raw:
        print(f"FAIL {name}: 响应无图像", file=sys.stderr)
        return False
    out.write_bytes(raw)
    (OUT / f"{name}.source.json").write_text(json.dumps({
        "provider": "volcano-ark/seedream", "model": MODEL, "size": size,
        "edit_of": base, "prompt": prompt, "sha256": hashlib.sha256(raw).hexdigest(),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK {name} {len(raw)}B")
    return True


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    fails = sum(0 if gen(n, s, p) else 1 for n, (s, p) in JOBS.items())
    # 无日轮版背景板：太阳改由程序化日轮承担，圆柱绕 4 圈不重复出太阳且横向形变减半
    if not gen_edit("backdrop_nosun", "backdrop.png",
                    "把画面中的太阳和太阳周围的光晕光斑移除，替换为与周围一致的"
                    "黄昏天空渐变和云层，严格保持其他内容（天际线楼群、塔吊、云层、"
                    "色调、画布尺寸）不变", "2048x768"):
        fails += 1
    print(f"done: {len(JOBS) + 1 - fails}/{len(JOBS) + 1}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
