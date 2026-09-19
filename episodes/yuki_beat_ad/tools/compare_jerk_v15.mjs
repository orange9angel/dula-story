// V15 quantitative check: jaw-trajectory jerk (mean absolute third difference,
// 10ms sampling) of the V14 stepped driver vs the V15 continuous viseme track.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createLipDriver} from '../lipsync_v13.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf-8'));
const music=read('config/music_analysis_v12.json');       // what viewer_v14 drives with
const features=read('config/vocal_features_v14.json');
const track=read('config/viseme_track_v15.json');
const chars=read('config/music_analysis_v10.json').lyric_chars; // v15 source spans

const lip14=createLipDriver(music,features);
const kf=track.keyframes,lastKf=kf[kf.length-1];
function jaw15(t){
  if(t<=kf[0].t)return kf[0].jaw;
  if(t>=lastKf.t)return lastKf.jaw;
  let lo=0,hi=kf.length-1;
  while(hi-lo>1){const m=(lo+hi)>>1;if(kf[m].t<=t)lo=m;else hi=m;}
  const a=kf[lo],b=kf[hi],u=(t-a.t)/Math.max(b.t-a.t,1e-6);
  const s=(1-Math.cos(Math.PI*u))/2;
  return a.jaw+(b.jaw-a.jaw)*s;
}

const dt=.01,n=Math.floor(music.duration/dt);
const j14=new Array(n+1),j15=new Array(n+1);
for(let i=0;i<=n;i++){const t=i*dt;j14[i]=lip14(t).jaw??0;j15[i]=jaw15(t);}

function jerk(series,i0,i1){
  let s=0,c=0;
  for(let i=Math.max(i0,0);i<=Math.min(i1,series.length-4);i++){
    s+=Math.abs(series[i+3]-3*series[i+2]+3*series[i+1]-series[i]);c++;
  }
  return c?s/c:0;
}
const all14=jerk(j14,0,n),all15=jerk(j15,0,n);
console.log(`overall jaw jerk (mean |3rd diff|, dt=10ms): v14 ${all14.toFixed(5)} -> v15 ${all15.toFixed(5)}  (${((1-all15/all14)*100).toFixed(1)}% lower)`);
console.log('long-vowel segments:');
const longs=[...chars].sort((a,b)=>(b.end-b.start)-(a.end-a.start)).slice(0,5);
for(const c of longs){
  const i0=Math.round(c.start/dt),i1=Math.round(c.end/dt);
  const a=jerk(j14,i0,i1),b=jerk(j15,i0,i1);
  console.log(`  ${c.ch} ${c.pinyin.padEnd(6)} ${c.start.toFixed(2)}-${c.end.toFixed(2)}  v14 ${a.toFixed(5)}  v15 ${b.toFixed(5)}  (${((1-b/Math.max(a,1e-9))*100).toFixed(1)}% lower)`);
}
// intermediate-value sanity: v15 jaw must take values other than 0/.5/1
const mid=j15.filter(j=>j>1e-3&&Math.abs(j-.5)>1e-3&&Math.abs(j-1)>1e-3).length;
console.log(`v15 intermediate jaw samples: ${(mid/j15.length*100).toFixed(1)}% of ${j15.length}`);
