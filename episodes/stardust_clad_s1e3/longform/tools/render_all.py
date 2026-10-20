"""Freeze the real viewer inputs, render resumable parts, then mux one audio track."""
import argparse
import concurrent.futures
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT.parent
STORY = EP.parents[1]
WS = STORY.parent
p = argparse.ArgumentParser()
p.add_argument("--name", default="stardust_clad_s1e3_borrowed_wind_r1")
p.add_argument("--workers", type=int, default=3)
p.add_argument("--part-seconds", type=int, default=150)
p.add_argument("--resume", action="store_true")
a = p.parse_args()
if not re.fullmatch(r"[A-Za-z0-9_-]+", a.name):
    raise ValueError("Use a plain output name")
RUN = ROOT/"review"/a.name
RUN.mkdir(parents=True, exist_ok=True)
PARTS = EP/"output"/(a.name+"_parts")
PARTS.mkdir(parents=True, exist_ok=True)
FPS = 30
timeline = json.loads((ROOT/"config/timeline.json").read_text(encoding="utf-8"))
frames = round(timeline["duration"]*FPS)
lock = threading.Lock()
creationflags = subprocess.CREATE_NO_WINDOW

def now():
    return datetime.now(timezone.utc).isoformat()

def sha(file):
    h = hashlib.sha256()
    with file.open("rb") as f:
        while block := f.read(1048576):
            h.update(block)
    return h.hexdigest()

def save(file, data):
    temp = file.with_suffix(file.suffix+".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    temp.replace(file)

def capture_sources():
    files = set()
    external = set()
    three = (STORY/"node_modules/three").resolve()
    def visit(file):
        file = file.resolve()
        if file in files:
            return
        if not file.is_file():
            raise FileNotFoundError(file)
        files.add(file)
        if file.suffix not in [".js", ".mjs"]:
            return
        for spec in re.findall(r"""(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]""", file.read_text(encoding="utf-8")):
            target = None
            if spec.startswith("."):
                target = file.parent/spec
            elif spec == "three":
                target = three/"build/three.module.js"
            elif spec.startswith("three/addons/"):
                target = three/"examples/jsm"/spec.removeprefix("three/addons/")
            elif spec == "dula-engine":
                target = WS/"dula-engine/index.js"
            elif spec.startswith("dula-engine/"):
                target = WS/"dula-engine"/spec.removeprefix("dula-engine/")
            elif spec.startswith("dula-assets/"):
                target = WS/"dula-assets"/spec.removeprefix("dula-assets/")
            if target is not None and target.is_file():
                visit(target)
            else:
                external.add(spec)
    visit(ROOT/"viewer.js")
    for file in [ROOT/"viewer.html", ROOT/"script.story", ROOT/"draft.md", ROOT/"bootstrap.js",
                 EP/"render.mjs", EP/"tools/audit_inputs.mjs", STORY/"package-lock.json",
                 ROOT/"assets/audio/final/mixed.wav", ROOT/"assets/audio/final/mix_report.json"]:
        visit(file)
    for directory in [ROOT/"config", ROOT/"assets/tex"]:
        for file in directory.rglob("*"):
            if file.is_file():
                visit(file)
    for file in (ROOT/"tools").iterdir():
        if file.suffix in [".py", ".mjs"]:
            visit(file)
    for name in ["armor_engraved_r20.png", "peak_rock.png", "palace_stone.png"]:
        visit(EP/"assets3d/tex"/name)
    inputs = [{"path": str(f), "bytes": f.stat().st_size, "sha256": sha(f)} for f in sorted(files)]
    identity = hashlib.sha256(json.dumps(inputs, sort_keys=True).encode()).hexdigest()
    return {"identity": identity, "inputs": inputs, "externalImports": sorted(external)}

source = capture_sources()
build_file = RUN/"production_build.json"
if a.resume and build_file.exists():
    build = json.loads(build_file.read_text(encoding="utf-8"))
    if build["source"]["identity"] != source["identity"]:
        raise RuntimeError("Source changed; use a new output name and review the change")
else:
    build = {"created": now(), "name": a.name, "source": source, "duration": timeline["duration"],
             "fps": FPS, "expectedFrames": frames, "parts": [], "state": "rendering"}
    step = a.part_seconds*FPS
    for i, start in enumerate(range(0, frames, step)):
        build["parts"].append({"index": i, "startFrame": start, "endFrame": min(frames, start+step),
                               "state": "pending", "path": str(PARTS/f"{i:03}.mp4")})
    save(build_file, build)

def run_part(part):
    index = part["index"]
    if part["state"] == "complete" and Path(part["path"]).is_file():
        if sha(Path(part["path"])) == part["sha256"]:
            return
    board = RUN/f"part_{index:03}"
    start, end = part["startFrame"]/FPS, part["endFrame"]/FPS
    cmd = ["node", str(EP/"render.mjs"), "--viewer", "longform/viewer.html",
           "--range", f"{start:.9f},{end:.9f}", "--video-only", "--threads", "2", "--longform-qc",
           "--out", str(Path(part["path"]).relative_to(EP/"output")),
           "--board", str(board.relative_to(EP)), "--audio", "longform/assets/audio/final/mixed.wav"]
    with lock:
        part.update(state="rendering", started=now(), command=cmd)
        save(build_file, build)
        print(f"start part {index:03}: {start:.3f}..{end:.3f}", flush=True)
    with (RUN/f"part_{index:03}.log").open("w", encoding="utf-8") as log:
        result = subprocess.run(cmd, cwd=EP, stdout=log, stderr=subprocess.STDOUT, creationflags=creationflags)
    if result.returncode:
        with lock:
            part.update(state="failed", exitCode=result.returncode, ended=now())
            save(build_file, build)
        raise RuntimeError(f"Part {index} failed; see {RUN/f'part_{index:03}.log'}")
    media = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-of", "json",
                                               part["path"]], encoding="utf-8", creationflags=creationflags))
    video = next(s for s in media["streams"] if s["codec_type"] == "video")
    if int(video["nb_frames"]) != part["endFrame"]-part["startFrame"]:
        raise RuntimeError(f"Part {index} frame count mismatch")
    qc = json.loads((board/"frame_qc.json").read_text(encoding="utf-8"))
    seek = json.loads((board/"seek_check.json").read_text(encoding="utf-8"))
    with lock:
        part.update(state="complete", ended=now(), sha256=sha(Path(part["path"])),
                    frameQC=qc, seekPassed=seek["passed"], frames=int(video["nb_frames"]))
        save(build_file, build)
        print(f"done part {index:03}: {part['frames']} frames; clamp={qc['maxClamp']:.5f}", flush=True)

started = time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as pool:
    futures = [pool.submit(run_part, part) for part in build["parts"]]
    for future in concurrent.futures.as_completed(futures):
        future.result()
after = capture_sources()
if after["identity"] != source["identity"]:
    build.update(state="source-changed", ended=now(), sourceAfter=after)
    save(build_file, build)
    raise RuntimeError("Sources changed during rendering; output must not be presented as a frozen build")
concat = RUN/"concat.txt"
concat.write_text("".join("file '"+Path(part["path"]).as_posix().replace("'", r"'\''")+"'\n"
                          for part in build["parts"]), encoding="utf-8")
output = EP/"output"/(a.name+".mp4")
chapter_starts = [("B01", "风铃渡"), ("B05", "封住风的人"), ("B07", "旧索仓"), ("B09", "暖芽失温"),
                  ("B13", "折翼桥救援"), ("B49", "救回以后"), ("B18", "反噬"), ("B21", "旧事故"),
                  ("B26", "两种办法"), ("B29", "挡住他的路"), ("B36", "风井"),
                  ("B41", "最后一拍"), ("B43", "风又来了"), ("END", "片尾")]
beats = {b["id"]: b for b in timeline["beats"]}
chapters = []
metadata = ";FFMETADATA1\ntitle=借风的人\n"
for i, (beat, title) in enumerate(chapter_starts):
    start = round(beats[beat]["start"]*1000)
    end = round((beats[chapter_starts[i+1][0]]["start"] if i+1 < len(chapter_starts) else timeline["duration"])*1000)
    chapters.append({"title": title, "start": start/1000, "end": end/1000})
    metadata += f"[CHAPTER]\nTIMEBASE=1/1000\nSTART={start}\nEND={end}\ntitle={title}\n"
chapter_file = RUN/"chapters.ffmetadata"
chapter_file.write_text(metadata, encoding="utf-8")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(concat),
                "-i", str(ROOT/"assets/audio/final/mixed.wav"), "-f", "ffmetadata", "-i", str(chapter_file),
                "-map", "0:v:0", "-map", "1:a:0", "-map_metadata", "2", "-map_chapters", "2",
                "-c:v", "copy", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k",
                "-movflags", "+faststart", "-metadata", "title=借风的人", "-metadata", "comment="+source["identity"],
                str(output)], check=True, creationflags=creationflags)
build.update(state="complete", ended=now(), elapsedSeconds=time.monotonic()-started,
             output=str(output), outputSha256=sha(output), sourceUnchanged=True,
             chapters=chapters,
             totalRenderedFrames=sum(part["frames"] for part in build["parts"]),
             qcScope="Actual encoded-frame numeric state and sequential/seek checks; no blanket aesthetic or mesh-collision pass")
save(build_file, build)
print(json.dumps({"state": build["state"], "output": str(output), "frames": build["totalRenderedFrames"],
                  "elapsedSeconds": build["elapsedSeconds"], "sha256": build["outputSha256"]}), flush=True)
