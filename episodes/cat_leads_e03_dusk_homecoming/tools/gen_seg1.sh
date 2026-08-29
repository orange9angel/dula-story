#!/bin/bash
# E03 seg1 keyframes frame_00..frame_09 + I2V first frames (run_bank,
# bridge_walk) + ib_01. Codex imagegen; masters must exist first.
# Homecoming direction: all travel is toward frame LEFT.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e03_dusk_homecoming"
mkdir -p assets/keyframes assets/action_inbetweens tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e03_dusk_homecoming/assets"
K="$A/keyframes"
IB="$A/action_inbetweens"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is flat geometric shapes in flat gold, never glow, never haze. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, Makoto Shinkai style, text, captions, logos, watermark, signature."

DUSK="Time-of-day override: late golden-hour dusk. Sky: deep violet blue (#4A4E8F) at the top softening into warm orange gold (#F5A442) near the horizon through ONE wide soft transition band (the only soft gradient allowed), with one brighter flat gold (#F5B942) band low over the horizon. Sun very low; shadows extremely long and slanted; lit edges rimmed in warm orange-gold, shadow side stays lavender purple (#8E7CC3). Windows and door lamps glow as flat warm-yellow (#FFD97A) rectangles."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur, small body."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, text, watermark, photorealism, 3D render."

gen() { # name outdir prompt refs...
  local name="$1" outdir="$2" prompt="$3"; shift 3
  echo "== gen $name"
  local log="tmp/seg1_$name.log"
  codex exec "$prompt $LOCK $DUSK $AVOID Save the final PNG to $outdir/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$outdir/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_00 "$K" "Use case: establishing shot, wide view of the exact dusk riverbank from the scene reference: gold-orange light bands on the calm river, long slanted shadows on the grass, distant bridge silhouette, violet-to-orange sky. No people, no cat. Composition: 16:9 landscape, eye-level wide shot." \
  -i "$A/scene_riverbank_dusk.png"

gen frame_01 "$K" "Use case: keyframe. Medium shot on the same dusk riverbank: $GIRL She sits on the grass at the top edge of the bank, knees up, looking at the river toward frame LEFT, mouth gently closed, calm. $CAT The cat is right beside her feet, just standing up, tail raised. Long slanted shadows, gold-orange rim light. Composition: 16:9 landscape, both on the right half, river and open sky on the left." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_02 "$K" "Use case: keyframe. Close-up on the same dusk riverbank: $CAT It stands on the grass in warm gold backlight, head turned back over its shoulder in a three-quarter view toward the camera (mouth clearly visible, closed), tail up, long shadow on the grass. Composition: 16:9 landscape, cat on the right third, river glow behind." \
  -i "$A/cat_reference.png" -i "$K/frame_01.png"

gen frame_03 "$K" "Use case: keyframe. Medium shot on the same dusk riverbank: $GIRL She is getting up from the grass, one hand brushing grass bits off her pleated skirt, looking toward frame LEFT where the cat waits. Composition: 16:9 landscape, she is on the right half, open grass and river glow to the left." \
  -i "$A/girl_reference.png" -i "$K/frame_01.png"

gen ib_01 "$IB" "Use case: action in-between. Same spot on the dusk riverbank: $GIRL Half-risen pose between sitting and standing, one hand pushing off the grass, knees bent, body leaning toward frame LEFT. Composition: 16:9 landscape, same camera as the adjacent medium shots." \
  -i "$A/girl_reference.png" -i "$K/frame_03.png"

gen frame_run_01 "$K" "Use case: I2V first frame for a cat running shot. On the same dusk riverbank grass slope: $CAT It stands alert on the RIGHT third of the frame, body facing LEFT, tail high, one front paw lifted about to run, head looking left. The LEFT two-thirds of the frame is open grass slope descending gently, kept clear for the cat to run into. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_04 "$K" "Use case: keyframe. Medium shot on the same dusk riverbank: $GIRL She walks down the grass slope toward frame LEFT, arms relaxed, long shadow trailing behind her to the right. Composition: 16:9 landscape, she is center-right, open slope on the left." \
  -i "$A/girl_reference.png" -i "$K/frame_03.png"

gen frame_05 "$K" "Use case: keyframe, reveal. Wide shot of the exact stone bridge from the scene reference at dusk: the bridge arches over the gold-banded river, and $CAT the cat sits on the near-end stone railing on the RIGHT side of the bridge, small in frame, looking left across the bridge. Composition: 16:9 landscape, bridge spanning the frame, walk direction leftward." \
  -i "$A/cat_reference.png" -i "$A/scene_bridge.png"

gen frame_bridge_02 "$K" "Use case: I2V first frame for a girl bridge-walk shot. On the same stone bridge: $GIRL She stands at the RIGHT end of the bridge deck, body facing LEFT along the bridge, relaxed posture, about to walk. The bridge deck, railings and the lane with glowing windows on the LEFT are clearly visible ahead of her; keep the left two-thirds open for her walk. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/girl_reference.png" -i "$K/frame_05.png"

gen frame_06 "$K" "Use case: keyframe. Medium shot at the middle of the same stone bridge: $GIRL She leans on the low stone railing with both hands, profile facing frame LEFT, gazing at the long river below, dusk wind lifting her hair slightly. Composition: 16:9 landscape, river and sunset glow fill the left background." \
  -i "$A/girl_reference.png" -i "$A/scene_bridge.png"

gen frame_07 "$K" "Use case: insert shot. Empty view from the bridge: the calm river at dusk with one wide flat gold light band leading to the low sun near the horizon, violet-to-orange sky, distant bank silhouettes. No people, no cat. Composition: 16:9 landscape." \
  -i "$A/scene_bridge.png"

gen frame_08 "$K" "Use case: keyframe. Medium shot at the far LEFT end of the same stone bridge: $CAT The cat sits on the low wall at the bridge end, body facing LEFT toward the lane, head turned back in a three-quarter view toward the camera (mouth clearly visible, closed). Behind it, the lane with warm glowing windows. Composition: 16:9 landscape." \
  -i "$A/cat_reference.png" -i "$A/scene_bridge.png"

gen frame_09 "$K" "Use case: keyframe, transition shot. View from the bridge end looking into the dusk residential lane: white walls, utility poles, warm yellow window lights dotting the lane depth, long shadows; the lane leads the eye toward frame LEFT. No people, no cat. Composition: 16:9 landscape, deep one-point perspective toward the left." \
  -i "$A/scene_street_dusk.png" -i "$A/scene_bridge.png"

echo "== seg1 done"
