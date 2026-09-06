#!/usr/bin/env python3
"""Seedance 2.5 (doubao-seedance-2-5-260628) omni-reference video generation.

Adds what gen_i2v_seedance.py lacks: reference_audio input (image+audio ->
talking-person video). Content roles follow the 2.5 docs
(docs.volcengine.com/docs/82379/2607688): reference_image / reference_audio.
Images may be local files (sent as base64 data URIs); audio must be a public
URL (upload via tos_upload.py first).

  gen_seedance25.py --out out.mp4 --prompt "..." \
      [--ref img.png]... [--audio-url https://...] \
      [--model doubao-seedance-2-5-260628] [--resolution 720p] \
      [--duration 4] [--ratio 16:9] [--silent] [--seed N] [--retries 2]

Requires ARK_API_KEY (.env.ark). Stdlib only.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
DEFAULT_MODEL = "doubao-seedance-2-5-260628"

TOKEN_PRICES = [
    ("doubao-seedance-2-5", 60.0),  # 刊例待核，估 2.0 (46) 之上
    ("doubao-seedance-2-0", 46.0),
]


def encode_image(path: Path) -> str:
    mime = "image/jpeg" if path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def http_json(url: str, api_key: str, payload: dict | None = None,
              timeout: int = 120) -> dict:
    headers = {"Authorization": f"Bearer {api_key}",
               "Content-Type": "application/json"}
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=data, headers=headers,
                                     method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} from Ark: {body}") from exc


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", required=True)
    p.add_argument("--prompt", required=True)
    p.add_argument("--ref", action="append", default=[],
                   help="reference image (repeatable, local file)")
    p.add_argument("--audio-url", action="append", default=[],
                   help="reference audio PUBLIC URL (repeatable); upload via tos_upload.py")
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--resolution", default="720p")
    p.add_argument("--duration", type=int, default=4)
    p.add_argument("--ratio", default="16:9")
    p.add_argument("--silent", action="store_true",
                   help="generate_audio=false (default: true -- talking shots need sound)")
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--retries", type=int, default=2)
    p.add_argument("--poll-interval", type=float, default=20.0)
    p.add_argument("--timeout", type=float, default=1200.0)
    args = p.parse_args()

    api_key = os.environ.get("ARK_API_KEY", "")
    if not api_key:
        p.error("ARK_API_KEY is not set (set -a && source ../../.env.ark)")
    base_url = os.environ.get("ARK_BASE_URL", DEFAULT_BASE_URL)

    content: list[dict] = [{"type": "text", "text": args.prompt}]
    for ref in args.ref:
        path = Path(ref)
        if not path.is_file():
            p.error(f"reference image missing: {ref}")
        content.append({"type": "image_url",
                        "image_url": {"url": encode_image(path)},
                        "role": "reference_image"})
    for url in args.audio_url:
        content.append({"type": "audio_url",
                        "audio_url": {"url": url},
                        "role": "reference_audio"})
    if len(content) < 2:
        p.error("need at least one --ref or --audio-url (omni-reference mode)")

    parameters: dict = {
        "resolution": args.resolution,
        "duration": args.duration,
        "ratio": args.ratio,
        "watermark": False,
        "generate_audio": not args.silent,
    }
    if args.seed is not None:
        parameters["seed"] = args.seed

    label = Path(args.out).stem
    task_id = video_url = None
    usage: dict = {}
    last_error: Exception | None = None
    for attempt in range(1, max(1, args.retries) + 1):
        try:
            resp = http_json(f"{base_url}/contents/generations/tasks", api_key,
                             {"model": args.model, "content": content, **parameters})
            task_id = resp.get("id")
            if not task_id:
                raise RuntimeError(f"create failed: {json.dumps(resp, ensure_ascii=False)}")
            print(f"{label}: submitted task {task_id}", flush=True)
            deadline = time.monotonic() + args.timeout
            while time.monotonic() < deadline:
                time.sleep(args.poll_interval)
                status = http_json(
                    f"{base_url}/contents/generations/tasks/{task_id}", api_key)
                state = status.get("status")
                if state == "succeeded":
                    video_url = (status.get("content") or {}).get("video_url")
                    usage = status.get("usage") or {}
                    if not video_url:
                        raise RuntimeError("succeeded without video_url")
                    break
                if state in {"failed", "cancelled", "expired"}:
                    raise RuntimeError(
                        f"task {state}: {json.dumps(status, ensure_ascii=False)}")
                print(f"{label}: {state} ...", flush=True)
            else:
                raise RuntimeError(f"timed out after {args.timeout:.0f}s")
            last_error = None
            break
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            print(f"{label}: attempt {attempt} failed: {exc}", file=sys.stderr, flush=True)
    if last_error is not None:
        return 1

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(video_url, timeout=300) as r:
        out.write_bytes(r.read())
    cost = None
    tokens = usage.get("completion_tokens")
    if tokens:
        for prefix, price in TOKEN_PRICES:
            if args.model.startswith(prefix):
                cost = round(tokens / 1_000_000 * price, 4)
                break
    print(json.dumps({"out": str(out), "model": args.model, "taskId": task_id,
                      "usage": usage, "estimatedCostCny": cost},
                     ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
