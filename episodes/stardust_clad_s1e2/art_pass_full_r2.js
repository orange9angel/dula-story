// Episode direction: the complete 213-second story, with its accepted sound.
// Generic cel acting/portrait drawing and particle compositing live in skills.
import * as THREE from 'three';
import {createCelStage,extractCel,clamp,ease} from './assets3d/art_pass_runtime/cel-stage.js';
import {createAuthoredFacePainter} from './assets3d/art_pass_runtime/authored-face.js';
import {faces} from './config/face_design_r2.js';
import {chooseWholePose,makeWholePoseWarp} from './assets3d/art_pass_runtime/whole-pose-walk.js';
import {wholeWalk} from './config/walk_cels_r2.js';
import {createCelIntegration,drawGroundContact} from './assets3d/art_pass_runtime/cel-integration.js';
import {createParticleStage} from './assets3d/art_pass_runtime/particle-stage.js';
import {createParticleEffectsStage} from './assets3d/art_pass_runtime/particle-effects-stage.js';
import {prepareFirePlate,furnacePatches,environmentFires,restoreLampBars} from './config/painted_environment_r2.js';
import {combustionAura,particleCloud,combustionBurst,hearthFire} from 'dula-assets/lib/craft3d/combustion-particles.js';
import {drawPropCracks} from './assets3d/art_pass_runtime/prop-damage.js';
import {shieldState,shieldFrames} from './config/prop_state_r2.js';
import {T} from './config/event_times.js';
const W=1280,H=720,FPS=30,END=213;
const mix=(a,b,u)=>a+(b-a)*u,rand=i=>{const n=Math.sin(i*91.37+17.13)*43758.54;return n-Math.floor(n);};
const sec=s=>{const [h,m,v]=s.replace(',','.').split(':').map(Number);return h*3600+m*60+v;};
const [story,envs,dialogue,motion]=await Promise.all([fetch('./art_pass_full_r1.story').then(r=>r.text()),fetch('./config/voice_envs.json').then(r=>r.json()),fetch('./config/dialogue.json').then(r=>r.json()),fetch('./config/art_pass_full_r1_motion.json').then(r=>r.json())]);
const shots=story.trim().split(/\r?\n\s*\r?\n/).map(b=>{const t=b.match(/(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})/);return{id:b.match(/\|id=([^|}]+)/)[1],start:sec(t[1]),end:sec(t[2]),kind:b.match(/\|shot=([^|}]+)/)[1],emotion:b.match(/\|emotion=([^|}]+)/)[1]};});
if(shots[0].start!==0||shots.at(-1).end!==END||shots.some((s,i)=>s.end<=s.start||(i&&s.start!==shots[i-1].end)))throw Error('Full episode timeline has gaps');
if(motion.frames.length!==6391)throw Error('Incomplete full episode motion bake');
const files={hero_poses:'art_pass_full_r1/hero_poses',enemy_poses:'art_pass_full_r1/enemy_poses',walk:'art_pass_full_r1/enemy_walk',enemy_portrait:'art_pass_full_r1/enemy_portrait',street:'art_pass_full_r1/street',gate:'art_pass_full_r1/gate',background:'art_pass_r2/background',hero_portrait:'art_pass_r2/hero_portrait',hero_charge:'art_pass_r2/hero_charge',hero_release:'art_pass_r2/hero_release',enemy_land:'art_pass_r2/enemy_land',enemy_ready:'art_pass_r2/enemy_ready'};
const images=Object.fromEntries(await Promise.all(Object.entries(files).map(async([k,f])=>{const im=new Image();im.src=`./assets3d/${f}.png`;await im.decode();return[k,im]})));
images.shield=new Image();images.shield.src='./assets3d/art_pass_full_r1/shield_detail.png';await images.shield.decode();
for(const name of ['trap_insert','repair_insert']){images[name]=new Image();images[name].src=`./assets3d/art_pass_full_r1/${name}.png`;await images[name].decode();}
const cleanFire=new Image();cleanFire.src='./assets3d/art_pass_full_r2/background_flames_removed.png';await cleanFire.decode();images.background=prepareFirePlate(images.background,cleanFire);const cleanFurnace=new Image();cleanFurnace.src='./assets3d/art_pass_full_r2/gate_flames_removed.png';await cleanFurnace.decode();for(const key of ['gate','trap_insert','repair_insert'])images[key]=prepareFirePlate(images[key],cleanFurnace,furnacePatches);
const canvas=document.createElement('canvas');canvas.id='picture';canvas.width=W;canvas.height=H;document.body.append(canvas);const g=canvas.getContext('2d');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
const cels=createCelStage({THREE,renderer,width:W,height:H}),light=createCelIntegration({width:W,height:H});
const aura=createParticleStage({THREE,renderer,makeAura:combustionAura,width:W,height:H,pixelsPerUnit:200});
const effects=createParticleEffectsStage({THREE,renderer,particleCloud,combustionBurst,hearthFire,width:W,height:H});
const heroFace=createAuthoredFacePainter(images.hero_portrait,faces.aoao);
const enemyFace=createAuthoredFacePainter(images.enemy_portrait,faces.yekari);
cels.register('hero_face',heroFace.canvas,{dynamic:true,head:[.63,.47,.5,.38],hair:[.42,.18,.58,.23]});
cels.register('enemy_face',enemyFace.canvas,{dynamic:true,head:[.43,.48,.45,.37],hair:[.65,.18,.55,.32]});
const bodyImages={},bodyOriginals={},bodyDamage={},damageLevels={},add=(key,image,rect)=>{const c=extractCel(image,rect);bodyImages[key]=c;const original=document.createElement('canvas');original.width=c.width;original.height=c.height;original.getContext('2d').drawImage(c,0,0);bodyOriginals[key]=original;if(shieldFrames[key]){const frame=shieldFrames[key],sourceX=image.width*rect[0],sourceY=image.height*rect[1];const tmp=extractCel(image,rect,false),data=tmp.getContext('2d').getImageData(0,0,tmp.width,tmp.height).data;let tx=tmp.width,ty=tmp.height;for(let y=0;y<tmp.height;y++)for(let x=0;x<tmp.width;x++)if(data[(y*tmp.width+x)*4+3]>32){tx=Math.min(tx,x);ty=Math.min(ty,y);}bodyDamage[key]={...frame,center:[frame.center[0]-sourceX-tx,frame.center[1]-sourceY-ty]};}cels.register(key,c,{dynamic:key.startsWith('hero')});};
['idle','block','recoil','kneel'].forEach((p,i)=>add('hero_'+p,images.hero_poses,[i%2*.5,i<2?0:.55,.5,i<2?.55:.45]));
['idle','windup','strike','recover'].forEach((p,i)=>add('enemy_'+p,images.enemy_poses,i===2?[0,.51,.59,.49]:i===3?[.61,.51,.39,.49]:[i%2*.5,0,.5,.51]));
const walkCandidates={};
for(const [name,spec]of Object.entries(wholeWalk)){const im=new Image();im.src=`./assets3d/art_pass_full_r2/${spec.file}.png`;await im.decode();walkCandidates[name]=spec.times.map((t,i)=>{const key=`walk_${name}_${i}`,cel=extractCel(im,[i%4/4,Math.floor(i/4)/2,.25,.5],false);cels.register(key,cel);const reference=motion.frames[Math.round(t*30)].actors.yekari,leftFirst=reference.world.leftFoot[0]<reference.world.rightFoot[0];return{key,index:i,reference,hip:spec.hips[i],feet:leftFirst?spec.feet[i]:[...spec.feet[i]].reverse()};});}
for(const key of ['hero_charge','hero_release','enemy_land','enemy_ready'])add(key,images[key],[0,0,1,1]);
const pilot=document.createElement('iframe');pilot.src='./art_pass_counter_r4.html?capture=1&fx=particles&integrate=1';document.body.append(pilot);
await new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(pilot.contentWindow?.ready){clearInterval(timer);resolve();}else if(Date.now()-started>60000){clearInterval(timer);reject(Error('Revised counter window not ready'));}},100);});
let view={cx:640,cy:360,z:1,roll:0},debug={},disableHair=false,disableFace=false,disableMotion=false;
const screen=(x,y)=>{const dx=(x-view.cx)*view.z,dy=(y-view.cy)*view.z,c=Math.cos(view.roll),s=Math.sin(view.roll);return[640+dx*c-dy*s,360+dx*s+dy*c]};
function transform(){g.translate(640,360);g.rotate(view.roll);g.scale(view.z,view.z);g.translate(-view.cx,-view.cy);}
function line(points,color,width){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.stroke();}
function glow(x,y,r,color,alpha){g.save();g.globalAlpha=alpha;const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,color);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2);g.restore();}
function sourceDelta(actor,t,reference){const a=motion.frames[Math.max(0,Math.min(6390,Math.round(t*30)))].actors[actor],b=motion.frames[Math.max(0,Math.min(6390,Math.round(reference*30)))].actors[actor];return disableMotion?[0,0]:[Math.max(-4,Math.min(4,((a.world.head[0]-a.root[0])-(b.world.head[0]-b.root[0]))*35)),Math.max(-4,Math.min(4,-((a.world.head[1]-a.root[1])-(b.world.head[1]-b.root[1]))*35))];}
const hits=[T.C1,T.C2,T.C3,T.C4,T.C5,T.C6];
function impactStrength(t){return hits.reduce((v,a)=>v+(t>=a&&t<a+.75?Math.exp(-(t-a)*6)*Math.sin((t-a)*22):0),0);}
function background(t,kind,u){
 const insert=kind==='gate'&&(t<20||t>=151.7&&t<155),im=insert?(t<20?images.repair_insert:images.trap_insert):kind==='street'?images.street:['gate','tracks'].includes(kind)?images.gate:images.background;
 const z=kind==='street'?1.015+.035*u:1+(view.z-1)*.20,cx=Math.max(585,Math.min(700,640+(view.cx-640)*.25)),cy=360+(view.cy-360)*.20;
 g.fillStyle='#151725';g.fillRect(0,0,W,H);g.save();g.translate(640,360);g.rotate(view.roll*.25);g.scale(z,z);g.translate(-cx,-cy);g.drawImage(im,-65,-38,1410,796);
 if(kind==='gate'&&t>=175){const q=ease((t-175)/1.8);g.translate(-65,-38);g.scale(1410/im.width,796/im.height);g.fillStyle='#17161d';g.fillRect(846,279,530,150);g.drawImage(im,846,279,530,150,846,279-q*70,530,150);}
 g.restore();
 if(im!==images.street){const fireMode=im===images.background?'hall':'furnace',bgView={cx,cy,z,roll:view.roll*.25};effects.drawFire(g,t,bgView,environmentFires(im,[-65,-38,1410,796],fireMode));g.save();g.translate(640,360);g.rotate(bgView.roll);g.scale(z,z);g.translate(-cx,-cy);restoreLampBars(g,im,[-65,-38,1410,796],fireMode);g.restore();}
 const shade=g.createLinearGradient(0,0,0,720);shade.addColorStop(0,'rgba(15,19,36,.13)');shade.addColorStop(.7,'rgba(15,19,36,0)');shade.addColorStop(1,'rgba(11,13,25,.19)');g.fillStyle=shade;g.fillRect(0,0,W,H);
 if(!['street','gate','tracks'].includes(kind))glow(...screen(110,525),230*view.z,'#d67324',.10+.015*Math.sin(t*4.9));
 if(kind==='street'&&t>=205){
  const windows=[[274,346],[332,392],[460,384],[520,420],[600,424],[698,425],[770,477],[431,489],[961,452],[1138,435],[1187,466],[126,417]];
  windows.forEach(([x,y],i)=>{const on=ease((t-205-i*.24)/.5);if(!on)return;glow(x,y,32,'#ff9f37',on*.24);g.fillStyle=`rgba(255,189,95,${on*.85})`;g.fillRect(x,y,6,11);});
  glow(1170,455,135,'#ff9634',.30*ease((t-208)/1));if(t>=208)effects.drawFire(g,t,{cx,cy,z,roll:view.roll*.25},[{id:'street-bowl',base:[1254,492],scale:.24,power:ease(t-208)*.6,seed:44}]);
 }
}
function footShadows(x,y,height,key){
 g.save();transform();const spread=key.includes('idle')?height*.12:key.includes('walk')?height*.12:key.includes('kneel')?height*.18:height*.27;
 drawGroundContact(g,{x:x-spread,y,radiusX:23,radiusY:5,opacity:.28,cast:[80,-20]});drawGroundContact(g,{x:x+spread,y:y-2,radiusX:25,radiusY:5,opacity:.29,cast:[80,-20]});g.restore();
}
function body(key,x,y,height,t,{lean=0,compress=0,rotation=0,breath=1.4,hair=0,order=1,scaleX=1,reference=0,walk=null}={}){
 const actor=key.startsWith('hero')?'aoao':'yekari',delta=sourceDelta(actor,t,reference),impact=impactStrength(t),wind=key.startsWith('hero')?-.8:1.2;
 const hairAmount=disableHair?0:hair+wind*Math.sin(t*3.1)+impact*(actor==='aoao'?-10:4);
 const prop=shieldState(t);if(bodyDamage[key]&&damageLevels[key]!==prop.level){const im=bodyImages[key],q=im.getContext('2d');q.clearRect(0,0,im.width,im.height);q.drawImage(bodyOriginals[key],0,0);drawPropCracks(q,bodyDamage[key],prop.level);damageLevels[key]=prop.level;}
 const placement={x,y,height,view,time:Math.floor(t*15)/15,lean,compress,rotation,breath,hair:hairAmount,headTilt:impact*.06,motion:delta,order,scaleX};
 cels.place(key,placement);const feet=null;
 const grip={enemy_idle:[.16,.46],enemy_windup:[.24,.10],enemy_strike:[.06,.245],enemy_recover:[.36,.57],enemy_ready:[.17,.31],walk_0:[.13,.53]}[key];
 const cuff=grip?[x+(grip[0]-.5)*(bodyImages[key].width/bodyImages[key].height*height),y+(grip[1]-1)*height]:null;
 return{key,x,y,height,hair:hairAmount,motion:delta,feet,cuff};
}
function walkBody(t,name,x,ground,sourceTime=t){
 const at=Math.round(sourceTime*30)/30,actor=motion.frames[Math.round(at*30)].actors.yekari,{pose,error}=chooseWholePose(actor,walkCandidates[name]),height=490,scale=height/512,width=384*scale,ppm=230;
 const y=ground+12*scale,px=x+(192-pose.hip[0])*scale;
 const local=p=>[(p[0]-192)*scale,(p[1]-512)*scale];
 const delta=k=>[(actor.world[k][0]-actor.root[0]-pose.reference.world[k][0]+pose.reference.root[0])*ppm,-(actor.world[k][1]-pose.reference.world[k][1])*ppm];
 const keys=['leftFoot','rightFoot','pelvis'];
 const anchors=[...pose.feet,pose.hip].map((p,i)=>{const source=local(p),d=delta(keys[i]);return{source,target:[source[0]+Math.max(-14,Math.min(14,d[0])),source[1]+Math.max(-12,Math.min(12,d[1]))]};});
 const hip=anchors[2];anchors.push({source:[hip.source[0],hip.source[1]-175],target:[hip.target[0],hip.target[1]-175]});
 const feet=anchors.slice(0,2).map((a,i)=>({x:px+a.target[0],y:y+a.target[1],source:actor.world[keys[i]],contact:actor.contact?.[i?'right':'left']}));
 const warp=makeWholePoseWarp({width,height,anchors});
 g.save();transform();for(const f of feet)drawGroundContact(g,{x:f.x,y:ground,radiusX:19,radiusY:4,opacity:.27,cast:[60,-15]});g.restore();
 cels.place(pose.key,{x:px,y,height,view,time:at,breath:0,hair:0,order:2,warp});
 const hand=actor.world.rightHand;return{key:pose.key,wholeCel:true,referencePose:pose.index,sourceTime:at,registrationError:error,feet,cuff:[x+(hand[0]-actor.root[0])*ppm,ground-(hand[1]-.09)*ppm],x,y,height};
}
function face(actor,t,shot,u){
 const isHero=actor==='aoao',paint=isHero?heroFace:enemyFace;
 const speaking=dialogue.lines.find(l=>l.speaker===actor&&envs.lines.some(e=>e.id===l.id&&t>=e.t0&&t<e.t0+e.dur));
 const e=speaking&&envs.lines.find(v=>v.id===speaking.id),jaw=disableFace?0:Math.max(0,e?.jaw[Math.floor((t-e.t0)/e.dt)]??0);
 const b=((t+(isHero?.47:1.82))%4.7),blink=disableFace?0:b<.16?Math.sin(b/.16*Math.PI):0;
 const gaze=disableFace?0:shot.emotion==='wonder'?-.55:shot.emotion==='sad'?-.35:Math.sin(u*Math.PI)*.12;
 const state=paint.paint({jaw,emotion:disableFace?'calm':shot.emotion,blink,gaze});
 const close=shot.kind.endsWith('_close'),ht=close?1090:930,px=isHero?530:760;
 const hair=disableHair?0:(Math.sin(t*3.2)*3+(shot.emotion==='shout'?Math.sin(t*12)*5:0)+impactStrength(t)*13);
 cels.place(isHero?'hero_face':'enemy_face',{x:px,y:close?930:850,height:ht,view:{cx:640,cy:360,z:1,roll:0},time:t,breath:2,lean:mix(-4,5,ease(u)),headTilt:(shot.emotion==='sad'?.06:shot.emotion==='resolve'?-.025:0),hair,compress:shot.emotion==='pain'?5:0,motion:sourceDelta(actor,t,shot.start)});
 return{actor,...state,hair};
}
function chainBetween(a,b,t,amount=1,sag=30,energy=false){
 if(amount<=0)return;g.save();transform();const n=42,points=Array.from({length:n+1},(_,i)=>{const q=i/n;return[mix(a[0],b[0],q),mix(a[1],b[1],q)+Math.sin(Math.PI*q)*sag]});g.globalAlpha=amount;

 points.forEach((p,i)=>{const q=points[Math.min(i+1,n)],angle=Math.atan2(q[1]-p[1],q[0]-p[0]);g.save();g.translate(...p);g.rotate(angle);g.beginPath();g.ellipse(0,0,6,i%2?1.8:3.2,0,0,Math.PI*2);g.strokeStyle='#c4b4d2';g.lineWidth=1.7;g.stroke();g.restore();});g.restore();if(energy)effects.drawStream(g,t,view,{points,progress:1,power:.85,start:51,color:'#c1a0ff'});
}
function impactFX(t){effects.drawBurst(g,t,view,hits.map(cue=>({id:'hit-'+cue,start:cue,point:[T.C2,T.C4].includes(cue)?[470,535]:[525,345],scale:.7})));}
function detail(t,shot,u){
 if(shot.kind==='gate'||shot.kind==='tracks'){
  if(shot.emotion==='repair'||shot.emotion==='trap'){glow(700,450,180,'#f5b359',.045+.015*Math.sin(t*8));return;}
  if(t>=60){g.save();g.globalAlpha=.78;line([[120,626],[400,490],[650,398]],'#272235',4);line([[170,664],[447,524],[710,420]],'#151722',4);g.restore();}
  if(t>=T.GATE_OPEN){const q=ease((t-T.GATE_OPEN)/1.8);glow(905,120,180,'#ffc258',q*.35);effects.drawStream(g,t,view,{points:[[75,670],[405,525],[810,335]],power:q*.4,start:T.GATE_OPEN,color:'#ffd193'});}
 }
}
function subtitle(t){const active=dialogue.lines.find(l=>{const e=envs.lines.find(x=>x.id===l.id);return e&&t>=e.t0&&t<e.t0+e.dur+.12;});if(!active)return;g.save();g.font='bold 27px Microsoft YaHei';g.textAlign='center';g.lineJoin='round';g.lineWidth=5;g.strokeStyle='#241d25';g.fillStyle=active.speaker==='aoao'?'#ffe4a3':'#d9c3fb';const txt=`${active.speaker==='aoao'?'阿鏊':'夜刈'}：${active.text}`;g.strokeText(txt,640,680);g.fillText(txt,640,680);g.restore();}
function draw(t,{encode=true}={}){
 if(t<0||t>=END)throw Error('Time outside complete episode');const shot=shots.find(s=>t>=s.start&&t<s.end),u=(t-shot.start)/(shot.end-shot.start),kind=shot.kind,emotion=shot.emotion;
 if(kind==='approved_counter'){const r=pilot.contentWindow.renderAt(t);g.drawImage(pilot.contentDocument.querySelector('canvas'),0,0);debug={t,shot:shot.id,kind,route:'revised-counter-particles',pilot:r.state};return{image:encode?canvas.toDataURL('image/png').split(',')[1]:null,state:debug};}
 const portrait=kind.includes('face'),detailOnly=['gate','tracks','street','furnace'].includes(kind)||(kind==='wrist'&&t>=60),impact=impactStrength(t);
 view={cx:640,cy:365,z:1.02,roll:0};
 if(['block','recoil'].includes(kind))view={cx:480,cy:390,z:1.32,roll:kind==='recoil'?.025:-.025};
 if(kind==='attack')view={cx:720,cy:370,z:1.08,roll:-.025};
 if(kind==='enemy_charge')view={cx:920,cy:360,z:1.22+.08*ease(u),roll:.025};
 if(kind==='wrist')view={cx:400,cy:395,z:1.75,roll:-.04};
 if(kind==='cuff')view={cx:980,cy:360,z:1.75,roll:.035};
 if(kind==='kneel')view={cx:430,cy:435,z:1.22,roll:0};
 if(kind==='enemy_low')view={cx:985,cy:450,z:1.35,roll:0};
 if(kind==='furnace')view={cx:120,cy:425,z:1.8,roll:0};
 if(kind==='walk')view={cx:t<27?920:930,cy:390,z:1.1,roll:0};
 if(!portrait){view.cx+=impact*4;view.cy+=impact*2;}
 cels.begin();let heroKey='hero_idle',enemyKey='enemy_idle',hx=370,ex=980,hh=490,eh=475,faceState=null;
 const lastHit=hits.filter(a=>a<=t).at(-1),since=lastHit===undefined?99:t-lastHit;
 if(t>=56&&t<65||t>=78&&t<85||t>=98&&t<106||t>=145&&t<153){heroKey='hero_block';hh=450;enemyKey=t<(lastHit??58)+.12?'enemy_strike':'enemy_recover';eh=430;if(since<.60){heroKey='hero_recoil';hh=455;hx-=impact*7;}}
 if(kind==='attack'){enemyKey='enemy_windup';if(u>.45)enemyKey='enemy_strike';eh=430;ex=1010-65*ease(u);heroKey='hero_block';hh=450;}
 if(kind==='enemy_charge'){enemyKey='enemy_windup';eh=430;heroKey='hero_block';hh=450;}
 if(kind==='kneel'||t>=103.4&&t<132||t>=149.4&&t<163){heroKey=t>=158?'hero_charge':'hero_kneel';hh=360;}
 if(kind==='rise'){heroKey=u<.38?'hero_kneel':'hero_idle';hh=u<.38?360:490;}
 if(t>=174){heroKey='hero_release';hh=375;enemyKey='enemy_land';eh=355;}
 if(t>=184){heroKey='hero_idle';hh=490;}
 if(kind==='wrist'){heroKey=t<78?'hero_recoil':t>184?'hero_kneel':'hero_block';hh=450;}
 if(kind==='cuff'){enemyKey=t<27?'enemy_idle':'enemy_ready';eh=475;}
 let walking=false,walkPhase=null,walk=null,walkSourceTime=t;
 if(t>=20&&t<26.2){walking=true;walk='arrival';walkSourceTime=20+(t-20)*.5;const actual=motion.frames[Math.round(walkSourceTime*30)].actors.yekari,finish=motion.frames[693].actors.yekari;ex=980+(actual.root[0]-finish.root[0])*230;}
 if(t>=191&&t<198){if(t<192.85){enemyKey=t<191.7?'enemy_land':'enemy_idle';eh=t<191.7?355:475;}else{walking=true;walk='retreat';walkSourceTime=193+(t-192.85)*.4;const actual=motion.frames[Math.round(walkSourceTime*30)].actors.yekari;ex=980+(actual.root[0]-2.9)*230;}}
 background(t,kind,u);
 const charge=t>=51&&t<56?ease((t-51)/1.4)*(1-ease((t-55.4)/.6)):t>=138&&t<145?ease((t-138)/1.6)*(1-ease((t-144.2)/.8)):0;
 aura.update(t,{view,base:[ex,625],power:portrait||detailOnly?0:charge*.9,start:t<100?51:138,height:2.1,color:'#a995ff'});
 let bodies=[];
 if(!portrait&&!detailOnly){
  footShadows(hx,625,hh,heroKey);if(t>=20&&t<198&&!walking)footShadows(ex,625,eh,enemyKey);
  aura.draw(g,'back');
  bodies.push(body(heroKey,hx,625,hh,t,{compress:impact*6,lean:impact*-6,reference:shot.start,hair:emotion==='counter'?-4:0}));
  if(t>=20&&t<198)bodies.push(walking?walkBody(t,walk,ex,625,walkSourceTime):body(enemyKey,ex,625,eh,t,{reference:shot.start,hair:enemyKey==='enemy_strike'?8:0,order:2}));
 }else if(portrait){faceState=face(kind.startsWith('hero')?'aoao':'yekari',t,shot,u);}
 if(!detailOnly){light.draw(g,cels.render(),{warmPoint:portrait?[0,500]:screen(110,500),warmRadius:900,firePoint:screen(ex,420),firePower:0,time:t});}
 if(!portrait&&!detailOnly){
  const cuff=bodies.find(b=>b.cuff)?.cuff??[ex-100,365];
  if(t>=51&&t<65||t>=78&&t<85||t>=98&&t<106||t>=138&&t<153){const near=hits.find(a=>a>=t-.3&&a<t+2),progress=near?ease((t-(near-1.7))/1.7):0;chainBetween(cuff,[mix(cuff[0]-20,525,progress),mix(cuff[1]+95,[60,83].includes(near)?535:345,progress)],t,.95,Math.sin(t*5)*18,progress>.7);}
  if(t>=23&&t<51)chainBetween(cuff,[cuff[0]-30,570],t,.8,8+Math.sin(t*2)*5);
  if(t>=153&&t<163)chainBetween([290,615],cuff,t,1,5);
  aura.draw(g,'front');impactFX(t);
 }
 detail(t,shot,u);
 if(kind==='wrist'&&t>=60){g.save();g.translate(80+Math.sin(t*7)*1.7,-380);g.drawImage(images.shield,0,0,1200,1800);g.restore();}
 // A near pillar hides the final retreat through physical occlusion.
 if(t>=191&&t<198){g.drawImage(images.background,images.background.width*.88,0,images.background.width*.12,images.background.height,1150,-28,175,790);}
 if(kind==='furnace'){glow(640,400,220,'#ef8c2f',.12);}
 if(t<3.8){g.save();g.globalAlpha=ease(t/.7)*(1-ease((t-3)/.8));g.textAlign='center';g.fillStyle='#efe1c6';g.shadowColor='#080c17';g.shadowBlur=8;g.font='bold 42px Microsoft YaHei';g.fillText('星屑战壳',640,280);g.font='25px Microsoft YaHei';g.fillText('焰阶宫 · 盾与暗链',640,330);g.restore();}
 subtitle(t);if(t>=212){g.fillStyle=`rgba(8,10,18,${ease(t-212)})`;g.fillRect(0,0,W,H);}
 debug={t,shot:shot.id,kind,emotion,shield:shieldState(t),route:'full-draw-over',face:faceState,bodies,walking,walkPhase,charge,view,motionFrame:Math.round(t*30)};
 return{image:encode?canvas.toDataURL('image/png').split(',')[1]:null,state:debug};
}
await document.fonts.ready;window.renderAt=draw;window.ready=true;window.duration=END;window.shots=shots;
window.__dbg={cels,bodyImages,heroFace,enemyFace,shots,motion,get state(){return debug},set hairDisabled(v){disableHair=v},set faceDisabled(v){disableFace=v},set motionDisabled(v){disableMotion=v}};
if(!new URLSearchParams(location.search).has('capture')){const audio=new Audio('./output/stardust_clad_s1e2_palace_r27.mp4'),button=document.createElement('button'),slider=document.createElement('input');button.textContent='播放整集二维版';slider.type='range';slider.min=0;slider.max=6389;slider.step=1;slider.style.width='65vw';document.body.append(button,slider);let raf=0;draw(0);slider.oninput=()=>{cancelAnimationFrame(raf);audio.pause();audio.currentTime=Number(slider.value)/30;draw(audio.currentTime)};button.onclick=async()=>{await audio.play();const tick=()=>{if(audio.paused||audio.currentTime>=END)return;draw(audio.currentTime,{encode:false});slider.value=Math.floor(audio.currentTime*30);raf=requestAnimationFrame(tick)};tick()};}
