import * as THREE from 'three';
import {twoBone} from '/craft/pose3d.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
// Sheet lies on the palm side. Thumb pad and finger pads touch opposite faces;
// the wrist remains outside the edge, instead of hanging over its centre.
export const gripAnchor=sign=>V(.044,.025,sign*.020);
export function paperHandQuaternion(sheetQuaternion,inward,sign){
  const x=V(inward,0,0),y=V(0,1,0),z=x.clone().cross(y);
  return sheetQuaternion.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)));
}
export function setPaperFingers(hand,weight=1){
  hand.updateMatrixWorld(true);
  for(const chain of hand.chains){
    const thumb=chain.name==='thumb',base=V(...chain.base),sign=hand.sign;
    const tip=thumb?V(.047,.027,sign*.028):V(base.x+chain.lengths.reduce((a,b)=>a+b,0)-.007,base.y,sign*.014);
    const last=thumb?tip:tip.clone().sub(V(chain.lengths[2],0,0));
    const elbow=twoBone(base,last,V(0,0,-sign),chain.lengths[0],chain.lengths[1]);
    const points=[base,V(elbow.x,elbow.y,elbow.z),last,...(thumb?[]:[tip])];
    let parentQ=new THREE.Quaternion();
    for(let i=0;i<chain.bones.length;i++){
      const bone=chain.bones[i],direction=points[i+1].clone().sub(points[i]).normalize();
      const absolute=new THREE.Quaternion().setFromUnitVectors(V(1,0,0),direction);
      const local=parentQ.clone().invert().multiply(absolute);
      bone.quaternion.slerp(local,weight);parentQ.multiply(bone.quaternion);
    }
  }
}

// Measure the deformed skin near the actual terminal phalanges, not just a
// virtual wrist anchor. Signed distances distinguish the two sides of paper.
export function inspectPaperPads(hand){
  hand.updateMatrixWorld(true);hand.skeleton.update();
  if(!hand.paperPadSamples){
    hand.paperPadSamples={};const positions=hand.geometry.attributes.position;
    for(const name of ['thumb','index']){
      const chain=hand.chains.find(c=>c.name===name),tip=chain.points.at(-1),ids=[];
      for(let i=0;i<positions.count;i++)if(V().fromBufferAttribute(positions,i).distanceTo(tip)<.009)ids.push(i);
      hand.paperPadSamples[name]=ids;
    }
  }
  const pads={};
  for(const [name,ids] of Object.entries(hand.paperPadSamples)){
    const distances=ids.map(i=>hand.surface.getVertexPosition(i,V()).z*hand.sign-.020);
    pads[name]={samples:ids.length,mean:distances.reduce((a,b)=>a+b,0)/ids.length,nearest:Math.min(...distances.map(Math.abs)),min:Math.min(...distances),max:Math.max(...distances)};
  }
  return {pads,opposed:pads.thumb.mean>0&&pads.index.mean<0};
}
