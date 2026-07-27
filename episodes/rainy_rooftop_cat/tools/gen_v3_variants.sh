#!/bin/bash
# V3 variant batch: serial codex imagegen local edits for rainy_rooftop_cat.
# Each item is a strict local edit of an approved keyframe (mouth / eyes only).
# Output is salvaged from ~/.codex/generated_images/<session-id>/ ourselves —
# asking codex to save to an absolute path triggers a flaky PowerShell
# composite on this machine (Add-Type compile error), losing the file copy.
# Re-runnable: items with a non-empty output are skipped.
set -u
cd "D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat"

OUT="D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat/tmp/v3_edits"
K="D:/opensource/movie/dula-story/episodes/rainy_rooftop_cat/assets/keyframes"
GEN="$HOME/.codex/generated_images"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"
mkdir -p "$OUT"

run() {
  local name="$1" base="$2" prompt="$3"
  if [ -s "$OUT/$name.png" ]; then echo "== skip $name (exists)"; return 0; fi
  echo "== gen $name"
  local log="tmp/v3_edits_$name.log"
  codex exec "$prompt。输出与输入完全相同的尺寸（1672x941）PNG" $FLAGS -i "$base" > "$log" 2>&1
  local sid
  sid=$(grep -m1 "session id:" "$log" | awk '{print $3}')
  local src=""
  if [ -n "$sid" ] && [ -d "$GEN/$sid" ]; then
    src=$(ls -t "$GEN/$sid"/call_*.png 2>/dev/null | head -1)
  fi
  if [ -n "$src" ]; then
    cp "$src" "$OUT/$name.png"
    echo "== ok $name <- $src"
  else
    echo "== MISSING $name (session '$sid', see $log)"
  fi
}

LOCK="严格保持其余所有内容逐像素不变：构图、姿势、角色设计、服装、毛色条纹、背景、道具、雨丝、光线与色调。不要重绘整张图，只允许修改指定部位"

run frame_03_mouth_half "$K/frame_03.png" \
  "局部编辑 image 1：只把橘猫的嘴部改成微微张开（喵叫起音，下颚略开，露出一点点深色口腔），$LOCK"

run frame_03_mouth_open "$K/frame_03.png" \
  "局部编辑 image 1：只把橘猫的嘴部改成明显张开（喵叫峰值，可见深色口腔和一点舌头），$LOCK"

run frame_02_eyes_closed "$K/frame_02.png" \
  "局部编辑 image 1：只把少女的双眼改成闭合（眼皮垂下成两条弧线），$LOCK"

run frame_05_eyes_closed "$K/frame_05.png" \
  "局部编辑 image 1：只把少女的双眼改成闭合（眼皮垂下成两条弧线），$LOCK"

run frame_06_eyes_closed "$K/frame_06.png" \
  "局部编辑 image 1：只把少女的双眼改成闭合（眼皮垂下成两条弧线），$LOCK"

run frame_06_mouth_half "$K/frame_06.png" \
  "局部编辑 image 1：只把少女的嘴部改成微微张开的说话口型（双唇略开），$LOCK"

run frame_06_mouth_open "$K/frame_06.png" \
  "局部编辑 image 1：只把少女的嘴部改成张开的说话口型（嘴唇打开，可见一点口腔），$LOCK"

run frame_07_eyes_closed "$K/frame_07.png" \
  "局部编辑 image 1：只把少女的双眼改成闭合（眼皮垂下成两条弧线，保持温柔微笑），$LOCK"

run frame_09_eyes_closed "$K/frame_09.png" \
  "局部编辑 image 1：只把少女的双眼改成闭合（眼皮垂下成两条弧线，保持温柔微笑），$LOCK"

run frame_14_eyes_closed "$K/frame_14.png" \
  "局部编辑 image 1：只把少女的双眼改成闭合（眼皮垂下成两条弧线，保持开心笑容），$LOCK"

echo "== batch done"
ls -la "$OUT"
