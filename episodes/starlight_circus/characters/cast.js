// Spatial rehearsal cast; final cel-cinema art is a separately reviewed layer.
import * as THREE from 'three';
import {LimbSurface,ringsGeometry,shoeGeometry,jointInk} from 'dula-assets/lib/craft3d/surface.js';
import {ArticulatedHand} from 'dula-assets/lib/craft3d/hand.js';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
const V=(x,y,z=0)=>({x,y,z}),tv=p=>new THREE.Vector3(p.x,p.y,p.z);
const material=(color,roughness=.86,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
function add(parent,g,m,pos=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
function ell(parent,pos,scale,m){const o=add(parent,new THREE.SphereGeometry(1,28,20),m,pos);o.scale.set(...scale);return o;}
const specs={
 Noa:{height:1.68,head:.155,width:.17,skin:'#d4a281',hair:'#51332d',cloth:'#227e72',lower:'#dac9a8',shape:'cloak'},
 Pip:{height:1.18,head:.14,width:.13,skin:'#865335',hair:'#4b2e23',cloth:'#a33236',lower:'#44312d',shape:'puppet'},
 Selene:{height:1.79,head:.145,width:.16,skin:'#d7b5a7',hair:'#ccd4da',cloth:'#126b83',lower:'#14586e',shape:'gown'},
 Vesper:{height:1.87,head:.153,width:.19,skin:'#b68b73',hair:'#29202e',cloth:'#352039',lower:'#201c2c',shape:'coat'}
};
class Performer{
 constructor(id){
  this.id=id;this.spec=specs[id];const s=this.spec,h=s.height;
  this.mesh=new THREE.Group();this.mesh.name=id;this.body=new THREE.Group();this.mesh.add(this.body);
  this.dims={hip:h*.47,shoulder:h*.77,half:s.width,arm:h*.195,leg:h*.223,headY:h-s.head*.98};
  this.mats={skin:material(s.skin),cloth:material(s.cloth),lower:material(s.lower),hair:material(s.hair),brass:material('#b38e50',.5,.65)};
  const d=this.dims,m=this.mats;
  this.torso=add(this.body,ringsGeometry([[d.hip-.07,s.width*.85,.10],[h*.55,s.width*.72,.09],[h*.66,s.width*.92,.11],[d.shoulder-.035,s.width,.105],[d.shoulder+.025,s.width*.55,.075]]),m.cloth);
  add(this.body,new THREE.CylinderGeometry(.047,.055,.12,16),m.skin,[0,d.shoulder+.06,0]);
  this.headGroup=new THREE.Group();this.headGroup.position.y=d.headY;this.body.add(this.headGroup);
  this.head=ell(this.headGroup,[0,0,0],[s.head*.82,s.head,s.head*.78],m.skin);
  this.faceCanvas=document.createElement('canvas');this.faceCanvas.width=this.faceCanvas.height=512;
  this.faceTexture=new THREE.CanvasTexture(this.faceCanvas);this.faceTexture.colorSpace=THREE.SRGBColorSpace;
  const faceMat=new THREE.MeshStandardMaterial({map:this.faceTexture,transparent:true,roughness:.9,depthWrite:false});
  const g=new THREE.PlaneGeometry(s.head*1.50,s.head*1.62,24,24),pa=g.attributes.position;
  for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i);pa.setZ(i,Math.sqrt(Math.max(.001,(s.head*.79)**2-x*x*.65-y*y*.18)));}g.computeVertexNormals();
  this.face=add(this.headGroup,g,faceMat);
  for(const sign of [-1,1])ell(this.headGroup,[sign*s.head*.83,-.008,0],[.031,.047,.025],m.skin);
  const cap=add(this.headGroup,new THREE.SphereGeometry(1,28,20,0,Math.PI*2,0,Math.PI*.54),m.hair,[0,.025,-.012]);cap.scale.set(s.head*.89,s.head*.94,s.head*.82);
  if(id==='Noa')for(let i=0;i<16;i++){const a=i/16*Math.PI*2;ell(this.headGroup,[Math.sin(a)*.135,.035+Math.cos(a*3)*.015,Math.cos(a)*.103],[.044,.072,.045],m.hair);}
  if(id==='Selene')ell(this.headGroup,[0,.105,-.10],[.087,.10,.08],m.hair);
  if(id==='Vesper'){
   this.mask=add(this.headGroup,new THREE.TorusGeometry(.073,.022,8,28,Math.PI),m.brass,[.041,.025,.12]);this.mask.rotation.z=-.2;
   for(const sign of [-1,1]){const lapel=add(this.body,new THREE.BoxGeometry(.07,.34,.017),material('#60475a'),[sign*.084,h*.685,.115]);lapel.rotation.z=sign*.28;}
  }
  if(id==='Pip'){
   this.jaw=add(this.headGroup,new THREE.BoxGeometry(.16,.058,.14),m.skin,[0,-.095,.012]);
   for(const sign of [-1,1]){const tie=add(this.body,new THREE.ConeGeometry(.046,.075,3),material('#386f91'),[sign*.043,d.shoulder-.045,.125]);tie.rotation.z=sign*Math.PI/2;}
   for(let i=0;i<3;i++)ell(this.body,[0,d.shoulder-.14-i*.095,.12],[.015,.015,.012],m.brass);
  }
  if(id==='Noa'){
   const cape=add(this.body,ringsGeometry([[h*.35,.27,.16],[h*.57,.23,.14],[d.shoulder,.205,.12]]),m.cloth);cape.name='teal-cloak';
   const gp=cape.geometry.attributes.position;for(let i=0;i<gp.count;i++)if(gp.getZ(i)>.015)gp.setZ(i,.015);gp.needsUpdate=true;cape.geometry.computeVertexNormals();
   ell(this.body,[0,d.shoulder-.075,.135],[.032,.038,.027],m.brass);
  }
  if(s.shape==='gown')add(this.body,ringsGeometry([[.12,.35,.22],[h*.34,.30,.19],[d.hip,.17,.115],[h*.57,.13,.095]]),m.lower);
  this.limbs={};this.hands={};this.feet={};this.joints=[];
  for(const [side,sign] of [['left',-1],['right',1]]){
   this.limbs[side+'Arm']=new LimbSurface(this.mesh,m.skin,[[0,.048],[.38,.042],[.7,.032],[1,.026]]);
   this.limbs[side+'Sleeve']=new LimbSurface(this.mesh,m.cloth,[[0,.061],[.5,.046],[1,.037]],{end:id==='Selene'?.24:.67});
   this.limbs[side+'Leg']=new LimbSurface(this.mesh,m.lower,[[0,.074],[.45,.052],[1,.035]]);
   const hand=new ArticulatedHand(sign,id==='Vesper'?material('#b8bdc3',.6,.15):m.skin,jointInk);hand.scale.setScalar(id==='Pip'?.58:.72);hand.outline.visible=false;this.mesh.add(hand);this.hands[side]=hand;
   const foot=add(this.mesh,shoeGeometry(),material('#34292c'));foot.scale.setScalar(id==='Pip'?.75:.95);this.feet[side]=foot;
   if(id==='Pip')for(const label of ['Elbow','Knee']){const j=ell(this.mesh,[0,0,0],[.048,.048,.048],m.brass);this.joints.push({side,label,mesh:j});}
  }
  this.mesh.traverse(o=>{if(o.isMesh){o.receiveShadow=true;if(o.material===jointInk)o.visible=false;}});this.setFace({});
 }
 setFace({blink=0,jaw=0,smile=0,worry=0,gaze=0}={}){
  const c=this.faceCanvas.getContext('2d');c.clearRect(0,0,512,512);c.lineCap='round';c.strokeStyle='#473334';
  for(const sign of [-1,1]){const x=256+sign*84,y=216;c.fillStyle='#eee4d7';
   c.beginPath();c.ellipse(x,y,45,Math.max(2,25*(1-blink)),0,0,Math.PI*2);c.fill();
   c.save();c.clip();c.fillStyle=this.id==='Pip'?'#202327':'#71563e';c.beginPath();c.ellipse(x+gaze*13,y,18,23,0,0,Math.PI*2);c.fill();c.fillStyle='#201e26';c.beginPath();c.ellipse(x+gaze*13,y,9,21,0,0,Math.PI*2);c.fill();c.fillStyle='#fff4d9';c.beginPath();c.arc(x+gaze*13-5,y-8,4,0,Math.PI*2);c.fill();c.restore();
   c.lineWidth=6;c.beginPath();c.moveTo(x-44,y-3);c.quadraticCurveTo(x,y-35*(1-blink),x+44,y-3);c.stroke();
   c.lineWidth=8;c.beginPath();c.moveTo(x-42,164+sign*worry*16);c.quadraticCurveTo(x,151,x+42,166-sign*worry*16);c.stroke();
  }
  c.strokeStyle='#936959';c.lineWidth=3;c.beginPath();c.moveTo(254,248);c.lineTo(247,282);c.quadraticCurveTo(256,288,266,281);c.stroke();
  c.strokeStyle='#713f42';c.lineWidth=5;c.beginPath();c.moveTo(218,332);c.quadraticCurveTo(256,332+smile*22,294,332);c.stroke();
  if(jaw>.03){c.fillStyle='#43242b';c.beginPath();c.ellipse(256,337,32,4+jaw*27,0,0,Math.PI*2);c.fill();}
  this.faceTexture.needsUpdate=true;if(this.jaw)this.jaw.position.y=-.095-jaw*.022;
 }
 setPose(s){
  const d=this.dims;this.mesh.position.set(...(s.root??[0,0,0]));this.mesh.rotation.set(0,s.yaw??0,s.roll??0);this.body.position.y=s.bob??0;this.body.rotation.x=s.lean??0;this.headGroup.rotation.set(s.headPitch??0,s.headYaw??0,s.headRoll??0);
  const report={};for(const [side,sign] of [['left',-1],['right',1]]){
   const sh=V(sign*d.half,d.shoulder+(s.bob??0),0),hand=s[side]??V(sign*(d.half+.04),d.hip+.09,.04);
   const el=twoBone(sh,hand,V(sign*.25,-.45,-.3),d.arm,d.arm),arm=[sh,el,hand];
   const hip=V(sign*d.half*.55,d.hip+(s.bob??0),0),ankle=s[side+'Foot']??V(sign*.11,.09,.015);
   const knee=twoBone(hip,ankle,V(0,0,1),d.leg,d.leg),leg=[hip,knee,ankle];
   this.limbs[side+'Arm'].update(arm);this.limbs[side+'Sleeve'].update(arm);this.limbs[side+'Leg'].update(leg);
   const h=this.hands[side],x=tv(hand).sub(tv(el)).normalize(),up=new THREE.Vector3(0,1,0);let y=up.addScaledVector(x,-up.dot(x)).normalize();if(sign<0)y.negate();const z=x.clone().cross(y).normalize();y=z.clone().cross(x).normalize();h.position.copy(tv(hand));h.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));h.setGesture({fist:.12,...s[side+'Gesture']});
   this.feet[side].position.copy(tv(ankle));this.feet[side].rotation.x=s[side+'FootPitch']??0;
   for(const j of this.joints.filter(j=>j.side===side))j.mesh.position.copy(tv(j.label==='Elbow'?el:knee));
   report[side]={shoulder:sh,elbow:el,wrist:hand,knee,ankle,reach:tv(hand).distanceTo(tv(sh))/(2*d.arm)};
  }this.mesh.updateMatrixWorld(true);this.report=report;return report;
 }
}
export class Noa extends Performer{constructor(){super('Noa');}}
export class Pip extends Performer{constructor(){super('Pip');}}
export class Selene extends Performer{constructor(){super('Selene');}}
export class Vesper extends Performer{constructor(){super('Vesper');}}
