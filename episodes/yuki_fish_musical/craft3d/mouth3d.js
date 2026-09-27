// V17 geometric mouth on the craft HeadAssembly. The craft face is a
// CanvasTexture whose mouth is only a drawn smile stroke, so a skin-colored
// patch buries that stroke and this strip rig (ported from the episode's
// lipsync_v13.js buildMouth/applyLips math, plus the lipsync_v17.js
// purse/teeth channels) draws the real mouth in front of it.
// Head-local coordinates: face front at mouth height is z≈.21; the patch
// sits on the surface and the strips float ~3mm above it.
import * as THREE from 'three';

const N=32;
function stripGeometry(){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array((N+1)*2*3),3));
  const indices=[];for(let i=0;i<N;i++)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
  g.setIndex(indices);return g;
}

export class CraftMouth {
  constructor(headAssembly){
    const head=headAssembly.head;
    const patch=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),
      new THREE.MeshBasicMaterial({color:'#ffe3d1'}));
    patch.scale.set(.07,.045,.025);patch.position.set(0,-.150,.205);
    head.add(patch);this.patch=patch;
    const group=new THREE.Group();group.position.set(0,-.150,.233);head.add(group);
    const material=color=>new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});
    this.cavity=new THREE.Mesh(stripGeometry(),material(0x431923));
    this.upper=new THREE.Mesh(stripGeometry(),material(0x9d4654));
    this.lower=new THREE.Mesh(stripGeometry(),material(0xb65d69));
    this.teeth=new THREE.Mesh(stripGeometry(),material(0xf2dfd3));
    this.tongue=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),material(0xbc5365));
    group.add(this.cavity,this.upper,this.lower,this.teeth,this.tongue);
    for(const o of [this.cavity,this.upper,this.lower,this.teeth,this.tongue])o.frustumCulled=false;
    this.group=group;
  }
  apply(lip0){
    // V17 detail channels first (same mapping as lipsync_v17.js).
    const purse=lip0.purse||0,teeth0=lip0.teeth||0;
    const lip={...lip0};
    if(purse>0){
      lip.width=lip.width*(1-.42*purse);
      lip.rounding=Math.max(lip.rounding||0,purse);
      lip.jaw=lip.jaw*(1-.18*purse);
      lip.open=lip.open*(1-.18*purse);
    }
    if(teeth0>(lip.labiodental||0))lip.labiodental=teeth0;
    // V13 contour math, unchanged.
    const open=lip.open>.018,width=.045*lip.width;
    const height=open?.006+.059*lip.jaw:0;
    const round=lip.rounding||0,pucker=.012*round;
    const mix=(a,b,t)=>a+(b-a)*t;
    const upper=[],lower=[];
    for(let i=0;i<=N;i++){
      const x=i/N*2-1,q=Math.max(0,1-x*x),arc=q**mix(.65,.5,round);
      let top,bottom;
      if(!open){top=bottom=(lip.seal?-.002:-.009)*q;}
      else{
        top=(.004+.24*height*round)*arc;
        bottom=-(height*(1-.24*round)-.004)*arc;
      }
      upper.push([x*width,top,pucker]);lower.push([x*width,bottom,pucker]);
    }
    const put=(mesh,top,bottom,z)=>{
      const pos=mesh.geometry.attributes.position;
      for(let i=0;i<=N;i++){
        pos.setXYZ(i*2,top[i][0],top[i][1],top[i][2]+z);
        pos.setXYZ(i*2+1,bottom[i][0],bottom[i][1],bottom[i][2]+z);
      }pos.needsUpdate=true;
    };
    put(this.cavity,upper,lower,0);this.cavity.visible=open;
    const thickness=.0026;
    put(this.upper,upper.map(p=>[p[0],p[1]+thickness,p[2]]),upper,.002);
    put(this.lower,lower,lower.map(p=>[p[0],p[1]-thickness*.7,p[2]]),.002);
    this.lower.visible=open;this.upper.visible=true;
    this.teeth.visible=open&&lip.labiodental>.05;
    const toothTop=upper.map(p=>[p[0]*.72,p[1]-.001,p[2]]);
    const toothBottom=toothTop.map(p=>[p[0],p[1]-.004*lip.labiodental,p[2]]);
    put(this.teeth,toothTop,toothBottom,.003);
    this.tongue.visible=open&&lip.jaw>.40&&round<.5;
    this.tongue.scale.set(width*.45,height*.115,.001);
    this.tongue.position.set(0,-height*.71,pucker+.002);
    return {jaw:lip.jaw,width:width*2,height,rounding:round,open};
  }
}
