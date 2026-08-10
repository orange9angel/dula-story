#!/bin/bash
# Day 1 round 2: single test of the "Scratchnight" style proposal.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store"
mkdir -p assets/style_tests tmp

OUT="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets/style_tests"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

PROMPT="Use case: style-defining test frame for an animated short, in an original
illustration style called scratchnight. The entire night world is a matte deep
indigo-black coating (#141B2E) covering 70 to 80 percent of the frame, like
scratch-art paper. All warm colors -- the amber light spilling from a
convenience store's glass automatic door onto the sidewalk, a distant street
lamp, the cat's green eyes, the faint warm rim light on the girl's hair -- are
rendered as fine dense scratch-stroke hatching that reveals glowing underlayers
of amber, tangerine, cream and dusty rose beneath the dark coating. Highlights
always show visible scratch texture, never smooth gradients, never airbrush.
Subject: a 16-year-old girl (slim, large amber eyes, long straight deep-blue
hair to her waist, straight bangs, white short-sleeve school shirt, navy-blue
plaid pleated skirt, black knee socks, black loafers) standing beside an orange
tabby cat (darker stripes, white chest patch, four white paws, green eyes, dry
fluffy fur) sitting at her feet; both face the store door. Characters slightly
fuller in color than the background but still built from visible strokes; faces
simplified, expressions in a few strokes. Strict palette discipline: at most 5
colors in the whole frame. Composition: 16:9 landscape, full body visible,
eye-level view, quiet empty street around the store.
Avoid: smooth digital gradients, photorealism, 3D render, lens flare, airbrush,
cel-shaded anime look, Makoto Shinkai style, text, captions, logos, watermark,
signature.
并把成品 PNG 保存到 $OUT/scratchnight_v1.png。"

echo "== gen scratchnight_v1"
codex exec "$PROMPT" $FLAGS > tmp/day1_scratchnight_v1.log 2>&1
if [ -s "$OUT/scratchnight_v1.png" ]; then echo "== ok scratchnight_v1"; else echo "== MISSING (see tmp/day1_scratchnight_v1.log)"; fi
