import * as THREE from 'three';
import { Storyboard } from 'dula-engine';
import './bootstrap.js';
import { perform } from './beat_performance.js';
import { setWardrobe } from './wardrobe_v3.js';

const W=720,H=1280;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
const camera=new THREE.PerspectiveCamera(35,W/H,.1,150);window.__dulaCamera=camera;
const board=new Storyboard(renderer,camera,null,null);
await board.load('/episode/script_v3.story','/episode/assets/audio/manifest.json');
const music=await(await fetch('/episode/config/music_analysis_v3.json')).json();
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.appendChild(canvas);
const ctx=canvas.getContext('2d');
window.duration=Math.max(...board.entries.map(e=>e.endTime));
window.shotEntries=board.entries.map(e=>({index:e.index,startTime:e.startTime,endTime:e.endTime}));
const renderFrame=t=>Math.ceil(t*60-1e-7);
window.checkTimes=[0,...board.entries.slice(1).flatMap(e=>[(renderFrame(e.startTime)-1)/60,renderFrame(e.startTime)/60,renderFrame(e.startTime)/60+.2]),13.1];
window.checkTimes.push(...[4.75,4.85]);window.checkTimes.sort((a,b)=>a-b);
const colors={original:[0xffedd9,0xffa853],bunny:[0xffdde9,0xf279a5],sailor:[0xdff0ff,0x6a9edd],sunny:[0xffebac,0xedb83c],princess:[0xeae2ff,0xb898df]};
const names={original:'小雪',bunny:'软萌一下',sailor:'俏皮一下',sunny:'酷一下',princess:'甜一下'};

function label(text,x,y,size,color='#3d3044') {
  ctx.fillStyle=color;ctx.textAlign='center';ctx.font=`800 ${size}px "Microsoft YaHei",sans-serif`;ctx.fillText(text,x,y);
}
function draw(t) {
  const entry=board.entries.findLast(e=>e.startTime<=t)??board.entries[0];
  const opts=entry.storyEvents.find(e=>e.options?.action==='AdPose').options;
  const {outfit,accessory,expression,gesture}=opts;
  const last=entry===board.entries.at(-1),local=t-entry.startTime;
  board.update(t);
  const c=board.characters.get('Yuki'),scene=board.currentScene;
  const state=perform(c,camera,scene,t,entry,music.onsets);
  setWardrobe(c,outfit,accessory);
  // Every reveal is an immediate new pose and garment state in identical
  // framing. Hold it readable; only a small one-shot settle follows the hit.
  const settle=Math.exp(-local*18),breath=last&&local>.2?0:Math.sin(local*5)*.006;
  c.mesh.position.set(0,-.03,0);c.mesh.scale.set(1,1,1);
  c.mesh.rotation.set(0,gesture==='cool'?-.17:gesture==='salute'?.10:0,0);
  c.leftLeg.rotation.set(0,0,0);c.rightLeg.rotation.set(0,0,0);
  c.headGroup.rotation.set(0,gesture==='cool'?.10:0,gesture==='cool'?-.12:gesture==='salute'?.10:-.04+breath);
  c.leftArm.rotation.set(-.35,0,-.35);c.rightArm.rotation.set(-.35,0,.35);
  if(gesture==='paws'){
    c.leftArm.rotation.set(-1.1,0,-2.5);c.rightArm.rotation.set(-1.1,0,2.5);
  } else if(gesture==='cool'){
    c.rightArm.rotation.set(-.7,0,2.55);c.leftArm.rotation.set(-.15,0,-.65);
  } else if(gesture==='salute'){
    c.rightArm.rotation.set(-.65,0,2.75);c.leftArm.rotation.set(-.25,0,-.45);
  } else if(gesture==='ta_da'){
    c.leftArm.rotation.set(-.1,0,-1.95);c.rightArm.rotation.set(-.1,0,1.95);
  } else {
    c.leftArm.rotation.set(-.5,0,-.6);c.rightArm.rotation.set(-.5,0,.6);
  }
  // Expression variants independent of the outfit, so repeated clothes still
  // carry a new facial punchline on their selected musical hit.
  if(expression==='pout'){
    c.mouth.scale.set(.53,.9,1);c.upperLip.scale.y=-1;
    c.leftEyebrow.rotation.z=Math.PI/2-.30;c.rightEyebrow.rotation.z=Math.PI/2+.30;
  } else c.upperLip.scale.y=1;
  if(expression==='tongue'){
    c.upperLip.visible=false;c.beatFace.smile.visible=true;c.beatFace.tongue.visible=true;
    c.beatFace.tongue.scale.set(.85,1.3,.12);c.beatFace.tongue.position.y=-.050;
    c.leftEye.visible=false;c.beatFace.eyes[0].visible=true;
  } else {c.beatFace.tongue.scale.set(1.2,.35,.12);c.beatFace.tongue.position.y=-.036;}
  camera.position.set(0,1.27,3.95);camera.lookAt(0,1.04,0);
  camera.fov=35-(entry.index>1?settle*.55:0);
  let roll=0;
  if(opts.outgoing==='spin' && entry.endTime-t<.26){
    let u=1-(entry.endTime-t)/.26;u=u*u*(3-2*u);
    roll=u*Math.PI*2;
    camera.lookAt(0,1.04-.16*Math.sin(u*Math.PI),0);
    camera.rotateZ(roll);camera.fov+=30*Math.sin(u*Math.PI);
  }
  camera.updateProjectionMatrix();
  const [bg,accent]=colors[outfit];
  scene.scene.background.setHex(bg);scene.floor.material.color.setHex(bg);
  scene.halo.material.color.setHex(accent);scene.footRing.material.color.setHex(accent);
  scene.halo.scale.setScalar(.99);scene.halo.rotation.z=0;scene.orbit.visible=false;
  scene.footRing.scale.setScalar(1);scene.halo.position.y=1.07;
  renderer.render(scene.scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  label('小雪 YUKI',360,64,23);
  // The tiny lower tag follows the identity change; the garment and face carry
  // the reveal. No full-frame flash or transition hides the first new frame.
  ctx.fillStyle='rgba(255,255,255,.80)';ctx.beginPath();ctx.roundRect(227,1203,266,51,25);ctx.fill();
  label(last?'一拍，一个新模样':accessory==='shades'?'墨镜一戴':names[outfit],360,1238,24);
  return{index:entry.index,t,local,outfit,accessory,expression,gesture,roll,pose:state.pose,face:expression,
    sunglasses:c.wardrobe.shades.visible,activeOutfits:Object.entries(c.wardrobe.outfits).filter(([,g])=>g.visible).map(([n])=>n),
    hats:Object.entries(c.wardrobe.hats).filter(([,g])=>g.visible).map(([n])=>n),
    root:c.mesh.position.toArray(),camera:camera.position.toArray()};
}
window.stepAt=t=>draw(t);
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/jpeg',.95).split(',')[1],state};};
await document.fonts.ready;window.ready=true;draw(0);
if(!new URLSearchParams(location.search).has('capture')){
  const audio=new Audio('/episode/assets/audio/mixed_v3.wav');audio.loop=true;
  document.body.title='点击播放 / 暂停';document.body.onclick=()=>audio.paused?audio.play():audio.pause();
  function animate(){draw(audio.currentTime);requestAnimationFrame(animate);}animate();
}
