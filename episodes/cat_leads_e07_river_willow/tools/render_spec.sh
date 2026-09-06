#!/bin/bash
# render_spec.sh -- generation resolution tier loader (source me, don't exec).
# Reads config/render_spec.json, exports GEN_TIER / IMG_W / IMG_H / I2V_RES
# according to generation_tier, and defines normalize_img(). Source this
# BEFORE cd in the caller; all paths resolve from this file's location.
[ -n "${RENDER_SPEC_LOADED:-}" ] && return 0
RENDER_SPEC_LOADED=1

_RS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_RS_PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
[ -x "$_RS_PY" ] || _RS_PY=python

eval "$("$_RS_PY" - "$_RS_DIR/../config/render_spec.json" <<'EOF'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    spec = json.load(f)
tier = spec["generation_tier"]
t = spec["tiers"][tier]
print(f'export GEN_TIER="{tier}"')
print(f'export IMG_W="{t["image_width"]}"')
print(f'export IMG_H="{t["image_height"]}"')
print(f'export I2V_RES="{t["i2v_resolution"]}"')
EOF
)"

normalize_img() { # png_path -- in-place lanczos resize when off the tier size
  local png="$1" dims tmp
  dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$png")
  if [ "$dims" != "${IMG_W},${IMG_H}" ]; then
    tmp="${png%.png}.norm_tmp.png"
    ffmpeg -loglevel error -y -i "$png" \
      -vf "scale=${IMG_W}:${IMG_H}:flags=lanczos" "$tmp" && mv -f "$tmp" "$png"
    echo "== normalize $(basename "$png") (${dims} -> ${IMG_W}x${IMG_H})"
  fi
}
