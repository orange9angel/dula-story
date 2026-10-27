// 《借走月光的女孩》共享姿势求解：站 / 走（walkingFeet 有限落脚）/ 坐。
// 骨架模式移植 late_beat_musical/performance.js 的 buildPose/buildWalkingPose
//（twoBone IK + walkingFeet，S1E3 已验收），新增坐姿分支（hipY 压到座面、膝极前上）。
// spec 字段：rootX rootZ yaw bob lean headYaw/Pitch/Roll left right leftPole rightPole
//   gL gR（手型 {fist,open,point}）walk{from,to,facingYaw?,noSwing?,strideFactor?}
//   sit{hipY,footY,footZ}（局部坐标：hipY=髋离 mesh 原点高，footY 可负=脚踩低位踏台）
import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {walkingFeet} from 'dula-assets/lib/craft3d/locomotion.js';

export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const mix=(a,b,u)=>a+(b-a)*u,V=(x,y,z=0)=>({x,y,z});
export const blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));

export function buildPose(actor,s,t,dims){
  const {hipIdle,shoulderY,shoulderHalf,hipHalf,legA,legB,armA,armB,footY}=dims;
  const hipY=s.sit?s.sit.hipY:(s.hipY??(hipIdle+(s.bob??0)));
  const p={rootX:s.rootX,rootZ:s.rootZ,yaw:s.yaw,bob:hipY-hipIdle,
    headYaw:s.headYaw??0,headPitch:s.headPitch??0,headRoll:s.headRoll??0,
    fist:0,open:0,point:0,lean:s.lean??0};
  if(s.walk)return buildWalkingPose(actor,s,t,dims,p);
  for(const [side,sign] of [['left',-1],['right',1]]){
    const foot=s.sit
      ?V(sign*(s.footX??.10),s.sit.footY,s.sit.footZ??.28)
      :(s[side+'Foot']??V(sign*(s.footX??.09),footY,.02)); // P5：逐脚覆盖（踏上星阶等非平放脚位）
    const pole=s.sit?V(0,.6,1):V(0,0,1); // 坐姿膝朝前上方
    p[side+'Leg']=[V(sign*hipHalf,hipY,0),null,foot];
    p[side+'Leg'][1]=twoBone(p[side+'Leg'][0],foot,pole,legA,legB);
  }
  const torsoOffset=hipY-hipIdle;
  for(const [side,sign] of [['left',-1],['right',1]]){
    const shoulder=leanShoulder(V(sign*shoulderHalf,shoulderY+torsoOffset,dims.shoulderZ??0),s.lean??0,hipY);
    const target=V(s[side].x,s[side].y+(s.bob??0),s[side].z);
    const delta=new THREE.Vector3(target.x-shoulder.x,target.y-shoulder.y,target.z-shoulder.z);
    const maxR=armA+armB-.005;
    if(delta.length()>maxR){delta.setLength(maxR);Object.assign(target,V(shoulder.x+delta.x,shoulder.y+delta.y,shoulder.z+delta.z));}
    const pole=s[side+'Pole']??V(sign*.25,-.65,-.5);
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,pole,armA,armB),target];
  }
  actor.setPose(p);
  // 站立/坐姿帧必须重置足踝旋转（走动跖屈/偏航残留=seek 不一致，S1E3 纪律）
  for(const foot of Object.values(actor.feet))foot.rotation.set(0,0,0);
  const gRest={fist:.12,open:0,point:0};
  actor.hands.left.setGesture({...gRest,...(s.gL??{})});
  actor.hands.right.setGesture({...gRest,...(s.gR??{})});
  actor.mesh.visible=s.visible!==false;
  return p;
}

function buildWalkingPose(actor,s,t,d,p){
  const half=d.hipHalf*1.2,heading=s.walk.facingYaw??Math.atan2(s.walk.to[0]-s.walk.from[0],s.walk.to[1]-s.walk.from[1]);
  const stride=(d.legA+d.legB)*1.25*(s.walk.strideFactor??d.strideFactor??.9);
  let gait=walkingFeet(s.walk,s.rootX,s.rootZ,s.yaw,half,d.footY,stride);
  const rootX=s.rootX+Math.cos(heading)*gait.sway,rootZ=s.rootZ-Math.sin(heading)*gait.sway;
  gait=walkingFeet(s.walk,rootX,rootZ,s.yaw,half,d.footY,stride);
  p.rootX=rootX;p.rootZ=rootZ;
  let hip=d.hipIdle+gait.hipDelta;
  for(const [side,sign] of [['left',-1],['right',1]]){
    const f=gait[side],horizontal=(f.x-sign*d.hipHalf)**2+f.z*f.z;
    hip=Math.min(hip,f.y+Math.sqrt(Math.max(.01,(d.legA+d.legB-.008)**2-horizontal)));
  }
  const twist=-gait.armSwing*.35,matrix=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0,twist,0));
  const pivot=new THREE.Vector3(0,d.hipIdle,0).applyMatrix4(matrix),offset=new THREE.Vector3(-pivot.x,hip-pivot.y,-pivot.z);
  const torso=v=>new THREE.Vector3(v.x,v.y,v.z).applyMatrix4(matrix).add(offset);
  p.torsoMatrix=matrix;p.torsoTranslation=offset;p.bob=hip-d.hipIdle;p.headYaw=(p.headYaw??0)-twist;
  p.locomotion={kind:'walk',step:gait.step,steps:gait.steps,
    contacts:Object.fromEntries(['left','right'].map(side=>[side,{stance:gait[side].stance,id:gait[side].contact}]))};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const foot=gait[side],start=V(sign*d.hipHalf,hip,0),end=V(foot.x,foot.y,foot.z);
    p[side+'Leg']=[start,twoBone(start,end,V(0,0,1),d.legA,d.legB),end];
    p[side+'FootPitch']=foot.pitch;p[side+'FootYaw']=foot.yaw;
    const shoulder=torso(V(sign*d.shoulderHalf,d.shoulderY,0)),hand={...s[side]};
    if(side==='right'&&!s.walk?.noSwing)hand.z+=gait.armSwing;
    const target=torso(hand),delta=target.clone().sub(shoulder),max=d.armA+d.armB-.005;
    if(delta.length()>max)target.copy(shoulder).add(delta.setLength(max));
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,s[side+'Pole']??V(sign*.25,-.65,-.5),d.armA,d.armB),target];
  }
  actor.setPose(p);actor.mesh.visible=s.visible!==false;
  for(const side of ['left','right'])actor.feet[side].rotation.set(p[side+'FootPitch']??0,p[side+'FootYaw']??0,0,'YXZ');
  const gRest={fist:.12,open:0,point:0};
  actor.hands.left.setGesture({...gRest,...(s.gL??{})});
  actor.hands.right.setGesture({...gRest,...(s.gR??{})});
  return p;
}

// 手朝向：前臂轴 → 手局部基（+X 腕到指尖、+Y 拇指侧、sign·Z 掌面）。
// 抬臂后别拿角色前向当拇指轴（S1E2 掌面反转翻车）：用世界上方向投影到前臂垂直面。
export function orientHand(hand,wrist,elbow,sign){
  const x=new THREE.Vector3(wrist.x-elbow.x,wrist.y-elbow.y,wrist.z-elbow.z).normalize();
  const up=new THREE.Vector3(0,1,0);
  let y=up.clone().addScaledVector(x,-up.dot(x));
  if(y.lengthSq()<.04)y=new THREE.Vector3(0,0,1).addScaledVector(x,-x.z); // 近竖直退化备用轴
  y.normalize();
  if(sign<0)y.negate(); // 左右手各自掌面符号
  const z=x.clone().cross(y).normalize();y.copy(z).cross(x).normalize();
  hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
  hand.position.set(wrist.x,wrist.y,wrist.z);
}

// lean（躯干前倾/鞠躬）绕髋部枢轴：肩锚点随躯干转（手臂根不脱节），手目标保持视觉语义。
// body 组原点在脚底，setPose 侧用旋转+平移合成同一枢轴（见 applyRigPose）。
export function leanShoulder(pt,lean,hipY){
  if(!lean)return pt;
  const c=Math.cos(lean),s=Math.sin(lean),dy=pt.y-hipY;
  return V(pt.x,hipY+dy*c-pt.z*s,dy*s+pt.z*c);
}

// 三角色共用的 setPose 主体：mesh 位置/yaw、body bob/lean（髋枢轴）、头、四肢、手朝向。
// 角色自带 extras（道具跟随）在各自 setPose 里追加。
export function applyRigPose(actor,p){
  actor.mesh.position.x=p.rootX;actor.mesh.position.z=p.rootZ??0;actor.mesh.rotation.y=p.yaw;
  const lean=p.lean??0,hipY=p.bob+actor.dims.hipIdle;
  actor.body.rotation.x=lean;
  actor.body.position.y=p.bob+hipY*(1-Math.cos(lean));
  actor.body.position.z=-hipY*Math.sin(lean);
  actor.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
  for(const [side,sign] of [['left',-1],['right',1]]){
    const arm=p[side+'Arm'],leg=p[side+'Leg'];
    actor.limbs[side+'Arm'].update(arm);actor.limbs[side+'Leg'].update(leg);
    orientHand(actor.hands[side],arm[2],arm[1],sign);
    actor.feet[side].position.set(leg[2].x,leg[2].y,leg[2].z);
  }
  actor.mesh.updateMatrixWorld(true);
}
