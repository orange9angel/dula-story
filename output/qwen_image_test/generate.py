#!/usr/bin/env python3
"""
DashScope (Bailian) wan2.7-image-pro test: 5-frame anime basketball shooting sequence.

Primary path: ONE sequential-group call (enable_sequential=true, n=5) with the
episode's character_reference.png as identity reference — tests the model's
native multi-frame consistency, which is the whole point of this experiment.
Fallback: per-frame reference-edit calls for any missing frames.

Usage:
  $env:DASHSCOPE_API_KEY="sk-..."     (PowerShell)
  python generate.py                  # generate 5 frames
  python generate.py --video          # frames + 5s mp4 + contact sheet

No third-party deps; stdlib urllib only.
"""

import base64
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

API_BASE = "https://dashscope.aliyuncs.com/api/v1"
ASYNC_GEN_URL = f"{API_BASE}/services/aigc/image-generation/generation"
TASK_URL = f"{API_BASE}/tasks"
MODEL = "wan2.7-image-pro"

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES_DIR = os.path.join(HERE, "frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

REFERENCE = os.path.normpath(os.path.join(
    HERE, "..", "..", "episodes", "anime_girl_basketball_5s",
    "assets", "character_reference.png"))

API_KEY = os.environ.get("DASHSCOPE_API_KEY", "")

POSES = [
    "standing at the free-throw line holding the basketball at hip height, "
    "relaxed ready pose, eyes on the hoop",
    "dipping into the shooting gather: knees bent low, ball dropped to waist "
    "level, body coiled, eyes locked on the hoop",
    "rising into the jump shot: feet just leaving the floor, ball lifted to "
    "chest height, elbow tucked under the ball",
    "at the apex of the jump: ball just released from her fingertips toward "
    "the hoop, both arms extended high, body fully airborne",
    "landing in the follow-through: right wrist snapped down, left hand "
    "settling, eyes tracking the ball's arc toward the hoop",
]

GROUP_PROMPT = (
    "参考图1中的角色，生成同一身份、同一球馆、同一画风、同一机位的投篮动作连续组图，共5张。"
    "角色身份必须前后完全一致：深青色高马尾及肩胛、左鬓两枚金色发夹、琥珀棕色眼睛、"
    "白色无袖球衣配藏青侧条纹和藏青07号、藏青及膝短裤、一只红色腕带、白袜白球鞋。"
    "场景保持一致：空旷的现代室内篮球馆，木地板，午后暖阳从高窗射入，背景可见一只篮架。"
    "画风保持一致：原创精致日式二维动画，干净赛璐璐上色，清晰线稿。"
    "机位保持一致：16:9横构图，全身，平视三分之四正面视角。"
    "动作序列："
    "第一张：她站在罚球线，双手持球于髋部高度，放松准备姿势，注视篮筐；"
    "第二张：她屈膝下沉蓄力，球降到腰部高度，身体收紧；"
    "第三张：她起跳，双脚刚离地，球举到胸前，肘部内收；"
    "第四张：她在腾空顶点，球刚从指尖拨出飞向篮筐，双臂高举；"
    "第五张：她落地保持跟随动作，右手腕下压，目光追随球的弧线。"
    "每张恰好一个橙色篮球。避免：多余人物、多余肢体、文字、水印、写实风、3D渲染。"
)

EDIT_INSTRUCTION = (
    "保持图1中完全相同的女孩：相同的面孔、相同的发型和发夹、相同的07号球衣、"
    "相同的球馆、相同的光线和赛璐璐画风、相同的机位和构图。"
    "只改变她的姿势和篮球位置：{pose}。"
)


def encode_image(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode("ascii")


def http_json(url, payload=None, headers=None, timeout=120):
    req_headers = {"Authorization": f"Bearer {API_KEY}",
                   "Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=req_headers,
                                 method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} from {url}: {body}")


def download(url, path):
    with urllib.request.urlopen(url, timeout=180) as resp, open(path, "wb") as f:
        f.write(resp.read())


def run_async_task(content, parameters, label):
    payload = {
        "model": MODEL,
        "input": {"messages": [{"role": "user", "content": content}]},
        "parameters": parameters,
    }
    rsp = http_json(ASYNC_GEN_URL, payload,
                    headers={"X-DashScope-Async": "enable"})
    if "code" in rsp and rsp["code"]:
        raise RuntimeError(f"{label}: create failed: "
                           f"{json.dumps(rsp, ensure_ascii=False)}")
    task_id = rsp["output"]["task_id"]
    print(f"  {label}: task {task_id} submitted", flush=True)
    for _ in range(120):
        time.sleep(5)
        st = http_json(f"{TASK_URL}/{task_id}")
        out = st["output"]
        status = out["task_status"]
        if status == "SUCCEEDED":
            urls = []
            for choice in out.get("choices") or []:
                for c in choice["message"]["content"]:
                    if c.get("type") == "image" or "image" in c:
                        urls.append(c["image"])
            print(f"  {label}: SUCCEEDED, {len(urls)} image(s)", flush=True)
            return urls
        if status in ("FAILED", "CANCELED", "UNKNOWN"):
            raise RuntimeError(f"{label}: task {status}: "
                               f"{json.dumps(st, ensure_ascii=False)}")
    raise RuntimeError(f"{label}: task timed out")


def generate_frames():
    if not os.path.exists(REFERENCE):
        raise SystemExit(f"reference image not found: {REFERENCE}")
    ref_b64 = encode_image(REFERENCE)

    existing = [i for i in range(1, 6)
                if os.path.exists(os.path.join(FRAMES_DIR, f"frame_{i:02d}.png"))]
    if len(existing) == 5:
        print("all 5 frames exist, skip generation")
        return

    # --- primary: one sequential-group call for all 5 frames
    try:
        print("[group] sequential generation, n=5, with identity reference ...",
              flush=True)
        urls = run_async_task(
            content=[{"image": ref_b64}, {"text": GROUP_PROMPT}],
            parameters={"enable_sequential": True, "n": 5, "size": "2K",
                        "watermark": False},
            label="group")
        if len(urls) < 5:
            print(f"  group returned only {len(urls)} images, "
                  f"will top up with per-frame edits", flush=True)
        for i, url in enumerate(urls[:5], start=1):
            download(url, os.path.join(FRAMES_DIR, f"frame_{i:02d}.png"))
            print(f"  -> frame_{i:02d}.png", flush=True)
    except Exception as e:
        print(f"  group generation failed: {e}", flush=True)

    # --- fallback: per-frame reference edit for missing frames
    ref_for_edit = os.path.join(FRAMES_DIR, "frame_01.png")
    for i in range(1, 6):
        out = os.path.join(FRAMES_DIR, f"frame_{i:02d}.png")
        if os.path.exists(out):
            continue
        print(f"[edit] frame {i}/5 ...", flush=True)
        if os.path.exists(ref_for_edit):
            content = [{"image": encode_image(ref_for_edit)},
                       {"text": EDIT_INSTRUCTION.format(pose=POSES[i - 1])}]
        else:
            content = [{"image": ref_b64},
                       {"text": EDIT_INSTRUCTION.format(pose=POSES[i - 1])}]
        urls = run_async_task(content=content,
                              parameters={"n": 1, "size": "2K",
                                          "watermark": False},
                              label=f"frame_{i:02d}")
        if urls:
            download(urls[0], out)
            print(f"  -> {out}", flush=True)


def make_video():
    frames = [os.path.join(FRAMES_DIR, f"frame_{i:02d}.png") for i in range(1, 6)]
    missing = [f for f in frames if not os.path.exists(f)]
    if missing:
        raise SystemExit(f"missing frames: {missing}")

    sheet = os.path.join(HERE, "contact_sheet.png")
    subprocess.run([
        "ffmpeg", "-y",
        *[arg for f in frames for arg in ("-i", f)],
        "-filter_complex",
        "concat=n=5:v=1:a=0,scale=640:-1,tile=5x1[v]",
        "-map", "[v]", "-frames:v", "1", sheet,
    ], check=True)
    print(f"contact sheet -> {sheet}")

    video = os.path.join(HERE, "wan27_test_5s.mp4")
    subprocess.run([
        "ffmpeg", "-y",
        "-framerate", "1", "-i", os.path.join(FRAMES_DIR, "frame_%02d.png"),
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,"
               "pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-r", "30", "-c:v", "libx264", "-crf", "18",
        video,
    ], check=True)
    print(f"video -> {video}")


if __name__ == "__main__":
    if not API_KEY:
        raise SystemExit("DASHSCOPE_API_KEY is not set.")
    generate_frames()
    if "--video" in sys.argv:
        make_video()
    print("done.")
