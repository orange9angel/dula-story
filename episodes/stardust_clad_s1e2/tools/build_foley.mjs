import fs from 'node:fs';
import {poseAt,CAST} from '../duel_performance.js';
const tl=JSON.parse(fs.readFileSync(new URL('../config/timeline.json',import.meta.url)));
const entries=tl.segments.map(s=>({startTime:s.start,endTime:s.end,opts:{move:s.move,shot:s.shot}}));
const actors=Object.fromEntries(CAST.map(n=>[n,{setPose(){},setCladState(){},mesh:{position:{y:0}}}]));
const prev={},last={},cues=[];
for(let frame=0;frame<tl.duration*120;frame++){
  const t=frame/120,perf=poseAt(actors,entries,t);
  for(const name of CAST)for(const side of ['left','right']){
    const key=name+':'+side,s=perf.states[name],f=perf.poses[name].locomotion?.feet[side];
    if(s.visible&&f?.stance&&prev[key]===false&&t-(last[key]??-1)>.20){
      cues.push({id:`step-${cues.length}`,name:'boot_step',startTime:+t.toFixed(3),
        actor:name,foot:side,volume:name==='dafu'?.16:name==='yekari'?.15:.10,
        role:'event',priority:'storySfx',contact:f.contact});last[key]=t;
    }
    prev[key]=s.visible&&f?f.stance:undefined;
  }
}
fs.writeFileSync(new URL('../config/foley_contacts.json',import.meta.url),JSON.stringify({
  source:'actual locomotion stance transition at 120 Hz',storySha256:tl.source_sha256,cues},null,2));
console.log(JSON.stringify({footsteps:cues.length,duration:tl.duration}));
