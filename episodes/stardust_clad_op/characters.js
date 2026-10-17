// 《星屑战壳》OP 程序化角色：AoaoCraft（平底锅座，瘦高热血，橙铜甲+青绿接缝）/
// XiaozaoCraft（漏勺座，纤细冷面，青银甲）/ DafuCraft（汤釜座，高壮坦克，铁灰+暖铜）。
// 模式抄 bio_armor_academy_s1e2 characters.js：mesh(Group)→body(Group)→LimbSurface 四肢
// +ArticulatedHand+animatedHead（dula-assets bioarmor 正本）；铠甲生长=分段 scale 蔓延
// clamp(t*N-i*.8) + 生长前锋环 + 加色混合接缝光行波（纯 (t,state) 确定函数，seek 安全）。
import * as THREE from 'three';
import {LimbSurface,ringsGeometry,mesh,mat,jointInk,shoeGeometry} from 'dula-assets/lib/craft3d/surface.js';
import {ArticulatedHand} from 'dula-assets/lib/craft3d/hand.js';
import {animatedHead} from 'dula-assets/characters/bioarmor/character_look.js';
import {skinMaterial} from 'dula-assets/characters/bioarmor/character_finish.js';

const V=p=>new THREE.Vector3(p.x,p.y,p.z??0);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;
// 接缝/生长环用加色混合独立材质（每缝一条，行波逐条调透明度）
const seamMat=color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});

// ── 少年体型底盘（三人共用骨架，比例/配色由 opts 拉开梯队）──────────────
// opts: {kind(animatedHead 脸型), headHeight, torso, leg, arm, sleeve, pants, shoe, shoeScale, handScale}
function boyBase(name,opts){
  const o={mesh:new THREE.Group(),limbs:{},hands:{},feet:{}};
  o.mesh.name=name;o.body=new THREE.Group();o.mesh.add(o.body);
  const skin=skinMaterial(opts.kind),sleeve=opts.sleeve,pants=opts.pants;
  for(const [side,sign] of [['left',-1],['right',1]]){
    o.limbs[side+'Leg']=new LimbSurface(o.mesh,pants,opts.leg,{depth:.94});
    const shoe=new THREE.Group();o.mesh.add(shoe);o.feet[side]=shoe;
    mesh(shoe,shoeGeometry(),opts.shoe).scale.setScalar(opts.shoeScale);
    const sole=mesh(shoe,shoeGeometry(),'#221f26');sole.scale.set(opts.shoeScale,.13,opts.shoeScale);sole.position.y=-.08447*opts.shoeScale;
    // 战壳使底装：长袖连体作战服（手臂全袖，免袖根修型）
    o.limbs[side+'Arm']=new LimbSurface(o.mesh,sleeve,opts.arm,{depth:.9});
    const hand=new ArticulatedHand(sign,skin,jointInk);hand.scale.setScalar(opts.handScale);
    o.mesh.add(hand);o.hands[side]=hand;
  }
  o.torso=mesh(o.body,ringsGeometry(opts.torso),sleeve);
  // 领口收边
  const collar=mesh(o.body,new THREE.TorusGeometry(opts.collar,.012,6,24),'#26222c',false);
  collar.position.set(0,opts.torso.at(-1)[0]-.005,0);collar.rotation.x=Math.PI/2;
  o.face=animatedHead(o.body,opts.kind,opts.headHeight);
  o.headGroup=o.face.head;o.mouth=o.face.mouth;
  return o;
}

// ── 战壳生长公共件 ─────────────────────────────────────────────────
// cladPart：{g(分段组), ring(前锋环), seams:[接缝]}，setCladState 分段蔓延
function makeCladPart(parent,ringR,color){
  const g=new THREE.Group();parent.add(g);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(ringR,.005,6,28),seamMat(color));
  ring.visible=false;g.add(ring);
  return {g,ring,seams:[],ringR};
}
function seamRing(part,color,r,tube,z,rx=Math.PI/2){
  const s=new THREE.Mesh(new THREE.TorusGeometry(r,tube,6,24),seamMat(color));
  s.position.z=z;s.rotation.x=rx;part.g.add(s);part.seams.push(s);return s;
}
function applyCladState(parts,t){
  const N=parts.length;
  for(const [i,p] of parts.entries()){
    const a=clamp(t*N-i*.8);
    p.g.visible=a>.001;p.g.scale.setScalar(Math.max(a,.001));
    for(const s of p.seams)s.visible=a>.55;
  }
}
function cladFX(parts,t,cladT,colorHi){
  const growing=cladT>.02&&cladT<.98,spd=growing?9:2.6,N=parts.length;
  for(const [i,p] of parts.entries()){
    const a=clamp(cladT*N-i*.8);
    p.ring.visible=a>.02&&a<.98;
    if(p.ring.visible){p.ring.scale.setScalar(1+.18*Math.sin(t*11));
      p.ring.material.opacity=.5+.5*Math.max(0,Math.sin(t*11));}
    for(const [k,s] of p.seams.entries()){if(!s.visible)continue;
      const crest=Math.max(0,Math.sin(t*spd-(i+k*.5)*.95));
      s.material.opacity=.52+.48*crest; // 保底亮度抬高：群像远景也读得出接缝光
      if(colorHi)s.material.color.set(s.material.userData.base??(s.material.userData.base=s.material.color.getHex())).lerp(colorHi,crest*.5);}
  }
}
// 前臂 rig（肘→腕对齐）：护腕/盾牌挂这里，随 twoBone 手臂走
function forearmRig(host){
  const rig=new THREE.Group();host.mesh.add(rig);
  return {rig,align(elbow,wrist){
    rig.position.copy(V(elbow));
    rig.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),V(wrist).sub(V(elbow)).normalize());
  }};
}

// ── 阿鏊（平底锅座）：圆盘胸甲+铆钉 → 肩甲 → 护腕 → 左臂锅盖圆盾 ──────────
export class AoaoCraft{
  constructor(){
    const o=boyBase('AoaoCraft',{kind:'lei',headHeight:1.51,collar:.062,
      torso:[[.80,.120,.090],[.90,.133,.096],[1.00,.136,.098],[1.10,.120,.086],[1.20,.132,.094],[1.32,.142,.100],[1.40,.124,.086],[1.47,.060,.054]],
      leg:[[0,.082],[.25,.069],[.55,.053],[.8,.044],[1,.039]],
      arm:[[0,.050],[.3,.046],[.6,.036],[1,.028]],
      sleeve:'#4a3626',pants:'#33302e',shoe:'#3a332c',shoeScale:1,handScale:.80});
    Object.assign(this,o);
    const COPPER='#c87b32',COPPER_D='#9a5c22',SEAM='#3dffc8';
    const parts=this.cladParts=[];
    // 0 胸甲：正面微凸圆盘 + 铆钉圈 + 接缝环
    {
      const p=makeCladPart(this.body,.20,SEAM);p.g.position.set(0,1.29,.075);
      mesh(p.g,new THREE.SphereGeometry(1,28,18),COPPER).scale.set(.16,.19,.062);
      mesh(p.g,new THREE.TorusGeometry(.155,.012,8,32),COPPER_D).position.z=.048;
      for(let i=0;i<8;i++){const a=i/8*TAU;
        mesh(p.g,new THREE.SphereGeometry(.009,8,6),COPPER_D,false)
          .position.set(Math.cos(a)*.155,Math.sin(a)*.155,.058);}
      seamRing(p,SEAM,.115,.004,.060,0);
      parts.push(p);
    }
    // 1 肩甲一对（小圆盖）
    for(const sign of [-1,1]){
      const p=makeCladPart(this.body,.10,SEAM);p.g.position.set(sign*.155,1.44,0);
      mesh(p.g,new THREE.SphereGeometry(1,20,12,0,TAU,0,Math.PI*.55),COPPER).scale.set(.095,.06,.095);
      seamRing(p,SEAM,.088,.0035,0);p.seams[0].position.y=.012;
      parts.push(p);
    }
    // 2/3 护腕（双前臂 rig，两段环带+接缝）
    this.rigs={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      const r=this.rigs[side]=forearmRig(this);
      const p=makeCladPart(r.rig,.062,SEAM);
      for(const z of [.03,.10]){
        const band=mesh(p.g,new THREE.CylinderGeometry(.052,.056,.05,14),COPPER);
        band.rotation.x=Math.PI/2;band.position.z=z;
      }
      seamRing(p,SEAM,.054,.0035,.065);
      parts.push(p);
    }
    // 4 锅盖圆盾（左臂）：浅穹顶 + 沿圈 + 背面握把
    {
      const p=makeCladPart(this.rigs.left.rig,.27,SEAM);
      // 半球帽压扁成浅穹顶，rotation.z 把球帽轴（局部+y）转到 -x（左前臂外侧）；
      // 盾面靠前腕侧（z .15）——格挡时拳程差的兜底（bite 探针锚它）
      const dome=mesh(p.g,new THREE.SphereGeometry(.26,28,14,0,TAU,0,Math.PI/2),COPPER);
      dome.scale.set(1,.32,1);dome.position.set(-.085,0,.15);dome.rotation.z=Math.PI/2;
      this.shieldDome=dome; // 格挡接触点/探针锚
      const rim=mesh(p.g,new THREE.TorusGeometry(.235,.013,8,36),COPPER_D);
      rim.position.set(-.092,0,.15);rim.rotation.y=Math.PI/2;
      const grip=mesh(p.g,new THREE.BoxGeometry(.02,.10,.024),COPPER_D,false);
      grip.position.set(-.055,0,.11);
      const s=new THREE.Mesh(new THREE.TorusGeometry(.15,.004,6,28),seamMat(SEAM));
      s.position.set(-.098,0,.15);s.rotation.y=Math.PI/2;p.g.add(s);p.seams.push(s);
      parts.push(p);
    }
    this.cladColorHi=new THREE.Color('#d8fff2');
    this.setCladState(0);
  }
  setCladState(t){applyCladState(this.cladParts,t);}
  updateCladFX(t,cladT){cladFX(this.cladParts,t,cladT,this.cladColorHi);}
  setEmotion(e,b){this.face.setEmotion(e,b);}
  setPose(p){
    this.mesh.position.x=p.rootX;this.mesh.position.z=p.rootZ??0;this.mesh.rotation.y=p.yaw;
    this.body.position.y=p.bob;this.body.rotation.x=p.lean??0;
    this.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.limbs[side+'Leg'].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.position.copy(V(arm[2]));
      hand.setGesture({fist:p.fist??0,open:p.open??0,point:p.point??0});
      this.feet[side].position.copy(V(leg[2]));
      this.feet[side].rotation.set(p[side+'FootPitch']??0,p[side+'FootYaw']??0,0);
      this.rigs[side].align(arm[1],arm[2]);
    }
    this.mesh.updateMatrixWorld(true);
  }
}

// ── 小凿（漏勺座）：窄胸板 → 窄肩甲 → 漏勺纹护腕（圆片打孔阵）──────────────
export class XiaozaoCraft{
  constructor(){
    const o=boyBase('XiaozaoCraft',{kind:'aoi',headHeight:1.40,collar:.056,
      torso:[[.74,.108,.082],[.85,.120,.088],[.95,.124,.090],[1.05,.108,.078],[1.15,.118,.086],[1.26,.128,.092],[1.33,.112,.078],[1.40,.054,.050]],
      leg:[[0,.072],[.25,.061],[.55,.048],[.8,.040],[1,.035]],
      arm:[[0,.044],[.3,.040],[.6,.032],[1,.025]],
      sleeve:'#2e3a44',pants:'#262c34',shoe:'#242a30',shoeScale:.92,handScale:.74});
    Object.assign(this,o);
    const SILVER='#b8d2e0',SILVER_D='#7e98a8',SEAM='#8fe4ff';
    const parts=this.cladParts=[];
    // 0 窄胸板（竖条甲片，冷面役的克制甲量）+ 青绿 emissive 接缝椭圆环
    {
      const p=makeCladPart(this.body,.14,SEAM);p.g.position.set(0,1.17,.085);
      mesh(p.g,new THREE.BoxGeometry(.11,.30,.026),SILVER);
      mesh(p.g,new THREE.BoxGeometry(.15,.05,.03),SILVER_D).position.y=.14;
      const s=new THREE.Mesh(new THREE.BoxGeometry(.012,.28,.004),seamMat(SEAM));
      s.position.z=.015;p.g.add(s);p.seams.push(s);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.10,.004,6,28),seamMat(SEAM));
      ring.scale.set(.72,1.42,1);ring.position.z=.018;p.g.add(ring);p.seams.push(ring);
      parts.push(p);
    }
    // 1 窄肩甲一对（弧形薄片）
    for(const sign of [-1,1]){
      const p=makeCladPart(this.body,.09,SEAM);p.g.position.set(sign*.135,1.345,0);
      const plate=mesh(p.g,new THREE.CylinderGeometry(.08,.08,.055,14,1,false,-.8,1.6),SILVER);
      plate.position.y=.01;
      seamRing(p,SEAM,.082,.0035,0);p.seams[0].position.y=.038; // 上沿 emissive 包边
      const edge=new THREE.Mesh(new THREE.TorusGeometry(.082,.003,6,18,Math.PI),seamMat(SEAM));
      edge.rotation.x=Math.PI/2;edge.position.y=-.012;p.g.add(edge);p.seams.push(edge); // 下沿包边
      parts.push(p);
    }
    // 2/3 漏勺纹护腕：环带 + 圆形甲片（打孔阵=深色圆点阵贴片）
    this.rigs={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      const r=this.rigs[side]=forearmRig(this);
      const p=makeCladPart(r.rig,.06,SEAM);
      const band=mesh(p.g,new THREE.CylinderGeometry(.046,.050,.13,14),SILVER);
      band.rotation.x=Math.PI/2;band.position.z=.07;
      seamRing(p,SEAM,.049,.003,.02);seamRing(p,SEAM,.047,.003,.12);
      // 漏勺圆片（外侧）+ 打孔阵
      const disc=mesh(p.g,new THREE.CircleGeometry(.068,20),SILVER_D);
      disc.position.set(sign*.052,0,.08);disc.rotation.y=sign*Math.PI/2;
      if(side==='left')this.bracerDiscL=disc; // gag 接星屑锚点
      const holeMat=new THREE.MeshBasicMaterial({color:'#141c22'});
      for(const [hx,hz] of [[0,0],[.03,0],[-.03,0],[0,.03],[0,-.03],[.021,.021],[-.021,-.021]]){
        const h=new THREE.Mesh(new THREE.CircleGeometry(.0075,8),holeMat);
        h.position.set(sign*.0535,hz,.08+hx);h.rotation.y=sign*Math.PI/2;p.g.add(h);
      }
      parts.push(p);
    }
    this.cladColorHi=new THREE.Color('#e4f8ff');
    this.setCladState(0);
  }
  setCladState(t){applyCladState(this.cladParts,t);}
  updateCladFX(t,cladT){cladFX(this.cladParts,t,cladT,this.cladColorHi);}
  setEmotion(e,b){this.face.setEmotion(e,b);}
  setPose(p){
    this.mesh.position.x=p.rootX;this.mesh.position.z=p.rootZ??0;this.mesh.rotation.y=p.yaw;
    this.body.position.y=p.bob;this.body.rotation.x=p.lean??0;
    this.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.limbs[side+'Leg'].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.position.copy(V(arm[2]));
      hand.setGesture({fist:p.fist??0,open:p.open??0,point:p.point??0});
      this.feet[side].position.copy(V(leg[2]));
      this.feet[side].rotation.set(p[side+'FootPitch']??0,p[side+'FootYaw']??0,0);
      this.rigs[side].align(arm[1],arm[2]);
    }
    this.mesh.updateMatrixWorld(true);
  }
}

// ── 大釜（汤釜座）：厚胸甲 → 釜形半球大肩甲 → 厚护腕 ──────────────────────
export class DafuCraft{
  constructor(){
    const o=boyBase('DafuCraft',{kind:'hong',headHeight:1.66,collar:.096,
      torso:[[.92,.175,.122],[1.02,.190,.130],[1.12,.186,.125],[1.20,.175,.118],[1.34,.210,.142],[1.46,.212,.140],[1.54,.178,.120],[1.60,.096,.084]],
      leg:[[0,.108],[.25,.093],[.55,.071],[.8,.058],[1,.051]],
      arm:[[0,.070],[.3,.062],[.6,.050],[1,.040]],
      sleeve:'#33363c',pants:'#2c2e33',shoe:'#26242a',shoeScale:1.28,handScale:.95});
    Object.assign(this,o);
    const IRON='#707478',IRON_D='#4c5054',BRASS='#c98a4e',SEAM='#ffb35e';
    const parts=this.cladParts=[];
    // 0 厚胸甲（整面弧形胸板 + 暖铜包边）
    {
      const p=makeCladPart(this.body,.26,SEAM);p.g.position.set(0,1.28,.09);
      mesh(p.g,new THREE.SphereGeometry(1,28,18),IRON).scale.set(.225,.27,.11);
      mesh(p.g,new THREE.TorusGeometry(.20,.016,8,32),BRASS).position.z=.085;
      const belt=mesh(p.g,new THREE.TorusGeometry(.235,.014,8,32,Math.PI),BRASS);
      belt.position.set(0,-.16,.02);belt.rotation.x=-.35;
      seamRing(p,SEAM,.15,.007,.10,0); // 胸前暖铜 emissive 细环（统一接缝光语法）
      parts.push(p);
    }
    // 1 釜形大肩甲一对（半球罩，读成倒扣小釜）
    for(const sign of [-1,1]){
      const p=makeCladPart(this.body,.20,SEAM);p.g.position.set(sign*.245,1.585,0);
      mesh(p.g,new THREE.SphereGeometry(.165,22,12,0,TAU,0,Math.PI/2),IRON);
      mesh(p.g,new THREE.TorusGeometry(.165,.014,8,30),BRASS).rotation.x=Math.PI/2;
      // 釜耳小环
      mesh(p.g,new THREE.TorusGeometry(.03,.008,6,14),BRASS,false).position.set(0,.19,0);
      seamRing(p,SEAM,.15,.004,0);p.seams[0].position.y=.05;
      parts.push(p);
    }
    // 2/3 厚护腕（三段环带）
    this.rigs={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      const r=this.rigs[side]=forearmRig(this);
      const p=makeCladPart(r.rig,.075,SEAM);
      for(const [z,rr] of [[.03,.068],[.09,.064],[.15,.060]]){
        const band=mesh(p.g,new THREE.CylinderGeometry(rr,rr+.004,.05,14),z===.09?BRASS:IRON);
        band.rotation.x=Math.PI/2;band.position.z=z;
      }
      seamRing(p,SEAM,.066,.004,.06);seamRing(p,SEAM,.062,.004,.12);
      parts.push(p);
    }
    this.cladColorHi=new THREE.Color('#ffe8c8');
    this.setCladState(0);
  }
  setCladState(t){applyCladState(this.cladParts,t);}
  updateCladFX(t,cladT){cladFX(this.cladParts,t,cladT,this.cladColorHi);}
  setEmotion(e,b){this.face.setEmotion(e,b);}
  setPose(p){
    this.mesh.position.x=p.rootX;this.mesh.position.z=p.rootZ??0;this.mesh.rotation.y=p.yaw;
    this.body.position.y=p.bob;this.body.rotation.x=p.lean??0;
    this.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.limbs[side+'Leg'].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.position.copy(V(arm[2]));
      hand.setGesture({fist:p.fist??0,open:p.open??0,point:p.point??0});
      this.feet[side].position.copy(V(leg[2]));
      this.feet[side].rotation.set(p[side+'FootPitch']??0,p[side+'FootYaw']??0,0);
      this.rigs[side].align(arm[1],arm[2]);
    }
    this.mesh.updateMatrixWorld(true);
  }
}
