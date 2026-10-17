// 《星屑战壳》OP viewer：横屏 1280×720，StardustShrineScene + 三主角（集内 characters.js）。
// P3 正式谱面 49.2s（152BPM，条目边界吸附 beatgrid）：打斗快切机位硬切（卡点语法），
// 特写机位在角色面朝 ±60° 内、距离 ≥3.0m。特效件抄 s1e2 模式：冲击环锚真实接触点、
// 火花粒子 LCG、白闪 ≤.55、拟声词大字、地面裂缝+碎石。纯 (t,state) 确定函数。
// window 契约（render.mjs 依赖）：duration / checkTimes / renderAt / stepAt / setFreeCamera / ready。
import * as THREE from 'three';
import {AoaoCraft,XiaozaoCraft,DafuCraft} from './characters.js';
import {StardustShrineScene} from './scenes/StardustShrineScene.js';
import {poseAt,ease,clamp,T,BLOCK_PT,CLASH_PT,LAND_PT} from './performance.js';

const W=1280,H=720;
const TL=await fetch('./config/timeline.json').then(r=>r.json());
window.duration=TL.duration;
const entries=TL.segments.map(s=>({startTime:s.start,endTime:s.end,
  opts:{move:s.move,shot:s.shot,kind:s.kind}}));

const stage=new StardustShrineScene();stage.build();await stage.applyHybrid();
const actors={aoao:new AoaoCraft(),xiaozao:new XiaozaoCraft(),dafu:new DafuCraft()};
for(const a of Object.values(actors))stage.scene.add(a.mesh);

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
    case 'clad_xiaozao':{ // 特写：他正面朝镜头，左前臂横抬胸前——打孔阵盘面翻出
      const s=states.xiaozao;
      return {pos:[s.rootX-.55,1.32,s.rootZ+3.2],look:[s.rootX+.05,1.10,s.rootZ+.20],fov:34};
    }
    case 'clad_dafu':return track('dafu',.85);
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
    case 'v2_gag':return{pos:[-.5,.95,9.0],look:[-.3,2.1,2.6],fov:48};
    case 'v2_pose':return{pos:lerp3([-.5,1.7,8.8],[-.5,1.55,7.8],u),look:[-.6,1.95,2.8],fov:42};
    case 'v2_hold':return{pos:lerp3([-.5,1.55,7.8],[1.0,1.8,7.6],u),look:[-.6,1.9,2.8],fov:42};
    case 'out_wide':return{pos:[-.5,2.0,9.8],look:[-1.0,1.5,2.2],fov:44};
    case 'out_pot':return{pos:[0,1.7,8.2],look:[0,3.2,-6],fov:44};
    default:return{pos:[0,3,12],look:[0,1.5,-2],fov:48};
  }
}

// ── 特效网格（时间驱动，确定性）──
const dustRing=new THREE.Mesh(new THREE.TorusGeometry(1,.07,8,40),
  new THREE.MeshBasicMaterial({color:0xc9b89a,transparent:true}));
dustRing.rotation.x=-Math.PI/2;stage.scene.add(dustRing);
const impactRing=new THREE.Mesh(new THREE.TorusGeometry(1,.05,8,40),
  new THREE.MeshBasicMaterial({color:0x3DFFC8,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
stage.scene.add(impactRing);
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
flare.visible=false;stage.scene.add(flare);
const sparks=[];
{let sd=13;const rr=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
 for(let i=0;i<16;i++){
   const s=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
   const a=rr()*Math.PI*2,el=rr()*1.1+.2,sp=2.5+rr()*3;
   s.userData={vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp,vz:Math.sin(a)*Math.cos(el)*sp};
   s.visible=false;stage.scene.add(s);sparks.push(s);
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
const crackGroup=new THREE.Group();crackGroup.visible=false;stage.scene.add(crackGroup);
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
    r.castShadow=true;r.visible=false;stage.scene.add(r);rubble.push(r);
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
   s.visible=false;stage.scene.add(s);dustConv.push(s);
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
  const aIn=t<.5?1-ease(t/.5):0; // 黑场淡入
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
  stage.update(t);

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

  // ── trace 探针状态（contact/gait 契约用；世界坐标）──
  const hands={},wv=new THREE.Vector3();
  for(const name of ['aoao','xiaozao','dafu']){
    hands[name]={};
    for(const side of ['left','right'])
      hands[name][side]=actors[name].hands[side].getWorldPosition(new THREE.Vector3()).toArray();
  }
  const locomotion={};
  for(const name of ['aoao','xiaozao','dafu'])
    if(poses[name]?.locomotion)locomotion[name]=poses[name].locomotion;
  const state={entry:entries.indexOf(entry)+1,phase,shot:opts.shot,
    clad:{aoao:states.aoao.cladT,xiaozao:states.xiaozao.cladT,dafu:states.dafu.cladT},
    aoaoRoot:[states.aoao.rootX,states.aoao.rootZ],
    xiaozaoRoot:[states.xiaozao.rootX,states.xiaozao.rootZ],
    dafuRoot:[states.dafu.rootX,states.dafu.rootZ],
    contact:{hands,aR:hands.aoao.right,dR:hands.dafu.right,
      shieldA:actors.aoao.shieldDome.getWorldPosition(wv).toArray(),clashAnchor:CLASH_PT},
    ...(Object.keys(locomotion).length?{locomotion}:{})};
  if(!capture)return state;
  renderer.render(stage.scene,camera);
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  // ── 画布叠加层 ──
  if(phase==='establish')drawTitle(t);
  drawSFX('铛——！','#3DFFC8',T.BLOCK,T.BLOCK+.42,t);
  drawSFX('砰！','#FF6B3B',T.CLASH,T.CLASH+.38,t);
  drawSFX('当——！','#ffd98a',T.CLANG,T.CLANG+.55,t);
  flash(t,T.CLASH,.09,.5);
  flash(t,T.CLANG,.12,.4);
  drawTitleSmall(t);drawSubtitle(t);fadeBlack(t);
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.setFreeCamera=c=>window.freeCamera=c;
// check 抽帧表：条目始/中/末 + 接触帧/gag 顶点/画外音/收尾
window.checkTimes=[...entries.flatMap(e=>[e.startTime+.15,(e.startTime+e.endTime)/2,e.endTime-.10]),
  2.113,T.BLOCK,T.CLASH,T.HOP,T.KNOCK,T.GAG,T.FREEZE+.2,T.VOICE+.4,T.CLANG+.03]
  .filter(t=>t>0&&t<TL.duration).sort((a,b)=>a-b);
await document.fonts.ready;window.ready=true;
