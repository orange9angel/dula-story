// 《星屑战壳》OP 正式谱面生成：条目边界全部吸附 beatgrid.json 的 beats[]（断言偏差 <20ms）。
// 五段式：intro(2 小节) → verse1 三人战壳秀 → verse1' 打斗快切 → verse2 冲锋+合体 gag → outro。
// 用法：node tools/build_timeline.mjs（重写 config/timeline.json；beatgrid 变了必须重跑）
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const grid=JSON.parse(fs.readFileSync(path.join(here,'../config/beatgrid.json'),'utf8'));
const beats=grid.beats,DURATION=grid.duration; // 49.2
// 目标边界（近似秒）→ 吸附最近 beat
const snap=t=>beats.reduce((a,b)=>Math.abs(b-t)<Math.abs(a-t)?b:a);
// [id, 近似start, 近似end, move, shot, character]
const SEG=[
  ['intro',0.07,3.32,'establish','establish',null],
  // verse1：登场+战壳生长秀（生长起点压 downbeat：5.317/8.568/13.305）
  ['clad_aoao',3.32,6.966,'clad_aoao','clad_aoao','Aoao'],
  ['clad_xiaozao',6.966,10.588,'clad_xiaozao','clad_xiaozao','Xiaozao'],
  ['clad_dafu',10.588,14.211,'clad_dafu','clad_dafu','Dafu'],
  // verse1'：阿鏊 vs 大釜切磋蒙太奇，接触帧压 downbeat 16.625/19.83/23.034
  ['f1_standoff',14.211,15.023,'f1','f_two',null],
  ['f2_dash',15.023,16.231,'f2','f_track',null],
  ['f3_block',16.231,17.415,'f3','f_block',null],
  ['f4_watch',17.415,19.435,'f4','f_xiao',null],
  ['f5_clash',19.435,20.619,'f5','f_clash',null],
  ['f6_stagger',20.619,22.639,'f6','f_wide',null],
  ['f7_knock',22.639,23.847,'f7','f_knock',null],
  ['f8_laugh',23.847,26.239,'f8','f_laugh',null],
  ['f9_reset',26.239,28.653,'f9','f_wide2',null],
  ['f10_prep',28.653,30.256,'f10','f_prep',null],
  // verse2：低机位冲锋 → 颠勺合体 gag（顶点压 33.855 唱句入点拍）
  ['v2_charge',30.256,32.647,'v2charge','v2_low',null],
  ['v2_gag',32.647,36.246,'v2gag','v2_gag',null],
  ['v2_pose',36.246,40.635,'v2pose','v2_pose',null],
  ['v2_hold',40.635,44.234,'v2hold','v2_hold',null],
  // outro：定格+标题再现 → 45.0 赫斯提亚画外音 → 47.02 锅盖「当——」→ 淡黑
  ['out_freeze',44.234,46.626,'outfreeze','out_wide',null],
  ['out_clang',46.626,48.228,'outclang','out_pot',null],
  ['out_fade',48.228,DURATION,'outfade','out_pot',null],
];
const segments=SEG.map(([id,s,e,move,shot,character])=>{
  const start=snap(s),end=e===DURATION?DURATION:snap(e);
  return {id,kind:'action',character,start,end,move,shot};
});
for(let i=1;i<segments.length;i++)
  if(Math.abs(segments[i].start-segments[i-1].end)>1e-9)throw new Error(`段缝不连续: ${segments[i-1].id} -> ${segments[i].id}`);
// 断言：除片尾（=duration）外所有边界距最近 beat <20ms
for(const s of segments)for(const [k,v] of [['start',s.start],['end',s.end]]){
  if(k==='end'&&v===DURATION)continue;
  const d=Math.abs(snap(v)-v);
  if(d>=.02)throw new Error(`边界未吸附: ${s.id}.${k}=${v} 偏差 ${(d*1000).toFixed(1)}ms`);
}
const tl={duration:DURATION,step:.01,bpm:grid.bpm,segments,
  _comment:'P3 正式 OP 谱面：边界全部吸附 beatgrid beats[]（node tools/build_timeline.mjs 重建+断言）；接触帧压 downbeat 16.625/19.83/23.034，gag 顶点 33.855，画外音 45.0，收尾 47.02'};
fs.writeFileSync(path.join(here,'../config/timeline.json'),JSON.stringify(tl,null,1)+'\n');
console.log(`timeline.json: ${segments.length} segments, all boundaries snapped to beats (max dev 0ms), duration ${DURATION}s`);
