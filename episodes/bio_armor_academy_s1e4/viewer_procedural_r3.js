import * as THREE from 'three';
import {LeiXiaoCraft} from 'dula-assets/characters/bioarmor/characters.js';
import {QianTangKuiCraft} from 'dula-assets/characters/bioarmor/QianTangKuiCraft.js';
import {BiologyRoomScene} from './scenes/BiologyRoomRemakeScene.js';
import {posesAt,GRIP_OFFSET} from './performance_remake.js';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';
import {applySupportedPerformance} from 'dula-assets/lib/craft3d/supported-performance.js';
import {createNumericProbe} from './tools/numeric_probe.js';
import {createGarmentClearance} from 'dula-assets/lib/craft3d/garment-clearance.js';
const W=1280,H=720,q=new URLSearchParams(location.search),numeric=q.has('probe-surface');
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
const stage=new BiologyRoomScene(),scene=stage.build(),actors={lei:new LeiXiaoCraft(),aoi:new QianTangKuiCraft({heroine:true})};
await stage.readyPromise;
for(const a of Object.values(actors)){
  scene.add(a.mesh);
  a.face.setStyle({eyeWidth:1.04,eyeHeight:1.22,mouthWidth:1.18,mouthHeight:1.22,noseWidth:2.5,noseLine:'#b08270'});
  for(const side of ['left','right']){
    a.sleeves[side].radii=a.sleeves[side].radii.map(([u,r])=>[u,r*.88]);
    a.sleeves[side+'Roll'].radii=a.sleeves[side+'Roll'].radii.map(([u,r])=>[u,r*.90]);
  }
}
actors.aoi.face.setStyle({eyeWidth:1.04,eyeHeight:1.65,eyeSpacing:84,eyeY:253,lashes:true,mouthWidth:1.22,mouthHeight:1.22,noseWidth:1.8,noseLine:'#b08270'});
const ramp=coolShadowRamp();
for(const a of Object.values(actors))a.mesh.traverse(o=>{
  if(!o.isMesh||!o.material)return;
  const m=o.material;
  if(m.side===THREE.BackSide||m.transparent||m.blending!==THREE.NormalBlending)return;
  o.castShadow=true;o.receiveShadow=true;
  for(let p=o.parent;p;p=p.parent)if(p.name&&/_animated_head$/.test(p.name))return;
  if(m.isMeshToonMaterial){m.gradientMap=ramp;m.needsUpdate=true;return;}
  o.material=new THREE.MeshToonMaterial({color:m.color??0xffffff,map:m.map??null,gradientMap:ramp,vertexColors:!!m.vertexColors,side:m.side});
});
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#dce8dd');
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d'),camera=new THREE.PerspectiveCamera(36,W/H,.05,100);
const probe=createNumericProbe(actors,stage);
const fitCloth=Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,createGarmentClearance(a)]));
// Etch is colour on the existing arm vertices, never another intersecting mesh.
const markSurface=actors.lei.limbs.leftArm,baseSkin=markSurface.mesh.material.color.clone(),markColor=new THREE.Color('#3DFFC8');
markSurface.mesh.material=markSurface.mesh.material.clone();markSurface.mesh.material.color.set('#ffffff');markSurface.mesh.material.vertexColors=true;
const markColors=new THREE.Float32BufferAttribute(new Float32Array(markSurface.geometry.attributes.position.count*3),3);
markSurface.geometry.setAttribute('color',markColors);
function applyMark(growth){
  let colored=0;
  for(let i=0;i<=markSurface.rings;i++)for(let j=0;j<markSurface.sides;j++){
    const u=i/markSurface.rings,theta=j/markSurface.sides;
    const wave=(theta+.018*Math.sin(u*72))*2,dist=Math.abs(wave-Math.round(wave));
    const active=u>.61&&u<.68+growth*.22&&dist<.10;
    const color=active?markColor:baseSkin;markColors.setXYZ(i*markSurface.sides+j,color.r,color.g,color.b);if(active)colored++;
  }
  markColors.needsUpdate=true;return colored;
}
function speech(t,key){
  const id=key==='lei'?'LeiXiao':'QianTangKui';if(!voice)return 0;
  const values=voice.characters[id],i=Math.max(0,Math.min(values.length-1,Math.floor((t+1e-9)/voice.step)));return values[i]??0;
}
function subtitles(text,key){
  ctx.save();ctx.font='bold 28px "Microsoft YaHei"';ctx.textAlign='center';ctx.lineJoin='round';
  ctx.strokeStyle='rgba(20,27,30,.92)';ctx.lineWidth=6;ctx.fillStyle=key==='lei'?'#d8ecff':'#d9edbc';
  ctx.strokeText(text,W/2,H-46);ctx.fillText(text,W/2,H-46);ctx.restore();
}
function orientPalm(a,side,direction,amount){
  const x=new THREE.Vector3(direction,0,0),y=new THREE.Vector3(0,1,0),z=x.clone().cross(y);
  const world=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
  const local=a.mesh.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world);
  a.hands[side].quaternion.slerp(local,amount);a.mesh.updateMatrixWorld(true);
}
function draw(t,capture=true){
  const seg=TL.segments.findLast(s=>s.start<=t)??TL.segments[0],cues=stage.sample(t,TL),p=posesAt(t,cues,TL);
  const cloth={};
  for(const [key,a] of Object.entries(actors)){
    applySupportedPerformance(a,p[key]);a.setEmotion(p[key].emotion,p[key].blink);
    cloth[key]=fitCloth[key]();
    a.face.setActing(p[key].acting);
  }
  orientPalm(actors.aoi,'left',-1,p.phase.aoiHold);
  orientPalm(actors.lei,'left',1,p.phase.leiHold);
  stage.jar.position.set(p.jar.x,p.jar.y,p.jar.z);
  if(p.jarOwner==='aoi')stage.jar.position.copy(actors.aoi.hands.left.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(-GRIP_OFFSET.aoi,-.18,.015));
  if(p.jarOwner==='lei')stage.jar.position.copy(actors.lei.hands.left.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(GRIP_OFFSET.lei,-.18,.015));
  stage.notebook.position.copy(actors.aoi.hands.right.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(.025,.006,.035));
  stage.notebook.rotation.set(.20,-.20,.07);
  actors.lei.setArmorState(0,0);actors.lei.setEtch(0);actors.lei.updateWeaponFX(t,0,0);const markVertices=applyMark(p.mark);
  for(const [key,a] of Object.entries(actors)){
    const target=p[key].gaze==='mark'?actors.lei.mesh.localToWorld(new THREE.Vector3().copy(p.lei.leftArm[2])):
      p[key].gaze==='jar'?stage.jar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.2,0)):
      actors[key==='lei'?'aoi':'lei'].face.head.getWorldPosition(new THREE.Vector3());
    a.face.lookAtWorld(target);
    a.mouth.apply(mouthAt(t,key));
  }
  const c=seg.camera.options;
  camera.position.set(...c.position);camera.lookAt(...c.lookAt);camera.fov=c.fov??36;
  if(window.freeCamera){camera.position.set(...window.freeCamera.pos);camera.lookAt(...(window.freeCamera.lookAt??window.freeCamera.look));camera.fov=window.freeCamera.fov??36;}
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
  const state={entry:seg.entry,phase:seg.id,mark:p.mark,markVertices,acting:p.phase,cues,cloth,jarOwner:p.jarOwner,jarPosition:stage.jar.position.toArray(),
    performance:Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,{head:[p[key].headPitch,p[key].headYaw,p[key].headRoll],
      torso:p[key].torso,root:[p[key].rootX,p[key].rootZ,p[key].yaw],gestures:p[key].gestures,gaze:p[key].gaze}])),
    arms:Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,[p[key].leftArm,p[key].rightArm]])),
    ...(numeric?probe(p,camera):{})};
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
if(!q.has('capture')){const start=performance.now();function tick(){draw(((performance.now()-start)/1000)%TL.duration);requestAnimationFrame(tick);}tick();}
