#!/bin/bash
# E07 seg1 keyframes: path-to-willow-bank block -- frame_00..frame_13 +
# frame_05 (I2V first frame). Codex imagegen; masters first. LOCK + DENSITY
# on every prompt; expressions written LAYERED. Idempotent.
set -u
source "$(dirname "$0")/render_spec.sh"
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e07_river_willow"
mkdir -p assets/keyframes tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e07_river_willow/assets"
K="$A/keyframes"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Sky: deep clear cyan blue (#2E9BD6) at the top softening into light aqua (#7FD4E8) near the horizon through ONE wide soft transition band (the only soft gradient allowed). Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is rendered as flat geometric shapes (diagonal light bands, round dappled light spots) in flat gold (#F5B942), never glow, never haze. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

DENSITY="Composition density rules: the shot has THREE depth layers -- a foreground framing element (hanging willow branches or grass blades as large flat darker shapes), the midground subject, and a layered background (river, distant bank, sky). Never place the subject against a flat empty background. Under willow shade, dappled sunlight spots are flat gold (#F5B942) shapes."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur, small body."
BOY="The boy: slim 17-year-old, warm light skin, short black hair with slightly messy fringe, dark gray eyes, white short-sleeve school shirt, navy-blue trousers, white sneakers, a kraft-paper-cover sketchbook under one arm."
OLDMAN="The old man: slim 68-year-old fisherman with a slight stoop, kind wrinkled face with narrow smiling eyes (wrinkles drawn with only two or three restrained lines), a worn flat-top straw hat, a khaki multi-pocket fishing vest over a white shirt with rolled sleeves, dark gray trousers, old rubber shoes."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, glowing dots, haze, mist, text, watermark, photorealism, 3D render."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$K/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/seg1_$name.log"
  codex exec "$prompt $LOCK $DENSITY $AVOID Save the final PNG to $K/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$K/$name.png" ]; then
    echo "== ok $name"
    normalize_img "$K/$name.png"
  else
    echo "== MISSING $name (see $log)"
  fi
}

gen frame_00 "Use case: establishing shot, wide view of the exact willow bank from the scene reference: hanging willow branches curtain the top of the frame, the empty fishing spot (stool, bucket, rod against the tree) on the right third, shallow shoreline, calm river and distant town behind. No people, no cat. Composition: 16:9 landscape, eye-level wide shot." \
  -i "$A/scene_willow_bank_day.png"

gen frame_01 "Use case: keyframe (base for a lip-sync talking shot). Medium-close on the riverside path near the willow bank: $GIRL She walks toward frame RIGHT along the path, mid-step, looking ahead down at the cat (out of frame lower right). Expression: eyebrows slightly raised; eyes bright and curious, gaze right-down; mouth softly parted mid-question. Willow branches frame the top edge. Composition: 16:9 landscape, girl on the left half." \
  -i "$A/girl_reference.png" -i "$K/frame_00.png"

gen frame_02 "Use case: keyframe. Medium shot on the same path: $CAT The cat walks ahead toward frame RIGHT, head turned back over its shoulder in a three-quarter view toward the girl behind (out of frame left), tail high. Composition: 16:9 landscape, cat center-right, path and willow trunks behind." \
  -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_03 "Use case: keyframe (base for a lip-sync talking shot). Close-up on the same path: $CAT The cat sits, body facing frame RIGHT, head in a three-quarter view toward the camera (mouth clearly visible, closed); expression: eyelids calm and slightly narrowed, gaze steady left, ears upright -- unhurried confidence. Composition: 16:9 landscape, cat on the left third, willow trunk and river behind to the right." \
  -i "$A/cat_reference.png" -i "$K/frame_02.png"

gen frame_04 "Use case: keyframe. Empty view down the riverside path: the path curves gently toward frame RIGHT into denser willow shade, hanging branches curtaining the top and right edge, dappled gold spots on the path. No people, no cat. Composition: 16:9 landscape, one-point depth toward the right." \
  -i "$A/scene_willow_bank_day.png"

gen frame_05 "Use case: I2V first frame for a trio walking shot. On the same riverside path: $GIRL and $BOY walking side by side toward frame RIGHT, and $CAT the cat trotting a step ahead of them, all three on the LEFT third of the frame, mid-step. The RIGHT two-thirds is open path under willow shade, kept clear for them to walk into. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/girl_reference.png" -i "$A/boy_reference.png" -i "$A/cat_reference.png" -i "$K/frame_04.png"

gen frame_06 "Use case: keyframe, reveal. Wide shot of the willow bank: under the biggest willow on the RIGHT third, $OLDMAN an old fisherman sits on his small folding stool holding his bamboo rod over the water, seen from behind-side, small in frame; the tin bucket beside him. No cat. Composition: 16:9 landscape, willow curtain on top, river and distant town behind." \
  -i "$A/oldman_reference.png" -i "$A/scene_willow_bank_day.png"

gen frame_07 "Use case: keyframe. Medium-wide shot on the willow bank edge: $GIRL She stands at the shore edge facing frame RIGHT, taking in the willows, arms slightly open at her sides, small in frame. Expression: eyebrows raised, eyes wide with delight, mouth open in a small gasp. Composition: 16:9 landscape, girl on the left third, willow bank fills the right." \
  -i "$A/girl_reference.png" -i "$K/frame_06.png"

gen frame_08 "Use case: keyframe. Medium shot: $CAT The cat trots toward the old man under the willow (frame RIGHT), tail high, happy quick steps; $OLDMAN the old man sits on his stool at the right edge, starting to turn his head toward the cat. Composition: 16:9 landscape, cat center-left moving right, old man at right third." \
  -i "$A/cat_reference.png" -i "$A/oldman_reference.png" -i "$K/frame_06.png"

gen frame_09 "Use case: keyframe (base for a lip-sync talking shot). Close-up under the willow: $OLDMAN He sits on his stool, body facing the river (frame LEFT), head turned back over his shoulder toward the camera-right with a warm crinkly smile (mouth clearly visible, closed); expression: eyes narrowed into happy slits under the straw hat brim, eyebrows relaxed. A flat gold dappled spot on his vest. Composition: 16:9 landscape, old man on the left half, river glint behind to the right." \
  -i "$A/oldman_reference.png" -i "$K/frame_08.png"

gen frame_10 "Use case: keyframe. Wide group shot at the fishing spot: $OLDMAN seated on his stool at center-right, $GIRL and $BOY standing at his side, and $CAT the cat rubbing against the old man's shin. Composition: 16:9 landscape, group on the right half, willow curtain above, river behind." \
  -i "$A/oldman_reference.png" -i "$A/girl_reference.png" -i "$A/boy_reference.png" -i "$A/cat_reference.png"

gen frame_11 "Use case: keyframe (base for a lip-sync talking shot). Medium-close at the fishing spot: $GIRL She bends forward slightly in a polite greeting bow toward frame RIGHT (toward the seated old man), hands clasped in front. Expression: eyebrows gently raised; eyes warm; mouth in a bright polite smile. Composition: 16:9 landscape, girl on the left half." \
  -i "$A/girl_reference.png" -i "$K/frame_10.png"

gen frame_12 "Use case: keyframe, action insert. The old man's bamboo rod mid-cast under the willow: the rod swept back and the fishing line tracing a long flat curved arc toward the river, the float a tiny dot at the line's end; $OLDMAN hands gripping the rod, seen from the side. Composition: 16:9 landscape, rod and line arc dominant, river ahead to the right." \
  -i "$A/oldman_reference.png" -i "$K/frame_06.png"

gen frame_13 "Use case: keyframe (base for a lip-sync talking shot). Close-up under the willow: $OLDMAN He sits facing the river (frame LEFT), eyes on the float on the water, rod resting on his knee. Expression: eyebrows level; eyes calm and half-lidded; mouth closed with a faint content smile. Composition: 16:9 landscape, old man on the right half, river and float visible to the left." \
  -i "$A/oldman_reference.png" -i "$K/frame_09.png"

echo "== seg1 done"
