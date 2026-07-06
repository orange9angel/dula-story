#!/usr/bin/env python3
# Audio/visual choices must serve the story — see ../DESIGN.md.
"""
Redesign last_deposit main episode audio mix.

Changes:
  - No opening narrator; episode starts directly with character dialogue.
  - Remove continuous BGM; use rock-style music only during the fight.
  - Raise character dialogue volume so it cuts through SFX.
  - Add a scene-SFX bed (engine idle, transform, scrapyard ambience, vault hum, combat impacts).
  - Remux new audio with the existing output.mp4 video.

Outputs:
  - ../assets/audio/music/fight_rock.wav
  - ../assets/audio/sfx_bed.wav
  - ../output/output.mp4  (remuxed with new audio)
"""
import os
import asyncio
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.parent
AUDIO_DIR = ROOT / "assets" / "audio"
MUSIC_DIR = AUDIO_DIR / "music"
DIALOGUE_DIR = AUDIO_DIR
OUTPUT_DIR = ROOT / "output"

SAMPLE_RATE = 48000

NARRATOR_TEXT = (
    "霓虹城，企业雇佣兵的猎场。"
    "灰狐安保追讨失窃的神经同步芯片，克洛斯公司不会轻易放手。"
)


def run(cmd):
    print("RUN:", " ".join(str(c) for c in cmd))
    subprocess.run(cmd, check=True)


async def generate_narrator():
    out = AUDIO_DIR / "narrator.mp3"
    try:
        import edge_tts
    except ImportError:
        raise RuntimeError("edge_tts not installed; cannot generate narrator.")
    # Slightly slower and deeper narrator voice for a steel-straight-man tone
    communicate = edge_tts.Communicate(
        NARRATOR_TEXT, voice="zh-CN-YunxiNeural", rate="-4%", pitch="-6Hz"
    )
    await communicate.save(str(out))
    print(f"Narrator saved: {out}")
    return out


def download_rock_music():
    """Reuse the same Pixabay rock track as the opening, trim the fight cue."""
    src = OUTPUT_DIR / "opening_music.mp3"
    if not src.exists():
        raise RuntimeError(f"Source rock track not found: {src}")

    fight_path = MUSIC_DIR / "fight_rock.wav"

    # Fight: 35s energetic segment that will drop in once the actual brawl starts
    run([
        "ffmpeg", "-y", "-i", str(src),
        "-ss", "00:00:30", "-t", "35",
        "-af", "afade=t=in:ss=0:d=0.5,afade=t=out:st=34:d=1.0,loudnorm=I=-16:TP=-1:LRA=11",
        "-ar", str(SAMPLE_RATE), "-ac", "1",
        str(fight_path),
    ])

    return fight_path


def mix_audio(fight_path):
    """Build a new mixed.wav with dialogue, spot fight music, and scene SFX."""
    import json
    manifest_path = AUDIO_DIR / "manifest.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    sfx_path = AUDIO_DIR / "sfx_bed.wav"

    # Build ffmpeg filter_complex dynamically
    inputs = []
    filter_parts = []
    labels = []
    idx = 0

    def add_input(path, label):
        nonlocal idx
        nonlocal inputs
        inputs += ["-i", str(path)]
        labels.append(label)
        idx += 1
        return idx - 1

    # Scene SFX bed (full length, starts at 0s) — keep low so dialogue is king
    i = add_input(sfx_path, "a_sfx")
    filter_parts.append(f"[{i}:a]volume=0.35[a_sfx];")

    # Fight rock music (50s-85s) — drops in only when the actual brawl starts
    i = add_input(fight_path, "a_fight")
    filter_parts.append(
        f"[{i}:a]adelay={50*1000}|{50*1000},afade=t=in:ss=0:d=0.5,afade=t=out:st=34:d=1.0,volume=0.30[a_fight];"
    )

    # Dialogue clips — make them dominate the mix (dialogue ~2x louder than the previous 1.8 setting)
    for entry in manifest["entries"]:
        file_path = DIALOGUE_DIR / entry["file"]
        if not file_path.exists():
            print(f"Missing dialogue file: {file_path}")
            continue
        start_ms = int(entry["startTime"] * 1000)
        i = add_input(file_path, f"a_d{entry['index']}")
        filter_parts.append(
            f"[{i}:a]adelay={start_ms}|{start_ms},volume=4.0[a_d{entry['index']}];"
        )

    # Mix all labeled streams and lightly limit
    mix_labels = "".join(f"[{lb}]" for lb in labels)
    filter_parts.append(
        f"{mix_labels}amix=inputs={len(labels)}:duration=longest:dropout_transition=0.5,dynaudnorm[out]"
    )

    mixed_path = AUDIO_DIR / "mixed.wav"
    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", "".join(filter_parts),
        "-map", "[out]",
        "-ar", str(SAMPLE_RATE), "-ac", "1",
        str(mixed_path),
    ]
    run(cmd)
    return mixed_path


def remux_video(mixed_path):
    video_path = OUTPUT_DIR / "output.mp4"
    temp_video = OUTPUT_DIR / "output_video_only.mp4"
    new_output = OUTPUT_DIR / "output_new.mp4"

    # Extract video only
    run([
        "ffmpeg", "-y", "-i", str(video_path),
        "-c:v", "copy", "-an",
        str(temp_video),
    ])

    # Combine video + new audio
    run([
        "ffmpeg", "-y",
        "-i", str(temp_video),
        "-i", str(mixed_path),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ac", "1",
        "-shortest",
        str(new_output),
    ])

    # Replace original
    os.replace(new_output, video_path)
    temp_video.unlink(missing_ok=True)
    print(f"Remuxed {video_path}")


async def main():
    fight = download_rock_music()
    mixed = mix_audio(fight)
    remux_video(mixed)
    print("Done. Run build_with_opening.py to rebuild final.mp4.")


if __name__ == "__main__":
    asyncio.run(main())
