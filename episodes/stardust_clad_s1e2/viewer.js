// 《星屑战壳》S1E2《夜守·第一道伤》。时序正本 script.story，运行数据由 compile_story.py 生成。
// 夜戏原生场景+OP 纹理集（无 morningize——S1E1 晨景教训：新集纹理第一天就在）。
// 角色/场景/必杀技全 dula-assets import；夜刈=characters/stardust/characters.js YekariCraft（锚点活取）。
// 规格继承 S1E1 R13/R14：双渲染沉淀/分色字幕/口型包络/技名卡/眼部特写机位/探针 state。
// window 契约（render.mjs 依赖）：duration / checkTimes / renderAt / stepAt / setFreeCamera / ready。
import * as THREE from 'three';
import {AoaoCraft,XiaozaoCraft,DafuCraft} from 'dula-assets/characters/stardust/characters.js';
import {YekariCraft} from 'dula-assets/characters/stardust/characters.js';
import {StardustShrineScene} from 'dula-assets/scenes/stardust/StardustShrineScene.js';
import {StarfallColonnadeScene} from 'dula-assets/scenes/stardust/StarfallColonnadeScene.js';
import {PalaceGateScene} from 'dula-assets/scenes/stardust/PalaceGateScene.js';
import {createStoryFX} from './story_fx.js';
import {directLook,moderateCladGlow} from './look_direction.js';
import {directCamera,directFaces,drawRoute} from './shot_direction.js';
import {MOVES,buildMoveFX,drawMoveCard} from 'dula-assets/characters/stardust/moves.js';
import {T,PIN_PT,poseAt,clamp,ease,mix} from './performance.js';

const W=1280,H=720;
const TL=await fetch('./config/timeline.json').then(r=>r.json());
window.duration=TL.duration;
const entries=TL.segments.map(s=>({startTime:s.start,endTime:s.end,
  opts:{move:s.move,shot:s.shot,kind:s.kind,scene:s.scene}}));
const DIALOG=await fetch('./config/dialogue.json').then(r=>r.json());
let voiceEnvs=null;
try{voiceEnvs=await fetch('./config/voice_envs.json').then(r=>r.ok?r.json():null);}catch{}
const jawAt=(id,t)=>{
  const e=voiceEnvs?.lines?.find(l=>l.id===id);if(!e)return 0;
  const i=Math.floor((t-e.t0)/e.dt);
  return i<0||i>=e.jaw.length?0:e.jaw[i];
};
const lineAt=t=>DIALOG.lines.find(l=>{
  const e=voiceEnvs?.lines?.find(v=>v.id===l.id);
  const t0=e?.t0??l.t,dur=e?.dur??2.0;
  return t>=t0&&t<=t0+dur+.25;
});

// ── 场景与角色（夜版原生+纹理；两场景按段硬切；世界坐标全局连续）──
const SCENES={shrine:new StardustShrineScene(),colonnade:new StarfallColonnadeScene(),gate:new PalaceGateScene()};
for(const sc of Object.values(SCENES)){sc.build();await sc.applyHybrid();}
const actors={aoao:new AoaoCraft(),xiaozao:new XiaozaoCraft(),dafu:new DafuCraft(),
  yekari:new YekariCraft()};
directLook(actors);
const storyFX=createStoryFX(actors,SCENES);
let curScene=null;
function useScene(name){
  const sc=SCENES[name]??SCENES.shrine;
  if(curScene===sc)return sc;
  curScene=sc;
  for(const a of Object.values(actors))sc.scene.add(a.mesh);
  return sc;
}
useScene('colonnade');

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d');
const camera=new THREE.PerspectiveCamera(44,W/H,.05,200);

const lerp3=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u);
// ── 机位表（E1-E4 眼部/落点特写 + 蓄力特写 + 驭纹推近 + 余韵推镜）──
function camFor(shot,t,states){
  switch(shot){
    case 'night_wide':{const u=ease(clamp(t/14));return{pos:lerp3([9,2.4,11],[6.5,2.0,9],u),look:[0,1.4,2],fov:50};} // 旷野缓推
    case 'basins_slow':{const u=ease(clamp((t-14)/16));return{pos:lerp3([0,1.7,7.0],[0,1.5,4.6],u),look:[0,1.3,-3],fov:46};} // 火盆群慢推
    case 'fire_closeup':return{pos:[0,2.3,-1.6],look:[0,1.85,-6],fov:34}; // 圣火定场特写
    case 'mono_close':return{pos:[.95,1.28,-3.75],look:[1.3,1.15,-2.2],fov:32}; // 火光里的独白（正面）
    case 'eye_closeup':return{pos:[1.05,1.26,-3.35],look:[1.3,1.16,-2.25],fov:23}; // E1 眼部
    case 'mono_mid':return{pos:[.2,1.5,-4.7],look:[1.3,1.0,-2.2],fov:38}; // 背影+火（剪影独白）
    case 'stir_wide':return{pos:[0,1.8,8.2],look:[0,1.3,.5],fov:44}; // 他背火向外，旷野入画
    case 'enemy_silhouette':return{pos:[.5,.9,4.0],look:[3.2,1.0,8.6],fov:40}; // 低机位：先锋踏出黑暗
    case 'rally_group':return{pos:[0,1.9,7.8],look:[0,1.3,2.0],fov:46};
    case 'fight_wide':return{pos:[-4.4,1.6,6.2],look:[-.5,1.15,3.2],fov:44}; // 侧拍：盾迎接触帧要看见盾面
    case 'fight_side':return{pos:[3.6,1.5,5.8],look:[1.2,1.1,3.0],fov:42}; // 大釜侧
    case 'fight_press':return{pos:[-4.4,1.5,5.4],look:[-2.2,1.1,2.8],fov:40}; // 小凿侧
    case 'scar_closeup':return{pos:[-.85,1.32,5.0],look:[0,1.02,3.35],fov:24}; // 谷底：盾痕+盾沿上他的眼
    case 'turn_wide':return{pos:[0,2.6,9.2],look:[0,1.2,3.9],fov:46};
    case 'charge_closeup':return{pos:[-3.15,1.38,4.15],look:[-2.55,1.34,2.9],fov:23}; // E3 蓄力：盘孔亮起+他的眼
    case 'rain_burst':return{pos:[-4.4,1.7,5.0],look:[-1.4,1.3,3.6],fov:42}; // 盘侧跟拍弹雨
    case 'finisher_slam':return{pos:[.6,.9,7.6],look:[-.6,1.4,4.4],fov:46}; // 低机位落点
    case 'mark_closeup':{const m=states.yekariMarkPos??[-.9,1.2,4.7]; // F03 徽记推近（活锚点=胸口徽记）
      const u=ease(clamp((t-288)/4));
      return{pos:lerp3([m[0]-2.0,m[1]+1.9,m[2]-2.4],[m[0]-.8,m[1]+1.05,m[2]-1.15],u),look:[m[0],m[1]-.18,m[2]+.1],fov:21};}
    case 'aftermath_fire':{const u=ease(clamp((t-298)/13)); // 余韵推镜：群像背影→阿鏊落点特写（E4 要脸：终点对准头高）
      return{pos:lerp3([-.4,1.9,7.2],[-.66,1.52,1.75],u),look:lerp3([-.6,1.5,-1],[-.8,1.55,2.55],u),fov:46-21*u};}
    case 'hook_card':return{pos:[-.4,1.9,7.2],look:[-.6,1.5,-1],fov:46};
    default:return{pos:[0,3,12],look:[0,1.5,-2],fov:48};
  }
}

// ── 特效网格（S1E1 同族：冲击环/闪光火花 LCG/震尘环，全纯 t）──
const flareTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,2,64,64,64);
  gr.addColorStop(0,'#ffffff');gr.addColorStop(.3,'#ffffff');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
const impactRing=new THREE.Mesh(new THREE.TorusGeometry(1,.05,8,40),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
const dustRing=new THREE.Mesh(new THREE.TorusGeometry(1,.07,8,40),
  new THREE.MeshBasicMaterial({color:0xc9b89a,transparent:true}));
dustRing.rotation.x=-Math.PI/2;dustRing.visible=false; // 初值必须不可见（seek 倒序回放到首用前=初值状态）
const flare=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
flare.visible=false;
const sparks=[];
{let sd=13;const rr=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
 for(let i=0;i<14;i++){
   const s=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
   const a=rr()*Math.PI*2,el=rr()*1.1+.2,sp=2.2+rr()*2.6;
   s.userData={vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp,vz:Math.sin(a)*Math.cos(el)*sp};
   s.visible=false;sparks.push(s);
 }}
for(const m of [impactRing,dustRing,flare,...sparks])SCENES.shrine.scene.add(m); // 战斗主场=圣殿广场
// 必杀技 VFX 实例（锚点帧帧活取）
// ── 道具/物证（跟随活锚点=渲染层纯函数）──
// 刀路留下的盾面损伤，接触后持续到下一集。
const scarG=new THREE.Group();
{for(let i=0;i<2;i++){
  const s=new THREE.Mesh(new THREE.PlaneGeometry(.006,.22),
    new THREE.MeshBasicMaterial({color:'#4d414a',transparent:true,opacity:.85,depthWrite:false}));
  s.position.set((i-1)*.045,0,.012+i*.002);s.rotation.z=-.28+i*.06;
  scarG.add(s);}
 const dome=actors.aoao.shieldDome;
 dome.add(scarG);scarG.position.set(.02,.06,.24);scarG.rotation.x=-.10; // 盾面中上偏右（贴弧面外法线）
 scarG.visible=false;}
// 脱手滚落的打孔阵盘（206 脱手 → 244.5 拾回；物证级道具）
const droppedDisc=new THREE.Group();
{const unit=actors.xiaozao.bracerDiscUnitL.clone(true);
 const pivot=new THREE.Group();pivot.add(unit);unit.position.copy(actors.xiaozao.bracerDiscL.position).negate();
 pivot.rotation.y=Math.PI/2;droppedDisc.add(pivot);
 droppedDisc.rotation.x=-Math.PI/2;droppedDisc.position.set(-2.9,.05,3.0);
 droppedDisc.visible=false;SCENES.shrine.scene.add(droppedDisc);}
const wv2=new THREE.Vector3();
const rainFX=buildMoveFX('meteor_rain');SCENES.shrine.scene.add(rainFX.group);   // 小凿「千孔·银星雨」首秀
const slamFX=buildMoveFX('crater_slam');SCENES.shrine.scene.add(slamFX.group);   // 大釜「陨星·釜底落」终结
const reapFX=buildMoveFX('night_reap');SCENES.shrine.scene.add(reapFX.group);    // 夜刈「刈夜·无声镰弧」（敌招）
// 异动段旷野尘线（走直线的尘=反常）
const dustTrail=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,color:'#9a8a70',transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));
dustTrail.visible=false;SCENES.colonnade.scene.add(dustTrail);
function ringAt(mesh,x,y,z,t,t0,color,maxR=1.2,dur=.5){
  const u=(t-t0)/dur;
  if(u<0||u>1){mesh.visible=false;return;}
  mesh.visible=true;mesh.position.set(x,y,z);
  mesh.scale.setScalar(.2+ease(u)*maxR);mesh.material.opacity=.9*(1-u);
  mesh.material.color.set(color);mesh.lookAt(camera.position);
}
function flareAt(t,t0,x,y,z,color){
  const u=(t-t0)/.4;
  if(u<0||u>1){flare.visible=false;for(const s of sparks)s.visible=false;return;}
  flare.visible=true;flare.position.set(x,y,z);
  flare.scale.setScalar(.4+1.6*ease(u));
  flare.material.opacity=u<.12?u/.12:1-ease((u-.12)/.88);
  flare.material.color.set(color);
  const tt=u*.4;
  for(const s of sparks){const d=s.userData;s.visible=true;
    s.position.set(x+d.vx*tt,y+d.vy*tt-2.45*tt*tt,z+d.vz*tt);
    s.material.color.set(color);s.material.opacity=.9*(1-u);s.scale.setScalar(.035+.05*(1-u));}
}

// ── 画布叠加件 ──
function flash(t,t0,dur=.09,strength=.5){ // 白闪 ≤.12s
  const u=(t-t0)/dur;if(u<0||u>1)return;
  ctx.fillStyle=`rgba(255,255,255,${(1-u)*strength})`;ctx.fillRect(0,0,W,H);
}
function drawSFX(txt,color,t0,t1,t){ // 拟声词大字（接触帧）
  if(t<t0||t>t1)return;
  const u=(t-t0)/(t1-t0),pop=u<.18?u/.18:1,a=u>.75?1-(u-.75)/.25:1;
  ctx.save();ctx.translate(W*.76,H*.30);ctx.rotate(-.06);ctx.globalAlpha=a;
  ctx.font='bold 54px STKAITI,KaiTi,serif';ctx.textAlign='center';ctx.lineJoin='round';
  ctx.shadowColor=color;ctx.shadowBlur=18;ctx.lineWidth=8;ctx.strokeStyle='#101018';
  ctx.strokeText(txt,0,0);ctx.fillStyle=color;ctx.fillText(txt,0,0);
  ctx.restore();ctx.globalAlpha=1;
}
function drawTitle(t){ // 夜铺上片名（1.5-7s）
  const u=(t-1.5)/1.2;if(u<0||t>7)return;
  const a=Math.min(1,u)*(t>5.8?Math.max(0,1-(t-5.8)/1.2):1);
  ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';ctx.lineJoin='round';
  ctx.shadowColor='#8fd8ff';ctx.shadowBlur=26;ctx.lineWidth=10;ctx.strokeStyle='#0c0a14';
  ctx.font='bold 88px STKAITI,KaiTi,serif';
  ctx.strokeText('星屑战壳',W/2,H*.40);ctx.fillStyle='#ffe8c0';ctx.fillText('星屑战壳',W/2,H*.40);
  ctx.shadowBlur=0;ctx.font='bold 30px STKAITI,KaiTi,serif';
  ctx.strokeText('第二集 · 夜守',W/2,H*.40+56);ctx.fillStyle='#ffd98a';ctx.fillText('第二集 · 夜守',W/2,H*.40+56);
  ctx.restore();ctx.globalAlpha=1;
}
function drawHook(t){ // 次回字卡（312-318）
  if(t<T.HOOK||t>T.FADE)return;
  const a=ease(clamp((t-T.HOOK)/1.0))*(1-ease((t-(T.FADE-.7))/.7));
  ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';
  ctx.font='bold 44px STKAITI,KaiTi,serif';ctx.lineJoin='round';
  ctx.shadowColor='#ffd98a';ctx.shadowBlur=16;ctx.lineWidth=8;ctx.strokeStyle='#0c0a14';
  ctx.strokeText('次回 · 焰阶宫',W/2,H*.52);ctx.fillStyle='#ffe8c0';ctx.fillText('次回 · 焰阶宫',W/2,H*.52);
  ctx.restore();ctx.globalAlpha=1;
}
function drawSubtitle(t){
  const l=lineAt(t);if(!l)return;
  const name={aoao:'阿鏊',xiaozao:'小凿',dafu:'大釜',azu:'阿箸',yekari:'\u591c\u5208',hestia:'赫斯提亚'}[l.speaker];
  ctx.font='bold 26px Microsoft YaHei';ctx.textAlign='center';ctx.lineWidth=6;ctx.lineJoin='round';
  ctx.strokeStyle='rgba(16,14,20,.88)';ctx.fillStyle=DIALOG.colors[l.speaker]??'#fff';
  ctx.strokeText(`${name}：${l.text}`,W/2,H-52);
  ctx.fillText(`${name}：${l.text}`,W/2,H-52);
}
function fadeBlack(t){
  const aOut=t>T.FADE?ease((t-T.FADE)/(TL.duration-T.FADE)):0;
  if(aOut>0){ctx.fillStyle=`rgba(10,12,20,${aOut})`;ctx.fillRect(0,0,W,H);}
}

const BLINK_OFF={aoao:0,xiaozao:.83,dafu:1.61,yekari:2.2};
const autoBlink=t=>Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);

function draw(t,capture=true){
  const perf=poseAt(actors,entries,t);
  const {entry,opts,phase,states,poses}=perf;
  const scene=useScene(opts.scene);
  scene.update(t);
  // 夜刈徽记活锚点（F03 推近机位读胸口徽记）
  if(actors.yekari.mesh.visible)
    states.yekariMarkPos=actors.yekari.chestMark.getWorldPosition(new THREE.Vector3()).toArray();
  scarG.visible=t>=T.C1; // 抓痕=接触帧起的永久物证
  // 盘脱手→滚落静置→拾回（臂盘与地盘同物两态）
  const discDown=t>T.DISC_DROP&&t<244.5;
  actors.xiaozao.bracerDiscUnitL.visible=!discDown;
  droppedDisc.visible=discDown;
  if(discDown){const r=ease(clamp((t-T.DISC_DROP)/.6)); // 滚到墙根停住
    droppedDisc.position.set(mix(-2.9,-2.55,r),.05,mix(3.0,3.35,r));
    droppedDisc.rotation.z=(1-r)*2.2;}

  let c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??44}
    :camFor(opts.shot??'night_wide',t,states);
  if(!window.freeCamera)c=directCamera(t,states,actors,lineAt(t),c);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();

  // 表情/眨眼/战壳活效/视线/口型（全纯 (t,state)）
  const FIGHT_PHASES=['fight1','fight2','fight3','valley','turn','rain','finisher','downed'];
  for(const name of ['aoao','xiaozao','dafu','yekari']){
    const actor=actors[name],s=states[name];
    if(!actor.mesh.visible)continue;
    actor.setEmotion(s.emotion??'neutral',s.blink??autoBlink(t+BLINK_OFF[name]));
    actor.updateCladFX(t,s.cladT);
    moderateCladGlow(actor,t,(name==='xiaozao'&&t>=246&&t<276)||(name==='dafu'&&t>=269&&t<277)?1:0);
    if(actor.face.lookAtWorld){
      if(FIGHT_PHASES.includes(phase)) // 战斗段互盯对手；谷底/蓄力特写盯镜头（交流感）
        actor.face.lookAtWorld(opts.shot==='scar_closeup'||opts.shot==='rain_burst'||opts.shot==='mark_closeup'?camera.position
          :name==='yekari'?new THREE.Vector3(states.aoao.rootX,1.3,states.aoao.rootZ)
          :new THREE.Vector3(states.yekari?.rootX??0,1.4,states.yekari?.rootZ??5));
      else if(phase==='mono_a'||phase==='mono_eye'||phase==='mono_c')
        actor.face.lookAtWorld(phase==='mono_eye'?camera.position:new THREE.Vector3(0,1.6,-6)); // 独白看火，E1 看镜头
      else actor.face.lookAtWorld(camera.position);
    }
  }
  const active=lineAt(t);
  directFaces(t,states,actors,DIALOG,active);
  for(const name of ['aoao','xiaozao','dafu','yekari'])
    actors[name].mouth.apply({jaw:active?.speaker===name?jawAt(active.id,t):0,width:1});

  // ── 特效事件（锚点=活体 getWorldPosition/谱面常量）──
  if(Math.abs(t-T.C1)<.5){const d=actors.aoao.shieldDome.getWorldPosition(new THREE.Vector3());
    ringAt(impactRing,d.x,d.y,d.z,t,T.C1,'#8fd8ff',1.2,.45);flareAt(t,T.C1,d.x,d.y,d.z,'#d4ecff');}
  else if(Math.abs(t-T.C2)<.5){const p=actors.yekari.caps.left.getWorldPosition(new THREE.Vector3());
    ringAt(impactRing,p.x,p.y,p.z,t,T.C2,'#ffb35e',1.0,.4);flareAt(t,T.C2,p.x,p.y,p.z,'#ffe8c8');}
  else if(Math.abs(t-T.DISC_DROP)<.5){ringAt(dustRing,states.xiaozao.rootX,.03,states.xiaozao.rootZ,t,T.DISC_DROP,'#c9b89a',.9,.5);}
  else{impactRing.visible=false;flare.visible=false;for(const s of sparks)s.visible=false;}
  if(Math.abs(t-T.BOLT)<.6)ringAt(dustRing,states.yekari?.rootX??0,.05,states.yekari?.rootZ??4.6,t,T.BOLT,'#8a7a66',1.6,.5);
  else if(Math.abs(t-T.DISC_DROP)>=.5)dustRing.visible=false; // 不在窗口即隐（含倒序回放路径）
  // 必杀技：银星雨（盘锚点扇形弹雨，c3 压点）/ 釜底落（c4 砸落爆发）——
  // 每帧都 update（OP 纪律）：FX builder 自管窗口外隐藏；只在窗口内调用=初始态停在原点裸奔
  {const disc=actors.xiaozao.bracerDiscL.getWorldPosition(wv2);
   rainFX.group.visible=false;}
  {const tip=actors.yekari.sickleTip.getWorldPosition(new THREE.Vector3());
   const fwd=new THREE.Vector3(states.aoao.rootX-states.yekari.rootX,0,states.aoao.rootZ-states.yekari.rootZ).normalize();
   reapFX.update(t,T.C1-.6,tip,fwd);}
  slamFX.update(t,T.C4,new THREE.Vector3(PIN_PT[0],0,PIN_PT[2]));
  // 异动段尘线（旷野里走直线的尘）
  if(phase==='stir'||phase==='reveal'){
    const u=clamp((t-104)/14);
    dustTrail.visible=true;dustTrail.position.set(3.5,.55,16-9*u);
    dustTrail.scale.set(.8+2.2*u,.5+.3*u,1);dustTrail.material.opacity=.2+.25*u;
  }else dustTrail.visible=false;

  // ── 探针 state（contact/gait/reach/clad_fit）──
  const hands={},arms={},limbBody={},torsoAxis={},wv=new THREE.Vector3();
  const ARM_LEN={aoao:.39,xiaozao:.36,dafu:.45,yekari:.41},AXIS={aoao:1.47,xiaozao:1.37,dafu:1.65,yekari:1.56};
  const HIP={aoao:.87,xiaozao:.81,dafu:.96,yekari:.93};
  for(const name of ['aoao','xiaozao','dafu','yekari']){
    hands[name]={};arms[name]={};
    torsoAxis[name]=[[0,HIP[name],0],[0,AXIS[name],0]];
    for(const side of ['left','right']){
      hands[name][side]=actors[name].hands[side].getWorldPosition(new THREE.Vector3()).toArray();
      const arm=poses[name]?.[side==='left'?'leftArm':'rightArm'];
      if(arm){
        arms[name][side]=[[arm[0].x,arm[0].y,arm[0].z],[arm[1].x,arm[1].y,arm[1].z],[arm[2].x,arm[2].y,arm[2].z]];
        const d=Math.hypot(arm[2].x-arm[0].x,arm[2].y-arm[0].y,arm[2].z-arm[0].z);
        limbBody[name+(side==='left'?'L':'R')]={reach:d/ARM_LEN[name]};
      }
    }
  }
  storyFX.update(t,states);
  const locomotion={};
  for(const name of ['aoao','xiaozao','dafu','yekari'])
    if(poses[name]?.locomotion)locomotion[name]=poses[name].locomotion;
  const yk=states.yekari??{};
  const yekariKeys={};
  if(actors.yekari.mesh.visible){
    yekariKeys.yekariOn=1;
    yekariKeys.yekariSickle=actors.yekari.sickleTip.getWorldPosition(new THREE.Vector3()).toArray();
    yekariKeys.yekariShoulderL=actors.yekari.caps.left.getWorldPosition(new THREE.Vector3()).toArray();
    yekariKeys.yekariShoulderR=actors.yekari.caps.right.getWorldPosition(new THREE.Vector3()).toArray();
    yekariKeys.yekariChest=actors.yekari.chestMark.getWorldPosition(new THREE.Vector3()).toArray();
    yekariKeys.yekariRoot=[yk.rootX,0,yk.rootZ];
  }
  const metrics={};
  for(const name of ['aoao','xiaozao','dafu','yekari']){
    const f=actors[name].lastFit;
    if(f)for(const [k,v] of Object.entries(f))metrics[`${name}.${k}`]=v;
  }
  const state={entry:entries.indexOf(entry)+1,phase,shot:opts.shot,scene:opts.scene,
    clad:{aoao:states.aoao.cladT,xiaozao:states.xiaozao.cladT,dafu:states.dafu.cladT,yekari:states.yekari.cladT},
    aoaoRoot:[states.aoao.rootX,states.aoao.rootZ],
    xiaozaoRoot:[states.xiaozao.rootX,states.xiaozao.rootZ],
    dafuRoot:[states.dafu.rootX,states.dafu.rootZ],
    limbBody,
    contact:{hands,arms,torsoAxis,
      aR:hands.aoao.right,
      dafuL:hands.dafu.left,dafuR:hands.dafu.right,
      shieldA:actors.aoao.shieldDome.getWorldPosition(wv).toArray(),
      dafuChest:actors.dafu.body.localToWorld(new THREE.Vector3(0,1.43,.13)).toArray(),
      xiaoDisc:actors.xiaozao.bracerDiscL.getWorldPosition(new THREE.Vector3()).toArray(),
      metrics,...yekariKeys},
    ...(Object.keys(locomotion).length?{locomotion}:{})};
  if(actors.yekari.mesh.visible)state.yekariRoot=[yk.rootX,yk.rootZ];
  if(!capture)return state;
  // 双渲染沉淀（R13 教训：大姿态跳变后首渲染 GPU 滞后，两遍取沉淀帧）
  renderer.render(scene.scene,camera);
  renderer.render(scene.scene,camera);
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  // ── 画布叠加层 ──
  if(phase==='wind_colonnade')drawTitle(t);
  flash(t,T.C1,.06,.13);flash(t,T.C2,.06,.12);flash(t,T.C4,.08,.16);
  drawMoveCard(ctx,W,H,{name:MOVES.meteor_rain.name,color:MOVES.meteor_rain.color,t,t0:T.CALL1,dur:.95});
  drawMoveCard(ctx,W,H,{name:MOVES.crater_slam.name,color:MOVES.crater_slam.color,t,t0:T.CALL2,dur:.95});
  drawRoute(ctx,W,H,t);
  drawSubtitle(t);
  drawHook(t);
  fadeBlack(t);
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.setFreeCamera=c=>window.freeCamera=c;
window.setSolo=n=>window.soloName=n;
window.__dbg={actors,SCENES,camera,renderer}; // 诊断句柄（渲染无副作用）
// check 抽帧表：条目始/中/末 + 全部事件帧 + E1-E4 + 驭纹
window.checkTimes=[...entries.flatMap(e=>[e.startTime+.15,(e.startTime+e.endTime)/2,e.endTime-.10]),
  T.EYE1,T.STIR+6,T.REVEAL+2,T.RALLY+1,T.C1,T.C2,T.DISC_DROP,T.SCAR,T.EYE2,T.STALL+2,
  T.EYE3,T.CALL1,T.C3,T.FIN_CHARGE,T.CALL2,T.C4,T.MARK+1,T.BOLT,T.HESTIA+1,T.EYE4]
  .filter(t=>t>0&&t<TL.duration).sort((a,b)=>a-b);
await document.fonts.ready;window.ready=true;
