// Episode palette and restrained surface treatment. Skin shares one colour path
// across the face, ears, neck, arms and hands; avoid separate lit/unlit palettes.
import * as THREE from 'three';
export const SKIN={
  lei:{base:'#f2d3bc',inner:'#dfb59f',line:'#aa7967'},
  hong:{base:'#e4b899',inner:'#cd9a7f',line:'#986850'},
};
const skinMaterials=new Map(),clothMaterials=new Map();
export function skinMaterial(kind){
  if(!skinMaterials.has(kind))skinMaterials.set(kind,new THREE.MeshBasicMaterial({color:SKIN[kind].base}));
  return skinMaterials.get(kind);
}
export function clothMaterial(color){
  if(!clothMaterials.has(color)){
    // Keep the cloth's local colour readable in the warm dusk; smooth lighting
    // prevents the old three-step ramp from cutting each shoulder into wedges.
    clothMaterials.set(color,new THREE.MeshLambertMaterial({color,
      emissive:color,emissiveIntensity:.48}));
  }
  return clothMaterials.get(color);
}

export function finishSleeveRoot(sleeve,arm,kind){
  const p=sleeve.geometry.attributes.position,shoulder=arm[0];
  const outward=new THREE.Vector3(shoulder.x,0,shoulder.z).normalize();
  const inset=kind==='hong'?.048:.035;
  // Bury the armhole inside the torso instead of covering it with a separate ball.
  for(let i=0;i<=sleeve.rings;i++){
    const u=i/sleeve.rings,weight=Math.max(0,1-u/.30)**2;
    if(!weight)break;
    for(let j=0;j<sleeve.sides;j++){
      const k=i*sleeve.sides+j;
      p.setXYZ(k,p.getX(k)-outward.x*inset*weight,p.getY(k)-.006*weight,
        p.getZ(k)-outward.z*inset*weight);
    }
  }
  p.needsUpdate=true;sleeve.geometry.computeVertexNormals();
}
