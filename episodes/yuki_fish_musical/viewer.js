import * as THREE from 'three';
import { Storyboard } from 'dula-engine';
import './bootstrap.js';
import { drawMotif } from './performance_v11.js';
import { prepareFace } from './beat_performance.js';
import {poseActors} from './musical_performance.js';
import {updateTheatre} from './theatre.js';

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
const smooth=t=>{t=Math.min(Math.max(t,0),1);return t*t*(3-2*t);};

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

// --- diva stage (from the beat_ad V14 build, candy props kept) --------------
const CANDY={top:0xffe6b8,bottom:0xff8f6b,accent:0xff5d8f,confetti:[0xff5d8f,0xffc357,0x7ddfc3,0x8f7bff]};
function mulberry32(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function buildStage(scene){
  const g=new THREE.Group();
  const dome=new THREE.Mesh(new THREE.SphereGeometry(60,32,24),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new THREE.Color(0x2b1245)},bottom:{value:new THREE.Color(0x08040f)},glow:{value:new THREE.Color(0xb47aff)}},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vP;uniform vec3 top,bottom,glow;
      void main(){float h=clamp((vP.y+17.)/36.,0.,1.);vec3 c=mix(bottom,top,pow(h,1.25));
      float r=length(normalize(vP).xy*vec2(1.,1.4));c=mix(c,glow,smoothstep(.7,.08,r)*.28);
      gl_FragColor=vec4(c,1.);}`}));
  g.add(dome);
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.75,.07,64),
    new THREE.MeshStandardMaterial({color:0x785048,roughness:.65,metalness:.05}));
  platform.position.y=-.035;platform.receiveShadow=true;g.add(platform);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1.66,.028,12,80),
    new THREE.MeshBasicMaterial({color:CANDY.accent}));
  rim.rotation.x=Math.PI/2;rim.position.y=.002;g.add(rim);
  const rings=[];
  for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(.3+i*.32,.33+i*.32,72),
    new THREE.MeshBasicMaterial({color:CANDY.accent,transparent:true,opacity:.5,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.position.y=.004+i*.001;g.add(ring);rings.push(ring);}
  const spots=[];
  for(const [x,tilt,color] of [[-.85,-.5,0xffd9ec],[.85,.5,0xbfe0ff],[0,0,0xfff3c4]]){
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.55,3.4,24,1,true),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:.10,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    cone.position.set(x*.5,2.6,-.9);cone.rotation.z=tilt*.5;
    cone.userData={baseTilt:tilt*.5,phase:x*3+1.3};
    g.add(cone);spots.push(cone);}
  const N=70,sp=new Float32Array(N*3);
  const rand=mulberry32(20260919);
  for(let i=0;i<N;i++){sp[i*3]=(rand()-.5)*4.4;sp[i*3+1]=.3+rand()*3.1;sp[i*3+2]=-1.62+rand()*.12;}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xfff0f8,size:.035,transparent:true,opacity:.8}));
  g.add(dust);
  const beams=[];
  for(const side of [-1,1]){
    const beam=new THREE.Mesh(new THREE.ConeGeometry(.85,4.6,24,1,true),
      new THREE.MeshBasicMaterial({color:0xd8b4ff,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    beam.position.set(side*1.05,2.7,-1.4);beam.rotation.z=side*.42;g.add(beam);beams.push(beam);}
  scene.add(g);
  return{group:g,dome,platform,rim,rings,spots,dust,beams};
}
function updateStage(stage,t,pulse){
  stage.rim.scale.setScalar(1+.06*pulse);
  stage.rings.forEach((r,i)=>{r.visible=false;
    const u=((t*.9+i/3)%1);
    r.scale.setScalar(1+u*2.2);r.material.opacity=.4*(1-u);});
  stage.spots.forEach((s,i)=>{
    s.rotation.z=s.userData.baseTilt+.18*Math.sin(t*.9+s.userData.phase);
    s.material.opacity=.012+.009*pulse;});
  stage.dust.material.opacity=.5+.3*(.5+.5*Math.sin(t*1.7));
  stage.beams.forEach((b,i)=>{
    b.rotation.z=(i?1:-1)*(.42+.2*Math.sin(t*.7+i*2));
    b.material.opacity=.008+.008*pulse;});
}

// Singer spotlight: whoever holds the melody gets the light.
let focusLights=null;
function applyFocus(scene,t){
  if(!focusLights){
    focusLights={};
    for(const [name,x] of [['Yuki',0],['Mochi',.58]]){
      const spot=new THREE.SpotLight(0xfff2dd,0,6,.5,.45,1.2);
      spot.position.set(x,3.1,.9);
      spot.target.position.set(x,.55,0);
      scene.add(spot);scene.add(spot.target);
      focusLights[name]=spot;}
  }
  const seg=segAt(t);
  const singer=seg.kind==='song'?seg.character:null;
  const f=seg.kind==='reaction'?1:smooth(Math.min((t-seg.start)/.4,1))*smooth(Math.min((seg.end-t)/.4,1));
  focusLights.Yuki.intensity=(singer==='Yuki'?2.6:singer==='Mochi'?.35:1.25)*Math.max(f,.15);
  focusLights.Mochi.intensity=(singer==='Mochi'?2.6:singer==='Yuki'?.35:1.25)*Math.max(f,.15);
}

// Character construction is shared; acting is episode-local.
const yuki=board.characters.get('Yuki');
const mochi=board.characters.get('Mochi');
prepareFace(yuki);

// --- subtitles -----------------------------------------------------------------
const CANDY_PINK='#ff5da2',CANDY_YELLOW='#ffd23e';
function candySweet(x,y,r,body,wrap){
  ctx.fillStyle=wrap;ctx.beginPath();
  ctx.moveTo(x-r*.9,y);ctx.lineTo(x-r*1.7,y-r*.65);ctx.lineTo(x-r*1.7,y+r*.65);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(x+r*.9,y);ctx.lineTo(x+r*1.7,y-r*.65);ctx.lineTo(x+r*1.7,y+r*.65);ctx.closePath();ctx.fill();
  ctx.fillStyle=body;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*.55,0,Math.PI*2);ctx.stroke();
}
function candyStar(x,y,r,color){
  ctx.fillStyle=color;ctx.beginPath();
  for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.42:r;
    i?ctx.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d):ctx.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}
  ctx.closePath();ctx.fill();
}
function drawKaraoke(t,songSeg,chars,lipFn){
  const line=songSeg.lines.find(l=>t>=l.start-.06&&t<l.end+.15);
  if(!line)return;
  const cx=52,cy=1178,cw=616,ch=72,cr=36;
  ctx.save();
  ctx.shadowColor='rgba(70,20,60,.35)';ctx.shadowBlur=14;ctx.shadowOffsetY=5;
  const grad=ctx.createLinearGradient(cx,cy,cx+cw,cy+ch);
  grad.addColorStop(0,'rgba(255,182,213,.92)');grad.addColorStop(.55,'rgba(255,228,240,.92)');grad.addColorStop(1,'rgba(168,216,255,.92)');
  ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(cx,cy,cw,ch,cr);ctx.fill();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.save();ctx.beginPath();ctx.roundRect(cx,cy,cw,ch,cr);ctx.clip();
  ctx.strokeStyle='rgba(255,125,178,.18)';ctx.lineWidth=10;
  for(let sx=cx-ch;sx<cx+cw;sx+=34){ctx.beginPath();ctx.moveTo(sx,cy+ch);ctx.lineTo(sx+ch,cy);ctx.stroke();}
  ctx.restore();
  ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(cx,cy,cw,ch,cr);ctx.stroke();
  candySweet(cx+34,cy+ch/2,13,CANDY_PINK,'#ffffff');
  candyStar(cx+cw-34,cy+ch/2,13,CANDY_YELLOW);
  ctx.font='600 29px "Microsoft YaHei",sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
  const text=line.text,width=ctx.measureText(text).width;let x=(720-width)/2,index=line.char0;
  const current=chars.findLastIndex(c=>c.start<=t&&t<c.end);
  for(const ch2 of text){
    const w=ctx.measureText(ch2).width;
    if(ch2===' '){x+=w;continue;}
    const sung=index===current;
    let scale=1,lift=0;
    if(sung&&chars[index]){
      const u=t-chars[index].start;
      if(u>=0&&u<.2){const s=Math.sin(Math.PI*u/.2);scale=1+.35*s;lift=5*s;}
    }
    ctx.save();ctx.translate(x+w/2,1214-lift);ctx.scale(scale,scale);
    ctx.lineWidth=4.5;ctx.lineJoin='round';
    ctx.strokeStyle=sung?'#ffffff':(index%2?CANDY_PINK:'#7fc9ff');
    ctx.strokeText(ch2,-w/2,0);
    ctx.fillStyle=sung?(index%2?CANDY_PINK:CANDY_YELLOW):(index<current?'#e9dcef':'#ffffff');
    ctx.fillText(ch2,-w/2,0);
    ctx.restore();
    x+=w;index++;
  }
  ctx.restore();
}
function drawDialogueSub(t,seg){
  if(seg.kind!=='dialogue')return;
  const name=seg.character==='Yuki'?'小雪':'年糕';
  const color=seg.character==='Yuki'?'#ff9ec7':'#ffc357';
  const display=seg.display??seg.text;
  ctx.save();
  ctx.globalAlpha=Math.min(1,(t-seg.start)/.08)*Math.min(1,(seg.end-t)/.15+.2);
  ctx.font='600 30px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const text=`${name}：${display}`;
  const w=ctx.measureText(text).width;
  ctx.fillStyle='rgba(20,12,28,.55)';
  ctx.beginPath();ctx.roundRect((720-w)/2-26,1150,w+52,64,32);ctx.fill();
  ctx.lineWidth=5;ctx.lineJoin='round';ctx.strokeStyle='rgba(0,0,0,.85)';
  ctx.strokeText(name+'：',(720-w)/2+ctx.measureText(name+'：').width/2,1182);
  ctx.fillStyle=color;ctx.fillText(name+'：',(720-w)/2+ctx.measureText(name+'：').width/2,1182);
  ctx.strokeText(display,(720-w)/2+ctx.measureText(name+'：').width+ctx.measureText(display).width/2,1182);
  ctx.fillStyle='#ffffff';ctx.fillText(display,(720-w)/2+ctx.measureText(name+'：').width+ctx.measureText(display).width/2,1182);
  ctx.restore();
}
function drawTitle(t){
  ctx.save();ctx.globalAlpha=.92;
  ctx.fillStyle='#482c43';ctx.beginPath();ctx.roundRect(145,32,430,48,24);ctx.fill();
  ctx.font='800 22px "Microsoft YaHei",sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#ffffff';ctx.fillText('谁动了我的小鱼干 · 音乐剧',360,64);
  ctx.restore();
}
function drawFinaleCard(t,seg){
  if(seg.kind!=='freeze')return;
  const u=t-seg.start;
  if(u<.3||u>2.2)return;
  const v=Math.min((u-.3)/.12,1),alpha=u>1.9?Math.max(0,1-(u-1.9)/.3):1;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(360,300);ctx.scale(1.3-.3*v+ .0,1.3-.3*v);
  ctx.font='800 48px "Microsoft YaHei",sans-serif';ctx.textAlign='center';
  ctx.lineWidth=10;ctx.strokeStyle='rgba(61,48,68,.9)';ctx.lineJoin='round';
  ctx.strokeText('小鱼干案 · 告破',0,0);
  ctx.fillStyle='#ffffff';ctx.fillText('小鱼干案 · 告破',0,0);
  ctx.font='600 25px "Microsoft YaHei"';ctx.lineWidth=5;ctx.strokeText('本日洗碗员：年糕',0,48);ctx.fillStyle='#ffdf91';ctx.fillText('本日洗碗员：年糕',0,48);
  ctx.restore();
}

// --- main loop ------------------------------------------------------------------
const stage=buildStage(board.currentScene.scene);
const theatre=board.currentScene.initializeTheatre(mochi);
theatre.washAt=authored.find(e=>optsFor(e,'Yuki').move==='fish_verdict').startTime;
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
  const pulse=bi&&bi.index>=0?Math.exp(-Math.min(bi.sinceBeat,1.5)*8):0;
  const entry=authored.find(e=>t>=e.startTime&&t<e.endTime)??authored.at(-1);
  const ai=authored.indexOf(entry),allOpts={Yuki:optsFor(entry,'Yuki'),Mochi:optsFor(entry,'Mochi')};
  const previous=ai>0?{entry:authored[ai-1],opts:optsFor(authored[ai-1],'Yuki')}:null;
  const lip=lipYuki(t),catLip=lipMochi(t);
  const result=poseActors(yuki,mochi,t,entry,allOpts,lip,catLip,beatTimes,previous);
  const posed=result.yuki,opts=result.opts,mochiState=result.cat;
  updateTheatre(theatre,t,entry,allOpts);
  scene.scene.background.setHex(0x08040f);
  scene.floor.material.color.setHex(0x3a2637);
  // The platform top is y=0. A coplanar floor creates radial z-fighting.
  scene.floor.position.y=-.08;
  scene.halo.visible=false;scene.footRing.visible=false;scene.orbit.visible=false;
  updateStage(stage,t,pulse);
  applyFocus(scene.scene,t);

  const shot=opts.shot??'wide';
  const distance=shot==='evidence'?3.10:shot==='cat'?3.55:shot==='yuki'?3.8:6.25;
  const targetY=shot==='evidence'?.69:shot==='cat'?.70:shot==='yuki'?1.22:1.00;
  const focusX=['cat','evidence'].includes(shot)?.69:shot==='yuki'?-.43:.05;
  camera.position.set(focusX+.025*Math.sin(t*.6),targetY+.10,distance);
  camera.lookAt(focusX,targetY,0);
  camera.fov=35;camera.updateProjectionMatrix();

  renderer.render(scene.scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  if(opts.motif&&opts.motif!=='none'&&seg.kind==='song')drawMotif(ctx,camera,yuki,opts,entry,t,posed);
  drawTitle(t);
  if(seg.kind==='song'){
    if(seg.id==='songA')drawKaraoke(t,TL.songA,TL.songA.chars,lipMochi);
    else drawKaraoke(t,TL.songB,TL.songB.chars,lipYuki);
  }else drawDialogueSub(t,seg);
  drawFinaleCard(t,seg);
  if(shot==='evidence'){
    const point=theatre.evidence.getWorldPosition(new THREE.Vector3()).project(camera),x=(point.x+1)*W/2,y=(1-point.y)*H/2;
    ctx.save();ctx.strokeStyle='#ffd86d';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.beginPath();ctx.arc(x,y,30,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#ffe7a0';ctx.font='bold 26px "Microsoft YaHei"';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#48313f';ctx.strokeText('物证，在嘴边。',360,970);ctx.fillText('物证，在嘴边。',360,970);ctx.restore();
  }
  if(allOpts.Mochi.move==='cat_talk'&&seg.id==='04_mochi_art'){
    ctx.save();ctx.fillStyle='#ffe4a3';ctx.font='bold 32px "Microsoft YaHei"';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#48313f';ctx.strokeText('《艺术》',360,350);ctx.fillText('《艺术》',360,350);ctx.restore();
  }
  return{index:0,t,segment:seg.id,shot,
    storyEntry:entry.index,move:opts.move,yukiLip:{jaw:Math.round(lip.jaw*1000)/1000,char:lip.char},mouth:result.yukiMouth,
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
