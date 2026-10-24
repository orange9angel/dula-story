export async function probe(){
 const d=window.__dbg,errors=[],coverage=[];
 const {checkStoryContracts}=await import('./assets3d/art_pass_runtime/continuity-check.js');const {T}=await import('./config/event_times.js');const cfg=await fetch('./config/continuity_r4.json').then(r=>r.json());const continuity=await checkStoryContracts({sample:t=>window.renderAt(t,{encode:false}).state,contracts:cfg.contracts,cues:T});if(!continuity.passed)errors.push('Narrative state contract failed');
 for(const s of window.shots){const r=window.renderAt((s.start+s.end)/2,{encode:false});coverage.push({id:s.id,start:s.start,end:s.end,kind:r.state.kind,route:r.state.route});}
 const replay=[];for(const t of [4.5,21.3,29.2,35.5,54.5,58.1,64.2,109,152.5,165.7,169.5,171.1,193.2,200]){const a=window.renderAt(t);window.renderAt(207.5,{encode:false});const b=window.renderAt(t);replay.push({t,equal:a.image===b.image});if(a.image!==b.image)errors.push('Replay mismatch at '+t);}
 const walks=[];for(const [start,end]of [[20,22.8],[24.4,25.9],[193,197]]){const poses=new Set();let maxAdjacentFootStep=0,last=null;for(let f=Math.ceil(start*15);f<end*15;f++){const r=window.renderAt(f/15,{encode:false}).state,b=r.bodies?.find(b=>b.wholeCel);if(!b)continue;poses.add(b.key+':'+b.index);if(last)b.feet.forEach((p,i)=>{maxAdjacentFootStep=Math.max(maxAdjacentFootStep,last[i]?Math.hypot(p.x-last[i].x,p.y-last[i].y):0);});last=b.feet;}
  walks.push({start,end,wholeCels:[...poses],maxAdjacentRasterShadowAnchorStep:maxAdjacentFootStep});if(poses.size<2)errors.push('Walking did not change complete pose');}
 const shields=[59,64.2,103.5,167,169.5,185].map(t=>{const s=window.renderAt(t,{encode:false}).state;return{t,state:s.shield??s.pilot?.shield};});if(shields.some((s,i)=>!s.state||s.state.level<(i?shields[i-1].state.level:0)))errors.push('Damage reset or missing state');
 const controls=[];
 for(const actor of ['aoao','yekari']){
  const shot=window.shots.find(s=>s.kind===(actor==='aoao'?'hero_face':'enemy_face'));
  let selected=null;
  for(let i=0;i<(shot.end-shot.start)*30;i++){const t=shot.start+i/30,r=window.renderAt(t,{encode:false});if(r.state.face?.jaw>.10){selected=t;break;}}
  if(selected===null){errors.push('No active raster mouth evidence for '+actor);continue;}
  const before=window.renderAt(selected);d.faceDisabled=true;const b=window.renderAt(selected);d.faceDisabled=false;
  controls.push({actor,t:selected,jaw:before.state.face.jaw,mouthCel:before.state.face.mouthCel,expressionAffectsPixels:before.image!==b.image,restored:before.image===window.renderAt(selected).image});
 }
 if(controls.some(c=>!c.expressionAffectsPixels||!c.restored))errors.push('Face control failed');
 return{passed:!errors.length,errors,continuity,coverage,replay,walks,shields,controls,note:'R7 RGBA frames are consumed, root distance drives their phase. Checks cover runtime state, whole-pose changes and replay. Foot sample motion is not a no-sliding test; visual continuity and painting quality are reviewed separately.'};
}
