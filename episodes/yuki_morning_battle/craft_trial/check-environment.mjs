import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EnvironmentMotion,parseEnvironmentStory} from './environment-motion.js';

const root=new URL('./',import.meta.url);
const cues=parseEnvironmentStory(fs.readFileSync(new URL('environment.story',root),'utf8'),Infinity);
const duration=Math.max(...cues.map(c=>c.end));
const motion=new EnvironmentMotion(cues,duration),samples=[];
let minSpeed=Infinity,maxSpeed=0;
for(let i=0;i<duration*120;i++){
  const t=i/120,speed=(motion.distance(t+1/120)-motion.distance(t))*120;
  assert.ok(Number.isFinite(speed)&&speed>0,'Decaying wind must not reverse a drifting leaf');
  minSpeed=Math.min(minSpeed,speed);maxSpeed=Math.max(maxSpeed,speed);
  if(i%12===0)samples.push({t,wind:motion.wind(t),distance:motion.distance(t)});
}
assert.ok(maxSpeed/minSpeed>2,'Inspection must show a clear change in drift speed');
for(const cue of cues.filter(c=>c.kind==='birds'))for(let id=0;id<cue.count;id++){
  let previous;
  for(let i=0;i<=duration*60;i++){
    const b=motion.bird(cue,id,i/60);
    assert.ok(Number.isFinite(b.x+b.y+b.z+b.wing));
    if(previous&&b.visible&&previous.visible)assert.ok((b.x-previous.x)*cue.direction>=0,'Flock reversed on its flight path');
    previous=b;
  }
}
for(const expected of [...samples].reverse()){
  assert.equal(motion.distance(expected.t),expected.distance);assert.equal(motion.wind(expected.t),expected.wind);
}
fs.mkdirSync(new URL('storyboard/',root),{recursive:true});
fs.writeFileSync(new URL('storyboard/environment_motion_validation.json',root),JSON.stringify({minSpeed,maxSpeed,speedRatio:maxSpeed/minSpeed,samples},null,2));
console.log(JSON.stringify({minSpeed,maxSpeed,speedRatio:maxSpeed/minSpeed,birdsMonotonic:true,seekStable:true}));
