#!/usr/bin/env python3
"""
Build the final mecha_legends_g2 video with opening + transition + episode.

Concatenates:
  1. ../output/opening.mp4      (cartoon opening title sequence)
  2. ../output/transition_logo.mp4 (Transformers-style logo transition)
  3. ../output/output.mp4       (main episode)

Output:
  ../output/final.mp4

Optional:
  --subtitles   Burn in ../output/subtitles.srt to produce final_subbed.mp4
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT, "output")
TMP_DIR = os.path.join(OUTPUT_DIR, "opening_tmp")
os.makedirs(TMP_DIR, exist_ok=True)

# Re-use the subtitle burn helper from generate_bilingual_subtitles.py.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_bilingual_subtitles import burn_subtitles as _burn_subtitles_helper

SEGMENTS = [
    os.path.join(OUTPUT_DIR, "opening.mp4"),
    os.path.join(OUTPUT_DIR, "transition_logo.mp4"),
    os.path.join(OUTPUT_DIR, "output.mp4"),
]
FINAL = os.path.join(OUTPUT_DIR, "final.mp4")
FINAL_SUBBED = os.path.join(OUTPUT_DIR, "final_subbed.mp4")
CONCAT_LIST = os.path.join(TMP_DIR, "concat_list.txt")


def build_concat_list():
    with open(CONCAT_LIST, "w", encoding="utf-8") as f:
        for p in SEGMENTS:
            f.write(f"file '{os.path.abspath(p).replace(os.sep, '/')}'\n")


def build_final(burn_subtitles=False):
    missing = [p for p in SEGMENTS if not os.path.exists(p)]
    if missing:
        print("Missing required segments:")
        for p in missing:
            print(f"  - {p}")
        return 1

    build_concat_list()

    cmd = [
        "ffmpeg",
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", CONCAT_LIST,
        "-c", "copy",
        FINAL,
    ]
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True)
    print(f"Final video written to: {FINAL}")

    if burn_subtitles:
        srt_path = Path(OUTPUT_DIR) / "subtitles.srt"
        if not srt_path.exists():
            print(f"Subtitle file not found: {srt_path}")
            return 1
        _burn_subtitles_helper(
            video_path=Path(FINAL),
            output_path=Path(FINAL_SUBBED),
            subtitle_path=srt_path,
        )

    return 0


def main():
    parser = argparse.ArgumentParser(description="Build final video from segments.")
    parser.add_argument("--subtitles", action="store_true", help="Burn in subtitles to final_subbed.mp4")
    args = parser.parse_args()
    return build_final(burn_subtitles=args.subtitles)


if __name__ == "__main__":
    raise SystemExit(main())
