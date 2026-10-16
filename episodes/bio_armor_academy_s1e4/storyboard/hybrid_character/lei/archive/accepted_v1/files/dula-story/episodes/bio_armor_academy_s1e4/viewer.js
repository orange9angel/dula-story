import * as THREE from 'three';
import {ImportedPerformer} from 'dula-assets/lib/craft3d/imported-performer.js';
import {createProjectedFace} from 'dula-assets/lib/craft3d/projected-face.js';
import {TRIPO_LOOK} from 'dula-assets/characters/bioarmor/tripo-look.js';
import {addForearmMark} from 'dula-assets/lib/craft3d/skin-mark.js';
import {RetargetedMotion} from 'dula-assets/lib/craft3d/retargeted-motion.js';
import {createTableHandClearance} from 'dula-assets/lib/craft3d/table-hand-clearance.js';
import {addSecondaryHair} from 'dula-assets/lib/craft3d/secondary-hair.js';
import {applyImportedCelLook} from 'dula-assets/lib/craft3d/imported-cel-look.js';
import {addAoiGraphicHair} from 'dula-assets/characters/bioarmor/aoi-graphic-hair.js';
import {applyTripoDrawnLook} from 'dula-assets/characters/bioarmor/tripo-drawn-look.js';
import {addLeiGraphicHair} from 'dula-assets/characters/bioarmor/lei-graphic-hair.js';
import {addAoiGeneratedHair} from 'dula-assets/characters/bioarmor/aoi-generated-paint.js';
import {BiologyRoomScene} from './scenes/BiologyRoomRemakeScene.js';
import {posesAt} from './performance_remake.js';
import {preparePerformer,applyTripoPose,settleImportedWrists} from './performance_tripo.js';
import {createImportedProbe} from './tools/imported_probe.js';
const W=1280,H=720,q=new URLSearchParams(location.search),numeric=q.has('probe-surface'),resolution=q.has('hd')?1.5:1;
if(!q.has('cel'))q.set('cel','anime');
const drawnMode=['anime','direct'].includes(q.get('cel'));
const TL=await fetch('./config/timeline.json').then(r=>r.json());
let voice=null;try{const r=await fetch('./config/voice_features.json');if(r.ok)voice=await r.json();}catch{}
const lips={};
for(const [key,id] of [['lei','leixiao'],['aoi','qiantangkui']]){
  try{const r=await fetch('./config/viseme_'+id+'.json');if(r.ok)lips[key]=await r.json();}catch{}
}
function mouthAt(t,key){
  const track=lips[key];if(!track)return {jaw:speech(t,key),width:1};
  const frames=track.keyframes,i=Math.min(track.gate.length-1,Math.max(0,Math.floor(t/track.step)));
  if(!track.gate[i])return {jaw:0,width:1};
  let lo=0,hi=frames.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(frames[m].t<=t)lo=m;else hi=m;}
  const a=frames[lo],b=frames[hi],u=Math.max(0,Math.min(1,(t-a.t)/Math.max(b.t-a.t,1e-6))),s=(1-Math.cos(u*Math.PI))/2;
  const chan=k=>a[k]+(b[k]-a[k])*s;
  return {jaw:Math.min(1,chan('jaw')*1.12),width:1+.4*chan('width')-.13*chan('rounding')};
}
const stage=new BiologyRoomScene(),scene=stage.build(),actors={};
await stage.readyPromise;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,stencil:true});renderer.setSize(W*resolution,H*resolution);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#dce8dd');
scene.traverse(o=>{if(o.isMesh)o.material.toneMapped=false;});
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
for(const key of ['lei','aoi']){
  const a=await ImportedPerformer.load(`./assets3d/tripo_${key}_trial/${key}_h31_lod160k_v2.glb`,TRIPO_LOOK[key].height);
  if(key==='aoi')a.garmentRepair=a.restrictInfluences({min:[-.30,.53,-.22],max:[.30,.99,.23],maxAlbedoLuma:.42,allow:n=>n==='hips'||/leg|foot|toe/.test(n)});
  preparePerformer(a,key);a.correctWrists=q.has('wristfix');
  if(!drawnMode)a.face=createProjectedFace(a,renderer,TRIPO_LOOK[key]);scene.add(a.mesh);actors[key]=a;
  if(q.get('cel')!=='original'&&(key==='aoi'||drawnMode))a.celLook=applyImportedCelLook(a,{mode:drawnMode||q.get('cel')==='graphic'?'painted':q.get('cel'),face:TRIPO_LOOK[key],hairMinY:key==='aoi'?1.10:1.56,headMinY:key==='aoi'?1.42:1.57,
    palette:{hair:key==='aoi'?'#244444':'#54382d',hairLight:key==='aoi'?'#628680':'#9b6f4d',skin:'#eec9a9'}});
  if(q.get('cel')==='graphic'&&key==='aoi'){
    a.graphicHair=addAoiGraphicHair(a);a.celLook.geometry='head-weighted hair triangles removed; procedural broad-lock candidate';
    a.celLook.limitations=['hairline fragments','clip missing','secondary motion not connected','not accepted'];
  }
  if(drawnMode){
    const directPaint=q.get('cel')==='direct';
    const look=applyTripoDrawnLook(a,key,{directPaint});a.face=look.face;await a.face.ready;a.celLook={mode:directPaint?'direct':'anime',body:look.body,face:directPaint?'generated face paint and curved textured hair shells':'approved design proportions, painted irises and live face drawing'};
    if(directPaint&&key==='aoi')a.graphicHair=await addAoiGeneratedHair(a);
    else if(directPaint&&key==='lei')a.graphicHair=await (await import('dula-assets/characters/bioarmor/lei-generated-hair.js')).addLeiGeneratedHair(a);
    else if(key==='aoi')a.graphicHair=addAoiGraphicHair(a,{refined:true});
    else a.graphicHair=addLeiGraphicHair(a);
  }
}
const canvas=document.createElement('canvas');canvas.width=W*resolution;canvas.height=H*resolution;canvas.style.width=W+'px';canvas.style.height=H+'px';document.body.append(canvas);
const ctx=canvas.getContext('2d'),camera=new THREE.PerspectiveCamera(36,W/H,.05,100);
ctx.scale(resolution,resolution);
const applyMark=addForearmMark(actors.lei,'left');
const rubMotion=await RetargetedMotion.load(actors.lei,'./assets3d/tripo_lei_trial/lei_text_rub_v1.glb');
const clearLeiHands=createTableHandClearance(actors.lei,stage.table);
const aoiHair=drawnMode?{selectedVertices:0,maxDisplacement:0,apply:(yaw,pitch)=>({yaw,pitch})}:addSecondaryHair(actors.aoi);
const importedProbe=numeric?createImportedProbe(actors,stage):null;
function speech(t,key){
  const id=key==='lei'?'LeiXiao':'QianTangKui';if(!voice)return 0;
  const values=voice.characters[id],i=Math.max(0,Math.min(values.length-1,Math.floor((t+1e-9)/voice.step)));return values[i]??0;
}
function subtitles(text,key){
  ctx.save();ctx.font='bold 28px "Microsoft YaHei"';ctx.textAlign='center';ctx.lineJoin='round';
  ctx.strokeStyle='rgba(20,27,30,.92)';ctx.lineWidth=6;ctx.fillStyle=key==='lei'?'#d8ecff':'#d9edbc';
  ctx.strokeText(text,W/2,H-46);ctx.fillText(text,W/2,H-46);ctx.restore();
}
function draw(t,capture=true){
  const seg=TL.segments.findLast(s=>s.start<=t)??TL.segments[0],cues=stage.sample(t,TL),p=posesAt(t,cues,TL);
  const cloth={},ik={};
  for(const [key,a] of Object.entries(actors)){
    ik[key]=applyTripoPose(a,p[key],p);
  }
  const rubStart=TL.segments.find(s=>s.entry===7).start,rubElapsed=t-rubStart;
  if(rubElapsed>=0&&rubElapsed<4.5){
    const ease=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
    const knots=[[0,.55],[.65,.65],[2.3,1.35],[3.1,2.1],[4.5,4.95]];
    const n=knots.findIndex(k=>k[0]>rubElapsed),l=knots[n-1],r=knots[n],u=(rubElapsed-l[0])/(r[0]-l[0]);
    rubMotion.apply(l[1]+u*(r[1]-l[1]),ease(rubElapsed/.45)*(1-ease((rubElapsed-3.8)/.7)),{include:n=>/spine|shoulder|arm|hand|neck|head/.test(n),rootMotion:false});
  }
  const tableCorrection=clearLeiHands(p.phase.leiHold>0?['right']:['left','right']);
  for(const a of Object.values(actors))settleImportedWrists(a);
  const lagTime=Math.max(0,t-.18),lagPose=posesAt(lagTime,cues,TL).aoi;
  const hairMotion=aoiHair.apply((lagPose.headYaw+lagPose.yaw-p.aoi.headYaw-p.aoi.yaw)*.7+(lagPose.headRoll-p.aoi.headRoll)*.8,
    (lagPose.headPitch-p.aoi.headPitch)*.8+(lagPose.rootX-p.aoi.rootX)*.12);
  if(q.get('cel')==='anime')actors.aoi.graphicHair.userData.applyLag(
    (lagPose.headYaw+lagPose.yaw-p.aoi.headYaw-p.aoi.yaw)*.7+(lagPose.headRoll-p.aoi.headRoll)*.8,
    (lagPose.headPitch-p.aoi.headPitch)*.8+(lagPose.rootX-p.aoi.rootX)*.12);
  stage.jar.position.set(p.jar.x,p.jar.y,p.jar.z);
  if(p.jarOwner!=='table'){
    const a=actors[p.jarOwner];
    stage.jar.position.copy(a.hands[a.contactHand].getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(p.jarOwner==='lei'?-.12:-.115,p.jarOwner==='lei'?-.16:-.12,p.jarOwner==='lei'?-.075:.085));
  }
  stage.notebook.position.copy(actors.aoi.hands.left.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(.05,.025,.035));
  stage.notebook.rotation.set(.08,-.20,.04);
  applyMark(p.mark);const markVertices=null;
  for(const [key,a] of Object.entries(actors)){
    const target=p[key].gaze==='mark'?actors.lei.bones.leftforearm.getWorldPosition(new THREE.Vector3()):
      p[key].gaze==='jar'?stage.jar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.2,0)):
      actors[key==='lei'?'aoi':'lei'].face.head.getWorldPosition(new THREE.Vector3());
    const delta=a.bones.head.getWorldQuaternion(new THREE.Quaternion()).multiply(a.neutralQuaternion.head.clone().invert());
    const local=target.clone().sub(a.bones.head.getWorldPosition(new THREE.Vector3())).applyQuaternion(delta.invert());
    const gaze=[THREE.MathUtils.clamp(Math.atan2(local.x,Math.max(.1,local.z))/.65,-1,1),THREE.MathUtils.clamp(Math.atan2(local.y,Math.hypot(local.x,local.z))/.40,-1,1)];
    a.face.apply({...p[key].acting,...mouthAt(t,key),blink:p[key].blink,gaze});
    a.face.updateGeometry?.();
  }
  const c=seg.camera.options;
  camera.position.set(...c.position);camera.lookAt(...c.lookAt);camera.fov=c.fov??36;
  if(window.freeCamera){camera.position.set(...window.freeCamera.pos);camera.lookAt(...(window.freeCamera.lookAt??window.freeCamera.look));camera.fov=window.freeCamera.fov??36;}
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
  const state={entry:seg.entry,phase:seg.id,mark:p.mark,markVertices,acting:p.phase,cues,cloth,jarOwner:p.jarOwner,jarPosition:stage.jar.position.toArray(),
    performance:Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,{head:[p[key].headPitch,p[key].headYaw,p[key].headRoll],
      torso:p[key].torso,root:[p[key].rootX,p[key].rootZ,p[key].yaw],gestures:p[key].gestures,gaze:p[key].gaze}])),
    arms:Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,[p[key].leftArm,p[key].rightArm]])),
    ik,tableCorrection,hair:{aoi:hairMotion,vertices:aoiHair.selectedVertices,maxBindDisplacement:aoiHair.maxDisplacement},faces:Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,{...a.face.state}])),...(importedProbe?importedProbe(p,camera):{})};
  if(!capture)return state;
  renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0,W,H);
  if(seg.entry===1||seg.entry===19){
    ctx.fillStyle='rgba(22,39,33,.68)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#eee6cc';ctx.textAlign='center';
    ctx.font='bold 76px "Microsoft YaHei"';ctx.fillText('9 章',W/2,260);
    ctx.font='36px "Microsoft YaHei"';ctx.fillText(seg.entry===1?'残卷 · 其四  /  别再试了':'其四 · 终',W/2,367);
    ctx.font='21px "Microsoft YaHei"';ctx.fillText('青岚学舍',W/2,432);
  }else{
    const line=TL.dialogue.find(d=>t>=d.start&&t<d.end);if(line)subtitles(line.text,line.character==='LeiXiao'?'lei':'aoi');
    if(seg.entry===4){ctx.save();ctx.strokeStyle='#263e33';ctx.lineWidth=4;ctx.fillStyle='#e9edd3';ctx.textAlign='right';ctx.font='20px "Microsoft YaHei"';ctx.strokeText('千堂葵  /  生物部',W-48,62);ctx.fillText('千堂葵  /  生物部',W-48,62);ctx.restore();}
  }
  return {state,image:canvas.toDataURL('image/jpeg',.94).split(',')[1]};
}
window.duration=TL.duration;window.checkTimes=TL.segments.flatMap(s=>[s.start+.1,(s.start+s.end)/2,s.end-.1]);
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);window.setFreeCamera=c=>window.freeCamera=c;
window.ready=true;
window.actors=actors;window.stage=stage;window.scene=scene;
if(!q.has('capture')){const start=performance.now();function tick(){draw(((performance.now()-start)/1000)%TL.duration);requestAnimationFrame(tick);}tick();}
