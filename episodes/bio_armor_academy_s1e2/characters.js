// 《9章》S1E2 程序化角色：LeiXiaoCraft（瘦削少年，殖装只在右臂，三态）/
// HongGangCraft（高壮力量型，右拳碎岩拳甲+独角仙叉角）/ ObserverCraft（远景剪影）。
// 复用 craft_trial 积木（/craft/ 挂载只读）：LimbSurface/ringsGeometry/twoBone/ArticulatedHand。
import * as THREE from 'three';
import {LimbSurface,ringsGeometry,mesh,ellipsoid,mat,jointInk,shoeGeometry} from '/craft/character3d.js';
import {ArticulatedHand} from '/craft/hand3d.js';
import {twoBone} from '/craft/pose3d.js';

const V=p=>new THREE.Vector3(p.x,p.y,p.z??0);
const phong=(color,shin=90,spec=0x9adfcf)=>new THREE.MeshPhongMaterial({color,shininess:shin,specular:spec});
const TEAL='#3DFFC8';

// ── 少年脸（CanvasTexture 前贴片；眨眼/情绪按 key 缓存重建）──────────────
function faceTexture({blink=0,emotion='neutral',skin='#f2d7c0'}){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d');c.fillStyle=skin;c.fillRect(0,0,512,512);
  const eye=(cx,open)=>{
    c.save();c.translate(cx,240);
    // 眼眶
    c.fillStyle='#fffdf6';c.beginPath();c.ellipse(0,0,34,30*open,0,0,Math.PI*2);c.fill();
    if(open>.15){
      // 淡褐色虹膜 + 瞳 + 高光
      c.fillStyle='#9a7a45';c.beginPath();c.ellipse(0,2,20,24*open,0,0,Math.PI*2);c.fill();
      c.fillStyle='#2e2620';c.beginPath();c.ellipse(0,3,9,13*open,0,0,Math.PI*2);c.fill();
      c.fillStyle='#fffef8';c.beginPath();c.ellipse(-6,-8*open,5,5,0,0,Math.PI*2);c.fill();
    }
    // 上睫线
    c.strokeStyle='#2e2620';c.lineWidth=5;c.lineCap='round';
    c.beginPath();c.moveTo(-36,-16*open);c.quadraticCurveTo(0,-30*open-4,36,-14*open);c.stroke();
    c.restore();
  };
  const open=1-blink*.96;
  eye(-56,open);eye(56,open);
  // 眉：情绪角度
  const brow=(sign)=>{
    const inner=emotion==='scared'||emotion==='worry'?-14:emotion==='determined'?10:0;
    const lift=emotion==='scared'?-6:emotion==='determined'?2:0;
    c.strokeStyle='#3a2c22';c.lineWidth=7;c.lineCap='round';
    c.beginPath();c.moveTo(sign*88,176+lift);c.quadraticCurveTo(sign*56,168+inner*.4,sign*26,176+inner+lift);c.stroke();
  };
  brow(-1);brow(1);
  // 眼下淡阴影（角色签名）
  c.strokeStyle='rgba(150,110,90,.5)';c.lineWidth=3;
  for(const s of [-1,1]){c.beginPath();c.moveTo(s*40,282);c.quadraticCurveTo(s*56,288,s*72,282);c.stroke();}
  // 鼻
  c.strokeStyle='rgba(160,110,90,.6)';c.lineWidth=3;
  c.beginPath();c.moveTo(4,300);c.quadraticCurveTo(9,312,2,318);c.stroke();
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}

// ── 人形口型条（jaw 驱动椭圆口 + 下唇）────────────────────────────────
function mouthRig(head,{y=-.075,z=.118,s=1}={}){
  const g=new THREE.Group();g.position.set(0,y,z);head.add(g);
  const inner=new THREE.Mesh(new THREE.CircleGeometry(.020*s,20),
    new THREE.MeshBasicMaterial({color:0x57272c,side:THREE.DoubleSide}));
  const lipU=new THREE.Mesh(new THREE.TorusGeometry(.020*s,.0035*s,6,20,Math.PI),
    new THREE.MeshBasicMaterial({color:0x8a4a4a}));
  lipU.rotation.z=0;g.add(inner,lipU);
  return {apply(lip){
    const open=lip.jaw>.02;
    inner.scale.set(1+.3*(lip.width??1-1),open?.25+lip.jaw*1.5:.12,1);
    lipU.scale.copy(inner.scale);lipU.visible=!open||lip.jaw<.5;
    return {jaw:lip.jaw};
  }};
}

// ── 雷晓（殖装只锁右臂！三态：壳疹微光 / 骨板盾 / 黑亮全甲）──────────────
export class LeiXiaoCraft {
  constructor(){
    this.mesh=new THREE.Group();this.mesh.name='LeiXiaoCraft';
    this.body=new THREE.Group();this.mesh.add(this.body);
    const skin='#f2d7c0',shirt='#f2ede2',pants='#3a3f4a',hair='#4a3226';
    this.limbs={};this.sleeves={};this.hands={};this.feet={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,pants,[[0,.078],[.3,.064],[.62,.05],[1,.042]],{depth:.94});
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      mesh(shoe,shoeGeometry(),'#4a4640');
      const sole=mesh(shoe,shoeGeometry(),'#d8d2c4');sole.scale.y=.13;sole.position.y=-.08447;
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,skin,[[0,.048],[.3,.044],[.6,.034],[1,.026]],{depth:.88});
      // 卷袖：短袖口 + 小臂卷边（卷到小臂）
      this.sleeves[side]=new LimbSurface(this.mesh,shirt,[[0,.066],[.8,.062],[1,.056]],{end:.30});
      this.sleeves[side+'Roll']=new LimbSurface(this.mesh,shirt,[[0,.058],[.5,.060],[1,.052]],{start:.42,end:.52});
      const hand=new ArticulatedHand(sign,mat(skin),jointInk);this.mesh.add(hand);this.hands[side]=hand;
    }
    mesh(this.body,ringsGeometry([[.80,.135,.095],[.95,.142,.10],[1.10,.148,.105],[1.28,.14,.10],[1.40,.115,.085]]),shirt);
    // 领口开襟
    for(const sign of [-1,1]){
      const flap=mesh(this.body,new THREE.BoxGeometry(.05,.09,.012),shirt);
      flap.position.set(sign*.045,1.375,.10);flap.rotation.set(-.2,sign*.5,sign*.15);
    }
    // 书包：斜挎带 + 左胯帆布包
    const strap=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(.13,1.42,.06),new THREE.Vector3(0,1.15,.145),new THREE.Vector3(-.14,.85,.08)),12,.014,6),mat('#6b4a32'));
    this.body.add(strap);
    const bag=mesh(this.body,new THREE.BoxGeometry(.20,.24,.09),'#6b4a32');bag.position.set(-.17,.78,.06);bag.rotation.z=.08;
    mesh(this.body,new THREE.BoxGeometry(.20,.06,.095),'#5a3d28').position.set(-.17,.885,.06);
    // ── 头 ──
    const head=this.headGroup=new THREE.Group();head.position.set(0,1.485,0);this.body.add(head);
    this.skull=ellipsoid(head,[0,.055,0],[.115,.135,.125],skin);
    // 脸贴片（前侧 ±65° 包裹到耳侧，3/4 机位可读；Basic 保证逆光下可读）
    this.faceMat=new THREE.MeshBasicMaterial({map:faceTexture({})});
    const face=new THREE.Mesh(new THREE.SphereGeometry(1,32,24,Math.PI*.14,Math.PI*.72,Math.PI*.26,Math.PI*.5),this.faceMat);
    face.scale.set(.128,.144,.136);face.position.set(0,.045,.004);head.add(face);
    // 发：深栗棕发盖只压头顶后区（不盖脸）+ 发束楔块 + 两根呆毛
    const cap=mesh(head,new THREE.SphereGeometry(1,28,18,0,Math.PI*2,0,Math.PI*.38),hair);
    cap.scale.set(.118,.09,.122);cap.position.set(0,.115,-.018);
    for(const [x,y,z,ry,s] of [[-.08,.12,.045,.5,1],[0,.135,.05,0,1.2],[.08,.12,.045,-.5,1],[-.1,.14,-.03,.9,.9],[.1,.14,-.03,-.9,.9]]){
      const wedge=mesh(head,new THREE.ConeGeometry(.04,.08,6),hair);
      wedge.position.set(x,y,z);wedge.rotation.set(2.5,ry,0);wedge.scale.setScalar(s);
    }
    for(const sign of [-1,1]){ // 呆毛两根
      const ahoge=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(sign*.015,.185,0),new THREE.Vector3(sign*.05,.25,.01),new THREE.Vector3(sign*.02,.30,.02)),8,.006,5),mat(hair));
      head.add(ahoge);
    }
    this.mouth=mouthRig(head,{y:-.075,z:.138});
    this._faceKey='';
    // ── 右臂殖装 rig（对齐前臂段的组；三态子组）──
    const rig=this.rightRig=new THREE.Group();this.mesh.add(rig);
    // 日常态：六边形壳疹 + 皮下青绿微光
    const daily=this.rigDaily=new THREE.Group();rig.add(daily);
    let sd=7;const rr=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
    for(let i=0;i<9;i++){
      const z=.03+rr()*.16,ang=rr()*Math.PI*2,r=.042;
      const hex=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.008,6),
        new THREE.MeshToonMaterial({color:'#c8b89a',emissive:TEAL,emissiveIntensity:.35}));
      hex.position.set(Math.cos(ang)*r,-Math.sin(ang)*r,z);
      hex.rotation.x=Math.PI/2;hex.lookAt(hex.position.clone().multiplyScalar(2).setZ(z));
      daily.add(hex);
    }
    // 战斗态：黑亮几丁质分段甲（黑曜石湿亮：Phong 高光 + 硬轮廓）+ 接缝青绿光路
    const arm=this.rigArmor=new THREE.Group();rig.add(arm);this.armorSegs=[];
    const chitin=phong('#101216',110);
    for(let i=0;i<5;i++){ // 前臂肘→腕仅 ~0.18：分段甲必须落在 0~.17 区间
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(.048-i*.003,.052-i*.003,.040,14),chitin);
      seg.rotation.x=Math.PI/2;seg.position.z=.005+i*.033;arm.add(seg);this.armorSegs.push(seg);
      if(i<4){
        const seam=new THREE.Mesh(new THREE.TorusGeometry(.046-i*.003,.0032,6,20),
          new THREE.MeshBasicMaterial({color:TEAL}));
        seam.position.z=.026+i*.033;arm.add(seam);
      }
    }
    // 爪尖（右手四指尖黑锥）
    this.claws=[];
    for(let i=0;i<4;i++){
      const claw=new THREE.Mesh(new THREE.ConeGeometry(.006,.024,6),chitin);
      this.hands.right.add(claw);this.claws.push(claw);
    }
    // 骨板盾：两片鞘翅状骨板从前臂弹开
    const shield=this.rigShield=new THREE.Group();rig.add(shield);this.shieldPlates=[];
    for(const sign of [-1,1]){
      const plate=new THREE.Mesh(new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.5),phong('#14161a',120));
      plate.scale.set(.075,.16,.028);plate.position.set(sign*.05,0,.10);
      plate.rotation.z=sign*.35;
      const edge=new THREE.Mesh(new THREE.TorusGeometry(.10,.004,6,24,Math.PI),new THREE.MeshBasicMaterial({color:TEAL}));
      edge.position.copy(plate.position);edge.rotation.set(Math.PI/2,0,sign*.35);edge.scale.set(.75,1.6,1);
      shield.add(plate,edge);this.shieldPlates.push({plate,edge,sign});
    }
    this.setArmorState(0,0);
    // ── 左臂蚀纹（S1E2 结尾第一道蚀：青绿裂光纹，只在 first_mark 出现）──
    const etch=this.leftEtch=new THREE.Group();this.mesh.add(etch);
    const etchMat=new THREE.MeshBasicMaterial({color:TEAL});
    const crack=[[0,.02,0,.05],[.04,.05,.03,.04],[.08,.09,.05,.05],[.12,.14,.02,.04],[.15,.18,.04,.03]];
    for(const [x,z,l,w] of crack){
      const seg=new THREE.Mesh(new THREE.BoxGeometry(w,.006,l),etchMat);
      seg.position.set(x*.3-.025,-.043,z+.02);seg.rotation.y=x*3;etch.add(seg);
    }
    for(const [x,z,r] of [[-.01,.02,.012],[.02,.10,.016],[.0,.18,.010]]){
      const dot=new THREE.Mesh(new THREE.CircleGeometry(r,6),etchMat);
      dot.position.set(x,-.045,z+.02);dot.rotation.x=-Math.PI/2;etch.add(dot);
    }
    this._etchT=0;this.setEtch(0);
  }
  setEtch(t){this._etchT=t;this.leftEtch.visible=t>.02;
    this.leftEtch.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=t;}});
    this.leftEtch.scale.setScalar(Math.max(t,.001));}
  // armorT 0→1 壳疹→全甲（从肘向腕蔓延）；shieldT 0→1 骨板弹开
  setArmorState(armorT,shieldT){
    this.rigDaily.visible=armorT<.85;
    this.rigDaily.traverse(o=>{if(o.material?.emissiveIntensity!==undefined)o.material.emissiveIntensity=.35+.5*Math.max(0,1-armorT*2);});
    this.rigArmor.visible=armorT>.02;
    this.armorSegs.forEach((s,i)=>{const a=THREE.MathUtils.clamp(armorT*5-i*.8,0,1);s.scale.setScalar(a);});
    this.claws.forEach(c=>{c.visible=armorT>.85;});
    this.rigShield.visible=shieldT>.02;
    for(const {plate,edge,sign} of this.shieldPlates){
      const a=shieldT;plate.scale.set(.075*a,.16*a,.028*Math.max(a,.3));
      plate.rotation.z=sign*(.1+.5*a);edge.visible=a>.5;
      edge.scale.set(.75*a,1.6*a,1);
    }
  }
  // 每帧对齐：rig 从肘（原点）指向腕（+Z 局部）
  alignRig(elbow,wrist){
    this.rightRig.position.copy(V(elbow));
    const dir=V(wrist).sub(V(elbow));
    this.rightRig.lookAt(this.rightRig.position.clone().add(dir));
  }
  alignRigL(elbow,wrist){
    this.leftEtch.position.copy(V(elbow));
    const dir=V(wrist).sub(V(elbow));
    this.leftEtch.lookAt(this.leftEtch.position.clone().add(dir));
  }
  setEmotion(emotion,blink){
    const key=`${emotion}/${blink.toFixed(2)}`;
    if(key===this._faceKey)return;this._faceKey=key;
    this.faceMat.map?.dispose();this.faceMat.map=faceTexture({blink,emotion});
    this.faceMat.needsUpdate=true;
  }
  setPose(p){
    this.mesh.position.x=p.rootX;this.mesh.position.z=p.rootZ??0;this.mesh.rotation.y=p.yaw;
    this.body.position.y=p.bob;
    this.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.sleeves[side].update(arm);this.sleeves[side+'Roll'].update(arm);
      this.limbs[side+'Leg'].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.position.copy(V(arm[2]));
      this.feet[side].position.copy(V(leg[2]));
    }
    // 爪尖落在右手四指上
    this.claws.forEach((c,i)=>{
      c.position.set(-.022+i*.014,-.048,-.01);c.rotation.x=-1.2;
    });
    this.alignRig(p.rightArm[1],p.rightArm[2]);
    this.alignRigL(p.leftArm[1],p.leftArm[2]);
    this.mesh.updateMatrixWorld(true);
  }
}

// ── 轰刚（高壮力量型；右拳「碎岩」岩灰几丁质拳甲 + 独角仙叉角）──────────
export class HongGangCraft {
  constructor(){
    this.mesh=new THREE.Group();this.mesh.name='HongGangCraft';
    this.body=new THREE.Group();this.mesh.add(this.body);
    const skin='#e8c4a4',jacket='#2e3242',tee='#8a8f96',pants='#33363e',hairC='#23252c';
    this.limbs={};this.hands={};this.feet={};this.wraps={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,pants,[[0,.10],[.3,.082],[.62,.064],[1,.05]],{depth:.94});
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      const boot=mesh(shoe,shoeGeometry(),'#2c2a30');boot.scale.set(1.25,1.1,1.3);
      const sole=mesh(shoe,shoeGeometry(),'#181a1e');sole.scale.set(1.25,.16,1.3);sole.position.y=-.09;
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,skin,[[0,.068],[.3,.060],[.6,.048],[1,.038]],{depth:.9});
      // 校服外套短袖（上臂段）+ 缠手绷带（前臂到拳峰的白色缠带段）
      this.wraps[side+'Sleeve']=new LimbSurface(this.mesh,jacket,[[0,.088],[1,.078]],{end:.34});
      this.wraps[side]=new LimbSurface(this.mesh,'#e8e4da',[[0,.062],[1,.052]],{start:.55,end:1});
      const hand=new ArticulatedHand(sign,mat('#e8e4da'),jointInk);hand.scale.setScalar(1.25);
      this.mesh.add(hand);this.hands[side]=hand;
    }
    // 灰 tee + 敞开校服外套（前襟两片+背片+肩）
    mesh(this.body,ringsGeometry([[.92,.18,.125],[1.05,.19,.13],[1.25,.20,.135],[1.45,.185,.125],[1.56,.15,.10]]),tee);
    for(const sign of [-1,1]){
      const flap=mesh(this.body,ringsGeometry([[.95,.06,.14],[1.25,.075,.145],[1.52,.06,.12]]),jacket);
      flap.position.x=sign*.135;
    }
    mesh(this.body,ringsGeometry([[.95,.185,.06],[1.52,.155,.05]]),jacket).position.z=-.10;
    // ── 头（方下颚 + 寸头 + 浓眉）──
    const head=this.headGroup=new THREE.Group();head.position.set(0,1.63,0);this.body.add(head);
    ellipsoid(head,[0,.06,0],[.125,.135,.13],skin);
    mesh(head,new THREE.BoxGeometry(.16,.10,.10),skin).position.set(0,.0,.03); // 方颚
    // 脸贴片（Basic：逆光可读；浓眉+小眼+宽阔嘴线）
    const hface=document.createElement('canvas');hface.width=hface.height=512;
    {
      const c=hface.getContext('2d');c.fillStyle=skin;c.fillRect(0,0,512,512);
      for(const s of [-1,1]){ // 浓眉
        c.strokeStyle='#23252c';c.lineWidth=16;c.lineCap='round';
        c.beginPath();c.moveTo(s*30,190);c.lineTo(s*110,196-s*4);c.stroke();
        c.fillStyle='#241d16';c.beginPath();c.ellipse(s*62,236,17,20,0,0,Math.PI*2);c.fill();
        c.fillStyle='#fff8e8';c.beginPath();c.arc(s*56,228,5,0,Math.PI*2);c.fill();
      }
      c.strokeStyle='rgba(150,100,80,.55)';c.lineWidth=4;
      c.beginPath();c.moveTo(250,300);c.quadraticCurveTo(262,318,248,326);c.stroke();
      c.strokeStyle='#5a2f2a';c.lineWidth=7;
      c.beginPath();c.moveTo(196,380);c.quadraticCurveTo(256,392,316,378);c.stroke(); // 宽阔嘴线
    }
    const hTex=new THREE.CanvasTexture(hface);hTex.colorSpace=THREE.SRGBColorSpace;hTex.anisotropy=4;
    const hpatch=new THREE.Mesh(new THREE.SphereGeometry(1,32,24,Math.PI*.14,Math.PI*.72,Math.PI*.26,Math.PI*.5),
      new THREE.MeshBasicMaterial({map:hTex}));
    hpatch.scale.set(.132,.142,.138);hpatch.position.set(0,.05,.006);head.add(hpatch);
    // 寸头（平顶发盖）
    const cap=mesh(head,new THREE.CylinderGeometry(.115,.125,.07,20),hairC);cap.position.set(0,.175,-.005);
    mesh(head,new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.5),hairC).scale.set(.125,.08,.13);
    head.children.at(-1).position.set(0,.15,-.005);
    this.mouth=mouthRig(head,{y:.005,z:.145,s:1.35});
    // ── 右拳「碎岩」拳甲（岩灰几丁质 + 独角仙叉角），gauntletT 生长 ──
    const rig=this.rightRig=new THREE.Group();this.mesh.add(rig);
    const gaunt=this.rigGauntlet=new THREE.Group();rig.add(gaunt);this.gauntSegs=[];
    const rock=mat('#8a8578'),rockDark='#5a5548';
    for(let i=0;i<4;i++){
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(.075-i*.006,.082-i*.006,.06,12),rock);
      seg.rotation.x=Math.PI/2;seg.position.z=.02+i*.055;gaunt.add(seg);this.gauntSegs.push(seg);
    }
    // 拳峰锤头 + 独角仙叉角（前端 Y 形双岔）
    const boss=new THREE.Mesh(new THREE.SphereGeometry(.085,14,10),rock);boss.position.z=.25;gaunt.add(boss);
    this.horn=[];
    for(const sign of [-1,1]){
      const horn=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0,0,0),new THREE.Vector3(sign*.05,.02,.10),new THREE.Vector3(sign*.09,.045,.16)),8,.014,6),mat(rockDark));
      horn.position.set(0,.02,.28);gaunt.add(horn);this.horn.push(horn);
    }
    const hornTip=new THREE.Mesh(new THREE.ConeGeometry(.012,.05,6),mat(rockDark));
    hornTip.position.set(0,.10,.30);hornTip.rotation.x=.5;gaunt.add(hornTip);this.horn.push(hornTip);
    this.setGauntlet(0);
  }
  setGauntlet(t){
    this.rigGauntlet.visible=t>.02;
    this.rigGauntlet.scale.setScalar(Math.max(t,.001));
    this.wraps.right.mesh.visible=t<.9;
  }
  alignRig(elbow,wrist){
    this.rightRig.position.copy(V(elbow));
    this.rightRig.lookAt(this.rightRig.position.clone().add(V(wrist).sub(V(elbow))));
  }
  setPose(p){
    this.mesh.position.x=p.rootX;this.mesh.position.z=p.rootZ??0;this.mesh.rotation.y=p.yaw;
    this.body.position.y=p.bob;
    this.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.wraps[side].update(arm);this.wraps[side+'Sleeve'].update(arm);this.limbs[side+'Leg'].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.position.copy(V(arm[2]));
      this.feet[side].position.copy(V(leg[2]));
    }
    this.alignRig(p.rightArm[1],p.rightArm[2]);
    this.mesh.updateMatrixWorld(true);
  }
}

// ── 观察者（远景剪影，不给正脸）────────────────────────────────────
export class ObserverCraft {
  constructor(){
    this.mesh=new THREE.Group();this.mesh.name='ObserverCraft';
    const dark=new THREE.MeshBasicMaterial({color:'#16141e'});
    const coat=new THREE.Mesh(new THREE.CylinderGeometry(.09,.24,.85,10),dark);
    coat.position.y=.42;this.mesh.add(coat);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.085,12,10),dark);
    head.position.y=.93;this.mesh.add(head);
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.02,16),dark);
    brim.position.y=.99;this.mesh.add(brim);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.10,.11,.12,12),dark);
    top.position.y=1.05;this.mesh.add(top);
  }
}
