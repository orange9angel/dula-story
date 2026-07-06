#!/usr/bin/env python3
"""
Generate bilingual SRT subtitles for last_deposit.

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
    "灰狐呼叫车队。距离交货点还有三公里，保持编队。": "Grey Fox to convoy. Three klicks to drop point, maintain formation.",
    "雷恩，上空有热源！三架无人机，正从高架侧面爬升——": "Rhein, heat signature above! Three drones climbing up the side of the overpass—",
    "克洛斯公司的欢迎仪式。队长，变吗？": "Cross Company's welcome party. Captain, transform?",
    "变！清场，然后继续赶路！": "Transform! Clear the field, then keep moving!",
    "无人机不会废话。清场！": "Drones don't talk. Clear them!",
    "布洛克，封左！斯凯，打掉敌机！全队——冲过去！": "Brock, cover left! Sky, take out the drones! Team — punch through!",
    "敌机全灭！队长，道路清空。": "All drones down! Captain, road's clear.",
    "很好。变形，继续赶路。克洛斯公司不会只派这一批。": "Good. Transform and keep rolling. Cross Company won't stop at one wave.",
    "三架 Viper，全毁。灰狐这次派来的人不简单。": "Three Vipers, total loss. Grey Fox sent someone capable this time.",
    "要我去追吗？那点废铁我还没拆够。": "Want me to chase them? I haven't had enough scrap to tear apart.",
    "不。让他们先交货。等芯片到了买家手里——我们再抢现成的。通知买家，计划不变。": "No. Let them make the drop. Once the chip reaches the buyer — we'll take it ready-made. Notify the buyer, plan stays the same.",
    "临时据点。布洛克，扫描周边。斯凯，检查交货路线。": "Temporary base. Brock, scan the perimeter. Sky, check the delivery route.",
    "周边两公里干净。但这地方撑不过一轮空袭。": "Two klicks clean around us. But this place won't survive an air strike.",
    "交货路线被克洛斯公司监控了。队长，我们硬闯吗？": "Delivery route is under Cross Company surveillance. Captain, do we force through?",
    "不硬闯。我们换路——走旧城区地下管道。克洛斯公司追不上来的地方，才是我们的路。": "We don't force it. We change routes — through the old district underground pipes. Where Cross Company can't follow, that's our road.",
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
