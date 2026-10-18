// 《星屑战壳》S1E1 R13「圣火与战壳」viewer：横屏 1280×720。剧情级重写（监制否决"剧情太敷衍"）：
// 圣殿晨景（morningize 重置）+ 柱廊晨巡 + 角斗场考核战 + 门阙报告镜头（F02）。
// 角色/场景全部 dula-assets import（characters/stardust、scenes/stardust）。
// 纯 (t,state) 确定函数；道具跟随活锚点仅渲染层（pose 计算不读网格）。
// window 契约（render.mjs 依赖）：duration / checkTimes / renderAt / stepAt / setFreeCamera / ready。
import * as THREE from 'three';
import {AoaoCraft,XiaozaoCraft,DafuCraft,AzuCraft,HestiaCraft} from 'dula-assets/characters/stardust/characters.js';
import {StardustShrineScene} from 'dula-assets/scenes/stardust/StardustShrineScene.js';
import {StarfallColonnadeScene} from 'dula-assets/scenes/stardust/StarfallColonnadeScene.js';
import {StarArenaScene} from 'dula-assets/scenes/stardust/StarArenaScene.js';
import {PalaceGateScene} from 'dula-assets/scenes/stardust/PalaceGateScene.js';
import {poseAt,ease,clamp,T,SHIELD_PT,XIAO_PAULR_PT,DAFU_BACK_PT,COMBO_PT,HESTIA_SEAT} from './performance.js';
import {MOVES,buildMoveFX,drawMoveCard} from 'dula-assets/characters/stardust/moves.js';

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

// ── 晨景重置（ep 侧皮肤：资产场景是夜景定型，本集拍早晨；只动灯光/天空/雾/地面明度）──
const dawnSky=()=>{
  const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,512);
  gr.addColorStop(0,'#3a5a9c');gr.addColorStop(.42,'#7a8fc0');gr.addColorStop(.72,'#d8b08a');gr.addColorStop(.92,'#f0c894');
  g.fillStyle=gr;g.fillRect(0,0,1024,512);
  const fade=g.createLinearGradient(0,512*.38,0,512*.56);
  fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,1)');
  g.globalCompositeOperation='destination-out';g.fillStyle=fade;g.fillRect(0,512*.38,1024,512*.62);
  g.globalCompositeOperation='source-over';
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
};
const dawnBg=()=>{
  const c=document.createElement('canvas');c.width=2;c.height=256;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,256);
  gr.addColorStop(0,'#3a5a9c');gr.addColorStop(.55,'#9aa8cc');gr.addColorStop(.85,'#e8c496');gr.addColorStop(1,'#8a94b4');
  g.fillStyle=gr;g.fillRect(0,0,2,256);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
};
function morningize(sc,{dome=false,fireDim=1,stone=1.5,fogNear=30,fogFar=110,floor='#7d8496',hemi=1.35,dir=1.45,additiveDim=1,pointDim=1,zenith=null}={}){
  const S=sc.scene;
  const texd=(sc.hybridApplied??[]).length>0; // R14：有纹理的场景不再调色压色（applyHybrid 已按纹理调定），只管灯光/雾/天顶
  S.background=dawnBg();
  if(S.fog){S.fog.color.set('#7a86a8');S.fog.near=fogNear;S.fog.far=fogFar;}
  S.traverse(o=>{
    if(o.isHemisphereLight){o.intensity*=hemi;o.color.set('#8a9ec8');o.groundColor.set('#5a4f42');}
    if(o.isDirectionalLight){o.color.set('#ffd8b0');o.intensity=Math.max(o.intensity*dir,1.1*dir/1.45);}
    if(o.isPointLight)o.intensity*=pointDim; // 夜用火炬点光环在晨景叠加过曝——压功率留形
  });
  if(zenith&&sc.backdrop){ // continuousBackdrop 晨化：夜空天顶 uniform 换晨空 + 资产侧夜景提亮压回
    const u=sc.backdrop.material?.uniforms;
    if(u?.zenithColor)u.zenithColor.value.set(zenith);
    if(u?.sourceMap?.value?.image){ // 资产 applyHybrid 对夜景图 brightness(1.4~1.45)，晨版图会吹白——同口径 redraw 压回
      const src=u.sourceMap.value.image;
      const c=document.createElement('canvas');c.width=src.width;c.height=src.height;
      const g=c.getContext('2d');g.filter='brightness(0.72)';g.drawImage(src,0,0);
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
      t.wrapS=THREE.MirroredRepeatWrapping;
      u.sourceMap.value=t;
    }
  }
  if(dome&&sc.dome){sc.dome.material.map=dawnSky();sc.dome.material.needsUpdate=true;}
  if(!dome&&!sc.backdrop){ // 有混合背景板的场景不再加程序化天球（球在筒内会盖住背景板）
    const sky=new THREE.Mesh(new THREE.SphereGeometry(95,32,16),
      new THREE.MeshBasicMaterial({map:dawnSky(),side:THREE.BackSide,fog:false,transparent:true,depthWrite:false}));
    sky.position.set(0,0,-6);sky.renderOrder=-99;S.add(sky);
  }
  if(!texd){
    if(sc.floorMesh){sc.floorMesh.material.color.set(floor);sc.floorMesh.material.needsUpdate=true;}
    if(sc.farMesh){sc.farMesh.material.color.set('#565e74');sc.farMesh.material.needsUpdate=true;}
    for(const key of ['stoneMeshes','pillarMeshes','pileMeshes','rockMeshes','groundMeshes'])
      for(const m of sc[key]??[])if(m!==sc.floorMesh&&m!==sc.farMesh)m.material.color.multiplyScalar(stone);
  }
  for(const m of sc.bandMeshes??[])m.material.color.multiplyScalar(1.8); // 夜用剪影带在晨雾里太黑，提亮进霾
  if(additiveDim!==1)S.traverse(o=>{ // 夜用加色叠层（沙痕等）在晨景会吹白全场——只压 Mesh，火炬 Sprite 不动
    if(o.isMesh&&!o.isSprite&&o.material&&o.material.blending===THREE.AdditiveBlending)o.material.opacity=additiveDim;});
  if(fireDim!==1&&sc.fireLight){
    const orig=sc.update.bind(sc);
    sc.update=t=>{orig(t);sc.fireLight.intensity*=fireDim;};
  }
}

// ── 场景与角色（多场景同存，按段 scene 字段硬切；世界坐标全局连续）──
const SCENES={shrine:new StardustShrineScene(),colonnade:new StarfallColonnadeScene(),
  arena:new StarArenaScene(),palacegate:new PalaceGateScene()};
for(const sc of Object.values(SCENES)){sc.build();await sc.applyHybrid();} // R14：晨版纹理集（无纹理目录则静默回退程序化）
morningize(SCENES.shrine,{dome:true,fireDim:.6,zenith:'#6f86b8'});
morningize(SCENES.colonnade,{fogFar:150,zenith:'#6f86b8'});
// 考核战：晨雾推远收掉（监制点名 51.5 灰蒙）+ 暖金主光抬饱和；纹理场景不调色压色
morningize(SCENES.arena,{fogNear:60,fogFar:260,hemi:1.15,dir:1.35,additiveDim:.22,pointDim:.6,zenith:'#7b8fc0'});
morningize(SCENES.palacegate);
const actors={aoao:new AoaoCraft(),xiaozao:new XiaozaoCraft(),dafu:new DafuCraft(),azu:new AzuCraft(),hestia:new HestiaCraft()};
let curScene=null;
function useScene(name){
  const sc=SCENES[name]??SCENES.shrine;
  if(curScene===sc)return sc;
  curScene=sc;
  for(const a of Object.values(actors))sc.scene.add(a.mesh);
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
// ── 机位表（含三处眼部特写：谷底阿鏊/阿箸认可/结尾看火）──
function camFor(shot,t,states){
  const face=(name,dy=0)=>{const s=states[name];return [s.rootX,s.rootZ];};
  switch(shot){
    case 'establish':return{pos:lerp3([0,5.2,16],[0,4.2,13],ease(clamp(t/3.0))),look:[0,2.2,-6],fov:50};
    case 'patrol_track':{const [x]=face('aoao');return{pos:[x+.6,1.5,8.0],look:[x-.6,1.15,3.0],fov:46};}
    case 'patrol_front':{const [x]=face('aoao');return{pos:[x-.6,1.4,7.2],look:[x+.4,1.2,3.0],fov:44};}
    case 'notice':return{pos:[-.6,1.8,6.8],look:[-.8,1.5,1.0],fov:44};
    case 'azu_grand':{const s=states.azu;return{pos:[s.rootX+.6,.9,s.rootZ+4.6],look:[s.rootX,1.5,s.rootZ],fov:44};} // 低机位仰角排面
    case 'two_profile':return{pos:[.2,1.5,6.4],look:[.2,1.3,2.8],fov:40};
    case 'walk_out':return{pos:[-1.0,1.7,7.0],look:[1.6,1.2,2.8],fov:46};
    case 'walk_in':return{pos:[0,2.6,10.5],look:[0,1.1,1.8],fov:48}; // 角斗场入场全景
    case 'test_wide':return{pos:[-.4,2.0,7.8],look:[0,1.2,2.2],fov:46};
    case 'test_side':return{pos:[-2.6,1.4,5.2],look:[-1.2,1.25,2.5],fov:40}; // 小凿读秒侧拍
    case 'fire_closeup':return{pos:[0,2.3,-1.6],look:[0,1.85,-6],fov:34}; // 谷底空镜：圣火将熄特写
    case 'eye_closeup':{const s=states.aoao;return{pos:[s.rootX+1.05,1.24,s.rootZ+.9],look:[s.rootX+.05,1.16,s.rootZ],fov:23};} // E1 谷底阿鏊（正面偏右，避开盾面，对准眼高）
    case 'combo_group':return{pos:[-.6,1.7,6.8],look:[.2,1.2,2.3],fov:44};
    case 'combo_low':return{pos:[.6,.8,5.6],look:[.5,1.6,2.3],fov:48}; // 仰角抛掷
    case 'combo_air':return{pos:[-.6,1.6,6.0],look:[.8,1.9,2.4],fov:44}; // 空中突进
    case 'combo_catch':return{pos:[-.2,1.6,6.4],look:[.5,1.35,2.4],fov:42}; // 接住一线
    case 'eye_closeup_azu':{const s=states.azu;return{pos:[s.rootX-.75,1.63,s.rootZ+1.05],look:[s.rootX,1.58,s.rootZ],fov:24};} // E2 阿箸认可（收紧到眼）
    case 'sheathe_wide':return{pos:[.2,1.9,7.2],look:[.4,1.3,2.4],fov:44};
    case 'outro_fire':return{pos:[-.4,1.9,7.0],look:[-.6,1.6,-1],fov:46}; // 画外音：群像+灶火
    case 'report_close':{const s=states.azu;return{pos:[s.rootX-.4,1.5,s.rootZ+1.8],look:[s.rootX,1.25,s.rootZ],fov:30};} // F02 报告独处
    case 'fire_watch':{const s=states.aoao;return{pos:[s.rootX+.55,1.42,s.rootZ+1.7],look:[s.rootX,1.42,s.rootZ],fov:28};} // E3 看火
    default:return{pos:[0,3,12],look:[0,1.5,-2],fov:48};
  }
}

// ── 特效网格（OP 同族：冲击环/闪光火花 LCG/震尘环，全纯 t）──
const flareTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,2,64,64,64);
  gr.addColorStop(0,'#ffffff');gr.addColorStop(.3,'#ffffff');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,128,128);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
const impactRing=new THREE.Mesh(new THREE.TorusGeometry(1,.05,8,40),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
const dustRing=new THREE.Mesh(new THREE.TorusGeometry(1,.07,8,40),
  new THREE.MeshBasicMaterial({color:0xc9b89a,transparent:true}));
dustRing.rotation.x=-Math.PI/2;
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
// R13：特效全挂角斗场（考核战主场；F02/圣殿段无特效）
for(const m of [impactRing,dustRing,flare,...sparks])SCENES.arena.scene.add(m);
// 必杀技 VFX 实例（锚点帧帧活取=渲染层纯函数）
const wv2=new THREE.Vector3();
const shockFX=buildMoveFX('pot_shock');SCENES.arena.scene.add(shockFX.group);   // 阿鏊「震堂·锅鸣一击」（c4 空中突进）
const barrageFX=buildMoveFX('chopstick_barrage');SCENES.arena.scene.add(barrageFX.group); // 阿箸「流星·双箸乱穿」（真招被逼出）
const netFX=buildMoveFX('star_net');SCENES.arena.scene.add(netFX.group);       // 小凿「天罗·星屑网」（c5 侧翼收束）
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

// ── 道具（跟随活锚点=渲染层纯函数；谱面不读网格）──
// 防务令公文（圣物大锅喷出，悬浮展开）
const scroll=new THREE.Group();
{const paper=new THREE.Mesh(new THREE.PlaneGeometry(.62,.42),
   new THREE.MeshBasicMaterial({color:'#f0e4c8',side:THREE.DoubleSide}));
 scroll.add(paper);
 const cv=document.createElement('canvas');cv.width=256;cv.height=172;const g=cv.getContext('2d');
 g.fillStyle='#f0e4c8';g.fillRect(0,0,256,172);g.fillStyle='#8a2a22';
 g.font='bold 40px STKAITI,KaiTi,serif';g.textAlign='center';g.fillText('总坛防务令',128,58);
 g.font='20px STKAITI,KaiTi,serif';g.fillStyle='#4a3630';
 g.fillText('今日评估',128,96);g.fillText('不合格者 战壳收回',128,126);
 const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 paper.material.map=tex;paper.material.needsUpdate=true;
 for(const y of [-.23,.23]){const rod=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.66,8),
   new THREE.MeshToonMaterial({color:'#8a5a2a'}));rod.rotation.z=Math.PI/2;rod.position.y=y;scroll.add(rod);}
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,color:'#ffd98a',transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
 glow.scale.setScalar(1.6);scroll.add(glow);}
scroll.visible=false;
// F02 阿箸的评估报告（门阙独处镜头：公文板+左刃当笔）
const report=new THREE.Group();
{const paper=new THREE.Mesh(new THREE.PlaneGeometry(.5,.36),
   new THREE.MeshBasicMaterial({color:'#f0e4c8',side:THREE.DoubleSide}));
 report.add(paper);
 const cv=document.createElement('canvas');cv.width=256;cv.height=184;const g=cv.getContext('2d');
 g.fillStyle='#f0e4c8';g.fillRect(0,0,256,184);g.fillStyle='#4a3630';
 g.font='bold 30px STKAITI,KaiTi,serif';g.textAlign='center';g.fillText('评估报告',128,50);
 g.font='20px STKAITI,KaiTi,serif';
 g.fillText('东厨班 · 战壳使',128,90);g.fillStyle='#8a2a22';
 g.font='bold 34px STKAITI,KaiTi,serif';g.fillText('合 格',128,140);
 const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 paper.material.map=tex;paper.material.needsUpdate=true;
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,color:'#ffb0b8',transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false}));
 glow.scale.setScalar(1.2);report.add(glow);}
report.visible=false;
SCENES.shrine.scene.add(scroll);SCENES.palacegate.scene.add(report);

// ── 画布叠加件 ──
function flash(t,t0,dur=.09,strength=.5){ // 白闪 ≤.12s
  const u=(t-t0)/dur;if(u<0||u>1)return;
  ctx.fillStyle=`rgba(255,255,255,${(1-u)*strength})`;ctx.fillRect(0,0,W,H);
}
function drawSFX(text,color,t0,t1,t){
  const u=clamp((t-t0)/(t1-t0));if(u<=0||u>=1)return;
  const pop=u<.18?ease(u/.18)*1.15:1.15-.15*ease((u-.18)/.3);
  const alpha=u>.75?1-(u-.75)/.25:1;
  ctx.save();ctx.translate(W*.5,H*.34);ctx.scale(pop,pop);
  ctx.font='bold 88px STKAITI,KaiTi,serif';ctx.textAlign='center';ctx.lineJoin='round';
  ctx.globalAlpha=alpha;ctx.shadowColor='#fff';ctx.shadowBlur=9;
  ctx.strokeStyle='#101418';ctx.lineWidth=10;ctx.strokeText(text,0,0);
  ctx.fillStyle=color;ctx.fillText(text,0,0);
  ctx.restore();ctx.globalAlpha=1;
}
function drawTitle(t){ // 冷开题字：0.4 淡入 → 4.6 淡出（弱火气氛）
  const alpha=t<.4?0:t<1.0?ease((t-.4)/.6):t>4.6?1-ease((t-4.6)/.5):1;
  if(alpha<=0)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='center';ctx.lineJoin='round';
  ctx.shadowColor='#ffb35e';ctx.shadowBlur=16;
  ctx.strokeStyle='#0c0a12';ctx.lineWidth=11;
  ctx.font='bold 84px STKAITI,KaiTi,serif';
  ctx.strokeText('星屑战壳',W/2,H*.40);ctx.fillStyle='#ffe8c0';ctx.fillText('星屑战壳',W/2,H*.40);
  ctx.shadowBlur=0;ctx.font='bold 30px STKAITI,KaiTi,serif';
  ctx.strokeText('第一集 · 圣火与战壳',W/2,H*.40+56);ctx.fillStyle='#ffd98a';ctx.fillText('第一集 · 圣火与战壳',W/2,H*.40+56);
  ctx.restore();ctx.globalAlpha=1;
}
function drawSubtitle(t){
  const l=lineAt(t);if(!l)return;
  const name={aoao:'阿鏊',xiaozao:'小凿',dafu:'大釜',azu:'阿箸',hestia:'赫斯提亚'}[l.speaker];
  ctx.font='bold 26px Microsoft YaHei';ctx.textAlign='center';ctx.lineWidth=6;ctx.lineJoin='round';
  ctx.strokeStyle='rgba(16,14,20,.88)';ctx.fillStyle=DIALOG.colors[l.speaker]??'#fff';
  ctx.strokeText(`${name}：${l.text}`,W/2,H-52);
  ctx.fillText(`${name}：${l.text}`,W/2,H-52);
}
function fadeBlack(t){
  const aIn=t<.6?(1-ease(t/.6))*.70:0;
  const aOut=t>T.FADE?ease((t-T.FADE)/(TL.duration-T.FADE)):0;
  const a=Math.max(aIn,aOut);
  if(a>0){ctx.fillStyle=`rgba(10,12,20,${a})`;ctx.fillRect(0,0,W,H);}
}

const BLINK_OFF={aoao:0,xiaozao:.83,dafu:1.61,azu:2.2};
const autoBlink=t=>Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);

function draw(t,capture=true){
  const perf=poseAt(actors,entries,t);
  const {entry,opts,phase,states,poses}=perf;
  const scene=useScene(opts.scene);
  scene.update(t);
  // F01：圣火变弱（冷开/谷底空镜/收尾段压暗压小——画面层不解释；update 每帧重写故在其后乘）
  if(scene===SCENES.shrine&&['coldopen','valley_fire','outro','outro_final'].includes(phase)){
    scene.fireLight.intensity*=.55;
    for(const f of scene.flames)f.scale.multiplyScalar(.62);
  }

  let c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??44}
    :camFor(opts.shot??'establish',t,states);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();

  // 表情/眨眼/战壳活效/视线/口型（全纯 (t,state)）
  for(const name of ['aoao','xiaozao','dafu','azu']){
    const actor=actors[name],s=states[name];
    if(!actor.mesh.visible)continue;
    actor.setEmotion(s.emotion??'neutral',s.blink??autoBlink(t+BLINK_OFF[name]));
    actor.updateCladFX(t,s.cladT);
    if(actor.face.lookAtWorld){
      // 战斗段互盯对手；眼部特写盯镜头（交流感）；其余看镜头
      if(['test1','test2','test3','combo_cmd','combo_toss','combo_air','combo_barrage'].includes(phase)){
        if(name==='azu'){
          const targetPhase={test1:SHIELD_PT,test2:XIAO_PAULR_PT,test3:DAFU_BACK_PT,combo_air:COMBO_PT}[phase];
          actor.face.lookAtWorld(new THREE.Vector3(...(targetPhase??[states.aoao.rootX,1.3,states.aoao.rootZ])));
        }else actor.face.lookAtWorld(new THREE.Vector3(states.azu.rootX,1.5,states.azu.rootZ));
      }else actor.face.lookAtWorld(camera.position);
    }
  }
  const active=lineAt(t);
  for(const name of ['aoao','xiaozao','dafu','azu'])
    actors[name].mouth.apply({jaw:active?.speaker===name?jawAt(active.id,t):0,width:1});
  if(actors.hestia.mesh.visible){
    actors.hestia.setEmotion('neutral',states.hestia.blink??autoBlink(t+2.3));
    actors.hestia.face.lookAtWorld?.(camera.position);
    actors.hestia.mouth.apply({jaw:active?.speaker==='hestia'?jawAt(active.id,t)*.85:0,width:1});
  }

  // ── 道具驱动 ──
  scroll.visible=t>T.SCROLL&&t<37.5;
  if(scroll.visible){
    const u=ease(clamp((t-T.SCROLL)/1.0));
    scroll.position.set(lerp3([0,3.9,-5],[0,1.9,.8],u)[0],lerp3([0,3.9,-5],[0,1.9,.8],u)[1]+.05*Math.sin(t*1.4)*u,lerp3([0,3.9,-5],[0,1.9,.8],u)[2]);
    scroll.rotation.x=-.1+.05*Math.sin(t*.9);scroll.scale.setScalar(.3+.7*u);
  }
  report.visible=phase==='f02_report';
  if(report.visible){ // 公文悬在阿箸左刃前（随她俯首）
    report.position.set(states.azu.rootX+.25,1.18,states.azu.rootZ+.42);
    report.rotation.set(-.15,.3,0);
  }

  // ── 特效事件（锚点=performance 常量/活锚点；全挂角斗场）──
  if(Math.abs(t-T.C1)<.5){const d=actors.aoao.shieldDome.getWorldPosition(new THREE.Vector3());
    ringAt(impactRing,d.x,d.y,d.z,t,T.C1,'#ff8a96',1.0,.4);flareAt(t,T.C1,d.x,d.y,d.z,'#ffd0d4');}
  else if(Math.abs(t-T.C2)<.5){const p=actors.xiaozao.fitRefs.pauldrons.find(x=>x.side==='right').ref.getWorldPosition(new THREE.Vector3());
    ringAt(impactRing,p.x,p.y,p.z,t,T.C2,'#ff8a96',.8,.4);flareAt(t,T.C2,p.x,p.y,p.z,'#ffd0d4');}
  else if(Math.abs(t-T.C3)<.5){const p=actors.dafu.caps.left.getWorldPosition(new THREE.Vector3()); // 活锚点：大釜左肩背
    ringAt(impactRing,p.x,p.y,p.z,t,T.C3,'#ff8a96',.8,.4);flareAt(t,T.C3,p.x,p.y,p.z,'#ffd0d4');}
  else if(Math.abs(t-T.C4)<.5){const d=actors.aoao.shieldDome.getWorldPosition(new THREE.Vector3()); // 活锚点：空中盾面
    ringAt(impactRing,d.x,d.y,d.z,t,T.C4,'#ffd98a',1.2,.45);flareAt(t,T.C4,d.x,d.y,d.z,'#fff2cc');}
  else if(Math.abs(t-T.C5)<.6){const d=actors.aoao.shieldDome.getWorldPosition(new THREE.Vector3());
    ringAt(impactRing,d.x,d.y,d.z,t,T.C5,'#8fd8ff',1.2,.5);flareAt(t,T.C5,d.x,d.y,d.z,'#d4ecff');}
  else{impactRing.visible=false;flare.visible=false;for(const s of sparks)s.visible=false;}
  // 必杀技 VFX：锅鸣一击（c4 空中盾击）/ 双箸乱穿（barrage）/ 星屑网（c5 侧翼收束）
  shockFX.update(t,T.C4-.15,actors.aoao.shieldDome.getWorldPosition(new THREE.Vector3())); // 冲击波原点=活盾面
  {const tip=actors.azu.rigs.right.rig.localToWorld(new THREE.Vector3(0,0,.51));
   const fwd=new THREE.Vector3(states.aoao.rootX-states.azu.rootX,0,states.aoao.rootZ-states.azu.rootZ).normalize();
   barrageFX.update(t,T.BARRAGE,tip,fwd);}
  netFX.update(t,T.C5-1.7,actors.xiaozao.bracerDiscL.getWorldPosition(wv2));
  if(Math.abs(t-T.C1+.9)<.6)ringAt(dustRing,states.aoao.rootX,.03,states.aoao.rootZ,t,T.C1+.9,'#c9b89a',1.2,.5); // 阿鏊被点倒扬尘
  else dustRing.visible=false;

  // ── 探针 state（contact/gait/reach/clad_fit/女神坐姿 契约用）──
  const hands={},arms={},limbBody={},torsoAxis={},wv=new THREE.Vector3();
  const ARM_LEN={aoao:.39,xiaozao:.36,dafu:.45,azu:.43},AXIS={aoao:1.47,xiaozao:1.37,dafu:1.65,azu:1.60};
  const HIP={aoao:.87,xiaozao:.81,dafu:.96,azu:.95};
  for(const name of ['aoao','xiaozao','dafu','azu']){
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
  const locomotion={};
  for(const name of ['aoao','xiaozao','dafu','azu'])
    if(poses[name]?.locomotion)locomotion[name]=poses[name].locomotion;
  const hestiaKeys={};
  if(actors.hestia.mesh.visible){
    hestiaKeys.hestiaOn=1;
    hestiaKeys.hestiaHip=[HESTIA_SEAT.x,HESTIA_SEAT.y+(states.hestia.bob??0),HESTIA_SEAT.z];
    hestiaKeys.potSeat=[HESTIA_SEAT.x,HESTIA_SEAT.y,HESTIA_SEAT.z+.04];
    hestiaKeys.hestiaFootY=Math.min(
      actors.hestia.feet.left.getWorldPosition(new THREE.Vector3()).y,
      actors.hestia.feet.right.getWorldPosition(new THREE.Vector3()).y);
    hestiaKeys.staffGrip=actors.hestia.staff.getWorldPosition(new THREE.Vector3()).toArray();
    hands.hestia={left:actors.hestia.hands.left.getWorldPosition(new THREE.Vector3()).toArray(),
      right:actors.hestia.hands.right.getWorldPosition(new THREE.Vector3()).toArray()};
  }
  const metrics={};
  for(const name of ['aoao','xiaozao','dafu','azu']){
    const f=actors[name].lastFit;
    if(f)for(const [k,v] of Object.entries(f))metrics[`${name}.${k}`]=v;
  }
  const azuTipL=actors.azu.rigs.left.rig.localToWorld(new THREE.Vector3(0,0,.51)).toArray();
  const azuTipR=actors.azu.rigs.right.rig.localToWorld(new THREE.Vector3(0,0,.51)).toArray();
  const state={entry:entries.indexOf(entry)+1,phase,shot:opts.shot,scene:opts.scene,
    clad:{aoao:states.aoao.cladT,xiaozao:states.xiaozao.cladT,dafu:states.dafu.cladT,azu:states.azu.cladT},
    aoaoRoot:[states.aoao.rootX,states.aoao.rootZ],
    xiaozaoRoot:[states.xiaozao.rootX,states.xiaozao.rootZ],
    dafuRoot:[states.dafu.rootX,states.dafu.rootZ],
    azuRoot:[states.azu.rootX,states.azu.rootZ],
    limbBody,
    contact:{hands,arms,torsoAxis,
      aR:hands.aoao.right,azuL:azuTipL,azuR:azuTipR,
      shieldA:actors.aoao.shieldDome.getWorldPosition(wv).toArray(),
      xiaoPaulR:actors.xiaozao.fitRefs.pauldrons.find(x=>x.side==='right').ref.getWorldPosition(new THREE.Vector3()).toArray(),
      dafuCapL:actors.dafu.caps.left.getWorldPosition(new THREE.Vector3()).toArray(),
      metrics,...hestiaKeys},
    ...(Object.keys(locomotion).length?{locomotion}:{})};
  if(actors.hestia.mesh.visible)state.hestiaRoot=[HESTIA_SEAT.x,HESTIA_SEAT.z];
  if(!capture)return state;
  // 双渲染沉淀：大姿态跳变（场景切换/不可见→入场）后首渲染有 GPU 缓冲滞后（实测 ~150px 边缘
  // 条带，第二遍逐位稳定）——顺序渲染与 seek 直渲都取沉淀后的第二遍，保证逐位一致。
  renderer.render(scene.scene,camera);
  renderer.render(scene.scene,camera);
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  // ── 画布叠加层 ──
  if(phase==='coldopen')drawTitle(t);
  drawSFX('叮——！','#ff8a96',T.C1,T.C1+.38,t);
  drawSFX('叮！','#ff8a96',T.C2,T.C2+.34,t);
  drawSFX('叮！','#ff8a96',T.C3,T.C3+.34,t);
  drawSFX('铛——！','#ffd98a',T.C4,T.C4+.45,t);
  drawSFX('接住了！','#8fd8ff',T.C5,T.C5+.55,t);
  flash(t,T.C1,.09,.45);flash(t,T.C2,.08,.4);flash(t,T.C3,.08,.4);
  flash(t,T.C4,.1,.5);flash(t,T.C5,.1,.45);
  drawSubtitle(t);
  // 技名卡（谷底后的回答：挣到的招才有卡）
  drawMoveCard(ctx,W,H,{name:'震堂·锅鸣一击',color:'#ffd98a',t,t0:95.6,dur:.95});
  drawMoveCard(ctx,W,H,{name:'流星·双箸乱穿',color:'#ff4a58',t,t0:97.55,dur:.9});
  fadeBlack(t);
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.setFreeCamera=c=>window.freeCamera=c;
window.setSolo=n=>window.soloName=n;
// check 抽帧表：条目始/中/末 + 全部事件帧 + 眼部特写
window.checkTimes=[...entries.flatMap(e=>[e.startTime+.15,(e.startTime+e.endTime)/2,e.endTime-.10]),
  T.SCROLL+.3,T.AZU_IN+1,T.CHARGE1+.5,T.C1,T.C2,T.C3,T.FIRE_CUT+1,T.EYE1+1,T.EYE1+2.6,
  T.CROUCH+.2,T.TOSS+.2,T.C4,T.CALL2+.2,T.C5,T.SHEATHE+.5,T.EYE2+.5,T.HESTIA+.5,T.F02+1,T.EYE3+.5]
  .filter(t=>t>0&&t<TL.duration).sort((a,b)=>a-b);
await document.fonts.ready;window.ready=true;
