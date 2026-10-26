#!/usr/bin/env bash
# 批次3：表演关键画（作画层，非立绘复用）——表情4 + 敲杯2 + 转身关键画6
# 每张对应 ACTING_DESIGN.md 的一行可见缺口；串行、幂等。
set -u
cd "$(dirname "$0")/../../../.."   # dula-story 根
EP="episodes/cat_leads_cafe_musical"
GEN="../dula-skills/build-continuous-story-images/scripts/gen_image_auto.py"
PY=".venv/Scripts/python.exe"
IMG="$EP/assets/images"
OUT="$EP/hybrid/assets/cels"
mkdir -p "$OUT"

run() {
  local out="$1" size="$2" prompt="$3"
  if [ -s "$out" ]; then echo "SKIP $out"; return 0; fi
  echo "== GEN $out"
  "$PY" "$GEN" --out "$out" $REFS --size "$size" --prompt "$prompt"
}

# ---- 表情（肖像局部编辑；锁区取用，全图重编码噪声已由窗口合成兜住）----
REFS="--ref $IMG/girl_portrait_v1.png"
run "$OUT/girl_face_tease_v1.png" 1312x1199 "Edit the supplied portrait: change ONLY her expression to a playful teasing half-smile -- eyelids slightly lowered and relaxed, eyebrows relaxed with a hint of mischief, one corner of the mouth raised in a small asymmetric smirk; eyes stay the same amber color and same shape size. Every other pixel unchanged: same hair, face shape, lighting, canvas 1312x1199. Generate exactly one image."
run "$OUT/girl_face_invite_v1.png" 1312x1199 "Edit the supplied portrait: change ONLY her expression to a bright inviting open smile -- mouth open in a cheerful smile, cheeks slightly lifted, eyes happily engaged (not closed); same amber eyes, same hair, face shape, lighting, canvas 1312x1199. Every other pixel unchanged. Generate exactly one image."

REFS="--ref $IMG/boy_portrait_v1.png"
run "$OUT/boy_face_focus_v1.png" 1359x1158 "Edit the supplied portrait: change ONLY his gaze and eyelids -- both pupils look down toward the lower-left as if at a notebook on a table, eyelids slightly lowered, a faint gentle smile; everything else unchanged: same hair, face shape, lighting, canvas 1359x1158. Generate exactly one image."
run "$OUT/boy_face_lookup_v1.png" 1359x1158 "Edit the supplied portrait: change ONLY his gaze and brows -- both pupils look up toward the upper-left of the image (toward someone sitting across), eyebrows very slightly raised, mouth closed with a soft caught-off-guard smile; everything else unchanged: same hair, face shape, lighting, canvas 1359x1158. Generate exactly one image."

# ---- 敲杯关键画（坐姿变体，含右臂动作；身份=肖像+正面坐姿）----
REFS="--ref $IMG/girl_portrait_v1.png --ref $OUT/girl_sit_v1.png"
run "$OUT/girl_sit_reach_v1.png" 1024x1536 "Create one production-ready transparent PNG of exactly the same sitting blue-haired girl as the supplied references (image 1 face identity, image 2 sitting pose base): same seated front-view pose on an invisible chair, but now her RIGHT arm (on the VIEWER'S LEFT side of the image) reaches forward and slightly down, hand holding a slim small spoon above an invisible cup at table height, her eyes looking down at that point with the playful teasing half-smile; left hand stays on her lap. Very long cobalt hair with strand detail behind shoulders, white shirt, navy plaid pleated skirt on the seat, dark knee-high socks, black loafers. Delicate anime linework, lavender cel shadows, NO 3D look. Entire character head to toes. No cup, no table, no chair, no floor, no shadow, no background, no text. Tall portrait canvas, 6 percent margin."
run "$OUT/girl_sit_tap_v1.png" 1024x1536 "Create one production-ready transparent PNG of exactly the same sitting blue-haired girl as the supplied references (image 1 face identity, image 2 sitting pose base): same seated pose, RIGHT arm (VIEWER'S LEFT side) a touch lower than reaching, hand holding the slim spoon at the exact moment of tapping an invisible cup rim -- arm relaxed downward, a small satisfied closed-mouth smile, eyes on the cup; left hand on lap. Same costume and hair detail as references. No cup, no table, no chair, no floor, no shadow, no background, no text. Tall portrait canvas, 6 percent margin. Delicate anime linework, NO 3D look."

# ---- 转身关键画（每角色：正面展开/侧面交叉步/背面展开；身份=肖像+全身）----
REFS="--ref $IMG/girl_portrait_v1.png --ref $IMG/girl_body_v1.png"
run "$OUT/girl_turn_front_open_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of exactly the same blue-haired girl in the supplied ORIGINAL references (face portrait first, front body second), same costume and identity, FRONT VIEW, captured mid-dance: both arms opening outward low (about 35 degrees from torso, elbows soft, hands open and relaxed), weight shifting onto her LEFT leg (VIEWER'S RIGHT side), right foot just beginning to lift at the heel, knees soft, torso upright with a slight lively tilt, very long cobalt hair with strand detail just beginning to sway toward the VIEWER'S RIGHT, gentle happy closed smile. Crisp illustrated cloth folds, lavender cel shadows, NO 3D look. No props, floor, shadow, background or text. Tall portrait canvas, 6 percent margin."
run "$OUT/girl_turn_side_cross_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of exactly the same blue-haired girl in the supplied ORIGINAL references, same costume and identity, PERFECT SIDE VIEW facing screen left, captured mid-turn cross-step: her near leg crossing IN FRONT of the far leg, far foot on its toe about to push off, both arms opened low and wide for balance, the very long hair swinging toward the VIEWER'S RIGHT (lagging behind the turn) with visible strand separation and motion, skirt pleats flaring slightly from the rotation, profile face with a joyful expression. Crisp linework, lavender cel shadows, NO 3D look. No props, floor, shadow, background or text. Tall portrait canvas, 6 percent margin."
run "$OUT/girl_turn_back_open_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of exactly the same blue-haired girl in the supplied ORIGINAL references, same costume and identity, BACK VIEW (facing away), at the most open moment of a dance turn: both arms opened wide and low, the very long cobalt hair swung toward the VIEWER'S LEFT revealing part of her back and right shoulder, rich strand detail and lighter blue highlight bands in the swinging hair, plaid skirt flaring slightly, legs mid-step with one heel lifted. Crisp linework, lavender cel shadows, NO 3D look. No props, floor, shadow, background or text. Tall portrait canvas, 6 percent margin."

REFS="--ref $IMG/boy_portrait_v1.png --ref $IMG/boy_body_v1.png"
run "$OUT/boy_turn_front_open_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of exactly the same black-haired boy in the supplied ORIGINAL references (face portrait first, front body second), same costume and identity including the warm amber rim light on the VIEWER-RIGHT side of his hair, FRONT VIEW, captured mid-dance: both arms opening outward low (about 35 degrees from torso, elbows soft, hands open), weight shifting onto his RIGHT leg (VIEWER'S LEFT side), left foot heel just lifting, knees soft, slight lively torso tilt, tousled hair starting to sway toward VIEWER'S LEFT, gentle happy closed smile. Crisp linework, lavender cel shadows, NO 3D look. No props, floor, shadow, background or text. Tall portrait canvas, 6 percent margin."
run "$OUT/boy_turn_side_cross_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of exactly the same black-haired boy in the supplied ORIGINAL references, same costume and identity, PERFECT SIDE VIEW facing screen left, captured mid-turn cross-step: his near leg crossing IN FRONT of the far leg, far foot on its toe pushing off, both arms opened low and wide, tousled hair swinging with the motion keeping the amber rim light on the hair edge toward the VIEWER'S RIGHT, profile face with a joyful expression. Crisp linework, lavender cel shadows, NO 3D look. No props, floor, shadow, background or text. Tall portrait canvas, 6 percent margin."
run "$OUT/boy_turn_back_open_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of exactly the same black-haired boy in the supplied ORIGINAL references, same costume and identity, BACK VIEW (facing away), at the most open moment of a dance turn: both arms opened wide and low, short tousled black hair from behind with the warm amber rim light band on the VIEWER-RIGHT edge, white shirt back with illustrated folds in motion, navy trousers, legs mid-step with one heel lifted, white sneakers. Crisp linework, lavender cel shadows, NO 3D look. No props, floor, shadow, background or text. Tall portrait canvas, 6 percent margin."

echo "== batch3 done"
ls -la "$OUT"
