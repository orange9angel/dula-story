import * as THREE from 'three';
import {createBodyAudit} from 'dula-assets/lib/craft3d/body-audit.js';
import {visibleVertexIndices,MeshVolume,surfacePenetration} from 'dula-engine/lib/MeshCollision.js';
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
function cloud(roots){
  const points=[];for(const root of roots)root.traverseVisible(o=>{
    if(!o.isMesh||o.material.side===THREE.BackSide)return;if(o.isSkinnedMesh)o.skeleton.update();
    for(const i of visibleVertexIndices(o))points.push(o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld));
  });return points;
}
// A separating projection is a conservative solid-separation certificate.
// Unlike a world AABB it can prove diagonal clearance during a body/head turn.
// Failure to find a plane still fails; no collision tolerance is relaxed.
export function diagonalGap(a,b){
  if(!a.length||!b.length||[...a,...b].some(p=>!Number.isFinite(p.x+p.y+p.z)))throw new Error('Invalid projection cloud');
  let best=0;
  for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){
    if(!x&&!y&&!z)continue;if(x<0||(!x&&y<0)||(!x&&!y&&z<0))continue;
    const n=new THREE.Vector3(x,y,z).normalize();
    let alo=Infinity,ahi=-Infinity,blo=Infinity,bhi=-Infinity;
    for(const p of a){const q=p.dot(n);alo=Math.min(alo,q);ahi=Math.max(ahi,q);}
    for(const p of b){const q=p.dot(n);blo=Math.min(blo,q);bhi=Math.max(bhi,q);}
    best=Math.max(best,alo-bhi,blo-ahi);
  }
  return best;
}
export function createNumericProbe(actors,stage){
  const body=createBodyAudit(actors);
  const skirt=actors.aoi.skirt?new MeshVolume(actors.aoi.skirt,{capRings:true}):null;
  return (poses,camera)=>{
    const surface=body(poses),metrics={},bounds={};
    if(skirt)for(const side of ['left','right']){
      const a=actors.aoi,parts=[a.limbs[side+'Arm'].mesh,a.sleeves[side].mesh,a.sleeves[side+'Roll'].mesh];
      a.hands[side].traverseVisible(o=>{if(o.isMesh&&o.material.side!==THREE.BackSide)parts.push(o);});
      surface.pairs[`aoi:${side}:skirt`]=surfacePenetration(parts,skirt);
    }
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
      if(selfGaps.arms<.006){
        const armPoints=side=>cloud([a.limbs[side+'Arm'].mesh,a.sleeves[side].mesh,a.sleeves[side+'Roll'].mesh,a.hands[side]]);
        selfGaps.arms=Math.max(selfGaps.arms,diagonalGap(armPoints('left'),armPoints('right')));
      }
      for(const side of ['left','right']){selfGaps[side+'Head']=gap(armBoxes[side],headBox);selfGaps[side+'Legs']=gap(armBoxes[side],legBox);}
      const headParts=[];
      if(['left','right'].some(side=>selfGaps[side+'Head']<.006))a.face.head.traverseVisible(o=>{
        if(o.isMesh&&o.material.side!==THREE.BackSide)headParts.push({box:renderedBounds(o).box,points:cloud([o])});
      });
      for(const side of ['left','right'])if(selfGaps[side+'Head']<.006){
        const points=cloud([a.limbs[side+'Arm'].mesh,a.sleeves[side].mesh,a.sleeves[side+'Roll'].mesh,a.hands[side]]);
        // A long ponytail makes the whole-head convex hull cover empty air.
        // Certify every rendered part separately, retaining the hair in coverage.
        const clearances=headParts.map(part=>{const boxGap=gap(armBoxes[side],part.box);return boxGap>=.006?boxGap:Math.max(boxGap,diagonalGap(points,part.points));});
        selfGaps[side+'Head']=Math.max(selfGaps[side+'Head'],Math.min(...clearances));
      }
      const legPoints=['left','right'].some(side=>selfGaps[side+'Legs']<.006)?cloud([a.limbs.leftLeg.mesh,a.limbs.rightLeg.mesh]):null;
      for(const side of ['left','right'])if(selfGaps[side+'Legs']<.006){
        const points=cloud([a.limbs[side+'Arm'].mesh,a.sleeves[side].mesh,a.sleeves[side+'Roll'].mesh,a.hands[side]]);
        selfGaps[side+'Legs']=Math.max(selfGaps[side+'Legs'],diagonalGap(points,legPoints));
      }
      let envGap=Infinity;
      for(const obj of stage.solids){if(obj.name==='floor')continue;envGap=Math.min(envGap,gap(b.box,new THREE.Box3().setFromObject(obj)));}
      const head=a.face.head.localToWorld(new THREE.Vector3(0,.06,.08)),projected=head.clone().project(camera);
      metrics[key]={boneError,soleY:soles,minEnvironmentGap:envGap,selfGaps,vertices:b.count,bounds:[b.box.min.toArray(),b.box.max.toArray()],
        headWorld:a.face.head.getWorldPosition(new THREE.Vector3()).toArray(),
        headQuaternion:a.face.head.getWorldQuaternion(new THREE.Quaternion()).toArray(),
        feet:Object.fromEntries(['left','right'].map(side=>[side,{...p.feet[side],
          position:a.feet[side].getWorldPosition(new THREE.Vector3()).toArray(),
          forward:new THREE.Vector3(0,0,1).transformDirection(a.feet[side].matrixWorld).toArray()}])),
        maxArmAngle:Math.max(...['left','right'].map(s=>{const arm=p[s+'Arm'];return Math.acos((arm[0].y-arm[1].y)/.19)*180/Math.PI;})),
        headTurn:Math.abs(p.headYaw),
        root:a.mesh.position.toArray(),headProjection:projected.toArray(),wrists:[p.leftArm[2],p.rightArm[2]].map(w=>a.mesh.localToWorld(v(w)).toArray()),
        cameraDistance:camera.position.distanceTo(head)};
    }
    metrics.actorGap=gap(bounds.lei,bounds.aoi);
    const table=new THREE.Box3().setFromObject(stage.table);
    metrics.tablePenetration={};
    for(const [key,a] of Object.entries(actors)){
      for(const [part,roots] of Object.entries({body:[a.torso,...(a.skirt?[a.skirt]:[])],leftArm:[a.limbs.leftArm.mesh,a.sleeves.left.mesh,a.sleeves.leftRoll.mesh,a.hands.left],
        rightArm:[a.limbs.rightArm.mesh,a.sleeves.right.mesh,a.sleeves.rightRoll.mesh,a.hands.right],legs:[a.limbs.leftLeg.mesh,a.limbs.rightLeg.mesh]})){
        let maxDepth=0,count=0,point=null;
        for(const p of cloud(roots))if(table.containsPoint(p)){
          const depth=Math.min(...['x','y','z'].flatMap(k=>[p[k]-table.min[k],table.max[k]-p[k]]));
          if(depth>maxDepth){maxDepth=depth;point=p.toArray();}count++;
        }
        metrics.tablePenetration[key+':'+part]={maxDepth,count,point};
      }
    }
    const jarBase=stage.jar.position;
    metrics.jarContact={};
    for(const [key,a] of Object.entries(actors)){
      let gap=Infinity,penetration=0;
      for(const p of cloud([a.hands.left])){
        const dy=p.y-jarBase.y;
        if(dy<.015||dy>.225)continue;
        const radial=Math.hypot(p.x-jarBase.x,p.z-jarBase.z);
        gap=Math.min(gap,Math.abs(radial-.066));penetration=Math.max(penetration,.063-radial);
      }
      metrics.jarContact[key]={gap:Number.isFinite(gap)?gap:1,penetration};
    }
    metrics.cameraEnvironmentGap=Math.min(...stage.solids.filter(o=>o.name!=='floor').map(o=>new THREE.Box3().setFromObject(o).distanceToPoint(camera.position)));
    const project=(p)=>p.clone().project(camera).toArray();
    const pixels=(a,b)=>{const pa=a.clone().project(camera),pb=b.clone().project(camera);return Math.hypot((pa.x-pb.x)*640,(pa.y-pb.y)*360);};
    const wrist=actors.lei.mesh.localToWorld(v(poses.lei.leftArm[2]));
    const elbow=actors.lei.mesh.localToWorld(v(poses.lei.leftArm[1]));
    const jar=stage.jar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.11,0));
    metrics.focus={arm:{projection:project(wrist.clone().lerp(elbow,.5)),pixels:pixels(elbow,wrist)},
      jar:{projection:project(jar),pixels:pixels(jar.clone().add(new THREE.Vector3(0,.11,0)),jar.clone().add(new THREE.Vector3(0,-.11,0)))}};
    for(const [key,target] of Object.entries({arm:wrist,jar})){
      const direction=target.clone().sub(camera.position),distance=direction.length();
      const ray=new THREE.Raycaster(camera.position,direction.normalize(),.01,distance-.08);
      const blockers=stage.solids.filter(o=>o!==stage.jar).concat(Object.values(actors).map(a=>a.torso));
      metrics.focus[key].blocked=ray.intersectObjects(blockers,true).length>0;
    }
    return {surface,metrics};
  };
}
