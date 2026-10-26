#!/usr/bin/env bash
# 批次2：对白段坐姿 cel ×2 + 前景桌椅道具层（串行，幂等）
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

REFS="--ref $IMG/girl_portrait_v1.png --ref $IMG/girl_body_v1.png"
run "$OUT/girl_sit_v1.png" 1024x1536 "Create one production-ready transparent PNG of exactly the same blue-haired girl in the supplied ORIGINAL references (face portrait first, front body second), now SITTING on an invisible chair, front view: hips at seated height, back straight but relaxed, both knees bent 90 degrees and together, lower legs vertical, black loafers flat on the invisible floor, hands resting softly on her lap, very long cobalt blue hair with strand detail falling behind shoulders and torso to seat level, white short-sleeved button shirt tucked into navy plaid pleated skirt (pleats spread naturally on the seat), dark knee-high socks. Delicate anime linework, lavender cel shadows, NO 3D look. Entire character visible head to toes. No chair, no props, no floor, no shadow, no background, no text. Tall portrait canvas, 6 percent margin. Preserve identity and costume; production body asset for illustrated animation."

REFS="--ref $IMG/boy_portrait_v1.png --ref $IMG/boy_body_v1.png"
run "$OUT/boy_sit_v1.png" 1024x1536 "Create one production-ready transparent PNG of exactly the same black-haired boy in the supplied ORIGINAL references (face portrait first, front body second), now SITTING on an invisible chair, front view, leaning slightly forward as if sketching: hips at seated height, knees bent 90 degrees apart, lower legs vertical, white sneakers flat, his RIGHT arm (on the VIEWER'S LEFT side of the image) bent down-forward holding a slim dark pen as if drawing on an invisible notebook at lap height, left arm resting down. Short tousled black hair with warm amber rim light on the viewer-right side, white short-sleeved button shirt, dark navy trousers with black belt. Delicate anime linework, lavender cel shadows, NO 3D look. Entire character visible head to toes. No chair, no notebook, no floor, no shadow, no background, no text. Tall portrait canvas, 6 percent margin. Preserve identity and costume; production body asset for illustrated animation."

REFS="--ref $IMG/cafe_master_v1.png"
run "$OUT/cafe_table_fg_v1.png" 1920x1080 "Create one production-ready transparent PNG foreground furniture layer matching the supplied sunny Japanese cafe interior background (image 1, style and palette reference only): ONE light wood cafe table seen straight on at slight three-quarter, with a cream ceramic cup and saucer and a small spoon on the left side of the tabletop and an open sketch notebook with a dark pen on the right side, plus TWO simple wooden chairs with teal cushioned seats tucked at the table, one on each side facing the viewer. Warm sunny palette, soft illustrated shading matching the reference, NO people, NO background walls or windows: only the table, chairs and tabletop items on transparency. Landscape canvas 1920x1080, table centered horizontally, occupying the lower middle, full table and both chairs visible. No text, no frame."
echo "== batch2 done"
ls -la "$OUT"
