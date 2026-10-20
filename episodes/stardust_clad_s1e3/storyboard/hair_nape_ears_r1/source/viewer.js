import * as THREE from 'three';
import '../windsieve/bootstrap.js';
import {XiaozaoPalaceCraft,JianwangPalaceCraft,finishWindPalaceCharacters} from 'dula-assets/characters/stardust/wind-palace-craft.js';
import {installSculptedHair} from 'dula-assets/characters/stardust/sculpted-hair.js';
import {installDrawnEars} from 'dula-assets/characters/stardust/drawn-ears.js';
import {perform} from '../windsieve/performance.js';
const W=1280,H=720;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W/2,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const stage=new THREE.Scene();stage.background=new THREE.Color('#777f89');
stage.add(new THREE.HemisphereLight('#d5e4ef','#495264',2));
const key=new THREE.DirectionalLight('#fff3df',2);key.position.set(-3,5,4);stage.add(key);
const actors={xiaozao:new XiaozaoPalaceCraft(),jianwang:new JianwangPalaceCraft()};
await finishWindPalaceCharacters(actors,renderer,'../../assets3d/tex/armor_engraved_r20.png');
const a=actors.xiaozao;stage.add(a.mesh);
a.beforeHair=installSculptedHair(a,{contourFringe:true,graphicMass:true});
installSculptedHair(a,{contourFringe:true,graphicMass:true,neckLength:true});
installDrawnEars(a);
const beforeCap=a.beforeHair.root.getObjectByName('inner-scalp').geometry.attributes.position.array;
const afterCap=a.sculptedHair.root.getObjectByName('inner-scalp').geometry.attributes.position.array;
const unchangedScalp=beforeCap.length===afterCap.length&&beforeCap.every((v,i)=>v===afterCap[i]);
const camera=new THREE.PerspectiveCamera(27,640/720,.03,30);
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d');
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function angles(t){
 if(t<1)return{head:0,pitch:0,body:0};
 if(t<2)return{head:.72*ease((t-1)/.45),pitch:0,body:0};
 if(t<3)return{head:.72-1.44*ease((t-2)/.45),pitch:0,body:0};
 if(t<4)return{head:-.72*(1-ease((t-3)/.4)),pitch:.2*Math.sin((t-3)*Math.PI),body:0};
 if(t<8)return{head:0,pitch:0,body:(t-4)/4*Math.PI*2};
 if(t<12)return{head:-.35,pitch:0,body:0};
 return{head:0,pitch:.30*Math.sin((t-12)*Math.PI),body:t<14?0:Math.PI};
}
function lag(t,field){
 // Finite analytic convolution: delayed response settles after a stop.
 let total=0,weight=0;
 for(let i=1;i<=24;i++){
  const delay=i/120,w=Math.exp(-delay/0.065),before=angles(Math.max(0,t-delay)),now=angles(t);
  total+=(before[field]-now[field])*w;weight+=w;
 }
 return total/weight;
}
function draw(t,capture=true){
 const angle=angles(t);
 perform(actors,0);a.mesh.visible=true;a.mesh.rotation.set(0,angle.body,0);a.mesh.position.set(0,0,0);
 a.headGroup.rotation.set(angle.pitch,angle.head,0);
 a.updateCladFX(0,1);a.updatePalaceClad(0,{LOCK:1e6,C7:1e6,SCAR:1e6});
 a.updateWindAppearance(t);a.face.setActing({smile:0,focus:.45,fear:0,blink:0});
 const light=t<8||t>=12?new THREE.Vector3(-3,5,4):new THREE.Vector3(-3*Math.cos((t-8)*Math.PI/2),5,4);
 key.position.copy(light);
 stage.updateMatrixWorld(true);
 const hp=a.headGroup.getWorldPosition(new THREE.Vector3());
 camera.position.set(0,hp.y+.11,1.42);camera.lookAt(0,hp.y+.11,0);camera.updateProjectionMatrix();
 a.face.lookAtWorld(new THREE.Vector3(0,hp.y+.1,3));a.mouth.apply({jaw:0,width:1});
 a.sculptedHair.update({lagYaw:lag(t,'head'),lagPitch:lag(t,'pitch'),lightDirection:light});
 a.beforeHair.update({lagYaw:lag(t,'head'),lagPitch:lag(t,'pitch'),lightDirection:light});
 let maxRootShift=0,maxTipShift=0,nonFinite=0;
 for(const p of a.sculptedHair.parts)for(const {g,rest,columns}of p.geometries){
  const v=g.attributes.position;
  for(let i=0;i<v.count;i++){
   const shift=Math.hypot(v.getX(i)-rest[i*3],v.getY(i)-rest[i*3+1],v.getZ(i)-rest[i*3+2]);
   if(!Number.isFinite(shift))nonFinite++;
   if(i<columns)maxRootShift=Math.max(maxRootShift,shift);
   if(i>=v.count-columns)maxTipShift=Math.max(maxTipShift,shift);
  }
 }
 const state={t,angle,head:hp.toArray(),light:light.toArray(),hair:'neck-length-mass-r1',baseline:'mass-r6',unchangedScalp,
  lagYaw:lag(t,'head'),lagPitch:lag(t,'pitch'),maxRootShift,maxTipShift,nonFinite};
 if(!capture)return state;
 for(const candidate of [false,true]){
  a.softPortrait.hair.visible=false;
  a.beforeHair.root.visible=!candidate;
  a.sculptedHair.root.visible=candidate;
  a.drawnEars.setEnabled(candidate);
  renderer.render(stage,camera);ctx.drawImage(renderer.domElement,candidate?640:0,0);
 }
 ctx.fillStyle='#131c26';ctx.fillRect(0,0,W,52);ctx.fillRect(0,666,W,54);
 ctx.fillStyle='#edf0ed';ctx.font='22px Microsoft YaHei';ctx.textAlign='center';
 ctx.fillText('上一轮 R6 · 原长度与耳朵',320,34);
 ctx.fillText('本轮 · 鬓角、及颈后发与耳部修订',960,34);
 ctx.font='18px Microsoft YaHei';
 ctx.fillText('小凿 · '+(t<4?'转头与停头':t<8?'模型各面检查':t<12?'头发主光变化（脸部光照固定）':'正面与后脑俯仰检查')+' · 同一脸、衣甲与机位',640,700);
 ctx.fillStyle='#ccd5db';ctx.fillRect(639,52,2,614);
 return{image:canvas.toDataURL('image/jpeg',.96).split(',')[1],state};
}
window.duration=16;window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.checkTimes=[.5,1.3,1.55,1.7,2.55,3.5,4,4.5,5,5.5,6,6.5,7,8.5,9.5,10.5,11.5,12.5,13.5,14.5,15.5];
window.setFreeCamera=()=>{};window.__dbg={actors,stage,camera,renderer};
await document.fonts.ready;window.ready=true;
