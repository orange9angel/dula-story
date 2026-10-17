import * as THREE from 'three';
import {SceneBase} from '/engine-lib/scenes/SceneBase.js';
const mat=color=>{const m=new THREE.MeshBasicMaterial({color,toneMapped:false});m.onBeforeCompile=s=>{s.vertexShader='varying vec3 vCafePropN;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCafePropN=normalize(mat3(modelMatrix)*normal);');s.fragmentShader='varying vec3 vCafePropN;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(.76,1.0,smoothstep(-.35,.55,dot(normalize(vCafePropN),normalize(vec3(-.5,.7,.6)))));');};m.customProgramCacheKey=()=> 'cafe-prop-matte';return m;};
function box(parent,name,x,y,z,w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(parent,name,x,y,z,r,h,color){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,40),mat(color));m.name=name;m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function line(parent,points,color,width=.003){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,32,width,5,false),mat(color));parent.add(m);return m;}
export class CafeTable3D extends SceneBase {
 constructor(){
  super('CafeMusicalScene');
  this.group=new THREE.Group();this.group.name='cafe-table-3d';this.phase='table';
  const g=this.group;
  this.table=box(g,'table',-1.3,.746,-.8,1.92,.065,.66,'#c18b51');
  box(g,'table-top',-1.3,.782,-.8,1.95,.012,.68,'#e8b975');
  for(const x of [-2.08,-.52])for(const z of [-1.03,-.57])box(g,'table-leg',x,.36,z,.055,.72,.055,'#936341');
  for(let n=0;n<10;n++)line(g,[[-2.23,.789,-1.08+n*.058],[-1.62,.790,-1.09+n*.058],[-.37,.789,-1.08+n*.058]],n%2?'#ddb077':'#d6a263',.001);
  this.chairs={};for(const [kind,x] of [['Girl',-1.95],['Boy',-.65]]){
   const chair=new THREE.Group();chair.name=kind+'-chair';g.add(chair);this.chairs[kind]=chair;
   box(chair,'seat',x,.475,-1.35,.44,.045,.42,'#b47c4c');
   for(const dx of [-.17,.17])for(const z of [-1.50,-1.20])box(chair,'chair-leg',x+dx,.235,z,.035,.47,.035,'#916141');
   box(chair,'backrest',x,.80,-1.57,.43,.28,.037,'#c8965a');
   for(const dx of [-.18,.18])box(chair,'back-support',x+dx,.72,-1.57,.03,.5,.03,'#916141');
  }
  this.cups={};this.steam=[];
  for(const [kind,x,color] of [['Girl',-1.68,'#f1d9b3'],['Boy',-.88,'#a4c9cc']]){
   const cup=new THREE.Group();cup.name=kind==='Girl'?'girlCup':'boyCup';cup.position.set(x,.794,-.76);g.add(cup);this.cups[kind]=cup;
   cylinder(cup,'saucer',0,.004,0,.096,.008,'#f7edda');
   const shape=[[.038,.013],[.044,.016],[.052,.085],[.050,.092],[.045,.092],[.042,.026]].map(p=>new THREE.Vector2(...p));const body=new THREE.Mesh(new THREE.LatheGeometry(shape,40),mat(color));body.name='cup';cup.add(body);
   const coffee=new THREE.Mesh(new THREE.CircleGeometry(.044,40),mat('#704833'));coffee.rotation.x=-Math.PI/2;coffee.position.y=.079;cup.add(coffee);
   const handle=new THREE.Mesh(new THREE.TorusGeometry(.027,.007,10,28),mat(color));handle.position.set(.060,.057,0);cup.add(handle);
   for(let j=0;j<2;j++){const steam=line(g,Array.from({length:8},(_,i)=>[x+(j-.5)*.027+Math.sin(i*.8)*.006,.90+i*.017,-.76]),'#fff7e8',.0018);steam.material.transparent=true;steam.material.opacity=.45;this.steam.push(steam);}
  }
  this.notebook=box(g,'notebook',-.64,.798,-.91,.34,.012,.24,'#f7efd9');
  line(g,[[-.64,.807,-1.02],[-.64,.807,-.80]],'#b2a79a',.001);
  const drawing=[[-.72,.81,-1],[-.75,.81,-.94],[-.72,.81,-.89],[-.66,.81,-.90],[-.65,.81,-.96],[-.72,.81,-1]];line(g,drawing,'#8b7f75',.0011);
  this.pencil=box(g,'pencil',-.48,.813,-.88,.008,.008,.15,'#466178');this.pencil.rotation.y=-.5;
  this.spoon=new THREE.Group();this.spoon.name='spoon';g.add(this.spoon);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.18,8),mat('#adb9c0'));shaft.position.y=.09;this.spoon.add(shaft);
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),mat('#dde4df'));bowl.scale.set(.016,.004,.023);this.spoon.add(bowl);
  this.ready=this.readyPromise=Promise.resolve();
  this.registerCameraObstacle({type:'box',center:new THREE.Vector3(-1.3,.38,-.8),size:new THREE.Vector3(1.9,.76,.65)});
 }
  build(){return this.group;}
  ceramicPickup(){this.phase='tap';}
  sunlightPause(){this.phase='rise';}
  cafeDuet(){this.phase='dance';}
  cafeCoda(){this.phase='coda';}
  update(p,limbs){
  this.phase=p.mode==='dance'?'dance':p.cupInsert?'tap':p.standing?'rise':p.coda?'coda':'table';
  for(const steam of this.steam){steam.visible=p.steam;steam.material.opacity=.33+.10*Math.sin(p.t*1.8);}
  const endpoint=new THREE.Vector3(-1.725,.89,-.76);
  if(p.cupInsert){
   const wrist=limbs?.Girl?.joints?.right?.grip;
   if(wrist){const grip=new THREE.Vector3(...wrist);endpoint.y=.888+p.tapLift;const axis=grip.clone().sub(endpoint);this.spoon.position.copy(endpoint);this.spoon.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize());this.spoon.scale.set(1,axis.length()/.18,1);this.spoon.visible=true;this.tapProbe={tip:endpoint.toArray(),rimY:.888,grip:grip.toArray(),errorAtHit:p.tapLift};}
  }else{this.spoon.visible=true;this.spoon.position.set(-1.79,.804,-.69);this.spoon.quaternion.setFromEuler(new THREE.Euler(Math.PI/2,0,-.5));this.spoon.scale.set(1,1,1);this.tapProbe=null;}
  if(p.t<6.6&&limbs?.Boy?.joints?.right?.grip){const grip=new THREE.Vector3(...limbs.Boy.joints.right.grip),tip=new THREE.Vector3(-.65+.008*Math.sin(p.t*2),.813,-.88),axis=grip.clone().sub(tip);this.pencil.position.copy(tip).add(grip).multiplyScalar(.5);this.pencil.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),axis.clone().normalize());this.pencil.scale.z=axis.length()/.15;}
  else{this.pencil.position.set(-.48,.813,-.88);this.pencil.quaternion.setFromEuler(new THREE.Euler(0,-.5,0));this.pencil.scale.z=1;}
 }
}
