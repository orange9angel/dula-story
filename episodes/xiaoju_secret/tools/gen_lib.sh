#!/bin/bash
# Shared codex imagegen runner for xiaoju_secret (same salvage strategy as
# rainy_rooftop_cat/tools/gen_v3_variants.sh): codex chooses its own filename,
# we grep the session id from the log and copy the newest call_*.png out of
# ~/.codex/generated_images/<session-id>/ ourselves.
# Usage: gen_run <outname> <prompt> <base1> [base2] ...
set -u
EP="D:/opensource/movie/dula-story/episodes/xiaoju_secret"
cd "$EP"
OUT="$EP/tmp/gen"
GEN="$HOME/.codex/generated_images"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"
mkdir -p "$OUT" "$EP/tmp/logs"

wait_for_files() {
  local f
  for f in "$@"; do
    if [ ! -s "$f" ]; then echo "== waiting for $f"; fi
    while [ ! -s "$f" ]; do sleep 15; done
  done
}

gen_run() {
  local name="$1" prompt="$2"; shift 2
  if [ -s "$OUT/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  # {SIZE} placeholder expands to the first reference image's exact WxH so the
  # prompt never states a wrong output size (reroll lesson from rainy ep).
  if [[ "$prompt" == *"{SIZE}"* ]]; then
    local dims
    dims=$(D:/opensource/movie/dula-story/.venv/Scripts/python.exe -c "
from PIL import Image; im = Image.open('$1'); print(f'{im.size[0]}x{im.size[1]}')")
    prompt="${prompt//\{SIZE\}/$dims}"
  fi
  echo "== gen $name"
  local log="tmp/logs/$name.log"
  local args=("$prompt" $FLAGS)
  local img
  for img in "$@"; do args+=(-i "$img"); done
  codex exec "${args[@]}" > "$log" 2>&1
  local sid
  sid=$(grep -m1 "session id:" "$log" | awk '{print $3}')
  local src=""
  if [ -n "$sid" ] && [ -d "$GEN/$sid" ]; then
    src=$(ls -t "$GEN/$sid"/call_*.png "$GEN/$sid"/exec-*.png 2>/dev/null | head -1)
  fi
  if [ -n "$src" ]; then
    cp "$src" "$OUT/$name.png"
    echo "== ok $name <- $src"
  else
    echo "== MISSING $name (session '$sid', see $log)"
    return 1
  fi
}
