import * as THREE from 'three';
import {createWindwardCast} from 'dula-assets/characters/stardust/windward-cast.js';
import {neutral,applyPose,updateFace,ease,mix,clamp} from './pose.js';
const V=a=>new THREE.Vector3(...a),TAU=Math.PI*2;
export function strand(scene,color,width=.008,segments=24){
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(segments*18),3));
 const mat=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:1});
 const mesh=new THREE.Mesh(geo,mat);mesh.frustumCulled=false;scene.add(mesh);
 return{mesh,update(from,to,camera,{sag=0,alpha=1,curve=null}={}){
  mesh.visible=alpha>0;if(!mesh.visible)return;mat.opacity=alpha;
  const point=u=>curve?curve(u):from.clone().lerp(to,u).add(V([0,-Math.sin(u*Math.PI)*sag,0]));
  const attr=geo.attributes.position;let k=0;
  for(let i=0;i<segments;i++){
   const a=point(i/segments),b=point((i+1)/segments),t=b.clone().sub(a).normalize(),eye=camera.position.clone().sub(a).normalize();
   let normal=new THREE.Vector3().crossVectors(t,eye).normalize().multiplyScalar(width*.5);
   if(normal.lengthSq()<1e-8)normal=V([width*.5,0,0]);
   for(const p of[a.clone().sub(normal),b.clone().sub(normal),a.clone().add(normal),a.clone().add(normal),b.clone().sub(normal),b.clone().add(normal)])attr.setXYZ(k++,p.x,p.y,p.z);
  }attr.needsUpdate=true;
 }};
}
function simpleMat(color,emissive=null){return new THREE.MeshStandardMaterial({color,roughness:.60,metalness:emissive?0:.45,...(emissive?{emissive,emissiveIntensity:1}: {})});}
function addMesh(parent,geometry,material,pos=[0,0,0]){const o=new THREE.Mesh(geometry,material);o.position.fromArray(pos);o.castShadow=true;parent.add(o);return o;}
function lantern(){
 const g=new THREE.Group(),brass=simpleMat('#bd9d62'),glass=simpleMat('#ffe0a1','#e4a647');
 addMesh(g,new THREE.CylinderGeometry(.085,.075,.17,12),glass,[0,-.12,0]);
 for(const y of[-.225,-.025])addMesh(g,new THREE.CylinderGeometry(.10,.10,.025,12),brass,[0,y,0]);
 for(let i=0;i<4;i++){const a=i*Math.PI/2;addMesh(g,new THREE.CylinderGeometry(.008,.008,.20,6),brass,[Math.cos(a)*.085,-.125,Math.sin(a)*.085]);}
 const handle=addMesh(g,new THREE.TorusGeometry(.065,.007,7,30),brass,[0,.045,0]);handle.scale.y=1.1;
 g.userData.glass=glass;return g;
}
export async function createStoryProps(stage,actors,renderer,textureUrl){
 const root=new THREE.Group();root.name='story-props';stage.scene.add(root);
 const ratchet=new THREE.Group();ratchet.position.set(1.02,1.67,-.75);stage.groups.windwell.add(ratchet);
 stage.bar(stage.groups.windwell,[1.02,.60,-.75],[1.02,1.62,-.75],.025,'brass');
 addMesh(ratchet,new THREE.CylinderGeometry(.065,.065,.05,12),simpleMat('#8b7856')).rotation.x=Math.PI/2;
 const ratchetArm=stage.box(ratchet,.028,.19,.024,0,.065,.04,'brass','ratchet-lock-handle');
 const lamp=lantern();root.add(lamp);
 const lampLight=new THREE.PointLight('#ffd494',.45,2.4,2);lampLight.position.y=-.12;lamp.add(lampLight);
 const heldPlant=stage.warmPlant(root,[0,0,0],false);
 const clapperStone=stage.box(root,.48,.64,.20,.65,.32,-.25,'stone','clapper-stone');
 const clapper=new THREE.Group();root.add(clapper);
 addMesh(clapper,new THREE.CylinderGeometry(.012,.012,.15,10),simpleMat('#987c50'),[0,.07,0]);
 addMesh(clapper,new THREE.SphereGeometry(.036,14,10),simpleMat('#987c50'),[0,-.02,0]);
 const netRock=addMesh(root,new THREE.DodecahedronGeometry(1,1),stage.materials.rock);netRock.scale.set(.43,.20,.30);
 const stoneNet=Array.from({length:10},()=>strand(root,'#c7bbd5',.006,16));
 const markCanvas=document.createElement('canvas');markCanvas.width=markCanvas.height=128;
 const markCtx=markCanvas.getContext('2d');markCtx.clearRect(0,0,128,128);markCtx.font='90px KaiTi, STKaiti, serif';markCtx.textAlign='center';markCtx.textBaseline='middle';markCtx.fillStyle='#c2b39a';markCtx.fillText('缄',64,64);
 const markTexture=new THREE.CanvasTexture(markCanvas);markTexture.colorSpace=THREE.SRGBColorSpace;
 const makerMark=addMesh(actors.jianwang.rigs.right.rig,new THREE.PlaneGeometry(.060,.060),new THREE.MeshBasicMaterial({map:markTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide}),[.073,0,.10]);
 makerMark.rotation.y=Math.PI/2;makerMark.name='old-bridge-maker-mark';
 const rescueRing=addMesh(actors.jianwang.body,new THREE.TorusGeometry(.028,.006,8,20),simpleMat('#b9a887'),[.15,1.14,.12]);
 rescueRing.name='enemy-rescue-harness-ring';
 const lid=stage.box(root,.75,.065,1.1,0,.05,0,'wood','basket-lid-step');
 const benchBlocks=[-.18,.58].map(z=>stage.box(root,.42,.44,.32,.6,.22,z,'wood','resident-bench-support'));
 const brokenPlant=stage.warmPlant(root,[.95,.02,.95],true);
 const brokenBud=brokenPlant.children.at(-1);brokenBud.position.set(.18,.07,.06);brokenBud.rotation.z=-1.0;
 const brokenStem=stage.curve(brokenPlant,[[0,.25,0],[.07,.16,.02],[.18,.07,.06]],.009,'plant');brokenPlant.visible=false;
 const box=stage.box(root,.55,.32,.34,0,.17,0,'wood','toolbox');
 const bowl=new THREE.Group();root.add(bowl);
 addMesh(bowl,new THREE.SphereGeometry(.095,20,12,0,TAU,Math.PI/2,Math.PI/2),simpleMat('#ba8e65'));bowl.rotation.x=Math.PI;
 const band=strand(root,'#b44b3a',.035,14),black=strand(root,'#2e363b',.023),yellow=strand(root,'#b79549',.023),red=strand(root,'#b55541',.023),rescue=strand(root,'#d5c3a0',.025);
 const threads=Array.from({length:18},(_,i)=>strand(root,i%3?'#bbb2d1':'#e9e0ed',i%3?.003:.005,16));
 const silverDust=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:'#e4eeee',size:.013,transparent:true,opacity:.65,depthWrite:false}));
 silverDust.geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(150*3),3));root.add(silverDust);
 const h=actors.xiaozao,disc=h.windDisc.root,discOriginal={parent:disc.parent,position:disc.position.clone(),quaternion:disc.quaternion.clone(),scale:disc.scale.clone()};
 // A real six-sector lattice disc, each sector can break without restoring at a camera cut.
 for(const c of disc.children)c.visible=false;
 const petals=[],mat=simpleMat('#bed8df'),dark=simpleMat('#557b8c');
 const core=addMesh(disc,new THREE.TorusGeometry(.074,.009,8,48),mat);core.rotation.x=Math.PI/2;
 const boss=addMesh(disc,new THREE.SphereGeometry(.061,20,12),mat);boss.scale.y=.27;
 for(let i=0;i<6;i++){
  const p=new THREE.Group();p.rotation.y=i*TAU/6;disc.add(p);petals.push(p);
  const arc=addMesh(p,new THREE.TorusGeometry(.215,.010,8,22,TAU/6-.07),mat);arc.rotation.x=Math.PI/2;arc.rotation.z=.035;
  for(const a of[.04,.52,1.0]){
   stage.curve(p,[[Math.cos(a)*.075,0,Math.sin(a)*.075],[Math.cos(a)*.14,.012,Math.sin(a)*.14],[Math.cos(a)*.21,0,Math.sin(a)*.21]],.006,'metal');
  }
  for(const r of[.125,.17]){const line=addMesh(p,new THREE.TorusGeometry(r,.004,6,18,TAU/6-.12),dark);line.rotation.x=Math.PI/2;line.rotation.z=.06;}
 }
 const discDebris=Array.from({length:6},()=>{const o=addMesh(root,new THREE.BoxGeometry(.075,.008,.10),mat);o.visible=false;return o;});
 const detachedBracer=addMesh(root,new THREE.CylinderGeometry(.052,.044,.16,12,1,true),mat);detachedBracer.visible=false;
 const scratchMat=new THREE.MeshBasicMaterial({color:'#9b675c',side:THREE.DoubleSide});
 const bareForearm=new THREE.Group();h.rigs.left.rig.add(bareForearm);
 const skin=new THREE.MeshStandardMaterial({color:'#e7c6b2',roughness:.87});
 const sleeve=addMesh(bareForearm,new THREE.CylinderGeometry(.037,.047,.145,18,3),skin,[0,0,.09]);sleeve.rotation.x=Math.PI/2;
 for(const offset of[-.014,.010]){
  const scar=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V([-.039,offset,.055]),V([-.042,offset+.009,.090]),V([-.037,offset+.007,.12])]),12,.0019,5,false),scratchMat);bareForearm.add(scar);
 }
 const wristBand=addMesh(h.rigs.left.rig,new THREE.TorusGeometry(.047,.005,6,32),simpleMat('#aa5345'),[0,0,.13]);
 // Three quiet residents retain the facial and articulated-limb system, but have distinct practical costumes.
 const residentsCast=await createWindwardCast(renderer,textureUrl,{roles:['weihe','yabo','mideng']});
 const residents=Object.values(residentsCast.actors);
 for(const[i,a]of residents.entries()){
  root.add(a.mesh);a.mesh.name=`resident-${i}`;a.mesh.scale.multiplyScalar([.96,.95,1.01][i]);a.headGroup.scale.x*=[1.05,.94,1.04][i];
  const skin=['#c59b7d','#e0c4ac','#d3ad92'][i],hair=['#292c2d','#343c49','#b09c74'][i];
  a.face.skull.material.color.set(skin);a.sculptedHair.root.traverse(o=>{if(o.isMesh)o.material.color.set(hair);});
  a.mesh.traverse(o=>{if(o.isMesh&&o.userData.metalClad){o.material.color.set(['#687d75','#65798b','#8e7962'][i]);o.material.roughness=.65;o.material.metalness=.32;}});
  for(const e of a.windwardExtras)e.visible=false;
  if(i===0){const basket=stage.basket(a.body,[0,.95,-.21]);basket.scale.set(.60,.66,.55);}
  if(i===1){const wrap=addMesh(a.headGroup,new THREE.SphereGeometry(1,22,14,0,TAU,0,1.5),simpleMat('#536f9a'),[0,.15,-.01]);wrap.scale.set(.147,.112,.139);}
  if(i===2){const shawl=addMesh(a.body,new THREE.ConeGeometry(.23,.15,20,1,true),simpleMat('#b6a184'),[0,1.25,0]);shawl.scale.z=.75;}
 }
 function hand(name,side='right'){return actors[name].hands[side].getWorldPosition(new THREE.Vector3());}
 function waist(name){const a=actors[name];return name==='jianwang'?rescueRing.getWorldPosition(new THREE.Vector3()):a.body.localToWorld(V([0,a.dimensions.hipIdle+.08,-.09]));}
 function discAttach(side){
  // Preserve a single attachment transform in forearm space across the handoff.
  const parent=side==='left'?discOriginal.parent:h.rigs.right.rig;
  if(disc.parent!==parent)parent.add(disc);
  disc.position.copy(discOriginal.position);disc.quaternion.copy(discOriginal.quaternion);disc.scale.copy(discOriginal.scale);
  if(side==='right'){disc.position.x=-disc.position.x;disc.rotateY(Math.PI);}
 }
 function update(state,camera){
  const {t,n,story:s,states,beat}=state;
  root.visible=!s.cutaway;lamp.visible=states.mideng.visible||n===2;
  netRock.visible=!!s.netRock;
  if(netRock.visible){
   const u=state.lt,y=2.18+Math.max(0,1.4-1.4*u*u)+.06*Math.sin(Math.max(0,u-1)*8)*Math.exp(-Math.max(0,u-1)*2);
   netRock.position.set(-.40,y,.45);netRock.rotation.set(.07,1.1,.09*Math.sin(t*.7));
  }
  for(const[i,o]of stoneNet.entries()){
   const v=(i%4-.5*3)*.23,points=i<4?[[-.95,2.04,.45+v],[.28,2.04,.45+v]]:[[-.40+v,2.04,-.1],[-.40+v,2.04,1.0]];
   o.update(i>=8?hand('jianwang','right'):V(points[0]),i>=8?V([.28,2.04,i===8?-.10:1.0]):V(points[1]),camera,{alpha:s.netRock?.68:0,sag:i>=8?0:.06});
  }
  if(s.lampHeld&&lamp.visible){lamp.position.copy(hand('mideng','left').lerp(hand('mideng','right'),.5));lamp.position.y-=.035;lamp.rotation.set(0,0,.03*Math.sin(t*1.6));}
  else{lamp.position.set(...(beat.scene==='store'?[-2.6,.26,1.0]:[2.3,2.05,-.58]));lamp.rotation.set(0,0,0);}
  lamp.userData.glass.color.set(s.lampOn?'#ffe0a1':'#4b5862');lamp.userData.glass.emissiveIntensity=s.lampOn?.85:0;lampLight.intensity=s.lampOn?.40:0;
  heldPlant.visible=!!s.plantHeld;
  ratchetArm.rotation.z=-Math.PI*.5*(n<31?0:n===31?(s.ratchetTurn??0):1);
  if(heldPlant.visible){heldPlant.position.copy(hand(s.plantCarrier,'left').lerp(hand(s.plantCarrier,'right'),.5));heldPlant.position.y-=.22;}
  stage.props.courtyardPlant.visible=!s.plantHeld;
  stage.props.courtyardPlant.position.set(n===23?1.45:1.9,.7,s.plantAside?-.95:-.7);
  clapperStone.visible=clapper.visible=!!s.clapper;
  if(s.clapperPlaced){clapper.position.set(.65,.69,-.25);clapper.rotation.set(Math.PI/2,0,.3);}
  else{clapper.position.copy(hand('yabo','right')).add(V([0,-.11,0]));clapper.rotation.set(0,0,0);}
  lid.visible=!!s.lidBridge||!!s.residentBench;
  if(lid.visible){lid.position.set(...(s.residentBench?[.6,.47,.2]:[1.8,.035,0]));lid.rotation.y=s.residentBench?0:Math.PI/2;}
  for(const o of benchBlocks)o.visible=!!s.residentBench;
  brokenPlant.visible=!!s.brokenBud;
  box.visible=!!s.toolbox;if(box.visible)box.position.set(.6+(s.toolboxSlide??0),.17-(s.platformDrop??0),.45);
  bowl.visible=!!s.bowlHeld;if(bowl.visible)bowl.position.copy(hand('yabo','right')).add(V([.04,0,.02]));
  wristBand.visible=!!s.wristBand;
  bareForearm.visible=!!s.bracerLost;
  if(h.gauntlets?.left){h.gauntlets.left.root.visible=!s.bracerLost;for(const finger of h.gauntlets.left.fingers)finger.visible=!s.bracerLost;}
  const d=Math.max(0,Math.min(6,Math.floor(s.discBroken)));
  for(const[i,p]of petals.entries())p.visible=i>=d;
  disc.visible=n<43||n===46;
  if(s.discPlaced){
   if(disc.parent!==root)root.add(disc);
   disc.position.set(-.35,.24+(s.gate??0)*2.3,-1.68);disc.rotation.set(Math.PI/2,0,.16);disc.scale.setScalar(1);
  }else if(n===46){
   if(disc.parent!==root)root.add(disc);disc.position.set(.7,.84,-.52);disc.rotation.set(0,0,0);disc.scale.setScalar(1);
  }else discAttach(s.discSide);
  for(const o of discDebris)o.visible=false;
  if(n===40){
   const times=[state.eventTimes.impacts[0]?.time??0];// Actual sector break events are the final three wind loads.
   const events=[state.beat.lineIds[1],state.beat.lineIds[5],state.beat.lineIds[8]];
   for(let i=0;i<3;i++){
    const c=state.windWaves?.[i];if(c===undefined)continue;
    const u=t-c;if(u>=0&&u<2){const o=discDebris[i];o.visible=true;o.position.set(-.35+Math.sin(i*2)*u*.3,.6-u*u,-1.65-u*.5);o.rotation.set(u*4,i,u*3);}
   }
  }
  detachedBracer.visible=n===35&&s.bracerLost;
  if(detachedBracer.visible){const u=clamp((t-state.beat.start)/Math.max(.1,state.bt));detachedBracer.position.copy(hand('jianwang','left')).add(V([0,-.09,0]));detachedBracer.rotation.z=.6;}
  const palm=hand('jianwang','right'),leftPalm=hand('jianwang','left');
  for(const[i,o]of threads.entries()){
   let alpha=0,a=palm,b=V([0,0,0]),sag=0;
   if(s.threadMode==='web'&&['courtyard','bridge'].includes(beat.scene)){
    alpha=.60;const side=i%2?-1:1;
    a=i<7?palm:V([side*3.1,.5+(i%5)*.43,-1.0]);
    b=V([-side*(2.1+(i%3)*.4),.25+(i%7)*.42,-.7+(i%3)*.25]);
    if(beat.scene==='bridge'){a=V([-4.5,.70+(i%4)*.14,-.75]);b=V([4.5,.7+(i%3)*.28,.75]);}
   }else if(['duel','trapped'].includes(s.threadMode)&&i<5){
    alpha=.75;a=i%2?palm:leftPalm;b=i<2?hand('xiaozao','left'):V([i%2?2.5:-2.5,2.4,-1.2]);
   }else if(beat.scene==='windwell'&&n>=14&&n<39&&i<9){
    alpha=.60;a=i<4?palm:leftPalm;b=V([Math.sin(i*2.4)*2.6,1.25+Math.cos(i*2.4)*1.1,-1.65]);sag=.02;
   }else if(n>=39&&n<=40&&i<3){alpha=.75;a=leftPalm;b=V([2.5,2.7,-1]);}
   o.update(a,b,camera,{alpha,sag});
  }
  const safe=s.safety||n>=27&&n<43;
  const platform=V([-.8,-(s.platformDrop??0),.25]);
  black.update((n===41&&s.blackClip>.5)||n===42?platform:waist('xiaozao'),V([-.7,2.7,-1]),camera,{alpha:safe&&states.xiaozao.visible?1:0,sag:n>=41?.03:.28});
  yellow.update(waist('weihe'),V([-2.6,2.7,n>=41?2.12:-1]),camera,{alpha:safe&&states.weihe.visible?1:0,sag:n>=41?.03:.30});
  red.update(waist('mideng'),V([2.6,2.7,-1]),camera,{alpha:safe&&states.mideng.visible?1:0,sag:.18});
  rescue.update(n===42?(s.enemyBelay?waist('jianwang'):hand('jianwang','right')):hand('weihe','right'),hand('yabo','right'),camera,{alpha:n>=41&&n<=42?1:0,sag:.04});
  band.update(hand('weihe','right'),n===25?hand('xiaozao','right'):n===42?waist('weihe'):(beat.scene==='store'?stage.props.storeBasket:stage.props.bridgeBasket).getWorldPosition(new THREE.Vector3()).add(V([.30,.42,0])),camera,{alpha:s.redTie||n===3||n===16||n===42?.9:0,sag:n===25?.01:.07});
  silverDust.visible=!!s.silverDust||n===40;
  if(silverDust.visible){
   const p=silverDust.geometry.attributes.position;
   for(let i=0;i<p.count;i++){const u=(i*.618+t*.27)%1;p.setXYZ(i,-1+u*3,1+(Math.sin(i*3.7)*.5),-.3+Math.cos(i*2.4)*.65);}
   p.needsUpdate=true;
  }
  const residentStates=[];
  for(const[i,a]of residents.entries()){
   const r=s.residents.find(r=>r.id===i);a.mesh.visible=!!r;
   if(!r)continue;
   const p=neutral(a,r.x,r.z,r.walk?Math.atan2(r.walk.to[0]-r.walk.from[0],r.walk.to[1]-r.walk.from[1]):-Math.PI/2);
   p.rootY=r.lower??0;p.drop=r.sit?.31:r.kneel?.35:.04;p.lean=r.sit?.10:r.kneel?.18:.03;p.focus=.38;p.fear=n<18?.24:.08;
   if(r.sit)p.feetZ=[.25,.22];
   if(r.walk){
    const u=clamp((t-r.walk.start)/(r.walk.end-r.walk.start));p.walk=u>0&&u<1?{from:r.walk.from,to:r.walk.to,facingYaw:p.yaw,settle:ease((u-.94)/.06)}:null;p.feetZ=[0,0];
    p.lean=.045;if(r.limp)p.drop+=.035*Math.sin((t-r.walk.start)*3)**2;
   }
   p.left.y-=r.sit?.17:0;p.right.y-=r.sit?.17:0;p.headPitch=r.kneel?.20:.04;p.blink=pulseBlink(t+i);
   const trace=applyPose(a,p);updateFace(a,p,t,0,actors.weihe.headGroup.getWorldPosition(new THREE.Vector3()));residentStates.push({id:i,...trace});
  }
  return{residentStates,discBroken:d,grips:{lamp:lamp.visible&&s.lampHeld?lamp.position.distanceTo(hand('mideng','left').lerp(hand('mideng','right'),.5)):null}};
 }
 return{update,root,lamp,disc,petals,residents,threads,hand,clapper,makerMark,netRock,rescueRing};
}
function pulseBlink(t){const d=(t%4.7)-4.1;return Math.max(0,1-Math.abs(d)/.085);}
