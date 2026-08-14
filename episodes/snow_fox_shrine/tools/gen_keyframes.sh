#!/bin/bash
# Generate the 18 keyframes for snow_fox_shrine. Requires style_master.png,
# tsumugi_reference.png, fox_reference.png from gen_refs.sh.
# Sequential rolls; each saves directly into assets/keyframes/.
set -u
cd "D:/opensource/movie/dula-story/episodes/snow_fox_shrine"
mkdir -p tmp

A="D:/opensource/movie/dula-story/episodes/snow_fox_shrine/assets"
K="$A/keyframes"
FLAGS="--skip-git-repo-check --ephemeral -s workspace-write"

LOCK="Style lock: original illustration style \"yukie\" -- a serene winter
night scene rendered as razor-clean flat color shapes, like a Japanese
shin-hanga woodblock print with zero texture. Sky: deep indigo (#1B2A4E) at
the top softening into muted slate blue (#4A6094) near the horizon through
ONE wide soft smooth transition band -- no steps, no stripes; this sky
transition is the only soft gradient allowed in the entire image. Snow: flat
hard-edged shapes, pure snow white (#F4F7FC) with a single flat periwinkle
shadow tone (#93A4CC). Shrine woodwork: flat vermilion (#C8402A) with a
single flat plum shadow tone (#7E3049). Night shadows are deep indigo
(#232F52), never black or grey. Lantern light: flat warm amber (#F2B45A)
geometric shapes, never glow, never haze. Characters in crisp cel-style flat
color with one shadow layer; outlines warm dark brown on the lit side, muted
indigo on the shadow side.
Avoid: stepped or striped sky, banding, grain, noise, paper texture,
halftone, airbrush, blur, photorealism, 3D render, lens flare, glow effects,
Makoto Shinkai style, text, captions, logos, watermark, signature."

GIRL="The girl Tsumugi: 10-year-old, short dark-brown bob hair, round cream
knitted earmuffs, thick cream scarf wrapped high, vermilion red coat, dark
grey mittens, brown snow boots."
FOX="The fox cub: small, orange-red fur, cream chest and cheeks, white tail
tip, big triangular ears, dark amber eyes."
SHRINE="The shrine approach from the reference: vermilion torii gate,
snow-covered stone steps, two stone lanterns with warm amber light, tiny
wooden shrine with offering box under an eave, deep indigo night sky, flat
snow shapes."

gen () { # $1=outfile $2=logname $3...=prompt, then -i refs at end via GENREFS
  local out="$1"; shift
  local log="$1"; shift
  local prompt="$1"; shift
  echo "== gen $out"
  codex exec "$prompt 并把成品 PNG 保存到 $K/$out。" $FLAGS "$@" > "tmp/$log.log" 2>&1
  [ -s "$K/$out" ] && echo "== ok $out" || echo "== MISSING $out (see tmp/$log.log)"
}

gen frame_00.png frame_00 "Use case: keyframe. Exact recreation of the
reference scene, same wide composition: the snowy shrine approach at night,
no people, no animals. $SHRINE Composition: 16:9 landscape. $LOCK
Avoid: people, animals, footprints, text, watermark." -i "$A/style_master.png"

gen frame_01.png frame_01 "Use case: keyframe. Side view of the shrine stone
steps at night: $GIRL She walks up the snow-covered steps in profile facing
right, mid-stride, holding a folded paper shopping bag in her right hand, a
small white breath puff at her mouth. Stone lantern with amber light at the
top of the steps. $LOCK Composition: 16:9 landscape, girl on the left third,
steps rising to the right.
Avoid: extra people, animals, text, watermark." -i "$A/style_master.png" -i "$A/tsumugi_reference.png"

gen frame_02.png frame_02 "Use case: keyframe. Medium shot: $GIRL She has
stopped at the top of the steps, body three-quarter facing right, head turned
looking down toward the lower right corner of the frame (she noticed
something), paper bag in her right hand, small breath puff. Shrine eave and
vermilion pillar behind her, snow falling. $LOCK Composition: 16:9 landscape,
girl center-left.
Avoid: extra people, animals, text, watermark." -i "$A/style_master.png" -i "$A/tsumugi_reference.png"

gen frame_03.png frame_03 "Use case: keyframe. Wide shot of the wooden shrine
offering box under the eave at night: beside it, $FOX curled into a tight
shivering ball on the snow, tail wrapped over its paws, ears flat. Stone
lantern amber light from the left, vermilion offering box edge. $LOCK
Composition: 16:9 landscape, offering box center-right, fox at its base.
Avoid: people, extra animals, text, watermark." -i "$A/style_master.png" -i "$A/fox_reference.png"

gen frame_04.png frame_04 "Use case: keyframe. Close-up: $FOX The curled fox
cub has just lifted its head, ears half-raised, eyes open and alert, cheeks
and whiskers crisp; its body is still curled on the snow with the tail over
the paws. Amber lantern light shapes on its fur from the left. $LOCK
Composition: 16:9 landscape, fox head center.
Avoid: people, extra animals, extra tails, text, watermark." -i "$A/fox_reference.png" -i "$K/frame_03.png"

gen frame_05.png frame_05 "Use case: keyframe. Medium shot: $GIRL She crouches
down low, knees bent, leaning slightly forward with a curious gentle
expression, mouth closed, eyes open, looking toward the lower right of the
frame, paper bag set down beside her boot. She is lit by warm amber lantern
light from the left. Snowy shrine ground. $LOCK Composition: 16:9 landscape,
girl center-left, empty snow space lower right where the fox sits.
Avoid: animals, extra people, text, watermark." -i "$A/tsumugi_reference.png" -i "$K/frame_02.png"

gen frame_06.png frame_06 "Use case: keyframe. Close-up of a girl's dark grey
mittened hands breaking a roasted sweet potato in half over a paper bag:
golden-orange flesh exposed with a wisp of steam, purple-brown skin. Snowy
ground and the hem of a vermilion coat at the frame edges. Warm amber lantern
light. $LOCK Composition: 16:9 landscape, hands center.
Avoid: faces, animals, extra fingers, text, watermark." -i "$A/tsumugi_reference.png"

gen frame_07.png frame_07 "Use case: keyframe. Ground-level close-up: half a
roasted sweet potato with golden flesh resting on a cream handkerchief laid
on flat snow, steam wisps rising; from the right edge a small fox cub's nose
and muzzle approach cautiously. Amber lantern light from the left. $LOCK
Composition: 16:9 landscape, potato center-left, fox muzzle at right edge.
Avoid: people, full fox body, text, watermark." -i "$A/fox_reference.png" -i "$K/frame_06.png"

gen frame_08.png frame_08 "Use case: keyframe. Close-up: $FOX The fox cub
lowers its head and nibbles the half sweet potato on the cream handkerchief
on the snow, eyes half closed in contentment, ears relaxed. Amber lantern
light from the left. $LOCK Composition: 16:9 landscape, fox head center.
Avoid: people, extra food pieces, text, watermark." -i "$A/fox_reference.png" -i "$K/frame_07.png"

gen frame_09.png frame_09 "Use case: keyframe. Medium close-up: $GIRL Still
crouching, she watches with a warm gentle closed-mouth smile, eyes open, head
tilted slightly, hands on her knees. Warm amber lantern light on her face
from the left, snowflakes in the air. $LOCK Composition: 16:9 landscape, face
upper-center.
Avoid: animals, extra people, text, watermark." -i "$A/tsumugi_reference.png" -i "$K/frame_05.png"

gen frame_10.png frame_10 "Use case: keyframe. Wide shot under the shrine
eave at night: $GIRL crouched on the left and $FOX sitting on the right with
the handkerchief between them, the stone lantern glowing amber behind them,
snow falling beyond the eave. Quiet warm tableau. $LOCK Composition: 16:9
landscape.
Avoid: extra people, extra animals, text, watermark." -i "$A/style_master.png" -i "$A/tsumugi_reference.png" -i "$A/fox_reference.png"

gen frame_11.png frame_11 "Use case: keyframe. Medium wide shot: $GIRL and
$FOX both looking up at the night sky together -- she stands with head tilted
up, the fox cub beside her boot with head up and ears perked. Deep indigo sky
with falling snow above them, eave edge at top of frame. $LOCK Composition:
16:9 landscape, pair center.
Avoid: extra people, extra animals, text, watermark." -i "$A/tsumugi_reference.png" -i "$A/fox_reference.png" -i "$K/frame_10.png"

gen frame_12.png frame_12 "Use case: keyframe. Face close-up: $GIRL Her face
tilted up toward the sky, wonderstruck gentle expression, mouth closed, eyes
open and bright, snowflakes around her face, earmuffs and scarf crisp, warm
amber light on one cheek. $LOCK Composition: 16:9 landscape, face center.
Avoid: animals, extra people, text, watermark." -i "$A/tsumugi_reference.png" -i "$K/frame_09.png"

gen frame_13.png frame_13 "Use case: keyframe. Healing close-up: $FOX The fox
cub sits upright and poised facing the viewer, tail curled neatly around its
paws, eyes open looking slightly up, cream chest bright in the amber lantern
light, a few snowflakes on its head fur. Flat snow background. $LOCK
Composition: 16:9 landscape, fox center.
Avoid: people, extra tails, text, watermark." -i "$A/fox_reference.png" -i "$K/frame_04.png"

gen frame_14.png frame_14 "Use case: keyframe. Medium shot: $GIRL She stands
upright, brushing snow off her coat hem with one mitten, looking down toward
the lower right with a fond closed-mouth smile, paper bag back in her left
hand. Amber lantern light from the left, snowy shrine ground. $LOCK
Composition: 16:9 landscape, girl center-left.
Avoid: animals, extra people, text, watermark." -i "$A/tsumugi_reference.png" -i "$K/frame_09.png"

gen frame_15.png frame_15 "Use case: keyframe. Wide shot from behind: $GIRL
walking away down the snow-covered stone steps, back to camera, paper bag in
hand, small white breath puffs; the torii gate and valley lights far below,
stone lanterns flanking the steps. $LOCK Composition: 16:9 landscape, girl
center on the steps.
Avoid: animals, extra people, text, watermark." -i "$A/style_master.png" -i "$A/tsumugi_reference.png"

gen frame_15_far.png frame_15_far "Use case: keyframe. Exact same viewpoint
and composition as the reference image of the snowy steps from behind, but
the girl has walked much farther down: she appears small, about one-third of
her height in the reference, nearing the torii gate at the bottom. Everything
else unchanged. $LOCK Composition: 16:9 landscape.
Avoid: animals, extra people, text, watermark." -i "$K/frame_15.png"

gen frame_16.png frame_16 "Use case: keyframe. Closing wide shot: the empty
snowy shrine approach at night; beside the offering box under the eave,
$FOX sits upright in silhouette-ish amber light watching the steps, tail
curled. The stone lanterns glow, snow falls, the torii and valley lights in
the distance. No people. $LOCK Composition: 16:9 landscape.
Avoid: people, extra animals, text, watermark." -i "$A/style_master.png" -i "$A/fox_reference.png"

echo "== all keyframes done"
