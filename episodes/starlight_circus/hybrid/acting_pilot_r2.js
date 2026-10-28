import * as THREE from 'three';
import {createPaintedLightField} from '../assets/draw_over_runtime/painted-light-field.js';
import {createSceneLightScore} from '../assets/draw_over_runtime/scene-light-score.js';
import {createFeatheredVariantFace} from '../assets/draw_over_runtime/feathered-variant-face.js';
import {emitStoryParticles} from '../assets/draw_over_runtime/story-particles.js';
import {createDialogueFaceTrack,blinkExposure} from '../assets/draw_over_runtime/dialogue-face-track.js';
const [timeline,lighting,voice,mixRecipe,alignment,registration,halfRegistration]=await Promise.all(['timeline.json','light_score.json','pilot_voice_envelope.json','pilot_mix_recipe.json','pilot_dialogue_alignment.json','face_registration_r2.json','halfblink_registration_r2.json'].map(p=>fetch('../config/'+p).then(r=>r.json())));
const cues=Object.fromEntries(timeline.segments.map(s=>[s.id,s.start])),score=createSceneLightScore({cues,...lighting});
const start=cues.sing_to_me,end=cues.borrow_a_melody+5;
const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
const [bright,dim]=await Promise.all([load('assets/piano_master_v2.png'),load('assets/piano_dim_v1.png')]);
const atlas='assets/acting_edits_v1.png';
const full=(src,rect,cores)=>({src:'assets/'+src,rect,cores});
const tile=(rect,sourceRect,cores)=>({src:atlas,rect,sourceRect,sourceSize:[768,1152],cores});
const feature=(index,origin,rect,cores,half=false)=>({src:half?'assets/halfblink_edits_r2.png':'assets/face_edits_r2.png',rect,cores,sourceAffine:(half?halfRegistration:registration).registrations[index].sourceAffine,
 sourceRect:[(index%(half?3:4))*288+rect[0]-origin[0],Math.floor(index/(half?3:4))*288+rect[1]-origin[1],rect[2],rect[3]],sourceSize:half?[864,288]:[1152,1152]});
const mouthRect=[731,244,40,31],mouthCore=[[737,248,29,22,3]],noaOrigin=[600,100];
const noaEyes=[724,210,55,40],noaEyeCore=[[729,215,41,32,3]],blinkRect=[724,220,54,29],blinkCore=[[730,224,37,21,3]];
const seleneOrigin=[900,100],seleneRect=[945,207,66,80],seleneCore=[[957,214,37,32,3],[955,249,33,23,3]],seleneBlink=[949,222,50,30],seleneBlinkCore=[[959,226,32,20,3]];
const mouthTrack=createDialogueFaceTrack({clips:alignment.clips,start,end,fps:30});
const painter=await createFeatheredVariantFace({id:'noa-piano-invitation',base:'assets/piano_mic_v1.png',
 variants:{
  micOne:tile([620,275,175,240],[60,35,175,240],[[634,282,135,218,5]]),
  micTwo:tile([620,275,175,240],[444,35,175,240],[[634,282,135,218,5]]),
  micDown:full('piano_near_v1.png',[620,275,175,240],[[634,282,135,218,5]]),
  noaBell:full('piano_master_v2.png',[700,320,42,47],[[705,325,31,34,3]]),
  near:full('piano_near_v1.png',[790,180,330,320],[[800,335,230,110,6],[930,185,155,235,6]]),
  hold:full('piano_hold_v1.png',[790,180,330,320],[[800,335,230,110,6],[930,185,155,235,6]]),
  mouthRest:feature(0,noaOrigin,mouthRect,mouthCore),mouthNarrow:feature(1,noaOrigin,mouthRect,mouthCore),
  mouthOpen:feature(2,noaOrigin,mouthRect,mouthCore),mouthRound:feature(3,noaOrigin,mouthRect,mouthCore),mouthLabial:feature(4,noaOrigin,mouthRect,mouthCore),
  noaListen:feature(7,noaOrigin,noaEyes,noaEyeCore),noaHalfBlink:feature(0,noaOrigin,blinkRect,blinkCore,true),noaFullBlink:feature(6,noaOrigin,blinkRect,blinkCore),
  seleneWary:feature(8,seleneOrigin,seleneRect,seleneCore),seleneListen:feature(9,seleneOrigin,seleneRect,seleneCore),seleneGlance:feature(15,seleneOrigin,seleneRect,seleneCore),
  seleneRelief:feature(12,seleneOrigin,seleneRect,seleneCore),seleneHalfBlink:feature(1,seleneOrigin,seleneBlink,seleneBlinkCore,true),seleneFullBlink:feature(11,seleneOrigin,seleneBlink,seleneBlinkCore),
  seleneHoldHalf:feature(2,seleneOrigin,seleneBlink,seleneBlinkCore,true),seleneHoldFull:feature(14,seleneOrigin,seleneBlink,seleneBlinkCore),
  pipNear:tile([425,480,115,110],[85,888,115,110],[[435,488,95,90,5]]),
  pipAway:tile([425,480,115,110],[469,888,115,110],[[435,488,95,90,5]])
 },mouth:{rest:'mouthRest',narrow:'mouthNarrow',open:'mouthOpen',round:'mouthRound',labial:'mouthLabial'}});
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const field=createPaintedLightField({bright,dim,width:bright.naturalWidth,height:bright.naturalHeight,blur:5});
const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;document.body.append(canvas);const g=canvas.getContext('2d');
const clamp=x=>Math.max(0,Math.min(1,x)),i0=score.at(start).key.intensity,i1=score.at(cues.borrow_a_melody+4).key.intensity;
const taps=mixRecipe.tracks.find(t=>t.id==='wooden_heartbeat').events.map(a=>cues[a.cue]+a.offset);
function draw(t){
 const layers=[],local=t-start,heart=t-cues.wooden_heartbeat;
 if(local>=2.1&&local<2.2)layers.push('micOne');else if(local>=2.2&&local<2.3)layers.push('micTwo');else if(local>=2.3)layers.push('micDown');
 if(local>=2.3)layers.push('noaBell');
 let pose='invitation';
 if(heart>=-.333333&&heart<.1){layers.push('near');pose='almost-touching';}
 else if(heart>=.1){layers.push('hold');pose='holding';}
 const previous=taps.filter(v=>v<=t).at(-1),next=taps.find(v=>v>t),toNext=next===undefined?Infinity:next-t;
 let tapCel='contact';if(toNext<.23&&toNext>=.10){tapCel='away';layers.push('pipAway');}else if(toNext<.10){tapCel='near';layers.push('pipNear');}
 const speech=mouthTrack.at(t),noaBlink=blinkExposure(t,[start+3.85,start+9.6,start+16.1]),seleneBlink=blinkExposure(t,[start+1.85,start+8.85,start+15.25]);
 let seleneExpression='seleneWary';
 if(local>=2.05)seleneExpression='seleneListen';if(local>=7.1)seleneExpression='seleneGlance';if(pose==='almost-touching')seleneExpression=null;if(pose==='holding')seleneExpression='seleneRelief';
 if(local>=1.7)layers.push('noaListen');if(seleneExpression)layers.push(seleneExpression);
 if(noaBlink!=='open')layers.push(noaBlink==='half'?'noaHalfBlink':'noaFullBlink');
 if(seleneBlink!=='open'&&pose!=='almost-touching')layers.push(pose==='holding'?(seleneBlink==='half'?'seleneHoldHalf':'seleneHoldFull'):(seleneBlink==='half'?'seleneHalfBlink':'seleneFullBlink'));
 const face=painter.paint({mouthCel:speech.mouth,layers});field.setSource(painter.canvas);
 const strength=clamp((score.at(t).key.intensity-i0)/(i1-i0));field.setStrength(strength);renderer.render(field.scene,field.camera);g.clearRect(0,0,1280,720);g.drawImage(renderer.domElement,0,0);
 // Only dust in the overhead light cone; it never crosses eyes or hands.
 const particles=emitStoryParticles(g,t,{start:start-6,end:end+2,count:125,life:6,seed:46,radius:1.0,alpha:.13+.12*strength,trajectory:(u,r)=>[120+r[0]*360+u*22,8+r[1]*112+u*30]});
 if(t>=start+.35&&t<start+.35+3.936){g.textAlign='center';g.font='23px Microsoft YaHei';g.lineWidth=4;g.strokeStyle='rgba(15,10,15,.85)';g.fillStyle='#fff3d5';const text='不用唱给他们听。先唱给我听。';g.strokeText(text,640,685);g.fillText(text,640,685);}
 return {t,pose,layers,face:{mouthCel:face.mouthCel,char:speech.char,energy:speech.raw,noaBlink,seleneBlink,seleneExpression},tapCel,previousTap:previous??null,nextTap:next??null,strength,particles,geometry:'same R1 body cels and camera, R2 local face refinement',audio:'Noa A and song B selected by user'};
}
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/png').split(',')[1],state};};window.stepAt=draw;window.ready=true;window.duration=timeline.duration;
window.faceTrack=mouthTrack.frames;
if(!new URLSearchParams(location.search).has('capture')){
 const audio=new Audio('../assets/audio/pilot_r1/mixed.wav'),footer=document.createElement('footer');footer.innerHTML='<button>播放</button> <input type="range" min="178" max="200" value="178" step="0.033333"> <span>表情与口型细化 R2 · A 声线 / B 歌曲</span>';document.body.append(footer);const slider=footer.querySelector('input');let playing=false,t=start;
 footer.querySelector('button').onclick=()=>{playing=!playing;if(playing){if(audio.ended||t>=end)t=start;audio.currentTime=t-start;audio.play();}else audio.pause();};slider.oninput=()=>{t=Number(slider.value);audio.currentTime=t-start;draw(t);};audio.onended=()=>playing=false;
 function loop(){if(playing)t=Math.min(end,start+audio.currentTime);slider.value=t;draw(t);requestAnimationFrame(loop);}loop();
}
