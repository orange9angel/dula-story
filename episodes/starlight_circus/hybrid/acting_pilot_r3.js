import * as THREE from 'three';
import {createPaintedLightField} from '../assets/draw_over_runtime/painted-light-field.js';
import {createSceneLightScore} from '../assets/draw_over_runtime/scene-light-score.js';
import {createFeatheredVariantFace} from '../assets/draw_over_runtime/feathered-variant-face.js';
import {createDialogueFaceTrack} from '../assets/draw_over_runtime/dialogue-face-track.js';
import {emitStoryParticles} from '../assets/draw_over_runtime/story-particles.js';
import {createPaintedPart,createCleanUnderlay,solveSpatialPaintedArm,easeRig} from '../assets/draw_over_runtime/painted-part-rig.js';
import {createFixedEyeRig,blinkAmount} from '../assets/draw_over_runtime/fixed-eye-rig.js';
import {createPaintedLitOverlay} from '../assets/draw_over_runtime/painted-lit-overlay.js';
const [timeline,lighting,alignment,registration,recipe,rig]=await Promise.all(['timeline.json','light_score.json','pilot_dialogue_alignment.json','face_registration_r2.json','pilot_mix_recipe.json','part_rig_r3.json'].map(p=>fetch('../config/'+p).then(r=>r.json())));
const cues=Object.fromEntries(timeline.segments.map(s=>[s.id,s.start])),score=createSceneLightScore({cues,...lighting}),start=cues.sing_to_me,end=cues.borrow_a_melody+5;
const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;};
const [original,underlay,bright,dim]=await Promise.all([load('../'+rig.source),load('../'+rig.underlay),load('assets/piano_master_v2.png'),load('assets/piano_dim_v1.png')]);
const mouthNames=['rest','narrow','open','round','labial'];
const variants=Object.fromEntries(mouthNames.map((name,i)=>['mouth_'+name,{src:'assets/face_edits_r2.png',rect:[731,244,40,31],cores:[[737,248,29,22,3]],sourceSize:[1152,1152],sourceAffine:registration.registrations[i].sourceAffine}]));
const painter=await createFeatheredVariantFace({id:'stable-piano-r3',base:'assets/piano_mic_v1.png',variants,mouth:Object.fromEntries(mouthNames.map(n=>[n,'mouth_'+n]))});
const maskNames=[...Object.keys(rig.parts),'clear_all'],maskImages=Object.fromEntries(await Promise.all(maskNames.map(async k=>[k,await load('../'+rig.maskDirectory+'/'+k+'.png')])));
const parts=Object.fromEntries(Object.entries(rig.parts).map(([k,s])=>[k,createPaintedPart(original,{...s,maskImage:maskImages[k]})]));
const clean=createCleanUnderlay(underlay,[],{maskImage:maskImages.clear_all});
const eyes=createFixedEyeRig(original,rig.eyes),mouthTrack=createDialogueFaceTrack({clips:alignment.clips,start,end,fps:30});
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const field=createPaintedLightField({bright,dim,width:bright.naturalWidth,height:bright.naturalHeight,blur:5});
const moving=document.createElement('canvas');moving.width=original.naturalWidth;moving.height=original.naturalHeight;const mg=moving.getContext('2d'),litOverlay=createPaintedLitOverlay(moving);
const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;document.body.append(canvas);const out=canvas.getContext('2d');
const clamp=x=>Math.max(0,Math.min(1,x)),i0=score.at(start).key.intensity,i1=score.at(cues.borrow_a_melody+4).key.intensity;
const taps=recipe.tracks.find(t=>t.id==='wooden_heartbeat').events.map(a=>cues[a.cue]+a.offset);
const quad=(a,b,c,u)=>[0,1].map(k=>(1-u)*(1-u)*a[k]+2*(1-u)*u*b[k]+u*u*c[k]);
function tapAngle(t){for(const hit of taps){const d=t-hit;if(d>=-.25&&d<0)return .085*Math.sin(Math.PI*(d+.25)/.25)**1.5;if(d>=0&&d<.15)return -.012*Math.sin(Math.PI*d/.15);}return 0;}
function draw(t){
 const local=t-start,speech=mouthTrack.at(t),face=painter.paint({mouthCel:speech.mouth}),g=painter.canvas.getContext('2d');
 g.drawImage(clean,0,0);mg.clearRect(0,0,moving.width,moving.height);
 // The generated clean underlay is used only where the original moving limbs were.
 const micRotation=1.48*easeRig((local-4.38)/1.12),reach=easeRig((t-(cues.wooden_heartbeat-1.35))/1.45),offerRotation=.13*reach;
 parts.noaMic.draw(mg,{angle:micRotation});parts.noaOffer.draw(mg,{angle:offerRotation});
 const A=rig.seleneArm,target=quad(A.wrist,A.control,A.target,reach),arm=solveSpatialPaintedArm(A.shoulder,A.elbow,A.wrist,target,.65*Math.sin(Math.PI*reach));
 const upperScale=parts.seleneUpper.drawBone(mg,A.elbow,A.shoulder,arm.elbow),forearmScale=parts.seleneForearm.drawBone(mg,A.wrist,arm.elbow,arm.wrist);
 parts.seleneHand.draw(mg,{at:arm.wrist,angle:arm.angle});
 mg.save();mg.globalCompositeOperation='destination-out';mg.drawImage(maskImages.seleneSleeve,0,0);mg.drawImage(maskImages.noaCape,0,0);mg.restore();
 const angle=tapAngle(t);mg.save();mg.beginPath();mg.moveTo(430,506);mg.lineTo(490,508);mg.lineTo(500,559);mg.lineTo(438,560);mg.closePath();mg.clip();mg.filter='blur(1.8px)';parts.pipForearm.draw(mg,{at:[520,548],angle,alpha:.10,shadowOnly:true});mg.restore();parts.pipForearm.draw(mg,{angle});
 const nb=blinkAmount(t,[start+3.85,start+9.6,start+16.1]),sb=blinkAmount(t,[start+1.85,start+8.85,start+15.25]);
 eyes.draw(g,'Noa',{blink:nb});eyes.draw(g,'Selene',{blink:sb});
 const strength=clamp((score.at(t).key.intensity-i0)/(i1-i0));field.setSource(painter.canvas);field.setStrength(strength);renderer.render(field.scene,field.camera);litOverlay.setStrength(strength);litOverlay.render(renderer);out.clearRect(0,0,1280,720);out.drawImage(renderer.domElement,0,0);
 const particles=emitStoryParticles(out,t,{start:start-6,end:end+2,count:125,life:6,seed:46,radius:1.0,alpha:.13+.12*strength,trajectory:(u,r)=>[120+r[0]*360+u*22,8+r[1]*112+u*30]});
 if(local>=.35&&local<4.286){out.textAlign='center';out.font='23px Microsoft YaHei';out.lineWidth=4;out.strokeStyle='rgba(15,10,15,.85)';out.fillStyle='#fff3d5';out.strokeText('不用唱给他们听。先唱给我听。',640,685);out.fillText('不用唱给他们听。先唱给我听。',640,685);}
 const pip=parts.pipForearm.point([452,520],{angle}),mic=parts.noaMic.point([733,289],{angle:micRotation}),selenePalm=parts.seleneHand.point([984,325],{at:arm.wrist,angle:arm.angle}),noaPalm=parts.noaOffer.point([858,385],{angle:offerRotation});
 return{t,mouth:speech.mouth,noaBlink:nb,seleneBlink:sb,micRotation,reach,pipAngle:angle,pipFinger:pip,micGrille:mic,selenePalm,noaPalm,palmDistance:Math.hypot(selenePalm[0]-noaPalm[0],selenePalm[1]-noaPalm[1]),arm:{shoulder:A.shoulder,elbow:arm.elbow,wrist:arm.wrist,boneLengths:arm.boneLengths,reach:arm.reach,projectedScales:[upperScale,forearmScale]},strength,particles,scope:'fixed view articulated parts, controlled eyelids; source fingers/props never scaled'};
}
window.renderAt=t=>{const state=draw(t);return{image:canvas.toDataURL('image/png').split(',')[1],state};};window.stepAt=draw;window.ready=true;window.duration=timeline.duration;window.r3={parts,rig,eyes,original,painter,draw};
if(!new URLSearchParams(location.search).has('capture')){const audio=new Audio('../assets/audio/pilot_r1/mixed.wav'),f=document.createElement('footer');f.innerHTML='<button>播放</button> <input type="range" min="178" max="200" value="178" step="0.033333"> <span>连续关节与固定眼眶试片 R3</span>';document.body.append(f);let t=start,playing=false;const slider=f.querySelector('input');f.querySelector('button').onclick=()=>{playing=!playing;if(playing){audio.currentTime=t-start;audio.play();}else audio.pause();};slider.oninput=()=>{t=Number(slider.value);audio.currentTime=t-start;draw(t);};audio.onended=()=>playing=false;function loop(){if(playing)t=start+audio.currentTime;slider.value=t;draw(t);requestAnimationFrame(loop);}loop();}
