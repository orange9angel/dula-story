#!/bin/bash
# v12: re-roll the passing cel with the SUPPORT FOOT ANCHORED pixel-exactly.
# v11 diagnosis: the calf-area jitter came from the planted foot teleporting
# ~10px between cels (support-foot zone differed 10.8% A vs P). Anchor it.
set -u
cd "D:/opensource/movie/dula-story/episodes/walk_skill_test"
mkdir -p assets/action_inbetweens tmp

SRC="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets"
OUT="D:/opensource/movie/dula-story/episodes/walk_skill_test/assets/action_inbetweens"
V10A="$OUT/frame_06_walk_contact_a_full-v10.png"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"sunprint\" -- bright sunny-day
scene rendered as razor-clean flat color shapes, like a high-definition retro
silkscreen poster with zero texture. Sky: deep clear cyan blue (#2E9BD6) at
the top softening into light aqua (#7FD4E8) near the horizon through ONE wide
soft smooth transition band -- no steps, no stripes; this sky transition is
the only soft gradient allowed in the entire image. Clouds: hard-edged rounded
bubble shapes, pure white (#FDFBF4) with a single flat lavender shadow tone
(#8E7CC3). Shadows everywhere use complementary colors (lavender, teal-green),
never black or grey. Sunlight is rendered as flat geometric shapes (diagonal
light bands, round dappled light spots) in flat gold (#F5B942), never glow,
never haze. Characters in crisp cel-style flat color with one shadow layer;
outlines warm brown on the lit side, muted purple on the shadow side.
Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone,
airbrush, blur, photorealism, 3D render, lens flare, glow effects,
Makoto Shinkai style, text, captions, logos, watermark, signature."

AVOID="Avoid: extra people or cats, duplicate limbs, malformed hands, text,
watermark, photorealism, 3D render."

FIDELITY="重绘区域渲染精度必须与图 1 完全一致：腿部皮肤和袜子轮廓
razor-clean 平滑（无锯齿、无笔触、无噪点、无红晕斑块），皮肤单色平涂加
图 1 同款一层干净阴影，袜子纯黑平涂。地面影子沿用图 1 的薰衣草平色
（禁止蓝色或其它新颜色），仅形状跟随新脚位。"

TORSO="胯部、裙摆、躯干、手臂、头发、头部必须与图 1 逐像素保持一致——
两张图之间只允许腿部（膝盖以下）和脚有差异。"

ANCHOR="锚定要求（最高优先级）：图 2 中在前方全脚掌落地承重的那只脚
（连小腿、袜子、鞋子）必须保持与图 2 逐像素完全一致——落点、朝向、形
状、大小一概不动，它脚下的地面接触影子也保持不动。只允许那只脚跟抬起
的脚发生变化。"

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  echo "== gen $name"
  local log="tmp/gen_$name.log"
  codex exec "$prompt $LOCK $AVOID $FIDELITY $TORSO $ANCHOR 并把成品 PNG 保存到 $OUT/${name}.png。" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$OUT/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_06_walk_passing-v2 "Use case: walk-cycle passing cel for a 2-cel
walking loop (contact <-> passing), back view, 少女感小步幅步态. Image 1 is
the composition/character lock; image 2 is the contact phase — continue half
a step from it. Edit image 1: keep composition, camera framing, background,
lighting exactly unchanged; redraw ONLY the trailing heel-lifted leg of
image 2: 图 2 中在后方脚跟抬起的那只脚屈膝向前摆，从支撑腿旁经过，脚明显
离地悬空、鞋尖自然朝下，摆动中横向仍贴身体中线（不外撇）。在前承重的支
撑脚和支撑腿完全不动（见锚定要求）。Output the same pixel dimensions as
image 1." \
  -i "$SRC/keyframes/frame_06.png" -i "$V10A"

echo "== done"
