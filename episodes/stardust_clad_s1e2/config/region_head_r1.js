export const shot={start:20.2,end:22.2,referenceT:21.2,camera:{pos:[.4,1.55,4.5],lookAt:[4.7,1.0,1.4],fov:29},portraitWidth:.64,portraitCenter:[0,.095,-.012]};
export function createHeadProjector(THREE,head,mainCamera){
 const center=head.localToWorld(new THREE.Vector3(...shot.portraitCenter)),direction=mainCamera.getWorldDirection(new THREE.Vector3());
 const c=new THREE.OrthographicCamera(-shot.portraitWidth/2,shot.portraitWidth/2,shot.portraitWidth/2,-shot.portraitWidth/2,.1,10);
 c.position.copy(center).addScaledVector(direction,-3);c.quaternion.copy(mainCamera.quaternion);c.updateMatrixWorld(true);return c;
}
