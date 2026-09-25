import * as THREE from 'three';
import {LimbSurface,ringsGeometry,shoeGeometry,mesh,ellipsoid,mat,jointInk} from '/craft/character3d.js';
import {ArticulatedHand} from './hand3d.js';
import {HeadAssembly} from './head3d.js';
import {setGraspFingers} from './paper-grip.js';

const V=p=>new THREE.Vector3(p.x,p.y,p.z??0);
export class RiverKid {
  constructor(kind){
    this.kind=kind;const girl=kind==='Girl';
    const C=this.C={ink:'#354052',skin:'#ffe3d1',hair:girl?'#3a435e':'#35313b',hairDark:'#293142',iris:girl?'#427f9a':'#616576',style:girl?'bob':'short'};
    this.mesh=new THREE.Group();this.mesh.name=kind;this.body=new THREE.Group();this.mesh.add(this.body);
    this.limbs={};this.clothes={};this.hands={};this.feet={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,C.skin,[[0,.064],[.25,.057],[.51,.037],[.69,.044],[1,.027]]);
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,C.skin,[[0,.047],[.25,.042],[.51,.030],[.7,.034],[1,.022]],{depth:.87});
      this.clothes[side+'Sleeve']=new LimbSurface(this.mesh,girl?'#fff8e6':'#eda45f',[[0,.067],[.18,.067],[.35,.057],[1,.044]],{end:.31});
      this.clothes[side+'Leg']=new LimbSurface(this.mesh,girl?'#fff8e6':'#bba984',girl?[[0,.045],[.82,.039],[1,.03]]:[[0,.076],[.3,.071],[.52,.05],[.72,.055],[1,.037]],girl?{start:.83}:{end:.95});
      const hand=new ArticulatedHand(sign,mat(C.skin),jointInk);this.mesh.add(hand);this.hands[side]=hand;
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      mesh(shoe,shoeGeometry(),girl?'#3b506b':'#706057');
      const sole=mesh(shoe,shoeGeometry(),'#eee1c6');sole.scale.y=.13;sole.position.y=-.08447;
      ellipsoid(shoe,[0,.022,-.001],[.054,.007,.025],girl?'#6584b3':'#c6bda8',false);
    }
    const torso=new THREE.Group();this.body.add(torso);
    if(!girl){torso.scale.set(1.18,1.25,1.05);torso.position.y=-.70*.25;}
    mesh(torso,ringsGeometry([[.75,.155,.11],[.87,.149,.105],[.99,.157,.113],[1.071,.178,.10],[1.10,.072,.061]]),girl?'#fff8e6':'#eda45f');
    for(const sign of [-1,1])ellipsoid(torso,[sign*.153,1.047,0],[.078,.061,.101],girl?'#fff8e6':'#eda45f',false);
    if(girl){
      mesh(this.body,ringsGeometry([[.54,.25,.17],[.565,.25,.17],[.71,.183,.13],[.86,.16,.116]]),'#4e7fd4');
      const bib=mesh(this.body,new THREE.BoxGeometry(.20,.21,.012),'#4e7fd4');bib.position.set(0,.95,.111);
      for(const sign of [-1,1]){
        const strap=mesh(this.body,new THREE.BoxGeometry(.035,.17,.012),'#4e7fd4');strap.position.set(sign*.087,1.023,.1);strap.rotation.z=sign*.12;
        ellipsoid(this.body,[sign*.07,.988,.126],[.010,.01,.004],'#e9c66a',false);
      }
      mesh(this.body,ringsGeometry([[.553,.253,.174],[.565,.251,.173]]),'#759bdc',false);
    }else mesh(this.body,ringsGeometry([[.625,.16,.111],[.805,.16,.109]]),'#bba984');
    this.headAssembly=new HeadAssembly({mesh,ellipsoid,C});this.body.add(this.headAssembly);
  }
  setPose(p){
    this.mesh.position.set(p.rootX,0,p.rootZ);this.mesh.rotation.y=p.yaw;
    this.body.rotation.set(p.bodyTilt??0,0,p.bodyRoll??0);
    this.body.position.copy(new THREE.Vector3(0,.70,0).sub(new THREE.Vector3(0,.70,0).applyEuler(this.body.rotation)));this.body.position.y+=p.bob;
    this.headAssembly.setPose(p);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.limbs[side+'Leg'].update(leg);
      this.clothes[side+'Sleeve'].update(arm);this.clothes[side+'Leg'].update(leg);
      const hand=this.hands[side],x=p[side+'HandDirection']?V(p[side+'HandDirection']).normalize():V(arm[2]).sub(V(arm[1])).normalize();
      let y=new THREE.Vector3(0,0,1).addScaledVector(x,-x.z);
      if(y.length()<.01)y=new THREE.Vector3(0,1,0).addScaledVector(x,-x.y);
      y.normalize();const z=x.clone().cross(y).normalize();y.copy(z).cross(x).normalize();
      hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),p[side+'Roll']??-sign*.35));
      if(p[side+'GripQuaternion'])hand.quaternion.slerp(p[side+'GripQuaternion'],p[side+'GripWeight']??1);
      hand.setGesture(p[side+'Gesture']??{});hand.position.copy(V(arm[2]));
      if(p[side+'GripWeight'])setGraspFingers(hand,p[side+'GripKind']??'paper',p[side+'GripWeight']);
      this.feet[side].position.copy(V(leg[2]));this.feet[side].rotation.set(p[side+'FootPitch']??0,p[side+'FootYaw']??0,0,'YXZ');
    }
    this.mesh.updateMatrixWorld(true);
  }
  world(point){return this.mesh.localToWorld(V(point));}
}

export class LoafCat {
  constructor(scene){
    this.mesh=new THREE.Group();scene.add(this.mesh);this.mesh.position.set(1.45,.0,.52);
    this.body=ellipsoid(this.mesh,[0,.19,0],[.28,.19,.18],'#e8a053');
    const head=ellipsoid(this.mesh,[-.22,.26,.025],[.16,.145,.135],'#efaf62');
    for(const sign of [-1,1]){
      const ear=mesh(this.mesh,new THREE.ConeGeometry(.072,.14,3),'#de9952');ear.position.set(-.22+sign*.095,.39,.015);ear.rotation.y=Math.PI/2;
      const inside=mesh(this.mesh,new THREE.ConeGeometry(.038,.073,3),'#e7b6a2',false);inside.position.copy(ear.position).add(new THREE.Vector3(0,.006,.026));inside.rotation.copy(ear.rotation);
      ellipsoid(this.mesh,[-.22+sign*.079,.26,.153],[.03,.006,.005],'#78533e',false);
    }
    ellipsoid(this.mesh,[-.22,.227,.166],[.016,.011,.009],'#9d6555',false);
    for(let i=0;i<3;i++){const stripe=ellipsoid(this.mesh,[-.08+i*.11,.343,.018],[.028,.015,.131],'#cc8545',false);stripe.rotation.z=-.17;}
    for(const x of [-.25,-.10])ellipsoid(this.mesh,[x,.061,.13],[.07,.057,.065],'#f2bb77');
    this.tail=new THREE.Group();this.tail.position.set(.23,.13,0);this.mesh.add(this.tail);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.13,.04,.02),new THREE.Vector3(.17,.16,.04),new THREE.Vector3(.1,.20,.05)]);
    mesh(this.tail,new THREE.TubeGeometry(curve,24,.035,10,false),'#d98e46');
  }
  update(t){this.body.scale.y=1+.023*Math.sin(t*1.65);this.tail.rotation.y=.08*Math.sin(t*.9);}
}
