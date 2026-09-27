// Phase 4: 完整剧情短片（开场 establish/serve/depart + 正片 + 结尾 sink/pullback）。
// 数据链与 cel viewer.js 同构，但消费 craft3d 自有扩展数据（script3d.story +
// config3d/*，由 tools/build_extension.py 生成；正片内容整体后移 T0=11.544s）。
// 精修层 refine3d.js（?norefine=1 可关，用于精修前后对比帧）。
import * as THREE from 'three';
import {StoryParser} from 'dula-engine';
import {HomeKitchenScene} from '/episode/scenes/HomeKitchenScene.js';
import {buildHomeProps, updateHomeProps} from '/episode/home_props.js';
import {YukiCraft3D} from '/craft/character3d.js';
import {MochiCraft3D} from './mochi3d.js';
import {poseYukiCraft, poseMochiCel, prepareMochi} from './performance3d.js';
import {CraftMouth} from './mouth3d.js';
import {installEnhancedFace, enhanceYukiBody} from './refine3d.js';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const lerp3=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);

const W=720,H=1280;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping; // craft toon ramp is authored for this (Phase 1)
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.appendChild(canvas);
const ctx=canvas.getContext('2d');
const query=new URLSearchParams(location.search);

const [storyText,TL,visemeYuki,visemeMochi,voiceFeatures]=await Promise.all([
  fetch('/craft3d/script3d.story').then(r=>r.text()),
  fetch('/craft3d/config3d/timeline.json').then(r=>r.json()),
  fetch('/craft3d/config3d/viseme_yuki.json').then(r=>r.json()),
  fetch('/craft3d/config3d/viseme_mochi.json').then(r=>r.json()),
  fetch('/craft3d/config3d/final_voice_features.json').then(r=>r.json()),
]);
const entries=StoryParser.parse(storyText);
window.duration=Math.max(...entries.map(e=>e.endTime));
if(Math.abs(window.duration-TL.duration)>.002)throw new Error('Stale media timeline');

const kitchen=new HomeKitchenScene();kitchen.build();
const actor=new YukiCraft3D();
kitchen.scene.add(actor.mesh);

// Cel ink alignment on the craft shells (same swap as Phase 1).
function inkMaterial(width,cacheKey,joint){
  const m=new THREE.MeshBasicMaterial({color:0x25222a,side:THREE.BackSide});
  m.onBeforeCompile=shader=>{
    if(joint)shader.vertexShader='attribute float contour;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>\ntransformed += normalize(normal) * (${joint?`${width} * contour`:String(width)});`);
  };
  m.customProgramCacheKey=()=>cacheKey;return m;
}
// Cel 口径：小雪 0.012 / 年糕 0.006（角色只有小雪一半高）。
const inkSolid=inkMaterial(0.012,'fish-craft3d-ink-v1',false);
const inkJoint=inkMaterial(0.012,'fish-craft3d-joint-ink-v1',true);
const inkSolidCat=inkMaterial(0.006,'fish-craft3d-ink-cat-v1',false);
const inkJointCat=inkMaterial(0.006,'fish-craft3d-joint-ink-cat-v1',true);
const recolorInk=(root,solid,joint)=>root.traverse(o=>{
  if(!o.isMesh||o.material?.side!==THREE.BackSide)return;
  const key=o.material.customProgramCacheKey?.();
  if(key==='craft-contour-v1')o.material=solid;
  else if(key==='craft-open-joint-contour-v1')o.material=joint;
});
recolorInk(actor.mesh,inkSolid,inkJoint);
const mouth=new CraftMouth(actor.headAssembly);
const noRefine=query.has('norefine');
const face=noRefine?null:installEnhancedFace(actor);
if(!noRefine)enhanceYukiBody(actor);

// MochiCraft3D（三维年糕，句柄契约同 cel 资产，表演桥原样驱动）
const cat=new MochiCraft3D();
recolorInk(cat.mesh,inkSolidCat,inkJointCat);
kitchen.scene.add(cat.mesh);
prepareMochi(cat);
const home=buildHomeProps(kitchen.scene,cat);

// --- 开场/结尾道具 -----------------------------------------------------------
const segById=id=>TL.segments.find(s=>s.id===id);
const o1End=segById('o1_yuki_reward').end;        // 盘子落地
const emptyStart=segById('00_empty').start;       // 切空盘（鱼干消失、嘴角饭粒出现）
const endStart=segById('e1_mochi_wash').start;    // 结尾段开始
// 端着的小鱼干盘（ fish_enter/fish_serve 期间可见，位置由表演驱动）
const carryPlate=new THREE.Group();
{
  const mat2=c=>new THREE.MeshToonMaterial({color:c});
  const plate=new THREE.Mesh(new THREE.CylinderGeometry(.14,.115,.025,32),mat2(0xeee3d3));carryPlate.add(plate);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.13,.012,8,32),mat2(0x73afa5));rim.rotation.x=Math.PI/2;rim.position.y=.012;carryPlate.add(rim);
  for(const [x,z,ry] of [[-.04,.02,.4],[.03,-.03,1.2],[.05,.04,2.1],[-.01,-.045,.8]]){
    const j=new THREE.Mesh(new THREE.BoxGeometry(.055,.02,.028),mat2(0x8a5a28));
    j.position.set(x,.026,z);j.rotation.y=ry;carryPlate.add(j);
  }
  kitchen.scene.add(carryPlate);
}
// 地面餐盘上的鱼干（盘子落地后、被偷吃前可见）
const jerky=new THREE.Group();
for(const [x,z,ry] of [[-.05,.03,.4],[.04,-.02,1.2],[.06,.05,2.1],[0,-.05,.8],[-.02,.06,1.7]]){
  const j=new THREE.Mesh(new THREE.BoxGeometry(.05,.018,.026),new THREE.MeshToonMaterial({color:0x8a5a28}));
  j.position.set(x,.032,z);j.rotation.y=ry;jerky.add(j);
}
home.dish.add(jerky);
// 零食袋（结尾偷瞄目标，仅结尾段可见）
const snackBag=new THREE.Group();
{
  const mat2=c=>new THREE.MeshToonMaterial({color:c});
  const bag=new THREE.Mesh(new THREE.BoxGeometry(.16,.22,.09),mat2(0xd9b36c));bag.position.y=.11;snackBag.add(bag);
  const top=new THREE.Mesh(new THREE.BoxGeometry(.16,.05,.05),mat2(0xb78f4a));top.position.set(0,.245,0);top.rotation.z=.12;snackBag.add(top);
  const label=new THREE.Mesh(new THREE.BoxGeometry(.10,.09,.005),mat2(0xe86a4a));label.position.set(0,.12,.048);snackBag.add(label);
  snackBag.position.set(-.15,0,-1.25);snackBag.rotation.y=.4; // 水槽边地上（猫左前方，偷瞄可及）
  kitchen.scene.add(snackBag);
}

// --- timeline data views (identical to the cel viewer) ----------------------
const segments=TL.segments;
const segAt=t=>segments.find(s=>t>=s.start-1e-4&&t<s.end-1e-4)??{id:'reaction',kind:'reaction',start:t,end:t+1};
const authored=entries.filter(e=>e.storyEvents?.some(x=>x.options?.action==='AdPose'));
const optsFor=(e,name)=>e.storyEvents.find(x=>x.options?.action==='AdPose'&&x.options.character===name).options;
const yukiChars=[...TL.dialogue.filter(d=>d.character==='Yuki').flatMap(d=>d.chars),...TL.songB.chars]
  .sort((a,b)=>a.start-b.start);
const mochiChars=[...TL.dialogue.filter(d=>d.character==='Mochi').flatMap(d=>d.chars),...TL.songA.chars]
  .sort((a,b)=>a.start-b.start);
const beatTimes=TL.beat_grid.beats.slice().sort((a,b)=>a-b);
if(beatTimes.length&&beatTimes[0]>.5)beatTimes.unshift(0.0);

function makeLip(track,chars,name){
  const kf=track.keyframes,last=kf[kf.length-1];
  const chan=(t,k)=>{
    if(t<=kf[0].t)return kf[0][k];
    if(t>=last.t)return last[k];
    let lo=0,hi=kf.length-1;
    while(hi-lo>1){const m=(lo+hi)>>1;if(kf[m].t<=t)lo=m;else hi=m;}
    const a=kf[lo],b=kf[hi],u=(t-a.t)/Math.max(b.t-a.t,1e-6);
    const s=(1-Math.cos(Math.PI*u))/2;
    return a[k]+(b[k]-a[k])*s;
  };
  return t=>{
    const ff=voiceFeatures.characters[name],f=Math.min(ff.length-1,Math.max(0,t/.01)),ii=Math.floor(f);
    const gate=ff[ii].gate+(ff[Math.min(ii+1,ff.length-1)].gate-ff[ii].gate)*(f-ii);
    const jaw=chan(t,'jaw')*gate;
    const i=chars.findLastIndex(c=>c.start<=t&&t<c.end);
    const ch=i>=0?chars[i]:null;
    return {open:jaw,jaw,width:1+.4*chan(t,'width'),rounding:chan(t,'rounding'),
      seal:chan(t,'seal'),labiodental:chan(t,'labiodental'),teeth:chan(t,'teeth'),purse:chan(t,'purse'),
      char:ch?ch.ch:null,audioIndex:i,amplitude:chan(t,'amplitude')};
  };
}
const lipYuki=makeLip(visemeYuki,yukiChars,'Yuki');
const lipMochi=makeLip(visemeMochi,mochiChars,'Mochi');

function drawSubtitle(t,seg){
  let text='';
  if(seg.kind==='dialogue'){
    const d=TL.dialogue.find(d=>d.id===seg.id);text=d?.display??seg.text;
  }else if(seg.kind==='song'){
    const line=TL[seg.id].lines.find(l=>t>=l.start-.06&&t<l.end+.15);
    text=line?.text??'';
  }
  if(!text)return '';
  ctx.save();ctx.font='500 30px "Microsoft YaHei",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  ctx.fillStyle='#ffffff';ctx.strokeStyle='rgba(25,25,25,.85)';ctx.lineWidth=3.6;
  const rows=[];let row='';
  for(const ch of text){
    if(ctx.measureText(row+ch).width>620){rows.push(row.trim());row='';}
    row+=ch;
  }
  if(row)rows.push(row.trim());
  rows.forEach((r,i)=>{const y=1180-(rows.length-1-i)*42;ctx.strokeText(r,360,y);ctx.fillText(r,360,y);});
  ctx.restore();return text;
}

const camera=new THREE.PerspectiveCamera(35,W/H,.1,150);
// Free camera override: while set, the shot table is ignored (3D selling point —
// same performance, any angle). window.setFreeCamera({pos:[x,y,z],lookAt:[x,y,z],fov?})
let freeCamera=null;
window.setFreeCamera=cfg=>{freeCamera=cfg;};
window.clearFreeCamera=()=>{freeCamera=null;};
// 正片四镜与 cel 版逐参一致；开场/结尾是新设计机位（establish 缓推 / entry 右前 3/4 /
// depart 送出门 / plate 空盘低机位 / sink 水槽侧写 / pullback 缓拉收尾）。
function camFor(shot,t,entry){
  const u=entry?ease(clamp((t-entry.startTime)/(entry.endTime-entry.startTime),0,1)):0;
  switch(shot){
    case 'establish':return{pos:lerp3([2.8,2.1,4.8],[2.05,1.55,4.3],u),look:[-.1,.85,0],fov:38};
    case 'entry':return{pos:[1.95,1.3,3.5],look:[-.15,.9,.15],fov:38};
    case 'depart':return{pos:[1.7,1.6,3.9],look:[-.7,.9,0],fov:37};
    case 'plate':return{pos:[-.5,.55,1.55],look:[.08,.04,.38],fov:42};
    case 'sink':return{pos:[-1.8,.85,0],look:[.35,.35,-.9],fov:48};
    case 'pullback':return{pos:lerp3([-1.8,.85,0],[2.1,2.3,5.2],u),look:lerp3([.35,.35,-.9],[.4,.5,-.3],u),fov:48};
    default:{
      const distance=shot==='evidence'?3.10:shot==='cat'?3.55:shot==='yuki'?3.8:6.25;
      const targetY=shot==='evidence'?.69:shot==='cat'?.70:shot==='yuki'?1.22:1.00;
      const focusX=['cat','evidence'].includes(shot)?.69:shot==='yuki'?-.43:.05;
      return{pos:[focusX+.025*Math.sin(t*.6),targetY+.10,distance],look:[focusX,targetY,0],fov:35};
    }
  }
}
{
  const times=[];
  for(const s of authored){times.push(s.startTime+.05,(s.startTime+s.endTime)/2,Math.max(s.endTime-.06,s.startTime+.06));}
  window.checkTimes=[...new Set(times.filter(t=>t>=0&&t<TL.duration).map(t=>Math.ceil(t*60)/60))].sort((a,b)=>a-b);
}
function draw(t){
  // 一拍二: body acting on the 12fps grid; lips and camera at full rate.
  const tq=Math.floor(t*12)/12;
  const seg=segAt(t);
  const entry=authored.find(e=>t>=e.startTime&&t<e.endTime)??authored.at(-1);
  const ai=authored.indexOf(entry),allOpts={Yuki:optsFor(entry,'Yuki'),Mochi:optsFor(entry,'Mochi')};
  const previous=ai>0?{entry:authored[ai-1],opts:optsFor(authored[ai-1],'Yuki')}:null;
  const lip=lipYuki(t),catLip=lipMochi(t);
  const posed=poseYukiCraft(actor,allOpts.Yuki,entry,tq,beatTimes,previous);
  face?.update(posed.point??0,posed.blink);
  const mouthState=mouth.apply(lip);
  const mochiState=poseMochiCel(cat,allOpts.Mochi,entry,tq,beatTimes,catLip);
  updateHomeProps(home,t,entry,allOpts);
  // 结尾洗碗段：海绵在爪（cel 的 updateHomeProps 只认 cat_wash/cat_defeat）；
  // 结尾猫已洗脸，嘴角饭粒收起
  if(['cat_wash_sink','cat_glance','cat_freeze','cat_resign'].includes(allOpts.Mochi.move)){
    home.sponge.visible=true;home.restingSponge.visible=false;
  }
  // 道具时间轴：端盘 → 落地餐盘（有鱼干）→ 空盘（饭粒上嘴角）→ 结尾洗碗摆位
  const plateInfo=posed.prop?.plate;
  carryPlate.visible=!!plateInfo?.visible;
  if(plateInfo?.visible)carryPlate.position.set(...plateInfo.pos);
  const placed=t>=o1End-.12||posed.prop?.placeDone===true;
  home.dish.visible=placed;
  jerky.visible=placed&&t<emptyStart;
  home.evidence.visible=t>=emptyStart&&t<endStart;
  if(t>=endStart){
    home.dish.position.set(.32,.024,-.95);home.plates.position.set(1.02,.047,-.78);
    snackBag.visible=true;
  }else{
    home.dish.position.set(.08,.024,.38);home.plates.position.set(.85,.047,.53);
    snackBag.visible=false;
  }

  const shot=allOpts.Yuki.shot??'wide';
  if(freeCamera){
    camera.position.set(...freeCamera.pos);
    camera.lookAt(...freeCamera.lookAt);
    camera.fov=freeCamera.fov??35;camera.updateProjectionMatrix();
  }else{
    const c=camFor(shot,t,entry);
    camera.position.set(...c.pos);camera.lookAt(...c.look);
    camera.fov=c.fov;camera.updateProjectionMatrix();
  }

  renderer.render(kitchen.scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  const subtitle=drawSubtitle(t,seg);
  return {index:entry.index,t,segment:seg.id,shot,subtitle,
    move:allOpts.Yuki.move,catMove:allOpts.Mochi.move,gesture:posed.gesture,
    yukiLip:{jaw:Math.round(lip.jaw*1000)/1000,char:lip.char},
    mouth:mouthState,mochi:mochiState,
    feet:posed.feet,root:actor.mesh.position.toArray(),catRoot:cat.mesh.position.toArray(),
    dish:home.dish.visible,jerky:jerky.visible,carry:carryPlate.visible,carryPos:carryPlate.position.toArray(),
    camera:camera.position.toArray()};
}
window.stepAt=t=>draw(t);
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/jpeg',.95).split(',')[1],state};};
await document.fonts.ready;window.ready=true;draw(0);
if(!query.has('capture')){
  const audio=new Audio('/craft3d/assets3d/mixed.wav');audio.loop=true;
  document.body.title='点击播放 / 暂停';document.body.onclick=()=>audio.paused?audio.play():audio.pause();
  function animate(){draw(audio.currentTime);requestAnimationFrame(animate);}animate();
}
