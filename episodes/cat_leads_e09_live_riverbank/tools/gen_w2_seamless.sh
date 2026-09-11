#!/bin/bash
# W2 experiment: 6s seamless splice test — 3x OmniHuman:
#   segA(2s silence) -> segB(2s speech) -> segC(2s silence)
# (I2V first frames with a frontal face are blocked by Ark moderation --
# V1_NOTES: InputImageSensitiveContentDetected -- so the silent segments
# also go through OmniHuman, which proved stable with a silence track in
# seg3 last week.)
#
# BASE_MODE (env, default chain):
#   chain  = segB base = segA last frame, segC base = segB last frame.
#            Perfect background continuity, BUT generation loss: measured
#            face sharpness (Laplacian var) A=41 -> B=23 -> C=21.
#   master = all three segments from the original omni_base.png.
#            Uniform gen-1 crispness; background identical by construction
#            (same input image); seam pose diffs absorbed by the xfade.
# Idempotent: existing non-empty outputs are skipped (relay discipline).
# Requires: set -a && source ../../.env.ark && source ../../.env.cv && set +a
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank"
mkdir -p assets/w2 tmp/w2

A="D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank/assets"
W="$A/w2"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
OMNI="D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank/tools/omnihuman_gen.py"
TOS="D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank/tools/tos_upload.py"
MASTER="$A/omni/omni_base.png"
STAMP="$(date +%s)"

BASE_MODE="${BASE_MODE:-chain}"
if [ "$BASE_MODE" = "master" ]; then
  SEG_B=segB_m; SEG_C=segC_m; IMG_B="$MASTER"; IMG_C="$MASTER"
  OUT="output/w2_seamless_6s_v3.mp4"
else
  SEG_B=segB; SEG_C=segC; IMG_B="$W/segA_last.png"; IMG_C="$W/segB_last.png"
  OUT="output/w2_seamless_6s_v2.mp4"
fi
echo "== BASE_MODE=$BASE_MODE ($SEG_B/$SEG_C -> $OUT)"

# ---- 0. audio: 2s speech (reuse VO2 trimmed) + 2s silence ----
if [ ! -s "$A/audio/vo_2s.wav" ]; then
  echo "== audio vo_2s.wav (trim vo2 to 2.0s)"
  ffmpeg -loglevel error -y -i "$A/audio/vo2_girl_gentle_2p5s.wav" -t 2.0 "$A/audio/vo_2s.wav"
fi
if [ ! -s "$A/audio/silence_2s.wav" ]; then
  echo "== audio silence_2s.wav"
  ffmpeg -loglevel error -y -f lavfi -i anullsrc=r=44100:cl=mono -t 2.0 "$A/audio/silence_2s.wav"
fi

omni_seg() { # name image_url audio_url prompt
  local name="$1" img="$2" aud="$3" prompt="$4"
  if [ -s "$W/$name.mp4" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== omni $name (720)"
  "$PY" "$OMNI" --image "$img" --audio "$aud" --out "$W/$name.mp4" \
    --prompt "$prompt" --resolution 720 > "tmp/w2/omni_$name.log" 2>&1
  [ -s "$W/$name.mp4" ] || { echo "== FAILED $name (see tmp/w2/omni_$name.log)"; return 1; }
  ffmpeg -loglevel error -y -ss 1.9 -i "$W/$name.mp4" -vframes 1 "$W/${name}_last.png"
  [ -s "$W/${name}_last.png" ] || { echo "== FAILED $name last-frame extract"; return 1; }
  echo "== ok $name"
}

tos_url() { # file key -> prints pre-signed URL (empty on failure)
  "$PY" "$TOS" --file "$1" --key "$2" 2>/dev/null
}

P_STILL="She holds a gentle closed-lip smile, calm and completely still except for the faintest natural breathing and a few hair strands drifting softly in the light breeze; she does not speak. Golden-hour riverbank light unchanged."
P_SPEAK="She speaks softly and gently while keeping her gaze fixed toward the right side of the frame throughout; only her lips move naturally, her head stays in the exact same position and angle as the start, no turning toward the camera, no tilting, no new elements entering the frame. Golden-hour riverbank light unchanged."

# ---- 1. segA: omni from master frame + silence ----
if [ ! -s "$W/segA.mp4" ]; then
  echo "== tos upload master + silence"
  MASTER_URL=$(tos_url "$MASTER" "w2/omni_base_${STAMP}.png")
  SIL_URL=$(tos_url "$A/audio/silence_2s.wav" "w2/silence_2s_${STAMP}.wav")
  [ -n "$MASTER_URL" ] && [ -n "$SIL_URL" ] || { echo "== FAILED tos upload (segA)"; exit 1; }
  omni_seg segA "$MASTER_URL" "$SIL_URL" "$P_STILL" || exit 1
else
  echo "== skip segA (exists)"
  [ -s "$W/segA_last.png" ] || ffmpeg -loglevel error -y -ss 1.9 -i "$W/segA.mp4" -vframes 1 "$W/segA_last.png"
fi

# ---- 2. segB: omni (base per BASE_MODE) + 2s speech ----
if [ ! -s "$W/$SEG_B.mp4" ]; then
  echo "== tos upload segB base + vo_2s"
  B_BASE_URL=$(tos_url "$IMG_B" "w2/${SEG_B}_base_${STAMP}.png")
  VO_URL=$(tos_url "$A/audio/vo_2s.wav" "w2/vo_2s_${STAMP}.wav")
  [ -n "$B_BASE_URL" ] && [ -n "$VO_URL" ] || { echo "== FAILED tos upload (segB)"; exit 1; }
  omni_seg "$SEG_B" "$B_BASE_URL" "$VO_URL" "$P_SPEAK" || exit 1
else
  echo "== skip $SEG_B (exists)"
  [ -s "$W/${SEG_B}_last.png" ] || ffmpeg -loglevel error -y -ss 1.9 -i "$W/$SEG_B.mp4" -vframes 1 "$W/${SEG_B}_last.png"
fi

# ---- 3. segC: omni (base per BASE_MODE) + silence ----
if [ ! -s "$W/$SEG_C.mp4" ]; then
  echo "== tos upload segC base + silence"
  C_BASE_URL=$(tos_url "$IMG_C" "w2/${SEG_C}_base_${STAMP}.png")
  [ -n "${SIL_URL:-}" ] || SIL_URL=$(tos_url "$A/audio/silence_2s.wav" "w2/silence_2s_${STAMP}_b.wav")
  [ -n "$C_BASE_URL" ] && [ -n "$SIL_URL" ] || { echo "== FAILED tos upload (segC)"; exit 1; }
  omni_seg "$SEG_C" "$C_BASE_URL" "$SIL_URL" "$P_STILL" || exit 1
else
  echo "== skip $SEG_C (exists)"
fi

# ---- 4. concat: native 25fps (forcing 30fps duplicates every 5th frame =
#         visible judder) + 0.16s crossfade at both seams (absorbs the
#         residual pose jump; speech starts 0.28s into segB, untouched) ----
D1=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/segA.mp4")
D2=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/$SEG_B.mp4")
OFF1=$(awk "BEGIN{printf \"%.3f\", $D1-0.16}")
OFF2=$(awk "BEGIN{printf \"%.3f\", $D1+$D2-0.32}")
echo "== concat -> $OUT (xfade offsets $OFF1 / $OFF2)"
ffmpeg -loglevel error -y \
  -i "$W/segA.mp4" -i "$W/$SEG_B.mp4" -i "$W/$SEG_C.mp4" \
  -filter_complex "\
[0:v]scale=1280:720,fps=25,format=yuv420p,setsar=1[v0];\
[1:v]scale=1280:720,fps=25,format=yuv420p,setsar=1[v1];\
[2:v]scale=1280:720,fps=25,format=yuv420p,setsar=1[v2];\
[0:a]aresample=48000,aformat=channel_layouts=stereo[a0];\
[1:a]aresample=48000,aformat=channel_layouts=stereo[a1];\
[2:a]aresample=48000,aformat=channel_layouts=stereo[a2];\
[v0][v1]xfade=transition=fade:duration=0.16:offset=${OFF1}[vx1];\
[a0][a1]acrossfade=d=0.16[ax1];\
[vx1][v2]xfade=transition=fade:duration=0.16:offset=${OFF2}[vout];\
[ax1][a2]acrossfade=d=0.16[aout]" \
  -map "[vout]" -map "[aout]" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k \
  "$OUT" || exit 1

# ---- 5. seam-check frames around both cuts ----
mkdir -p tmp/w2_accept
for t in 1.70 1.89 2.10 3.50 3.70 3.90; do
  ffmpeg -loglevel error -y -ss "$t" -i "$OUT" -vframes 1 "tmp/w2_accept/$(basename "$OUT" .mp4)_seam_${t}.jpg"
done
ffmpeg -loglevel error -i "$OUT" -vf blackdetect=d=0.1:pix_th=0.10 -an -f null - 2>&1 | grep blackdetect || echo "== no black frames"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
echo "== w2 seamless test done: $OUT"
