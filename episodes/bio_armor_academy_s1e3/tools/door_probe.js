// Production-mesh probe, enabled only by ?probe-door=1. No duplicated door timing/geometry.
import * as THREE from 'three';

export function probeDoorway(stage, subjects, margin=.015){
  stage.scene.updateMatrixWorld(true);
  const meshes=[];
  stage.hut.traverse(o=>{
    if(!o.isMesh||!o.visible||o.name==='hut_step'||o.name.startsWith('antenna'))return;
    meshes.push(o);
  });
  return probeBoxMeshes(meshes,subjects,margin);
}

// Also used for actual bento base/lid boxes; preserve the geometry's translated pivot.
export function probeBoxMeshes(meshes, subjects, margin=.004){
  const obstacles=[];
  for(const o of meshes){
    o.geometry.computeBoundingBox();
    obstacles.push({name:o.name, inverse:o.matrixWorld.clone().invert(),
      local:o.geometry.boundingBox.clone().expandByScalar(margin),
      world:o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).expandByScalar(margin)});
  }
  const hits=[],counts={},skinnedCounts={};
  const tri=new THREE.Triangle(),matrix=new THREE.Matrix4(),bounds=new THREE.Box3();
  for(const [name,root] of Object.entries(subjects)){
    counts[name]=0;
    skinnedCounts[name]=0;
    root.traverseVisible(o=>{
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
            hits.push({subject:name,mesh:o.userData.contactPart||o.name||g.type,obstacle:obstacle.name});break;
          }
        }
      }
    });
  }
  return {margin,counts,skinnedCounts,obstacles:obstacles.map(o=>o.name),hits};
}
