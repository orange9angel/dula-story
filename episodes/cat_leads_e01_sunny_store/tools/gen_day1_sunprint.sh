#!/bin/bash
# Day 1 round 3: "Sunprint" clean version — bright, crisp, zero texture.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store"
mkdir -p assets/style_tests tmp

OUT="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets/style_tests"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

PROMPT="Use case: style-defining test frame for an animated short, in an original
illustration style called sunprint: a bright sunny-day scene rendered as
razor-clean flat color shapes, like a high-definition retro silkscreen poster
with zero texture. Sky: banded flat color layers from clear cyan blue (#2E9BD6)
to soft aqua near the horizon, no gradient blending between bands. Clouds:
hard-edged rounded bubble shapes, pure white (#FDFBF4) with a single flat
lavender shadow tone (#8E7CC3). Shadows everywhere use complementary colors
(lavender, teal-green), never black or grey. Sunlight is rendered as flat
geometric shapes (diagonal light bands, round light spots) in flat gold
(#F5B942), never glow, never haze. Subject: a 16-year-old girl (slim, large
amber eyes, long straight deep-blue hair to her waist, straight bangs, white
short-sleeve school shirt, navy-blue plaid pleated skirt, black knee socks,
black loafers) standing beside an orange tabby cat (darker stripes, white chest
patch, four white paws, green eyes, dry fluffy fur) sitting at her feet, both
facing a small convenience store with a clean white-and-aqua facade. Characters
in crisp cel-style flat color with one shadow layer; outlines warm brown on the
lit side, muted purple on the shadow side. Composition: 16:9 landscape, full
body visible, eye-level view, cheerful quiet street, green plants (#58A05C).
Avoid: grain, noise, paper texture, halftone, airbrush, blur, smooth gradients,
photorealism, 3D render, lens flare, glow effects, Makoto Shinkai style, text,
captions, logos, watermark, signature.
并把成品 PNG 保存到 $OUT/sunprint_v1.png。"

echo "== gen sunprint_v1"
codex exec "$PROMPT" $FLAGS > tmp/day1_sunprint_v1.log 2>&1
if [ -s "$OUT/sunprint_v1.png" ]; then echo "== ok sunprint_v1"; else echo "== MISSING (see tmp/day1_sunprint_v1.log)"; fi
