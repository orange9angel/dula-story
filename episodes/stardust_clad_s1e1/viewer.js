// 《星屑战壳》S1E1「年检风波」viewer：横屏 1280×720，圣殿晨景（ep 侧 morningize 重置，
// 夜景资产不动）+ 柱廊追逐跑。角色/场景全部 dula-assets import（characters/stardust、
// scenes/stardust）。纯 (t,state) 确定函数；道具跟随活锚点仅渲染层（pose 计算不读网格）。
// window 契约（render.mjs 依赖）：duration / checkTimes / renderAt / stepAt / setFreeCamera / ready。
import * as THREE from 'three';
import {AoaoCraft,XiaozaoCraft,DafuCraft,AzuCraft,HestiaCraft} from 'dula-assets/characters/stardust/characters.js';
import {StardustShrineScene} from 'dula-assets/scenes/stardust/StardustShrineScene.js';
import {StarfallColonnadeScene} from 'dula-assets/scenes/stardust/StarfallColonnadeScene.js';
import {poseAt,ease,clamp,T,SHIELD_PT,PAULDRON_PT,DISC_PT,HESTIA_SEAT} from './performance.js';

const W=1280,H=720;
const TL=await fetch('./config/timeline.json').then(r=>r.json());
window.duration=TL.duration;
const entries=TL.segments.map(s=>({startTime:s.start,endTime:s.end,
  opts:{move:s.move,shot:s.shot,kind:s.kind,scene:s.scene}}));
const DIALOG=await fetch('./config/dialogue.json').then(r=>r.json());
// 口型能量包络轨（build_audio.py 从最终对白 wav 派生；缺失=无声版静默降级闭嘴）
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
const dawnSky=()=>{ // 清晨穹顶：天顶钴蓝→地平线蜜桃金（无星，近地平线 alpha 渐出同夜景工艺）
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
function morningize(sc,{dome=false,fireDim=1}={}){
  const S=sc.scene;
  S.background=dawnBg();
  if(S.fog){S.fog.color.set('#7a86a8');S.fog.near=30;S.fog.far=110;}
  S.traverse(o=>{
    if(o.isHemisphereLight){o.intensity*=1.35;o.color.set('#8a9ec8');o.groundColor.set('#5a4f42');}
    if(o.isDirectionalLight){o.color.set('#ffd8b0');o.intensity=Math.max(o.intensity*1.45,1.1);}
  });
  if(dome&&sc.dome){sc.dome.material.map=dawnSky();sc.dome.material.needsUpdate=true;}
  if(!dome){ // 柱廊无穹顶：ep 侧补晨空壳
    const sky=new THREE.Mesh(new THREE.SphereGeometry(95,32,16),
      new THREE.MeshBasicMaterial({map:dawnSky(),side:THREE.BackSide,fog:false,transparent:true,depthWrite:false}));
    sky.position.set(0,0,-6);sky.renderOrder=-99;S.add(sky);
  }
  if(sc.floorMesh){sc.floorMesh.material.color.set('#7d8496');sc.floorMesh.material.needsUpdate=true;}
  if(sc.farMesh){sc.farMesh.material.color.set('#565e74');sc.farMesh.material.needsUpdate=true;}
  for(const key of ['stoneMeshes','pillarMeshes','pileMeshes'])
    for(const m of sc[key]??[])m.material.color.multiplyScalar(1.5);
  if(fireDim!==1&&sc.fireLight){ // 祭坛灶火晨间调弱（update 每帧重写强度→包一层）
    const orig=sc.update.bind(sc);
    sc.update=t=>{orig(t);sc.fireLight.intensity*=fireDim;};
  }
}

// ── 场景与角色（多场景同存，按段 scene 字段硬切，Object3D reparent 无渐隐穿帮）──
const SCENES={shrine:new StardustShrineScene(),colonnade:new StarfallColonnadeScene()};
for(const sc of Object.values(SCENES)){sc.build();await sc.applyHybrid();} // ep1 无纹理目录→静默回退程序化
morningize(SCENES.shrine,{dome:true,fireDim:.6});
morningize(SCENES.colonnade);
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
// ── 机位表（特写距离 ≥3.0m 或 3/4 正面扇区内；快切段硬切）──
function camFor(shot,t,states){
  const trackX=(name)=>{const s=states[name];return [s.rootX,s.rootZ];};
  switch(shot){
    case 'establish':return{pos:lerp3([0,5.2,16],[0,4.2,13],ease(clamp(t/3.0))),look:[0,2.2,-6],fov:50};
    case 'morning_wide':return{pos:[-.5,1.7,7.6],look:[-1,1.2,2.0],fov:46};
    case 'chase_side':{const [x,z]=trackX('aoao');return{pos:[x+.4,1.35,8.4],look:[x-.4,1.15,3.0],fov:46};}
    case 'chase_low':{const [x,z]=trackX('aoao');return{pos:[x+1.3,.8,6.6],look:[x-.6,1.25,3.0],fov:48};}
    case 'notice':return{pos:[-.6,1.8,6.8],look:[-.8,1.5,1.0],fov:44};
    case 'azu_track':{const s=states.azu;return{pos:[s.rootX+1.2,1.5,6.6],look:[s.rootX,1.35,s.rootZ],fov:42};}
    case 'azu_clad_close':return{pos:[1.4,1.7,5.2],look:[1.5,1.35,3.0],fov:36};
    case 'two_profile':return{pos:[.2,1.5,6.4],look:[.2,1.3,2.8],fov:40};
    case 'exam1_two':return{pos:[-.2,1.5,5.6],look:[-.3,1.25,2.5],fov:42};
    case 'azu_react':return{pos:[.4,1.6,4.8],look:[1.5,1.5,3.0],fov:32};
    case 'exam2_wide':return{pos:[-1.0,1.8,6.4],look:[2.3,1.25,1.4],fov:46}; // 偏左机位：阿箸监考不入镜挡大釜
    case 'exam3_side':return{pos:[-3.0,1.4,5.4],look:[-1.2,1.2,2.5],fov:40};
    case 'azu_nod':return{pos:[.9,1.62,4.6],look:[1.5,1.5,3.0],fov:32};
    case 'spar_close':return{pos:[.6,1.5,4.6],look:SHIELD_PT,fov:38};
    case 'spar_wide':return{pos:[.4,1.8,6.2],look:[.6,1.3,2.5],fov:46};
    case 'spar_pinch':return{pos:[-.1,1.45,4.8],look:DISC_PT,fov:36};
    case 'hotpot_wide':return{pos:[-.2,2.0,7.6],look:[.2,1.0,3.5],fov:46};
    case 'azu_close':{const s=states.azu;return{pos:[s.rootX-.7,1.62,s.rootZ+2.1],look:[s.rootX,1.5,s.rootZ],fov:30};} // 破功特写（追踪，跟上她被香气勾走的一步）
    case 'final_wide':return{pos:[0,2.4,9.4],look:[0,2.2,-2],fov:48};
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
for(const m of [impactRing,dustRing,flare,...sparks])SCENES.shrine.scene.add(m);
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
// 饭团（阿鏊追逐右手持有）
const riceBall=new THREE.Group();
{const b=new THREE.Mesh(new THREE.SphereGeometry(.055,12,10),new THREE.MeshToonMaterial({color:'#f4f0e6'}));
 b.scale.set(1,.85,.9);riceBall.add(b);
 const nori=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.062),new THREE.MeshToonMaterial({color:'#1c2a1e'}));
 nori.position.y=-.03;riceBall.add(nori);}
// 卷轴（年检通告：圣物大锅喷出，悬浮展开）
const scroll=new THREE.Group();
{const paper=new THREE.Mesh(new THREE.PlaneGeometry(.62,.42),
   new THREE.MeshBasicMaterial({color:'#f0e4c8',side:THREE.DoubleSide}));
 scroll.add(paper);
 const cv=document.createElement('canvas');cv.width=256;cv.height=172;const g=cv.getContext('2d');
 g.fillStyle='#f0e4c8';g.fillRect(0,0,256,172);g.fillStyle='#8a2a22';
 g.font='bold 44px STKAITI,KaiTi,serif';g.textAlign='center';g.fillText('年检通告',128,62);
 g.font='22px STKAITI,KaiTi,serif';g.fillStyle='#4a3630';
 g.fillText('今日午时 战壳年检',128,104);g.fillText('审查官：筷子座·阿箸',128,138);
 const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
 paper.material.map=tex;paper.material.needsUpdate=true;
 for(const y of [-.23,.23]){const rod=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.66,8),
   new THREE.MeshToonMaterial({color:'#8a5a2a'}));rod.rotation.z=Math.PI/2;rod.position.y=y;scroll.add(rod);}
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,color:'#ffd98a',transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
 glow.scale.setScalar(1.6);scroll.add(glow);}
scroll.visible=false;
// 煎蛋（打在盾面上）
const egg=new THREE.Group();
{const white=new THREE.Mesh(new THREE.CircleGeometry(.075,16),new THREE.MeshToonMaterial({color:'#fff4e0'}));
 const yolk=new THREE.Mesh(new THREE.CircleGeometry(.032,12),new THREE.MeshToonMaterial({color:'#ffb35e'}));
 yolk.position.z=.004;egg.add(white,yolk);}
egg.visible=false;
// 青石（大釜蛮力道具，搁石台上）+ 石台
const stone=new THREE.Mesh(new THREE.BoxGeometry(.5,.38,.42),new THREE.MeshToonMaterial({color:'#6a7280'}));
stone.castShadow=true;
const pedestal=new THREE.Mesh(new THREE.BoxGeometry(.66,.8,.66),new THREE.MeshToonMaterial({color:'#4a5058'}));
pedestal.position.set(2.4,.4,1.3);pedestal.castShadow=pedestal.receiveShadow=true;
// 火锅（收尾道具：铜锅+炭火+热气）
const hotpot=new THREE.Group();
{const potM=new THREE.MeshToonMaterial({color:'#a8683a'});
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.30,.24,.20,20),potM);body.position.y=.24;hotpot.add(body);
 const chimney=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.22,12),potM);chimney.position.y=.42;hotpot.add(chimney);
 const soup=new THREE.Mesh(new THREE.CircleGeometry(.26,18),
   new THREE.MeshBasicMaterial({color:'#e05a2a'}));soup.rotation.x=-Math.PI/2;soup.position.y=.335;hotpot.add(soup);
 const glow2=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,color:'#ff9a4a',transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));
 glow2.scale.setScalar(.8);glow2.position.y=.36;hotpot.add(glow2);
 hotpot.userData.soup=soup;hotpot.userData.glow=glow2;}
hotpot.visible=false;
const steam=[]; // 热气/香气 sprite（64.2 起，飘向阿箸）
{for(let i=0;i<10;i++){
   const s=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,color:'#fff2dc',transparent:true,opacity:0,depthWrite:false}));
   s.userData={ph:i*.7};SCENES.shrine.scene.add(s);steam.push(s);
 }}
SCENES.shrine.scene.add(riceBall,scroll,egg,stone,hotpot,pedestal);
stone.position.set(2.4,.99,1.3);

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
function drawTitle(t){ // 片头字卡：0.4 淡入 → 2.6 淡出
  const alpha=t<.4?0:t<1.0?ease((t-.4)/.6):t>2.6?1-ease((t-2.6)/.5):1;
  if(alpha<=0)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='center';ctx.lineJoin='round';
  ctx.shadowColor='#ffb35e';ctx.shadowBlur=16;
  ctx.strokeStyle='#0c0a12';ctx.lineWidth=11;
  ctx.font='bold 84px STKAITI,KaiTi,serif';
  ctx.strokeText('星屑战壳',W/2,H*.40);ctx.fillStyle='#ffe8c0';ctx.fillText('星屑战壳',W/2,H*.40);
  ctx.shadowBlur=0;ctx.font='bold 30px STKAITI,KaiTi,serif';
  ctx.strokeText('第一集 · 年检风波',W/2,H*.40+56);ctx.fillStyle='#ffd98a';ctx.fillText('第一集 · 年检风波',W/2,H*.40+56);
  ctx.restore();ctx.globalAlpha=1;
}
function drawSubtitle(t){ // 对白字幕（底部居中，角色分色）
  const l=lineAt(t);if(!l)return;
  const name={aoao:'阿鏊',xiaozao:'小凿',dafu:'大釜',azu:'阿箸',hestia:'赫斯提亚'}[l.speaker];
  ctx.font='bold 26px Microsoft YaHei';ctx.textAlign='center';ctx.lineWidth=6;ctx.lineJoin='round';
  ctx.strokeStyle='rgba(16,14,20,.88)';ctx.fillStyle=DIALOG.colors[l.speaker]??'#fff';
  ctx.strokeText(`${name}：${l.text}`,W/2,H-52);
  ctx.fillText(`${name}：${l.text}`,W/2,H-52);
}
function fadeBlack(t){
  const aIn=t<.6?(1-ease(t/.6))*.70:0; // R6 封面帧纪律：30% 亮度起
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
      if(phase.startsWith('spar')&&name==='azu')actor.face.lookAtWorld(new THREE.Vector3(...(phase==='spar2'?PAULDRON_PT:phase==='spar3'?DISC_PT:SHIELD_PT)));
      else if(phase.startsWith('spar'))actor.face.lookAtWorld(new THREE.Vector3(actors.azu.mesh.position.x,1.5,actors.azu.mesh.position.z));
      else actor.face.lookAtWorld(camera.position);
    }
  }
  // 口型：能量包络轨（同一零点=混音摆点）；非说话窗 jaw=0 复位（防停在上一条末帧口型）
  const active=lineAt(t);
  for(const name of ['aoao','xiaozao','dafu','azu'])
    actors[name].mouth.apply({jaw:active?.speaker===name?jawAt(active.id,t):0,width:1});
  // 女神（finale 现身）
  if(actors.hestia.mesh.visible){
    actors.hestia.setEmotion('neutral',states.hestia.blink??autoBlink(t+2.3));
    actors.hestia.face.lookAtWorld?.(camera.position);
    actors.hestia.mouth.apply({jaw:active?.speaker==='hestia'?jawAt(active.id,t)*.85:0,width:1});
  }
  // 锅鸣一齐眨眼
  if(t>=T.CLANG&&t<T.CLANG+.15)for(const n of ['aoao','xiaozao','dafu','azu'])
    actors[n].setEmotion(states[n].emotion??'neutral',1);

  // ── 道具驱动 ──
  riceBall.visible=phase==='chase';
  if(riceBall.visible){const h=actors.aoao.hands.right.getWorldPosition(new THREE.Vector3());
    riceBall.position.copy(h).add(new THREE.Vector3(0,.06,.02));riceBall.rotation.y=t*.8;}
  scroll.visible=t>T.SCROLL&&t<27.0;
  if(scroll.visible){
    const u=ease(clamp((t-T.SCROLL)/1.0));
    scroll.position.set(lerp3([0,3.9,-5],[0,1.9,.8],u)[0],lerp3([0,3.9,-5],[0,1.9,.8],u)[1]+.05*Math.sin(t*1.4)*u,lerp3([0,3.9,-5],[0,1.9,.8],u)[2]);
    scroll.rotation.x=-.1+.05*Math.sin(t*.9);scroll.scale.setScalar(.3+.7*u);
  }
  egg.visible=t>T.EGG&&t<37.0;
  if(egg.visible){ // 贴在盾面外侧（沿穹顶外法线偏移，防埋进鼓包）
    const d=actors.aoao.shieldDome.getWorldPosition(new THREE.Vector3());
    const q=actors.aoao.shieldDome.getWorldQuaternion(new THREE.Quaternion());
    const n=new THREE.Vector3(-1,0,0).applyQuaternion(q).normalize(); // 盾面外法线
    egg.position.copy(d).addScaledVector(n,.115);
    egg.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);
    const u=clamp((t-T.EGG)/.3);egg.scale.setScalar(.4+.6*ease(u));
  }
  { // 青石：举起跟随双手 → 脱手抛物线 → 落地常驻（每帧全字段驱动：seek 安全）
    const u=(t-T.STONE_SLIP)/(T.STONE_LAND-T.STONE_SLIP);
    if(t<41.0){stone.position.set(2.4,.99,1.3);stone.rotation.set(0,0,0);}
    else if(t<T.STONE_SLIP){ // 跟随大釜双手中点
      const hl=actors.dafu.hands.left.getWorldPosition(new THREE.Vector3()),
        hr=actors.dafu.hands.right.getWorldPosition(new THREE.Vector3());
      stone.position.copy(hl).add(hr).multiplyScalar(.5);stone.position.y-=.16;
      stone.rotation.set(0,0,0);
    }else if(u<=1){ // 抛物线（水平匀速+竖直抛体，落得越来越快）
      stone.position.set(2.4+(1.7-2.4)*u,1.9+4.0*u-5.71*u*u,1.3+(0.7-1.3)*u);
      stone.rotation.set(u*5,u*3,u*2);
    }else{stone.position.set(1.7,.19,0.7);stone.rotation.set(5,3,2);}
  }
  hotpot.visible=t>T.POT;
  if(hotpot.visible){
    hotpot.position.set(.3,0,3.6);
    const u=ease(clamp((t-T.POT)/.25));hotpot.scale.setScalar(.3+.7*u);
    hotpot.userData.soup.material.color.setHSL(.05,.75,.45+.08*Math.sin(t*3));
    hotpot.userData.glow.material.opacity=.5+.25*Math.sin(t*5);
    for(const [i,s] of steam.entries()){ // 热气升腾+香气飘向阿箸
      const v=(t-T.STEAM+i*.13)%2.4/2.4;
      if(t<T.STEAM){s.material.opacity=0;continue;}
      const drift=clamp((t-65.0)/1.5)*.5;
      s.position.set(.3+Math.sin(t*1.2+s.userData.ph)*.12-drift*v,
        .45+v*1.5,3.6+Math.cos(t*.9+s.userData.ph)*.10-drift*.4*v);
      s.material.opacity=.30*(1-v)*v*4;s.scale.setScalar(.12+v*.35);
    }
  }

  // ── 特效事件（锚点=performance 常量/活锚点）──
  if(Math.abs(t-T.TAP1)<.5){const d=actors.aoao.shieldDome.getWorldPosition(new THREE.Vector3());
    ringAt(impactRing,d.x,d.y,d.z,t,T.TAP1,'#ff8a96',1.0,.4);flareAt(t,T.TAP1,d.x,d.y,d.z,'#ffd0d4');}
  else if(Math.abs(t-T.TAP2)<.5){const p=actors.dafu.fitRefs.pauldrons.find(x=>x.side==='right').ref.getWorldPosition(new THREE.Vector3());
    ringAt(impactRing,p.x,p.y,p.z,t,T.TAP2,'#ff8a96',.8,.4);flareAt(t,T.TAP2,p.x,p.y,p.z,'#ffd0d4');}
  else if(Math.abs(t-T.PINCH)<.5){const d=actors.xiaozao.bracerDiscL.getWorldPosition(new THREE.Vector3());
    ringAt(impactRing,d.x,d.y,d.z,t,T.PINCH,'#8fd8ff',.8,.4);flareAt(t,T.PINCH,d.x,d.y,d.z,'#d4ecff');}
  else{impactRing.visible=false;flare.visible=false;for(const s of sparks)s.visible=false;}
  if(Math.abs(t-T.STONE_LAND)<.6)ringAt(dustRing,1.7,.03,.7,t,T.STONE_LAND,'#c9b89a',1.6,.6);
  else if(Math.abs(t-T.SIT)<.6)ringAt(dustRing,states.dafu.rootX,.03,states.dafu.rootZ,t,T.SIT,'#c9b89a',1.2,.5);
  else dustRing.visible=false;
  // 考核三：星屑光点穿孔（6 连，47.0 起每 .28s 一点，穿过花窗盘平面）
  if(phase==='exam3'&&t>T.EXAM3){
    const d=actors.xiaozao.bracerDiscL.getWorldPosition(new THREE.Vector3());
    for(const [i,s] of sparks.entries()){
      if(i>=6){s.visible=false;continue;}
      const u=(t-T.EXAM3-i*.28)/.5;
      if(u<0||u>1){s.visible=false;continue;}
      s.visible=true; // 从右侧飞入穿孔到左侧（x+ → x- 掠过盘面）
      s.position.set(d.x+1.2-2.4*ease(u),d.y+.06*Math.sin(i*2.1),d.z+.06*Math.cos(i*1.7));
      s.material.color.set('#9fd8ff');s.material.opacity=.9*(1-Math.abs(u-.5)*1.2);
      s.scale.setScalar(.05+.03*Math.sin(i));
    }
    flare.visible=false;
  }

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
      xiaoDisc:actors.xiaozao.bracerDiscL.getWorldPosition(new THREE.Vector3()).toArray(),
      dafuPaulR:actors.dafu.fitRefs.pauldrons.find(x=>x.side==='right').ref.getWorldPosition(new THREE.Vector3()).toArray(),
      stonePos:stone.position.toArray(),
      metrics,...hestiaKeys},
    ...(Object.keys(locomotion).length?{locomotion}:{})};
  if(actors.hestia.mesh.visible)state.hestiaRoot=[HESTIA_SEAT.x,HESTIA_SEAT.z];
  if(!capture)return state;
  renderer.render(scene.scene,camera);
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  // ── 画布叠加层 ──
  if(phase==='establish')drawTitle(t);
  drawSFX('叮——！','#ff8a96',T.TAP1,T.TAP1+.38,t);
  drawSFX('叮！','#ff8a96',T.TAP2,T.TAP2+.34,t);
  drawSFX('咔！','#8fd8ff',T.PINCH,T.PINCH+.40,t);
  drawSFX('当——！','#ffd98a',T.CLANG,T.CLANG+.55,t);
  flash(t,T.TAP1,.09,.45);flash(t,T.TAP2,.08,.4);flash(t,T.PINCH,.09,.4);flash(t,T.CLANG,.12,.4);
  drawSubtitle(t);fadeBlack(t);
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.setFreeCamera=c=>window.freeCamera=c;
window.setSolo=n=>window.soloName=n;
// check 抽帧表：条目始/中/末 + 全部事件帧
window.checkTimes=[...entries.flatMap(e=>[e.startTime+.15,(e.startTime+e.endTime)/2,e.endTime-.10]),
  T.SCROLL+.3,T.AZU_CLAD+.5,T.AZU_CLAD+1.5,T.EGG+.2,T.STONE_SLIP+.1,T.STONE_LAND+.05,T.SIT+.2,
  T.EXAM3+.5,T.TAP1,T.TAP2,T.PINCH,T.POT+.3,T.STEAM+1,T.HESTIA+.4,T.CLANG+.03]
  .filter(t=>t>0&&t<TL.duration).sort((a,b)=>a-b);
await document.fonts.ready;window.ready=true;
