#!/bin/bash
# Day 1: style test sheet — 3 palette variants of the same composition.
# Pick one as assets/style_master.png afterwards (see STYLE_BIBLE.md).
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store"
mkdir -p assets/style_tests tmp

OUT="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets/style_tests"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

COMP="Use case: style test frame for an animated short. Night scene at a small
Japanese convenience store entrance: warm amber light spilling from the glass
automatic door onto the sidewalk. A 16-year-old girl (slim, large amber eyes,
long straight deep-blue hair to her waist, straight bangs, white short-sleeve
school shirt, navy-blue plaid pleated skirt, black knee socks, black loafers)
stands beside an orange tabby cat (darker stripes, white chest patch, four
white paws, green eyes, dry fluffy fur) sitting at her feet; both face the
store door. Composition: 16:9 landscape, full body visible, eye-level view,
deep indigo night sky and quiet street around the store."

LOCK_TAIL="visible watercolor paper grain texture, slight pigment bleed at
color edges, generous off-white paper negative space (#F2EAD9) for highlights.
Flat lighting storytelling: no lens flare, no god rays, no glossy gradients.
Avoid: Makoto Shinkai style, photorealistic backgrounds, digital airbrush,
3D render, lens flare, volumetric light beams, neon cyberpunk, text, captions,
logos, watermark, signature."

run() {
  local name="$1" palette="$2"
  echo "== gen $name"
  local log="tmp/day1_$name.log"
  codex exec "$COMP Style lock: delicate watercolor picture-book illustration,
fine sepia-brown pen line art (#4A3428, never pure black), thin translucent
watercolor washes with at most two shadow layers, $palette $LOCK_TAIL
并把成品 PNG 保存到 $OUT/${name}.png。" $FLAGS > "$log" 2>&1
  if [ -s "$OUT/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

run style_vA "Night palette dominated by deep indigo blue (#1F2A3D) with warm
amber light accents (#E8B44A) covering less than 30% of the frame."

run style_vB "Night palette dominated by deep indigo blue (#1F2A3D) with warm
amber light accents (#E8B44A) covering around 40% of the frame."

run style_vC "Night palette dominated by very deep indigo blue (#16202E) with
warm amber light accents (#E8B44A) covering less than 20% of the frame."

echo "== day1 style sheet done"
