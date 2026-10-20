import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {applyMetalClad} from 'dula-assets/characters/stardust/metal-clad.js';
import {XiaozaoWindCraft,JianwangCraft,WeiheCraft} from 'dula-assets/characters/stardust/wind-characters.js';
import {WindSievePalaceScene} from 'dula-assets/scenes/stardust/WindSievePalaceScene.js';
import {performance,cameraAt} from './performance.js';
const [timeline,dialogue]=await Promise.all(['timeline','dialogue'].map(n=>fetch(`./config/${n}.json`).then(r=>r.json())));
const env=await fetch('./config/voice_envs.json').then(r=>r.ok?r.json():{lines:[]}).catch(()=>({lines:[]}));
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1280,720);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.90;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const stage=new WindSievePalaceScene();stage.build();await stage.readyPromise;
await stage.applyHybrid('./assets3d/tex/');
const scene=stage.scene,camera=new THREE.PerspectiveCamera(35,1280/720,.03,150);
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;
const actors={xiaozao:new XiaozaoWindCraft(),jianwang:new JianwangCraft(),weihe:new WeiheCraft()};
await Promise.all([actors.xiaozao,actors.jianwang].map(a=>applyMetalClad(a.armour,{url:'./assets3d/tex/armor_engraved_r20.png',environment:scene.environment,cleanMetal:true})));
for(const a of [actors.xiaozao,actors.jianwang])for(const m of a.armour.metalClad.materials){m.roughness=.65;m.envMapIntensity=.32;m.clearcoat=0;}
Object.values(actors).forEach(a=>scene.add(a.mesh));
const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;document.body.append(canvas);
const ctx=canvas.getContext('2d');let free=null;
const names={xiaozao:'小凿',jianwang:'缄网',weihe:'苇禾'};
function step(t){
 const s=performance(t),result={};
 for(const [id,a]of Object.entries(actors)){
  a.mesh.visible=id!=='jianwang'||t>=timeline.segments.find(x=>x.id==='entry').start;
  const line=env.lines?.find(l=>l.speaker===id&&t>=l.t0&&t<l.t0+l.dur);
  s[id].face.jaw=line?(line.jaw[Math.min(line.jaw.length-1,Math.floor((t-line.t0)/line.dt))]??0):0;
  result[id]=a.pose(s[id]);
 }
 stage.updateStory(s.t,s,actors);
 const c=free??cameraAt(t,s);camera.position.set(...c.pos);camera.lookAt(...(c.lookAt??c.look));camera.fov=c.fov??35;camera.updateProjectionMatrix();
 result.camera={pos:camera.position.toArray(),look:c.lookAt??c.look,fov:camera.fov};
 result.contact=Object.fromEntries(Object.entries(actors).map(([id,a])=>[id,{left:a.anchor('left').toArray(),right:a.anchor('right').toArray()}]));
 return result;
}
function render(t){
 const state=step(t);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);
 // Letterbox and a restrained episode mark; subtitles come from the story.
 ctx.fillStyle='#111b23';ctx.fillRect(0,0,1280,30);ctx.fillRect(0,690,1280,30);
 ctx.font='16px "Microsoft YaHei"';ctx.fillStyle='#d3e0e0';ctx.textAlign='left';ctx.fillText('星屑战壳   /   风筛宫',36,57);
 const line=dialogue.lines.find(l=>t>=l.t&&t<l.end&&l.id[0]!=='e');
 if(line){ctx.font='bold 27px "Microsoft YaHei"';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#172630';const text=names[line.speaker]+'：'+line.text;ctx.strokeText(text,640,655);ctx.fillStyle=dialogue.colors[line.speaker];ctx.fillText(text,640,655);}
 if(t<4){ctx.textAlign='center';ctx.fillStyle='#f0e7cd';ctx.font='28px "Microsoft YaHei"';ctx.fillText('风筛宫',640,544);ctx.font='18px "Microsoft YaHei"';ctx.fillText('不能等的半拍',640,575);}
 return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
window.duration=timeline.duration;window.checkTimes=[3,8,12,17,20,24,27,28.5,31,36,40,40.5,40.9,43,47,52,57,61.5,64,68,73,78.5,81,85,90,93,97,100.4,101,106,114,120,126,132];
window.setFreeCamera=c=>free=c;window.stepAt=step;window.renderAt=render;window.ready=true;
if(!new URLSearchParams(location.search).has('capture')){
 const audio=new Audio('./assets3d/mixed.wav');audio.preload='auto';
 const play=document.createElement('button');play.textContent='播放 / 暂停';play.style='position:fixed;left:12px;bottom:8px';document.body.append(play);
 play.onclick=()=>audio.paused?audio.play():audio.pause();
 const loop=()=>{render(audio.currentTime||0);requestAnimationFrame(loop);};requestAnimationFrame(loop);
}
