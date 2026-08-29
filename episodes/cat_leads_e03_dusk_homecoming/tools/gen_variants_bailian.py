#!/usr/bin/env python3
"""E02 mouth/eye variant generation via Bailian qwen-image-edit (codex quota
fallback path, replaces tools/gen_variants.sh).

qwen-image-edit keeps composition/identity on full-frame edits but re-renders
every pixel slightly, so locality is enforced structurally: only the measured
feature rect is feather-pasted back onto the pristine base frame. Output goes
straight to assets/{mouth,eye}_variants/<base>_<variant>_locked_v1.png — the
paste-back IS the lock (equivalent to auto_lock_variants.py rect_override).

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
Requires DASHSCOPE_API_KEY.
"""

from __future__ import annotations

import base64
import os
import sys
import urllib.request
from pathlib import Path

import dashscope
from dashscope import MultiModalConversation
from PIL import Image, ImageDraw, ImageFilter

EP = Path(__file__).resolve().parents[1]
A = EP / "assets"
WORKDIR = EP / "tmp" / "qwen_edits"
FEATHER = 6

P_MOUTH_HALF_GIRL = ("只把少女的嘴部改成微张：上下唇微微分开，唇间露出一点深色口腔，"
                     "不露牙齿。保持其它一切不变。")
P_MOUTH_OPEN_GIRL = ("只把少女的嘴部改成自然张开说话的样子，露出深色口腔和一点上排牙齿。"
                     "保持其它一切不变。")
P_MOUTH_HALF_CAT = "只把橘猫的嘴部改成微张，唇间露出一点深色口腔。保持其它一切不变。"
P_MOUTH_OPEN_CAT = "只把橘猫的嘴部改成张开叫唤的样子，露出深色口腔和小舌头。保持其它一切不变。"
P_EYES_GIRL = ("把少女的双眼改成闭合：眼皮垂下盖住眼睛，各成一条向下的细弧线。"
               "保持其它一切不变。")
P_EYES_GIRL_SIDE = ("把少女的眼睛改成闭合：眼皮垂下成一条向下的细弧线。"
                    "保持其它一切不变。")
P_EYES_GIRL_WINK = ("把少女睁着的那只眼睛也改成闭合，两只眼皮都垂下成细弧线。"
                    "保持其它一切不变。")
P_EYES_CAT = ("把橘猫的双眼改成闭合：眼皮垂下盖住绿眼睛，成两条细弧线，"
              "闭合处覆盖橘色毛发。保持其它一切不变。")
P_EYES_CAT_SIDE = ("把橘猫的眼睛改成闭合：眼皮垂下盖住绿眼睛，成一条细弧线，"
                   "闭合处覆盖橘色毛发。保持其它一切不变。")

# (out_dir, base, variant, rect[x, y, w, h], prompt)
JOBS = [
    # ---- girl mouths (entry 2/4/8/11/14 dialogue shots)
    ("mouth_variants", "frame_03", "half", (1112, 165, 52, 42), P_MOUTH_HALF_GIRL),
    ("mouth_variants", "frame_03", "open", (1112, 165, 52, 42), P_MOUTH_OPEN_GIRL),
    ("mouth_variants", "frame_06", "half", (812, 165, 50, 40), P_MOUTH_HALF_GIRL),
    ("mouth_variants", "frame_06", "open", (812, 165, 50, 40), P_MOUTH_OPEN_GIRL),
    ("mouth_variants", "frame_11", "half", (725, 272, 60, 46), P_MOUTH_HALF_GIRL),
    ("mouth_variants", "frame_11", "open", (725, 272, 60, 46), P_MOUTH_OPEN_GIRL),
    ("mouth_variants", "frame_16", "half", (670, 390, 56, 44), P_MOUTH_HALF_GIRL),
    ("mouth_variants", "frame_16", "open", (670, 390, 56, 44), P_MOUTH_OPEN_GIRL),
    # ---- cat mouths (meow shots: windowsill / steps / parapet)
    ("mouth_variants", "frame_02", "half", (990, 375, 75, 52), P_MOUTH_HALF_CAT),
    ("mouth_variants", "frame_02", "open", (990, 375, 75, 52), P_MOUTH_OPEN_CAT),
    ("mouth_variants", "frame_05", "half", (850, 465, 70, 50), P_MOUTH_HALF_CAT),
    ("mouth_variants", "frame_05", "open", (850, 465, 70, 50), P_MOUTH_OPEN_CAT),
    ("mouth_variants", "frame_13", "half", (605, 430, 80, 54), P_MOUTH_HALF_CAT),
    ("mouth_variants", "frame_13", "open", (605, 430, 80, 54), P_MOUTH_OPEN_CAT),
    # ---- girl blink variants
    ("eye_variants", "frame_01", "closed", (505, 190, 130, 65), P_EYES_GIRL_WINK),
    ("eye_variants", "frame_03", "closed", (1085, 118, 100, 55), P_EYES_GIRL),
    ("eye_variants", "frame_06", "closed", (795, 118, 92, 54), P_EYES_GIRL),
    ("eye_variants", "frame_11", "closed", (695, 208, 105, 60), P_EYES_GIRL),
    ("eye_variants", "frame_14", "closed", (490, 285, 105, 55), P_EYES_GIRL),
    ("eye_variants", "frame_16", "closed", (635, 258, 85, 75), P_EYES_GIRL_SIDE),
    # ---- cat blink variants
    ("eye_variants", "frame_02", "closed", (955, 305, 145, 70), P_EYES_CAT),
    ("eye_variants", "frame_05", "closed", (835, 415, 105, 62), P_EYES_CAT),
    ("eye_variants", "frame_10", "closed", (800, 380, 62, 56), P_EYES_CAT_SIDE),
    ("eye_variants", "frame_13", "closed", (570, 370, 155, 65), P_EYES_CAT),
]


def qwen_edit_fullframe(base: Image.Image, prompt: str, stem: str) -> Image.Image:
    WORKDIR.mkdir(parents=True, exist_ok=True)
    src = WORKDIR / f"{stem}_in.png"
    base.save(src)
    b64 = base64.b64encode(src.read_bytes()).decode()
    rsp = MultiModalConversation.call(
        model="qwen-image-edit",
        messages=[{"role": "user", "content": [
            {"image": f"data:image/png;base64,{b64}"},
            {"text": prompt}]}],
    )
    if rsp.status_code != 200:
        raise RuntimeError(f"qwen-image-edit failed: {rsp.code} {rsp.message}")
    url = rsp.output.choices[0].message.content[0]["image"]
    out_path = WORKDIR / f"{stem}_full.png"
    urllib.request.urlretrieve(url, out_path)
    return Image.open(out_path).convert("RGB")


def paste_rect(base: Image.Image, edited: Image.Image, rect: tuple[int, int, int, int]) -> Image.Image:
    if edited.size != base.size:
        edited = edited.resize(base.size, Image.LANCZOS)
    x, y, w, h = rect
    region = edited.crop((x, y, x + w, y + h))
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=min(w, h) // 3, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))
    out = base.copy()
    out.paste(region, (x, y), mask)
    return out


def main() -> None:
    dashscope.api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not dashscope.api_key:
        raise SystemExit("DASHSCOPE_API_KEY not set")
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    for out_dir, base_name, variant, rect, prompt in JOBS:
        stem = f"{base_name}_{variant}"
        if only and stem not in only:
            continue
        out_path = A / out_dir / f"{stem}_locked_v1.png"
        if out_path.exists():
            print(f"skip {stem} (exists)")
            continue
        base = Image.open(A / "keyframes" / f"{base_name}.png").convert("RGB")
        try:
            edited = qwen_edit_fullframe(base, prompt, stem)
            out = paste_rect(base, edited, rect)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out.save(out_path)
            print(f"OK {stem} -> {out_path.name}", flush=True)
        except Exception as exc:  # noqa: BLE001 - continue remaining jobs
            print(f"FAIL {stem}: {exc}", flush=True)
    print("done")


if __name__ == "__main__":
    main()
