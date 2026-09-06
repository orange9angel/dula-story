#!/bin/bash
# E06-live OmniHuman 8 shots (Boy 3 / Girl 5), 720p.
# Idempotent: existing non-empty mp4 skipped. 50430 -> wait 300s, retry x3.
# Requires .env.cv. Upload via tos_upload.py (fresh pre-signed URLs each run).
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live"
PY="D:/opensource/movie/dula-story/.venv/Scripts/python.exe"
A="D:/opensource/movie/dula-story/episodes/cat_leads_e06_cat_model_live/assets"
mkdir -p "$A/omni" tmp

upload() { # localpath key -> url
  "$PY" tools/tos_upload.py --file "$1" --key "$2" | tail -1
}

omni() { # name base_png audio_wav prompt
  local name="$1" base="$2" aud="$3" prompt="$4"
  if [ -s "$A/omni/$name.mp4" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== omni $name"
  local img_url aud_url attempt
  img_url=$(upload "$A/frames/$base" "e06live_$base")
  aud_url=$(upload "$A/audio/$aud" "e06live_$aud")
  for attempt in 1 2 3; do
    if "$PY" tools/omnihuman_gen.py --image "$img_url" --audio "$aud_url" \
        --prompt "$prompt" --resolution 720 --out "$A/omni/$name.mp4" \
        > "tmp/omni_$name.log" 2>&1 && [ -s "$A/omni/$name.mp4" ]; then
      echo "== ok $name"; return 0
    fi
    if grep -q 50430 "tmp/omni_$name.log" && [ "$attempt" -lt 3 ]; then
      echo "== $name 50430, wait 300s (attempt $attempt)"; sleep 300; continue
    fi
    echo "== FAILED $name (see tmp/omni_$name.log)"; return 1
  done
}

omni omni_boy_01 omni_boy_01.png boy1_bright_omni.wav "少年正脸近景，保持姿势和位置完全不动，只有嘴部随说话开合；表情明亮温和带浅笑，视线略向画面右下方。画面里只有少年一个人。"
omni omni_girl_04 omni_girl_04.png girl1_gentle_omni.wav "少女正脸近景，保持姿势和位置完全不动，只有嘴部随说话开合；温柔哄劝的微笑，视线略向画面左下方。画面里只有少女一个人。"
omni omni_girl_06 omni_girl_06.png girl2_curious_omni.wav "少女正脸近景，保持姿势和位置完全不动，只有嘴部随说话开合；目光望着画面右上方，神情略带着急。画面里只有少女一个人。"
omni omni_girl_08 omni_girl_08.png girl3_amazed_omni.wav "少女正脸近景，保持姿势和位置完全不动，只有嘴部随说话开合；又惊又笑，眼睛睁大，笑容灿烂。画面里只有少女一个人。"
omni omni_boy_09 omni_boy_09.png boy2_calm_omni.wav "少年正脸近景，保持姿势和位置完全不动，只有嘴部随说话开合；无奈又宠溺的浅笑，眉毛轻挑。画面里只有少年一个人。"
omni omni_girl_11 omni_girl_11.png girl4_gentle_omni.wav "少女正脸近景，保持姿势和位置完全不动，只有嘴部随说话开合；放松开心的温柔微笑。画面里只有少女一个人。"
omni omni_boy_12 omni_boy_12.png boy3_gentle_omni.wav "少年正脸近景，保持姿势和位置完全不动，只有嘴部随说话开合；温和安静，眼神柔软。画面里只有少年一个人。"
omni omni_girl_17 omni_girl_17.png girl5_gentle_omni.wav "少女正脸近景，保持姿势和位置完全不动，只有嘴部随说话开合；神情感动柔和，眼眶微润，浅浅微笑，视线略向下方。画面里只有少女一个人。"

echo "== omni all done"
