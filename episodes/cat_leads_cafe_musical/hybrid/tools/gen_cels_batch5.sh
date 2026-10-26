#!/usr/bin/env bash
# 批次5：转身正面系 cel 的同图嘴部变体（唱段口型用）
set -u
cd "$(dirname "$0")/../../../.."
EP="episodes/cat_leads_cafe_musical"
GEN="../dula-skills/build-continuous-story-images/scripts/gen_image_auto.py"
PY=".venv/Scripts/python.exe"
OUT="$EP/hybrid/assets/cels"

run() {
  local out="$1" size="$2" prompt="$3"
  if [ -s "$out" ]; then echo "SKIP $out"; return 0; fi
  echo "== GEN $out"
  "$PY" "$GEN" --out "$out" --ref "$REFF" --size "$size" --prompt "$prompt"
}
for base in girl_turn_front_open_v1 girl_turn_t1r_v1 girl_turn_t7r_v1 boy_turn_front_open_v1 boy_turn_t1_v1 boy_turn_t7_v1; do
  REFF="$OUT/${base}_headcrop.png"
  case $base in girl*) SZ=370x410;; *) SZ=390x400;; esac
  run "$OUT/${base}_mouth_open.png" "$SZ" "Edit the supplied head crop: change ONLY the mouth to open mid-singing (lips parted, natural open singing mouth, joyful), every other pixel unchanged. Generate exactly one image."
  run "$OUT/${base}_mouth_half.png" "$SZ" "Edit the supplied head crop: change ONLY the mouth to relaxed half-open (slight part), every other pixel unchanged. Generate exactly one image."
done
echo "== batch5 done"; ls "$OUT" | grep -c "mouth"
