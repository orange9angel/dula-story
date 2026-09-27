// Performance bridge: the cel version's fish_* action arcs (performance_v11.js
// `authored`, old StudioYuki dance-rig space) retargeted onto the YukiCraft3D
// ring-mesh rig via the craft twoBone IK (RiverKid-style setPose contract:
// each limb is [root, joint, tip] in mesh-local space, +Z is forward).
// The Mochi half is the cel poseActors cat branch verbatim — Mochi is a
// temporary cel-asset mix-in until Phase 3 builds MochiCraft3D.
import * as THREE from 'three';
import {twoBone} from '/craft/pose3d.js';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

function rhythm(t,beats){
  const i=Math.max(0,beats.findLastIndex(b=>b<=t));
  const phase=clamp((t-beats[i])/(beats[i+1]-beats[i]||.488));
  return {i,phase,swing:Math.sin((i+phase)*Math.PI),lift:Math.sin(phase*Math.PI),hit:Math.exp(-phase*9)};
}

// Old-rig action arcs. Only the moves this episode uses; same numbers as
// performance_v11.js so the staging (and its review history) carries over.
function authored(opts,e,t,beats){
  const local=t-e.startTime,d=e.endTime-e.startTime,u=clamp(local/d);
  const r=rhythm(t,beats),hit=Number(opts.hit),h=ease((t-hit+.26)/.33);
  const p={x:0,y:-.048-.028*r.hit,yaw:0,roll:.035*r.swing,pitch:0,headRoll:.035*r.swing,
    headPitch:0,headYaw:0,air:0,left:v(-.32,.89,.14),right:v(.32,.89,.14),
    footL:v(-.105,.044,.025),footR:v(.105,.044,.025),accent:h};
  const hands=(l,rr)=>{p.left.set(...l);p.right.set(...rr);};
  const footwork=(amp=.072)=>{
    const f=r.i%2?p.footR:p.footL;f.y+=amp*r.lift;f.z+=.11*r.lift;
    p.x=.065*r.swing;p.y-=.014*r.lift;p.yaw=.12*r.swing;
  };
  switch(opts.move){
    case 'fish_accuse':
      hands([-.29,.84,.19],[.36,.94,.22]);p.headYaw=.21;p.headRoll=-.09;p.pitch=.035;break;
    case 'fish_listen':
      hands([-.27,.84,.14],[.28,.84,.14]);p.headYaw=.23;p.headRoll=.10;p.roll=0;break;
    case 'fish_point':
      hands([-.25,.87,.15],[.48,1.00,.25]);p.headYaw=.15;p.headRoll=-.10;footwork(.045);break;
    case 'fish_smell':
      hands([-.32,.92,.17],[.23,1.14,.29]);p.headPitch=-.06;p.headRoll=.10;p.roll=.06*r.swing;break;
    case 'fish_caught':
      hands([-.45,1.14,.14],[.45,1.14,.14]);footwork(.10);p.headRoll=.08*r.swing;break;
    case 'fish_verdict':
      hands([-.27,.86,.15],[.43,.88+.18*r.hit,.25]);p.headYaw=.18;p.headRoll=-.08;footwork(.055);break;
    default:
      hands([-.27,.86,.14],[.28,.86,.14]);break;
  }
  p.footL.x+=p.x;p.footR.x+=p.x;return p;
}

// cel bootstrap.js handPoseRule: discrete hand-shape switching on the 12fps grid.
function handPoseRule(o){
  const key=`${o.move}@${o.kind}`;
  switch(key){
    case 'fish_accuse@dialogue': return {right:'point',left:'fist'};
    case 'fish_accuse@song':     return {right:'fist',left:'fist'};
    case 'fish_point@song':      return {right:'point',left:'mitten'};
    case 'fish_smell@song':      return {right:'hold',left:'mitten'};
    case 'fish_caught@song':     return {right:'point',left:'open'};
    case 'fish_verdict@song':    return {right:'fist',left:'mitten'};
    case 'fish_listen@freeze':   return {right:'wave',left:'mitten'};
    case 'fish_listen@dialogue': return {right:'mitten',left:'mitten'};
    default:                     return {right:'mitten',left:'mitten'};
  }
}
function handPoseFor(opts,previous){
  if(opts.kind==='reaction'&&previous)return handPoseFor(previous.opts,null);
  return handPoseRule(opts);
}
// ArticulatedHand.setGesture supports {point,fist,open}; the craft rest hand
// already reads as a relaxed mitten.
const GESTURES={mitten:{},fist:{fist:1},point:{point:1},open:{open:1},hold:{fist:.55},wave:{open:.85}};

// Old StudioYuki space → craft rig space. Old shoulder line y=1.28, craft 1.075;
// old arm reach .35, craft .37; old foot rest (±.105,.044,.025), craft (±.086,.095,0).
const K=1.075/1.28,MAX_REACH=.362;

export function poseYukiCraft(actor,opts,entry,tq,beats,previous){
  const p=authored(opts,entry,tq,beats);
  if(previous&&tq-entry.startTime<.12){
    const old=authored(previous.opts,previous.entry,previous.entry.endTime-1e-6,beats);
    const a=ease((tq-entry.startTime)/.12);
    for(const k of ['left','right','footL','footR'])p[k].lerpVectors(old[k],p[k],a);
    for(const k of ['x','y','headRoll','headYaw','headPitch','roll','pitch'])p[k]=mix(old[k],p[k],a);
  }
  // Deterministic blink on the acting grid (cel faceState cycle).
  const cycle=(tq+1.15)%3.7,blink=Math.max(0,1-Math.abs(cycle-.07)/.07);
  const rootX=-.43+p.x*.8;
  let hipY=.6925+(p.y+.048);
  const feet={};
  for(const [side,sign,fo] of [['left',-1,p.footL],['right',1,p.footR]]){
    feet[side]=v((fo.x-p.x)*.82,.095+(fo.y-.044)*.85,(fo.z-.025)*.8);
    const dx=feet[side].x-sign*.075;
    const reach=Math.sqrt(Math.max(.01,.596**2-dx*dx-feet[side].z**2));
    hipY=Math.min(hipY,feet[side].y+reach-.002);
  }
  hipY=Math.min(hipY,.700);
  const bob=hipY-.6925;
  const gesture=handPoseFor(opts,previous);
  const pose={t:tq,rootX,yaw:p.yaw,bob,blink,point:gesture.right==='point'?1:0,
    headPitch:p.headPitch,headYaw:p.headYaw,headRoll:p.headRoll};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const hip=v(sign*.075,hipY,0),foot=feet[side];
    pose[side+'Leg']=[hip,twoBone(hip,foot,v(sign*.075,hipY,1),.305,.295),foot];
    const h=p[side],shoulder=v(sign*.175,1.075+bob,0);
    const wrist=v(h.x*K,1.075+(h.y-1.28)*K+bob,h.z*K);
    // The craft head sits higher than the old rig's; the smell gesture reads
    // only when the hand reaches the face, not the chest.
    if(opts.move==='fish_smell'&&side==='right'){wrist.y+=.15;wrist.z+=.02;}
    const delta=wrist.clone().sub(shoulder),reach=clamp(delta.length(),.05,MAX_REACH);
    wrist.copy(shoulder).addScaledVector(delta.normalize(),reach);
    const pole=shoulder.clone().add(v(sign*.65,-.4,.35));
    pose[side+'Arm']=[shoulder,twoBone(shoulder,wrist,pole,.19,.18),wrist];
  }
  actor.setPose(pose);
  actor.mesh.rotation.set(p.pitch,p.yaw,p.roll);
  actor.mesh.position.y=p.air*.15;
  actor.hands.right.setGesture(GESTURES[gesture.right]??{});
  actor.hands.left.setGesture(GESTURES[gesture.left]??{});
  actor.mesh.updateMatrixWorld(true);
  return {move:opts.move,gesture,blink:Math.round(blink*100)/100,
    feet:[feet.left.toArray(),feet.right.toArray()],rootX,hipY};
}

// --- Mochi: cel poseActors cat branch, verbatim except the songMouth rig is
// created up front (same geometry: dark cavity + tongue discs on headGroup).
export function prepareMochi(cat){
  const g=new THREE.Group();g.position.set(0,-.063,.259);cat.headGroup.add(g);
  const dark=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:0x48212a,side:THREE.DoubleSide}));g.add(dark);
  const tongue=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0xd07880,side:THREE.DoubleSide}));tongue.position.z=.002;g.add(tongue);
  cat.songMouth={g,dark,tongue};
}

export function poseMochiCel(cat,opts,entry,tq,beats,lipC){
  const move=opts.move,dt=tq-entry.startTime;
  const i=Math.max(0,beats.findLastIndex(b=>b<=tq));
  const phase=Math.min(1,Math.max(0,(tq-beats[i])/(beats[i+1]-beats[i]||.5)));
  const sway=Math.sin((i+phase)*Math.PI),hit=Math.exp(-phase*8);
  cat.mesh.position.set(.69,0,0);cat.mesh.rotation.set(0,0,0);cat.mesh.scale.set(1,1,1);
  cat.headGroup.position.set(0,cat.headBaseY,.22);cat.headGroup.rotation.set(0,0,0);
  for(const limb of [cat.leftArm,cat.rightArm,cat.leftLeg,cat.rightLeg])limb.rotation.set(0,0,0);
  for(const eye of [cat.leftEye,cat.rightEye]){eye.visible=true;eye.scale.set(1,1,1);}
  cat.leftEyelid.visible=cat.rightEyelid.visible=true;
  cat.leftEyelid.scale.set(1.05,.55,.5);cat.rightEyelid.scale.set(1.05,.55,.5);
  cat.tail.rotation.set(0,.20*Math.sin(tq*1.4),0);
  if(['cat_deny','cat_taste','cat_innocent'].includes(move)){
    cat.mesh.rotation.z=.075*sway;cat.mesh.scale.set(1+.025*hit,1-.045*hit,1+.015*hit);
    cat.headGroup.rotation.z=-.07*sway;
    if(move==='cat_deny'){
      cat.headGroup.rotation.y=.22*sway;
      cat.rightArm.rotation.z=-.28-.45*(.5+.5*sway);
      cat.leftArm.rotation.z=.28+.45*(.5-.5*sway);
    }else if(move==='cat_taste'){
      cat.headGroup.rotation.x=-.08;cat.rightArm.rotation.x=-.4-.22*hit;
      cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.95;
    }else{
      cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.15;
      cat.headGroup.rotation.z=.13;cat.leftArm.rotation.z=.35;cat.rightArm.rotation.z=-.35;
    }
  }else if(move==='cat_guilty'){
    cat.headGroup.rotation.y=-.14;cat.headGroup.rotation.x=.06;
    cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.75;
  }else if(move==='cat_defeat'||move==='cat_wash'){
    cat.headGroup.rotation.x=.17;cat.mesh.scale.set(1.015,.97,1.015);
    cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.85;
    if(move==='cat_wash'){cat.rightArm.rotation.x=-.35-.17*Math.sin(tq*11);cat.leftArm.rotation.x=-.25;}
  }else if(move==='cat_talk'){
    cat.headGroup.rotation.z=.07*Math.sin(dt*2);cat.headGroup.rotation.y=-.08;
  }
  const jaw=lipC.jaw,open=jaw>.025;
  cat.mouth.visible=!open;cat.mouth.scale.set(1,1,1);cat.mouth.position.y=cat.mouthBaseY;
  const rig=cat.songMouth;rig.g.visible=open;
  const width=.020+.016*(1-(lipC.rounding||0))+.008*jaw;
  const height=.006+.038*jaw;
  rig.dark.scale.set(width,height,1);rig.dark.position.y=-height*.55;
  rig.tongue.visible=jaw>.38;rig.tongue.scale.set(width*.52,height*.20,1);rig.tongue.position.y=-height*1.14;
  cat.mesh.updateMatrixWorld(true);
  return {jaw:Math.round(jaw*1000)/1000,open,width,height:open?height:0,move};
}
