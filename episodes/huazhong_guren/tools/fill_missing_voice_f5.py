#!/usr/bin/env python3
"""Fill unpaid-provider gaps by cloning the already approved CosyVoice takes."""

from __future__ import annotations

import importlib.util
from pathlib import Path

from f5_tts.api import F5TTS


EPISODE = Path(__file__).resolve().parents[1]
AUDIO_DIR = EPISODE / "assets" / "audio"
REF_DIR = AUDIO_DIR / "voice_refs"

REFERENCE = {
    "Girl": {
        "file": REF_DIR / "girl_cosy_ref.wav",
        "text": "江南的雨季，有些人卖伞，有些人卖画。小蓝两样都不买，只抱着一把破伞，站到阿澈摊前。",
    },
    "Boy": {
        "file": REF_DIR / "boy_cosy_ref.wav",
        "text": "太阳？伞撑开时，旁人可看不见。别动。你的影子，挡住我的太阳了。先画伞。你……顺手。",
    },
}

SPEED = {
    "calm": 0.98,
    "curious": 1.03,
    "gentle": 0.95,
    "bright": 1.05,
    "worried": 1.02,
}


def load_audio_module():
    module_path = Path(__file__).with_name("generate_audio.py")
    spec = importlib.util.spec_from_file_location("huazhong_audio", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def main() -> None:
    audio = load_audio_module()
    entries, _ = audio.parse_story((EPISODE / "script.story").read_text(encoding="utf-8"))
    missing = []
    for entry in entries:
        character = entry.get("character")
        if not character or not entry.get("dialogue"):
            continue
        output = AUDIO_DIR / f"{entry['index']:03d}_{character}.wav"
        if not output.is_file():
            missing.append((entry, output))

    if not missing:
        print("No missing dialogue takes.")
        return

    print(f"Loading F5-TTS on CPU for {len(missing)} missing takes...")
    model = F5TTS(model="F5TTS_v1_Base", device="cpu")
    for entry, output in missing:
        character = entry["character"]
        reference = REFERENCE[character]
        print(f"F5 #{entry['index']:02d} {character}: {entry['dialogue']}", flush=True)
        model.infer(
            ref_file=str(reference["file"]),
            ref_text=reference["text"],
            gen_text=entry["dialogue"],
            speed=SPEED.get(entry.get("emotion"), 1.0),
            seed=8200 + int(entry["index"]),
            nfe_step=28,
            cfg_strength=2.0,
            sway_sampling_coef=-1.0,
            remove_silence=False,
            file_wave=str(output),
        )
        print(f"Wrote {output.name}", flush=True)


if __name__ == "__main__":
    main()
