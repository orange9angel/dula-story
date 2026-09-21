import * as THREE from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {drawEye} from './character.js';

const C={ink:'#382d38',skin:'#ffe3d1',hair:'#644039',hairDark:'#4a3030',white:'#fff9ed',
  navy:'#35466f',navyDark:'#293452',red:'#d95863',shoe:'#684c45',sole:'#352f39'};
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
function faceTexture(point,blink){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const c=canvas.getContext('2d');c.fillStyle=C.skin;c.fillRect(0,0,1024,1024);
  c.translate(512,512);c.scale(1024/.7,-1024/.7);
  drawEye(c,-.106,.005,0,point,blink,true);drawEye(c,.103,.005,0,point,blink,false);
  c.lineCap='round';c.strokeStyle=C.hairDark;c.lineWidth=.007;
  for(const sign of [-1,1]){
    c.beginPath();c.moveTo(sign*.165,.126);c.quadraticCurveTo(sign*.123,.146-.03*point,sign*.064,.123-.033*point);c.stroke();
    c.fillStyle='#efafa5';c.beginPath();c.ellipse(sign*.177,-.10,.035,.013,0,0,Math.PI*2);c.fill();
  }
  c.strokeStyle='#985c64';c.lineWidth=.0045;c.beginPath();c.moveTo(-.031,-.153);
  c.quadraticCurveTo(.002,point>.35?-.144:-.184,.037,-.149);c.stroke();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;return texture;
}

function handGeometry(point,sign){
  const relaxed=1-point,index=.105+.044*point,low=.089*relaxed+.055*point,mid=.111*relaxed+.063*point;
  const g=shapeGeometry(s=>{
    s.moveTo(-.014,-.023);s.bezierCurveTo(.019,-.029,.037,-.031,.052,-.031);
    s.bezierCurveTo(low,-.042,low+.014,-.042,low+.014,-.030);
    s.bezierCurveTo(low+.015,-.018,.069,-.018,.057,-.016);
    s.bezierCurveTo(mid,-.024,mid+.014,-.021,mid+.014,-.009);
    s.bezierCurveTo(mid+.012,.001,.080,.002,.060,.003);
    s.bezierCurveTo(.081,.008,index,.004,index+.005,.018);
    s.bezierCurveTo(index+.006,.031,index-.017,.033,.062,.028);
    s.quadraticCurveTo(.048,.029,.041,.034);
    s.bezierCurveTo(.043,.052,.035,.069,.025,.065);
    s.bezierCurveTo(.013,.062,.018,.043,.004,.023);s.lineTo(-.014,.023);s.closePath();
  },.035);
  g.translate(0,0,-.0175);
  const contour=new Float32Array(g.attributes.position.count);
  for(let i=0;i<contour.length;i++)contour[i]=THREE.MathUtils.clamp((g.attributes.position.getX(i)+.012)/.032,0,1);
  g.setAttribute('contour',new THREE.BufferAttribute(contour,1));return g;
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
      const hand=mesh(this.mesh,handGeometry(0,sign),C.skin);hand.children[0].material=jointInk;this.hands[side]=hand;
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      mesh(shoe,shoeGeometry(),C.shoe);
      // Sole has a real flat underside; the ankle remains inside the shoe opening.
      const sole=mesh(shoe,shoeGeometry(),C.sole);sole.scale.y=.13;sole.position.y=-.08447;
      const strap=ellipsoid(shoe,[0,.023,-.003],[.054,.009,.034],'#98796b',false);
      strap.rotation.x=-.23;
    }
    mesh(this.body,ringsGeometry([[.797,.158,.10],[.85,.15,.106],[.98,.158,.113],[1.07,.178,.10],[1.10,.071,.061]]),C.white);
    ellipsoid(this.body,[0,1.12,0],[.055,.087,.049],C.skin);
    mesh(this.body,ringsGeometry([[.543,.257,.174],[.565,.25,.172],[.70,.196,.137],[.802,.165,.111]],{pleats:.028}),C.navy);
    mesh(this.body,ringsGeometry([[.560,.254,.177],[.568,.252,.176]],{pleats:.028}),'#7382a2',false);
    panel(this.body,s=>{s.moveTo(-.172,1.077);s.lineTo(-.065,1.099);s.lineTo(0,1.017);s.lineTo(.065,1.099);s.lineTo(.172,1.077);s.quadraticCurveTo(.09,.996,0,.966);s.quadraticCurveTo(-.10,1.003,-.172,1.077);},C.navy,.107);
    panel(this.body,s=>{s.moveTo(-.018,1.013);s.quadraticCurveTo(-.067,1.023,-.086,.980);s.lineTo(-.027,.951);s.lineTo(0,.987);s.lineTo(.027,.951);s.lineTo(.086,.980);s.quadraticCurveTo(.067,1.023,.018,1.013);s.closePath();},C.red,.132);
    panel(this.body,s=>{s.moveTo(-.015,.991);s.lineTo(-.035,.924);s.lineTo(0,.900);s.lineTo(.035,.924);s.lineTo(.015,.991);s.closePath();},C.red,.13);
    const back=panel(this.body,s=>{s.moveTo(-.151,1.075);s.lineTo(.151,1.075);s.lineTo(.136,1.003);s.lineTo(-.136,1.003);s.closePath();},C.navy,-.117);
    back.material.side=THREE.DoubleSide;
    this.head=new THREE.Group();this.head.position.y=1.325;this.body.add(this.head);
    this.faceMat=new THREE.MeshBasicMaterial({map:faceTexture(0,0)});
    const profile=[];
    const guides=[[-.27,.009,.025],[-.25,.084,.10],[-.20,.18,.163],[-.13,.244,.202],[-.04,.275,.226],[.07,.278,.227],[.16,.247,.202],[.24,.18,.15],[.285,.09,.078],[.30,.001,.001]];
    for(let i=0;i<guides.length-1;i++)for(let k=0;k<4;k++)profile.push(guides[i].map((v,j)=>THREE.MathUtils.lerp(v,guides[i+1][j],k/4)));
    profile.push(guides.at(-1));mesh(this.head,ringsGeometry(profile,{faceUV:true}),this.faceMat);
    for(const sign of [-1,1])ellipsoid(this.head,[sign*.266,-.065,-.003],[.037,.053,.04],C.skin);
    ellipsoid(this.head,[0,-.088,.216],[.010,.017,.019],C.skin,false);
    // The cap has a high front hairline and low nape, so it cannot cover the face.
    const hp=[],hi=[],N=80,R=24;
    for(let i=0;i<=R;i++)for(let j=0;j<=N;j++){
      const a=j/N*Math.PI*2,front=Math.cos(a),edge=front>0?-.12+.32*front**2:-.205;
      const latitude=i/R*Math.acos(edge/.338);
      hp.push(.313*Math.sin(latitude)*Math.sin(a),.338*Math.cos(latitude),-.016+.264*Math.sin(latitude)*front);
      if(i<R&&j<N){const k=i*(N+1)+j;hi.push(k,k+N+1,k+1,k+1,k+N+1,k+N+2);}
    }
    const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.Float32BufferAttribute(hp,3));hg.setIndex(hi);hg.computeVertexNormals();mesh(this.head,hg,C.hair);
    const flatBangs=shapeGeometry(s=>{
      s.moveTo(-.277,.044);s.bezierCurveTo(-.325,.186,-.245,.335,-.093,.337);
      s.quadraticCurveTo(.093,.377,.212,.289);s.quadraticCurveTo(.283,.230,.269,.084);
      s.quadraticCurveTo(.244,.113,.222,.151);s.quadraticCurveTo(.218,.093,.192,.073);
      s.quadraticCurveTo(.172,.152,.135,.177);s.quadraticCurveTo(.125,.115,.091,.088);
      s.quadraticCurveTo(.083,.184,.019,.220);s.quadraticCurveTo(.029,.169,-.010,.125);
      s.quadraticCurveTo(-.043,.158,-.066,.221);s.quadraticCurveTo(-.115,.157,-.193,.142);
      s.quadraticCurveTo(-.207,.076,-.226,-.051);s.lineTo(-.266,-.084);s.quadraticCurveTo(-.285,-.012,-.277,.044);
    },.009);
    const bangs=new TessellateModifier(.024,7).modify(flatBangs);flatBangs.dispose();
    const bp=bangs.attributes.position;
    for(let i=0;i<bp.count;i++){
      const x=bp.getX(i),y=bp.getY(i);
      bp.setZ(i,bp.getZ(i)-.009+.265*Math.sqrt(Math.max(0,1-(x/.313)**2-(y/.338)**2)));
    }
    // Weld the subdivided patch before normals: no triangle-by-triangle shading.
    bangs.deleteAttribute('normal');bangs.deleteAttribute('uv');
    const smoothBangs=mergeVertices(bangs,1e-5);bangs.dispose();smoothBangs.computeVertexNormals();
    mesh(this.head,smoothBangs,C.hair);
    this.tails=[];
    for(const sign of [-1,1]){
      const tail=new LimbSurface(this.head,C.hairDark,[[0,.053],[.20,.080],[.56,.066],[.85,.043],[1,.003]],{depth:.85});
      this.tails.push({sign,tail});
      const band=ellipsoid(this.head,[sign*.282,.145,-.045],[.056,.033,.055],C.red);band.rotation.z=sign*.25;
    }
    this.lastFace='';this.lastHand=-1;
  }
  setPose(p){
    this.mesh.position.x=p.rootX;this.mesh.rotation.y=p.yaw;this.body.position.y=p.bob;
    this.head.rotation.z=p.point*.023-p.anticipation*.025;
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.sleeves[side].update(arm);
      this.limbs[side+'Leg'].update(leg);this.socks[side].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const y=new THREE.Vector3(x.y*sign,-x.x*sign,0).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      // A slight forearm roll keeps the relaxed palm readable from front and side.
      hand.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),sign*.55*(side==='right'?1-p.point:1)));
      hand.position.copy(V(arm[2]));this.feet[side].position.copy(V(leg[2]));
    }
    if(this.lastHand!==p.point){
      const h=this.hands.right,g=handGeometry(p.point,1);h.geometry.dispose();h.geometry=g;h.children[0].geometry=g;this.lastHand=p.point;
    }
    const faceKey=`${p.point.toFixed(2)}/${p.blink.toFixed(2)}`;
    if(faceKey!==this.lastFace){this.faceMat.map.dispose();this.faceMat.map=faceTexture(p.point,p.blink);this.lastFace=faceKey;}
    for(const {sign,tail} of this.tails){
      const swing=Math.sin(p.t*4)*.010;
      tail.update([{x:sign*.285,y:.15,z:-.06},{x:sign*(.363+swing),y:-.06,z:-.07},{x:sign*(.335+swing),y:-.365,z:-.10}]);
    }
    this.mesh.updateMatrixWorld(true);
  }
}
