#!/usr/bin/env python3
"""borrowed_moonlight cel-cinema 第一批文生图资产：三角色身份锚 + 五场景底图。

通道：codex CLI（gen_image_codex.py），串行前台，skip-if-exists 可重跑。
每张产物旁写 <name>.source.json（provider/model/prompt/refs/sha256）。

用法（任意目录）：
  python gen_assets.py            # 跑全部缺口
  python gen_assets.py --only eileen_full s01_snowtown_night
重生成：删掉对应 png 再跑。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

EP = Path(__file__).resolve().parents[2]          # episodes/borrowed_moonlight
STORY = EP.parents[1]                              # dula-story
HERE = Path(__file__).resolve().parent             # hybrid/assets
GEN = STORY.parents[0] / "dula-skills" / "build-continuous-story-images" / "scripts" / "gen_image_codex.py"
P2 = EP / "storyboard" / "p2"
P3 = EP / "storyboard" / "p3" / "probe"

STYLE = ("Art style (hard lock, applies to the whole image): a 19th-century European fairytale "
         "hand-drawn animated feature film - delicate watercolor washes with soft cel shading, "
         "visible gentle brushwork, storybook matte-painting sensibility, soft cinematic light. "
         "STRICTLY AVOID: 3D render look, CGI, plastic or glossy toy-like surfaces, photorealism, "
         "photograph, neon colors, cyberpunk, metal armor, modern city, modern clothing, "
         "any text, letters, watermark, logo.")

REF_NOTE_3D = ("The attached reference image is a rough low-poly 3D mannequin render. Use it ONLY "
               "to lock the character's identity: silhouette, proportions, costume pieces and their "
               "placement, and color palette. Repaint everything completely in the 2D hand-painted "
               "style above - do NOT copy the flat 3D surfaces, the gray studio void, or the "
               "rendered look.")

PLATE_NOTE_3D = ("The attached reference image is a rough low-poly 3D previz render. Use it ONLY to "
                 "lock the camera angle, framing, and the layout/placement of buildings and props. "
                 "Repaint everything completely in the 2D hand-painted style above; ignore any text "
                 "or subtitles visible in the reference, and do NOT copy its flat 3D surfaces.")

EILEEN_ID = ("An 11-year-old girl, about 140cm tall, slim child build. Round oval face, large "
             "gray-blue eyes, short silver-white bob hair cut at jaw length with one single loose "
             "strand falling on the viewer's RIGHT side of her face (her own left side). She wears "
             "a deep blue velvet cloak fastened at the collar with a small round brass clasp, over "
             "a cream-white linen dress, and short brown boots.")

ALDER_ID = ("A 70-year-old man, slightly hunched back. Long white beard, bushy gray eyebrows, round "
            "wire-frame glasses. He wears a worn dark wine-red old-fashioned formal tailcoat over a "
            "brass-buttoned vest, dark trousers and dark boots; several pocket watches with chains "
            "hang across his chest; his fingers are stained with greenish copper rust.")

LADYMOON_ID = ("A tall slender ethereal adult woman, otherworldly and graceful. Waist-length silver "
               "hair, an ivory-white semi-transparent layered long gown with wide flowing sleeves, "
               "tiny silver stardust ornaments scattered in her hair, cold pearl-like luminous skin, "
               "and a soft silver-white halo glow surrounding her body.")

JOBS = {
    # ---- 角色身份锚 refs/ ----
    "eileen_full": {
        "out": HERE / "refs" / "eileen_full.png",
        "refs": [P2 / "eileen_front.jpg"],
        "size": None,
        "prompt": ("Full-body character design anchor, single character, neutral standing pose "
                   "facing the viewer, whole body visible head to toe, centered, plain soft muted "
                   "cool gray-blue empty background. " + EILEEN_ID +
                   " She holds an old copper lantern by its handle in one hand, arm hanging down; "
                   "the lantern's glass shade has one thin visible crack. Calm gentle expression. "
                   + STYLE + " " + REF_NOTE_3D),
    },
    "eileen_face": {
        "out": HERE / "refs" / "eileen_face.png",
        "refs": [P2 / "eileen_face_curious.jpg", P2 / "eileen_front.jpg"],
        "size": None,
        "prompt": ("Close-up portrait of the same 11-year-old girl's face and shoulders, facing the "
                   "viewer, gentle curious expression, plain soft muted cool gray-blue background. "
                   + EILEEN_ID + " Large gray-blue eyes are the focus. " + STYLE + " " + REF_NOTE_3D),
    },
    "alder_full": {
        "out": HERE / "refs" / "alder_full.png",
        "refs": [P2 / "alder_front.jpg"],
        "size": None,
        "prompt": ("Full-body character design anchor, single character, neutral standing pose "
                   "facing the viewer, whole body visible head to toe, centered, plain soft muted "
                   "cool gray-blue empty background. " + ALDER_ID +
                   " Quiet weary expression, hands hanging relaxed. " + STYLE + " " + REF_NOTE_3D),
    },
    "alder_face": {
        "out": HERE / "refs" / "alder_face.png",
        "refs": [P2 / "alder_face_dazed.jpg", P2 / "alder_front.jpg"],
        "size": None,
        "prompt": ("Close-up portrait of the same 70-year-old man's face and shoulders, facing the "
                   "viewer, quiet weary expression behind round wire-frame glasses, plain soft muted "
                   "cool gray-blue background. " + ALDER_ID + " " + STYLE + " " + REF_NOTE_3D),
    },
    "ladymoon_full": {
        "out": HERE / "refs" / "ladymoon_full.png",
        "refs": [P2 / "ladymoon_front.jpg"],
        "size": None,
        "prompt": ("Full-body character design anchor, single character, neutral standing pose "
                   "facing the viewer, whole body visible head to toe, centered, plain soft muted "
                   "cool gray-blue empty background. " + LADYMOON_ID +
                   " Tired but loving gaze, slow weightless bearing. " + STYLE + " " + REF_NOTE_3D),
    },
    "ladymoon_face": {
        "out": HERE / "refs" / "ladymoon_face.png",
        "refs": [P2 / "ladymoon_face_weary.jpg", P2 / "ladymoon_front.jpg"],
        "size": None,
        "prompt": ("Close-up portrait of the same ethereal woman's face and shoulders, facing the "
                   "viewer, weary but loving expression, plain soft muted cool gray-blue background. "
                   + LADYMOON_ID + " " + STYLE + " " + REF_NOTE_3D),
    },
    # ---- 场景底图 plates/（空景，无人物；1920x1080）----
    "s01_snowtown_night": {
        "out": HERE / "plates" / "s01_snowtown_night.png",
        "refs": [P3 / "s01_establish.jpg"],
        "size": "1920x1080",
        "prompt": ("Empty scene plate, wide establishing shot, no people. A 19th-century European "
                   "snow kingdom town at midnight: a tall dark wooden clock tower stands slightly "
                   "right of center with a round pale clock face; a pale full moon with a soft halo "
                   "hangs in the sky to the right of the tower; clusters of small snow-covered "
                   "tilted wooden cottages sit at the lower left and lower right with warm amber "
                   "glowing windows; open snow-covered ground in the foreground; deep midnight-blue "
                   "starry sky; sparse small snowflakes drifting. Quiet lonely mood, cold blue "
                   "moonlight against warm amber windows. " + STYLE + " " + PLATE_NOTE_3D),
    },
    "s01_snowtown_spring": {
        "out": HERE / "plates" / "s01_snowtown_spring.png",
        "refs": [P3 / "s05_establish_spring.jpg"],  # 验收后前置 s01 夜版锁构图
        "size": "1920x1080",
        "prompt": ("Empty scene plate, wide establishing shot, no people. The SAME 19th-century "
                   "European town as the reference, from the SAME camera angle and with the SAME "
                   "building layout - tall clock tower slightly right of center, small wooden "
                   "cottages lower left and lower right - but now at golden spring sunrise: warm "
                   "gold-pink dawn sky with a low rising sun glow near the left third of the "
                   "horizon, snow melted into young green meadows with small flower buds, pink "
                   "petals drifting in the air instead of snow, warm golden morning light. "
                   + STYLE + " " + PLATE_NOTE_3D),
    },
    "s02_clocktower_workshop": {
        "out": HERE / "plates" / "s02_clocktower_workshop.png",
        "refs": [P3 / "s02_establish.jpg"],
        "size": "1920x1080",
        "prompt": ("Empty scene plate, interior, no people. Inside a very tall round clock-tower "
                   "workshop at midnight: warm brown wooden plank floor, huge aged brass gears "
                   "mounted on the dark back wall, dozens of glass bottles floating in mid-air at "
                   "different heights, each bottle holding one tiny dim glowing star; a wooden "
                   "workbench with clockmaker tools at the center. Strong two-tone lighting: warm "
                   "amber lamplight pools around the workbench and bottles, while the upper walls "
                   "and corners sink into deep teal-blue cold shadow - the amber vs teal contrast "
                   "must be obvious. The curved tower walls are dark wood panels and brass clock "
                   "mechanisms, NOT bookshelves, no books. " + STYLE + " " + PLATE_NOTE_3D),
    },
    "s03_star_stairs": {
        "out": HERE / "plates" / "s03_star_stairs.png",
        "refs": [P3 / "s03_establish.jpg"],
        "size": "1920x1080",
        "prompt": ("Empty scene plate, no people. The rooftop of a clock tower at deep night: dark "
                   "shingled rooftop platform with low parapet blocks occupies the bottom of the "
                   "frame as the ground anchor, an open skylight hatch in its middle; rising from "
                   "the hatch, a translucent crystal stairway made of gathered starlight spirals up "
                   "toward a pale thin moon in the upper right; at least three layers of clouds at "
                   "different depths for parallax; deep blue night backlight, silver-blue glowing "
                   "stair edges, a few tiny gold star particles along the stairs. "
                   + STYLE + " " + PLATE_NOTE_3D),
    },
    "s04_moon_palace": {
        "out": HERE / "plates" / "s04_moon_palace.png",
        "refs": [P3 / "s04_establish.jpg"],
        "size": "1920x1080",
        "prompt": ("Empty scene plate, interior, no people. A vast lonely moon palace: tall "
                   "silver-white translucent veils hang from unseen heights around a round hall, a "
                   "broken ruined ice-crystal throne stands small in the center distance, a "
                   "mirror-polished dark floor reflects the veils softly, large areas of empty "
                   "negative space emphasizing solitude, cold silver light from directly above, a "
                   "little sparse silver dust floating. " + STYLE + " " + PLATE_NOTE_3D),
    },
}


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def run_job(name: str, job: dict) -> bool:
    out: Path = job["out"]
    src = out.with_suffix(".source.json")
    if out.exists() and src.exists():
        print(f"skip {name}（已存在）")
        return True
    refs = [str(r) for r in job["refs"]]
    # s01 春景：若夜版已验收则前置为构图锁（weight order：先构图后氛围）
    if name == "s01_snowtown_spring":
        night = HERE / "plates" / "s01_snowtown_night.png"
        if night.exists():
            refs.insert(0, str(night))
    for r in refs:
        if not Path(r).exists():
            print(f"FAIL {name}: 缺参考图 {r}", file=sys.stderr)
            return False
    cmd = [sys.executable, str(GEN), "--out", str(out), "--timeout", "280"]
    for r in refs:
        cmd += ["--ref", r]
    if job["size"]:
        cmd += ["--size", job["size"]]
    cmd += ["--prompt", job["prompt"]]
    print(f"=== {name} ===", flush=True)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    tail = ((proc.stdout or "") + "\n" + (proc.stderr or "")).strip()[-1200:]
    print(tail, flush=True)
    if proc.returncode != 0 or not out.exists():
        print(f"FAIL {name}", file=sys.stderr)
        return False
    src.write_text(json.dumps({
        "asset": name,
        "provider": "codex-cli builtin imagegen",
        "model": "gpt-image (ChatGPT subscription quota)",
        "prompt": job["prompt"],
        "refs": refs,
        "size": job["size"],
        "sha256": sha256(out),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK {name}", flush=True)
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", default=None)
    args = ap.parse_args()
    names = args.only or list(JOBS)
    fails = 0
    for n in names:
        if n not in JOBS:
            print(f"unknown job {n}", file=sys.stderr)
            fails += 1
            continue
        if not run_job(n, JOBS[n]):
            fails += 1
    print(f"done: {len(names) - fails}/{len(names)}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
