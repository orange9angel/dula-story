// 《明天还会亮》viewer（T1 3D 底稿）：1280×720，七场景占位 + M-07 + 道具时间线。
// 对白=底部字幕条（EVA/女孩，全部画外）；屏显=顶部等宽 OSD（cue 驱动）；
// 片尾 TITLE_CARD@477 片名淡入、FADE@479.5 黑场；开场 0→0.6s 从 30% 亮度淡入（首帧非黑纪律）。
// window 契约（render.mjs 依赖）：duration / checkTimes / renderAt / stepAt / setFreeCamera / ready。
// 纪律：draw 是 (t,state) 纯函数；道具/FX 每帧全字段驱动；renderAt 连渲两遍取沉淀帧。
import * as THREE from 'three';
import {CorridorScene} from './scenes/CorridorScene.js';
import {GreenhouseScene} from './scenes/GreenhouseScene.js';
import {WarehouseScene} from './scenes/WarehouseScene.js';
import {LoungeScene} from './scenes/LoungeScene.js';
import {PowerRoomScene} from './scenes/PowerRoomScene.js';
import {CockpitScene} from './scenes/CockpitScene.js';
import {SpaceStationExtScene} from './scenes/SpaceStationExtScene.js';
import {makeM07} from './characters/m07.js';
import {makeProps} from './characters/props.js';
import {beatAt,cameraFor,performAt} from './performance.js';

const W=1280,H=720;
const TL=await fetch('./config/timeline.json').then(r=>r.json());
window.duration=TL.duration;

const scenes={
  corridor:new CorridorScene(),greenhouse:new GreenhouseScene(),
  warehouse:new WarehouseScene(),lounge:new LoungeScene(),
  powerroom:new PowerRoomScene(),cockpit:new CockpitScene(),
  exterior:new SpaceStationExtScene(),
};
for(const s of Object.values(scenes))s.build();
const m07=makeM07(),props=makeProps();

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d');
const camera=new THREE.PerspectiveCamera(44,W/H,.05,400); // fov,aspect=W/H,near,far——参数错位会渲染成竖缝

// ── 屏显 OSD（cue 名 → 文本；出现 2.6s，顶部等宽体）──
const OSD={
  OSD_NONESSENTIAL:['NON-ESSENTIAL OBJECT','#9fe8ff'],
  OSD_LIFE:['LIFE SIGNAL DETECTED — SURVIVAL 2.1%','#9fe8ff'],
  OSD_SHUTTLE:['SHUTTLE READY / AUX BATTERY 38%','#9fe8ff'],
  OSD_DISABLES:['REMOVAL DISABLES LAUNCH','#ffb050'],
  OSD_CRITICAL:['CORE POWER CRITICAL','#ff5040'],
  OSD_LOWPOWER:['LOW-POWER LIGHT ONLINE','#ffd9a0'],
  OSD_HABITAT:['HABITAT STABLE / LIGHT ON','#9fe8ff'],
  OSD_SUNRISE:['NEXT SUNRISE 06:42','#ffd9a0'],
};
const cueAt=name=>TL.segments.flatMap(s=>s.cues).find(c=>c.name===name)?.at??Infinity;
function drawOSD(t){
  for(const [name,[text,color]] of Object.entries(OSD)){
    const at=cueAt(name);
    if(t>=at&&t<at+2.6){
      ctx.font='bold 22px monospace';ctx.textAlign='center';
      const w=ctx.measureText(text).width+36;
      ctx.fillStyle='rgba(8,14,22,.72)';ctx.fillRect(W/2-w/2,28,w,38);
      ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.strokeRect(W/2-w/2,28,w,38);
      ctx.fillStyle=color;ctx.fillText(text,W/2,54);
      return name;
    }
  }
  return null;
}
// ── 字幕（EVA 播报 / 女孩录音，全部画外音→统一中性色）──
function drawSubtitle(t){
  const sub=TL.subtitles.find(s=>t>=s.start-.06&&t<s.end);
  if(!sub||!sub.text)return null;
  ctx.font='bold 25px Microsoft YaHei';ctx.textAlign='center';ctx.lineWidth=6;ctx.lineJoin='round';
  const color=sub.character==='Girl'?'#ffd9a0':'#cfe0ff';
  ctx.strokeStyle='rgba(12,12,18,.88)';ctx.fillStyle=color;
  ctx.strokeText(sub.text,W/2,H-52);ctx.fillText(sub.text,W/2,H-52);
  return sub.text;
}
// ── 片名/淡入淡出 ──
const TITLE_AT=cueAt('TITLE_CARD'),FADE_AT=cueAt('FADE');
function drawOverlay(t){
  if(t<.6){ctx.fillStyle=`rgba(4,6,10,${.7*(1-t/.6)})`;ctx.fillRect(0,0,W,H);} // 首帧非黑：30% 亮度起
  if(t>=TITLE_AT){
    const a=Math.min(1,(t-TITLE_AT)/.8);
    ctx.font='bold 44px "Kaiti SC","STKaiti",serif';ctx.textAlign='center';
    ctx.fillStyle=`rgba(240,236,224,${a})`;ctx.fillText('明天还会亮',W/2,H/2);
  }
  if(t>=FADE_AT){const a=Math.min(1,(t-FADE_AT)/.5);ctx.fillStyle=`rgba(2,3,6,${a})`;ctx.fillRect(0,0,W,H);}
}

function draw(t,capture=true){
  const {seg,i,u}=beatAt(TL.segments,t);
  const stage=scenes[seg.scene];
  if(m07.parent!==stage.scene)stage.scene.add(m07);
  stage.update(t);
  const perf=performAt({m07,props,scenes,TL,stage},seg,t,u);

  const c=window.freeCamera
    ?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??44}
    :cameraFor(seg,u);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();

  const state={entry:i+1,beat:seg.id,scene:seg.scene,phase:seg.move,shot:seg.shot,
    cam:[...c.pos,...c.look,c.fov].map(v=>+v.toFixed(4)),
    m07Visible:m07.visible,
    contact:perf.contact,locomotion:perf.locomotion,roots:perf.roots};
  if(!capture)return state;
  renderer.render(stage.scene,camera);
  renderer.render(stage.scene,camera); // 双渲染沉淀：取第二遍，顺序/seek 像素一致
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  state.osd=drawOSD(t);
  state.subtitle=drawSubtitle(t);
  drawOverlay(t);
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
window.renderAt=t=>draw(t);window.stepAt=t=>{try{return draw(t,false);}catch(err){throw new Error(`@t=${t} beat=${beatAt(TL.segments,t).seg.id}: ${err.message}\n${err.stack}`);}};
window.setFreeCamera=c=>window.freeCamera=c;
// check 抽帧表：每拍 始/中/末 三点 + 全部 cue 绝对秒（交互/特效事件帧）
window.checkTimes=[...new Set([...TL.segments.flatMap(s=>[s.start+.15,(s.start+s.end)/2,s.end-.10]),
  ...TL.segments.flatMap(s=>s.cues.map(c=>c.at+.05))]
  .filter(t=>t>0&&t<TL.duration))].sort((a,b)=>a-b);
await document.fonts.ready;window.ready=true;
if(!new URLSearchParams(location.search).has('capture')){
  let playing=false,tt=0,last=0;
  const play=document.createElement('button');play.textContent='播放 / 暂停';
  play.style.cssText='position:fixed;bottom:14px;left:14px;z-index:3;padding:10px 18px;border:0;border-radius:22px;background:#e8ecf4;color:#141820;cursor:pointer';
  document.body.append(play);
  play.onclick=()=>{playing=!playing;last=performance.now();};
  const seek=document.createElement('input');seek.type='range';seek.min=0;seek.max=window.duration;seek.step=.01;
  seek.style.cssText='position:fixed;bottom:24px;left:160px;width:min(45vw,400px)';document.body.append(seek);
  seek.oninput=()=>{tt=Number(seek.value);};
  (function tick(){
    if(playing){const n=performance.now();tt=Math.min(window.duration-.01,tt+(n-last)/1000);last=n;}
    draw(tt);if(document.activeElement!==seek)seek.value=tt;requestAnimationFrame(tick);
  })();
}
