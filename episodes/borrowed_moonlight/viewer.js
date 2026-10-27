// 《借走月光的女孩》viewer：横屏 1280×720，四场景混合纹理 + 三程序化角色 + P4 魔法粒子/灯光调度。
// 对白=字幕条；运镜/站位/显隐由 performance.js 按拍驱动；粒子与反馈光由 effects/magic.js 驱动。
// window 契约（render.mjs 依赖）：duration / checkTimes / renderAt / stepAt / setFreeCamera / ready。
// 纪律：draw 是 (t,state) 纯函数；FX 件创建即 visible=false、update 每帧驱动；
//       renderAt 连渲两遍取沉淀帧（首渲染 GPU 资源滞后翻车实录，见 direct-animation-craft）。
import * as THREE from 'three';
import {SnowTownScene} from './scenes/SnowTownScene.js';
import {ClockTowerScene} from './scenes/ClockTowerScene.js';
import {TowerTopScene} from './scenes/TowerTopScene.js';
import {MoonPalaceScene} from './scenes/MoonPalaceScene.js';
import {makeEileen} from './characters/eileen.js';
import {makeAlder} from './characters/alder.js';
import {makeLadyMoon} from './characters/ladymoon.js';
import {beatAt,cameraFor,stagingFor,skinFor,performAt,setVoiceEnvs} from './performance.js';
import {buildMagicFX} from './effects/magic.js';

const W=1280,H=720;
const TL=await fetch('./config/timeline.json').then(r=>r.json());
window.duration=TL.duration;
// P6 口型包络（缺失=回退音节占位）
try{setVoiceEnvs(await fetch('./config/voice_envs.json').then(r=>r.ok?r.json():null));}catch{}

// 剧情锚点时刻（从 cue 表派生，不手写秒数）
const cueAt=name=>TL.segments.flatMap(s=>s.cues).find(c=>c.name===name)?.at??Infinity;
const LAMP_OUT=cueAt('LAMP_OUT'),LAMP_RELIGHT=cueAt('LAMP_RELIGHT');

const scenes={
  snowtown:new SnowTownScene(),clocktower:new ClockTowerScene(),
  towertop:new TowerTopScene(),moonpalace:new MoonPalaceScene(),
};
for(const s of Object.values(scenes)){s.build();await s.applyHybrid?.();} // P3：文生图纹理/背景板注入（无纹理目录则静默回退程序化）
const actors={Eileen:makeEileen(),Alder:makeAlder(),LadyMoon:makeLadyMoon()};
// P4 魔法粒子 + 灯光反馈（粒子系统/锚点/终幕文字装配，全部 LCG 确定性 + 活体锚点）
const fx=buildMagicFX({scenes,actors,TL});

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d');
const camera=new THREE.PerspectiveCamera(44,W/H,.05,200); // fov,aspect=W/H,near,far——参数错位会渲染成竖缝

// ── 字幕（底部描边条，角色分色）──
const SUB_COLOR={Eileen:'#cfe0ff',Alder:'#ffd9a0',LadyMoon:'#e8e4f4',Narrator:'#d8d4c8'};
function drawSubtitle(t){
  const sub=TL.subtitles.find(s=>t>=s.start-.06&&t<s.end);
  if(!sub||!sub.text)return null;
  const fragments=(sub.text.match(/[^，。！？…—]+[，。！？…—]?/g)??[sub.text])
    .flatMap(f=>{const out=[];while(f.length>24){out.push(f.slice(0,24));f=f.slice(24);}if(f)out.push(f);return out;});
  const lines=[];let line='';
  for(const f of fragments){
    if((line+f).length>24&&line){lines.push(line);line='';}
    line+=f;
    if(/[！？]$/.test(f)){lines.push(line);line='';}
  }if(line)lines.push(line);
  const y=H-56-(lines.length-1)*34;
  ctx.font='bold 25px Microsoft YaHei';ctx.textAlign='center';ctx.lineWidth=6;ctx.lineJoin='round';
  for(let i=0;i<lines.length;i++){
    ctx.strokeStyle='rgba(12,12,18,.88)';ctx.fillStyle=SUB_COLOR[sub.character]??'#fff';
    ctx.strokeText(lines[i],W/2,y+i*34);ctx.fillText(lines[i],W/2,y+i*34);
  }
  return sub.text;
}

function draw(t,capture=true){
  const {seg,i,u}=beatAt(TL.segments,t);
  const stage=scenes[seg.scene];
  if(seg.scene==='snowtown')stage.setSkin(skinFor(seg));
  // 角色按拍归置（reparent 到当前场景；不可见=visible=false）；P5：姿势/表情/视线/道具全部由
  // 表演谱 performAt 驱动（(t,state) 纯函数），位置/yaw/根高由 buildPose/performAt 写定
  const staging=stagingFor(seg);
  for(const [name,g] of Object.entries(actors)){
    const st=staging[name];
    if(st.visible&&g.parent!==stage.scene)stage.scene.add(g);
  }
  const perf=performAt({actors,scenes,TL,staging},seg,t,u);
  // 铜灯灯芯：LAMP_OUT 熄灭 → LAMP_RELIGHT 重亮（cue 表绝对秒）；FADE@473 灯火缓灭
  const flame=actors.Eileen.userData.flame;
  flame.visible=!(t>=LAMP_OUT&&t<LAMP_RELIGHT);
  const fadeK=t<473?1:Math.max(0,(477.5-t)/4.5);
  flame.material.opacity=.95*fadeK;
  actors.Eileen.userData.lamp.userData.glow.material.opacity=.22*fadeK;
  stage.update(t);

  const c=window.freeCamera
    ?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??44}
    :cameraFor(seg,u);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();
  fx.update(t,seg,camera); // 粒子/反馈光在相机就位后更新（点尺寸按 fov 换算）

  const state={entry:i+1,beat:seg.id,scene:seg.scene,phase:seg.move,shot:seg.shot,
    cam:[...c.pos,...c.look,c.fov],
    lampLit:flame.visible,
    actors:Object.fromEntries(Object.entries(actors).map(([name,g])=>[name,{
      visible:g.visible,pos:[+g.position.x.toFixed(4),+g.position.y.toFixed(4),+g.position.z.toFixed(4)],yaw:+g.rotation.y.toFixed(4)}])),
    // P5 物理门禁 trace：接触（手/灯/瓶/怀表/王座髋）+ 步态 + 臂展（contact_probe 消费）
    contact:perf.contact,locomotion:perf.locomotion,limbBody:perf.limbBody,
    // 泪点锚稳定性哨兵（只在夫人可见段记录；不可见角色不摆姿势，内部矩阵驻留是合法的）
    ...(actors.LadyMoon.visible?{tearA:fx.anchors.tearAnchor.getWorldPosition(new THREE.Vector3()).toArray().map(v=>+v.toFixed(4))}:{}),
    ...Object.fromEntries(Object.entries(perf.roots).map(([k,v])=>[k+'Root',v]))};
  if(!capture)return state;
  renderer.render(stage.scene,camera);
  renderer.render(stage.scene,camera); // 双渲染沉淀：取第二遍，顺序/seek 像素一致
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  state.subtitle=drawSubtitle(t);
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
window.renderAt=t=>draw(t);window.stepAt=t=>{try{return draw(t,false);}catch(err){throw new Error(`@t=${t} beat=${beatAt(TL.segments,t).seg.id}: ${err.message}\n${err.stack}`);}};
window.setFreeCamera=c=>window.freeCamera=c;
// A0 cel-cinema bake 接口：只读暴露活体对象树（bake 适配器经 window.stepAt 驱动当帧后读世界坐标，
// 不进 draw/state，不改变渲染路径——check 回归不变量）
window.__dbg={actors,camera,anchors:fx.anchors,scenes}; // scenes：A3 起静态锚点快照工具只读用
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
