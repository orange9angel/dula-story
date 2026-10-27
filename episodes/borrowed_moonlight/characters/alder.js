// 《借走月光的女孩》奥尔德（约 70 岁，略驼背）：长白胡须、灰眉、酒红旧礼服+铜扣马甲、
// 圆框眼镜、胸前多枚怀表、手指沾铜锈（手部材质带铜绿调）。表情=失神/震惊/释然（+blink）。
// 习惯动作：摸怀表（pose spec 右手指向胸前表串）。
import * as THREE from 'three';
import {LimbSurface,ringsGeometry,mesh,jointInk,shoeGeometry} from 'dula-assets/lib/craft3d/surface.js';
import {ArticulatedHand} from 'dula-assets/lib/craft3d/hand.js';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';
import {stageHead} from './face.js';
import {buildPose,applyRigPose,V,clamp,mix} from './rig.js';

const ramp=coolShadowRamp();
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});

const DIMS={hipIdle:.72,shoulderY:1.26,shoulderHalf:.125,hipHalf:.082,
  legA:.33,legB:.33,armA:.165,armB:.155,footY:.07,strideFactor:.7,shoulderZ:.07};

export class AlderCraft{
  constructor(){
    this.dims=DIMS;
    this.mesh=new THREE.Group();this.mesh.name='Alder';
    this.body=new THREE.Group();this.mesh.add(this.body);
    const skin=toon('#e8d0bc'),coatC=toon('#6e2830');
    // 手指沾铜锈：手部材质在肤色上偏铜绿（独立材质，不进共享缓存）
    const handSkin=new THREE.MeshToonMaterial({color:'#d8c0a4',gradientMap:ramp,emissive:'#3a4a3c',emissiveIntensity:.10});
    this.limbs={};this.hands={};this.feet={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,toon('#3c3430'),[[0,.066],[.3,.056],[.6,.046],[1,.038]],{depth:.92});
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      mesh(shoe,shoeGeometry(),'#2e2622');
      const sole=mesh(shoe,shoeGeometry(),'#57504a',false);sole.scale.y=.13;sole.position.y=-.08447;
      // 礼服长袖（袖=肢体件）
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,coatC,[[0,.056],[.35,.050],[.7,.040],[1,.034]],{depth:.88});
      const hand=new ArticulatedHand(sign,handSkin,jointInk);hand.scale.setScalar(.72);this.mesh.add(hand);this.hands[side]=hand;
    }
    // 躯干：酒红旧礼服环列（长礼服到胯下；驼背=脊柱曲线前倾，zc 逐节前移，避免 lean 脱节）
    mesh(this.body,ringsGeometry([[.58,.124,.094,0],[.70,.128,.096,.004],[.80,.120,.088,.012],[.92,.126,.092,.026],[1.04,.132,.094,.045],[1.16,.124,.088,.066],[1.26,.112,.080,.086],[1.31,.056,.050,.098]]),coatC);
    // 礼服下摆（前开两片，露出马甲与裤）
    for(const sign of [-1,1]){
      const tail=mesh(this.body,new THREE.BoxGeometry(.10,.34,.02),coatC);
      tail.position.set(sign*.07,.62,.09);tail.rotation.x=.06;tail.rotation.y=-sign*.15;
    }
    // 铜扣马甲：前襟深色片 + 双排铜扣（随驼背曲面 z 前移）
    const vest=mesh(this.body,new THREE.BoxGeometry(.15,.28,.022),'#4a3626');
    vest.position.set(0,1.07,.146);vest.rotation.x=.12;vest.userData.probeExclude=1;
    for(let i=0;i<4;i++)for(const sign of [-1,1]){
      const btn=mesh(this.body,new THREE.SphereGeometry(.008,8,6),'#b08c3a',false);
      btn.position.set(sign*.030,1.17-i*.066,.163-i*.013);btn.userData.probeExclude=1;
    }
    // 胸前怀表串：三枚怀表（大中小）+ 表链（曲线管），浮在马甲面上方（穿戴件 probeExclude）
    const brass='#b08c3a';
    this.watches=[];
    for(const [x,y,r] of [[-.045,1.10,.030],[.038,1.04,.026],[.0,.97,.024]]){
      const w=new THREE.Group();w.position.set(x,y,.172-(1.10-y)*.19);
      const disc=mesh(w,new THREE.CylinderGeometry(r,r,.012,16).rotateX(Math.PI/2),brass);
      const faceM=new THREE.Mesh(new THREE.CircleGeometry(r*.78,16),
        new THREE.MeshToonMaterial({color:'#efe6ce',gradientMap:ramp}));
      faceM.position.z=.008;w.add(faceM);
      w.rotation.x=.12;
      w.userData.probeExclude=1;this.body.add(w);this.watches.push(w);
    }
    for(const [a,b] of [[[-.045,1.13,.148],[.0,1.22,.158]],[[.038,1.07,.152],[.0,1.22,.158]],[[0,.995,.152],[.0,1.22,.158]]]){
      const chain=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...a),new THREE.Vector3((a[0]+b[0])/2,(a[1]+b[1])/2-.03,(a[2]+b[2])/2+.012),new THREE.Vector3(...b)),8,.0028,5),toon('#8a6c28'));
      chain.userData.probeExclude=1;this.body.add(chain);
    }
    // ── 头：老者长脸 + 灰眉 + 圆框眼镜 + 长白胡须 ──
    this.face=stageHead(this.body,{
      name:'alder',skin:'#e8d0bc',line:'#b08a70',brow:'#c8ccd4',mouth:'#9a6a5c',
      eyeDx:80,eyeH:24,eyeW:28,irisR:16,iris0:'#3a3630',iris1:'#7a705c',iris2:'#b0a488',
      browUp:44,browT:8,mouthW:24,neckR:.045,headScale:.90,neckZ:.085,headZ:.10,
      emotions:{
        dazed:{daze:1},shocked:{shock:1},relieved:{smile:.65,weary:.35},
      },
      // 略长脸断面表（下颌稍尖、颧骨窄）
      profile:[[-.070,.030,.052,.044],[-.050,.062,.086,.066],[-.016,.088,.106,.090],
        [.042,.104,.120,.108],[.110,.106,.122,.114],[.168,.092,.104,.106],[.206,.056,.074,.080],[.229,.001,.001,.001]],
      hair:{rx:.118,rz:.128,h:.180,napeRx:.096,napeRz:.100,color:'#d8dce4',dark:'#a8aeba',
        // 老人稀疏发：前额高发际、两侧薄、后颈稍长
        boundary:a=>{const t=Math.acos(Math.cos(a));
          const ks=[[0,.78],[.8,1.05],[1.5,1.30],[1.95,1.85],[2.6,2.20],[Math.PI,2.26]];
          for(let i=1;i<ks.length;i++)if(t<=ks[i][0]){const[x0,y0]=ks[i-1],[x1,y1]=ks[i];
            return mix(y0,y1,(t-x0)/(x1-x0));}return ks.at(-1)[1];},
        fringe:[[-.7,-.05,1.02,.18,'#dde1e8'],[.05,.7,1.00,.18,'#e0e4ea']],
        nape:[[1.8,2.7,.95,2.32,.20,'#d6dbe4'],[2.6,3.5,.95,2.38,.22,'#dde1e8'],[3.5,4.4,.95,2.30,.20,'#d6dbe4']]},
    },1.31);
    this.headGroup=this.face.head;this.mouth=this.face.mouth;
    // 圆框眼镜：双圆环+鼻梁+镜腿（黄铜色，挂头组随头动）
    const glassMat=toon('#9a7a30');
    for(const sign of [-1,1]){
      const rim=new THREE.Mesh(new THREE.TorusGeometry(.030,.004,6,18),glassMat);
      rim.position.set(sign*.042,.085,.128);rim.userData.probeExclude=1;this.headGroup.add(rim);
      const temple=new THREE.Mesh(new THREE.CylinderGeometry(.0022,.0022,.10,6),glassMat);
      temple.rotation.x=Math.PI/2;temple.position.set(sign*.072,.088,.085);
      temple.userData.probeExclude=1;this.headGroup.add(temple);
    }
    const bridge=new THREE.Mesh(new THREE.CylinderGeometry(.0025,.0025,.026,6),glassMat);
    bridge.rotation.z=Math.PI/2;bridge.position.set(0,.088,.130);bridge.userData.probeExclude=1;this.headGroup.add(bridge);
    // 长白胡须：主须（上宽下窄垂到胸前，压在马甲面上）+ 两撇唇须
    const beardMat=toon('#e4e8ee');
    const beard=mesh(this.headGroup,new THREE.CylinderGeometry(.082,.018,.32,14),beardMat);
    beard.scale.set(1,1,.55);beard.position.set(0,-.155,.082);beard.rotation.x=.24;
    const beardTip=mesh(this.headGroup,new THREE.SphereGeometry(.036,10,8),beardMat,false);
    beardTip.scale.set(1,.7,.55);beardTip.position.set(0,-.305,.115);
    this.beard=beard;this.beardTip=beardTip; // P5：胡须次级运动锚（performance.js 驱动）
    for(const sign of [-1,1]){
      const mo=mesh(this.headGroup,new THREE.SphereGeometry(.026,10,8),beardMat,false);
      mo.scale.set(1.3,.45,.6);mo.position.set(sign*.036,-.024,.108);mo.rotation.z=sign*.35;
    }
  }
  setEmotion(e,b){this.face.setEmotion(e,b);}
  setActing(a){this.face.setActing(a);}
  setPose(p){
    applyRigPose(this,p);
  }
  // 待机：驼背已烘进几何（脊柱 zc 曲线 + 头/颈/肩前移），垂手 + 慢眨眼
  drive(t,st){
    const blink=Math.exp(-Math.pow(((t+2.1)%4.6)-.12,2)/.007);
    const s={rootX:st.pos[0],rootZ:st.pos[2],yaw:st.yaw,visible:st.visible,
      bob:.003*Math.sin(t*1.1),lean:0,
      headYaw:.015*Math.sin(t*.5),headPitch:.12,headRoll:0, // 头微前倾看路
      left:V(-.155,.90,.10),right:V(.155,.90,.10),
      gL:{fist:.15},gR:{fist:.15}};
    buildPose(this,s,t,DIMS);
    this.setActing({blink:clamp(blink)});
  }
}

export function makeAlder(){
  const a=new AlderCraft(),g=a.mesh;
  g.setPose=p=>a.setPose(p);g.setEmotion=(e,b)=>a.setEmotion(e,b);g.setActing=x=>a.setActing(x);
  g.mouth=a.mouth;g.face=a.face;g.hands=a.hands;g.feet=a.feet;g.dims=a.dims;
  g.drive=(t,st)=>a.drive(t,st);
  g.applyPose=s=>buildPose(a,{rootX:0,rootZ:0,yaw:0,visible:true,...s},0,a.dims);
  g.userData.actor=a;
  return g;
}
