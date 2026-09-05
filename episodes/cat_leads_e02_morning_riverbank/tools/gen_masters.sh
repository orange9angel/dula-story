#!/bin/bash
# E02 scene masters: morning bedroom, morning street with walkable white wall,
# uphill lane with stone steps, morning riverbank. Codex imagegen path;
# fallback is gen_image.py (wan2.7-image-pro) per-storyboard provider order.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank"
mkdir -p assets tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank/assets"
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

MORNING="Time of day: early weekend morning. The sun is LOW, so light bands
are long and slanted, shadows are long, and dappled light spots lean slightly
warmer gold while the sky stays the same clear cyan-to-aqua morning blue."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  echo "== gen $name"
  local log="tmp/master_$name.log"
  codex exec "$prompt $LOCK $MORNING Avoid: people, animals, text, watermark, photorealism, 3D render. 并把成品 PNG 保存到 $A/${name}.png。" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$A/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

# Morning bedroom: same room as E01 scene_room_e01.png, morning light instead
# of afternoon. Empty of characters (masters are scene plates).
gen scene_room_morning "Use case: scene master, empty room plate. Recreate the
EXACT same bedroom as the reference image (same desk by the window, same single
bed, same wooden windowsill, same furniture layout and wall colors), but with
EARLY MORNING light: the sunlight band through the window is lower and more
slanted, shadows longer, the sky outside a fresh clear morning blue. No people,
no cat. Composition: 16:9 landscape, same camera angle as the reference." \
  -i "$A/scene_room_e01.png" -i "$A/style_master.png"

# Morning street with a walkable white wall top (cat walks along it).
gen scene_street_wall "Use case: scene master, empty street plate. A quiet
residential lane on a sunny early morning, same neighborhood feeling as the
reference street image: a long white perimeter wall runs along the LEFT side
of the lane with a FLAT WALKABLE TOP EDGE clearly visible at about one-third
frame height, utility poles, green trees behind the wall, long morning shadows
and flat gold dappled light spots on the pavement. No people, no cats.
Composition: 16:9 landscape, eye-level side view looking down the lane, the
lane receding toward the right side of the frame." \
  -i "$A/scene_street_e01.png" -i "$A/style_master.png"

# Uphill lane with stone steps.
gen scene_slope_steps "Use case: scene master, empty location plate. A narrow
residential lane that climbs uphill and ends in a flight of wide stone steps
leading up to the top of a river embankment, on a sunny early morning. White
perimeter walls and green hedges line both sides of the lane, utility pole at
the side, long morning shadows on the steps. At the top of the steps, a sliver
of bright morning sky and a hint of river sparkle is visible. No people, no
cats. Composition: 16:9 landscape, eye-level view from the bottom of the lane
looking up toward the steps on the right side." \
  -i "$A/style_master.png"

# Morning riverbank.
gen scene_riverbank "Use case: scene master, empty location plate. A wide
river embankment on a sunny early morning: a grassy green bank sloping down
toward a calm river that reflects the low morning sun as flat geometric gold
light bands on the water, a low stone parapet running along the top of the
bank, a small distant bridge silhouette, a few hard-edged white bubble clouds
in the clear cyan-to-aqua sky, grass blades and a few dandelions in the
foreground. No people, no cats, no boats. Composition: 16:9 landscape, wide
eye-level view from the top of the bank, river spanning the right two-thirds
of the frame." \
  -i "$A/style_master.png"

echo "== masters done"
