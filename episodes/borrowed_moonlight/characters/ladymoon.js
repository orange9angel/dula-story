// 《借走月光的女孩》月亮夫人（~185cm）：修长体态、银发及腰、象牙白半透明长裙（双层）、
// 发间碎银星尘、银白光晕、冷珍珠肤色。表情=疲惫慈爱/复苏（+blink）；动作极慢如水中飘。
// 坐姿：buildPose sit 分支（髋压座面、膝前伸）+ 裙摆前片让座。
import * as THREE from 'three';
import {LimbSurface,ringsGeometry,mesh,jointInk,shoeGeometry} from 'dula-assets/lib/craft3d/surface.js';
import {ArticulatedHand} from 'dula-assets/lib/craft3d/hand.js';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';
import {stageHead,scalpPoint} from './face.js';
import {buildPose,applyRigPose,V,clamp,mix} from './rig.js';

const ramp=coolShadowRamp();
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});
const TAU=Math.PI*2;
// 确定性 LCG（星尘位置：seek 一致性纪律，禁 Math.random）
const lcg=s=>()=> (s=(s*1664525+1013904223)>>>0)/4294967296;

const DIMS={hipIdle:.85,shoulderY:1.52,shoulderHalf:.105,hipHalf:.075,
  legA:.40,legB:.40,armA:.195,armB:.185,footY:.065,strideFactor:.8};

export class LadyMoonCraft{
  constructor(){
    this.dims=DIMS;
    this.mesh=new THREE.Group();this.mesh.name='LadyMoon';
    this.body=new THREE.Group();this.mesh.add(this.body);
    // 冷珍珠肤色 + 象牙白半透明裙料（独立材质，不进缓存；revived 时调 glow）
    const skin=toon('#eef0f4');
    this.gownOuter=new THREE.MeshToonMaterial({color:'#f4f2ea',gradientMap:ramp,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false});
    this.gownInner=new THREE.MeshToonMaterial({color:'#ece9de',gradientMap:ramp,transparent:true,opacity:.78,side:THREE.DoubleSide});
    this.limbs={};this.hands={};this.feet={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,skin,[[0,.062],[.3,.052],[.6,.042],[1,.034]],{depth:.92});
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      mesh(shoe,shoeGeometry(),'#d8d4c8');
      // 半透明广袖（袖=肢体件，同数据更新）；肩口收窄避免"肩甲"块感
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,this.gownInner,[[0,.044],[.35,.042],[.7,.048],[1,.055]],{depth:.88});
      const hand=new ArticulatedHand(sign,skin,jointInk);hand.scale.setScalar(.76);this.mesh.add(hand);this.hands[side]=hand;
    }
    // 上身：象牙白胸衣环列（纤细）
    mesh(this.body,ringsGeometry([[.84,.108,.080],[.95,.112,.082],[1.06,.104,.076],[1.18,.108,.078],[1.30,.112,.080],[1.42,.100,.072],[1.50,.086,.064],[1.55,.046,.042]]),this.gownInner);
    // 长裙：内层（及地实感）+ 外层（更宽更透），A 摆
    mesh(this.body,ringsGeometry([[.88,.115,.085],[.60,.150,.115],[.30,.190,.150],[.06,.225,.185]]),this.gownInner);
    const outer=mesh(this.body,ringsGeometry([[.92,.130,.098],[.60,.168,.130],[.28,.215,.172],[.04,.255,.210]]),this.gownOuter,false);
    outer.renderOrder=2;
    // ── 头：修长静穆脸 + 银蓝眼 + 银发及腰 + 星尘 + 光晕 ──
    this.face=stageHead(this.body,{
      name:'ladymoon',skin:'#eef0f4',line:'#a8acb8',brow:'#a8b0be',mouth:'#9a8c96',
      eyeDx:76,eyeH:26,eyeW:30,irisR:17,iris0:'#4a5468',iris1:'#8fa0bc',iris2:'#ccd8ea',
      browUp:46,browT:4,mouthW:22,neckR:.040,headScale:.92,
      emotions:{
        weary:{weary:1,smile:.3},revived:{awe:.35,smile:.55},
      },
      // 修长脸断面表（窄颊、下颌柔收）
      profile:[[-.070,.028,.050,.042],[-.050,.058,.082,.064],[-.016,.084,.102,.086],
        [.042,.098,.114,.102],[.110,.102,.118,.110],[.168,.088,.100,.102],[.206,.052,.070,.076],[.229,.001,.001,.001]],
      hair:{rx:.114,rz:.126,h:.176,napeRx:.094,napeRz:.098,color:'#e2e8f0',dark:'#b6bfce',
        boundary:a=>{const t=Math.acos(Math.cos(a));
          const ks=[[0,1.00],[.8,1.20],[1.5,1.55],[1.95,2.05],[2.6,2.40],[Math.PI,2.46]];
          for(let i=1;i<ks.length;i++)if(t<=ks[i][0]){const[x0,y0]=ks[i-1],[x1,y1]=ks[i];
            return mix(y0,y1,(t-x0)/(x1-x0));}return ks.at(-1)[1];},
        fringe:[[-1.0,-.5,1.36,.20,'#e4e9f0'],[-.72,-.12,1.42,.22,'#e6ebf2'],[-.28,.28,1.40,.22,'#e4e9f0'],
          [.12,.72,1.42,.22,'#e6ebf2'],[.5,1.0,1.36,.20,'#e4e9f0']],
        nape:[]}, // 后颈由及腰长发片覆盖
    },1.60);
    this.headGroup=this.face.head;this.mouth=this.face.mouth;
    // 银发及腰：脑后长发片（从颅顶垂到腰，头组局部坐标，缓弯外弓）
    const hairMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
    const longLock=(azC,width,len,bow,col)=>{
      const p=[],colors=[],idx=[],n=22,m=6,base=new THREE.Color(col),shade=base.clone().multiplyScalar(.86);
      for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
        const u=i/n,v=j/m*2-1,az=azC+v*width*(1-u*.55);
        const pt=scalpPoint(this.hairCfg,Math.min(2.5,1.5+u*.9),az,.004);
        pt.y-=u*len;pt.z-=bow*Math.sin(Math.PI*u); // 下垂+后弓
        p.push(pt.x,pt.y,pt.z);
        const c=base.clone().lerp(shade,.3+.5*u);colors.push(c.r,c.g,c.b);
        if(i<n&&j<m){const k=i*(m+1)+j;idx.push(k,k+m+1,k+1,k+1,k+m+1,k+m+2);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
      g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
      const lock=new THREE.Mesh(g,hairMat);this.headGroup.add(lock);this.backLocks?.push(lock);
    };
    // 注：longLock 依赖 this.hairCfg（下方赋值），先存配置再调用
    this.hairCfg={hair:{rx:.114,rz:.126,h:.176,napeRx:.094,napeRz:.098}};
    this.backLocks=[]; // P5：发片次级运动锚（performance.js 水中飘微摆）
    longLock(Math.PI,.55,.78,.10,'#e2e8f0');       // 脑后主片
    longLock(Math.PI-.62,.30,.70,.07,'#d8dfea');  // 左后
    longLock(Math.PI+.62,.30,.70,.07,'#d8dfea');  // 右后
    // 胸前两侧垂绺（及胸，放宽防"塑料条"感）
    longLock(1.5,.24,.42,.04,'#e6ebf2');longLock(-1.5,.24,.42,.04,'#e6ebf2');
    // 发间碎银星尘：LCG 定点小八面体，加色银光
    const rnd=lcg(20260707);
    const starMat=new THREE.MeshBasicMaterial({color:'#eef4ff',blending:THREE.AdditiveBlending,transparent:true,opacity:.85,depthWrite:false});
    this.stardust=[];
    for(let i=0;i<26;i++){
      const s=new THREE.Mesh(new THREE.OctahedronGeometry(.004+rnd()*.005),starMat);
      const az=(rnd()*2-1)*Math.PI*.92,th=.5+rnd()*1.3;
      const pt=scalpPoint(this.hairCfg,th,az,.006+rnd()*.004);
      s.position.copy(pt);s.rotation.set(rnd()*TAU,rnd()*TAU,0);
      this.headGroup.add(s);this.stardust.push(s);
    }
    // 银白光晕：脑后斜置环（加色、不写深度）
    this.halo=new THREE.Mesh(new THREE.TorusGeometry(.155,.010,8,28),
      new THREE.MeshBasicMaterial({color:'#cfe0f4',blending:THREE.AdditiveBlending,transparent:true,opacity:.55,depthWrite:false}));
    this.halo.position.set(0,.10,-.075);this.halo.rotation.x=-.28;this.headGroup.add(this.halo);
    this.glowLevel=0; // revived 由 setEmotion 调节
  }
  setEmotion(e,b){
    this.face.setEmotion(e,b);
    // 复苏：光晕与星尘增强而不刺眼（圣经：复苏后增强）
    const r=e==='revived'?1:0;this.glowLevel=r;
    this.halo.material.opacity=.55+.30*r;this.halo.scale.setScalar(1+.12*r);
    this.stardust[0].material.opacity=.85+.15*r; // 星尘共享同一材质实例，整体调
  }
  setActing(a){this.face.setActing(a);}
  setPose(p){
    applyRigPose(this,p);
  }
  // 待机：极慢呼吸般浮动（水中飘）+ 慢眨眼；月宫拍由 viewer 以 y=.9 座面驱动坐姿
  drive(t,st){
    const blink=Math.exp(-Math.pow(((t+.6)%5.3)-.15,2)/.010);
    const seated=st.pos[1]>.3;
    const s=seated?{ // 王座坐姿：mesh 原点=座面，髋贴座、膝前伸、脚踏踏台
      rootX:st.pos[0],rootZ:st.pos[2],yaw:st.yaw,visible:st.visible,
      bob:.004*Math.sin(t*.9),lean:.04,
      headYaw:.02*Math.sin(t*.4),headPitch:.04,headRoll:0,
      sit:{hipY:.10,footY:-.55,footZ:.30},
      left:V(-.13,.42,.10),right:V(.13,.42,.10), // 手置扶手上位（局部，髋上）
      gL:{open:.25},gR:{open:.25}}
    :{
      rootX:st.pos[0],rootZ:st.pos[2],yaw:st.yaw,visible:st.visible,
      bob:.006*Math.sin(t*.8),lean:0,
      headYaw:.02*Math.sin(t*.4),headPitch:.02,headRoll:0,
      left:V(-.14,1.16,.06),right:V(.14,1.16,.06),
      gL:{open:.2},gR:{open:.2}};
    buildPose(this,s,t,DIMS);
    this.setActing({blink:clamp(blink)});
  }
}

export function makeLadyMoon(){
  const a=new LadyMoonCraft(),g=a.mesh;
  g.setPose=p=>a.setPose(p);g.setEmotion=(e,b)=>a.setEmotion(e,b);g.setActing=x=>a.setActing(x);
  g.mouth=a.mouth;g.face=a.face;g.hands=a.hands;g.feet=a.feet;g.dims=a.dims;
  g.drive=(t,st)=>a.drive(t,st);
  g.applyPose=s=>buildPose(a,{rootX:0,rootZ:0,yaw:0,visible:true,...s},0,a.dims);
  g.userData.actor=a;
  return g;
}
