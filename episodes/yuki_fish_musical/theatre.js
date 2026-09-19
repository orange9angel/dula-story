import * as THREE from 'three';
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.74});
export function buildTheatre(scene,cat){
  const g=new THREE.Group();scene.add(g);
  const box=(w,h,d,color,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));o.position.set(x,y,z);g.add(o);return o;};
  box(4.6,3.6,.08,0xead2a7,0,1.55,-1.8);
  box(4.6,.10,.12,0xb17855,0,.72,-1.70);
  for(let i=-8;i<=8;i++)box(.008,3,.008,0xdab689,i*.28,1.45,-1.748);
  // Velvet wings and scalloped valance frame a tiny kitchen theatre.
  for(const side of [-1,1])for(let i=0;i<5;i++){
    const c=new THREE.Mesh(new THREE.CylinderGeometry(.15,.17,3.5,20),mat(i%2?0x9e4561:0xb7546f));
    c.position.set(side*(1.63+i*.19),1.5,-1.25);g.add(c);
  }
  for(let i=-5;i<=5;i++){
    const o=new THREE.Mesh(new THREE.SphereGeometry(.30,24,16),mat(0xab4761));
    o.scale.set(1.2,.60,.6);o.position.set(i*.34,2.92,-1.2);g.add(o);
  }
  const window=new THREE.Mesh(new THREE.CircleGeometry(.47,48),mat(0x88baca));window.position.set(.92,1.83,-1.73);g.add(window);
  const trim=new THREE.Mesh(new THREE.TorusGeometry(.48,.033,12,64),mat(0xffe6b8));trim.position.copy(window.position);trim.position.z+=.015;g.add(trim);
  box(.025,.94,.04,0xffe6b8,.92,1.83,-1.68);box(.94,.025,.04,0xffe6b8,.92,1.83,-1.68);
  // Empty snack dish and persistent crumbs: the joke has physical evidence.
  const dish=new THREE.Group();dish.position.set(.08,.035,.38);g.add(dish);
  const plate=new THREE.Mesh(new THREE.CylinderGeometry(.20,.17,.036,48),mat(0xeee3d3));dish.add(plate);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.185,.016,10,48),mat(0x42a9a6));rim.rotation.x=Math.PI/2;rim.position.y=.022;dish.add(rim);
  for(const [x,z] of [[-.06,.03],[.04,-.02],[.07,.06]]){
    const crumb=new THREE.Mesh(new THREE.OctahedronGeometry(.011),mat(0xc58d41));crumb.position.set(x,.029,z);dish.add(crumb);
  }
  const evidence=new THREE.Group();evidence.position.set(.063,-.062,.254);cat.headGroup.add(evidence);
  for(const [x,y,r] of [[0,0,.016],[.028,.006,.010],[.015,-.022,.008]]){
    const crumb=new THREE.Mesh(new THREE.OctahedronGeometry(r),mat(0xc57b26));crumb.position.set(x,y,0);evidence.add(crumb);
  }
  const plates=new THREE.Group();plates.position.set(.78,.06,.58);g.add(plates);
  for(let i=0;i<4;i++){
    const p=new THREE.Mesh(new THREE.CylinderGeometry(.15,.14,.026,48),mat(i%2?0xffe5d0:0x7dc7be));p.position.y=i*.03;plates.add(p);
  }
  const sponge=new THREE.Mesh(new THREE.BoxGeometry(.085,.028,.065),mat(0xf6cb54));
  sponge.position.set(0,-.16,.05);cat.rightArm.add(sponge);
  return {g,dish,evidence,plates,sponge};
}
export function updateTheatre(stage,t,entry,opts){
  const wash=opts.Mochi.move==='cat_wash'||opts.Mochi.move==='cat_defeat';
  // Dishes are always present; finale brings the stack toward the forepaws.
  const u=Math.max(0,Math.min(1,(t-stage.washAt)/.7));
  stage.plates.position.x=1.35-.55*u*u*(3-2*u);stage.sponge.visible=wash;
}
