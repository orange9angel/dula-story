#!/bin/bash
# W2-cat experiment: can Seedance audio-driven reference do TALKING CAT?
# Cat is NOT behind the human-face moderation wall, so reference_image (cat
# photo) + reference_audio (TTS line) combo works on plain Seedance 2.0
# (docs 82379/2607688: 2.0 supports 图片+音频 combo; no 2.5 balance gate).
# Never verified before -- E06 animal speech went DreamActor (sync 4/5).
# Idempotent. Requires: set -a && source ../../.env.ark && source ../../.env.cv && set +a
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank"
mkdir -p assets/w2 tmp/w2

E="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live"
W="D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank/assets/w2"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
GEN="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/tools/gen_seedance25.py"
TOS="D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank/tools/tos_upload.py"
CAT="$E/assets/refs/cat_pose_ref.png"        # photoreal orange tabby, frontal
AUD="$E/assets/audio/girl1_gentle.mp3"       # 2.448s speech line
OUT="$W/cat_speech_seedance2.mp4"
STAMP="$(date +%s)"

if [ -s "$OUT" ]; then echo "== skip (exists)"; exit 0; fi
AUD_URL=$("$PY" "$TOS" --file "$AUD" --key "w2cat/girl1_gentle_${STAMP}.mp3" 2>/dev/null)
[ -n "$AUD_URL" ] || { echo "== FAILED tos upload"; exit 1; }

echo "== seedance 2.0 image+audio combo: talking cat (4s @720p)"
"$PY" "$GEN" --model doubao-seedance-2-0-260128 \
  --ref "$CAT" --audio-url "$AUD_URL" \
  --prompt "The orange tabby cat sits on the stone slab and speaks the line from the reference audio: its mouth opens and closes in clear sync with the speech, jaw and lips moving like a talking cat, whiskers and ears steady, eyes calm and looking toward the camera. The cat stays seated the whole time, no walking, no standing up, no new elements entering the frame. Gentle breeze in the grass and leaves, soft daylight unchanged. The camera is completely fixed." \
  --out "$OUT" --duration 4 --resolution 720p --ratio adaptive \
  > "tmp/w2/cat_speech_seedance2.log" 2>&1
[ -s "$OUT" ] || { echo "== FAILED (see tmp/w2/cat_speech_seedance2.log)"; exit 1; }
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
echo "== done: $OUT"
