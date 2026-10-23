// Shot-specific 2D cels, deformation, photography and effects over the R27 layout.
// Source cues/audio remain in script.story; art_pass_r2.story owns these trial cuts.
import * as THREE from 'three';
import {createMotionController} from './assets3d/art_pass_runtime/motion-controls.js';
import {createParticleEffectsStage} from './assets3d/art_pass_runtime/particle-effects-stage.js';
import {prepareFirePlate,environmentFires,restoreLampBars} from './config/painted_environment_r2.js';
import {particleCloud,combustionBurst,hearthFire} from 'dula-assets/lib/craft3d/combustion-particles.js';
import {createAuthoredFacePainter} from './assets3d/art_pass_runtime/authored-face.js';
import {faces} from './config/face_design_r2.js';
import {drawPropCracks} from './assets3d/art_pass_runtime/prop-damage.js';
import {shieldState,shieldFrames} from './config/prop_state_r2.js';
import {T} from './config/event_times.js';
const options=new URLSearchParams(location.search),useParticles=true,integrateCels=true;
const W=1280,H=720,START=T.HERO_CHARGE,END=174,FPS=30;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,u)=>a+(b-a)*u;
const pulse=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const gauss=(x,y,cx,cy,rx,ry)=>Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2)*2);
const rand=i=>{const n=Math.sin(i*91.37+17.13)*43758.54;return n-Math.floor(n);};
const [story,envs,dialogue]=await Promise.all([fetch('./art_pass_r2.story').then(r=>r.text()),fetch('./config/voice_envs.json').then(r=>r.json()),fetch('./config/dialogue.json').then(r=>r.json())]);
const sec=s=>{const [h,m,v]=s.replace(',','.').split(':').map(Number);return h*3600+m*60+v;};
const shots=story.trim().split(/\r?\n\s*\r?\n/).map(block=>{const m=block.match(/(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})/),kind=block.match(/\|shot=([^|}]+)/),id=block.match(/\|id=([^|}]+)/);if(!m||!kind)throw Error('Invalid pilot story block');return{id:id[1],start:sec(m[1]),end:sec(m[2]),kind:kind[1]};});
if(shots[0].start!==START||shots.at(-1).end!==END||shots.some((s,i)=>s.end<=s.start||(i&&s.start!==shots[i-1].end)))throw Error('Shot timeline has a gap/overlap');
if(T.RELEASE!==168.4||T.C7!==171||T.LAND!==172.6)throw Error('Source cue changed: re-direct the pilot');
const keys=['background','hero_charge','hero_breakdown','hero_release','hero_portrait','enemy_ready','enemy_hit','enemy_land'];
const [motion,poseEdits]=await Promise.all([fetch('./config/art_pass_r2_counter_motion.json').then(r=>r.json()),fetch('./config/art_pass_r2_pose_edits.json').then(r=>r.json())]);
if(motion.start!==START||motion.fps!==FPS||motion.frames.length!==331)throw Error('Missing or stale 3D motion bake');
const images=Object.fromEntries(await Promise.all(keys.map(async k=>{const im=new Image();im.src=`./assets3d/art_pass_r2/${k}.png`;await im.decode();return[k,im];})));
const cleanFire=new Image();cleanFire.src='./assets3d/art_pass_full_r2/background_flames_removed.png';await cleanFire.decode();images.background=prepareFirePlate(images.background,cleanFire);
for(const key of ['hero_charge','hero_release','hero_breakdown']){const source=images[key],c=document.createElement('canvas');c.width=source.width;c.height=source.height;const q=c.getContext('2d');q.drawImage(source,0,0);drawPropCracks(q,shieldFrames[key],shieldState(START).level);images[key]=c;}
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);const g=canvas.getContext('2d');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,W,0,H,-100,100);camera.position.z=10;
const particleStage=useParticles?await(async()=>{
 const [{createParticleStage},{combustionAura}]=await Promise.all([import('./assets3d/art_pass_runtime/particle-stage.js'),import('dula-assets/lib/craft3d/combustion-particles.js')]);
 return createParticleStage({THREE,renderer,makeAura:combustionAura,width:W,height:H,pixelsPerUnit:200});
})():null;
const integration=integrateCels?await import('./assets3d/art_pass_runtime/cel-integration.js'):null;
const celLight=integration?.createCelIntegration({width:W,height:H});
const authoredPortrait=createAuthoredFacePainter(images.hero_portrait,faces.aoao),portrait=authoredPortrait.canvas;
const effects=createParticleEffectsStage({THREE,renderer,particleCloud,combustionBurst,hearthFire,width:W,height:H});
const cells={};
for(const key of keys.filter(k=>k!=='background')){
 const im=images[key],tex=key==='hero_portrait'?new THREE.CanvasTexture(portrait):new THREE.Texture(im);tex.needsUpdate=true;tex.colorSpace=THREE.SRGBColorSpace;
 const geo=new THREE.PlaneGeometry(1,1,36,48),material=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.018,side:THREE.DoubleSide,depthWrite:false});
 const mesh=new THREE.Mesh(geo,material);mesh.frustumCulled=false;scene.add(mesh);cells[key]={im,geo,material,mesh,tex};
}
function path(ctx,p,fill,stroke=null,width=2){ctx.beginPath();for(const a of p){if(a[0]==='M')ctx.moveTo(a[1],a[2]);else if(a[0]==='L')ctx.lineTo(a[1],a[2]);else if(a[0]==='Q')ctx.quadraticCurveTo(...a.slice(1));else if(a[0]==='C')ctx.bezierCurveTo(...a.slice(1));else ctx.closePath();}if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function paintPortrait(t){const line=envs.lines.find(x=>x.id==='p19'),jaw=clamp(line?.jaw[Math.floor((t-line.t0)/line.dt)]??0),blink=1-ease((t-START-.12)/.38);const state=authoredPortrait.paint({jaw,emotion:t<165?'resolve':'shout',blink});cells.hero_portrait.tex.needsUpdate=true;return state;}
// Authored drawing landmarks connect an illustration to the 3D motion channel.
// These are per-angle controls, not an automatic arbitrary-image skeleton fit.
const rigs={
 hero_charge:{actor:'aoao',ref:0,pins:[[940,1390],[360,1260],[90,1400]],j:{head:[750,350,260,250],leftHand:[330,1040,180,230],rightHand:[910,780,120,150],pelvis:[610,850,300,260]}},
 hero_breakdown:{actor:'aoao',ref:153,pins:[[925,1450],[80,1270]],j:{head:[640,270,240,250],leftHand:[800,650,230,300],rightHand:[140,735,160,170],pelvis:[510,780,310,260]}},
 hero_release:{actor:'aoao',ref:167,pins:[[930,1340],[70,1120]],j:{head:[510,330,260,240],leftHand:[830,620,260,300],rightHand:[140,660,160,180],pelvis:[480,760,280,240]}},
 enemy_ready:{actor:'yekari',ref:0,pins:[[100,1490],[960,1390]],j:{head:[480,200,260,240],rightHand:[190,410,150,180],leftHand:[360,440,160,170],pelvis:[580,740,260,250]}},
 enemy_hit:{actor:'yekari',ref:241,pins:[[113,1482]],j:{head:[770,210,260,240],rightHand:[130,320,200,180],leftHand:[915,610,170,190],pelvis:[610,790,270,270]}},
 enemy_land:{actor:'yekari',ref:288,pins:[[130,1397],[890,1250]],j:{head:[470,370,270,240],rightHand:[150,800,170,170],leftHand:[650,630,180,180],pelvis:[550,880,270,250]}}
};
const motionControls=createMotionController({motion,poseEdits,rigs});
let offsets={};
const bakeFrame=t=>motionControls.frameAt(t);
function updateMotion(t){const frame=motionControls.update(t);offsets=motionControls.offsets;return frame;}
function deform(key,x,y,t){
 const dt=t-START,body=ease((dt-2.4)/2.3),hair=Math.sin(dt*13)*2.5*body;
 let dx=0,dy=0;
 if(key==='hero_charge'){
  const upper=1-ease((y-720)/620),pin=1-gauss(x,y,190,1400,260,170);
  dx=(-14*body+4*Math.sin(dt*3))*upper*pin;dy=(13*body-3*Math.sin(dt*3))*upper;
  dx+=(-10*body+hair)*gauss(x,y,600,220,480,260);
  dx+=5*Math.sin(dt*17)*body*gauss(x,y,915,790,80,100);
 }else if(key==='hero_breakdown'){
  const u=ease((t-167.96)/.24),upper=1-ease((y-750)/650);dx=18*u*upper;dy=-24*u*upper;dx+=7*Math.sin(u*4)*gauss(x,y,550,150,380,250);
 }else if(key==='hero_release'){
  const d=Math.max(0,t-T.RELEASE),snap=1-Math.exp(-d*12),settle=Math.exp(-d*5)*Math.sin(d*18),upper=1-ease((y-710)/650);
  dx=(14*snap+8*settle)*upper;dy=8*settle*upper;dx-=14*Math.exp(-d*3)*Math.sin(d*9)*gauss(x,y,430,230,450,260);
 }else if(key==='enemy_ready'){
  const pull=pulse(t,164.1,164.32,164.43,164.78),near=gauss(x,y,255,420,210,170);dx=14*pull*near;dy=-8*pull*near;
  dx+=5*ease((t-169)/2)*gauss(x,y,500,200,250,250);dy+=3*Math.sin(dt*3)*gauss(x,y,500,560,390,350);
 }else if(key==='enemy_hit'){
  const d=Math.max(0,t-T.C7),recoil=pulse(d,0,.1,.26,.7),land=pulse(t,T.LAND,T.LAND+.12,T.LAND+.22,T.LAND+.75);
  dx=24*recoil*gauss(x,y,680,450,500,650);dy=20*land*(1-ease((y-700)/700));dx+=18*Math.exp(-d*2)*Math.sin(d*10)*gauss(x,y,850,170,300,280);
 }else if(key==='enemy_land'){
  const d=Math.max(0,t-T.LAND),compress=pulse(d,0,.12,.18,.50),upper=1-ease((y-870)/500);dy=18*compress*upper;dx=-9*compress*upper;dx+=8*Math.exp(-d*4)*Math.sin(d*13)*gauss(x,y,520,250,310,260);
 }else if(key==='hero_portrait'){
  const head=1-ease((y-820)/180),lift=ease((dt-.18)/.55);dx=9*lift*head;dy=-14*lift*head;dx+=(-7*body+hair)*gauss(x,y,540,230,550,360);
 }

 return motionControls.deform(key,x,y,dx,dy);
}
let view={cx:640,cy:360,z:1,roll:0};
function screen(x,y){const dx=(x-view.cx)*view.z,dy=(y-view.cy)*view.z,c=Math.cos(view.roll),s=Math.sin(view.roll);return[W/2+dx*c-dy*s,H/2+dx*s+dy*c];}
function place(key,pos,t,order=1){const cell=cells[key],a=cell.geo.attributes.position,uv=cell.geo.attributes.uv,w=cell.im.width,h=cell.im.height,c=Math.cos(pos.rot??0),s=Math.sin(pos.rot??0);
 cell.mesh.visible=true;cell.mesh.renderOrder=order;
 for(let i=0;i<a.count;i++){const [x,y]=deform(key,uv.getX(i)*w,(1-uv.getY(i))*h,t),rx=(x-(pos.px??0))*pos.s,ry=(y-(pos.py??0))*pos.s;const p=screen(pos.x+rx*c-ry*s,pos.y+rx*s+ry*c);a.setXYZ(i,p[0],p[1],0);}
 a.needsUpdate=true;return cell;
}
const placements={hero_charge:{x:209,y:180,s:.32},hero_breakdown:{x:195.5,y:132,s:.34},hero_release:{x:194,y:164,s:.34},enemy_ready:{x:826,y:113.4,s:.34},enemy_land:{x:905,y:148,s:.34}};
function enemyHitPlacement(t){const current=bakeFrame(t).actors.yekari.root,base=bakeFrame(T.C7).actors.yekari.root;return{x:842+(current[0]-base[0])*45,y:119-(current[1]-base[1])*145,s:.34};}
function worldPoint(key,x,y,t,pos=placements[key]){const p=deform(key,x,y,t),c=Math.cos(pos.rot??0),s=Math.sin(pos.rot??0),a=(p[0]-(pos.px??0))*pos.s,b=(p[1]-(pos.py??0))*pos.s;return[pos.x+a*c-b*s,pos.y+a*s+b*c];}
function viewTransform(ctx){ctx.translate(W/2,H/2);ctx.rotate(view.roll);ctx.scale(view.z,view.z);ctx.translate(-view.cx,-view.cy);}
function backdrop(t){g.fillStyle='#171827';g.fillRect(0,0,W,H);g.save();const b={...view,z:1+(view.z-1)*.18,cx:640+(view.cx-640)*.28,cy:360+(view.cy-360)*.28};g.translate(W/2,H/2);g.rotate(b.roll*.3);g.scale(b.z,b.z);g.translate(-b.cx,-b.cy);g.drawImage(images.background,-70,-40,1420,800);g.restore();effects.drawFire(g,t,{...b,roll:b.roll*.3},environmentFires(images.background,[-70,-40,1420,800]));g.save();g.translate(W/2,H/2);g.rotate(b.roll*.3);g.scale(b.z,b.z);g.translate(-b.cx,-b.cy);restoreLampBars(g,images.background,[-70,-40,1420,800]);g.restore();
 const grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,'rgba(9,13,32,.18)');grad.addColorStop(.7,'rgba(10,9,20,0)');grad.addColorStop(1,'rgba(8,11,28,.30)');g.fillStyle=grad;g.fillRect(0,0,W,H);
}
function floorShadow(x,y,rx,ry,a=.45){g.save();viewTransform(g);if(integration)integration.drawGroundContact(g,{x,y,radiusX:rx,radiusY:ry,opacity:Math.min(a,.35),cast:[x<700?120:75,-24]});else{g.fillStyle=`rgba(10,9,22,${a})`;g.beginPath();g.ellipse(x,y,rx,ry,-.05,0,Math.PI*2);g.fill();}g.restore();}
const slot=[280,630],hitWorld=[1064,316];
function chainPoints(t,energyPath=false){let end=worldPoint('enemy_ready',181,480,t);if(energyPath){const q=ease((t-T.C7+.14)/.14);end=end.map((v,i)=>mix(v,hitWorld[i],q));}const u=clamp((t-T.RELEASE)/(T.C7-T.RELEASE));return{end,u:Math.pow(u,1.65),points:Array.from({length:61},(_,i)=>{const a=i/60;return[mix(slot[0],end[0],a),mix(slot[1],end[1],a)+Math.sin(a*Math.PI)*8];})};}
function chain(t){if(t>=T.C7+.1)return;const {points}=chainPoints(t);g.save();viewTransform(g);g.strokeStyle='#b3a8bb';g.lineWidth=2.3;
 for(let i=0;i<points.length-1;i++){const p=points[i],q=points[Math.min(i+1,60)],angle=Math.atan2(q[1]-p[1],q[0]-p[0]);g.save();g.translate(p[0],p[1]);g.rotate(angle);g.beginPath();g.ellipse(0,0,7,i%2===0?3.4:1.6,0,0,Math.PI*2);g.stroke();g.restore();}g.restore();}
function energy(t){if(t<T.RELEASE||t>T.C7+.11)return;const {points,u}=chainPoints(t,true);effects.drawStream(g,t,view,{points,progress:u,power:1,start:T.RELEASE,flow:true});}
function impact(t){effects.drawBurst(g,t,view,[{id:'counter',start:T.C7,point:hitWorld,scale:1.05},{id:'landing',start:T.LAND,point:[1030,620],scale:.4,color:'#d0b79f',normal:[0,1,0]}]);}
function subtitle(t){const active=dialogue.lines.find(l=>{const e=envs.lines.find(x=>x.id===l.id);return e&&t>=e.t0&&t<e.t0+e.dur+.12;});if(!active)return;g.font='bold 27px Microsoft YaHei';g.textAlign='center';g.lineJoin='round';g.lineWidth=5;g.strokeStyle='#241d25';g.fillStyle='#ffe4a3';const text=`${active.speaker==='aoao'?'阿鏊':'夜刈'}：${active.text}`;g.strokeText(text,W/2,675);g.fillText(text,W/2,675);}
function draw(t){
 if(t<START||t>=END)throw Error('Pilot time outside source window');const motionFrame=updateMotion(t),shot=shots.find(s=>t>=s.start&&t<s.end),dt=t-START,u=clamp((t-shot.start)/(shot.end-shot.start));for(const c of Object.values(cells))c.mesh.visible=false;
 const face=paintPortrait(t);let portraitOnly=false,heroKey=t<167.98?'hero_charge':t<T.RELEASE?'hero_breakdown':'hero_release';
 view={cx:640,cy:360,z:1,roll:0};
 if(shot.kind==='eyes'){portraitOnly=true;view={cx:640,cy:360,z:1,roll:mix(-.025,0,ease(u))};}
 if(shot.kind==='call'){portraitOnly=true;view={cx:640,cy:360,z:1,roll:-.045};}
 if(shot.kind==='cuff')view={cx:928,cy:290,z:2.15,roll:.04};
 if(shot.kind==='shield')view={cx:315,cy:mix(565,465,ease(u)),z:1.75,roll:-.05};
 if(shot.kind==='coil')view={cx:415,cy:mix(450,380,ease(u)),z:mix(1.15,1.35,ease(u)),roll:-.035};
 if(shot.kind==='rise')view={cx:430,cy:390,z:1.25,roll:mix(-.035,.018,u)};
 if(shot.kind==='release')view={cx:475,cy:395,z:mix(1.45,1.18,ease(u)),roll:-.065*(1-u)};
 if(shot.kind==='chain'){const progress=ease(u);view={cx:mix(550,900,progress),cy:mix(490,340,progress),z:1.35,roll:-.08};}
 if(shot.kind==='alarm')view={cx:1000,cy:240,z:2.1,roll:.04};
 if(shot.kind==='impact')view={cx:1010,cy:330,z:1.55,roll:.07};
 if(shot.kind==='recoil')view={cx:mix(800,920,ease(u)),cy:360,z:1.1,roll:.045*(1-u)};
 if(shot.kind==='settle')view={cx:690,cy:390,z:.95,roll:0};
 const shake=t>=T.C7&&t<T.C7+.25?Math.sin(dt*92)*5*(1-(t-T.C7)/.25):0;view.cx+=shake;view.cy+=shake*.4;
 backdrop(t);
 const chargePower=(.35+.65*ease((t-START)/3))*(1-ease((t-T.RELEASE)/.45));
 particleStage?.update(t,{view,base:[410,625],power:portraitOnly?0:chargePower,start:START,height:2.05,color:'#ffbf5b'});
 if(!portraitOnly){
  for(const pin of rigs[heroKey].pins.slice(0,2)){const p=worldPoint(heroKey,...pin,t);floorShadow(...p,26,5,.48);}
  if(t<T.C7){for(const pin of rigs.enemy_ready.pins){const p=worldPoint('enemy_ready',...pin,t);floorShadow(...p,29,5,.48);}}
  else if(t<T.LAND){const pos=enemyHitPlacement(t);floorShadow(pos.x+113*.34,119+1482*.34,31,5,.25);}
  else{for(const pin of rigs.enemy_land.pins){const p=worldPoint('enemy_land',...pin,t);floorShadow(...p,29,5,.48);}}
  
  particleStage.draw(g,'back');chain(t);
  place(heroKey,placements[heroKey],t,1);
  if(t<T.C7)place('enemy_ready',placements.enemy_ready,t,2);
  else if(t<T.LAND)place('enemy_hit',enemyHitPlacement(t),t,2);
  else place('enemy_land',placements.enemy_land,t,2);
 }else{
  const pos=shot.kind==='eyes'?{x:mix(-1900,-1965,ease(u)),y:mix(-1480,-1530,ease(u)),s:mix(3,3.08,ease(u))}:{x:-135,y:-250,s:.94};
  place('hero_portrait',pos,t,2);
 }
 renderer.render(scene,camera);
 if(celLight)celLight.draw(g,renderer.domElement,{warmPoint:screen(140,480),warmRadius:900*view.z,firePoint:screen(410,460),firePower:chargePower,time:t});
 else g.drawImage(renderer.domElement,0,0);
 if(!portraitOnly){energy(t);particleStage.draw(g,'front');impact(t);}
 if(portraitOnly&&shot.kind==='call'){const grad=g.createLinearGradient(0,720,800,0);grad.addColorStop(0,'rgba(255,168,40,.22)');grad.addColorStop(1,'rgba(255,168,40,0)');g.fillStyle=grad;g.fillRect(0,0,W,H);}
 // Local compositing clock; source sound is never quantized with cel exposures.
 subtitle(t);return{image:canvas.toDataURL('image/png').split(',')[1],state:{t,shield:shieldState(t),shot:shot.id,kind:shot.kind,heroCel:portraitOnly?'hero_portrait':heroKey,enemyCel:t<T.C7?'enemy_ready':t<T.LAND?'enemy_hit':'enemy_land',face,view,motionFrame,motionOffsets:offsets,particles:particleStage?.counts??null,sceneIntegration:integrateCels,sourceCues:{RELEASE:T.RELEASE,C7:T.C7,LAND:T.LAND}}};
}
await document.fonts.ready;window.renderAt=draw;window.ready=true;window.duration=END-START;window.shots=shots;window.__dbg={cells,images,shots,placements,deform,worldPoint,motion,poseEdits,rigs};
if(!new URLSearchParams(location.search).has('capture')){
 const audio=new Audio('./output/stardust_clad_s1e2_palace_r27.mp4'),button=document.createElement('button');let raf=0;button.textContent='播放 11 秒试片';document.body.append(button);draw(START);
 const slider=document.createElement('input'),readout=document.createElement('span');slider.type='range';slider.min=0;slider.max=329;slider.step=1;slider.value=0;slider.style.width='50vw';document.body.append(slider,readout);slider.oninput=()=>{cancelAnimationFrame(raf);audio.pause();const frame=Number(slider.value);draw(START+frame/30);readout.textContent=`第 ${frame} 帧 · 原片 ${(START+frame/30).toFixed(3)} 秒`;};
 button.onclick=async()=>{cancelAnimationFrame(raf);audio.currentTime=START;await audio.play();const tick=()=>{if(audio.currentTime>=END||audio.paused){audio.pause();return;}const t=Math.max(START,audio.currentTime);draw(t);slider.value=Math.floor((t-START)*30);readout.textContent=`第 ${slider.value} 帧`;raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);};
}
