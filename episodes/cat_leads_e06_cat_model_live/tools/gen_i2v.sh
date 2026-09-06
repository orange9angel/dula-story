#!/bin/bash
# E06-live I2V: 10 segments, Seedance 2.0 FULL, 720p, gen 4s (trim at concat).
# Small motion everywhere except f10 (pounce). Fixed camera except f16/f19.
# Idempotent: skip existing non-empty mp4. Requires ARK_API_KEY (.env.ark).
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live"
mkdir -p assets/i2v tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/assets"
K="$A/frames"
GEN="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v_seedance.py"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"

STYLE="Photorealistic live-action look, bright fresh morning light, keep the exact characters, cat markings, clothing, lighting and color of the first frame. Subtle natural motion, consistent lighting, no new elements, no text, no watermark."

i2v() { # name firstframe prompt
  local name="$1" frame="$2" prompt="$3"
  if [ -s "$A/i2v/$name.mp4" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== i2v $name (4s @${I2V_RES})"
  "$PY" "$GEN" --model doubao-seedance-2-0-260128 --out "$A/i2v/$name.mp4" \
    --first-frame "$frame" --prompt "$prompt $STYLE" --duration 4 \
    --resolution "$I2V_RES" --ratio adaptive \
    > "tmp/i2v_$name.log" 2>&1
  if [ ! -s "$A/i2v/$name.mp4" ]; then echo "== FAILED $name (see tmp/i2v_$name.log)"; return 1; fi
  ffmpeg -loglevel error -y -i "$A/i2v/$name.mp4" -vf "select=eq(n\,0)" -vframes 1 "$A/i2v/${name}_first.png"
  ffmpeg -loglevel error -y -sseof -0.1 -i "$A/i2v/$name.mp4" -vframes 1 "$A/i2v/${name}_last.png"
  echo "== ok $name"
}

i2v f00 "$K/f00_est.png" "Morning riverbank: tall grass sways gently in a light breeze, soft glints shimmer on the calm river, tree leaves tremble faintly. No people, no animals. The camera is completely fixed."

i2v f02 "$K/f02_cat_pose.png" "The orange tabby cat sits upright on the stone steps holding its proud model pose, almost motionless: chin slightly raised, only its ears twitch occasionally and its tail tip curls slightly, whiskers tremble in the breeze. The camera is completely fixed."

i2v f05 "$K/f05_cat_butterfly.png" "A small pale-yellow butterfly flutters and dances in the upper right of the frame; the orange tabby cat's eyes and ears follow the butterfly, its head turning very slightly, body still holding the sitting pose. The camera is completely fixed."

i2v f07 "$K/f07_cat_run.png" "The orange tabby cat leaps off the stone steps and runs away across the sunlit grass toward the right edge of the frame, quick light steps, tail streaming; grass sways as it passes. The camera is completely fixed."

i2v f10 "$K/f10_cat_pounce.png" "Low in the grass, the orange tabby cat pounces up at the small butterfly, misses, tumbles and rolls once in the grass, then sits up looking ruffled while the butterfly flutters away upward; grass blades swish. Lively playful motion. The camera is completely fixed."

i2v f13 "$K/f13_cat_return.png" "The orange tabby cat walks unhurriedly across the grass into the tree shade, then lies down and curls up comfortably; soft dappled light sways on the grass. Calm slow motion. The camera is completely fixed."

i2v f14 "$K/f14_cat_sleep.png" "The orange tabby cat sleeps curled under the tree shade, its sides rising and falling very slowly with deep breaths; dappled light spots sway gently on its fur and the grass. Extremely calm, almost no movement. The camera is completely fixed."

i2v f15 "$K/f15_boy_sketch.png" "Seen from behind over his shoulder, the boy sketches quietly: his pencil hand makes small gentle strokes, his head tilts very slightly; ahead the orange cat sleeps motionless in the tree shade; dappled light sways softly. Small movements only. The camera is completely fixed."

i2v f16 "$K/f16_sketchbook.png" "Very slow gentle push-in toward the open sketchbook page with the pencil sketch of the sleeping cat; the dappled light on the grass around the page shifts softly. No hands, no people. Extremely slow camera drift forward, nothing else moves."

i2v f18 "$K/f18_cat_sleep_close.png" "Close-up of the sleeping orange cat's face: its sides and chest rise and fall very slowly with deep breaths, an ear twitches faintly once, whiskers tremble in the soft breeze; dappled light sways gently. Extremely calm. The camera is completely fixed."

i2v f19 "$K/f19_wide.png" "Wide shot under the big tree: the boy and girl sit relaxed on the stone steps, nearly still, the orange cat sleeps on the grass; dappled light spots sway gently on the grass, leaves tremble in the breeze, the river glints. Very slow gentle pull-back. Extremely calm."

echo "== i2v all done"
