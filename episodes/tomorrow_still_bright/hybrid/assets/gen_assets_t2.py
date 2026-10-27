#!/usr/bin/env python3
"""tomorrow_still_bright cel-cinema T2 文生图资产：
M-07 身份锚（refs/）+ 姿势 cel 集（cels/）+ 眼光圈变体（faces/raw/）
+ 道具母图（props/）+ 场景母图（plates/）。

通道：codex CLI（gen_image_codex.py），串行前台，skip-if-exists 可重跑。
每张产物旁写 <name>.source.json（provider/model/prompt/refs/sha256）。
姿势 cel：refs = [身份锚（首位=身份权重最高）, T1 底稿姿势帧（仅锁姿势）]。
眼光圈变体：refs = [refs/m07_eye.png]（唯一 ref=同图编辑底图），raw 产物进
  faces/raw/，再由 ../tools/lock_eye_variants.py 逐像素锁回 faces/（框外零差分）。

用法（任意目录）：
  python gen_assets_t2.py              # 跑全部缺口
  python gen_assets_t2.py --only m07_full plate_corridor
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

EP = Path(__file__).resolve().parents[2]          # episodes/tomorrow_still_bright
STORY = EP.parents[1]                              # dula-story
HERE = Path(__file__).resolve().parent             # hybrid/assets
GEN = STORY.parents[0] / "dula-skills" / "build-continuous-story-images" / "scripts" / "gen_image_codex.py"
T1R = EP / "storyboard" / "t1" / "review"
T2R = EP / "storyboard" / "t1" / "t2ref"
REFS = HERE / "refs"

STYLE = ("Art style (hard lock, applies to the whole image): a 2D hand-drawn watercolor animation "
         "film - visible pencil outline lines, light watercolor paper texture, restrained flat cel "
         "shading, an old industrial space station mood of cold blue-gray metal with warm amber "
         "lamplight accents, quiet and lonely picture-book feeling. "
         "STRICTLY AVOID: photorealism, 3D render look, CGI, plastic or glossy toy-like surfaces, "
         "photograph, overly cartoony exaggerated expressions, neon colors, cyberpunk, "
         "any text, letters, watermark, logo.")

M07_ID = ("A small maintenance robot, 90cm tall: a rounded barrel-shaped torso (a slightly tapered "
          "cylinder, like an old tin canister), a boxy head carrying ONE single large blue-white "
          "mechanical eye (a round camera-lens eye with a pale blue glowing ring iris and a dark "
          "aperture center), a mechanical LEFT hand with exactly THREE digits in total (three "
          "segmented fingers and NO thumb, no fourth digit), a RIGHT hand that "
          "is a fixed tool tip (a small wrench/gripper head, NO fingers), a red patchwork shoulder "
          "armor plate bolted onto its LEFT shoulder (when the robot faces the viewer this red "
          "plate appears on the viewer's left), a brass-colored rectangular repair patch plate "
          "riveted on the front of its belly, and a LEFT leg that is visibly about 15 percent "
          "shorter than the right leg, so the torso carries a subtle permanent tilt toward the "
          "shorter leg and a limping stance. Muted blue-gray painted metal body with "
          "worn scratched edges and small rivets. "
          "STRICTLY: no human face, no mouth, no nose, no eyebrows, no facial expression muscles; "
          "never change the finger count (three fingers on the left hand only, tool tip on the "
          "right); always exactly ONE eye; the red shoulder plate always on the same (its left) "
          "shoulder; the belly patch always present.")

CEL_BG = ("The robot is isolated on a FULLY TRANSPARENT background (PNG with real alpha channel): "
          "no backdrop, no ground, no shadow on the ground, no scenery, nothing behind it. "
          "Full body visible head to toe, centered, the robot fills about 90% of the image height. "
          "Exactly ONE robot in the image. No props or furniture unless the pose text names them.")

CEL_REF_NOTE = ("Reference image 1 is the character identity anchor: match its body shapes, colors, "
                "eye, hands, shoulder plate and proportions EXACTLY. Reference image 2 is a rough "
                "low-poly 3D previz render: copy ONLY the body pose and staging from it - do NOT "
                "copy its flat 3D surfaces, gray look, lighting, text overlays, background or "
                "framing. Repaint everything in the 2D hand-painted style above.")

REF_NOTE_3D = ("The attached reference image(s) are rough low-poly 3D previz renders. Use them ONLY "
               "to lock the character's identity: silhouette, proportions, body pieces and their "
               "placement, and color palette. Ignore any visible text or subtitles. Repaint "
               "everything completely in the 2D hand-painted style above - do NOT copy the flat 3D "
               "surfaces, the dark void, or the rendered look.")

PLATE_NOTE_3D = ("The attached reference image is a rough low-poly 3D previz render. Use it ONLY to "
                 "lock the camera angle, framing, and the layout/placement of walls, furniture and "
                 "props. Repaint everything completely in the 2D hand-painted style above; ignore "
                 "any text or subtitles visible in the reference, remove any robot character from "
                 "the scene (empty scene plate, no characters), and do NOT copy its flat 3D "
                 "surfaces.")

EDIT_NOTE = ("This is a LOCAL EDIT of the attached image. Keep the attached image's composition, "
             "pose, identity, colors, lighting and background EXACTLY unchanged; alter ONLY what "
             "the instruction below names. Output the full image at the same pixel size.")

M07_FULL = REFS / "m07_full.png"
M07_EYE = REFS / "m07_eye.png"


def cel_job(out: Path, pose_ref: Path, pose: str, extra_ref: Path | None = None) -> dict:
    refs = [M07_FULL, pose_ref]
    if extra_ref is not None:
        refs.append(extra_ref)
    return {"out": out, "refs": refs, "size": "1024x1536",
            "prompt": pose + " " + M07_ID + " " + CEL_BG + " " + STYLE + " " + CEL_REF_NOTE}


def prop_job(out: Path, desc: str, refs: list[Path] | None = None) -> dict:
    note = ("The object is isolated on a FULLY TRANSPARENT background (PNG with real alpha "
            "channel): no backdrop, no ground, no shadow, nothing else. One object only, centered, "
            "filling about 80% of the image. ")
    prompt = desc + " " + note + STYLE
    if refs:
        prompt += " " + REF_NOTE_3D
    return {"out": out, "refs": refs or [], "size": "1024x1024", "prompt": prompt}


def plate_job(out: Path, ref: Path, desc: str) -> dict:
    return {"out": out, "refs": [ref], "size": "1920x1080",
            "prompt": "Empty scene plate, no people, no robot, no characters. " + desc +
                      " " + STYLE + " " + PLATE_NOTE_3D}


def face_job(out: Path, edit: str) -> dict:
    # 尺寸运行时解析（m07_eye.png 在本批次内生成，import 时不存在）
    return {"out": out, "refs": [M07_EYE], "size": None, "size_from": M07_EYE,
            "prompt": EDIT_NOTE + " Edit instruction: " + edit}


JOBS: dict[str, dict] = {
    # ================= 身份锚 refs/ =================
    "m07_full": {
        "out": M07_FULL,
        "refs": [T2R / "crouch_pickup.jpg", T2R / "hold_drawing.jpg"],
        "size": "1024x1536",
        "prompt": ("Full-body character design anchor, single robot, neutral standing pose facing "
                   "the viewer very slightly turned to its right, whole body visible head to toe, "
                   "centered, plain soft muted cold gray-blue empty background, arms hanging "
                   "relaxed at its sides. " + M07_ID + " " + STYLE + " " + REF_NOTE_3D),
    },
    "m07_eye": {
        "out": M07_EYE,
        "refs": [M07_FULL],
        "size": "1024x1024",
        "prompt": ("Extreme close-up of the robot's single mechanical eye and the surrounding "
                   "head panel, filling most of the frame: the round blue-white camera-lens eye "
                   "with a pale blue glowing ring iris around a dark round aperture, small screws "
                   "and worn paint on the boxy head panel around it. The eye structure must be "
                   "clearly readable: outer lens rim, glowing iris ring, inner dark aperture. "
                   "Neutral calm state (aperture at normal medium size, soft glow). "
                   "Plain muted background. " + STYLE),
    },
    # ================= 姿势 cel 集 cels/（1024x1536 透明底） =================
    "m07_push_cart": cel_job(
        HERE / "cels" / "m07_push_cart.png", T1R / "s02_push_cart.jpg",
        "Pose: walking while pushing a small maintenance tool cart forward with both hands on its "
        "push bar, body leaning slightly into the push, mid-step. The cart is a low flat-bed "
        "trolley on four small wheels (one front wheel visibly bent outward at a crooked angle), "
        "painted in the same worn blue-gray as the robot. The cart IS included in this cel. "
        "Side-three-quarter view showing the limping gait (shorter left leg)."),
    "m07_walk_strip": {
        "out": HERE / "cels" / "m07_walk_strip.png",
        "refs": [M07_FULL, HERE / "cels" / "walk_sheet.png"],
        "size": "2048x3072",
        "prompt": ("A 2x2 grid contact sheet (4 cells, exactly 2 columns x 2 rows) of the SAME "
                   "robot walking in side profile facing toward the RIGHT of the image, one walk "
                   "phase per cell, each cell showing the full body head to toe on a FULLY "
                   "TRANSPARENT background. Reading order left-to-right then top-to-bottom, the 4 "
                   "phases of ONE limping walk cycle. IMPORTANT: each robot must be FULLY inside "
                   "its own quadrant with generous empty margins on all four sides - no body part "
                   "may cross or touch the horizontal or vertical center lines of the sheet: "
                   "1=right foot heel contact in front, shorter "
                   "left leg trailing behind on toe; 2=legs passing each other, body dipping "
                   "slightly as the short left leg swings through; 3=left foot contact in front "
                   "with the body visibly lower on the left side (the limp), right leg trailing; "
                   "4=legs passing each other again, right leg swinging forward, body recovering "
                   "height. Consecutive cells must differ clearly in leg positions; arms hang "
                   "relaxed with a slight counter-sway. " + M07_ID + " " + STYLE + " " +
                   "Reference image 1 is the character identity anchor: match it EXACTLY. "
                   "Reference image 2 is a 2x2 contact sheet of rough low-poly 3D previz frames: "
                   "copy ONLY the leg phase of each corresponding grid cell - do NOT copy its "
                   "surfaces, lighting, background or colors. Each cell is a clean separate "
                   "character cel, no cell borders, no grid lines, no text."),
    },
    "m07_reach_switch": cel_job(
        HERE / "cels" / "m07_reach_switch.png", T2R / "reach_switch.jpg",
        "Pose: standing in side-three-quarter view, LEFT arm extended forward and upward at "
        "shoulder height, three-fingered left hand reaching toward an unseen wall switch just in "
        "front of its fingertips (fingertips extended, almost touching); right tool arm hanging "
        "down. Head tilted slightly toward the reaching hand. No switch, no wall in the image."),
    "m07_hesitate_retract": cel_job(
        HERE / "cels" / "m07_hesitate_retract.png", T2R / "hesitate.jpg",
        "Pose: standing, LEFT arm half-withdrawn from a reach - elbow bent, three-fingered left "
        "hand pulled back to chest height with fingers slightly curled in mid-hesitation, "
        "shoulders very slightly hunched, head bowed a little as if second-guessing. Right tool "
        "arm hanging still."),
    "m07_crouch_pickup": cel_job(
        HERE / "cels" / "m07_crouch_pickup.png", T2R / "crouch_pickup.jpg",
        "Pose: crouched low with knees deeply bent and torso leaning forward, RIGHT tool hand "
        "reaching down close to the ground to pinch up one tiny screw (the small screw IS "
        "included, held at the tool tip); left three-fingered hand near its knee for balance; "
        "head bowed down looking at the screw."),
    "m07_hold_battery": cel_job(
        HERE / "cels" / "m07_hold_battery.png", T2R / "drag_battery.jpg",
        "Pose: straining to drag a large heavy old battery block with both arms wrapped around "
        "its near edge, body leaning back hard against the load, feet planted and braced, knees "
        "bent, visible effort. The battery IS included: a bulky rectangular industrial battery "
        "case with a worn metal shell and carry handles, about half the robot's height."),
    "m07_work_bench": cel_job(
        HERE / "cels" / "m07_work_bench.png", T1R / "s14_dead_battery.jpg",
        "Pose: standing as if behind an invisible waist-high workbench, torso leaning slightly "
        "forward, head bowed looking down at waist level, both hands held in front at waist "
        "height as if carefully holding and testing a small battery cell between the "
        "three-fingered left hand and the right tool tip. Concentrated, quiet. No bench, no "
        "tools in the image - only the robot and its pose."),
    "m07_weld": cel_job(
        HERE / "cels" / "m07_weld.png", T1R / "s24_weld_protect.jpg",
        "Pose: leaning forward over an invisible waist-high welding table, RIGHT arm extended "
        "forward-down holding an invisible welding torch steadily at table height, head bowed "
        "toward the work point, left three-fingered hand lowered steadying itself. Focused "
        "welding posture. No torch, no table, no sparks in the image."),
    "m07_protect_recoil": cel_job(
        HERE / "cels" / "m07_protect_recoil.png", T1R / "s24_weld_protect.jpg",
        "Pose: a sudden protective flinch - LEFT three-fingered hand shot up and forward at face "
        "height, palm outward fingers spread as if shielding something precious from flying "
        "sparks, torso twisted slightly back, head tilted away a little, right tool arm still "
        "held low. A reflex gesture of instinctive protection."),
    "m07_sit_rest": cel_job(
        HERE / "cels" / "m07_sit_rest.png", T1R / "s30_sit_beside.jpg",
        "Pose: sitting on an invisible low stool, feet resting flat, torso relaxed with a soft "
        "tired slump, shoulders settled and loosened, both hands resting down near its lap, "
        "head tilted very slightly to one side in quiet companionship. Calm resting pose."),
    "m07_hold_drawing": cel_job(
        HERE / "cels" / "m07_hold_drawing.png", T2R / "hold_drawing.jpg",
        "Pose: standing, holding up an old child's crayon drawing with both hands at chest "
        "height, looking at it. The drawing IS included: a small worn rectangle of yellowed "
        "paper with a simple childish orange crayon sun with rays drawn on it (NO text, no "
        "letters on the paper), held by its lower corners between the three-fingered left hand "
        "and the right tool tip."),
    "m07_stand_gaze": cel_job(
        HERE / "cels" / "m07_stand_gaze.png", T1R / "s17_holo_photo.jpg",
        "Pose: standing still seen from a rear-three-quarter view, head tilted clearly UPWARD, "
        "gazing quietly at something above and ahead (as if watching an old photograph floating "
        "in the air); arms hanging relaxed, body perfectly still, a long quiet look."),
    # ================= 眼光圈变体 faces/raw/（同图局部编辑） =================
    "m07_eye_shrink": face_job(
        HERE / "faces" / "raw" / "m07_eye_shrink.png",
        "Change ONLY the eye's dark aperture: make it shrink noticeably smaller (a tense, "
        "alarmed narrowing of the pupil, iris ring dimmer). Everything else - the lens rim, the "
        "head panel, screws, colors, background - stays pixel-identical."),
    "m07_eye_glow": face_job(
        HERE / "faces" / "raw" / "m07_eye_glow.png",
        "Change ONLY the eye's glow: the pale blue iris ring lights up brighter and warmer, the "
        "aperture opens slightly wider, a soft joyful gleam (pleasant surprise). Everything else "
        "stays pixel-identical."),
    "m07_eye_alarm": face_job(
        HERE / "faces" / "raw" / "m07_eye_alarm.png",
        "Change ONLY the eye's color state: the iris ring flashes alarm RED (a warning state), "
        "same eye structure and aperture size. Everything else - the lens rim, head panel, "
        "screws, background - stays pixel-identical."),
    # ================= 道具母图 props/ =================
    "prop_sprout_cup": prop_job(
        HERE / "props" / "prop_sprout_cup.png",
        "A small plant sprout growing in a cracked off-white ceramic cup: exactly TWO tender "
        "young leaves on one thin stem (never more, never fewer), dark moist potting substrate "
        "visible inside the cup, a clear crack running down one side of the cup's rim, the "
        "leaf edges slightly translucent green as if lit from behind. The plant is NOT "
        "anthropomorphic - no face, no expression.",
        [T1R / "s09_sprout_macro.jpg"]),
    "prop_drawing": prop_job(
        HERE / "props" / "prop_drawing.png",
        "An old child's crayon drawing on yellowed worn paper with curled corners: a simple "
        "childish orange sun with thick rays in the upper area, a few crooked green grass "
        "strokes at the bottom, and the hand-written words SEE YOU TOMORROW in wobbly child "
        "capital letters across the middle (this text is intentional and must read exactly "
        "SEE YOU TOMORROW - it is the only allowed text).",
        [T1R / "s05_drawing_osd.jpg"]),
    "prop_music_box": prop_job(
        HERE / "props" / "prop_music_box.png",
        "A small old wind-up music box: a worn wooden cube box with a brass wind-up key on one "
        "side, faded painted patterns, the lid slightly open showing a hint of the metal comb "
        "mechanism inside. Quiet nostalgic feeling."),
    "prop_reading_lamp": prop_job(
        HERE / "props" / "prop_reading_lamp.png",
        "A small old reading lamp: a squat dome shade on a short jointed neck with a heavy "
        "round base, worn cream-and-rust paint, the bulb glowing with a soft warm amber light. "
        "Cozy low-power lamp feeling.",
        [T1R / "s30_sit_beside.jpg"]),
    "prop_habitat_dome": prop_job(
        HERE / "props" / "prop_habitat_dome.png",
        "A transparent glass cultivation dome (a bell-jar-like habitat cover) with a small "
        "metal base ring that has tiny air vents and a thin climate-control tube connector; "
        "the glass is clean with soft watercolor-style reflections. Empty inside, no plant."),
    "prop_buffer_battery": prop_job(
        HERE / "props" / "prop_buffer_battery.png",
        "A handmade buffer battery pack: several small salvaged battery cells bundled together "
        "with straps and visible hand-soldered wiring into one chunky portable pack, a tiny "
        "charge indicator window showing a warm amber glow, patched and scrappy but carefully "
        "made."),
    "prop_dead_cells": prop_job(
        HERE / "props" / "prop_dead_cells.png",
        "A small pile of used-up old battery cells: three or four chunky worn industrial "
        "battery cells with scuffed casings and faded charge labels reading empty, one cell "
        "with a peeled paper tag, quietly discarded look."),
    # ================= 场景母图 plates/（1920x1080） =================
    "plate_corridor": plate_job(
        HERE / "plates" / "plate_corridor.png", T2R / "scene_corridor_lit.jpg",
        "A long straight living-quarters corridor on an old space station: cold blue-gray metal "
        "walls with visible panel seams and rivets, a row of aged yellowed light-box panels "
        "glowing warm amber along the upper right wall, doors and small wall fixtures along the "
        "left wall, an empty old chair and a forgotten cup on a tiny side table partway down "
        "the corridor, an old child's drawing taped to the left wall, the floor reflecting a "
        "little lamplight. The far end of the corridor sinks into darkness. Feeling of an "
        "aging, slowly dying neighborhood street."),
    "plate_greenhouse": plate_job(
        HERE / "plates" / "plate_greenhouse.png", T2R / "scene_greenhouse.jpg",
        "A small old greenhouse cabin on a space station: a wide rectangular porthole window on "
        "the far wall pouring in one broad patch of warm golden light onto the floor, rusted "
        "pipes running along the walls, rows of withered dead plants in planter boxes on both "
        "sides, scattered dust motes floating in the light beam. Near the center on a low "
        "stand in the light patch sits one tiny cracked off-white ceramic cup holding the ONLY "
        "vivid green thing in the room - a small sprout with exactly two tender leaves. All "
        "other plants are brown and dead."),
    "plate_warehouse": plate_job(
        HERE / "plates" / "plate_warehouse.png", T2R / "scene_warehouse.jpg",
        "A cramped maintenance storage room on a space station: the back wall is completely "
        "covered by a dense grid of old metal drawers with worn labels, one lower drawer "
        "pulled open; a cluttered workbench on the right with boxes of old machine parts, a "
        "low empty table on the left; dim cold light with a slightly comedic hoarded feeling "
        "of decades of saved junk."),
    "plate_lounge": plate_job(
        HERE / "plates" / "plate_lounge.png", T2R / "scene_lounge.jpg",
        "A small crew rest room on an old space station: two old padded bench seats facing "
        "each other left and right, a low table on the right with a small wooden music box on "
        "it, and on the far wall a softly glowing warm amber holographic photograph floating "
        "in a light frame - inside the photo, the silhouette of a young girl placing a small "
        "potted plant on a window sill. The rest of the room is dim cold blue."),
    "plate_powerroom": plate_job(
        HERE / "plates" / "plate_powerroom.png", T2R / "scene_powerroom.jpg",
        "A dim power room on an old space station: a row of tall cylindrical battery silos "
        "standing along the back wall, and in the center an auxiliary battery slot built into "
        "a pedestal with a faint status glow, cables and pipes along the floor and walls, deep "
        "cold blue shadows with one small warm indicator light. Quiet humming atmosphere."),
    "plate_cockpit": plate_job(
        HERE / "plates" / "plate_cockpit.png", T2R / "scene_cockpit.jpg",
        "The small cramped cockpit of an escape shuttle: a wide front viewport window showing "
        "deep space, stars and the curve of a large blue planet outside; a worn old pilot seat "
        "in the right foreground; a compact dashboard of dim blue glowing instrument panels; "
        "by the left side of the window a small secured side ledge with straps holding a tiny "
        "cracked off-white ceramic cup with a two-leaf sprout, next to a small warm amber "
        "reading lamp casting a cozy glow. Cramped but tender."),
    "plate_exterior": plate_job(
        HERE / "plates" / "plate_exterior.png", T2R / "scene_exterior.jpg",
        "Outer space: a huge blue planet fills the lower half of the frame with a soft glowing "
        "atmosphere rim; above it floats an old ring-shaped space station with a few warm "
        "amber window lights along its ring, most sections dark; deep starry black sky. Vast, "
        "quiet, melancholic scale."),
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
    for r in refs:
        if not Path(r).exists():
            print(f"FAIL {name}: 缺参考图 {r}", file=sys.stderr)
            return False
    out.parent.mkdir(parents=True, exist_ok=True)
    size = job["size"]
    if not size and job.get("size_from"):
        from PIL import Image
        with Image.open(job["size_from"]) as im:
            size = f"{im.size[0]}x{im.size[1]}"
    cmd = [sys.executable, str(GEN), "--out", str(out), "--timeout", "420"]
    for r in refs:
        cmd += ["--ref", r]
    if size:
        cmd += ["--size", size]
    cmd += ["--prompt", job["prompt"]]
    print(f"=== {name} ===", flush=True)
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=460)
    except subprocess.TimeoutExpired:
        print(f"FAIL {name}: 超时", file=sys.stderr)
        return False
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
        "size": size,
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
