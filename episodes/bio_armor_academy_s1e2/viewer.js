// 《9章》S1E2 viewer：横屏 1280×720，RuinsDuskScene + LeiXiaoCraft/HongGangCraft/ObserverCraft。
// 数据链同 yuki_airport_t2：script.story + config/timeline.json + viseme_*.json +
// final_voice_features.json（缺失时静默降级）。字卡=title-card 工具生成的帧序列叠加。
import * as THREE from 'three';
import {StoryParser} from 'dula-engine';
import {LeiXiaoCraft,HongGangCraft,ObserverCraft} from './characters.js';
import {poseAt,ease,clamp} from './performance.js';
import {installFightActors,fightPoseAt,fightCamera} from './fight_trial.js';
import {RuinsDuskScene} from './scenes/RuinsDuskScene.js';
const fightTrial=!new URLSearchParams(location.search).has('legacy-performance');
const W=1280,H=720;
const storyText=await fetch('./script.story').then(r=>r.text());
const entries=StoryParser.parse(storyText);
let TL=null,visemeLei=null,visemeHong=null,voiceFeatures=null;
try{TL=await fetch('./config/timeline.json').then(r=>r.ok?r.json():null);}catch{}
try{visemeLei=await fetch('./config/viseme_leixiao.json').then(r=>r.ok?r.json():null);}catch{}
try{visemeHong=await fetch('./config/viseme_honggang.json').then(r=>r.ok?r.json():null);}catch{}
try{voiceFeatures=await fetch('./config/final_voice_features.json').then(r=>r.ok?r.json():null);}catch{}
window.duration=Math.max(...entries.map(e=>e.endTime));
if(TL&&Math.abs(window.duration-TL.duration)>.05)throw new Error(`Stale media timeline: story ${window.duration} vs timeline ${TL.duration}`);
const hasLip=!!(visemeLei&&visemeHong&&voiceFeatures);
// 字卡帧序列（tools/make_cards.py 生成 config/cards.json）
let cards={};
try{
  const meta=await fetch('./config/cards.json').then(r=>r.ok?r.json():null);
  if(meta)for(const c of meta.cards){
    cards[c.id]=await Promise.all(c.frames.map(f=>new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=f;})));
  }
}catch{}

const stage=new RuinsDuskScene();stage.build();await stage.applyHybrid();
const lei=new LeiXiaoCraft(),hong=new HongGangCraft(),observer=new ObserverCraft();
if(fightTrial)installFightActors(lei,hong);
stage.scene.add(lei.mesh,hong.mesh,observer.mesh);
observer.mesh.position.set(-7.3,6.15,-11.8);observer.mesh.rotation.y=2.2;
observer.mesh.visible=false;

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d');
const camera=new THREE.PerspectiveCamera(44,W/H,.05,200);

function makeLip(track,name){
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
    return {jaw:chan(t,'jaw')*gate,width:1+.4*chan(t,'width')};
  };
}
const zeroLip=()=>({jaw:0,width:1});
const lipLei=hasLip?makeLip(visemeLei,'LeiXiao'):zeroLip;
const lipHong=hasLip?makeLip(visemeHong,'HongGang'):zeroLip;

// 字幕（底部描边条，角色分色）
const fallbackSubs=entries.filter(e=>e.character).map(e=>{
  const m=e.content.match(/\[(\w+)\]\s*([^{}\n]*)$/m);
  return {character:e.character,text:m?m[2].trim():'',start:e.startTime+.05,end:e.endTime-.05};
});
const subtitles=TL?TL.subtitles:fallbackSubs;
const SUB_COLOR={LeiXiao:'#d8ecff',HongGang:'#ffd9a0'};
function drawSubtitle(t){
  const sub=subtitles.find(s=>t>=s.start-.06&&t<s.end);
  if(!sub||!sub.text)return null;
  const fragments=(sub.text.match(/[^，。！？…—]+[，。！？…—]?/g)??[sub.text])
    .flatMap(f=>{const out=[];while(f.length>24){out.push(f.slice(0,24));f=f.slice(24);}if(f)out.push(f);return out;});
  const lines=[];let line='';
  for(const f of fragments){
    if((line+f).length>24&&line){lines.push(line);line='';}
    line+=f;
    if(/[！？]$/.test(f)){lines.push(line);line='';} // 叹问句硬断句：跨句不连读
  }if(line)lines.push(line);
  const y=H-66-(lines.length-1)*34;
  ctx.font='bold 25px Microsoft YaHei';ctx.textAlign='center';ctx.lineWidth=6;ctx.lineJoin='round';
  for(let i=0;i<lines.length;i++){
    ctx.strokeStyle='rgba(16,14,20,.88)';ctx.fillStyle=SUB_COLOR[sub.character]??'#fff';
    ctx.strokeText(lines[i],W/2,y+i*34);ctx.fillText(lines[i],W/2,y+i*34);
  }
  return sub.text;
}

// 拟声词大字（手写爆裂体：冲击血红 / 能量青绿）
function drawSFX(text,color,t0,t1,t){
  const u=clamp((t-t0)/(t1-t0));if(u<=0||u>=1)return;
  const pop=u<.18?ease(u/.18)*1.15:1.15-.15*ease((u-.18)/.3);
  const alpha=u>.75?1-(u-.75)/.25:1;
  ctx.save();ctx.translate(W*.5,H*.34);ctx.scale(pop,pop);
  ctx.font='bold 92px STKAITI,KaiTi,serif';ctx.textAlign='center';ctx.lineJoin='round';
  ctx.globalAlpha=alpha;
  ctx.shadowColor='#fff';ctx.shadowBlur=9;
  ctx.strokeStyle='#101418';ctx.lineWidth=10;ctx.strokeText(text,0,0);
  ctx.fillStyle=color;ctx.fillText(text,0,0);
  ctx.restore();ctx.globalAlpha=1;
}
// 冲击帧：整帧白闪
function flash(t,t0,dur=.1,strength=.85){
  const u=(t-t0)/dur;if(u<0||u>1)return;
  ctx.fillStyle=`rgba(255,255,255,${(1-u)*strength})`;ctx.fillRect(0,0,W,H);
}
// 集中线（动作格）
function speedLines(t,t0,t1){
  if(t<t0||t>t1)return;
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=2;
  const cx=W*.5,cy=H*.42;
  for(let i=0;i<26;i++){
    const a=i/26*Math.PI*2+t*.4,r0=H*.42;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);
    ctx.lineTo(cx+Math.cos(a)*r0*1.5,cy+Math.sin(a)*r0*1.5);ctx.stroke();
  }
  ctx.restore();
}
// 字卡叠加
function drawCard(id,u){
  const frames=cards[id];
  if(frames&&frames.length){const f=frames[Math.min(frames.length-1,Math.floor(u*frames.length))];
    if(f){ctx.drawImage(f,0,0,W,H);return true;}}
  // 帧缺失时兜底：黑底墨字
  ctx.fillStyle=`rgba(14,12,16,${Math.min(1,u*4,(1-u)*4+.2)})`;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#f4efe6';ctx.textAlign='center';
  ctx.font='bold 72px STKAITI,KaiTi,serif';
  ctx.fillText(id==='flash'?'让我看看，你会羽化成什么。':id==='open'?'9章·残卷其二':'残卷·其二·终',W/2,H*.45);
  return true;
}

// 特效网格（时间驱动，确定性）
const dustRing=new THREE.Mesh(new THREE.TorusGeometry(1,.07,8,40),
  new THREE.MeshBasicMaterial({color:0xc9b89a,transparent:true}));
dustRing.rotation.x=-Math.PI/2;stage.scene.add(dustRing);
const impactRing=new THREE.Mesh(new THREE.TorusGeometry(1,.05,8,40),
  new THREE.MeshBasicMaterial({color:0x3DFFC8,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
stage.scene.add(impactRing);
function ringAt(mesh,x,y,z,t,t0,color,maxR=1.8){ // 时间驱动特效环
  const u=(t-t0)/.55;
  if(u<0||u>1){mesh.visible=false;return;}
  mesh.visible=true;mesh.position.set(x,y,z);
  mesh.scale.setScalar(.2+ease(u)*maxR);mesh.material.opacity=.9*(1-u);
  mesh.material.color.set(color);
  mesh.lookAt(camera.position);
}

// 反击落点：地面径向裂缝（命中后常驻）+ 碎石飞溅（溅落留作残骸，时间驱动）
const crackGroup=new THREE.Group();crackGroup.visible=false;stage.scene.add(crackGroup);
{
  const cm=new THREE.MeshBasicMaterial({color:0x241d16});
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2+.3,len=.5+((i*37)%10)/10*.7;
    const seg=new THREE.Mesh(new THREE.BoxGeometry(.035,.012,len),cm);
    seg.position.set(Math.cos(a)*len/2,.015,Math.sin(a)*len/2);seg.rotation.y=-a+Math.PI/2;
    crackGroup.add(seg);
  }
  crackGroup.position.set(1.05,.01,-2.0);
}
const rubble=[];
{
  const rm=new THREE.MeshToonMaterial({color:0x5a5248});
  for(let i=0;i<10;i++){
    const r=new THREE.Mesh(new THREE.TetrahedronGeometry(.04+((i*13)%5)*.012),rm);
    const a=i/10*Math.PI*2+.7,sp=.8+((i*29)%10)/10*1.1;
    r.userData={dx:Math.cos(a)*sp,dz:Math.sin(a)*sp,v0:1.6+((i*17)%10)/10,ph:i};
    r.castShadow=true;r.visible=false;stage.scene.add(r);rubble.push(r);
  }
}
function rubbleAt(t,t0,anchor={x:1.05,y:1.35,z:-2.0}){
  const u=t-t0;
  for(const r of rubble){
    if(u<0){r.visible=false;continue;}
    r.visible=true;const d=r.userData,fl=Math.min(u,.9);
    r.position.set(anchor.x+d.dx*fl,.06+Math.max(0,d.v0*u-4.9*u*u),anchor.z+d.dz*fl);
    r.rotation.set(fl*7+d.ph,fl*5,d.ph);
  }
}
const dustRing2=new THREE.Mesh(new THREE.TorusGeometry(1,.07,8,40),
  new THREE.MeshBasicMaterial({color:0xc9b89a,transparent:true}));
dustRing2.rotation.x=-Math.PI/2;stage.scene.add(dustRing2);
// 真光效（加色混合 sprite）：接触闪光 + 火花迸溅，世界锚定时间驱动
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
  flare.scale.setScalar(.5+2.6*ease(u));
  flare.material.opacity=u<.12?u/.12:1-ease((u-.12)/.88);
  flare.material.color.set(color);
  const tt=u*.5;
  for(const s of sparks){const d=s.userData;s.visible=true;
    s.position.set(x+d.vx*tt,y+d.vy*tt-2.45*tt*tt,z+d.vz*tt);
    s.material.color.set(color);s.material.opacity=.9*(1-u);s.scale.setScalar(.04+.06*(1-u));}
}
// 头顶规避（监制决定镜头躲）：背景筒顶缘 ~19° 仰角，画面上沿不得超过
function clampSky(c){
  const maxEl=13.5*Math.PI/180,[px,py,pz]=c.pos,[lx,ly,lz]=c.look;
  const dx=lx-px,dy=ly-py,dz=lz-pz,rh=Math.hypot(dx,dz);
  const pitch=Math.atan2(dy,rh),halfV=(c.fov??44)/2*Math.PI/180;
  if(pitch+halfV<=maxEl)return c;
  return {...c,look:[lx,py+Math.tan(maxEl-halfV)*rh,lz]};
}

const lerp3=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u);
function camFor(shot,t,entry){
  const u=entry?ease(clamp((t-entry.startTime)/(entry.endTime-entry.startTime))):0;
  switch(shot){
    case 'establish':return{pos:lerp3([4.5,2.6,8.5],[3.2,2.0,7.2],u),look:[-3,2.6,-14],fov:52};
    case 'walk':return{pos:lerp3([3.6,1.5,4.0],[1.6,1.4,3.4],u),look:lerp3([2.2,1.0,-1.4],[-.5,1.1,-2],u),fov:42};
    case 'hong_drop':return{pos:[1.6,1.3,2.6],look:[4.3,1.1,-4.4],fov:44};
    case 'hong':return{pos:[1.9,1.85,-2.25],look:[3.9,1.53,-3.3],fov:36};
    case 'lei':return{pos:[1.15,1.64,-1.23],look:[-.7,1.35,-2],fov:36};
    case 'wide':return{pos:[.5,1.9,6.2],look:[.4,1.2,-3.6],fov:46};
    case 'block':return{pos:[1.0,1.15,3.0],look:[1.0,1.15,-2.6],fov:40};
    case 'shout':return{pos:[lei.mesh.position.x+1.9,1.68,-1.15],look:[lei.mesh.position.x,1.36,-2],fov:38};
    case 'counter':return{pos:[.2,1.7,5.8],look:[1.8,1.2,-3.2],fov:44};
    case 'laugh':return{pos:[2.2,1.30,-1.4],look:[4.4,1.02,-2.9],fov:35};
    case 'mark':return{pos:[1.1,1.49,-1.15],look:[-.50,1.27,-2],fov:34};
    case 'hook':return{pos:lerp3([0,1.3,7.0],[-1.5,2.0,6.2],u),look:[-7.5,5.6,-12.5],fov:46};
    default:return{pos:[.5,1.9,6.2],look:[.4,1.2,-3.6],fov:46};
  }
}

function draw(t,capture=true){
  const performance=(fightTrial?fightPoseAt:poseAt)(lei,hong,entries,t);
  const {entry,i,opts,phase,dt,u,sl,sh,trial}=performance;
  stage.update(t);
  // Eyes follow the acting partner; the counterattack's authored face channels
  // override this default when it calls for looking at the arm or anticipating a hit.
  lei.mesh.updateMatrixWorld(true);hong.mesh.updateMatrixWorld(true);
  const gazeLei=hong.headGroup.getWorldPosition(new THREE.Vector3());
  const gazeHong=lei.headGroup.getWorldPosition(new THREE.Vector3());
  lei.face.lookAtWorld?.(gazeLei);hong.face.lookAtWorld?.(gazeHong);
  lei.setEmotion(sl.emotion,sl.blink??poseBlink(t));
  hong.setEmotion(sh.emotion??(phase==='hong_laugh'?(u<.3?'laugh':'determined'):'determined'),poseBlink(t+.83)); // 笑只留开头一瞬，随即收住放话
  lei.updateWeaponFX?.(t,sl.armorT??0,sl.shieldT??0);
  hong.updateWeaponFX?.(t,sh.gauntletT??0,{growing:phase==='hong_armor',hitT:sh.hitT??0});
  lei.mouth.apply(lipLei(t));
  hong.mouth.apply(!trial&&phase==='will_up'&&u>.12&&u<.55?{jaw:.5,width:.9}:lipHong(t)); // 被击飞惊呼
  observer.mesh.visible=phase==='hook';

  // 3D 特效（必须在 render 之前）
  const es=entry.startTime,dur=entry.endTime-entry.startTime;
  const hitPos=trial?.contact??{x:1.05,y:1.35,z:-2.0};
  const impactTime=trial?.hitTime??es+dur*.72;
  if(phase==='hong_drop')ringAt(dustRing,3.9,.03,-3.3,t,es+dur*.55,'#c9b89a',2.4);
  else dustRing.visible=false;
  if(phase==='clash1')ringAt(impactRing,-.05,1.35,-2.15,t,es+dur*.65,'#3DFFC8',2.2);
  else if(phase==='will_up')ringAt(impactRing,hitPos.x,hitPos.y,hitPos.z,t,impactTime,'#FF3B3B',trial?1.15:2.6);
  else impactRing.visible=false;
  if(phase==='will_up')ringAt(dustRing2,trial?2.85:4.4,.03,trial?-2.85:-2.9,t,trial?.landTime??es+dur*.30,'#c9b89a',trial?1.05:2.0);
  else dustRing2.visible=false;
  if(trial&&dustRing2.visible){dustRing2.rotation.set(-Math.PI/2,0,0);dustRing2.material.opacity*=.45;}
  if(phase==='clash1')flareAt(t,es+dur*.65,-.05,1.35,-2.15,'#3DFFC8');
  else if(phase==='clash2')flareAt(t,es+dur*.62,-.05,1.35,-2.15,'#3DFFC8');
  else if(phase==='will_up')flareAt(t,impactTime,hitPos.x,hitPos.y,hitPos.z,'#FF6B3B');
  else{flare.visible=false;for(const s of sparks)s.visible=false;}
  if(trial&&flare.visible)flare.scale.multiplyScalar(.45);
  const willEntry=entries.find(en=>en.storyEvents[0]?.options.move==='will_up');
  const WILL_HIT=willEntry.startTime+(willEntry.endTime-willEntry.startTime)*.72;
  crackGroup.visible=t>=WILL_HIT;
  if(crackGroup.visible)crackGroup.scale.setScalar(Math.max(clamp((t-WILL_HIT)/.12),.001));
  if(fightTrial)crackGroup.position.set(.38,.01,-2.33);
  else crackGroup.position.set(1.05,.01,-2.0);
  rubbleAt(t,WILL_HIT,fightTrial?{x:.38,y:1.185,z:-2.33}:undefined);

  let c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??44}:(fightCamera(performance)??camFor(opts.shot??'wide',t,entry));
  if(!window.freeCamera)c=clampSky(c);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();

  const locomotion={};
  for(const [name,actor,p] of [['lei',lei,performance.pL],['hong',hong,performance.pH]])if(p?.locomotion){
    const feet={};actor.mesh.updateMatrixWorld(true);
    for(const side of ['left','right']){
      const foot=actor.feet[side];let soleMin=Infinity;
      const vertex=new THREE.Vector3();
      foot.traverse(o=>{const a=o.geometry?.attributes.position;if(a)for(let i=0;i<a.count;i++){
        vertex.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);soleMin=Math.min(soleMin,vertex.y);
      }});
      feet[side]={position:foot.getWorldPosition(new THREE.Vector3()).toArray(),soleMin,
        quaternion:foot.getWorldQuaternion(new THREE.Quaternion()).toArray(),...p.locomotion.contacts[side]};
    }
    locomotion[name]={...p.locomotion,root:actor.mesh.position.toArray(),yaw:actor.mesh.rotation.y,feet,
      legs:Object.fromEntries(['left','right'].map(side=>[side,p[side+'Leg']]))};
  }
  const state={entry:i+1,phase,shot:opts.shot,leiEmotion:sl.emotion,leiJaw:lipLei(t).jaw,hongJaw:lipHong(t).jaw,
    armor:sl.armorT,shield:sl.shieldT,etch:sl.etchT,gauntlet:sh.gauntletT,
    leiRoot:[sl.rootX,sl.rootZ],hongRoot:[sh.rootX,sh.rootZ],...(trial?{trial}:{} ),
    ...(fightTrial?{thumbUp:{lei:lei.handThumbUp,hong:hong.handThumbUp}}:{}),...(Object.keys(locomotion).length?{locomotion}:{})};
  if(!capture)return state;
  renderer.render(stage.scene,camera);
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  // canvas 叠加层（3D 之上）：速度线/白闪/拟声词/字卡
  if(phase==='hong_drop')drawSFX('轰！','#FF3B3B',es+dur*.55,es+dur*.95,t);
  if(phase==='clash1'){flash(t,es+dur*.65,.09,.55);drawSFX('铛——！','#3DFFC8',es+dur*.65,es+dur*.98,t);}
  if(phase==='clash2'){flash(t,es+dur*.62,.08,.4);if(u>.55)drawCard('flash',(u-.55)/.45);}
  if(phase==='will_up'){flash(t,impactTime,trial?.067:.12,trial?.28:.7);if(!trial)drawSFX('碎！','#FF3B3B',impactTime,es+dur*.98,t);}
  if(opts.kind==='card')drawCard(opts.card,u);
  if(phase==='hook'&&u>.6)drawCard('end',(u-.6)/.4);
  state.subtitle=drawSubtitle(t);
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
function poseBlink(t){return Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);}
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.setFreeCamera=c=>window.freeCamera=c;
window.checkTimes=[...entries.flatMap(e=>[e.startTime+.15,(e.startTime+e.endTime)/2,e.endTime-.10])]
  .filter(t=>t>0&&t<window.duration).sort((a,b)=>a-b);
if(fightTrial){
  const e=entries.find(e=>e.storyEvents[0].options.move==='will_up'),hit=e.startTime+(e.endTime-e.startTime)*.72;
  const next=entries[entries.indexOf(e)+1];
  window.fightTrialRange=[Math.ceil(e.startTime*30)/30,Math.floor((next?.startTime??e.endTime)*30)/30];
  window.checkTimes=[...new Set([...window.checkTimes,...[-4.5,-3.6,-2.4,-1.0,-.35,-.20,-.1,-.04,0,.04,.1,.24,.45,.65,.78,1.0,1.5].map(x=>hit+x)])].sort((a,b)=>a-b);
  window.checkTimes.push(next.startTime-.04,next.startTime+.04,next.startTime+.4);
  window.checkTimes.sort((a,b)=>a-b);
}
await document.fonts.ready;window.ready=true;
if(!new URLSearchParams(location.search).has('capture')){
  const audio=new Audio('./assets3d/mixed.wav');
  const play=document.createElement('button');play.textContent='播放 / 暂停';play.style.cssText='position:fixed;bottom:14px;left:14px;z-index:3;padding:10px 18px;border:0;border-radius:22px;background:#f4efe6;color:#1c1a22;cursor:pointer';document.body.append(play);
  play.onclick=()=>audio.paused?audio.play():audio.pause();
  const seek=document.createElement('input');seek.type='range';seek.min=0;seek.max=window.duration;seek.step=.01;seek.style.cssText='position:fixed;bottom:24px;left:160px;width:min(45vw,400px)';document.body.append(seek);
  seek.oninput=()=>audio.currentTime=Number(seek.value);
  function tick(){draw(audio.currentTime);if(document.activeElement!==seek)seek.value=audio.currentTime;requestAnimationFrame(tick);}requestAnimationFrame(tick);
}
