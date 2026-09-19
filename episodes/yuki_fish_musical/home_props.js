import * as THREE from 'three';
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.78});
export function buildHomeProps(scene,cat){
  const g=new THREE.Group();scene.add(g);
  const dish=new THREE.Group();dish.position.set(.08,.024,.38);g.add(dish);
  const plate=new THREE.Mesh(new THREE.CylinderGeometry(.20,.17,.036,48),mat(0xeee3d3));dish.add(plate);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.185,.016,10,48),mat(0x73afa5));rim.rotation.x=Math.PI/2;rim.position.y=.022;dish.add(rim);
  for(const [x,z] of [[-.06,.03],[.04,-.02],[.07,.06]]){
    const crumb=new THREE.Mesh(new THREE.OctahedronGeometry(.011),mat(0xc58d41));crumb.position.set(x,.029,z);dish.add(crumb);
  }
  const evidence=new THREE.Group();evidence.position.set(.063,-.062,.254);cat.headGroup.add(evidence);
  for(const [x,y,r] of [[0,0,.016],[.028,.006,.010],[.015,-.022,.008]]){
    const crumb=new THREE.Mesh(new THREE.OctahedronGeometry(r),mat(0xc57b26));crumb.position.set(x,y,0);evidence.add(crumb);
  }
  const tray=new THREE.Mesh(new THREE.BoxGeometry(.40,.028,.34),mat(0xd5b58e));tray.position.set(.85,.016,.53);g.add(tray);
  const plates=new THREE.Group();plates.position.set(.85,.047,.53);g.add(plates);
  for(let i=0;i<4;i++){
    const p=new THREE.Mesh(new THREE.CylinderGeometry(.15,.14,.026,48),mat(i%2?0xffe5d0:0xa8c6b9));p.position.y=i*.03;plates.add(p);
  }
  const sponge=new THREE.Mesh(new THREE.BoxGeometry(.085,.028,.065),mat(0xe9cf87));cat.rightArm.add(sponge);
  const restingSponge=sponge.clone();restingSponge.position.set(.86,.165,.53);g.add(restingSponge);
  return {g,dish,evidence,plates,sponge,restingSponge};
}
export function updateHomeProps(home,t,entry,opts){
  const wash=opts.Mochi.move==='cat_wash'||opts.Mochi.move==='cat_defeat';
  home.sponge.position.set(0,-.16,.05);home.sponge.visible=wash;home.restingSponge.visible=!wash;
}
