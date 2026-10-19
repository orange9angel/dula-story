import * as THREE from 'three';
import {AoaoCraft,YekariCraft} from 'dula-assets/characters/stardust/characters.js';
import {applyPalaceClad} from 'dula-assets/characters/stardust/palace-clad.js';
import {EmberTierPalaceScene} from 'dula-assets/scenes/stardust/EmberTierPalaceScene.js';
import {createCombatLight} from 'dula-assets/lib/craft3d/combat-light.js';
import {createCombustionCombat} from 'dula-assets/lib/craft3d/combustion-combat.js';
import {animateCalderaBackdrop} from 'dula-assets/lib/craft3d/living-caldera.js';
import {createArmorEnvironment,applyMetalClad,refinePalaceLimbs} from 'dula-assets/characters/stardust/metal-clad.js';
import {createStageClearance} from 'dula-assets/lib/craft3d/stage-clearance.js';
import {applyPalaceGauntlets} from 'dula-assets/characters/stardust/gauntlet-clad.js';
import {applyPalaceLowerClad} from 'dula-assets/characters/stardust/lower-clad.js';
import {makeFootClearance} from 'dula-assets/characters/stardust/foot-clearance.js';
import {applyPalaceCuirass,applyPalaceAnatomy} from 'dula-assets/characters/stardust/body-clad.js';
import {applyPalaceArms,applySingleShoulders,removeCladGlow} from 'dula-assets/characters/stardust/palace-arms.js';
import {applyPalacePortrait} from 'dula-assets/characters/stardust/palace-portrait.js';
import {applyShadedPortrait} from 'dula-assets/characters/stardust/shaded-portrait.js';
import {applyConnectedPelvis} from 'dula-assets/characters/stardust/connected-pelvis.js';
import {hearthFire} from 'dula-assets/lib/craft3d/combustion-particles.js';
import {createRegalMetalEnvironment,applyOrnamentMetal} from 'dula-assets/characters/stardust/ornament-metal.js';
import {directLook,moderateCladGlow} from './look_direction.js';
import {poseAt,T,CAST,HIT_KEYS,clamp,ease,mix} from './duel_performance.js';
import {palaceCamera} from './palace_camera.js';
const W=1280,H=720;
const query=new URLSearchParams(location.search),metal=query.get('metal')!=='0';
const [tl,dlg,envs]=await Promise.all(['timeline','dialogue','voice_envs'].map(async n=>{const r=await fetch(`./config/${n}.json`);return r.ok?r.json():{};}));
const entries=tl.segments.map(s=>({startTime:s.start,endTime:s.end,opts:s}));
const scene=new EmberTierPalaceScene();scene.build();await scene.applyHybrid();
const livingCaldera=query.get('volcano')!=='0'?animateCalderaBackdrop(scene.backdrop):null;
const actors={aoao:new AoaoCraft(),yekari:new YekariCraft()};directLook(actors);
for(const name of CAST){applyPalaceClad(actors[name],name,{sculpted:query.get('sculpted')!=='0'});scene.scene.add(actors[name].mesh);}
if(query.get('cuirass')!=='0')for(const name of CAST)applyPalaceCuirass(actors[name],{integratedShoulders:query.get('unified')!=='0'});
if(query.get('gauntlets')!=='0')for(const name of CAST)applyPalaceGauntlets(actors[name],{distinct:query.get('identities')!=='0'});
if(query.get('greaves')!=='0')for(const name of CAST)applyPalaceLowerClad(actors[name],{distinct:query.get('identities')!=='0'});
const camera=new THREE.PerspectiveCamera(39,W/H,.05,100);
const sceneFire=query.get('hearthParticles')==='0'?null:hearthFire(scene.scene,new THREE.Vector3(-2.7,.87,-.98));
if(sceneFire){scene.heart.visible=false;scene.embers.forEach(m=>m.visible=false);}
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
if(metal){const env=createArmorEnvironment(renderer);await Promise.all(CAST.map(name=>applyMetalClad(actors[name],{url:'./assets3d/tex/armor_engraved_r20.png',environment:env.texture,cleanMetal:query.get('sculpted')!=='0'})));}
if(query.get('anatomy')!=='0')for(const name of CAST)refinePalaceLimbs(actors[name]);
if(query.get('pelvis')!=='0')for(const name of CAST)applyPalaceAnatomy(actors[name]);
if(query.get('pelvis')!=='0'&&query.get('connectedHip')!=='0')for(const name of CAST)applyConnectedPelvis(actors[name]);
if(query.get('arms')!=='0')for(const name of CAST)applyPalaceArms(actors[name]);
if(query.get('portrait')!=='0')for(const name of CAST)applyPalacePortrait(actors[name]);
if(query.get('singleShoulder')!=='0')for(const name of CAST)applySingleShoulders(actors[name]);
if(metal&&query.get('ornament')!=='0'){const env=createRegalMetalEnvironment(renderer);for(const name of CAST)applyOrnamentMetal(actors[name],env.texture);}
if(query.get('portrait')!=='0'&&query.get('shaded')!=='0')for(const name of CAST)applyShadedPortrait(actors[name]);
if(query.get('orbs')!=='1')for(const name of CAST)removeCladGlow(actors[name]);
if(query.get('jointfix')!=='0')for(const name of CAST)actors[name].anatomicalHands=true;
if(query.get('footfix')!=='0')actors.aoao.footClearance=makeFootClearance(actors.aoao,scene.lockSolids,{anatomicalKnees:query.get('kneefix')!=='0'});
const stageAudit=(query.has('probe-stage')||query.has('probe-surface'))?createStageClearance(actors,scene.navigationObstacles):null;
const footBlockAudit=stageAudit?createStageClearance(actors,scene.lockSolids,{includeMesh:(mesh,a)=>{
 const roots=[...Object.values(a.feet),a.limbs.leftLeg.mesh,a.limbs.rightLeg.mesh,a.anatomy?.pelvis,...Object.values(a.lowerClad?.legs??{}).map(r=>r.rig)].filter(Boolean);
 for(let p=mesh;p;p=p.parent)if(roots.includes(p))return true;return false;
}}):null;
if(stageAudit){
 const contract=await(await fetch('./config/palace_stage_contract.json')).json();
 if(stageAudit.ids.length!==contract.obstacleCount||contract.requiredFamilies.some(prefix=>!stageAudit.ids.some(id=>id.startsWith(prefix))))throw new Error('Incomplete stage obstacle coverage');
 if(JSON.stringify(footBlockAudit.ids)!==JSON.stringify(contract.interactionSolids))throw new Error('Incomplete interaction solid coverage');
}
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);const ctx=canvas.getContext('2d');
const fx=query.get('combustion')==='0'?createCombatLight(scene.scene,{detailed:query.get('particles')!=='0'}):createCombustionCombat(scene.scene),contacts={};
const world=(obj,v=new THREE.Vector3())=>obj.localToWorld(v.clone());
const shield=()=>world(actors.aoao.shieldDome,new THREE.Vector3(0,.278,0));
for(const key of HIT_KEYS){
 poseAt(actors,entries,T[key]);let point=shield();
 if(key==='C2')point=actors.aoao.hands.left.getWorldPosition(new THREE.Vector3());
 if(key==='C4')point.y-=.18;
 if(key==='TRAP'||key==='LOCK')point=scene.lockPoint.clone();
 if(key==='C7')point=actors.yekari.chestMark.getWorldPosition(new THREE.Vector3());
 contacts[key]=point;
 fx.impact(key,T[key],point,{color:key==='C7'?'#ffc472':key==='C2'||key==='C4'?'#c6a1ff':'#ffd98c',scale:key==='C7'?1.3:key==='TRAP'||key==='LOCK'?.6:.8,normal:key==='C7'?[1,.1,0]:[-1,.2,.25]});
}
const lineAt=t=>dlg.lines.find(l=>{const e=envs.lines?.find(v=>v.id===l.id);return t>=(e?.t0??l.t)&&t<(e?.t0??l.t)+(e?.dur??Math.min(3,l.end-l.t))+.15;});
const jaw=(id,t)=>{const e=envs.lines?.find(v=>v.id===id);if(!e)return 0;return e.jaw[Math.floor((t-e.t0)/e.dt)]??0;};
const head=n=>actors[n].headGroup.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.08,0));
function portrait(n,states){const p=head(n),s=states[n],v=new THREE.Vector3(Math.sin(s.yaw)*2.05,.16,Math.cos(s.yaw)*2.05);return{pos:p.clone().add(v).toArray(),look:p.clone().add(new THREE.Vector3(0,-.12,0)).toArray(),fov:34};}
function cameraAt(t,perf,line){
 const shot=perf.opts.shot;
 if(shot==='hero'||shot==='enemy'||shot==='wrist')return portrait(line?.speaker??(shot==='enemy'?'yekari':'aoao'),perf.states);
 if(shot==='hero_charge'||shot==='enemy_charge'){
  if(shot==='hero_charge'&&t>=T.HERO_CHARGE+1.2&&t<T.HERO_CHARGE+2.0){const p=actors.yekari.chainSocket.getWorldPosition(new THREE.Vector3());return{pos:[p.x-.35,p.y+.25,p.z+1.4],look:p.toArray(),fov:38};}
  if(shot==='hero_charge'&&t>=T.HERO_CHARGE+3.5)return{pos:[.1,1.5,5.6],look:[.1,.9,0],fov:43};
  const n=shot==='hero_charge'?'aoao':'yekari',p=head(n),s=perf.states[n];return{pos:[p.x+Math.sin(s.yaw)*2.7,p.y-.25,p.z+Math.cos(s.yaw)*2.7],look:[p.x,p.y-.30,p.z],fov:37};}
 if(shot==='palace')return{pos:[5.5,4.5,9.8],look:[-.3,1.5,-1.7],fov:49};
 if(shot==='gate_detail')return{pos:[-.1,1.65,2.7],look:[-1.8,.7,-.6],fov:39};
 if(shot==='tracks')return{pos:[.1,1.3,2.3],look:[-.45,.1,-.02],fov:36};
 if(shot==='embers')return{pos:[-1.25,1.6,1.3],look:[-2.7,.95,-1.25],fov:33};
 if(shot==='streets'){const u=ease((t-205)/6);return{pos:[mix(2,.6,u),mix(2.8,1.8,u),mix(-14,-14.1,u)],look:[-.1,.15,-17.3],fov:56};}
 if(shot==='gate_fight')return{pos:[-.7,2.4,5.3],look:[-.9,1.0,-.4],fov:47};
 if(shot==='finisher')return{pos:[.1,1.4,6.1],look:[.2,1.1,0],fov:43};
 if(shot==='impact'||shot==='side')return{pos:[-.1,1.8,5.5],look:[.1,1.12,0],fov:42};
 if(line&&shot==='two')return portrait(line.speaker,perf.states);
 return{pos:[.2,2,6.7],look:[.1,1.1,-.2],fov:43};
}
function label(text,x,y,size,color='#ffe1ab',align='center'){
 ctx.save();ctx.font=`bold ${size}px Microsoft YaHei`;ctx.textAlign=align;ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='rgba(8,11,21,.9)';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
}
function overlay(t,perf,line){
 if(t<7){const a=Math.min(1,t/.5)*(1-ease((t-6)/1));ctx.save();ctx.globalAlpha=a;label('星屑战壳',W*.5,115,52);label('第二集 · 焰阶宫：盾与暗链',W*.5,161,28);
  const places=[['焰阶宫','阿鏊','#ffd480'],['风筛宫','小凿','#b6e7ff'],['沉汤宫','大釜','#f6b174'],['霜箸宫','阿箸','#cdd5ff']];
  for(const [i,[p,n,c]] of places.entries()){const x=170+i*310;ctx.fillStyle='rgba(10,17,29,.7)';ctx.fillRect(x-118,H-118,236,78);label(p,x,H-84,24,c);label(n+' · 各守一宫',x,H-52,18,c);}ctx.restore();
 }
 const cards=[[T.CHARGE1+.8,'刈夜 · 无声镰弧','#c5a4ff'],[T.CALL,'焰返 · 灶膛回燃','#ffcb72']];
 for(const [a,txt,color] of cards)if(t>=a&&t<a+1.1){ctx.save();ctx.globalAlpha=Math.min(1,(t-a)/.12)*(1-ease((t-a-.8)/.3));label(txt,W*.5,H*.23,42,color);ctx.restore();}
 if(line){const who=line.speaker==='aoao'?'阿鏊':'夜刈';label(`${who}：${line.text}`,W/2,H-45,27,dlg.colors[line.speaker]);}
 // A brief local radial exposure accent leaves the silhouettes readable.
 for(const key of HIT_KEYS){const dt=t-T[key];if(dt<0||dt>.067)continue;const v=contacts[key].clone().project(camera),x=(v.x+1)*W/2,y=(1-v.y)*H/2;
  const g=ctx.createRadialGradient(x,y,0,x,y,170);g.addColorStop(0,`rgba(255,249,229,${.32*(1-dt/.067)})`);g.addColorStop(1,'rgba(255,240,200,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
 if(t>T.FADE){ctx.fillStyle=`rgba(8,11,17,${ease((t-T.FADE)/(tl.duration-T.FADE))})`;ctx.fillRect(0,0,W,H);}
}
function draw(t,capture=true){
 const perf=poseAt(actors,entries,t),active=lineAt(t);scene.update(t,T);livingCaldera?.update(t);
 const heldLine=active??dlg.lines.findLast(l=>l.t<=t&&l.t>=perf.entry.startTime);
 let c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??40}:query.get('cinema')==='0'?cameraAt(t,perf,active):palaceCamera(t,perf,heldLine,actors,()=>cameraAt(t,perf,active));
 let shake=0;for(const key of HIT_KEYS){const d=t-T[key];if(d>=0&&d<.34)shake+=(key==='C7'?.06:.028)*(1-d/.34);}
 camera.position.set(c.pos[0]+Math.sin(t*91)*shake,c.pos[1]+Math.cos(t*73)*shake*.6,c.pos[2]);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();
 sceneFire?.update(t,camera,.70+.30*ease((t-T.RESTORE)/3));
 for(const name of CAST){const a=actors[name],s=perf.states[name],other=name==='aoao'?'yekari':'aoao';
  const blink=Math.max(0,1-Math.abs(((t+(name==='aoao'?0:1.4))%4.3)-4.1)/.11);
  const emot=active?.speaker===name?active.acting.emotion:s.emotion;
  a.setEmotion(emot,blink);a.face.setActing({fear:emot==='pain'?.25:emot==='worry'?.4:emot==='surprised'?.68:0,focus:emot==='determined'?.85:emot==='pain'?.54:.18,smile:emot==='happy'?.19:0,browAsym:emot==='pain'?.6:.1,pupil:emot==='surprised'?.8:1});a.updateCladFX(t,1);moderateCladGlow(a,t,0);a.updatePalaceClad(t,T);
  const target=active?.acting.gaze==='ground'||s.headPitch>.15?new THREE.Vector3(-.4,.1,0):head(other);
  if(t<20||t>T.RETREAT+6.7)target.copy(new THREE.Vector3(-2.7,1.1,-1.25));
  a.face.lookAtWorld?.(target);a.mouth.apply({jaw:active?.speaker===name?jaw(active.id,t):0,width:1});
 }
 let arc=null,charge=null,beamShot=null,chainEnd=null;
 for(const key of ['C1','C3','C5','C6']){
  const dt=t-T[key];if(dt>=-.48&&dt<.18){const from=actors.yekari.sickleTip.getWorldPosition(new THREE.Vector3()),hit=contacts[key],u=clamp((dt+.48)/.48);
   arc={from,to:from.clone().lerp(hit,u),bend:.22+Math.sin(u*Math.PI)*.6,alpha:dt<0?1:1-dt/.18};}
 }
 for(const key of ['C2','C4','TRAP']){const dt=t-T[key];if(dt>=-.7&&dt<.8){const start=actors.yekari.chainSocket.getWorldPosition(new THREE.Vector3()),p=contacts[key],u=clamp((dt+.7)/.7);
  chainEnd=start.clone().lerp(p,u);chainEnd.y-=Math.sin(u*Math.PI)*.45;if(dt>.14&&key!=='TRAP')chainEnd=p.clone().lerp(start,ease((dt-.14)/.66));}}
 if(t>=T.TRAP&&t<T.C7)chainEnd=scene.lockPoint.clone();
 actors.yekari.setChainEndWorld(chainEnd,chainEnd?.02:.10);
 if(t>=T.C7){actors.yekari.returnBlade.visible=false;for(const m of actors.yekari.chainLinks)m.visible=false;}
 for(const a of [T.CHARGE1,T.CHARGE2])if(t>=a&&t<a+5){charge={point:head('yekari').add(new THREE.Vector3(0,-.7,0)),base:actors.yekari.mesh.position.clone().setY(.03),start:a,height:2.0,color:'#b08bff',power:.3+.7*ease((t-a)/4)};}
 if(t>=T.HERO_CHARGE&&t<T.RELEASE){charge={point:shield(),base:actors.aoao.mesh.position.clone().setY(.03),start:T.HERO_CHARGE,height:1.85,color:'#ffbf5b',power:.35+.65*ease((t-T.HERO_CHARGE)/3)};}
 if(t>=T.RELEASE&&t<T.C7+.18){const u=clamp((t-T.RELEASE)/(T.C7-T.RELEASE)),from=scene.lockPoint.clone(),wrist=actors.yekari.chainSocket.getWorldPosition(new THREE.Vector3()),target=wrist.lerp(contacts.C7,ease((t-(T.C7-.12))/.12));beamShot={from,to:from.clone().lerp(target,u),alpha:t<T.C7?.82:Math.max(0,1-(t-T.C7)/.18),width:.55+.35*u};}
 fx.update(t,camera,{arc,charge,beamShot});
 let rimLow=new THREE.Vector3(0,999,0);for(let i=0;i<64;i++){const a=i*Math.PI/32,p=world(actors.aoao.shieldDome,new THREE.Vector3(Math.cos(a)*.265,.052,Math.sin(a)*.265));if(p.y<rimLow.y)rimLow=p;}
 const trace={phase:perf.phase,scene:'ember',cast:CAST.filter(n=>actors[n].mesh.visible),roots:{},arms:{},legs:{},feet:{},hands:{},contacts:{},shieldRimLow:rimLow.toArray(),slot:scene.lockPoint.toArray(),gateOpen:scene.gate.position.y,windowsLit:scene.windows.filter(w=>w.visible).length};
 for(const n of CAST){const a=actors[n],p=perf.poses[n];trace.roots[n]=a.mesh.position.toArray();trace.arms[n]={};trace.feet[n]={};
  trace.legs[n]={};trace.hands[n]={};for(const side of ['left','right']){trace.arms[n][side]=p[side+'Arm'].map(v=>[v.x,v.y,v.z]);trace.legs[n][side]=p[side+'Leg'].map(v=>[v.x,v.y,v.z]);trace.feet[n][side]=a.feet[side].getWorldPosition(new THREE.Vector3()).toArray();trace.hands[n][side]=a.hands[side].quaternion.toArray();}}
 for(const key of HIT_KEYS)if(Math.abs(t-T[key])<.15)trace.contacts[key]={target:contacts[key].toArray(),effect:fx.impacts.find(e=>e.id===key).group.position.toArray(),active:t>=T[key]};
 if(stageAudit){trace.environment=stageAudit.sample();trace.footBlock=footBlockAudit.sample();}
 if(!capture)return trace;
 renderer.render(scene.scene,camera);renderer.render(scene.scene,camera);ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);overlay(t,perf,active);
 return{image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state:trace};
}
window.duration=tl.duration;window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);window.setFreeCamera=c=>window.freeCamera=c;
window.checkTimes=[...entries.map(e=>e.startTime+.5),...HIT_KEYS.flatMap(k=>[T[k]-.1,T[k],T[k]+.15]),T.RESTORE+4].sort((a,b)=>a-b);
window.__dbg={actors,scene,camera,renderer,contacts,stageAudit,fx,livingCaldera};await document.fonts.ready;window.ready=true;
