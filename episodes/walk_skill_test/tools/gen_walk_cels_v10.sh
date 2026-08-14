#!/bin/bash
# v10: merge all lessons.
# - pose spec from v8 (accepted): narrow centerline stance, depth offset,
#   trailing heel lift (push-off), small girlish stride.
# - torso/hip/skirt/arms/hair PIXEL-locked (v9 lesson: any hip/skirt sway
#   between cels reads as wiggling; no hip-tilt permission at all).
# - rendering fidelity lock (v8 lesson): razor-clean outlines, flat skin
#   tones, no red blotches; ground shadow keeps the base frame's flat
#   LAVENDER color (never blue).
set -u
cd "D:/opensource/movie/dula-story/episodes/walk_skill_test"
mkdir -p assets/action_inbetweens tmp

SRC="D:/opensource/movie/dula-story/episodes/cat_leads_e01_sunny_store/assets"
OUT="D:/opensource/movie/dula-story/episodes/walk_skill_test/assets/action_inbetweens"
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
razor-clean 平滑（矢量般干净，无锯齿、无笔触、无噪点、无纹理、无红晕
斑块），皮肤单色平涂加图 1 同款一层干净阴影，袜子纯黑平涂；左腿外侧
与高亮路面的交界轮廓必须干净锐利。地面影子沿用图 1 的薰衣草平色
（禁止蓝色或其它新颜色），仅形状跟随新脚位（抬起的脚跟在影子里也抬
起）。"

TORSO="胯部、裙摆、躯干、手臂、头发、头部必须与图 1 逐像素保持一致：胯
部保持水平不倾斜不摆动，裙摆形状完全不变，手臂位置和头发轮廓完全不变
——两张图之间只允许腿部（膝盖以下）和脚有差异。"

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  echo "== gen $name"
  local log="tmp/gen_$name.log"
  codex exec "$prompt $LOCK $AVOID $FIDELITY $TORSO 并把成品 PNG 保存到 $OUT/${name}.png。" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$OUT/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

gen frame_06_walk_contact_a_full-v10 "Use case: walk-cycle cel A (grounded
contact phase) for a 2-cel walking loop, back view, 少女感小步幅步态. Edit
image 1: keep the composition, camera framing, background, lighting exactly
unchanged; redraw ONLY her lower legs (below the knees) and feet into a
grounded walking contact phase. 从观察者视角逐字要求：远侧脚（画面位置偏
上的那只）向道路前方（朝便利店方向）迈出一小步，全脚掌落地承重；近侧
脚（画面位置偏下的那只）留在后方，脚跟明显抬起、只有前脚掌撑地，呈蹬
地推进姿态。两脚前后纵深错位约一只脚长；横向几乎并拢，都落在身体中线
附近，横向间距不超过半只鞋宽（自然少女感步态，不要叉开腿）；双膝接近
相碰；鞋尖朝道路前方，鞋轴沿道路透视；步幅小而轻快。Output the same
pixel dimensions as image 1." \
  -i "$SRC/keyframes/frame_06.png"

gen frame_06_walk_contact_b_full-v10 "Use case: walk-cycle cel B, the exact
opposite grounded contact phase of image 2, for a 2-cel walking loop, back
view, 少女感小步幅步态. Use image 1 for composition, background and lighting
(keep exactly unchanged); redraw ONLY her lower legs (below the knees) and
feet into the opposite contact phase of image 2. 从观察者视角逐字要求：与图
2 完全换脚——图 2 中在后方蹬地的那只脚向前（朝便利店方向）迈出一小步、
全脚掌落地承重；图 2 中在前承重的那只脚换到后方，脚跟明显抬起、前脚掌
撑地。步幅与图 2 等幅；前后纵深错位同样约一只脚长；横向几乎并拢，都落
在身体中线附近，横向间距不超过半只鞋宽（不要叉开腿）；双膝接近相碰；
鞋尖朝道路前方，鞋轴沿道路透视。Output the same pixel dimensions as
image 1." \
  -i "$SRC/keyframes/frame_06.png" -i "$OUT/frame_06_walk_contact_a_full-v10.png"

echo "== done"
