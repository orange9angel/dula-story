#!/bin/bash
# E03 seg2 keyframes frame_10..frame_19 + I2V first frames (wall_walk_dusk,
# lane_walk) + ib_02. Codex imagegen; masters and seg1 must exist first.
# Homecoming direction: all travel is toward frame LEFT.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e03_dusk_homecoming"
mkdir -p assets/keyframes assets/action_inbetweens tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e03_dusk_homecoming/assets"
K="$A/keyframes"
IB="$A/action_inbetweens"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is flat geometric shapes in flat gold, never glow, never haze. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

DUSK="Time-of-day override: late golden-hour dusk. Sky: deep violet blue (#4A4E8F) at the top softening into warm orange gold (#F5A442) near the horizon through ONE wide soft transition band (the only soft gradient allowed), with one brighter flat gold (#F5B942) band low over the horizon. Sun very low; shadows extremely long and slanted; lit edges rimmed in warm orange-gold, shadow side stays lavender purple (#8E7CC3). Windows and door lamps glow as flat warm-yellow (#FFD97A) rectangles."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur, small body."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, text, watermark, photorealism, 3D render."

gen() { # name outdir prompt refs...
  local name="$1" outdir="$2" prompt="$3"; shift 3
  echo "== gen $name"
  local log="tmp/seg2_$name.log"
  codex exec "$prompt $LOCK $DUSK $AVOID Save the final PNG to $outdir/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$outdir/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_10 "$K" "Use case: establishing shot. Wide view of the exact dusk residential lane from the scene reference: the long white perimeter wall with flat walkable top edge on the LEFT side, utility pole silhouettes, warm yellow window lights, extremely long slanted shadows on the pavement, violet-to-orange sky. No people, no cat. Composition: 16:9 landscape, lane receding toward frame LEFT." \
  -i "$A/scene_street_dusk.png"

gen frame_wall_03 "$K" "Use case: I2V first frame for a cat wall-walk shot. On the same dusk lane: $CAT It stands on the flat top edge of the white perimeter wall on the RIGHT third of the frame, body facing LEFT, tail relaxed, about to walk along the wall top. The wall top extends clearly toward frame LEFT with open space for the walk. Warm window lights below, dusk sky behind. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/cat_reference.png" -i "$K/frame_10.png"

gen frame_lane_04 "$K" "Use case: I2V first frame for a girl lane-walk shot. On the same dusk lane: $GIRL She stands on the RIGHT third of the pavement, body facing LEFT down the lane, about to walk; her very long shadow stretches ahead of her. Warm window lights on the left side houses. Keep the left two-thirds of the lane open for her walk. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/girl_reference.png" -i "$K/frame_10.png"

gen frame_11 "$K" "Use case: keyframe. Medium shot in the same dusk lane: $GIRL She has stopped walking and looks up toward frame LEFT and up at the wall top (out of frame direction of the cat), a soft curious expression, mouth gently closed. Warm window light rims her hair. Composition: 16:9 landscape, she is center, wall top visible at upper left." \
  -i "$A/girl_reference.png" -i "$K/frame_lane_04.png"

gen frame_12 "$K" "Use case: keyframe. Close-up: $CAT The cat sits on the wall top as a warm-rimmed silhouette against the violet-to-orange dusk sky, head turned back over its shoulder in a three-quarter view toward the camera (mouth clearly visible, closed), tail curled. Composition: 16:9 landscape, cat on the right third, dusk sky fills the left." \
  -i "$A/cat_reference.png" -i "$K/frame_10.png"

gen frame_13 "$K" "Use case: keyframe. Medium-wide view from inside the same dusk lane toward the home entrance from the scene reference on the LEFT: the warm door lamp glowing above the wooden sliding door, potted plant, long shadows pointing toward the entrance. No people, no cat. Composition: 16:9 landscape." \
  -i "$A/scene_lane_home_dusk.png"

gen frame_14 "$K" "Use case: keyframe. Medium shot at the same home entrance: $GIRL She slides the wooden door half open with one hand, warm lamplight spilling out, her body facing the door on frame LEFT, head turned back over her shoulder looking down-right toward the cat. $CAT The cat sits at her heels on the lower right. Composition: 16:9 landscape." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_13.png"

gen ib_02 "$IB" "Use case: action in-between. Same home entrance: $GIRL Mid-motion of sliding the door open, body weight shifted toward frame LEFT, one hand on the door handle, door one-quarter open with a thin wedge of warm light. Composition: 16:9 landscape, same camera as the adjacent entrance shots." \
  -i "$A/girl_reference.png" -i "$K/frame_14.png"

gen frame_15 "$K" "Use case: keyframe. Wide shot at the same home entrance at dusk: seen from behind, $GIRL the girl stands in the open doorway and $CAT the cat sits beside her ankles, both as warm-rimmed silhouettes against the warm flat-yellow lamplight spilling from the door, the dusk lane deep purple behind them. Composition: 16:9 landscape, doorway center-left." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_13.png"

gen frame_16 "$K" "Use case: keyframe. Close-up inside the doorway: $GIRL Profile of her face facing frame LEFT toward the door lamplight, a small gentle smile, mouth gently closed, warm flat-yellow light on her cheek, dusk purple behind. Composition: 16:9 landscape, her face on the right half." \
  -i "$A/girl_reference.png" -i "$K/frame_15.png"

gen frame_17 "$K" "Use case: keyframe. Wide shot over the same neighborhood rooftops at dusk: roof silhouettes, a few warm window lights, the violet-to-orange sky with one brighter gold band low over the horizon; tiny silhouettes of a girl and a cat at one doorway. Composition: 16:9 landscape, high wide view." \
  -i "$A/scene_lane_home_dusk.png"

gen frame_18 "$K" "Use case: insert shot. Empty dusk sky above the rooftops: wide soft violet-to-orange transition band, a few hard-edged rounded clouds lit warm orange on their lower edges, flat lavender shadow tone on top. No people, no cat, no text. Composition: 16:9 landscape." \
  -i "$A/scene_lane_home_dusk.png"

gen frame_19 "$K" "Use case: closing shot. Empty dusk sky only: the same violet-to-orange band with one thin brighter flat gold streak low near the bottom of the frame, one small white bird silhouette. No clouds in the center. No people, no text. Composition: 16:9 landscape." \
  -i "$K/frame_18.png"

echo "== seg2 done"
