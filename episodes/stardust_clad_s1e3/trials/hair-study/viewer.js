import * as THREE from 'three';
import '../windsieve/bootstrap.js';
import {XiaozaoPalaceCraft,JianwangPalaceCraft,finishWindPalaceCharacters} from 'dula-assets/characters/stardust/wind-palace-craft.js';
import {installLayeredHair} from 'dula-assets/characters/stardust/layered-hair.js';
import {perform} from '../windsieve/performance.js';
const W=1280,H=720;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W/2,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const stage=new THREE.Scene();stage.background=new THREE.Color('#777f89');
stage.add(new THREE.HemisphereLight('#d5e4ef','#495264',2.0));
const key=new THREE.DirectionalLight('#fff3df',2);key.position.set(-3,5,4);stage.add(key);
const actors={xiaozao:new XiaozaoPalaceCraft(),jianwang:new JianwangPalaceCraft()};
await finishWindPalaceCharacters(actors,renderer,'../../assets3d/tex/armor_engraved_r20.png');
for(const [name,a]of Object.entries(actors)){stage.add(a.mesh);installLayeredHair(a,{hero:name==='xiaozao'});}
const camera=new THREE.PerspectiveCamera(27,640/720,.03,30);
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d');
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function angles(t){
 // Head-only glances and pitch, followed by a whole-model inspection orbit.
 if(t<1)return{head:0,pitch:0,body:0};
 if(t<2)return{head:.72*ease((t-1)/.45),pitch:0,body:0};
 if(t<3)return{head:.72-1.44*ease((t-2)/.45),pitch:0,body:0};
 if(t<4)return{head:-.72*(1-ease((t-3)/.4)),pitch:.20*Math.sin((t-3)*Math.PI),body:0};
 return{head:0,pitch:0,body:(t-4)/4*Math.PI*2};
}
function draw(t,capture=true){
 const who=t<8?'xiaozao':'jianwang',local=t%8,a=actors[who],angle=angles(local);
 perform(actors,0);
 for(const [name,actor]of Object.entries(actors)){
  actor.mesh.visible=name===who;
  actor.mesh.rotation.set(0,angle.body,0);actor.mesh.position.set(0,0,0);
  actor.headGroup.rotation.set(angle.pitch,angle.head,0);
  actor.updateCladFX(0,1);actor.updatePalaceClad(0,{LOCK:1e6,C7:1e6,SCAR:1e6});
  actor.updateWindAppearance(local);actor.face.setActing({smile:0,focus:.45,fear:0,blink:0});
 }
 stage.updateMatrixWorld(true);
 const hp=a.headGroup.getWorldPosition(new THREE.Vector3());
 camera.position.set(0,hp.y+.08,1.22);camera.lookAt(0,hp.y+.08,0);camera.updateProjectionMatrix();
 a.face.lookAtWorld(new THREE.Vector3(0,hp.y+.1,3));
 // This painter commits gaze/acting on mouth.apply. Commit after the matrices
 // and gaze, so sequential and direct inspection share the same face.
 a.mouth.apply({jaw:0,width:1});
 const previous=angles(Math.max(0,local-.08)),next=angles(Math.min(7.999,local+.005));
 a.layeredHair.update({yawVelocity:((next.head+next.body)-(previous.head+previous.body))/.085,pitchVelocity:(next.pitch-previous.pitch)/.085});
 const state={t,who,angle,head:hp.toArray(),hair:'layered-hair-v1'};
 if(!capture)return state;
 for(const candidate of [false,true]){
  a.layeredHair.setEnabled(candidate);renderer.render(stage,camera);
  ctx.drawImage(renderer.domElement,candidate?640:0,0);
 }
 ctx.fillStyle='#131c26';ctx.fillRect(0,0,W,52);ctx.fillRect(0,666,W,54);
 ctx.fillStyle='#edf0ed';ctx.font='22px Microsoft YaHei';ctx.textAlign='center';
 ctx.fillText('修改前 · 厚束与逐束圆滑明暗',320,34);
 ctx.fillText('研究版 · 分层薄片与整团色块',960,34);
 ctx.font='18px Microsoft YaHei';
 ctx.fillText((who==='xiaozao'?'小凿':'缄网')+' · '+(local<4?'头部独立转动':'模型各面检查')+' · 脸与衣甲未修改',W/2,700);
 ctx.fillStyle='#ccd5db';ctx.fillRect(639,52,2,614);
 return{image:canvas.toDataURL('image/jpeg',.95).split(',')[1],state};
}
window.duration=16;window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.checkTimes=[.5,1.55,2.55,3.5,4,4.5,5,5.5,6,6.5,7,8.5,9.55,10.55,11.5,12,12.5,13,13.5,14,14.5,15];
window.setFreeCamera=()=>{};
window.__dbg={actors,stage,camera,renderer};
await document.fonts.ready;window.ready=true;
