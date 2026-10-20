import * as THREE from 'three';
import {continuousBackdrop} from 'dula-assets/lib/craft3d/continuous-backdrop.js';
import {WELL_STEPS} from './layout.js';
const V=a=>new THREE.Vector3(...a),TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
function noise(n){return((Math.sin(n*127.1+311.7)*43758.5453)%1+1)%1;}
function canvasTexture(paint,size=512){
 const c=document.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),size);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;return t;
}
export class WindwardStage{
 constructor(){
  this.scene=new THREE.Scene();this.groups={};this.dynamic={};this.props={};this.anchors={};this.materials={};
  this.hemi=new THREE.HemisphereLight('#dcebf1','#4e5459',1.45);this.scene.add(this.hemi);
  this.key=new THREE.DirectionalLight('#ffe3c1',2.05);this.key.position.set(-5,8,6);this.key.castShadow=true;
  this.key.shadow.mapSize.set(2048,2048);Object.assign(this.key.shadow.camera,{left:-9,right:9,top:8,bottom:-7,near:.2,far:35});this.key.shadow.bias=-.00045;
  this.scene.add(this.key);this.rim=new THREE.DirectionalLight('#afd7f0',1.1);this.rim.position.set(5,4,-6);this.scene.add(this.rim);
  this.fill=new THREE.PointLight('#f1c480',1.5,12,1.5);this.fill.position.set(0,2.6,-.5);this.scene.add(this.fill);
  const mat=(name,color,opts={})=>this.materials[name]=new THREE.MeshStandardMaterial({color,roughness:.85,...opts});
  mat('stone','#b6b6aa');mat('floor','#a1aaa3');mat('rock','#8b9a9e');mat('wood','#a79277');
  mat('darkwood','#6d6557');mat('metal','#74949b',{metalness:.72,roughness:.38});mat('brass','#a89663',{metalness:.72,roughness:.42});
  mat('cloth','#b7b294',{side:THREE.DoubleSide});mat('rope','#8d7956');
  mat('plant','#657f51');mat('bud','#e6cd69',{emissive:'#c8a43b',emissiveIntensity:.65});
  mat('glass','#b1c9b9',{transparent:true,opacity:.13,roughness:.23,metalness:.1,depthWrite:false,side:THREE.DoubleSide});
  this.materials.cloth.map=canvasTexture((g,n)=>{
   g.fillStyle='#e0d3b9';g.fillRect(0,0,n,n);
   for(let i=0;i<n;i+=3){g.strokeStyle=i%2?'#cfc4ad':'#e9dfca';g.lineWidth=.6;g.beginPath();g.moveTo(i,0);g.lineTo(i,n);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(n,i);g.stroke();}
  });
  this.materials.wood.map=canvasTexture((g,n)=>{
   g.fillStyle='#a99577';g.fillRect(0,0,n,n);
   for(let i=0;i<150;i++){const x=noise(i)*n;g.strokeStyle=`rgba(69,50,35,${.04+noise(i+20)*.12})`;g.lineWidth=.5+noise(i+40)*2;g.beginPath();g.moveTo(x,0);g.bezierCurveTo(x+noise(i+7)*16,n*.3,x-noise(i+8)*15,n*.7,x,n);g.stroke();}
  });
  this.materials.darkwood.map=this.materials.wood.map;
  for(const name of['market','courtyard','store','greenhouse','bridge','windwell']){
   const g=new THREE.Group();g.name='location-'+name;this.scene.add(g);this.groups[name]=g;this.dynamic[name]={};this.build(name,g);
  }
  this.dust=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:'#d9e7da',size:.017,transparent:true,opacity:.40,depthWrite:false}));
  this.dust.geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(90*3),3));this.scene.add(this.dust);
 }
 box(parent,w,h,d,x,y,z,material='stone',name=''){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof material==='string'?this.materials[material]:material);
  m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;m.name=name;parent.add(m);return m;
 }
 bar(parent,a,b,r=.025,material='metal'){
  a=V(a);b=V(b);const delta=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),10),typeof material==='string'?this.materials[material]:material);
  m.position.copy(a.clone().lerp(b,.5));m.quaternion.setFromUnitVectors(V([0,1,0]),delta.normalize());m.castShadow=true;parent.add(m);return m;
 }
 curve(parent,points,r=.02,material='rope',name=''){
  const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(V)),40,r,7,false),typeof material==='string'?this.materials[material]:material);
  m.castShadow=true;m.name=name;parent.add(m);return m;
 }
 ring(parent,r,thick,pos,material='metal'){
  const o=new THREE.Mesh(new THREE.TorusGeometry(r,thick,10,80),typeof material==='string'?this.materials[material]:material);o.position.copy(V(pos));o.castShadow=true;parent.add(o);return o;
 }
 tiles(g,w=8,d=6,wood=false){
  this.box(g,w,.3,d,0,-.19,0,'rock');
  const nx=Math.ceil(w/.7),nz=Math.ceil(d/.62);
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
   const o=this.box(g,w/nx-.016,.07,d/nz-.016,(i+.5)*w/nx-w/2,-.025,(j+.5)*d/nz-d/2,wood?'wood':'floor');
   if((i+j)%5===0)o.rotation.y=(noise(i*11+j)-.5)*.009;
  }
 }
 cliff(g,x,z,scale=1){
  for(let i=0;i<4;i++){
   const m=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),this.materials.rock);m.position.set(x+Math.sin(i*2.1)*.28,-3.05-i*2.2,z);m.scale.set(2.0*scale,2.6,1.7*scale);m.rotation.set(.04*i,.65*i,.04);m.castShadow=m.receiveShadow=true;g.add(m);
  }
 }
 cloth(g,w,h,x,y,z,color,rot=0){
  const mat=this.materials.cloth.clone();mat.color.set(color);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h,10,14),mat);m.position.set(x,y,z);m.rotation.z=rot;m.castShadow=true;g.add(m);
  m.userData.rest=m.geometry.attributes.position.array.slice();this.flags??=[];this.flags.push(m);return m;
 }
 bell(g,x,y,z,clapper=true){
  const b=new THREE.Group();b.position.set(x,y,z);g.add(b);
  const shape=[new THREE.Vector2(.03,.16),new THREE.Vector2(.07,.12),new THREE.Vector2(.09,.04),new THREE.Vector2(.14,0)];
  b.add(new THREE.Mesh(new THREE.LatheGeometry(shape,28),this.materials.brass));this.ring(b,.14,.012,[0,0,0],'brass').rotation.x=Math.PI/2;
  if(clapper){const c=new THREE.Mesh(new THREE.SphereGeometry(.028,12,8),this.materials.brass);c.position.y=.025;b.add(c);this.bar(b,[0,.14,0],[0,.035,0],.008,'metal');}
  this.bar(g,[x,y+.16,z],[x,y+.42,z],.009,'rope');return b;
 }
 basket(g,pos){
  const root=new THREE.Group();root.position.copy(V(pos));g.add(root);
  this.box(root,.65,.055,.44,0,.025,0,'wood');
  for(const z of[-.22,.22])for(const y of[.11,.22,.33])this.box(root,.65,.052,.027,0,y,z,'wood');
  for(const x of[-.325,.325])for(const z of[-.17,0,.17])this.box(root,.028,.38,.026,x,.20,z,'wood');
  this.box(root,.69,.028,.035,0,.41,.235,'brass');this.box(root,.69,.028,.035,0,.41,-.235,'brass');
  for(const x of[-.34,.34])this.box(root,.035,.028,.48,x,.41,0,'brass');
  for(const s of[-1,1]){this.box(root,.035,.4,.48,s*.25,.2,0,'metal');this.curve(root,[[s*.26,.42,0],[s*.20,.72,0],[0,.94,0]],.012,'rope');}
  this.ring(root,.07,.013,[0,.96,0],'metal');return root;
 }
 warmPlant(g,pos,small=false){
  const p=new THREE.Group();p.position.copy(V(pos));g.add(p);
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.16,.105,.22,16),this.materials.wood);pot.position.y=.11;p.add(pot);
  const leafMat=this.materials.plant;
  for(let i=0;i<7;i++){
   const a=i*2.4,leaf=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),leafMat);
   leaf.position.set(Math.sin(a)*.07,.29+noise(i)*.14,Math.cos(a)*.07);leaf.scale.set(.035,.14,.016);leaf.rotation.set(Math.cos(a)*.7,a,Math.sin(a)*.7);p.add(leaf);
  }
  const bud=new THREE.Mesh(new THREE.SphereGeometry(.06,16,12),this.materials.bud);bud.scale.y=1.4;bud.position.y=.48;p.add(bud);
  if(small)p.scale.setScalar(.7);return p;
 }
 build(name,g){
  const d=this.dynamic[name];
  if(name==='market'){
   this.tiles(g,8,5);this.cliff(g,0,0,1.8);
   d.stalls=[];
   for(const s of[-1,1]){
    for(let i=0;i<3;i++){
     const z=-1.4-i*1.1,x=s*2.7,stall=new THREE.Group();stall.position.set(x,0,z);stall.userData.origin=[x,z];g.add(stall);d.stalls.push(stall);
     this.box(stall,1.6,.12,.8,0,.76,0,'wood');
     for(const dx of[-.65,.65])this.bar(stall,[dx,0,0],[dx,2.3,0],.04,'darkwood');
     const c=this.cloth(stall,1.9,1.5,0,2.25,-.2,i%2?'#a98663':'#7caaa1');c.rotation.x=-Math.PI/2+.15;
     for(let j=0;j<3;j++)this.warmPlant(stall,[-.4+j*.35,.82,0],true);
    }
   }
   this.bar(g,[-2.2,2.75,-1.7],[2.2,2.75,-1.7],.025,'rope');
   d.bells=[];for(let i=0;i<7;i++)d.bells.push(this.bell(g,-1.8+i*.6,i===3?1.45:2.23,-1.7,i!==3));
   this.props.marketBell=d.bells[3];this.props.marketBasket=this.basket(g,[1.6,0,.3]);
   for(const [x,z]of[[-6,-5],[6,-7],[-8,-10]]){this.cliff(g,x,z,1);this.box(g,2.4,.2,2,x,-.05,z,'floor');}
   this.box(g,.7,.7,.6,-2,.35,.7,'wood');
  }else if(name==='courtyard'){
   this.tiles(g,9,7);this.cliff(g,0,0,2.0);
   const ringRoot=new THREE.Group();ringRoot.position.set(0,2.8,-3.4);g.add(ringRoot);
   for(const r of[.48,1.4,2.55,2.72])this.ring(ringRoot,r,r>2?.07:.03,[0,0,0],'metal');
   d.rotor=new THREE.Group();ringRoot.add(d.rotor);
   for(let i=0;i<16;i++){const a=i*TAU/16;this.bar(ringRoot,[Math.cos(a)*.5,Math.sin(a)*.5,0],[Math.cos(a)*2.5,Math.sin(a)*2.5,0],.024);const f=this.cloth(d.rotor,.33,1.65,Math.cos(a)*1.5,Math.sin(a)*1.5,.02,i%3?'#a3c4c3':'#dfc593',a-Math.PI/2);}
   for(const s of[-1,1]){
    for(let i=0;i<3;i++){const x=s*3.5,z=-2.7+i*1.6;this.box(g,.5,3.8,.62,x,1.85,z,'stone');for(const y of[.25,2.8,3.5])this.box(g,.62,.12,.74,x,y,z,'brass');}
    this.box(g,.65,.3,4.4,s*3.5,3.7,-1.0,'stone');
    this.cloth(g,.75,2.1,s*3.2,2.1,-2.9,s===1?'#9bafb8':'#6c959b');
   }
   this.box(g,1.1,.7,.65,1.9,.35,-.7,'stone');this.props.courtyardPlant=this.warmPlant(g,[1.9,.7,-.7]);
   this.anchors.courtyard={table:[1.9,1.12,-.7],gate:[0,1,-3.3]};
  }else if(name==='store'){
   this.tiles(g,8,6,true);
   this.box(g,2.6,.13,1.6,0,-.065,3.6,'wood','entry-porch');
   this.box(g,8,4,.25,0,1.9,-3.0,'stone');this.box(g,.25,4,6,-4,1.9,0,'stone');this.box(g,.25,4,6,4,1.9,0,'stone');
   for(let x=-3.5;x<=3.5;x+=1.4){this.box(g,.16,4,.18,x,1.9,-2.82,'darkwood');this.bar(g,[x,3.9,-2.9],[x,4.35,0],.07,'wood');this.bar(g,[x,4.35,0],[x,3.9,2.9],.07,'wood');}
   for(let z=-2.5;z<=2.5;z+=1)this.box(g,8,.1,.12,0,3.85,z,'wood');
   for(let i=0;i<7;i++){
    const r=this.ring(g,.26+i%3*.055,.055,[-3.35+(i%2)*.6,.55+Math.floor(i/2)*.55,-2.5],'rope');r.rotation.y=.15;
   }
   this.box(g,2.2,.1,.9,.2,.84,-.6,'wood');
   for(const x of[-.75,1.15])for(const z of[-.91,-.29])this.box(g,.12,.85,.12,x,.42,z,'darkwood');
   d.winch=new THREE.Group();d.winch.position.set(-2,.7,.2);g.add(d.winch);
   this.ring(d.winch,.42,.04,[0,0,0],'metal');for(let i=0;i<6;i++){const a=i*TAU/6;this.bar(d.winch,[0,0,0],[Math.cos(a)*.4,Math.sin(a)*.4,0],.025);}
   this.bar(g,[-2,.7,-.4],[-2,.7,.4],.06,'metal');this.box(g,.8,.6,.8,-2,.3,0,'wood');
   this.bar(g,[-2,1.04,.15],[-2,1.04,.67],.035,'wood','ratchet-pressure-bar');
   for(let i=0;i<5;i++)this.box(g,.55,.5,.5,2.4+(i%2)*.5,.25+Math.floor(i/2)*.5,-2.1,'wood');
   const plaqueMat=new THREE.MeshStandardMaterial({color:'#b1a18b',roughness:1,map:canvasTexture((ctx,n)=>{ctx.fillStyle='#a18b6b';ctx.fillRect(0,0,n,n);ctx.fillStyle='#4f493f';ctx.font='32px Microsoft YaHei';ctx.textAlign='center';['旧桥守望','愿风记得','林禾  ·  绍平','罗芷  ·  季宁','缄雪','回风之年'].forEach((s,i)=>ctx.fillText(s,n/2,65+i*67));})});
   this.box(g,1.15,1.15,.04,.2,2.15,-2.84,plaqueMat,'memorial-plaque');
   this.anchors.store={table:[.2,.94,-.6],winch:[-2,1.1,.15]};
   for(const x of[-.85,.85])this.box(g,.12,2.3,.18,x,1.15,2.9,'darkwood');
   this.box(g,1.82,.14,.2,0,2.33,2.9,'wood');
   d.door=new THREE.Group();d.door.position.set(-.78,0,2.9);g.add(d.door);
   this.box(d.door,1.56,2.2,.07,.78,1.1,0,'wood','store-door');
   this.ring(d.door,.07,.012,[1.38,1.08,.07],'brass');
   d.basket=this.basket(g,[0,.14,1.28]);this.props.storeBasket=d.basket;
  }else if(name==='greenhouse'){
   this.tiles(g,8,7);
   for(let z=-3;z<=3;z+=1.15){
    const pts=[];for(let i=0;i<=24;i++){const a=i*Math.PI/24;pts.push([Math.cos(a)*3.7,.25+Math.sin(a)*3.55,z]);}
    this.curve(g,pts,.045,'brass');
   }
   for(const x of[-3.7,-2.6,0,2.6,3.7])this.bar(g,[x,x===0?3.8:2.7,-3.2],[x,x===0?3.8:2.7,3.2],.025,'metal');
   d.glassPanels=[];
   for(let iz=0;iz<6;iz++)for(let ia=0;ia<4;ia++){
    const p=[],indices=[],z0=-3.2+iz*1.08,z1=z0+1.06;
    for(let i=0;i<=8;i++){
     const a=(ia+i/8)*Math.PI/4,x=Math.cos(a)*3.7,y=.25+Math.sin(a)*3.55;
     p.push(x,y,z0,x,y,z1);if(i<8){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(indices);geo.computeVertexNormals();
    const panel=new THREE.Mesh(geo,this.materials.glass);g.add(panel);d.glassPanels.push(panel);
   }
   d.glassShards=[];
   for(let i=0;i<12;i++){const shard=this.box(g,.06+(i%3)*.035,.012,.09,-1.4,2.8,-2.3,this.materials.glass);shard.visible=false;d.glassShards.push(shard);}
   for(const s of[-1,1]){
    this.box(g,1.25,.1,5.7,s*2.55,.6,-.2,'wood');
    for(let i=0;i<10;i++)this.warmPlant(g,[s*(2.3+(i%2)*.5),.66,-2.5+Math.floor(i/2)*1.1],i%3!==0);
    this.bar(g,[s*3.2,.22,-3],[s*3.2,.22,3],.09,'brass');
   }
   this.box(g,1.15,.08,.8,.8,.76,-.6,'wood');this.props.greenhousePlant=this.warmPlant(g,[.8,.8,-.6]);
   this.props.warmPipe=this.bar(g,[-3,.3,-2.8],[3,.3,-2.8],.11,'brass');
   this.anchors.greenhouse={plant:[.8,1.22,-.6],heat:[0,2.4,-2.8]};
  }else if(name==='bridge'){
   // The acting surface IS the bridge. Thick ropes carry load, fine lines are added by effects.
   d.planks=[];for(let i=0;i<29;i++){const x=-4.2+i*.30;d.planks.push(this.box(g,.28,.09,1.55,x,-.05,0,'wood'));}
   for(const z of[-.80,.80]){
    this.curve(g,[[-4.8,1.1,z],[-2.4,.75,z],[0,.67,z],[2.4,.75,z],[4.8,1.1,z]],.026,'rope');
    this.curve(g,[[-4.8,-.15,z],[-2.4,-.22,z],[0,-.24,z],[2.4,-.22,z],[4.8,-.15,z]],.038,'rope');
    for(let i=0;i<11;i++)this.bar(g,[-4.0+i*.8,-.18,z],[-4.0+i*.8,.70+Math.abs(-4+i*.8)*.06,z],.012,'rope');
   }
   for(const s of[-1,1]){this.box(g,3,.3,4,s*5.4,-.15,0,'floor');this.cliff(g,s*5.4,0,1.25);for(const z of[-1,1])this.box(g,.26,1.65,.26,s*4.8,.78,z,'stone');}
   this.curve(g,[[-5,2,-1.4],[0,1.6,-1.4],[5,2,-1.4]],.024,'metal');
   d.basket=this.basket(g,[0,.76,-.48]);this.props.bridgeBasket=d.basket;
   this.anchors.bridge={cargo:[0,.95,-1.4],rope:[0,.75,.8],safe:[-4.8,0,0]};
  }else if(name==='windwell'){
   // A complete distant chamber surrounds the near working shaft. The near
   // wall has a camera opening; that opening must reveal depth, not clear color.
   const deepMat=this.materials.rock.clone();deepMat.color.set('#5b6d75');deepMat.side=THREE.BackSide;
   this.materials.deepShaft=deepMat;
   const deepWall=new THREE.Mesh(new THREE.CylinderGeometry(18,15.5,44,64,1,true),deepMat);
   deepWall.position.set(0,-7,-4.8);g.add(deepWall);
   const distantMetal=new THREE.MeshStandardMaterial({color:'#627c83',roughness:.7,metalness:.35});
   for(const y of[-21,-14,-7,0,7]){
    const ring=this.ring(g,16.5,.16,[0,y,-4.8],distantMetal);ring.rotation.x=Math.PI/2;
    for(let i=0;i<16;i++){
     const a=i*TAU/16,x=Math.cos(a)*16.3,z=-4.8+Math.sin(a)*16.3;
     this.bar(g,[x,y,z],[x,y+6.7,z],.095,distantMetal);
     if(i%2===0)this.bar(g,[x,y+1.1,z],[Math.cos(a+.24)*16.3,y+1.1,-4.8+Math.sin(a+.24)*16.3],.055,distantMetal);
    }
   }
   const lowerWheel=new THREE.Group();lowerWheel.position.set(0,-13,-4.8);lowerWheel.rotation.x=Math.PI/2;g.add(lowerWheel);
   this.ring(lowerWheel,3.8,.14,[0,0,0],distantMetal);this.ring(lowerWheel,.7,.12,[0,0,0],'brass');
   for(let i=0;i<12;i++){const a=i*TAU/12;this.bar(lowerWheel,[Math.cos(a)*.7,Math.sin(a)*.7,0],[Math.cos(a)*3.8,Math.sin(a)*3.8,0],.07,distantMetal);}
   d.platform=new THREE.Group();g.add(d.platform);this.tiles(d.platform,6.2,3.8,true);
   this.box(g,5.6,.18,.75,0,.55,1.7,'stone','upper-rescue-ledge');
   this.box(g,1.35,.16,1.15,2.1,.42,-.6,'stone','lamp-ledge');
   this.bar(g,[1.8,1.82,-.25],[2.75,1.82,-.25],.026,'metal');
   this.curve(g,[[2.3,2.25,-.75],[2.3,2.25,-.58],[2.3,2.16,-.58],[2.3,2.16,-.63]],.012,'brass');
   this.box(g,.55,.16,1.15,1.35,.52,-.6,'stone','pin-ledge');
   for(const s of WELL_STEPS)this.box(g,s.width,s.height,s.depth,s.x,s.height/2,s.z,'stone','lamp-step');
   const shaft=new THREE.Mesh(new THREE.CylinderGeometry(5.3,4.7,22,48,1,true,.85,TAU-1.70),this.materials.rock);shaft.material=shaft.material.clone();this.materials.shaft=shaft.material;shaft.material.side=THREE.BackSide;shaft.position.set(0,-5,-4.8);g.add(shaft);
   for(let y=-13;y<=5;y+=3){
    const rg=new THREE.TorusGeometry(5.05,.10,10,80,TAU-1.7);rg.rotateZ(Math.PI/2+.85);
    const ring=new THREE.Mesh(rg,this.materials.brass);ring.position.set(0,y,-4.8);ring.rotation.x=Math.PI/2;g.add(ring);
    for(let i=0;i<12;i++){const a=i*TAU/12;if(Math.sin(a)>.65)continue;this.bar(g,[Math.cos(a)*4.9,y,-4.8+Math.sin(a)*4.9],[Math.cos(a)*4.9,y+2.8,-4.8+Math.sin(a)*4.9],.055,'metal');}
   }
   d.fan=new THREE.Group();d.fan.position.set(0,1.8,-4.4);g.add(d.fan);
   this.ring(d.fan,2.8,.1,[0,0,0],'metal');this.ring(d.fan,.48,.1,[0,0,0],'brass');
   for(let i=0;i<8;i++){const a=i*TAU/8;const m=this.box(d.fan,.75,2.15,.08,Math.cos(a)*1.55,Math.sin(a)*1.55,0,i%2?'metal':'brass');m.rotation.z=a-Math.PI/2+.12;}
   for(const s of[-1,1])this.box(g,.3,3.3,.4,s*1.5,1.55,-1.8,'stone');
   this.box(g,3.3,.3,.4,0,3.05,-1.8,'stone');
   d.gate=this.box(g,2.7,2.5,.20,0,1.25,-1.85,'metal','pressure-gate');
   for(let i=0;i<9;i++)this.box(d.gate,.04,2.42,.04,-1.16+i*.29,0,.13,'brass');
   d.handle=new THREE.Group();d.handle.position.set(-1.65,.83,.1);g.add(d.handle);
   this.bar(d.handle,[0,-.35,0],[0,.35,0],.027,'brass');this.bar(d.handle,[-.2,.35,0],[.2,.35,0],.028,'wood');
   this.box(g,.45,.75,.35,-1.65,.37,0,'stone');
   this.props.gateHandle=d.handle;
   this.bar(g,[-2.8,2.7,-1],[2.8,2.7,-1],.075,'darkwood');
   this.bar(g,[-2.8,2.7,2.12],[2.8,2.7,2.12],.06,'darkwood');
   for(const x of[-2.8,2.8])this.bar(g,[x,.64,2.12],[x,2.7,2.12],.055,'darkwood');
   this.anchors.windwell={handle:[-1.65,1.35,.1],gate:[0,1.1,-1.63],beam:[2.5,2.7,-1],platform:[0,0,0],lamp:[2.3,2.1,-.6]};
   const pressureMat=new THREE.MeshBasicMaterial({color:'#87dded',transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
   d.pressure=new THREE.Mesh(new THREE.CylinderGeometry(.55,.9,12,32,1,true),pressureMat);d.pressure.position.set(0,-5,-4.5);g.add(d.pressure);
  }
 }
 async load(){
  const loader=new THREE.TextureLoader(),base='../assets3d/tex/';
  const [sky,rock,stone]=await Promise.all([loader.loadAsync('./assets/tex/windward_village.png'),loader.loadAsync(base+'peak_rock.png'),loader.loadAsync(base+'palace_stone.png')]);
  for(const t of[sky,rock,stone]){t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.anisotropy=8;}
  this.materials.stone.map=stone;this.materials.stone.bumpMap=stone;this.materials.stone.bumpScale=.012;
  this.materials.floor.map=stone;this.materials.floor.bumpMap=stone;this.materials.floor.bumpScale=.009;
  this.materials.rock.map=rock;this.materials.rock.bumpMap=rock;this.materials.rock.bumpScale=.026;
  this.materials.shaft.map=rock;this.materials.shaft.bumpMap=rock;this.materials.shaft.bumpScale=.020;this.materials.shaft.needsUpdate=true;
  const deepRock=rock.clone();deepRock.repeat.set(6,3);deepRock.needsUpdate=true;
  this.materials.deepShaft.map=deepRock;this.materials.deepShaft.needsUpdate=true;
  for(const n of['stone','floor','rock'])this.materials[n].needsUpdate=true;
  this.backdrop=continuousBackdrop(sky,{center:[0,-3,-3],cylinderRadius:55,cylinderHeight:60,radius:80,repeat:3.5,offset:.16,zenith:'#9bb5c4'});
  this.backdrop.material.uniforms.filmTint={value:new THREE.Color('#ffffff')};
  this.backdrop.material.uniforms.lowMist={value:new THREE.Color('#c6ccce')};
  this.backdrop.material.fragmentShader=this.backdrop.material.fragmentShader
   .replace('uniform vec3 center, zenithColor;','uniform vec3 center, zenithColor, filmTint, lowMist;')
   .replace('// A vertical ray',`color=mix(color,lowMist,1.-smoothstep(-.35,.08,v)); color*=filmTint;
        // A vertical ray`);
  this.scene.add(this.backdrop);
  try{
   const wood=await loader.loadAsync('./assets/tex/cedar.png');wood.colorSpace=THREE.SRGBColorSpace;wood.wrapS=wood.wrapT=THREE.MirroredRepeatWrapping;wood.anisotropy=8;
   for(const n of['wood','darkwood']){this.materials[n].map=wood;this.materials[n].bumpMap=wood;this.materials[n].bumpScale=.008;this.materials[n].needsUpdate=true;}
  }catch{/* Interim painted grain remains explicit until generated asset exists. */}
 }
 setLocation(name,t,progress=0,story={}){
  this.location=name;for(const[k,g]of Object.entries(this.groups))g.visible=k===name;
  const interior=name==='store'||name==='windwell',night=progress>.89;
  this.scene.background=new THREE.Color(interior?'#394a53':night?'#526174':'#a2beca');
  this.scene.fog=new THREE.Fog(interior?'#4c6269':night?'#687185':'#a4bdc7',interior?13:22,interior?45:68);
  this.backdrop.visible=!interior;this.hemi.intensity=interior?1.12:night?1.18:1.55;
  this.backdrop.material.uniforms.filmTint.value.set(night?'#b9b6c5':'#ffffff');
  this.key.intensity=interior?1.55:night?.95:1.95;this.key.color.set(night?'#f1bb85':'#ffe3c1');
  this.fill.intensity=interior?2.2:night?2.4:.55;this.fill.color.set(name==='windwell'?'#a0d8e3':'#f1c480');
  this.rim.intensity=interior?.65:1.1;
  const wind=story.wind??.4;
  for(const m of this.flags??[]){
   if(!m.parent.parent?.visible&&m.parent!==this.groups[name])continue;
   const p=m.geometry.attributes.position,r=m.userData.rest;
   for(let i=0;i<p.count;i++)p.setZ(i,r[i*3+2]+Math.sin(t*1.4+r[i*3+1]*2.3+r[i*3]*.8)*.035*wind);
   p.needsUpdate=true;
  }
  const d=this.dynamic[name];
  if(d.stalls)for(const[i,o]of d.stalls.entries()){
   const u=i===3?(story.marketDamage??0):0;
   o.rotation.z=-u*1.08;o.position.set(o.userData.origin[0]+u*.38,u*.62,o.userData.origin[1]);
  }
  if(d.bells)for(const [i,b]of d.bells.entries())b.rotation.z=(story.silenced?0:Math.sin(t*1.9+i)*.045*wind);
  if(d.rotor)d.rotor.rotation.z=story.locked?0:t*.04;
  if(d.winch)d.winch.rotation.z=story.winch??0;
  if(d.door)d.door.rotation.y=-(story.door??1)*Math.PI*.63;
  if(d.basket){
   d.basket.visible=name!=='store'||!!story.rescueThird;
   d.basket.position.set(story.cargoX??0,story.cargoY??.76,story.cargoZ??-.48);
   d.basket.rotation.z=Math.sin(t*1.8)*.022*wind;
  }
  if(d.glassPanels){
   for(const[i,p]of d.glassPanels.entries())p.visible=!(story.glassBroken&&[1,2,5].includes(i));
   const age=t-(story.glassBreakTime??1e9);
   for(const[i,p]of d.glassShards.entries()){
    p.visible=age>=0&&age<2.2;
    if(p.visible){p.position.set(-1.1+Math.sin(i*2.4)*.8+age*Math.cos(i)*.18,3.1-age*age*.85,-2.4+Math.cos(i*1.7)*.4);p.rotation.set(age*(i%3+1),i,age*2.1);}
   }
  }
  if(d.fan)d.fan.rotation.z=story.locked?0:t*.10;
  if(d.gate)d.gate.position.y=1.25+(story.gate??0)*2.3;
  if(d.handle)d.handle.rotation.z=-(story.gate??0)*.7;
  if(d.platform){d.platform.position.y=-(story.platformDrop??0);d.platform.rotation.z=story.platformTilt??0;}
  if(d.planks)for(const[i,p]of d.planks.entries()){
   p.visible=!(story.bridgeGap&&i===20);p.rotation.z=story.bridgeGap&&i===21?.15:0;
  }
  if(d.pressure){d.pressure.material.opacity=.11+(story.pressure??.3)*.17;d.pressure.rotation.y=t*.2;}
  this.materials.bud.emissiveIntensity=story.cold?.05:.65;
  this.materials.bud.color.set(story.cold?'#7e9988':'#e6cd69');
  const p=this.dust.geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setXYZ(i,((i*.921+t*.20*wind)%14)-7,.25+(i*.487)%4,-5+(i*.567)%8);
  p.needsUpdate=true;
 }
}
