import * as THREE from 'three';
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
}
function handFacing(a,side,normal,direction,amount=1){
  const y=direction.clone().normalize(),z=normal.clone().normalize(),x=y.clone().cross(z).normalize();z.copy(x).cross(y).normalize();
  const frame=a.handFrames[side],desired=Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)).multiply(frame.basis.clone().invert()).multiply(frame.bone);
  const current=a.bones[side+'hand'].getWorldQuaternion(Q());a.setWorldQuaternion(a.bones[side+'hand'],current.slerp(desired,amount));
}
export function applyTripoPose(a,p,all){
  a.reset();a.mesh.position.set(p.rootX,0,p.rootZ);a.mesh.rotation.set(0,p.yaw,0);a.mesh.updateMatrixWorld(true);
  const b=a.bones,lei=a.id==='lei';
  // Torso/head act independently of the planted feet.
  a.rotateLocalFrame(b.spine,p.torso.rotation);
  a.rotateLocalFrame(b.head,[p.headPitch,p.headYaw,p.headRoll]);
  for(const side of ['left','right']){
    const old=side==='left'?'right':'left',f=p.feet[old],n=a.neutral[side+'foot'];
    const target=a.mesh.localToWorld(new THREE.Vector3(f.x,n.y+f.y-.095,n.z+f.z));
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
    target=a.mesh.localToWorld(target);
    const hold=side===a.contactHand?(lei?all.phase.leiHold:all.phase.aoiHold):0;
    if(hold>0){
      const contact=new THREE.Vector3(all.jar.x+(lei?.12:.115),all.jar.y+(lei?.16:.12),all.jar.z+(lei?.075:-.085));
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
    const pole=new THREE.Vector3(sign*(.8+2*clearance),-.8+.5*clearance,.35*(1-clearance)).applyAxisAngle(new THREE.Vector3(0,1,0),p.yaw);
    diagnostics[side]=a.solve([side+'arm',side+'forearm',side+'hand'],target,pole);
    if(hold>0)handFacing(a,side,new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,lei?-1:1),Math.min(1,hold*2.5));
    if(rub>0)handFacing(a,side,new THREE.Vector3(0,0,-1),new THREE.Vector3(1,0,0),rub);
    const gesture=p.gestures[oldSide].open??0;
    if(!hold&&!rub&&gesture>.05)handFacing(a,side,lei?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1),lei?new THREE.Vector3(-1,0,.25):new THREE.Vector3(0,1,0),Math.min(1,gesture*1.8));
    if(a.id==='aoi'&&oldSide==='right')handFacing(a,side,new THREE.Vector3(0,1,0),new THREE.Vector3(.8,0,.6),1);
    // Curve the phalanges into a relaxed hand or grip, around each finger's
    // actual anatomical width axis. Bone suffixes must retain their digits.
    const curl=.12+(p.gestures[oldSide].fist??0)*.45+hold*(lei?.65:.24);
    for(const finger of ['index','middle','ring','pinky'])for(let j=1;j<=3;j++){
      const bone=b[side+'hand'+finger+j];if(!bone)continue;
      const change=b[side+'hand'].getWorldQuaternion(Q()).multiply(a.handFrames[side].bone.clone().invert());
      const axis=new THREE.Vector3(1,0,0).applyQuaternion(a.handFrames[side].basis).applyQuaternion(change);
      const inv=bone.getWorldQuaternion(Q()).invert(),local=axis.applyQuaternion(inv).normalize();
      bone.quaternion.multiply(Q().setFromAxisAngle(local,curl*(j===1?.65:1)));a.mesh.updateMatrixWorld(true);
    }
  }
  a.mesh.updateMatrixWorld(true);return diagnostics;
}
