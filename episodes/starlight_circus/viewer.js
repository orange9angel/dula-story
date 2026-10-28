import * as THREE from 'three';
import {Noa,Pip,Selene,Vesper} from './characters/cast.js';
import {StarlightTheatre} from './scenes/StarlightTheatre.js';
import {performPilot} from './performance.js';
import {createSceneLightScore} from './assets/draw_over_runtime/scene-light-score.js';
const TL=await fetch('config/timeline.json').then(r=>r.json()),lighting=await fetch('config/light_score.json').then(r=>r.json());
const cues=Object.fromEntries(TL.segments.map(s=>[s.id,s]));
const score=createSceneLightScore({cues:Object.fromEntries(TL.segments.map(s=>[s.id,s.start])),...lighting});
const q=new URLSearchParams(location.search),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const stage=new StarlightTheatre().build(),scene=stage.scene,actors={Noa:new Noa(),Pip:new Pip(),Selene:new Selene(),Vesper:new Vesper()};for(const a of Object.values(actors))scene.add(a.mesh);
const camera=new THREE.PerspectiveCamera(30,1280/720,.05,100),canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;document.body.append(canvas);const ctx=canvas.getContext('2d');
function draw(t,capture=true){
 const motion=performPilot(actors,t,cues),lights=score.at(window.lightTime??t);
 for(const [id,value] of Object.entries(lights)){const light=stage[id];light.intensity=value.intensity;if(value.color)light.color.setRGB(...value.color);if(value.target)light.target.position.set(...value.target);}
 stage.key.target.updateMatrixWorld(true);
 camera.position.set(1.25,1.25,7.65);camera.lookAt(1.1,1.10,-.15);camera.fov=28;
 if(window.freeCamera){camera.position.set(...window.freeCamera.pos);camera.lookAt(...(window.freeCamera.look??window.freeCamera.lookAt));camera.fov=window.freeCamera.fov??30;}camera.updateProjectionMatrix();scene.updateMatrixWorld(true);
 const hands=Object.fromEntries(['Noa','Selene'].map(id=>[id,actors[id].hands[id==='Noa'?'right':'left'].getWorldPosition(new THREE.Vector3()).toArray()]));
 const contactGap=new THREE.Vector3(...hands.Noa).distanceTo(new THREE.Vector3(...hands.Selene));
 const state={t,lightTime:window.lightTime??t,lights,handhold:motion.handhold,contactActive:motion.contactActive,contactGap,maxReach:Math.max(...Object.values(actors).flatMap(a=>Object.values(a.report).map(r=>r.reach))),camera:camera.position.toArray(),phase:'spatial-lighting-rehearsal',audio:false};
 if(!capture)return state;renderer.render(scene,camera);ctx.clearRect(0,0,1280,720);ctx.drawImage(renderer.domElement,0,0);
 if(!q.has('clean')){ctx.font='16px Microsoft YaHei';ctx.fillStyle='#ecdcc5';ctx.fillText('星辰马戏团 · 空间 / 共用光源 / 互动底稿（非成片）',24,31);ctx.font='13px Microsoft YaHei';ctx.fillText(`${t.toFixed(2)}s`,1190,31);}
 window.lastState=state;return {image:canvas.toDataURL(q.get('format')==='png'?'image/png':'image/jpeg',.95).split(',')[1],state};
}
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);window.setFreeCamera=c=>window.freeCamera=c;window.duration=TL.duration;window.checkTimes=[178,181,184,187,190,194,198];window.__scene={stage,actors,camera,renderer,canvas,score,cues};window.ready=true;
if(!q.has('capture')){const footer=document.createElement('footer');footer.innerHTML='<button id="play">播放 / 暂停</button> <input id="seek" type="range" min="178" max="200" value="178" step="0.033333"> <span>22 秒制作试片 · 尚未接入正式美术与声音</span>';document.body.append(footer);const slider=footer.querySelector('input');let playing=true,prev=performance.now(),t=178;footer.querySelector('button').onclick=()=>playing=!playing;slider.oninput=()=>{t=Number(slider.value);playing=false;};function frame(now){if(playing)t=178+(t-178+(now-prev)/1000)%22;prev=now;slider.value=t;draw(t);requestAnimationFrame(frame);}requestAnimationFrame(frame);}
