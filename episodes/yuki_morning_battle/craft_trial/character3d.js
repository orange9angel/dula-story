import * as THREE from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {HeadAssembly} from './head3d.js';
import {ArticulatedHand} from './hand3d.js';

const C={ink:'#382d38',skin:'#ffe3d1',hair:'#644039',hairDark:'#4a3030',white:'#fff9ed',
  navy:'#35466f',navyDark:'#293452',red:'#d95863',shoe:'#684c45',sole:'#352f39'};
// Named building blocks reused by the E08 episode variant; Yuki stays unchanged.
export {LimbSurface,ringsGeometry,shoeGeometry,mesh,ellipsoid,mat,jointInk};
const V=p=>new THREE.Vector3(p.x,p.y,p.z??0);
const ramp=new THREE.DataTexture(new Uint8Array([150,227,255]),3,1,THREE.RedFormat);
ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
const materials=new Map();
function mat(color){
  if(!materials.has(color))materials.set(color,new THREE.MeshToonMaterial({color,gradientMap:ramp,emissive:color,emissiveIntensity:.14}));
  return materials.get(color);
}
const ink=new THREE.MeshBasicMaterial({color:C.ink,side:THREE.BackSide});
ink.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\ntransformed += normalize(normal) * 0.003;');
};
ink.customProgramCacheKey=()=> 'craft-contour-v1';
const jointInk=ink.clone();
jointInk.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float contour;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\ntransformed += normalize(normal) * (0.003 * contour);');
};
jointInk.customProgramCacheKey=()=> 'craft-open-joint-contour-v1';

function mesh(parent,geometry,material,outline=true){
  const m=new THREE.Mesh(geometry,typeof material==='string'?mat(material):material);
  m.castShadow=true;m.receiveShadow=false;parent.add(m);
  if(outline){const edge=new THREE.Mesh(geometry,ink);edge.castShadow=false;m.add(edge);}
  return m;
}
function ellipsoid(parent,center,radii,color,outline=true){
  const g=new THREE.SphereGeometry(1,40,28);g.scale(...radii);
  const m=mesh(parent,g,color,outline);m.position.set(...center);return m;
}
function shapeGeometry(d,depth=.008){
  // SVGLoader is unnecessary here: these few editable contours are explicit.
  const s=new THREE.Shape();d(s);
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.0025,
    bevelSize:.0025,bevelSegments:2,steps:1,curveSegments:12});
  g.computeVertexNormals();return g;
}
function panel(parent,draw,color,z){const m=mesh(parent,shapeGeometry(draw),color);m.position.z=z;return m;}
const shirtProfile=[[.797,.158,.10],[.85,.15,.106],[.98,.158,.113],[1.07,.178,.10],[1.10,.071,.061]];
function collarPanel(parent,draw,front=true){
  const raw=shapeGeometry(draw),g=new TessellateModifier(.015,6).modify(raw);raw.dispose();
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i);let rx=.071,rz=.061;
    for(let k=1;k<shirtProfile.length;k++)if(y<=shirtProfile[k][0]){
      const a=shirtProfile[k-1],b=shirtProfile[k],u=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
      rx=THREE.MathUtils.lerp(a[1],b[1],u);rz=THREE.MathUtils.lerp(a[2],b[2],u);break;
    }
    p.setZ(i,(front?1:-1)*(rz*Math.sqrt(Math.max(0,1-(x/rx)**2))+.009+p.getZ(i)));
  }
  // Mirroring the back panel reverses winding; keep its outer face outward.
  if(!front){
    for(let i=0;i<p.count;i+=3){
      const v=new THREE.Vector3().fromBufferAttribute(p,i);
      p.setXYZ(i,p.getX(i+2),p.getY(i+2),p.getZ(i+2));p.setXYZ(i+2,v.x,v.y,v.z);
    }
  }
  g.deleteAttribute('normal');g.deleteAttribute('uv');const joined=mergeVertices(g,1e-5);g.dispose();joined.computeVertexNormals();
  return mesh(parent,joined,C.navy);
}

// Connected rings, shared vertices and one silhouette. Upper/lower axes remain
// straight except for a short rounded elbow/knee transition (not a global spline).
class LimbSurface {
  constructor(parent,color,radii,{start=0,end=1,depth=.9}={}){
    this.radii=radii;this.start=start;this.end=end;this.depth=depth;
    this.rings=48;this.sides=24;
    const n=(this.rings+1)*this.sides,g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));
    const contour=new Float32Array(n);
    for(let i=0;i<=this.rings;i++)for(let j=0;j<this.sides;j++)contour[i*this.sides+j]=Math.min(1,i/2,(this.rings-i)/2);
    g.setAttribute('contour',new THREE.BufferAttribute(contour,1));
    const index=[];
    for(let i=0;i<this.rings;i++)for(let j=0;j<this.sides;j++){
      const a=i*this.sides+j,b=(i+1)*this.sides+j,c=i*this.sides+(j+1)%this.sides,d=(i+1)*this.sides+(j+1)%this.sides;
      index.push(a,c,b,c,d,b);
    }
    // End caps are concealed under shoulder/hip, hand and shoe overlaps.
    for(let j=1;j<this.sides-1;j++)index.push(0,j+1,j,n-this.sides,n-this.sides+j,n-this.sides+j+1);
    g.setIndex(index);this.geometry=g;this.mesh=mesh(parent,g,color);
    this.mesh.children[0].material=jointInk;
    this.mesh.frustumCulled=false;this.mesh.children[0].frustumCulled=false;
  }
  radius(t){
    const a=this.radii;
    for(let i=1;i<a.length;i++)if(t<=a[i][0]){
      const u=(t-a[i-1][0])/(a[i][0]-a[i-1][0]);
      const s=u*u*(3-2*u);return THREE.MathUtils.lerp(a[i-1][1],a[i][1],s);
    }return a.at(-1)[1];
  }
  update(points){
    const [a,b,c]=points.map(V),ab=b.clone().sub(a),bc=c.clone().sub(b);
    const l1=ab.length(),l2=bc.length(),total=l1+l2,blend=Math.min(l1,l2)*.12;
    ab.normalize();bc.normalize();
    const entry=b.clone().addScaledVector(ab,-blend),exit=b.clone().addScaledVector(bc,blend);
    const center=u=>{
      const d=u*total;
      if(d<l1-blend)return a.clone().addScaledVector(ab,d);
      if(d>l1+blend)return b.clone().addScaledVector(bc,d-l1);
      const s=(d-l1+blend)/(2*blend);
      return entry.clone().multiplyScalar((1-s)**2).addScaledVector(b,2*s*(1-s)).addScaledVector(exit,s*s);
    };
    const p=this.geometry.attributes.position;
    for(let i=0;i<=this.rings;i++){
      const u=THREE.MathUtils.lerp(this.start,this.end,i/this.rings),o=center(u);
      const axis=center(Math.min(1,u+.0005)).sub(center(Math.max(0,u-.0005))).normalize();
      const ref=Math.abs(axis.z)>.95?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1);
      const x=ref.cross(axis).normalize(),z=axis.clone().cross(x).normalize(),r=this.radius(u);
      for(let j=0;j<this.sides;j++){
        const theta=j/this.sides*Math.PI*2;
        const q=o.clone().addScaledVector(x,r*Math.cos(theta)).addScaledVector(z,r*this.depth*Math.sin(theta));
        p.setXYZ(i*this.sides+j,q.x,q.y,q.z);
      }
    }
    p.needsUpdate=true;this.geometry.computeVertexNormals();this.geometry.computeBoundingSphere();
  }
}

function ringsGeometry(levels,{pleats=0,faceUV=false}={}){
  const sides=80,pos=[],uv=[],index=[];
  levels.forEach(([y,rx,rz,zc=0],i)=>{
    for(let j=0;j<=sides;j++){
      const theta=j/sides*Math.PI*2,x=rx*Math.sin(theta),front=Math.cos(theta);
      const mod=1+pleats*Math.cos(theta*10),z=zc+rz*front*mod;
      pos.push(x*mod,y,z);
      uv.push(faceUV&&front<0?.015:.5+x/.70,faceUV&&front<0?.985:.5+y/.70);
      if(i<levels.length-1&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;index.push(a,a+1,b,a+1,b+1,b);}
    }
  });
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
}
function shoeGeometry(){
  const pos=[],idx=[],rows=[[-.073,.001,-.048],[-.062,.043,.028],[-.04,.053,.043],
    [0,.056,.037],[.045,.063,.007],[.10,.057,-.017],[.137,.036,-.035],[.150,.001,-.055]];
  const n=32,bottom=-.081;
  rows.forEach(([z,w,top],i)=>{
    for(let j=0;j<n;j++){
      const a=j/n*Math.PI*2;pos.push(w*Math.sin(a),bottom+(top-bottom)*(Math.cos(a)+1)/2,z);
      if(i<rows.length-1){const k=i*n+j,l=i*n+(j+1)%n;idx.push(k,k+n,l,l,k+n,l+n);}
    }
  });
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

export class YukiCraft3D {
  constructor(){
    this.mesh=new THREE.Group();this.mesh.name='YukiCraft3D-episode-study';
    this.body=new THREE.Group();this.mesh.add(this.body);
    this.limbs={};this.socks={};this.sleeves={};this.hands={};this.feet={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,C.skin,[[0,.067],[.25,.058],[.51,.039],[.67,.046],[.82,.037],[1,.027]],{depth:.92});
      this.socks[side]=new LimbSurface(this.mesh,C.white,[[0,.04],[.77,.041],[1,.03]],{start:.77});
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,C.skin,[[0,.046],[.23,.044],[.51,.031],[.68,.035],[1,.022]],{depth:.85});
      this.sleeves[side]=new LimbSurface(this.mesh,C.white,[[0,.064],[.12,.064],[.28,.052],[1,.04]],{end:.28});
      const hand=new ArticulatedHand(sign,mat(C.skin),jointInk);this.mesh.add(hand);this.hands[side]=hand;
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      mesh(shoe,shoeGeometry(),C.shoe);
      // Sole has a real flat underside; the ankle remains inside the shoe opening.
      const sole=mesh(shoe,shoeGeometry(),C.sole);sole.scale.y=.13;sole.position.y=-.08447;
      const strap=ellipsoid(shoe,[0,.023,-.003],[.054,.009,.034],'#98796b',false);
      strap.rotation.x=-.23;
    }
    mesh(this.body,ringsGeometry(shirtProfile),C.white);
    mesh(this.body,ringsGeometry([[.543,.257,.174],[.565,.25,.172],[.70,.196,.137],[.802,.165,.111]],{pleats:.028}),C.navy);
    mesh(this.body,ringsGeometry([[.560,.254,.177],[.568,.252,.176]],{pleats:.028}),'#7382a2',false);
    collarPanel(this.body,s=>{s.moveTo(-.151,1.067);s.lineTo(-.055,1.095);s.lineTo(0,1.017);s.lineTo(.055,1.095);s.lineTo(.151,1.067);s.quadraticCurveTo(.09,.996,0,.966);s.quadraticCurveTo(-.10,1.003,-.151,1.067);});
    panel(this.body,s=>{s.moveTo(-.018,1.013);s.quadraticCurveTo(-.067,1.023,-.086,.980);s.lineTo(-.027,.951);s.lineTo(0,.987);s.lineTo(.027,.951);s.lineTo(.086,.980);s.quadraticCurveTo(.067,1.023,.018,1.013);s.closePath();},C.red,.132);
    panel(this.body,s=>{s.moveTo(-.015,.991);s.lineTo(-.035,.924);s.lineTo(0,.900);s.lineTo(.035,.924);s.lineTo(.015,.991);s.closePath();},C.red,.13);
    collarPanel(this.body,s=>{s.moveTo(-.151,1.068);s.lineTo(.151,1.068);s.lineTo(.136,1.003);s.lineTo(-.136,1.003);s.closePath();},false);
    this.headAssembly=new HeadAssembly({mesh,ellipsoid,C});this.body.add(this.headAssembly);
  }
  setPose(p){
    this.mesh.position.x=p.rootX;this.mesh.rotation.y=p.yaw;this.body.position.y=p.bob;
    this.headAssembly.setPose(p);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.sleeves[side].update(arm);
      this.limbs[side+'Leg'].update(leg);this.socks[side].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      // Rest: palms toward thighs, thumbs forward. Point: roll forearm so the
      // thumb faces upward and the folded fingers occupy real depth.
      const point=side==='right'?p.point:0;
      const roll=THREE.MathUtils.lerp(-sign*.35,-Math.PI/2,point);
      hand.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),roll));
      hand.setGesture({point});
      hand.position.copy(V(arm[2]));this.feet[side].position.copy(V(leg[2]));
    }
    this.mesh.updateMatrixWorld(true);
  }
}
