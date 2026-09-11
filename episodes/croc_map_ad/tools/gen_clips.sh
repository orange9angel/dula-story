#!/bin/bash
# Croc map ad demo: 2 clips. seg_sanya = plain I2V micro-motion;
# seg_harbin = Seedance 2.0 image+audio combo (talking croc, the E09-W2
# verified path). Idempotent.
# Requires: set -a && source ../../.env.ark && source ../../.env.cv && set +a
set -u
cd "D:/opensource/movie/dula-story/episodes/croc_map_ad"
K="D:/opensource/movie/dula-story/episodes/croc_map_ad/assets/frames"
V="D:/opensource/movie/dula-story/episodes/croc_map_ad/assets/i2v"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
GEN25="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/tools/gen_seedance25.py"
GENI2V="D:/opensource/movie/dula-skills/build-continuous-story-images/scripts/gen_i2v_seedance.py"
TOS="D:/opensource/movie/dula-story/episodes/cat_leads_e09_live_riverbank/tools/tos_upload.py"
STAMP="$(date +%s)"

if [ ! -s "$V/seg_sanya.mp4" ]; then
  echo "== i2v seg_sanya (4s @720p)"
  "$PY" "$GENI2V" --model doubao-seedance-2-0-260128 --out "$V/seg_sanya.mp4" \
    --first-frame "$K/city_sanya_916.png" \
    --prompt "The giant crocodile in the Hawaiian shirt stands almost still among the tiny palm trees, gently tilting his head and lifting the coconut drink slightly as if taking a sip; palm fronds sway softly, the turquoise sea sparkles, tiny tourists stroll on the beach. Subtle slow motion, fixed camera, consistent lighting, no new elements, no text, no watermark. The camera is completely fixed." \
    --duration 4 --resolution 720p --ratio adaptive > "tmp/i2v_seg_sanya.log" 2>&1
  [ -s "$V/seg_sanya.mp4" ] || { echo "== FAILED seg_sanya"; exit 1; }
  echo "== ok seg_sanya"
fi

if [ ! -s "$V/seg_harbin.mp4" ]; then
  AUD_URL=$("$PY" "$TOS" --file "assets/audio/harbin_line.mp3" --key "croc/harbin_line_${STAMP}.mp3" 2>/dev/null)
  [ -n "$AUD_URL" ] || { echo "== FAILED tos upload"; exit 1; }
  echo "== seedance 2.0 image+audio: seg_harbin talking croc (4s @720p)"
  "$PY" "$GEN25" --model doubao-seedance-2-0-260128 \
    --ref "$K/city_harbin_916.png" --audio-url "$AUD_URL" \
    --prompt "The giant crocodile in the green army coat shivers from the cold and speaks the line from the reference audio: his jaws open and close in clear sync with the speech, white breath vapor puffing out, snow falling steadily, tiny people walk past at his feet. He stays standing in the same spot, minimal body motion, no new elements. The camera is completely fixed." \
    --out "$V/seg_harbin.mp4" --duration 4 --resolution 720p --ratio adaptive \
    > "tmp/i2v_seg_harbin.log" 2>&1
  [ -s "$V/seg_harbin.mp4" ] || { echo "== FAILED seg_harbin"; exit 1; }
  echo "== ok seg_harbin"
fi
echo "== clips done"
