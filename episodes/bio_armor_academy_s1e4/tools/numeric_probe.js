import * as THREE from 'three';
import {createBodyAudit} from 'dula-assets/lib/craft3d/body-audit.js';
import {visibleVertexIndices} from 'dula-engine/lib/MeshCollision.js';
const v=p=>new THREE.Vector3(p.x,p.y,p.z??0);
const vec=new THREE.Vector3();
function renderedBounds(root){
  const box=new THREE.Box3();let count=0;
  root.traverseVisible(o=>{if(!o.isMesh||o.material.side===THREE.BackSide)return;
    if(o.isSkinnedMesh)o.skeleton.update();
    for(const i of visibleVertexIndices(o)){o.getVertexPosition(i,vec).applyMatrix4(o.matrixWorld);box.expandByPoint(vec);count++;}
  });
  if(!count)throw new Error('Empty rendered actor geometry');return {box,count};
}
function gap(a,b){return Math.hypot(...['x','y','z'].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));}
export function createNumericProbe(actors,stage){
  const body=createBodyAudit(actors);
  return (poses,camera)=>{
    const surface=body(poses),metrics={},bounds={};
    for(const [key,a] of Object.entries(actors)){
      const p=poses[key],b=renderedBounds(a.mesh);bounds[key]=b.box;
      let boneError=0;
      for(const side of ['left','right'])for(const [part,lengths] of [['Arm',[.19,.18]],['Leg',[.4,.4]]]){
        const points=p[side+part];for(let i=0;i<2;i++)boneError=Math.max(boneError,Math.abs(v(points[i]).distanceTo(v(points[i+1]))-lengths[i]));
      }
      const soles=Object.values(a.feet).map(f=>renderedBounds(f).box.min.y);
      const armBoxes={};
      for(const side of ['left','right']){
        const armBox=new THREE.Box3();
        for(const root of [a.limbs[side+'Arm'].mesh,a.sleeves[side].mesh,a.sleeves[side+'Roll'].mesh,a.hands[side]])armBox.union(renderedBounds(root).box);
        armBoxes[side]=armBox;
      }
      const headBox=renderedBounds(a.face.head).box,legBox=new THREE.Box3();
      for(const side of ['left','right'])legBox.union(renderedBounds(a.limbs[side+'Leg'].mesh).box);
      const selfGaps={arms:gap(armBoxes.left,armBoxes.right)};
      for(const side of ['left','right']){selfGaps[side+'Head']=gap(armBoxes[side],headBox);selfGaps[side+'Legs']=gap(armBoxes[side],legBox);}
      let envGap=Infinity;
      for(const obj of stage.solids){if(obj.name==='floor')continue;envGap=Math.min(envGap,gap(b.box,new THREE.Box3().setFromObject(obj)));}
      const head=a.face.head.localToWorld(new THREE.Vector3(0,.06,.08)),projected=head.clone().project(camera);
      metrics[key]={boneError,soleY:soles,minEnvironmentGap:envGap,selfGaps,vertices:b.count,bounds:[b.box.min.toArray(),b.box.max.toArray()],
        maxArmAngle:Math.max(...['left','right'].map(s=>{const arm=p[s+'Arm'];return Math.acos((arm[0].y-arm[1].y)/.19)*180/Math.PI;})),
        headTurn:Math.abs(p.headYaw),
        root:a.mesh.position.toArray(),headProjection:projected.toArray(),wrists:[p.leftArm[2],p.rightArm[2]].map(w=>a.mesh.localToWorld(v(w)).toArray()),
        cameraDistance:camera.position.distanceTo(head)};
    }
    metrics.actorGap=gap(bounds.lei,bounds.aoi);
    metrics.cameraEnvironmentGap=Math.min(...stage.solids.filter(o=>o.name!=='floor').map(o=>new THREE.Box3().setFromObject(o).distanceToPoint(camera.position)));
    const project=(p)=>p.clone().project(camera).toArray();
    const pixels=(a,b)=>{const pa=a.clone().project(camera),pb=b.clone().project(camera);return Math.hypot((pa.x-pb.x)*640,(pa.y-pb.y)*360);};
    const wrist=actors.lei.mesh.localToWorld(v(poses.lei.leftArm[2]));
    const elbow=actors.lei.mesh.localToWorld(v(poses.lei.leftArm[1]));
    const jar=stage.jar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.16,0));
    metrics.focus={arm:{projection:project(wrist.clone().lerp(elbow,.5)),pixels:pixels(elbow,wrist)},
      jar:{projection:project(jar),pixels:pixels(jar.clone().add(new THREE.Vector3(0,.16,0)),jar.clone().add(new THREE.Vector3(0,-.16,0)))}};
    for(const [key,target] of Object.entries({arm:wrist,jar})){
      const direction=target.clone().sub(camera.position),distance=direction.length();
      const ray=new THREE.Raycaster(camera.position,direction.normalize(),.01,distance-.08);
      const blockers=stage.solids.filter(o=>o!==stage.jar).concat(Object.values(actors).map(a=>a.torso));
      metrics.focus[key].blocked=ray.intersectObjects(blockers,true).length>0;
    }
    return {surface,metrics};
  };
}
