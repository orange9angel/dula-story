#!/usr/bin/env python3
"""Probe: Volcano Seedream image-edit for mouth/eye variant generation (E04).

The established craft is codex local edit + feathered paste-back; qwen/wanx
failed that bar in E02. Seedream (Ark images/generations with an image input)
has never been tested for it. This probe edits ONE pending variant so we can
judge it with the same objective gate (auto_lock diff confinement + visual
check) before deciding whether the remaining 23 variants can leave the codex
quota queue.

Usage:
  set -a && source ../../.env.ark && set +a
  ../../.venv/Scripts/python.exe tools/seededit_probe.py \
    --base assets/keyframes/frame_06.png \
    --edit "只把少女的嘴部改成微张（half-open，唇间露出一点口腔）" \
    --out tmp/seededit_frame_06_half.png
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
DEFAULT_MODEL = "doubao-seedream-5-0-pro-260628"

EDIT_LOCK = ("严格保持其余所有内容逐像素不变：构图、姿势、服装、背景、光影、"
             "画布尺寸。这是对原图的局部像素级编辑，不要整体重渲染，"
             "只允许修改指定区域。")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--edit", required=True, help="局部编辑指令（中文）")
    parser.add_argument("--out", required=True)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--size", default=None, help="WIDTHxHEIGHT；缺省取原图尺寸")
    parser.add_argument("--output-format", default=None, help="png 优先（无损，保住贴回区外的逐像素一致性）")
    args = parser.parse_args(argv)

    api_key = os.environ.get("ARK_API_KEY", "")
    if not api_key:
        print("ERROR: ARK_API_KEY is not set", file=sys.stderr)
        return 2

    base = Path(args.base)
    if args.size:
        size = args.size
    else:
        from PIL import Image
        with Image.open(base) as im:
            size = f"{im.width}x{im.height}"

    payload = {
        "model": args.model,
        "prompt": f"局部编辑这张图：{args.edit}，{EDIT_LOCK}",
        "image": f"data:image/png;base64,{base64.b64encode(base.read_bytes()).decode()}",
        "size": size,
        "response_format": "b64_json",
        "watermark": False,
    }
    if args.output_format:
        payload["output_format"] = args.output_format
    request = urllib.request.Request(
        API_URL, data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}",
                 "Content-Type": "application/json"})
    import http.client
    body = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                body = json.loads(response.read())
            break
        except http.client.IncompleteRead as exc:
            print(f"WARN truncated response (attempt {attempt + 1}/3)", file=sys.stderr)
            if attempt == 2:
                print("ERROR: response truncated 3 times", file=sys.stderr)
                return 1
        except urllib.error.HTTPError as exc:
            print(f"HTTP {exc.code}: {exc.read().decode()[:400]}", file=sys.stderr)
            return 1
    if body is None:
        return 1
    if body.get("error"):
        print(f"ERR {json.dumps(body['error'])[:400]}", file=sys.stderr)
        return 1
    data = (body.get("data") or [{}])[0]
    b64 = data.get("b64_json")
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if b64:
        out.write_bytes(base64.b64decode(b64))
    elif data.get("url"):
        with urllib.request.urlopen(data["url"], timeout=300) as r:
            out.write_bytes(r.read())
    else:
        print(f"ERR no image in response: {str(body)[:300]}", file=sys.stderr)
        return 1
    print(f"wrote {out} ({out.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
