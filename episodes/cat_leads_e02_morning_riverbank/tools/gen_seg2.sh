#!/bin/bash
# E02 seg2 keyframes frame_09..frame_19 + I2V first frame (grass_walk) + ib_02.
# Codex imagegen path; masters and seg1 frames must exist.
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
  local log="tmp/seg2_$name.log"
  codex exec "$prompt $LOCK $MORNING $AVOID 并把成品 PNG 保存到 $outdir/${name}.png。" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$outdir/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_09 "$K" "Use case: keyframe, wide panorama of the morning riverbank
from the scene reference: calm river sparkling with flat geometric gold
morning light bands, green grassy bank sloping down, low stone parapet,
distant small bridge silhouette, hard-edged white bubble clouds. No people, no
cat. Composition: 16:9 landscape, wide eye-level view from the top of the
bank." \
  -i "$A/scene_riverbank.png"

gen frame_grass_04 "$K" "Use case: keyframe AND first frame of an image-to-video
clip, so the composition must allow walking motion: $GIRL She walks down the
grassy riverbank slope toward the river, seen from behind at a slight side
angle, facing RIGHT and downhill, full body visible, one step mid-stride, hair
and pleated skirt resting (motion comes from the video). Morning river
sparkles ahead of her. Composition: 16:9 landscape, eye-level, she is on the
left third with open grass slope ahead to the right." \
  -i "$A/girl_reference.png" -i "$K/frame_09.png"

gen frame_10 "$K" "Use case: keyframe. Medium shot on the grassy bank: $CAT It
trots ahead across the grass toward the river, body in side profile facing
RIGHT, tail up, one paw forward. Grass blades and a few dandelions around its
paws. Composition: 16:9 landscape, low eye-level near the grass." \
  -i "$A/cat_reference.png" -i "$K/frame_09.png"

gen frame_11 "$K" "Use case: keyframe. Medium shot: $GIRL She has stopped on the
grassy bank and gazes at the sparkling morning river, hair and skirt hem
lifted slightly by the river breeze, mouth slightly open in a soft amazed
smile. Composition: 16:9 landscape, medium shot, she faces the river on the
right." \
  -i "$A/girl_reference.png" -i "$K/frame_10.png"

gen frame_12 "$K" "Use case: keyframe, empty close shot of the river surface in
morning light: calm water rendered as flat teal shapes with crisp flat gold
geometric light bands and a few hard-edged sparkle shapes, soft reflection of
the cyan sky. No people, no cat, no boats. Composition: 16:9 landscape,
close-up on the water filling the whole frame." \
  -i "$K/frame_09.png"

gen frame_13 "$K" "Use case: keyframe. Medium shot: $CAT It has hopped onto the
low stone parapet along the top of the bank and sits there facing the river,
back to the viewer, head turned slightly to the left, ears up. Morning river
sparkle beyond. Composition: 16:9 landscape, eye-level slightly behind the
cat." \
  -i "$A/cat_reference.png" -i "$K/frame_11.png"

gen frame_14 "$K" "Use case: keyframe. Medium-wide shot on the bank top: $GIRL
She is sitting down on the grass next to the low stone parapet where the small
orange cat sits; her knees bent to the side, one hand touching the grass.
Morning river behind them. Composition: 16:9 landscape, eye-level, girl on the
left, cat on the parapet to her right." \
  -i "$A/girl_reference.png" -i "$K/frame_13.png"

gen ib_02 "$IB" "Use case: action in-between, sitting-down mid pose: $GIRL She
is halfway through sitting down on the grass next to the stone parapet, knees
bent, one hand braced on the grass, skirt arranged. The small orange cat sits
on the parapet watching her. Composition: 16:9 landscape, same camera and
layout as the reference frame." \
  -i "$K/frame_14.png"

gen frame_15 "$K" "Use case: keyframe. Wide shot from behind: $GIRL She sits on
the grass and the small orange cat sits on the low stone parapet beside her,
both seen from behind gazing at the wide sparkling morning river, their long
morning shadows stretching behind them on the grass. Composition: 16:9
landscape, wide eye-level view from behind, pair centered slightly left." \
  -i "$A/girl_reference.png" -i "$A/cat_reference.png" -i "$K/frame_14.png"

gen frame_16 "$K" "Use case: keyframe. Close shot: $GIRL Side-profile close-up,
she sits watching the river with a small warm smile, mouth closed, morning
light on her face, a few hair strands lifted by the breeze. River sparkle
bokeh-like flat shapes far behind. Composition: 16:9 landscape, close-up side
profile facing right." \
  -i "$A/girl_reference.png" -i "$K/frame_15.png"

gen frame_17 "$K" "Use case: keyframe, wide panorama like the earlier wide
riverbank frame but warmer: the girl sits on the grass and the cat on the
parapet as two small silhouettes against the broad sparkling river, the light
leans warmer gold, long shadows. Composition: 16:9 landscape, wide view,
matching the reference composition." \
  -i "$K/frame_15.png" -i "$A/scene_riverbank.png"

gen frame_18 "$K" "Use case: keyframe, empty shot where river meets sky: the
calm morning river fills the lower half, flat gold light bands on the water,
the clear cyan-to-aqua sky with hard-edged white bubble clouds fills the upper
half, the distant small bridge silhouette at the right. No people, no cat.
Composition: 16:9 landscape, horizon at mid-frame." \
  -i "$K/frame_12.png"

gen frame_19 "$K" "Use case: keyframe, final sky plate: clear morning sky only,
deep cyan blue at the top softening into light aqua toward the bottom through
one wide soft transition band, a few hard-edged white bubble clouds with flat
lavender shadow. No land, no river, no birds, no people. Composition: 16:9
landscape." \
  -i "$A/style_master.png"

echo "== seg2 done"
