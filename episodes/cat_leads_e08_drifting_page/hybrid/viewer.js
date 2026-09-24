import * as THREE from 'three';
import {compile,smooth} from './timeline.js';
import {EpisodeScene,cameraAt} from './scene.js';
import {inspectPaperPads} from './paper-grip.js';
const capture=new URLSearchParams(location.search).has('capture');if(capture)document.body.classList.add('capture');
const [story,direction,lips]=await Promise.all([fetch('/script.story').then(r=>r.text()),fetch('/hybrid/direction.json').then(r=>r.json()),fetch('/config/lipsync_cues.json').then(r=>r.json())]);
const plan=compile(story,direction,lips),episode=new EpisodeScene(plan);
const canvas=document.querySelector('#film'),W=1920,H=1080;canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d',{alpha:false});
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
const camera=new THREE.PerspectiveCamera(36,W/H,.03,180);
const select=document.querySelector('#shot'),slider=document.querySelector('#time');
for(const s of plan.shots){const o=document.createElement('option');o.value=s.start;o.textContent=s.name;select.append(o);}
slider.max=plan.duration;
function draw(t){
  t=Math.max(0,Math.min(t,plan.duration-1/300));const shot=plan.shots.find(s=>t>=s.start&&t<s.end);
  const cam=cameraAt(t,shot,episode,camera),state=episode.update(t,camera);
  renderer.render(episode.scene,camera);ctx.drawImage(renderer.domElement,0,0);
  if(t<3.5){const opacity=Math.min(1,smooth(t/.5))*(1-smooth((t-2.9)/.55));ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle='#f9f3df';ctx.font='bold 56px Microsoft YaHei';ctx.fillText('漂走的那张画',110,150);ctx.font='22px Microsoft YaHei';ctx.fillText('河岸日记 · 第八话',113,193);ctx.restore();}
  const sub=plan.entries.find(e=>e.character&&t>=e.start&&t<e.end);
  if(sub){const text=`${sub.character==='Girl'?'小蓝':'阿澈'}：${sub.dialogue}`;ctx.font='bold 34px Microsoft YaHei';const w=ctx.measureText(text).width;ctx.fillStyle='rgba(35,52,53,.79)';ctx.beginPath();ctx.roundRect((W-w)/2-24,H-93,w+48,57,10);ctx.fill();ctx.fillStyle='#fff9e9';ctx.textAlign='center';ctx.fillText(text,W/2,H-54);ctx.textAlign='left';}
  if(t>plan.beats.fade){ctx.fillStyle=`rgba(26,42,43,${smooth((t-plan.beats.fade)/(plan.duration-plan.beats.fade))})`;ctx.fillRect(0,0,W,H);}
  slider.value=t;select.value=shot.start;document.querySelector('#clock').textContent=`${t.toFixed(1)} / ${plan.duration}s`;
  return {t,shot:shot.name,camera:cam,...state};
}
window.duration=plan.duration;window.shots=plan.shots;window.plan=plan;
window.checkTimes=[...new Set(plan.shots.flatMap(s=>[s.start+.05,(s.start+s.end)/2,s.end-.05]).concat([18.5,20,22,24,41,44,46.6,47.9,48.4,49.5,52.5]))].sort((a,b)=>a-b);
window.stepAt=draw;window.renderAt=t=>{const state=draw(t);return {image:canvas.toDataURL('image/jpeg',.94).split(',')[1],state};};
window.pngAt=t=>{draw(t);return canvas.toDataURL('image/png').split(',')[1];};
window.characterChecks=()=>{draw(10);return [episode.girl,episode.boy].map(k=>({kind:k.kind,head:k.headAssembly.validate(),hands:Object.values(k.hands).map(h=>h.validateDeformation())}));};
window.contactChecks=()=>{
  const samples=[];for(let i=0;i<=240;i++){const t=plan.beats.offer+i/60,s=episode.update(t,camera);if(s.handError>.003)samples.push({t,error:s.handError});}
  return samples;
};
window.refinementChecks=()=>{
  let maxSupportDrift=0,maxSolePenetration=0,maxSwingClearance=0,maxFrameRootStep=0;
  const previous={};let lastRoot;
  for(let i=0;i<=120;i++){
    const t=plan.beats.arrival+i/60,state=episode.update(t,camera),p=state.girl;
    if(lastRoot!==undefined)maxFrameRootStep=Math.max(maxFrameRootStep,Math.abs(p.rootX-lastRoot));lastRoot=p.rootX;
    for(const side of ['left','right']){
      const anchor=p[side+'SupportAnchor'],contact=p[side+'Contact'];
      if(contact&&previous[side]?.contact&&anchor)maxSupportDrift=Math.max(maxSupportDrift,anchor.distanceTo(previous[side].anchor));
      previous[side]={contact,anchor};maxSwingClearance=Math.max(maxSwingClearance,p[side+'Clearance']??0);
      const sole=episode.girl.feet[side].children[1],positions=sole.geometry.attributes.position;
      for(let j=0;j<positions.count;j++)maxSolePenetration=Math.max(maxSolePenetration,-sole.localToWorld(new THREE.Vector3().fromBufferAttribute(positions,j)).y);
    }
  }
  const grips=[];
  for(const t of [46.8,47.5,49.5]){
    const state=episode.update(t,camera);
    for(const kid of [episode.girl,episode.boy])for(const side of ['left','right']){
      const p=kid===episode.girl?state.girl:state.boy;
      if(p[side+'GripWeight']>.999)grips.push({t,kind:kid.kind,side,...inspectPaperPads(kid.hands[side])});
    }
  }
  return {maxSupportDrift,maxSolePenetration,maxSwingClearance,maxFrameRootStep,grips};
};
await document.fonts.ready;draw(0);window.ready=true;
if(!capture){
  const audio=new Audio('/painted/output/output.mp4');audio.preload='auto';
  const button=document.querySelector('#play');button.onclick=async()=>{if(audio.paused){await audio.play();button.textContent='暂停';}else{audio.pause();button.textContent='播放';}};
  const seek=t=>{audio.currentTime=t;draw(t);};slider.oninput=()=>seek(Number(slider.value));select.onchange=()=>seek(Number(select.value));
  audio.onended=()=>{button.textContent='播放';};
  function animate(){if(!audio.paused)draw(audio.currentTime);requestAnimationFrame(animate);}animate();
}
