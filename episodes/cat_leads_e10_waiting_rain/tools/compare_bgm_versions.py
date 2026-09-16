#!/usr/bin/env python3
"""Objective BGM version comparison for the 三版选一 discipline.

Per candidate: onset count via beatcut-edit's spectral-flux detector
(dula-skills/beatcut-edit/scripts/beatcut.py) plus a per-second RMS energy
curve (must show pp/mf dynamic layering, not a flat line).

Reference threshold: 50 onsets per 60 s — scaled linearly to the clip's
actual duration.

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import numpy as np

BEATCUT = Path("D:/opensource/movie/dula-skills/beatcut-edit/scripts/beatcut.py")
MUSIC_DIR = Path(__file__).resolve().parents[1] / "assets" / "audio" / "music"

spec = importlib.util.spec_from_file_location("beatcut", BEATCUT)
beatcut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(beatcut)


def per_second_rms(samples: np.ndarray, sr: int) -> np.ndarray:
    n = len(samples) // sr
    trimmed = samples[: n * sr].reshape(n, sr)
    return np.sqrt((trimmed ** 2).mean(axis=1))


def describe_curve(rms_db: np.ndarray) -> str:
    # Compact contour: bucket into 8 segments, show mean dB per segment.
    buckets = np.array_split(rms_db, 8)
    return " ".join(f"{float(b.mean()):5.1f}" for b in buckets)


def main() -> None:
    paths = sorted(MUSIC_DIR.glob("waiting_rain_theme_v*.wav"))
    if not paths:
        print("no candidates found")
        sys.exit(1)
    for path in paths:
        sr, samples = beatcut.load_mono(path)
        duration = len(samples) / sr
        onsets = beatcut.detect_onsets(samples, sr)
        threshold = 50.0 * duration / 60.0
        rms = per_second_rms(samples, sr)
        rms_db = 20 * np.log10(np.maximum(rms, 1e-8))
        spread = float(rms_db.max() - rms_db.min())
        verdict = "OK" if len(onsets) >= threshold and spread >= 6.0 else "WEAK"
        print(f"{path.name}: {duration:.2f}s  onsets={len(onsets)} "
              f"(need >= {threshold:.0f})  RMS dB range={spread:.1f}  [{verdict}]")
        print(f"  RMS dB contour (8 segments): {describe_curve(rms_db)}")
        print(f"  RMS dB first/mid/last 5s: "
              f"{rms_db[:5].mean():.1f} / "
              f"{rms_db[len(rms_db)//2 - 2:len(rms_db)//2 + 3].mean():.1f} / "
              f"{rms_db[-5:].mean():.1f}")


if __name__ == "__main__":
    main()
