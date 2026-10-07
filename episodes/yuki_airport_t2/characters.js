// Local production variants: curved sleeve roots and embedded feline shoulders.
import * as THREE from 'three';
import {YukiCraft3D,LimbSurface,mesh,ellipsoid,jointInk} from '/craft/character3d.js';
import {MochiCraft3D} from '/fish/mochi3d.js';
import {twoBone} from '/craft/pose3d.js';
const V=p=>new THREE.Vector3(p.x,p.y,p.z??0);

class ShoulderSleeve {
 constructor(parent){
  this.rows=28;this.sides=32;
  const g=this.geometry=new THREE.BufferGeometry(),n=(this.rows+1)*this.sides;
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));
  const indices=[],contour=new Float32Array(n);
  for(let i=0;i<=this.rows;i++)for(let j=0;j<this.sides;j++){
   contour[i*this.sides+j]=Math.min(1,i/8);
   if(i<this.rows){const a=i*this.sides+j,b=i*this.sides+(j+1)%this.sides;indices.push(a,b,a+this.sides,b,b+this.sides,a+this.sides);}
  }
  g.setAttribute('contour',new THREE.BufferAttribute(contour,1));g.setIndex(indices);
  this.mesh=mesh(parent,g,'#fff9ed');this.mesh.children[0].material=jointInk;
  this.mesh.frustumCulled=false;this.mesh.children[0].frustumCulled=false;
 }
 update(arm,sign,bob){
  const shoulder=V(arm[0]),dir=V(arm[1]).sub(shoulder).normalize();
  const root=new THREE.Vector3(sign*.112,1.047+bob,-.003);
  const cuff=shoulder.clone().addScaledVector(dir,.112);
  const curve=new THREE.CubicBezierCurve3(root,new THREE.Vector3(sign*.172,1.100+bob,0),cuff.clone().addScaledVector(dir,-.05),cuff);
  const p=this.geometry.attributes.position;
  for(let i=0;i<=this.rows;i++){
   const t=i/this.rows,c=curve.getPoint(t),axis=curve.getTangent(t);
   const x=new THREE.Vector3(0,0,1).cross(axis).normalize(),z=axis.clone().cross(x).normalize();
   const r=.047+.015*Math.sin(Math.PI*t)-.001*t;
   for(let j=0;j<this.sides;j++){
    const a=j/this.sides*Math.PI*2,q=c.clone().addScaledVector(x,r*Math.cos(a)).addScaledVector(z,r*.95*Math.sin(a));
    p.setXYZ(i*this.sides+j,q.x,q.y,q.z);
   }
  }
  p.needsUpdate=true;this.geometry.computeVertexNormals();this.geometry.computeBoundingSphere();
 }
}
export class AirportYuki extends YukiCraft3D {
 constructor(){super();this.connectedSleeves={};for(const side of ['left','right']){this.sleeves[side].mesh.visible=false;this.connectedSleeves[side]=new ShoulderSleeve(this.mesh);}
  this.skirtSurfaces=this.body.children.filter(o=>o.isMesh&&['35466f','7382a2'].includes(o.material.color?.getHexString())).map(o=>({geometry:o.geometry,rest:o.geometry.attributes.position.array.slice()}));
 }
 setPose(p){super.setPose(p);for(const [side,sign] of [['left',-1],['right',1]])this.connectedSleeves[side].update(p[side+'Arm'],sign,p.bob);
  // The cloth follows the bent knees; a rigid skirt would expose their roots.
  const crouch=Math.max(0,Math.min(1,-p.bob/.19));
  for(const {geometry,rest} of this.skirtSurfaces){const pos=geometry.attributes.position;
   for(let i=0;i<pos.count;i++){const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2],hem=Math.max(0,Math.min(1,(.77-y)/.20));pos.setXYZ(i,x*(1+.10*crouch*hem),y,z+Math.max(0,z)/.174*.20*crouch*hem);}
   pos.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
  }
 }
}
export class AirportMochi extends MochiCraft3D {
 constructor(){
  super();this.forelimbs={};this.paws={};this.pawSocks={};
  for(const [name,sign] of [['leftArm',-1],['rightArm',1]]){
   const g=this[name];g.children.forEach(o=>o.visible=false);g.position.set(sign*.15,.43,.12);
   const limb=new LimbSurface(g,'#d98a3c',[[0,.060],[.25,.079],[.6,.066],[1,.053]],{depth:.94});
   limb.update([{x:0,y:0,z:0},{x:sign*.014,y:-.18,z:.15},{x:sign*.02,y:-.352,z:.248}]);
   const sock=new LimbSurface(g,'#fdf3e0',[[0,.07],[.60,.067],[.78,.056],[1,.053]],{start:.72,depth:.96});
   sock.update([{x:0,y:0,z:0},{x:sign*.014,y:-.18,z:.15},{x:sign*.02,y:-.352,z:.248}]);
   const paw=new THREE.Group();paw.position.set(sign*.020,-.357,.255);g.add(paw);
   ellipsoid(paw,[0,0,0],[.066,.039,.081],'#fdf3e0');
   for(const x of [-.025,0,.025])ellipsoid(paw,[x,-.003,.058],[.020,.025,.028],'#fdf3e0',false);
   this.forelimbs[name]=limb;this.paws[name]=paw;this.pawSocks[name]=sock;
  }
 }
 setForepaw(name,target){
  const group=this[name],sign=name==='leftArm'?-1:1;
  group.rotation.set(0,0,0);
  const end=new THREE.Vector3(...target).sub(group.position),d=end.length();
  if(d>.465)end.multiplyScalar(.465/d);
  const start={x:0,y:0,z:0},p={x:end.x,y:end.y,z:end.z};
  const elbow=twoBone(start,p,{x:sign*.25,y:-.65,z:-.15},.245,.235);
  this.forelimbs[name].update([start,elbow,p]);this.pawSocks[name].update([start,elbow,p]);
  this.paws[name].position.copy(end);this.paws[name].rotation.x=target[1]>.18?-.65:0;
  return group.position.clone().add(end);
 }
}
