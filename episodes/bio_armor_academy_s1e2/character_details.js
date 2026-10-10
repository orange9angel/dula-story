// Episode-local refinement: sculpted heads, readable facial acting and garment construction.
import * as THREE from 'three';
import {mesh,ellipsoid,mat} from '/craft/character3d.js';
import {animatedHead} from './character_look.js';
import {clothMaterial} from './character_finish.js';
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
  // 发际线下压影 + 颧骨/脸颊体块阴影（去"白板脸"）
  const ao=g.createLinearGradient(0,96,0,196);
  ao.addColorStop(0,'rgba(60,38,30,.22)');ao.addColorStop(1,'rgba(60,38,30,0)');
  g.fillStyle=ao;g.fillRect(110,96,292,100);
  for(const side of [-1,1]){
    const cheek=g.createRadialGradient(256+side*152,strong?332:318,8,256+side*152,strong?332:318,strong?100:88);
    cheek.addColorStop(0,strong?'rgba(148,92,66,.38)':'rgba(170,110,88,.26)');cheek.addColorStop(1,'rgba(170,110,88,0)');
    g.fillStyle=cheek;g.fillRect(256+side*152-92,222,184,192);
    if(!strong){const blush=g.createRadialGradient(256+side*130,300,4,256+side*130,300,44);
      blush.addColorStop(0,'rgba(255,148,124,.17)');blush.addColorStop(1,'rgba(255,148,124,0)');
      g.fillStyle=blush;g.fillRect(256+side*130-48,254,96,92);}
  }
  const fierce=['determined','declare','angry'].includes(emotion),worried=['worry','scared'].includes(emotion);
  const laugh=emotion==='laugh';
  const eyeY=strong?214:222,eyeDX=strong?98:91,open=laugh?0:1-Math.round(blink*6)/6;
  for(const side of [-1,1]){
    const cx=256+side*eyeDX,ry=(strong?18:27)*(emotion==='scared'?1.18:1)*(fierce?.72:1);
    g.save();g.translate(cx,eyeY);
    const eyePath=()=>{g.beginPath();g.moveTo(-48,0);g.quadraticCurveTo(-8,-ry*1.55,47,-3);g.quadraticCurveTo(8,ry*1.02, -48,0);g.closePath();};
    if(open>.05){
      g.save();eyePath();g.clip();g.fillStyle='#fff3db';g.fillRect(-52,-42,104,84);
      g.fillStyle=strong?'#755330':'#886f4a';g.beginPath();g.ellipse(side*-3,0,strong?13:20,strong?20:27,0,0,TAU);g.fill();
      g.fillStyle='#25252a';g.beginPath();g.ellipse(side*-3,1,strong?6:9,18,0,0,TAU);g.fill();
      g.fillStyle='#fffcef';g.beginPath();g.arc(-7,-10,strong?3:4.5,0,TAU);g.fill();
      // Eyelid covers a fixed iris instead of flattening the entire eye.
      g.fillStyle=skin;g.fillRect(-52,-44,104,44-ry*open+ry*(1-open));g.restore();
    }
    g.strokeStyle='#342928';g.lineWidth=strong?7:6;g.lineCap='round';
    g.beginPath();g.moveTo(-48,0);
    if(laugh)g.quadraticCurveTo(0,-ry*1.9,48,0); // 笑眼：上拱弧线 ∩
    else g.quadraticCurveTo(-8,-ry*1.5*open,47,-3);
    g.stroke();
    if(open>.15){g.strokeStyle=strong?'#9e6e59':'#b48a73';g.lineWidth=2;g.beginPath();g.moveTo(-38,8);g.quadraticCurveTo(0,ry*.8,36,8);g.stroke();
      if(!strong){g.lineWidth=1.8;g.beginPath();g.moveTo(-46,2);g.lineTo(-51,6);g.moveTo(-42,6);g.lineTo(-46,11);g.stroke();}} // 外眼角下睫两根
    g.restore();
    const outerX=256+side*(eyeDX+46),innerX=256+side*(eyeDX-40);
    const browY=eyeY-(strong?38:43)+(laugh?-7:0),innerDelta=fierce?13:worried?-14:-2;
    g.strokeStyle=strong?'#28292e':'#4a3428';g.lineWidth=strong?17:9;g.lineCap='round';
    g.beginPath();g.moveTo(outerX,browY);g.quadraticCurveTo(cx,browY-4,innerX,browY+innerDelta);g.stroke();
    if(!strong){g.strokeStyle='rgba(144,102,87,.55)';g.lineWidth=2.5;g.beginPath();g.moveTo(cx-29,eyeY+36);g.quadraticCurveTo(cx,eyeY+44,cx+30,eyeY+36);g.stroke();}
  }
  g.strokeStyle=strong?'#ae7c60':'#b88d72';g.lineWidth=2.7;
  g.beginPath();g.moveTo(255,252);g.quadraticCurveTo(249,279,264,288);g.stroke();
  g.beginPath();g.moveTo(247,295);g.quadraticCurveTo(256,299,266,294);g.stroke();
  if(strong){
    g.strokeStyle='#bd8b70';g.lineWidth=2;g.beginPath();g.moveTo(142,281);g.lineTo(155,292);g.moveTo(365,280);g.lineTo(355,292);g.stroke();
    // 寸头发际线画进脸部纹理（贴曲面无悬浮感，替代 3D 碎茬；
    // 注意壳缘在纹理 canvas y≈168 处，发际线只能落在 160-185 窄带）
    let hd=7;const hrr=()=>{hd=(hd*1103515245+12345)&0x7fffffff;return hd/0x7fffffff;};
    for(let i=0;i<110;i++){
      const x=152+hrr()*208,top=158+Math.abs(x-256)*.05+hrr()*5,len=4+hrr()*8;
      g.strokeStyle=`rgba(49,52,60,${.35+hrr()*.4})`;g.lineWidth=1.6;
      g.beginPath();g.moveTo(x,top);g.lineTo(x+(hrr()-.5)*2,top+len);g.stroke();
    }
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
  if(!new URLSearchParams(location.search).has('legacy-look'))return animatedHead(body,kind,height);
  const strong=kind==='hong',skin=strong?'#dfb28f':'#efd0b4',hair=strong?'#252933':'#49362e';
  const neck=mesh(body,new THREE.CylinderGeometry(strong?.062:.045,strong?.072:.054,.115,24),skin,false);
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
    // 寸头茬质感：全壳放射短茬（沿壳面法线）+ 前额发际线碎茬 + 鬓角
    let sd=41;const hr=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
    for(let i=0;i<44;i++){
      const a=hr()*TAU,th=.22+hr()*1.15;
      const x=.134*Math.sin(th)*Math.sin(a),y=.067+.162*Math.cos(th),z=.142*Math.sin(th)*Math.cos(a)-.007;
      const d=new THREE.Vector3(x,y-.067,z+.007).normalize();
      stroke(head,[[x,y,z],[x+d.x*.013,y+d.y*.013,z+d.z*.013]],hr()>.45?'#3b3e45':'#1b1e24',.0012);
    }
    for(const side of [-1,1]){ // 鬓角
      const sb=mesh(head,new THREE.BoxGeometry(.006,.052,.030),hair,false);
      sb.position.set(side*.126,.096,.030);sb.rotation.y=side*.18;
    }
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
  return mesh(parent,new THREE.ExtrudeGeometry(shape,{depth:.004,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:2}),clothMaterial(color),false);
}

export function garmentDetails(actor,kind){
  const strong=kind==='hong',body=actor.body;
  if(!strong){
    for(const side of [-1,1]){
      const p=panel(body,[[side*.025,1.411],[side*.097,1.381],[side*.058,1.337],[side*.007,1.38]],'#e8e1d5');p.position.z=.097;
      stroke(body,[[side*.034,1.407,.104],[side*.090,1.382,.104],[side*.059,1.341,.104]],'#b7ad9d',.0009);
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
