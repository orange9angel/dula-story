#!/usr/bin/env python3
"""Rebuild the three walk segments in config/keyframe_timeline.json.

Replaces the old 2-cel / cross-composition walk beats with per-shot cel
cycles (4-5 cel/s, dwell >= 0.15 s) using the newly approved walk cels:

- street_walk  (10.0-12.5s): frame_04 3-cel loop (contactA/passing/contactB)
- follow_back  (14.0-16.5s): frame_06 4-cel loop (+passing2)
- girl_approaches (25.0-27.0s): frame_11 4-cel loop, blink rig carried

Keeps the file's one-line-per-frame formatting; run check_lipsync.py after.
"""
import json
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
TIMELINE = EP / "config" / "keyframe_timeline.json"

data = json.loads(TIMELINE.read_text(encoding="utf-8"))
frames = data["frames"]

IB = "action_inbetweens"
KF = "keyframes"


def beats(start, end, cels, template, eye_rig=None):
    """Expand [start, end) into evenly spaced beats cycling through cels."""
    n = round((end - start) / 0.2083)
    step = (end - start) / n
    out = []
    for i in range(n):
        at = round(start + i * step, 4)
        cel = cels[i % len(cels)]
        entry = {"at": at, "file": cel["file"], "shot": f"{cel['shot']}_{i}", "move": template["move"]}
        for prop in ("cloudDrift", "dappleSway", "steam", "doorBand"):
            if prop in template:
                entry[prop] = template[prop]
        if eye_rig and cel["base"]:
            entry["eyeRig"] = eye_rig
            carry = round(at - start, 4)
            if carry > 0:
                entry["blinkCarry"] = carry
        entry["transition"] = "cut"
        out.append(entry)
    return out


# --- locate the three walk groups by their current time ranges ------------
def slice_group(lo, hi):
    head = [f for f in frames if f["at"] < lo]
    mid = [f for f in frames if lo <= f["at"] < hi]
    tail = [f for f in frames if f["at"] >= hi]
    assert mid, f"no frames in [{lo}, {hi})"
    return head, mid, tail


# Group A: street_walk 10.0 -> 12.5 (frame_05 at 12.5 stays)
head, group_a, rest = slice_group(10.0, 12.5)
a_tpl = group_a[0]
# Group B: follow_back 14.0 -> 16.5 (frame_07 at 16.5 stays)
_, group_b, _ = slice_group(14.0, 16.5)
b_tpl = group_b[0]
# Group C: girl_approaches 25.0 -> 27.0 (frame_12 at 27.0 stays)
_, group_c, _ = slice_group(25.0, 27.0)
c_tpl = group_c[0]
c_eye = next(f["eyeRig"] for f in group_c if f.get("eyeRig"))

A_CELS = [
    {"file": f"{KF}/frame_04.png", "shot": "street_walk_contact1", "base": False},
    {"file": f"{IB}/frame_04_walk_passing.png", "shot": "street_walk_passing", "base": False},
    {"file": f"{IB}/frame_04_walk_contact2.png", "shot": "street_walk_contact2", "base": False},
]
B_CELS = [
    {"file": f"{KF}/frame_06.png", "shot": "follow_back_contact1", "base": False},
    {"file": f"{IB}/frame_06_walk_passing.png", "shot": "follow_back_passing", "base": False},
    {"file": f"{IB}/frame_06_walk_contact2.png", "shot": "follow_back_contact2", "base": False},
    {"file": f"{IB}/frame_06_walk_passing2.png", "shot": "follow_back_passing2", "base": False},
]
C_CELS = [
    {"file": f"{KF}/frame_11.png", "shot": "girl_approaches_contact1", "base": True},
    {"file": f"{IB}/frame_11_walk_passing.png", "shot": "girl_approaches_passing", "base": False},
    {"file": f"{IB}/frame_11_walk_contact2.png", "shot": "girl_approaches_contact2", "base": False},
    {"file": f"{IB}/frame_11_walk_passing2.png", "shot": "girl_approaches_passing2", "base": False},
]

new_frames = []
for f in frames:
    at = f["at"]
    if 10.0 <= at < 12.5 or 14.0 <= at < 16.5 or 25.0 <= at < 27.0:
        continue
    if at == 12.5:
        new_frames.extend(beats(10.0, 12.5, A_CELS, a_tpl))
    if at == 16.5:
        new_frames.extend(beats(14.0, 16.5, B_CELS, b_tpl))
    if at == 27.0:
        new_frames.extend(beats(25.0, 27.0, C_CELS, c_tpl, eye_rig=c_eye))
    new_frames.append(f)

ats = [f["at"] for f in new_frames]
assert all(b > a for a, b in zip(ats, ats[1:])), "timeline not strictly increasing"
data["frames"] = new_frames
data["description"] = (
    data["description"].split(". Walk-cycle beats")[0]
    + ". Walk cycles are per-shot 3-4 cel loops (contact/passing/contact2[/passing2]) "
      "at ~4.8 cel/s: frame_04 street walk, frame_06 back-view walk, frame_11 front approach; "
      "no cross-composition cel reuse."
)

lines = []
lines.append("{")
lines.append('  "version": 2,')
lines.append(f'  "duration": {data["duration"]},')
lines.append(f'  "description": {json.dumps(data["description"], ensure_ascii=False)},')
lines.append('  "frames": [')
for i, f in enumerate(new_frames):
    comma = "," if i < len(new_frames) - 1 else ""
    lines.append("    " + json.dumps(f, ensure_ascii=False) + comma)
lines.append("  ]")
lines.append("}")
TIMELINE.write_text("\n".join(lines) + "\n", encoding="utf-8")

json.loads(TIMELINE.read_text(encoding="utf-8"))  # re-parse sanity check
print(f"OK: {len(frames)} -> {len(new_frames)} frames")
