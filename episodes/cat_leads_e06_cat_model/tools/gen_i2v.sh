#!/bin/bash
# E06 I2V: ONE segment only -- the cat hopping off the steps and running
# across the grass (full-body displacement, the only shot type I2V is
# trusted with per the E05 grammar boundary). Seedance 2.0 FULL 1080p.
# Cloth/hair/micro-motion shots are keyframe A/B variants instead (see
# dula-skills .../references/i2v-motion-details.md 语法边界).
# Requires ARK_API_KEY:  set -a && source ../../.env.ark
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model"
mkdir -p assets/i2v tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model/assets"
K="$A/keyframes"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v_seedance.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"

STYLE="Keep the exact flat-color illustration style of the input image: razor-clean flat color shapes, zero texture, no gradients except the sky, bright daytime palette with lavender shadows and flat gold dappled light, no new elements, no camera movement."

i2v() { # name slot_seconds firstframe prompt
  local name="$1" dur="$2" frame="$3" prompt="$4"
  if [ -s "$A/i2v/$name.mp4" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== i2v $name (slot ${dur}s, gen 4s @1080p)"
  "$PY" "$GEN" --model doubao-seedance-2-0-260128 --out "$A/i2v/$name.full.mp4" \
    --first-frame "$frame" --prompt "$prompt $STYLE" --duration 4 \
    --resolution 1080p --ratio adaptive \
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

i2v cat_hop_run_day 2 "$K/frame_08.png" "The orange tabby cat completes its hop down from the concrete step and runs lightly toward the RIGHT across the sunlit grass slope, quick small bounding steps, tail streaming behind, ears back; its soft lavender shadow slides along the grass; the flat gold dappled spots stay fixed on the ground. The camera is completely fixed; the background stays still as the cat crosses the frame. Character count, poses and framing stay exactly as in the first frame."

echo "== i2v all done"
