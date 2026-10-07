import * as THREE from 'three';
import {StoryParser} from 'dula-engine';
import {AirportYuki,AirportMochi} from './characters.js';
import {poseAt,poseCat,ease,clamp} from './performance.js';
import {installEnhancedFace,enhanceYukiBody} from './expression.js';
import {CraftMouth} from '/fish/mouth3d.js';
import {prepareMochi} from '/fish/performance3d.js';
import {ChangleAirportScene} from './scenes/ChangleAirportScene.js';
const W=720,H=1280;
const storyText=await fetch('./script.story').then(r=>r.text());
const entries=StoryParser.parse(storyText);
// 音频数据链（Phase 2 产物；缺失时静默降级：无口型、字幕回退到剧本行）
let TL=null,visemeYuki=null,visemeMochi=null,voiceFeatures=null;
try{TL=await fetch('./config/timeline.json').then(r=>r.ok?r.json():null);}catch{}
try{visemeYuki=await fetch('./config/viseme_yuki.json').then(r=>r.ok?r.json():null);}catch{}
try{visemeMochi=await fetch('./config/viseme_mochi.json').then(r=>r.ok?r.json():null);}catch{}
try{voiceFeatures=await fetch('./config/final_voice_features.json').then(r=>r.ok?r.json():null);}catch{}
window.duration=Math.max(...entries.map(e=>e.endTime));
if(TL&&Math.abs(window.duration-TL.duration)>.05)throw new Error(`Stale media timeline: story ${window.duration} vs timeline ${TL.duration}`);
const hasLip=!!(visemeYuki&&visemeMochi&&voiceFeatures);

const stage=new ChangleAirportScene();stage.build();
stage.scene.updateMatrixWorld(true);
const PAD_WORLD=stage.padGlow.getWorldPosition(new THREE.Vector3());
const actor=new AirportYuki(),cat=new AirportMochi();stage.scene.add(actor.mesh,cat.mesh);
const noRefine=new URLSearchParams(location.search).has('norefine');
const face=noRefine?null:installEnhancedFace(actor);if(!noRefine)enhanceYukiBody(actor);
const mouth=new CraftMouth(actor.headAssembly);prepareMochi(cat);

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);const ctx=canvas.getContext('2d');
const camera=new THREE.PerspectiveCamera(40,W/H,.05,160);

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
    const jaw=chan(t,'jaw')*gate;
    return {jaw,open:jaw,width:1+.4*chan(t,'width'),rounding:chan(t,'rounding'),seal:chan(t,'seal'),
      teeth:chan(t,'teeth'),purse:chan(t,'purse'),labiodental:chan(t,'labiodental')};
  };
}
const zeroLip=()=>({jaw:0,open:0,width:1,rounding:0,seal:0,teeth:0,purse:0,labiodental:0});
const lipYuki=hasLip?makeLip(visemeYuki,'Yuki'):zeroLip;
const lipMochi=hasLip?makeLip(visemeMochi,'Mochi'):zeroLip;

function applyCatMouth(lip){
  const open=lip.jaw>.025,rig=cat.songMouth,width=.018+.014*(1-lip.rounding)+.009*lip.jaw,height=.006+.036*lip.jaw;
  cat.mouth.visible=!open;rig.g.visible=open;rig.dark.scale.set(width,height,1);rig.dark.position.y=-height*.55;
  rig.tongue.visible=lip.jaw>.38;rig.tongue.scale.set(width*.52,height*.20,1);rig.tongue.position.y=-height*1.14;
  return {open,jaw:lip.jaw};
}

// 字幕：timeline.dialogue 优先；否则回退剧本行（[Char]text）
const fallbackSubs=entries.filter(e=>e.character).map(e=>{
  const m=e.content.match(/\[(\w+)\]\s*([^{}\n]*)$/m);
  return {character:e.character,text:m?m[2].trim():'',start:e.startTime+.05,end:e.endTime-.05,
    kind:e.storyEvents[0]?.options.kind??'dialogue'};
});
const subtitles=TL?TL.subtitles:fallbackSubs;
const SUB_COLOR={Yuki:'#fff6e8',Mochi:'#ffe09c',PA:'#cfe8ff'};
function drawSubtitle(t){
  const sub=subtitles.find(s=>t>=s.start-.06&&t<s.end);
  if(!sub||!sub.text)return null;
  const fragments=(sub.text.match(/[^，。！？…—]+[，。！？…—]?/g)??[sub.text])
    .flatMap(f=>{const out=[];while(f.length>17){out.push(f.slice(0,17));f=f.slice(17);}if(f)out.push(f);return out;});
  const lines=[];let line='';
  for(const f of fragments){if((line+f).length>17&&line){lines.push(line);line='';}line+=f;}if(line)lines.push(line);
  const y=H-118-(lines.length-1)*40;
  ctx.font='bold 29px Microsoft YaHei';ctx.textAlign='center';ctx.lineWidth=7;ctx.lineJoin='round';
  for(let i=0;i<lines.length;i++){
    ctx.strokeStyle='rgba(24,32,38,.86)';ctx.fillStyle=SUB_COLOR[sub.character]??'#fff';
    const text=(sub.kind==='voiceover'&&i===0?'📢 ':'')+lines[i];
    ctx.strokeText(text,W/2,y+i*40);ctx.fillText(text,W/2,y+i*40);
  }
  return sub.text;
}

const lerp3=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u);
function camFor(shot,t,entry){
  const u=entry?ease(clamp((t-entry.startTime)/(entry.endTime-entry.startTime))):0;
  switch(shot){
    case 'establish':return{pos:lerp3([3.6,2.9,8.6],[2.5,2.0,6.9],u),look:[-.4,1.9,-1.6],fov:43};
    case 'wide':return{pos:[.2,1.7,5.6],look:[-.1,1.0,-.4],fov:40};
    case 'yuki':return{pos:[.1,1.5,3.1],look:[-.5,1.12,0],fov:32};
    case 'cat':return{pos:[1.15,.75,1.9],look:[.62,.45,.12],fov:33};
    case 'sea':return{pos:[.1,1.5,3.4],look:[.05,1.3,-12],fov:46};
    case 'gtc':return{pos:[1.2,1.45,3.0],look:[-3.6,1.7,-13],fov:50};
    case 'ceiling':return{pos:[0,1.0,1.6],look:[-.2,5.2,-2.5],fov:58};
    case 'roof':return{pos:[1.5,1.3,4.8],look:[-.6,3.4,-2.5],fov:50};
    case 'checkin':return{pos:[.8,1.35,3.2],look:[-1.3,.8,-2.3],fov:50};
    case 'seat':return{pos:[1.0,1.4,7.6],look:[1.6,.7,2.3],fov:46};
    case 'restroom':return{pos:[0,1.4,3.6],look:[2.3,.7,-1.9],fov:52};
    case 'pad':return{pos:[1.2,.85,-.1],look:[2.8,.55,-1.3],fov:40};
    case 'pullback':return{pos:lerp3([.2,1.6,4.6],[.9,2.7,7.4],u),look:lerp3([0,1.3,-6],[0,1.8,-9],u),fov:44};
    default:return{pos:[.2,1.7,5.6],look:[-.1,1.0,-.4],fov:40};
  }
}

// 猫动作表：按条目 move 决定年糕行为
const CAT_MOVE={establish:'trot_follow',guide_wave:'talk',beg:'beg',point_up:'talk',cat_climb:'talk',
  point_up2:'talk',cat_kiosk:'talk',sea_point:'talk',sea_listen:'logic',gtc_ask:'gtc_watch',
  gtc_tell:'gtc_watch',gtc_punch:'gtc_back',checkin_push:'follow_checkin',
  checkin_idle:'talk_checkin',seat_usb:'walk_seat',seat_talk:'cat_phone',explain:'walk_restroom',
  press_watch:'paw_press',finale_proud:'walk_back',peek:'peek',speechless:'talk',smug:'smug',outro:'outro'};

function draw(t,capture=true){
  const {entry,i,opts,phase,dt,u,p,s,hands}=poseAt(actor,entries,Math.floor((t+1e-7)*30)/30);
  face?.update(s.point,p.blink,s.emotion,s.gaze??0);
  const ylip=lipYuki(t),clip=lipMochi(t);
  const yMouth=mouth.apply(ylip),cMouth=applyCatMouth(clip);

  // 行李箱三态
  const lug=stage.suitcase;
  const beltIdx=entries.findIndex(e=>e.storyEvents[0].options.move==='checkin_push');
  if(i>beltIdx){ // 托运完成：行李箱留在行李带上
    lug.rotation.set(-Math.PI/2,0,0);lug.position.set(-1.55,.21,-2.05);
  }else if(s.suitcase==='pull'){
    lug.rotation.set(-.30,0,0);
    lug.position.set(hands[1][0]+.02,0,hands[1][2]-.30);
  }else if(s.suitcase==='push'){
    const a=s.suitcaseA??0;
    lug.rotation.set(-.30*(1-ease(a/.25)),0,0);
    lug.position.set(-1.0,0,.55);
    if(a>0){
      const slide=ease(a);
      lug.position.x=mix2(-1.0,-1.55,slide);lug.position.z=mix2(.55,-1.55,slide);
      if(slide>.82){ // 倒上行李带
        const tip=ease((slide-.82)/.18);
        lug.rotation.x=-.30*(1-ease(a/.25))-tip*(Math.PI/2-.30*(1-ease(a/.25)));
        lug.position.y=tip*.12;lug.position.z=mix2(-1.55,-2.05,tip);
      }else lug.position.y=0;
    }
  }else{lug.rotation.set(0,0,0);lug.position.set(-.95,0,.62);}
  lug.visible=true;

  // 年糕
  const catMove=CAT_MOVE[phase]??'talk';
  poseCat(cat,catMove,dt,u,t,{yuki:[s.rootX,s.rootZ],padWorld:PAD_WORLD});

  // 猫爪手机
  const phoneOn=catMove==='cat_phone';
  stage.phone.visible=phoneOn===true;
  if(phoneOn){
    const paw=cat.paws.leftArm.getWorldPosition(new THREE.Vector3());
    stage.phone.position.copy(paw).add(new THREE.Vector3(0,.10,.02));
    stage.phone.rotation.set(-.5,-.30,.15);
  }
  // 感应面板按下时亮度脉冲
  const padPulse=catMove==='paw_press'&&u>.3?(0.75+.25*Math.sin(t*10)):1;
  stage.padGlow.scale.set(padPulse,padPulse,1);

  const c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??40}:camFor(opts.shot??'wide',t,entry);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();

  const state={entry:i+1,phase,shot:opts.shot,emotion:s.emotion,yukiJaw:yMouth.jaw,mochiJaw:cMouth.jaw,
    root:[s.rootX,s.rootZ],yaw:s.yaw,cat:cat.mesh.position.toArray(),suitcase:lug.position.toArray()};
  if(!capture)return state;
  renderer.render(stage.scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  if(t<2){ctx.fillStyle='rgba(24,42,52,.72)';ctx.fillRect(42,152,W-84,152);ctx.textAlign='center';
    ctx.fillStyle='#fff4d8';ctx.font='bold 40px Microsoft YaHei';ctx.fillText('小雪游 T2',W/2,222);
    ctx.font='22px Microsoft YaHei';ctx.fillText('福州长乐机场 T2 航站楼 · 小雪和年糕',W/2,268);}
  state.subtitle=drawSubtitle(t);
  if(t>window.duration-.5){ctx.fillStyle=`rgba(22,32,40,${ease((t-window.duration+.5)/.5)})`;ctx.fillRect(0,0,W,H);}
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
const mix2=(a,b,u)=>a+(b-a)*u;
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.setFreeCamera=c=>window.freeCamera=c;
window.checkTimes=[...entries.flatMap(e=>[e.startTime+.15,(e.startTime+e.endTime)/2,e.endTime-.10])]
  .filter(t=>t>0&&t<window.duration).sort((a,b)=>a-b);
await document.fonts.ready;window.ready=true;
if(!new URLSearchParams(location.search).has('capture')){
  const audio=new Audio('./assets3d/mixed.wav');
  const play=document.createElement('button');play.textContent='播放 / 暂停';play.style.cssText='position:fixed;bottom:14px;left:14px;z-index:3;padding:10px 18px;border:0;border-radius:22px;background:#fff4db;color:#273b40;cursor:pointer';document.body.append(play);
  play.onclick=()=>audio.paused?audio.play():audio.pause();
  const seek=document.createElement('input');seek.type='range';seek.min=0;seek.max=window.duration;seek.step=.01;seek.style.cssText='position:fixed;bottom:24px;left:160px;width:min(45vw,400px)';document.body.append(seek);
  seek.oninput=()=>audio.currentTime=Number(seek.value);
  function tick(){draw(audio.currentTime);if(document.activeElement!==seek)seek.value=audio.currentTime;requestAnimationFrame(tick);}requestAnimationFrame(tick);
}
