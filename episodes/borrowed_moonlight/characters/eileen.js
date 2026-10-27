// 《借走月光的女孩》艾琳（11 岁，~140cm）：银白短发齐下颌+左侧碎发、灰蓝大眼、
// 深蓝天鹅绒斗篷（肩铰链+前开襟）、米白亚麻裙、棕色短靴、旧铜灯（灯罩细裂纹+灯芯粒子锚点）。
// 工艺：craft3d 积木（LimbSurface/ArticulatedHand/ringsGeometry/shoeGeometry）+
// 集内 face.js 动画头；表情=好奇/孤独/含泪/微笑/坚定（+blink）。
// 道具：makeCopperLamp（手提/落地/递出三态）、makeStarBottle（抱瓶）。
import * as THREE from 'three';
import {LimbSurface,ringsGeometry,mesh,jointInk,shoeGeometry} from 'dula-assets/lib/craft3d/surface.js';
import {ArticulatedHand} from 'dula-assets/lib/craft3d/hand.js';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';
import {stageHead} from './face.js';
import {buildPose,applyRigPose,V,clamp,mix} from './rig.js';

const ramp=coolShadowRamp();
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});

// ── 旧铜灯：铜座+细裂纹玻璃罩+风帽+提梁+灯芯（flameAnchor=粒子锚点）──
export function makeCopperLamp(){
  const lamp=new THREE.Group();lamp.name='copperLamp';
  const brass='#8a6228',brassDark='#6e4c1e';
  const base=mesh(lamp,new THREE.CylinderGeometry(.030,.040,.024,14),brass);base.position.y=.012;
  const tray=mesh(lamp,new THREE.CylinderGeometry(.042,.046,.010,14),brassDark);tray.position.y=.030;
  // 玻璃罩：微透明 + 一道细裂纹（折线管贴罩面，圣经锁定的识别特征）
  const glass=new THREE.Mesh(new THREE.CylinderGeometry(.034,.040,.086,14,1,true),
    new THREE.MeshToonMaterial({color:'#d8e4ee',gradientMap:ramp,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false}));
  glass.position.y=.078;lamp.add(glass);
  const crackPts=[[.010,.040],[.014,.062],[.009,.084],[.015,.105]]
    .map(([a,y])=>new THREE.Vector3(Math.sin(a*14)*.037,y,Math.cos(a*14)*.037));
  const crack=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crackPts),8,.0012,5),
    new THREE.MeshBasicMaterial({color:'#5a4a38'}));
  lamp.add(crack);
  // 防风帽 + 烟囱 + 顶珠
  const cap=mesh(lamp,new THREE.ConeGeometry(.044,.030,14),brass);cap.position.y=.132;
  const chimney=mesh(lamp,new THREE.CylinderGeometry(.012,.016,.024,10),brassDark);chimney.position.y=.155;
  const knob=mesh(lamp,new THREE.SphereGeometry(.008,10,8),brass);knob.position.y=.172;
  // 提梁（半圆环，两侧耳）
  const bail=mesh(lamp,new THREE.TorusGeometry(.040,.0045,6,16,Math.PI),brassDark);
  bail.position.y=.168;
  for(const s of [-1,1]){const lug=mesh(lamp,new THREE.SphereGeometry(.007,8,6),brassDark);
    lug.position.set(s*.040,.168,0);}
  // 灯芯与火苗：发光小球+光晕壳；flameAnchor 留给 P4 微金粒子
  const wick=mesh(lamp,new THREE.CylinderGeometry(.004,.005,.018,8),'#3a2c1c',false);wick.position.y=.045;
  const flame=new THREE.Mesh(new THREE.SphereGeometry(.011,10,8),
    new THREE.MeshBasicMaterial({color:'#ffcf70',transparent:true,opacity:.95,depthWrite:false}));
  flame.name='flame';flame.scale.set(.8,1.5,.8);flame.position.y=.062;lamp.add(flame);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.030,12,10),
    new THREE.MeshBasicMaterial({color:'#ffbe58',transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false}));
  glow.name='flameGlow';glow.position.y=.062;lamp.add(glow);
  const flameAnchor=new THREE.Object3D();flameAnchor.name='flameAnchor';flameAnchor.position.y=.075;lamp.add(flameAnchor);
  lamp.userData.flame=flame;lamp.userData.flameAnchor=flameAnchor;lamp.userData.glow=glow;
  return lamp;
}

// ── 星瓶（抱瓶姿势道具）：玻璃瓶身+软木塞+星核（加色发光）──
export function makeStarBottle(){
  const b=new THREE.Group();b.name='starBottle';
  const body=new THREE.Mesh(new THREE.SphereGeometry(.055,16,12),
    new THREE.MeshToonMaterial({color:'#bcd2e4',gradientMap:ramp,transparent:true,opacity:.34,depthWrite:false}));
  body.scale.y=1.15;b.add(body);
  const neckG=new THREE.Mesh(new THREE.CylinderGeometry(.016,.022,.045,10),
    body.material);neckG.position.y=.075;b.add(neckG);
  const cork=mesh(b,new THREE.CylinderGeometry(.015,.014,.022,10),'#7a5a36');cork.position.y=.10;
  const star=new THREE.Mesh(new THREE.OctahedronGeometry(.020),
    new THREE.MeshBasicMaterial({color:'#ffe9a8',blending:THREE.AdditiveBlending,transparent:true,opacity:.9,depthWrite:false}));
  star.name='starCore';b.add(star);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(.038,10,8),
    new THREE.MeshBasicMaterial({color:'#ffdf90',blending:THREE.AdditiveBlending,transparent:true,opacity:.25,depthWrite:false}));
  b.add(halo);
  b.userData.starCore=star;
  return b;
}

const DIMS={hipIdle:.60,shoulderY:1.08,shoulderHalf:.100,hipHalf:.065,
  legA:.28,legB:.28,armA:.150,armB:.140,footY:.055,strideFactor:.55}; // 步伐短而急

export class EileenCraft{
  constructor(){
    this.dims=DIMS;
    this.mesh=new THREE.Group();this.mesh.name='Eileen';
    this.body=new THREE.Group();this.mesh.add(this.body);
    const skin=toon('#f2d8c4'),dressC=toon('#e8e0d0'),cloakC=toon('#24355c');
    this.limbs={};this.hands={};this.feet={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      // 腿：米白打底裤（裙摆下露出段）
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,toon('#d9cfc0'),[[0,.052],[.3,.045],[.6,.036],[1,.030]],{depth:.92});
      // 棕色短靴：圆头鞋 + 矮靴筒
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      const boot=mesh(shoe,shoeGeometry(),'#6b4a30');boot.scale.setScalar(.82);
      const sole=mesh(shoe,shoeGeometry(),'#4a3320',false);sole.scale.set(.82,.10,.82);sole.position.y=-.066;
      const shaft=mesh(shoe,new THREE.CylinderGeometry(.040,.044,.075,12),'#75543a');
      shaft.position.y=.012;shaft.position.z=-.022;
      // 手臂：亚麻长袖（袖=肢体件，同数据更新），腕口露手
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,dressC,[[0,.048],[.35,.042],[.7,.034],[1,.030]],{depth:.88});
      const hand=new ArticulatedHand(sign,skin,jointInk);hand.scale.setScalar(.60);this.mesh.add(hand);this.hands[side]=hand;
    }
    // 躯干：亚麻裙身环列（骨盆→收腰→胸→颈根）
    mesh(this.body,ringsGeometry([[.60,.088,.068],[.70,.092,.070],[.80,.084,.062],[.90,.086,.064],[1.00,.090,.066],[1.08,.082,.060],[1.13,.048,.044]]),dressC);
    // 裙摆：A 字及膝（膝 .32 → 腰 .80；环列必须按 y 升序，降序=绕序翻转法线朝内=整裙阴影色）
    const skirt=mesh(this.body,ringsGeometry([[.32,.150,.112],[.45,.132,.100],[.62,.112,.086],[.80,.092,.070]],{pleats:.04}),dressC);
    // 斗篷：肩铰链（枢轴在肩线，几何下移），前开襟 ~1.15 rad，及腰下
    this.cloakPivot=new THREE.Group();this.cloakPivot.position.set(0,1.075,-.005);this.body.add(this.cloakPivot);
    const capeGeo=new THREE.CylinderGeometry(.105,.205,.62,24,3,true,.575,Math.PI*2-1.15);
    capeGeo.translate(0,-.31,0);
    const cape=mesh(this.cloakPivot,capeGeo,cloakC); // 标准法线外扩 BackSide 描边壳
    cape.material.side=THREE.DoubleSide;
    // 斗篷肩覆片 + 领口系结
    const yoke=mesh(this.body,new THREE.SphereGeometry(1,20,14,0,Math.PI*2,0,Math.PI*.52),cloakC);
    yoke.scale.set(.115,.075,.095);yoke.position.set(0,1.085,-.005);
    const knot=mesh(this.body,new THREE.SphereGeometry(.018,10,8),'#b08c3a');knot.position.set(0,1.065,.085);
    // 风帽（背在颈后，不戴）
    const hood=mesh(this.body,new THREE.SphereGeometry(1,16,12,0,Math.PI*2,0,Math.PI*.55),cloakC);
    hood.scale.set(.095,.085,.075);hood.position.set(0,1.10,-.085);hood.rotation.x=-.5;
    // ── 头：圆润鹅蛋脸 + 灰蓝大眼 + 银白短发（齐下颌 + 左侧一缕碎发）──
    this.face=stageHead(this.body,{
      name:'eileen',skin:'#f2d8c4',line:'#c09078',brow:'#8a8f9c',mouth:'#b0786a',
      eyeDx:78,eyeH:34,eyeW:31,irisR:23,iris0:'#3d4f6e',iris1:'#7d93b8',iris2:'#b8c8de',
      browUp:50,browT:4.5,mouthW:24,neckR:.042,headScale:.96,
      emotions:{
        curious:{awe:.7},lonely:{sad:.85},tearful:{sad:.5,tear:1.2},
        smile:{smile:1},determined:{firm:1},
      },
      // 圆脸断面表（下颌圆收、脸颊饱满、颅顶圆）
      profile:[[-.070,.034,.058,.048],[-.050,.072,.096,.072],[-.016,.100,.116,.098],
        [.042,.114,.128,.114],[.110,.116,.130,.122],[.168,.100,.114,.112],[.206,.062,.082,.086],[.229,.001,.001,.001]],
      hair:{rx:.124,rz:.134,h:.190,napeRx:.108,napeRz:.112,color:'#dfe4ec',dark:'#c2cad6',
        // 发际线：前额眉上、两侧压到下颌（短发齐下颌）、后颈自收
        boundary:a=>{const t=Math.acos(Math.cos(a));
          const ks=[[0,1.02],[.7,1.22],[1.35,1.72],[1.8,1.98],[2.5,2.30],[Math.PI,2.36]];
          for(let i=1;i<ks.length;i++)if(t<=ks[i][0]){const[x0,y0]=ks[i-1],[x1,y1]=ks[i];
            return mix(y0,y1,(t-x0)/(x1-x0));}return ks.at(-1)[1];},
        // 刘海五片交叠（片间露底壳=条形码翻车）；同族明度避免色带
        fringe:[[-1.0,-.5,1.40,.20,'#e2e7ee'],[-.75,-.15,1.48,.22,'#e4e9f0'],[-.35,.20,1.44,.22,'#e2e7ee'],
          [-.05,.60,1.46,.22,'#e4e9f0'],[.40,1.0,1.40,.20,'#e2e7ee'],
          // 左侧（她的左=+az）一缕碎发：更长、更窄、色略深
          [.30,.52,1.88,.09,'#ccd4de']],
        nape:[[1.8,2.6,1.1,2.42,.20,'#d6dce6'],[2.5,3.5,1.1,2.46,.22,'#e2e7ee'],[3.4,4.4,1.1,2.38,.20,'#d6dce6']]},
    },1.17);
    this.headGroup=this.face.head;this.mouth=this.face.mouth;
    // ── 铜灯：默认右手提（垂挂腕下）；setLamp 换手/落地/递出 ──
    this.lamp=makeCopperLamp();this.mesh.add(this.lamp);
    this.bottle=makeStarBottle();this.bottle.visible=false;this.mesh.add(this.bottle);
    this.lampMode={hand:'right'};this.bottleMode=null;
    this.mesh.userData.flame=this.lamp.userData.flame;
    this.mesh.userData.flameAnchor=this.lamp.userData.flameAnchor;
    this.mesh.userData.lamp=this.lamp;this.mesh.userData.bottle=this.bottle;
  }
  setEmotion(e,b){this.face.setEmotion(e,b);}
  setActing(a){this.face.setActing(a);}
  // mode: {hand:'right'|'left'} 手提 / {at:[x,y,z]} 局部点（递出/捧着）/ {ground:[x,y,z]} 落地 / null 隐藏
  setLamp(mode){this.lampMode=mode;}
  setBottle(mode){this.bottleMode=mode;if(this.bottle)this.bottle.visible=!!mode;}
  setPose(p){
    applyRigPose(this,p);
    // 铜灯跟随（手=垂挂腕下保持竖直；at/ground=定点）
    const m=this.lampMode;
    if(!m)this.lamp.visible=false;
    else{
      this.lamp.visible=true;this.lamp.rotation.set(0,0,0);
      if(m.hand){const w=p[m.hand+'Arm'][2];this.lamp.position.set(w.x,w.y-.175,w.z+.012);}
      else if(m.at)this.lamp.position.set(...m.at);
      else if(m.ground)this.lamp.position.set(...m.ground);
    }
    if(this.bottleMode?.at)this.bottle.position.set(...this.bottleMode.at);
  }
  // viewer 每帧待机驱动（(t,staging) 纯函数，seek 安全）：站立+眨眼+微动
  drive(t,st){
    const blink=Math.exp(-Math.pow(((t+1.3)%3.9)-.12,2)/.006);
    const s={rootX:st.pos[0],rootZ:st.pos[2],yaw:st.yaw,visible:st.visible,
      bob:.004*Math.sin(t*1.6),lean:0,
      headYaw:.02*Math.sin(t*.7),headPitch:.02+.012*Math.sin(t*1.1),headRoll:0,
      left:V(-.115,.82,.05),right:V(.13,.865,.055), // 右手提灯位（灯挂腕下）
      gL:{fist:.12},gR:{fist:.55}};
    buildPose(this,s,t,DIMS);
    this.setActing({blink:clamp(blink)});
  }
}

// P1 占位版导出接口（viewer 契约）：返回带 rig API 的根 Group
export function makeEileen(){
  const a=new EileenCraft(),g=a.mesh;
  g.setPose=p=>a.setPose(p);g.setEmotion=(e,b)=>a.setEmotion(e,b);g.setActing=x=>a.setActing(x);
  g.mouth=a.mouth;g.face=a.face;g.hands=a.hands;g.feet=a.feet;g.dims=a.dims;
  g.setLamp=m=>a.setLamp(m);g.setBottle=m=>a.setBottle(m);
  g.drive=(t,st)=>a.drive(t,st);
  g.applyPose=s=>buildPose(a,{rootX:0,rootZ:0,yaw:0,visible:true,...s},0,a.dims);
  g.userData.actor=a;
  return g;
}
