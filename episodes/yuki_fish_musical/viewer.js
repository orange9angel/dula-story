import * as THREE from 'three';
import { Storyboard } from 'dula-engine';
import './bootstrap.js';
import { prepareFace } from './beat_performance.js';
import {poseActors} from './musical_performance.js';
import {updateHomeProps} from './home_props.js';

const W=720,H=1280;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
const camera=new THREE.PerspectiveCamera(35,W/H,.1,150);window.__dulaCamera=camera;
const board=new Storyboard(renderer,camera,null,null);
await board.load('/episode/script.story','/episode/assets/audio/manifest.json');
const TL=await(await fetch('/episode/config/timeline.json')).json();
const visemeYuki=await(await fetch('/episode/config/viseme_yuki.json')).json();
const visemeMochi=await(await fetch('/episode/config/viseme_mochi.json')).json();
const voiceFeatures=await(await fetch('/episode/config/final_voice_features.json')).json();
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.appendChild(canvas);
const ctx=canvas.getContext('2d');
window.duration=Math.max(...board.entries.map(e=>e.endTime));
if(Math.abs(window.duration-TL.duration)>.002)throw new Error('Stale media timeline');
window.shotEntries=board.entries.map(e=>({index:e.index,startTime:e.startTime,endTime:e.endTime}));

// --- data views -------------------------------------------------------------
const segments=TL.segments;
const segAt=t=>segments.find(s=>t>=s.start-1e-4&&t<s.end-1e-4)??{id:'reaction',kind:'reaction',start:t,end:t+1};
const authored=board.entries.filter(e=>e.storyEvents?.some(x=>x.options?.action==='AdPose'));
const optsFor=(e,name)=>e.storyEvents.find(x=>x.options?.action==='AdPose'&&x.options.character===name).options;
const yukiChars=[...TL.dialogue.filter(d=>d.character==='Yuki').flatMap(d=>d.chars),...TL.songB.chars]
  .sort((a,b)=>a.start-b.start);
const mochiChars=[...TL.dialogue.filter(d=>d.character==='Mochi').flatMap(d=>d.chars),...TL.songA.chars]
  .sort((a,b)=>a.start-b.start);
const beatTimes=TL.beat_grid.beats.slice().sort((a,b)=>a-b);
if(beatTimes.length&&beatTimes[0]>.5)beatTimes.unshift(0.0);
const downbeatTimes=TL.beat_grid.downbeats.slice().sort((a,b)=>a-b);
function beatAt(t){let lo=0,hi=beatTimes.length-1,ans=-1;
  while(lo<=hi){const mid=(lo+hi)>>1;if(beatTimes[mid]<=t+1e-4){ans=mid;lo=mid+1;}else hi=mid-1;}return ans;}
function beatInfoAt(t){
  if(!beatTimes.length)return null;
  const index=beatAt(t);
  if(index<0)return{index:-1,phase:0,sinceBeat:99,period:.5,downbeat:false};
  const period=index<beatTimes.length-1?beatTimes[index+1]-beatTimes[index]:index>0?beatTimes[index]-beatTimes[index-1]:.5;
  return{index,phase:Math.min((t-beatTimes[index])/period,1),sinceBeat:t-beatTimes[index],period,
    downbeat:downbeatTimes.some(d=>Math.abs(d-beatTimes[index])<1e-3)};
}

// Per-character lip tracks: cosine interpolation between 10ms keyframes.
function makeLip(track,chars,name){
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
    const i=chars.findLastIndex(c=>c.start<=t&&t<c.end);
    const ch=i>=0?chars[i]:null;
    return {open:jaw,jaw,width:1+.4*chan(t,'width'),rounding:chan(t,'rounding'),
      seal:chan(t,'seal'),labiodental:chan(t,'labiodental'),teeth:chan(t,'teeth'),purse:chan(t,'purse'),
      char:ch?ch.ch:null,audioIndex:i,amplitude:chan(t,'amplitude')};
  };
}
const lipYuki=makeLip(visemeYuki,yukiChars,'Yuki');
const lipMochi=makeLip(visemeMochi,mochiChars,'Mochi');

// Character construction is shared; acting is episode-local.
const yuki=board.characters.get('Yuki');
const mochi=board.characters.get('Mochi');
prepareFace(yuki);

// Dialogue and sung phrases share quiet, sentence-level household subtitles.
function drawSubtitle(t,seg){
  let text='';
  if(seg.kind==='dialogue'){
    const d=TL.dialogue.find(d=>d.id===seg.id);text=d?.display??seg.text;
  }else if(seg.kind==='song'){
    const line=TL[seg.id].lines.find(l=>t>=l.start-.06&&t<l.end+.15);
    text=line?.text??'';
  }
  if(!text)return '';
  ctx.save();ctx.font='500 30px "Microsoft YaHei",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  ctx.fillStyle='#ffffff';ctx.strokeStyle='rgba(25,25,25,.85)';ctx.lineWidth=3.6;
  const rows=[];let row='';
  for(const ch of text){
    if(ctx.measureText(row+ch).width>620){rows.push(row.trim());row='';}
    row+=ch;
  }
  if(row)rows.push(row.trim());
  rows.forEach((r,i)=>{const y=1180-(rows.length-1-i)*42;ctx.strokeText(r,360,y);ctx.fillText(r,360,y);});
  ctx.restore();return text;
}

// --- main loop ------------------------------------------------------------------
const home=board.currentScene.initializeHome(mochi);
{
  const times=[];
  for(const s of authored){times.push(s.startTime+.05,(s.startTime+s.endTime)/2,Math.max(s.endTime-.06,s.startTime+.06));}
  window.checkTimes=[...new Set(times.filter(t=>t>=0&&t<TL.duration).map(t=>Math.ceil(t*60)/60))].sort((a,b)=>a-b);
}
function draw(t){
  board.update(t);
  const scene=board.currentScene;
  const seg=segAt(t);
  const bi=beatInfoAt(t);
  const entry=authored.find(e=>t>=e.startTime&&t<e.endTime)??authored.at(-1);
  const ai=authored.indexOf(entry),allOpts={Yuki:optsFor(entry,'Yuki'),Mochi:optsFor(entry,'Mochi')};
  const previous=ai>0?{entry:authored[ai-1],opts:optsFor(authored[ai-1],'Yuki')}:null;
  const lip=lipYuki(t),catLip=lipMochi(t);
  const result=poseActors(yuki,mochi,t,entry,allOpts,lip,catLip,beatTimes,previous);
  const posed=result.yuki,opts=result.opts,mochiState=result.cat;
  updateHomeProps(home,t,entry,allOpts);

  const shot=opts.shot??'wide';
  const distance=shot==='evidence'?3.10:shot==='cat'?3.55:shot==='yuki'?3.8:6.25;
  const targetY=shot==='evidence'?.69:shot==='cat'?.70:shot==='yuki'?1.22:1.00;
  const focusX=['cat','evidence'].includes(shot)?.69:shot==='yuki'?-.43:.05;
  camera.position.set(focusX+.025*Math.sin(t*.6),targetY+.10,distance);
  camera.lookAt(focusX,targetY,0);
  camera.fov=35;camera.updateProjectionMatrix();

  renderer.render(scene.scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  const subtitle=drawSubtitle(t,seg);
  return{index:0,t,segment:seg.id,shot,subtitle,
    storyEntry:entry.index,move:opts.move,yukiLip:{jaw:Math.round(lip.jaw*1000)/1000,char:lip.char},mouth:result.yukiMouth,
    handPose:result.handPose,yukiHands:posed.hands,
    mochi:mochiState,
    singer:seg.kind==='song'?seg.character:null,
    beat:bi&&bi.index>=0?{index:bi.index,downbeat:bi.downbeat}:null,
    handClearance:posed.handClearance,feet:posed.feet,root:yuki.mesh.position.toArray(),catRoot:mochi.mesh.position.toArray(),camera:camera.position.toArray()};
}
window.stepAt=t=>draw(t);
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/jpeg',.95).split(',')[1],state};};
await document.fonts.ready;window.ready=true;draw(0);
if(!new URLSearchParams(location.search).has('capture')){
  const audio=new Audio('/episode/assets/audio/mixed.wav');audio.loop=true;
  document.body.title='点击播放 / 暂停';document.body.onclick=()=>audio.paused?audio.play():audio.pause();
  function animate(){draw(audio.currentTime);requestAnimationFrame(animate);}animate();
}
