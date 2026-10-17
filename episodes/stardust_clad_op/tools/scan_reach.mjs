// 离线扫描：逐帧跑 poseAt 找 twoBone 不可达目标（不启动浏览器）。
// 用法：node --import ./tools/register_loader.mjs tools/scan_reach.mjs
// （loader 把浏览器 import map 的 'three' / 'dula-assets/' 前缀映射到文件 URL——
// node_modules/dula-assets 的 exports 只开 '.'，裸子路径在 Node 下不解析）
import {poseAt} from '../performance.js';
import fs from 'node:fs';
const TL=JSON.parse(fs.readFileSync(new URL('../config/timeline.json',import.meta.url)));
const entries=TL.segments.map(s=>({startTime:s.start,endTime:s.end,opts:{move:s.move,shot:s.shot}}));
const mock=()=>({setPose(){},setCladState(){},mesh:{visible:true,position:{y:0}}});
const actors={aoao:mock(),xiaozao:mock(),dafu:mock()};
let bad=0;
for(let t=0;t<TL.duration;t+=1/120){
  try{poseAt(actors,entries,t);}
  catch(e){bad++;if(bad<8)console.log(`t=${t.toFixed(3)} ${e.message}`);}
}
console.log(bad?`FAIL: ${bad} frames unreachable`:'all reachable');
process.exit(bad?1:0);
