import * as THREE from 'three';
export { buildDanceRig, createLipDriver, applyLips } from './performance_v10.js';
import { buildDanceRig } from './performance_v10.js';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const down=v(0,-1,0),up=v(0,1,0);
const wave=(t,a,b)=>t<a||t>b?0:Math.sin(Math.PI*(t-a)/(b-a));

function rhythm(t,beats){
  const i=Math.max(0,beats.findLastIndex(b=>b<=t));
  const phase=clamp((t-beats[i])/(beats[i+1]-beats[i]||.488));
  return {i,phase,swing:Math.sin((i+phase)*Math.PI),lift:Math.sin(phase*Math.PI),hit:Math.exp(-phase*9)};
}

// Each phrase has an action arc. Beat motion fills the spaces between its verbs.
function authored(opts,e,t,beats){
  const local=t-e.startTime,d=e.endTime-e.startTime,u=clamp(local/d);
  const r=rhythm(t,beats),hit=Number(opts.hit),h=ease((t-hit+.26)/.33);
  const p={x:0,y:-.048-.028*r.hit,yaw:0,roll:.035*r.swing,pitch:0,headRoll:.035*r.swing,
    headPitch:0,headYaw:0,air:0,left:v(-.32,.89,.14),right:v(.32,.89,.14),
    footL:v(-.105,.044,.025),footR:v(.105,.044,.025),accent:h};
  const hands=(l,rr)=>{p.left.set(...l);p.right.set(...rr);};
  const spread=(y=1.1,w=.46)=>hands([-w,y,.14],[w,y,.14]);
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
    case 'beckon': {
      const curl=.5+.5*Math.cos((r.i+r.phase)*Math.PI*2);
      hands([-.35,.99,.18],[.27,1.00+.13*curl,.30-.10*curl]);
      p.pitch=.035;p.headPitch=.07*r.hit;p.roll=-.055;p.headRoll=.11;
      p.x=.03*r.swing;break;
    }
    case 'come_along': {
      footwork();const a=.5+.5*r.swing;
      hands([-.29,1.02+.08*a,.27-.08*a],[.29,1.10-.08*a,.19+.08*a]);
      p.yaw=.23*r.swing;p.headYaw=-.13*r.swing;p.roll=.08*r.swing;break;
    }
    case 'tiny_steps':
      footwork(.11);hands([-.35,.91+.10*r.swing,.17],[.35,.91-.10*r.swing,.17]);
      p.headPitch=.20*(1-ease(u));p.headRoll=-.07*r.swing;p.roll=.07*r.swing;break;
    case 'joy_expand': {
      const release=ease((t-hit+.22)/.35),settle=ease((t-hit-.15)/.6);
      p.left.lerpVectors(v(-.09,.98,.31),v(-.48,1.15,.10),release);
      p.right.lerpVectors(v(.09,.98,.31),v(.48,1.15,.10),release);
      p.y-=.045*(1-release);p.y+=.028*Math.sin(release*Math.PI);
      p.headPitch=.10*(1-release)-.08*release;p.roll=.06*r.swing*settle;
      p.left.y+=.065*r.swing*settle;p.right.y-=.065*r.swing*settle;
      p.footL.y+=.06*r.lift*(r.i%2?0:1)*settle;p.footR.y+=.06*r.lift*(r.i%2?1:0)*settle;
      break;
    }
    case 'twirl': {
      const spin=ease((u-.08)/.84),open=Math.sin(Math.PI*spin)**2;
      p.yaw=2*Math.PI*spin;spread(1.04+.07*open,.27+.20*open);
      p.y-=.028*(1-open);p.roll=0;p.headRoll=0;p.footL.z=-.035;p.footR.z=.07;break;
    }
    case 'light_world': {
      const bloom=ease((t-hit+.42)/.52);
      p.left.lerpVectors(v(-.12,.97,.30),v(-.39,1.31,.08),bloom);
      p.right.lerpVectors(v(.12,.97,.30),v(.39,1.31,.08),bloom);
      p.headPitch=.12-.23*bloom;p.y+=.014*bloom;p.roll=.025*r.swing;break;
    }
    case 'introduce':
      hands([-.14,1.02,.30],[.36,1.04+.17*h,.16]);
      p.yaw=-.16+.27*h;p.headYaw=-.10;p.headRoll=.10;p.headPitch=-.06;break;
    case 'heart':
      hands([-.085,1.00+.018*r.hit,.31],[.085,1.00+.018*r.hit,.31]);
      p.y-=.025*r.hit;p.headPitch=.10;p.roll=-.045;break;
    case 'clap': {
      const close=Math.exp(-r.phase*7);
      hands([-mix(.36,.046,close),mix(1.02,1.00,close),mix(.18,.33,close)],
            [mix(.36,.046,close),mix(1.02,1.00,close),mix(.18,.33,close)]);
      p.roll=.065*r.swing;p.headPitch=.08*r.hit;p.x=.055*r.swing;
      p.footL.y+=.065*r.lift*(r.i%2?0:1);p.footR.y+=.065*r.lift*(r.i%2?1:0);break;
    }
    case 'step_left': case 'step_right': {
      const s=opts.move==='step_left'?-1:1,from=s<0?0:-.26,to=s<0?-.26:.25;
      const a=ease(local/Math.max(.17,Number(opts.land)-e.startTime));
      const b=ease((t-Number(opts.land))/Math.max(.15,e.endTime-Number(opts.land)-.06));
      p.x=mix(from,to,a);const lead=s<0?p.footL:p.footR,trail=s<0?p.footR:p.footL;
      lead.x=mix(from+s*.10,to+s*.10,a);lead.y+=.115*Math.sin(Math.PI*a);
      trail.x=mix(from-s*.10,to-s*.10,b);trail.y+=.095*Math.sin(Math.PI*b);
      hands([-.38,1.02+(s<0?.14:0),.12],[.38,1.02+(s>0?.14:0),.12]);
      p.headYaw=s*.17;p.headRoll=-s*.10;p.roll=-s*.06*Math.sin(Math.PI*a);return p;
    }
    case 'air_drums':
      footwork(.08);hands([-.32,1.05+.15*r.swing,.24],[.32,1.05-.15*r.swing,.24]);
      p.pitch=.04;p.headPitch=.07*r.hit;break;
    case 'take_control': {
      const grip=ease((t-hit+.35)/.4);
      p.left.lerpVectors(v(-.14,1.02,.30),v(-.36,.90,.14),grip);
      p.right.lerpVectors(v(.34,1.12,.20),v(.22,.96,.31),grip);
      p.yaw=-.12;p.headYaw=.08;p.headRoll=-.12;p.y-=.03*Math.sin(grip*Math.PI);break;
    }
    case 'hop': case 'cheer': {
      const land=Number(opts.land),flight=opts.move==='cheer'?.49:.27,takeoff=land-flight;
      p.air=Math.max(0,wave(t,takeoff,land));
      const prep=wave(t,takeoff-.16,takeoff),settle=wave(t,land,land+.18);
      p.y-=.075*prep+.055*settle;
      spread(.98+.32*p.air,.36+.045*p.air);p.headPitch=-.08*p.air;p.roll=0;
      p.footL.y+=.03*p.air;p.footR.y+=.03*p.air;break;
    }
    case 'sparkle':
      footwork(.085);hands([-.39,1.13+.18*r.swing,.08],[.39,1.13-.18*r.swing,.08]);
      p.roll=-.075*r.swing;p.headRoll=.09*r.swing;p.headYaw=-.12*r.swing;break;
    case 'sing_joy': {
      const send=ease((t-hit+.27)/.48);
      p.left.lerpVectors(v(-.10,1.01,.31),v(-.44,1.08,.19),send);
      p.right.lerpVectors(v(.10,1.01,.31),v(.44,1.08,.19),send);
      p.headPitch=-.10*send;p.headRoll=.11*Math.sin(u*Math.PI);p.roll=-.035;break;
    }
    case 'count_in':
      hands([-.34,.88,.13],[.36,1.27,.10]);p.headRoll=-.14;p.headYaw=-.06;
      p.headPitch=.04*(1-h);p.y-=.02*(1-h);break;
    case 'your_stage': {
      const a=ease(local/Math.min(.29,d*.62));p.x=-.29*a;p.roll=-.06;
      hands([-.11,1.01,.31],[.47,1.07,.12]);p.headYaw=.20;p.headRoll=-.05;
      p.footL.y+=.09*Math.sin(Math.PI*a);break;
    }
    case 'together':
      footwork(.09);p.x=-.29*(1-ease(local/.4))+.055*r.swing*ease(local/.4);
      hands([-.27,1.04,.28],[.27,1.04,.28]);p.headYaw=0;p.roll=.085*r.swing;break;
    case 'finale': {
      const settle=ease(local/.65),wiggle=Math.sin(local*17)*(1-settle);
      hands([-.39,1.12,.10],[.37+.03*wiggle,1.27+.035*wiggle,.12]);
      p.y=-.06;p.roll=-.05;p.headRoll=.12;p.headPitch=-.03;break;
    }
    default:throw new Error(`Unknown V11 performance: ${opts.move}`);
  }
  p.footL.x+=p.x;p.footR.x+=p.x;return p;
}

function solve(limb,target,pole){
  const delta=target.clone().sub(limb.origin),dist=clamp(delta.length(),.031,limb.l1+limb.l2-.001);
  const dir=delta.normalize(),bend=pole.clone().addScaledVector(dir,-pole.dot(dir)).normalize();
  const along=(limb.l1**2-limb.l2**2+dist**2)/(2*dist);
  const joint=dir.clone().multiplyScalar(along).addScaledVector(bend,Math.sqrt(Math.max(0,limb.l1**2-along**2)));
  limb.upper.quaternion.setFromUnitVectors(down,joint.clone().normalize());
  const fore=dir.clone().multiplyScalar(dist).sub(joint).normalize().applyQuaternion(limb.upper.quaternion.clone().invert());
  limb.lower.quaternion.setFromUnitVectors(down,fore);
  if(limb.sleeve)limb.sleeve.quaternion.copy(limb.upper.quaternion);
  else limb.hand.quaternion.copy(limb.upper.quaternion.clone().multiply(limb.lower.quaternion).invert());
}

export function poseDance(c,opts,entry,t,beats,previous){
  buildDanceRig(c);const p=authored(opts,entry,t,beats);
  const transition=.12;
  if(previous&&t-entry.startTime<transition){
    const old=authored(previous.opts,previous.entry,previous.entry.endTime-1e-6,beats);
    const a=ease((t-entry.startTime)/transition);
    for(const k of ['left','right','footL','footR'])p[k].lerpVectors(old[k],p[k],a);
    for(const k of ['x','y','headRoll','headYaw','headPitch','roll','pitch'])p[k]=mix(old[k],p[k],a);
  }
  const tilt=new THREE.Quaternion().setFromEuler(new THREE.Euler(p.pitch,0,p.roll));
  const invTilt=tilt.clone().invert();
  // Find a reachable hip height using the same tilted leg geometry as IK.
  for(let n=0;n<30;n++){
    const reachable=[['left',p.footL],['right',p.footR]].every(([name,foot])=>
      foot.clone().sub(v(p.x,p.y,0)).applyQuaternion(invTilt).distanceTo(c.danceRig.limbs[name+'Leg'].origin)<=.594);
    if(reachable)break;p.y-=.004;
  }
  c.mesh.position.set(p.x,p.y+.20*p.air,0);c.mesh.scale.set(1,1,1);
  c.mesh.quaternion.setFromAxisAngle(up,p.yaw).multiply(tilt);
  c.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
  const limbs=c.danceRig.limbs;
  for(const name of ['left','right']){
    const hand=p[name],s=name==='left'?-1:1,delta=hand.clone().sub(v(0,1.28,0));
    if(delta.length()<.378)hand.copy(delta.setLength(.378).add(v(0,1.28,0)));
    solve(limbs[name+'Arm'],hand,v(s,.10,.65));
    const foot=(name==='left'?p.footL:p.footR).clone().sub(v(p.x,p.y,0)).applyQuaternion(invTilt);
    solve(limbs[name+'Leg'],foot,v(0,0,1));
    limbs[name+'Leg'].hand.quaternion.multiply(invTilt);
  }
  c.mesh.updateMatrixWorld(true);
  const hands=['left','right'].map(n=>limbs[n+'Arm'].hand.getWorldPosition(v()));
  const inverse=c.headGroup.matrixWorld.clone().invert();
  return {airborne:p.air,spinAngle:p.yaw,feet:['left','right'].map(n=>limbs[n+'Leg'].hand.getWorldPosition(v()).toArray()),
    hands:hands.map(h=>h.toArray()),handClearance:Math.min(...hands.map(h=>h.clone().applyMatrix4(inverse).length()-.345)),
    move:opts.move,accent:p.accent};
}

function faceState(opts,e,t){
  const u=clamp((t-e.startTime)/(e.endTime-e.startTime)),h=ease((t-Number(opts.hit)+.18)/.3);
  const f={eye:1,brow:.15,slope:.15,asym:0,closedL:0,closedR:0,gazeX:0,gazeY:0,blush:.50,mood:opts.emotion};
  switch(opts.emotion){
    case 'inviting':f.brow=.17;f.asym=.012;f.eye=1.06;break;
    case 'cheeky':f.eye=.90;f.asym=.018;f.slope=.25;f.closedL=wave(u,.4,.82)>.45?1:0;break;
    case 'playful':f.eye=.93;f.brow=.167;f.asym=.012*Math.sin(u*7);break;
    case 'delight':f.eye=1.13-.19*h;f.brow=.185-.02*h;f.blush=.74;
      if(opts.move==='joy_expand'&&u>.47&&u<.68)f.closedL=f.closedR=1;break;
    case 'wonder':f.eye=1.23;f.brow=.20;f.slope=.06;f.gazeY=.012;break;
    case 'proud':f.eye=.86;f.asym=.02;f.slope=.22;f.closedL=u>.60&&u<.86?1:0;break;
    case 'tender':f.eye=.82;f.brow=.16;f.slope=-.15;f.blush=.72;break;
    case 'joyful':f.eye=.94;f.brow=.17;f.blush=.65;
      if(u>.36&&u<.64)f.closedL=f.closedR=1;break;
    case 'mischief':f.eye=.88;f.asym=.02;f.slope=.26;break;
    case 'focused':f.eye=.82;f.slope=-.20;f.brow=.145;break;
    case 'confident':f.eye=.86;f.brow=.155;f.asym=.02;f.slope=-.12;break;
    case 'excited':f.eye=1.19;f.brow=.19;f.slope=.06;break;
    case 'belting':f.eye=1.06;f.brow=.18;f.blush=.69;
      if(u>.43&&u<.86)f.closedL=f.closedR=1;break;
    case 'expectant':f.eye=1.08;f.asym=.025;f.brow=.17;break;
    case 'warm':f.eye=.90;f.slope=.22;f.blush=.66;
      if(opts.move==='finale'&&u>.2)f.closedL=1;break;
    case 'triumph':f.eye=1.10;f.brow=.19;f.blush=.72;break;
    default:throw new Error(`Unknown facial intention ${opts.emotion}`);
  }
  if(opts.focus==='feet')f.gazeY=-.017*(1-ease(u));
  if(opts.focus==='left')f.gazeX=-.018;
  if(opts.focus==='right')f.gazeX=.018;
  if(opts.focus==='hands'){
    f.gazeY=['light_world','sparkle'].includes(opts.move)?.013:-.010;
    if(opts.move==='sparkle')f.gazeX=-.015*Math.sin(t*6.4);
  }
  // Deterministic blinks between acting accents, with a full eye-group closure.
  const cycle=(t+1.15)%3.7,blink=Math.max(0,1-Math.abs(cycle-.07)/.07);
  if(blink>.6){f.closedL=1;f.closedR=1;}
  f.eye*=1-.72*blink;return f;
}

export function actFace(c,opts,e,t,previous){
  const f=faceState(opts,e,t),a=ease((t-e.startTime)/.15);
  if(previous&&a<1){
    const old=faceState(previous.opts,previous.entry,previous.entry.endTime-1e-6);
    for(const k of ['eye','brow','slope','asym','gazeX','gazeY','blush'])f[k]=mix(old[k],f[k],a);
  }
  if(!c.performanceFace){
    const layers=[c.leftEye,c.rightEye].map(eye=>eye.children.slice(1,7).map(o=>({o,base:o.position.clone()})));
    const blush=[];c.headGroup.traverse(o=>{if(o.isMesh&&o.material?.color?.getHex()===0xff9a9a){o.material=o.material.clone();blush.push(o);}});
    c.performanceFace={layers,blush};
  }
  for(const [i,eye,closed] of [[0,c.leftEye,f.closedL],[1,c.rightEye,f.closedR]]){
    eye.visible=!closed;eye.scale.set(1,f.eye,1);
    c.beatFace.eyes[i].visible=!!closed;
    c.beatFace.eyes[i].scale.y=.80;
    for(const {o,base} of c.performanceFace.layers[i])o.position.copy(base).add(v(f.gazeX,f.gazeY,0));
  }
  c.leftEyelid.visible=c.rightEyelid.visible=false;
  c.leftEyebrow.position.y=f.brow+f.asym;c.rightEyebrow.position.y=f.brow-f.asym;
  c.leftEyebrow.rotation.z=Math.PI/2-f.slope;c.rightEyebrow.rotation.z=Math.PI/2+f.slope;
  for(const b of c.performanceFace.blush)b.material.opacity=f.blush;
  return f;
}

// Screen-space light drawings are anchored to the performed hands/feet.
export function drawMotif(ctx,camera,c,opts,e,t,posed){
  const kind=opts.motif;if(kind==='none')return kind;
  const local=t-e.startTime,tail=e.endTime-t,alpha=ease(local/.12)*ease(tail/.16);
  const project=a=>{const p=v(...a).project(camera);return [(p.x+1)*360,(1-p.y)*640];};
  const hands=posed.hands.map(project),chest=project(c.mesh.localToWorld(v(0,1.0,.36)).toArray());
  const star=(x,y,r,color)=>{ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<10;i++){
    const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.40:r;i?ctx.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d):ctx.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);
  }ctx.closePath();ctx.fill();};
  ctx.save();ctx.globalAlpha=.85*alpha;ctx.strokeStyle='#ffe18b';ctx.fillStyle='#ff88b4';ctx.lineWidth=3;
  if(['heart','joy'].includes(kind)){
    const h=(t-Number(opts.hit)),spread=opts.move==='joy_expand'?ease((h+.22)/.35):0;
    const x=chest[0],y=chest[1]+8,r=(kind==='heart'?21:17)*(1+.15*Math.sin(t*13))+16*spread;
    ctx.beginPath();ctx.moveTo(x,y+r*.8);ctx.bezierCurveTo(x-r*2,y-r*.2,x-r*.7,y-r*1.5,x,y-r*.6);
    ctx.bezierCurveTo(x+r*.7,y-r*1.5,x+r*2,y-r*.2,x,y+r*.8);ctx.fill();
    if(spread>0)for(let i=0;i<6;i++){const a=i*Math.PI/3;star(x+Math.cos(a)*(r+35*spread),y+Math.sin(a)*(r+25*spread),5+3*spread,'#ffe895');}
  }else if(['sparkles','starlight'].includes(kind)){
    hands.forEach(([x,y],j)=>{star(x,y-16,13+5*Math.sin(t*7+j),'#ffe895');
      for(let k=0;k<3;k++)star(x+Math.cos(t*1.5+k*2+j)*34,y-35-Math.sin(t*1.5+k*2+j)*24,4,'#ffffff');});
  }else if(kind==='clap'||kind==='rhythm'){
    const d=Math.hypot(hands[0][0]-hands[1][0],hands[0][1]-hands[1][1]);
    if(kind==='rhythm'||d<58)hands.forEach(([x,y])=>{for(let i=0;i<3;i++){
      const a=-Math.PI*.9+i*Math.PI*.4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*25,y+Math.sin(a)*25);
      ctx.lineTo(x+Math.cos(a)*40,y+Math.sin(a)*40);ctx.stroke();}});
  }else if(kind==='notes'){
    ctx.font='38px "Segoe UI Symbol"';ctx.fillStyle='#ffda89';
    hands.forEach(([x,y],j)=>ctx.fillText('♪',x+(j?20:-42),y-24-15*Math.sin(local*3)));
  }else if(kind==='spotlight'){
    const [x,y]=project([.43,.015,.1]);ctx.fillStyle='rgba(255,234,175,.22)';ctx.beginPath();ctx.ellipse(x,y,73,20,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ffe8b2';ctx.stroke();star(x,y-53,12,'#fff0c1');
  }else if(['footsteps','landing','orbit'].includes(kind)){
    for(const f of posed.feet){if(f[1]>.085)continue;const [x,y]=project([f[0],.009,f[2]]);
      ctx.beginPath();ctx.ellipse(x,y,21,7,0,0,Math.PI*2);ctx.stroke();}
  }
  ctx.restore();return kind;
}
