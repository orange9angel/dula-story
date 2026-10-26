#!/usr/bin/env bash
# 批次4：转身逐拍相位画（每角色8相位=3已有+5新生成）+ 同图局部编辑表情变体
# 依据：s1e2 成片研究——每步态相位一张独立画，链式验收；局部编辑必须在同一张底图上做。
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

GIRL_ID="exactly the same blue-haired girl in the supplied ORIGINAL references (face portrait first), very long smooth dark cobalt blue hair to the hips with strand detail, white short-sleeved button shirt with pointed collar and breast pocket tucked into navy plaid pleated skirt, dark knee-high socks, black loafers, delicate anime linework, lavender cel shadows, NO 3D look"
BOY_ID="exactly the same black-haired boy in the supplied ORIGINAL references (face portrait first), short tousled black hair with warm amber rim light on the viewer-right side, white short-sleeved button shirt, dark navy trousers with black belt, white sneakers, delicate anime linework, lavender cel shadows, NO 3D look"
TAIL="Entire character visible head to toes, mid-turn dance motion with joyful energy, no props, no floor, no shadow, no background, no text. Tall portrait canvas, 6 percent margin. This is one drawing of an 8-drawing turn cycle; keep body proportions and costume identical to the reference drawings."

# ---- 女孩（朝画面左先转；已有 T0=front_open(0°) T2=side_cross(90°朝左) T4=back_open(180°)）----
REFS="--ref $IMG/girl_portrait_v1.png --ref $OUT/girl_turn_front_open_v1.png"
run "$OUT/girl_turn_t1_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $GIRL_ID, now in THREE-QUARTER FRONT view turned 45 degrees toward the viewer's LEFT (we see her right cheek and the right side of her body receding), right leg beginning to cross in front of the left, arms opening low. $TAIL"
REFS="--ref $IMG/girl_portrait_v1.png --ref $OUT/girl_turn_side_cross_v1.png"
run "$OUT/girl_turn_t3_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $GIRL_ID, now in THREE-QUARTER BACK view turned 135 degrees (between profile-facing-left and full back), the long hair swinging across the viewer-LEFT covering part of her back, her left leg planting behind her, arms open low. $TAIL"
REFS="--ref $IMG/girl_portrait_v1.png --ref $OUT/girl_turn_back_open_v1.png"
run "$OUT/girl_turn_t5_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $GIRL_ID, now in THREE-QUARTER BACK view turned 225 degrees (between full back and profile-facing-right), the long hair swung toward the viewer-RIGHT revealing her left shoulder area, weight transferring to the right leg, arms open low. $TAIL"
REFS="--ref $IMG/girl_portrait_v1.png --ref $OUT/girl_turn_side_cross_v1.png"
run "$OUT/girl_turn_t6_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $GIRL_ID, PERFECT SIDE VIEW facing screen RIGHT (opposite direction from the second reference which faces left), mid cross-step with the far foot on its toe, arms opened low and wide, the long hair swinging toward the viewer-LEFT, breast pocket visible on the far side of her chest. $TAIL"
REFS="--ref $IMG/girl_portrait_v1.png --ref $OUT/girl_turn_front_open_v1.png"
run "$OUT/girl_turn_t7_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $GIRL_ID, now in THREE-QUARTER FRONT view turned 315 degrees (between profile-facing-right and full front, turning back toward the viewer), hair settling toward the viewer-LEFT, arms lowering from open toward relaxed, gentle happy smile. $TAIL"

# ---- 男孩（方向相反；已有 T0/T2/T4）----
REFS="--ref $IMG/boy_portrait_v1.png --ref $OUT/boy_turn_front_open_v1.png"
run "$OUT/boy_turn_t1_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $BOY_ID, now in THREE-QUARTER FRONT view turned 45 degrees toward the viewer's RIGHT, left leg beginning to cross, arms opening low, amber rim light staying on the viewer-RIGHT edge of his hair. $TAIL"
REFS="--ref $IMG/boy_portrait_v1.png --ref $OUT/boy_turn_side_cross_v1.png"
run "$OUT/boy_turn_t3_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $BOY_ID, now in THREE-QUARTER BACK view turned 135 degrees (between profile-facing-right and full back), right leg planting behind, arms open low, amber rim light on the hair edge toward the viewer-RIGHT. $TAIL"
REFS="--ref $IMG/boy_portrait_v1.png --ref $OUT/boy_turn_back_open_v1.png"
run "$OUT/boy_turn_t5_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $BOY_ID, now in THREE-QUARTER BACK view turned 225 degrees (between full back and profile-facing-left), weight transferring, arms open low, amber rim light on the viewer-RIGHT hair edge. $TAIL"
REFS="--ref $IMG/boy_portrait_v1.png --ref $OUT/boy_turn_side_cross_v1.png"
run "$OUT/boy_turn_t6_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $BOY_ID, PERFECT SIDE VIEW facing screen LEFT... wait: facing screen LEFT is the second reference; this drawing faces screen RIGHT, mid cross-step, arms low and wide, amber rim light on the hair edge toward the viewer-RIGHT (the back of his head side). $TAIL"
REFS="--ref $IMG/boy_portrait_v1.png --ref $OUT/boy_turn_front_open_v1.png"
run "$OUT/boy_turn_t7_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $BOY_ID, now in THREE-QUARTER FRONT view turned 315 degrees (turning back toward the viewer from profile-facing-left), arms lowering from open toward relaxed, gentle happy smile, amber rim light viewer-RIGHT. $TAIL"

# ---- 同图局部编辑：在坐姿 cel 自己的头上做眼/嘴变体（供体=同一张画）----
# 先裁头（固定框），局部编辑后羽化贴回——由各 cel 自己的像素保证同源
crop_head() { # $1=cel名 $2=框 "x0,y0,x1,y1"
  "$PY" - "$EP" "$OUT" "$1" "$2" <<'PYEOF'
import sys
from PIL import Image
ep,out,name,box=sys.argv[1:5]
x0,y0,x1,y1=[int(v) for v in box.split(',')]
im=Image.open(f'{out}/{name}.png').convert('RGBA')
bg=Image.new('RGBA',im.size,(255,255,255,255)); bg.alpha_composite(im)
bg.crop((x0,y0,x1,y1)).convert('RGB').save(f'{out}/{name}_headcrop.png')
print('headcrop',name)
PYEOF
}
crop_head girl_sit_v1 "330,100,720,560"
crop_head boy_sit_v1 "300,80,700,540"

REFS="--ref $OUT/girl_sit_v1_headcrop.png"
run "$OUT/girl_sit_eyes_tease_v1.png" 390x460 "Edit the supplied head crop: change ONLY her eyes to a playful teasing expression (eyelids slightly lowered and relaxed, a hint of mischief, gaze directed toward the viewer's RIGHT where her friend sits), every other pixel unchanged. Generate exactly one image."
run "$OUT/girl_sit_eyes_blink_v1.png" 390x460 "Edit the supplied head crop: change ONLY her eyes to closed (extremely thin light-colored short curved lid lines, NO thick black eyeliner), every other pixel unchanged. Generate exactly one image."
run "$OUT/girl_sit_mouth_open_v1.png" 390x460 "Edit the supplied head crop: change ONLY the mouth to gently open for speech (lips parted, small dark opening), every other pixel unchanged. Generate exactly one image."
run "$OUT/girl_sit_mouth_half_v1.png" 390x460 "Edit the supplied head crop: change ONLY the mouth to relaxed half-open (slight part), every other pixel unchanged. Generate exactly one image."

REFS="--ref $OUT/boy_sit_v1_headcrop.png"
run "$OUT/boy_sit_eyes_focus_v1.png" 400x460 "Edit the supplied head crop: change ONLY his eyes so both pupils look down toward the lower-LEFT (at a notebook on the table), eyelids slightly lowered and calm, every other pixel unchanged. Generate exactly one image."
run "$OUT/boy_sit_eyes_blink_v1.png" 400x460 "Edit the supplied head crop: change ONLY his eyes to closed (extremely thin light-colored short curved lid lines, NO thick black eyeliner), every other pixel unchanged. Generate exactly one image."
run "$OUT/boy_sit_mouth_open_v1.png" 400x460 "Edit the supplied head crop: change ONLY the mouth to gently open for speech, every other pixel unchanged. Generate exactly one image."
run "$OUT/boy_sit_mouth_half_v1.png" 400x460 "Edit the supplied head crop: change ONLY the mouth to relaxed half-open, every other pixel unchanged. Generate exactly one image."

echo "== batch4 done"
ls -la "$OUT" | grep -E "turn_t|sit_" | tail -22
