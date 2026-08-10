#!/bin/bash
# Day 2 (same-day continuation): seg1 keyframes frame_00..frame_12 + ib_01/ib_02.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store"
mkdir -p assets/keyframes assets/action_inbetweens tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets"
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
Makoto Shinkai style, text, captions, logos, watermark, signature."

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
  codex exec "$prompt $LOCK $AVOID 并把成品 PNG 保存到 $outdir/${name}.png。" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$outdir/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_00 "$K" "Use case: establishing shot, wide view of the same sunny
afternoon bedroom as the reference: diagonal flat gold sunlight band across
desk and floor, single bed, bookshelves, blue sky with one bubble cloud
outside the window. No people, no animals. Composition: 16:9 landscape." \
  -i "$A/style_master.png" -i "$A/scene_room.png"

gen frame_01 "$K" "Use case: keyframe. Inside the same bedroom, medium shot of
the girl sitting at the study desk, chin resting in one hand, gazing sideways,
bored relaxed expression, mouth closed, face clearly visible with no hair
covering the mouth. $GIRL Composition: 16:9 landscape, afternoon sunlight band
across the desk." -i "$A/girl_reference.png" -i "$K/frame_00.png"

gen frame_02 "$K" "Use case: keyframe. Close-up of the cat sitting on the
wooden windowsill of the same bedroom, body facing the blue sky outside, head
turned back looking into the room, mouth closed. $CAT Composition: 16:9
landscape, afternoon sunlight on the windowsill." \
  -i "$A/cat_reference.png" -i "$K/frame_00.png"

gen frame_03 "$K" "Use case: keyframe. Inside the same bedroom, medium shot of
the girl looking up from her desk toward the window, curious expression,
mouth closed, face clearly visible with no hair covering the mouth. $GIRL
Composition: 16:9 landscape." -i "$A/girl_reference.png" -i "$K/frame_01.png"

gen ib_01 "$IB" "Use case: action in-between. At the entryway of a Japanese
home, the girl bending down to put on her black loafers, school uniform,
afternoon light from the open door. $GIRL Composition: 16:9 landscape." \
  -i "$A/girl_reference.png" -i "$K/frame_03.png"

gen frame_04 "$K" "Use case: keyframe. Wide shot of the same sunny residential
alley as the reference: the girl walking toward the right side of the frame,
following the cat walking a few steps ahead of her, both full body, mid-stride
walking pose. $GIRL $CAT Composition: 16:9 landscape, dappled gold light
spots on the pavement." -i "$A/scene_street.png" -i "$A/girl_reference.png" -i "$A/cat_reference.png"

gen ib_02 "$IB" "局部编辑 image 1：严格保持构图、背景、服装、光影逐像素不变，
只把少女和猫的走路姿态换成相反相位（左右腿互换），作为换步循环的另一帧。
输出尺寸与输入完全一致。" -i "$K/frame_04.png"

gen frame_05 "$K" "Use case: keyframe. Medium shot in the same sunny alley: the
cat walking ahead, head turned back to look at the viewer, mid-stride. $CAT
Composition: 16:9 landscape, white walls and green trees, dappled light." \
  -i "$A/cat_reference.png" -i "$K/frame_04.png"

gen frame_06 "$K" "Use case: keyframe. The girl walking away from the camera
down the same sunny alley toward the small white-and-aqua convenience store
visible far ahead, back view, mid-stride. $GIRL Composition: 16:9 landscape." \
  -i "$K/frame_04.png" -i "$K/frame_05.png"

gen frame_07 "$K" "Use case: keyframe. The cat sitting at the end of the alley,
in front of it the sunlit white-and-aqua convenience store facade glowing in
flat sunlight. $CAT Composition: 16:9 landscape." \
  -i "$K/frame_06.png" -i "$A/style_master.png"

gen frame_08 "$K" "Use case: keyframe. Medium shot of the girl standing still
in the alley, looking toward the convenience store ahead, curious expression,
mouth closed, face clearly visible with no hair covering the mouth. $GIRL
Composition: 16:9 landscape." -i "$A/girl_reference.png" -i "$K/frame_07.png"

gen frame_09 "$K" "Use case: keyframe. Wide exterior shot of the small
white-and-aqua convenience store on a sunny day: clean facade, glass automatic
door, dappled flat gold light spots in front. No people, no animals.
Composition: 16:9 landscape." -i "$A/style_master.png" -i "$K/frame_07.png"

gen frame_10 "$K" "Use case: keyframe. The cat sitting right in front of the
store's glass automatic door, head turned back, mouth closed. $CAT
Composition: 16:9 landscape." -i "$A/cat_reference.png" -i "$K/frame_09.png"

gen frame_11 "$K" "Use case: keyframe. Medium-close shot of the girl smiling
gently as she walks closer to the store entrance, face clearly visible. $GIRL
Composition: 16:9 landscape, sunlit storefront behind her." \
  -i "$A/girl_reference.png" -i "$K/frame_10.png"

gen frame_12 "$K" "Use case: keyframe. The store's glass automatic door fully
open, bright interior visible; the girl and the cat walking inside together,
seen from outside behind them. $GIRL $CAT Composition: 16:9 landscape." \
  -i "$K/frame_09.png" -i "$K/frame_11.png"

echo "== seg1 done"
