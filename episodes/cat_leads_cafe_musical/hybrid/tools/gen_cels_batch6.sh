#!/usr/bin/env bash
# 批次6：链式重生成女孩漂移最大的 4 张（t3/back_open/t1r/t7r）
# 参考=身份锚+全部已验收相位画（累积历史），比例约束逐字写进 prompt
set -u
cd "$(dirname "$0")/../../../.."
EP="episodes/cat_leads_cafe_musical"
GEN="../dula-skills/build-continuous-story-images/scripts/gen_image_auto.py"
PY=".venv/Scripts/python.exe"
IMG="$EP/assets/images"; OUT="$EP/hybrid/assets/cels"
BASE_REFS="--ref $IMG/girl_portrait_v1.png --ref $IMG/girl_body_v1.png --ref $OUT/girl_turn_front_open_v1.png --ref $OUT/girl_turn_t1_v1.png --ref $OUT/girl_turn_t6_v1.png"
LOCK="CRITICAL PROPORTION LOCK: she must match the reference drawings exactly — head is precisely 1/10 of total figure height, waistband at 35% from crown, hem of the pleated skirt at 54%, knee-high socks start at 60%, same slim thigh thickness as the references, same shoulder width. Very long cobalt hair with strand detail, white short-sleeved shirt tucked into navy plaid pleated skirt, black loafers, delicate anime linework, lavender cel shadows, NO 3D look, NO elongated torso. Entire character head to toes, no props/floor/shadow/background/text. Tall portrait canvas, 6 percent margin."

run() {
  local out="$1"; local prompt="$2"
  if [ -s "$out" ]; then echo "SKIP $out"; return 0; fi
  echo "== GEN $out"
  $PY "$GEN" --out "$out" $BASE_REFS --size 1024x1536 --prompt "$prompt"
}
run "$OUT/girl_turn_t1r_v2.png" "Create one production-ready full body transparent PNG of exactly the same blue-haired girl in the supplied references (image 1 face identity, image 2 front body, images 3-5 same character mid-turn), now: THREE-QUARTER FRONT view turned 45 degrees toward the viewer's RIGHT (we see her left cheek, breast pocket on the viewer-RIGHT), her LEFT leg beginning to cross, arms opening low, hair starting to swing toward the viewer's LEFT. $LOCK"
run "$OUT/girl_turn_t3_v2.png" "Create one production-ready full body transparent PNG of exactly the same blue-haired girl in the supplied references, now: THREE-QUARTER BACK view turned 135 degrees (between profile-facing-left and full back), long hair swinging across the viewer-LEFT covering part of her back, left leg planting behind, arms open low. $LOCK"
run "$OUT/girl_turn_back_open_v2.png" "Create one production-ready full body transparent PNG of exactly the same blue-haired girl in the supplied references, now: full BACK view at the most open moment of the turn, both arms opened wide and low, long cobalt hair swung toward the viewer-LEFT revealing part of her back and right shoulder, plaid skirt flaring slightly, legs mid-step with one heel lifted. NOTE: include her full hair volume above the crown so total figure height matches the references. $LOCK"
run "$OUT/girl_turn_t7r_v2.png" "Create one production-ready full body transparent PNG of exactly the same blue-haired girl in the supplied references, now: THREE-QUARTER FRONT view turning back toward the viewer from profile-facing-LEFT (we see her right cheek, breast pocket viewer-RIGHT), hair settling toward the viewer-RIGHT, arms lowering from open toward relaxed, gentle happy smile. $LOCK"
echo "== batch6 done"; ls -la "$OUT" | grep _v2
