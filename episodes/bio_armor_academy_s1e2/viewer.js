// 《9章》S1E2 viewer：横屏 1280×720，RuinsDuskScene + LeiXiaoCraft/HongGangCraft/ObserverCraft。
// 数据链同 yuki_airport_t2：script.story + config/timeline.json + viseme_*.json +
// final_voice_features.json（缺失时静默降级）。字卡=title-card 工具生成的帧序列叠加。
import * as THREE from 'three';
import {StoryParser} from 'dula-engine';
import {LeiXiaoCraft,HongGangCraft,ObserverCraft} from './characters.js';
import {poseAt,ease,clamp} from './performance.js';
import {RuinsDuskScene} from './scenes/RuinsDuskScene.js';
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

const stage=new RuinsDuskScene();stage.build();
const lei=new LeiXiaoCraft(),hong=new HongGangCraft(),observer=new ObserverCraft();
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
  for(const f of fragments){if((line+f).length>24&&line){lines.push(line);line='';}line+=f;}if(line)lines.push(line);
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
  new THREE.MeshBasicMaterial({color:0x3DFFC8,transparent:true}));
stage.scene.add(impactRing);
function ringAt(mesh,x,y,z,t,t0,color,maxR=1.8){
  const u=(t-t0)/.55;
  if(u<0||u>1){mesh.visible=false;return;}
  mesh.visible=true;mesh.position.set(x,y,z);
  mesh.scale.setScalar(.2+ease(u)*maxR);mesh.material.opacity=.9*(1-u);
  mesh.material.color.set(color);
  mesh.lookAt(camera.position);
}

const lerp3=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u);
function camFor(shot,t,entry){
  const u=entry?ease(clamp((t-entry.startTime)/(entry.endTime-entry.startTime))):0;
  switch(shot){
    case 'establish':return{pos:lerp3([4.5,2.6,8.5],[3.2,2.0,7.2],u),look:[-3,2.6,-14],fov:52};
    case 'walk':return{pos:lerp3([3.6,1.5,4.0],[1.6,1.4,3.4],u),look:lerp3([2.2,1.0,-1.4],[-.5,1.1,-2],u),fov:42};
    case 'hong_drop':return{pos:[1.6,1.3,2.6],look:[4.3,1.1,-4.4],fov:44};
    case 'hong':return{pos:[1.0,1.6,1.0],look:[3.9,1.35,-3.3],fov:36};
    case 'lei':return{pos:[1.3,1.4,1.8],look:[-.55,1.22,-2],fov:36};
    case 'wide':return{pos:[.5,1.9,6.2],look:[.4,1.2,-3.6],fov:46};
    case 'block':return{pos:[1.0,1.15,3.0],look:[1.0,1.15,-2.6],fov:40};
    case 'shout':return{pos:[1.8,1.35,2.2],look:[-.3,1.25,-2],fov:36};
    case 'counter':return{pos:[.2,1.7,5.8],look:[1.8,1.2,-3.2],fov:44};
    case 'laugh':return{pos:[2.0,1.15,1.2],look:[4.3,.75,-2.9],fov:38};
    case 'mark':return{pos:[1.0,1.25,1.3],look:[-.55,1.05,-2],fov:31};
    case 'hook':return{pos:lerp3([0,1.3,7.0],[-1.5,2.0,6.2],u),look:[-7.5,5.6,-12.5],fov:46};
    default:return{pos:[.5,1.9,6.2],look:[.4,1.2,-3.6],fov:46};
  }
}

function draw(t,capture=true){
  const {entry,i,opts,phase,dt,u,sl,sh}=poseAt(lei,hong,entries,t);
  stage.update(t);
  lei.setEmotion(sl.emotion,lei.mesh.visible?(poseBlink(t)):0);
  lei.mouth.apply(lipLei(t));hong.mouth.apply(lipHong(t));
  observer.mesh.visible=phase==='hook';

  // 3D 特效（必须在 render 之前）
  const es=entry.startTime,dur=entry.endTime-entry.startTime;
  if(phase==='hong_drop')ringAt(dustRing,3.9,.03,-3.3,t,es+dur*.55,'#c9b89a',2.4);
  else dustRing.visible=false;
  if(phase==='clash1')ringAt(impactRing,.9,1.35,-2.4,t,es+dur*.65,'#3DFFC8',2.2);
  else if(phase==='will_up')ringAt(impactRing,2.4,1.3,-2.6,t,es+dur*.72,'#FF3B3B',2.6);
  else impactRing.visible=false;

  const c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??44}:camFor(opts.shot??'wide',t,entry);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();

  const state={entry:i+1,phase,shot:opts.shot,leiEmotion:sl.emotion,leiJaw:lipLei(t).jaw,hongJaw:lipHong(t).jaw,
    armor:sl.armorT,shield:sl.shieldT,etch:sl.etchT,gauntlet:sh.gauntletT,
    leiRoot:[sl.rootX,sl.rootZ],hongRoot:[sh.rootX,sh.rootZ]};
  if(!capture)return state;
  renderer.render(stage.scene,camera);
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  // canvas 叠加层（3D 之上）：速度线/白闪/拟声词/字卡
  if(phase==='hong_drop')drawSFX('轰！','#FF3B3B',es+dur*.55,es+dur*.95,t);
  if(phase==='clash1'){speedLines(t,es+dur*.1,es+dur*.5);flash(t,es+dur*.65,.09);drawSFX('铛——！','#3DFFC8',es+dur*.65,es+dur*.98,t);}
  if(phase==='clash2'){speedLines(t,es+dur*.08,es+dur*.45);flash(t,es+dur*.62,.08,.6);if(u>.55)drawCard('flash',(u-.55)/.45);}
  if(phase==='will_up'){speedLines(t,es+dur*.55,es+dur*.8);flash(t,es+dur*.72,.12,.95);drawSFX('碎！','#FF3B3B',es+dur*.72,es+dur*.98,t);}
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
await document.fonts.ready;window.ready=true;
if(!new URLSearchParams(location.search).has('capture')){
  const audio=new Audio('./assets3d/mixed.wav');
  const play=document.createElement('button');play.textContent='播放 / 暂停';play.style.cssText='position:fixed;bottom:14px;left:14px;z-index:3;padding:10px 18px;border:0;border-radius:22px;background:#f4efe6;color:#1c1a22;cursor:pointer';document.body.append(play);
  play.onclick=()=>audio.paused?audio.play():audio.pause();
  const seek=document.createElement('input');seek.type='range';seek.min=0;seek.max=window.duration;seek.step=.01;seek.style.cssText='position:fixed;bottom:24px;left:160px;width:min(45vw,400px)';document.body.append(seek);
  seek.oninput=()=>audio.currentTime=Number(seek.value);
  function tick(){draw(audio.currentTime);if(document.activeElement!==seek)seek.value=audio.currentTime;requestAnimationFrame(tick);}requestAnimationFrame(tick);
}
