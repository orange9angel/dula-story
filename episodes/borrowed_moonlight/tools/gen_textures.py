#!/usr/bin/env python3
"""craft3d-hybrid（《借走月光的女孩》P3）：Seedream 文生图纹理/背景板。

生成 assets3d/tex/{snow,woodwall,roof_tile,brass,woodplank,ice_crystal,veil_silk,
mirror_floor,meadow,backdrop_snow,backdrop_spring}.png + 逐文件 source.json。
skip-if-exists；重生成删文件再跑。Ark 图像 API 的 b64_json 体积大会 IncompleteRead，
必须重试 3 次（S1E2 翻车实录）。

用法（dula-story 根目录）：
  set -a && source .env.ark && set +a
  .venv/Scripts/python.exe episodes/borrowed_moonlight/tools/gen_textures.py
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
    # 可平铺材质：正俯视/正视 + 均匀散射光 + 无方向性阴影（光影归 3D 灯光管）
    "snow": ("1024x1024", "无缝平铺材质贴图：新雪覆盖的地面正俯视，细腻雪粒与轻微风蚀波纹，"
             "极浅的蓝白色起伏，均匀散射光，无强烈方向性阴影，无文字无人物，"
             "童话绘本质感，写实材质细节，四方连续可平铺"),
    "woodwall": ("1024x1024", "无缝平铺材质贴图：十九世纪欧洲乡村木屋外墙正视，深棕旧木板"
                 "与横向木梁纹理，风霜磨损痕迹，均匀散射光，无强烈方向性阴影，"
                 "无文字无人物，写实材质，四方连续可平铺"),
    "roof_tile": ("1024x1024", "无缝平铺材质贴图：深黛色板瓦屋顶正俯视，圆弧瓦垄整齐排列，"
                  "瓦面覆薄霜，均匀散射光，无强烈方向性阴影，无文字，写实材质，四方连续可平铺"),
    "brass": ("1024x1024", "无缝平铺材质贴图：旧化黄铜金属表面正视，暗金铜色带铜绿斑驳"
              "与细微划痕，均匀散射光，无强烈方向性阴影，无文字，写实材质，四方连续可平铺"),
    "woodplank": ("1024x1024", "无缝平铺材质贴图：老旧木地板正俯视，暖棕木板纹理与板间缝隙，"
                  "轻微磨损，均匀散射光，无强烈方向性阴影，无文字，写实材质，四方连续可平铺"),
    "ice_crystal": ("1024x1024", "无缝平铺材质贴图：冰晶表面正视，银白霜花结晶纹理，"
                    "柔和冷光细腻反光，均匀散射光，无强烈方向性阴影，无文字，四方连续可平铺"),
    "veil_silk": ("1024x1024", "无缝平铺材质贴图：银白色薄纱绸面料正视，细腻织物纹理"
                  "与柔和垂坠褶皱，月光般冷银色调，均匀散射光，无强烈方向性阴影，"
                  "无文字，四方连续可平铺"),
    "mirror_floor": ("1024x1024", "无缝平铺材质贴图：深色镜面抛光石地板正俯视，近黑的蓝灰"
                     "石面带细微大理石纹与柔和反光，均匀散射光，无强烈方向性阴影，"
                     "无文字，四方连续可平铺"),
    # S05 春皮地面：雪→春渐变时换图不压色（纹理件不二次压色纪律）
    "meadow": ("1024x1024", "无缝平铺材质贴图：早春草地正俯视，嫩绿新草夹零星残雪与小花苞，"
               "均匀散射光，无强烈方向性阴影，无文字无人物，童话绘本质感，四方连续可平铺"),
    # 远景背景板（matte painting）：地平线在画面下三分之一附近；月亮本体不出现——
    # 程序化月轮世界锚定 (14,30,-70)（m06 moon_close 特写锚点），右上只留干净夜空与淡辉光
    "backdrop_snow": ("2048x768", "动画电影背景美术宽幅横图：十九世纪欧洲雪国小镇郊外的午夜，"
                      "深蓝午夜天空由顶部近黑的藏蓝向下渐变到地平线处的钢青色微光，"
                      "画面右上方留出一片干净深邃的夜空（不要出现月亮本体，只有极淡的银蓝色辉光），"
                      "地平线在画面下三分之一附近，远处是积雪覆盖的松林与低矮山丘的深色剪影，"
                      "零星两三点远方农舍的暖黄窗灯，画面最下方约六分之一为近黑的雪地轮廓，"
                      "柔和笔触的童话绘本背景画风格，无文字，无人物，无现代建筑，无霓虹，无近景物体"),
    # S05 春晓天幕：日出金粉，太阳小而低贴在画面左三分之一处的地平线上
    "backdrop_spring": ("2048x768", "动画电影背景美术宽幅横图：十九世纪欧洲乡村的春晓日出，"
                        "金粉色低空渐变到清晨淡蓝的高空，初升太阳小而低、贴在画面左三分之一处的"
                        "地平线上并带柔和金色光晕，地平线在画面下三分之一附近，"
                        "远处是嫩绿原野与发芽树梢的柔和剪影，薄雾，"
                        "画面最下方约六分之一为暗色的地面轮廓，"
                        "柔和笔触的童话绘本背景画风格，无文字，无人物，无现代建筑，无霓虹，无近景物体"),
}


def _post(payload: dict, name: str):
    """Ark 图像 API POST；b64_json 体积大易 IncompleteRead，重试 3 次。"""
    api_key = os.environ.get("ARK_API_KEY", "")
    if not api_key:
        print("ERROR: ARK_API_KEY 未设置（先 source .env.ark）", file=sys.stderr)
        return None
    req = urllib.request.Request(API_URL, data=json.dumps(payload).encode(),
                                 headers={"Authorization": f"Bearer {api_key}",
                                          "Content-Type": "application/json"})
    import http.client
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read())
        except http.client.IncompleteRead:
            print(f"WARN {name} 响应截断（{attempt + 1}/3）", file=sys.stderr)
        except urllib.error.HTTPError as exc:
            print(f"FAIL {name}: HTTP {exc.code}: {exc.read().decode()[:300]}", file=sys.stderr)
            return None
        except urllib.error.URLError as exc:
            print(f"WARN {name} 网络错误（{attempt + 1}/3）: {exc.reason}", file=sys.stderr)
    print(f"FAIL {name}: 响应 3 次截断/网络错误", file=sys.stderr)
    return None


def gen(name: str, size: str, prompt: str) -> bool:
    out = OUT / f"{name}.png"
    if out.exists():
        print(f"skip {name}（已存在）")
        return True
    body = _post({"model": MODEL, "prompt": prompt, "size": size,
                  "response_format": "b64_json", "watermark": False,
                  "output_format": "png"}, name)
    if body is None:
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


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    fails = sum(0 if gen(n, s, p) else 1 for n, (s, p) in JOBS.items())
    print(f"done: {len(JOBS) - fails}/{len(JOBS)}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
