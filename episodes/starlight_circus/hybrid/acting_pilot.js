import * as THREE from 'three';
import {createPaintedLightField} from '../assets/draw_over_runtime/painted-light-field.js';
import {createSceneLightScore} from '../assets/draw_over_runtime/scene-light-score.js';
import {createFeatheredVariantFace} from '../assets/draw_over_runtime/feathered-variant-face.js';
import {emitStoryParticles} from '../assets/draw_over_runtime/story-particles.js';
const [timeline,lighting,voice,mixRecipe]=await Promise.all(['timeline.json','light_score.json','pilot_voice_envelope.json','pilot_mix_recipe.json'].map(p=>fetch('../config/'+p).then(r=>r.json())));
const cues=Object.fromEntries(timeline.segments.map(s=>[s.id,s.start])),score=createSceneLightScore({cues,...lighting});
const start=cues.sing_to_me,end=cues.borrow_a_melody+5;
const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
const [bright,dim]=await Promise.all([load('assets/piano_master_v2.png'),load('assets/piano_dim_v1.png')]);
const atlas='assets/acting_edits_v1.png';
const full=(src,rect,cores)=>({src:'assets/'+src,rect,cores});
const tile=(rect,sourceRect,cores)=>({src:atlas,rect,sourceRect,sourceSize:[768,1152],cores});
const painter=await createFeatheredVariantFace({id:'noa-piano-invitation',base:'assets/piano_mic_v1.png',
 variants:{
  micOne:tile([620,275,175,240],[60,35,175,240],[[634,282,135,218,5]]),
  micTwo:tile([620,275,175,240],[444,35,175,240],[[634,282,135,218,5]]),
  micDown:full('piano_near_v1.png',[620,275,175,240],[[634,282,135,218,5]]),
  noaBell:full('piano_master_v2.png',[700,320,42,47],[[705,325,31,34,3]]),
  near:full('piano_near_v1.png',[790,180,330,320],[[800,335,230,110,6],[930,185,155,235,6]]),
  hold:full('piano_hold_v1.png',[790,180,330,320],[[800,335,230,110,6],[930,185,155,235,6]]),
  noaClosed:tile([734,245,33,29],[134,529,33,29],[[739,250,23,19,3]]),
  noaBlink:tile([725,215,48,29],[125,499,48,29],[[730,220,35,19,3]]),
  pipNear:tile([425,480,115,110],[85,888,115,110],[[435,488,95,90,5]]),
  pipAway:tile([425,480,115,110],[469,888,115,110],[[435,488,95,90,5]])
 },mouth:{closed:'noaClosed'},blink:'noaBlink'});
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
 // The envelope is from the exact placed dialogue PCM with the same zero point.
 const vi=Math.floor((t-voice.start)*voice.rate),energy=voice.values[vi]??0,jaw=energy>.006?clamp(energy/voice.scale):0;
 const blink=[start+3.7,start+8.4,start+13.1,start+18.5].some(v=>t>=v&&t<v+.10)?1:0;
 const face=painter.paint({jaw,blink,layers});field.setSource(painter.canvas);
 const strength=clamp((score.at(t).key.intensity-i0)/(i1-i0));field.setStrength(strength);renderer.render(field.scene,field.camera);g.clearRect(0,0,1280,720);g.drawImage(renderer.domElement,0,0);
 // Only dust in the overhead light cone; it never crosses eyes or hands.
 const particles=emitStoryParticles(g,t,{start:start-6,end:end+2,count:125,life:6,seed:46,radius:1.0,alpha:.13+.12*strength,trajectory:(u,r)=>[120+r[0]*360+u*22,8+r[1]*112+u*30]});
 if(t>=start+.35&&t<start+.35+3.936){g.textAlign='center';g.font='23px Microsoft YaHei';g.lineWidth=4;g.strokeStyle='rgba(15,10,15,.85)';g.fillStyle='#fff3d5';const text='不用唱给他们听。先唱给我听。';g.strokeText(text,640,685);g.fillText(text,640,685);}
 return {t,pose,layers,face:{jaw,blink,mouthCel:face.mouthCel,energy},tapCel,previousTap:previous??null,nextTap:next??null,strength,particles,geometry:'authored local cels; feet and stage unchanged',audio:'placed pilot stems; listening pending'};
}
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/png').split(',')[1],state};};window.stepAt=draw;window.ready=true;window.duration=timeline.duration;
if(!new URLSearchParams(location.search).has('capture')){
 const audio=new Audio('../assets/audio/pilot_r1/mixed.wav'),footer=document.createElement('footer');footer.innerHTML='<button>播放</button> <input type="range" min="178" max="200" value="178" step="0.033333"> <span>表演试片 R1 · 声音与动作仍在审查</span>';document.body.append(footer);const slider=footer.querySelector('input');let playing=false,t=start;
 footer.querySelector('button').onclick=()=>{playing=!playing;if(playing){if(audio.ended||t>=end)t=start;audio.currentTime=t-start;audio.play();}else audio.pause();};slider.oninput=()=>{t=Number(slider.value);audio.currentTime=t-start;draw(t);};audio.onended=()=>playing=false;
 function loop(){if(playing)t=Math.min(end,start+audio.currentTime);slider.value=t;draw(t);requestAnimationFrame(loop);}loop();
}
