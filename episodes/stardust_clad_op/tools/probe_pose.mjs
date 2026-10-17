// 打印指定时刻的姿态根位置/悬空/朝向（调试机位用）
// 用法：node --import ./tools/register_loader.mjs tools/probe_pose.mjs 38.5 34.6
import {poseAt} from '../performance.js';
import fs from 'node:fs';
const TL=JSON.parse(fs.readFileSync(new URL('../config/timeline.json',import.meta.url)));
const entries=TL.segments.map(s=>({startTime:s.start,endTime:s.end,opts:{move:s.move,shot:s.shot}}));
const mock=()=>({setPose(){},setCladState(){},mesh:{visible:true,position:{y:0}}});
for(const arg of process.argv.slice(2)){
  const actors={aoao:mock(),xiaozao:mock(),dafu:mock()};
  const p=poseAt(actors,entries,Number(arg));
  console.log('t='+arg, p.phase, JSON.stringify(Object.fromEntries(Object.entries(p.states).map(([k,s])=>
    [k,[+s.rootX.toFixed(2),+s.rootZ.toFixed(2),+s.air.toFixed(2),+s.yaw.toFixed(2)]]))));
}
