#!/usr/bin/env python3
"""Generate bilingual ASS subtitles from script.story and burn them into the final video."""
import json
import os
import re
import subprocess
import sys

EPISODE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT_PATH = os.path.join(EPISODE_DIR, "script.story")
OUTPUT_DIR = os.path.join(EPISODE_DIR, "output")
VIDEO_PATH = os.path.join(OUTPUT_DIR, "output.mp4")
SUB_PATH = os.path.join(OUTPUT_DIR, "subtitles.ass")
OUT_VIDEO = os.path.join(OUTPUT_DIR, "output_bilingual.mp4")

TRANSLATIONS = {
    1: "Attention, Cube Ship! The BBQ Ship is fleeing ahead. Keep formation—no tailgating!",
    2: "Boss, this rust-bucket explorer doesn't even have a square-dance sound system. How do we chase?",
    3: "Hahaha! Fluffy Alliance, you can't even smell my exhaust—assuming dinosaurs have exhaust.",
    4: "Boss, radar says we're about to crash into a planet. Can we buy insurance first?",
    5: "Insurance? BBQ Group only buys accident insurance—because we're about to use it!",
    6: "Damage report: bow dented, coffee machine broken, my hairdo still intact.",
    7: "Boss, this planet has plenty of oxygen. Perfect for a good-looking hunter like me.",
    8: "Wait, sensors show Spark Candy levels are off the charts. If we don't transform, we'll become talking fireworks.",
    9: "The ship crashed right into the volcano, saving me a barbecue grill. Buzz, scan the local lifeforms.",
    10: "Boss, I scanned one fly, two flies, three flies... Are we becoming flies?",
    11: "Flies? No. Find me the most vicious one! Like... that bumblebee over there.",
    12: "Scan program initiated. Spotty, you're up first.",
    13: "I want to be a saber-tooth tiger! No, a T-Rex! Or a kaiju!",
    14: "The system says you're best suited as a cheetah, because... you run fast, and your brain runs a little faster.",
    15: "A cheetah? So am I just in charge of being cute?",
    16: "Big Monkey! Hand over the Spark Candy and I might let you be my pet gorilla.",
    17: "Pet? My insurance doesn't cover being walked by a dinosaur.",
    18: "Boss, can I sting him first? I promise just a little.",
    19: "You sting the boss and I'll turn you into honey-mustard flavored chips!",
    20: "Boss Dragon, your leadership is as disappointing as your tiny arms.",
    21: "Orange Claw, per BBQ Group company bylaws section 7.3, a leadership challenge requires an application two weeks in advance.",
    22: "Form? What form? I'm a dinosaur, I don't do Excel!",
    23: "Then wait until HR is in. Now, everyone retreat—time for a hot-spring bath in the volcano.",
    24: "Big Monkey, I request to join the Fluffy Alliance. In exchange I can be security, chef, or door-god.",
    25: "Welcome aboard. We happen to need a grill master. Just don't chew the cables.",
    26: "Great! Now we're a gorilla, cheetah, and raptor team—call us 'Team Zoo'!",
    27: "Everyone, watch out—Spark Candy is fluctuating again. I might suddenly turn into... a potted plant.",
    28: "Why is Buzz always the unlucky one—ah, my wing is stuck in a tree!",
    29: "Retreat! I'll be back when I can control my own tail—it just slapped me in the face.",
    30: "Victory belongs to the Fluffy Alliance! And... our temporary zoo. See you next episode.",
}

SCENE_CAPTIONS = [
    (0.0, 4.0, "第一章：太空追尾", "Chapter 1: Space Tailgating"),
    (31.0, 35.0, "第二章：迫降低模星球", "Chapter 2: Crash Landing on a Low-Poly Planet"),
    (51.5, 55.5, "第三章：烧烤集团火山基地", "Chapter 3: BBQ Group Volcano Base"),
    (72.5, 76.5, "扫描野兽形态", "Scanning Beast Modes"),
    (94.0, 98.0, "首次互殴", "First Brawl"),
    (114.5, 118.5, "橙爪的叛变申请", "Orange Claw's Mutiny Application"),
    (143.0, 147.0, "新倒霉蛋加入", "A New Unlucky Recruit Joins"),
]


def parse_time(t: str) -> float:
    h, m, s = t.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s.replace(",", "."))


def fmt_ass_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds % 1) * 100))
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"


def ass_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def parse_script(path: str):
    text = open(path, encoding="utf-8").read()
    blocks = re.split(r"\n\n+", text.strip())
    entries = []
    for block in blocks:
        lines = [l.strip() for l in block.strip().split("\n") if l.strip()]
        if len(lines) < 3:
            continue
        idx_str = lines[0]
        if not idx_str.isdigit():
            continue
        idx = int(idx_str)
        time_line = lines[1]
        m = re.match(
            r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})",
            time_line,
        )
        if not m:
            continue
        start = (
            int(m.group(1)) * 3600
            + int(m.group(2)) * 60
            + int(m.group(3))
            + int(m.group(4)) / 1000
        )
        end = (
            int(m.group(5)) * 3600
            + int(m.group(6)) * 60
            + int(m.group(7))
            + int(m.group(8)) / 1000
        )
        content = " ".join(lines[2:])
        dialogue = re.sub(r"\{[^}]+\}", "", content)
        dialogue = re.sub(r"^@\w+\s*", "", dialogue)
        dialogue = re.sub(r"\[[^\]]+\]\s*", "", dialogue).strip()
        if not dialogue:
            continue
        entries.append({"index": idx, "start": start, "end": end, "cn": dialogue})
    return entries


def build_ass(entries) -> str:
    lines = [
        "[Script Info]",
        "Title: Cube Era: Beast Awakening S1E1 Bilingual Subtitles",
        "ScriptType: v4.00+",
        "PlayResX: 1920",
        "PlayResY: 1080",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        # Chinese top center, English bottom center
        "Style: Chinese,Noto Sans SC,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2.5,1,8,80,80,40,1",
        "Style: English,Arial,38,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,80,80,60,1",
        "Style: CaptionCN,Noto Sans SC,42,&H00FFFFE0,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,2,1,8,80,80,100,1",
        "Style: CaptionEN,Arial,32,&H00FFFFE0,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,2,1,2,80,80,80,1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    for e in entries:
        cn = ass_escape(e["cn"])
        en = ass_escape(TRANSLATIONS.get(e["index"], ""))
        if not en:
            continue
        start = fmt_ass_time(e["start"])
        end = fmt_ass_time(e["end"])
        lines.append(f"Dialogue: 0,{start},{end},Chinese,,0,0,0,,{cn}")
        lines.append(f"Dialogue: 0,{start},{end},English,,0,0,0,,{en}")

    for start, end, cn, en in SCENE_CAPTIONS:
        s = fmt_ass_time(start)
        e = fmt_ass_time(end)
        lines.append(f"Dialogue: 0,{s},{e},CaptionCN,,0,0,0,,{ass_escape(cn)}")
        lines.append(f"Dialogue: 0,{s},{e},CaptionEN,,0,0,0,,{ass_escape(en)}")

    return "\n".join(lines) + "\n"


def main():
    entries = parse_script(SCRIPT_PATH)
    ass_text = build_ass(entries)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(SUB_PATH, "w", encoding="utf-8") as f:
        f.write(ass_text)
    print(f"Wrote ASS: {SUB_PATH}")

    if not os.path.exists(VIDEO_PATH):
        print(f"Video not found: {VIDEO_PATH}", file=sys.stderr)
        return 1

    # Run ffmpeg from the output directory so the subtitle path is a simple
    # relative filename, avoiding drive-colon escaping issues on Windows.
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        os.path.basename(VIDEO_PATH),
        "-vf",
        f"subtitles={os.path.basename(SUB_PATH)}",
        "-c:a",
        "copy",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "20",
        os.path.basename(OUT_VIDEO),
    ]
    print("Burning subtitles with ffmpeg...")
    print(" ".join(cmd))
    subprocess.run(cmd, cwd=OUTPUT_DIR, check=True)
    print(f"Done: {OUT_VIDEO}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
