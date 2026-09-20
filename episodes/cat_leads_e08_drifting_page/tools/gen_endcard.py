#!/usr/bin/env python3
"""E08 OP 片尾卡抽卡：火山方舟 Seedream 文生图 ×3（ dusk 河岸 + 漂纸 + 金光）。

走 Ark images/generations（本仓库既有 Seedream 通路，见 e04 tools/seededit_probe.py）；
不带 image 字段即纯文生图。ARK_API_KEY 在 dula-story/.env.ark（task 说的 .env.cv
是旧 CV SDK 的 AK/SK；既有已验证通路是 Ark，优先用它）。

Usage:
  set -a; source ../../.env.ark; set +a   （bash: set -a && source ../../.env.ark && set +a）
  ../../.venv/Scripts/python.exe tools/gen_endcard.py
"""
from __future__ import annotations

import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'volcano/op'
API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
MODEL = "doubao-seedream-5-0-pro-260628"
PROMPT = ("日系治愈动画电影截图，黄昏的河岸：垂柳枝条从画面上方垂落，一张小白画纸漂在河面上"
          "顺流远去，水面反射金色夕阳波光，天空暖橙渐变到淡紫，大量温暖留白，画面里没有人，"
          "没有任何文字、字幕、水印。柔和的电影感光影，细腻手绘质感。")


def gen_one(seed_note: str, out: Path) -> None:
    api_key = os.environ.get("ARK_API_KEY", "")
    if not api_key:
        sys.exit("ARK_API_KEY 未设置（source ../../.env.ark）")
    payload = {
        "model": MODEL,
        "prompt": PROMPT + f"（{seed_note}）",
        "size": "1920x1080",
        "response_format": "b64_json",
        "watermark": False,
    }
    # b64 响应体大，弱网会截断：IncompleteRead 重试 3 次
    import http.client
    import time
    data = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(API_URL, data=json.dumps(payload).encode(),
                                         headers={"Authorization": f"Bearer {api_key}",
                                                  "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=600) as resp:
                data = json.loads(resp.read())
            break
        except http.client.IncompleteRead as e:
            print(f"truncated response, retry {attempt + 1}/3")
            time.sleep(2)
    if data is None:
        raise RuntimeError("response truncated 3 times")
    b64 = data["data"][0]["b64_json"]
    out.write_bytes(base64.b64decode(b64))
    print(f"{out.name} {len(b64) * 3 // 4 // 1024}KB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for i, note in enumerate(["构图甲", "构图乙", "构图丙"], 1):
        out = OUT / f"endcard_{i}.png"
        if out.exists():
            print(f"skip {out.name}")
            continue
        gen_one(note, out)


if __name__ == '__main__':
    main()
