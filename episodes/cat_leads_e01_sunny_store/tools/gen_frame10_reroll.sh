#!/bin/bash
# Re-roll frame_10: roll1 rejected (cat too small, back to camera, mouth not
# visible while the 23.4s meow cue lands on this shot). Need medium shot,
# head turned back, mouth visible & closed.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store"
mkdir -p tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets"
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
never black or grey. Sunlight is rendered as flat geometric shapes in flat gold
(#F5B942), never glow, never haze. Characters in crisp cel-style flat color
with one shadow layer; outlines warm brown on the lit side, muted purple on
the shadow side.
Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone,
airbrush, blur, photorealism, 3D render, lens flare, glow effects,
Makoto Shinkai style, text, captions, logos, watermark, signature."

echo "== gen frame_10 (roll 2)"
cp "$K/frame_10.png" "tmp/frame_10_roll1_rejected.png"
codex exec "Use case: keyframe. Medium shot in front of the same sunny
convenience store as the reference: the orange tabby cat sitting right in
front of the glass automatic door, body facing the door, head turned back over
its shoulder looking toward the viewer, face and mouth clearly visible, mouth
closed. The cat: orange tabby with darker stripes, white chest patch, four
white paws, green eyes, dry fluffy fur. The cat fills a good portion of the
frame (not tiny). Composition: 16:9 landscape. $LOCK
Avoid: humans, extra cats, duplicate limbs, text, watermark, photorealism,
3D render. 并把成品 PNG 保存到 $K/frame_10.png。" $FLAGS -i "$A/cat_reference.png" -i "$K/frame_09.png" > tmp/seg1_frame_10_roll2.log 2>&1
if [ -s "$K/frame_10.png" ]; then echo "== ok frame_10 roll2"; else echo "== MISSING (see tmp/seg1_frame_10_roll2.log)"; fi
