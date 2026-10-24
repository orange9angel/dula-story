export async function capture(sample,cfg){
 const THREE=await import('three');
 if(!window.__walk16){
  const actor=window.__dbg.actors.yekari,scene=new THREE.Scene();scene.add(actor.mesh);
  scene.add(new THREE.HemisphereLight('#d5dfff','#615469',2.0));
  const key=new THREE.DirectionalLight('#ffe1b9',2.2);key.position.set(-3,6,5);scene.add(key);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(cfg.width,cfg.height);renderer.setClearColor('#ffffff',0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const camera=new THREE.OrthographicCamera(-.95,.95,1.27,-1.27,.1,100);
  window.__walk16={scene,actor,renderer,camera};
 }
 const c=window.__walk16,state=window.stepAt(sample.t),root=c.actor.mesh.position.clone();
 c.camera.position.copy(root).add(new THREE.Vector3(0,1.10,7));c.camera.lookAt(root.clone().add(new THREE.Vector3(0,1.10,0)));c.camera.updateMatrixWorld(true);c.scene.updateMatrixWorld(true);c.renderer.render(c.scene,c.camera);
 const feet=Object.fromEntries(['left','right'].map(side=>{const v=c.actor.feet[side].getWorldPosition(new THREE.Vector3()).project(c.camera);return[side,[(v.x+1)*cfg.width/2,(1-v.y)*cfg.height/2]];}));
 return{image:c.renderer.domElement.toDataURL('image/png').split(',')[1],state:{t:sample.t,root:root.toArray(),yaw:c.actor.mesh.rotation.y,feet,locomotion:state.locomotion.yekari}};
}
