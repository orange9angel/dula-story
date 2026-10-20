import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {createLocomotion} from 'dula-assets/lib/craft3d/locomotion.js';
const V=(x,y,z)=>({x,y,z}),vec=p=>new THREE.Vector3(p.x,p.y,p.z);
export const clamp=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const mix=THREE.MathUtils.lerp;
export const pulse=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
export const blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));
const loco=createLocomotion({lift:.052,sway:.012,hipDelta:.007,armSwingMax:.11,heelStrike:.18,toeOff:.15});
export function neutral(a,x=0,z=0,yaw=0){
 const d=a.dimensions;
 return{rootX:x,rootZ:z,rootY:0,yaw,shoulderY:d.shoulderY,drop:.005,lean:0,twist:0,headYaw:0,headPitch:0,headRoll:0,
  left:V(-.18,d.shoulderY-.30,.09),right:V(.18,d.shoulderY-.30,.09),
  fist:.12,open:.20,point:0,focus:.25,fear:0,smile:0,blink:0,emotion:'neutral',
  stance:.12,feetZ:[.025,-.025],walk:null,wind:.5};
}
export function worldToActor(a,s,point){
 const q=vec(point).sub(new THREE.Vector3(s.rootX,s.rootY??0,s.rootZ));
 q.applyAxisAngle(new THREE.Vector3(0,1,0),-s.yaw).divide(a.mesh.scale);return q;
}
export function applyPose(a,s){
 const d=a.dimensions,feet={};
 let gait=null;
 if(s.walk&&Math.hypot(s.walk.to[0]-s.walk.from[0],s.walk.to[1]-s.walk.from[1])>.0001){
  // The shared walk solver uses actor-local metres, so transform the authored world path first.
  const sc=a.mesh.scale.x;
  const walk={...s.walk,from:s.walk.from.map(v=>v/sc),to:s.walk.to.map(v=>v/sc)};
  gait=loco.walkingFeet(walk,s.rootX/sc,s.rootZ/sc,s.yaw,s.stance,d.footY,d.legA*1.50);
  for(const side of['left','right']){
   const f=gait[side];f.z*=sc/a.mesh.scale.z;
   const old=f.pitch;f.pitch*=1-(s.walk.settle??0);
   f.y-=Math.sin(Math.abs(old))*(old<0?.08:.17);
   f.y+=Math.sin(Math.abs(f.pitch))*(f.pitch<0?.08:.17);
  }
 }
 const bodyAdvance=s.bodyAdvance??0;
 let hipY=d.footY+d.legA+d.legB-.010-s.drop+(s.air??0)+(gait?.hipDelta??0);
 for(const[side,sign]of[['left',-1],['right',1]]){
  const f=gait?gait[side]:{x:sign*s.stance,y:d.footY,z:s.feetZ[side==='left'?0:1],pitch:0,yaw:0,stance:true,contact:`hold-${side}`};
  feet[side]=V(f.x,f.y+(s.air??0),f.z);
  if(s.groundAt){
   const world=new THREE.Vector3(f.x*a.mesh.scale.x,0,f.z*a.mesh.scale.z).applyAxisAngle(new THREE.Vector3(0,1,0),s.yaw);
   feet[side].y+=(s.groundAt(world.x+s.rootX,world.z+s.rootZ)-(s.rootY??0))/a.mesh.scale.y;
  }
  if(s.feet?.[side])feet[side]={...s.feet[side]};
  hipY=Math.min(hipY,feet[side].y+Math.sqrt(Math.max(.02,(d.legA+d.legB-.003)**2-(feet[side].x-sign*d.hipHalf)**2-(feet[side].z-bodyAdvance)**2)));
 }
 const bob=hipY-d.hipIdle,q=new THREE.Quaternion().setFromEuler(new THREE.Euler(s.lean,s.twist,0,'YXZ'));
 const pivot=new THREE.Vector3(0,hipY,bodyAdvance),sourcePivot=new THREE.Vector3(0,hipY,0),transform=p=>vec(p).sub(sourcePivot).applyQuaternion(q).add(pivot);
 const p={rootX:s.rootX,rootZ:s.rootZ,yaw:s.yaw,bob,lean:0,headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll,
  fist:s.fist,open:s.open,point:s.point,capeLift:0,blink:s.blink,pelvisOffset:V(0,0,0)};
 let maxClamp=0;
 for(const[side,sign]of[['left',-1],['right',1]]){
  const ha=V(sign*d.hipHalf,hipY,bodyAdvance),ft=feet[side];
  p[side+'Leg']=[ha,twoBone(ha,ft,V(sign*.05,0,1),d.legA,d.legB),ft];
  const shoulder=transform(V(sign*d.shoulderHalf,d.shoulderY+bob,0));
  let target=transform(V(s[side].x,s[side].y+bob,s[side].z+(gait?(side==='left'?1:-1)*gait.armSwing:0)));
  if(s.worldHands?.[side])target=worldToActor(a,s,s.worldHands[side]);
  const delta=target.clone().sub(shoulder),length=delta.length(),max=d.armA+d.armB-.002;
  maxClamp=Math.max(maxClamp,Math.max(0,length-max));
  if(length>max)target.copy(shoulder).add(delta.setLength(max));
  p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.3,-.55,-.28),d.armA,d.armB),target];
  p[side+'FootPitch']=gait?.[side].pitch??0;p[side+'FootYaw']=gait?.[side].yaw??0;
 }
 const originalPivot=new THREE.Vector3(0,d.hipIdle,0);
 p.torsoQuaternion=q;p.torsoPosition=pivot.clone().sub(originalPivot.applyQuaternion(q));
 a.setCladState(1);a.setPose(p);a.mesh.position.y=s.rootY??0;
 a.mesh.updateMatrixWorld(true);
 return{maxClamp,feet:Object.fromEntries(['left','right'].map(side=>[side,{
  position:a.feet[side].getWorldPosition(new THREE.Vector3()).toArray(),
  quaternion:a.feet[side].getWorldQuaternion(new THREE.Quaternion()).toArray(),
  stance:gait?.[side].stance??true,contact:gait?.[side].contact??`hold-${side}`
 }]))};
}
export function updateFace(a,s,t,jaw=0,target=null){
 a.setEmotion(s.emotion,s.blink);
 a.face.setActing({smile:s.smile,focus:s.focus,fear:s.fear,blink:s.blink,browAsym:s.browAsym??.12,pupil:s.pupil??1});
 a.updateCladFX(t,1);a.updatePalaceClad(t,{LOCK:1e7,C7:1e7,SCAR:1e7});
 a.updateWindwardAppearance(t,s);
 if(target)a.face.lookAtWorld(target);
 a.mouth.apply({jaw,width:1});
}
