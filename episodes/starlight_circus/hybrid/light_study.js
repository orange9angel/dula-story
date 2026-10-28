import * as THREE from 'three';
import {createPaintedLightField} from '../assets/draw_over_runtime/painted-light-field.js';
import {createSceneLightScore} from '../assets/draw_over_runtime/scene-light-score.js';
const timeline=await fetch('../config/timeline.json').then(r=>r.json()),lighting=await fetch('../config/light_score.json').then(r=>r.json());
const cueTimes=Object.fromEntries(timeline.segments.map(s=>[s.id,s.start])),score=createSceneLightScore({cues:cueTimes,...lighting});
const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Missing image '+src));im.src=src;});
const [bright,dim]=await Promise.all([load('assets/piano_master_v2.png'),load('assets/piano_dim_v1.png')]);
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const field=createPaintedLightField({bright,dim,width:bright.naturalWidth,height:bright.naturalHeight,blur:5});document.body.append(renderer.domElement);
const q=new URLSearchParams(location.search);
const intensityAtStart=score.at(cueTimes.sing_to_me).key.intensity,intensityAtEnd=score.at(cueTimes.borrow_a_melody+4).key.intensity;
function draw(t){const light=score.at(t).key,strength=Math.max(0,Math.min(1,(light.intensity-intensityAtStart)/(intensityAtEnd-intensityAtStart)));field.setStrength(strength);renderer.render(field.scene,field.camera);return {t,strength,keyIntensity:light.intensity,geometry:'fixed painting; no body animation in this lighting test',audio:false,lightingMethod:'one spatial illumination field applied to the entire composition; fixed source direction'};}
window.renderAt=t=>{const state=draw(t);return {image:renderer.domElement.toDataURL('image/png').split(',')[1],state};};window.stepAt=draw;window.duration=timeline.duration;window.ready=true;
if(!q.has('capture')){const f=document.createElement('footer');f.innerHTML='<button>播放 / 暂停</button> <input type="range" min="178" max="200" value="178" step="0.033333"> <span>光影试验 · 固定姿势 · 无声 · 尚非正片</span>';document.body.append(f);let play=true,t=178,last=performance.now();const slider=f.querySelector('input');f.querySelector('button').onclick=()=>play=!play;slider.oninput=()=>{t=Number(slider.value);play=false;};function loop(now){if(play)t=178+(t-178+(now-last)/1000)%22;last=now;slider.value=t;draw(t);requestAnimationFrame(loop);}requestAnimationFrame(loop);}
