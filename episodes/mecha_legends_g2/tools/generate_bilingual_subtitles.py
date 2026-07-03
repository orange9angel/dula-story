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
DEFAULT_VIDEO = ROOT / "output" / "final.mp4"
DEFAULT_BURNED = ROOT / "output" / "final_burned.mp4"

EN_TRANSLATIONS = {
    "锈铁军团，核心留下。钢铁先锋，进入战斗位置。": "Rust Legion, the core stays. Stellar Vanguard, move to combat positions.",
    "核心？我们要整座城。先把你熔成铁水！": "The core? We want the whole city. I'll melt you into slag first!",
    "V1，目标已锁定。前方两公里废铁区，有埋伏。": "V1, targets locked. Two klicks ahead, scrapyard sector, ambush.",
    "收到。速战速决，为了铁星七号。": "Roger. Quick and clean, for Ironstar Seven.",
    "敌机接近！十一点方向，接敌！": "Enemy craft approaching! Eleven o'clock, engaging!",
    "别恋战！突破先头部队，进废铁区！": "Don't get bogged down! Break through the vanguard, into the scrapyard!",
    "钢铁先锋。你们把勇气当成力量。这片废铁场，就是你们的坟。": "Stellar Vanguard. You mistake courage for strength. This scrapyard is your grave.",
    "T2，左翼包抄。A3，空中压制。": "T2, flank left. A3, air suppression.",
    "正好松一松骨头。": "About time to stretch the old joints.",
    "来啊！让我瞧瞧你们的火花够不够烫！": "Come on! Let's see if your sparks are hot enough!",
    "有点意思。但你们忘了——这里是我的废铁场，规矩我说了算。": "Interesting. But you forgot — this is my scrapyard, and I make the rules.",
    "那就按我们的规矩来。碾碎他们。": "Then we play by our rules. Crush them.",
    "V1，核心信号在废铁场地下金库。快去，这里交给我们。": "V1, core signal in the scrapyard underground vault. Go, we've got this.",
    "你太慢了，V1。核心归锈铁军团了。": "Too slow, V1. The core belongs to the Rust Legion now.",
    "你错了，X0。它只是块金属。别把自己也卖了。": "You're wrong, X0. It's just metal. Don't sell yourself too.",
    "闭嘴！你什么都不懂……核心的力量。": "Silence! You understand nothing... the power of the core.",
    "放下它。否则我会让你记起，你曾是钢铁先锋。": "Put it down. Or I'll make you remember you were once Stellar Vanguard.",
    "……这次算你赢。但锈铁军团不会就此罢休。走着瞧。": "...You win this time. But the Rust Legion won't stop. We'll see.",
    "废铁场归于平静。铁星七号安全。钢铁先锋，任务完成。": "The scrapyard is quiet. Ironstar Seven is secure. Stellar Vanguard, mission complete.",
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
