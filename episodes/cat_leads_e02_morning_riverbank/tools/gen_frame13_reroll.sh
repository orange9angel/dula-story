#!/bin/bash
# Reroll frame_13: cat must show its mouth (meow cue at 44.0s lands in this
# shot; first version had the cat fully back-turned, no mouth to rig).
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank"
A="D:/opensource/movie/dula-story/episodes/cat_leads_e02_morning_riverbank/assets"
K="$A/keyframes"
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

CAT="The cat: orange tabby with darker stripes, white chest patch, four white
paws, green eyes, dry fluffy fur, small body."
AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, text,
watermark, photorealism, 3D render."

codex exec "Use case: keyframe. Medium shot on the morning riverbank: $CAT It
sits on the low stone parapet along the top of the bank, body facing the river
(right side of frame), but its HEAD IS TURNED back toward the viewer in a
three-quarter view so its eyes, nose and closed mouth are clearly visible.
Morning river sparkle beyond. Composition: 16:9 landscape, eye-level slightly
behind the cat, cat on the left third. $LOCK $MORNING $AVOID 并把成品 PNG 保存到 $K/frame_13.png。" \
  $FLAGS -i "$A/cat_reference.png" -i "$K/frame_11.png" > tmp/frame_13_reroll.log 2>&1
if [ -s "$K/frame_13.png" ]; then echo "== ok frame_13 reroll"; else echo "== FAILED (see tmp/frame_13_reroll.log)"; fi
