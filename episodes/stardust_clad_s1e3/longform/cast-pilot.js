import * as THREE from 'three';
import {createWindwardCast} from 'dula-assets/characters/stardust/windward-cast.js';
import {WindwardStage} from './stage.js';
import {neutral,applyPose,updateFace,ease,mix,pulse} from './pose.js';
const W=1280,H=720,V=a=>new THREE.Vector3(...a);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const stage=new WindwardStage();await stage.load();
const {actors}=await createWindwardCast(renderer,'../assets3d/tex/armor_engraved_r20.png');
for(const a of Object.values(actors))stage.scene.add(a.mesh);
const camera=new THREE.PerspectiveCamera(36,W/H,.04,140);
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d');let free=null;
const names=Object.keys(actors),labels={xiaozao:'小凿',jianwang:'缄网',weihe:'苇禾',yabo:'崖伯',mideng:'弥灯'};
function draw(t,capture=true){
 const traces={},states={},phase=t<5?'lineup':t<20?'portrait':'action';
 const idx=Math.min(4,Math.floor((t-5)/3)),selected=names[Math.max(0,idx)];
 stage.setLocation(t<20?'courtyard':'market',t,0,{wind:.6});
 for(const [i,name]of names.entries()){
  const a=actors[name],s=neutral(a,(i-2)*1.0,0,0);
  a.mesh.visible=phase==='lineup'||(phase==='portrait'&&name===selected)||(phase==='action'&&['xiaozao','weihe'].includes(name));
  if(phase==='portrait'){s.rootX=0;s.yaw=.35*Math.sin((t-5)%3*2.1);s.headPitch=.025;s.headYaw=-s.yaw*.35;}
  if(phase==='action'){
   s.rootX=name==='xiaozao'?-.65:.70;s.yaw=name==='xiaozao'?.50:-.48;
   const u=t-20,act=pulse(u,1,1.45,2.6,3.1);
   s.right.z+=.17*act;s.right.y+=.10*act;s.headPitch=-.03*act;s.twist=.09*act;s.focus=.40;
   if(name==='weihe'){s.headYaw=-.1;s.smile=.18;s.left.y+=.12*pulse(u,3.2,3.6,4.9,5.4);}
  }
  s.blink=Math.max(0,1-Math.abs((t+i*.7)%4.1-3.7)/.09);
  traces[name]=applyPose(a,s);states[name]=s;
  const other=actors[name==='xiaozao'?'weihe':'xiaozao'].headGroup.getWorldPosition(new THREE.Vector3());
  updateFace(a,s,t,phase==='action'&&name==='xiaozao'?.25*Math.max(0,Math.sin(t*12)):0,phase==='action'?other:V([0,1.7,4]));
 }
 if(free){camera.position.fromArray(free.pos);camera.lookAt(...free.lookAt);camera.fov=free.fov??36;}
 else if(phase==='lineup'){camera.position.set(0,2.1,8.5);camera.lookAt(0,1,0);camera.fov=33;}
 else if(phase==='portrait'){const h=actors[selected].headGroup.getWorldPosition(new THREE.Vector3());camera.position.copy(h).add(V([.05,.06,1.4]));camera.lookAt(h.clone().add(V([0,.04,0])));camera.fov=29;}
 else{camera.position.set(2.4,2.1,5.3);camera.lookAt(0,1.1,0);camera.fov=34;}
 camera.updateProjectionMatrix();stage.scene.updateMatrixWorld(true);
 const state={t,phase,selected,traces,rendererInfo:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}};
 if(!capture)return state;
 renderer.render(stage.scene,camera);ctx.drawImage(renderer.domElement,0,0);
 ctx.fillStyle='rgba(17,25,35,.8)';ctx.fillRect(0,660,W,60);ctx.fillStyle='#e6e4da';ctx.font='22px Microsoft YaHei';ctx.textAlign='center';
 ctx.fillText(phase==='lineup'?'风筛宫 · 五人造型样板':phase==='portrait'?labels[selected]+' · 转面与眼神': '人物关系 · 抬手、倾听与视线样板',640,698);
 return{image:canvas.toDataURL('image/jpeg',.94).split(',')[1],state};
}
window.duration=26;window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.checkTimes=[.5,4.5,5.3,6.2,8.3,9.2,11.3,12.2,14.3,15.2,17.3,18.2,21,22,24.5];
window.setFreeCamera=c=>free=c;
window.__dbg={actors,stage,camera,renderer,draw};
await document.fonts.ready;window.ready=true;
