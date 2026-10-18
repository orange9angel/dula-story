// R9 场景升级：交锋主链=星辉内殿（AstralPalace），小凿=幽荧之河（Gloomriver），
// 大釜=云巅圣峰（CloudPeak）；gag/outro 回圣殿（女神住圣殿）。世界坐标全局连续。
// R10 场景扩展：交锋主链=星屑角斗场（StarArena）；登场：阿鏊宫殿/小凿海底/大釜云巅；
// v2 冲锋=门阙/海底/角斗场；f4 幽荧河/f6f8 云巅保持（R9 资产保留出镜）。
// P3 正式谱面 49.2s（152BPM，条目边界吸附 beatgrid）：打斗快切机位硬切（卡点语法），
// 特写机位在角色面朝 ±60° 内、距离 ≥3.0m。特效件抄 s1e2 模式：冲击环锚真实接触点、
// 火花粒子 LCG、白闪 ≤.55、拟声词大字、地面裂缝+碎石。纯 (t,state) 确定函数。
// window 契约（render.mjs 依赖）：duration / checkTimes / renderAt / stepAt / setFreeCamera / ready。
import * as THREE from 'three';
import {AoaoCraft,XiaozaoCraft,DafuCraft,HestiaCraft} from 'dula-assets/characters/stardust/characters.js';
import {StardustShrineScene} from 'dula-assets/scenes/stardust/StardustShrineScene.js';
import {AstralPalaceScene} from 'dula-assets/scenes/stardust/AstralPalaceScene.js';
import {GloomriverScene} from 'dula-assets/scenes/stardust/GloomriverScene.js';
import {CloudPeakScene} from 'dula-assets/scenes/stardust/CloudPeakScene.js';
import {StarArenaScene} from 'dula-assets/scenes/stardust/StarArenaScene.js';
import {PalaceGateScene} from 'dula-assets/scenes/stardust/PalaceGateScene.js';
import {DeepseaRuinsScene} from 'dula-assets/scenes/stardust/DeepseaRuinsScene.js';
import {poseAt,ease,clamp,T,BLOCK_PT,CLASH_PT,LAND_PT,HESTIA_SEAT} from './performance.js';
// R11 必杀技：技名卡+喊招压拍+VFX（资产库 moves.js；喊招摆点 config/calls.json 实测回推）
import {MOVES,buildMoveFX,drawMoveCard} from 'dula-assets/characters/stardust/moves.js';

const W=1280,H=720;
window.debugFit=new URLSearchParams(location.search).has('debugFit'); // clad_fit 调试探针开关
const TL=await fetch('./config/timeline.json').then(r=>r.json());
window.duration=TL.duration;
const entries=TL.segments.map(s=>({startTime:s.start,endTime:s.end,
  opts:{move:s.move,shot:s.shot,kind:s.kind,scene:s.scene}}));

// R9 多场景：四场景同存，按段 scene 字段硬切（角色世界坐标全局连续，Object3D
// 单父级 reparent 无渐隐穿帮；柱廊/火山口仍在资产库，本集不再使用）
const SCENES={shrine:new StardustShrineScene(),palace:new AstralPalaceScene(),
  gloomriver:new GloomriverScene(),cloudpeak:new CloudPeakScene(),
  arena:new StarArenaScene(),palacegate:new PalaceGateScene(),deepsea:new DeepseaRuinsScene()};
for(const sc of Object.values(SCENES)){sc.build();await sc.applyHybrid();}
const actors={aoao:new AoaoCraft(),xiaozao:new XiaozaoCraft(),dafu:new DafuCraft(),hestia:new HestiaCraft()};
SCENES.shrine.scene.add(actors.hestia.mesh);actors.hestia.mesh.visible=false; // 女神只住圣殿（outro 登场）
// 女神台词口型：能量包络视素轨（build_audio.py 从 hestia_line.wav 生成；缺失静默降级闭嘴）
let voiceEnv=null;
try{voiceEnv=await fetch('./config/hestia_voice_env.json').then(r=>r.ok?r.json():null);}catch{}
const jawAt=t=>{
  if(!voiceEnv)return 0;
  const i=Math.floor((t-voiceEnv.t0)/voiceEnv.dt);
  return i<0||i>=voiceEnv.jaw.length?0:voiceEnv.jaw[i];
};
// R10 特效分挂：瞬态特效（冲击环/闪光/火花/震尘环）随 fxGroup 跟当前场景 reparent；
// 落地裂缝+碎石常驻交锋主场（R10=角斗场沙场）；gag 星屑汇聚常驻圣殿
const fxGroup=new THREE.Group();
let curScene=null;
function useScene(name){
  const sc=SCENES[name]??SCENES.shrine;
  if(curScene===sc)return sc;
  curScene=sc;
  for(const a of Object.values(actors))sc.scene.add(a.mesh);
  sc.scene.add(fxGroup);
  return sc;
}
useScene('shrine');

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d');
const camera=new THREE.PerspectiveCamera(44,W/H,.05,200);

const lerp3=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u);
const HEAD_Y={aoao:1.62,xiaozao:1.50,dafu:1.80};
// ── 机位表（特写=角色前方追踪/固定，距离 ≥3.0m、面朝 ±60° 内；快切段硬切）──
function camFor(shot,t,entry,states){
  const u=entry?ease(clamp((t-entry.startTime)/(entry.endTime-entry.startTime))):0;
  const track=(name,dx,fov=40)=>{
    const s=states[name],hy=HEAD_Y[name]+s.bob;
    return {pos:[s.rootX+dx,hy+.22,s.rootZ+3.5],look:[s.rootX,hy,s.rootZ],fov};
  };
  switch(shot){
    case 'establish':return{pos:lerp3([0,5.4,17],[0,4.4,14],ease(clamp((t-2.113)/1.2))),look:[0,2.4,-6],fov:50};
    case 'clad_aoao':return track('aoao',.7);
    case 'clad_xiaozao':{ // 柱廊建立帧 → 推近特写（前臂横抬胸前，打孔阵盘面翻出）
      const s=states.xiaozao,k=ease(clamp(u/.30));
      const wide={pos:[s.rootX+4.5,3.1,s.rootZ+8.6],look:[s.rootX,1.3,s.rootZ],fov:48};
      const close={pos:[s.rootX-.55,1.32,s.rootZ+3.2],look:[s.rootX+.05,1.10,s.rootZ+.20],fov:34};
      return {pos:lerp3(wide.pos,close.pos,k),look:lerp3(wide.look,close.look,k),fov:wide.fov+(close.fov-wide.fov)*k};
    }
    case 'clad_dafu':{ // 火山口建立帧 → 推近
      const s=states.dafu,k=ease(clamp(u/.30)),tr=track('dafu',.85);
      const wide={pos:[s.rootX+4.2,3.3,s.rootZ+9.0],look:[s.rootX,1.5,s.rootZ],fov:48};
      return {pos:lerp3(wide.pos,tr.pos,k),look:lerp3(wide.look,tr.look,k),fov:wide.fov+(tr.fov-wide.fov)*k};
    }
    case 'f_two':return{pos:[-.4,1.5,5.6],look:[-.45,1.3,1.8],fov:46};
    case 'f_track':return{pos:lerp3([-2.6,1.4,4.6],[0.4,1.35,4.4],u),look:[states.aoao.rootX,1.35,states.aoao.rootZ],fov:40};
    case 'f_block':return{pos:[-.5,1.55,4.3],look:BLOCK_PT,fov:38};
    case 'f_xiao':return{pos:[-1.18,1.45,2.08],look:[-4.4,1.32,2.8],fov:36}; // 小凿面朝扇区内（其 yaw≈103°）
    case 'f_clash':return{pos:[-.75,1.05,4.4],look:CLASH_PT,fov:36};
    case 'f_wide':return{pos:[-.5,2.2,7.5],look:[-.3,1.2,1.85],fov:44};
    case 'f_knock':return{pos:[-1.0,1.7,6.2],look:[states.aoao.rootX,.9+states.aoao.air,states.aoao.rootZ],fov:40};
    case 'f_laugh':return{pos:[-1.0,1.35,5.2],look:[.3,1.35,1.95],fov:40};
    case 'f_wide2':return{pos:[.6,2.4,8.6],look:[-.8,1.2,1.9],fov:44};
    case 'f_prep':return{pos:[-.9,1.5,7.2],look:[-1.1,1.3,1.9],fov:40};
    case 'v2_low':return{pos:[-.9,.55,7.8],look:[-.9,1.75,2.6],fov:50}; // 低机位仰拍冲锋
    // 三场景各 1 镜低机位冲锋（聚焦各自场景的主角）
    case 'v2_low_aoao':case 'v2_low_xiaozao':case 'v2_low_dafu':{
      const name=shot.replace('v2_low_',''),s=states[name];
      return {pos:[s.rootX+.8,.72,s.rootZ+3.6],look:[s.rootX,1.45,s.rootZ],fov:50};
    }
    case 'v2_gag':return{pos:[-.5,.95,9.0],look:[-.3,2.1,2.6],fov:48};
    case 'v2_pose':return{pos:lerp3([-.5,1.7,8.8],[-.5,1.55,7.8],u),look:[-.6,1.95,2.8],fov:42};
    case 'v2_hold':return{pos:lerp3([-.5,1.55,7.8],[1.0,1.8,7.6],u),look:[-.6,1.9,2.8],fov:42};
    case 'out_wide':return{pos:[-.5,2.0,9.8],look:[-1.0,1.5,2.2],fov:44};
    case 'out_reveal':{ // 定格群像 → 摇向大锅圣物（女神坐锅沿揭晓）
      const k=ease(clamp(u/.8));
      return{pos:lerp3([-.5,2.0,9.8],[1.9,4.4,-.4],k),look:lerp3([-1.0,1.5,2.2],[HESTIA_SEAT.x,4.28,HESTIA_SEAT.z],k),fov:44-6*k};
    }
    case 'out_goddess':return{pos:[1.9,4.35,-.7],look:[HESTIA_SEAT.x,4.28,HESTIA_SEAT.z],fov:36}; // 3/4 近景（距 ~3.9m，面朝 ±60° 内）
    case 'out_pot':return{pos:[0,2.3,7.2],look:[0,3.6,-5.6],fov:46}; // 锅+女神+下方定格群像
    default:return{pos:[0,3,12],look:[0,1.5,-2],fov:48};
  }
}

// ── 特效网格（时间驱动，确定性）──
const dustRing=new THREE.Mesh(new THREE.TorusGeometry(1,.07,8,40),
  new THREE.MeshBasicMaterial({color:0xc9b89a,transparent:true}));
dustRing.rotation.x=-Math.PI/2;fxGroup.add(dustRing);
const impactRing=new THREE.Mesh(new THREE.TorusGeometry(1,.05,8,40),
  new THREE.MeshBasicMaterial({color:0x3DFFC8,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
fxGroup.add(impactRing);
function ringAt(mesh,x,y,z,t,t0,color,maxR=1.8,dur=.55){
  const u=(t-t0)/dur;
  if(u<0||u>1){mesh.visible=false;return;}
  mesh.visible=true;mesh.position.set(x,y,z);
  mesh.scale.setScalar(.2+ease(u)*maxR);mesh.material.opacity=.9*(1-u);
  mesh.material.color.set(color);mesh.lookAt(camera.position);
}
// 真光效（加色混合 sprite）：接触闪光 + 火花迸溅（LCG 确定性种子）
const flareTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,2,64,64,64);
  gr.addColorStop(0,'#ffffff');gr.addColorStop(.3,'#ffffff');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
const flare=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
flare.visible=false;fxGroup.add(flare);
const sparks=[];
{let sd=13;const rr=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
 for(let i=0;i<16;i++){
   const s=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
   const a=rr()*Math.PI*2,el=rr()*1.1+.2,sp=2.5+rr()*3;
   s.userData={vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp,vz:Math.sin(a)*Math.cos(el)*sp};
   s.visible=false;fxGroup.add(s);sparks.push(s);
 }}
function flareAt(t,t0,x,y,z,color){
  const u=(t-t0)/.5;
  if(u<0||u>1){flare.visible=false;for(const s of sparks)s.visible=false;return;}
  flare.visible=true;flare.position.set(x,y,z);
  flare.scale.setScalar(.5+2.2*ease(u));
  flare.material.opacity=u<.12?u/.12:1-ease((u-.12)/.88);
  flare.material.color.set(color);
  const tt=u*.5;
  for(const s of sparks){const d=s.userData;s.visible=true;
    s.position.set(x+d.vx*tt,y+d.vy*tt-2.45*tt*tt,z+d.vz*tt);
    s.material.color.set(color);s.material.opacity=.9*(1-u);s.scale.setScalar(.04+.06*(1-u));}
}
// 击飞落点：地面径向裂缝（命中后常驻）+ 碎石飞溅
const crackGroup=new THREE.Group();crackGroup.visible=false;SCENES.arena.scene.add(crackGroup);
{
  const cm=new THREE.MeshBasicMaterial({color:0x141820});
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2+.3,len=.5+((i*37)%10)/10*.7;
    const seg=new THREE.Mesh(new THREE.BoxGeometry(.035,.012,len),cm);
    seg.position.set(Math.cos(a)*len/2,.015,Math.sin(a)*len/2);seg.rotation.y=-a+Math.PI/2;
    crackGroup.add(seg);
  }
  crackGroup.position.set(...LAND_PT);
}
const rubble=[];
{
  const rm=new THREE.MeshToonMaterial({color:0x4a505e});
  for(let i=0;i<10;i++){
    const r=new THREE.Mesh(new THREE.TetrahedronGeometry(.04+((i*13)%5)*.012),rm);
    const a=i/10*Math.PI*2+.7,sp=.8+((i*29)%10)/10*1.1;
    r.userData={dx:Math.cos(a)*sp,dz:Math.sin(a)*sp,v0:1.6+((i*17)%10)/10,ph:i};
    r.castShadow=true;r.visible=false;SCENES.arena.scene.add(r);rubble.push(r);
  }
}
function rubbleAt(t,t0,anchor){
  const u=t-t0;
  for(const r of rubble){
    if(u<0){r.visible=false;continue;}
    r.visible=true;const d=r.userData,fl=Math.min(u,.9);
    r.position.set(anchor[0]+d.dx*fl,.06+Math.max(0,d.v0*u-4.9*u*u),anchor[2]+d.dz*fl);
    r.rotation.set(fl*7+d.ph,fl*5,d.ph);
  }
}
// gag：星屑光点向小凿漏勺护腕汇聚（33.4 起汇聚，定格后绕环）
const dustConv=[];
{let sd=47;const rr=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
 for(let i=0;i<24;i++){
   const s=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
   s.userData={a:rr()*Math.PI*2,r:.6+rr()*1.6,h:rr()*1.8-.4,ph:rr()*6,spin:.8+rr()*1.2};
   s.visible=false;SCENES.shrine.scene.add(s);dustConv.push(s);
 }}
function dustAt(t,target){
  const u=clamp((t-33.4)/(T.FREEZE-33.4));
  for(const s of dustConv){
    if(u<=0){s.visible=false;continue;}
    s.visible=true;const d=s.userData;
    const r=d.r*(1-u)+.12,ang=d.a+t*d.spin;
    s.position.set(target.x+Math.cos(ang)*r,target.y+d.h*(1-u)+.15*Math.sin(t*2+d.ph),target.z+Math.sin(ang)*r);
    s.material.color.set('#9fd8ff');s.material.opacity=.35+.55*u;
    s.scale.setScalar(.05+.05*u);
  }
}

// ── R11 必杀技 VFX 实例（挂 fxGroup 随场景 reparent；锚点帧帧活取）──
const wv2=new THREE.Vector3();
const steamFX=buildMoveFX('steam_pillar');fxGroup.add(steamFX.group);
const lotusFX=buildMoveFX('star_lotus');fxGroup.add(lotusFX.group);
const shockFX=buildMoveFX('pot_shock');fxGroup.add(shockFX.group);
const slamFX=buildMoveFX('crater_slam');fxGroup.add(slamFX.group);

// ── 画布叠加件 ──
function flash(t,t0,dur=.1,strength=.5){ // 白闪 ≤.55
  const u=(t-t0)/dur;if(u<0||u>1)return;
  ctx.fillStyle=`rgba(255,255,255,${(1-u)*strength})`;ctx.fillRect(0,0,W,H);
}
function drawSFX(text,color,t0,t1,t){
  const u=clamp((t-t0)/(t1-t0));if(u<=0||u>=1)return;
  const pop=u<.18?ease(u/.18)*1.15:1.15-.15*ease((u-.18)/.3);
  const alpha=u>.75?1-(u-.75)/.25:1;
  ctx.save();ctx.translate(W*.5,H*.34);ctx.scale(pop,pop);
  ctx.font='bold 92px STKAITI,KaiTi,serif';ctx.textAlign='center';ctx.lineJoin='round';
  ctx.globalAlpha=alpha;ctx.shadowColor='#fff';ctx.shadowBlur=9;
  ctx.strokeStyle='#101418';ctx.lineWidth=10;ctx.strokeText(text,0,0);
  ctx.fillStyle=color;ctx.fillText(text,0,0);
  ctx.restore();ctx.globalAlpha=1;
}
function drawTitle(t){ // intro 字卡：0.4 淡入 → 2.7 淡出
  const alpha=t<.4?0:t<1.0?ease((t-.4)/.6):t>2.7?1-ease((t-2.7)/.62):1;
  if(alpha<=0)return;
  const pop=1+.06*(1-ease(clamp((t-.4)/.8)));
  ctx.save();ctx.translate(W/2,H*.40);ctx.scale(pop,pop);ctx.globalAlpha=alpha;
  ctx.textAlign='center';ctx.lineJoin='round';
  ctx.shadowColor='#ffb35e';ctx.shadowBlur=18;
  ctx.strokeStyle='#0c0a12';ctx.lineWidth=12;
  ctx.font='bold 96px STKAITI,KaiTi,serif';
  ctx.strokeText('星屑战壳',0,0);ctx.fillStyle='#ffe8c0';ctx.fillText('星屑战壳',0,0);
  ctx.shadowBlur=0;ctx.font='22px Microsoft YaHei';
  ctx.fillStyle='rgba(200,214,240,.85)';
  ctx.fillText('—— 灶 火 未 熄 · 屑 铁 亦 战 ——',0,52);
  ctx.restore();ctx.globalAlpha=1;
}
function drawTitleSmall(t){ // outro 标题再现（小卡，顶部）
  const u=clamp((t-44.4)/.6),out=clamp((t-46.0)/.6);
  const alpha=u<1?ease(u):1-ease(out);if(alpha<=0)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='center';
  ctx.shadowColor='#ffb35e';ctx.shadowBlur=10;
  ctx.strokeStyle='#0c0a12';ctx.lineWidth=7;
  ctx.font='bold 44px STKAITI,KaiTi,serif';
  ctx.strokeText('星屑战壳',W/2,86);ctx.fillStyle='#ffe8c0';ctx.fillText('星屑战壳',W/2,86);
  ctx.restore();ctx.globalAlpha=1;
}
function drawSubtitle(t){ // 赫斯提亚画外音字幕
  if(t<T.VOICE||t>T.VOICE+1.6)return;
  ctx.font='bold 25px Microsoft YaHei';ctx.textAlign='center';ctx.lineWidth=6;ctx.lineJoin='round';
  ctx.strokeStyle='rgba(16,14,20,.88)';ctx.fillStyle='#e8d8ff';
  ctx.strokeText('赫斯提亚：打完记得把锅刷了。',W/2,H-60);
  ctx.fillText('赫斯提亚：打完记得把锅刷了。',W/2,H-60);
}
function fadeBlack(t){
  // R6：不纯黑开场——第 0 帧 30% 亮度可见（视频封面/平台抓帧读得出构图），0.6s 淡入到正常
  const aIn=t<.6?(1-ease(t/.6))*.70:0;
  const aOut=t>48.228?ease((t-48.228)/(TL.duration-48.228)):0; // 淡黑收尾
  const a=Math.max(aIn,aOut);
  if(a>0){ctx.fillStyle=`rgba(4,5,10,${a})`;ctx.fillRect(0,0,W,H);}
}

const BLINK_OFF={aoao:0,xiaozao:.83,dafu:1.61};
const autoBlink=t=>Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);
const FIGHT_PHASES=new Set(['f1','f2','f3','f4','f5','f6','f7','f8']);

function draw(t,capture=true){
  const perf=poseAt(actors,entries,t);
  const {entry,opts,phase,states,poses}=perf;
  const scene=useScene(opts.scene); // 段边界硬切场景（压拍）
  scene.update(t);

  let c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??44}
    :camFor(opts.shot??'establish',t,entry,states);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();

  // 表情/眨眼/战壳活效/视线（全纯 (t,state)）
  const gazeFight=new THREE.Vector3(0,1.3,1.85);
  for(const name of ['aoao','xiaozao','dafu']){
    const actor=actors[name],s=states[name];
    if(!actor.mesh.visible)continue;
    actor.setEmotion(s.emotion??'neutral',s.blink??autoBlink(t+BLINK_OFF[name]));
    actor.updateCladFX(t,s.cladT);
    if(actor.face.lookAtWorld){
      if(FIGHT_PHASES.has(phase)){
        const other=name==='aoao'?actors.dafu:name==='dafu'?actors.aoao:null;
        actor.face.lookAtWorld(other?other.headGroup.getWorldPosition(new THREE.Vector3()):gazeFight);
      }else actor.face.lookAtWorld(camera.position);
    }
  }
  // 女神：慵懒脸+口型包络轨+光环（visible 由谱面控制）
  if(actors.hestia.mesh.visible){
    actors.hestia.setEmotion('neutral',states.hestia.blink??autoBlink(t+2.3));
    actors.hestia.face.lookAtWorld?.(camera.position);
    actors.hestia.mouth.apply({jaw:jawAt(t),width:1});
  }
  // 肖像 solo 模式（--shots 的 per-shot solo 字段：隐藏其他角色防乱入）
  if(window.soloName)for(const [n,a] of Object.entries(actors))a.mesh.visible=(n===window.soloName);

  // ── 3D 特效（render 之前；锚点全部来自 performance 的真实接触坐标）──
  if(Math.abs(t-T.BLOCK)<.55)ringAt(impactRing,...BLOCK_PT,t,T.BLOCK,'#3DFFC8',2.0);
  else if(Math.abs(t-T.CLASH)<.55)ringAt(impactRing,...CLASH_PT,t,T.CLASH,'#FF6B3B',2.4);
  else if(Math.abs(t-T.CLANG)<.6)ringAt(impactRing,0,3.55,-6,t,T.CLANG,'#ffb35e',3.0,.6);
  else impactRing.visible=false;
  if(Math.abs(t-T.BLOCK)<.5)flareAt(t,T.BLOCK,...BLOCK_PT,'#3DFFC8');
  else if(Math.abs(t-T.CLASH)<.5)flareAt(t,T.CLASH,...CLASH_PT,'#FF6B3B');
  else if(Math.abs(t-T.GAG)<.5)flareAt(t,T.GAG,.3,2.3,3.5,'#ffd98a');
  else{flare.visible=false;for(const s of sparks)s.visible=false;}
  if(Math.abs(t-T.KNOCK)<.7)ringAt(dustRing,LAND_PT[0],.03,LAND_PT[2],t,T.KNOCK,'#c9b89a',2.2,.7);
  else dustRing.visible=false;
  crackGroup.visible=t>=T.KNOCK;
  if(crackGroup.visible)crackGroup.scale.setScalar(Math.max(clamp((t-T.KNOCK)/.12),.001));
  rubbleAt(t,T.KNOCK,LAND_PT);
  const disc=actors.xiaozao.bracerDiscL.getWorldPosition(new THREE.Vector3());
  dustAt(t,disc);

  // ── R11 必杀技 VFX（活锚点=渲染层纯函数；技名卡在画布叠加层）──
  // 大釜「沸泉·冲天柱」：蓄力期拳上蒸汽星屑柱（15.9 起，格挡帧收）
  steamFX.update(t,15.9,actors.dafu.hands.right.getWorldPosition(wv2));
  // 阿鏊「圆盾·星莲华」：盾面莲华光轮绽开（格挡前瞬绽，16.55 起）
  lotusFX.update(t,16.55,actors.aoao.shieldDome.getWorldPosition(wv2));
  // 阿鏊「震堂·锅鸣一击」：对拳帧环形冲击波三连（锚 CLASH_PT 真实接触点）
  shockFX.update(t,T.CLASH,new THREE.Vector3(...CLASH_PT));
  // 大釜「陨星·釜底落」：反震落点大环爆发+碎石迸起（锚 LAND_PT）
  slamFX.update(t,T.KNOCK,new THREE.Vector3(LAND_PT[0],0,LAND_PT[2]));

  // ── trace 探针状态（contact/gait/reach/limb_attach/女神坐姿 契约用）──
  const hands={},arms={},limbBody={},torsoAxis={},wv=new THREE.Vector3();
  const ARM_LEN={aoao:.39,xiaozao:.36,dafu:.45},AXIS={aoao:1.47,xiaozao:1.37,dafu:1.65};
  const HIP={aoao:.87,xiaozao:.81,dafu:.96};
  for(const name of ['aoao','xiaozao','dafu']){
    hands[name]={};arms[name]={};
    torsoAxis[name]=[[0,HIP[name],0],[0,AXIS[name],0]]; // mesh 空间躯干轴（髋→肩，low 在前=down 轴）
    for(const side of ['left','right']){
      hands[name][side]=actors[name].hands[side].getWorldPosition(new THREE.Vector3()).toArray();
      const arm=poses[name]?.[side==='left'?'leftArm':'rightArm'];
      if(arm){
        arms[name][side]=[[arm[0].x,arm[0].y,arm[0].z],[arm[1].x,arm[1].y,arm[1].z],[arm[2].x,arm[2].y,arm[2].z]];
        // reach：腕-肩距/臂长（S1E3 P16 超伸判据；谱面目标点已收 ≤.85 臂长）
        const d=Math.hypot(arm[2].x-arm[0].x,arm[2].y-arm[0].y,arm[2].z-arm[0].z);
        limbBody[name+(side==='left'?'L':'R')]={reach:d/ARM_LEN[name]};
      }
    }
  }
  const locomotion={};
  for(const name of ['aoao','xiaozao','dafu'])
    if(poses[name]?.locomotion)locomotion[name]=poses[name].locomotion;
  // 女神坐姿探针键（只在 outro 可见段发射）：臀-锅沿接触、脚晃腿弧下限、杖-手贴合
  const hestiaKeys={};
  if(actors.hestia.mesh.visible){
    hestiaKeys.hestiaOn=1;
    hestiaKeys.hestiaHip=[HESTIA_SEAT.x,HESTIA_SEAT.y+(states.hestia.bob??0),HESTIA_SEAT.z];
    hestiaKeys.potSeat=[HESTIA_SEAT.x,HESTIA_SEAT.y,HESTIA_SEAT.z+.04]; // 锅沿前点
    hestiaKeys.hestiaFootY=Math.min(
      actors.hestia.feet.left.getWorldPosition(new THREE.Vector3()).y,
      actors.hestia.feet.right.getWorldPosition(new THREE.Vector3()).y);
    hestiaKeys.staffGrip=actors.hestia.staff.getWorldPosition(new THREE.Vector3()).toArray();
    hands.hestia={left:actors.hestia.hands.left.getWorldPosition(new THREE.Vector3()).toArray(),
      right:actors.hestia.hands.right.getWorldPosition(new THREE.Vector3()).toArray()};
  }
  // clad_fit 探针量（甲件内面-躯干/大腿间隙，与渲染同源的 mesh 局部系）
  const metrics={};
  for(const name of ['aoao','xiaozao','dafu']){
    const f=actors[name].lastFit;
    if(f)for(const [k,v] of Object.entries(f))metrics[`${name}.${k}`]=v;
  }
  const state={entry:entries.indexOf(entry)+1,phase,shot:opts.shot,scene:opts.scene,
    clad:{aoao:states.aoao.cladT,xiaozao:states.xiaozao.cladT,dafu:states.dafu.cladT},
    aoaoRoot:[states.aoao.rootX,states.aoao.rootZ],
    xiaozaoRoot:[states.xiaozao.rootX,states.xiaozao.rootZ],
    dafuRoot:[states.dafu.rootX,states.dafu.rootZ],
    limbBody,
    contact:{hands,arms,torsoAxis,aR:hands.aoao.right,dR:hands.dafu.right,
      shieldA:actors.aoao.shieldDome.getWorldPosition(wv).toArray(),clashAnchor:CLASH_PT,
      metrics,...hestiaKeys,
      ...(window.debugFit?{fitDebug:Object.fromEntries(['aoao','xiaozao','dafu'].map(n=>{
        const a=actors[n],lf=a.fitRefs.leaves[1],leg=poses[n]?.leftLeg;
        const rec={ref:lf?lf.ref.getWorldPosition(new THREE.Vector3()).toArray():null,
          leg:leg?[[leg[0].x,leg[0].y,leg[0].z],[leg[1].x,leg[1].y,leg[1].z],[leg[2].x,leg[2].y,leg[2].z]]:null,
          thR:a.limbs.leftLeg.radius(.12)};
        return [n,rec];
      }))}:{})},
    ...(Object.keys(locomotion).length?{locomotion}:{})};
  if(actors.hestia.mesh.visible)
    state.hestiaRoot=[HESTIA_SEAT.x,HESTIA_SEAT.z];
  if(!capture)return state;
  renderer.render(scene.scene,camera);
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  // ── 画布叠加层 ──
  if(phase==='establish')drawTitle(t);
  drawSFX('铛——！','#3DFFC8',T.BLOCK,T.BLOCK+.42,t);
  drawSFX('砰！','#FF6B3B',T.CLASH,T.CLASH+.38,t);
  drawSFX('当——！','#ffd98a',T.CLANG,T.CLANG+.55,t);
  flash(t,T.CLASH,.09,.5);
  flash(t,T.CLANG,.12,.4);
  drawTitleSmall(t);drawSubtitle(t);fadeBlack(t);
  // ── R11 技名卡（蓄力期起、接触帧前后收；双人同喊分屏左右半卡）──
  drawMoveCard(ctx,W,H,{name:'沸泉·冲天柱',color:'#ffc890',t,t0:15.45,dur:.95,side:'right'});
  drawMoveCard(ctx,W,H,{name:'圆盾·星莲华',color:'#3dffc8',t,t0:15.9,dur:.95,side:'left'});
  drawMoveCard(ctx,W,H,{name:'震堂·锅鸣一击',color:'#ffd98a',t,t0:19.1,dur:.9});
  drawMoveCard(ctx,W,H,{name:'陨星·釜底落',color:'#ffb35e',t,t0:22.45,dur:.95});
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.setFreeCamera=c=>window.freeCamera=c;
window.setSolo=n=>window.soloName=n; // 肖像 solo：只留被拍角色
// check 抽帧表：条目始/中/末 + 接触帧/gag 顶点/画外音/收尾
window.checkTimes=[...entries.flatMap(e=>[e.startTime+.15,(e.startTime+e.endTime)/2,e.endTime-.10]),
  2.113,T.BLOCK,T.CLASH,T.HOP,T.KNOCK,T.GAG,T.FREEZE+.2,T.VOICE+.4,T.CLANG+.03]
  .filter(t=>t>0&&t<TL.duration).sort((a,b)=>a-b);
await document.fonts.ready;window.ready=true;
