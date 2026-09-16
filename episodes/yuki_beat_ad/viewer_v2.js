import * as THREE from 'three';
import { Storyboard } from 'dula-engine';
import './bootstrap.js';
import { perform } from './beat_performance.js';

const W=720,H=1280;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const camera=new THREE.PerspectiveCamera(42,W/H,.1,150);
window.__dulaCamera=camera;
const board=new Storyboard(renderer,camera,null,null);
await board.load('/episode/script_v2.story','/episode/assets/audio/manifest.json');
const analysis=await(await fetch('/episode/config/music_analysis_v2.json')).json();
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.appendChild(canvas);
const ctx=canvas.getContext('2d');
window.duration=Math.max(...board.entries.map(e=>e.endTime));
window.shotEntries=board.entries.map(e=>({index:e.index,startTime:e.startTime,endTime:e.endTime}));
window.checkTimes=[...new Set([.1,...board.entries.slice(1).flatMap(e=>[e.startTime-.067,e.startTime,e.startTime+.10]),analysis.drop-.28,analysis.drop-.16,12.5])].sort((a,b)=>a-b);
const headlines=['心动，就这一拍','左一下','右一下','嗯？','准备——','可爱暴击！','快乐加倍','眨眼，接住','哇！','被你发现啦','下一拍，你登场'];
function text(s,x,y,size,color='#332840') {
  ctx.fillStyle=color;ctx.font=`900 ${size}px "Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.fillText(s,x,y);
}
function heart(x,y,size,angle=0) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(size,size);
  ctx.beginPath();ctx.moveTo(0,.8);ctx.bezierCurveTo(-1,.1,-.85,-.7,-.35,-.55);
  ctx.bezierCurveTo(-.1,-.55,0,-.32,0,-.25);ctx.bezierCurveTo(.4,-1,1,-.35,.7,.15);
  ctx.closePath();ctx.fill();ctx.restore();
}
function draw(t) {
  const entry=board.entries.findLast(e=>e.startTime<=t)??board.entries[0];
  const finale=entry===board.entries.at(-1);
  const sample=finale?Math.min(t,entry.startTime+.30):t;
  board.update(sample);
  const actor=board.characters.get('Yuki');
  const state=perform(actor,camera,board.currentScene,sample,entry,analysis.onsets);
  renderer.render(board.currentScene.scene,camera);
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  // Open framing: typography is brief, leaving the face as the visual subject.
  const wash=ctx.createLinearGradient(0,0,0,250);
  wash.addColorStop(0,'rgba(255,247,237,.95)');wash.addColorStop(1,'rgba(255,247,237,0)');
  ctx.fillStyle=wash;ctx.fillRect(0,0,W,250);
  ctx.save();ctx.textAlign='left';ctx.font='900 25px "Microsoft YaHei",sans-serif';ctx.fillStyle='#332840';ctx.fillText('DULA',40,61);
  ctx.textAlign='right';ctx.font='600 19px "Microsoft YaHei",sans-serif';ctx.fillText('小雪 YUKI',680,60);ctx.restore();
  const enter=1+Math.exp(-state.local*15)*.12;
  ctx.save();ctx.translate(W/2,175);ctx.scale(enter,enter);
  text(headlines[entry.index-1],0,0,finale?49:58);ctx.restore();
  if(['wink','grin'].includes(state.face)) {
    ctx.fillStyle='#ff6893';
    for(let i=0;i<4;i++) {
      const side=i%2?-1:1, p=Math.min(1,state.local*1.6);
      ctx.globalAlpha=Math.max(.18,.85-p*.35);
      heart(360+side*(200+28*p),470+(i>>1)*165-44*p,18+state.pulse*7,side*.2);
    }
    ctx.globalAlpha=1;
  }
  if(state.edit==='burst' && state.local<.24) {
    const k=state.local/.24;ctx.save();ctx.globalAlpha=(1-k)*.75;
    ctx.strokeStyle='#fffaf0';ctx.lineWidth=7;
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6;ctx.beginPath();
      ctx.moveTo(360+Math.cos(a)*(230+k*85),650+Math.sin(a)*(290+k*85));
      ctx.lineTo(360+Math.cos(a)*(300+k*150),650+Math.sin(a)*(400+k*150));ctx.stroke();
    }
    ctx.restore();
  }
  if(state.edit==='spin') {
    const remain=entry.endTime-t;
    if(remain<.44) {ctx.strokeStyle='#fff5df';ctx.lineWidth=10;ctx.globalAlpha=.8;
      ctx.beginPath();ctx.arc(360,650,265,-state.roll,-state.roll+Math.PI*1.1);ctx.stroke();ctx.globalAlpha=1;}
  }
  if(finale) {
    ctx.fillStyle='#332840';ctx.beginPath();ctx.roundRect(100,1040,520,78,39);ctx.fill();
    text('DULA ORIGINALS',360,1091,30,'#fff7ed');
    text('把快乐，跳给你看',360,1160,25);
  } else {
    ctx.fillStyle='rgba(255,248,240,.92)';ctx.beginPath();ctx.roundRect(248,1114,224,62,31);ctx.fill();
    text(state.face==='surprise'?'！':state.face==='wink'?'♡':state.edit==='spin'?'3 · 2 · 1':'♪',360,1158,32,'#e74f78');
  }
  return {...state,root:actor.mesh.position.toArray(),camera:camera.position.toArray(),calls:renderer.info.render.calls,
    leftEyeVisible:actor.leftEye.visible,rightEyeVisible:actor.rightEye.visible};
}
window.stepAt=t=>draw(t);
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/jpeg',.95).split(',')[1],state};};
await document.fonts.ready;window.ready=true;draw(0);
if(!new URLSearchParams(location.search).has('capture')) {
  const music=new Audio('/episode/assets/audio/mixed_v2.wav');music.loop=true;
  document.body.title='点击播放 / 暂停';document.body.onclick=()=>music.paused?music.play():music.pause();
  function animate(){draw(music.currentTime);requestAnimationFrame(animate);}animate();
}
