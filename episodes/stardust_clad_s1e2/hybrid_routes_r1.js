import './region_head_r1.js';
import * as THREE from 'three';
import {installMocapPoseStudy} from './assets3d/walk_runtime/mocap-pose-study.js';
import {createSurfaceMotionGuide} from './assets3d/art_pass_runtime/surface-motion-guide.js';
window.ready=false;
const sourceRender=window.renderAt,{actors,camera,renderer,scene}=window.__dbg,actor=actors.yekari;
const rootAt=t=>{const u=THREE.MathUtils.clamp((t-20)/6,0,1),r=.12,k=1/(1-r),p=u<r?k*u*u/(2*r):u>1-r?1-k*(1-u)**2/(2*r):k*(u-r/2);return{x:5.5-4.15*p,z:1.85-1.88*p,yaw:Math.atan2(-4.15,-1.88)};};
const data=await(await fetch('./assets3d/hybrid_routes_r1/mocap/walk.json')).json();
let time=NaN;
const base=new URLSearchParams(location.search).get('motion')==='base';
const motion=base?null:installMocapPoseStudy({THREE,actor,data,getTime:()=>time,rootAt,start:20.2,end:22.6,kneeForward:new URLSearchParams(location.search).get('knees')==='forward',dims:{hipIdle:.93,hipHalf:.068,legA:.49,legB:.49,shoulderHalf:.125,shoulderY:1.52,armA:.21,armB:.20,footY:.09}});
window.setFreeCamera({pos:[.2,1.65,5.0],lookAt:[4.3,1.0,1.3],fov:32});
window.renderAt=t=>{time=t;const out=sourceRender(t);out.state.study=motion?.last;return out;};
window.hybridStudy={motion,rootAt};
const guide=createSurfaceMotionGuide({THREE,renderer,scene:scene.scene,root:actor.mesh,width:512,height:768,allowIncomplete:true});
const portraitCamera=()=>{const r=actor.mesh.position.clone(),c=new THREE.PerspectiveCamera(32,2/3,.05,100);c.position.copy(r).add(new THREE.Vector3(-3.1,1.6,3.9));c.lookAt(r.x,.99,r.z);c.updateMatrixWorld(true);return c;};
window.capturePaintStudy=(t,reference=null,maps=[])=>{
 time=t;sourceRender(t);const c=portraitCamera(),size=renderer.getSize(new THREE.Vector2()),bg=scene.scene.background;
 renderer.setSize(512,768,false);scene.scene.background=new THREE.Color('#808890');renderer.render(scene.scene,c);renderer.render(scene.scene,c);
 const image=renderer.domElement.toDataURL('image/png').split(',')[1];scene.scene.background=bg;
 if(reference)guide.captureReference(reference,c);
 const mask=guide.captureMask(c),flow=Object.fromEntries(maps.map(id=>[id,guide.captureMap(id,c)]));
 const feet={};for(const side of ['left','right']){
  let minY=Infinity;const foot=actor.feet[side];foot.traverseVisible(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)minY=Math.min(minY,new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).y);});
  feet[side]={world:foot.getWorldPosition(new THREE.Vector3()).toArray(),soleMinY:minY};
 }
 const joints={};if(motion?.last)for(const side of ['left','right'])joints[side]=motion.last.pose[side+'Leg'].map(v=>{const q=new THREE.Vector3(v.x,v.y,v.z).applyMatrix4(actor.mesh.matrixWorld).project(c);return[(q.x+1)*256,(1-q.y)*384];});
 renderer.setSize(size.x,size.y,false);return{image,mask,flow,state:{motion:motion?.last??null,feet,joints,guideLimitations:guide.limitations}};
};
window.renderStudyPortrait=(t,scope='body')=>{
 time=t;sourceRender(t);const r=actor.mesh.position.clone(),c=new THREE.PerspectiveCamera(32,2/3,.05,100);
 c.position.copy(r).add(new THREE.Vector3(-3.1,1.6,3.9));c.lookAt(r.x,.99,r.z);c.updateMatrixWorld(true);
 if(scope==='thigh'){c.position.copy(r).add(new THREE.Vector3(-1.3,.85,1.65));c.lookAt(r.x,.86,r.z);}
 const size=renderer.getSize(new THREE.Vector2()),bg=scene.scene.background;renderer.setSize(768,1152,false);scene.scene.background=new THREE.Color('#808890');
 renderer.render(scene.scene,c);renderer.render(scene.scene,c);const image=renderer.domElement.toDataURL('image/png').split(',')[1];renderer.setSize(size.x,size.y,false);scene.scene.background=bg;
 return{image,state:motion?.last};
};
window.ready=true;
