// 网格相交探针（晋升自 S1E3 tools/door_probe.js 的 probeBoxMeshes 通用部分；
// 门探针是集专属不复制）。被检主体可用 userData.probeExclude 排除穿戴件自身。
import * as THREE from 'three';

export function probeBoxMeshes(meshes, subjects, margin=.004){
  const obstacles=[];
  for(const o of meshes){
    o.geometry.computeBoundingBox();
    obstacles.push({name:o.name, inverse:o.matrixWorld.clone().invert(),matrixWorld:o.matrixWorld.clone(),
      local:o.geometry.boundingBox.clone().expandByScalar(margin),
      world:o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).expandByScalar(margin)});
  }
  const hits=[],counts={},skinnedCounts={};
  const tri=new THREE.Triangle(),matrix=new THREE.Matrix4(),bounds=new THREE.Box3();
  for(const [name,root] of Object.entries(subjects)){
    counts[name]=0;
    skinnedCounts[name]=0;
    root.traverseVisible(o=>{
      if(o.userData.probeExclude)return; // 穿戴件自身（书包/盖/带）：不作为被检主体
      if(!o.isMesh||!o.geometry?.attributes.position||o.material?.side===THREE.BackSide)return;
      counts[name]++;
      const g=o.geometry,pos=g.attributes.position,index=g.index;
      if(o.isSkinnedMesh){
        skinnedCounts[name]++;o.skeleton.update();o.computeBoundingBox();
        bounds.copy(o.boundingBox).applyMatrix4(o.matrixWorld);
      }else{
        g.computeBoundingBox();bounds.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
      }
      for(const obstacle of obstacles){
        if(!bounds.intersectsBox(obstacle.world))continue;
        matrix.multiplyMatrices(obstacle.inverse,o.matrixWorld);
        const count=Math.min(index?index.count:pos.count,g.drawRange.start+g.drawRange.count);
        for(let i=g.drawRange.start;i<count;i+=3){
          for(const [j,v] of [tri.a,tri.b,tri.c].entries()){
            o.getVertexPosition(index?index.getX(i+j):i+j,v).applyMatrix4(matrix);
          }
          if(obstacle.local.intersectsTriangle(tri)){
            // point=命中三角形质心（世界系）：调用方按空间区域过滤（如袖根内埋区 vs 中段）
            const cp=new THREE.Vector3().add(tri.a).add(tri.b).add(tri.c).multiplyScalar(1/3)
              .applyMatrix4(obstacle.matrixWorld);
            hits.push({subject:name,mesh:o.userData.contactPart||o.name||g.type,obstacle:obstacle.name,
              point:[cp.x,cp.y,cp.z]});break;
          }
        }
      }
    });
  }
  return {margin,counts,skinnedCounts,obstacles:obstacles.map(o=>o.name),hits};
}
