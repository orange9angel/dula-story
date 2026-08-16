#!/bin/bash
# Lane V1: girl mouth variants (half + open) for xiaoju_secret.
set -u
source "D:/opensource/movie/dula-story/episodes/xiaoju_secret/tools/gen_lib.sh"
T="tmp/gen"

LOCK="严格保持其余所有内容逐像素不变：构图、姿势、角色设计、服装、发型、背景、道具、光线与色调。不要重绘整张图，只允许修改嘴部。输出与输入完全相同的尺寸（{SIZE}）PNG"
HALF="局部编辑 image 1：只把少女的嘴部改成微微张开（说话起音，下颚略开，露出一点点深色口腔），$LOCK"
OPEN="局部编辑 image 1：只把少女的嘴部改成明显张开（发「啊」音的开口度，下颚自然下降，可见深色口腔内部），$LOCK"

for f in 05 16 23 28 32 34 39; do
  wait_for_files "$T/frame_${f}.png"
  gen_run "frame_${f}_mouth_half" "$HALF" "$T/frame_${f}.png"
  gen_run "frame_${f}_mouth_open" "$OPEN" "$T/frame_${f}.png"
done

echo "LANE V1 DONE"
