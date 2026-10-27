// M-07 程序化占位角色（T1）：90cm 圆桶机身、单只蓝白机械眼（光圈可缩放+发光+报警闪）、
// 三指左机械手、工具型右手、红色补丁肩甲、腹部修补板、左腿略短（恒定左倾体态+跛行重心下沉）。
// 自包含：只依赖 dula-assets craft3d（twoBone / locomotion）与本集 scenes/common.js。
// 姿势 spec：{rootX,rootZ,yaw,bob,lean,headYaw,headPitch,left,right,leftPole,rightPole,
//   gL(gesture curl 0..1),walk{from,to,facingYaw?,strideFactor?},sit{hipY,footY,footZ},visible}
// 纪律：setPose 是 (spec,t) 纯函数；每帧全字段写。
import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {createLocomotion} from 'dula-assets/lib/craft3d/locomotion.js';
import {toon,box,cyl,clamp,ease,mix} from '../scenes/common.js';

export const clampN=clamp;
const V=(x,y,z=0)=>({x,y,z});
const gait=createLocomotion({lift:.030,pitch:.14,turnLift:.026,sway:.010,hipDelta:.012,
  armSwingGain:.18,armSwingMax:.07,heelStrike:.22,toeOff:.18});

const TILT=.21;        // 短左腿恒定体态：机身向左倾（rotation.z 正=-x 侧下沉）
const HIP_DROP=.022;   // 左髋相对右髋下沉量（与 TILT 配套）

function limbMesh(r1,r2,c){
  const g=new THREE.Group();
  const upper=new THREE.Mesh(new THREE.CylinderGeometry(r1,r1,1,10),toon(c));
  const lower=new THREE.Mesh(new THREE.CylinderGeometry(r2,r2,1,10),toon(c));
  const joint=new THREE.Mesh(new THREE.SphereGeometry(r1*1.25,10,8),toon('#4a5563'));
  g.add(upper,lower,joint);
  const _a=new THREE.Vector3(),_b=new THREE.Vector3(),_d=new THREE.Vector3(),_up=new THREE.Vector3(0,1,0),_q=new THREE.Quaternion();
  const seg=(mesh,p0,p1)=>{
    _a.set(p0.x,p0.y,p0.z);_b.set(p1.x,p1.y,p1.z);_d.subVectors(_b,_a);
    const len=Math.max(.001,_d.length());
    mesh.position.copy(_a).addScaledVector(_d,.5);
    _q.setFromUnitVectors(_up,_d.normalize());mesh.quaternion.copy(_q);
    mesh.scale.set(1,len,1);
  };
  g.userData.update=(p0,p1,p2)=>{
    seg(upper,p0,p1);seg(lower,p1,p2);joint.position.set(p1.x,p1.y,p1.z);
  };
  return g;
}
// 手朝向：前臂轴→手局部基（+X 腕到指尖、+Y 拇指侧）；世界向上投影，近竖直备用轴。
const _x=new THREE.Vector3(),_y=new THREE.Vector3(),_z=new THREE.Vector3(),_m=new THREE.Matrix4();
function orient(obj,wrist,elbow,sign){
  _x.set(wrist.x-elbow.x,wrist.y-elbow.y,wrist.z-elbow.z).normalize();
  _y.set(0,1,0).addScaledVector(_x,-_x.y);
  if(_y.lengthSq()<.04)_y.set(0,0,1).addScaledVector(_x,-_x.z);
  _y.normalize();if(sign<0)_y.negate();
  _z.crossVectors(_x,_y).normalize();_y.crossVectors(_z,_x).normalize();
  obj.quaternion.setFromRotationMatrix(_m.makeBasis(_x,_y,_z));
  obj.position.set(wrist.x,wrist.y,wrist.z);
}

export function makeM07(){
  const mesh=new THREE.Group();mesh.name='M07';
  const dims={height:.90,hipIdle:.35,hipHalf:.085,shoulderHalf:.17,shoulderLocalY:.25,
    legAL:.125,legBL:.155,legAR:.165,legBR:.165,armA:.16,armB:.17,footY:.05,footX:.075};
  const body=new THREE.Group();mesh.add(body);
  // 圆桶机身（蓝灰）+ 腹部修补板（黄铜色）+ 红色补丁肩甲（左肩）
  const torso=cyl(.155,.165,.40,'#8fa3b8',0,.13,0,24);body.add(torso);
  body.add(box(.14,.18,.03,'#b89a6a',0,.08,.155));                        // 腹部修补板
  const chestPanel=box(.12,.10,.02,'#7e8fa2',.02,.10,.165);body.add(chestPanel); // 电池胸板(s22)
  body.add(box(.12,.06,.14,'#a23b32',-.17,.30,0));                         // 红色补丁肩甲（左）
  body.add(box(.05,.03,.10,'#7c8ea0',.17,.31,0));                          // 右肩原色
  // 机械眼炮塔：颈座 + 头组（俯仰/偏航）+ 眼壳 + 蓝白虹膜（光圈=scale）+ 眼框环
  body.add(cyl(.05,.06,.06,'#6e7f92',0,.345,0));
  const head=new THREE.Group();head.position.set(0,.40,0);body.add(head);
  head.add(box(.16,.13,.14,'#7e8fa2',0,.02,0));
  const eyeRing=new THREE.Mesh(new THREE.TorusGeometry(.052,.012,10,24),toon('#5c6c7e'));
  eyeRing.position.set(0,.03,.075);head.add(eyeRing);
  const iris=new THREE.Mesh(new THREE.CircleGeometry(.048,24),
    new THREE.MeshBasicMaterial({color:'#7fb2e8'}));
  iris.position.set(0,.03,.078);head.add(iris);
  const pupil=new THREE.Mesh(new THREE.CircleGeometry(.02,16),
    new THREE.MeshBasicMaterial({color:'#0e1a28'}));
  pupil.position.set(0,.03,.080);head.add(pupil);
  const eyeGlow=new THREE.PointLight(0x9fd0ff,0,1.6);eyeGlow.position.set(0,.03,.15);head.add(eyeGlow);
  const eyeAnchor=new THREE.Object3D();eyeAnchor.position.set(0,.03,.08);head.add(eyeAnchor);
  const chestAnchor=new THREE.Object3D();chestAnchor.position.set(.02,.10,.18);body.add(chestAnchor);
  const pocketAnchor=new THREE.Object3D();pocketAnchor.position.set(-.10,.02,.16);body.add(pocketAnchor);

  // 四肢（mesh 直接子级，由求解点驱动）
  const legL=limbMesh(.038,.032,'#7a8b9e'),legR=limbMesh(.038,.032,'#7a8b9e');
  const armL=limbMesh(.032,.027,'#8598ab'),armR=limbMesh(.032,.027,'#8598ab');
  mesh.add(legL,legR,armL,armR);
  // 左脚短一截的视觉签名：左脚加厚垫（补偿件）
  const footL=box(.09,.05,.15,'#5c6c7e'),footR=box(.09,.04,.15,'#5c6c7e');
  mesh.add(footL,footR);
  // 左手：掌 + 三指（扇形，curl 0..1）
  const handL=new THREE.Group();
  handL.add(box(.075,.05,.09,'#93a5b8',0,0,.02));
  const fingers=[];
  for(let i=0;i<3;i++){
    const f=new THREE.Group();f.position.set(-.028+i*.028,-.005,.06);
    const seg=new THREE.Mesh(new THREE.CylinderGeometry(.011,.009,.075,8),toon('#a8b8c8'));
    seg.rotation.x=Math.PI/2;seg.position.z=.037;f.add(seg);
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(.009,.007,.05,8),toon('#a8b8c8'));
    tip.rotation.x=Math.PI/2;tip.position.set(0,-.02,.085);f.add(tip);f.userData.tip=tip;
    handL.add(f);fingers.push(f);
  }
  mesh.add(handL);
  // 右手：工具型（腕座 + 可换头：钻咀/喷咀占位）
  const handR=new THREE.Group();
  handR.add(box(.06,.06,.08,'#7e8fa2',0,0,.02));
  handR.add(cyl(.012,.016,.09,'#c8a050',0,0,.10).rotateX(Math.PI/2));
  mesh.add(handR);

  const userData={
    dims,hands:{left:handL,right:handR},feet:{left:footL,right:footR},
    eyeAnchor,chestAnchor,pocketAnchor,headGroup:head,bodyGroup:body,limbs:{legL,legR,armL,armR},
    setEye({aperture=1,glow=0,alarm=false},t=0){
      const a=clamp(aperture,.3,1.2);
      iris.scale.setScalar(a);pupil.scale.setScalar(a);
      const c=alarm?(Math.sin(t*38)>0?new THREE.Color('#ff5040'):new THREE.Color('#5a1a14'))
        :new THREE.Color('#7fb2e8').lerp(new THREE.Color('#e8f6ff'),clamp(glow));
      iris.material.color.copy(c);
      eyeGlow.intensity=alarm?1.2:1.5*clamp(glow);
    },
    setChest(open01){chestPanel.rotation.y=-ease(clamp(open01))*1.2;},
    setGesture(side,curl){ // 左手三指蜷曲（右手工具无指）
      if(side!=='left')return;
      for(const f of fingers){f.rotation.x=ease(clamp(curl))*.9;f.userData.tip.rotation.x=Math.PI/2+ease(clamp(curl))*.8;}
    },
    setPose(spec,t=0){
      const d=dims,bob=spec.bob??0,lean=spec.lean??0;
      mesh.position.set(spec.rootX,0,spec.rootZ);mesh.rotation.y=spec.yaw??0;
      mesh.visible=spec.visible!==false;
      body.rotation.set(lean,0,TILT);
      body.position.set(0,(spec.sit?spec.sit.hipY:d.hipIdle+bob),-Math.sin(lean)*.1);
      head.rotation.set(spec.headPitch??0,spec.headYaw??0,0);
      body.updateMatrix();
      const BM=body.matrix;
      const shoulder=sign=>new THREE.Vector3(sign*d.shoulderHalf,d.shoulderLocalY,0).applyMatrix4(BM);
      const hipY=spec.sit?spec.sit.hipY:d.hipIdle+bob;
      const hipL=V(-d.hipHalf,hipY-HIP_DROP,0),hipR=V(d.hipHalf,hipY+HIP_DROP,0);

      let footTargets={left:V(-d.footX,d.footY,.02),right:V(d.footX,d.footY,.02)},loco=null;
      if(spec.sit){
        footTargets={left:V(-d.footX,spec.sit.footY,spec.sit.footZ),right:V(d.footX,spec.sit.footY,spec.sit.footZ)};
      }else if(spec.walk){
        const w=spec.walk,stride=(d.legAR+d.legBR)*1.25*(w.strideFactor??.7);
        const g=gait.walkingFeet(w,spec.rootX,spec.rootZ,spec.yaw??0,d.hipHalf,d.footY,stride);
        footTargets={left:V(g.left.x,g.left.y,g.left.z),right:V(g.right.x,g.right.y,g.right.z)};
        // 跛行签名：左支撑期（右摆动）重心额外下沉
        const moving=g.step%2===0?'left':'right';
        const limp=moving==='right'?.022*Math.sin(Math.PI*g.phase)**2:0;
        hipL.y+=g.hipDelta-limp;hipR.y+=g.hipDelta-limp;
        body.position.y+=g.hipDelta-limp;
        footL.rotation.set(g.left.pitch??0,g.left.yaw??0,0,'YXZ');
        footR.rotation.set(g.right.pitch??0,g.right.yaw??0,0,'YXZ');
        loco={kind:'walk',step:g.step,steps:g.steps,
          contacts:{left:{stance:g.left.stance},right:{stance:g.right.stance}}};
      }
      if(!spec.walk){footL.rotation.set(0,0,0);footR.rotation.set(0,0,0);}
      const p={locomotion:loco,bob};
      for(const [side,sign,hip,legA,legB,foot] of [['left',-1,hipL,d.legAL,d.legBL,footL],['right',1,hipR,d.legAR,d.legBR,footR]]){
        // 髋部高度可达性钳制（借 rig.js 思路：腿长不够就降髋，不让 twoBone 抛错）
        const f=footTargets[side],horiz=(f.x-hip.x)**2+f.z*f.z;
        const maxY=f.y+Math.sqrt(Math.max(.01,(legA+legB-.008)**2-horiz));
        if(hip.y>maxY)hip.y=maxY;
        const knee=twoBone(hip,f,V(0,0,1),legA,legB);
        (side==='left'?legL:legR).userData.update(hip,knee,f);
        foot.position.set(f.x,f.y-d.footY+(side==='left'?.025:.02),f.z+.04);
        p[side+'Leg']=[hip,knee,f];
      }
      for(const [side,sign] of [['left',-1],['right',1]]){
        const sh=shoulder(sign),tgt0=spec[side]??V(sign*.20,.42,.06);
        const tgt=V(tgt0.x,tgt0.y,tgt0.z);
        const dv=new THREE.Vector3(tgt.x-sh.x,tgt.y-sh.y,tgt.z-sh.z),maxR=d.armA+d.armB-.005;
        if(dv.length()>maxR){dv.setLength(maxR);Object.assign(tgt,V(sh.x+dv.x,sh.y+dv.y,sh.z+dv.z));}
        const pole=spec[side+'Pole']??V(sign*.4,-.35,-.4);
        const elbow=twoBone(V(sh.x,sh.y,sh.z),tgt,pole,d.armA,d.armB);
        (side==='left'?armL:armR).userData.update(V(sh.x,sh.y,sh.z),elbow,tgt);
        orient(side==='left'?handL:handR,tgt,elbow,sign);
        p[side+'Arm']=[V(sh.x,sh.y,sh.z),elbow,tgt];
      }
      return p;
    },
  };
  mesh.userData=userData;
  userData.setGesture('left',.15);
  return mesh;
}
