#!/usr/bin/env python3
"""Color-match a video segment toward a reference frame's palette (E06-live V2).

Variant of E07 tools/match_i2v_color.py (Reinhard) adapted for omni/DA
talking segments: per-channel MEAN-ONLY offset (constant for the whole clip,
computed from the clip's first frame vs the reference first frame), so the
segment's own contrast is preserved exactly and no per-frame flicker is
introduced. Audio stream is copied through.

Usage:
  match_segment_color.py <in.mp4> <reference.png> <out.mp4>

Run with the workspace venv (numpy + Pillow + ffmpeg on PATH).
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

PY_FFMPEG = "ffmpeg"
PY_FFPROBE = "ffprobe"


def probe_fps_duration(video: Path) -> tuple[str, str]:
    out = subprocess.run(
        [PY_FFPROBE, "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=r_frame_rate,duration",
         "-of", "csv=p=0", str(video)],
        capture_output=True, text=True, check=True).stdout.strip()
    fps, duration = out.split(",")
    return fps, duration


def mean_rgb(image: Image.Image) -> np.ndarray:
    small = np.array(image.convert("RGB").resize((480, 270)), dtype=np.float64)
    return small.mean(axis=(0, 1))


def main() -> int:
    video, ref_path, out_path = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    fps, _ = probe_fps_duration(video)
    ref_mean = mean_rgb(Image.open(ref_path))

    with tempfile.TemporaryDirectory() as td:
        frames = Path(td) / "f_%04d.png"
        subprocess.run([PY_FFMPEG, "-y", "-v", "error", "-i", str(video),
                        "-vf", f"fps={fps}", str(frames)], check=True)
        cels = sorted(Path(td).glob("f_*.png"))
        if not cels:
            print(f"no frames extracted from {video}", file=sys.stderr)
            return 1
        clip_mean = mean_rgb(Image.open(cels[0]))
        offset = ref_mean - clip_mean  # constant per-channel shift
        print(f"{video.name}: clip mean {np.round(clip_mean, 1)} -> "
              f"ref mean {np.round(ref_mean, 1)} (offset {np.round(offset, 1)})")
        for cel in cels:
            img = Image.open(cel).convert("RGB")
            arr = np.array(img, dtype=np.float64) + offset
            Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(cel)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [PY_FFMPEG, "-y", "-v", "error", "-framerate", fps.split("/")[0],
             "-i", str(Path(td) / "f_%04d.png"), "-i", str(video),
             "-map", "0:v", "-map", "1:a?",
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
             "-c:a", "copy", "-shortest", str(out_path)], check=True)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
