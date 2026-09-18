#!/usr/bin/env python3
"""veFaaS 云函数：豆包音乐模型（imagination/GenSongForTime）国内 IP 中转。

背景：AI 音乐生成产品限制海外 IP（错误码 100011 ServerIpLimit），海外开发机
无法直连。本函数部署在火山引擎 veFaaS 国内地域，出口 IP 天然国内，替本地
song_gen.py 完成 提交→轮询→返回音频地址 的全过程。

零依赖（纯标准库，手写火山 V4 签名，与 volcengine SDK SignerV4 对齐），
Python 3.9+ 运行时直接可用，无需安装任何包。

环境变量（在 veFaaS 函数配置里设置）：
  VOLC_ACCESSKEY   IAM 子账号 AK（需 ImaginationFullAccess）
  VOLC_SECRETKEY   对应 SK
  RELAY_TOKEN      自造的共享密钥，防陌生人蹭用触发器 URL

HTTP 触发器请求体（JSON）：
  {
    "token": "<RELAY_TOKEN>",
    "Lyrics": "...",            # 或 "Prompt": "..."，与官方参数一致
    "Duration": 30,             # 30-240
    "ModelVersion": "v4.3",     # 可选
    "Genre"/"Mood"/"Gender"/"Timbre": ...,  # 可选
    "VodFormat": "wav",         # 可选
    "ReturnBase64": false       # 可选：true 时函数内下载音频并 base64 返回
  }

响应：
  成功 {"ok": true, "task_id": "...", "url": "https://..."}
       或 {"ok": true, "task_id": "...", "base64": "...", "format": "wav"}
  失败 {"ok": false, "error": "..."}

部署要点：函数超时设为 600 秒，内存 256MB，HTTP 触发器（鉴权方式任意，
RELAY_TOKEN 自带防蹭）。触发器 URL 配到本地 .env.speech 的 SONG_RELAY_URL。
"""

import base64
import hashlib
import hmac
import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

HOST = "open.volcengineapi.com"
SERVICE = "imagination"
REGION = "cn-beijing"
API_VERSION = "2024-08-12"

AK = os.environ.get("VOLC_ACCESSKEY", "")
SK = os.environ.get("VOLC_SECRETKEY", "")
RELAY_TOKEN = os.environ.get("RELAY_TOKEN", "")

RELAY_VERSION = "rv4"

POLL_INTERVAL = 5
POLL_TIMEOUT = 480


def _norm_query(params):
    parts = []
    for key in sorted(params):
        parts.append("%s=%s" % (urllib.parse.quote(key, safe="-_.~"),
                                urllib.parse.quote(str(params[key]), safe="-_.~")))
    return "&".join(parts)


def _signed_request(method, action, payload, extra_query=None):
    if method == "GET":
        body = b""
    else:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    xdate = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    date8 = xdate[:8]
    body_hash = hashlib.sha256(body).hexdigest()

    query = {"Action": action, "Version": API_VERSION}
    if extra_query:
        query.update(extra_query)

    signed = {
        "host": HOST,
        "x-content-sha256": body_hash,
        "x-date": xdate,
    }
    headers = {
        "Host": HOST,
        "X-Date": xdate,
        "X-Content-Sha256": body_hash,
    }
    if method != "GET":
        signed["content-type"] = "application/json"
        headers["Content-Type"] = "application/json"
    signed_str = "".join("%s:%s\n" % (k, signed[k]) for k in sorted(signed))
    signed_headers = ";".join(sorted(signed))
    canonical = "\n".join([method, "/", _norm_query(query),
                           signed_str, signed_headers, body_hash])
    scope = "%s/%s/%s/request" % (date8, REGION, SERVICE)
    string_to_sign = "\n".join(["HMAC-SHA256", xdate, scope,
                                hashlib.sha256(canonical.encode("utf-8")).hexdigest()])

    key = SK.encode("utf-8")
    for msg in (date8, REGION, SERVICE):
        key = hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()
    key = hmac.new(key, b"request", hashlib.sha256).digest()
    signature = hmac.new(key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    headers["Authorization"] = ("HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s"
                                % (AK, scope, signed_headers, signature))
    url = "https://%s/?%s" % (HOST, _norm_query(query))
    req = urllib.request.Request(url, data=(body or None), headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _check_error(resp):
    err = (resp.get("ResponseMetadata") or {}).get("Error")
    if err:
        raise RuntimeError(json.dumps(err, ensure_ascii=False))


def _find(node, pred):
    stack = [node]
    while stack:
        cur = stack.pop()
        if isinstance(cur, dict):
            for k, v in cur.items():
                r = pred(k, v)
                if r:
                    return r
                stack.append(v)
        elif isinstance(cur, list):
            stack.extend(cur)
    return None


def _find_task_id(resp):
    tid = _find(resp, lambda k, v: v if k.lower() in (
        "taskid", "task_id", "songid", "song_id", "id") and isinstance(v, str) and v else None)
    if not tid:
        raise RuntimeError("no task id in submit response: %s" % json.dumps(resp, ensure_ascii=False))
    return tid


def _find_audio_url(resp):
    return _find(resp, lambda k, v: v if isinstance(v, str) and v.startswith("http") and (
        "url" in k.lower() or v.lower().split("?")[0].endswith((".wav", ".mp3"))) else None)


def _query_song(task_id):
    """QuerySong 参数绑定实测摸索：name × (POST query / POST body / GET query)，全量回报错误。"""
    attempts = []
    for key in ("TaskID", "TaskId", "task_id", "Id"):
        for mode in ("post_query", "post_body", "get_query"):
            try:
                if mode == "post_query":
                    resp = _signed_request("POST", "QuerySong", {}, {key: task_id})
                elif mode == "post_body":
                    resp = _signed_request("POST", "QuerySong", {key: task_id})
                else:
                    resp = _signed_request("GET", "QuerySong", {}, {key: task_id})
                _check_error(resp)
                return resp
            except Exception as exc:
                attempts.append("%s@%s: %s" % (key, mode, exc))
    raise RuntimeError("all QuerySong attempts failed: " + " | ".join(attempts))


def _run(payload):
    want_b64 = bool(payload.pop("ReturnBase64", False))
    submit = _signed_request("POST", "GenSongForTime", payload)
    _check_error(submit)
    task_id = _find_task_id(submit)

    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        result = _query_song(task_id)
        url = _find_audio_url(result)
        if url:
            out = {"ok": True, "task_id": task_id, "url": url}
            if want_b64:
                with urllib.request.urlopen(url, timeout=120) as r:
                    data = r.read()
                out = {"ok": True, "task_id": task_id,
                       "base64": base64.b64encode(data).decode("ascii"),
                       "format": payload.get("VodFormat", "wav")}
            return out
        time.sleep(POLL_INTERVAL)
    raise RuntimeError("timeout waiting for task %s" % task_id)


def handler(event, context):
    try:
        if isinstance(event, (str, bytes)):
            event = json.loads(event)
        body = event.get("body", event)
        if isinstance(body, (str, bytes)):
            body = json.loads(body)

        if not AK or not SK:
            raise RuntimeError("function env VOLC_ACCESSKEY/VOLC_SECRETKEY not set")
        if RELAY_TOKEN and body.pop("token", None) != RELAY_TOKEN:
            raise RuntimeError("bad relay token")
        if not body.get("Lyrics") and not body.get("Prompt"):
            raise RuntimeError("Lyrics or Prompt is required")

        result = _run(body)
        result["rv"] = RELAY_VERSION
        return {"statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(result, ensure_ascii=False)}
    except Exception as exc:
        return {"statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"ok": False, "error": str(exc), "rv": RELAY_VERSION},
                                   ensure_ascii=False)}
