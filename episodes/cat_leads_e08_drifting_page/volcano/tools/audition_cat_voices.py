#!/usr/bin/env python3
"""Blind-listening audition for E04 Cat's voice candidates.

Synthesizes the 3 Cat lines from script.story with each candidate speaker
into tmp/voice_audition/<speaker>/lineNN.mp3 so the director can pick one by
ear. A single speaker failure (403 not granted, resource/speaker mismatch,
etc.) is recorded and the run continues with the next speaker; a success /
failure matrix is printed at the end.

Default candidates:
  - zh_female_vv_uranus_bigtts      (default bigtts female)
  - zh_female_mizai_saturn_bigtts   (黑猫侦探社 咪仔)
  - ICL_zh_female_keainvsheng_tob   (可爱女生; cloned-voice class — note it may
                                     hang on a different resource id than
                                     seed-tts-2.0, in which case it is
                                     reported as a mismatch failure)

Run with the workspace venv:  dula-story/.venv/Scripts/python.exe
Requires VOLC_SPEECH_API_KEY (exit 2 when missing).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seedtts_say

EPISODE = Path(__file__).resolve().parents[1]
OUT_DIR = EPISODE / "tmp" / "voice_audition"

LINES = [
    "跟紧我，夜路我熟。",
    "快点，萤火虫不等人。",
    "说了吧，是好地方。",
]

DEFAULT_SPEAKERS = [
    "zh_female_vv_uranus_bigtts",
    "zh_female_mizai_saturn_bigtts",
    "ICL_zh_female_keainvsheng_tob",
]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Audition Cat voice candidates over the 3 E04 Cat lines."
    )
    parser.add_argument(
        "--speakers",
        nargs="*",
        default=DEFAULT_SPEAKERS,
        help="Candidate speakers (default: the 3 built-in candidates)",
    )
    parser.add_argument("--resource-id", default=seedtts_say.DEFAULT_RESOURCE_ID)
    parser.add_argument("--emotion", help="Optional emotion applied to every line")
    parser.add_argument("--emotion-scale", type=int, default=None, choices=range(1, 6))
    args = parser.parse_args()

    if not seedtts_say.get_api_key():
        print(
            f"ERROR: {seedtts_say.API_KEY_ENV} is not set in this process; "
            "audition aborted before any API call.",
            file=sys.stderr,
        )
        return 2

    # results[speaker][line_index] = None (ok) or error string
    results: dict[str, list[str | None]] = {}
    for speaker in args.speakers:
        results[speaker] = []
        for line_no, text in enumerate(LINES, start=1):
            out_path = OUT_DIR / speaker / f"line{line_no:02d}.mp3"
            try:
                seedtts_say.synthesize(
                    text,
                    speaker,
                    out_path,
                    emotion=args.emotion,
                    emotion_scale=args.emotion_scale,
                    resource_id=args.resource_id,
                )
            except seedtts_say.SeedTTSError as exc:
                print(f"  FAIL {speaker} line{line_no:02d}: {exc}")
                results[speaker].append(str(exc))
                continue
            print(f"  OK   {speaker} line{line_no:02d} -> {out_path}")
            results[speaker].append(None)

    print("\nAudition matrix (OK / FAIL):")
    header = f"{'speaker':36s}" + "".join(f" line{i:02d} " for i in range(1, len(LINES) + 1))
    print(header)
    n_ok = n_fail = 0
    for speaker, row in results.items():
        cells = []
        for err in row:
            if err is None:
                cells.append("   OK  ")
                n_ok += 1
            else:
                cells.append("  FAIL ")
                n_fail += 1
        print(f"{speaker:36s}" + "".join(cells))
    print(f"\nTotal: {n_ok} ok, {n_fail} failed. Output dir: {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
