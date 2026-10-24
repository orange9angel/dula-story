export async function probe(){
 const d=window.__dbg,errors=[],coverage=[];
 const expressionCels=[];
 for(const [actor,painter] of [['aoao',d.heroFace],['yekari',d.enemyFace]])for(const jaw of [0,.2,.8]){
  const bytes=strain=>{painter.paint({jaw,strain});return painter.canvas.getContext('2d').getImageData(0,0,painter.canvas.width,painter.canvas.height).data;};
  const base=bytes(0),hurt=bytes(1);
  for(const strain of [.2,.49,.5,.65,.9]){const actual=bytes(strain),expected=strain<.5?base:hurt;let different=0;for(let i=0;i<actual.length;i++)different+=actual[i]!==expected[i];expressionCels.push({actor,jaw,strain,differentBytes:different,passed:different===0});}
 }
 if(expressionCels.some(x=>!x.passed))errors.push('Expression contains a blended second drawing');
 const {checkStoryContracts}=await import('./assets3d/art_pass_runtime/continuity-check.js');const {T}=await import('./config/event_times.js');const cfg=await fetch('./config/continuity_r6.json').then(r=>r.json());const continuity=await checkStoryContracts({sample:t=>window.renderAt(t,{encode:false}).state,contracts:cfg.contracts,cues:T});if(!continuity.passed)errors.push('Narrative state contract failed');
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

 const {checkContinuityTraces}=await import('./assets3d/art_pass_runtime/continuity-check.js');
 const times=new Set([0,59.99,60,103,135.4,137.6,149.4,152,163,173.8,178,181.5,191,191.8,193,194.2,196.2,197.99,204]);
 for(const s of window.shots)for(const t of [Math.max(0,s.start-.001),s.start,(s.start+s.end)/2,s.end-.001])times.add(t);
 for(let t=191;t<198;t+=.1)times.add(t);
 const trace=[...times].sort((a,b)=>a-b).map(t=>window.renderAt(t,{encode:false}).state);
 const dimensions=checkContinuityTraces({samples:trace,rules:[
 {id:'shield-face-damage',field:'shield.level',nondecreasing:true},
 {id:'shield-forearm-damage',field:'continuity.forearmDamage',nondecreasing:true},
 {id:'shield-owner',field:'continuity.shieldOwner',transitions:[]},
 {id:'exit-camera',field:'view.z',start:191,end:198,maxStep:0},
 {id:'exit-cel-scale',field:'bodies.1.height',start:191.8,end:198,maxStep:0},
 {id:'line-emotion-carry',field:'continuity.enemyIntent',start:178,end:184,transitions:[]}
 ]});if(!dimensions.passed)errors.push('Multidimensional trace mismatch');
 // Measure the actual mesh: rotation/translation may change, internal distances may not.
 const rigid=[];
 for(const [key,ts]of [['hero_face',[17,17.3,17.6,18]],['enemy_face',[178.2,179,180.5]]]){
  const points=[0,42,500,900,1400,1800,2106],rows=[];
  for(const t of ts){window.renderAt(t,{encode:false});const pos=d.cels.cells.get(key).geo.attributes.position;
   rows.push(points.flatMap((i,a)=>points.slice(a+1).map(j=>Math.hypot(pos.getX(i)-pos.getX(j),pos.getY(i)-pos.getY(j)))));}
  const maxDistanceChange=Math.max(...rows.flatMap(row=>row.map((v,i)=>Math.abs(v-rows[0][i]))));rigid.push({key,maxDistanceChange,passed:maxDistanceChange<.002});
 }
 if(rigid.some(x=>!x.passed))errors.push('Portrait mesh still ripples');
 const armor=[];for(const [t,key]of [[80,'hero_block'],[105,'hero_kneel'],[165.7,'hero_kneel']]){
  window.renderAt(t,{encode:false});const im=d.bodyImages[key],ctx=im.getContext('2d'),a=ctx.getImageData(0,0,im.width,im.height).data;
  // Rendering with identical artwork but no forearm mark must affect actual pixels.
  const saved=d.director.tracks.forearmDamage.map(k=>k.value);d.director.tracks.forearmDamage.forEach(k=>k.value=0);window.renderAt(t,{encode:false});const b=ctx.getImageData(0,0,im.width,im.height).data;
  d.director.tracks.forearmDamage.forEach((k,i)=>k.value=saved[i]);window.renderAt(t,{encode:false});
  let changed=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;
  armor.push({t,key,changedPixels:changed,passed:changed>10});
 }if(armor.some(x=>!x.passed))errors.push('Visible forearm damage did not affect pixels');
 return{passed:!errors.length,errors,expressionCels,continuity,dimensions,rigid,armor,coverage,replay,walks,shields,controls,note:'R7 RGBA frames are consumed, root distance drives their phase. Checks cover runtime state, whole-pose changes and replay. Foot sample motion is not a no-sliding test; visual continuity and painting quality are reviewed separately.'};
}
