#!/bin/bash
# Day 1 round 4: sunprint v2 — fix the stepped sky: two-tone sky with one soft
# wide transition band; everything else identical to approved sunprint_v1.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store"
mkdir -p assets/style_tests tmp

OUT="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets/style_tests"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

PROMPT="Use case: style-defining master frame for an animated short, in an
original illustration style called sunprint: a bright sunny-day scene rendered
as razor-clean flat color shapes, like a high-definition retro silkscreen
poster with zero texture. Sky: deep clear cyan blue (#2E9BD6) at the top of the
frame softening into light aqua (#7FD4E8) near the horizon through ONE wide
soft smooth transition band -- a natural sky, no steps, no stripes; this sky
transition is the only soft gradient allowed in the entire image. Clouds:
hard-edged rounded bubble shapes, pure white (#FDFBF4) with a single flat
lavender shadow tone (#8E7CC3). Shadows everywhere use complementary colors
(lavender, teal-green), never black or grey. Sunlight is rendered as flat
geometric shapes (diagonal light bands, round dappled light spots) in flat gold
(#F5B942), never glow, never haze. Subject: a 16-year-old girl (slim, large
amber eyes, long straight deep-blue hair to her waist, straight bangs, white
short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks,
black loafers) standing beside an orange tabby cat (darker stripes, white chest
patch, four white paws, green eyes, dry fluffy fur) sitting at her feet, both
facing a small convenience store with a clean white-and-aqua facade. Characters
in crisp cel-style flat color with one shadow layer; outlines warm brown on the
lit side, muted purple on the shadow side. Composition: 16:9 landscape, full
body visible, eye-level view, cheerful quiet street, green plants (#58A05C).
Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone,
airbrush, blur, photorealism, 3D render, lens flare, glow effects,
Makoto Shinkai style, text, captions, logos, watermark, signature.
并把成品 PNG 保存到 $OUT/sunprint_v2.png。"

echo "== gen sunprint_v2"
codex exec "$PROMPT" $FLAGS > tmp/day1_sunprint_v2.log 2>&1
if [ -s "$OUT/sunprint_v2.png" ]; then echo "== ok sunprint_v2"; else echo "== MISSING (see tmp/day1_sunprint_v2.log)"; fi
