#!/usr/bin/env python3
"""Adjust script.story dialogue timings to actual audio durations."""
import json
import re
from pathlib import Path

EPISODE = Path(__file__).resolve().parent.parent
SCRIPT_PATH = EPISODE / "script.story"
MANIFEST_PATH = EPISODE / "assets" / "audio" / "manifest.json"
MIN_GAP = 0.3
TRAIL = 0.1


def parse_time(t):
    h, m, s_ms = t.strip().split(":")
    s, ms = s_ms.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0


def fmt_time(sec):
    hours = int(sec // 3600)
    minutes = int((sec % 3600) // 60)
    secs = int(sec % 60)
    ms = int(round((sec % 1) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def main():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    durations = {e["index"]: e["audioDuration"] for e in manifest["entries"]}

    text = SCRIPT_PATH.read_text(encoding="utf-8")
    blocks = re.split(r"\n\n+", text.strip())

    entries = []
    for block in blocks:
        lines = block.splitlines()
        if len(lines) < 2:
            continue
        idx = int(lines[0].strip())
        start, end = lines[1].split(" -->")
        content = "\n".join(lines[2:])
        entries.append(
            {
                "index": idx,
                "start": parse_time(start),
                "end": parse_time(end),
                "content": content,
                "is_scene": bool(re.search(r"^@\w+", content, re.M)),
            }
        )

    # Sort by original order (indices are not necessarily monotonic because scene headers use 100+)
    order = {e["index"]: i for i, e in enumerate(entries)}

    # Dialogue entries in original order
    dialogues = [e for e in entries if not e["is_scene"]]
    scenes = [e for e in entries if e["is_scene"]]

    prev_end = -MIN_GAP
    new_times = {}  # index -> (start, end)

    for d in dialogues:
        dur = durations.get(d["index"], d["end"] - d["start"])
        new_start = max(d["start"], prev_end + MIN_GAP)
        # snap to 0.01s
        new_start = round(new_start, 3)
        new_end = round(new_start + dur + TRAIL, 3)
        new_times[d["index"]] = (new_start, new_end)
        prev_end = new_end - TRAIL  # audio actually ends at new_start+dur

    # Adjust scene headers to sit between surrounding dialogues.
    # Use original scene ordering; find previous dialogue and next dialogue by script order.
    dialogue_by_order = sorted(dialogues, key=lambda e: order[e["index"]])

    def nearest_dialogues(scene_index):
        prev_d = None
        next_d = None
        for d in dialogue_by_order:
            if order[d["index"]] < order[scene_index]:
                prev_d = d
            elif order[d["index"]] > order[scene_index] and next_d is None:
                next_d = d
        return prev_d, next_d

    for s in scenes:
        prev_d, next_d = nearest_dialogues(s["index"])
        if next_d is None:
            new_start = s["start"]
            new_end = s["end"]
        else:
            next_start = new_times[next_d["index"]][0]
            if prev_d is None:
                prev_finish = -0.5
            else:
                prev_finish = new_times[prev_d["index"]][1]
            new_start = max(s["start"], prev_finish + 0.1, next_start - 0.5)
            new_start = round(new_start, 3)
            new_end = round(min(s["end"], next_start - 0.1), 3)
            if new_end <= new_start:
                new_end = round(new_start + 0.1, 3)
        new_times[s["index"]] = (new_start, new_end)

    # Rebuild script
    out_blocks = []
    for e in entries:
        s, en = new_times[e["index"]]
        out_blocks.append(f"{e['index']}\n{fmt_time(s)} --> {fmt_time(en)}\n{e['content']}")

    SCRIPT_PATH.write_text("\n\n".join(out_blocks) + "\n", encoding="utf-8")
    print(f"Adjusted {len(dialogues)} dialogues and {len(scenes)} scene headers.")


if __name__ == "__main__":
    main()
