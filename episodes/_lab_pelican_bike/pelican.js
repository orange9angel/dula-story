// 鹈鹕骑自行车 · 纯程序化 Three.js（无模型文件）。一切由绝对时钟 t 决定，可逐帧 seek。
import * as THREE from 'three';

const W=1280,H=720,DUR=4;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xbfdcf0);scene.fog=new THREE.Fog(0xcfe4f2,9,34);
const camera=new THREE.PerspectiveCamera(32,W/H,.05,100);

// ---------- 光 ----------
scene.add(new THREE.HemisphereLight(0xdcefff,0x6b7a4a,1.1));
const sun=new THREE.DirectionalLight(0xfff1dc,2.6);sun.position.set(3.5,6,4);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.5,far:20});sun.shadow.bias=-.0004;sun.shadow.radius=4;
scene.add(sun,sun.target);

// ---------- 材质 ----------
const M=(color,rough=.6,metal=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});
const mat={frame:M(0x1f7a8c,.35,.3),chrome:M(0xd8dde2,.25,.9),rubber:M(0x1b1b1d,.85),saddle:M(0x3a2a22,.6),grip:M(0x2a2a2a,.8),
  feather:M(0xf6f3ee,.85),featherShade:M(0xdedad3,.9),wingTip:M(0x26262b,.75),bill:M(0xf2a93b,.45),billTip:M(0xe0602e,.4),
  pouch:M(0xf2a08c,.55,0,{transparent:true,opacity:.97}),leg:M(0xf08c4a,.55),eye:M(0x111111,.2),eyeRing:M(0xf7d35a,.4),
  road:M(0x55585c,.95),line:M(0xf1efe6,.8),grass:M(0x7fa04a,.95),hill:M(0x8fb06a,1),post:M(0xe9e4da,.7)};

// ---------- 小工具 ----------
const V=(x,y,z=0)=>new THREE.Vector3(x,y,z);
function tube(a,b,r,m,seg=12){const d=b.clone().sub(a),L=d.length();const g=new THREE.CylinderGeometry(r,r,L,seg);const o=new THREE.Mesh(g,m);
  o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());o.castShadow=true;return o;}
function setTube(o,a,b){const d=b.clone().sub(a),L=d.length();o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());o.scale.set(1,L/o.geometry.parameters.height,1);}
function ell(rx,ry,rz,m,seg=32){const o=new THREE.Mesh(new THREE.SphereGeometry(1,seg,seg/2|0),m);o.scale.set(rx,ry,rz);o.castShadow=true;return o;}

// ---------- 自行车（车身坐标：x 向前，y 上，z 车左）----------
const bike=new THREE.Group();scene.add(bike);
const WR=.34,REAR=V(-.52,WR),FRONT=V(.5,WR),BB=V(-.06,.32),SEAT=V(-.22,.86),HT_TOP=V(.36,.82),HT_BOT=V(.41,.66);
for(const [a,b,r] of [[BB,SEAT,.022],[SEAT,HT_TOP,.02],[BB,HT_BOT,.026],[HT_TOP,HT_BOT,.028]])bike.add(tube(a,b,r,mat.frame));
for(const z of [.06,-.06]){bike.add(tube(V(BB.x,BB.y,z*.6),V(REAR.x,REAR.y,z),.012,mat.frame));bike.add(tube(V(-.19,.78,z*.5),V(REAR.x,REAR.y,z),.011,mat.frame));
  bike.add(tube(V(HT_BOT.x,HT_BOT.y,z*.5),V(FRONT.x,FRONT.y,z),.012,mat.frame));}
// 车座、立管、车把
bike.add(tube(V(-.215,.84),V(-.235,.92),.013,mat.chrome));
const saddle=ell(.13,.03,.065,mat.saddle);saddle.position.set(-.23,.935,0);bike.add(saddle);
const stemTop=V(.33,.95);bike.add(tube(HT_TOP,stemTop,.016,mat.chrome));
const bar=tube(V(.34,.95,-.24),V(.34,.95,.24),.013,mat.chrome);bike.add(bar);
for(const z of [.21,-.21]){const g=tube(V(.34,.95,z-.04),V(.34,.95,z+.04),.019,mat.grip);bike.add(g);}
// 车轮（转动部分单独成组）
function wheel(c){const g=new THREE.Group();g.position.copy(c);
  const tire=new THREE.Mesh(new THREE.TorusGeometry(WR-.012,.024,14,64),mat.rubber);tire.castShadow=true;g.add(tire);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(WR-.04,.009,8,64),mat.chrome);g.add(rim);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.1,16),mat.chrome);hub.rotation.x=Math.PI/2;g.add(hub);
  for(let k=0;k<20;k++){const a=k/20*Math.PI*2,z=(k%2?1:-1)*.035;g.add(tube(V(0,0,z),V(Math.cos(a)*(WR-.045),Math.sin(a)*(WR-.045),0),.0022,mat.chrome,5));}
  bike.add(g);return g;}
const wRear=wheel(REAR),wFront=wheel(FRONT);
// 牙盘、曲柄、脚踏、链条
const crank=new THREE.Group();crank.position.copy(BB);bike.add(crank);
const ring=new THREE.Mesh(new THREE.TorusGeometry(.095,.008,8,48),mat.chrome);ring.position.z=.07;crank.add(ring);
for(let k=0;k<5;k++){const a=k/5*Math.PI*2;crank.add(tube(V(0,0,.07),V(Math.cos(a)*.09,Math.sin(a)*.09,.07),.006,mat.chrome,6));}
const CR=.15,arms=[],pedals=[];
for(const s of [1,-1]){const arm=tube(V(0,0,s*.085),V(0,-CR,s*.085),.011,mat.chrome);crank.add(arm);arms.push(arm);
  const p=new THREE.Mesh(new THREE.BoxGeometry(.09,.014,.07),mat.rubber);p.castShadow=true;bike.add(p);pedals.push(p);}
{const pts=[];for(let k=0;k<=40;k++){const a=Math.PI/2+k/40*Math.PI;pts.push(V(BB.x+Math.cos(a)*.097,BB.y+Math.sin(a)*.097,.07));}
  for(let k=0;k<=20;k++){const a=-Math.PI/2+k/20*Math.PI;pts.push(V(REAR.x+Math.cos(a+Math.PI)*-.045,REAR.y+Math.sin(a+Math.PI)*-.045,.07));}
  const chain=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),120,.004,5,true),M(0x3b3b3e,.5,.7));bike.add(chain);
  const cog=new THREE.Mesh(new THREE.TorusGeometry(.045,.006,8,32),mat.chrome);cog.position.set(REAR.x,REAR.y,.07);bike.add(cog);}

// ---------- 鹈鹕 ----------
const bird=new THREE.Group();bike.add(bird);
const body=ell(.3,.2,.19,mat.feather);body.position.set(-.1,1.1,0);body.rotation.z=-.22;bird.add(body);
const belly=ell(.26,.16,.17,mat.featherShade);belly.position.set(-.06,1.03,0);belly.rotation.z=-.22;bird.add(belly);
const tail=new THREE.Mesh(new THREE.ConeGeometry(.08,.2,12),mat.featherShade);tail.position.set(-.4,1.13,0);tail.rotation.z=Math.PI/2+.35;tail.scale.z=.5;tail.castShadow=true;bird.add(tail);
// 颈：S 形管，逐帧重建
const neckMesh=new THREE.Mesh(new THREE.BufferGeometry(),mat.feather);neckMesh.castShadow=true;bird.add(neckMesh);
const head=new THREE.Group();bird.add(head);
head.add(Object.assign(ell(.075,.068,.065,mat.feather),{}));
const crest=ell(.05,.03,.025,mat.featherShade);crest.position.set(-.05,.05,0);crest.rotation.z=.5;head.add(crest);
const eyes=[];for(const z of [.052,-.052]){const ring=ell(.017,.017,.006,mat.eyeRing);ring.position.set(.025,.018,z);head.add(ring);
  const e=ell(.009,.009,.006,mat.eye);e.position.set(.027,.018,z*1.08);head.add(e);eyes.push(e);}
// 喙：上喙（扁长、末端钩）+ 喉囊（软、会晃）
const billLen=.46;
const upper=new THREE.Mesh(new THREE.CylinderGeometry(.012,.032,billLen,16,1),mat.bill);upper.rotation.z=-Math.PI/2;upper.position.set(.06+billLen/2,-.005,0);upper.scale.z=1.25;upper.castShadow=true;head.add(upper);
const hook=new THREE.Mesh(new THREE.SphereGeometry(.016,12,8),mat.billTip);hook.position.set(.06+billLen,-.012,0);head.add(hook);
const pouchG=new THREE.Group();head.add(pouchG);
const pouch=new THREE.Mesh(new THREE.SphereGeometry(1,32,16,0,Math.PI*2,Math.PI/2,Math.PI/2),mat.pouch);pouch.scale.set(billLen*.48,.09,.045);pouch.position.set(.06+billLen*.47,-.012,0);pouch.castShadow=true;pouchG.add(pouch);
const lower=new THREE.Mesh(new THREE.CylinderGeometry(.008,.02,billLen*.97,12),mat.bill);lower.rotation.z=-Math.PI/2;lower.position.set(.06+billLen*.48,-.02,0);head.add(lower);
// 翅膀：肩→握把，羽毛末端黑色包住握把
const wings=[];
for(const s of [1,-1]){const g=new THREE.Group();bird.add(g);
  const arm=ell(1,1,1,mat.feather);g.add(arm);const tip=ell(1,1,1,mat.wingTip);g.add(tip);
  const prim=[];for(let k=0;k<4;k++){const f=ell(1,1,1,mat.wingTip);g.add(f);prim.push(f);}
  wings.push({s,g,arm,tip,prim});}
// 腿与脚：两段 IK，脚掌踩脚踏
const legs=[];
for(const s of [1,-1]){const thigh=tube(V(0,0),V(0,1),.024,mat.leg),shin=tube(V(0,0),V(0,1),.018,mat.leg);bird.add(thigh,shin);
  const knee=ell(.026,.026,.026,mat.leg);bird.add(knee);
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(.11,-.045);shape.quadraticCurveTo(.12,0,.11,.045);shape.lineTo(0,0);
  const foot=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.008,bevelEnabled:false}),mat.leg);foot.castShadow=true;bird.add(foot);
  legs.push({s,thigh,shin,knee,foot});}

// ---------- 场景：道路、草地、路桩、远山 ----------
const road=new THREE.Mesh(new THREE.PlaneGeometry(80,2.4),mat.road);road.rotation.x=-Math.PI/2;road.receiveShadow=true;scene.add(road);
const grass=new THREE.Mesh(new THREE.PlaneGeometry(80,60),mat.grass);grass.rotation.x=-Math.PI/2;grass.position.y=-.002;grass.receiveShadow=true;scene.add(grass);
const dashes=[],posts=[],tufts=[];
for(let k=0;k<30;k++){const d=new THREE.Mesh(new THREE.PlaneGeometry(.7,.06),mat.line);d.rotation.x=-Math.PI/2;d.position.set(0,.002,-.55);d.receiveShadow=true;scene.add(d);dashes.push(d);}
for(let k=0;k<12;k++){const p=new THREE.Mesh(new THREE.BoxGeometry(.07,.55,.07),mat.post);p.castShadow=true;p.position.set(0,.275,-1.6);scene.add(p);posts.push(p);}
const tuftG=new THREE.SphereGeometry(.12,10,6);
for(let k=0;k<120;k++){const m=new THREE.Mesh(tuftG,M(new THREE.Color().setHSL(.24+.04*Math.sin(k*7.1),.45,.36+.06*Math.sin(k*3.3)),.95));m.castShadow=true;
  m.userData={x0:k*.37%40,z:(k%2?1:-1)*(1.35+(k*1.37%2.2))};scene.add(m);tufts.push(m);}
for(let k=0;k<7;k++){const h=ell(4+k%3*1.5,1.2+k%2*.8,2.5,mat.hill,24);h.position.set(-14+k*6,-.2,-14-k%3*3);h.castShadow=false;scene.add(h);}

// ---------- 动画 ----------
const RPM=74,GEAR=2.3;
const crankAng=t=>-(t*RPM/60)*Math.PI*2; // 车身坐标里顺时针（向前骑）
function twoBone(hip,foot,l1,l2,bendDir){
  const d=foot.clone().sub(hip),L=Math.min(d.length(),l1+l2-1e-4),dn=d.clone().normalize();
  const a=(l1*l1+L*L-l2*l2)/(2*l1*L),h=Math.sqrt(Math.max(0,l1*l1-(a*l1)*(a*l1)));
  const side=bendDir.clone().sub(dn.clone().multiplyScalar(bendDir.dot(dn))).normalize();
  return hip.clone().addScaledVector(dn,a*l1).addScaledVector(side,h);
}
const ease=u=>u*u*(3-2*u);
function pose(t){
  const ca=crankAng(t),wa=ca*GEAR,speed=-wa*WR; // 前进距离 = 轮转角 × 半径
  wRear.rotation.z=wa;wFront.rotation.z=wa;crank.rotation.z=ca;
  // 脚踏：位置随曲柄、踏面保持水平
  pedals.forEach((p,i)=>{const a=ca+(i?Math.PI:0);p.position.set(BB.x+Math.sin(a)*CR,BB.y-Math.cos(a)*CR,(i?-1:1)*.115);});
  // 身体随蹬踏起伏（每圈两次），轻微左右摆
  const bob=.014*Math.sin(2*ca+.6),roll=.035*Math.sin(ca);
  body.position.y=1.1+bob;belly.position.y=1.03+bob;tail.position.y=1.13+bob;bird.rotation.x=roll;
  // 颈：从胸前上方到头，S 形，带滞后
  const lag=2*ca-.9,hx=.2+.012*Math.sin(lag),hy=1.6+.014*Math.sin(lag+.4)+bob*.6;
  const base=V(.08,1.2+bob),pts=[base,V(.15,1.32+bob*.9),V(.1,1.45+bob*.8),V(hx-.04,1.55+bob*.7),V(hx,hy)];
  neckMesh.geometry.dispose();neckMesh.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.045,14,false);
  const r=neckMesh.geometry;{const pos=r.attributes.position;// 颈根更粗
    const curve=new THREE.CatmullRomCurve3(pts);for(let i=0;i<pos.count;i++){const seg=Math.floor(i/15)/40,c=curve.getPoint(Math.min(1,seg));
      const k=1+.6*Math.pow(1-seg,3);pos.setXYZ(i,c.x+(pos.getX(i)-c.x)*k,c.y+(pos.getY(i)-c.y)*k,c.z+(pos.getZ(i)-c.z)*k);}pos.needsUpdate=true;r.computeVertexNormals();}
  head.position.set(hx,hy,0);head.rotation.z=-.32+.04*Math.sin(lag+.8);head.rotation.y=.06*Math.sin(t*1.3);
  // 喉囊晃动
  pouch.scale.y=.09*(1+.12*Math.sin(2*ca-1.6));pouchG.rotation.z=.03*Math.sin(2*ca-1.2);
  // 眨眼（1.55–1.68s）
  const bl=t>1.55&&t<1.68?Math.sin((t-1.55)/.13*Math.PI):0;eyes.forEach(e=>e.scale.y=.009*(1-.9*bl));
  // 翅膀：肩→握把
  for(const w of wings){const sh=V(.0,1.2+bob,w.s*.17),grip=V(.34,.955,w.s*.21),el=V(.2,1.05+bob*.5,w.s*.27);
    const place=(o,a,b,r)=>{const d=b.clone().sub(a),L=d.length();o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(V(1,0,0),d.normalize());o.scale.set(L/2+.02,r,r*.55);};
    place(w.arm,sh,el,.075);place(w.tip,el,grip,.05);
    w.prim.forEach((f,k)=>{const a=grip.clone().add(V(-.02,.01-.012*k,w.s*(.01+.006*k)));place(f,el.clone().lerp(grip,.5),a.add(V(.03,-.01*k,0)),.018);});}
  // 腿：髋→脚踏，膝向前外
  for(const [i,l] of legs.entries()){const hip=V(-.1,.95+bob,l.s*.1),pd=pedals[i].position.clone().add(V(.0,.02,0));
    const knee=twoBone(hip,pd,.41,.43,V(1,.3,l.s*.2));setTube(l.thigh,hip,knee);setTube(l.shin,knee,pd);l.knee.position.copy(knee);
    l.foot.position.copy(pd).add(V(-.04,.007,-.004*l.s));l.foot.rotation.set(-Math.PI/2,0,0);}
  // 地面后退：路线、路桩、草丛
  const dist=-speed;
  dashes.forEach((d,k)=>{d.position.x=((k*1.4-dist)%42+42)%42-21;});
  posts.forEach((p,k)=>{p.position.x=((k*3.5-dist)%42+42)%42-21;});
  tufts.forEach(m=>{m.position.set(((m.userData.x0-dist)%40+40)%40-20,.04,m.userData.z);m.scale.set(1,.55,1);});
  // 镜头：四分之三侧前方，缓慢环绕
  const u=ease(t/DUR),ang=lerp(.62,.32,u),R=lerp(3.6,3.15,u);
  camera.position.set(Math.cos(ang)*R*.95+.1,1.05+.08*u,Math.sin(ang)*R+.15);camera.lookAt(.06,.9,0);
  sun.target.position.set(0,.6,0);
}
function lerp(a,b,u){return a+(b-a)*u;}
window.renderAt=t=>{pose(t);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png').split(',')[1];};
window.DUR=DUR;pose(0);renderer.render(scene,camera);window.ready=true;
