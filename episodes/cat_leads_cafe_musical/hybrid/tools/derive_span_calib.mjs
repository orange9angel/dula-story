// r14-M10：从 probe 报告的渲染实测内容框（renderedHeightChecks）派生相位画显示尺度校准系数。
// 纪律：校准数据源必须是**渲染结果实测**（renderAt 帧色掩码内容框），不是摆放参数
//（personPx 跨相位恒定是构造使然，测不出各相位画真实内容边距差异——M10 盲区教训）。
//
// 用法：
//   node hybrid/tools/derive_span_calib.mjs            # dry-run：只打印，不写文件
//   node hybrid/tools/derive_span_calib.mjs --apply    # 写入 cel_slots.json（turnKeys.*.spanCorr）
//
// 系数语义：spanCorr = 角色均值 / 该相位实测跨距；art_pass frozenPlacement 把它乘进显示尺度 s，
// 鞋底锚定不受影响（contentBottom 行恒落 groundY）。
// 注意：发顶-鞋底跨距含发型内容（back_open 头发上扬 +9% 是画法内容不是尺度错误）；
// 应用前逐相位核对 renderedHeightChecks 的 top/bottom 与验证帧，别把发量差异当尺度修。
import fs from 'node:fs';
import path from 'node:path';

const EP = path.resolve(process.cwd());
const report = JSON.parse(fs.readFileSync(path.join(EP, 'hybrid/storyboard/pilot/motion_check.json'), 'utf8'));
const slotsPath = path.join(EP, 'hybrid/config/cel_slots.json');
const slots = JSON.parse(fs.readFileSync(slotsPath, 'utf8'));

const apply = process.argv.includes('--apply');
const byActor = {Girl: {}, Boy: {}};
for(const c of report.renderedHeightChecks ?? []){
  if(!c.spanPx) continue;  // 跳过汇总行
  byActor[c.actor][c.cel] = {spanPx: c.spanPx, t: c.t, top: c.top, bottom: c.bottom};
}
const out = {};
for(const [actor, cels] of Object.entries(byActor)){
  const arr = Object.values(cels);
  if(!arr.length) continue;
  const mean = arr.reduce((a, b) => a + b.spanPx, 0) / arr.length;
  out[actor] = {meanPx: +mean.toFixed(1), cels: {}};
  for(const [cel, m] of Object.entries(cels))
    out[actor].cels[cel] = {...m, spanCorr: +(mean / m.spanPx).toFixed(4)};
}
console.log(JSON.stringify(out, null, 1));
if(!apply){ console.log('dry-run（--apply 才写 cel_slots.json）'); process.exit(0); }
for(const [actor, g] of Object.entries(out)){
  const tk = slots.actors[actor].turnKeys;
  for(const [cel, m] of Object.entries(g.cels)){
    if(!tk[cel]) throw Error(`turnKeys missing ${actor}.${cel}`);
    tk[cel].spanCorr = m.spanCorr;
    tk[cel].spanMeasuredPx = m.spanPx;
    tk[cel].spanMeasuredNote = 'r14-M10 renderAt(noSubtitle) 色掩码实测发顶-鞋底；derive_span_calib.mjs';
  }
}
fs.writeFileSync(slotsPath, JSON.stringify(slots, null, 2));
console.log('cel_slots.json updated: spanCorr written for', Object.keys(out).join('/'));
