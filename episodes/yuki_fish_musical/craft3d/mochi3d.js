// MochiCraft3D — 年糕的三维工艺版，照 YukiCraft3D 的结构用 craft_trial 积木搭建
// （只读引用，不改 craft_trial）。句柄契约与 dula-assets Mochi / cel 表演桥逐一对齐：
// mesh / headGroup(0,.60,.22) / headBaseY=.60 / leftArm·rightArm(±.13,.30,.40) /
// leftLeg·rightLeg(±.17,.16,-.12) / tail(0,.38,-.34) / mouth(0,-.055,.225) /
// mouthBaseY=-.055 / leftEye·rightEye / leftEyelid·rightEyelid。
// 四肢与尾巴是组内局部空间的 LimbSurface（组旋转=资产 pivots，表演桥原样可用）；
// 眼睛/鼻/胡须/嘴线按 cel 口径用无描边 Basic 件（对应资产的 userData.noSketch）。
import * as THREE from 'three';
import {LimbSurface,ringsGeometry,mesh,ellipsoid,mat} from '/craft/character3d.js';

const C={fur:'#d98a3c',cream:'#fdf3e0',pink:'#e88a8a',dark:'#2a2020',amber:'#d8a028',rim:'#8a5a10'};
const basic=color=>new THREE.MeshBasicMaterial({color});
function raw(parent,geometry,material,{x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1}={}){
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);
  m.scale.set(sx,sy,sz);parent.add(m);return m;
}
// 猫耳：rings 锥（共享顶点、法线连续——cel-look 记录的 ConeGeometry 尖端炸线在这里不存在）
function earGeometry(radius,height){
  return ringsGeometry([[-height/2,radius,radius],[-height*.1,radius*.78,radius*.78],[height*.32,radius*.3,radius*.3],[height/2,.001,.001]]);
}

export class MochiCraft3D {
  constructor(){
    this.mesh=new THREE.Group();this.mesh.name='MochiCraft3D';
    // ── 胖球身（loaf）：环列向头颈收拢并封口（俯拍会看到身体内部，必须盖帽），头盖上来后身头一体 ──
    mesh(this.mesh,ringsGeometry([
      [.05,.28,.33],[.14,.335,.38],[.30,.335,.375],[.44,.295,.335],[.56,.235,.285],[.66,.14,.18],[.72,.07,.10],[.755,.001,.001]
    ]),C.fur);
    ellipsoid(this.mesh,[0,.27,.16],[.234,.195,.234],C.cream);          // 奶白肚皮
    // ── 头 ──
    const headGroup=this.headGroup=new THREE.Group();
    headGroup.position.set(0,.60,.22);this.headBaseY=.60;this.mesh.add(headGroup);
    ellipsoid(headGroup,[0,0,0],[.231,.1995,.1995],C.fur);
    ellipsoid(headGroup,[0,-.055,.14],[.1265,.0825,.077],C.cream);      // 吻部
    for(const side of [-1,1]){                                          // 耳 + 粉色耳芯
      mesh(headGroup,earGeometry(.065,.13),C.fur).position.set(side*.12,.19,.01);
      headGroup.children.at(-1).rotation.z=side*-.28;
      raw(headGroup,earGeometry(.035,.07),basic(C.pink),{x:side*.115,y:.175,z:.035,rz:side*-.28});
    }
    // ── 半睁恹眼（睫盖停在 45%，表演桥驱动 eyelid.scale.y）──
    for(const side of [-1,1]){
      const eye=new THREE.Group();eye.position.set(side*.085,.035,.165);headGroup.add(eye);
      raw(eye,new THREE.SphereGeometry(.047,20,20),basic(C.rim),{z:.004,sz:.45});
      raw(eye,new THREE.SphereGeometry(.045,20,20),basic(C.amber),{sz:.45});
      const pupil=raw(eye,new THREE.SphereGeometry(.016,12,12),basic(C.dark),{z:.028,sx:.6,sy:1.4,sz:.5});
      raw(eye,new THREE.SphereGeometry(.008,8,8),basic(0xfff8e0),{x:side*.012,y:.014,z:.028});
      const lidGeo=new THREE.SphereGeometry(.05,20,20,0,Math.PI*2,0,Math.PI*.5);
      const lid=raw(eye,lidGeo,mat(C.fur),{sx:1.05,sy:.55,sz:.5});
      if(side===-1){this.leftEye=eye;this.leftPupil=pupil;this.leftEyelid=lid;}
      else{this.rightEye=eye;this.rightPupil=pupil;this.rightEyelid=lid;}
    }
    raw(headGroup,new THREE.ConeGeometry(.014,.012,8),basic(C.pink),{y:-.025,z:.235,rx:Math.PI/2}); // 鼻
    // ω 笑线（songMouth 开合时表演桥把它隐藏，互斥）
    const mouth=this.mouth=new THREE.Group();mouth.position.set(0,-.055,.225);headGroup.add(mouth);
    this.mouthBaseY=mouth.position.y;
    for(const side of [-1,1]){
      const curve=new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side*.03,.008,0),new THREE.Vector3(side*.012,-.012,.004),new THREE.Vector3(0,0,.005));
      raw(mouth,new THREE.TubeGeometry(curve,8,.004,6,false),basic(C.dark));
    }
    for(const side of [-1,1])                                           // 眉位锚（毛色，表情系统契约）
      raw(headGroup,new THREE.CapsuleGeometry(.005,.03,4,6),mat(C.fur),{x:side*.085,y:.105,z:.17,rz:Math.PI/2+side*.1});
    const whiskerGeo=new THREE.CylinderGeometry(.002,.002,.17,6);       // 胡须 3 根/侧
    for(const side of [-1,1])for(let i=0;i<3;i++){
      const fan=(1-i)*.18;
      raw(headGroup,whiskerGeo,basic(C.cream),{x:side*.14,y:-.04+i*.022,z:.20,
        rz:side>0?-Math.PI/2-fan*side:Math.PI/2+fan*side});
    }
    // ── 前爪（契约里的 arms）：局部 LimbSurface + 掌垫 + 趾球 ──
    for(const [side,name] of [[-1,'leftArm'],[1,'rightArm']]){
      const group=new THREE.Group();group.position.set(side*.13,.30,.40);this.mesh.add(group);
      const paw=new LimbSurface(group,C.cream,[[0,.055],[.55,.055],[1,.048]],{depth:.9});
      paw.update([{x:0,y:0,z:0},{x:0,y:-.10,z:.005},{x:0,y:-.18,z:.01}]);
      ellipsoid(group,[0,-.188,.032],[.026,.010,.018],C.pink,false);    // 掌垫
      for(const tx of [-0.022,0,.022])
        ellipsoid(group,[tx,-.172,.042],[.013,.012,.012],C.cream,false);// 趾球
      this[name]=group;
    }
    // ── 后腿（loaf 下缘的短桩）──
    for(const [side,name] of [[-1,'leftLeg'],[1,'rightLeg']]){
      const group=new THREE.Group();group.position.set(side*.17,.16,-.12);this.mesh.add(group);
      const leg=new LimbSurface(group,C.fur,[[0,.068],[1,.058]],{depth:.95});
      leg.update([{x:0,y:0,z:0},{x:0,y:-.07,z:0},{x:0,y:-.13,z:.01}]);
      this[name]=group;
    }
    // ── 肥尾：局部 LimbSurface 弧 + 奶白尾尖，组级摇摆由表演桥驱动 ──
    const tail=this.tail=new THREE.Group();tail.position.set(0,.38,-.34);this.mesh.add(tail);
    const tailSurf=new LimbSurface(tail,C.fur,[[0,.05],[.6,.047],[1,.03]],{depth:1});
    tailSurf.update([{x:0,y:0,z:0},{x:0,y:.10,z:-.06},{x:0,y:.22,z:-.10}]);
    ellipsoid(tail,[0,.25,-.10],[.042,.042,.042],C.cream);
  }
}
