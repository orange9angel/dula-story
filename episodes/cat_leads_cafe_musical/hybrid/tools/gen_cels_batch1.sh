#!/usr/bin/env bash
# 批次1：转身多视角全身 cel + 表情局部变体（串行，codex 优先，幂等跳过已存在产物）
# 每个 run 结束后立即验收归档纪律：脚本幂等，重跑只补缺口。
set -u
cd "$(dirname "$0")/../../../.."   # dula-story 根
EP="episodes/cat_leads_cafe_musical"
GEN="../dula-skills/build-continuous-story-images/scripts/gen_image_auto.py"
PY=".venv/Scripts/python.exe"
IMG="$EP/assets/images"
OUT="$EP/hybrid/assets/cels"
mkdir -p "$OUT"

run() { # $1=out $2=size $3=prompt ; refs 全局 $REFS
  local out="$1" size="$2" prompt="$3"
  if [ -s "$out" ]; then echo "SKIP $out"; return 0; fi
  echo "== GEN $out"
  "$PY" "$GEN" --out "$out" $REFS --size "$size" --prompt "$prompt"
}

STYLE_GIRL="exactly the same blue-haired girl in the supplied ORIGINAL references (face portrait first, front body second). Retain original delicate anime linework, expressive amber eyes, youthfulness, accurate 6-head proportions, very long smooth dark cobalt blue hair to the hips with tapered ends and visible strand detail, white short-sleeved button shirt with pointed collar and breast pocket tucked into navy blue small gold-lined plaid pleated skirt, dark knee-high socks and black loafers. Entire character visible head to toes, crisp illustrated cloth folds and lavender cel shadows, NO 3D look or simplified vector shapes."
STYLE_BOY="exactly the same black-haired boy in the supplied ORIGINAL references (face portrait first, front body second). Retain original delicate anime linework, soft brown eyes, youthfulness, accurate 6-head proportions, short tousled black hair with the signature warm amber rim light on the viewer-right side of his hair, white short-sleeved button shirt with pointed collar and breast pocket (untucked is fine, matching reference), dark navy straight trousers with black belt, white sneakers. Entire character visible head to toes, crisp illustrated cloth folds and lavender cel shadows, NO 3D look or simplified vector shapes."
TAIL="No props, no floor, no shadow, no background, no text, no frame. Tall portrait canvas, comfortably fill it with 6 percent margin. Preserve the source costume and identity; this is a production body asset for deforming illustrated animation."

REFS="--ref $IMG/girl_portrait_v1.png --ref $IMG/girl_body_v1.png"
run "$OUT/girl_back_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $STYLE_GIRL PERFECT BACK VIEW (character facing away from viewer), neutral standing pose for 2D animation rigging: both legs straight but relaxed, feet slightly apart, both arms hanging relaxed slightly away from torso with open hands, the very long hair falls down the back as the main feature showing rich strand detail and lighter cobalt highlight bands, hair tips reach the hips above the skirt hem, skirt plaid and pleats visible below the hair, back of shirt with illustrated folds. $TAIL"

REFS="--ref $IMG/boy_portrait_v1.png --ref $IMG/boy_body_v1.png"
run "$OUT/boy_side_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $STYLE_BOY PERFECT SIDE VIEW facing screen left, neutral standing pose for 2D animation rigging: both legs straight but relaxed, feet slightly apart, near arm hanging down relaxed with open hand and separated thumb, tousled hair silhouette in profile keeping the amber rim light on the hair edge away from the face, face in clean profile with gentle closed smile. $TAIL"
run "$OUT/boy_back_v1.png" 1024x1536 "Create one production-ready full body transparent PNG of $STYLE_BOY PERFECT BACK VIEW (character facing away from viewer), neutral standing pose for 2D animation rigging: both legs straight but relaxed, feet slightly apart, both arms hanging relaxed slightly away from torso with open hands, short tousled black hair from behind with the warm amber rim light band visible on the viewer-right edge, back of shirt with illustrated folds, trouser creases, white sneakers from behind. $TAIL"

# 表情局部变体（基帧尺寸必须等于真实文件尺寸；闭眼弧线必须极细浅色）
REFS="--ref $IMG/girl_portrait_v1.png"
run "$OUT/girl_face_open_v1.png" 1312x1199 "Edit the supplied portrait: change ONLY the mouth to a gently open singing mouth ( lips parted, small dark mouth opening, no teeth exaggeration ), every other pixel unchanged: same face, eyes, hair, lighting, canvas size 1312x1199. Generate exactly one image."
run "$OUT/girl_face_half_v1.png" 1312x1199 "Edit the supplied portrait: change ONLY the mouth to a relaxed half-open mouth ( slight part, small opening ), every other pixel unchanged: same face, eyes, hair, lighting, canvas size 1312x1199. Generate exactly one image."
run "$OUT/girl_face_blink_v1.png" 1312x1199 "Edit the supplied portrait: change ONLY the eyes to closed ( extremely thin, light-colored, short curved lid lines, NO thick black eyeliner ), every other pixel unchanged: same face, mouth, hair, lighting, canvas size 1312x1199. Generate exactly one image."

REFS="--ref $IMG/boy_portrait_v1.png"
run "$OUT/boy_face_open_v1.png" 1359x1158 "Edit the supplied portrait: change ONLY the mouth to a gently open singing mouth ( lips parted, small dark mouth opening ), every other pixel unchanged: same face, eyes, hair, lighting, canvas size 1359x1158. Generate exactly one image."
run "$OUT/boy_face_half_v1.png" 1359x1158 "Edit the supplied portrait: change ONLY the mouth to a relaxed half-open mouth, every other pixel unchanged: same face, eyes, hair, lighting. Generate exactly one image."
run "$OUT/boy_face_blink_v1.png" 1359x1158 "Edit the supplied portrait: change ONLY the eyes to closed ( extremely thin, light-colored, short curved lid lines, NO thick black eyeliner ), every other pixel unchanged: same face, mouth, hair, lighting, canvas size 1359x1158. Generate exactly one image."

echo "== batch1 done"
ls -la "$OUT"
