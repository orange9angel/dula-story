#!/usr/bin/env python3
"""Regenerate the bad E02 qwen variants with stronger prompts.

V1 failures (user review): girl mouths pasted as huge shout-holes (qwen drew
an oversized open mouth); girl blinks read as squints and cat frame_05/10
blinks didn't close at all (iris still visible). Fix: restrained mouth sizes
and the xiaoju_secret-proven explicit eye wording ("眼球消失、眼睑合上、
覆盖肤色/毛发").

Overwrites tmp/qwen_edits/<stem>_full.png; re-run tools/relock_variants.py
afterwards to re-paste and re-rect.
"""

from __future__ import annotations

from pathlib import Path

from gen_variants_bailian import qwen_edit_fullframe
from PIL import Image

EP = Path(__file__).resolve().parents[1]
A = EP / "assets"

P_MOUTH_HALF = ("只把少女的嘴部改成微微张开：上下唇只分开一条小缝，露出一线深色口腔，"
                "不露牙齿，开口一定要小。保持其它一切不变。")
P_MOUTH_OPEN = ("只把少女的嘴部改成说话时的自然开口：一个小的深色椭圆开口，"
                "露出深色口腔和一点上排牙齿；开口要小而自然，千万不要画成大喊大叫的"
                "大嘴，开口高度不超过原嘴的三倍。保持其它一切不变。")
P_EYES_GIRL = ("把少女的双眼改成完全闭合：眼球完全消失，上下眼睑合上，眼睛变成两条"
               "向下弯的细弧线（睫毛线），原本眼球的位置覆盖为肤色。保持其它一切不变。")
P_EYES_GIRL_SIDE = ("把少女的眼睛改成完全闭合：眼球完全消失，眼睑合成一条向下弯的"
                    "细弧线，原本眼球的位置覆盖为肤色。保持其它一切不变。")
P_EYES_GIRL_WINK = ("把少女睁着的那只眼睛也改成完全闭合：眼球完全消失，眼睑合成一条"
                    "细弧线，原本眼球的位置覆盖为肤色；另一只本来闭着的眼睛保持不变。"
                    "保持其它一切不变。")
P_EYES_CAT = ("把橘猫的双眼改成完全闭合：绿色眼球完全消失，眼睑合上成两条细弧线，"
              "原本眼球的位置覆盖为橘色毛发。保持其它一切不变。")
P_EYES_CAT_SIDE = ("把橘猫的眼睛改成完全闭合：绿色眼球完全消失，眼睑合成一条细弧线，"
                   "原本眼球的位置覆盖为橘色毛发。保持其它一切不变。")

JOBS = [  # (base, variant, prompt)
    ("frame_03", "half", P_MOUTH_HALF),
    ("frame_03", "open", P_MOUTH_OPEN),
    ("frame_06", "half", P_MOUTH_HALF),
    ("frame_06", "open", P_MOUTH_OPEN),
    ("frame_11", "half", P_MOUTH_HALF),
    ("frame_11", "open", P_MOUTH_OPEN),
    ("frame_16", "half", P_MOUTH_HALF),
    ("frame_16", "open", P_MOUTH_OPEN),
    ("frame_01", "closed", P_EYES_GIRL_WINK),
    ("frame_03", "closed", P_EYES_GIRL),
    ("frame_06", "closed", P_EYES_GIRL),
    ("frame_11", "closed", P_EYES_GIRL),
    ("frame_14", "closed", P_EYES_GIRL),
    ("frame_16", "closed", P_EYES_GIRL_SIDE),
    ("frame_05", "closed", P_EYES_CAT),
    ("frame_10", "closed", P_EYES_CAT_SIDE),
]


def main() -> None:
    import dashscope
    import os
    dashscope.api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not dashscope.api_key:
        raise SystemExit("DASHSCOPE_API_KEY not set")
    import sys
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    for base_name, variant, prompt in JOBS:
        stem = f"{base_name}_{variant}"
        if only and stem not in only:
            continue
        base = Image.open(A / "keyframes" / f"{base_name}.png").convert("RGB")
        try:
            qwen_edit_fullframe(base, prompt, stem)  # overwrites tmp/qwen_edits/<stem>_full.png
            print(f"OK {stem}", flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {stem}: {exc}", flush=True)
    print("done")


if __name__ == "__main__":
    main()
