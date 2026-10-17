import * as THREE from 'three';
import {IllustratedCafeKid} from '/assets-lib/characters/sunprint/IllustratedCafeKid.js';
import {parseStory,performanceAt} from './performance.js';
const canvas=document.querySelector('#film'),W=1920,H=1080;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.setClearColor('#fdfbf4');
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3,3,1.6875,-1.6875,.1,30);camera.position.set(0,1.05,6);camera.lookAt(0,1.05,0);
const bg=await new THREE.TextureLoader().loadAsync('/assets/images/cafe_master_v1.png');bg.colorSpace=THREE.SRGBColorSpace;
const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(6.45,6.45*941/1672),new THREE.MeshBasicMaterial({map:bg,toneMapped:false}));backdrop.position.set(0,1.05,-3);scene.add(backdrop);
const actors={};for(const [kind,slug] of [['Girl','girl'],['Boy','boy']]){const actor=new IllustratedCafeKid(kind,{bodyUrl:'/assets/images/'+slug+'_body_v1.png'});scene.add(actor.mesh);actors[kind]=actor;}
await Promise.all(Object.values(actors).map(a=>a.ready));
const shadows={};for(const kind of Object.keys(actors)){const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:'#8e7cc3',transparent:true,opacity:.28,depthWrite:false,toneMapped:false}));shadow.scale.set(.35,.075,1);shadow.position.set(0,.026,-.2);scene.add(shadow);shadows[kind]=shadow;}
const story=parseStory(await (await fetch('/pilot/script.story')).text());let visemes=[];try{const r=await fetch('/pilot/visemes.json');if(r.ok)visemes=await r.json();}catch{}
const audio=new Audio('/pilot/audio.wav');audio.preload='auto';
window.duration=story.at(-1).end;window.checkTimes=[.5,1.4,2.4,3.6,4.5,5.5,7,9.5,10.5,12,13.2,14.5,16.5,17.5];window.errors=[];
window.renderAt=t=>{
  const p=performanceAt(t,story,visemes),records={};for(const kind of Object.keys(actors)){records[kind]=actors[kind].setPose(p[kind]);shadows[kind].position.x=p[kind].x;}
  const c=p.camera,aspect=W/H;camera.left=-c.span*aspect/2;camera.right=c.span*aspect/2;camera.top=c.span/2;camera.bottom=-c.span/2;camera.position.set(c.x,c.y,6);camera.lookAt(c.x,c.y,0);camera.updateProjectionMatrix();
  // The generated master stays in world space. Camera crops are shared by all
  // layers; no independent image resampling or per-cel reset occurs.
  renderer.render(scene,camera);window.currentTime=t;return {state:p,limbs:records,image:canvas.toDataURL('image/jpeg',.95).split(',')[1]};
};
window.renderAt(0);window.ready=true;
if(location.search.includes('capture'))document.body.classList.add('capture');
let playing=false,last=0,t=0;const slider=document.querySelector('#time'),clock=document.querySelector('#clock');
document.querySelector('#play').onclick=()=>{playing=!playing;if(playing){audio.currentTime=t;audio.play().catch(()=>{});}else audio.pause();};
slider.oninput=()=>{t=+slider.value;window.renderAt(t);if(playing)audio.currentTime=t;};
function loop(now){if(playing){t+=(now-last)/1000;if(t>=window.duration){t=0;audio.currentTime=0;}window.renderAt(t);slider.value=t;clock.textContent=t.toFixed(1)+' / '+window.duration+'s';}last=now;requestAnimationFrame(loop);}requestAnimationFrame(loop);
