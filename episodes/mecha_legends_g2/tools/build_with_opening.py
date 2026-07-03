#!/usr/bin/env python3
"""
Build the final mecha_legends_g2 video with opening + transition + episode.

Concatenates:
  1. ../output/opening.mp4      (cartoon opening title sequence)
  2. ../output/transition_logo.mp4 (Transformers-style logo transition)
  3. ../output/output.mp4       (main episode)

Output:
  ../output/final.mp4
"""
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT, "output")
TMP_DIR = os.path.join(OUTPUT_DIR, "opening_tmp")
os.makedirs(TMP_DIR, exist_ok=True)

SEGMENTS = [
    os.path.join(OUTPUT_DIR, "opening.mp4"),
    os.path.join(OUTPUT_DIR, "transition_logo.mp4"),
    os.path.join(OUTPUT_DIR, "output.mp4"),
]
FINAL = os.path.join(OUTPUT_DIR, "final.mp4")
CONCAT_LIST = os.path.join(TMP_DIR, "concat_list.txt")


def main():
    missing = [p for p in SEGMENTS if not os.path.exists(p)]
    if missing:
        print("Missing required segments:")
        for p in missing:
            print(f"  - {p}")
        return 1

    with open(CONCAT_LIST, "w", encoding="utf-8") as f:
        for p in SEGMENTS:
            # ffmpeg concat demuxer requires absolute paths or safely escaped relative paths
            f.write(f"file '{os.path.abspath(p).replace(os.sep, '/')}'\n")

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
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
