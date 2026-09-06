#!/usr/bin/env python3
"""DreamActor M2.0 (即梦动作模仿2.0) image+template-video -> driven video.

Feasibility test for driving a non-human subject (cat) with a human template.
Mirrors omnihuman_gen.py: Volcano CV task API via the official volcengine
SDK's VisualService, CVSync2AsyncSubmitTask/CVSync2AsyncGetResult,
req_key=jimeng_dreamactor_m20_gen_video. 2.0 officially supports non-human
(pet) driving, multi-person driving; image via image_urls (array) or
binary_data_base64 (URL mode used here).

Auth: IAM sub-user AccessKey pair (env VOLC_ACCESSKEY / VOLC_SECRETKEY,
dula-story/.env.cv). image_url/video_url must be publicly reachable (upload
via tos_upload.py first).

Usage:
  dream_actor_gen.py --image <url> --video <url> --out out.mp4 \
      [--seed 12345] [--timeout 900]

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

REQ_KEY = "jimeng_dreamactor_m20_gen_video"
AK_ENV = "VOLC_ACCESSKEY"
SK_ENV = "VOLC_SECRETKEY"


class DreamActorError(RuntimeError):
    pass


def _client():
    try:
        from volcengine.visual.VisualService import VisualService
    except ImportError as exc:
        raise DreamActorError(
            "volcengine SDK missing; install into the project venv: "
            "dula-story/.venv/Scripts/python.exe -m pip install volcengine"
        ) from exc
    ak = os.environ.get(AK_ENV, "")
    sk = os.environ.get(SK_ENV, "")
    if not ak or not sk:
        raise DreamActorError(f"{AK_ENV}/{SK_ENV} are not set (IAM sub-user key pair)")
    client = VisualService()
    client.set_ak(ak)
    client.set_sk(sk)
    return client


def submit(client, *, image_url: str, video_url: str, seed: int,
           cut_first_second: bool) -> str:
    form: dict = {
        "req_key": REQ_KEY,
        "image_urls": [image_url],
        "video_url": video_url,
        "seed": seed,
        "cut_result_first_second_switch": cut_first_second,
    }
    resp = client.cv_sync2async_submit_task(form)
    task_id = (resp.get("data") or {}).get("task_id")
    if not task_id:
        raise DreamActorError(f"submit failed: {json.dumps(resp, ensure_ascii=False)[:400]}")
    return task_id


def poll(client, task_id: str, timeout: float, interval: float = 10.0) -> str:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        resp = client.cv_sync2async_get_result({"req_key": REQ_KEY, "task_id": task_id})
        data = resp.get("data") or {}
        status = data.get("status")
        if status == "done":
            video_url = data.get("video_url")
            if not video_url:
                raise DreamActorError(f"task done without video_url: {json.dumps(resp)[:300]}")
            return video_url
        if status in ("not_found", "expired"):
            raise DreamActorError(f"task {status}: {json.dumps(resp)[:300]}")
        time.sleep(interval)
    raise DreamActorError(f"timed out after {timeout}s")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, help="public image URL")
    parser.add_argument("--video", required=True, help="public template video URL")
    parser.add_argument("--out", required=True)
    parser.add_argument("--seed", type=int, default=-1)
    parser.add_argument("--cut-first-second", action="store_true",
                        help="crop the 1s lead-in transition from the result "
                             "(default: keep it -- speech may start at 0s)")
    parser.add_argument("--timeout", type=float, default=900.0)
    args = parser.parse_args()

    try:
        client = _client()
        task_id = submit(client, image_url=args.image, video_url=args.video,
                         seed=args.seed,
                         cut_first_second=args.cut_first_second)
        print(f"submitted task_id={task_id}", flush=True)
        video_url = poll(client, task_id, args.timeout)
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(video_url, timeout=300) as r:
            out.write_bytes(r.read())
        print(f"wrote {out} ({out.stat().st_size} bytes)")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
