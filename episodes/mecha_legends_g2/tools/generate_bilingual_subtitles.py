#!/usr/bin/env python3
"""
Generate bilingual SRT subtitles for mecha_legends_g2.

Reads:
  - ../assets/audio/manifest.json

Writes:
  - ../output/subtitles.srt

Also provides a burn-in helper that prints an ffmpeg command to hardcode the
SRT into a video using the `subtitles` filter with white text and a black
outline sized for 1080p.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.parent
MANIFEST_PATH = ROOT / "assets" / "audio" / "manifest.json"
SRT_PATH = ROOT / "output" / "subtitles.srt"
DEFAULT_VIDEO = ROOT / "output" / "output.mp4"
DEFAULT_BURNED = ROOT / "output" / "output_burned.mp4"

EN_TRANSLATIONS = {
    "锈铁军团，停下。核心不是你们的。": "Rust Legion, hold up. The core isn't yours.",
    "核心？我们要的是整座城。先从你们身上碾过去。": "The core? We want the whole city. We'll roll right over you.",
    "V1，前方两公里废铁区，有埋伏。数量还没确认。": "V1, scrapyard sector two klicks out, ambush. Count unknown.",
    "收到。速战速决。": "Roger. Quick and clean.",
    "敌机接近！十一点方向！": "Enemy craft incoming! Eleven o'clock!",
    "别缠斗，突破先头，进废铁区。": "Don't get bogged down. Punch through the vanguard into the scrapyard.",
    "钢铁先锋。勇气不能当装甲，你们走不到废铁区尽头。": "Stellar Vanguard. Courage isn't armor. You won't reach the end of the scrapyard.",
    "T2，左翼。A3，压制。": "T2, left flank. A3, suppress.",
    "终于能活动活动了。": "Finally, some action.",
    "来啊，看谁的火花更烫。": "Come on. Let's see whose sparks burn hotter.",
    "有点意思。但这是我的废铁场，规则由我定。": "Not bad. But this is my scrapyard. My rules.",
    "那就按我们的方式。碾过去。": "Then we do this our way. Roll through them.",
    "V1，核心信号在地下金库。快去，这里我们挡着。": "V1, core signal is in the underground vault. Go. We'll hold here.",
    "太慢了，V1。核心归我了。": "Too slow, V1. The core is mine.",
    "X0，它只是金属。不值得你把自己搭进去。": "X0, it's just metal. Not worth throwing yourself away for.",
    "闭嘴！你根本不懂它值什么。": "Shut up! You have no idea what it's worth.",
    "放下。否则我会让你想起来，你曾站在我们这边。": "Put it down. Or I'll make you remember whose side you were on.",
    "这次你赢了。但锈铁军团还没完。": "You win this time. But the Rust Legion isn't finished.",
    "废铁区安静了。铁星七号安全。任务完成。": "Scrapyard's quiet. Ironstar Seven is secure. Mission complete.",
}


def srt_time(seconds: float) -> str:
    """Convert seconds to SRT timestamp HH:MM:SS,mmm."""
    ms = int(round(seconds * 1000))
    hours, ms = divmod(ms, 3600_000)
    minutes, ms = divmod(ms, 60_000)
    secs, ms = divmod(ms, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def translate(dialogue: str) -> str:
    """Return the English translation or a placeholder."""
    return EN_TRANSLATIONS.get(dialogue, "[EN]")


def generate_srt(manifest_path: Path, output_path: Path) -> None:
    """Read the audio manifest and write bilingual subtitles in SRT format."""
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    blocks = []
    for idx, entry in enumerate(manifest.get("entries", []), start=1):
        start = srt_time(entry["startTime"])
        end = srt_time(entry["endTime"])
        chinese = entry.get("dialogue", "").strip()
        english = translate(chinese)

        blocks.append(
            f"{idx}\n{start} --> {end}\n{chinese}\n{english}"
        )

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(blocks))
        if blocks:
            f.write("\n")

    print(f"Wrote {len(blocks)} subtitle entries to {output_path}")


def build_ass_style() -> str:
    """Return ASS style override string for 1080p."""
    return (
        "FontName=Arial,"
        "FontSize=24,"
        "PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,"
        "Outline=2,"
        "Shadow=1,"
        "BackColour=&H00000000,"
        "BorderStyle=1,"
        "Alignment=2,"
        "MarginV=80"
    )


def srt_to_ass(srt_path: Path, ass_path: Path) -> None:
    """Convert SRT to ASS using ffmpeg so the ass filter can consume it reliably."""
    cmd = [
        "ffmpeg", "-y", "-i", str(srt_path),
        str(ass_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def burn_in_command(
    video_path: Path = DEFAULT_VIDEO,
    output_path: Path = DEFAULT_BURNED,
    subtitle_path: Path = SRT_PATH,
) -> str:
    """Return an ffmpeg command that burns the SRT into the video."""
    ass_path = subtitle_path.with_suffix(".ass")
    style = build_ass_style()
    vf = f"subtitles='{subtitle_path.as_posix()}':force_style='{style}'"
    return (
        f'ffmpeg -y -i "{video_path.as_posix()}" '
        f'-vf "{vf}" '
        f'-c:a copy "{output_path.as_posix()}"\n'
        f'# If the above fails on Windows due to path parsing, run instead:\n'
        f'# ffmpeg -y -i "{video_path.as_posix()}" -vf "ass={ass_path.as_posix()}" -c:a copy "{output_path.as_posix()}"'
    )


def burn_subtitles(
    video_path: Path = DEFAULT_VIDEO,
    output_path: Path = DEFAULT_BURNED,
    subtitle_path: Path = SRT_PATH,
) -> Path:
    """Burn subtitles into the video using ffmpeg and return the output path.

    ffmpeg's ass/subtitles filter on Windows has trouble with absolute paths
    containing drive letters/colons. We copy the ASS file to a local temp name
    and reference it with a relative path.
    """
    local_ass = Path("subtitles_tmp.ass")
    srt_to_ass(subtitle_path, local_ass)
    try:
        cmd = [
            "ffmpeg", "-y", "-i", str(video_path),
            "-vf", "ass=subtitles_tmp.ass",
            "-c:a", "copy",
            str(output_path),
        ]
        print(f"Burning subtitles into: {output_path}")
        subprocess.run(cmd, check=True)
        print(f"Subtitles burned: {output_path}")
    finally:
        if local_ass.exists():
            local_ass.unlink()
    return output_path


def main() -> None:
    generate_srt(MANIFEST_PATH, SRT_PATH)

    # Also auto-burn subtitles into the main episode if it exists.
    if DEFAULT_VIDEO.exists():
        burn_subtitles(DEFAULT_VIDEO, DEFAULT_BURNED, SRT_PATH)
    else:
        print("\nBurn-in helper command:")
        print(burn_in_command())
        print("\nRun the command manually to hardcode the subtitles into the video.")


if __name__ == "__main__":
    main()
