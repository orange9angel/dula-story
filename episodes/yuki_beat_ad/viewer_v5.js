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
await board.load('/episode/script_v5.story','/episode/assets/audio/manifest.json');
const music=await(await fetch('/episode/config/music_analysis_v5.json')).json();
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.appendChild(canvas);
const ctx=canvas.getContext('2d');
window.duration=Math.max(...board.entries.map(e=>e.endTime));
window.shotEntries=board.entries.map(e=>({index:e.index,startTime:e.startTime,endTime:e.endTime}));
const renderFrame=t=>Math.ceil(t*60-1e-7);
window.checkTimes=[0,...board.entries.slice(1).flatMap(e=>[(renderFrame(e.startTime)-1)/60,renderFrame(e.startTime)/60,renderFrame(e.startTime)/60+.2]),window.duration-.1];
window.checkTimes.sort((a,b)=>a-b);

// Candy gradient palettes per outfit: [dome top, dome bottom, accent, confetti set]
const palettes={
  original:{top:0xffe6b8,bottom:0xff8f6b,accent:0xff5d8f,confetti:[0xff5d8f,0xffc357,0x7ddfc3,0x8f7bff]},
  bunny:{top:0xffd9ec,bottom:0xff7fc0,accent:0xff3d8b,confetti:[0xff3d8b,0x8fd8ff,0xb98cff,0xffe45e]},
  sailor:{top:0xd4efff,bottom:0x57a8ff,accent:0x2f6df6,confetti:[0x2f6df6,0x63d8b0,0xffd23e,0xff5d8f]},
  sunny:{top:0xfff7c2,bottom:0xffb52e,accent:0xff7a1c,confetti:[0xff7a1c,0xff5d8f,0x63d8b0,0x8f7bff]},
  princess:{top:0xefdefa,bottom:0x9d78f0,accent:0x7a4ff0,confetti:[0x7a4ff0,0xff5da2,0xffd23e,0x63d8b0]},
};
const names={original:'小雪',bunny:'软萌一下',sailor:'俏皮一下',sunny:'酷一下',princess:'甜一下'};

// --- Stage dressing (built once, recolored per outfit) ---
let stage=null;
function starShape(points=5,outer=.09,inner=.042){const s=new THREE.Shape();
  for(let i=0;i<points*2;i++){const r=i%2?inner:outer,a=i/(points*2)*Math.PI*2-Math.PI/2;
    i?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r);}s.closePath();return s;}
function heartShape(){const s=new THREE.Shape();s.moveTo(0,-.05);
  s.bezierCurveTo(-.09,.02,-.06,.10,0,.045);s.bezierCurveTo(.06,.10,.09,.02,0,-.05);return s;}
function mulberry32(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function buildStage(scene,pal){
  const g=new THREE.Group();
  // Gradient dome behind everything
  const dome=new THREE.Mesh(new THREE.SphereGeometry(60,32,24),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new THREE.Color(pal.top)},bottom:{value:new THREE.Color(pal.bottom)},glow:{value:new THREE.Color(0xffffff)}},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vP;uniform vec3 top,bottom,glow;
      void main(){float h=clamp((vP.y+17.)/36.,0.,1.);vec3 c=mix(bottom,top,pow(h,1.25));
      float r=length(normalize(vP).xy*vec2(1.,1.4));c=mix(c,glow,smoothstep(.7,.08,r)*.28);
      gl_FragColor=vec4(c,1.);}`}));
  g.add(dome);
  // Round glossy stage platform
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.15,.07,64),
    new THREE.MeshStandardMaterial({color:0xffffff,roughness:.25,metalness:.05}));
  platform.position.y=-.035;platform.receiveShadow=true;g.add(platform);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.06,.028,12,80),
    new THREE.MeshBasicMaterial({color:pal.accent}));
  rim.rotation.x=Math.PI/2;rim.position.y=.002;g.add(rim);
  const rings=[];
  for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(.3+i*.32,.33+i*.32,72),
    new THREE.MeshBasicMaterial({color:pal.accent,transparent:true,opacity:.5,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.position.y=.004+i*.001;g.add(ring);rings.push(ring);}
  // Floating stars and hearts
  const floaters=[];
  const rand=mulberry32(20260913);
  const starGeo=new THREE.ExtrudeGeometry(starShape(),{depth:.02,bevelEnabled:false});
  const heartGeo=new THREE.ExtrudeGeometry(heartShape(),{depth:.02,bevelEnabled:false});
  for(let i=0;i<14;i++){
    const geo=i%3===2?heartGeo:starGeo;
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:pal.confetti[i%4],roughness:.4}));
    const side=i%2?1:-1;
    m.position.set(side*(.62+rand()*.38),.55+rand()*2.1,-.5-rand()*1.1);
    m.scale.setScalar(.8+rand()*.8);m.rotation.z=rand()*6.28;
    m.userData={base:m.position.clone(),speed:.6+rand()*.9,phase:rand()*6.28,spin:(rand()-.5)*1.6};
    g.add(m);floaters.push(m);}
  // Stage light beams
  const beams=[];
  for(const side of [-1,1]){
    const beam=new THREE.Mesh(new THREE.ConeGeometry(.85,4.6,24,1,true),
      new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    beam.position.set(side*1.05,2.7,-1.4);beam.rotation.z=side*.42;g.add(beam);beams.push(beam);}
  // Confetti pool: deterministic bursts, one per planned hit
  const N=320;
  const confetti=new THREE.InstancedMesh(new THREE.PlaneGeometry(.07,.115),
    new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),N);
  confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  confetti.frustumCulled=false;
  // Pre-allocate instance colors at full capacity: setColorAt sizes its buffer
  // from the CURRENT count, and updateStage later shrinks count to active
  // particles — a late first setColorAt would create a zero-length buffer and
  // the whole instanced draw call would fail GL validation silently.
  const colors=[];const initColor=new THREE.Color(0xffffff);
  for(let i=0;i<N;i++){confetti.setColorAt(i,initColor);colors.push(new THREE.Color());}
  g.add(confetti);
  scene.add(g);
  return{group:g,dome,platform,rim,rings,floaters,beams,confetti,confettiColors:colors,bursts:new Map()};
}

function confettiBurst(stage,hitTime,index,pal){
  const rand=mulberry32(index*7919+17);
  const parts=[];
  for(let i=0;i<64;i++){
    const a=rand()*Math.PI*2,r=.15+rand()*.4;
    parts.push({
      p:new THREE.Vector3(Math.cos(a)*r,1.5+rand()*.5,Math.sin(a)*r*.5-.1),
      v:new THREE.Vector3(Math.cos(a)*(1.6+rand()*2.4),1.6+rand()*1.8,Math.sin(a)*(.6+rand())+.4),
      rot:new THREE.Vector3(rand()*6.28,rand()*6.28,rand()*6.28),
      spin:new THREE.Vector3((rand()-.5)*14,(rand()-.5)*14,(rand()-.5)*14),
      color:pal.confetti[Math.floor(rand()*pal.confetti.length)],
      delay:rand()*.08});
  }
  stage.bursts.set(index,{t0:hitTime,parts,colorSet:pal.confetti});
}

const dummy=new THREE.Object3D();
function updateStage(stage,t,pal,pulse){
  stage.dome.material.uniforms.top.value.setHex(pal.top);
  stage.dome.material.uniforms.bottom.value.setHex(pal.bottom);
  stage.rim.material.color.setHex(pal.accent);
  stage.rim.scale.setScalar(1+.06*pulse);
  stage.rings.forEach((r,i)=>{
    const u=((t*.9+i/3)%1);
    r.scale.setScalar(1+u*2.2);r.material.opacity=.4*(1-u);
    r.material.color.setHex(pal.accent);});
  stage.floaters.forEach(m=>{
    const u=m.userData;
    m.position.y=u.base.y+Math.sin(t*u.speed+u.phase)*.14;
    m.rotation.y=t*u.spin;});
  stage.beams.forEach((b,i)=>{
    b.rotation.z=(i?1:-1)*(.42+.2*Math.sin(t*.7+i*2));
    b.material.opacity=.09+.06*pulse;});
  // Confetti: fill instances from active bursts
  let n=0;const now=t;
  for(const [,burst] of stage.bursts){
    const age=now-burst.t0;
    if(age<0||age>1.8)continue;
    for(const pt of burst.parts){
      const a=age-pt.delay;if(a<0||a>1.6||n>=320)continue;
      dummy.position.set(
        pt.p.x+pt.v.x*a,
        pt.p.y+pt.v.y*a-3.2*a*a*.5,
        pt.p.z+pt.v.z*a);
      if(dummy.position.y<.01)continue;
      dummy.rotation.set(pt.rot.x+pt.spin.x*a,pt.rot.y+pt.spin.y*a,pt.rot.z+pt.spin.z*a);
      const fade=a>1.2?1-(a-1.2)/.4:1;
      dummy.scale.setScalar(Math.max(fade,.001));dummy.updateMatrix();
      stage.confetti.setMatrixAt(n,dummy.matrix);
      stage.confettiColors[n].setHex(pt.color);
      stage.confetti.setColorAt(n,stage.confettiColors[n]);n++;
    }
  }
  stage.confetti.count=n;stage.confetti.instanceMatrix.needsUpdate=true;
  if(stage.confetti.instanceColor)stage.confetti.instanceColor.needsUpdate=true;
}

function label(text,x,y,size,color='#3d3044') {
  ctx.fillStyle=color;ctx.textAlign='center';ctx.font=`800 ${size}px "Microsoft YaHei",sans-serif`;ctx.fillText(text,x,y);
}
const smooth=t=>{t=Math.min(Math.max(t,0),1);return t*t*(3-2*t);};

function draw(t) {
  const entry=board.entries.findLast(e=>e.startTime<=t)??board.entries[0];
  const opts=entry.storyEvents.find(e=>e.options?.action==='AdPose').options;
  const {outfit,accessory,expression,gesture,move='none'}=opts;
  const last=entry===board.entries.at(-1),local=t-entry.startTime,duration=entry.endTime-entry.startTime;
  board.update(t);
  const c=board.characters.get('Yuki'),scene=board.currentScene;
  const state=perform(c,camera,scene,t,entry,music.onsets);
  setWardrobe(c,outfit,accessory);
  if(!stage){stage=buildStage(scene.scene,palettes[outfit]);window.__stage=stage;
    board.entries.forEach((e,i)=>{if(i>0)confettiBurst(stage,e.startTime,i,palettes[
      e.storyEvents.find(x=>x.options?.action==='AdPose').options.outfit]);});}
  const pal=palettes[outfit];

  // Base pose (same grammar as V3)
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

  // --- V4 dance moves, layered over the base pose ---
  let airborne=0;
  if(move==='twirl'){
    // Full character spin landing exactly on the next hit
    const spinDur=Math.min(.6,duration-.05),remain=entry.endTime-t;
    if(remain<spinDur){
      const u=smooth(1-remain/spinDur);
      c.mesh.rotation.y=u*Math.PI*2;
      c.mesh.position.y+=.14*Math.sin(u*Math.PI);
      c.leftArm.rotation.set(-.6,0,-2.2);c.rightArm.rotation.set(-.6,0,2.2);
    }
  } else if(move==='jump'){
    // Squash-stretch jump fired on this hit
    const air=.48;
    if(local<air){const h=Math.sin(Math.PI*local/air);airborne=h;
      c.mesh.position.y+=.34*h;
      c.mesh.scale.set(1-.10*h,1+.14*h,1-.10*h);
      c.leftArm.rotation.set(-.4,0,-2.5);c.rightArm.rotation.set(-.4,0,2.5);
      c.leftLeg.rotation.set(-.5*h,0,0);c.rightLeg.rotation.set(-.5*h,0,0);
    } else if(local<air+.16){const s=1-(local-air)/.16;
      c.mesh.scale.set(1+.08*s,1-.12*s,1+.08*s);}
  } else if(move==='dance'){
    // Beat-locked bounce, alternating arms and hip sway inside this window
    const beats=music.onsets.filter(o=>o.time>=entry.startTime-.01&&o.time<t+.01);
    const parity=beats.length%2;
    const lastBeat=beats.length?beats[beats.length-1].time:entry.startTime;
    const bounce=Math.exp(-(t-lastBeat)*9);
    c.mesh.position.y+=.05*bounce;
    c.mesh.rotation.z=(parity?1:-1)*.10*(1-Math.exp(-local*8));
    c.headGroup.rotation.z+=(parity?-1:1)*.07*bounce;
    c.leftArm.rotation.set(-.9,0,parity?-2.3:-.7);
    c.rightArm.rotation.set(-.9,0,parity?.7:2.3);
    c.leftLeg.rotation.x=parity?.30*bounce:0;
    c.rightLeg.rotation.x=parity?0:.30*bounce;
  } else if(move==='wave'){
    c.rightArm.rotation.set(-.5+.2*Math.sin(local*9),0,2.5+.2*Math.sin(local*9));
    c.headGroup.rotation.z=.08*Math.sin(local*4.5);
    c.mesh.rotation.y=.12*Math.sin(local*4.5);
  }

  // Expression variants (unchanged from V3)
  if(expression==='pout'){
    c.mouth.scale.set(.53,.9,1);c.upperLip.scale.y=-1;
    c.leftEyebrow.rotation.z=Math.PI/2-.30;c.rightEyebrow.rotation.z=Math.PI/2+.30;
  } else c.upperLip.scale.y=1;
  if(expression==='tongue'){
    c.upperLip.visible=false;c.beatFace.smile.visible=true;c.beatFace.tongue.visible=true;
    c.beatFace.tongue.scale.set(.85,1.3,.12);c.beatFace.tongue.position.y=-.050;
    c.leftEye.visible=false;c.beatFace.eyes[0].visible=true;
  } else {c.beatFace.tongue.scale.set(1.2,.35,.12);c.beatFace.tongue.position.y=-.036;}

  // Camera: same fixed framing; outgoing=spin keeps the V3 camera roll
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

  // Scene colors: hide the V3 flat-dressing, drive the candy stage instead
  scene.scene.background.setHex(pal.bottom);
  scene.floor.material.color.setHex(pal.bottom);
  scene.floor.material.color.lerp(new THREE.Color(0x000000),.08);
  scene.halo.visible=false;scene.footRing.visible=false;scene.orbit.visible=false;
  updateStage(stage,t,pal,state.pulse);

  renderer.render(scene.scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  label('小雪 YUKI',360,64,23);
  ctx.fillStyle='rgba(255,255,255,.80)';ctx.beginPath();ctx.roundRect(227,1203,266,51,25);ctx.fill();
  label(last?'一拍，一个新模样':accessory==='shades'?'墨镜一戴':names[outfit],360,1238,24);
  return{index:entry.index,t,local,outfit,accessory,expression,gesture,move,roll,airborne:Math.round(airborne*100)/100,
    pose:state.pose,face:expression,rotY:Math.round(c.mesh.rotation.y*1000)/1000,
    sunglasses:c.wardrobe.shades.visible,activeOutfits:Object.entries(c.wardrobe.outfits).filter(([,g])=>g.visible).map(([n])=>n),
    hats:Object.entries(c.wardrobe.hats).filter(([,g])=>g.visible).map(([n])=>n),
    confettiCount:stage.confetti.count,root:c.mesh.position.toArray(),camera:camera.position.toArray()};
}
window.stepAt=t=>draw(t);
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/jpeg',.95).split(',')[1],state};};
await document.fonts.ready;window.ready=true;draw(0);
if(!new URLSearchParams(location.search).has('capture')){
  const audio=new Audio('/episode/assets/audio/mixed_v5.wav');audio.loop=true;
  document.body.title='点击播放 / 暂停';document.body.onclick=()=>audio.paused?audio.play():audio.pause();
  function animate(){draw(audio.currentTime);requestAnimationFrame(animate);}animate();
}
