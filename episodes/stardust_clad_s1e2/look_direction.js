import * as THREE from 'three';

export function directLook(actors){
  const c=document.createElement('canvas');c.width=3;c.height=1;
  const ctx=c.getContext('2d');['#737b8c','#b8c1cc','#ffffff'].forEach((v,i)=>{ctx.fillStyle=v;ctx.fillRect(i,0,1,1);});
  const gradient=new THREE.CanvasTexture(c);gradient.minFilter=gradient.magFilter=THREE.NearestFilter;
  gradient.generateMipmaps=false;
  for(const actor of Object.values(actors)){
    const cache=new Map();
    actor.mesh.traverse(m=>{
      if(!m.isMesh||!m.material?.isMeshPhongMaterial)return;
      const old=m.material;
      if(!cache.has(old))cache.set(old,new THREE.MeshToonMaterial({color:old.color.clone(),gradientMap:gradient,side:old.side}));
      m.material=cache.get(old);
    });
  }
  // Keep the established boy's hair mass; omit two spherical antenna tips in this dramatic episode.
  actors.aoao.headGroup.traverse(m=>{
    const p=m.geometry?.parameters;
    if(p&&(p.radius===.011||m.geometry.type==='TubeGeometry'&&p.radius===.005))m.visible=false;
  });
}

export function moderateCladGlow(actor,t,charge=0){
  for(const part of actor.cladParts??[])for(const seam of part.seams??[])
    if(seam.visible)seam.material.opacity*=.34+.66*charge;
  // Scaled after the growth state is applied, so seek never accumulates the change.
  for(const pd of actor.pauldronGroups??[])pd.g.scale.multiplyScalar(.88);
}
