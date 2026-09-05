#!/bin/bash
# E04 mouth/eye variants: ALL via codex local edit (the only passing craft —
# E02 V2-V4 verdict: qwen/wanx/procedural all failed on paste-back cels).
# Girl mouths x5 (half+open), cat speech mouths x3 (half+open),
# girl blinks x8, cat blinks x3. Run after all keyframes exist.
set -u
cd "D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night"
mkdir -p assets/mouth_variants assets/eye_variants tmp

A="D:/opensource/movie/dula-story/episodes/cat_leads_e04_firefly_night/assets"
K="$A/keyframes"
MV="$A/mouth_variants"
EV="$A/eye_variants"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

EDIT_LOCK="严格保持其余所有内容逐像素不变：构图、姿势、服装、背景、光影、画布尺寸。这是对原图的局部像素级编辑，不要整体重渲染，只允许修改指定区域"

mouth() { # who base variant desc
  local who="$1" base="$2" variant="$3" desc="$4"
  if [ -s "$MV/${base}_${variant}.png" ]; then echo "== skip ${base}_${variant} (exists)"; return; fi
  echo "== gen mouth ${base}_${variant}"
  codex exec "局部编辑 image 1：只把${who}的嘴部改成${desc}，$EDIT_LOCK。并把成品 PNG 保存到 $MV/${base}_${variant}.png。" $FLAGS -i "$K/${base}.png" > "tmp/mouth_${base}_${variant}.log" 2>&1
  if [ -s "$MV/${base}_${variant}.png" ]; then echo "== ok ${base}_${variant}"; else echo "== MISSING ${base}_${variant}"; fi
}

eyes() { # base who extra
  local base="$1" who="$2" extra="${3:-}"
  if [ -s "$EV/${base}_closed.png" ]; then echo "== skip ${base}_closed (exists)"; return; fi
  echo "== gen eyes ${base}_closed"
  codex exec "局部编辑 image 1：只把${who}的双眼改成闭合（眼皮垂下成两条极细、浅色的短弧线，不要粗黑厚眼线${extra}），$EDIT_LOCK。并把成品 PNG 保存到 $EV/${base}_closed.png。" $FLAGS -i "$K/${base}.png" > "tmp/eyes_${base}.log" 2>&1
  if [ -s "$EV/${base}_closed.png" ]; then echo "== ok ${base}_closed"; else echo "== MISSING ${base}_closed"; fi
}

# Girl monologue mouths (entries 3/8/11/16/20)
for f in frame_01 frame_04 frame_06 frame_11 frame_16; do
  mouth "少女" "$f" half "微张（half-open，唇间露出一点口腔）"
  mouth "少女" "$f" open "自然张开（说话时的开口，露出一点口腔和牙齿）"
done

# Cat speech mouths (entries 5/13/18；同一 rig 也服务猫叫 SFX 条目 4/12/17)
for f in frame_02 frame_08 frame_12; do
  mouth "橘猫" "$f" half "微张（猫说话起音，吻部小幅打开，尺寸克制）"
  mouth "橘猫" "$f" open "自然张开（猫说话的开口，露出一点口腔，尺寸克制不要夸张）"
done

# Girl blinks
for f in frame_01 frame_03 frame_04 frame_06 frame_11 frame_13 frame_14 frame_16; do
  eyes "$f" "少女"
done

# Cat blinks
for f in frame_02 frame_08 frame_12; do
  eyes "$f" "橘猫"
done

echo "== variants done"
