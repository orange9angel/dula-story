import * as THREE from 'three';

const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.58,metalness:.03});
function mesh(geometry,material,parent,position=[0,0,0],scale=[1,1,1]) {
  const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);
  m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function ball(parent,material,position,scale,r=.1){return mesh(new THREE.SphereGeometry(r,24,16),material,parent,position,scale);}
function box(parent,material,position,size){return mesh(new THREE.BoxGeometry(...size),material,parent,position);}
function group(parent){const g=new THREE.Group();parent.add(g);return g;}

export function buildWardrobe(c) {
  if(c.wardrobe)return;
  // Runtime limb rigs may insert pivot groups. Resolve garment meshes by their
  // material and ancestry instead of assuming a fixed child index.
  const under=(o,parent)=>{for(let p=o.parent;p;p=p.parent)if(p===parent)return true;return false;};
  const base=[],sleeves=[],shoes=[];
  c.mesh.traverse(o=>{
    if(!o.isMesh || !o.material?.color)return;
    const color=o.material.color.getHex();
    if(color===0x5a3a2a && (under(o,c.leftLeg)||under(o,c.rightLeg)))shoes.push(o);
    if(under(o,c.headGroup))return;
    if(color===0xf8f8fa && (under(o,c.leftArm)||under(o,c.rightArm)))sleeves.push(o);
    else if([0xf8f8fa,0x2a3a5e,0xd44a4a].includes(color))base.push(o);
  });
  if(!base.length || !sleeves.length || !shoes.length)throw new Error(`Garment rig incomplete: ${base.length}/${sleeves.length}/${shoes.length}`);
  [...sleeves,...shoes].forEach(o=>{o.material=o.material.clone();o.userData.originalColor=o.material.color.getHex();});
  const pink=mat(0xff94b7),cream=mat(0xfff2db),navy=mat(0x27324e),blue=mat(0x76b8f1),yellow=mat(0xffce43),white=mat(0xffffff),black=mat(0x212333),gold=mat(0xf1b944);
  const outfits={},hats={};
  function body(name,color,skirtColor,style) {
    const g=group(c.mesh);outfits[name]=g;
    mesh(new THREE.CapsuleGeometry(style==='hoodie'?.18:.16,.18,6,24),color,g,[0,.975,0],[1,1,.9]);
    mesh(new THREE.CylinderGeometry(.16,style==='dress'?.33:.27,style==='dress'?.36:.23,32),skirtColor,g,[0,style==='dress'?.69:.71,0]);
    if(style==='hoodie') {
      const hood=mesh(new THREE.TorusGeometry(.155,.044,12,40),color,g,[0,1.11,-.015]);hood.rotation.x=Math.PI/2;
      ball(g,cream,[0,.9,.164],[1.2,.55,.16],.075);
      for(const side of [-1,1])box(g,cream,[side*.05,1.022,.153],[.012,.10,.012]);
    } else if(style==='sailor') {
      for(const side of [-1,1]) {
        const collar=box(g,white,[side*.06,1.08,.139],[.035,.15,.014]);collar.rotation.z=side*-.65;
        ball(g,navy,[side*.05,1.015,.166],[1,.57,.3],.048);
      }
      ball(g,gold,[0,1.015,.185],[1,1,.5],.018);
      const stripe=mesh(new THREE.TorusGeometry(.271,.009,8,40),white,g,[0,.616,0]);stripe.rotation.x=Math.PI/2;
    } else if(style==='jacket') {
      box(g,white,[0,.97,.15],[.074,.25,.025]);
      for(const side of [-1,1]){
        const lapel=box(g,black,[side*.059,1.055,.157],[.035,.14,.017]);lapel.rotation.z=side*.4;
        ball(g,white,[side*.10,.96,.157],[1,1,.2],.012);
      }
    } else if(style==='dress') {
      box(g,cream,[0,.9,.142],[.30,.036,.02]);
      for(const side of [-1,1])ball(g,cream,[side*.047,.9,.163],[1,.65,.3],.045);
      for(let i=0;i<12;i++)ball(g,cream,[Math.sin(i*Math.PI/6)*.30,.535,Math.cos(i*Math.PI/6)*.30],[1,.65,1],.038);
    }
  }
  body('bunny',pink,pink,'hoodie');body('sailor',blue,navy,'sailor');
  body('sunny',yellow,black,'jacket');body('princess',pink,pink,'dress');
  const bunny=group(c.headGroup);hats.bunny=bunny;
  const band=mesh(new THREE.TorusGeometry(.295,.032,12,48,Math.PI),cream,bunny,[0,.055,-.03]);
  for(const side of [-1,1]) {
    const ear=group(bunny);ear.position.set(side*.175,.36,-.035);ear.rotation.z=side*-.18;
    ball(ear,cream,[0,.09,0],[.65,2.2,.43],.083);
    ball(ear,pink,[0,.09,.028],[.38,1.72,.12],.083);
  }
  const beret=group(c.headGroup);hats.beret=beret;
  ball(beret,navy,[-.045,.325,-.065],[1.05,.29,.91],.32);
  ball(beret,navy,[-.09,.42,-.05],[.6,1,.6],.024);
  const brim=mesh(new THREE.TorusGeometry(.277,.019,10,48),cream,beret,[0,.30,-.06]);brim.rotation.x=Math.PI/2;
  const crown=group(c.headGroup);hats.crown=crown;
  const crownBase=mesh(new THREE.CylinderGeometry(.13,.12,.065,24),gold,crown,[0,.38,-.04]);
  for(const side of [-1,0,1]) {
    mesh(new THREE.ConeGeometry(.052,.13,4),gold,crown,[side*.085,.463,.022]);
    ball(crown,pink,[side*.085,.534,.022],[1,1,1],.019);
  }
  const shades=group(c.headGroup);
  for(const side of [-1,1]) {
    const frame=box(shades,black,[side*.108,.038,.323],[.186,.132,.030]);frame.rotation.z=side*.035;
    const lens=box(shades,new THREE.MeshPhysicalMaterial({color:0x182b3c,roughness:.16,metalness:.2,clearcoat:1}),[side*.108,.038,.342],[.15,.099,.012]);lens.rotation.z=side*.035;
    const glint=box(shades,mat(0x85d8e3),[side*.108-.03,.063,.35],[.009,.065,.003]);glint.rotation.z=-.55;
    box(shades,black,[side*.212,.044,.207],[.018,.024,.24]);
  }
  box(shades,black,[0,.052,.323],[.05,.019,.025]);
  c.wardrobe={base,sleeves,shoes,outfits,hats,shades};
}

export function setWardrobe(c,outfit,accessory) {
  buildWardrobe(c);
  const w=c.wardrobe;
  w.base.forEach(o=>o.visible=outfit==='original');
  Object.entries(w.outfits).forEach(([name,g])=>g.visible=name===outfit);
  Object.values(w.hats).forEach(g=>g.visible=false);
  if(outfit==='bunny')w.hats.bunny.visible=true;
  if(outfit==='sailor')w.hats.beret.visible=true;
  if(outfit==='princess')w.hats.crown.visible=true;
  const colors={original:0xf8f8fa,bunny:0xff94b7,sailor:0x76b8f1,sunny:0xffce43,princess:0xff94b7};
  w.sleeves.forEach(o=>o.material.color.setHex(colors[outfit]));
  w.shoes.forEach(o=>o.material.color.setHex(outfit==='original'?o.userData.originalColor:outfit==='bunny'||outfit==='princess'?0xf16499:outfit==='sailor'?0x27324e:0x212333));
  w.shades.visible=accessory==='shades';
  if(w.shades.visible) {
    c.leftEye.visible=false;c.rightEye.visible=false;
    c.beatFace.eyes.forEach(o=>o.visible=false);
  }
}
