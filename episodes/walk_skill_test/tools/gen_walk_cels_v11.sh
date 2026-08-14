#!/bin/bash
# v11: 3-cel full step (contactA -> passing -> contactB) @2.7 cel/s.
# Fixes the v10 "edge jitter": tiny heel-flick at 3.2/s read as vibration.
# Bigger pose amplitude (passing pose like rainy_rooftop_cat's walk_alt),
# slower rate, ambient procedural layers added to the segment separately.
# Keeps all v10 locks: torso pixel-locked, razor-clean edges, lavender shadow.
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
razor-clean 平滑（矢量般干净，无锯齿、无笔触、无噪点、无纹理、无红晕
斑块），皮肤单色平涂加图 1 同款一层干净阴影，袜子纯黑平涂；腿部与高亮
路面的交界轮廓必须干净锐利。地面影子沿用图 1 的薰衣草平色（禁止蓝色
或其它新颜色），仅形状跟随新脚位（抬起的脚在影子里也抬起）。"

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

# Passing cel: continues half a step forward from v10 contact A — the
# trailing (heel-lifted) foot in image 2 swings forward past the supporting
# leg, knee bent, foot clearly off the ground, toes pointing down.
gen frame_06_walk_passing-v1 "Use case: walk-cycle passing cel for a 3-cel
walking loop (contact A -> passing -> contact B), back view, 少女感小步幅步
态. Image 1 is the composition/character lock; image 2 is contact phase A —
continue half a step forward from it. Edit image 1: keep composition, camera
framing, background, lighting exactly unchanged; redraw ONLY her lower legs
(below the knees) and feet into the passing pose. 从观察者视角逐字要求：图
2 中在后方蹬地的那只脚（脚跟抬起的那只）屈膝向前摆，从支撑腿旁经过，
脚明显离地、悬在空中，鞋尖自然朝下；另一只脚（图 2 中在前承重的）保持
全脚掌落地、腿直立支撑。摆动脚横向仍贴在身体中线附近（不要外撇）；支
撑脚的落点与图 2 完全相同。Output the same pixel dimensions as image 1." \
  -i "$SRC/keyframes/frame_06.png" -i "$V10A"

# Contact B: the opposite grounded contact of image 2 — the swinging foot
# lands a small step ahead and bears weight; the previously supporting foot
# trails behind with heel lifted (push-off). Same amplitude as image 2.
gen frame_06_walk_contact_b_full-v11 "Use case: walk-cycle cel contact B, the
opposite grounded contact phase of image 2, for a 3-cel walking loop, back
view, 少女感小步幅步态. Use image 1 for composition, background and lighting
(keep exactly unchanged); redraw ONLY her lower legs (below the knees) and
feet into the opposite contact phase of image 2. 从观察者视角逐字要求：图 2
中在后方蹬地的那只脚向前（朝便利店方向）迈出一小步落地、全脚掌承重；图
2 中在前承重的那只脚换到后方，脚跟明显抬起、前脚掌撑地呈蹬地姿态。步
幅与图 2 等幅；前后纵深错位约一只脚长；横向几乎并拢贴身体中线（不超过
半只鞋宽，不要叉开腿）；双膝接近相碰；鞋尖朝道路前方，鞋轴沿道路透视。
Output the same pixel dimensions as image 1." \
  -i "$SRC/keyframes/frame_06.png" -i "$V10A"

echo "== done"
