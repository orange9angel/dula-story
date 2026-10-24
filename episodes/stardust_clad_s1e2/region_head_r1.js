import './scene_hybrid_r1.js';
import * as THREE from 'three';
import {createProjectedRegionPaint} from './assets3d/art_pass_runtime/projected-region-paint.js';
import {shot,createHeadProjector} from './config/region_head_r1.js';
window.ready=false;
const {actors,camera,renderer,scene}=window.__dbg,actor=actors.yekari,head=actor.headGroup,sourceRender=window.renderAt;
window.setFreeCamera(shot.camera);sourceRender(shot.referenceT);
const projector=createHeadProjector(THREE,head,camera),loader=new THREE.TextureLoader();
const [texture,maskTexture]=await Promise.all([loader.loadAsync('./assets3d/region_head_r1/head_paint.png'),loader.loadAsync('./assets3d/region_head_r1/head_mask.png')]);texture.colorSpace=THREE.SRGBColorSpace;maskTexture.colorSpace=THREE.NoColorSpace;
const point=(x,y,u=x,v=y)=>[x/1024,1-y/1024,u/1024,1-v/1024];
const landmarks=[point(394,540,389,538),point(309,530,310,530),point(319,609,302,597),point(344,655,344,655),point(388,784,365,755),point(551,764,534,722),point(606,632,605,625),point(300,433,307,434),point(448,277),point(182,339),point(890,421),point(650,221),point(874,800),point(510,949),point(100,100),point(950,100)];
const hairMeshes=new Set();actor.softPortrait.hair.traverse(o=>{if(o.isMesh)hairMeshes.add(o);});
const paint=createProjectedRegionPaint({THREE,root:head,projector,texture,maskTexture,landmarks,radius:.13,meshOptions:mesh=>hairMeshes.has(mesh)?{landmarkWarp:false,rejectWarm:true}:{coolFallback:'#fbe3d2',coolFallbackRegion:[0,0,.34,.44]}});
// The original connected neck keeps its geometry; match its under-chin value.
const neck=actor.body.children.find(o=>o.isMesh&&o.geometry.type==='CylinderGeometry'&&o.geometry.parameters.height===.148);
if(!neck)throw Error('Expected original neck mesh is missing');
const oldNeckMaterial=neck.material,paintedNeckMaterial=new THREE.MeshBasicMaterial({color:'#d7b6a8'}),setPaintBlend=paint.setBlend.bind(paint);
paint.setBlend=value=>{setPaintBlend(value);neck.material=value?paintedNeckMaterial:oldNeckMaterial;};
paint.meshes.push(neck);
const canvas=document.querySelector('body > canvas'),ctx=canvas.getContext('2d'),params=new URLSearchParams(location.search),mode=params.get('mode')??'paint';
const capture=()=>renderer.domElement.toDataURL('image/png').split(',')[1];
window.regionStudy={paint,head,actor,projector,referenceT:shot.referenceT,sourceRender};
window.renderRegionPortrait=(t,blend=1)=>{
 paint.setBlend(blend);sourceRender(t);const portrait=createHeadProjector(THREE,head,camera),size=renderer.getSize(new THREE.Vector2()),bg=scene.scene.background;
 renderer.setSize(512,512,false);scene.scene.background=new THREE.Color('#303e53');renderer.render(scene.scene,portrait);renderer.render(scene.scene,portrait);const image=capture();renderer.setSize(size.x,size.y,false);scene.scene.background=bg;return image;
};
window.renderAt=t=>{paint.setBlend(mode==='base'?0:1);const out=sourceRender(t);out.state.regionPaint={mode,meshCount:paint.meshes.length,referenceT:shot.referenceT,geometry:'original',scope:'head surface and neck color'};return out;};
window.renderRegionPair=t=>{
 paint.setBlend(0);const base=sourceRender(t),baseImage=capture();paint.setBlend(1);const edited=sourceRender(t),paintImage=capture();
 const previous=[],maskMat=new THREE.MeshBasicMaterial({color:'#000000',side:THREE.DoubleSide}),white=new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide}),headMeshes=new Set(paint.meshes),bg=scene.scene.background;
 scene.scene.traverseVisible(o=>{if(o.isMesh){previous.push([o,o.material]);o.material=headMeshes.has(o)?white:maskMat;}});scene.scene.background=new THREE.Color('#000000');renderer.render(scene.scene,camera);const mask=capture();
 for(const[o,m]of previous)o.material=m;scene.scene.background=bg;maskMat.dispose();white.dispose();
 ctx.clearRect(0,0,1280,720);renderer.render(scene.scene,camera);ctx.drawImage(renderer.domElement,0,0);
 return{base:baseImage,paint:paintImage,mask,state:edited.state,baseState:base.state,headScreen:head.getWorldPosition(new THREE.Vector3()).project(camera).toArray()};
};
window.renderLegDiagnostic=t=>{
 paint.setBlend(1);const out=sourceRender(t),saved=new Map(),colors={left:'#ff765b',right:'#63d7ff'},materials=[];
 for(const side of ['left','right']){
  const material=new THREE.MeshBasicMaterial({color:colors[side]});materials.push(material);
  for(const root of [actor.limbs[side+'Leg'].mesh,actor.feet[side],actor.lowerClad.legs[side].rig])root?.traverse(o=>{if(o.isMesh&&!saved.has(o)){saved.set(o,o.material);o.material=material;}});
 }
 renderer.render(scene.scene,camera);const image=capture();for(const[o,m]of saved)o.material=m;materials.forEach(m=>m.dispose());
 return{image,state:out.state,feet:Object.fromEntries(['left','right'].map(side=>[side,actor.feet[side].getWorldPosition(new THREE.Vector3()).project(camera).toArray()]))};
};
window.ready=true;
