// 生成 hybrid/config/art_shots.json：64 拍逐拍归类（kind/emotion/scene），并做时轴无缝校验。
// 数据源唯一：config/timeline.json（由 script.story 编译）。kind 映射是逐镜判断，新镜名未登记即失败。
// 用法：node hybrid/tools/build_shots.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TL = JSON.parse(fs.readFileSync(path.join(root, 'config/timeline.json'), 'utf8'));

// 镜名 → 画面类别（景别/内容）。多义镜名用 BEAT_OVERRIDE 按拍覆盖。
const KIND = {
  // 建立镜头（场景首次全貌）
  town_far: 'establish', palace_establish: 'establish', sunrise_wide: 'establish', workshop_wide: 'establish',
  // 极近景/道具特写
  clock_face: 'macro', moon_close: 'macro', lamp_close: 'macro', lamp_macro: 'macro', eye_macro: 'macro',
  hand_bottle: 'macro', bottle_macro: 'macro', hand_star: 'macro', offer_lamp: 'macro', tear_macro: 'macro',
  hand_petal: 'macro', locket: 'macro', clock_bell1: 'macro', moon_dim: 'macro',
  // 面部近景/特写
  girl_close: 'face_close', alder_close: 'face_close', alder_side: 'face_close', alder_shock: 'face_close',
  girl_smile: 'face_close', girl_determined: 'face_close', alder_tear: 'face_close', girl_lookback: 'face_close',
  girl_stars: 'face_close', lady_moon: 'face_close', lady_side: 'face_close', girl_frown: 'face_close',
  girl_lamp: 'face_close', girl_tears: 'face_close', girl_answer: 'face_close', alder_down: 'face_close',
  goodnight: 'face_close',
  // 双人
  two_mid: 'two_mid', two_close: 'two_close',
  // 全景/场面
  street_empty: 'wide', bottles_row: 'wide', skylight: 'wide', first_star: 'wide', stars_swarm: 'wide',
  palace_wide: 'wide', snow_to_petal: 'wide', street_bud: 'wide', windows_light: 'wide', wide: 'wide',
  // 行走/位移
  girl_enter: 'walk', tower_door: 'walk', door_open: 'walk', girl_step: 'walk',
  // 星阶
  stair_form: 'stairs', feet_step: 'stairs', climb_far: 'stairs', stair_fade: 'stairs',
  // 单人中景
  oldman_work: 'mid', lady_half: 'mid', tower_wait: 'mid', tower_reunion: 'mid', finale: 'mid', fade: 'mid',
};
// m24 workshop_wide 是工坊大全景（群星共振），不是首次建立
const BEAT_OVERRIDE = {m24: 'wide'};

const shots = TL.segments.map((s, i) => {
  const kind = BEAT_OVERRIDE[s.id] ?? KIND[s.shot];
  if (!kind) throw new Error(`未登记的镜名: ${s.id} shot=${s.shot}`);
  return {
    id: s.id, start: s.start, end: s.end, scene: s.scene, shot: s.shot, move: s.move,
    kind, type: s.kind, character: s.character ?? null,
    emotion: s.act?.emotion ?? null,
    line: !!s.line,
    cues: (s.cues ?? []).map(c => c.name),
  };
});

// 时轴无缝校验：64 拍、m01..m64 顺序、首尾衔接、覆盖 [0, duration]
if (shots.length !== 64) throw new Error(`拍数 ${shots.length} !== 64`);
shots.forEach((s, i) => {
  if (s.id !== `m${String(i + 1).padStart(2, '0')}`) throw new Error(`第 ${i + 1} 拍 id=${s.id} 断序`);
  if (s.end <= s.start) throw new Error(`${s.id} 时长非正`);
  if (i && s.start !== shots[i - 1].end) throw new Error(`${s.id} 与上一拍不连续: ${shots[i - 1].end} -> ${s.start}`);
});
if (shots[0].start !== 0 || shots.at(-1).end !== TL.duration)
  throw new Error(`首尾未覆盖全片: ${shots[0].start}..${shots.at(-1).end} vs duration=${TL.duration}`);

const out = {
  schema: 'cel-cinema-shots-v1', episode: 'borrowed_moonlight', duration: TL.duration, fps: 30,
  kinds: [...new Set(shots.map(s => s.kind))].sort(),
  shots,
};
const file = path.join(root, 'hybrid/config/art_shots.json');
fs.mkdirSync(path.dirname(file), {recursive: true});
fs.writeFileSync(file, JSON.stringify(out, null, 1));
const byKind = {};
for (const s of shots) byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
console.log(`art_shots.json: ${shots.length} 拍, 时轴无缝 0..${TL.duration}s`);
console.log('kind 分布:', JSON.stringify(byKind));
