// Episode-local counterattack study. Opt in with --fight-trial; R11 remains the default.
// All timings derive from the existing will_up entry and its existing .72 audio hit.
import * as THREE from 'three';
import {twoBone} from '/craft/pose3d.js';
import {poseAt,clamp,ease,gaitFeet} from './performance.js';
import {installFightFace} from './fight_trial_face.js';

const V=(x,y,z=0)=>({x,y,z}),mix=(a,b,u)=>a+(b-a)*u;
const blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));
const ramp=(t,a,b)=>ease((t-a)/(b-a));
const pulse=(t,a,b,c)=>ramp(t,a,b)*(1-ramp(t,b,c));
const LEI={hip:.85,shoulder:1.375,half:.13,pelvis:.075,leg:.40,upper:.19,lower:.18,foot:.085};
const HONG={hip:.98,shoulder:1.56,half:.18,pelvis:.10,leg:.45,upper:.22,lower:.21,foot:.10};

export function installFightActors(lei,hong){
  for(const actor of [lei,hong]){
    const original=actor.setPose.bind(actor);
    actor.setPose=p=>{
      original(p);
      if(p.torsoMatrix){
        actor.body.quaternion.setFromRotationMatrix(p.torsoMatrix);
        actor.body.position.copy(p.torsoTranslation);
        for(const side of ['left','right'])actor.feet[side].rotation.set(p[side+'FootPitch']??0,p[side+'FootYaw']??0,0);
      }else{
        actor.body.rotation.set(p.lean??0,0,0);actor.body.position.x=0;actor.body.position.z=0;
        for(const side of ['left','right'])actor.feet[side].rotation.set(p[side+'FootPitch']??0,p[side+'FootYaw']??0,0);
      }
      // Hand contract: +X wrist-to-fingers, +Y thumb, sign*Z palm.
      // A forward-only thumb reference points downward once the forearm is raised.
      actor.handThumbUp={};
      for(const side of ['left','right']){
        const arm=p[side+'Arm'],x=new THREE.Vector3(arm[2].x-arm[1].x,arm[2].y-arm[1].y,arm[2].z-arm[1].z).normalize();
        let y=new THREE.Vector3(0,1,0).addScaledVector(x,-x.y);
        if(y.lengthSq()<.015)y.set(0,0,1).addScaledVector(x,-x.z);
        y.normalize();const z=x.clone().cross(y).normalize();y.copy(z).cross(x).normalize();
        actor.hands[side].quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
        actor.handThumbUp[side]=y.y;
      }
      actor.mesh.updateMatrixWorld(true);
    };
  }
  installFightFace(lei,'lei');installFightFace(hong,'hong');
}

function localPoint(world,s){
  const x=world.x-s.rootX,z=world.z-s.rootZ,c=Math.cos(s.yaw),n=Math.sin(s.yaw);
  return V(c*x-n*z,world.y,n*x+c*z);
}
function worldPoint(local,s){
  const c=Math.cos(s.yaw),n=Math.sin(s.yaw);
  return V(s.rootX+c*local.x+n*local.z,local.y+(s.air??0),s.rootZ-n*local.x+c*local.z);
}

// Feet are authored in world space during support; shoulders share the torso transform.
function solve(actor,s,d){
  const feet={};
  for(const [side,sign] of [['left',-1],['right',1]]){
    feet[side]=s.feetWorld?localPoint(s.feetWorld[side],s):s.feetLocal[side];
  }
  let hip=s.hip;
  for(const [side,sign] of [['left',-1],['right',1]]){
    const f=feet[side],dx=f.x-sign*d.pelvis,dz=f.z;
    const horizontal=dx*dx+dz*dz;
    if(horizontal>=(d.leg*2-.012)**2)throw new Error('Fight trial step exceeds leg reach');
    hip=Math.min(hip,f.y+Math.sqrt((d.leg*2-.012)**2-horizontal));
  }
  const torsoMatrix=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(s.tilt??0,s.twist??0,s.roll??0));
  const pivot=new THREE.Vector3(0,d.hip,0),rp=pivot.clone().applyMatrix4(torsoMatrix);
  const offset=new THREE.Vector3(-rp.x,hip-rp.y,-rp.z);
  const torso=p=>new THREE.Vector3(p.x,p.y,p.z).applyMatrix4(torsoMatrix).add(offset);
  const p={rootX:s.rootX,rootZ:s.rootZ,yaw:s.yaw,bob:hip-d.hip,
    headYaw:s.headYaw??0,headPitch:s.headPitch??0,headRoll:s.headRoll??0,
    fist:s.fist??1,open:s.open??0,point:0,lean:0,torsoMatrix,torsoTranslation:offset};
  let maxReachError=0;
  for(const [side,sign] of [['left',-1],['right',1]]){
    const start=V(sign*d.pelvis,hip,0),foot=feet[side];
    p[side+'Leg']=[start,twoBone(start,foot,V(0,0,1),d.leg,d.leg),foot];
    const shoulder=torso(V(sign*d.half,d.shoulder,0));
    const target=s[side+'World']?new THREE.Vector3(...Object.values(localPoint(s[side+'World'],s))):torso(s[side]);
    const delta=target.clone().sub(shoulder),max=d.upper+d.lower-.005;
    maxReachError=Math.max(maxReachError,delta.length()-max);
    if(delta.length()>max)target.copy(shoulder).add(delta.setLength(max));
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.4,-.5,-.65),d.upper,d.lower),target];
    p[side+'FootPitch']=s[side+'FootPitch']??0;
    p[side+'FootYaw']=s[side+'FootYaw']??0;
  }
  actor.mesh.position.y=s.air??0;actor.setPose(p);actor.mesh.visible=s.visible!==false;
  actor.fightAct=s.face;
  if(actor.setArmorState){actor.setArmorState(s.armorT??0,s.shieldT??0);actor.setEtch(s.etchT??0);}
  if(actor.setGauntlet){actor.setGauntlet(s.gauntletT??1);actor.horn.forEach(h=>h.visible=!s.hornBroken);}
  return {p,maxReachError,hip,feet:Object.fromEntries(Object.entries(feet).map(([k,f])=>[k,worldPoint(f,s)])),
    wrist:worldPoint(p.rightArm[2],s)};
}

export function fightPoseAt(lei,hong,entries,t){
  const entry=entries.findLast(e=>e.startTime<=t)??entries[0],opts=entry.storyEvents[0].options;
  if(['hong_laugh','first_mark','hook'].includes(opts.move))return aftermathAt(lei,hong,entries,t,entry,opts);
  if(opts.move!=='will_up'){
    lei.fightAct=null;hong.fightAct=null;
    return poseAt(lei,hong,entries,t);
  }
  const duration=entry.endTime-entry.startTime,dt=t-entry.startTime,u=clamp(dt/duration);
  const hit=duration*.72,rel=dt-hit;
  const uncover=ramp(dt,.15,1.35),resolve=ramp(dt,1.35,2.55);
  const coil=ramp(dt,hit-1.0,hit-.28),strike=ramp(dt,hit-.23,hit);
  const recover=ramp(dt,hit+.18,hit+1.28);
  const rootX=mix(-.5,.015,strike),rootZ=mix(-2,-2.17,strike);
  const faceSet=ramp(dt,.85,2.35);
  const sl={rootX,rootZ,yaw:1.86,hip:.85-.14*(1-uncover)-.12*coil+.07*strike,
    tilt:mix(.12,-.08,uncover)-.08*coil+.27*strike-.11*recover,
    twist:-.27*coil+.43*strike-.12*recover,roll:.055*coil-.09*strike+.035*recover,
    headPitch:mix(.30,-.085,resolve)+.18*pulse(dt,.55,1.20,1.85),
    headYaw:.16*pulse(dt,.55,1.10,1.90)-.10*resolve,headRoll:.045*(1-faceSet),
    fist:mix(.65,1,resolve),armorT:ramp(dt,duration*.35,duration*.60),shieldT:0,
    left:blend(V(-.16,1.52,.16),V(-.15,1.35,.22),uncover),
    right:blend(V(.12,1.42,.28),V(.17,1.29,.14),uncover),
    face:{fear:1-faceSet,focus:faceSet,gazeX:-.36*pulse(dt,.50,1.05,1.8),
      gazeY:.45*pulse(dt,.50,1.05,1.8),squint:.12*resolve+.20*coil,
      blink:pulse(dt,1.73,1.80,1.91),browAsym:.16*(1-strike),mouthTension:.7*resolve},
    feetWorld:{left:V(-.36,.085,-2.16),right:V(-.70,.085,-1.94)}};
  sl.right=blend(sl.right,V(.17,1.21,-.12),coil);
  sl.left=blend(sl.left,V(-.17,1.40,.18),coil);
  const frontStep=ramp(dt,hit-.38,hit-.02),backStep=ramp(dt,hit-.20,hit+.12);
  sl.feetWorld.left=V(mix(-.36,.23,frontStep),.085+.11*Math.sin(Math.PI*frontStep),mix(-2.16,-2.29,frontStep));
  sl.feetWorld.right=V(mix(-.70,-.32,backStep),.085+.085*Math.sin(Math.PI*backStep),mix(-1.94,-2.0,backStep));
  sl.rightFootPitch=-.35*pulse(dt,hit-.34,hit-.20,hit+.12);
  // Contact target lies on the visible chest surface; wrist stops one fist length behind it.
  const contact=V(.38,1.185,-2.33),direction=new THREE.Vector3(Math.sin(sl.yaw),0,Math.cos(sl.yaw));
  const contactWrist=V(contact.x-direction.x*.052,contact.y,contact.z-direction.z*.052);
  if(strike>0){
    const relaxed=V(.19,1.31,.18),follow=blend(V(.08,1.38,.32),relaxed,recover);
    const reach=ramp(dt,hit-.17,hit);
    // Blend in world space from a torso-relative wind-up wrist computed by the same solver.
    const tempRotation=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(sl.tilt,sl.twist,sl.roll));
    const pivot=new THREE.Vector3(0,LEI.hip,0),offset=new THREE.Vector3(0,sl.hip,0).sub(pivot.clone().applyMatrix4(tempRotation));
    const armLocal=new THREE.Vector3(sl.right.x,sl.right.y,sl.right.z).applyMatrix4(tempRotation).add(offset);
    const windupWorld=worldPoint(armLocal,sl);
    sl.rightWorld=blend(windupWorld,contactWrist,reach);
    if(recover>0){
      const local=new THREE.Vector3(follow.x,follow.y,follow.z).applyMatrix4(tempRotation).add(offset);
      sl.rightWorld=blend(contactWrist,worldPoint(local,sl),recover);
    }
    sl.left=blend(sl.left,V(-.19,1.16,-.035),strike*(1-.65*recover));
  }
  const travel=ramp(dt,hit+.085,hit+.74),settle=ramp(dt,hit+.52,hit+.88);
  const airborne=rel>.085&&rel<.74?.42*Math.sin(Math.PI*clamp((rel-.085)/.655)):0;
  const shock=pulse(dt,hit-.015,hit+.035,hit+.55);
  const sh={rootX:mix(.55,2.85,travel),rootZ:mix(-2.35,-2.85,travel),yaw:-1.50,
    hip:mix(.94,.22,settle)-.035*pulse(dt,hit+.71,hit+.81,hit+1.03),
    air:airborne,tilt:.10-.44*ramp(dt,hit,hit+.13)+.30*ramp(dt,hit+.60,hit+1.13),
    twist:.06-.18*shock,roll:-.08*shock,
    headPitch:.07-.32*shock+.13*settle,headYaw:.06,headRoll:.12*shock,
    fist:1-ramp(dt,hit,hit+.16),open:.6*ramp(dt,hit,hit+.16),gauntletT:1-.45*ramp(dt,hit+.04,hit+.15),
    hornBroken:rel>=.055,face:{fear:ramp(dt,hit,hit+.08),focus:1-ramp(dt,hit-.26,hit+.08),
      gazeX:0,gazeY:-.03,pupil:1-.35*shock,blink:.6*pulse(dt,hit+.68,hit+.73,hit+.83),
      browAsym:.2*shock,jawOverride:.48*shock,mouthTension:1-shock},
    left:blend(V(-.27,1.37,.19),V(-.35,1.39,.24),shock),
    right:blend(blend(V(.32,1.33,.32),V(.32,1.52,-.28),ramp(dt,hit-1.15,hit-.3)),V(.35,1.38,.27),shock),
    feetLocal:{left:V(-.12,.10,.08),right:V(.12,.10,-.10)}};
  sh.left=blend(sh.left,V(-.28,1.27,.18),settle);sh.right=blend(sh.right,V(.28,1.30,.20),settle);
  sh.feetLocal.left=blend(sh.feetLocal.left,V(-.17,.10,.64),ramp(dt,hit+.18,hit+.70));
  sh.feetLocal.right=blend(sh.feetLocal.right,V(.17,.10,.59),ramp(dt,hit+.24,hit+.75));
  const l=solve(lei,sl,LEI),h=solve(hong,sh,HONG);
  const impactFist=V(l.wrist.x+direction.x*.052,l.wrist.y,l.wrist.z+direction.z*.052);
  return {entry,i:entries.indexOf(entry),opts,phase:opts.move,dt,u,sl,sh,pL:l.p,pH:h.p,
    trial:{hitTime:entry.startTime+hit,landTime:entry.startTime+hit+.74,contact,rel,
      contactError:Math.hypot(impactFist.x-contact.x,impactFist.y-contact.y,impactFist.z-contact.z),
      leiWrist:l.wrist,leiFeet:l.feet,hongFeet:h.feet,leiHip:l.hip,hongHip:h.hip,
      reachClamp:{lei:l.maxReachError,hong:h.maxReachError}}};
}

function authoredWorld(point,s,d){
  const m=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(s.tilt??0,s.twist??0,s.roll??0));
  const offset=new THREE.Vector3(0,s.hip,0).sub(new THREE.Vector3(0,d.hip,0).applyMatrix4(m));
  return worldPoint(new THREE.Vector3(point.x,point.y,point.z).applyMatrix4(m).add(offset),s);
}

// Continue the accepted landing positions through the following dialogue and exit.
function aftermathAt(lei,hong,entries,t,entry,opts){
  const will=entries.find(e=>e.storyEvents[0].options.move==='will_up');
  const base=fightPoseAt(lei,hong,entries,will.endTime);
  const sl=base.sl,sh=base.sh,dt=t-entry.startTime,u=clamp(dt/(entry.endTime-entry.startTime));
  const elapsed=t-entries[entries.indexOf(will)+1].startTime,relax=ramp(elapsed,0,.65);
  sl.left=blend(sl.left,V(-.19,1.05,.12),relax);
  sl.rightWorld=blend(base.trial.leiWrist,authoredWorld(V(.22,1.12,.14),sl,LEI),relax);
  sl.headPitch=mix(sl.headPitch,.12,relax);sl.headYaw=mix(sl.headYaw,-.04,relax);
  sl.fist=mix(1,.45,relax);
  sl.face={fear:.20*relax,focus:.7-.4*relax,gazeX:0,gazeY:.08*relax,mouthTension:.4};
  sh.face=null;sh.emotion=opts.move==='hong_laugh'&&u<.3?'laugh':'determined';
  sh.headPitch=mix(sh.headPitch,-.13,relax);sh.headRoll=.025*Math.sin(dt*3)*relax;
  sh.tilt+=.012*Math.sin(dt*4)*relax;
  if(opts.move==='first_mark'||opts.move==='hook'){
    const a=opts.move==='first_mark'?ramp(dt,0,.4):1;
    sl.left=blend(sl.left,V(.04,1.20,.28),a);sl.headPitch=mix(sl.headPitch,.38,a);sl.headYaw=mix(sl.headYaw,-.22,a);
    sl.open=.3*a;sl.fist*=1-a;sl.etchT=opts.move==='first_mark'?clamp((u-.25)/.3):1;
    sl.face={fear:.8*a,focus:.1,gazeX:-.2*a,gazeY:.45*a,mouthTension:.1};
  }
  if(opts.move==='hook'){
    const stand=ramp(dt,0,1.1),walk=ramp(dt,1.1,4.9);
    sh.hip=mix(.22,.94,stand);sh.tilt=.23*pulse(dt,0,.5,1.1);
    sh.feetLocal.left=blend(V(-.17,.10,.64),V(-.12,.10,.02),stand);
    sh.feetLocal.right=blend(V(.17,.10,.59),V(.12,.10,-.07),stand);
    sh.rootX=mix(2.85,9.5,walk);sh.rootZ=mix(-2.85,-1.5,walk);sh.yaw=mix(-1.5,1.4,ramp(dt,1.1,1.9));
    if(walk>0&&walk<1){ // 距离驱动步态，与根位移同源（不再同相滑步）
      const gait=gaitFeet({from:[2.85,-2.85],to:[9.5,-1.5]},sh.rootX,sh.rootZ,sh.yaw,HONG.pelvis,HONG.foot,HONG.leg*2*.68);
      sh.feetLocal.left=V(gait.left.x,gait.left.y,gait.left.z);
      sh.feetLocal.right=V(gait.right.x,gait.right.y,gait.right.z);
      sh.hip+=gait.hipDelta;
      sh.leftFootPitch=gait.left.pitch;sh.rightFootPitch=gait.right.pitch;
      const armSwing=.16*Math.sin(2*Math.PI*gait.g); // 摆臂与步态反相
      sh.left=V(sh.left.x,sh.left.y,sh.left.z+armSwing);sh.right=V(sh.right.x,sh.right.y,sh.right.z-armSwing);
    }
    sh.visible=u<.85;
  }
  const l=solve(lei,sl,LEI),h=solve(hong,sh,HONG);
  return {entry,i:entries.indexOf(entry),opts,phase:opts.move,dt,u,sl,sh,pL:l.p,pH:h.p,aftermath:true};
}

export function fightCamera(state){
  if(state.aftermath){
    if(state.phase==='hong_laugh')return {pos:[1.5,1.03,-4.05],look:[2.85,.84,-2.85],fov:35};
    if(state.phase==='first_mark')return {pos:[1.4,1.43,-3.50],look:[.015,1.25,-2.17],fov:34};
  }
  if(!state.trial)return null;
  const {trial}=state;
  // Read the decision in close-up, then show both bodies before acceleration and contact.
  if(trial.rel<-.90)return {pos:[.88,1.61,-3.28],look:[-.49,1.43,-2.03],fov:32};
  return {pos:[.15,1.50,-6.20],look:[1.02,1.02,-2.34],fov:43};
}
