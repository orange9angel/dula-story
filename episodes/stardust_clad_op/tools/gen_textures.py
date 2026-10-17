#!/usr/bin/env python3
"""craft3d-hybrid：《星屑战壳》Seedream 文生图纹理/背景板（接进 StardustShrineScene.applyHybrid）。

生成 assets3d/tex/{floor,stone,backdrop}.png + 逐文件 source.json 溯源。
skip-if-exists；重生成删文件再跑。Ark b64_json 响应截断必须重试 3 次。

用法（dula-story 根目录）：
  set -a && source .env.ark && set +a
  .venv/Scripts/python.exe episodes/stardust_clad_op/tools/gen_textures.py
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

JOBS = {
    # 可平铺材质：正俯视 + 均匀散射光 + 无方向性阴影（光影归 3D 灯光管）
    "floor": ("1024x1024", "无缝平铺材质贴图：暗夜色神庙石板地面正俯视，深青灰色大方形石板，"
              "板间细缝，隐约的磨损与星尘细屑，均匀散射光，无强烈方向性阴影，"
              "无文字无人物，写实材质细节，四方连续可平铺"),
    "stone": ("1024x1024", "无缝平铺材质贴图：古老神庙石材正视，青灰色风化石块表面，"
              "细微裂纹与凿痕，均匀散射光，无强阴影，无文字，写实材质，四方连续"),
    # 远景背景板（matte painting）：深夜蓝星空+炊烟状星云带横贯+远处圣殿剪影，
    # 地平线压在下 1/3，无太阳无月亮无文字——主光源是场景里的灶火，不烤进图里
    "backdrop": ("2048x768", "动画电影背景美术宽幅横图：深夜的神殿高原远眺，"
                 "深海军蓝到暗紫罗兰的夜空渐变，一条炊烟般柔和的浅蓝灰星云带横贯画面上半，"
                 "散布细小星点，地平线上是远处神殿环廊与立柱的深色剪影轮廓（低对比、不打灯），"
                 "地平线在整个画面下三分之一附近，画面下方约五分之一为近黑的地面轮廓，"
                 "无太阳无月亮，无文字，无人物，无近景物体，柔和笔触的日式动画背景画风格"),
    # R2 多场景：柱廊旷野（冷色）/ 灶膛火山口（暖色）地面
    "colonnade_ground": ("1024x1024", "无缝平铺材质贴图：寒冷夜色旷野碎石地面正俯视，"
                 "深蓝灰色碎石与砂土混杂，零星小石块，均匀散射光，无强烈方向性阴影，"
                 "无文字无人物，写实材质细节，四方连续可平铺"),
    "caldera_ground": ("1024x1024", "无缝平铺材质贴图：火山口玄武岩地面正俯视，"
                 "深棕黑色冷却熔岩岩石表面，细微龟裂纹路，均匀散射光，无强阴影无发光效果，"
                 "无文字，写实材质，四方连续可平铺"),
    # ── R3 场景丰富化：三场景材质全覆盖 ──
    # 圣殿：祭坛浮雕 / 石龛内壁 / 帷幔布料 / 圣物铸铁
    "altar_relief": ("1024x1024", "无缝平铺材质贴图：古老神庙祭坛石材浮雕正视，"
                 "深青灰石面上浅浮雕环形灶火图腾与几何回纹带，凹凸刻痕清晰，"
                 "均匀散射光，无强烈方向性阴影，无文字无人物，写实材质细节，四方连续可平铺"),
    "niche_wall": ("1024x1024", "无缝平铺材质贴图：神庙石龛内壁石材正视，"
                 "风化深灰石材带浅雕竖向凹槽与斑驳蚀痕，均匀散射光，无强烈方向性阴影，"
                 "无文字无人物，写实材质细节，四方连续可平铺"),
    "fabric": ("1024x1024", "无缝平铺材质贴图：厚重织物布料正视，"
                 "深靛蓝色织纹布料带暗金色织边回纹，织物经纬纹理与细微褶皱起伏，"
                 "均匀散射光，无强烈方向性阴影，无文字无人物，写实布料材质，四方连续可平铺"),
    "cast_iron": ("1024x1024", "无缝平铺材质贴图：古老铸铁锅金属表面正视，"
                 "深灰黑色铸铁肌理带细微锻打斑痕与暗哑金属光泽变化，"
                 "均匀散射光，无强烈方向性阴影，无文字无人物，写实材质，四方连续可平铺"),
    # 柱廊：断柱环纹风化 / 断口截面 / 碎石荒原
    "colonnade_stone": ("1024x1024", "无缝平铺材质贴图：古迹巨柱石材正视，"
                 "冷灰蓝色风化大理石带横向环状柱身凹槽纹与剥蚀斑痕，"
                 "均匀散射光，无强烈方向性阴影，无文字无人物，写实材质，四方连续可平铺"),
    "break_face": ("1024x1024", "无缝平铺材质贴图：石柱断裂截面岩石正俯视，"
                 "灰蓝色粗糙断口肌理带放射状碎裂纹与新鲜断面颗粒感，"
                 "均匀散射光，无强烈方向性阴影，无文字无人物，写实材质，四方连续可平铺"),
    "rubble_ground": ("1024x1024", "无缝平铺材质贴图：废墟荒原碎石地面正俯视，"
                 "灰蓝色大小碎石块与砂砾泥土混杂错落散布，"
                 "均匀散射光，无强烈方向性阴影，无文字无人物，写实材质细节，四方连续可平铺"),
    # 火山口：柱状节理岩壁 / 焦土 / 岩浆表面（亮橙裂纹黑底，作 emissive）
    "basalt_wall": ("1024x1024", "无缝平铺材质贴图：玄武岩柱状节理岩壁正视，"
                 "深棕黑色六边形岩柱紧密竖向排列，柱间暗缝与风化斑驳，"
                 "均匀散射光，无强烈方向性阴影，无文字无人物，写实材质，四方连续可平铺"),
    "scorched_ground": ("1024x1024", "无缝平铺材质贴图：火山焦土地面正俯视，"
                 "炭黑色烧焦土壤与灰烬层，细微干裂纹路与暗红矿物斑点（无发光效果），"
                 "均匀散射光，无强烈方向性阴影，无文字无人物，写实材质，四方连续可平铺"),
    "magma": ("1024x1024", "无缝平铺材质贴图：熔岩岩浆表面正俯视，"
                 "漆黑冷却熔岩硬壳底色上布满明亮橙红色炽热发光裂纹网络，"
                 "裂纹内部亮黄橙色高温熔岩，整体暗黑底亮橙纹对比强烈，"
                 "无文字无人物，四方连续可平铺"),
    # R3 专属背景板（柱廊/火山口不再复用圣殿星空板）：地平线压下 1/3、无日无月
    "backdrop_colonnade": ("2048x768", "动画电影背景美术宽幅横图：寒夜废墟旷野远眺，"
                 "深海军蓝到暗蓝的夜空渐变，一条柔和的浅蓝灰星云带横贯画面上半，"
                 "散布细小星点与一两道流星拖痕，地平线上是残破巨柱与倒塌柱段的深色剪影轮廓"
                 "高低错落（低对比、不打灯），地平线在整个画面下三分之一附近，"
                 "画面下方约五分之一为近黑的碎石荒原地面轮廓，"
                 "无太阳无月亮，无文字，无人物，无近景物体，柔和笔触的日式动画背景画风格"),
    "backdrop_caldera": ("2048x768", "动画电影背景美术宽幅横图：火山群夜景远眺，"
                 "暗红紫到深棕的炽热夜空，厚重烟云被火山口的红光自下而上染成橙红色层次，"
                 "地平线上是连绵火山锥的黑色剪影（个别山口透出微弱红光），"
                 "地平线在整个画面下三分之一附近，画面下方约五分之一为近黑的焦土地面轮廓，"
                 "无太阳无月亮，无文字，无人物，无近景物体，柔和笔触的日式动画背景画风格"),
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
