export async function capture(sample,cfg){
 const THREE=await import('three'),{shot,createHeadProjector}=await import('./config/region_head_r1.js');
 window.setFreeCamera(shot.camera);window.renderAt(sample.t);
 const {actors,scene,camera,renderer}=window.__dbg,actor=actors.yekari,head=actor.headGroup,projector=createHeadProjector(THREE,head,camera);
 if(sample.kind==='full')return window.renderAt(sample.t);
 const originalSize=renderer.getSize(new THREE.Vector2()),background=scene.scene.background,override=scene.scene.overrideMaterial;
 const changed=[],savedVisibility=[];let material=null;
 try{
  renderer.setSize(cfg.width,cfg.height,false);scene.scene.background=new THREE.Color('#303e53');
  if(sample.kind==='mask'){
   scene.scene.background=new THREE.Color('#000000');material=new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide});
   scene.scene.traverseVisible(o=>{if(!o.isMesh)return;let p=o,inside=false;while(p){if(p===head){inside=true;break;}p=p.parent;}if(inside){changed.push([o,o.material]);o.material=material;}else{savedVisibility.push([o,o.visible]);o.visible=false;}});
  }
  renderer.render(scene.scene,projector);renderer.render(scene.scene,projector);
  return{image:renderer.domElement.toDataURL('image/png').split(',')[1],state:{t:sample.t,projection:projector.projectionMatrix.toArray(),cameraWorld:projector.matrixWorld.toArray(),headWorld:head.matrixWorld.toArray(),portraitWidth:shot.portraitWidth,kind:sample.kind}};
 }finally{for(const[o,m]of changed)o.material=m;for(const[o,v]of savedVisibility)o.visible=v;material?.dispose();scene.scene.overrideMaterial=override;scene.scene.background=background;renderer.setSize(originalSize.x,originalSize.y,false);}
}
