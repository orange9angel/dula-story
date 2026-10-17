import * as THREE from 'three';
import {characters,scenes} from './bootstrap_illustrated.js';
import {parseStory} from './pilot/performance.js';
import {performanceAt} from './performance.js';
const W=1920,H=1080,output=document.querySelector('#film'),ctx=output.getContext('2d');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3,3,1.7,-1.7,.1,30);camera.position.set(0,1.05,6);camera.lookAt(0,1.05,0);
const bg=await new THREE.TextureLoader().loadAsync('/assets/images/cafe_master_v1.png');bg.colorSpace=THREE.SRGBColorSpace;const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(6.45,6.45*941/1672),new THREE.MeshBasicMaterial({map:bg,toneMapped:false}));backdrop.position.set(0,1.05,-3);scene.add(backdrop);
const actors=Object.fromEntries([...characters].map(([k,f])=>[k,f()]));for(const a of Object.values(actors))scene.add(a.mesh);
const table=scenes.get('CafeMusicalScene')();scene.add(table.group);await Promise.all([...Object.values(actors).map(a=>a.ready),table.ready]);
const shadows={};for(const k of Object.keys(actors)){const s=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:'#8e7cc3',transparent:true,opacity:.20,depthWrite:false,toneMapped:false}));s.scale.set(.31,.052,1);s.position.set(0,.025,-.2);scene.add(s);shadows[k]=s;}
const json=async p=>(await fetch(p)).json();const [timing,subtitles,cues,beats]=await Promise.all(['/config/timing.json','/config/subtitles.json','/config/visemes.json','/config/song_beats.json'].map(json));const story=parseStory(await(await fetch('/script.story')).text()),mouth={Girl:[],Boy:[]};for(const c of cues)mouth[c.character].push(c);
window.duration=story.at(-1).end;window.checkTimes=[.7,3.4,7.6,10.5,12.65,13.25,14.8,16.4,18.3,20.2,22.5,26.8,31.5,37,41,47.5,54,57.5,61,65,68.5,72.5,78.5,83,89,95.8,97.9,100,102,106.5];window.currentTime=0;
function textLine(text,y,size=43,color='#fff9e8'){ctx.save();ctx.font=`600 ${size}px "Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.strokeStyle='rgba(26,43,64,.9)';ctx.lineWidth=6;ctx.strokeText(text,W/2,y);ctx.fillStyle=color;ctx.fillText(text,W/2,y);ctx.restore();}
window.renderAt=t=>{
 const p=performanceAt(t,story,timing,mouth,beats),records={};const dance=p.mode==='dance';table.group.visible=!dance;
 for(const [k,a] of Object.entries(actors)){a.mesh.visible=dance;shadows[k].visible=dance;if(dance){records[k]=a.setPose(p[k]);shadows[k].position.x=p[k].x;}}
 if(!dance)table.update(p);
 const c=p.camera,aspect=W/H;camera.left=-c.span*aspect/2;camera.right=c.span*aspect/2;camera.top=c.span/2;camera.bottom=-c.span/2;camera.position.set(c.x,c.y,6);camera.lookAt(c.x,c.y,0);camera.updateProjectionMatrix();renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);
 if(t<2.6){ctx.save();ctx.globalAlpha=Math.min(1,t/.6,(2.6-t)/.5);ctx.fillStyle='rgba(253,251,240,.86)';ctx.fillRect(70,62,400,126);ctx.fillStyle='#244559';ctx.font='600 54px "Microsoft YaHei"';ctx.fillText('半拍晴天',100,125);ctx.font='22px "Microsoft YaHei"';ctx.fillText('猫带我去的地方 · 咖啡厅特别篇',101,163);ctx.restore();}
 const sub=subtitles.find(s=>s.start<=t&&t<s.end);if(sub)textLine((sub.kind==='song'?'♪  ':'')+sub.text,1008,sub.kind==='song'?40:42,sub.character==='Boy'?'#d9efff':sub.kind==='song'?'#ffefae':'#fff9e8');
 if(t>window.duration-3.6){ctx.save();ctx.globalAlpha=Math.min(1,(t-window.duration+3.6)/.6);textLine('半拍晴天',88,45);textLine('小蓝 · 阿澈',139,25);ctx.restore();}
 const fade=Math.max(0,(t-window.duration+1.3)/1.3);if(fade){ctx.fillStyle=`rgba(251,246,224,${fade})`;ctx.fillRect(0,0,W,H);}
 window.currentTime=t;return{state:p,limbs:records,image:output.toDataURL('image/jpeg',.94).split(',')[1]};
};
window.renderAt(0);window.ready=true;if(location.search.includes('capture'))document.body.classList.add('capture');
const audio=new Audio();audio.preload='none';audio.src='/assets/audio/final/mixed.wav';const slider=document.querySelector('#time'),label=document.querySelector('#clock');slider.max=window.duration;let playing=false,t=0;
document.querySelector('#play').onclick=()=>{playing=!playing;if(playing){audio.currentTime=t;audio.play();}else audio.pause();};slider.oninput=()=>{t=+slider.value;audio.currentTime=t;window.renderAt(t);label.textContent=`${t.toFixed(1)} / ${window.duration}s`;};
function frame(){if(playing){t=audio.currentTime;if(t>=window.duration){playing=false;audio.pause();}window.renderAt(t);slider.value=t;label.textContent=`${t.toFixed(1)} / ${window.duration}s`;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
