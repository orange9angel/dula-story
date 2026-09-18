#!/usr/bin/env python3
"""Doubao music model (AI音乐生成大模型) vocal-song generation, postpaid.

Volcano OpenAPI `imagination` service: GenSongForTime (submit) + QuerySong
(poll), Version 2024-08-12, host open.volcengineapi.com, region cn-beijing.
Postpaid billing: 0.002 CNY/sec of generated audio (30s song ~= 0.06 CNY).

Auth: IAM sub-user AccessKey pair (env VOLC_ACCESSKEY / VOLC_SECRETKEY,
stored in dula-story/.env.cv, gitignored). The sub-user needs the IAM policy
for this product (访问控制 → 权限策略 → 智能美化特效).

Docs: https://www.volcengine.com/docs/84992/2091679

Usage:
  song_gen.py --prompt "轻快俏皮的广告短歌，女声" --duration 30 --out song.wav
  song_gen.py --lyrics-file lyrics.txt --genre Pop --mood 快乐 --gender Female

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
"""

from __future__ import annotations

import argparse
import json
import base64
import os
import sys
import time
import urllib.request
from pathlib import Path

STORY = Path(__file__).resolve().parents[3]
ENV_FILE = STORY / ".env.cv"
ENV_SPEECH = STORY / ".env.speech"

SERVICE = "imagination"
REGION = "cn-beijing"
HOST = "open.volcengineapi.com"
API_VERSION = "2024-08-12"

AK_ENV = "VOLC_ACCESSKEY"
SK_ENV = "VOLC_SECRETKEY"


class SongGenError(RuntimeError):
    pass


def _load_env() -> None:
    wanted = {AK_ENV, SK_ENV, "SONG_RELAY_URL", "SONG_RELAY_TOKEN"}
    for env_file in (ENV_FILE, ENV_SPEECH):
        if not env_file.exists():
            continue
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if key in wanted:
                os.environ[key] = value.strip().strip("\"'")


def _client():
    try:
        from volcengine.ApiInfo import ApiInfo
        from volcengine.Credentials import Credentials
        from volcengine.ServiceInfo import ServiceInfo
        from volcengine.base.Service import Service
    except ImportError as exc:
        raise SongGenError(
            "volcengine SDK missing; install into the project venv: "
            "dula-story/.venv/Scripts/python.exe -m pip install volcengine"
        ) from exc
    ak = os.environ.get(AK_ENV, "")
    sk = os.environ.get(SK_ENV, "")
    if not ak or not sk:
        raise SongGenError(f"{AK_ENV}/{SK_ENV} are not set (IAM sub-user key pair)")
    info = ServiceInfo(HOST, {}, Credentials(ak, sk, SERVICE, REGION), 30, 60,
                       scheme="https")
    apis = {
        "GenSongForTime": ApiInfo("POST", "/",
                                  {"Action": "GenSongForTime", "Version": API_VERSION},
                                  {}, {}),
        "QuerySong": ApiInfo("POST", "/",
                             {"Action": "QuerySong", "Version": API_VERSION},
                             {}, {}),
    }
    return Service(info, apis)


def _call(client, api: str, body: dict) -> dict:
    raw = client.json(api, {}, json.dumps(body, ensure_ascii=False))
    resp = json.loads(raw)
    meta = resp.get("ResponseMetadata") or {}
    if meta.get("Error"):
        raise SongGenError(json.dumps(meta["Error"], ensure_ascii=False))
    return resp


def _find_task_id(resp: dict) -> str:
    stack = [resp]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            for key, value in node.items():
                if key.lower() in ("taskid", "task_id", "songid", "song_id", "id") \
                        and isinstance(value, str) and value:
                    return value
                stack.append(value)
        elif isinstance(node, list):
            stack.extend(node)
    raise SongGenError(f"no task id in submit response: {json.dumps(resp, ensure_ascii=False)}")


def _find_audio_url(resp: dict) -> str | None:
    stack = [resp]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            for key, value in node.items():
                if isinstance(value, str) and value.startswith("http") \
                        and ("url" in key.lower() or value.lower().split("?")[0].endswith((".wav", ".mp3"))):
                    return value
                stack.append(value)
        elif isinstance(node, list):
            stack.extend(node)
    return None


def build_body(*, prompt: str | None, lyrics: str | None, duration: int,
               model_version: str, genre: str | None, mood: str | None,
               gender: str | None, timbre: str | None, fmt: str) -> dict:
    body: dict = {"Duration": duration, "ModelVersion": model_version,
                  "VodFormat": fmt}
    if lyrics:
        body["Lyrics"] = lyrics
    elif prompt:
        body["Prompt"] = prompt
    else:
        raise SongGenError("either --prompt or --lyrics(-file) is required")
    for key, value in (("Genre", genre), ("Mood", mood),
                       ("Gender", gender), ("Timbre", timbre)):
        if value:
            body[key] = value
    return body


def submit(client, *, prompt: str | None, lyrics: str | None, duration: int,
           model_version: str, genre: str | None, mood: str | None,
           gender: str | None, timbre: str | None, fmt: str) -> str:
    body = build_body(prompt=prompt, lyrics=lyrics, duration=duration,
                      model_version=model_version, genre=genre, mood=mood,
                      gender=gender, timbre=timbre, fmt=fmt)
    resp = _call(client, "GenSongForTime", body)
    print(f"[submit] {json.dumps(resp, ensure_ascii=False)[:600]}")
    return _find_task_id(resp)


def generate_via_relay(body: dict, out: Path, timeout: int) -> None:
    """经 veFaaS 中转函数生成（国内 IP），base64 回传避免音频 URL 地域限制。"""
    relay_url = os.environ.get("SONG_RELAY_URL", "")
    if not relay_url:
        raise SongGenError("SONG_RELAY_URL not set (put it in .env.speech)")
    payload = dict(body)
    payload["token"] = os.environ.get("SONG_RELAY_TOKEN", "")
    payload["ReturnBase64"] = True
    print(f"[relay] {relay_url} (submit+poll inside function, may take a while)")
    req = urllib.request.Request(
        relay_url, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        resp = json.loads(r.read().decode("utf-8"))
    if isinstance(resp, dict) and "body" in resp and isinstance(resp["body"], str):
        resp = json.loads(resp["body"])
    if not resp.get("ok"):
        raise SongGenError(f"relay failed: {resp.get('error')}")
    print(f"[task] {resp.get('task_id')}")
    out.parent.mkdir(parents=True, exist_ok=True)
    data = base64.b64decode(resp["base64"])
    out.write_bytes(data)
    print(f"[done] {out} ({out.stat().st_size / 1024:.0f} KB)")


def poll(client, task_id: str, timeout: int) -> dict:
    deadline = time.time() + timeout
    last = ""
    while time.time() < deadline:
        resp = _call(client, "QuerySong", {"TaskID": task_id})
        compact = json.dumps(resp, ensure_ascii=False)
        if compact != last:
            print(f"[poll] {compact[:600]}")
            last = compact
        url = _find_audio_url(resp)
        if url:
            return resp
        status_hint = compact.lower()
        if any(word in status_hint for word in ('"fail', '"error', '"cancel')):
            raise SongGenError(f"task failed: {compact[:600]}")
        time.sleep(5)
    raise SongGenError(f"timeout after {timeout}s waiting for task {task_id}")


def download(url: str, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())
    print(f"[done] {out} ({out.stat().st_size / 1024:.0f} KB)")


def main() -> int:
    ap = argparse.ArgumentParser(description="Doubao vocal-song generation (postpaid)")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--prompt", help="提示词（5-700 中文字符）")
    src.add_argument("--lyrics", help="歌词文本（5-700 中文字符）")
    src.add_argument("--lyrics-file", help="歌词文件路径（UTF-8）")
    ap.add_argument("--duration", type=int, default=30, help="30-240 秒")
    ap.add_argument("--model-version", default="v4.3",
                    choices=["v4.0", "v4.3", "v5.0"])
    ap.add_argument("--genre", help="主曲风，v4.3 最多 3 个逗号分隔")
    ap.add_argument("--mood", help="情绪，v4.3 最多 2 个逗号分隔")
    ap.add_argument("--gender", choices=["Female", "Male"])
    ap.add_argument("--timbre", help="音色，v4.3 最多 3 个逗号分隔")
    ap.add_argument("--format", default="wav", choices=["wav", "mp3"])
    ap.add_argument("--out", required=True, type=Path, help="输出音频路径")
    ap.add_argument("--timeout", type=int, default=600)
    ap.add_argument("--via-relay", action="store_true",
                    help="经 veFaaS 中转函数调用（国内 IP），需 .env.speech 配 SONG_RELAY_URL")
    args = ap.parse_args()

    lyrics = args.lyrics
    if args.lyrics_file:
        lyrics = Path(args.lyrics_file).read_text(encoding="utf-8-sig").strip()

    _load_env()
    if args.via_relay:
        body = build_body(prompt=args.prompt, lyrics=lyrics, duration=args.duration,
                          model_version=args.model_version, genre=args.genre,
                          mood=args.mood, gender=args.gender, timbre=args.timbre,
                          fmt=args.format)
        generate_via_relay(body, args.out, args.timeout)
        return 0
    client = _client()
    task_id = submit(client, prompt=args.prompt, lyrics=lyrics,
                     duration=args.duration, model_version=args.model_version,
                     genre=args.genre, mood=args.mood, gender=args.gender,
                     timbre=args.timbre, fmt=args.format)
    print(f"[task] {task_id}")
    resp = poll(client, task_id, args.timeout)
    url = _find_audio_url(resp)
    if not url:
        raise SongGenError("task finished but no audio url found")
    download(url, args.out)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SongGenError as exc:
        print(f"[error] {exc}", file=sys.stderr)
        sys.exit(1)
