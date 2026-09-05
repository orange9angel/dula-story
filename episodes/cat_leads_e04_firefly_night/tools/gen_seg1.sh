#!/bin/bash
# E04 seg1 keyframes frame_00..frame_09 + I2V first frames (wall_walk,
# bridge_walk) + ib_01. Codex imagegen; night masters must exist first.
# Night outing direction: all travel is toward frame RIGHT. Idempotent:
# skips frames that already exist.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night"
mkdir -p assets/keyframes assets/action_inbetweens tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night/assets"
K="$A/keyframes"
IB="$A/action_inbetweens"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Shadows everywhere use complementary colors (deep lavender-navy #3B3566, teal-navy), never black or grey. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

NIGHT="Time-of-day override: clear summer night, about 9pm. Sky: deep indigo blue (#1B2A5E) with ONE wide soft transition band to dark violet (#3A2E5C) near the horizon (the only soft gradient allowed). Stars as tiny flat white dots sparsely scattered, plus one flat pale-yellow crescent moon. Moonlight: cool blue-silver (#9FB8E8) rim light on top edges and rooflines; shadow side stays deep lavender-navy (#3B3566), never pure black. Door lamps and the few lit windows glow as flat warm-yellow (#FFD97A) rectangles, much sparser than at dusk. Ground and road surfaces carry a faint cool blue moon tint."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur, small body."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, fireflies, glowing dots, text, watermark, photorealism, 3D render."

gen() { # name outdir prompt refs...
  local name="$1" outdir="$2" prompt="$3"; shift 3
  if [ -s "$outdir/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/seg1_$name.log"
  codex exec "$prompt $LOCK $NIGHT $AVOID Save the final PNG to $outdir/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$outdir/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_00 "$K" "Use case: establishing shot, wide view of the exact night lane home entrance from the scene reference: warm door lamp over the wooden sliding door on the left third, white perimeter wall, deep indigo sky with sparse flat star dots and a crescent moon. No people, no cat. Composition: 16:9 landscape, eye-level wide shot." \
  -i "$A/scene_lane_home_night.png"

gen frame_01 "$K" "Use case: keyframe. Medium shot at the same night home entrance: $GIRL She is peeking out through the half-open wooden sliding door, one hand on the door edge, looking up toward frame RIGHT, mouth gently closed, curious. $CAT The cat sits on the white wall top to the RIGHT, small in frame, tail curled, looking back at her. The warm door lamp lights her from the side. Composition: 16:9 landscape, door and girl on the left half, wall and cat on the right." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_02 "$K" "Use case: keyframe. Close-up on the same night lane: $CAT It stands on the white wall top in cool blue-silver moon backlight, head turned back over its shoulder in a three-quarter view toward the camera (mouth clearly visible, closed), tail up, soft moon shadow on the wall. Composition: 16:9 landscape, cat on the left third, deep indigo sky and one warm window behind to the right." \
  -i "$A/cat_reference.png" -i "$K/frame_01.png"

gen frame_03 "$K" "Use case: keyframe. Medium shot at the same night home entrance: $GIRL She has stepped out of the door and is gently pulling the wooden sliding door closed behind her, body already turning toward frame RIGHT, looking right. Warm door lamp light on her back. Composition: 16:9 landscape, door on the left, open lane leading right." \
  -i "$A/girl_reference.png" -i "$K/frame_01.png"

gen ib_01 "$IB" "Use case: action in-between. Same spot at the night home entrance: $GIRL Half-turned pose between facing the door and facing frame RIGHT, one hand still on the door handle, door leaf halfway closed, body mid-turn. Composition: 16:9 landscape, same camera as the adjacent medium shots." \
  -i "$A/girl_reference.png" -i "$K/frame_03.png"

gen frame_wall_01 "$K" "Use case: I2V first frame for a cat wall-walk shot. On the same night street with the white perimeter wall: $CAT It stands alert on the FLAT WALKABLE TOP EDGE of the wall on the LEFT third of the frame, body facing RIGHT, tail high, one front paw lifted about to walk, head looking right. The RIGHT two-thirds of the frame is open wall top and night sky, kept clear for the cat to walk into. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/cat_reference.png" -i "$A/scene_street_night.png"

gen frame_04 "$K" "Use case: keyframe. Medium shot on the same night street: $GIRL She walks briskly toward frame RIGHT along the lane, arms slightly out with excitement, soft moon shadow trailing behind her to the left. Sparse warm windows, utility poles. Composition: 16:9 landscape, she is center-left, open lane and night sky on the right." \
  -i "$A/girl_reference.png" -i "$A/scene_street_night.png"

gen frame_05 "$K" "Use case: keyframe, reveal. Wide shot of the exact night stone bridge from the scene reference: the bridge arches over the moonlit river, and $CAT the cat sits on the near-end stone railing on the LEFT side of the bridge, small in frame, looking right across the bridge. Silver-blue moonlight band on the river. Composition: 16:9 landscape, bridge spanning the frame, walk direction rightward." \
  -i "$A/cat_reference.png" -i "$A/scene_bridge_night.png"

gen frame_bridge_02 "$K" "Use case: I2V first frame for a girl bridge-walk shot. On the same night stone bridge: $GIRL She stands at the LEFT end of the bridge deck, body facing RIGHT along the bridge, relaxed posture, about to walk. The bridge deck, railings and the dark riverbank on the RIGHT are clearly visible ahead of her; keep the right two-thirds open for her walk. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/girl_reference.png" -i "$K/frame_05.png"

gen frame_06 "$K" "Use case: keyframe. Medium shot at the middle of the same night stone bridge: $GIRL She leans on the low stone railing with both hands, profile facing frame RIGHT, gazing at the moonlit river below, night wind lifting her hair slightly, mouth gently closed. Composition: 16:9 landscape, river and moonlight band fill the right background." \
  -i "$A/girl_reference.png" -i "$A/scene_bridge_night.png"

gen frame_07 "$K" "Use case: insert shot. Empty view from the bridge at night: the calm river with one wide flat silver-blue moonlight band, deep indigo sky with sparse flat star dots, distant dark bank silhouettes. No people, no cat. Composition: 16:9 landscape." \
  -i "$A/scene_bridge_night.png"

gen frame_08 "$K" "Use case: keyframe. Medium shot at the far RIGHT end of the same night stone bridge: $CAT The cat sits on the low wall at the bridge end, body facing RIGHT toward the dark riverbank, head turned back in a three-quarter view toward the camera (mouth clearly visible, closed). Behind it to the left, the lane with one warm window. Composition: 16:9 landscape." \
  -i "$A/cat_reference.png" -i "$A/scene_bridge_night.png"

gen frame_09 "$K" "Use case: keyframe, transition shot. View from the bridge end looking toward the night riverbank: grassy slope rising gently, low stone parapet, deep indigo starry sky; the slope leads the eye toward frame RIGHT. No people, no cat, no glowing dots. Composition: 16:9 landscape, deep one-point perspective toward the right." \
  -i "$A/scene_riverbank_night.png" -i "$A/scene_bridge_night.png"

echo "== seg1 done"
