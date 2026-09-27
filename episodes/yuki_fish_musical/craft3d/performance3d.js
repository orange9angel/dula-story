// Performance bridge: the cel version's fish_* action arcs (performance_v11.js
// `authored`, old StudioYuki dance-rig space) retargeted onto the YukiCraft3D
// ring-mesh rig via the craft twoBone IK (RiverKid-style setPose contract:
// each limb is [root, joint, tip] in mesh-local space, +Z is forward).
// Phase 4 adds craft-space native moves for the new opening/ending segments
// (fish_enter/fish_serve/fish_idle/fish_depart/fish_offscreen) and new Mochi
// moves (cat_happy/cat_wash_sink/cat_glance/cat_freeze/cat_resign).
// The Mochi half is the cel poseActors cat branch extended, same handle contract.
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

// ── 旧 rig 动作弧（数值同 cel performance_v11.js）──────────────────────────
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

// ── craft 空间原生新动作（开场/结尾）──────────────────────────────────────
const IDLE_HAND_L=[-.228,.713,.035],IDLE_HAND_R=[.228,.713,.035];
const CARRY_L=[-.13,1.00,.30],CARRY_R=[.13,1.00,.30];
function stepFeet(t,speed=4.4,liftAmp=.07){
  const ph=t*speed;
  return {footL:v(-.086,.095+liftAmp*Math.max(0,Math.sin(ph)),.06*Math.max(0,Math.sin(ph-.5))),
          footR:v(.086,.095+liftAmp*Math.max(0,Math.sin(ph+Math.PI)),.06*Math.max(0,Math.sin(ph+Math.PI-.5))),
          dip:.012*Math.abs(Math.sin(ph))};
}
function specCraft(opts,e,tq){
  const local=tq-e.startTime,dur=e.endTime-e.startTime,u=clamp(local/dur);
  const s={rootX:-.43,yaw:0,roll:0,pitch:0,hipY:.6925,air:0,
    footL:v(-.086,.095,0),footR:v(.086,.095,0),
    handL:v(...IDLE_HAND_L),handR:v(...IDLE_HAND_R),
    headPitch:0,headYaw:0,headRoll:0,point:0,
    gesture:{right:'mitten',left:'mitten'},prop:null};
  switch(opts.move){
    case 'fish_enter':{ // 端盘子入场（左→位）
      const w=ease(clamp(local/1.7));
      s.rootX=mix(-1.95,-.43,w);
      if(w<1){const st=stepFeet(tq);s.footL=st.footL;s.footR=st.footR;s.hipY-=st.dip;s.roll=.03*Math.sin(tq*4.4);}
      s.handL.set(...CARRY_L);s.handR.set(...CARRY_R);
      s.gesture={right:'hold',left:'hold'};
      s.headYaw=.06;s.headPitch=.04;
      s.prop={plate:{visible:true,pos:[s.rootX,1.03,.335]}};
      break;
    }
    case 'fish_serve':{ // 到位展示 → 弯腰放到地面餐盘
      const placeStart=dur-1.0,p1=ease(clamp((local-placeStart)/.9));
      s.handL.set(...CARRY_L);s.handR.set(...CARRY_R);
      const platePos=[s.rootX,1.03,.335];
      if(p1>0){
        const hl=v(...CARRY_L).lerp(v(.30,.42,.44),p1),hr=v(...CARRY_R).lerp(v(.42,.42,.40),p1);
        s.handL.copy(hl);s.handR.copy(hr);
        s.hipY-=.17*p1;s.pitch=.10*p1;s.headPitch=.22*p1;
        platePos[0]=mix(s.rootX,.08,p1);platePos[1]=mix(1.03,.07,p1);platePos[2]=mix(.335,.38,p1);
      }
      s.gesture={right:'hold',left:'hold'};
      s.prop={plate:{visible:p1<1,pos:platePos},placeDone:p1>=1};
      break;
    }
    case 'fish_idle':{
      s.roll=.02*Math.sin(tq*2.2);s.headYaw=.10;s.headRoll=.04*Math.sin(tq*1.7);
      break;
    }
    case 'fish_depart':{ // 叮嘱（指猫，落在"不许偷吃"后半句）→ 转身出门 → 回头
      if(u<.32){
        s.yaw=.25*ease(u/.15);s.headYaw=.25;s.gesture={right:'mitten',left:'mitten'};
      }else if(u<.62){
        const a=ease((u-.32)/.1);
        s.yaw=.25+.25*a;s.headYaw=.42;s.headRoll=-.06;
        s.handR.set(.45,.95,.35);s.gesture={right:'point',left:'fist'};s.point=1;
      }else{
        const w=ease(clamp((local-dur*.68)/(dur*.28),0,1));
        s.rootX=mix(-.43,-2.05,w);s.yaw=mix(.5,-.30,ease(clamp((u-.62)/.15,0,1)));
        if(w>0&&w<1){const st=stepFeet(tq);s.footL=st.footL;s.footR=st.footR;s.hipY-=st.dip;}
        if(u>.82){s.headYaw=.5;s.yaw+=.12;} // 回头补一句
      }
      break;
    }
    case 'fish_offscreen':
      s.rootX=-2.6;break;
    default: // 未知名义：中性站立
      break;
  }
  return s;
}

// ── 旧空间 → craft rig 重定向 ─────────────────────────────────────────────
const K=1.075/1.28,MAX_REACH=.362;
function specFromAuthored(opts,entry,tq,beats,previous){
  const p=authored(opts,entry,tq,beats);
  const gesture=handPoseFor(opts,previous);
  const s={rootX:-.43+p.x*.8,yaw:p.yaw,roll:p.roll,pitch:p.pitch,air:p.air,
    hipY:.6925+(p.y+.048),
    footL:v((p.footL.x-p.x)*.82,.095+(p.footL.y-.044)*.85,(p.footL.z-.025)*.8),
    footR:v((p.footR.x-p.x)*.82,.095+(p.footR.y-.044)*.85,(p.footR.z-.025)*.8),
    headPitch:p.headPitch,headYaw:p.headYaw,headRoll:p.headRoll,
    point:gesture.right==='point'?1:0,gesture,prop:null};
  const bob=s.hipY-.6925;
  for(const [side,sign] of [['left',-1],['right',1]]){
    const h=p[side];
    const wrist=v(h.x*K,1.075+(h.y-1.28)*K+bob,h.z*K);
    // The craft head sits higher than the old rig's; the smell gesture reads
    // only when the hand reaches the face, not the chest.
    if(opts.move==='fish_smell'&&side==='right'){wrist.y+=.15;wrist.z+=.02;}
    s[side==='left'?'handL':'handR']=wrist;
  }
  return s;
}

const isCraftMove=opts=>['fish_enter','fish_serve','fish_idle','fish_depart','fish_offscreen'].includes(opts.move);
function specFor(opts,entry,tq,beats,previous){
  return isCraftMove(opts)?specCraft(opts,entry,tq):specFromAuthored(opts,entry,tq,beats,previous);
}
function blendSpec(a,b,t){ // a=旧条目末帧，b=当前；原地缘插值
  const s={...b};
  for(const k of ['rootX','yaw','roll','pitch','hipY','air','headPitch','headYaw','headRoll'])s[k]=mix(a[k],b[k],t);
  for(const k of ['footL','footR','handL','handR'])s[k]=a[k].clone().lerp(b[k],t);
  return s;
}

function buildYukiPose(actor,spec,tq){
  const s=spec;
  for(const [side,sign] of [['left',-1],['right',1]]){
    const f=s[side==='left'?'footL':'footR'];
    const dx=f.x-sign*.075;
    const reach=Math.sqrt(Math.max(.01,.596**2-dx*dx-f.z**2));
    s.hipY=Math.min(s.hipY,f.y+reach-.002);
  }
  s.hipY=Math.min(s.hipY,.700);
  const bob=s.hipY-.6925;
  const cycle=(tq+1.15)%3.7,blink=Math.max(0,1-Math.abs(cycle-.07)/.07);
  const pose={t:tq,rootX:s.rootX,yaw:s.yaw,bob,blink,point:s.point,
    headPitch:s.headPitch,headYaw:s.headYaw,headRoll:s.headRoll};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const foot=s[side==='left'?'footL':'footR'];
    const hip=v(sign*.075,s.hipY,0);
    pose[side+'Leg']=[hip,twoBone(hip,foot,v(sign*.075,s.hipY,1),.305,.295),foot];
    const shoulder=v(sign*.175,1.075+bob,0),wrist=s[side==='left'?'handL':'handR'].clone();
    const delta=wrist.clone().sub(shoulder),reach=clamp(delta.length(),.05,MAX_REACH);
    wrist.copy(shoulder).addScaledVector(delta.normalize(),reach);
    pose[side+'Arm']=[shoulder,twoBone(shoulder,wrist,shoulder.clone().add(v(sign*.65,-.4,.35)),.19,.18),wrist];
  }
  actor.setPose(pose);
  actor.mesh.rotation.set(s.pitch,s.yaw,s.roll);
  actor.mesh.position.y=s.air*.15;
  actor.hands.right.setGesture(GESTURES[s.gesture.right]??{});
  actor.hands.left.setGesture(GESTURES[s.gesture.left]??{});
  actor.mesh.updateMatrixWorld(true);
  return {gesture:s.gesture,blink:Math.round(blink*100)/100,prop:s.prop,point:s.point,
    feet:[pose.leftLeg[2].toArray(),pose.rightLeg[2].toArray()],rootX:s.rootX,hipY:s.hipY};
}

export function poseYukiCraft(actor,opts,entry,tq,beats,previous){
  let spec=specFor(opts,entry,tq,beats,previous);
  if(previous&&tq-entry.startTime<.12){
    const old=specFor(previous.opts,previous.entry,previous.entry.endTime-1e-6,beats,previous);
    spec=blendSpec(old,spec,ease((tq-entry.startTime)/.12));
  }
  const state=buildYukiPose(actor,spec,tq);
  state.move=opts.move;
  return state;
}

// ── 年糕：cel poseActors 猫分支 + 新动作（水槽/偷瞄/认命/开心）────────────
export function prepareMochi(cat){
  const g=new THREE.Group();g.position.set(0,-.063,.259);cat.headGroup.add(g);
  const dark=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:0x48212a,side:THREE.DoubleSide}));g.add(dark);
  const tongue=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0xd07880,side:THREE.DoubleSide}));tongue.position.z=.002;g.add(tongue);
  cat.songMouth={g,dark,tongue};
}

const SINK_POS=[.55,0,-.72],SINK_YAW=Math.PI;
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
  }else if(move==='cat_happy'){
    // 好耶：眼睛睁圆（睫盖收起）、小跳、尾巴快摇
    const hop=Math.sin(Math.PI*clamp(dt/.55));
    cat.mesh.position.y=.07*hop;cat.mesh.scale.set(1-.02*hop,1+.05*hop,1-.02*hop);
    cat.leftEyelid.visible=cat.rightEyelid.visible=false;
    cat.headGroup.rotation.x=-.07;cat.headGroup.rotation.z=.06*Math.sin(dt*3);
    cat.tail.rotation.set(0,.34*Math.sin(tq*6),0);
  }else if(move==='cat_wash_sink'){
    cat.mesh.position.set(...SINK_POS);cat.mesh.rotation.y=SINK_YAW;
    cat.headGroup.rotation.x=.22;
    cat.rightArm.rotation.x=-1.15-.18*Math.sin(tq*11);cat.leftArm.rotation.x=-.95;
    cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.85;
  }else if(move==='cat_glance'){
    cat.mesh.position.set(...SINK_POS);cat.mesh.rotation.y=SINK_YAW;
    cat.rightArm.rotation.x=-1.15;cat.leftArm.rotation.x=-.95;
    cat.headGroup.rotation.x=.25;cat.headGroup.rotation.y=.93; // 低头偷瞄左前脚边的零食袋
    cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.55;
    cat.tail.rotation.set(.1,.04*Math.sin(tq*2),0);
  }else if(move==='cat_freeze'){
    cat.mesh.position.set(...SINK_POS);cat.mesh.rotation.y=SINK_YAW;
    cat.rightArm.rotation.x=-1.15;cat.leftArm.rotation.x=-.95;
    cat.headGroup.rotation.x=.05;
    cat.leftEyelid.visible=cat.rightEyelid.visible=false; // 被抓包，眼睛睁圆
    cat.tail.rotation.set(.15,0,0);
  }else if(move==='cat_resign'){
    cat.mesh.position.set(...SINK_POS);cat.mesh.rotation.y=SINK_YAW;
    const settle=ease(clamp(dt/.8));
    cat.headGroup.rotation.x=.10+.20*settle;cat.mesh.scale.set(1.01,1-.04*settle,1.01);
    cat.rightArm.rotation.x=-1.15+.55*settle;cat.leftArm.rotation.x=-.95+.35*settle;
    cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.9;
    cat.tail.rotation.set(.30*settle,0,0);
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
