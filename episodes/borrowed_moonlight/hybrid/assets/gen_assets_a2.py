#!/usr/bin/env python3
"""borrowed_moonlight cel-cinema 第二批文生图资产（A2）：
姿势 cel 集 + 走拍相位画（宫格条）+ 表情/嘴/眼同图变体（raw）。

通道：codex CLI（gen_image_codex.py），串行前台，skip-if-exists 可重跑。
每张产物旁写 <name>.source.json（provider/model/prompt/refs/sha256）。
姿势 cel：refs = [身份锚（首位=身份权重最高）, 3D 底稿姿势帧（仅锁姿势）]。
走拍相位：宫格合并出图（2x4 / 2x2），生成后用 tools/slice_walk_strip.py 裁格。
脸部变体：refs = [肖像锚]（唯一 ref=同图编辑底图），raw 产物进 faces/raw/，
  再由 tools/lock_face_variants.py 逐像素锁回 faces/（框外零差分）。

用法（任意目录）：
  python gen_assets_a2.py             # 跑全部缺口
  python gen_assets_a2.py --only eileen_stand ladymoon_revived
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
P5 = EP / "storyboard" / "p5"
A2R = EP / "storyboard" / "a2" / "ref"
REFS = HERE / "refs"

STYLE = ("Art style (hard lock, applies to the whole image): a 19th-century European fairytale "
         "hand-drawn animated feature film - delicate watercolor washes with soft cel shading, "
         "visible gentle brushwork, storybook sensibility, soft cinematic light. "
         "STRICTLY AVOID: 3D render look, CGI, plastic or glossy toy-like surfaces, photorealism, "
         "photograph, neon colors, cyberpunk, metal armor, modern city, modern clothing, "
         "any text, letters, watermark, logo.")

CEL_BG = ("The character is isolated on a FULLY TRANSPARENT background (PNG with real alpha "
          "channel): no backdrop, no ground, no shadow on the ground, no scenery, nothing behind "
          "the character. Full body visible head to toe, centered, the character fills about 90% "
          "of the image height. Exactly ONE character in the image.")

CEL_REF_NOTE = ("Reference image 1 is the character identity anchor: match its face, hairstyle, "
                "costume pieces, colors and proportions EXACTLY. Reference image 2 is a rough "
                "low-poly 3D previz render: copy ONLY the body pose and staging from it - do NOT "
                "copy its flat 3D surfaces, gray look, background or framing. Repaint everything "
                "in the 2D hand-painted style above.")

STRIP_REF_NOTE = ("Reference image 1 is the character identity anchor: match its face, hairstyle, "
                  "costume pieces, colors and proportions EXACTLY. Reference image 2 is a 2x4 "
                  "contact sheet of a rough low-poly 3D previz walk cycle: copy ONLY the leg/arm "
                  "phase of each corresponding grid cell - do NOT copy its flat 3D surfaces, "
                  "gray look or backgrounds. Repaint everything in the 2D hand-painted style above.")

EDIT_NOTE = ("This is a LOCAL EDIT of the attached image. Keep the attached image's composition, "
             "pose, identity, colors, lighting and background EXACTLY unchanged; alter ONLY what "
             "the instruction below names. Output the full image at the same pixel size.")

EILEEN_ID = ("An 11-year-old girl, about 140cm tall, slim child build. Round oval face, large "
             "gray-blue eyes, short silver-white bob hair cut at jaw length with one single loose "
             "strand falling on the viewer's RIGHT side of her face (her own left side). She wears "
             "a deep blue velvet cloak fastened at the collar with a small round brass clasp, over "
             "a cream-white linen dress, and short brown boots.")

LAMP_ID = ("Her old copper lantern: a small vintage copper hand lantern with a loop handle on top "
           "and a glass shade that has one thin visible crack; the wick inside is unlit.")

ALDER_ID = ("A 70-year-old man, slightly hunched back. Long white beard, bushy gray eyebrows, round "
            "wire-frame glasses. He wears a worn dark wine-red old-fashioned formal tailcoat over a "
            "brass-buttoned vest, dark trousers and dark boots; several pocket watches with chains "
            "hang across his chest; his fingers are stained with greenish copper rust.")

LADYMOON_ID = ("A tall slender ethereal adult woman, otherworldly and graceful. Waist-length silver "
               "hair, an ivory-white semi-transparent layered long gown with wide flowing sleeves, "
               "tiny silver stardust ornaments scattered in her hair, cold pearl-like luminous skin, "
               "and a soft silver-white halo glow surrounding her body.")

EILEEN_FULL = REFS / "eileen_full.png"
ALDER_FULL = REFS / "alder_full.png"
LADYMOON_FULL = REFS / "ladymoon_full.png"
EILEEN_FACE = REFS / "eileen_face.png"
ALDER_FACE = REFS / "alder_face.png"
LADYMOON_FACE = REFS / "ladymoon_face.png"

WALK_PHASES_8 = ("The grid cells in reading order (left to right, top row then bottom row) are the "
                 "8 phases of ONE full walk cycle: 1=right foot heel contact in front, left foot "
                 "toe-off behind; 2=right leg passing under the body, left leg swinging forward; "
                 "3=legs passing each other, right foot flat supporting; 4=left foot heel contact "
                 "in front, right foot pushing off behind; 5=left foot full contact mid-stride, "
                 "right leg lifted swinging through; 6=left leg passing under the body, right leg "
                 "swinging forward; 7=legs passing each other, left foot flat supporting; "
                 "8=right foot heel contact again (mirror of 1, one full cycle later). "
                 "Consecutive cells must differ clearly in leg positions; arms swing gently in "
                 "counter-phase. Her steps are short and quick (a child hurrying).")


def cel_job(out: Path, refs: list[Path], pose: str, ident: str) -> dict:
    return {"out": out, "refs": refs, "size": "1024x1536",
            "prompt": pose + " " + ident + " " + CEL_BG + " " + STYLE + " " + CEL_REF_NOTE}


def face_job(out: Path, base: Path, edit: str) -> dict:
    return {"out": out, "refs": [base], "size": f"{_size(base)[0]}x{_size(base)[1]}",
            "prompt": EDIT_NOTE + " Edit instruction: " + edit}


_size_cache: dict[Path, tuple[int, int]] = {}


def _size(p: Path) -> tuple[int, int]:
    if p not in _size_cache:
        from PIL import Image
        with Image.open(p) as im:
            _size_cache[p] = im.size
    return _size_cache[p]


JOBS: dict[str, dict] = {
    # ================= 姿势 cel 集（cels/，1024x1536 透明底） =================
    # ---- 艾琳（8 姿势；walk 走相位条）----
    "eileen_stand": cel_job(
        HERE / "cels" / "eileen_stand.png",
        [EILEEN_FULL, P2 / "eileen_front.jpg"],
        "Pose: standing relaxed, facing the viewer, weight even on both feet, " + LAMP_ID +
        " held by its handle in her RIGHT hand, arm hanging straight down at her side; "
        "left arm relaxed. Calm gentle expression, eyes looking slightly ahead.",
        EILEEN_ID),
    "eileen_look_up": cel_job(
        HERE / "cels" / "eileen_look_up.png",
        [EILEEN_FULL, P2 / "eileen_look_up.jpg"],
        "Pose: standing, head tilted clearly UPWARD gazing at the moon high above (chin raised, "
        "face toward the sky), a quiet wondering expression; " + LAMP_ID +
        " held in her right hand hanging down. Body stays front-facing and still.",
        EILEEN_ID),
    "eileen_hold_bottle": cel_job(
        HERE / "cels" / "eileen_hold_bottle.png",
        [EILEEN_FULL, P2 / "eileen_hold_bottle.jpg"],
        "Pose: standing, carefully cradling a small glass bottle with BOTH hands at chest height; "
        "inside the bottle a tiny dim golden star glows softly. She looks down at it with a gentle "
        "marvelling expression. No lantern in this pose.",
        EILEEN_ID),
    "eileen_offer_lamp": cel_job(
        HERE / "cels" / "eileen_offer_lamp.png",
        [EILEEN_FULL, P2 / "eileen_offer_lamp.jpg"],
        "Pose: standing, BOTH arms extended straight forward at chest height, offering " + LAMP_ID +
        " held by its handle with both hands; a sincere, earnest expression, face slightly lifted. "
        "The lantern hangs from her forward-stretched hands, clearly below her chin.",
        EILEEN_ID),
    "eileen_crouch": cel_job(
        HERE / "cels" / "eileen_crouch.png",
        [EILEEN_FULL, P5 / "p5_m15_lamp_down.jpg"],
        "Pose: crouching low on bent knees, leaning forward, lowering " + LAMP_ID +
        " with her right hand toward the ground (placing it down); left hand steadying herself "
        "near her knee; head bowed looking down at the lantern.",
        EILEEN_ID),
    "eileen_hold_lamp_close": cel_job(
        HERE / "cels" / "eileen_hold_lamp_close.png",
        [EILEEN_FULL, P5 / "p5_m62_finale_dim.jpg"],
        "Pose: standing, hugging " + LAMP_ID +
        " close against her chest with both hands wrapped around it protectively, like holding "
        "something precious; soft warm expression, head slightly bowed toward the lantern.",
        EILEEN_ID),
    "eileen_wave_goodnight": cel_job(
        HERE / "cels" / "eileen_wave_goodnight.png",
        [EILEEN_FULL, P5 / "p5_m63_goodnight.jpg"],
        "Pose: standing facing the viewer, her LEFT hand raised beside her head in a gentle "
        "small goodnight wave (palm open toward the viewer, fingers relaxed), a warm soft smile; "
        + LAMP_ID + " held in her right hand hanging down at her side, its wick glowing softly "
        "golden again.",
        EILEEN_ID),
    # ---- 奥尔德（5 姿势）----
    "alder_stand_work": cel_job(
        HERE / "cels" / "alder_stand_work.png",
        [ALDER_FULL, A2R / "a2_alder_work2.jpg"],
        "Pose: standing behind an invisible workbench, torso stooped slightly forward (his natural "
        "hunch deepened), head bowed looking down at waist height, both hands held in front at "
        "waist level as if delicately repairing a tiny clockwork mechanism between his fingers. "
        "Concentrated expression. No workbench, no tools in the image - only the man and his pose.",
        ALDER_ID),
    "alder_touch_watch": cel_job(
        HERE / "cels" / "alder_touch_watch.png",
        [ALDER_FULL, P2 / "alder_touch_watch.jpg"],
        "Pose: standing, his RIGHT hand raised to his chest gently touching one of the pocket "
        "watches hanging there, head slightly bowed looking down at it; left arm hanging relaxed. "
        "A quiet nostalgic expression.",
        ALDER_ID),
    "alder_shock": cel_job(
        HERE / "cels" / "alder_shock.png",
        [ALDER_FULL, P5 / "p5_m22_alder_shock.jpg"],
        "Pose: startled - half a step backward (one foot slightly behind the other), torso "
        "straightened upright from its usual hunch, head lifted, eyes wide behind his glasses, "
        "mouth slightly open, both hands lifted a little away from his body with fingers "
        "trembling. Astonishment.",
        ALDER_ID),
    "alder_stand_hope": cel_job(
        HERE / "cels" / "alder_stand_hope.png",
        [ALDER_FULL, A2R / "a2_alder_hope2.jpg"],
        "Pose: standing still, facing the viewer, head tilted UPWARD gazing at the sky with a "
        "fragile hopeful expression, arms hanging quietly at his sides.",
        ALDER_ID),
    "alder_relieved": cel_job(
        HERE / "cels" / "alder_relieved.png",
        [ALDER_FULL, P5 / "p5_m61_locket.jpg"],
        "Pose: standing, shoulders dropped and relaxed in deep relief, head slightly bowed, eyes "
        "soft behind his glasses with the hint of restrained tears, one hand resting over the "
        "pocket watches on his chest; a quiet moved smile.",
        ALDER_ID),
    # ---- 月亮夫人（3 姿势）----
    "ladymoon_sit_throne": cel_job(
        HERE / "cels" / "ladymoon_sit_throne.png",
        [LADYMOON_FULL, P2 / "ladymoon_sit.jpg"],
        "Pose: seated as if on an invisible throne - upright weary posture, knees together, gown "
        "draping down over the seat to the floor, hands resting down at her sides where armrests "
        "would be, head bowed low, eyes nearly closed, utterly weary. NO throne, no chair, no "
        "background - only the woman in the seated pose.",
        LADYMOON_ID),
    "ladymoon_slow_raise": cel_job(
        HERE / "cels" / "ladymoon_slow_raise.png",
        [LADYMOON_FULL, P2 / "ladymoon_slow_raise.jpg"],
        "Pose: standing, raising her RIGHT hand very slowly to touch the center of her chest, "
        "movement heavy as if underwater; head slightly bowed, weary loving gaze lowered.",
        LADYMOON_ID),
    "ladymoon_revived": cel_job(
        HERE / "cels" / "ladymoon_revived.png",
        [LADYMOON_FULL, P5 / "p5_m49_revived.jpg"],
        "Pose: standing, revived - head gently RAISED, eyes open with soft wonder, a faint tender "
        "smile, one hand still near her chest; her silver-white halo glow is clearly BRIGHTER and "
        "wider, the stardust in her hair sparkling more, the gown slightly more luminous - "
        "radiant but NOT blinding, still soft.",
        LADYMOON_ID),
    # ================= 走拍相位条（cels/walk/，宫格出图后裁格） =================
    "eileen_walk_strip": {
        "out": HERE / "cels" / "walk" / "eileen_walk_strip.png",
        "timeout": 560,
        "refs": [EILEEN_FULL, A2R / "a2_eileen_walk_strip_ref.png"],
        "size": "1536x1024",
        "prompt": ("A walk-cycle sprite sheet: ONE single character shown in 8 pose phases, "
                   "arranged in a strict 2 rows x 4 columns grid of EQUAL cells with clear empty "
                   "gaps between cells, every cell showing the SAME girl at the SAME size, "
                   "full body head to toe, viewed from behind at a slight three-quarter angle "
                   "(we see her back, the back of her head and cloak, with a hint of her right "
                   "side). " + WALK_PHASES_8 + " " + EILEEN_ID + " She carries " + LAMP_ID +
                   " in her right hand throughout. Fully transparent background (real PNG alpha), "
                   "no ground, no shadow, no grid lines, no numbers, no scenery. "
                   + STYLE + " " + STRIP_REF_NOTE),
    },
    "alder_walk_strip": {
        "out": HERE / "cels" / "walk" / "alder_walk_strip.png",
        "timeout": 560,
        "refs": [ALDER_FULL, P2 / "alder_threeq.jpg"],
        "size": "1536x1024",
        "prompt": ("A walk-cycle sprite sheet: ONE single character shown in 4 pose phases, "
                   "arranged in a strict 2 rows x 2 columns grid of EQUAL cells with clear empty "
                   "gaps between cells, every cell showing the SAME old man at the SAME size, "
                   "full body head to toe, viewed from the front at a slight three-quarter angle "
                   "(his left side slightly toward us). The 4 cells in reading order (top-left, "
                   "top-right, bottom-left, bottom-right) are the phases of his SLOW elderly "
                   "walk: 1=right foot heel contact in front, left foot toe-off behind; "
                   "2=legs passing, right foot flat supporting; 3=left foot heel contact in "
                   "front, right foot toe-off behind; 4=legs passing, left foot flat supporting. "
                   "Short careful steps, arms nearly still, his hunched back unchanged. "
                   + ALDER_ID + " Fully transparent background (real PNG alpha), no ground, no "
                   "shadow, no grid lines, no numbers, no scenery. " + STYLE + " " + CEL_REF_NOTE),
    },
    # ================= 表情/嘴/眼同图变体（faces/raw/，锁定前素材） =================
    # ---- 艾琳（底图=肖像锚 curious/嘴闭/眼睁）----
    "eileen_mouth_half": face_job(HERE / "faces" / "raw" / "eileen_mouth_half.png", EILEEN_FACE,
        "change ONLY her mouth to slightly half-open (lips gently parted, mouth interior barely "
        "visible), as if mid-speech on a soft syllable. Eyes, brows, hair, background: identical."),
    "eileen_mouth_open": face_job(HERE / "faces" / "raw" / "eileen_mouth_open.png", EILEEN_FACE,
        "change ONLY her mouth to clearly open (speaking an open vowel like 'ah', mouth interior "
        "visible, jaw slightly lowered). Eyes, brows, hair, background: identical."),
    "eileen_blink": face_job(HERE / "faces" / "raw" / "eileen_blink.png", EILEEN_FACE,
        "change ONLY her eyes to fully closed (both upper eyelids shut over the eyes, eyelashes "
        "visible, natural mid-blink). Mouth, brows, hair, background: identical."),
    "eileen_expr_lonely": face_job(HERE / "faces" / "raw" / "eileen_expr_lonely.png", EILEEN_FACE,
        "change ONLY her facial expression to quiet loneliness: eyebrows very slightly lowered and "
        "drawn together, eyelids a little heavier, gaze cast slightly downward, mouth closed in a "
        "small neutral line. Same pose, same head angle, same hair, same background."),
    "eileen_expr_tearful": face_job(HERE / "faces" / "raw" / "eileen_expr_tearful.png", EILEEN_FACE,
        "change ONLY her facial expression to tearful but restrained: eyes glistening with "
        "welling tears (bright wet highlights, one tiny tear bead at the corner of one eye, NOT "
        "streaming), brows slightly knitted, small trembling closed mouth. Same pose, same head "
        "angle, same hair, same background."),
    "eileen_expr_smile": face_job(HERE / "faces" / "raw" / "eileen_expr_smile.png", EILEEN_FACE,
        "change ONLY her facial expression to a warm gentle smile: mouth closed curving softly "
        "upward, cheeks slightly lifted, eyes warm. Same pose, same head angle, same hair, same "
        "background."),
    "eileen_expr_determined": face_job(HERE / "faces" / "raw" / "eileen_expr_determined.png", EILEEN_FACE,
        "change ONLY her facial expression to quiet determination: eyebrows lowered and level, "
        "eyes steady and direct, small firm closed mouth. Same pose, same head angle, same hair, "
        "same background."),
    # ---- 奥尔德（底图=肖像锚 weary-neutral/嘴闭）----
    "alder_mouth_half": face_job(HERE / "faces" / "raw" / "alder_mouth_half.png", ALDER_FACE,
        "change ONLY his mouth to slightly half-open beneath the moustache (lips gently parted), "
        "as if mid-speech on a soft syllable. Eyes, glasses, beard, background: identical."),
    "alder_mouth_open": face_job(HERE / "faces" / "raw" / "alder_mouth_open.png", ALDER_FACE,
        "change ONLY his mouth to clearly open beneath the moustache (speaking an open vowel, "
        "mouth interior visible, jaw slightly lowered). Eyes, glasses, beard, background: identical."),
    "alder_blink": face_job(HERE / "faces" / "raw" / "alder_blink.png", ALDER_FACE,
        "change ONLY his eyes to fully closed behind the round glasses (both eyelids shut, "
        "natural mid-blink, glasses unchanged). Mouth, brows, beard, background: identical."),
    "alder_expr_dazed": face_job(HERE / "faces" / "raw" / "alder_expr_dazed.png", ALDER_FACE,
        "change ONLY his facial expression to dazed absence: gaze unfocused and slightly "
        "downcast, eyelids heavy, mouth slack and closed, deep weariness. Same pose, same head "
        "angle, same glasses and beard, same background."),
    "alder_expr_shocked": face_job(HERE / "faces" / "raw" / "alder_expr_shocked.png", ALDER_FACE,
        "change ONLY his facial expression to shocked: eyes wide open behind the round glasses, "
        "eyebrows jumped high, mouth dropped slightly open, glasses sitting a touch lower on his "
        "nose as if slipping. Same pose, same head angle, same beard, same background."),
    "alder_expr_relieved": face_job(HERE / "faces" / "raw" / "alder_expr_relieved.png", ALDER_FACE,
        "change ONLY his facial expression to deep relief with restrained emotion: eyes soft and "
        "glistening (tears held back, NOT falling), brows relaxed, a small trembling grateful "
        "smile under the moustache. Same pose, same head angle, same glasses and beard, same "
        "background."),
    # ---- 月亮夫人（底图=肖像锚 weary/嘴闭）----
    "ladymoon_mouth_half": face_job(HERE / "faces" / "raw" / "ladymoon_mouth_half.png", LADYMOON_FACE,
        "change ONLY her mouth to slightly half-open (lips gently parted), as if mid-speech on a "
        "soft syllable. Eyes, hair, halo, background: identical."),
    "ladymoon_mouth_open": face_job(HERE / "faces" / "raw" / "ladymoon_mouth_open.png", LADYMOON_FACE,
        "change ONLY her mouth to clearly open (speaking an open vowel, mouth interior visible, "
        "jaw slightly lowered). Eyes, hair, halo, background: identical."),
    "ladymoon_blink": face_job(HERE / "faces" / "raw" / "ladymoon_blink.png", LADYMOON_FACE,
        "change ONLY her eyes to fully closed (both eyelids shut, serene mid-blink). Mouth, hair, "
        "halo, background: identical."),
    "ladymoon_expr_revived": face_job(HERE / "faces" / "raw" / "ladymoon_expr_revived.png", LADYMOON_FACE,
        "change ONLY her facial expression to revived: eyes gently opened wider with soft wonder "
        "and warmth, a faint tender smile, weariness gone; her silver-white halo glow slightly "
        "brighter. Same pose, same head angle, same hair, same background."),
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
    cmd = [sys.executable, str(GEN), "--out", str(out), "--timeout", str(job.get("timeout", 280))]
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
