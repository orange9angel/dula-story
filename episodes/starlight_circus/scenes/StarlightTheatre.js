import * as THREE from 'three';
const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
function mesh(parent,g,m,pos=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
function curtain(parent,x,width,color){const g=new THREE.PlaneGeometry(width,5.2,80,30),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,.12*Math.cos(p.getX(i)*17));g.computeVertexNormals();const m=mat(color);m.side=THREE.DoubleSide;return mesh(parent,g,m,[x,2.8,-5.4]);}
export class StarlightTheatre{
 constructor(){this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#101323');this.scene.fog=new THREE.FogExp2('#15182a',.018);this.characters=new Map();this.cameraObstacles=[];}
 build(){
  const s=this.scene,cvs=document.createElement('canvas');cvs.width=cvs.height=1024;const c=cvs.getContext('2d');c.fillStyle='#6b4a3e';c.fillRect(0,0,1024,1024);
  for(let y=0;y<1024;y+=44){c.fillStyle=y%88?'#755142':'#67483e';c.fillRect(0,y,1024,43);c.strokeStyle='#342b30';c.lineWidth=2;c.beginPath();c.moveTo(0,y);c.lineTo(1024,y);c.stroke();for(let x=(y%88?80:0);x<1024;x+=230){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+44);c.stroke();}}
  const map=new THREE.CanvasTexture(cvs);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,2);map.anisotropy=8;const floor=mat('#c5a58a',.76);floor.map=map;
  this.floor=mesh(s,new THREE.BoxGeometry(11,.45,8),floor,[0,-.225,-1.7]);
  this.turntable=new THREE.Group();this.turntable.position.set(0,.006,-1.7);s.add(this.turntable);this.deck=mesh(this.turntable,new THREE.CylinderGeometry(4,4,.055,100),floor);
  const brass=mat('#9a8050',.42,.72),dark=mat('#252030');this.fixedRim=mesh(s,new THREE.TorusGeometry(4.06,.032,8,120),brass,[0,.045,-1.7]);this.fixedRim.rotation.x=Math.PI/2;
  this.curtainL=curtain(s,-2.65,5.5,'#622838');this.curtainR=curtain(s,2.65,5.5,'#622838');
  for(const sign of [-1,1]){mesh(s,new THREE.BoxGeometry(.35,5.8,.4),brass,[sign*5.35,2.55,-1.6]);for(let j=0;j<3;j++){const wing=curtain(s,sign*(4.6+j*.32),1.2,'#382535');wing.position.z=-1-j*1.8;wing.rotation.y=sign*.5;}}
  mesh(s,new THREE.BoxGeometry(10.7,.5,.45),brass,[0,5.25,-1.65]);
  this.piano=new THREE.Group();this.piano.position.set(3.25,0,-.95);s.add(this.piano);const piano=mat('#241d2a',.35);
  mesh(this.piano,new THREE.BoxGeometry(1.65,.8,.78),piano,[0,.58,0]);mesh(this.piano,new THREE.BoxGeometry(1.68,.08,.85),piano,[0,1.03,-.03]);for(const x of [-.68,.68])mesh(this.piano,new THREE.BoxGeometry(.09,.5,.1),piano,[x,.25,.25]);
  mesh(this.piano,new THREE.BoxGeometry(1.49,.05,.27),mat('#dfd2b7'),[0,.82,.48]);for(let i=0;i<28;i++){mesh(this.piano,new THREE.BoxGeometry(.004,.052,.25),dark,[-.72+i*.053,.823,.48]);if(![2,6].includes(i%7))mesh(this.piano,new THREE.BoxGeometry(.022,.065,.13),dark,[-.70+i*.053,.855,.42]);}
  this.box=new THREE.Group();s.add(this.box);this.box.position.set(-3.35,.36,-1.2);mesh(this.box,new THREE.BoxGeometry(1.05,.72,.75),mat('#75383a'));mesh(this.box,new THREE.BoxGeometry(1.09,.06,.79),brass,[0,.38,0]);
  this.moon=mesh(s,new THREE.SphereGeometry(.69,44,32),mat('#c7c1ac',.7),[0,4.3,-3.8]);this.moon.scale.z=.3;for(const x of [-.38,.38])mesh(s,new THREE.CylinderGeometry(.012,.012,3.1,6),dark,[x,5.7,-3.8]);
  this.ring=mesh(s,new THREE.TorusGeometry(2.16,.044,10,110),brass,[0,3.75,-3.85]);this.ring.rotation.x=.17;
  this.chairs=[];const seat=mat('#422b3c');for(let row=0;row<3;row++)for(let col=0;col<11;col++){const g=new THREE.Group();g.position.set((col-5)*.85,-.55-row*.1,5+row*.9);s.add(g);mesh(g,new THREE.BoxGeometry(.56,.07,.5),seat,[0,.4,0]);mesh(g,new THREE.BoxGeometry(.55,.65,.09),seat,[0,.69,.24]);this.chairs.push(g);}
  this.ambient=new THREE.HemisphereLight('#b0bcd2','#3f2534',.55);s.add(this.ambient);
  this.moonLight=new THREE.DirectionalLight('#9fb9e9',2);this.moonLight.position.set(-3,7,-4);s.add(this.moonLight);
  this.key=new THREE.SpotLight('#ffd69a',55,25,.48,.48,1.2);this.key.position.set(-2.8,5.8,3);this.key.castShadow=true;this.key.shadow.mapSize.set(2048,2048);this.key.shadow.bias=-.00015;this.key.shadow.normalBias=.013;s.add(this.key,this.key.target);
  this.ringLight=new THREE.PointLight('#a1dfe9',2,13,1.5);this.ringLight.position.copy(this.ring.position);s.add(this.ringLight);
  this.footLight=new THREE.PointLight('#edaf78',6,10,1.5);this.footLight.position.set(0,.22,2.4);s.add(this.footLight);
  for(let x=-4.7;x<=4.7;x+=.42)mesh(s,new THREE.SphereGeometry(.055,12,8),brass,[x,.02,2.35]);return this;
 }
 // Cue tags are consumed by the viewer compiler, not SceneBase callbacks.
}
