import * as THREE from 'three';
import {SceneRegistry} from 'dula-engine';
import '/episode/bootstrap.js';
import {samplePose3D} from './pose3d.js';
import {YukiCraft3D} from './character3d.js';
import {ArticulatedHand} from './hand3d.js';
import {HybridRiver} from './environment3d.js';
import {parseEnvironmentStory} from './environment-motion.js';

const query=new URLSearchParams(location.search),capture=query.has('capture');
if(capture)document.body.classList.add('capture');
const plan=await(await fetch('/plan.json')).json();
const environmentCues=parseEnvironmentStory(await(await fetch('/trial/environment.story')).text(),plan.duration);
let river;
const canvas=document.querySelector('#film'),ctx=canvas.getContext('2d'),W=1920,H=1080;
canvas.width=W;canvas.height=H;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const room=new SceneRegistry.YukiRoomScene();room.build();
const actor=new YukiCraft3D();room.scene.add(actor.mesh);
for(const light of room.lights){if(light.isAmbientLight)light.intensity=.7;}
const dir=room.lights.find(l=>l.isDirectionalLight);
if(dir){dir.position.set(-3,7,5);dir.intensity=1.5;dir.shadow.mapSize.set(2048,2048);dir.shadow.camera.left=-5;dir.shadow.camera.right=5;dir.shadow.camera.top=5;dir.shadow.camera.bottom=-5;dir.shadow.bias=-.0006;}
const studio=new THREE.Scene();studio.background=new THREE.Color('#f5eee8');
studio.add(new THREE.AmbientLight(0xffffff,.7));
const key=new THREE.DirectionalLight(0xffffff,1.5);key.position.set(-3,7,5);studio.add(key);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({color:'#eee3dc'}));
floor.rotation.x=-Math.PI/2;floor.position.y=.001;studio.add(floor);
const contactShadows=['left','right'].map(()=>{
  const m=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshBasicMaterial({color:'#8f7c7d',transparent:true,opacity:.18,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.scale.set(.087,.135,1);studio.add(m);return m;
});
const camera=new THREE.PerspectiveCamera(34,W/H,.05,100);
let current=0,angle=0,mode=query.get('mode')||'volume';
const label=(s,x,y,size=25)=>{ctx.font=`500 ${size}px "Microsoft YaHei",sans-serif`;ctx.fillStyle='#584653';ctx.fillText(s,x,y);};
const flat=new THREE.MeshBasicMaterial({color:'#382d38'});
const staticModes=['hands','heads','neck'];
const neckPoses=[['左转 35°',{headYaw:-35*Math.PI/180}],['右转 35°',{headYaw:35*Math.PI/180}],
  ['低头 12°',{headPitch:12*Math.PI/180}],['抬头 12°',{headPitch:-12*Math.PI/180}]];
const handScene=new THREE.Scene();handScene.background=new THREE.Color('#f5eee8');
handScene.add(new THREE.AmbientLight(0xffffff,.7));
const handLight=new THREE.DirectionalLight(0xffffff,1.5);handLight.position.set(-1,2,4);handScene.add(handLight);
const handStudy=new ArticulatedHand(1,actor.hands.right.surface.material,actor.hands.right.outline.material);handScene.add(handStudy);
const handCamera=new THREE.OrthographicCamera(-.1445,.1445,.076,-.076,.001,10);
handCamera.position.set(.045,.005,.4);handCamera.lookAt(.045,.005,0);
function drawHands(){
  ctx.fillStyle='#e3d6cc';ctx.fillRect(0,0,W,H);
  const columns=[['张开',{open:1}],['放松',{}],['指向',{point:1}],['握拳',{fist:1}]];
  const rows=[['掌心',0],['斜侧',Math.PI/4],['侧面',Math.PI/2],['手背',Math.PI]];
  const pw=460,ph=242;
  renderer.setSize(pw,ph,false);
  for(let col=0;col<columns.length;col++)for(let row=0;row<rows.length;row++){
    const [title,gesture]=columns[col],[view,turn]=rows[row];
    handStudy.setGesture(gesture);handStudy.rotation.x=turn+angle*Math.PI/180;
    renderer.render(handScene,handCamera);
    const x=10+col*480,y=74+row*250;
    ctx.drawImage(renderer.domElement,x,y,pw,ph);
    label(`${title} · ${angle===0?view:Math.round(((turn*180/Math.PI+angle)%360+360)%360)+'°'}`,x+15,y+29,21);
  }
  label('小雪 · 五指三维手 / 四种手势 / 四个角度',28,45,27);
  renderer.setSize(W,H,false);
}
function drawHeads(stress=false){
  ctx.fillStyle='#e3d6cc';ctx.fillRect(0,0,W,H);
  const views=[['正面',0],['斜侧',45],['侧面',90],['背面',180]];
  const poses=[['放松',0],['指向表情',1.2]];
  const pw=460,ph=480,close=new THREE.PerspectiveCamera(32,pw/ph,.05,20);
  renderer.setSize(pw,ph,false);studio.add(actor.mesh);
  for(let row=0;row<poses.length;row++)for(let col=0;col<views.length;col++){
    const [pose,t]=stress?[neckPoses[col][0],0]:poses[row],[view,degrees]=views[stress?row:col],az=(degrees+angle)*Math.PI/180;
    actor.setPose({...samplePose3D(t,'point',3),...(stress?neckPoses[col][1]:{})});actor.mesh.position.x=0;
    close.position.set(Math.sin(az)*1.65,1.37,Math.cos(az)*1.65);close.lookAt(0,1.36,0);
    renderer.render(studio,close);
    const x=10+col*480,y=74+row*495;ctx.drawImage(renderer.domElement,x,y,pw,ph);
    label(`${pose} · ${angle===0?view:degrees+angle+'°'}`,x+14,y+30,21);
  }
  label(stress?'小雪 · 身体不动 / 转头与俯仰 / 颈部衔接':'小雪 · 头颈近景 / 同一模型的正侧背面',28,45,27);
  renderer.setSize(W,H,false);
}
function draw(t){
  current=Math.max(0,Math.min(t,plan.duration-1/300));
  const shot=plan.shots.find(s=>current>=s.start&&current<s.end)??plan.shots.at(-1);
  const p=samplePose3D(current-shot.start,shot.kind,shot.end-shot.start);
  const hybrid=mode==='hybrid'||mode==='hybrid-still';
  if(hybrid&&!river)river=new HybridRiver(environmentCues,plan.duration);
  const inspection=shot.kind==='turn'||Math.abs(angle)>.001||mode==='silhouette'||mode==='portrait';
  const scene=hybrid?river.scene:inspection?studio:room.scene;scene.add(actor.mesh);
  for(const [i,side] of ['left','right'].entries()){
    const f=p[side+'Foot'],shadow=contactShadows[i];shadow.position.set(f.x-1,.003,f.z);
    shadow.rotation.z=-p.yaw;shadow.material.opacity=Math.max(.04,.18-(f.y-.095));
  }
  const targetX=-1+((inspection||hybrid)?p.rootX:0),azimuth=angle*Math.PI/180+(hybrid?.055*Math.sin(current*.43):0);
  const portrait=mode==='portrait',distance=hybrid?4.85:portrait?1.80:3.50;
  camera.position.set(targetX+Math.sin(azimuth)*distance,hybrid?1.50:portrait?1.39:1.14,Math.cos(azimuth)*distance);
  camera.lookAt(targetX,hybrid?.95:portrait?1.36:.88,0);camera.updateMatrixWorld(true);
  const environment=hybrid?river.update(current,camera,p.rootX-1,{moving:mode==='hybrid'}):undefined;
  actor.setPose({...p,windWorld:environment?.windWorld});actor.mesh.position.x-=1;
  const saved=[];
  if(mode==='silhouette')actor.mesh.traverse(o=>{if(o.isMesh){saved.push([o,o.material]);o.material=flat;}});
  renderer.render(scene,camera);for(const [o,m] of saved)o.material=m;
  ctx.drawImage(renderer.domElement,0,0);
  ctx.fillStyle='rgba(255,248,241,.94)';ctx.fillRect(25,24,566,57);
  label(hybrid?(mode==='hybrid'?'河岸 · 风起与飞鸟':'河岸 · 静态环境对照'):mode==='silhouette'?'小雪 · 三维剪影检查':portrait?'小雪 · 头颈与发型修正':'小雪 · 三维造型与转面',43,63,28);
  const text=hybrid?(mode==='hybrid-still'?'同一人物与机位 · 环境暂停':environment.wind>.6?'阵风掠过 · 柳枝、落叶与发梢':'微风 · 水纹与飞鸟'):shot.kind==='point'?'手势 · 上臂 / 肘 / 前臂 / 手掌':shot.kind==='walk'?'迈步 · 膝盖朝前 / 支撑脚锁地':'360° 转台 · 正面 / 侧面 / 背面';
  ctx.fillStyle='rgba(255,248,241,.94)';ctx.fillRect(25,H-71,710,47);label(text,43,H-39);
  if(shot.kind==='turn'){label(`${Math.round(p.yaw*180/Math.PI)}°`,W-132,63,28);}
  if(mode==='hands')drawHands();
  if(mode==='heads'||mode==='neck')drawHeads(mode==='neck');
  document.querySelector('#time').value=current;
  document.querySelector('#time').disabled=document.querySelector('#play').disabled=staticModes.includes(mode);
  document.querySelector('#clock').textContent=staticModes.includes(mode)?'静态造型对照 · 可拖动视角':`${current.toFixed(2)} / ${plan.duration.toFixed(2)}s`;
  return {t:current,shot:shot.kind,sourceEntry:shot.sourceEntry,yaw:p.yaw,leftContact:p.leftContact,rightContact:p.rightContact,
    leftFoot:p.leftFoot,rightFoot:p.rightFoot,leftLeg:p.leftLeg,rightLeg:p.rightLeg,leftArm:p.leftArm,rightArm:p.rightArm,environment};
}
window.ready=true;window.duration=plan.duration;window.plan=plan;window.stepAt=draw;
window.setMode=m=>{mode=m;if(staticModes.includes(m)){playing=false;document.querySelector('#play').textContent='播放';}draw(current);};
window.setAngle=a=>{angle=a;document.querySelector('#angle').value=a;document.querySelector('#degrees').textContent=`${a}°`;draw(current);};
window.renderAt=t=>({state:draw(t),image:canvas.toDataURL('image/jpeg',.96).split(',')[1]});
window.pngAt=t=>{draw(t);return canvas.toDataURL('image/png').split(',')[1];};
window.handChecks=()=>{
  const reports=[];handStudy.rotation.set(0,0,0);
  for(const hand of [handStudy,actor.hands.left]){
    const isolation=hand.validatePointIsolation();
    for(const gesture of [{},{open:1},{point:.5},{point:1},{fist:.5},{fist:1}]){
      hand.setGesture(gesture);reports.push({side:hand.sign>0?'right':'left',...hand.validateDeformation(),isolation});
    }
  }
  return reports;
};
window.headChecks=()=>{
  const poses=[{},...neckPoses.map(p=>p[1]),{headRoll:.20},{headRoll:-.20},{headYaw:.5,headPitch:.15,headRoll:-.12},{blink:1},{point:1}];
  return poses.map(p=>{actor.setPose({...samplePose3D(0,'point',3),...p});return {pose:p,...actor.headAssembly.validate()};});
};
document.querySelector('#time').max=plan.duration;
document.querySelector('#mode').value=mode;
let playing=false,epoch=0;
document.querySelector('#play').onclick=()=>{playing=!playing;epoch=performance.now()/1000-current;document.querySelector('#play').textContent=playing?'暂停':'播放';};
document.querySelector('#time').oninput=e=>{playing=false;document.querySelector('#play').textContent='播放';draw(+e.target.value);};
document.querySelector('#mode').onchange=e=>window.setMode(e.target.value);
document.querySelector('#angle').oninput=e=>window.setAngle(+e.target.value);
document.querySelector('#reset').onclick=()=>window.setAngle(0);
draw(0);
function tick(now){if(playing){const t=now/1000-epoch;if(t>=plan.duration){epoch=now/1000;draw(0);}else draw(t);}requestAnimationFrame(tick);}
if(!capture)requestAnimationFrame(tick);
