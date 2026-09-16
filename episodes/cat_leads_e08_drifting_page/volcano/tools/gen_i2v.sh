#!/bin/bash
# E08 I2V: FIVE environment segments (no characters = I2V's legal zone).
# Seedance 2.0 FULL; resolution comes from config/render_spec.json
# (generation_tier = 720p). Each segment gens 4s then trims to slot length.
# Requires ARK_API_KEY:  set -a && source ../../.env.ark
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e08_drifting_page"
mkdir -p assets/i2v tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e08_drifting_page/assets"
K="$A/keyframes"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v_seedance.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"

STYLE="Keep the exact flat-color illustration style of the input image: razor-clean flat color shapes, zero texture, no gradients except the sky, bright afternoon palette with lavender shadows and flat gold dappled light, no new elements, no camera movement."

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

i2v env_open 3.5 "$K/frame_00.png" "Gentle waves of tall grass sway softly in a light afternoon breeze; slow flat ripples drift across the calm river surface; the tree shadows tremble faintly. No people, no animals, no objects moving except grass, water and leaves. The camera is completely fixed. Framing stays exactly as in the first frame."

i2v wind_gust 2.5 "$K/frame_00.png" "A sudden gust of wind sweeps through: the tree crowns sway together in one direction, the tall grass bends and lies low, a few leaves lift off and fly across. Then the wind eases. No people, no animals. The camera is completely fixed. Framing stays exactly as in the first frame."

i2v page_lift 2.5 "$K/frame_page_lift.png" "A single loose sketchbook page is slowly lifted by the wind, spinning gently and drifting softly toward the river surface; the motion is very light and slow, graceful, never violent. No people, no animals. The camera is completely fixed. Framing stays exactly as in the first frame."

i2v page_drift 4.5 "$K/frame_page_drift.png" "A single sketchbook page floats on the golden sparkling river surface, drifting away extremely slowly and gently with the soft ripples; the motion is very slow and very light, calm and quiet. No people, no animals. The camera is completely fixed. Framing stays exactly as in the first frame."

i2v env_close 3.0 "$K/frame_00.png" "Broken gold light sparkles and flickers on the calm river surface; gentle waves of tall grass sway softly in a light afternoon breeze. No people, no animals. The camera is completely fixed. Framing stays exactly as in the first frame."

echo "== i2v all done"
