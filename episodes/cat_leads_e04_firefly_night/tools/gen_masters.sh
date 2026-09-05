#!/bin/bash
# E04 scene masters: night variants of the four E03 dusk masters (codex edit
# path, same composition/camera as references). Codex imagegen; single-line
# prompts per codex-cli-imagegen.md (multi-line drops -i refs). Idempotent:
# skips masters that already exist.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night"
mkdir -p assets tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night/assets"
T="D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night/tmp"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Shadows everywhere use complementary colors (deep lavender-navy #3B3566, teal-navy), never black or grey. Characters in crisp cel-style flat color with one shadow layer. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

NIGHT="Time-of-day override: clear summer night, about 9pm. Sky: deep indigo blue (#1B2A5E) with ONE wide soft transition band to dark violet (#3A2E5C) near the horizon (the only soft gradient allowed). Stars as tiny flat white dots sparsely scattered, plus one flat pale-yellow crescent moon. Moonlight: cool blue-silver (#9FB8E8) rim light on top edges and rooflines; shadow side stays deep lavender-navy (#3B3566), never pure black. Door lamps and the few lit windows glow as flat warm-yellow (#FFD97A) rectangles, much sparser than at dusk. Ground and road surfaces carry a faint cool blue moon tint. Long soft moon shadows."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$A/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/master_$name.log"
  codex exec "$prompt $LOCK $NIGHT Avoid: people, animals, fireflies, text, watermark, photorealism, 3D render. Save the final PNG to $A/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$A/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

# 1. Night lane home: E03 dusk lane_home re-lit to night; door lamp is the warm
#    focal point, entrance on the left third (girl exits heading RIGHT).
gen scene_lane_home_night "Use case: scene master, empty street plate. Recreate the EXACT same residential lane home entrance as the reference image (same white perimeter walls, same utility poles, same house entrance on the LEFT third with the warm door lamp above the wooden sliding door, same low genkan step and potted plant, same composition and camera), but re-lit to NIGHT: the door lamp is now the main warm light source in the frame, almost all other windows dark, deep indigo night sky with sparse flat star dots and a crescent moon, cool blue-silver moonlight rim on wall tops. No people, no cats. Composition: 16:9 landscape, identical camera to the reference." \
  -i "$T/scene_lane_home_dusk.png" -i "$A/style_master.png"

# 2. Night street with walkable white wall top; lane recedes RIGHT (outing
#    direction, mirror of E03).
gen scene_street_night "Use case: scene master, empty street plate. Recreate the EXACT same residential lane as the reference image (same long white perimeter wall with FLAT WALKABLE TOP EDGE at about one-third frame height, same utility poles, same trees behind the wall), but at NIGHT: sparse warm-yellow lit windows (most dark), cool blue-silver moonlight rim on the wall top edge, deep indigo night sky with sparse flat star dots. IMPORTANT: mirror the depth direction of the reference - the lane now recedes toward the RIGHT side of the frame. No people, no cats. Composition: 16:9 landscape, eye-level side view." \
  -i "$T/scene_street_dusk.png" -i "$A/style_master.png"

# 3. Night stone bridge: near end LEFT leads to the lane, far end RIGHT fades
#    into the riverbank; river carries a flat silver-blue moonlight band.
gen scene_bridge_night "Use case: scene master, empty location plate. Recreate the EXACT same small pedestrian stone bridge over the river as the reference image (same gentle arch, same low flat stone railings, same composition and camera), but re-lit to NIGHT and with the ends swapped: the near end on the LEFT leads into the quiet residential lane with one or two warm lit windows, the far end on the RIGHT fades into the dark grassy riverbank. The river below reflects a flat silver-blue moonlight band instead of sunset gold. Deep indigo night sky with sparse flat star dots and a crescent moon. No people, no cats, no boats. Composition: 16:9 landscape, bridge spanning horizontally across the frame, walk direction rightward." \
  -i "$T/scene_bridge.png" -i "$A/style_master.png"

# 4. Night riverbank: E03 dusk riverbank re-lit to night; keep the plate clean
#    of light dots (fireflies are added later as a programmatic layer).
gen scene_riverbank_night "Use case: scene master, empty location plate. Recreate the EXACT same riverbank as the reference image (same grassy bank sloping down to the river, same low stone parapet along the top, same small distant bridge silhouette, same dandelions, same composition and camera), but re-lit to a clear summer NIGHT: the river reflects a flat silver-blue moonlight band, grass deep green-navy in soft moon shadow, deep indigo sky with sparse flat star dots and a flat pale-yellow crescent moon. IMPORTANT: no fireflies, no glowing dots on the grass or in the air - keep the plate clean. No people, no cats. Composition: 16:9 landscape, identical camera to the reference." \
  -i "$T/scene_riverbank_dusk.png" -i "$A/style_master.png"

echo "== masters done"
