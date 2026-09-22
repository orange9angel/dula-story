import * as THREE from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Four-digit cartoon hand: three main fingers plus a thumb. Local +X goes
// from wrist to fingertips, +Y toward the thumb, sign * Z toward the palm.
// The volume is meshed once; a real finger skeleton deforms its fixed topology.
const clamp=THREE.MathUtils.clamp;
const mix=THREE.MathUtils.lerp;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const V=(x,y,z=0)=>new THREE.Vector3(x,y,z);
const digits=[
  {name:'index',base:[.050,.024,0],angle:.075,lengths:[.031,.021,.015],radius:.0102},
  {name:'middle',base:[.055,0,0],angle:0,lengths:[.034,.023,.015],radius:.0107},
  {name:'little',base:[.046,-.024,0],angle:-.11,lengths:[.027,.019,.013],radius:.0093},
  {name:'thumb',base:[.012,.024,0],angle:.94,lengths:[.026,.021],radius:.0118},
];
const geometryCache=new Map();
const softMin=(a,b,k)=>{const h=clamp(.5+.5*(b-a)/k,0,1);return mix(b,a,h)-k*h*(1-h);};
function ellipsoid(x,y,z,c,r){
  const dx=(x-c[0])/r[0],dy=(y-c[1])/r[1],dz=(z-c[2])/r[2];
  return (Math.sqrt(dx*dx+dy*dy+dz*dz)-1)*Math.min(...r);
}
function capsule(x,y,z,a,b,r0,r1){
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
  const u=clamp(((x-a.x)*dx+(y-a.y)*dy+(z-a.z)*dz)/(dx*dx+dy*dy+dz*dz),0,1);
  return Math.hypot(x-a.x-dx*u,y-a.y-dy*u,z-a.z-dz*u)-mix(r0,r1,u);
}

function buildGeometry(chains,sign,material){
  const resolution=72,mc=new MarchingCubes(resolution,material,false,false,30000);
  mc.isolation=0;
  const minimum=V(-.038,-.057,-.045),extent=V(.204,.150,.09);
  const segments=[];
  for(const chain of chains)for(let i=0;i<chain.points.length-1;i++){
    const f=i/(chain.points.length-1),g=(i+1)/(chain.points.length-1);
    segments.push([chain.points[i],chain.points[i+1],chain.radius*(1-f*.28),chain.radius*(1-g*.28)]);
  }
  const field=(x,y,z)=>{
    let d=ellipsoid(x,y,z,[.025,0,0],[.037,.032,.0205]);
    d=softMin(d,ellipsoid(x,y,z,[.017,.023,sign*.003],[.024,.017,.019]),.006);
    // The wrist tapers into the palm instead of ending at a flat cuff.
    const wrist=ellipsoid(x,y,z,[-.012,0,0],[.024,.0208,.018]);
    d=softMin(d,wrist,.005);
    for(const [a,b,r0,r1] of segments)d=softMin(d,capsule(x,y,z,a,b,r0,r1),.0035);
    return -d;
  };
  for(let k=0;k<resolution;k++)for(let j=0;j<resolution;j++)for(let i=0;i<resolution;i++){
    mc.field[i+j*resolution+k*resolution*resolution]=field(
      minimum.x+extent.x*i/resolution,minimum.y+extent.y*j/resolution,minimum.z+extent.z*k/resolution);
  }
  mc.update();
  if(mc.count===0||mc.count>=90000)throw new Error('Hand isosurface buffer is invalid');
  const raw=new THREE.BufferGeometry(),positions=new Float32Array(mc.count*3);
  const src=mc.geometry.attributes.position;
  for(let i=0;i<mc.count;i++){
    positions[i*3]=minimum.x+extent.x*(src.getX(i)+1)/2;
    positions[i*3+1]=minimum.y+extent.y*(src.getY(i)+1)/2;
    positions[i*3+2]=minimum.z+extent.z*(src.getZ(i)+1)/2;
  }
  raw.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const g=mergeVertices(raw,1e-6);raw.dispose();mc.geometry.dispose();g.computeVertexNormals();
  const p=g.attributes.position,indices=[],weights=[],contour=[];
  for(let i=0;i<p.count;i++){
    const q=V(p.getX(i),p.getY(i),p.getZ(i));
    const influences=new Map();let total=0;
    for(const chain of chains){
      const delta=q.clone().sub(chain.points[0]),u=delta.dot(chain.axis);
      const lateral=delta.clone().addScaledVector(chain.axis,-u).length();
      // Overlapping, continuous influence fields avoid a hard ownership seam
      // between thumb webbing, finger bases and palm.
      const spread=mix(.016,.002,smooth(u/.030));
      const rootWeight=smooth((u+.010)/.030)*smooth((chain.radius+spread-lateral)/spread);
      if(rootWeight===0)continue;
      total+=rootWeight;
      let joint=0,acc=0;
      for(let k=1;k<chain.ids.length;k++){
        acc+=chain.lengths[k-1];
        if(u>acc-.009)joint=k;else break;
      }
      if(joint===0)influences.set(chain.ids[0],rootWeight);
      else{
        const boundary=chain.lengths.slice(0,joint).reduce((a,b)=>a+b,0);
        const w=smooth((u-boundary+.009)/.018);
        influences.set(chain.ids[joint-1],rootWeight*(1-w));influences.set(chain.ids[joint],rootWeight*w);
      }
    }
    influences.set(0,Math.max(0,1-total));
    const sorted=[...influences].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=sorted.reduce((s,a)=>s+a[1],0);
    const js=[0,0,0,0],ws=[0,0,0,0];
    sorted.forEach(([bone,weight],i)=>{js[i]=bone;ws[i]=weight/sum;});
    indices.push(...js);weights.push(...ws);
    // Finger contours need a finer line than the torso's silhouette.
    contour.push(.38*smooth((q.x+.025)/.025));
  }
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
  g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  g.setAttribute('contour',new THREE.Float32BufferAttribute(contour,1));
  g.computeBoundingSphere();return g;
}

export class ArticulatedHand extends THREE.Group {
  constructor(sign,material,outlineMaterial){
    super();this.sign=sign;this.name=sign>0?'right-hand-volume':'left-hand-volume';
    const palm=new THREE.Bone();palm.name='palm';this.add(palm);
    const bones=[palm];this.chains=[];
    for(const spec of digits){
      const axis=V(Math.cos(spec.angle),Math.sin(spec.angle)),points=[V(...spec.base)];
      const chain={...spec,axis,points,ids:[],bones:[]};let parent=palm;
      spec.lengths.forEach((length,i)=>{
        const bone=new THREE.Bone();bone.name=spec.name+'-'+i;
        if(i===0){bone.position.copy(points[0]);bone.rotation.z=spec.angle;}
        else bone.position.x=spec.lengths[i-1];
        parent.add(bone);chain.ids.push(bones.length);bones.push(bone);chain.bones.push(bone);parent=bone;
        points.push(points.at(-1).clone().addScaledVector(axis,length));
      });
      this.chains.push(chain);
    }
    this.updateMatrixWorld(true);
    this.skeleton=new THREE.Skeleton(bones);
    if(!geometryCache.has(sign))geometryCache.set(sign,buildGeometry(this.chains,sign,material));
    this.geometry=geometryCache.get(sign);
    this.surface=new THREE.SkinnedMesh(this.geometry,material);this.surface.name='continuous-palm-and-digits';
    this.surface.frustumCulled=false;this.surface.castShadow=true;this.add(this.surface);
    this.surface.bind(this.skeleton);
    this.outline=new THREE.SkinnedMesh(this.geometry,outlineMaterial);this.outline.frustumCulled=false;
    this.add(this.outline);this.outline.bind(this.skeleton,this.surface.bindMatrix);
    this.setGesture({});
  }
  setGesture({point=0,fist=0,open=0}={}){
    this.gesture={point,fist,open};
    for(const chain of this.chains){
      const thumb=chain.name==='thumb',index=chain.name==='index';
      const closed=Math.max(fist,index?0:point);
      let angles=thumb?[.18,.24]:[.10,.25,.17];
      if(open>0)angles=angles.map(v=>v*(1-open));
      if(index)angles=angles.map(v=>v*(1-point));
      const target=thumb?[.35,.65]:[1.36,1.60,.73];
      angles=angles.map((v,i)=>mix(v,target[i],closed));
      for(let i=0;i<chain.bones.length;i++){
        const bone=chain.bones[i];bone.rotation.set(0,-this.sign*angles[i],i===0?chain.angle:0,'ZYX');
      }
      if(thumb){
        chain.bones[0].rotation.z=mix(chain.angle,.63,Math.max(fist,point*.45));
        chain.bones[0].rotation.y=-this.sign*mix(angles[0],.52,fist);
      }
    }
  }
  stats(){
    const p=this.geometry.attributes.position,w=this.geometry.attributes.skinWeight;
    let maxWeightError=0;
    for(let i=0;i<w.count;i++)maxWeightError=Math.max(maxWeightError,Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1));
    return {vertices:p.count,triangles:this.geometry.index.count/3,bones:this.skeleton.bones.length,maxWeightError,gesture:this.gesture};
  }
  validateDeformation(){
    this.updateMatrixWorld(true);this.skeleton.update();
    const q=new THREE.Vector3();let maxRadius=0;
    for(let i=0;i<this.geometry.attributes.position.count;i++){
      this.surface.getVertexPosition(i,q);
      if(!Number.isFinite(q.x+q.y+q.z))throw new Error('Non-finite hand deformation');
      maxRadius=Math.max(maxRadius,q.length());
    }
    if(maxRadius>.25)throw new Error('Hand skinning escaped its local bounds');
    return {...this.stats(),maxRadius};
  }
  validatePointIsolation(){
    const chain=this.chains.find(c=>c.name==='index'),p=this.geometry.attributes.position,ids=[];
    for(let i=0;i<p.count;i++){
      const d=V(p.getX(i),p.getY(i),p.getZ(i)).sub(chain.points[0]),u=d.dot(chain.axis);
      if(u>chain.lengths[0]&&d.addScaledVector(chain.axis,-u).length()<chain.radius+.001)ids.push(i);
    }
    const sample=gesture=>{
      this.setGesture(gesture);this.updateMatrixWorld(true);this.skeleton.update();
      return ids.map(i=>this.surface.getVertexPosition(i,new THREE.Vector3()));
    };
    const open=sample({open:1}),point=sample({point:1});
    const maxIndexDrift=Math.max(...point.map((q,i)=>q.distanceTo(open[i])));
    if(!ids.length||maxIndexDrift>1e-5)throw new Error('Folded neighboring fingers pulled the pointing fingertip');
    return {vertices:ids.length,maxIndexDrift};
  }
}
