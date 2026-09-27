// Phase 2: story timeline on the craft rig. Same data chain as the cel
// viewer.js (StoryParser entries + timeline.json + viseme tracks + voice
// features), Yuki retargeted to YukiCraft3D, Mochi as a temporary cel mix-in.
import * as THREE from 'three';
import {StoryParser, CharacterRegistry} from 'dula-engine';
import '/episode/bootstrap.js'; // registers StudioMochi (hardenToon + cleanOutline 0x25222a)
import {HomeKitchenScene} from '/episode/scenes/HomeKitchenScene.js';
import {buildHomeProps, updateHomeProps} from '/episode/home_props.js';
import {YukiCraft3D} from '/craft/character3d.js';
import {poseYukiCraft, poseMochiCel, prepareMochi} from './performance3d.js';
import {CraftMouth} from './mouth3d.js';

const W=720,H=1280;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping; // craft toon ramp is authored for this (Phase 1)
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.appendChild(canvas);
const ctx=canvas.getContext('2d');

const [storyText,TL,visemeYuki,visemeMochi,voiceFeatures]=await Promise.all([
  fetch('/episode/script.story').then(r=>r.text()),
  fetch('/episode/config/timeline.json').then(r=>r.json()),
  fetch('/episode/config/viseme_yuki.json').then(r=>r.json()),
  fetch('/episode/config/viseme_mochi.json').then(r=>r.json()),
  fetch('/episode/config/final_voice_features.json').then(r=>r.json()),
]);
const entries=StoryParser.parse(storyText);
window.duration=Math.max(...entries.map(e=>e.endTime));
if(Math.abs(window.duration-TL.duration)>.002)throw new Error('Stale media timeline');

const kitchen=new HomeKitchenScene();kitchen.build();
const actor=new YukiCraft3D();
kitchen.scene.add(actor.mesh);

// Cel ink alignment on the craft shells (same swap as Phase 1).
const inkSolid=new THREE.MeshBasicMaterial({color:0x25222a,side:THREE.BackSide});
inkSolid.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\ntransformed += normalize(normal) * 0.012;');
};
inkSolid.customProgramCacheKey=()=>'fish-craft3d-ink-v1';
const inkJoint=new THREE.MeshBasicMaterial({color:0x25222a,side:THREE.BackSide});
inkJoint.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float contour;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\ntransformed += normalize(normal) * (0.012 * contour);');
};
inkJoint.customProgramCacheKey=()=>'fish-craft3d-joint-ink-v1';
actor.mesh.traverse(o=>{
  if(!o.isMesh||o.material?.side!==THREE.BackSide)return;
  const key=o.material.customProgramCacheKey?.();
  if(key==='craft-contour-v1')o.material=inkSolid;
  else if(key==='craft-open-joint-contour-v1')o.material=inkJoint;
});
const mouth=new CraftMouth(actor.headAssembly);

// Temporary cel mix-in (Phase 3 replaces this with MochiCraft3D).
const cat=new CharacterRegistry.Mochi('Mochi');
kitchen.scene.add(cat.mesh);
prepareMochi(cat);
const home=buildHomeProps(kitchen.scene,cat);

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
  const mouthState=mouth.apply(lip);
  const mochiState=poseMochiCel(cat,allOpts.Mochi,entry,tq,beatTimes,catLip);
  updateHomeProps(home,t,entry,allOpts);

  const shot=allOpts.Yuki.shot??'wide';
  const distance=shot==='evidence'?3.10:shot==='cat'?3.55:shot==='yuki'?3.8:6.25;
  const targetY=shot==='evidence'?.69:shot==='cat'?.70:shot==='yuki'?1.22:1.00;
  const focusX=['cat','evidence'].includes(shot)?.69:shot==='yuki'?-.43:.05;
  camera.position.set(focusX+.025*Math.sin(t*.6),targetY+.10,distance);
  camera.lookAt(focusX,targetY,0);
  camera.fov=35;camera.updateProjectionMatrix();

  renderer.render(kitchen.scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  const subtitle=drawSubtitle(t,seg);
  return {index:entry.index,t,segment:seg.id,shot,subtitle,
    move:allOpts.Yuki.move,catMove:allOpts.Mochi.move,gesture:posed.gesture,
    yukiLip:{jaw:Math.round(lip.jaw*1000)/1000,char:lip.char},
    mouth:mouthState,mochi:mochiState,
    feet:posed.feet,root:actor.mesh.position.toArray(),catRoot:cat.mesh.position.toArray(),
    camera:camera.position.toArray()};
}
window.stepAt=t=>draw(t);
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/jpeg',.95).split(',')[1],state};};
await document.fonts.ready;window.ready=true;draw(0);
if(!new URLSearchParams(location.search).has('capture')){
  const audio=new Audio('/episode/assets/audio/mixed.wav');audio.loop=true;
  document.body.title='点击播放 / 暂停';document.body.onclick=()=>audio.paused?audio.play():audio.pause();
  function animate(){draw(audio.currentTime);requestAnimationFrame(animate);}animate();
}
