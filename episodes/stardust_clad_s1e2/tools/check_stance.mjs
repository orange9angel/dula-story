// Actual solved knees at rest and across walk-to-stop boundaries; 180 degrees = straight.
import fs from 'node:fs';
import {poseAt,CAST} from '../performance.js';
const tl=JSON.parse(fs.readFileSync(new URL('../config/timeline.json',import.meta.url)));
const entries=tl.segments.map(s=>({startTime:s.start,endTime:s.end,opts:{move:s.move,shot:s.shot}}));
const actors=Object.fromEntries(CAST.map(n=>[n,{setPose(){},setCladState(){},mesh:{position:{y:0}}}]));
const angle=leg=>{const [a,b,c]=leg,u=[a.x-b.x,a.y-b.y,a.z-b.z],v=[c.x-b.x,c.y-b.y,c.z-b.z];return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
const samples=[];
for(const t of [105,129.7,132.7,133.8,135,169.7,180,198.3,220.5,229.6,246.2,249.6,280.3,287.5,300.7,305,315]){
 const p=poseAt(actors,entries,t);
 for(const name of CAST){const s=p.states[name],b=p.poses[name];if(!s.visible)continue;
 samples.push({t,name,phase:p.phase,seated:!!(s.sit?.drop>.02),walk:!!s.walk,bob:+b.bob.toFixed(3),knees:['left','right'].map(x=>+angle(b[x+'Leg']).toFixed(1))});}
}
const stops=[];let previous={};
for(let f=0;f<tl.duration*60;f++){
 const t=f/60,p=poseAt(actors,entries,t);
 for(const n of CAST){const s=p.states[n],b=p.poses[n],prev=previous[n];
  if(prev?.walk&&!s.walk&&s.visible&&!s.sit?.drop){
   stops.push({t:+t.toFixed(3),name:n,knees:['left','right'].map(x=>+angle(b[x+'Leg']).toFixed(1)),hipJumpMm:+((b.leftLeg[0].y-prev.pose.leftLeg[0].y)*1000).toFixed(1)});}
  previous[n]={walk:!!s.walk,pose:b};
 }
}
const out={samples,stops};
fs.mkdirSync(new URL('../storyboard/stance_review/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../storyboard/stance_review/stance_report.json',import.meta.url),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,1));
