// 离线扫描：逐帧跑 poseAt 找 twoBone 不可达目标 + 超伸僵直（腕-肩距/臂长 >.9 且
// 前臂非垂挂——S1E3 P16 reach 判据）。用法：node --import ./tools/register_loader.mjs tools/scan_reach.mjs
// 卡司=performance.js 导出的 CAST（S1E2 换卡实录：硬编码 'azu' 在无阿箸集崩掉）。
import {poseAt,CAST} from '../performance.js';
import fs from 'node:fs';
const TL=JSON.parse(fs.readFileSync(new URL('../config/timeline.json',import.meta.url)));
const entries=TL.segments.map(s=>({startTime:s.start,endTime:s.end,opts:{move:s.move,shot:s.shot}}));
const mock=()=>({setPose(){},setCladState(){},mesh:{visible:true,position:{y:0}}});
const ARM={aoao:.39,xiaozao:.36,dafu:.45,yekari:.41};
let bad=0,over=[];
for(let t=0;t<TL.duration;t+=1/120){
  const actors=Object.fromEntries(CAST.map(n=>[n,mock()]));
  let perf;
  try{perf=poseAt(actors,entries,t);}
  catch(e){bad++;if(bad<16)console.log(`t=${t.toFixed(3)} ${e.message}`);continue;}
  for(const name of CAST){
    if(perf.states[name].visible===false)continue;
    const p=perf.poses[name];
    for(const side of ['left','right']){
      const arm=p?.[side+'Arm'];if(!arm)continue;
      const dx=arm[2].x-arm[0].x,dy=arm[2].y-arm[0].y,dz=arm[2].z-arm[0].z;
      const ratio=Math.hypot(dx,dy,dz)/ARM[name];
      const fx=arm[2].x-arm[1].x,fy=arm[2].y-arm[1].y,fz=arm[2].z-arm[1].z;
      const hang=Math.acos(Math.max(-1,Math.min(1,-fy/(Math.hypot(fx,fy,fz)||1))))*180/Math.PI;
      if(ratio>.9&&hang>35)over.push(`${name}:${side}@${t.toFixed(2)} r=${ratio.toFixed(2)} hang=${hang.toFixed(0)}°`);
    }
  }
}
// 连续段合并报告
let runs=[],lastByKey=new Map();
for(const o of over){
  const [key,rest]=o.split('@'),tt=parseFloat(rest);
  const last=lastByKey.get(key);
  if(last&&last.key===key&&tt-last.t1<.05){last.t1=tt;last.r=Math.max(last.r,parseFloat(o.split('r=')[1]));}
  else {const next={key,t0:tt,t1:tt,r:parseFloat(o.split('r=')[1])};runs.push(next);lastByKey.set(key,next);}
}
for(const r of runs)console.log(`over-extended: ${r.key} ${r.t0.toFixed(2)}~${r.t1.toFixed(2)}s maxRatio=${r.r.toFixed(2)}`);
console.log(bad?`FAIL: ${bad} frames unreachable`:'all reachable',
  runs.length?`reach WARN: ${runs.length} runs`:'reach clean');
process.exit(bad?1:0);
