import * as THREE from 'three';
import {MeshVolume, surfacePenetration, meshSurfaceCrossings, segmentTriangleDistance} from 'dula-engine/lib/MeshCollision.js';
import {solveLimbClearance} from 'dula-engine/lib/ConstrainedLimb.js';
import {finishSleeveRoot} from 'dula-assets/characters/bioarmor/character_finish.js';

const surfacesFor=(actor,side)=>[actor.limbs[side+'Arm'],...(actor.sleeves?[actor.sleeves[side],actor.sleeves[side+'Roll']]:[actor.wraps[side+'Sleeve'],actor.wraps[side]])];
function bodyAudit(actor,side,arm,volume){
  const shoulder=actor.mesh.localToWorld(new THREE.Vector3(arm[0].x,arm[0].y,arm[0].z)),surfaces=surfacesFor(actor,side);
  const result=surfacePenetration(surfaces.map(s=>s.mesh),volume,{
    exclude:(point,mesh,id)=>mesh.userData.attachmentRings
      ?id<mesh.userData.attachmentRings*surfaces.find(s=>s.mesh===mesh).sides
      :point.distanceTo(shoulder)<.06,
  });
  for(const part of result.parts){
    const s=surfaces.find(s=>s.mesh.name===part.part);
    if(part.vertex!==null){part.ring=Math.floor(part.vertex/s.sides);part.armU=s.start+(s.end-s.start)*part.ring/s.rings;}
  }
  return result;
}

// Body collider uses exactly the rendered torso; close its neck/waist ring ends.
export function createSurfaceProbe(actors,flaps) {
  const volumes=Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,new MeshVolume(a.torso,{capRings:true})]));
  const clothSurfaces=flaps.map(f=>new MeshVolume(f)); // actual open garment: no artificial caps
  const probe=poses=>{
    const pairs={};
    for(const [key,actor] of Object.entries(actors)) {
      if(!actor.mesh.visible) continue;
      const p=poses[key];if(!p) throw new Error(`Missing pose: ${key}`);
      for(const side of ['left','right']) {
        const arm=p[side+'Arm'];
        const surfaces=surfacesFor(actor,side);
        for(let i=0;i<surfaces.length;i++)surfaces[i].mesh.name=`${key}:${side}:${['skin','sleeve','cuff'][i]}`;
        pairs[`${key}:${side}:torso`]=bodyAudit(actor,side,arm,volumes[key]);
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
      const exact=meshSurfaceCrossings(surfacesFor(actors.hong,side).map(s=>s.mesh),clothSurfaces[flaps.indexOf(f)],{
        // Retain the authored shoulder seam boundary. A crossing spanning the
        // boundary is still counted; only wholly upper-seam intersections skip.
        exclude:local=>local.y>=-.08,
      });
      pairs[`hong:${side}:cloth`]={...exact,proxy:{depth:Math.max(0,-gap),gap,method:'capsule/finite-panel-proxy'}};
    }
    return {pairs,coverage:'sampled torso vertices; actual cloth transverse triangle crossings; no temporal CCD'};
  };
  // Offline suggestions only. Full-scene contacts and temporal continuity must
  // validate a proposed correction before it becomes an authored motion.
  probe.plan=poses=>{
    const plans=[];
    for(const [key,actor] of Object.entries(actors))if(actor.mesh.visible)for(const side of ['left','right']){
      const arm=poses[key][side+'Arm'],volume=volumes[key],surfaces=surfacesFor(actor,side);
      const before=bodyAudit(actor,side,arm,volume);
      if(before.depth<=.005)continue;
      const wrist=actor.mesh.localToWorld(new THREE.Vector3(arm[2].x,arm[2].y,arm[2].z));
      const wristDepth=volume.penetration(wrist);
      if(wristDepth>.005){plans.push({pair:`${key}:${side}:torso`,status:'unresolved',reason:'fixed-wrist-inside-torso',wristDepth,before});continue;}
      try{
        const result=solveLimbClearance(arm,candidate=>{
          for(const s of surfaces)s.update(candidate);
          finishSleeveRoot(surfaces[1],candidate,key);
          return bodyAudit(actor,side,candidate,volume).depth;
        });
        const toArray=a=>a.map(p=>[p.x,p.y,p.z]);
        plans.push({pair:`${key}:${side}:torso`,before,status:result.status,reason:result.reason??null,
          angle:result.angle,residual:result.violation,evaluations:result.evaluations,
          original:toArray(arm),candidate:toArray(result.arm)});
      }finally{
        for(const s of surfaces)s.update(arm);
        finishSleeveRoot(surfaces[1],arm,key);
      }
    }
    return {scope:'fixed endpoints and lengths; torso only; proposals require full-scene validation',plans};
  };
  return probe;
}
