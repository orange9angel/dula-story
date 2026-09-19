import * as THREE from 'three';
import { Storyboard } from 'dula-engine';
import './bootstrap.js';
import { perform } from './beat_performance.js';
import { setWardrobe } from './wardrobe_v3.js';
import { buildDanceRig, poseDance, createLipDriver, applyLips } from './performance_v10.js';

const W=720,H=1280;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
const camera=new THREE.PerspectiveCamera(35,W/H,.1,150);window.__dulaCamera=camera;
const board=new Storyboard(renderer,camera,null,null);
await board.load('/episode/script_v10.story','/episode/assets/audio/manifest.json');
const music=await(await fetch('/episode/config/music_analysis_v10.json')).json();
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.appendChild(canvas);
const ctx=canvas.getContext('2d');
window.duration=Math.max(...board.entries.map(e=>e.endTime));
window.shotEntries=board.entries.map(e=>({index:e.index,startTime:e.startTime,endTime:e.endTime}));
const renderFrame=t=>Math.ceil(t*60-1e-7);
const optsOf=e=>e.storyEvents.find(x=>x.options?.action==='AdPose').options;
const on=v=>v===1||v==='1';
const smooth=t=>{t=Math.min(Math.max(t,0),1);return t*t*(3-2*t);};

// Character-aligned lyrics; all mouth state comes from the final vocal stem.
const lipAt=createLipDriver(music);
const mouthAt=t=>lipAt(t).shape;
const vocalOpenAt=t=>lipAt(t).open;
const vocalPhrases=music.lyric_lines;
function lyricAt(t){return music.lyric_lines.find(l=>t>=l.start-.06&&t<l.end+.12)?.text??null;}
function drawLyrics(t){
  const line=music.lyric_lines.find(l=>t>=l.start-.06&&t<l.end+.12);
  if(!line)return;
  ctx.save();ctx.fillStyle='rgba(13,9,30,.82)';ctx.beginPath();ctx.roundRect(52,1180,616,65,24);ctx.fill();
  ctx.font='600 29px "Microsoft YaHei",sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
  const text=line.text,width=ctx.measureText(text).width;let x=(720-width)/2,index=line.char0;
  const current=lipAt(t).index;
  for(const ch of text){
    ctx.fillStyle=ch===' '?'#fff':index===current?'#ffe061':index<current?'#bcb2cf':'#ffffff';
    ctx.fillText(ch,x,1213);x+=ctx.measureText(ch).width;if(ch!==' ')index++;
  }
  ctx.restore();
}

// --- V9: beat grid lock -----------------------------------------------------
// beat_grid: {bpm, beats:[s...], downbeats:[s...]} (4/4). beatAt/beatPhase are
// pure lookups; every rhythmic driver (dance bounce, arm fling, groove bounce,
// chorus light pulse) derives from these instead of the onset scatter.
const beatTimes=((music.beat_grid?.beats)??[]).slice().sort((a,b)=>a-b);
const downbeatTimes=((music.beat_grid?.downbeats)??[]).slice().sort((a,b)=>a-b);
const downbeatIdx=new Set(beatTimes.map((b,i)=>downbeatTimes.some(d=>Math.abs(d-b)<1e-3)?i:-1).filter(i=>i>=0));
function beatAt(t){
  let lo=0,hi=beatTimes.length-1,ans=-1;
  while(lo<=hi){const mid=(lo+hi)>>1;if(beatTimes[mid]<=t+1e-4){ans=mid;lo=mid+1;}else hi=mid-1;}
  return ans;
}
function beatPhase(t){
  const i=beatAt(t);
  if(i<0||!beatTimes.length)return 0;
  const period=i<beatTimes.length-1?beatTimes[i+1]-beatTimes[i]:i>0?beatTimes[i]-beatTimes[i-1]:.5;
  return Math.min((t-beatTimes[i])/period,1);
}
function beatInfoAt(t){
  if(!beatTimes.length)return null;
  const index=beatAt(t);
  if(index<0)return{index:-1,phase:0,sinceBeat:99,period:.5,downbeat:false,accent:0};
  const period=index<beatTimes.length-1?beatTimes[index+1]-beatTimes[index]:index>0?beatTimes[index]-beatTimes[index-1]:.5;
  const phase=Math.min((t-beatTimes[index])/period,1);
  const downbeat=downbeatIdx.has(index);
  // Downbeat accent: sharp attack at the bar head, decaying through the bar.
  let sinceDb=99;
  let lo=0,hi=downbeatTimes.length-1,ans=-1;
  while(lo<=hi){const mid=(lo+hi)>>1;if(downbeatTimes[mid]<=t+1e-4){ans=mid;lo=mid+1;}else hi=mid-1;}
  if(ans>=0)sinceDb=t-downbeatTimes[ans];
  return{index,phase,sinceBeat:t-beatTimes[index],period,downbeat,accent:Math.exp(-Math.min(sinceDb,3)*6)};
}
// Signed ms from t to the nearest beat (for the portrait trace).
function beatErrMs(t){
  const i=beatAt(t);
  if(i<0)return null;
  const after=t-beatTimes[i];
  const before=i<beatTimes.length-1?beatTimes[i+1]-t:99;
  return Math.round((after<=before?after:-before)*1000);
}
// Groove bounce for mic_hold/arm_sweep: exp decay off each GRID beat (keeps
// the beat_performance.js pulse grammar), with a downbeat boost. Falls back
// to the V8 onset scatter only when the analysis carries no beat grid.
function grooveBounce(t,entry){
  const bi=beatInfoAt(t);
  if(bi&&bi.index>=0)return Math.exp(-Math.min(bi.sinceBeat,2)*9)*(bi.downbeat?1.3:1);
  const beats=music.onsets.filter(o=>o.time>=entry.startTime-.01&&o.time<t+.01);
  const lastBeat=beats.length?beats[beats.length-1].time:entry.startTime;
  return Math.exp(-(t-lastBeat)*9);
}

// --- V9: MTV section grammar -------------------------------------------------
// sections: [{start,end,energy(,label)}]; prefer the explicit label when the
// analysis provides one, else derive: max-energy = chorus, first = intro,
// last = outro, lowest-energy middle section = bridge, the rest are verses.
const sections=((music.sections)??[]).slice().sort((a,b)=>a.start-b.start);
const maxEnergy=sections.length?Math.max(...sections.map(s=>s.energy??0)):0;
const ROLE_NAMES=['intro','verse','chorus','bridge','outro'];
const energyBridgeIdx=(()=>{
  let best=-1,bestE=Infinity;
  sections.forEach((s,i)=>{const e=s.energy??0;
    if(i>0&&i<sections.length-1&&e!==maxEnergy&&e<bestE){best=i;bestE=e;}});
  return best;
})();
function roleOf(s,i){
  if(typeof s.label==='string'&&ROLE_NAMES.includes(s.label))return s.label;
  return (s.energy??0)===maxEnergy?'chorus':i===0?'intro':i===sections.length-1?'outro':i===energyBridgeIdx?'bridge':'verse';
}
function sectionAt(t){
  const i=sections.findIndex(s=>t>=s.start-1e-4&&t<s.end-1e-4);
  if(i<0)return{role:'verse',section:null,index:-1};
  return{role:roleOf(sections[i],i),section:sections[i],index:i};
}
// Intro silhouette: lights stay nearly off until the first downbeat at/after
// the intro start, then snap open over ~0.22s ("亮相"). The reveal downbeat
// may land exactly on the intro/verse boundary — the ramp still plays.
const introSec=sections.length?sections[0]:null;
const revealT=(()=>{if(!introSec||!downbeatTimes.length)return null;
  const d=downbeatTimes.find(x=>x>=introSec.start-1e-3);return d??null;})();
function introDimAt(t){return .84+.16*smooth(t/.25);}
// Outro freeze: after the final grid beat all layered motion decays to a held
// pose. If the last beat lands right at the video end (<0.15s left), anchor
// the decay to the previous beat so the freeze is actually visible.
const lastBeatTime=(()=>{
  if(!beatTimes.length)return null;
  let i=beatTimes.length-1;
  while(i>0&&window.duration-beatTimes[i]<.15)i--;
  return beatTimes[i];
})();
const freezeSpan=lastBeatTime===null?.8:Math.min(.8,Math.max(window.duration-lastBeatTime,.2));
function motionScaleAt(t){
  if(lastBeatTime===null||sectionAt(t).role!=='outro'||t<=lastBeatTime)return 1;
  return Math.max(0,1-smooth((t-lastBeatTime)/freezeSpan));
}

{
  const times=[0,window.duration-.05];
  for(const e of board.entries){
    const d=e.endTime-e.startTime;
    times.push(Math.max(0,e.startTime-1/60),e.startTime+.05,e.startTime+d*.3,e.startTime+d*.65,e.endTime-.035);
  }
  for(const c of music.lyric_chars)times.push(c.start+.02,c.start+(c.end-c.start)*.5);
  times.push(6.6,12.95,28.6);
  window.checkTimes=[...new Set(times.filter(t=>t>=0&&t<window.duration).map(t=>Math.ceil(t*60)/60))].sort((a,b)=>a-b);
}

// Candy gradient palettes per outfit: [dome top, dome bottom, accent, confetti set]
const palettes={
  original:{top:0xffe6b8,bottom:0xff8f6b,accent:0xff5d8f,confetti:[0xff5d8f,0xffc357,0x7ddfc3,0x8f7bff]},
  bunny:{top:0xffd9ec,bottom:0xff7fc0,accent:0xff3d8b,confetti:[0xff3d8b,0x8fd8ff,0xb98cff,0xffe45e]},
  sailor:{top:0xd4efff,bottom:0x57a8ff,accent:0x2f6df6,confetti:[0x2f6df6,0x63d8b0,0xffd23e,0xff5d8f]},
  sunny:{top:0xfff7c2,bottom:0xffb52e,accent:0xff7a1c,confetti:[0xff7a1c,0xff5d8f,0x63d8b0,0x8f7bff]},
  princess:{top:0xefdefa,bottom:0x9d78f0,accent:0x7a4ff0,confetti:[0x7a4ff0,0xff5da2,0xffd23e,0x63d8b0]},
};
const names={original:'小雪',bunny:'软萌一下',sailor:'俏皮一下',sunny:'酷一下',princess:'甜一下'};

// --- V6: three scene themes; V8 adds the diva live-house theme ------------
// The character stays dead center in all of them; only the world jumps.
const themes={
  candy:{domeTop:pal=>pal.top,domeBottom:pal=>pal.bottom,glow:0xffffff,platform:0xffffff,floor:pal=>pal.bottom,beam:0xffffff},
  neon:{domeTop:()=>0x2a1450,domeBottom:()=>0x0a0618,glow:0x6a3fd8,platform:0x18122e,floor:()=>0x0b0818,beam:0x63d8ff},
  star:{domeTop:()=>0x3a2a6e,domeBottom:()=>0x141c3a,glow:0x8fa8ff,platform:0xf4f6ff,floor:()=>0x141c3a,beam:0xcfd8ff},
  diva:{domeTop:()=>0x2b1245,domeBottom:()=>0x08040f,glow:0xb47aff,platform:0x1b1132,floor:()=>0x0a0616,beam:0xd8b4ff},
};

function starShape(points=5,outer=.09,inner=.042){const s=new THREE.Shape();
  for(let i=0;i<points*2;i++){const r=i%2?inner:outer,a=i/(points*2)*Math.PI*2-Math.PI/2;
    i?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r);}s.closePath();return s;}
function heartShape(){const s=new THREE.Shape();s.moveTo(0,-.05);
  s.bezierCurveTo(-.09,.02,-.06,.10,0,.045);s.bezierCurveTo(.06,.10,.09,.02,0,-.05);return s;}
function mulberry32(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function buildStage(scene,pal,themeName){
  const theme=themes[themeName];
  const g=new THREE.Group();
  // Gradient dome behind everything
  const dome=new THREE.Mesh(new THREE.SphereGeometry(60,32,24),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new THREE.Color(theme.domeTop(pal))},bottom:{value:new THREE.Color(theme.domeBottom(pal))},glow:{value:new THREE.Color(theme.glow)}},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vP;uniform vec3 top,bottom,glow;
      void main(){float h=clamp((vP.y+17.)/36.,0.,1.);vec3 c=mix(bottom,top,pow(h,1.25));
      float r=length(normalize(vP).xy*vec2(1.,1.4));c=mix(c,glow,smoothstep(.7,.08,r)*.28);
      gl_FragColor=vec4(c,1.);}`}));
  g.add(dome);
  // Round glossy stage platform
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.15,.07,64),
    new THREE.MeshStandardMaterial({color:theme.platform,roughness:.25,metalness:.05}));
  platform.position.y=-.035;platform.receiveShadow=true;g.add(platform);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.06,.028,12,80),
    new THREE.MeshBasicMaterial({color:pal.accent}));
  rim.rotation.x=Math.PI/2;rim.position.y=.002;g.add(rim);
  const rings=[];
  for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(.3+i*.32,.33+i*.32,72),
    new THREE.MeshBasicMaterial({color:pal.accent,transparent:true,opacity:.5,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.position.y=.004+i*.001;g.add(ring);rings.push(ring);}
  const floaters=[];const extras={};
  const rand=mulberry32(20260913);
  if(themeName==='candy'){
    // Floating stars and hearts
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
  } else if(themeName==='neon'){
    // Night street: building silhouettes with lit windows at the back
    const skyline=new THREE.Group();
    const bx=[-1.15,-.62,-.08,.5,1.08],bh=[1.3,2.0,1.55,2.25,1.7];
    for(let i=0;i<5;i++){
      const b=new THREE.Mesh(new THREE.BoxGeometry(.46,bh[i],.3),
        new THREE.MeshStandardMaterial({color:0x16102e,roughness:.9}));
      b.position.set(bx[i],bh[i]/2,-3.6);skyline.add(b);
      for(let wI=0;wI<6;wI++){
        const win=new THREE.Mesh(new THREE.PlaneGeometry(.05,.07),
          new THREE.MeshBasicMaterial({color:rand()<.5?0xffd9a0:0x9fe8ff}));
        win.position.set(bx[i]-.13+(wI%2)*.26,.35+Math.floor(wI/2)*.5,-3.44);
        skyline.add(win);}
    }
    g.add(skyline);extras.skyline=skyline;
    // Neon bars with additive glow planes
    const neonColors=[0x00e5ff,0xff2d95,0xffe45e,0x7a5cff];
    for(let i=0;i<12;i++){
      const h=.5+rand()*.7,color=neonColors[i%4];
      const m=new THREE.Mesh(new THREE.BoxGeometry(.05,h,.05),new THREE.MeshBasicMaterial({color}));
      const glow=new THREE.Mesh(new THREE.PlaneGeometry(.3,h*1.35),
        new THREE.MeshBasicMaterial({color,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
      const side=i%2?1:-1;
      const x=side*(.72+rand()*.5),y=.6+rand()*1.7,z=-.6-rand()*1.2;
      m.position.set(x,y,z);glow.position.set(x,y,z-.02);
      m.userData={base:m.position.clone(),speed:.8+rand()*1.2,phase:rand()*6.28,glow};
      g.add(m,glow);floaters.push(m);}
  } else if(themeName==='diva'){
    // V8 diva live house: spotlight cones, a floor mic stand, drifting stardust
    const spots=[];
    for(const [x,tilt,color] of [[-.85,-.5,0xffd9ec],[.85,.5,0xbfe0ff],[0,0,0xfff3c4]]){
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.55,3.4,24,1,true),
        new THREE.MeshBasicMaterial({color,transparent:true,opacity:.10,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
      cone.position.set(x*.5,2.6,-.9);cone.rotation.z=tilt*.5;
      cone.userData={baseTilt:tilt*.5,phase:x*3+1.3};
      g.add(cone);spots.push(cone);}
    extras.spotlights=spots;
    const stand=new THREE.Group();
    const standMat=new THREE.MeshStandardMaterial({color:0x1c1c26,roughness:.4,metalness:.6});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.14,.16,.025,24),standMat);
    base.position.y=.013;stand.add(base);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.05,10),standMat);
    pole.position.y=.55;stand.add(pole);
    const boom=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.3,8),standMat);
    boom.position.set(.06,1.08,0);boom.rotation.z=-1.1;stand.add(boom);
    const smBody=new THREE.Mesh(new THREE.CylinderGeometry(.016,.02,.1,12),standMat);
    const smGrille=new THREE.Mesh(new THREE.SphereGeometry(.034,16,12),
      new THREE.MeshStandardMaterial({color:0xd9deea,roughness:.5,metalness:.4}));
    smGrille.scale.set(1,1.2,1);smGrille.position.y=.07;
    const sm=new THREE.Group();sm.add(smBody,smGrille);
    sm.position.set(.19,1.15,0);sm.rotation.z=-1.1;stand.add(sm);
    stand.position.set(-.62,0,.42);stand.rotation.y=.35;
    stand.traverse(o=>{if(o.isMesh)o.castShadow=true;});
    g.add(stand);extras.micStand=stand;stand.visible=false;
    const N=180,sp=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      sp[i*3]=(rand()-.5)*4.4;sp[i*3+1]=.3+rand()*3.1;sp[i*3+2]=-1.6+rand()*2.4;}
    const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
    const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xfff0f8,size:.035,transparent:true,opacity:.8}));
    g.add(dust);extras.dust=dust;
  } else {
    // Starry cloud sea: starfield dome, drifting cloud puffs, crescent moon
    const N=260,pos=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const a=rand()*Math.PI*2,e=rand()*.9+.05,r=45;
      pos[i*3]=Math.cos(a)*Math.cos(e)*r;pos[i*3+1]=Math.sin(e)*r*.8+2;pos[i*3+2]=Math.sin(a)*Math.cos(e)*r;}
    const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const starfield=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:.5,transparent:true,opacity:.9}));
    g.add(starfield);extras.starfield=starfield;
    const moon=new THREE.Mesh(new THREE.CircleGeometry(.26,40),new THREE.MeshBasicMaterial({color:0xfff3c4}));
    moon.position.set(.95,2.35,-2.2);g.add(moon);
    const moonCut=new THREE.Mesh(new THREE.CircleGeometry(.22,40),new THREE.MeshBasicMaterial({color:0x232052}));
    moonCut.position.set(1.06,2.43,-2.19);g.add(moonCut);extras.moon=moon;
    const cloudMat=new THREE.MeshStandardMaterial({color:0xeef2ff,roughness:.95,transparent:true,opacity:.95});
    for(let i=0;i<9;i++){
      const puff=new THREE.Group();
      const rr=.2+rand()*.14;
      for(const [dx,s] of [[-rr*.8,.8],[0,1],[rr*.85,.75]])
        puff.add(new THREE.Mesh(new THREE.SphereGeometry(rr*s,20,14),cloudMat));
      puff.children.forEach((m,j)=>{m.position.x=[-rr*.8,0,rr*.85][j];m.scale.y=.5;});
      const side=i%2?1:-1,high=i>6;
      puff.position.set(side*(.55+rand()*.65),high?1.0+rand()*.5:.06+rand()*.3,-.3-rand()*1.2);
      puff.userData={base:puff.position.clone(),speed:.25+rand()*.35,phase:rand()*6.28};
      g.add(puff);floaters.push(puff);}
  }
  // Stage light beams
  const beams=[];
  for(const side of [-1,1]){
    const beam=new THREE.Mesh(new THREE.ConeGeometry(.85,4.6,24,1,true),
      new THREE.MeshBasicMaterial({color:theme.beam,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
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
  return{group:g,theme:themeName,dome,platform,rim,rings,floaters,beams,confetti,confettiColors:colors,extras,bursts:new Map()};
}

function confettiBurst(stage,hitTime,index,pal,count=64){
  const rand=mulberry32(index*7919+17);
  const parts=[];
  for(let i=0;i<count;i++){
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
// V9: fx carries {beatPulse, role, motionScale} so the stage can breathe with
// the beat grid (chorus) and die down with the song (outro freeze).
function updateStage(stage,t,pal,pulse,fx={beatPulse:0,role:'verse',motionScale:1}){
  const theme=themes[stage.theme];
  const chorus=fx.role==='chorus';
  const ms=fx.motionScale;
  stage.dome.material.uniforms.top.value.setHex(theme.domeTop(pal));
  stage.dome.material.uniforms.bottom.value.setHex(theme.domeBottom(pal));
  stage.rim.material.color.setHex(pal.accent);
  stage.rim.scale.setScalar(1+.06*pulse*ms+(chorus?.05*fx.beatPulse:0));
  stage.rings.forEach((r,i)=>{
    const u=((t*.9+i/3)%1);
    r.scale.setScalar(1+u*2.2);r.material.opacity=.4*(1-u)*(.25+.75*ms);
    r.material.color.setHex(pal.accent);});
  stage.floaters.forEach(m=>{
    const u=m.userData;
    if(stage.theme==='candy'){
      m.position.y=u.base.y+Math.sin(t*u.speed+u.phase)*.14*ms;
      m.rotation.y=t*u.spin*ms;
    } else if(stage.theme==='neon'){
      m.position.y=u.base.y+Math.sin(t*u.speed+u.phase)*.06*ms;
      u.glow.material.opacity=.10+.10*(.5+.5*Math.sin(t*u.speed*2+u.phase))+(chorus?.08*fx.beatPulse:0);
    } else {
      m.position.x=u.base.x+Math.sin(t*u.speed+u.phase)*.1*ms;
      m.position.y=u.base.y+Math.sin(t*u.speed*.7+u.phase)*.04*ms;}
  });
  if(stage.extras.starfield)stage.extras.starfield.material.opacity=.6+.3*(.5+.5*Math.sin(t*2.2));
  if(stage.extras.spotlights)stage.extras.spotlights.forEach((s,i)=>{
    s.rotation.z=s.userData.baseTilt+.18*Math.sin(t*.9+s.userData.phase)*ms;
    // Chorus: one brightness breath per grid beat.
    s.material.opacity=.08+.05*pulse*ms+.03*(.5+.5*Math.sin(t*2.4+i*2))+(chorus?.12*fx.beatPulse:0);});
  if(stage.extras.dust){
    // Chorus: denser, larger stardust.
    stage.extras.dust.material.size=.035*(chorus?1.7:1);
    stage.extras.dust.material.opacity=(chorus?.65:.5)+.3*(.5+.5*Math.sin(t*1.7))+(chorus?.2*fx.beatPulse:0);}
  stage.beams.forEach((b,i)=>{
    b.rotation.z=(i?1:-1)*(.42+.2*Math.sin(t*.7+i*2)*ms);
    b.material.opacity=(stage.theme==='candy'?.09:.06)+.06*pulse*ms+(chorus?.10*fx.beatPulse:0);});
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

function ensureMic(c){buildDanceRig(c);return c.danceRig.headset;}
function poseFull(c,opts,entry,t){
  const {expression}=opts;
  const previousEntry=board.entries[board.entries.indexOf(entry)-1];
  const posed=poseDance(c,opts,entry,t,beatTimes,previousEntry?{entry:previousEntry,opts:optsOf(previousEntry)}:null);
  const hairTime=opts.move==='finale'?Math.min(t,entry.startTime+.13):t;
  c.leftTail.rotation.z=c.leftTail.userData.baseRotZ-.04*Math.sin(hairTime*6);
  c.rightTail.rotation.z=c.rightTail.userData.baseRotZ+.04*Math.sin(hairTime*6);
  c.ahoge.rotation.z=.6;
  // Face (perform()'s grammar, minus camera/scene side effects)
  const face=expression;
  const leftClosed=['wink','grin','squeeze'].includes(face);
  const rightClosed=['grin','squeeze'].includes(face);
  c.leftEye.scale.set(1,face==='surprise'?1.08:1,1);
  c.rightEye.scale.copy(c.leftEye.scale);
  c.leftEye.visible=!leftClosed;c.rightEye.visible=!rightClosed;
  c.leftEyelid.visible=false;c.rightEyelid.visible=false;
  c.beatFace.eyes[0].visible=leftClosed;c.beatFace.eyes[1].visible=rightClosed;
  c.leftEyebrow.position.y=face==='surprise'?.17:.15;
  c.rightEyebrow.position.y=face==='curious'?.17:c.leftEyebrow.position.y;
  c.leftEyebrow.rotation.z=Math.PI/2-.15;
  c.rightEyebrow.rotation.z=Math.PI/2+.15;
  c.mouth.scale.set(1,1,1);c.mouth.position.y=c.mouthBaseY;
  const open=['grin','wink'].includes(face);
  c.upperLip.visible=!open && face!=='surprise';
  c.lowerLip.visible=false;
  c.beatFace.smile.visible=open;c.beatFace.tongue.visible=open;
  c.mouthCavity.visible=face==='surprise';
  c.mouthCavity.scale.set(1.05,1.65,.6);
  c.mouthCavity.position.z=.016;
  if(expression==='pout'){
    c.mouth.scale.set(.53,.9,1);c.upperLip.scale.y=-1;
    c.leftEyebrow.rotation.z=Math.PI/2-.30;c.rightEyebrow.rotation.z=Math.PI/2+.30;
  } else c.upperLip.scale.y=1;
  if(expression==='tongue'){
    c.upperLip.visible=false;c.beatFace.smile.visible=true;c.beatFace.tongue.visible=true;
    c.beatFace.tongue.scale.set(.85,1.3,.12);c.beatFace.tongue.position.y=-.050;
    c.leftEye.visible=false;c.beatFace.eyes[0].visible=true;
  } else {c.beatFace.tongue.scale.set(1.2,.35,.12);c.beatFace.tongue.position.y=-.036;}

  applyLips(c,lipAt(t));
  return posed;
}

// --- V6: dance ghosts — two delayed clone afterimages ---
function pathTo(root,node){const p=[];let n=node;while(n&&n!==root){p.unshift(n.parent.children.indexOf(n));n=n.parent;}return n===root?p:null;}
function resolvePath(root,path){let n=root;for(const i of path)n=n.children[i];return n;}
function mirrorValue(srcRoot,dstRoot,v){
  if(v&&v.isObject3D){const p=pathTo(srcRoot,v);return p?resolvePath(dstRoot,p):v;}
  if(Array.isArray(v))return v.map(x=>mirrorValue(srcRoot,dstRoot,x));
  if(v&&typeof v==='object'){const o={};for(const k in v)o[k]=mirrorValue(srcRoot,dstRoot,v[k]);return o;}
  return v;
}
function mirrorProxy(src,dstMesh){
  const proxy={mouthBaseY:src.mouthBaseY};
  for(const k of ['mesh','headGroup','leftArm','rightArm','leftLeg','rightLeg','leftEye','rightEye',
    'leftEyelid','rightEyelid','leftEyebrow','rightEyebrow','mouth','upperLip','lowerLip','mouthCavity',
    'leftTail','rightTail','ahoge','beatFace','wardrobe'])
    if(src[k]!==undefined)proxy[k]=mirrorValue(src.mesh,dstMesh,src[k]);
  return proxy;
}
let ghosts=null;
function ensureGhosts(scene,src){
  if(ghosts)return ghosts;
  ghosts=[{op:.3,delay:2/60},{op:.15,delay:4/60}].map(g=>{
    const mesh=src.mesh.clone(true);
    mesh.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=g.op;o.material.depthWrite=false;}
      o.castShadow=false;o.receiveShadow=false;});
    scene.scene.add(mesh);
    return {...g,mesh,proxy:mirrorProxy(src,mesh)};
  });
  return ghosts;
}

// --- V6: kinetic cards and swipe overlays (2D, on top of the 3D blit) ---
// Card text: known keys map to the V6 copy; anything else is used verbatim
// (V9 stories write the card text directly, e.g. card=安可).
const cardTexts={next:'下一拍',power:'萌力全开',debut:'你登场'};
const cards=board.entries.filter(e=>optsOf(e).card!=='none')
  .map(e=>({t0:e.startTime,text:cardTexts[optsOf(e).card]??optsOf(e).card}));
const swipes=board.entries.filter(e=>optsOf(e).swipe!=='none')
  .map(e=>({t0:e.startTime,dir:optsOf(e).swipe,color:new THREE.Color(palettes[optsOf(e).outfit].accent)}));

function label(text,x,y,size,color='#3d3044') {
  ctx.fillStyle=color;ctx.textAlign='center';ctx.font=`800 ${size}px "Microsoft YaHei",sans-serif`;ctx.fillText(text,x,y);
}

function drawSwipe(t){
  let active='none';
  for(const sw of swipes){
    const u=(t-sw.t0)/.3;if(u<0||u>=1)continue;
    active=sw.dir;
    const w=W*.36,x=sw.dir==='right'?-w+(W+2*w)*u:W+w-(W+2*w)*u;
    const r=Math.round(sw.color.r*255),gc=Math.round(sw.color.g*255),b=Math.round(sw.color.b*255);
    const grad=ctx.createLinearGradient(x,0,x+w,0);
    grad.addColorStop(0,`rgba(${r},${gc},${b},0)`);
    grad.addColorStop(.18,`rgba(${r},${gc},${b},.95)`);
    grad.addColorStop(.82,`rgba(${r},${gc},${b},.95)`);
    grad.addColorStop(1,`rgba(${r},${gc},${b},0)`);
    ctx.fillStyle=grad;ctx.fillRect(x,0,w,H);
    const edge=sw.dir==='right'?x+w*.82:x+w*.18; // white stripe on the leading edge
    const eg=ctx.createLinearGradient(edge-8,0,edge+8,0);
    eg.addColorStop(0,'rgba(255,255,255,0)');eg.addColorStop(.5,'rgba(255,255,255,.85)');eg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=eg;ctx.fillRect(edge-8,0,16,H);
  }
  return active;
}

function drawCards(t){
  let active='none';
  for(const card of cards){
    const u=t-card.t0;if(u<0||u>.75)continue;
    active=card.text;
    // Slam: 130% -> 97% over 5 frames, settle to 100% over 3 more, hold .6s
    let s=1;
    if(u<.083)s=1.3-.33*(u/.083);
    else if(u<.133)s=.97+.03*((u-.083)/.05);
    const alpha=u>.6?1-(u-.6)/.15:1;
    ctx.save();ctx.globalAlpha=Math.max(alpha,0);ctx.translate(360,945);ctx.scale(s,s);
    ctx.font='800 72px "Microsoft YaHei",sans-serif';ctx.textAlign='center';
    ctx.lineWidth=10;ctx.strokeStyle='rgba(61,48,68,.9)';ctx.strokeText(card.text,0,0);
    ctx.fillStyle='#ffffff';ctx.fillText(card.text,0,0);ctx.restore();
  }
  return active;
}

const stages={};
function stageFor(name,scene,pal){
  if(!stages[name]){
    stages[name]=buildStage(scene.scene,pal,name);
    // Confetti bursts for this scene's hits, pre-planned deterministically
    board.entries.forEach((e,i)=>{
      if(i>0&&(optsOf(e).scene??'candy')===name)
        confettiBurst(stages[name],e.startTime,i,palettes[optsOf(e).outfit]);});
    // V9 chorus density: a small burst on every chorus downbeat for the lit
    // stage themes, seeded from the beat index so they stay deterministic.
    const chorusSec=sections.find((s,i)=>roleOf(s,i)==='chorus');
    if(chorusSec&&(name==='diva'||name==='neon')){
      beatTimes.forEach((b,i)=>{
        if(!downbeatIdx.has(i)||b<chorusSec.start||b>=chorusSec.end)return;
        const e=board.entries.findLast(x=>x.startTime<=b)??board.entries[0];
        confettiBurst(stages[name],b,10000+i,palettes[optsOf(e).outfit],20);
      });
    }
  }
  return stages[name];
}

// V9 intro silhouette: scale the scene light rig (the stage cones/beams are
// unlit additive meshes, so they keep glowing while the character goes dark).
let rigLights=null;
function applyLightDim(scene,dim){
  if(!rigLights){
    rigLights=[];
    scene.scene.traverse(o=>{if(o.isLight)rigLights.push({o,base:o.intensity,rim:o.color?.getHex()===0xc6c4ff});});
  }
  for(const L of rigLights)L.o.intensity=L.base*(L.rim?Math.max(dim,.5):dim);
}

function draw(t) {
  const entry=board.entries.findLast(e=>e.startTime<=t)??board.entries[0];
  const opts=optsOf(entry);
  const {outfit,accessory,expression,gesture,move='none'}=opts;
  const last=entry===board.entries.at(-1),local=t-entry.startTime,duration=entry.endTime-entry.startTime;
  board.update(t);
  const c=board.characters.get('Yuki'),scene=board.currentScene;
  const state=perform(c,camera,scene,t,entry,music.onsets);
  setWardrobe(c,outfit,accessory);
  const mic=ensureMic(c);mic.visible=true;
  const sec=sectionAt(t);
  const bi=beatInfoAt(t);
  const mScale=motionScaleAt(t);
  const beatPulse=bi&&bi.index>=0?Math.exp(-Math.min(bi.sinceBeat,1.5)*8):0;
  const posed=poseFull(c,opts,entry,t,state.pulse,mScale);
  const pal=palettes[outfit];

  // Scene jump-cut: during the first .12s of a scene-change entry the swipe
  // band is still crossing center, so the outgoing scene stays visible.
  const entryScene=opts.scene??'candy';
  let shownScene=entryScene;
  const prevEntry=board.entries[board.entries.indexOf(entry)-1];
  if(prevEntry){
    const prevScene=optsOf(prevEntry).scene??'candy';
    if(prevScene!==entryScene&&local<.12)shownScene=prevScene;
  }
  const stage=stageFor(shownScene,scene,pal);
  for(const [name,st] of Object.entries(stages))st.group.visible=name===shownScene;

  // Dance ghosts: 2 / 4 frame delayed afterimages inside long dance windows.
  // ghost=N shows the N nearest afterimages (N>2 clamps to the pool size).
  let ghostCount=0;
  const wantGhosts=Math.min(Number(opts.ghost)||0,2);
  if(wantGhosts>0&&move==='dance'){
    ensureGhosts(scene,c);
    for(const g of ghosts.slice(0,wantGhosts)){
      const gt=t-g.delay;
      if(gt<entry.startTime){g.mesh.visible=false;continue;}
      poseFull(g.proxy,opts,entry,gt,0,motionScaleAt(gt));
      setWardrobe(g.proxy,outfit,accessory);
      g.mesh.visible=true;ghostCount++;
    }
  } else if(ghosts)ghosts.forEach(g=>g.mesh.visible=false);

  // Hold framing across movement phrases; widen for footwork, push for singing.
  const shot=opts.shot??'wide';
  const distance=shot==='close'?2.90:shot==='medium'?3.78:4.80;
  const targetY=shot==='close'?1.27:shot==='medium'?1.07:.96;
  camera.position.set(shot==='wide'?0:.12*Math.sin(t*.35),targetY+.16,distance);
  camera.lookAt(shot==='wide'?0:c.mesh.position.x*.25,targetY,0);
  camera.fov=35;
  const snapZoom=1,roll=0,dutch=0;
  camera.updateProjectionMatrix();

  // Scene colors: hide the V3 flat-dressing, drive the active stage instead
  const theme=themes[shownScene];
  scene.scene.background.setHex(theme.domeBottom(pal));
  scene.floor.material.color.setHex(theme.floor(pal));
  scene.floor.material.color.lerp(new THREE.Color(0x000000),.08);
  scene.halo.visible=false;scene.footRing.visible=false;scene.orbit.visible=false;
  const dim=introDimAt(t);
  applyLightDim(scene,dim);
  updateStage(stage,t,pal,state.pulse,{beatPulse,role:sec.role,motionScale:mScale});

  renderer.render(scene.scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  const swipeActive=drawSwipe(t);
  const cardActive=drawCards(t);
  label('下一拍 · YUKI LIVE',360,64,22,'#ffffff');
  const lyric=lyricAt(t);drawLyrics(t);
  window.v10Character=c;
  return{index:entry.index,t,local,outfit,accessory,expression,gesture,move,roll,airborne:Math.round(posed.airborne*100)/100,
    scene:shownScene,snapZoom:Math.round(snapZoom*1000)/1000,ghostCount,card:cardActive,swipe:swipeActive,
    lip:lipAt(t),handClearance:posed.handClearance,feet:posed.feet,vocal:mouthAt(t),vocalOpen:Math.round(vocalOpenAt(t)*100)/100,lyric,mic:mic.visible,
    section:sec.role,beat:bi&&bi.index>=0?{index:bi.index,phase:Math.round(bi.phase*1000)/1000,downbeat:bi.downbeat,errMs:beatErrMs(t)}:null,
    beatPulse:Math.round(beatPulse*1000)/1000,dim:Math.round(dim*100)/100,motionScale:Math.round(mScale*100)/100,
    dutchDeg:Math.round(dutch*180/Math.PI*100)/100,
    pose:state.pose,face:expression,rotY:Math.round(c.mesh.rotation.y*1000)/1000,
    sunglasses:c.wardrobe.shades.visible,activeOutfits:Object.entries(c.wardrobe.outfits).filter(([,g])=>g.visible).map(([n])=>n),
    hats:Object.entries(c.wardrobe.hats).filter(([,g])=>g.visible).map(([n])=>n),
    confettiCount:stage.confetti.count,root:c.mesh.position.toArray(),camera:camera.position.toArray()};
}
window.stepAt=t=>draw(t);
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/jpeg',.95).split(',')[1],state};};
await document.fonts.ready;window.ready=true;draw(0);
if(!new URLSearchParams(location.search).has('capture')){
  const audio=new Audio('/episode/assets/audio/mixed_v10.wav');audio.loop=true;
  document.body.title='点击播放 / 暂停';document.body.onclick=()=>audio.paused?audio.play():audio.pause();
  function animate(){draw(audio.currentTime);requestAnimationFrame(animate);}animate();
}
