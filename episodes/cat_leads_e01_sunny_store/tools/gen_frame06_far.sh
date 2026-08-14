#!/bin/bash
# Generate frame_06_far: the follow_back shot's second beat. The 14.0-16.5s
# walk-away was retired from A/B leg-swap cels (full-image repaint drift made
# calves/hips flicker) to static cels; two cels (near -> far) sell that she
# actually covered ground. This far cel keeps frame_06's exact viewpoint but
# places the girl much farther down the road, close to the convenience store.
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

echo "== gen frame_06_far"
codex exec "Use case: keyframe. Recreate the EXACT same sunny residential
street as the reference image, from the EXACT same camera viewpoint: same
houses, walls, gates, utility poles, dappled tree shadows on the road, same
convenience store at the end of the street. One change: the long-blue-haired
schoolgirl (white blouse, blue plaid skirt, black knee socks, back to camera,
mid-stride walking pose) has walked much farther away -- she now appears
SMALL in the middle distance, about one-third of her height in the reference,
standing on the road much closer to the convenience store, still on the same
left-of-center walking line, still facing away from the viewer toward the
store. Empty foreground road where she used to be. Composition: 16:9
landscape. $LOCK
Avoid: extra people, duplicate girls, cats, cars, duplicate limbs, text,
watermark, photorealism, 3D render. 并把成品 PNG 保存到 $K/frame_06_far.png。" $FLAGS -i "$K/frame_06.png" -i "$A/girl_reference.png" > tmp/gen_frame06_far.log 2>&1
if [ -s "$K/frame_06_far.png" ]; then echo "== ok frame_06_far"; else echo "== MISSING (see tmp/gen_frame06_far.log)"; fi
