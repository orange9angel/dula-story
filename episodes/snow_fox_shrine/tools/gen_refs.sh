#!/bin/bash
# Generate the style master + character references for snow_fox_shrine.
# Run first; keyframes reference these.
set -u
cd "D:/opensource/movie/dula-story/episodes/snow_fox_shrine"
mkdir -p tmp

A="D:/opensource/movie/dula-story/episodes/snow_fox_shrine/assets"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"yukie\" -- a serene winter
night scene rendered as razor-clean flat color shapes, like a Japanese
shin-hanga woodblock print with zero texture. Sky: deep indigo (#1B2A4E) at
the top softening into muted slate blue (#4A6094) near the horizon through
ONE wide soft smooth transition band -- no steps, no stripes; this sky
transition is the only soft gradient allowed in the entire image. Snow: flat
hard-edged shapes, pure snow white (#F4F7FC) with a single flat periwinkle
shadow tone (#93A4CC). Shrine woodwork: flat vermilion (#C8402A) with a
single flat plum shadow tone (#7E3049). Night shadows are deep indigo
(#232F52), never black or grey. Lantern light: flat warm amber (#F2B45A)
geometric shapes, never glow, never haze. Characters in crisp cel-style flat
color with one shadow layer; outlines warm dark brown on the lit side, muted
indigo on the shadow side.
Avoid: stepped or striped sky, banding, grain, noise, paper texture,
halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects,
Makoto Shinkai style, text, captions, logos, watermark, signature."

echo "== gen style_master"
codex exec "Use case: style master. A small mountain Shinto shrine approach on
a snowy New Year's Eve night, no people: a vermilion torii gate in the left
third, snow-covered stone steps leading up to a tiny wooden shrine under an
eave on the right, two stone lanterns with warm amber light shapes, deep
indigo night sky, snow piled in flat white shapes on every surface, distant
village lights as tiny flat amber dots in the valley below. Composition: 16:9
landscape. $LOCK
Avoid: people, animals, text, watermark, photorealism, 3D render.
并把成品 PNG 保存到 $A/style_master.png。" $FLAGS > tmp/gen_style_master.log 2>&1
[ -s "$A/style_master.png" ] && echo "== ok style_master" || echo "== MISSING style_master"

echo "== gen tsumugi_reference"
codex exec "Use case: character reference sheet. A 10-year-old Japanese girl
named Tsumugi standing full-body front view on a plain flat deep-indigo
background: short dark-brown bob hair, round cream knitted earmuffs, a thick
cream scarf wrapped high, a vermilion red coat with flat plum shadow side,
dark grey mittens, a small folded paper shopping bag held in her right hand,
dark tights, brown snow boots. Calm gentle expression, mouth closed. Crisp
cel-style flat color. Composition: full body centered, 16:9 landscape with
generous margins. $LOCK
Avoid: extra limbs, text, watermark, photorealism, 3D render.
并把成品 PNG 保存到 $A/tsumugi_reference.png。" $FLAGS > tmp/gen_tsumugi_reference.log 2>&1
[ -s "$A/tsumugi_reference.png" ] && echo "== ok tsumugi_reference" || echo "== MISSING tsumugi_reference"

echo "== gen fox_reference"
codex exec "Use case: character reference sheet. A small red fox cub sitting
front-three-quarter view on a plain flat deep-indigo background: orange-red
fur (#C9662F), cream chest and cheeks, white tail tip, big triangular ears
with dark backs, dark amber eyes, tiny black nose, paws tucked neatly. Alert
gentle expression, mouth closed. Crisp cel-style flat color with one shadow
layer. Composition: full body centered, 16:9 landscape with generous margins.
$LOCK
Avoid: extra limbs, extra tails, text, watermark, photorealism, 3D render.
并把成品 PNG 保存到 $A/fox_reference.png。" $FLAGS > tmp/gen_fox_reference.log 2>&1
[ -s "$A/fox_reference.png" ] && echo "== ok fox_reference" || echo "== MISSING fox_reference"
