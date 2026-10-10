"""Validate the rendered counterattack study against its sequential pose evidence."""
import json
import math
import subprocess
import sys
import argparse
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--full', action='store_true')
parser.add_argument('--board')
parser.add_argument('--video')
args = parser.parse_args()
FINAL = args.full
BOARD = EP / (args.board or ("storyboard/fight_final_r13" if FINAL else "storyboard/fight_trial"))


def finite(value):
    if isinstance(value, dict):
        return all(finite(v) for v in value.values())
    if isinstance(value, list):
        return all(finite(v) for v in value)
    return not isinstance(value, (int, float)) or math.isfinite(value)


def probe(name):
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries",
        "stream=codec_type,width,height,nb_frames:format=duration", "-of", "json",
        str(EP / "output" / name),
    ], text=True))


def audio_hash(name):
    return subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(EP / "output" / name),
        "-map", "0:a:0", "-c", "copy", "-f", "hash", "-hash", "SHA256", "-",
    ], text=True).strip()


render = json.loads((BOARD / "render_trace.json").read_text())
check = json.loads((BOARD / ("check_trace.json" if FINAL else "pose_trace.json")).read_text())
frames = render["frames"]
assert frames and finite(frames), "Empty or non-finite pose trace"
assert len(frames) == len(check["frames"]), "Capture/check frame count differs"
# Subtitles are attached only to captured images, so compare the physical state explicitly.
for a, b in zip(frames, check["frames"]):
    for key in ("t", "trial", "leiRoot", "hongRoot", "armor", "gauntlet"):
        assert a.get(key) == b.get(key), f"Sequential evaluation differs at {a['t']}: {key}"
fight = [f for f in frames if "trial" in f]
hit = fight[0]["trial"]["hitTime"]
before = [f for f in fight if f["trial"]["rel"] < 0]
assert all(math.dist(f["hongRoot"], [.55, -2.35]) < 1e-9 for f in before), "Victim moves before impact"
contact = min((f for f in fight if f["trial"]["rel"] >= 0), key=lambda f: f["trial"]["rel"])
assert contact["trial"]["contactError"] < .012, "Calibrated fist marker misses the authored contact target"
assert max(f["trial"]["reachClamp"][c] for f in fight for c in ("lei", "hong")) < .001, "Arm target exceeds fixed bone reach"
planted = [f for f in fight if f["trial"]["rel"] >= .14]
drift = max(math.dist(list(f["trial"]["leiFeet"][side].values()),
                      list(planted[0]["trial"]["leiFeet"][side].values()))
            for f in planted for side in ("left", "right"))
assert drift < 1e-8, "Planted feet slide during recovery"
seek = json.loads((BOARD / "seek_check.json").read_text())
assert seek["passed"], "Direct seek differs from sequential images"
names = (args.video or "craft3d_full_r13_2026_10_9.mp4",) if FINAL else ("fight_trial_r12.mp4", "fight_trial_r12_compare.mp4")
videos = {name: probe(name) for name in names}
for name, meta in videos.items():
    stream = next(s for s in meta["streams"] if s["codec_type"] == "video")
    assert int(stream["nb_frames"]) == len(frames), f"Incomplete video: {name}"
    assert abs(float(meta["format"]["duration"]) - len(frames) / render["fps"]) < .04
    assert any(s["codec_type"] == "audio" for s in meta["streams"]), f"Missing audio: {name}"
audio_ref = "craft3d_full_r11_2026_10_9.mp4" if FINAL else "fight_trial_r12_compare.mp4"
assert audio_hash(names[0]) == audio_hash(audio_ref), "Approved audio packets changed"
if FINAL:
    guard = min(fight, key=lambda f: abs(f["trial"]["rel"] + 1))
    assert all(v > 0 for hands in guard["thumbUp"].values() for v in hands.values()), "Guard thumbs are upside down"
    after = next(f for f in frames if f["phase"] == "hong_laugh")
    for key in ("leiRoot", "hongRoot"):
        assert math.dist(fight[-1][key], after[key]) < 1e-8, "Cut resets an actor's position"
report = {
    "passed": True, "frames": len(frames), "fps": render["fps"],
    "impact_time_in_episode": hit,
    "pre_impact_victim_translation": 0,
    "first_post_impact_fist_marker_error": contact["trial"]["contactError"],
    "recovery_support_foot_drift": drift,
    "seek_checks": len(seek["checks"]),
    "audio_packets_identical_to": audio_ref,
    "limits": "Marker/IK checks do not certify hand-surface collision, weight, or commercial animation quality.",
}
(BOARD / "validation.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
