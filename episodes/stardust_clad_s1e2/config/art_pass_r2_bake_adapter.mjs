// Episode rig accessor. Executed inside the source viewer by the shared skill runner.
export function capture(t,context){
    const trace=window.stepAt(t),{actors,camera}=window.__dbg;camera.updateMatrixWorld(true);
    const cast={};for(const [name,a]of Object.entries(actors)){
     a.mesh.updateMatrixWorld(true);const vec=(p)=>a.mesh.localToWorld(a.mesh.position.clone().fromArray(p));
     const root=a.mesh.getWorldPosition(a.mesh.position.clone()),points={root,head:a.headGroup.getWorldPosition(root.clone())};
     for(const side of ['left','right']){const arm=trace.arms[name][side],leg=trace.legs[name][side];points[side+'Shoulder']=vec(arm[0]);points[side+'Elbow']=vec(arm[1]);points[side+'Hip']=vec(leg[0]);points[side+'Knee']=vec(leg[1]);points[side+'Hand']=a.hands[side].getWorldPosition(root.clone());points[side+'Foot']=a.feet[side].getWorldPosition(root.clone());}
     points.pelvis=points.leftHip.clone().add(points.rightHip).multiplyScalar(.5);
     const round=x=>Number(x.toFixed(6));
     cast[name]={root:root.toArray().map(round),yaw:a.mesh.rotation.y,world:Object.fromEntries(Object.entries(points).map(([k,v])=>[k,v.toArray().map(round)])),projected:Object.fromEntries(Object.entries(points).map(([k,v])=>{const p=v.clone().project(camera);return[k,[(p.x+1)*context.width/2,(1-p.y)*context.height/2].map(round)];})),contact:Object.fromEntries(['left','right'].map(s=>[s,trace.locomotion[name]?.feet[s]?.contact??null]))};
    }
    return{t,actors:cast,camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov}};
}
