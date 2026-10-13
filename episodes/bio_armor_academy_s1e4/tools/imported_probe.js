import * as THREE from 'three';
import {makeSkinnedSamples} from 'dula-assets/lib/craft3d/skinned-samples.js';
export function createImportedProbe(actors,stage){
  const samples=Object.fromEntries(Object.entries(actors).map(([k,a])=>[k,makeSkinnedSamples(a)]));
  return (p,camera)=>{
    const table=new THREE.Box3().setFromObject(stage.table),jar=stage.jar.position,result={};
    for(const [key,a] of Object.entries(actors)){
      const cloud=samples[key].sample(),metrics={counts:samples[key].counts,garmentRepair:a.garmentRepair??0,parts:{}};
      for(const [name,points] of Object.entries(cloud)){
        let tableDepth=0,jarDepth=0,minY=Infinity,worst=null,jarSurfaceGap=Infinity;
        for(const pt of points){
          minY=Math.min(minY,pt.y);
          if(table.containsPoint(pt)){const d=Math.min(pt.x-table.min.x,table.max.x-pt.x,pt.y-table.min.y,table.max.y-pt.y,pt.z-table.min.z,table.max.z-pt.z);if(d>tableDepth){tableDepth=d;worst=pt.toArray();}}
          if(pt.y>jar.y&&pt.y<jar.y+.22){const radial=Math.hypot(pt.x-jar.x,pt.z-jar.z);
            jarDepth=Math.max(jarDepth,Math.min(.062-radial,pt.y-jar.y,jar.y+.22-pt.y));jarSurfaceGap=Math.min(jarSurfaceGap,Math.abs(radial-.062));}
        }
        metrics.parts[name]={minY,tableDepth,jarDepth,jarSurfaceGap:Number.isFinite(jarSurfaceGap)?jarSurfaceGap:null,tableWorst:worst};
      }
      const head=a.bones.head.getWorldPosition(new THREE.Vector3());metrics.headProjection=head.clone().project(camera).toArray();
      metrics.wrists=Object.fromEntries(['left','right'].map(side=>[side,a.hands[side].getWorldPosition(new THREE.Vector3()).toArray()]));
      result[key]=metrics;
    }
    return {importedSurface:{method:'9mm bind-space grid of rendered skinned vertices; table solid and jar interior',coverage:'hands/arms/feet; no complete self-collision or continuous sweep guarantee',actors:result}};
  };
}
