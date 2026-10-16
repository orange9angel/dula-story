import * as THREE from 'three';
import {calibrateHands,distributeWristTwist,orientHandWithForearm,aimAnatomicalHand} from 'dula-assets/lib/craft3d/anatomical-hand.js';
import {makeSkinnedSamples} from 'dula-assets/lib/craft3d/skinned-samples.js';
const V=p=>new THREE.Vector3(p.x,p.y,p.z??0),Q=()=>new THREE.Quaternion();
const clamp=THREE.MathUtils.clamp;

// Old craft characters use -X for their named left arm. Imported anatomical
// left is +X. Lei's mark stays on anatomical LEFT; Aoi uses her inward RIGHT
// hand for the jar and carries her notebook in her LEFT.
export function preparePerformer(a,id){
  a.id=id;a.handFrames={};a.footRest={};
  for(const side of ['left','right']){
    const b=a.bones,h=b[side+'hand'];
    const y=a.neutral[side+'handmiddle1'].clone().sub(a.neutral[side+'hand']).normalize();
    const x=a.neutral[side+'handindex1'].clone().sub(a.neutral[side+'handpinky1']).normalize();
    const z=x.clone().cross(y).normalize();x.copy(y).cross(z).normalize();
    a.handFrames[side]={basis:Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)),bone:h.getWorldQuaternion(Q())};
    a.footRest[side]=b[side+'foot'].getWorldQuaternion(Q());
  }
  a.contactHand=id==='lei'?'left':'right';a.notebookHand='left';
  a.anatomicalHands=calibrateHands(a);
}
function handFacing(a,side,normal,direction,amount=1){
  const y=direction.clone().normalize(),z=normal.clone().normalize(),x=y.clone().cross(z).normalize();z.copy(x).cross(y).normalize();
  const frame=a.handFrames[side],desired=Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)).multiply(frame.basis.clone().invert()).multiply(frame.bone);
  const current=a.bones[side+'hand'].getWorldQuaternion(Q());a.setWorldQuaternion(a.bones[side+'hand'],current.slerp(desired,amount));
}
export function applyTripoPose(a,p,all){
  a.reset();a.mesh.position.set(p.rootX,0,p.rootZ);a.mesh.rotation.set(0,p.yaw,0);a.mesh.updateMatrixWorld(true);
  const b=a.bones,lei=a.id==='lei';
  if(a.motionFix){
    const hips=b.hips.getWorldPosition(new THREE.Vector3());
    hips.y+=(p.torso.shift?.[1]??0)-.004;
    b.hips.position.copy(b.hips.parent.worldToLocal(hips));a.mesh.updateMatrixWorld(true);
  }
  // Torso/head act independently of the planted feet.
  a.rotateLocalFrame(b.spine,p.torso.rotation);
  a.rotateLocalFrame(b.head,[p.headPitch,p.headYaw,p.headRoll]);
  for(const side of ['left','right']){
    const old=side==='left'?'right':'left',f=p.feet[old],n=a.neutral[side+'foot'];
    const target=a.mesh.localToWorld(new THREE.Vector3(f.x,n.y+f.y-.095,(a.motionFix?0:n.z)+f.z));
    if(a.motionFix)target.add(new THREE.Vector3(0,0,n.z).applyAxisAngle(new THREE.Vector3(0,1,0),f.yaw));
    a.solve([side+'upleg',side+'leg',side+'foot'],target,new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),p.yaw));
    const foot=Q().setFromEuler(new THREE.Euler(f.pitch??0,f.yaw,0)).multiply(a.footRest[side]);a.setWorldQuaternion(b[side+'foot'],foot);
  }
  const diagnostics={};
  for(const oldSide of ['left','right']){
    const side=lei?oldSide:(oldSide==='left'?'right':'left'),sign=side==='left'?1:-1;
    const original=p.localArms[oldSide],w=original[2];
    let target=new THREE.Vector3(lei?-w.x:w.x,w.y,w.z);
    // The new forearm/palm are longer. Relax the neutral wrist lower while
    // retaining the authored show / rub / warning / speaking gestures.
    const restY=(lei?1.375:1.295)-(oldSide==='left'?.345:.354);
    const activity=Math.max(clamp((w.y-restY)/.15,0,1),p.gestures[oldSide].open??0);
    if(!(a.id==='aoi'&&oldSide==='right'))target.y-=.115*(1-clamp(activity,0,1));
    if(a.correctWrists&&a.id==='aoi'&&oldSide==='left'){
      // The old short-arm warning target was waist-high; a vertical palm then
      // required a nearly folded-back wrist. Raise the whole forearm instead.
      const warning=clamp((p.gestures[oldSide].open??0)/.7,0,1);
      target.lerp(new THREE.Vector3(-.30,1.34,.20),warning);
      if(a.motionFix)target.z-=.14*Math.sin(Math.PI*warning);
    }
    target=a.mesh.localToWorld(target);
    const hold=side===a.contactHand?(lei?all.phase.leiHold:all.phase.aoiHold):0;
    if(hold>0){
      const contact=new THREE.Vector3(all.jar.x+(lei?.12:.115),all.jar.y+(lei?.16:.12),all.jar.z+(lei?.075:-.085));
      if(a.motionFix)contact.set(all.jar.x+.095,all.jar.y+.13,all.jar.z-(lei?.105:.085));
      const start=a.mesh.localToWorld(new THREE.Vector3(lei?.242:-.223,restY-.115,-.028));
      target.copy(start).lerp(contact,hold);
      // Approach from the same exterior side as the final grip. Clear the rim
      // while the palm rotates; a straight cross-jar interpolation intersects it.
      const arc=Math.sin(Math.PI*hold);
      target.y+=.24*arc;target.x+=.13*arc;target.z-=.08*arc;
    }
    const rub=lei&&side==='right'?all.phase.rub:0;
    if(rub>0){const contact=b.leftforearm.getWorldPosition(new THREE.Vector3()).lerp(b.lefthand.getWorldPosition(new THREE.Vector3()),.64);
      target.lerp(contact.add(new THREE.Vector3(-.105,.01,.065)),rub);}
    const clearance=lei?hold:0;
    const pole=(a.correctWrists?new THREE.Vector3(sign*.65,-.3,-.6):new THREE.Vector3(sign*(.8+2*clearance),-.8+.5*clearance,.35*(1-clearance))).applyAxisAngle(new THREE.Vector3(0,1,0),p.yaw);
    diagnostics[side]=a.solve([side+'arm',side+'forearm',side+'hand'],target,pole);
    if(!a.correctWrists&&hold>0){
      handFacing(a,side,new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,lei?-1:1),Math.min(1,hold*2.5));
    }
    if(!a.correctWrists&&rub>0)handFacing(a,side,new THREE.Vector3(0,0,-1),new THREE.Vector3(1,0,0),rub);
    const gesture=p.gestures[oldSide].open??0;
    if(a.correctWrists){
      let normal=new THREE.Vector3(-sign,.12,.08).normalize();
      const turnNormal=(to,amount)=>{const rot=Q().setFromUnitVectors(normal,to.clone().normalize());normal.applyQuaternion(Q().slerp(rot,clamp(amount,0,1)));};
      turnNormal(lei?new THREE.Vector3(0,1,.12):new THREE.Vector3(.65,.2,1),Math.min(1,gesture*1.6));
      // A nonzero upward component disambiguates the 180-degree inward grip.
      if(hold>0)turnNormal(new THREE.Vector3(-1,.35,.10),hold);
      if(rub>0)turnNormal(new THREE.Vector3(0,.1,-1),rub);
      if(a.id==='aoi'&&oldSide==='right')normal.set(.05,1,.15).normalize();
      normal.applyAxisAngle(new THREE.Vector3(0,1,0),p.yaw);
      a.handIntents??={};a.handIntents[side]=normal.toArray();
      orientHandWithForearm(a,side,normal);
      if(a.motionFix&&hold>0)aimAnatomicalHand(a,side,new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,1),hold,{maxBend:.65});
    }else if(!hold&&!rub&&gesture>.05)handFacing(a,side,lei?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1),lei?new THREE.Vector3(-1,0,.25):new THREE.Vector3(0,1,0),Math.min(1,gesture*1.8));
    if(!a.correctWrists&&a.id==='aoi'&&oldSide==='right'){
      handFacing(a,side,new THREE.Vector3(0,1,0),new THREE.Vector3(.8,0,.6),1);
    }
    // Curve the phalanges into a relaxed hand or grip, around each finger's
    // actual anatomical width axis. Bone suffixes must retain their digits.
    let curl=.12+(p.gestures[oldSide].fist??0)*.45+hold*(lei?.65:.24);
    if(a.motionFix)curl=THREE.MathUtils.lerp(curl,lei?.45:.40,hold);
    for(const finger of ['index','middle','ring','pinky'])for(let j=1;j<=3;j++){
      const bone=b[side+'hand'+finger+j];if(!bone)continue;
      const change=b[side+'hand'].getWorldQuaternion(Q()).multiply(a.handFrames[side].bone.clone().invert());
      const axis=new THREE.Vector3(1,0,0).applyQuaternion(a.handFrames[side].basis).applyQuaternion(change);
      const inv=bone.getWorldQuaternion(Q()).invert(),local=axis.applyQuaternion(inv).normalize();
      bone.quaternion.multiply(Q().setFromAxisAngle(local,curl*(j===1?.65:1)*(a.correctWrists&&side==='left'?-1:1)));a.mesh.updateMatrixWorld(true);
    }
    if(a.motionFix&&hold>0){
      // Oppose the fingers on the rear of the cylinder. Leaving the bind-pose
      // thumb extended made it the only contact and pushed the palm away.
      for(let j=1;j<=3;j++){
        const bone=b[side+'handthumb'+j],child=b[side+'handthumb'+(j+1)];
        if(!bone||!child)continue;
        const before=bone.quaternion.clone(),angle=[-.75,-1.10,-1.35][j-1];
        const tip=new THREE.Vector3(all.jar.x+.080*Math.cos(angle),all.jar.y+(lei?.17:.065),all.jar.z+.080*Math.sin(angle));
        a.aim(bone,child,tip);bone.quaternion.slerp(before,1-hold);a.mesh.updateMatrixWorld(true);
      }
    }
  }
  a.mesh.updateMatrixWorld(true);return diagnostics;
}

export function settleImportedWrists(a){
  if(a.correctWrists)for(const side of ['left','right'])distributeWristTwist(a,side,{share:0});
}

/** Carry the notebook on the actual palm, including its orientation. */
export function placeImportedNotebook(a,notebook){
  const side='left',hand=a.hands[side],r=a.anatomicalHands[side],q=hand.getWorldQuaternion(Q());
  const normal=r.palm.clone().applyQuaternion(q).normalize();
  const along=r.along.clone().applyQuaternion(q).normalize();
  const across=normal.clone().cross(along).normalize();
  along.copy(across).cross(normal).normalize();
  notebook.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,normal,along));
  notebook.position.copy(hand.getWorldPosition(new THREE.Vector3())).addScaledVector(along,.055).addScaledVector(normal,.025);
}

/** Finite outside approach for this upright jar: keep the authored jar path,
 * solve the hand outward using its rendered skin, and retain the wrist limit.
 * This only covers the contact hand against the jar, not arbitrary props. */
export function settleImportedJarGrip(a,jar,hold){
  if(!a.motionFix||hold<=0)return 0;
  a.contactSamples??=makeSkinnedSamples(a,.004);
  const side=a.contactHand,hand=a.hands[side],b=a.bones;let total=0;
  for(let pass=0;pass<4;pass++){
    const points=a.contactSamples.sample([side+'Hand'])[side+'Hand'];let shift=0;
    for(const pt of points){
      const z=pt.z-jar.z;if(Math.abs(z)>=.063)continue;
      const vertical=THREE.MathUtils.smoothstep(pt.y,jar.y-.035,jar.y)*(1-THREE.MathUtils.smoothstep(pt.y,jar.y+.22,jar.y+.255));
      shift=Math.max(shift,(Math.sqrt(.063**2-z*z)-(pt.x-jar.x))*vertical);
    }
    if(shift<.00005)break;
    const orientation=hand.getWorldQuaternion(Q()),target=hand.getWorldPosition(new THREE.Vector3());
    const pole=b[side+'forearm'].getWorldPosition(new THREE.Vector3()).sub(b[side+'arm'].getWorldPosition(new THREE.Vector3()));
    target.x+=shift;a.solve([side+'arm',side+'forearm',side+'hand'],target,pole);
    a.setWorldQuaternion(hand,orientation);distributeWristTwist(a,side,{share:0});total+=shift;
  }
  return total;
}
