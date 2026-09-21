import * as THREE from 'three';
import {CharacterRegistry,SceneRegistry,BoilSystem} from 'dula-engine';
import '/episode/bootstrap.js';
import {samplePose} from './pose.js';
import {drawYuki} from './character.js';

const query=new URLSearchParams(location.search),capture=query.has('capture');
if(capture)document.body.classList.add('capture');
const plan=await(await fetch('/plan.json')).json();
const canvas=document.querySelector('#film'),ctx=canvas.getContext('2d');
const W=1920,H=1080;canvas.width=W;canvas.height=H;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const room=new SceneRegistry.YukiRoomScene();room.build();
const actor=new CharacterRegistry.Yuki();room.addCharacter(actor);
const dir=room.lights.find(l=>l.isDirectionalLight);
if(dir){dir.position.set(-3,7,5);dir.intensity=1;dir.shadow.mapSize.set(2048,2048);dir.shadow.camera.left=-9;dir.shadow.camera.right=9;dir.shadow.camera.top=9;dir.shadow.camera.bottom=-9;dir.shadow.bias=-.001;}
const camera=new THREE.PerspectiveCamera(34,1,.05,100);
const layer=document.createElement('canvas');layer.width=W;layer.height=H;
const lctx=layer.getContext('2d');
let mode=query.get('mode')||'compare',rig=false,current=0;
const originX=-1;
const allJoints=['leftArm','rightArm','leftElbow','rightElbow','leftWrist','rightWrist','leftLeg','rightLeg','leftKnee','rightKnee','leftAnkle','rightAnkle'];
const angle=(a,b)=>Math.atan2(b.x-a.x,-(b.y-a.y));

function poseBaseline(p){
  for(const k of allJoints)actor[k]?.rotation.set(0,0,0);
  actor.mesh.position.set(originX+p.rootX,0,0);
  actor.mesh.rotation.set(0,0,0);
  actor.headGroup.position.y=1.28+p.bob;
  actor.headGroup.rotation.set(0,0,p.point*.035-p.anticipation*.055);
  for(const side of ['left','right']){
    for(const [kind,mid,end] of [['Arm','Elbow','Wrist'],['Leg','Knee','Ankle']]){
      const pts=p[side+kind],a=angle(pts[0],pts[1]),b=angle(pts[1],pts[2]);
      actor[side+kind].rotation.z=a;
      if(actor[side+mid])actor[side+mid].rotation.z=b-a;
      if(kind==='Leg'&&actor[side+end])actor[side+end].rotation.z=-b;
    }
  }
  BoilSystem.update(p.t);
  actor.mesh.updateMatrixWorld(true);
}
function project(x,y,z,pw,ph){const a=new THREE.Vector3(x,y,z).project(camera);return{x:(a.x+1)*pw/2,y:(1-a.y)*ph/2};}
function filmPanel(x,y,pw,ph,p,showOriginal,shadow=true){
  renderer.setSize(pw,ph,false);camera.aspect=pw/ph;camera.updateProjectionMatrix();
  camera.position.set(originX,1.25,3.42);camera.lookAt(originX,.84,0);camera.updateMatrixWorld(true);
  actor.mesh.visible=showOriginal;
  renderer.render(room.scene,camera);
  ctx.drawImage(renderer.domElement,x,y,pw,ph);
  if(showOriginal)return;
  const base=project(originX,0,0,pw,ph),up=project(originX,1,0,pw,ph),right=project(originX+1,0,0,pw,ph);
  const sx=right.x-base.x,sy=base.y-up.y;
  // Shadow anchors use the same projected world coordinates as the stance feet.
  if(shadow){
    ctx.save();ctx.translate(x+base.x,y+base.y);ctx.scale(sx,-sy);
    for(const side of ['left','right']){
      const foot=p[side+'Leg'][2],lift=p[side+'Lift'];
      ctx.fillStyle=`rgba(71,48,68,${.19-lift*.65})`;ctx.beginPath();
      ctx.ellipse(foot.x+.04,.014,.123+lift*.2,.013+lift*.08,0,0,Math.PI*2);ctx.fill();
    }ctx.restore();
  }
  lctx.setTransform(1,0,0,1,0,0);lctx.clearRect(0,0,W,H);
  lctx.save();lctx.translate(x+base.x,y+base.y);lctx.scale(sx,-sy);
  drawYuki(lctx,p,{silhouette:mode==='silhouette',rig});lctx.restore();
  ctx.drawImage(layer,0,0);
}
function label(text,x,y,size=25,color='#665661'){ctx.fillStyle=color;ctx.font=`500 ${size}px "Microsoft YaHei",sans-serif`;ctx.fillText(text,x,y);}
function shotAt(t){return plan.shots.find(s=>t>=s.start&&t<s.end)??plan.shots.at(-1);}
function draw(t){
  current=Math.max(0,Math.min(t,plan.duration-1/300));
  const shot=shotAt(current),p=samplePose(current-shot.start,shot.kind,shot.end-shot.start);
  poseBaseline(p);
  ctx.fillStyle='#f6efe8';ctx.fillRect(0,0,W,H);
  const title=shot.kind==='point'?'手势 · 预备 → 指向 → 收回':'迈步 · 支撑 → 抬脚 → 落地';
  if(mode==='compare'){
    const gap=12,pw=(W-gap)/2,py=94,ph=H-py-67;
    filmPanel(0,py,pw,ph,p,true);filmPanel(pw+gap,py,pw,ph,p,false);
    label('原模型 · 关节压力测试',38,56,28);label('二维修型 · 试作',pw+gap+38,56,28,'#3f696c');
    label(title,38,H-23,24);label('保留角色特征 / 连续四肢曲线 / 四指手型 / 明确鞋形',1003,H-23,22);
  }else{
    filmPanel(0,0,W,H,p,false,mode!=='silhouette');
    ctx.fillStyle='rgba(255,248,241,.90)';ctx.fillRect(25,24,410,57);
    label(mode==='silhouette'?'小雪 · 剪影检查':'小雪 · 动作修型试片',43,63,28);
    ctx.fillStyle='rgba(255,248,241,.9)';ctx.fillRect(25,H-71,660,47);label(title,43,H-39,25);
  }
  document.querySelector('#time').value=current;document.querySelector('#clock').textContent=`${current.toFixed(2)} / ${plan.duration.toFixed(2)}s`;
  return {t:current,shot:shot.kind,sourceEntry:shot.sourceEntry,sourceTime:shot.sourceStart+current-shot.start,
    leftContact:p.leftContact,rightContact:p.rightContact,leftFoot:p.leftLeg[2],rightFoot:p.rightLeg[2],
    knees:[p.leftLeg[1],p.rightLeg[1]],head:p.head};
}
window.ready=true;window.duration=plan.duration;window.plan=plan;
window.stepAt=draw;
window.setMode=m=>{mode=m;draw(current);};
window.renderAt=t=>({state:draw(t),image:canvas.toDataURL('image/jpeg',.96).split(',')[1]});
window.pngAt=t=>{draw(t);return canvas.toDataURL('image/png').split(',')[1];};
window.setRig=b=>{rig=b;draw(current);};
document.querySelector('#time').max=plan.duration;
document.querySelector('#mode').value=mode;
let playing=false,epoch=0;
document.querySelector('#play').onclick=()=>{playing=!playing;epoch=performance.now()/1000-current;document.querySelector('#play').textContent=playing?'暂停':'播放';};
document.querySelector('#time').oninput=e=>{playing=false;document.querySelector('#play').textContent='播放';draw(+e.target.value);};
document.querySelector('#mode').onchange=e=>window.setMode(e.target.value);
document.querySelector('#rig').onchange=e=>window.setRig(e.target.checked);
draw(0);
function tick(now){if(playing){const t=now/1000-epoch;if(t>=plan.duration){epoch=now/1000;draw(0);}else draw(t);}requestAnimationFrame(tick);}
if(!capture)requestAnimationFrame(tick);
