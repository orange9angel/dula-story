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
    "A3，你这导航是喝机油喝醉了吧？这路除了一堆破护栏还有啥？": "A3, is your nav drunk on motor oil? What's on this road but busted guardrails?",
    "知足吧。上次它把我导河里了，我现在排气管还冒泡呢。": "Be grateful. Last time it led me into a river; my exhaust still bubbles.",
    "你们俩能不能闭嘴？前面...不对劲。不像废铁。": "Can you two shut it? Up ahead... something's off. Doesn't feel like scrap.",
    "终于来了？我的炮管都快长蜘蛛网了。": "Finally? My cannon's growing cobwebs.",
    "敌机！十一点方向！R4，轰它们！": "Enemy! Eleven o'clock! R4, blow 'em up!",
    "别缠斗，冲过去！": "Don't get tangled, punch through!",
    "欢迎来到废铁坟场，钢铁先锋。你们不该踩进来的。": "Welcome to the scrap graveyard, Stellar Vanguard. You shouldn't have stepped in.",
    "少废话。T2左翼，A3压制，R4开路。": "Less talk. T2, left. A3, pin it. R4, clear a path.",
    "早等不及了！来啊！": "Been waiting! Bring it!",
    "哈，我最喜欢拆垃圾了！": "Ha, I love taking out trash!",
    "有点意思...但这是我的垃圾场。规矩，我说了算。": "Interesting... but this is my junkyard. My rules.",
    "那就按我们的规矩。碾过去。": "Then we play by our rules. Roll over them.",
    "V1，信号在地下！快走，这里我们顶着！": "V1, signal's underground! Go, we'll hold them here!",
    "太慢了，V1。它在我手里了。": "Too slow, V1. It's in my hands now.",
    "X0...你曾是钢铁先锋。就为了一块发烫的金属？": "X0... you were Stellar Vanguard. For a piece of hot metal?",
    "金属？哈...你什么都不知道。我失去的，你永远不会懂。": "Metal? Hah... you know nothing. What I lost, you'll never understand.",
    "那就告诉我。把东西放下，我们像以前一样谈。": "Then tell me. Put it down, let's talk like we used to.",
    "...谈？我们之间早就没什么可谈了。后会无期，V1。": "...Talk? There's nothing left to say between us. Until next time, V1.",
    "X0走了...铁星七号安全。A3，T2，你们还好吗？": "X0's gone... Ironstar Seven is secure. A3, T2, you two okay?",
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
        "FontSize=18,"
        "PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H00000000,"
        "Outline=2,"
        "Shadow=1,"
        "BackColour=&H00000000,"
        "BorderStyle=1,"
        "Alignment=2,"
        "MarginV=55"
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
