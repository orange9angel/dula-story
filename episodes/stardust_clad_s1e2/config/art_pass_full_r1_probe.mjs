// Content-specific assertions, run by the shared draw-over pipeline.
export function probe(){
 const dbg=window.__dbg,shots=window.shots,frames=6390,errors=[],routes=new Set(),coverage=[];
 for(const s of shots){const r=window.renderAt((s.start+s.end)/2,{encode:false});routes.add(r.state.route);coverage.push({id:s.id,start:s.start,end:s.end,kind:r.state.kind,route:r.state.route});}
 for(let i=0;i<shots.length;i++){if(i&&shots[i-1].end!==shots[i].start)errors.push('Shot gap');if(shots[i].end<=shots[i].start)errors.push('Invalid span');}
 const t=52.1,before=window.renderAt(t).image;dbg.faceDisabled=true;const noFace=window.renderAt(t).image;dbg.faceDisabled=false;dbg.hairDisabled=true;const noHair=window.renderAt(t).image;dbg.hairDisabled=false;const restored=window.renderAt(t).image;
 const motionTrials=[9.2,21.1,57.2,58.15,103.2,133.4,192.1].map(at=>{const a=window.renderAt(at).image;dbg.motionDisabled=true;const b=window.renderAt(at).image;dbg.motionDisabled=false;return{at,affectsPixels:a!==b,restores:a===window.renderAt(at).image};});
 const acting={faceChangesPixels:before!==noFace,hairChangesPixels:before!==noHair,motionChangesPixels:motionTrials.some(v=>v.affectsPixels),restoreIdentical:before===restored&&motionTrials.every(v=>v.restores)};
 if(Object.values(acting).some(v=>!v))errors.push('Acting channel did not affect pixels or restore');
 const footChecks=[];
 for(const [start,end]of [[20,26.2],[191,197.5]]){
  let previous=null,maxDrift=0,contacts=0;
  for(let i=Math.ceil(start*30);i<end*30;i++){
   const state=window.renderAt(i/30,{encode:false}).state,actor=state.bodies?.find(b=>b.feet);
   if(!actor){errors.push('Missing walk target');continue;}
   if(previous)actor.feet.forEach((f,j)=>{const p=previous[j];if(f.contact&&p.contact){maxDrift=Math.max(maxDrift,Math.hypot(f.x-p.x,f.y-p.y));contacts++;}});previous=actor.feet;
  }footChecks.push({start,end,maxTargetDrift:maxDrift,contactPairs:contacts,passed:maxDrift<.001});
 }
 const motionUsed=dbg.motion.frames.length===frames+1;
 if(!motionUsed||footChecks.some(c=>!c.passed))errors.push('Motion coverage or planted target check failed');
 return{passed:errors.length===0,errors,frameCount:frames,duration:213,shotCount:shots.length,coverage,routes:[...routes],acting,motionTrials,footChecks,motionUsed,note:'Foot checks cover authored targets, not physical pixel contacts. Visual evidence is reviewed separately.'};
}
