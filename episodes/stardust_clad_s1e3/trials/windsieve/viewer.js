import * as THREE from 'three';
import './bootstrap.js';
import {XiaozaoPalaceCraft,JianwangPalaceCraft,finishWindPalaceCharacters} from 'dula-assets/characters/stardust/wind-palace-craft.js';
import {WindSieveTerraceScene} from 'dula-assets/scenes/stardust/WindSieveTerraceScene.js';
import {createCombustionCombat} from 'dula-assets/lib/craft3d/combustion-combat.js';
import {perform,ease,clamp,mix} from './performance.js';
import {T,B} from './timing.js';
const W=1280,H=720,V=a=>new THREE.Vector3(...a);
const tl=await (await fetch('./timeline.json')).json();
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const stage=new WindSieveTerraceScene();stage.build();await stage.applyHybrid('../../assets3d/tex/');
const actors={xiaozao:new XiaozaoPalaceCraft(),jianwang:new JianwangPalaceCraft()};
await finishWindPalaceCharacters(actors,renderer,'../../assets3d/tex/armor_engraved_r20.png');
for(const a of Object.values(actors))stage.scene.add(a.mesh);
const camera=new THREE.PerspectiveCamera(38,W/H,.04,110);
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);const ctx=canvas.getContext('2d');
const fx=createCombustionCombat(stage.scene);
const threadMat=new THREE.MeshStandardMaterial({color:'#d4e8f0',metalness:.65,roughness:.3,emissive:'#4d6d7c',emissiveIntensity:.16});
const thread=new THREE.Mesh(new THREE.BufferGeometry(),threadMat);stage.scene.add(thread);
const strand=new THREE.Mesh(new THREE.BufferGeometry(),threadMat);stage.scene.add(strand);
const reserve=new THREE.Group();stage.scene.add(reserve);
for(let i=0;i<4;i++){
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.046+i*.002,.003,7,32),threadMat);
 ring.position.z=i*.006;reserve.add(ring);
}
const secondTip=new THREE.Mesh(new THREE.BufferGeometry(),threadMat);stage.scene.add(secondTip);
const fibers=Array.from({length:4},()=>{const m=new THREE.Mesh(new THREE.BufferGeometry(),threadMat);stage.scene.add(m);return m;});
const endpoint=()=>actors.xiaozao.windDisc.anchor.getWorldPosition(new THREE.Vector3());
const enemyHand=()=>actors.jianwang.hands.right.getWorldPosition(new THREE.Vector3());
perform(actors,T.block);const impact=endpoint();
fx.impact('block',T.block,impact,{color:'#c1edff',scale:.28,normal:[1,.2,0]});
perform(actors,T.cut_hit);const cutPoint=endpoint();
fx.impact('cut',T.cut_hit,cutPoint,{color:'#e2f5ff',scale:.19,normal:[-.8,.1,.2]});
function tube(mesh,points,r=.006){
 const old=mesh.geometry;mesh.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,r,6,false);old.dispose();
}
const head=name=>actors[name].headGroup.getWorldPosition(new THREE.Vector3()).add(V([0,.08,0]));
function framing(t){
 const h=head('xiaozao'),e=head('jianwang'),mid=h.clone().lerp(e,.5);
 if(t<B.warning)return{pos:[4.8,3.3,7.3],look:[0,1.2,-2.2],fov:43};
 if(t<B.attack)return{pos:e.clone().add(V([-.25,.02,2.05])).toArray(),look:e.clone().add(V([0,-.12,0])).toArray(),fov:32};
 if(t<B.read)return{pos:[.05,1.48,3.65],look:[.03,1.04,0],fov:38};
 if(t>=B.read+.6&&t<B.read+1.4)return{pos:e.clone().add(V([.05,-.08,1.95])).toArray(),look:e.clone().add(V([0,-.30,0])).toArray(),fov:33};
 if(t<B.yield-.9)return{pos:h.clone().add(V([.17,.015,1.65])).toArray(),look:h.clone().add(V([0,-.12,0])).toArray(),fov:30};
 if(t<B.yield){const p=endpoint();return{pos:p.clone().add(V([.08,.28,.80])).toArray(),look:p.toArray(),fov:32};}
 if(t<T.lock+.35)return{pos:[.28,1.35,3.85],look:[-.24,.91,.10],fov:36};
 if(t<B.cut)return{pos:[-.30,1.50,3.15],look:mid.clone().add(V([0,-.36,0])).toArray(),fov:36};
 if(t<B.cut+.60){const p=stage.medicine.position;return{pos:p.clone().add(V([-1.65,.65,-1.1])).toArray(),look:p.clone().add(V([0,.1,0])).toArray(),fov:36};}
 if(t<B.aftermath)return{pos:[.30,1.27,3.45],look:[.04,1.0,0],fov:36};
 if(t<B.aftermath+2)return{pos:e.clone().add(V([-.17,.01,1.85])).toArray(),look:e.clone().add(V([0,-.10,0])).toArray(),fov:30};
 return{pos:[3.2,2.2,6.8],look:[.5,1,-1.2],fov:38};
}
function draw(t,capture=true){
 const perf=perform(actors,t);stage.updateStory(t,T);
 const active=tl.lines.find(l=>t>=l.t&&t<l.audio_end);
 const a=enemyHand(),b=endpoint();
 const spare=actors.jianwang.hands.left.getWorldPosition(new THREE.Vector3());
 reserve.position.copy(spare);reserve.quaternion.copy(actors.jianwang.hands.left.getWorldQuaternion(new THREE.Quaternion()));
 secondTip.visible=t>=B.read+.6&&t<B.read+1.4;
 if(secondTip.visible){
  const target=stage.medicine.position.clone().sub(spare).normalize().multiplyScalar(.28).add(spare);
  tube(secondTip,[spare,spare.clone().lerp(target,.5).add(V([0,.03,0])),target],.0045);
 }
 const taut=t>=T.bind&&t<T.cut_hit,attack=clamp((t-B.attack)/Math.max(.1,T.block-B.attack));
 const u=taut?1:attack;
 let end=a.clone().lerp(b,u),mid=a.clone().lerp(end,.5);
 mid.y-=taut?.03:.25*(1-u);
 if(t>=T.cut_hit){
  const f=ease((t-T.cut_hit)/.45);
  end=a.clone().add(V([-.20*(1-f),-.20-.27*f,.12]));mid=a.clone().lerp(end,.5);mid.y-=.10;
  strand.visible=true;
  const fall=clamp((t-T.cut_hit)/.7),start=cutPoint.clone().lerp(V([cutPoint.x,.02,cutPoint.z]),ease(fall));
  tube(strand,[start,start.clone().add(V([.15,-.03,.08])),start.clone().add(V([.27,0,.15]))],.005);
 }else strand.visible=false;
 const wrap=clamp((t-T.bind)/.2)*(1-ease((t-B.yield)/1.4));
 if(wrap>.001&&t<T.cut_hit){
  const wrist=actors.xiaozao.hands.left.getWorldPosition(new THREE.Vector3());
  const center=b.clone().lerp(wrist,wrap),r=.037*wrap;
  tube(thread,[a,mid,b,center.clone().add(V([0,r,0])),center.clone().add(V([0,0,-r])),center.clone().add(V([0,-r,0])),center.clone().add(V([0,0,r])),center.clone().add(V([0,r,.005]))],.0045);
 }else tube(thread,[a,mid,end],.0045);
 for(const [i,m]of fibers.entries()){
  m.visible=t>=T.bind&&t<T.cut_hit+.1;
  if(m.visible){
   const dir=a.clone().sub(b).normalize(),p=b.clone().addScaledVector(dir,.015+i*.014);
   tube(m,[p,p.clone().addScaledVector(dir,.04).add(V([0,.014+i*.004,0])),p.clone().addScaledVector(dir,.065).add(V([0,.025+i*.006,.012*(i-1)]))],.0017);
  }
 }
 for(const [name,actor]of Object.entries(actors)){
  const s=perf.states[name],other=name==='xiaozao'?'jianwang':'xiaozao';
  actor.setEmotion(s.fear>.2?'pain':s.emotion,s.blink);
  actor.face.setActing({smile:0,focus:s.focus,fear:s.fear,blink:s.blink,browAsym:s.fear>.1?.5:.12,pupil:s.fear>.2?.85:1});
  actor.updateCladFX(t,1);actor.updatePalaceClad(t,{LOCK:1e6,C7:1e6,SCAR:1e6});actor.updateWindAppearance(t);
  const inspecting=(name==='xiaozao'&&t>=B.read&&t<B.read+1.2)||(name==='jianwang'&&t>B.aftermath&&t<B.aftermath+1);
  const checkCargo=(name==='jianwang'&&(t<B.attack||(t>=B.read+.6&&t<B.read+1.4)))||(name==='xiaozao'&&((t>=B.read&&t<B.read+.55)||(t>=B.cut-.45&&t<B.cut+.1)||t>B.aftermath+2));
  actor.face.lookAtWorld(checkCargo?stage.medicine.position:inspecting?endpoint():head(other));
  const env=tl.envelopes.find(l=>l.id===active?.id&&l.speaker===name);
  const jaw=env?env.jaw[Math.round((t-env.t0)/env.dt)]??0:0;
  actor.mouth.apply({jaw,width:1});
 }
 const c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??36}:framing(t);
 const shake=[T.block,T.cut_hit].reduce((s,h)=>s+(t>=h&&t<h+.20?.012*(1-(t-h)/.20):0),0);
 camera.position.set(c.pos[0]+Math.sin(t*89)*shake,c.pos[1]+Math.sin(t*71)*shake,c.pos[2]);
 camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();fx.update(t,camera,{});
 stage.scene.updateMatrixWorld(true);
 const state={t,actors:Object.fromEntries(Object.entries(perf.traces).map(([name,tr])=>[name,{maxClamp:tr.maxClamp,feet:tr.feet,root:actors[name].mesh.position.toArray(),head:head(name).toArray()}])),
  thread:{from:a.toArray(),to:b.toArray(),cut:t>=T.cut_hit},cargo:stage.medicine.position.toArray(),camera:c};
 if(!capture)return state;
 renderer.render(stage.scene,camera);renderer.render(stage.scene,camera);ctx.drawImage(renderer.domElement,0,0);
 ctx.fillStyle='#080f18';ctx.fillRect(0,0,W,26);ctx.fillRect(0,H-26,W,26);
 ctx.font='16px Microsoft YaHei';ctx.textAlign='left';ctx.fillStyle='#d1dce5';ctx.fillText('风筛宫 · 先让药过去',24,51);
 if(active){
  ctx.font='bold 27px Microsoft YaHei';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#142031';ctx.fillStyle='#f3f0df';
  const text=(active.speaker==='xiaozao'?'小凿':'缄网')+'：'+active.text;
  ctx.strokeText(text,W/2,H-53);ctx.fillText(text,W/2,H-53);
 }
 if(t>tl.duration-.35){ctx.fillStyle=`rgba(9,15,23,${ease((t-tl.duration+.35)/.35)})`;ctx.fillRect(0,0,W,H);}
 return{image:canvas.toDataURL('image/jpeg',.94).split(',')[1],state};
}
window.duration=tl.duration;window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.setFreeCamera=c=>window.freeCamera=c;
window.checkTimes=[.7,2.8,4.5,6.25,T.block-.08,T.block,T.block+.13,8,9.2,10.5,10.95,12,13.2,15,16.5,18.2,18.9,19.3,T.cut_hit,T.cut_hit+.15,21,22.3,24.5];
window.__dbg={actors,stage,camera,renderer,draw};await document.fonts.ready;window.ready=true;
