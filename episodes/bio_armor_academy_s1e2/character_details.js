// Episode-local refinement: sculpted heads, readable facial acting and garment construction.
import * as THREE from 'three';
import {mesh,ellipsoid,mat} from '/craft/character3d.js';
const TAU=Math.PI*2,clamp=THREE.MathUtils.clamp;
const faceCache=new Map();

function faceTexture(kind,emotion,blink){
  const key=`${kind}/${emotion}/${Math.round(blink*6)}`;
  if(faceCache.has(key))return faceCache.get(key);
  const c=document.createElement('canvas');c.width=c.height=1024;
  const g=c.getContext('2d');g.scale(2,2);
  const strong=kind==='hong',skin=strong?'#dfb28f':'#efd0b4';
  g.fillStyle=skin;g.fillRect(0,0,512,512);
  const shade=g.createLinearGradient(0,0,512,0);
  shade.addColorStop(0,strong?'#b47f66':'#c39783');shade.addColorStop(.3,skin);
  shade.addColorStop(.6,strong?'#edc3a0':'#f8dfc5');shade.addColorStop(1,strong?'#c08c6e':'#d0a38c');
  g.fillStyle=shade;g.fillRect(0,0,512,512);
  const fierce=['determined','declare','angry'].includes(emotion),worried=['worry','scared'].includes(emotion);
  const laugh=emotion==='laugh';
  const eyeY=strong?214:222,eyeDX=strong?98:91,open=laugh?0:1-Math.round(blink*6)/6;
  for(const side of [-1,1]){
    const cx=256+side*eyeDX,ry=(strong?17:24)*(emotion==='scared'?1.18:1)*(fierce?.72:1);
    g.save();g.translate(cx,eyeY);
    const eyePath=()=>{g.beginPath();g.moveTo(-44,0);g.quadraticCurveTo(-8,-ry*1.55,43,-3);g.quadraticCurveTo(6,ry, -44,0);g.closePath();};
    if(open>.05){
      g.save();eyePath();g.clip();g.fillStyle='#fff3db';g.fillRect(-48,-40,96,80);
      g.fillStyle=strong?'#755330':'#886f4a';g.beginPath();g.ellipse(side*-3,0,strong?13:18,strong?20:25,0,0,TAU);g.fill();
      g.fillStyle='#25252a';g.beginPath();g.ellipse(side*-3,1,strong?6:8,17,0,0,TAU);g.fill();
      g.fillStyle='#fffcef';g.beginPath();g.arc(-7,-9,strong?3:4,0,TAU);g.fill();
      // Eyelid covers a fixed iris instead of flattening the entire eye.
      g.fillStyle=skin;g.fillRect(-48,-42,96,42-ry*open+ry*(1-open));g.restore();
    }
    g.strokeStyle='#342928';g.lineWidth=strong?6:4.5;g.lineCap='round';
    g.beginPath();g.moveTo(-44,0);
    if(laugh)g.quadraticCurveTo(0,-ry*1.9,44,0); // 笑眼：上拱弧线 ∩
    else g.quadraticCurveTo(-8,-ry*1.5*open,43,-3);
    g.stroke();
    if(open>.15){g.strokeStyle=strong?'#9e6e59':'#b48a73';g.lineWidth=2;g.beginPath();g.moveTo(-36,7);g.quadraticCurveTo(0,ry*.8,33,7);g.stroke();}
    g.restore();
    const outerX=256+side*(eyeDX+42),innerX=256+side*(eyeDX-38);
    const browY=eyeY-(strong?38:43)+(laugh?-7:0),innerDelta=fierce?13:worried?-14:-2;
    g.strokeStyle=strong?'#28292e':'#574032';g.lineWidth=strong?13:7;g.lineCap='round';
    g.beginPath();g.moveTo(outerX,browY);g.quadraticCurveTo(cx,browY-4,innerX,browY+innerDelta);g.stroke();
    if(!strong){g.strokeStyle='rgba(144,102,87,.55)';g.lineWidth=2.5;g.beginPath();g.moveTo(cx-27,eyeY+34);g.quadraticCurveTo(cx,eyeY+42,cx+28,eyeY+34);g.stroke();}
  }
  g.strokeStyle=strong?'#ae7c60':'#b88d72';g.lineWidth=2.7;
  g.beginPath();g.moveTo(255,252);g.quadraticCurveTo(249,279,264,288);g.stroke();
  g.beginPath();g.moveTo(247,295);g.quadraticCurveTo(256,299,266,294);g.stroke();
  if(strong){
    g.strokeStyle='#bd8b70';g.lineWidth=2;g.beginPath();g.moveTo(142,281);g.lineTo(155,292);g.moveTo(365,280);g.lineTo(355,292);g.stroke();
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  faceCache.set(key,tex);return tex;
}

function headGeometry(strong){
  const levels=strong?
    [[-.07,.041,.067],[-.051,.080,.099],[-.015,.112,.115],[.045,.127,.132],[.105,.129,.129],[.163,.110,.111],[.2,.066,.070],[.217,.001,.001]]:
    [[-.068,.024,.042],[-.047,.063,.081],[-.004,.094,.108],[.054,.117,.126],[.115,.112,.119],[.171,.087,.093],[.20,.044,.052],[.209,.001,.001]];
  const pos=[],uv=[],idx=[],sides=64;
  levels.forEach(([y,rx,rz],i)=>{
    for(let j=0;j<=sides;j++){
      const a=j/sides*TAU,front=Math.cos(a),x=rx*Math.sin(a);
      const nose=Math.exp(-((x/.020)**2)-((y-.043)/.037)**2)*.012*Math.max(0,front)**12;
      pos.push(x,y,rz*front+nose);
      uv.push(front>-.1?.5+x/.29:.025,front>-.1?(y+.07)/.287:.98);
      if(i<levels.length-1&&j<sides){const k=i*(sides+1)+j;idx.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
    }
  });
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

function stroke(parent,points,color,r=.002){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const m=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*4),r,5),mat(color));parent.add(m);return m;
}

function hairShell(strong){
  const pos=[],idx=[],n=64,m=20;
  for(let i=0;i<=m;i++)for(let j=0;j<=n;j++){
    const a=j/n*TAU,front=Math.cos(a);
    const end=front>0?1.22+(1-front)*.55:1.77+(-front)*.34;
    const theta=(i/m)*end;
    let y=.067+(strong?.162:.169)*Math.cos(theta);
    if(strong)y=Math.min(y+.008,.229);
    pos.push((strong?.134:.123)*Math.sin(theta)*Math.sin(a),y,(strong?.142:.137)*Math.sin(theta)*Math.cos(a)-.007);
    if(i<m&&j<n){const k=i*(n+1)+j;idx.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

function hairLock(parent,a,b,c,width,color){
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a),new THREE.Vector3(...b),new THREE.Vector3(...c));
  const pos=[],idx=[],n=14;
  for(let i=0;i<=n;i++){
    const u=i/n,p=curve.getPoint(u),w=width*Math.pow(1-u,.7)+.0001;
    for(const side of [-1,0,1])pos.push(p.x+side*w,p.y,p.z+(1-Math.abs(side))*.011*Math.sin(Math.PI*u));
    if(i<n){const k=i*3;idx.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  const material=mat(color).clone();material.side=THREE.DoubleSide;
  return mesh(parent,g,material,false);
}

export function detailedHead(body,kind,height){
  const strong=kind==='hong',skin=strong?'#dfb28f':'#efd0b4',hair=strong?'#252933':'#49362e';
  const neck=mesh(body,new THREE.CylinderGeometry(strong?.058:.043,strong?.067:.052,.115,24),skin,false);
  neck.position.set(0,height-.060,-.010);
  const head=new THREE.Group();head.position.y=height;body.add(head);
  const material=new THREE.MeshBasicMaterial({map:faceTexture(kind,'neutral',0)});
  const skull=mesh(head,headGeometry(strong),material);
  for(const side of [-1,1]){
    ellipsoid(head,[side*(strong?.125:.114),.052,-.004],[.022,.034,.017],skin,false);
    ellipsoid(head,[side*(strong?.139:.128),.054,.002],[.004,.020,.009],strong?'#b58065':'#c7947b',false);
  }
  mesh(head,hairShell(strong),hair);
  if(strong){
    for(let i=-5;i<=5;i++)stroke(head,[[i*.019,.206,.030],[i*.017,.216,.001],[i*.016,.209,-.045]],i%2?'#3b3e45':'#313640',.0013);
  }else{
    const locks=[[-.093,.185,.044,-.118,.117,.098,.026],[-.065,.207,.050,-.081,.068,.121,.038],[-.022,.222,.060,-.026,.085,.145,.044],[.02,.223,.065,.044,.053,.138,.042],[.062,.211,.052,.092,.092,.116,.038],[.094,.181,.022,.12,.039,.064,.023]];
    locks.forEach(([x,y,z,tx,ty,tz,w],i)=>hairLock(head,[x,y,z],[(x+tx)/2,y-.025,tz+.008],[tx,ty,tz],w,i%2?'#523c31':hair));
    for(const side of [-1,1])stroke(head,[[side*.013,.216,-.016],[side*.041,.266,-.002],[side*.017,.292,.009]],hair,.0045);
    stroke(head,[[-.079,.175,.086],[-.07,.140,.116],[-.072,.116,.123]],'#70513c',.0014);
  }
  let last='';
  return {head,skull,setEmotion(emotion='neutral',blink=0){
    const key=`${emotion}/${Math.round(blink*6)}`;if(key===last)return;last=key;
    material.map=faceTexture(kind,emotion,blink);material.needsUpdate=true;
  }};
}

function panel(parent,points,color){
  const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  return mesh(parent,new THREE.ExtrudeGeometry(shape,{depth:.007,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1}),color,false);
}

export function garmentDetails(actor,kind){
  const strong=kind==='hong',body=actor.body;
  if(!strong){
    for(const side of [-1,1]){
      const p=panel(body,[[side*.025,1.435],[side*.108,1.383],[side*.062,1.325],[side*.007,1.38]],'#e2d9c8');p.position.z=.10;
      stroke(body,[[side*.04,1.42,.116],[side*.093,1.383,.099],[side*.061,1.336,.110]],'#b4a896',.0015);
    }
    stroke(body,[[0,1.38,.112],[0,1.15,.111],[0,.91,.110]],'#b7ad9d',.0015);
    for(const y of [1.30,1.19,1.08,.97])ellipsoid(body,[.008,y,.115],[.006,.006,.0025],'#7a766b',false);
    const pocket=panel(body,[[-.12,1.29],[-.053,1.29],[-.056,1.205],[-.091,1.19],[-.12,1.21]],'#e8e0d0');pocket.position.z=.077;
    stroke(body,[[-.119,1.283,.086],[-.055,1.283,.108]],'#a99f8f',.0016);
    for(const side of [-1,1])for(const y of [.94,1.08])stroke(body,[[side*.136,y,.048],[side*.11,y+.022,.078],[side*.087,y+.026,.091]],'#c6baaa',.0014);
    // Flap seam and brass clasp on the existing satchel.
    stroke(body,[[-.265,.884,.112],[-.18,.866,.119],[-.077,.88,.111]],'#aa8154',.002);
    mesh(body,new THREE.BoxGeometry(.026,.035,.011),'#c5a768',false).position.set(-.17,.863,.116);
  }else{
    for(const side of [-1,1]){
      const p=panel(body,[[side*.045,1.585],[side*.141,1.548],[side*.083,1.40],[side*.023,1.52]],'#414754');p.position.z=.104;
      stroke(body,[[side*.055,1.57,.121],[side*.085,1.43,.145],[side*.076,1.04,.151]],'#78818d',.0021);
      stroke(body,[[side*.08,1.025,.15],[side*.18,1.03,.085]],'#575e6d',.002);
      stroke(body,[[side*.065,1.525,.127],[side*.19,1.525,.08]],'#697280',.0025);
    }
    for(const y of [1.39,1.25,1.10])ellipsoid(body,[-.081,y,.151],[.006,.006,.003],'#aba68d',false);
    const patch=panel(body,[[-.173,1.421],[-.11,1.421],[-.111,1.35],[-.146,1.335],[-.174,1.352]],'#6b776a');patch.position.z=.084;
    stroke(body,[[-.152,1.394,.100],[-.131,1.381,.118],[-.15,1.362,.108]],'#c6c2a0',.0023);
  }
}

export function forearmDetails(actor,kind){
  actor.detailRigs={};
  for(const side of ['left','right']){
    const rig=new THREE.Group();actor.mesh.add(rig);actor.detailRigs[side]=rig;
    if(kind==='hong'){
      const curve=[];
      for(let i=0;i<=110;i++){
        const u=i/110,a=u*TAU*5,r=.057-u*.006;
        curve.push([Math.cos(a)*r,Math.sin(a)*r,.019+u*.184]);
      }
      stroke(rig,curve,'#b6b09e',.0018);
    }
  }
}

export function updateForearmDetails(actor,p){
  for(const side of ['left','right']){
    const arm=p[side+'Arm'],a=new THREE.Vector3(arm[1].x,arm[1].y,arm[1].z),b=new THREE.Vector3(arm[2].x,arm[2].y,arm[2].z);
    const rig=actor.detailRigs[side];rig.position.copy(a);rig.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.sub(a).normalize());
  }
}
