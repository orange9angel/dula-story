#!/bin/bash
# Day 1: masters — girl, cat, 3 scene masters (daytime sunprint).
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store"
mkdir -p tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets"
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

run() {
  local name="$1"; shift
  local prompt="$1"; shift
  echo "== gen $name"
  local log="tmp/day1_master_$name.log"
  codex exec "$prompt $LOCK 并把成品 PNG 保存到 $A/${name}.png。" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$A/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

run girl_reference "Use case: master character reference for an animated short,
matching the exact style of the reference image. One original
Japanese-anime-style 16-year-old girl standing relaxed on a sunny quiet street,
facing the viewer. Design lock: slim build; warm light skin; large amber eyes;
long straight deep-blue hair reaching her waist; straight bangs; white
short-sleeve school shirt; navy-blue plaid pleated skirt; black knee socks;
black loafers. No umbrella, no bag. Composition: 16:9 landscape, full body
visible, eye-level three-quarter front view.
Avoid: extra people, animals, duplicate limbs, text, watermark, photorealism,
3D render." -i "$A/style_master.png"

run cat_reference "Use case: master character reference for a cat in an animated
short, matching the exact style of the reference images. One original orange
tabby cat sitting upright on a sunny sidewalk in front of the same convenience
store. Design lock: orange tabby fur with darker stripes; white chest patch and
four white paws; green eyes; dry fluffy fur; small skinny body but healthy.
Composition: 16:9 landscape, cat at center, eye-level view.
Avoid: humans, extra cats, duplicate limbs, text, watermark, photorealism,
3D render." -i "$A/style_master.png" -i "$A/girl_reference.png"

run scene_room "Use case: master scene reference for an animated short, matching
the exact style of the reference image. Interior: a small tidy Japanese bedroom
on a sunny afternoon, sunlight streaming diagonally as a flat gold light band
through a window with a wooden sill onto a study desk with books, a single bed,
blue sky with one bubble cloud outside the window. No people, no animals.
Composition: 16:9 landscape, wide view of the room.
Avoid: people, animals, text, watermark, photorealism, 3D render." -i "$A/style_master.png"

run scene_street "Use case: master scene reference for an animated short,
matching the exact style of the reference image. A quiet residential alley on a
sunny day: white walls, utility poles with wires, green trees (#58A05C),
dappled flat gold light spots on the pavement, deep cyan sky with bubble
clouds. No people, no animals. Composition: 16:9 landscape, view down the
alley, the small white-and-aqua convenience store visible far ahead.
Avoid: people, animals, cars, text, watermark, photorealism, 3D render." -i "$A/style_master.png"

run scene_store "Use case: master scene reference for an animated short,
matching the exact style of the reference image. Interior of a small clean
convenience store on a sunny day: bright shelves stocked with colorful goods, a
hot oden counter near the register (do NOT draw any steam), a bench by the
front window, glass automatic door visible with sunlight outside. No people, no
animals. Composition: 16:9 landscape, wide interior view.
Avoid: people, animals, steam, text, watermark, photorealism, 3D render." -i "$A/style_master.png"

echo "== masters done"
