#!/usr/bin/env python3
"""Generate two cross-language F5-TTS tests from licensed Japanese references.

This is deliberately separate from the episode voice pipeline. It creates
review files only and does not replace the current dialogue or final render.
"""

from pathlib import Path

from f5_tts.api import F5TTS


EPISODE_DIR = Path(__file__).resolve().parents[1]
REF_DIR = EPISODE_DIR / "assets" / "audio" / "voice_refs" / "open_ja"
OUT_DIR = EPISODE_DIR / "output" / "voice_tests_open_ja"

REFERENCE_TEXT = (
    "また、東寺のように、五大明王と呼ばれる、"
    "主要な明王の中央に配されることも多い。"
)

TESTS = (
    {
        "name": "female_tsukuyomi_last_shot.wav",
        "reference": REF_DIR / "tsukuyomi_voiceactress100_001.wav",
        "text": "最后一球……",
        "speed": 0.96,
        "seed": 731,
    },
    {
        "name": "male_jvs003_defense.wav",
        "reference": REF_DIR / "jvs003_sample.wav",
        "text": "那我来防。输的人，请汽水。",
        "speed": 0.98,
        "seed": 947,
    },
)


def main() -> None:
    missing = [str(item["reference"]) for item in TESTS if not item["reference"].is_file()]
    if missing:
        raise FileNotFoundError("Missing reference audio:\n" + "\n".join(missing))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    model = F5TTS(model="F5TTS_v1_Base", device="cpu")

    for item in TESTS:
        output = OUT_DIR / item["name"]
        model.infer(
            ref_file=str(item["reference"]),
            ref_text=REFERENCE_TEXT,
            gen_text=item["text"],
            speed=item["speed"],
            seed=item["seed"],
            nfe_step=32,
            cfg_strength=2.0,
            sway_sampling_coef=-1.0,
            remove_silence=False,
            file_wave=str(output),
        )
        print(f"Wrote {output}")


if __name__ == "__main__":
    main()
