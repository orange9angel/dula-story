#!/bin/bash
# E02 seg1 keyframes frame_00..frame_08 + I2V first frames (wall_walk,
# street_walk, hop_steps) + ib_01. Codex imagegen path; masters must exist.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank"
mkdir -p assets/keyframes assets/action_inbetweens tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank/assets"
K="$A/keyframes"
IB="$A/action_inbetweens"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- bright sunny-day
scene rendered as razor-clean flat color shapes, like a high-definition retro
silkscreen poster with zero texture. Sky: deep clear cyan blue (#2E9BD6) at
the top softening into light aqua (#7FD4E8) near the horizon through ONE wide
soft smooth transition band -- no steps, no stripes; this sky transition is
the only soft gradient allowed in the entire image. Clouds: hard-edged rounded
bubble shapes, pure white (#FDFBF4) with a single flat lavender shadow tone
(#8E7CC3). Shadows everywhere use complementary colors (lavender, teal-green),
never black or grey. Sunlight is rendered as flat geometric shapes (diagonal
light bands, round dappled light spots) in flat gold (#F5B942), never glow,
never haze. Characters in crisp cel-style flat color with one shadow layer;
outlines warm brown on the lit side, muted purple on the shadow side.
Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone,
airbrush, blur, photorealism, 3D render, lens flare, glow effects,
realistic anime film lighting, text, captions, logos, watermark, signature."

MORNING="Time of day: early weekend morning. The sun is LOW, light bands are
long and slanted, shadows are long, dappled light spots lean slightly warmer
gold; the sky stays the same clear cyan-to-aqua morning blue."

GIRL="The girl: slim 16-year-old, large amber eyes, long straight deep-blue
hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue
plaid pleated skirt, black knee socks, black loafers, no bag no umbrella."
CAT="The cat: orange tabby with darker stripes, white chest patch, four white
paws, green eyes, dry fluffy fur, small body."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, text,
watermark, photorealism, 3D render."

gen() { # name outdir prompt refs...
  local name="$1" outdir="$2" prompt="$3"; shift 3
  echo "== gen $name"
  local log="tmp/seg1_$name.log"
  codex exec "$prompt $LOCK $MORNING $AVOID 并把成品 PNG 保存到 $outdir/${name}.png。" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$outdir/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_00 "$K" "Use case: establishing shot, wide view of the exact morning
bedroom from the scene reference: low slanted flat gold sunlight band across
the desk and the single bed, fresh morning blue sky outside the window. No
people, no cat. Composition: 16:9 landscape, eye-level wide shot." \
  -i "$A/scene_room_morning.png"

gen frame_01 "$K" "Use case: keyframe. Medium shot inside the same morning
bedroom: $GIRL She sits up on the single bed, one hand rubbing her sleepy eye,
mouth slightly open mid-sentence, hair a little loose. Low morning sunlight
band across the bed. Composition: 16:9 landscape, medium shot, she faces the
window on the right side of the frame." \
  -i "$A/girl_reference.png" -i "$K/frame_00.png"

gen frame_02 "$K" "Use case: keyframe. Close-up on the wooden windowsill of the
same morning bedroom: $CAT It sits on the windowsill half backlit by the low
morning sun, head turned back looking into the room, mouth closed. Bright
morning sky behind it. Composition: 16:9 landscape, close-up, cat on the right
third of the frame." \
  -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_03 "$K" "Use case: keyframe. Medium shot inside the same morning
bedroom: $GIRL She stands at the room door pulling it open, a bright band of
morning light flooding in from the doorway onto the floor, she looks toward
the window with a wry smile. Composition: 16:9 landscape." \
  -i "$A/girl_reference.png" -i "$K/frame_01.png"

gen ib_01 "$IB" "Use case: action in-between. At the same home entrance: $GIRL
She bends down at the genkan slipping on one black loafer, one hand touching
the shoe, morning light from the open door. Composition: 16:9 landscape,
medium side view." \
  -i "$A/girl_reference.png" -i "$K/frame_03.png"

gen frame_wall_01 "$K" "Use case: keyframe AND first frame of an image-to-video
clip, so the composition must allow walking motion: $CAT It walks along the
flat TOP EDGE of the long white perimeter wall on the left side of the morning
street, body in side profile facing RIGHT, one paw raised mid-step, tail
curved up. Below the wall the quiet lane with long morning shadows. Important:
keep the cat clearly separated from the wall edge, full body visible, side
view. Composition: 16:9 landscape, eye-level side view, cat on the left third
walking toward the right." \
  -i "$A/cat_reference.png" -i "$A/scene_street_wall.png"

gen frame_walk_02 "$K" "Use case: keyframe AND first frame of an image-to-video
clip, so the composition must allow walking motion: $GIRL She walks along the
morning lane in side profile facing RIGHT, full body visible head to shoes,
one leg forward mid-stride, long morning shadow stretching behind her, the
white perimeter wall on the left side of the street. Composition: 16:9
landscape, eye-level full-body side view, she is on the left half of the frame
with open street ahead of her to the right." \
  -i "$A/girl_reference.png" -i "$A/scene_street_wall.png"

gen frame_05 "$K" "Use case: keyframe. Medium shot on the stone steps at the
end of the uphill lane: $CAT It sits on a middle step, body facing up the
steps, head turned back looking down at the viewer, mouth closed. White walls
and green hedges flank the steps, long morning shadows across the stone.
Composition: 16:9 landscape, eye-level from below the steps." \
  -i "$A/cat_reference.png" -i "$A/scene_slope_steps.png"

gen frame_steps_03 "$K" "Use case: keyframe AND first frame of an image-to-video
clip, so the composition must allow a hopping-up motion: $CAT It stands at the
bottom of the wide stone steps, side profile facing RIGHT toward the steps,
crouched slightly ready to hop up. All steps visible rising to the right. The
top of the steps shows bright morning sky. Composition: 16:9 landscape,
eye-level side view, cat small in the lower-left third." \
  -i "$A/cat_reference.png" -i "$A/scene_slope_steps.png"

gen frame_06 "$K" "Use case: keyframe. Medium shot: $GIRL She climbs the stone
steps, one foot on a higher step, looking up toward the top with a slight
pout, one hand shading her eyes from the low sun. Composition: 16:9 landscape,
low-angle view from below, she faces up-right." \
  -i "$A/girl_reference.png" -i "$A/scene_slope_steps.png"

gen frame_07 "$K" "Use case: keyframe. Wide shot of the whole stone-step lane:
$GIRL She is halfway up the steps, small in the frame; at the top of the steps
the small orange cat sits as a silhouette against the bright morning sky
looking back at her. Long shadows down the steps. Composition: 16:9 landscape,
wide view from the bottom of the lane." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_06.png"

gen frame_08 "$K" "Use case: keyframe, subjective POV. The moment of arrival at
the TOP of the stone steps: the riverbank suddenly opens wide ahead -- a broad
morning river sparkling with flat gold light bands, green embankment grass
sloping down, a low stone parapet, a distant small bridge, hard-edged white
clouds. The last two stone steps at the bottom edge of the frame. No people,
no cat. Composition: 16:9 landscape, eye-level POV looking forward." \
  -i "$A/scene_riverbank.png" -i "$K/frame_07.png"

echo "== seg1 done"
