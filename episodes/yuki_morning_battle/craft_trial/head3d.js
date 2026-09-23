import * as THREE from 'three';
import {drawEye} from './character.js';

const mix=THREE.MathUtils.lerp,clamp=THREE.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const gaussian=(x,y,cx,cy,wx,wy)=>Math.exp(-(((x-cx)/wx)**2+((y-cy)/wy)**2));
function geometry(pos,index,uv){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  if(uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(index);g.computeVertexNormals();return g;
}
function strip(index,a,b){index.push(a,a+1,b,a+1,b+1,b);}
function interpolate(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}

function faceGeometry(){
  // y, width, front, back. The chin sits forward of the neck rather than
  // collapsing all jaw rings to the same central point.
  const guides=[[-.250,.008,.112,.099],[-.238,.065,.145,.057],[-.211,.139,.181,-.020],
    [-.163,.209,.211,-.117],[-.092,.260,.229,-.184],[.015,.278,.234,-.225],
    [.100,.272,.217,-.228],[.180,.238,.183,-.211],[.250,.172,.121,-.168],
    [.300,.075,.036,-.083],[.313,.001,-.019,-.021]];
  const profiles=[];
  for(let k=0;k<guides.length-1;k++)for(let i=0;i<8;i++)profiles.push(guides[k].map((_,j)=>
    interpolate(guides[Math.max(0,k-1)][j],guides[k][j],guides[k+1][j],guides[Math.min(guides.length-1,k+2)][j],i/8)));
  profiles.push(guides.at(-1));
  const pos=[],uv=[],idx=[],sides=128;
  profiles.forEach(([y,rx,zf,zb],row)=>{
    for(let col=0;col<=sides;col++){
      const a=col/sides*Math.PI*2,f=Math.cos(a),x=rx*Math.sin(a);
      let z=(zf+zb)/2+(zf-zb)/2*(f>0?f**.72:f);
      if(f>0){
        z+=.026*gaussian(x,y,0,-.084,.025,.024);
        z+=.006*gaussian(x,y,0,-.041,.019,.047);
        z+=.006*gaussian(x,y,0,-.154,.065,.019);
      }
      pos.push(x,y,z);uv.push(f<0?.015:.5+x/.70,f<0?.985:.5+y/.70);
      if(row<profiles.length-1&&col<sides)strip(idx,row*(sides+1)+col,(row+1)*(sides+1)+col);
    }
  });
  return geometry(pos,idx,uv);
}

function eyeWithLid(c,C,x,point,blink,far){
  if(blink<.001){drawEye(c,x,.005,0,point,0,far);return;}
  // The eyelid crops a fixed iris; it never squashes the iris into a slit.
  c.save();c.translate(x,.005);c.scale(far?.98:1,1);
  const a=mix(.010,-.006,blink),b=mix(.032,.004,blink),top=mix(.089-point*.008,-.023,blink);
  if(blink<.98){
    const bottom=mix(-.062,-.024,blink),aperture=new Path2D();
    aperture.moveTo(-.053,a);aperture.bezierCurveTo(-.047,top,.024,top,.052,b);
    aperture.bezierCurveTo(.066,bottom,.034,bottom,-.007,bottom);aperture.quadraticCurveTo(-.050,bottom,-.053,a);
    c.save();c.clip(aperture);drawEye(c,0,0,0,point,0,false);c.restore();
  }
  c.strokeStyle=C.ink;c.lineWidth=.007;c.lineCap='round';c.beginPath();
  c.moveTo(-.059,a+.002);c.bezierCurveTo(-.042,top,.025,top,.057,b+.003);c.stroke();
  c.lineWidth=.004;c.beginPath();c.moveTo(-.051,a+.002);c.lineTo(-.064,a+.014);c.stroke();c.restore();
}

function faceTexture(C,point,blink){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const c=canvas.getContext('2d');c.fillStyle=C.skin;c.fillRect(0,0,1024,1024);
  c.translate(512,512);c.scale(1024/.7,-1024/.7);
  eyeWithLid(c,C,-.106,point,blink,true);eyeWithLid(c,C,.103,point,blink,false);
  c.lineCap='round';c.strokeStyle=C.hairDark;c.lineWidth=.007;
  for(const sign of [-1,1]){
    c.beginPath();c.moveTo(sign*.165,.126);c.quadraticCurveTo(sign*.123,.146-.03*point,sign*.064,.123-.033*point);c.stroke();
    c.fillStyle='#efafa5';c.beginPath();c.ellipse(sign*.177,-.10,.034,.012,0,0,Math.PI*2);c.fill();
  }
  c.strokeStyle='#d69d8b';c.lineWidth=.0026;
  c.beginPath();c.moveTo(.005,-.082);c.quadraticCurveTo(.012,-.092,.003,-.095);c.stroke();
  c.strokeStyle='#985c64';c.lineWidth=.0045;c.beginPath();c.moveTo(-.031,-.153);
  c.quadraticCurveTo(.002,point>.35?-.144:-.179,.037,-.149);c.stroke();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;return texture;
}

function hairGeometry(){
  // One rounded shell contains both crown and fringe. Every fringe point is
  // on the scalp surface: projecting a flat polygon outside the ellipsoid
  // previously created a vertical fin on the crown in profile views.
  const hem=[[-180,-.194],[-125,-.185],[-100,-.10],[-84,-.025],[-73,-.105],
    [-61,-.12],[-49,.102],[-34,.183],[-17,.112],[-6,.199],[12,.080],
    [26,.183],[40,.067],[51,.143],[63,.055],[76,-.105],[87,-.033],[102,-.115],[130,-.196],[180,-.194]];
  const edge=a=>{
    for(let i=1;i<hem.length;i++)if(a<=hem[i][0]){
      const u=(a-hem[i-1][0])/(hem[i][0]-hem[i-1][0]);
      return mix(hem[i-1][1],hem[i][1],smooth(u));
    }return hem.at(-1)[1];
  };
  const N=192,R=44,pos=[],idx=[];
  for(let layer=0;layer<2;layer++)for(let row=0;row<=R;row++)for(let col=0;col<=N;col++){
    const a=-Math.PI+col/N*2*Math.PI,t=row/R,lat=t*Math.acos(edge(a*180/Math.PI)/.335);
    const thickness=layer*.010,ry=.335-thickness,rx=.312-thickness,rz=.275-thickness;
    const front=Math.cos(a);
    pos.push(rx*Math.sin(lat)*Math.sin(a),ry*Math.cos(lat),-.021+rz*Math.sin(lat)*(front>0?front**.68:front));
    if(row<R&&col<N){
      const k=layer*(R+1)*(N+1)+row*(N+1)+col,b=k+N+1;
      if(layer===0)idx.push(k,b,k+1,k+1,b,b+1);else strip(idx,k,b);
    }
  }
  const offset=(R+1)*(N+1);
  for(let col=0;col<N;col++){
    const k=R*(N+1)+col,b=k+offset;idx.push(k,k+1,b,k+1,b+1,b);
  }
  return geometry(pos,idx);
}

class HairTail {
  constructor(parent,sign,mesh,color){
    this.sign=sign;this.rows=56;this.sides=24;
    const pos=new Float32Array((this.rows+1)*(this.sides+1)*3),idx=[];
    for(let i=0;i<this.rows;i++)for(let j=0;j<this.sides;j++)strip(idx,i*(this.sides+1)+j,(i+1)*(this.sides+1)+j);
    this.geometry=geometry(pos,idx);this.mesh=mesh(parent,this.geometry,color);
    this.mesh.frustumCulled=false;this.mesh.children[0].frustumCulled=false;this.update(0);
  }
  update(t){
    const sign=this.sign,swing=Math.sin(t*4)*.009;
    const curve=new THREE.CatmullRomCurve3([
      V(sign*.285,.127,-.077),V(sign*.351,.064,-.087),V(sign*(.365+swing*.4),-.091,-.091),
      V(sign*(.355+swing),-.239,-.070),V(sign*(.317+swing*1.3),-.377,-.041)]);
    const widths=[[0,.037],[.17,.073],[.43,.068],[.70,.047],[.90,.024],[1,.001]];
    const p=this.geometry.attributes.position;
    for(let i=0;i<=this.rows;i++){
      const u=i/this.rows,center=curve.getPoint(u),axis=curve.getTangent(u),x=V(0,0,1).cross(axis).normalize(),z=axis.clone().cross(x);
      let radius=.001;
      for(let k=1;k<widths.length;k++)if(u<=widths[k][0]){
        radius=mix(widths[k-1][1],widths[k][1],smooth((u-widths[k-1][0])/(widths[k][0]-widths[k-1][0])));break;
      }
      for(let j=0;j<=this.sides;j++){
        const a=j/this.sides*Math.PI*2,r=radius*(1+.045*Math.cos(3*a)*Math.sin(Math.PI*u));
        const q=center.clone().addScaledVector(x,r*Math.cos(a)).addScaledVector(z,r*.77*Math.sin(a));
        p.setXYZ(i*(this.sides+1)+j,q.x,q.y,q.z);
      }
    }
    p.needsUpdate=true;this.geometry.computeVertexNormals();this.geometry.computeBoundingSphere();
  }
}

export class HeadAssembly extends THREE.Group {
  constructor({mesh,ellipsoid,C}){
    super();this.C=C;this.name='neck-and-head';
    this.neckRig=new THREE.Group();this.neckRig.position.set(0,1.16,-.022);this.add(this.neckRig);
    this.head=new THREE.Group();this.head.position.set(0,.24,.022);this.neckRig.add(this.head);
    this.faceMat=new THREE.MeshBasicMaterial({map:faceTexture(C,0,0)});
    mesh(this.head,faceGeometry(),this.faceMat);
    for(const sign of [-1,1]){
      ellipsoid(this.head,[sign*.266,-.071,-.025],[.033,.052,.028],C.skin);
      ellipsoid(this.head,[sign*.287,-.072,-.004],[.010,.027,.012],'#e5b6a6',false);
    }
    mesh(this.head,hairGeometry(),C.hair);
    this.tails=[];
    for(const sign of [-1,1]){
      this.tails.push(new HairTail(this.head,sign,mesh,C.hairDark));
      const band=ellipsoid(this.head,[sign*.282,.136,-.072],[.048,.028,.044],C.red);band.rotation.z=sign*.28;
    }
    const idx=[],N=48,R=24;
    for(let i=0;i<R;i++)for(let j=0;j<N;j++)strip(idx,i*(N+1)+j,(i+1)*(N+1)+j);
    this.neckGeometry=geometry(new Float32Array((R+1)*(N+1)*3),idx);
    this.neck=mesh(this,this.neckGeometry,C.skin);this.neck.frustumCulled=false;this.neck.children[0].frustumCulled=false;
    this.lastFace='';this.setPose({point:0,anticipation:0,blink:0,t:0});
  }
  setPose(p){
    this.neckRig.rotation.set(p.headPitch??p.anticipation*.045,p.headYaw??p.point*.08,p.headRoll??(p.point*.023-p.anticipation*.025),'YXZ');
    const top=V(0,.097,0).applyQuaternion(this.neckRig.quaternion).add(this.neckRig.position);
    const bottom=V(0,1.073,-.023),middle=V(0,1.153,-.026),N=48,R=24,pos=this.neckGeometry.attributes.position;
    for(let row=0;row<=R;row++){
      const u=row/R,center=bottom.clone().multiplyScalar((1-u)**2).addScaledVector(middle,2*u*(1-u)).addScaledVector(top,u*u);
      const rx=u<.4?mix(.072,.047,smooth(u/.4)):mix(.047,.055,smooth((u-.4)/.6));
      const rz=rx*.82,q=new THREE.Quaternion().slerp(this.neckRig.quaternion,smooth(u));
      for(let col=0;col<=N;col++){
        const a=col/N*Math.PI*2,point=V(rx*Math.sin(a),0,rz*Math.cos(a)).applyQuaternion(q).add(center);
        pos.setXYZ(row*(N+1)+col,point.x,point.y,point.z);
      }
    }
    pos.needsUpdate=true;this.neckGeometry.computeVertexNormals();this.neckGeometry.computeBoundingSphere();
    const key=`${p.point.toFixed(2)}/${p.blink.toFixed(2)}`;
    if(key!==this.lastFace){this.faceMat.map.dispose();this.faceMat.map=faceTexture(this.C,p.point,p.blink);this.lastFace=key;}
    for(const tail of this.tails)tail.update(p.t);
  }
  validate(){
    this.updateWorldMatrix(true,true);let meshes=0,vertices=0;
    this.traverse(o=>{
      if(!o.matrixWorld.elements.every(Number.isFinite))throw new Error('Non-finite head world transform');
      if(!o.isMesh)return;meshes++;
      const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;
      for(let i=0;i<p.count;i++){
        if(!Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)))throw new Error('Non-finite head surface');
      }
      vertices+=p.count;
    });
    const bounds=new THREE.Box3().setFromObject(this.head),size=bounds.getSize(new THREE.Vector3());
    if(size.length()<.5||size.length()>1.5)throw new Error('Head bounds outside inspection range');
    return {meshes,vertices,size:size.toArray(),rotation:this.neckRig.rotation.toArray().slice(0,3)};
  }
}
