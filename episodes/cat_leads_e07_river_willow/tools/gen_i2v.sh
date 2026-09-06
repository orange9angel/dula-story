#!/bin/bash
# E07 I2V: ONE segment -- trio walking up the riverside path (full-body
# displacement only, per the grammar boundary). Seedance 2.0 FULL; resolution
# comes from config/render_spec.json (generation_tier).
# Requires ARK_API_KEY:  set -a && source ../../.env.ark
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e07_river_willow"
mkdir -p assets/i2v tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e07_river_willow/assets"
K="$A/keyframes"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v_seedance.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"

STYLE="Keep the exact flat-color illustration style of the input image: razor-clean flat color shapes, zero texture, no gradients except the sky, bright daytime palette with lavender shadows and flat gold dappled light, no new elements, no camera movement."

i2v() { # name slot_seconds firstframe prompt
  local name="$1" dur="$2" frame="$3" prompt="$4"
  if [ -s "$A/i2v/$name.mp4" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== i2v $name (slot ${dur}s, gen 4s @${I2V_RES})"
  "$PY" "$GEN" --model doubao-seedance-2-0-260128 --out "$A/i2v/$name.full.mp4" \
    --first-frame "$frame" --prompt "$prompt $STYLE" --duration 4 \
    --resolution "$I2V_RES" --ratio adaptive \
    > "tmp/i2v_$name.log" 2>&1
  if [ ! -s "$A/i2v/$name.full.mp4" ]; then echo "== FAILED $name (see tmp/i2v_$name.log)"; return 1; fi
  ffmpeg -y -i "$A/i2v/$name.full.mp4" -t "$dur" -c:v libx264 -pix_fmt yuv420p \
    -an "$A/i2v/$name.mp4" >> "tmp/i2v_$name.log" 2>&1
  mkdir -p "$A/i2v/$name"
  ffmpeg -y -i "$A/i2v/$name.mp4" -vf fps=12 "$A/i2v/$name/f_%04d.png" \
    >> "tmp/i2v_$name.log" 2>&1
  local n
  n=$(ls "$A/i2v/$name"/f_*.png 2>/dev/null | wc -l)
  echo "== ok $name (${n} cels)"
}

i2v trio_path_walk_day 2.5 "$K/frame_05.png" "The girl, the boy and the orange tabby cat walk together toward the RIGHT along the riverside path under the willow shade, unhurried afternoon stroll, the cat trotting a step ahead; the tips of the girl's long hair sway faintly with her steps; the hanging willow branches overhead stay almost still. The camera is completely fixed; the background scrolls slowly left as they advance. Character count, poses and framing stay exactly as in the first frame."

# V5 additions: environment-motion shots (no characters = I2V's legal zone)
# and a full-body walk-in for the girl's arrival beat.
i2v willow_bank_living 3 "$K/frame_00.png" "The hanging willow branches sway gently in a light breeze from the LEFT, their tips trailing; slow flat ripples drift across the calm river surface; the dappled gold light spots stay fixed on the ground. The fishing stool, bucket and rod stay still. No people, no animals. The camera is completely fixed. Framing stays exactly as in the first frame."

i2v girl_steps_in_day 1.8 "$K/frame_07.png" "The girl takes one slow step forward toward the RIGHT and looks up at the willow branches above, the tips of her long deep-blue hair swaying gently; the willow branches sway faintly and slow ripples drift on the river behind her. The camera is completely fixed; the background stays still. Character count, poses and framing stay exactly as in the first frame."

echo "== i2v all done"
