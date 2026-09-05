#!/bin/bash
# E04 seg2 keyframes frame_10..frame_19 + I2V first frames (run_bank,
# bank_walk) + ib_02. Codex imagegen; night masters + seg1 frames first.
# Night outing direction: all travel is toward frame RIGHT. Fireflies are a
# PROGRAMMATIC layer: every plate stays free of baked glowing dots.
# Idempotent: skips frames that already exist.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night"
mkdir -p assets/keyframes assets/action_inbetweens tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night/assets"
K="$A/keyframes"
IB="$A/action_inbetweens"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Shadows everywhere use complementary colors (deep lavender-navy #3B3566, teal-navy), never black or grey. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

NIGHT="Time-of-day override: clear summer night, about 9pm. Sky: deep indigo blue (#1B2A5E) with ONE wide soft transition band to dark violet (#3A2E5C) near the horizon (the only soft gradient allowed). Stars as tiny flat white dots sparsely scattered, plus one flat pale-yellow crescent moon. Moonlight: cool blue-silver (#9FB8E8) rim light on top edges; shadow side stays deep lavender-navy (#3B3566), never pure black. Grass in deep green-navy moon shadow."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur, small body."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, fireflies, glowing dots, text, watermark, photorealism, 3D render."

gen() { # name outdir prompt refs...
  local name="$1" outdir="$2" prompt="$3"; shift 3
  if [ -s "$outdir/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/seg2_$name.log"
  codex exec "$prompt $LOCK $NIGHT $AVOID Save the final PNG to $outdir/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$outdir/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_10 "$K" "Use case: establishing shot, wide view of the exact night riverbank from the scene reference: grassy bank sloping down to the moonlit river, silver-blue light band on the water, low stone parapet along the top, distant bridge silhouette, deep indigo starry sky. No people, no cat, no glowing dots. Composition: 16:9 landscape, eye-level wide shot." \
  -i "$A/scene_riverbank_night.png"

gen frame_run_03 "$K" "Use case: I2V first frame for a cat running shot. On the same night riverbank grass slope: $CAT It stands alert on the LEFT third of the frame, body facing RIGHT, tail high, one front paw lifted about to run, head looking right. The RIGHT two-thirds of the frame is open grass slope descending gently, kept clear for the cat to run into. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/cat_reference.png" -i "$K/frame_10.png"

gen frame_bank_04 "$K" "Use case: I2V first frame for a girl bank-walk shot. On the same night riverbank: $GIRL She stands at the top edge of the grass slope on the LEFT third of the frame, body facing RIGHT, relaxed posture, about to walk down. The open moonlit slope on the RIGHT two-thirds is kept clear for her walk. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/girl_reference.png" -i "$K/frame_10.png"

gen frame_11 "$K" "Use case: keyframe. Medium shot on the same night riverbank grass: $GIRL She has stopped walking and stands still, leaning slightly forward, face turned toward frame RIGHT with a softly amazed expression, mouth gently closed, eyes wide. Cool moonlight rim on her hair, grass at her feet. Composition: 16:9 landscape, she is on the left half, open grass and night sky on the right." \
  -i "$A/girl_reference.png" -i "$K/frame_bank_04.png"

gen frame_12 "$K" "Use case: keyframe. Close-up on the same night riverbank grass: $CAT The cat sits upright in the grass, front paws together, looking up toward the camera in a three-quarter view (mouth clearly visible, closed), tail curled around its paws, ears up. Cool moonlight rim on its back, deep indigo night bokeh-free flat background. Composition: 16:9 landscape, cat center, grass texture-free flat shapes around." \
  -i "$A/cat_reference.png" -i "$K/frame_10.png"

gen frame_13 "$K" "Use case: keyframe. Medium shot on the same night riverbank grass: $GIRL She crouches down on the grass, knees bent, one arm reaching forward toward frame RIGHT with an open hand, fingers gently extended as if greeting something small in the air, mouth gently closed, tender smile. Composition: 16:9 landscape, she is on the left half, open grass on the right." \
  -i "$A/girl_reference.png" -i "$K/frame_11.png"

gen ib_02 "$IB" "Use case: action in-between. Same spot on the night riverbank grass: $GIRL Half-crouched pose between standing and the full crouch, knees bending, one hand starting to reach forward, body lowering. Composition: 16:9 landscape, same camera as the adjacent medium shots." \
  -i "$A/girl_reference.png" -i "$K/frame_13.png"

gen frame_14 "$K" "Use case: keyframe. Medium shot on the same night riverbank grass: $GIRL Still crouching, she turns her head back over her shoulder toward frame LEFT with a bright happy smile (mouth gently closed), as if looking at the cat behind her. Composition: 16:9 landscape, she is center, night grass and sky around." \
  -i "$A/girl_reference.png" -i "$K/frame_13.png"

gen frame_15 "$K" "Use case: keyframe, wide. Wide shot on the same night riverbank: $GIRL she sits on the grass slope with knees up, and $CAT the cat sits right beside her, both small in frame, seen from behind-side, looking at the river and the night sky toward frame RIGHT. Silver-blue moonlight band on the river. Composition: 16:9 landscape, pair on the left third, river and starry sky fill the right." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_10.png"

gen frame_16 "$K" "Use case: keyframe. Close-up on the same night riverbank: $GIRL Profile close-up facing frame RIGHT, gentle happy smile, mouth gently closed, eyes soft. A faint flat warm yellow-green light tint on her cheek and bangs (as if a tiny light floats just out of frame); keep the tint a flat shape, no glow. Composition: 16:9 landscape, her face on the left half, night sky on the right." \
  -i "$A/girl_reference.png" -i "$K/frame_15.png"

gen frame_17 "$K" "Use case: keyframe, wide finale. Very wide shot of the same night riverbank: $GIRL and $CAT as two tiny silhouettes sitting together on the grass slope, the vast deep indigo starry sky filling most of the frame, silver-blue moonlight band on the river. Composition: 16:9 landscape, pair tiny on the lower left, sky dominant." \
  -i "$K/frame_15.png" -i "$A/scene_riverbank_night.png"

gen frame_18 "$K" "Use case: insert shot. Empty night sky above the riverbank: deep indigo sky with sparse flat star dots and the crescent moon, a thin dark sliver of grass along the very bottom edge. No people, no cat, no glowing dots. Composition: 16:9 landscape, camera tilted up." \
  -i "$A/scene_riverbank_night.png"

gen frame_19 "$K" "Use case: closing shot. Pure night sky: deep indigo with ONE wide soft transition band to dark violet near the bottom, sparse flat star dots, the flat pale-yellow crescent moon, and a faint flat milky-way band of slightly denser star dots. No landscape, no people, no cat, no glowing dots. Composition: 16:9 landscape." \
  -i "$A/scene_riverbank_night.png"

echo "== seg2 done"
