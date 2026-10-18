#!/usr/bin/env python3
"""craft3d-hybrid：《星屑战壳》S1E1 晨版纹理集（Seedream 文生图皮肤注入三场景 applyHybrid）。

R14：监制嫌场景太粗糙——柱廊晨景程序化回退/角斗场灰蒙/圣殿裸件。
晨版纪律： albedo 亮暖但不烤方向阴影（光影归 3D 灯光管）；背景板无日盘
（太阳归程序化日轮/灯光），地平线压下 1/3。
生成 assets3d/tex/<name>.png + 逐文件 source.json 溯源（skip-if-exists；重生成删文件再跑）。
Ark b64_json 响应截断必须重试 3 次（hybrid-craft-scene 翻车实录）。

用法（dula-story 根目录）：
  set -a && source .env.ark && set +a
  .venv/Scripts/python.exe episodes/stardust_clad_s1e1/tools/gen_textures.py
"""
from __future__ import annotations

import base64
import hashlib
import http.client
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

_M = "均匀散射光，无强烈方向性阴影，无文字无人物，写实材质细节，四方连续可平铺"
_B = ("地平线在整个画面下三分之一附近，画面下方约五分之一为晨雾中淡出的地面轮廓，"
      "无太阳无月亮（主光源归场景灯光），无文字，无人物，无近景物体，"
      "柔和笔触的日式动画背景画风格")

JOBS = {
    # ── 圣殿（晨）：石板地 / 石材 / 背景板 / R3 祭坛浮雕/石龛/帷幔/铸铁 ──
    "floor": ("1024x1024", "无缝平铺材质贴图：清晨神庙石板地面正俯视，"
              "浅暖灰色大方形石板被晨光微微染暖，板间细缝，隐约磨损与星尘细屑，" + _M),
    "stone": ("1024x1024", "无缝平铺材质贴图：清晨古老神庙石材正视，"
              "浅暖灰色风化石块表面，细微裂纹与凿痕，晨光下偏亮的石质颗粒，" + _M),
    "backdrop": ("2048x768", "动画电影背景美术宽幅横图：清晨的神殿高原远眺，"
                 "淡青瓷蓝到地平线附近暖金色的晨空渐变，低空一条柔和的晨雾带横贯，"
                 "地平线上是远处神殿环廊与立柱的浅灰剪影轮廓（低对比、晨雾柔化、不打灯），" + _B),
    "altar_relief": ("1024x1024", "无缝平铺材质贴图：古老神庙祭坛石材浮雕正视，"
                 "浅暖灰石面上浅浮雕环形灶火图腾与几何回纹带，凹凸刻痕清晰，" + _M),
    "niche_wall": ("1024x1024", "无缝平铺材质贴图：神庙石龛内壁石材正视，"
                   "浅暖灰风化石材带浅雕竖向凹槽与斑驳蚀痕，" + _M),
    "fabric": ("1024x1024", "无缝平铺材质贴图：厚重织物布料正视，"
               "深靛蓝色织纹布料带暗金色织边回纹，织物经纬纹理与细微褶皱起伏，" + _M),
    "cast_iron": ("1024x1024", "无缝平铺材质贴图：古老铸铁锅金属表面正视，"
                  "深灰黑色铸铁肌理带细微锻打斑痕与暗哑金属光泽变化，" + _M),
    # ── 柱廊（晨）：碎石地 / 巨柱石材 / 断口 / 乱石荒原 / 背景板 ──
    "colonnade_ground": ("1024x1024", "无缝平铺材质贴图：清晨旷野碎石地面正俯视，"
                 "亮冷灰带微暖的碎石与砂土混杂，零星小石块，晨尘薄薄，" + _M),
    "colonnade_stone": ("1024x1024", "无缝平铺材质贴图：清晨古迹巨柱石材正视，"
                 "浅暖灰色风化大理石带横向环状柱身凹槽纹与剥蚀斑痕，" + _M),
    "break_face": ("1024x1024", "无缝平铺材质贴图：石柱断裂截面岩石正俯视，"
                   "浅暖灰色粗糙断口肌理带放射状碎裂纹与新鲜断面颗粒感，" + _M),
    "rubble_ground": ("1024x1024", "无缝平铺材质贴图：清晨废墟荒原碎石地面正俯视，"
                 "亮暖灰色大小碎石块与砂砾泥土混杂错落散布，" + _M),
    "backdrop_colonnade": ("2048x768", "动画电影背景美术宽幅横图：清晨废墟旷野远眺，"
                 "淡青瓷蓝晨空渐变到地平线附近的淡金，低空晨雾带柔和横贯，"
                 "地平线上是残破巨柱与倒塌柱段的浅灰剪影轮廓高低错落（低对比、晨雾柔化），" + _B),
    # ── 角斗场（晨）：沙场 / 座席岩块 / 背景板（监制点名 51.5s 帧灰蒙——饱和抬起来）──
    "arena_sand": ("1024x1024", "无缝平铺材质贴图：清晨角斗场细沙地面正俯视，"
                 "暖金黄色细沙饱满有血色，带轻微拖痕与零星小石子，" + _M),
    "arena_rock": ("1024x1024", "无缝平铺材质贴图：清晨角斗场座席风化岩块正视，"
                 "暖赭褐色风化砂岩块面，层理纹与风化剥蚀斑驳，色彩饱和偏暖，" + _M),
    "backdrop_arena": ("2048x768", "动画电影背景美术宽幅横图：清晨露天角斗场远眺，"
                 "淡蓝晨空渐变到地平线附近暖金，地平线上是角斗场环形岩壁座席的暖赭剪影轮廓"
                 "（低对比、晨雾轻笼），" + _B),
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


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    fails = sum(0 if gen(n, s, p) else 1 for n, (s, p) in JOBS.items())
    print(f"done: {len(JOBS) - fails}/{len(JOBS)}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
