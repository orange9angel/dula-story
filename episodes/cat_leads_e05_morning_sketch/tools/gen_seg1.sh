#!/bin/bash
# E05 seg1 keyframes: home/lane/bridge block -- frame_00..frame_10 + I2V
# first frames (lane_lead, bridge_walk). Codex imagegen; morning masters
# must exist first (gen_masters.sh). Travel direction: frame RIGHT (toward
# the riverbank, into the morning sun; breeze from frame LEFT at their
# backs). Expressions are written LAYERED (brows/eyes/mouth) per the E05
# style-bible discipline. Idempotent: skips frames that already exist.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e05_morning_sketch"
mkdir -p assets/keyframes assets/action_inbetweens tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e05_morning_sketch/assets"
K="$A/keyframes"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Characters in crisp cel-style flat color with one shadow layer; outlines warm brown on the lit side, muted purple on the shadow side. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, Makoto Shinkai style, text, captions, logos, watermark, signature."

MORNING="Time-of-day override: clear summer morning, about 6am, just after sunrise. Sky: fresh morning cyan blue (#3E9BD8) at the top softening into peach gold (#FFC07A) near the horizon through ONE wide soft transition band (the only soft gradient allowed), with one brighter flat gold (#F5B942) band low over the horizon. The sun is a low flat pale-gold disc (#FFD97A) low in the RIGHT side of the sky (east), hard-edged, no halo. Warm gold sunlight rakes in from frame RIGHT; shadows are long and slanted, all pointing toward frame LEFT (west); shadow side stays lavender (#8E7CC3), never pure black. Dew drops on grass and leaf tips are tiny flat white four-point sparkle shapes (#FDFBF4), hard-edged, sparse. No glow, no halo, no haze, no mist."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white paws, green eyes, dry fluffy fur, small body."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, glowing dots, haze, mist, text, watermark, photorealism, 3D render."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$K/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/seg1_$name.log"
  codex exec "$prompt $LOCK $MORNING $AVOID Save the final PNG to $K/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$K/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_00 "Use case: establishing shot, wide view of the exact morning lane home entrance from the scene reference: wooden sliding door on the left third, white perimeter wall, low genkan step with sparse dew sparkles, peach-gold morning sky, long lavender shadows pointing LEFT. No people, no cat. Composition: 16:9 landscape, eye-level wide shot." \
  -i "$A/scene_lane_home_morning.png"

gen frame_01 "Use case: keyframe (base for a lip-sync talking shot). Medium shot at the same morning home entrance: $GIRL She is peeking out through the half-open wooden sliding door, one hand on the door edge, face turned toward frame RIGHT. Expression: eyebrows slightly raised and gently curved; eyes opened a little wider than neutral, gaze directed right-down toward the doorstep, catchlights small and round; mouth softly parted in pleasant surprise. $CAT The cat sits on the low doorstep stone to the RIGHT, tail curled around its paws, looking up at her. Warm gold morning light from frame RIGHT, her lavender shadow falling left. Composition: 16:9 landscape, door and girl on the left half, doorstep and cat on the right." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_02 "Use case: keyframe. Medium shot at the same morning home entrance: $CAT The cat sits upright on the doorstep stone, body facing frame LEFT, looking up toward the door, tail curled around its paws, ears up; warm gold rim light on its back from frame RIGHT, sparse dew sparkles on the step edge. Composition: 16:9 landscape, cat on the right third, door and white wall on the left." \
  -i "$A/cat_reference.png" -i "$K/frame_01.png"

gen frame_03 "Use case: keyframe (base for a lip-sync talking shot). Close-up at the same morning home entrance: $CAT The cat sits on the doorstep stone, body facing frame LEFT, head turned in a three-quarter view toward the camera (mouth clearly visible, closed); expression: eyelids calm and slightly narrowed, gaze steady toward frame LEFT, ears upright, whiskers relaxed. Warm gold rim light from frame RIGHT. Composition: 16:9 landscape, cat on the left third, morning lane and one white wall behind to the right." \
  -i "$A/cat_reference.png" -i "$K/frame_02.png"

gen frame_04 "Use case: keyframe. Medium shot at the same morning home entrance: $GIRL She has stepped out and is gently pulling the wooden sliding door closed behind her, body already turning toward frame RIGHT, looking right; her long hair and skirt hem sway faintly toward frame RIGHT (breeze at her back). Warm gold morning light on her front. Composition: 16:9 landscape, door on the left, open lane leading right." \
  -i "$A/girl_reference.png" -i "$K/frame_01.png"

gen frame_lane_01 "Use case: I2V first frame for a cat leading-the-way walk shot. On the same morning lane with the white perimeter wall: $CAT It stands alert on the lane on the LEFT third of the frame, body facing RIGHT, tail high, one front paw lifted about to walk, head looking right down the lane. The RIGHT two-thirds of the frame is open morning lane, kept clear for the cat to walk into. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/cat_reference.png" -i "$A/scene_street_morning.png"

gen frame_06 "Use case: keyframe. Medium shot on the same morning lane: $GIRL She half-trots toward frame RIGHT along the lane following the cat, arms swinging lightly, the tips of her long hair and her skirt hem swaying toward frame RIGHT in the light back breeze. Expression: eyebrows raised, eyes bright, mouth open in a laughing call. Long lavender shadow trailing to her left. Composition: 16:9 landscape, she is center-left, open lane and morning sky on the right." \
  -i "$A/girl_reference.png" -i "$A/scene_street_morning.png"

gen frame_07 "Use case: keyframe, reveal. Wide shot of the exact morning stone bridge from the scene reference: the bridge arches over the river which carries a flat peach-gold morning light band, and $CAT the cat sits on the near-end stone railing on the LEFT side of the bridge, small in frame, looking right across the bridge. Composition: 16:9 landscape, bridge spanning the frame, walk direction rightward." \
  -i "$A/cat_reference.png" -i "$A/scene_bridge_morning.png"

gen frame_bridge_02 "Use case: I2V first frame for a girl bridge-walk shot. On the same morning stone bridge: $GIRL She stands at the LEFT end of the bridge deck, body facing RIGHT along the bridge, relaxed posture, about to walk; the breeze from frame LEFT rests her hair tips against her right shoulder. The bridge deck, railings and the grassy riverbank on the RIGHT are clearly visible ahead of her; keep the right two-thirds open for her walk. Composition: 16:9 landscape, eye-level side view, camera fixed." \
  -i "$A/girl_reference.png" -i "$K/frame_07.png"

gen frame_09 "Use case: keyframe. Medium shot at the far RIGHT end of the same morning stone bridge: $GIRL seen from behind in a three-quarter back view, standing at the bridge end facing the riverbank, the morning breeze from frame LEFT carrying the tips of her long deep-blue hair gently forward over her right shoulder; the grassy riverbank and the low concrete steps are visible ahead in the right half. Composition: 16:9 landscape, girl on the left third, open riverbank on the right." \
  -i "$A/girl_reference.png" -i "$A/scene_riverbank_morning.png"

gen frame_10 "Use case: keyframe, reveal. Wide shot of the exact morning riverbank from the scene reference: grassy slope with sparse dew sparkles, low concrete steps on the RIGHT third where a slim boy in a white short-sleeve shirt and navy trousers sits sketching in a small sketchbook (small in frame, seen from behind-side), and $CAT the cat small in frame on the LEFT, already trotting toward the steps. The river carries a peach-gold morning band. Composition: 16:9 landscape, eye-level wide shot." \
  -i "$A/scene_riverbank_morning.png" -i "$A/boy_reference.png" -i "$A/cat_reference.png"

echo "== seg1 done"
