import * as THREE from 'three';
// Face and neck surface adapted from the approved Yuki craft; E08 identity below.

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

function faceGeometry(style){
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
      const teen=style==='short';
      pos.push(x*(teen?1-.08*gaussian(0,y,0,-.11,1,.13):1),y*(teen&&y<0?1.11:1),z);uv.push(f<0?.015:.5+x/.70,f<0?.985:.5+y/.70);
      if(row<profiles.length-1&&col<sides)strip(idx,row*(sides+1)+col,(row+1)*(sides+1)+col);
    }
  });
  return geometry(pos,idx,uv);
}

function faceTexture(C,mouth=0,blink=0,emotion='calm'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d');c.fillStyle=C.skin;c.fillRect(0,0,512,512);
  c.translate(256,256);c.scale(512/.7,-512/.7);c.lineCap='round';
  const alarm=emotion==='alarmed',sad=emotion==='regret',happy=emotion==='happy';
  for(const sign of [-1,1]){
    c.save();c.translate(sign*.105,.006);
    if(C.style==='short')c.scale(1.06,.57);
    const lid=.077*(1-blink),bottom=-.051;
    if(blink<.95){
      c.save();c.beginPath();
      if(C.style==='short'){c.moveTo(-.051,.006);c.bezierCurveTo(-.032,lid+.005,.022,lid+.012,.051,.008);c.bezierCurveTo(.030,-.035,-.031,-.033,-.051,.006);}
      else c.ellipse(0,(lid+bottom)/2,.049,(lid-bottom)/2,0,0,Math.PI*2);
      c.clip();
      c.fillStyle='#fffdf0';c.fillRect(-.06,-.065,.12,.17);
      c.fillStyle=C.iris;c.beginPath();c.ellipse(0,.007,.024,.043,0,0,Math.PI*2);c.fill();
      c.fillStyle='#263445';c.beginPath();c.ellipse(0,.009,.011,.026,0,0,Math.PI*2);c.fill();
      c.fillStyle='#fffdf2';c.beginPath();c.ellipse(-.008,.028,.008,.011,0,0,Math.PI*2);c.fill();c.restore();
    }
    c.strokeStyle=C.ink;c.lineWidth=C.style==='bob'?.0055:.0045;c.beginPath();
    if(blink>.95){c.moveTo(-.047,-.020);c.quadraticCurveTo(0,-.038,.047,-.020);}
    else{c.moveTo(-.049,.008);c.bezierCurveTo(-.039,lid+(C.style==='short'?.003:.024),.037,lid+(C.style==='short'?.009:.024),.049,.012);}
    c.stroke();c.restore();
    c.strokeStyle=C.hairDark;c.lineWidth=.0055;c.beginPath();
    const brow=C.style==='short'?-.041:0;
    c.moveTo(sign*.16,.120+brow+(alarm?.025:0));c.quadraticCurveTo(sign*.112,.137+brow+(sad?.012:0),sign*.065,.124+brow+(sad?.025:0));c.stroke();
    if(C.style==='bob'){c.fillStyle='#edb3a7';c.beginPath();c.ellipse(sign*.174,-.094,.028,.010,0,0,Math.PI*2);c.fill();}
  }
  c.strokeStyle='#cb9789';c.lineWidth=.0025;c.beginPath();c.moveTo(.005,-.081);c.quadraticCurveTo(.012,-.094,.002,-.096);c.stroke();
  if(mouth>0){
    c.fillStyle='#633f48';c.beginPath();c.ellipse(0,-.157,mouth===2?.032:.028,mouth===2?.032:.013,0,0,Math.PI*2);c.fill();
    if(mouth===2){c.fillStyle='#de9a9b';c.beginPath();c.ellipse(.002,-.174,.020,.011,0,0,Math.PI*2);c.fill();}
  }else{
    c.strokeStyle='#995d67';c.lineWidth=.004;c.beginPath();c.moveTo(-.028,-.153);
    c.quadraticCurveTo(0,sad?-.143:happy?-.181:-.170,.03,-.153);c.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

function hairGeometry(style){
  // One rounded shell contains both crown and fringe. Every fringe point is
  // on the scalp surface: projecting a flat polygon outside the ellipsoid
  // previously created a vertical fin on the crown in profile views.
  const hem=style==='bob'?
    [[-180,-.273],[-125,-.273],[-97,-.245],[-75,-.21],[-60,-.09],[-50,.10],[-35,.142],[-19,.126],[0,.153],[19,.127],[35,.142],[50,.105],[60,-.09],[75,-.21],[97,-.245],[125,-.273],[180,-.273]]:
    [[-180,-.068],[-130,-.055],[-95,-.019],[-75,.050],[-60,.114],[-44,.204],[-30,.165],[-17,.238],[-2,.168],[13,.206],[27,.132],[40,.181],[58,.080],[75,.044],[95,-.009],[130,-.050],[180,-.068]];
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
    const width=style==='bob'&&lat>Math.PI/2?Math.max(.84,Math.sin(lat)):Math.sin(lat);
    pos.push(rx*width*Math.sin(a),ry*Math.cos(lat),-.021+rz*width*(front>0?front**.68:front));
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

export class HeadAssembly extends THREE.Group {
  constructor({mesh,ellipsoid,C}){
    super();this.C=C;this.name='neck-and-head';
    this.neckRig=new THREE.Group();this.neckRig.position.set(0,1.16,-.022);this.add(this.neckRig);
    this.head=new THREE.Group();this.head.position.set(0,.24,.022);this.neckRig.add(this.head);
    if(C.style==='short'){this.neckRig.position.y=1.275;this.head.position.y=.195;this.head.scale.set(.64,.74,.68);}
    this.faceCache=new Map();this.faceMat=new THREE.MeshBasicMaterial({map:faceTexture(C,0,0)});
    mesh(this.head,faceGeometry(C.style),this.faceMat);
    for(const sign of [-1,1]){
      ellipsoid(this.head,[sign*.266,-.071,-.025],[.033,.052,.028],C.skin);
      ellipsoid(this.head,[sign*.287,-.072,-.004],[.010,.027,.012],'#e5b6a6',false);
    }
    this.hair=mesh(this.head,hairGeometry(C.style),C.hair);this.hairRest=this.hair.geometry.attributes.position.array.slice();
    if(C.style==='bob'){
      const clip=ellipsoid(this.head,[.225,.133,.181],[.054,.010,.010],'#ecc55f');clip.rotation.z=-.35;
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
    const teen=this.C.style==='short';
    const bottom=V(0,teen?1.168:1.073,-.023),middle=V(0,teen?1.252:1.153,-.026),N=48,R=24,pos=this.neckGeometry.attributes.position;
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
    const blink=Math.round((p.blink??0)*4)/4,mouth=p.mouth??0,emotion=p.emotion??'calm';
    const key=`${mouth}/${blink}/${emotion}`;
    if(key!==this.lastFace){
      if(!this.faceCache.has(key))this.faceCache.set(key,faceTexture(this.C,mouth,blink,emotion));
      this.faceMat.map=this.faceCache.get(key);this.lastFace=key;
    }
    const wind=V(p.windWorld?.x??0,0,p.windWorld?.z??0).applyAxisAngle(V(0,1,0),-(p.yaw??0));
    wind.applyQuaternion(this.neckRig.quaternion.clone().invert());
    const hp=this.hair.geometry.attributes.position;
    for(let i=0;i<hp.count;i++){
      const x=this.hairRest[i*3],y=this.hairRest[i*3+1],z=this.hairRest[i*3+2];
      const bend=Math.max(0,.09-y)**2;
      hp.setXYZ(i,x+wind.x*bend*.14,y,z+wind.z*bend*.14);
    }
    hp.needsUpdate=true;this.hair.geometry.computeVertexNormals();
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
    const bounds=new THREE.Box3().setFromObject(this.head,true),size=bounds.getSize(new THREE.Vector3());
    if(size.length()<.5||size.length()>1.5)throw new Error(`Head bounds outside inspection range: ${size.toArray()}`);
    return {meshes,vertices,size:size.toArray(),rotation:this.neckRig.rotation.toArray().slice(0,3)};
  }
}
