#!/bin/bash
# Regenerate the frame_06 back-view walk A/B pair per dula-skills/walk-director
# prompt playbook (keyframe-walk-shots.md): viewer-perspective leg spec,
# equal-stride opposite contact phases, feet separation >= one shoe width,
# upper body locked, ground shadow follows the feet.
# Target: replace the weak v6 pair (phase difference too small to read).
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

gen() { # name prompt refs...
  local name="$1" prompt="$2"; shift 2
  echo "== gen $name"
  local log="tmp/gen_$name.log"
  codex exec "$prompt $LOCK $AVOID 并把成品 PNG 保存到 $OUT/${name}.png。" $FLAGS "$@" > "$log" 2>&1
  if [ -s "$OUT/$name.png" ]; then echo "== ok $name"; else echo "== MISSING $name (see $log)"; fi
}

# Cel A: far foot planted screen-left, near foot planted screen-right.
# frame_06 = composition + character lock ONLY.
gen frame_06_walk_contact_a_full-v7 "Use case: walk-cycle cel A (grounded
contact phase) for a 2-cel walking loop, back view. Edit image 1: keep the
composition, camera framing, background, lighting, and the girl's upper body,
arms, head, hair and clothing exactly unchanged; redraw ONLY her legs and feet
into a grounded walking contact phase. 从观察者视角逐字要求：远侧脚（画面上
方、离便利店近的那只）全脚掌落在画面左侧，近侧脚（画面下方、离镜头近的
那只）全脚掌落在画面右侧；两脚心横向至少分开约一只鞋的宽度；双脚都落地，
鞋底贴地不抬起，鞋尖朝向道路前方（远离镜头），鞋轴沿道路透视；步幅左右
对称；上半身、手臂、头发完全保持原样。她投在路面上的影子的脚部轮廓要跟
随新的触地脚位置一起变化。Output the same pixel dimensions as image 1." \
  -i "$SRC/keyframes/frame_06.png"

# Cel B: exact opposite phase. Cel A (once accepted) is the leg reference;
# frame_06 stays the composition lock.
gen frame_06_walk_contact_b_full-v7 "Use case: walk-cycle cel B, the exact
opposite grounded contact phase of image 2, for a 2-cel walking loop. Use
image 1 for composition, background, lighting and the girl's upper body (keep
them exactly unchanged); redraw ONLY her legs and feet into the opposite
contact phase of image 2. 从观察者视角逐字要求：与图 2 完全镜像换脚——远侧
脚全脚掌落在画面右侧，近侧脚全脚掌落在画面左侧；两脚心横向至少分开约一
只鞋的宽度；双脚都落地，鞋底贴地不抬起，鞋尖朝向道路前方，鞋轴沿道路透
视；步幅与图 2 等幅；落脚点前后位置与图 2 相同，仅左右互换；上半身完全
保持原样。路面影子的脚部轮廓跟随新的触地脚位置。Output the same pixel
dimensions as image 1." \
  -i "$SRC/keyframes/frame_06.png" -i "$OUT/frame_06_walk_contact_a_full-v7.png"

echo "== done"
