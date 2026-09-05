#!/bin/bash
# E06 master: ONE scene master -- daytime riverbank with the big shade tree
# (E05 morning master re-lit to late morning + new tree for foreground framing).
# Codex imagegen; single-line prompt per codex-cli-imagegen.md. Idempotent.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model"
mkdir -p assets tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model/assets"
E05="D:/opensource/movie/dula-story/episodes/cat_leads_e05_morning_sketch/assets"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- razor-clean flat color shapes like a high-definition retro silkscreen poster with zero texture, zero grain, zero noise. Sky: deep clear cyan blue (#2E9BD6) at the top softening into light aqua (#7FD4E8) near the horizon through ONE wide soft transition band (the only soft gradient allowed). Clouds: hard-edged rounded bubble shapes, pure white (#FDFBF4) with a single flat lavender shadow tone (#8E7CC3). Shadows everywhere use complementary colors (lavender #8E7CC3, teal-green), never black or grey. Sunlight is rendered as flat geometric shapes (diagonal light bands, round dappled light spots) in flat gold (#F5B942), never glow, never haze. Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects, realistic anime film lighting, text, captions, logos, watermark, signature."

DENSITY="Composition density rules: the scene has THREE depth layers -- foreground framing elements (overhanging tree canopy, grass blades, large flat darker shapes), the midground subject area, and a layered background (river, distant town, sky). Never leave the subject area against a flat empty background."

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  if [ -s "$A/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/master_$name.log"
  codex exec "$prompt $LOCK $DENSITY Avoid: people, animals, text, watermark, photorealism, 3D render. Save the final PNG to $A/${name}.png" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$A/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

# Daytime riverbank + big tree: same bank/steps/river composition as the E05
# morning master (same camera), re-lit to late morning, plus a big leafy tree
# standing left of the steps whose canopy reaches into the top of the frame.
gen scene_riverbank_day "Use case: scene master, empty location plate. Recreate the EXACT same riverbank as the reference image (same grassy bank sloping down to the river, same low flat concrete steps descending the bank on the RIGHT third, same low stone parapet along the top, same distant bridge silhouette, same composition and camera), but re-lit to bright late MORNING (about 9am): clear cyan-to-aqua sky, crisp sunlight from the upper RIGHT, lavender shadows of moderate length, fresh saturated green grass. IMPORTANT addition: a big leafy tree stands just LEFT of the concrete steps, its rounded canopy reaching into the top edge of the frame and casting a large flat lavender shade patch over the steps and the grass beside them, with flat gold (#F5B942) dappled light spots inside the shade. No people, no cats, no boats. Composition: 16:9 landscape, identical camera to the reference." \
  -i "$E05/scene_riverbank_morning.png" -i "$A/style_master.png"

echo "== masters done"
