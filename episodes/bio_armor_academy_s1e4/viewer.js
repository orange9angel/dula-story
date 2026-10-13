import * as THREE from 'three';
import {LeiXiaoCraft} from 'dula-assets/characters/bioarmor/characters.js';
import {QianTangKuiCraft} from 'dula-assets/characters/bioarmor/QianTangKuiCraft.js';
import {BiologyRoomScene} from './scenes/BiologyRoomScene.js';
import {posesAt} from './performance.js';
import {applySupportedPerformance} from 'dula-assets/lib/craft3d/supported-performance.js';
import {createNumericProbe} from './tools/numeric_probe.js';
const W=1280,H=720,q=new URLSearchParams(location.search),numeric=q.has('probe-surface');
const TL=await fetch('./config/timeline.json').then(r=>r.json());
let voice=null;try{const r=await fetch('./config/voice_features.json');if(r.ok)voice=await r.json();}catch{}
const stage=new BiologyRoomScene(),scene=stage.build(),actors={lei:new LeiXiaoCraft(),aoi:new QianTangKuiCraft()};
for(const a of Object.values(actors))scene.add(a.mesh);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#dce8dd');
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d'),camera=new THREE.PerspectiveCamera(36,W/H,.05,100);
const probe=createNumericProbe(actors,stage);
// Etch is colour on the existing arm vertices, never another intersecting mesh.
const markSurface=actors.lei.limbs.leftArm,baseSkin=markSurface.mesh.material.color.clone(),markColor=new THREE.Color('#3DFFC8');
markSurface.mesh.material=markSurface.mesh.material.clone();markSurface.mesh.material.color.set('#ffffff');markSurface.mesh.material.vertexColors=true;
const markColors=new THREE.Float32BufferAttribute(new Float32Array(markSurface.geometry.attributes.position.count*3),3);
markSurface.geometry.setAttribute('color',markColors);
function applyMark(growth){
  let colored=0;
  for(let i=0;i<=markSurface.rings;i++)for(let j=0;j<markSurface.sides;j++){
    const u=i/markSurface.rings,theta=j/markSurface.sides;
    const wave=(theta+.018*Math.sin(u*72))*2,dist=Math.abs(wave-Math.round(wave));
    const active=u>.61&&u<.68+growth*.22&&dist<.10;
    const color=active?markColor:baseSkin;markColors.setXYZ(i*markSurface.sides+j,color.r,color.g,color.b);if(active)colored++;
  }
  markColors.needsUpdate=true;return colored;
}
function speech(t,key){
  const id=key==='lei'?'LeiXiao':'QianTangKui';if(!voice)return 0;
  const values=voice.characters[id],i=Math.max(0,Math.min(values.length-1,Math.floor((t+1e-9)/voice.step)));return values[i]??0;
}
function bubble(text,key){
  const rows=[];let row='';ctx.font='bold 30px "Microsoft YaHei"';
  for(const ch of text){if(ctx.measureText(row+ch).width>530){rows.push(row);row='';}row+=ch;}if(row)rows.push(row);
  const bw=Math.max(...rows.map(r=>ctx.measureText(r).width))+56,bh=rows.length*41+34,x=key==='lei'?55:W-55-bw,y=35;
  ctx.fillStyle='#fffbed';ctx.strokeStyle='#354a43';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(x,y,bw,bh,18);ctx.fill();ctx.stroke();
  const tailX=key==='lei'?x+bw*.75:x+bw*.25;
  ctx.beginPath();ctx.moveTo(tailX,y+bh);ctx.lineTo(tailX+(key==='lei'?25:-25),y+bh+22);ctx.lineTo(tailX+36,y+bh);ctx.fill();ctx.stroke();
  ctx.fillStyle='#263f37';ctx.textAlign='left';rows.forEach((r,i)=>ctx.fillText(r,x+28,y+42+i*41));
}
function draw(t,capture=true){
  const seg=TL.segments.findLast(s=>s.start<=t)??TL.segments[0],cues=stage.sample(t,TL),p=posesAt(t,cues,TL);
  for(const [key,a] of Object.entries(actors)){
    applySupportedPerformance(a,p[key]);a.setEmotion(p[key].emotion,p[key].blink);
    a.face.setActing(p[key].acting);
  }
  actors.lei.setArmorState(0,0);actors.lei.setEtch(0);actors.lei.updateWeaponFX(t,0,0);const markVertices=applyMark(p.mark);
  for(const [key,a] of Object.entries(actors)){
    const target=p[key].gaze==='mark'?actors.lei.mesh.localToWorld(new THREE.Vector3().copy(p.lei.leftArm[2])):
      p[key].gaze==='jar'?stage.jar.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.2,0)):
      actors[key==='lei'?'aoi':'lei'].face.head.getWorldPosition(new THREE.Vector3());
    a.face.lookAtWorld(target);
    a.mouth.apply({jaw:speech(t,key),width:1});
  }
  const c=seg.camera.options;
  camera.position.set(...c.position);camera.lookAt(...c.lookAt);camera.fov=c.fov??36;
  if(window.freeCamera){camera.position.set(...window.freeCamera.pos);camera.lookAt(...window.freeCamera.look);camera.fov=window.freeCamera.fov??36;}
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
  const state={entry:seg.entry,phase:seg.id,mark:p.mark,markVertices,acting:p.phase,cues,
    performance:Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,{head:[p[key].headPitch,p[key].headYaw,p[key].headRoll],
      torso:p[key].torso,root:[p[key].rootX,p[key].rootZ,p[key].yaw],gestures:p[key].gestures,gaze:p[key].gaze}])),
    arms:Object.fromEntries(Object.entries(actors).map(([key,a])=>[key,[p[key].leftArm,p[key].rightArm]])),
    ...(numeric?probe(p,camera):{})};
  if(!capture)return state;
  renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0,W,H);
  // Static printed-page border and restrained halftone do not alter scene geometry.
  ctx.strokeStyle='#344940';ctx.lineWidth=10;ctx.strokeRect(5,5,W-10,H-10);
  ctx.fillStyle='rgba(46,58,46,.055)';for(let y=5;y<H;y+=8)for(let x=5;x<W;x+=8)ctx.fillRect(x,y,1,1);
  if(seg.entry===1||seg.entry===18){
    ctx.fillStyle='#e9e4cf';ctx.fillRect(0,0,W,H);ctx.fillStyle='#344b43';ctx.textAlign='center';
    ctx.font='bold 70px "Microsoft YaHei"';ctx.fillText('9 章',W/2,245);
    ctx.font='38px "Microsoft YaHei"';ctx.fillText(seg.entry===1?'残卷 · 其四  /  别再试了':'其四 · 终',W/2,365);
    ctx.font='23px "Microsoft YaHei"';ctx.fillText('青岚学舍',W/2,435);
  }else{
    const line=TL.dialogue.find(d=>t>=d.start&&t<d.end);if(line)bubble(line.text,line.character==='LeiXiao'?'lei':'aoi');
    if(seg.entry===4){ctx.fillStyle='#2f5246';ctx.textAlign='right';ctx.font='24px "Microsoft YaHei"';ctx.fillText('千堂葵  /  生物部',W-48,H-40);}
  }
  return {state,image:canvas.toDataURL('image/jpeg',.94).split(',')[1]};
}
window.duration=TL.duration;window.checkTimes=TL.segments.flatMap(s=>[s.start+.1,(s.start+s.end)/2,s.end-.1]);
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);window.setFreeCamera=c=>window.freeCamera=c;
window.ready=true;
if(!q.has('capture')){const start=performance.now();function tick(){draw(((performance.now()-start)/1000)%TL.duration);requestAnimationFrame(tick);}tick();}
