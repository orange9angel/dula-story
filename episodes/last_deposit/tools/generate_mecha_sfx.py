#!/usr/bin/env python3
# Audio/visual choices must serve the story — see ../DESIGN.md.
"""
Standalone procedural SFX bed generator for last_deposit.

This script is now a thin wrapper around the engine's procedural audio
component (`dula-engine/tools/procedural_audio`). The same effect is also
produced automatically when running `npx dula-audio .` because the episode's
`script.story` contains `{SFX:Procedural|...}` tags.

Use this script only when you want to generate/debug the SFX bed in isolation.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
OUT_WAV = ROOT / "assets" / "audio" / "sfx_bed.wav"

# Import engine procedural audio package.
ENGINE_TOOLS = Path("D:/opensource/movie/dula-engine/tools")
sys.path.insert(0, str(ENGINE_TOOLS))
import procedural_audio  # noqa: E402


SAMPLE_RATE = 48000
TOTAL_DURATION = 140.0


def build():
    events = [
        # Neon highway: engine rumble + distant traffic.
        {"type": "engine_idle", "start": 0, "end": 35, "volume": 0.12},
        {"type": "traffic", "start": 0, "end": 35, "volume": 0.06},
        # Robot transform at start and scrapyard transition.
        {"type": "transform_mechanical", "start": 0, "end": 1.5, "volume": 0.45},
        {"type": "transform_mechanical", "start": 44, "end": 45.5, "volume": 0.45},
        # Highway laser skirmish.
        {"type": "gunfight", "start": 36, "end": 40, "volume": 0.35, "density": 0.6},
        # Scrapyard ambience.
        {"type": "wind", "start": 44.5, "end": 94.5, "volume": 0.18, "intensity": 0.4},
        # Vault energy hum.
        {"type": "vault_hum", "start": 88, "end": 140, "volume": 0.12},
    ]

    procedural_audio.render(events, TOTAL_DURATION, str(OUT_WAV))
    print(f"SFX bed written: {OUT_WAV}")


if __name__ == "__main__":
    build()
