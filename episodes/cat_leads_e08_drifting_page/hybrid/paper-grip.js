import * as THREE from 'three';
import {twoBone} from '/craft/pose3d.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

export const penAnchor=V(.071,.024,.024);
export const penAxis=V(-.75,.38,-.54).normalize();
const penThumbPole=V(0,0,1);
// The thumb closes from the palm side; placing it across the shaft from its
// own knuckle makes the shaft cross the thumb even when its endpoint is clear.
const radialThumb=V(0,1,0).addScaledVector(penAxis,-penAxis.y).normalize().applyAxisAngle(penAxis,Math.PI*1.5);
const radialIndex=penAxis.clone().cross(radialThumb).normalize();
export const penPads={
  thumb:penAnchor.clone().addScaledVector(radialThumb,.013),
  index:penAnchor.clone().addScaledVector(radialIndex,.0105),
  middle:penAnchor.clone().addScaledVector(radialThumb,-.007).addScaledVector(radialIndex,-.009)
};
export const gripAnchor=sign=>V(.071,.023,sign*.026);
export const restAnchor=sign=>V(.075,0,sign*.024);
export function paperHandQuaternion(sheetQuaternion,sign,reach){
  // Project the shoulder-to-grip direction onto the sheet. A receiving hand
  // reaches in from the side before turning up into the final reading pose.
  const x=reach?reach.clone().applyQuaternion(sheetQuaternion.clone().invert()):V(0,1,0);x.z=0;
  if(x.length()<.01)x.set(0,1,0);x.normalize();
  const z=V(0,0,sign),y=z.clone().cross(x);
  return sheetQuaternion.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)));
}
export function restHandQuaternion(sheetQuaternion,inward){
  const x=V(inward*.50,-.866,0).normalize(),z=V(0,0,inward),y=z.clone().cross(x);
  return sheetQuaternion.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)));
}
function poseDigit(chain,tip,endDirection,pole,weight){
  const base=V(...chain.base),last=chain.name==='thumb'?tip:tip.clone().addScaledVector(endDirection.clone().normalize(),-chain.lengths[2]);
  const joint=twoBone(base,last,pole,chain.lengths[0],chain.lengths[1]);
  const points=[base,V(joint.x,joint.y,joint.z),last,...(chain.name==='thumb'?[]:[tip])];
  let parentQ=new THREE.Quaternion();
  for(let i=0;i<chain.bones.length;i++){
    const bone=chain.bones[i],direction=points[i+1].clone().sub(points[i]).normalize();
    const absolute=new THREE.Quaternion().setFromUnitVectors(V(1,0,0),direction);
    bone.quaternion.slerp(parentQ.clone().invert().multiply(absolute),weight);parentQ.multiply(bone.quaternion);
  }
}
export function setGraspFingers(hand,kind,weight=1){
  const sign=hand.sign;
  for(const chain of hand.chains){
    const name=chain.name,thumb=name==='thumb';let tip,end=V(-.6,0,sign*.8),pole=V(1,0,-sign*.6);
    if(kind==='pen'){
      if(!penPads[name])continue;
      tip=penPads[name].clone();
      if(name==='index')end=V(-.50,-.12,.86);
      if(name==='middle')end=V(-.75,.15,.65);
      if(thumb)pole=penThumbPole.clone();
    }else if(kind==='paper'){
      const points={thumb:[.071,.022,.034],index:[.071,.024,.020],middle:[.083,.006,.010],ring:[.080,-.012,.006],little:[.071,-.027,.003]};
      tip=V(...points[name]);tip.z*=sign;
      if(thumb)pole=V(.4,1,-sign*.25);
    }else{
      // Rest on the upper page; all pads remain above its surface. The thumb
      // relaxes beside the spine instead of attempting to pinch the cover.
      if(thumb)continue;
      tip=V(chain.base[0]+chain.lengths.reduce((a,b)=>a+b,0)-.008,chain.base[1],sign*.018);
      end=V(1,0,sign*.24);pole=V(1,0,-sign);
    }
    poseDigit(chain,tip,end,pole,weight);
  }
}
export function fingertip(hand,name){
  const chain=hand.chains.find(c=>c.name===name),bone=chain.bones.at(-1);
  hand.updateMatrixWorld(true);return hand.worldToLocal(bone.localToWorld(V(chain.lengths.at(-1),0,0)));
}
export function inspectPaperPads(hand){
  const thumb=fingertip(hand,'thumb'),index=fingertip(hand,'index'),anchor=gripAnchor(hand.sign);
  return {opposed:(thumb.z-anchor.z)*hand.sign>0&&(index.z-anchor.z)*hand.sign<0,
    oppositionOffset:Math.hypot(thumb.x-index.x,thumb.y-index.y),
    thumbPlaneDistance:(thumb.z-anchor.z)*hand.sign,indexPlaneDistance:(index.z-anchor.z)*hand.sign};
}
export function inspectPenPads(hand){
  const pads={};
  for(const name of ['thumb','index','middle']){
    const delta=fingertip(hand,name).sub(penAnchor),along=delta.dot(penAxis);
    pads[name]={radialDistance:delta.addScaledVector(penAxis,-along).length(),along};
  }
  return pads;
}
export function inspectPenSurface(hand){
  hand.updateMatrixWorld(true);hand.skeleton.update();hand.surface.computeBoundingSphere();
  const tip=hand.localToWorld(penAnchor.clone().addScaledVector(penAxis,-.060));
  const direction=penAxis.clone().transformDirection(hand.matrixWorld),ray=new THREE.Raycaster(tip,direction,.024,.179);
  const previousSide=hand.surface.material.side;
  try{
    hand.surface.material.side=THREE.DoubleSide;
    return ray.intersectObject(hand.surface,false).map(hit=>({distance:hit.distance,point:hand.worldToLocal(hit.point.clone()).toArray()}));
  }finally{hand.surface.material.side=previousSide;}
}
