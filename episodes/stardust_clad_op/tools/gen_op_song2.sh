#!/bin/bash
# OP 主题歌第二轮：v4.3 + Magnificent/Epic + 铜管/鼓/吉他，枚举失败自动降级
set -u
cd "$(dirname "$0")/../../.."
PY=.venv/Scripts/python.exe
GEN=episodes/yuki_beat_ad/tools/song_gen.py
LYR=episodes/stardust_clad_op/config/op_lyrics.txt
OUTDIR=episodes/stardust_clad_op/assets/audio/music
BASE="--via-relay --lyrics-file $LYR --model-version v4.3 --genre Rock --mood Magnificent/Epic --gender Male --tempo Vivace --duration 30 --format wav --timeout 560"
INST="Drums,Electric_Guitar,Brass"
INST_OK=1
for i in 4 5 6; do
  if [ "$INST_OK" = "1" ]; then
    if $PY $GEN $BASE --instrument "$INST" --out $OUTDIR/op_song_c$i.wav; then
      continue
    fi
    echo "[gen2] instrument rejected, fallback no-instrument"
    INST_OK=0
  fi
  $PY $GEN $BASE --out $OUTDIR/op_song_c$i.wav || echo "[gen2] candidate $i FAILED"
done
ls -la $OUTDIR/
