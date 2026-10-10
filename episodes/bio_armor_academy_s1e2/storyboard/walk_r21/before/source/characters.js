// 《9章》S1E2 程序化角色：LeiXiaoCraft（瘦削少年，殖装只在右臂，三态）/
// HongGangCraft（高壮力量型，右拳碎岩拳甲+独角仙叉角）/ ObserverCraft（远景剪影）。
// 复用 craft_trial 积木（/craft/ 挂载只读）：LimbSurface/ringsGeometry/twoBone/ArticulatedHand。
import * as THREE from 'three';
import {LimbSurface,ringsGeometry,mesh,ellipsoid,mat,jointInk,shoeGeometry} from '/craft/character3d.js';
import {ArticulatedHand} from '/craft/hand3d.js';
import {detailedHead,garmentDetails,forearmDetails,updateForearmDetails} from './character_details.js';
import {skinMaterial,clothMaterial,finishSleeveRoot} from './character_finish.js';

const V=p=>new THREE.Vector3(p.x,p.y,p.z??0);
const phong=(color,shin=90,spec=0x9adfcf)=>new THREE.MeshPhongMaterial({color,shininess:shin,specular:spec});
const TEAL='#3DFFC8';
const TEAL_HI=new THREE.Color('#d8fff2');

// ── 少年脸（CanvasTexture 前贴片；眨眼/情绪按 key 缓存重建）──────────────
function mouthRig(head,{y=-.075,z=.118,s=1}={}){
  const g=new THREE.Group();g.position.set(0,y,z);head.add(g);
  const inner=new THREE.Mesh(new THREE.CircleGeometry(.020*s,20),
    new THREE.MeshBasicMaterial({color:0x57272c,side:THREE.DoubleSide}));
  const lipU=new THREE.Mesh(new THREE.TorusGeometry(.020*s,.0035*s,6,20,Math.PI),
    new THREE.MeshBasicMaterial({color:0x8a4a4a}));
  lipU.rotation.z=0;g.add(inner,lipU);
  return {apply(lip){
    const open=lip.jaw>.02;
    inner.scale.set(1+.3*((lip.width??1)-1),open?.18+lip.jaw*1.1:.065,1);
    lipU.scale.copy(inner.scale);lipU.visible=!open||lip.jaw<.5;
    return {jaw:lip.jaw};
  }};
}

// ── 雷晓（殖装只锁右臂！三态：壳疹微光 / 骨板盾 / 黑亮全甲）──────────────
export class LeiXiaoCraft {
  constructor(){
    this.mesh=new THREE.Group();this.mesh.name='LeiXiaoCraft';
    this.body=new THREE.Group();this.mesh.add(this.body);
    const skin=skinMaterial('lei'),shirt=clothMaterial('#ede8dd'),pants=clothMaterial('#3a3f4a');
    this.limbs={};this.sleeves={};this.hands={};this.feet={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,pants,[[0,.085],[.25,.071],[.55,.054],[.8,.045],[1,.040]],{depth:.94});
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      mesh(shoe,shoeGeometry(),'#4a4640');
      const sole=mesh(shoe,shoeGeometry(),'#d8d2c4');sole.scale.y=.13;sole.position.y=-.08447;
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,skin,[[0,.048],[.3,.044],[.6,.034],[1,.026]],{depth:.88});
      const skinSurface=this.limbs[side+'Arm'],skinStart=Math.floor(skinSurface.rings*.43);
      skinSurface.geometry.setDrawRange(skinStart*skinSurface.sides*6,(skinSurface.rings-skinStart)*skinSurface.sides*6);
      // 卷袖：短袖口 + 小臂卷边（卷到小臂）
      this.sleeves[side]=new LimbSurface(this.mesh,shirt,[[0,.063],[.8,.055],[1,.050]],{end:.51});
      this.sleeves[side+'Roll']=new LimbSurface(this.mesh,shirt,[[0,.061],[.5,.057],[1,.050]],{start:.45,end:.54});
      const hand=new ArticulatedHand(sign,skin,jointInk);hand.scale.setScalar(.78);this.mesh.add(hand);this.hands[side]=hand;
    }
    mesh(this.body,ringsGeometry([[.78,.127,.096],[.88,.140,.102],[.97,.143,.103],[1.06,.127,.091],[1.18,.138,.099],[1.30,.149,.105],[1.38,.130,.090],[1.43,.064,.058]]),shirt);
    // The sleeve root blends inside the chest; no separate ball-shaped shoulder cover.
    // 领口开襟
    const strap=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(.13,1.42,.06),new THREE.Vector3(0,1.15,.145),new THREE.Vector3(-.14,.85,.08)),12,.014,6),mat('#6b4a32'));
    this.body.add(strap);
    const bag=mesh(this.body,new THREE.BoxGeometry(.20,.24,.09),'#6b4a32');bag.position.set(-.17,.78,.06);bag.rotation.z=.08;
    mesh(this.body,new THREE.BoxGeometry(.20,.06,.095),'#5a3d28').position.set(-.17,.885,.06);
    // ── 头 ──
    this.face=detailedHead(this.body,'lei',1.485);
    const head=this.headGroup=this.face.head;
    this.mouth=this.face.mouth??mouthRig(head,{y:.005,z:.125,s:1.0});
    garmentDetails(this,'lei');forearmDetails(this,'lei');

    // ── 右臂殖装 rig（对齐前臂段的组；三态子组）──
    const rig=this.rightRig=new THREE.Group();this.mesh.add(rig);
    // 日常态：六边形壳疹 + 皮下青绿微光
    const daily=this.rigDaily=new THREE.Group();rig.add(daily);
    let sd=7;const rr=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
    this.dailyMats=[];
    for(let i=0;i<9;i++){
      const z=.03+rr()*.16,ang=rr()*Math.PI*2,r=.029;
      const hm=new THREE.MeshToonMaterial({color:'#c8b89a',emissive:TEAL,emissiveIntensity:.12});
      const hex=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,.005,6),hm);
      hex.position.set(Math.cos(ang)*r,-Math.sin(ang)*r,z);
      hex.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(ang),-Math.sin(ang),0));
      daily.add(hex);this.dailyMats.push(hm);
    }
    // 战斗态：黑亮几丁质分段甲（黑曜石湿亮：Phong 高光 + 硬轮廓）+ 接缝青绿光路
    const arm=this.rigArmor=new THREE.Group();rig.add(arm);this.armorSegs=[];this.armorSeams=[];
    const chitin=this.chitinMat=phong('#101216',110);
    chitin.emissive=new THREE.Color('#1a5a4a');chitin.emissiveIntensity=0;
    for(let i=0;i<5;i++){ // 前臂肘→腕仅 ~0.18：分段甲必须落在 0~.17 区间
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(.048-i*.003,.052-i*.003,.031,12),chitin);
      seg.rotation.x=Math.PI/2;seg.position.z=.005+i*.033;arm.add(seg);this.armorSegs.push(seg);
      if(i<4){
        const seam=new THREE.Mesh(new THREE.TorusGeometry(.046-i*.003,.0032,6,20),
          new THREE.MeshBasicMaterial({color:TEAL,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
        seam.position.z=.021+i*.033;arm.add(seam);this.armorSeams.push(seam);
      }
      for(const sign of [-1,1]){
        const ridge=new THREE.Mesh(new THREE.BoxGeometry(.007,.030,.005),phong('#34443f',40));
        ridge.position.set(sign*(.030-i*.002),0,.034-i*.002);ridge.rotation.y=-sign*.4;seg.add(ridge);
      }
    }
    // 肘甲盖 + 手背甲（全甲补全：elbow 最先、手背最后随 armorT 长出）
    const elbowCap=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8,0,Math.PI*2,0,Math.PI/2),chitin);
    elbowCap.rotation.x=-Math.PI/2;elbowCap.position.z=-.012;arm.add(elbowCap);
    const handPlate=new THREE.Mesh(new THREE.BoxGeometry(.052,.018,.068),chitin);
    handPlate.position.set(0,.022,.175);arm.add(handPlate);
    this.armorExtras=[{m:elbowCap,a:0},{m:handPlate,a:4.3}];
    // 生长前锋环：armorT 蔓延时的能量波前
    this.growthRing=new THREE.Mesh(new THREE.TorusGeometry(.062,.006,6,24),
      new THREE.MeshBasicMaterial({color:TEAL,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
    this.growthRing.visible=false;arm.add(this.growthRing);
    // 爪尖（右手四指尖黑锥 + 能量光点）
    this.claws=[];this.clawGlows=[];
    for(const finger of this.hands.right.chains.filter(c=>c.name!=='thumb')){
      const claw=new THREE.Mesh(new THREE.ConeGeometry(.005,.024,8),chitin);
      finger.bones.at(-1).add(claw);claw.position.x=finger.lengths.at(-1)+.006;claw.rotation.z=-Math.PI/2;
      this.claws.push(claw);
      const glow=new THREE.Mesh(new THREE.SphereGeometry(.0075,8,6),
        new THREE.MeshBasicMaterial({color:TEAL,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));
      glow.position.x=finger.lengths.at(-1)+.013;finger.bones.at(-1).add(glow);
      this.clawGlows.push(glow);
    }
    // 骨板盾：两片鞘翅状骨板从前臂弹开 + 板间能量膜
    const shield=this.rigShield=new THREE.Group();rig.add(shield);this.shieldPlates=[];
    for(const sign of [-1,1]){
      const plate=new THREE.Mesh(new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.5),phong('#14161a',120));
      plate.scale.set(.11,.24,.035);plate.position.set(sign*.065,0,.085);
      plate.rotation.z=sign*.35;
      const edge=new THREE.Mesh(new THREE.TorusGeometry(.13,.005,6,24,Math.PI),
        new THREE.MeshBasicMaterial({color:TEAL,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
      edge.position.copy(plate.position);edge.rotation.set(Math.PI/2,0,sign*.35);edge.scale.set(.85,1.85,1);
      shield.add(plate,edge);this.shieldPlates.push({plate,edge,sign});
    }
    // 能量膜：两骨板间的半透明力场（竖向渐变 + 扫描线，盾展开才可见）
    const memTex=(()=>{const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');
      const gr=g.createLinearGradient(0,0,0,128);
      gr.addColorStop(0,'rgba(61,255,200,0)');gr.addColorStop(.5,'rgba(61,255,200,.8)');gr.addColorStop(1,'rgba(61,255,200,0)');
      g.fillStyle=gr;g.fillRect(0,0,64,128);
      g.strokeStyle='rgba(220,255,244,.85)';g.lineWidth=1;
      for(let y=8;y<128;y+=16){g.beginPath();g.moveTo(0,y);g.lineTo(64,y);g.stroke();}
      const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;tx.wrapT=THREE.RepeatWrapping;return tx;})();
    this.shieldMembrane=new THREE.Mesh(new THREE.PlaneGeometry(.30,.42),
      new THREE.MeshBasicMaterial({map:memTex,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    this.shieldMembrane.position.set(0,0,.078);shield.add(this.shieldMembrane);
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
    this.rigDaily.traverse(o=>{if(o.material?.emissiveIntensity!==undefined)o.material.emissiveIntensity=.12+.20*Math.max(0,1-armorT*2);});
    this.rigArmor.visible=armorT>.02;
    this.armorSegs.forEach((s,i)=>{const a=THREE.MathUtils.clamp(armorT*5-i*.8,0,1);s.visible=a>.001;s.scale.setScalar(Math.max(a,.001));
      if(this.armorSeams[i]){this.armorSeams[i].visible=a>.1;this.armorSeams[i].scale.setScalar(Math.max(a,.001));}});
    for(const x of this.armorExtras){const a=THREE.MathUtils.clamp(armorT*5-x.a,0,1);x.m.visible=a>.001;x.m.scale.setScalar(Math.max(a,.001));}
    this.claws.forEach(c=>{c.visible=armorT>.85;});
    this.clawGlows.forEach(g=>{g.visible=armorT>.85;});
    this.rigShield.visible=shieldT>.02;
    for(const {plate,edge,sign} of this.shieldPlates){
      const a=shieldT;plate.scale.set(.11*a,.24*a,.035*Math.max(a,.3));
      plate.rotation.z=sign*(.1+.5*a);edge.visible=a>.5;
      edge.scale.set(.85*a,1.85*a,1);
    }
  }
  // 殖装活效（viewer 每帧调用；纯 (t,state) 确定函数，seek 安全）
  updateWeaponFX(t,armorT,shieldT){
    const pul=(f,ph=0)=>.5+.5*Math.sin(t*f+ph);
    // 壳疹：皮下微光心跳（强-弱双跳）
    const hb=Math.pow(Math.max(0,Math.sin(t*4.4)),3)+.4*Math.pow(Math.max(0,Math.sin(t*4.4-1.1)),3);
    this.dailyMats.forEach((m,i)=>{m.emissiveIntensity*=.65+.7*Math.min(1,hb+.18*Math.sin(t*3+i*2.1));});
    // 接缝光路：肘→腕能量行波（生长中加速）
    const growing=armorT>.02&&armorT<.98,spd=growing?9:2.6;
    for(let i=0;i<this.armorSeams.length;i++){const s=this.armorSeams[i];if(!s.visible)continue;
      const crest=Math.max(0,Math.sin(t*spd-i*.95));
      s.material.opacity=.45+.55*crest;
      s.material.color.set(TEAL).lerp(TEAL_HI,crest*.6);}
    // 全甲呼吸：黑甲表面青绿返光
    if(this.chitinMat)this.chitinMat.emissiveIntensity=armorT>.5?(.08+.12*pul(2.2)):0;
    // 生长前锋环：跟着 armorT 波前走
    this.growthRing.visible=growing;
    if(growing){this.growthRing.position.z=.005+Math.min(armorT*5,4.6)*.033;
      this.growthRing.scale.setScalar(1+.18*Math.sin(t*11));
      this.growthRing.material.opacity=.5+.5*Math.max(0,Math.sin(t*11));}
    // 爪尖能量光
    this.clawGlows.forEach((g,i)=>{if(g.visible)g.material.opacity=.35+.5*pul(7,i*1.3);});
    // 盾：能量膜流动 + 边缘脉动
    const st=shieldT;
    this.shieldMembrane.visible=st>.02;
    if(st>.02){this.shieldMembrane.material.opacity=st*(.20+.10*pul(3.2));
      this.shieldMembrane.material.map.offset.y=-((t*.45)%1);
      this.shieldMembrane.scale.set(Math.max(st,.001),Math.max(st,.001),1);}
    for(const {edge,sign} of this.shieldPlates){if(edge.visible)edge.material.opacity=.55+.45*pul(4.2,sign);}
  }
  // 每帧对齐：rig 从肘（原点）指向腕（+Z 局部）
  alignRig(elbow,wrist){
    this.rightRig.position.copy(V(elbow));
    const dir=V(wrist).sub(V(elbow));
    this.rightRig.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir.normalize());
  }
  alignRigL(elbow,wrist){
    this.leftEtch.position.copy(V(elbow));
    const dir=V(wrist).sub(V(elbow));
    this.leftEtch.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir.normalize());
  }
  setEmotion(emotion,blink){this.face.setEmotion(emotion,blink);}
  setPose(p){
    this.mesh.position.x=p.rootX;this.mesh.position.z=p.rootZ??0;this.mesh.rotation.y=p.yaw;
    this.body.position.y=p.bob;this.body.rotation.x=p.lean??0;
    this.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.sleeves[side].update(arm);this.sleeves[side+'Roll'].update(arm);
      finishSleeveRoot(this.sleeves[side],arm,'lei');
      this.limbs[side+'Leg'].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.position.copy(V(arm[2]));
      hand.setGesture({fist:p.fist??0,open:p.open??0,point:p.point??0});
      this.feet[side].position.copy(V(leg[2]));
    }
    // 爪尖落在右手四指上
    this.alignRig(p.rightArm[1],p.rightArm[2]);
    this.alignRigL(p.leftArm[1],p.leftArm[2]);
    updateForearmDetails(this,p);
    this.mesh.updateMatrixWorld(true);
  }
}

// ── 轰刚（高壮力量型；右拳「碎岩」岩灰几丁质拳甲 + 独角仙叉角）──────────
export class HongGangCraft {
  constructor(){
    this.mesh=new THREE.Group();this.mesh.name='HongGangCraft';
    this.body=new THREE.Group();this.mesh.add(this.body);
    const skin=skinMaterial('hong'),jacket=clothMaterial('#303440'),tee=clothMaterial('#858a90'),pants=clothMaterial('#33363e');
    this.limbs={};this.hands={};this.feet={};this.wraps={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,pants,[[0,.107],[.25,.092],[.55,.070],[.8,.057],[1,.050]],{depth:.94});
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      const boot=mesh(shoe,shoeGeometry(),'#2c2a30');boot.scale.set(1.25,1.1,1.3);
      const sole=mesh(shoe,shoeGeometry(),'#181a1e');sole.scale.set(1.25,.16,1.3);sole.position.y=-.09;
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,skin,[[0,.068],[.3,.060],[.6,.048],[1,.038]],{depth:.9});
      const skinSurface=this.limbs[side+'Arm'],skinStart=Math.floor(skinSurface.rings*.26);
      skinSurface.geometry.setDrawRange(skinStart*skinSurface.sides*6,(skinSurface.rings-skinStart)*skinSurface.sides*6);
      // 校服外套短袖（上臂段）+ 缠手绷带（前臂到拳峰的白色缠带段）
      this.wraps[side+'Sleeve']=new LimbSurface(this.mesh,jacket,[[0,.088],[1,.078]],{end:.34});
      this.wraps[side]=new LimbSurface(this.mesh,'#e8e4da',[[0,.062],[1,.052]],{start:.55,end:1});
      const hand=new ArticulatedHand(sign,mat('#e8e4da'),jointInk);hand.scale.setScalar(.95);
      this.mesh.add(hand);this.hands[side]=hand;
    }
    // 灰 tee + 敞开校服外套（前襟两片+背片+肩）；tee 收腰出胸、外套盖住胸廓
    mesh(this.body,ringsGeometry([[.90,.170,.118],[1.00,.184,.126],[1.10,.180,.121],[1.18,.169,.113],[1.32,.204,.138],[1.44,.207,.136],[1.52,.172,.116],[1.57,.092,.080]]),tee);
    for(const sign of [-1,1]){
      const flap=mesh(this.body,ringsGeometry([[.95,.07,.145],[1.25,.085,.150],[1.52,.065,.122]]),jacket);
      flap.position.x=sign*.152;
    }
    mesh(this.body,ringsGeometry([[.95,.205,.06],[1.52,.172,.05]]),jacket).position.z=-.11;
    // ── 头（方下颚 + 寸头 + 浓眉）──
    this.face=detailedHead(this.body,'hong',1.63);
    const head=this.headGroup=this.face.head;
    this.mouth=this.face.mouth??mouthRig(head,{y:.024,z:.135,s:1.3});
    garmentDetails(this,'hong');forearmDetails(this,'hong');

    // ── 右拳「碎岩」拳甲（岩灰几丁质 + 独角仙叉角），gauntletT 生长 ──
    const rig=this.rightRig=new THREE.Group();this.mesh.add(rig);
    const gaunt=this.rigGauntlet=new THREE.Group();rig.add(gaunt);this.gauntSegs=[];
    const rock=mat('#6e6a5e'),rockDark='#4a463c';
    for(let i=0;i<4;i++){
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(.075-i*.006,.082-i*.006,.047,8),mat(i%2?'#6e6a5e':'#7f7a6c'));
      seg.rotation.x=Math.PI/2;seg.position.z=.02+i*.055;gaunt.add(seg);this.gauntSegs.push(seg);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(.077-i*.006,.0025,5,16),mat('#98927f'));
      rim.position.z=.045+i*.055;gaunt.add(rim);
    }
    // 拳峰锤头 + 独角仙叉角（前端 Y 形双岔）；boss 用独立材质（mat() 按色缓存共享，熔光不能染到甲段）
    const boss=this.gauntBoss=new THREE.Mesh(new THREE.IcosahedronGeometry(.085,1),rock.clone());
    boss.position.z=.25;gaunt.add(boss);
    boss.material.emissive=new THREE.Color('#FF6B3B');boss.material.emissiveIntensity=0;
    // 拳峰钉刺（三根碎岩棱刺）
    for(const [x,y] of [[-.045,.02],[0,.058],[.045,.02]]){
      const stud=new THREE.Mesh(new THREE.ConeGeometry(.014,.05,6),mat(rockDark));
      stud.position.set(x,y,.31);stud.rotation.x=Math.PI/2*.9;gaunt.add(stud);
    }
    // 熔岩裂光：拳甲内热脉动（受击瞬间炽亮）
    this.gauntFissures=[];
    const fissureMat=()=>new THREE.MeshBasicMaterial({color:'#FF7A3B',transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false});
    for(const [x,y,z,angle] of [[-.027,.066,.252,.3],[.025,.071,.245,-.4],[0,.070,.280,.7]]){
      const fissure=new THREE.Mesh(new THREE.BoxGeometry(.003,.003,.042),fissureMat());
      fissure.position.set(x,y,z);fissure.rotation.y=angle;gaunt.add(fissure);this.gauntFissures.push(fissure);
    }
    for(const [x,y,z,angle,tilt] of [[-.06,.02,.10,.9,.5],[.055,-.03,.16,-.7,-.4]]){
      const fissure=new THREE.Mesh(new THREE.BoxGeometry(.003,.003,.05),fissureMat());
      fissure.position.set(x,y,z);fissure.rotation.set(tilt,angle,0);gaunt.add(fissure);this.gauntFissures.push(fissure);
    }
    // 生长拼合碎石：拳甲成形时岩片从四周飞来拼上（只在生长段可见）；
    // 独立材质带余热橙光——黄昏逆光下共享 mat() 的素岩色会读成一团黑
    this.gauntShards=[];
    const shardMat=new THREE.MeshToonMaterial({color:'#9a917c',emissive:'#FF8A4A',emissiveIntensity:.3});
    {let sd2=29;const rr2=()=>{sd2=(sd2*1103515245+12345)&0x7fffffff;return sd2/0x7fffffff;};
     for(let i=0;i<12;i++){
       const m=new THREE.Mesh(new THREE.TetrahedronGeometry(.02+rr2()*.018),shardMat);
       const ang=rr2()*Math.PI*2,zf=.02+rr2()*.24;
       const dir=new THREE.Vector3(Math.cos(ang),Math.sin(ang),(rr2()-.5)*1.2).normalize();
       m.userData={final:new THREE.Vector3(Math.cos(ang)*.078,Math.sin(ang)*.078,zf),
         dir,dist:.35+rr2()*.5,delay:i/12*.35,spin:rr2()*6};
       m.visible=false;gaunt.add(m);this.gauntShards.push(m);
     }}
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
  setEmotion(emotion,blink){this.face.setEmotion(emotion,blink);}
  // 拳甲活效（纯 (t,state) 确定函数）：熔岩裂光脉动 + 受击炽亮 + 生长拼合碎石
  updateWeaponFX(t,g,{growing=false,hitT=0}={}){
    const heat=1+.9*(hitT>0&&hitT<.6?1-hitT/.6:0);
    const vis=Math.min(1,g*2);
    this.gauntFissures.forEach((f,i)=>{
      f.material.opacity=Math.min(1,(.30+.45*Math.max(0,Math.sin(t*4.6+i*1.7)))*heat*vis);});
    if(this.gauntBoss)this.gauntBoss.material.emissiveIntensity=
      (.05+.10*Math.max(0,Math.sin(t*3.1)))*vis+.25*(hitT>0&&hitT<.5?(1-hitT/.5):0);
    for(const sm of this.gauntShards){
      const d=sm.userData;
      const pr=THREE.MathUtils.clamp((g-d.delay)/Math.max(.001,.95-d.delay));
      sm.visible=growing&&g>.02&&pr<1;
      if(!sm.visible)continue;
      const e=pr*pr*(3-2*pr);
      sm.position.copy(d.final).addScaledVector(d.dir,d.dist*(1-e));
      sm.rotation.set(d.spin*(1-e)*3+t*.5,d.spin*(1-e)*5,d.spin);
      sm.scale.setScalar(.4+.6*e);
    }
  }
  setGauntlet(t){
    this.rigGauntlet.visible=t>.02;
    this.detailRigs.right.visible=t<=.02;
    this.rigGauntlet.scale.setScalar(Math.max(t,.001));
    this.wraps.right.mesh.visible=t<.9;
  }
  alignRig(elbow,wrist){
    this.rightRig.position.copy(V(elbow));
    this.rightRig.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),V(wrist).sub(V(elbow)).normalize());
  }
  setPose(p){
    this.mesh.position.x=p.rootX;this.mesh.position.z=p.rootZ??0;this.mesh.rotation.y=p.yaw;
    this.body.position.y=p.bob;this.body.rotation.x=p.lean??0;
    this.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.wraps[side].update(arm);this.wraps[side+'Sleeve'].update(arm);this.limbs[side+'Leg'].update(leg);
      finishSleeveRoot(this.wraps[side+'Sleeve'],arm,'hong');
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.position.copy(V(arm[2]));
      hand.setGesture({fist:p.fist??0,open:p.open??0,point:p.point??0});
      this.feet[side].position.copy(V(leg[2]));
    }
    this.alignRig(p.rightArm[1],p.rightArm[2]);
    updateForearmDetails(this,p);
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
