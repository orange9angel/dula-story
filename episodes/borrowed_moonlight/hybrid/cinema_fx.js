import * as THREE from 'three';
import {ANCHORS} from '../performance.js';
import {drawProjectedParticles} from './assets/draw_over_runtime/painted-particles.js';
export function drawRegisteredFX({g,fx,t,bodies,faceStates,camera,getLamp}){
 const scene=fx.update(t),systems=fx.fx.director.systems.get(scene)??[];
 const e=bodies.find(b=>b.actor==='Eileen'),a=bodies.find(b=>b.actor==='Alder');
 const m=[...bodies,...faceStates].find(b=>b.actor==='LadyMoon'),ef=faceStates.find(b=>b.actor==='Eileen');
 const lamp=getLamp(e),anchorV=new THREE.Vector3();
 const textCam=ANCHORS.snowtown.goodnight,look=new THREE.Vector3(...textCam.look),forward=look.clone().sub(new THREE.Vector3(...textCam.pos)).normalize();
 const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,forward).normalize(),center=look.clone().add(new THREE.Vector3(.58,.50,-.03));
 const visible=drawProjectedParticles({THREE,g,systems,camera:fx.cam,resolve(sys,project){
   const id=sys.seed;
   if(id>=71&&id<=75||[301,356,357,358,137].includes(id))return false;
   let from=null,target=null,scale=.6,maxRadius=5,alpha=.5;
   if(sys.anchor){typeof sys.anchor==='function'?sys.anchor(t,anchorV):sys.anchor.getWorldPosition(anchorV);from=project(anchorV.toArray());}
   if(id===101){if(!lamp)return false;target=lamp;scale=Math.max(.15,Math.min(.7,e.h/1500));maxRadius=3;}
   if(id===108){target=ef?[ef.eyeScreen[0]+70,ef.eyeScreen[1]]:lamp;scale=.38;maxRadius=3;if(!target)return false;}
   if([120,121].includes(id)){if(!e)return false;target=[e.x,e.y-e.h*.69];scale=.22;maxRadius=3;alpha=.4;}
   if(id===130){if(!e)return false;target=[e.x,e.y-e.h*.69];scale=.36;}
   if(id===136){if(!e)return false;target=[e.x,e.y];scale=.25;maxRadius=2;alpha=.35;}
   if(id===147){if(!lamp)return false;target=lamp;scale=.4;maxRadius=4;}
   if(id===161&&a){target=[a.x,a.y-a.h*.64];scale=.55;maxRadius=3;}
   if(id===163)return{maxRadius:1.8,alpha:1,point(raw){const v=new THREE.Vector3(...raw).sub(center);return[1010+v.dot(right)*750,170-v.dot(up)*750];}};
   if([249,250].includes(id)&&m){target=m.portrait?[m.eyeScreen[0]+96,m.eyeScreen[1]+38]:[m.x+m.h*.06,m.y-m.h*.82];scale=id===249?.13:.38;maxRadius=id===249?2:4;alpha=.65;}
   if(id===241&&m){target=[m.x,m.y-m.h*.4];scale=.5;maxRadius=2;}
   if(id===355){target=camera.point([965,283]);scale=.25;maxRadius=3;}
   if(id===124){alpha=.22;maxRadius=2;}
   if(id>=200&&id<241){target=camera.point(scene==='towertop'?[1690,100]:[1144,326]);scale=.3;maxRadius=3;}
   return{from,target,scale,maxRadius,alpha};
 }});
 return{scene,systems:systems.length,visible};
}
