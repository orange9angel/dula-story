"""Decode review frames from an encoded movie; preserve source identity and time."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess

p = argparse.ArgumentParser()
p.add_argument("video", type=Path)
p.add_argument("folder", type=Path)
p.add_argument("--offset", type=float, default=0)
p.add_argument("--sample", action="append", default=[], help="name:global_seconds")
p.add_argument("--sequence", action="append", default=[], help="name:start:step:count")
p.add_argument("--timeline", type=Path)
a = p.parse_args()
a.folder.mkdir(parents=True, exist_ok=True)
shots = []
for spec in a.sample:
    name, t = spec.split(":")
    shots.append({"name": name, "t": float(t)})
for spec in a.sequence:
    name, start, step, count = spec.split(":")
    for i in range(int(count)):
        shots.append({"name": f"{name}_{i:03}", "t": float(start) + i*float(step)})
if a.timeline:
    timeline = json.loads(a.timeline.read_text(encoding="utf-8"))
    for beat in timeline["beats"]:
        shots.append({"name": beat["id"]+"_wide", "t": beat["start"]+1.5})
        line = next((l for l in timeline["lines"] if l["beat"] == beat["id"]), None)
        if line:
            shots.append({"name": beat["id"]+"_dialogue", "t": line["start"]+min(1, (line["audio_end"]-line["start"])*.6)})
shots.sort(key=lambda shot: shot["t"])

def extract(shot):
    local = shot["t"]-a.offset
    if local < 0:
        raise ValueError(f"Time precedes source start: {shot}")
    output = a.folder/(shot["name"]+".jpg")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{local:.6f}", "-i", str(a.video),
                    "-frames:v", "1", "-q:v", "2", "-threads", "1", str(output)], check=True,
                   creationflags=subprocess.CREATE_NO_WINDOW)
    if not output.exists():
        raise RuntimeError(f"No decoded frame: {shot}")
    return shot | {"sourceTime": local, "filename": output.name}

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    shots = list(pool.map(extract, shots))
h = hashlib.sha256()
with a.video.open("rb") as f:
    while block := f.read(1048576):
        h.update(block)
metadata = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                                              "-of", "json", str(a.video)], encoding="utf-8"))
record = {"source": str(a.video.resolve()), "sha256": h.hexdigest(), "globalOffset": a.offset,
          "method": "decoded ordered frames or stills; no normal-speed playback claim",
          "shots": shots, "media": metadata}
(a.folder/"trace.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"frames": len(shots), "folder": str(a.folder), "sha256": h.hexdigest()}))
