export async function capture(sample,cfg){
 const THREE=await import('three');
 if(!window.__poseCapture){const source=window.__dbg,actor=source.actors.yekari,scene=new THREE.Scene();scene.add(actor.mesh);scene.add(new THREE.HemisphereLight('#d5e2ff','#756579',2));const key=new THREE.DirectionalLight('#ffe4bc',2);key.position.set(-3,6,5);scene.add(key);const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(cfg.width,cfg.height);renderer.setClearColor('#ffffff',0);renderer.outputColorSpace=THREE.SRGBColorSpace;const camera=new THREE.OrthographicCamera(-.95,.95,1.27,-1.27,.1,100);window.__poseCapture={scene,actor,renderer,camera};}
 const c=window.__poseCapture;window.stepAt(sample.t);const root=c.actor.mesh.position.clone();c.camera.position.copy(root).add(new THREE.Vector3(0,1.1,7));c.camera.lookAt(root.clone().add(new THREE.Vector3(0,1.1,0)));c.camera.updateMatrixWorld(true);c.scene.updateMatrixWorld(true);c.renderer.render(c.scene,c.camera);
 return{image:c.renderer.domElement.toDataURL('image/png').split(',')[1],state:{t:sample.t,root:root.toArray(),yaw:c.actor.mesh.rotation.y}};
}
