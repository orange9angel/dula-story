import * as THREE from 'three';
import {characters,scenes} from './bootstrap.js';
import {performanceAt} from './dance-v5.js';
import {parseStory} from '../pilot/performance.js';
import {performanceAt as tablePerformance} from '../performance.js';
import {dialogueAt} from './dialogue-v4.js';
const full=!location.pathname.includes('/craft3d/')||new URLSearchParams(location.search).has('full');
const W=1920,H=1080,canvas=document.querySelector('#film'),ctx=canvas.getContext('2d'),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2.75,2.75,1.546875,-1.546875,.1,30);camera.position.set(0,1.25,8);camera.lookAt(0,1.25,0);
const bg=await new THREE.TextureLoader().loadAsync('/assets/images/cafe_master_v1.png');bg.colorSpace=THREE.SRGBColorSpace;const plate=new THREE.Mesh(new THREE.PlaneGeometry(6.45,6.45*941/1672),new THREE.MeshBasicMaterial({map:bg,toneMapped:false}));plate.position.set(0,1.05,-3);scene.add(plate);
scene.add(new THREE.AmbientLight('#fff6df',1.8));const sun=new THREE.DirectionalLight('#fff3dd',2.2);sun.position.set(-3,6,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:20});sun.shadow.bias=-.0002;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.ShadowMaterial({color:'#8378b1',opacity:.25}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;floor.receiveShadow=true;scene.add(floor);
const actors=Object.fromEntries([...characters].map(([k,f])=>[k,f()]));for(const a of Object.values(actors))scene.add(a.mesh);await Promise.all(Object.values(actors).map(a=>a.ready));
const json=async p=>(await fetch(p)).json(),[rawCues,beats,subtitles,timing]=await Promise.all(['/config/visemes.json','/config/song_beats.json','/config/subtitles.json','/config/timing.json'].map(json));const cues={Girl:rawCues.filter(c=>c.character==='Girl'),Boy:rawCues.filter(c=>c.character==='Boy')};
const danceBeats=await json('/config/dance_beats_v3.json');
const story=parseStory(await(await fetch('/script.story')).text()),song=story.find(e=>e.text.includes('CafeDuet'));window.audioStart=full?0:song.start+danceBeats.beats[28];const beat=60/beats.tempo;window.duration=full?story.at(-1).end:danceBeats.beats[60]-danceBeats.beats[28];window.checkTimes=full?[.7,3.4,7.6,10.5,12.65,13.25,14.8,16.4,18.3,20.2,22.5,26.8,31.5,37,41,47.5,54,57.5,61,65,68.5,72.5,78.5,83,89,95.8,97.9,100,102,106.5]:[0,.6,1.2,2.3,3.4,4.6,5.9,7,8.1,9.2,10.5,11.6,12.8,13.9,15.1,16.3,17.5,18.3];
window.checkTimes=[...new Set([...window.checkTimes,...[32,33,34,35,36,37,38,39,40,96,97,98,99,100,101,102,103,104].map(n=>song.start+danceBeats.beats[n]-window.audioStart).filter(t=>t>=0&&t<window.duration)])].sort((a,b)=>a-b);
const table=scenes.get('CafeMusicalScene')();scene.add(table.group);await table.ready;
window.renderAt=t=>{
 const abs=window.audioStart+t,shot=full?tablePerformance(abs,story,timing,cues,beats):null,isDance=!full||(abs>=song.start&&abs<song.end),p=isDance?performanceAt(t,abs,beat,cues,danceBeats):dialogueAt(abs,story,cues),limbs={};
 for(const [k,a] of Object.entries(actors)){a.mesh.visible=true;limbs[k]=a.setPose(p[k]);}
 table.group.visible=true;table.update(isDance?{t:abs,mode:'dance',steam:false}:p,limbs);
 const c=!isDance?p.camera:p.mode==='turn'?{x:0,y:1.15,span:2.78}:full?shot.camera:{x:0,y:1.18,span:2.78},span=c.span*(isDance?1-.012*Math.exp(-(p.beat%1)*8)*(Math.floor(p.beat)%4===0?1:.25):1);camera.left=-span*W/H/2;camera.right=span*W/H/2;camera.top=span/2;camera.bottom=-span/2;camera.position.set(c.x,c.y+(isDance?0:.45),8);camera.lookAt(c.x,c.y,isDance?0:-.9);camera.updateProjectionMatrix();renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);
 const sub=subtitles.find(s=>s.start<=abs&&abs<s.end);if(sub){ctx.font='600 40px "Microsoft YaHei"';ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=6;ctx.strokeStyle='#243748';ctx.fillStyle=sub.kind==='song'?'#fff0b3':sub.character==='Boy'?'#d9efff':'#fff9e8';const text=(sub.kind==='song'?'♪ ':'')+sub.text;ctx.strokeText(text,W/2,1018);ctx.fillText(text,W/2,1018);}
 if(full&&t<2.6){ctx.save();ctx.globalAlpha=Math.min(1,t/.6,(2.6-t)/.5);ctx.fillStyle='rgba(253,251,240,.86)';ctx.fillRect(70,62,400,126);ctx.fillStyle='#244559';ctx.textAlign='left';ctx.font='600 54px "Microsoft YaHei"';ctx.fillText('半拍晴天',100,125);ctx.font='22px "Microsoft YaHei"';ctx.fillText('猫带我去的地方 · 咖啡厅特别篇',101,163);ctx.restore();}
 if(full&&t>window.duration-3.6){ctx.save();ctx.globalAlpha=Math.min(1,(t-window.duration+3.6)/.6);ctx.font='600 45px "Microsoft YaHei"';ctx.textAlign='center';ctx.fillStyle='#244559';ctx.fillText('半拍晴天',W/2,88);ctx.restore();}if(full&&t>window.duration-1.3){ctx.fillStyle=`rgba(251,246,224,${(t-window.duration+1.3)/1.3})`;ctx.fillRect(0,0,W,H);}
 window.currentTime=t;return{state:p,limbs,props:{phase:table.phase,tap:table.tapProbe},actorsVisible:Object.values(actors).every(a=>a.mesh.visible),image:canvas.toDataURL('image/jpeg',.94).split(',')[1]};
};
window.reviewAt=(yaw,kind=null)=>{
 if(table)table.group.visible=false;
 const p=performanceAt(0,window.audioStart,beat,cues);
 for(const [k,a] of Object.entries(actors)){
  const s=k==='Girl'?1:1.07;a.mesh.visible=!kind||kind===k;
  a.setPose({...p[k],x:kind?0:k==='Girl'?-.68:.68,yaw,bob:0,roll:0,headYaw:0,headPitch:0,headRoll:0,hairSway:0,
   leftFoot:{x:-.11*s,y:.074*s,z:0},rightFoot:{x:.11*s,y:.074*s,z:0},leftFootYaw:0,rightFootYaw:0,
   leftWrist:{x:-.28*s,y:1.03*s,z:.10},rightWrist:{x:.28*s,y:1.03*s,z:.10},face:{jaw:0,width:1,blink:0}});
 }
 const span=kind?.85:2.18,y=kind?(kind==='Girl'?1.57:1.68):1.05;
 camera.left=-span*W/H/2;camera.right=span*W/H/2;camera.top=span/2;camera.bottom=-span/2;camera.position.set(0,y,8);camera.lookAt(0,y,0);camera.updateProjectionMatrix();renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);
 return canvas.toDataURL('image/jpeg',.95).split(',')[1];
};
window.renderAt(0);window.ready=true;window.actors=actors;if(location.search.includes('capture'))document.body.classList.add('capture');
const audio=new Audio();audio.preload='none';audio.src='/assets/audio/final/mixed.wav';let playing=false,t=0;const slider=document.querySelector('#time'),label=document.querySelector('#clock');slider.max=window.duration;document.querySelector('#play').onclick=()=>{playing=!playing;if(playing){audio.currentTime=window.audioStart+t;audio.play();}else audio.pause();};slider.oninput=()=>{t=+slider.value;audio.currentTime=window.audioStart+t;window.renderAt(t);};function frame(){if(playing){t=audio.currentTime-window.audioStart;if(t>=window.duration){playing=false;audio.pause();}window.renderAt(t);slider.value=t;label.textContent=t.toFixed(1)+' / '+window.duration.toFixed(1)+'s';}requestAnimationFrame(frame);}requestAnimationFrame(frame);
