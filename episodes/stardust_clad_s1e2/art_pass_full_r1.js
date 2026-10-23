// Episode direction: the complete 213-second story, with its accepted sound.
// Generic cel acting/portrait drawing and particle compositing live in skills.
import * as THREE from 'three';
import {createCelStage,extractCel,separateCelRegions,clamp,ease} from './assets3d/art_pass_runtime/cel-stage.js';
import {createFacePainter} from './assets3d/art_pass_runtime/face-acting.js';
import {makeLegDeformer,plantedWalk} from './assets3d/art_pass_runtime/limb-rig2d.js';
import {createCelIntegration,drawGroundContact} from './assets3d/art_pass_runtime/cel-integration.js';
import {createParticleStage} from './assets3d/art_pass_runtime/particle-stage.js';
import {combustionAura} from 'dula-assets/lib/craft3d/combustion-particles.js';
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
const canvas=document.createElement('canvas');canvas.id='picture';canvas.width=W;canvas.height=H;document.body.append(canvas);const g=canvas.getContext('2d');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
const cels=createCelStage({THREE,renderer,width:W,height:H}),light=createCelIntegration({width:W,height:H});
const aura=createParticleStage({THREE,renderer,makeAura:combustionAura,width:W,height:H,pixelsPerUnit:200});
const hearth=createParticleStage({THREE,renderer,makeAura:combustionAura,width:W,height:H,pixelsPerUnit:200,radialScale:.34});
const heroFace=createFacePainter(images.hero_portrait,{eyes:[[755,626,1.02,1,false],[974,602,.36,.85,true]],mouth:[857,765,-.10],iris:'#98642f',direction:1,unit:images.hero_portrait.width/1254});
const enemyFace=createFacePainter(images.enemy_portrait,{eyes:[[564,628,.91,.88,false],[417,641,.33,.75,true]],mouth:[479,779,.12],iris:'#458781',direction:-1,unit:images.enemy_portrait.width/1254});
cels.register('hero_face',heroFace.canvas,{dynamic:true,head:[.63,.47,.5,.38],hair:[.42,.18,.58,.23]});
cels.register('enemy_face',enemyFace.canvas,{dynamic:true,head:[.43,.48,.45,.37],hair:[.65,.18,.55,.32]});
const bodyImages={},bodyOriginals={},add=(key,image,rect)=>{const c=extractCel(image,rect);bodyImages[key]=c;const original=document.createElement('canvas');original.width=c.width;original.height=c.height;original.getContext('2d').drawImage(c,0,0);bodyOriginals[key]=original;cels.register(key,c,{dynamic:key.startsWith('hero')});};
['idle','block','recoil','kneel'].forEach((p,i)=>add('hero_'+p,images.hero_poses,[i%2*.5,i<2?0:.55,.5,i<2?.55:.45]));
['idle','windup','strike','recover'].forEach((p,i)=>add('enemy_'+p,images.enemy_poses,i===2?[0,.51,.59,.49]:i===3?[.61,.51,.39,.49]:[i%2*.5,0,.5,.51]));
for(let i=0;i<4;i++)add('walk_'+i,images.walk,[i%2*.5,i<2?0:.5,.5,.5]);
const walkPolygons=[[[348,312],[396,340],[335,432],[317,495],[239,577],[245,607],[134,607],[170,578],[218,535],[258,430],[300,366]],[[379,335],[414,345],[455,400],[498,433],[518,487],[502,528],[497,575],[453,599],[424,597],[446,542],[463,497],[434,457],[393,428],[353,382]]].map(p=>p.map(([x,y])=>[x-134,y-10]));
const walkParts=separateCelRegions(bodyImages.walk_0,walkPolygons);
// Reveal-safe torso plate: legs are independently drawn below the hip, and
// hidden black trouser material is supplied under their painted armor.
{const q=walkParts.base.getContext('2d');q.clearRect(0,walkParts.base.height*.68,walkParts.base.width,walkParts.base.height*.32);q.clearRect(walkParts.base.width*.25,walkParts.base.height*.56,walkParts.base.width*.39,walkParts.base.height*.44);}
cels.register('walk_body',walkParts.base);walkParts.parts.forEach((p,i)=>cels.register('walk_leg'+i,p));
for(const key of ['hero_charge','hero_release','enemy_land','enemy_ready'])add(key,images[key],[0,0,1,1]);
const pilot=document.createElement('iframe');pilot.src='./art_pass_r3.html?capture=1&fx=particles&integrate=1';document.body.append(pilot);
await new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(pilot.contentWindow?.ready){clearInterval(timer);resolve();}else if(Date.now()-started>60000){clearInterval(timer);reject(Error('Accepted counter window not ready'));}},100);});
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
 const z=kind==='street'?1.015+.035*u:1+(view.z-1)*.20,cx=640+(view.cx-640)*.25,cy=360+(view.cy-360)*.20;
 g.fillStyle='#151725';g.fillRect(0,0,W,H);g.save();g.translate(640,360);g.rotate(view.roll*.25);g.scale(z,z);g.translate(-cx,-cy);g.drawImage(im,-65,-38,1410,796);
 if(kind==='gate'&&t>=175){const q=ease((t-175)/1.8);g.translate(-65,-38);g.scale(1410/im.width,796/im.height);g.fillStyle='#17161d';g.fillRect(846,279,530,150);g.drawImage(im,846,279,530,150,846,279-q*70,530,150);}
 g.restore();
 const shade=g.createLinearGradient(0,0,0,720);shade.addColorStop(0,'rgba(15,19,36,.13)');shade.addColorStop(.7,'rgba(15,19,36,0)');shade.addColorStop(1,'rgba(11,13,25,.19)');g.fillStyle=shade;g.fillRect(0,0,W,H);
 if(!['street','gate','tracks'].includes(kind))glow(...screen(110,525),230*view.z,'#d67324',.10+.015*Math.sin(t*4.9));
 if(kind==='street'&&t>=205){
  const windows=[[274,346],[332,392],[460,384],[520,420],[600,424],[698,425],[770,477],[431,489],[961,452],[1138,435],[1187,466],[126,417]];
  windows.forEach(([x,y],i)=>{const on=ease((t-205-i*.24)/.5);if(!on)return;glow(x,y,32,'#ff9f37',on*.24);g.fillStyle=`rgba(255,189,95,${on*.85})`;g.fillRect(x,y,6,11);});
  glow(1170,455,135,'#ff9634',.30*ease((t-208)/1));
 }
}
function footShadows(x,y,height,key){
 g.save();transform();const spread=key.includes('idle')?height*.12:key.includes('walk')?height*.12:key.includes('kneel')?height*.18:height*.27;
 drawGroundContact(g,{x:x-spread,y,radiusX:23,radiusY:5,opacity:.28,cast:[80,-20]});drawGroundContact(g,{x:x+spread,y:y-2,radiusX:25,radiusY:5,opacity:.29,cast:[80,-20]});g.restore();
}
function body(key,x,y,height,t,{lean=0,compress=0,rotation=0,breath=1.4,hair=0,order=1,scaleX=1,reference=0,walk=null}={}){
 const actor=key.startsWith('hero')?'aoao':'yekari',delta=sourceDelta(actor,t,reference),impact=impactStrength(t),wind=key.startsWith('hero')?-.8:1.2;
 const hairAmount=disableHair?0:hair+wind*Math.sin(t*3.1)+impact*(actor==='aoao'?-10:4);
 if(key.startsWith('hero')){const im=bodyImages[key],q=im.getContext('2d');q.clearRect(0,0,im.width,im.height);q.drawImage(bodyOriginals[key],0,0);
  const bounds={hero_idle:[.18,.59,.11,.23],hero_block:[.84,.51,.12,.27],hero_recoil:[.80,.30,.11,.20],hero_kneel:[.83,.72,.10,.20],hero_charge:[.17,.73,.10,.20],hero_release:[.77,.47,.10,.20]}[key];
  if(bounds&&t>=60){q.save();q.globalCompositeOperation='source-atop';q.scale(im.width,im.height);const [cx,cy,rx,ry]=bounds;q.beginPath();q.moveTo(cx-rx,cy+ry);q.lineTo(cx-rx*.5,cy+ry*.55);q.lineTo(cx-rx*.68,cy+ry*.32);q.lineTo(cx-rx*.1,cy-ry*.25);q.strokeStyle='#473729';q.lineWidth=.004;q.stroke();if(t>=103){q.beginPath();q.moveTo(cx+rx*.7,cy+ry);q.lineTo(cx+rx*.25,cy+ry*.35);q.lineTo(cx+rx*.48,cy+ry*.1);q.lineTo(cx,cy-ry*.4);q.lineWidth=.007;q.stroke();}q.restore();}
 }
 let warp=null,feet=null,legWarps=null;
 if(walk){const im=bodyImages[key],width=im.width/im.height*height;feet=plantedWalk({time:walk.time,startX:walk.startX,velocity:walk.velocity,ground:625,cycle:3,lift:18,lead:25});feet[1].y-=5;
  const rig={width,height,legs:[{hip:[.475,.527],knee:[.299,.719],ankle:[.167,.945]},{hip:[.543,.535],knee:[.701,.707],ankle:[.760,.920]}],targets:feet.map(f=>[f.x-x,f.y-y-8])};legWarps=[0,1].map(legIndex=>makeLegDeformer({...rig,legIndex}));
  g.save();transform();for(const f of feet)drawGroundContact(g,{x:f.x,y:f.y,radiusX:19,radiusY:4,opacity:f.contact?.34:.13,cast:[70,-16]});g.restore();
  g.save();transform();for(const deformer of [...legWarps].reverse()){const r=deformer.joints,points=[r.h,r.solved].map(p=>[x+p[0],y+p[1]]);line(points,'#292932',35);line(points,'#35353e',29);}g.restore();
 }
 const placement={x,y,height,view,time:Math.floor(t*15)/15,lean,compress,rotation,breath,hair:hairAmount,headTilt:impact*.06,motion:delta,order,scaleX,warp};
 if(walk){cels.place('walk_body',{...placement,warp:null});cels.place('walk_leg1',{...placement,warp:legWarps[1],order:order+.1});cels.place('walk_leg0',{...placement,warp:legWarps[0],order:order+.2});}else cels.place(key,placement);
 const grip={enemy_idle:[.16,.46],enemy_windup:[.24,.10],enemy_strike:[.06,.245],enemy_recover:[.36,.57],enemy_ready:[.17,.31],walk_0:[.13,.53]}[key];
 const cuff=grip?[x+(grip[0]-.5)*(bodyImages[key].width/bodyImages[key].height*height),y+(grip[1]-1)*height]:null;
 return{key,x,y,height,hair:hairAmount,motion:delta,feet,cuff};
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
 if(energy){line(points,'rgba(171,115,255,.3)',18);line(points,'#c5a8fc',6);line(points,'#eee6ff',2);}
 points.forEach((p,i)=>{const q=points[Math.min(i+1,n)],angle=Math.atan2(q[1]-p[1],q[0]-p[0]);g.save();g.translate(...p);g.rotate(angle);g.beginPath();g.ellipse(0,0,6,i%2?1.8:3.2,0,0,Math.PI*2);g.strokeStyle='#c4b4d2';g.lineWidth=1.7;g.stroke();g.restore();});g.restore();
}
function impactFX(t){for(const cue of hits){const d=t-cue;if(d<0||d>1)continue;const low=[T.C2,T.C4].includes(cue),x=low?470:525,y=low?535:345;g.save();transform();
 if(d<.12){glow(x,y,150,'#fff4e1',.9*(1-d/.12));glow(x,y,30,'#fffdf3',1);}
 for(let i=0;i<38;i++){const a=rand(i+cue)*6.283,r=d*(130+rand(i+25)*420),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r+d*d*70;g.globalAlpha=(1-d)**1.6;line([[px,py],[px+Math.cos(a)*15,py+Math.sin(a)*15]],i%3?'#ffd38a':'#cfb6ff',1+rand(i)*2);}
 g.globalAlpha=(1-d)*.6;g.strokeStyle='#fff1cb';g.lineWidth=3;g.beginPath();g.ellipse(x,y,15+d*180,8+d*90,-.2,0,Math.PI*2);g.stroke();g.restore();}}
function detail(t,shot,u){
 if(shot.kind==='gate'||shot.kind==='tracks'){
  if(shot.emotion==='repair'||shot.emotion==='trap'){glow(700,450,180,'#f5b359',.045+.015*Math.sin(t*8));return;}
  if(t>=60){g.save();g.globalAlpha=.78;line([[120,626],[400,490],[650,398]],'#272235',4);line([[170,664],[447,524],[710,420]],'#151722',4);g.restore();}
  if(t>=T.GATE_OPEN){const q=ease((t-T.GATE_OPEN)/1.8);glow(905,120,180,'#ffc258',q*.35);line([[75,670],[405,525],[810,335]],`rgba(255,193,80,${q*.85})`,8);}
 }
}
function subtitle(t){const active=dialogue.lines.find(l=>{const e=envs.lines.find(x=>x.id===l.id);return e&&t>=e.t0&&t<e.t0+e.dur+.12;});if(!active)return;g.save();g.font='bold 27px Microsoft YaHei';g.textAlign='center';g.lineJoin='round';g.lineWidth=5;g.strokeStyle='#241d25';g.fillStyle=active.speaker==='aoao'?'#ffe4a3':'#d9c3fb';const txt=`${active.speaker==='aoao'?'阿鏊':'夜刈'}：${active.text}`;g.strokeText(txt,640,680);g.fillText(txt,640,680);g.restore();}
function draw(t,{encode=true}={}){
 if(t<0||t>=END)throw Error('Time outside complete episode');const shot=shots.find(s=>t>=s.start&&t<s.end),u=(t-shot.start)/(shot.end-shot.start),kind=shot.kind,emotion=shot.emotion;
 if(kind==='approved_counter'){const r=pilot.contentWindow.renderAt(t);g.drawImage(pilot.contentDocument.querySelector('canvas'),0,0);debug={t,shot:shot.id,kind,route:'approved-draw-over',pilot:r.state};return{image:encode?canvas.toDataURL('image/png').split(',')[1]:null,state:debug};}
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
 background(t,kind,u);cels.begin();let heroKey='hero_idle',enemyKey='enemy_idle',hx=370,ex=980,hh=490,eh=475,faceState=null;
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
 let walking=false,walkPhase=null;
 let walk=null;
 if(t>=20&&t<27){walking=t<26.2;ex=1185-205*clamp((t-20)/6.2);if(walking){walkPhase=Math.floor((t-20)/.75)%4;enemyKey='walk_0';eh=445;walk={time:t-20,startX:1185,velocity:-205/6.2};}}
 if(t>=191&&t<198){walking=true;ex=980+300*(t-191)/6.5;walkPhase=Math.floor((t-191)/.75)%4;enemyKey='walk_0';eh=445;walk={time:t-191,startX:980,velocity:300/6.5};}
 const charge=t>=51&&t<56?ease((t-51)/1.4)*(1-ease((t-55.4)/.6)):t>=138&&t<145?ease((t-138)/1.6)*(1-ease((t-144.2)/.8)):0;
 aura.update(t,{view,base:[ex,625],power:portrait||detailOnly?0:charge*.9,start:t<100?51:138,height:2.1,color:'#a995ff'});
 hearth.update(t,{view,base:[110,500],power:['street','gate','tracks'].includes(kind)?0:.12,start:0,height:.43,color:'#ffb75d'});
 let bodies=[];
 if(!portrait&&!detailOnly){
  footShadows(hx,625,hh,heroKey);if(t>=20&&t<198&&!walking)footShadows(ex,625,eh,enemyKey);
  aura.draw(g,'back');hearth.draw(g,'back');
  bodies.push(body(heroKey,hx,625,hh,t,{compress:impact*6,lean:impact*-6,reference:shot.start,hair:emotion==='counter'?-4:0}));
  if(t>=20&&t<198)bodies.push(body(enemyKey,ex,walking?595:625,eh,t,{reference:shot.start,hair:enemyKey==='enemy_strike'?8:0,lean:walking?-2:0,order:2,walk}));
 }else if(portrait){faceState=face(kind.startsWith('hero')?'aoao':'yekari',t,shot,u);}
 if(!detailOnly){light.draw(g,cels.render(),{warmPoint:portrait?[0,500]:screen(110,500),warmRadius:900,firePoint:screen(ex,420),firePower:0,time:t});}
 if(!portrait&&!detailOnly){
  const cuff=bodies.find(b=>b.cuff)?.cuff??[ex-100,365];
  if(t>=51&&t<65||t>=78&&t<85||t>=98&&t<106||t>=138&&t<153){const near=hits.find(a=>a>=t-.3&&a<t+2),progress=near?ease((t-(near-1.7))/1.7):0;chainBetween(cuff,[mix(cuff[0]-20,525,progress),mix(cuff[1]+95,[60,83].includes(near)?535:345,progress)],t,.95,Math.sin(t*5)*18,progress>.7);}
  if(t>=23&&t<51)chainBetween(cuff,[cuff[0]-30,570],t,.8,8+Math.sin(t*2)*5);
  if(t>=153&&t<163)chainBetween([290,615],cuff,t,1,5);
  aura.draw(g,'front');hearth.draw(g,'front');impactFX(t);
 }
 detail(t,shot,u);
 if(kind==='wrist'&&t>=60){g.save();g.translate(80+Math.sin(t*7)*1.7,-380);g.drawImage(images.shield,0,0,1200,1800);g.restore();}
 // A near pillar hides the final retreat through physical occlusion.
 if(t>=191&&t<198){g.drawImage(images.background,images.background.width*.88,0,images.background.width*.12,images.background.height,1150,-28,175,790);}
 if(kind==='furnace'){hearth.draw(g,'front');glow(640,400,220,'#ef8c2f',.12);}
 if(t<3.8){g.save();g.globalAlpha=ease(t/.7)*(1-ease((t-3)/.8));g.textAlign='center';g.fillStyle='#efe1c6';g.shadowColor='#080c17';g.shadowBlur=8;g.font='bold 42px Microsoft YaHei';g.fillText('星屑战壳',640,280);g.font='25px Microsoft YaHei';g.fillText('焰阶宫 · 盾与暗链',640,330);g.restore();}
 subtitle(t);if(t>=212){g.fillStyle=`rgba(8,10,18,${ease(t-212)})`;g.fillRect(0,0,W,H);}
 debug={t,shot:shot.id,kind,emotion,route:'full-draw-over',face:faceState,bodies,walking,walkPhase,charge,view,motionFrame:Math.round(t*30)};
 return{image:encode?canvas.toDataURL('image/png').split(',')[1]:null,state:debug};
}
await document.fonts.ready;window.renderAt=draw;window.ready=true;window.duration=END;window.shots=shots;
window.__dbg={cels,bodyImages,heroFace,enemyFace,shots,motion,get state(){return debug},set hairDisabled(v){disableHair=v},set faceDisabled(v){disableFace=v},set motionDisabled(v){disableMotion=v}};
if(!new URLSearchParams(location.search).has('capture')){const audio=new Audio('./output/stardust_clad_s1e2_palace_r27.mp4'),button=document.createElement('button'),slider=document.createElement('input');button.textContent='播放整集二维版';slider.type='range';slider.min=0;slider.max=6389;slider.step=1;slider.style.width='65vw';document.body.append(button,slider);let raf=0;draw(0);slider.oninput=()=>{cancelAnimationFrame(raf);audio.pause();audio.currentTime=Number(slider.value)/30;draw(audio.currentTime)};button.onclick=async()=>{await audio.play();const tick=()=>{if(audio.paused||audio.currentTime>=END)return;draw(audio.currentTime,{encode:false});slider.value=Math.floor(audio.currentTime*30);raf=requestAnimationFrame(tick)};tick()};}
