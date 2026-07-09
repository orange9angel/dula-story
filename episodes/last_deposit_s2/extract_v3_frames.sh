#!/bin/bash
# Extract verification keyframes from episodes/last_deposit_s2/output/output.mp4
set -e
OUTDIR="output"
MP4="$OUTDIR/output.mp4"
VERSION="${1:-v3}"
if [ ! -f "$MP4" ]; then
  echo "ERROR: $MP4 not found"
  exit 1
fi
rm -f "$OUTDIR"/${VERSION}_*.jpg
for t in 8 22 74 98 138 150; do
  ffmpeg -y -ss "${t}" -i "$MP4" -update 1 -frames:v 1 -q:v 2 "$OUTDIR/${VERSION}_${t}s.jpg" 2>/dev/null
done
echo "${VERSION} keyframes extracted:"
ls -la "$OUTDIR"/${VERSION}_*.jpg
