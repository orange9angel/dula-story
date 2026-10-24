// Episode direction: the complete 213-second story, with its accepted sound.
// Generic cel acting/portrait drawing and particle compositing live in skills.
import * as THREE from 'three';
import {createCelStage,extractCel,clamp,ease} from './assets3d/art_pass_runtime/cel-stage.js';
import {createRasterFacePainter} from './assets3d/art_pass_runtime/raster-face.js';
import {portraitsR5} from './config/portraits_r5.js';
import {createStoryState} from './assets3d/art_pass_runtime/story-state.js';
import {slotPoint,makeInsertProp,drawFloorChannel,drawInsertMechanism,routeFires} from './config/continuity_r4_stage.js';
import {createBakedCelClip} from './assets3d/art_pass_runtime/baked-cel-clip.js';
import {createCelIntegration,drawGroundContact} from './assets3d/art_pass_runtime/cel-integration.js';
import {createParticleStage} from './assets3d/art_pass_runtime/particle-stage.js';
import {createParticleEffectsStage} from './assets3d/art_pass_runtime/particle-effects-stage.js';
import {prepareFirePlate,furnacePatches,environmentFires,restoreLampBars} from './config/painted_environment_r2.js';
import {combustionAura,particleCloud,combustionBurst,hearthFire} from 'dula-assets/lib/craft3d/combustion-particles.js';
import {drawPropCracks,drawArmorDamage} from './assets3d/art_pass_runtime/prop-damage.js';
import {shieldState,shieldFrames} from './config/prop_state_r2.js';
import {T} from './config/event_times.js';
import {forearmFrames,exitTravel,exitHipX} from './config/continuity_r5_art.js';
const W=1280,H=720,FPS=30,END=213;
const mix=(a,b,u)=>a+(b-a)*u,rand=i=>{const n=Math.sin(i*91.37+17.13)*43758.54;return n-Math.floor(n);};
const sec=s=>{const [h,m,v]=s.replace(',','.').split(':').map(Number);return h*3600+m*60+v;};
const [story,envs,dialogue,motion]=await Promise.all([fetch('./art_pass_full_r5.story').then(r=>r.text()),fetch('./config/voice_envs.json').then(r=>r.json()),fetch('./config/dialogue.json').then(r=>r.json()),fetch('./config/art_pass_full_r1_motion.json').then(r=>r.json())]);
const shots=story.trim().split(/\r?\n\s*\r?\n/).map(b=>{const t=b.match(/(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})/);return{id:b.match(/\|id=([^|}]+)/)[1],start:sec(t[1]),end:sec(t[2]),kind:b.match(/\|shot=([^|}]+)/)[1],emotion:b.match(/\|emotion=([^|}]+)/)[1]};});
if(shots[0].start!==0||shots.at(-1).end!==END||shots.some((s,i)=>s.end<=s.start||(i&&s.start!==shots[i-1].end)))throw Error('Full episode timeline has gaps');
if(motion.frames.length!==6391)throw Error('Incomplete full episode motion bake');
const files={hero_poses:'art_pass_full_r1/hero_poses',enemy_poses:'art_pass_full_r1/enemy_poses',walk:'art_pass_full_r1/enemy_walk',enemy_portrait:'art_pass_full_r1/enemy_portrait',street:'art_pass_full_r1/street',gate:'art_pass_full_r1/gate',background:'art_pass_r2/background',hero_portrait:'art_pass_r2/hero_portrait',hero_charge:'art_pass_r2/hero_charge',hero_release:'art_pass_r2/hero_release',enemy_land:'continuity_r5/enemy_land',enemy_ready:'art_pass_r2/enemy_ready'};
const director=createStoryState({cues:T,...await fetch('./config/continuity_r5.json').then(r=>r.json())});
let continuity=director.at(0),mechanism=null;
const images=Object.fromEntries(await Promise.all(Object.entries(files).map(async([k,f])=>{const im=new Image();im.src=`./assets3d/${f}.png`;await im.decode();return[k,im]})));
for(const [key,path] of Object.entries({forearm_scar:'continuity_r5/forearm_scar',enemy_rise:'continuity_r5/enemy_rise',hero_lift_0:'continuity_r5/hero_lift_0',hero_lift_1:'continuity_r5/hero_lift_1',hero_lift_2:'continuity_r5/hero_lift_2',hero_pain:'continuity_r4/hero_pain',exit_atlas:'continuity_r4/exit_atlas_corrected',exit_passing:'continuity_r4/exit_passing',enemy_hit:'art_pass_r2/enemy_hit'})){const im=new Image();im.src='./assets3d/'+path+'.png';await im.decode();images[key]=im;}
images.shield=new Image();images.shield.src='./assets3d/art_pass_full_r1/shield_detail.png';await images.shield.decode();
for(const name of ['trap_insert','repair_insert']){images[name]=new Image();images[name].src=`./assets3d/art_pass_full_r1/${name}.png`;await images[name].decode();}
const cleanFire=new Image();cleanFire.src='./assets3d/art_pass_full_r2/background_flames_removed.png';await cleanFire.decode();images.background=prepareFirePlate(images.background,cleanFire);const cleanFurnace=new Image();cleanFurnace.src='./assets3d/art_pass_full_r2/gate_flames_removed.png';await cleanFurnace.decode();for(const key of ['gate','trap_insert','repair_insert'])images[key]=prepareFirePlate(images[key],cleanFurnace,furnacePatches);
const insertProps={repair:makeInsertProp(images.repair_insert),trap:makeInsertProp(images.trap_insert)};
const canvas=document.createElement('canvas');canvas.id='picture';canvas.width=W;canvas.height=H;document.body.append(canvas);const g=canvas.getContext('2d');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
const cels=createCelStage({THREE,renderer,width:W,height:H}),light=createCelIntegration({width:W,height:H});
const aura=createParticleStage({THREE,renderer,makeAura:combustionAura,width:W,height:H,pixelsPerUnit:200});
const effects=createParticleEffectsStage({THREE,renderer,particleCloud,combustionBurst,hearthFire,width:W,height:H});
const heroFace=await createRasterFacePainter(portraitsR5.aoao);
const enemyFace=await createRasterFacePainter(portraitsR5.yekari);
cels.register('hero_face',heroFace.canvas,{dynamic:true,head:[.63,.47,.5,.38],hair:[.42,.18,.58,.23]});
cels.register('enemy_face',enemyFace.canvas,{dynamic:true,head:[.43,.48,.45,.37],hair:[.65,.18,.55,.32]});
const bodyImages={},bodyOriginals={},bodyPain={},bodyDamage={},armDamage={},damageLevels={},add=(key,image,rect)=>{const c=extractCel(image,rect);bodyImages[key]=c;const original=document.createElement('canvas');original.width=c.width;original.height=c.height;original.getContext('2d').drawImage(c,0,0);bodyOriginals[key]=original;if(shieldFrames[key]){const frame=shieldFrames[key],sourceX=image.width*rect[0],sourceY=image.height*rect[1];const tmp=extractCel(image,rect,false),data=tmp.getContext('2d').getImageData(0,0,tmp.width,tmp.height).data;let tx=tmp.width,ty=tmp.height;for(let y=0;y<tmp.height;y++)for(let x=0;x<tmp.width;x++)if(data[(y*tmp.width+x)*4+3]>32){tx=Math.min(tx,x);ty=Math.min(ty,y);}bodyDamage[key]={...frame,center:[frame.center[0]-sourceX-tx,frame.center[1]-sourceY-ty]};const arm=forearmFrames[key];if(arm?.visibility==='visible'){const local=p=>[p[0]-sourceX-tx,p[1]-sourceY-ty];armDamage[key]={...arm,center:local(arm.center),clip:arm.clip.map(local)};}}cels.register(key,c,{dynamic:key.startsWith('hero')});};
['idle','block','recoil','kneel'].forEach((p,i)=>{const rect=[i%2*.5,i<2?0:.55,.5,i<2?.55:.45];add('hero_'+p,images.hero_poses,rect);bodyPain['hero_'+p]=extractCel(images.hero_pain,rect);});
['idle','windup','strike','recover'].forEach((p,i)=>add('enemy_'+p,images.enemy_poses,i===2?[0,.51,.59,.49]:i===3?[.61,.51,.39,.49]:[i%2*.5,0,.5,.51]));
const walkSpec=await fetch('./config/walk_baked_r7.json').then(r=>r.json());
const bakedWalk=await createBakedCelClip({stage:cels,spec:walkSpec});
for(const key of ['hero_charge','hero_release','enemy_land','enemy_ready','enemy_hit','enemy_rise'])add(key,images[key],[0,0,1,1]);
const exitFrames=[];for(let i=0;i<12;i++){const im=new Image();im.src=`./assets3d/continuity_r5/exit_${i}.png`;await im.decode();exitFrames.push(im);}
for(let i=0;i<3;i++)cels.register('hero_lift_'+i,images['hero_lift_'+i]);
const exitCanvas=document.createElement('canvas');exitCanvas.width=314;exitCanvas.height=418;const exitG=exitCanvas.getContext('2d');cels.register('exit_cel',exitCanvas,{dynamic:true});
let view={cx:640,cy:360,z:1,roll:0},debug={},disableHair=false,disableFace=false,disableMotion=false;
const screen=(x,y)=>{const dx=(x-view.cx)*view.z,dy=(y-view.cy)*view.z,c=Math.cos(view.roll),s=Math.sin(view.roll);return[640+dx*c-dy*s,360+dx*s+dy*c]};
function transform(){g.translate(640,360);g.rotate(view.roll);g.scale(view.z,view.z);g.translate(-view.cx,-view.cy);}
function line(points,color,width){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.stroke();}
function glow(x,y,r,color,alpha){g.save();g.globalAlpha=alpha;const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,color);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2);g.restore();}
function sourceDelta(actor,t,reference){const a=motion.frames[Math.max(0,Math.min(6390,Math.round(t*30)))].actors[actor],b=motion.frames[Math.max(0,Math.min(6390,Math.round(reference*30)))].actors[actor];return disableMotion?[0,0]:[Math.max(-4,Math.min(4,((a.world.head[0]-a.root[0])-(b.world.head[0]-b.root[0]))*35)),Math.max(-4,Math.min(4,-((a.world.head[1]-a.root[1])-(b.world.head[1]-b.root[1]))*35))];}
const hits=[T.C1,T.C2,T.C3,T.C4,T.C5,T.C6];
function impactStrength(t){return hits.reduce((v,a)=>v+(t>=a&&t<a+.75?Math.exp(-(t-a)*6)*Math.sin((t-a)*22):0),0);}
function background(t,kind,u){
 const insert=kind==='gate'&&(t<20||['trap','untrap'].includes(currentEmotion)),im=kind==='street'?images.street:['gate','tracks'].includes(kind)?images.gate:images.background;
 const z=kind==='street'?1.015+.035*u:1+(view.z-1)*.20,cx=Math.max(585,Math.min(700,640+(view.cx-640)*.25)),cy=360+(view.cy-360)*.20;
 g.fillStyle='#151725';g.fillRect(0,0,W,H);g.save();g.translate(640,360);g.rotate(view.roll*.25);g.scale(z,z);g.translate(-cx,-cy);g.drawImage(im,-65,-38,1410,796);
 if(kind==='gate'&&t>=175){const q=ease((t-175)/1.8);g.translate(-65,-38);g.scale(1410/im.width,796/im.height);g.fillStyle='#17161d';g.fillRect(846,283,399,130);g.drawImage(im,846,283,399,130,846,283-q*70,399,130);}
 g.restore();
 if(im!==images.street){const fireMode=im===images.background?'hall':'furnace',bgView={cx,cy,z,roll:view.roll*.25};effects.drawFire(g,t,bgView,environmentFires(im,[-65,-38,1410,796],fireMode));g.save();g.translate(640,360);g.rotate(bgView.roll);g.scale(z,z);g.translate(-cx,-cy);restoreLampBars(g,im,[-65,-38,1410,796],fireMode);g.restore();}
 if(im===images.gate){const bgView={cx,cy,z,roll:view.roll*.25},rect=[-65,-38,1410,796];if(insert)mechanism=drawInsertMechanism(g,{t,state:continuity,T,gate:im,prop:t<20?insertProps.repair:insertProps.trap,effects,bgView,rect,damaged:t>=20});else {const points=[[1110,449],[850,555],[500,700],[0,875]].map(p=>[rect[0]+p[0]/1672*rect[2],rect[1]+p[1]/941*rect[3]]);effects.drawStream(g,t,bgView,{points,power:continuity.firePower,start:0,color:'#ff9c2e',flow:true,seed:63});routeFires(effects,g,t,bgView,points,continuity.firePower,'gate-channel-');}}
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
 const prop=shieldState(t);if(bodyDamage[key]){const im=bodyImages[key],q=im.getContext('2d');q.clearRect(0,0,im.width,im.height);q.drawImage(bodyOriginals[key],0,0);if(bodyPain[key]&&continuity.heroStrain>0){q.globalAlpha=continuity.heroStrain;q.drawImage(bodyPain[key],0,0);q.globalAlpha=1;}drawPropCracks(q,bodyDamage[key],prop.level);if(armDamage[key])drawArmorDamage(q,{...armDamage[key],texture:images.forearm_scar},continuity.forearmDamage);damageLevels[key]=prop.level;}
 const placement={rigid:true,x,y,height,view,time:Math.floor(t*15)/15,lean,compress,rotation,breath,hair:hairAmount,headTilt:impact*.06,motion:delta,order,scaleX};
 cels.place(key,placement);const feet=null;
 const grip={enemy_idle:[.16,.46],enemy_windup:[.24,.10],enemy_strike:[.06,.245],enemy_recover:[.36,.57],enemy_ready:[.17,.31],walk_0:[.13,.53]}[key];
 const cuff=grip?[x+(grip[0]-.5)*(bodyImages[key].width/bodyImages[key].height*height),y+(grip[1]-1)*height]:null;
 return{key,x,y,height,hair:0,motion:[0,0],rigid:true,forearm:{level:continuity.forearmDamage,...forearmFrames[key]},feet,cuff};
}
function walkBody(t,name,x,ground,distance){
 const height=670,scale=height/768;
 const state=bakedWalk.place({distance:distance/scale,direction:name==='retreat'?-1:1,x,y:ground,height,view,phaseOffset:name==='retreat'?10/33:1/33,order:2});
 g.save();transform();for(const f of state.feet){const lift=Math.max(0,ground-f.y);drawGroundContact(g,{x:f.x,y:ground,radiusX:18-lift*.05,radiusY:4,opacity:.28*Math.exp(-lift/26),cast:[60,-15]});}g.restore();
 return{...state,source:'accepted-r7',sourceTime:t,retreatMode:name==='retreat'?'backward-step':'forward'};
}
function exitBody(t,x,ground,distance){
 const turning=t<T.TURN_END,turnU=clamp((t-T.TURN_START)/(T.TURN_END-T.TURN_START));
 const index=turning?Math.min(3,Math.floor(turnU*4)):distance<1?3:4+Math.floor(distance/230*8)%8;
 exitG.clearRect(0,0,314,418);exitG.drawImage(exitFrames[index],168-exitHipX[index],0,314,418);
 const height=528,scale=height/418,anchor=[168,402];cels.place('exit_cel',{x:x+(157-anchor[0])*scale,y:ground+(418-anchor[1])*scale,height,view,order:2,time:0,rigid:true});
 g.save();transform();drawGroundContact(g,{x,y:ground,radiusX:26,radiusY:5,opacity:.25,cast:[60,-15]});g.restore();
 return{key:'exit_cel',cameraScale:view.z,rigid:true,index,wholeCel:true,direction:1,facing:turning?'turning-away':'right-rear',heading:turning?turnU*Math.PI:Math.PI,x,y:ground,height,distance,feet:[],cuff:[x-10,ground-200]};
}
function face(actor,t,shot,u){
 const isHero=actor==='aoao',paint=isHero?heroFace:enemyFace;
 const speaking=dialogue.lines.find(l=>l.speaker===actor&&envs.lines.some(e=>e.id===l.id&&t>=e.t0&&t<e.t0+e.dur));
 const e=speaking&&envs.lines.find(v=>v.id===speaking.id),jaw=disableFace?0:Math.max(0,e?.jaw[Math.floor((t-e.t0)/e.dt)]??0);
 const b=((t+(isHero?.47:1.82))%4.7),blink=disableFace?0:b<.16?Math.sin(b/.16*Math.PI):0;
 const gaze=disableFace?0:shot.emotion==='wonder'?-.55:shot.emotion==='sad'?-.35:Math.sin(u*Math.PI)*.12;
 const state=paint.paint({jaw,emotion:disableFace?'calm':shot.emotion,blink,gaze,strain:disableFace?0:continuity[isHero?'heroStrain':'enemyStrain']});
 const close=shot.kind.endsWith('_close')||shot.kind==='counter_eyes',ht=close?1090:930,px=isHero?530:760;
 const hair=0;const settle=disableMotion?0:ease(u/.38),nod=shot.emotion==='pain'?3:shot.emotion==='resolve'?-2:1;
 cels.place(isHero?'hero_face':'enemy_face',{rigid:true,x:px+settle*.8,y:(close?930:850)+settle*nod,rotation:settle*(shot.emotion==='pain'?.0015:-.0008),height:ht,view:{cx:640,cy:360,z:1,roll:0},time:t,breath:2,lean:mix(-4,5,ease(u)),headTilt:(shot.emotion==='sad'?.06:shot.emotion==='resolve'?-.025:0),hair,compress:shot.emotion==='pain'?5:0,motion:sourceDelta(actor,t,shot.start)});
 return{actor,...state,hair,rigid:true,settle,nod,intent:isHero?shot.emotion:continuity.enemyIntent};
}
function chainBetween(a,b,t,amount=1,sag=30,energy=false){
 if(amount<=0)return;g.save();transform();const n=42,points=Array.from({length:n+1},(_,i)=>{const q=i/n;return[mix(a[0],b[0],q),mix(a[1],b[1],q)+Math.sin(Math.PI*q)*sag]});g.globalAlpha=amount;

 points.forEach((p,i)=>{const q=points[Math.min(i+1,n)],angle=Math.atan2(q[1]-p[1],q[0]-p[0]);g.save();g.translate(...p);g.rotate(angle);g.beginPath();g.ellipse(0,0,6,i%2?1.8:3.2,0,0,Math.PI*2);g.strokeStyle='#c4b4d2';g.lineWidth=1.7;g.stroke();g.restore();});g.restore();if(energy)effects.drawStream(g,t,view,{points,progress:1,power:.85,start:51,color:'#c1a0ff'});
}
function impactFX(t){effects.drawBurst(g,t,view,hits.map(cue=>({id:'hit-'+cue,start:cue,point:[T.C2,T.C4].includes(cue)?[470,535]:[525,345],scale:.7})));}
function detail(t,shot,u){
 if(shot.kind==='gate'||shot.kind==='tracks'){
  if(['repair','trap','untrap'].includes(shot.emotion))return;
  if(t>=60){g.save();g.globalAlpha=.78;line([[120,626],[400,490],[650,398]],'#272235',4);line([[170,664],[447,524],[710,420]],'#151722',4);g.restore();}
  if(t>=T.GATE_OPEN){const q=ease((t-T.GATE_OPEN)/1.8);glow(905,120,180,'#ffc258',q*.35);}
 }
}
function subtitle(t){const active=dialogue.lines.find(l=>{const e=envs.lines.find(x=>x.id===l.id);return e&&t>=e.t0&&t<e.t0+e.dur+.12;});if(!active)return;g.save();g.font='bold 27px Microsoft YaHei';g.textAlign='center';g.lineJoin='round';g.lineWidth=5;g.strokeStyle='#241d25';g.fillStyle=active.speaker==='aoao'?'#ffe4a3':'#d9c3fb';const txt=`${active.speaker==='aoao'?'阿鏊':'夜刈'}：${active.text}`;g.strokeText(txt,640,680);g.fillText(txt,640,680);g.restore();}
let currentEmotion='';
function draw(t,{encode=true}={}){
 if(t<0||t>=END)throw Error('Time outside complete episode');const shot=shots.find(s=>t>=s.start&&t<s.end),u=(t-shot.start)/(shot.end-shot.start),originalKind=shot.kind,emotion=shot.emotion;continuity=director.at(t);mechanism=null;currentEmotion=emotion;
 const counter=originalKind.startsWith('counter_'),ck=originalKind.replace('counter_','');
 const kind=counter?({eyes:'hero_face_close',call:'hero_face',cuff:'enemy_charge',shield:'kneel',coil:'kneel',rise:'kneel',release:'kneel',chain:'wide',alarm:'enemy_charge',impact:'enemy_low',recoil:'wide',settle:'wide'}[ck]):originalKind;
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
 if(counter){if(ck==='cuff')view={cx:870,cy:355,z:1.8,roll:.025};if(ck==='shield')view={cx:slotPoint[0],cy:515,z:1.65,roll:-.03};if(ck==='coil')view={cx:440,cy:450-45*u,z:1.25,roll:-.02};if(ck==='rise'||ck==='release')view={cx:470,cy:430,z:1.3,roll:-.025};if(ck==='chain')view={cx:mix(540,940,u),cy:mix(510,355,u),z:1.3,roll:-.04};if(ck==='alarm'||ck==='impact')view={cx:990,cy:355,z:1.5,roll:.03};}
 if(t>=191&&t<198)view={cx:930,cy:390,z:1.1,roll:0};
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
 if(t>=T.TRAP&&t<T.SHIELD_FREE){heroKey='hero_kneel';hh=360;hx=370;enemyKey=t<T.C7?'enemy_ready':t<T.LAND?'enemy_hit':'enemy_land';eh=t<T.C7?475:t<T.LAND?480:355;}
 if(t>=T.SHIELD_FREE){heroKey='hero_idle';hh=490;}
 if(kind==='wrist'){heroKey=t<78?'hero_recoil':t>184?'hero_kneel':'hero_block';hh=450;}
 if(kind==='cuff'){enemyKey=t<27?'enemy_idle':'enemy_ready';eh=475;}
 let walking=false,walkPhase=null,walk=null,walkSourceTime=0;
 if(t>=20&&t<27){
  const d=t<22.8?365*Math.max(0,(t-20)/2.8):t<24.4?365:365+135*ease((t-24.4)/1.5);
  ex=1480-d;walking=true;walk='arrival';walkSourceTime=d;
 }
 if(t>=191&&t<198){
  if(t<T.TURN_START){enemyKey=t<191.3?'enemy_land':'enemy_rise';eh=t<191.3?355:430;}
  else{walking=true;walk='exit';walkSourceTime=exitTravel(t,T.TURN_END);ex=980+walkSourceTime;}
 }
 background(t,kind,u);
 if(!portrait&&!detailOnly)drawFloorChannel(g,{t,state:continuity,view,effects,transform});
 const charge=t>=T.TRAP&&t<T.RELEASE?.65*ease((t-158)/5):t>=51&&t<56?ease((t-51)/1.4)*(1-ease((t-55.4)/.6)):t>=138&&t<145?ease((t-138)/1.6)*(1-ease((t-144.2)/.8)):0;
 aura.update(t,{view,base:t>=T.TRAP&&t<T.RELEASE?[450,625]:[ex,625],power:portrait||detailOnly?0:charge*.9,start:t<100?51:t<T.TRAP?138:158,height:2.1,color:t>=T.TRAP?'#ffbf5b':'#a995ff'});
 let bodies=[];
 if(!portrait&&!detailOnly){
  footShadows(hx,625,hh,heroKey);if(t>=20&&t<198&&!walking)footShadows(ex,625,eh,enemyKey);
  aura.draw(g,'back');
  if(kind==='rise'){const i=t<135.8?0:t<136.5?1:2;const height=439,anchor=[340,605],scale=height/627;cels.place('hero_lift_'+i,{rigid:true,x:hx+(313.5-anchor[0])*scale,y:625+(627-anchor[1])*scale,height,view});bodies.push({key:'hero_lift_'+i,x:hx,y:625,height,forearm:{level:1,visibility:'visible',source:'reviewed baked seam'},shieldSupport:i===0?'ground':'lifting'});}
  else bodies.push(body(heroKey,hx,625,hh,t,{compress:impact*6,lean:impact*-6,reference:shot.start,hair:emotion==='counter'?-4:0}));
  if(t>=20&&t<198)bodies.push(walking?(walk==='exit'?exitBody(t,ex,625,walkSourceTime):walkBody(t,walk,ex,625,walkSourceTime)):body(enemyKey,ex,625,eh,t,{reference:shot.start,hair:enemyKey==='enemy_strike'?8:0,order:2}));
 }else if(portrait){faceState=face(kind.startsWith('hero')?'aoao':'yekari',t,shot,u);}
 if(!detailOnly){light.draw(g,cels.render(),{warmPoint:portrait?[0,500]:screen(110,500),warmRadius:900,firePoint:screen(ex,420),firePower:0,time:t});}
 if(!portrait&&!detailOnly){
  const cuff=bodies.find(b=>b.cuff)?.cuff??[ex-100,365];
  if(t>=51&&t<65||t>=78&&t<85||t>=98&&t<106||t>=138&&t<153){const near=hits.find(a=>a>=t-.3&&a<t+2),progress=near?ease((t-(near-1.7))/1.7):0;chainBetween(cuff,[mix(cuff[0]-20,525,progress),mix(cuff[1]+95,[60,83].includes(near)?535:345,progress)],t,.95,Math.sin(t*5)*18,progress>.7);}
  if(t>=23&&t<51)chainBetween(cuff,[cuff[0]-30,570],t,.8,8+Math.sin(t*2)*5);
  if(continuity.chainMode==='locked'){chainBetween(slotPoint,cuff,t,1,5);if(t>=T.RELEASE)effects.drawStream(g,t,view,{points:[slotPoint,cuff],progress:ease((t-T.RELEASE)/(T.C7-T.RELEASE)),power:1,start:T.RELEASE,flow:true,color:'#ffc45b'});}
  if(t>=T.C7&&t<T.LAND+.6)effects.drawBurst(g,t,view,[{id:'counter-r4',start:T.C7,point:[980,365],scale:1.0},{id:'land-r4',start:T.LAND,point:[980,625],scale:.4,color:'#b7a08a'}]);
  aura.draw(g,'front');impactFX(t);
 }
 if(!portrait&&!detailOnly)drawFloorChannel(g,{t,state:continuity,view,effects,transform,front:true});
 detail(t,shot,u);
 if(kind==='wrist'&&t>=60){g.save();g.translate(80,-380);g.drawImage(images.shield,0,0,1200,1800);g.restore();}
 // A near pillar hides the final retreat through physical occlusion.
 if(t>=191&&t<198){g.drawImage(images.background,images.background.width*.88,0,images.background.width*.12,images.background.height,1150,-28,175,790);}
 if(kind==='furnace'){glow(640,400,220,'#ef8c2f',.12);}
 if(t<3.8){g.save();g.globalAlpha=ease(t/.7)*(1-ease((t-3)/.8));g.textAlign='center';g.fillStyle='#efe1c6';g.shadowColor='#080c17';g.shadowBlur=8;g.font='bold 42px Microsoft YaHei';g.fillText('星屑战壳',640,280);g.font='25px Microsoft YaHei';g.fillText('焰阶宫 · 盾与暗链',640,330);g.restore();}
 subtitle(t);if(t>=212){g.fillStyle=`rgba(8,10,18,${ease(t-212)})`;g.fillRect(0,0,W,H);}
 debug={t,shot:shot.id,kind,emotion,shield:shieldState(t),route:'full-hybrid-r5',continuity,mechanism,slot:slotPoint,originalKind,face:faceState,bodies,walking,walkPhase,charge,view,motionFrame:Math.round(t*30)};
 return{image:encode?canvas.toDataURL('image/png').split(',')[1]:null,state:debug};
}
await document.fonts.ready;window.renderAt=draw;window.ready=true;window.duration=END;window.shots=shots;
window.__dbg={director,cels,bodyImages,heroFace,enemyFace,shots,motion,get state(){return debug},set hairDisabled(v){disableHair=v},set faceDisabled(v){disableFace=v},set motionDisabled(v){disableMotion=v}};
if(!new URLSearchParams(location.search).has('capture')){const audio=new Audio('./output/stardust_clad_s1e2_palace_r27.mp4'),button=document.createElement('button'),slider=document.createElement('input');button.textContent='播放整集二维版';slider.type='range';slider.min=0;slider.max=6389;slider.step=1;slider.style.width='65vw';document.body.append(button,slider);let raf=0;draw(0);slider.oninput=()=>{cancelAnimationFrame(raf);audio.pause();audio.currentTime=Number(slider.value)/30;draw(audio.currentTime)};button.onclick=async()=>{await audio.play();const tick=()=>{if(audio.paused||audio.currentTime>=END)return;draw(audio.currentTime,{encode:false});slider.value=Math.floor(audio.currentTime*30);raf=requestAnimationFrame(tick)};tick()};}
