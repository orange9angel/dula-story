import * as THREE from 'three';
import {MeshVolume, surfacePenetration, segmentTriangleDistance} from 'dula-engine/lib/MeshCollision.js';

// Body collider uses exactly the rendered torso; close its neck/waist ring ends.
export function createSurfaceProbe(actors,flaps) {
  const volumes=Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,new MeshVolume(a.torso,{capRings:true})]));
  return poses=>{
    const pairs={};
    for(const [key,actor] of Object.entries(actors)) {
      if(!actor.mesh.visible) continue;
      const p=poses[key];if(!p) throw new Error(`Missing pose: ${key}`);
      for(const side of ['left','right']) {
        const arm=p[side+'Arm'];
        const shoulder=actor.mesh.localToWorld(new THREE.Vector3(arm[0].x,arm[0].y,arm[0].z));
        const surfaces=[actor.limbs[side+'Arm'],...(actor.sleeves?[actor.sleeves[side],actor.sleeves[side+'Roll']]:[actor.wraps[side+'Sleeve'],actor.wraps[side]])];
        for(let i=0;i<surfaces.length;i++) surfaces[i].mesh.name ||= `${key}_${side}_surface${i}`;
        pairs[`${key}:${side}:torso`]=surfacePenetration(surfaces.map(s=>s.mesh),volumes[key],{
          // The exact rings inset by finishSleeveRoot form the sewn attachment.
          // Other surfaces retain only the local 6cm shoulder neighborhood.
          exclude:(point,mesh,id)=>mesh.userData.attachmentRings
            ?id<mesh.userData.attachmentRings*surfaces.find(s=>s.mesh===mesh).sides
            :point.distanceTo(shoulder)<.06,
        });
      }
    }
    if(actors.hong.mesh.visible) for(const f of flaps) {
      const side=f.position.x>0?'right':'left',arm=poses.hong[side+'Arm'];
      f.updateWorldMatrix(true,false);
      // Legacy finite panel proxy, now with capsule thickness. The report
      // labels this proxy explicitly; it is not an audit of the curved garment.
      let gap=Infinity;
      const corners=[[-.085,-.62,0],[.085,-.62,0],[.085,-.08,0],[-.085,-.08,0]]
        .map(p=>f.localToWorld(new THREE.Vector3(...p)));
      const triangles=[new THREE.Triangle(corners[0],corners[1],corners[2]),new THREE.Triangle(corners[0],corners[2],corners[3])];
      for(const [i,j,r] of [[0,1,.075],[1,2,.06]]) {
        const world=k=>actors.hong.mesh.localToWorld(new THREE.Vector3(arm[k].x,arm[k].y,arm[k].z));
        const scale=actors.hong.mesh.getWorldScale(new THREE.Vector3());
        const radius=r*Math.max(scale.x,scale.y,scale.z);
        for(const triangle of triangles)gap=Math.min(gap,segmentTriangleDistance(world(i),world(j),triangle)-radius);
      }
      pairs[`hong:${side}:cloth`]={depth:Math.max(0,-gap),gap,evaluated:2,excluded:0,method:'capsule/finite-panel-proxy'};
    }
    return {pairs,coverage:'sampled rendered vertices; finite cloth proxy; no temporal CCD'};
  };
}
