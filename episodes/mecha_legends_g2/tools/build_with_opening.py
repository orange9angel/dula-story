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
  --subtitles   Burn ../output/subtitles.srt into the episode segment before
                concatenation, so subtitle timing stays locked to the episode
                and the final video remains in sync.
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

OPENING = os.path.join(OUTPUT_DIR, "opening.mp4")
TRANSITION = os.path.join(OUTPUT_DIR, "transition_logo.mp4")
EPISODE = os.path.join(OUTPUT_DIR, "output.mp4")
EPISODE_BURNED = os.path.join(OUTPUT_DIR, "output_burned.mp4")
FINAL = os.path.join(OUTPUT_DIR, "final.mp4")
FINAL_SUBBED = os.path.join(OUTPUT_DIR, "final_subbed.mp4")
CONCAT_LIST = os.path.join(TMP_DIR, "concat_list.txt")


def build_concat_list(segments):
    with open(CONCAT_LIST, "w", encoding="utf-8") as f:
        for p in segments:
            f.write(f"file '{os.path.abspath(p).replace(os.sep, '/')}'\n")


def concat_segments(segments, output_path):
    build_concat_list(segments)
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", CONCAT_LIST,
        # Re-encode audio to avoid DTS/sync glitches when concatenating
        # segments with slightly different audio stream timestamps.
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-async", "1",
        output_path,
    ]
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True)
    print(f"Final video written to: {output_path}")


def build_final(burn_subtitles=False):
    segments = [OPENING, TRANSITION, EPISODE]
    missing = [p for p in segments if not os.path.exists(p)]
    if missing:
        print("Missing required segments:")
        for p in missing:
            print(f"  - {p}")
        return 1

    episode_segment = EPISODE

    if burn_subtitles:
        srt_path = Path(OUTPUT_DIR) / "subtitles.srt"
        if not srt_path.exists():
            print(f"Subtitle file not found: {srt_path}")
            return 1
        # Burn subtitles into the episode segment *before* concatenation so
        # subtitle timing stays synchronized with the episode audio/video.
        if os.path.exists(EPISODE_BURNED):
            print(f"Using existing burned episode segment: {EPISODE_BURNED}")
            episode_segment = EPISODE_BURNED
        else:
            _burn_subtitles_helper(
                video_path=Path(EPISODE),
                output_path=Path(EPISODE_BURNED),
                subtitle_path=srt_path,
            )
            episode_segment = EPISODE_BURNED

    segments = [OPENING, TRANSITION, episode_segment]
    concat_segments(segments, FINAL)

    if burn_subtitles:
        # Provide a final_subbed.mp4 alias for consistency with older workflows.
        if os.path.exists(FINAL_SUBBED):
            os.remove(FINAL_SUBBED)
        os.link(FINAL, FINAL_SUBBED)
        print(f"Subtitled final video written to: {FINAL_SUBBED}")

    return 0


def main():
    parser = argparse.ArgumentParser(description="Build final video from segments.")
    parser.add_argument("--subtitles", action="store_true", help="Burn in subtitles before concatenation")
    args = parser.parse_args()
    return build_final(burn_subtitles=args.subtitles)


if __name__ == "__main__":
    raise SystemExit(main())
