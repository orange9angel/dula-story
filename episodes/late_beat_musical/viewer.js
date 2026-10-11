// 《迟到的一拍》viewer 链主循环（P2 真角色）。第一排 POV（相机永不越台唇 z=0，
// 坐姿眼高 1.2m、仰角 5-12°、呼吸 bob ±2mm）。探针状态按 contact_contract.json 契约
// 组装（limbBody/cloth/worn/env/contact/locomotion/pov）；探针与渲染同源。
// window 契约（render.mjs 依赖）：duration / checkTimes / renderAt / stepAt / setFreeCamera / ready。
import * as THREE from 'three';
import {TheaterStageScene} from './scenes/TheaterStageScene.js';
import {poseAt,driveFrame,clamp,ease} from './performance.js';
import {ApaiCraft,XiaodengCraft} from './characters/theater.js';
import {probeBoxMeshes} from './tools/mesh_probe.js';

const TL=await fetch('./config/timeline.json').then(r=>r.json());
window.duration=TL.duration;

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1280,720);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;document.body.append(canvas);
const ctx=canvas.getContext('2d');
const camera=new THREE.PerspectiveCamera(44,1280/720,.05,200);

const stage=new TheaterStageScene().build();
const scene=stage.scene;
const apai=new ApaiCraft(),deng=new XiaodengCraft();
scene.add(apai.mesh);scene.add(deng.mesh);
apai.mesh.position.y=.6;deng.mesh.position.y=.6; // 台面高：setPose 不动 y（P2 沉没舞台翻车实录）

// ── 道具：歌词卡（阿拍）/ 手电（小灯腰间→右手）──
// 状态机由谱面时刻+接触事件驱动；位置每帧从手/挂点世界坐标派生（禁止独立 lerp）
const cardMesh=new THREE.Mesh(new THREE.BoxGeometry(.10,.14,.006),
  new THREE.MeshBasicMaterial({color:'#f2ede0'}));
scene.add(cardMesh);
const torchG=new THREE.Group();scene.add(torchG);
{
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(.018,.021,.10,12),
    new THREE.MeshToonMaterial({color:'#3c4048'}));
  const lens=new THREE.Mesh(new THREE.CylinderGeometry(.019,.019,.008,12),
    new THREE.MeshBasicMaterial({color:'#fff2cc'}));lens.position.y=.052;
  const beam=new THREE.Mesh(new THREE.ConeGeometry(.16,1,16,1,true),
    new THREE.MeshBasicMaterial({color:'#ffeecc',transparent:true,opacity:0,
      blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));
  beam.name='beam';beam.position.y=.55; // 锥从筒口向前上方（局部 +y 为筒轴）
  torchG.add(tube,lens,beam);
  torchG.traverse(o=>o.userData.probeExclude=1);
}
// ── 表情符号 billboard：大汗滴（唱砸瞬间出轮廓，归 billboard 纪律）──
function symTex(draw){const c=document.createElement('canvas');c.width=c.height=128;
  draw(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const bigSweatTex=symTex(g=>{g.scale(2.2,2.2);g.translate(30,30);
  g.beginPath();g.moveTo(0,-14);g.bezierCurveTo(9,-2,10,7,0,12);g.bezierCurveTo(-10,7,-9,-2,0,-14);
  g.fillStyle='#bfe3f2';g.fill();g.strokeStyle='#7fb6cf';g.lineWidth=1.5;g.stroke();
  g.fillStyle='#fff';g.beginPath();g.arc(-3,-5,2.5,0,Math.PI*2);g.fill();});
const bigSweat=new THREE.Mesh(new THREE.PlaneGeometry(.07,.07),
  new THREE.MeshBasicMaterial({map:bigSweatTex,transparent:true,depthWrite:false}));
bigSweat.visible=false;scene.add(bigSweat);

// ── 探针障碍：翼幕/台口柱（灯控台=小灯工作位，放行接近）──
const stageProxies=[];
for(const n of ['pros_l','pros_r'])stageProxies.push(stage.scene.getObjectByName(n));
stage.scene.traverse(o=>{if(o.geometry&&o.geometry.type==='PlaneGeometry'&&o.material?.vertexColors&&o!==stage.curtainL&&o!==stage.curtainR){
  // 翼幕与檐幕都是褶皱面片；只把翼幕（|x|>3）列为障碍
  if(Math.abs(o.position.x)>3)stageProxies.push(o);}});

// 躯干环列（含外套厚度——量测纪律见 modeling-techniques §10）
const TORSO_RINGS={apai:[[.80,.115,.085],[.90,.128,.090],[1.00,.132,.093],[1.10,.120,.086],[1.20,.126,.089],[1.32,.118,.083],[1.44,.096,.068]],
  deng:[[.76,.125,.095],[.86,.136,.100],[.96,.140,.102],[1.06,.125,.092],[1.16,.130,.095],[1.28,.120,.086],[1.34,.096,.068]]};
const TUBE_R={apai:[.045,.032],deng:[.042,.030]};

function limbBodyOf(actor,p,tag){
  if(actor.mesh.visible===false)return {}; // 隐藏角色不进探针（P20 先例：空壳读数必假阳性）
  const rings=TORSO_RINGS[tag],bob=actor.body.position.y,lean=actor.body.rotation.x,sxz=actor.body.scale.x;
  const cl=Math.cos(lean),sl2=Math.sin(lean);
  const out={};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const arm=p?.[(side==='left'?'left':'right')+'Arm'];
    if(!arm)continue;
    let worst=99,worstAt=null,rootG=null;
    for(const [a,b] of [[arm[0],arm[1]],[arm[1],arm[2]]]){
      for(let i=1;i<=5;i++){
        const mx=a.x+(b.x-a.x)*i/5,my=a.y+(b.y-a.y)*i/5,mz=a.z+(b.z-a.z)*i/5;
        const dSh=Math.hypot(mx-arm[0].x,my-arm[0].y,mz-arm[0].z);
        const py=my-bob,by=py*cl+mz*sl2,bz=-py*sl2+mz*cl;
        const ring=rings.find(r=>by<=r[0])??rings[rings.length-1];
        if(by<rings[0][0])continue;
        const ex=mx/(ring[1]*sxz),ez=bz/(ring[2]*sxz),e=Math.sqrt(ex*ex+ez*ez);
        const g=(e-1)*Math.min(ring[1],ring[2])*sxz;
        if(dSh<.06)continue; // 肩点球关节内埋区
        if(dSh<.22&&(rootG===null||g>rootG))rootG=g;
        if(g<worst){worst=g;worstAt=[mx,by,bz].map(v=>Math.round(v*1000)/1000);}
      }
    }
    // 肘尖轮廓凸包（elbEx）：肘点横向 X vs 同高截面半宽
    const eb=arm[1],epy=eb.y-bob,eby=epy*cl+eb.z*sl2;
    const ering=rings.find(r=>eby<=r[0])??rings[rings.length-1];
    const elbEx=Math.round((Math.abs(eb.x)-ering[1]*sxz)*10000)/10000;
    out[tag+(side==='left'?'L':'R')]={g:Math.round(worst*10000)/10000,at:worstAt,tubeR:TUBE_R[tag][0],
      rootG:rootG===null?null:Math.round(rootG*10000)/10000,elbEx,
      reach:Math.round(Math.hypot(arm[2].x-arm[0].x,arm[2].y-arm[0].y,arm[2].z-arm[0].z)/(tag==='apai'?.36:.33)*1000)/1000};
  }
  return out;
}
// 小灯下摆襟片 vs 她自己的手臂（面片换号穿透；P21 坐标系纪律：mesh 局部→世界→襟局部）
function clothHits(deng,pD){
  const hits=[];
  for(const pivot of deng.hems){
    const f=pivot.children[0];
    f.updateWorldMatrix(true,false);
    for(const side of ['left','right']){
      const a=pD?.[side+'Arm'];if(!a)continue;
      for(const [x,y,tr] of [[0,1,.06],[1,2,.045]]){
        const p0=f.worldToLocal(deng.mesh.localToWorld(new THREE.Vector3(a[x].x,a[x].y,a[x].z))),
              p1=f.worldToLocal(deng.mesh.localToWorld(new THREE.Vector3(a[y].x,a[y].y,a[y].z)));
        if(p0.z*p1.z>=0)continue;
        const u=p0.z/(p0.z-p1.z),cx=p0.x+(p1.x-p0.x)*u,cy=p0.y+(p1.y-p0.y)*u;
        if(Math.abs(cx)<.065+tr&&cy>-.26&&cy<-.02){
          const wp=f.localToWorld(new THREE.Vector3(cx,cy,0));
          hits.push({subject:'hem',obstacle:'deng_arm_'+side,point:[wp.x,wp.y,wp.z]});
        }
      }
    }
  }
  return {margin:-.01,hits,obstacles:['arm tubes'],counts:{deng:hits.length}};
}

// ── 第一排 POV 相机 ──
function camFor(shot,t){
  const breath=Math.sin(t*.5)*.002;
  switch(shot){
    case 'center':return{pos:[0,1.2+breath,5.0],look:[0,1.85,-2.2],fov:38};
    case 'lip':return{pos:[0,1.2+breath,4.5],look:[0,1.7,-1.0],fov:32};
    case 'side_glance':return{pos:[.8,1.2+breath,5.2],look:[4.0,1.7,-2.3],fov:40}; // 看翼门口她胸口高度（仰角留在带内）
    default:return{pos:[0,1.2+breath,5.6],look:[0,1.9,-2.5],fov:46};
  }
}
const poseBlink=(t,off=0)=>Math.max(0,1-Math.abs(((t+off)%3.7)-3.4)/.12);

function drawCard(kind,u){
  const a=kind==='open'?ease(clamp(u/.3))*(1-ease(clamp((u-.72)/.28))):ease(clamp((u-.45)/.5));
  if(a<=0)return;
  ctx.globalAlpha=Math.min(1,a);
  ctx.fillStyle='rgba(8,6,5,1)';ctx.fillRect(0,0,1280,720);
  ctx.textAlign='center';ctx.fillStyle='#e8ddc8';ctx.font='600 64px "Noto Sans SC",sans-serif';
  if(kind==='open'){
    ctx.fillText('迟到的一拍',640,340);
    ctx.font='28px "Noto Sans SC",sans-serif';ctx.fillStyle='#9c8f7a';
    ctx.fillText('社区剧院汇演夜',640,395);
  }else{ctx.fillText('剧 终',640,350);}
  ctx.globalAlpha=1;
}
function drawSubtitle(t){
  const s=TL.subtitles?.find(x=>x.start<=t&&t<x.end);
  if(!s)return;
  ctx.textAlign='center';ctx.font='30px "Noto Sans SC",sans-serif';
  ctx.lineWidth=5;ctx.strokeStyle='rgba(10,8,6,.9)';ctx.strokeText(s.text,640,662);
  ctx.fillStyle='#f4efe4';ctx.fillText(s.text,640,662);
}
// 演唱/对白嘴型占位（P3 换视素轨）：演唱段 jaw 随节拍轻开合唱幅
function jawAt(id,t){
  if(id==='song_1a')return t<30.8?.35*Math.abs(Math.sin(t*4.7)):.6*pulse2(t,31.0)+.12*Math.abs(Math.sin(t*3));
  if(id==='song_1b')return .30*Math.abs(Math.sin(t*4.4));
  if(id==='song_1c')return .42*Math.abs(Math.sin(t*4.9));
  if(id==='song_2')return .40*Math.abs(Math.sin(t*4.6));
  if(id==='talk_1')return .22*Math.abs(Math.sin(t*5.2))*((t>13&&t<17.5)||(t>22&&t<26.5)?1:0);
  if(id==='talk_2a'||id==='talk_2b')return .2*Math.abs(Math.sin(t*5))*((t>104&&t<108)||(t>110&&t<114)?1:0);
  return 0;
}
const pulse2=(t,c)=>Math.exp(-(((t-c)/.5)**2));

function draw(t,capture=true){
  const perf=poseAt(TL.segments,t);
  const {pA,pD}=driveFrame(apai,deng,perf,t);
  // 表情与符号（符号状态进 canvas key）
  apai.setEmotion(perf.sA.emotion,poseBlink(t));
  if(perf.sA.acting)apai.setActing({...perf.sA.acting,sweat:perf.sA.symSweat,dark:perf.sA.symDark});
  else apai.setActing({sweat:perf.sA.symSweat,dark:perf.sA.symDark});
  deng.setEmotion(perf.sD.emotion,poseBlink(t,.83));
  if(perf.sD.acting)deng.setActing(perf.sD.acting);
  apai.mouth.apply({jaw:jawAt(perf.id,t)});
  deng.mouth.apply({jaw:perf.id==='song_2'?jawAt(perf.id,t)*.9:perf.id.startsWith('talk_2')?jawAt(perf.id,t):0});
  // 眼神：演唱/对唱时互看或看观众；怯场段飘忽归谱面 headYaw
  // 次级运动：小灯马尾摆动（走位/摇摆幅度驱动，纯函数）
  const dSway=Math.min(1,(perf.sD.sway??0)*30)+((perf.sD.walk)?1:0)*.6;
  deng.ponySegs.forEach((g,i)=>{g.rotation.x=.10*Math.sin(t*2.3+i*.9)*dSway;g.rotation.z=.06*Math.sin(t*1.7+i*1.3)*dSway;});
  // 下摆襟片：臂推接口（手臂从内侧顶起襟片时掀起；静止垂落）——本集走位段手臂远离下摆，
  // 铰链保持零位，cloth 探针验证零穿透
  // 道具状态机：歌词卡（持有→收起）
  const cardHeld=t>=7.5&&t<30.6,pocket=ease(clamp((t-30)/1.0));
  if(cardHeld||t<31.2&&t>=30){
    const lh=apai.hands.left.getWorldPosition(new THREE.Vector3()),
          rh=apai.hands.right.getWorldPosition(new THREE.Vector3());
    const mid=lh.add(rh).multiplyScalar(.5);
    const hip=apai.mesh.localToWorld(new THREE.Vector3(.16,.84,.10)); // 裤袋位
    cardMesh.position.copy(mid.lerp(hip,pocket));
    cardMesh.visible=true;
  }else cardMesh.visible=false;
  // 手电：腰间→右手（102.8 取）；手持时挂手世界位姿，束光随 lampOn
  const held=t>=103.6,taking=t>=102.8&&t<103.6;
  if(held||taking){
    const hw=deng.hands.right.getWorldPosition(new THREE.Vector3());
    torchG.position.copy(hw);
    torchG.quaternion.copy(deng.hands.right.getWorldQuaternion(new THREE.Quaternion()));
    torchG.rotateX(-.5); // 筒轴朝前上
  }else{
    torchG.position.copy(deng.body.localToWorld(new THREE.Vector3(.14,.85,.06)));
    torchG.rotation.set(0,0,0);
  }
  const beam=torchG.getObjectByName('beam');
  beam.material.opacity=perf.lampOn*.16;beam.visible=perf.lampOn>.02;
  beam.scale.set(1,.9,1);
  stage.update(t,{curtainK:perf.curtainK,spot1:perf.spot1,spot2:perf.spot2,lampOn:0,footOn:perf.footOn});
  // 相机
  const c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??44}
    :camFor(perf.entry.shot,t);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();
  // 大汗滴 billboard（唱砸窗口，鬓角下滑退场）
  const sw=perf.sA.symSweat===2;
  if(sw){
    const u=clamp((t-31.2)/1.1);
    const hw=apai.headGroup.getWorldPosition(new THREE.Vector3());
    bigSweat.position.set(hw.x+.10,hw.y+.06-.05*u,hw.z+.06);
    bigSweat.quaternion.copy(camera.quaternion);
    bigSweat.material.opacity=1-u;bigSweat.visible=true;
  }else bigSweat.visible=false;
  // ── 探针 state 组装（与渲染同源）──
  scene.updateMatrixWorld(true);
  const state={t,phase:perf.id};
  state.limbBody={...limbBodyOf(apai,pA,'apai'),...limbBodyOf(deng,pD,'deng')};
  state.cloth=clothHits(deng,pD);
  state.env=probeBoxMeshes(stageProxies,{apai:apai.mesh,xiaodeng:deng.mesh},.004);
  const dengBelt=deng.body.children.find(o=>o.name==='belt');
  const wornD=probeBoxMeshes([dengBelt].filter(Boolean),{xiaodeng:deng.mesh},-.01);
  state.worn={margin:-.01,hits:wornD.hits,obstacles:['belt'],counts:{xiaodeng:wornD.counts?.xiaodeng}};
  const hw=actor=>({left:actor.hands.left.getWorldPosition(new THREE.Vector3()).toArray(),
    right:actor.hands.right.getWorldPosition(new THREE.Vector3()).toArray()});
  const aw=(actor,p)=>Object.fromEntries(['left','right'].map(side=>[side,
    p?.[side+'Arm']?p[side+'Arm'].map(v=>actor.mesh.localToWorld(new THREE.Vector3(v.x,v.y,v.z)).toArray()):null]));
  const _hwD=hw(deng);
  state.contact={hands:{apai:hw(apai),deng:_hwD,xiaodeng:_hwD},arms:{apai:aw(apai,pA),deng:aw(deng,pD)},
    boxPos:{card:cardMesh.position.toArray(),torch:torchG.position.toArray()},
    boxVis:{card:cardMesh.visible,torch:true}};
  state.locomotion={};
  for(const [name,actor,p] of [['apai',apai,pA],['xiaodeng',deng,pD]]){
    if(!p?.locomotion)continue;
    const feet={};
    for(const side of ['left','right']){
      const foot=actor.feet[side];let soleMin=Infinity;const vtx=new THREE.Vector3();
      foot.traverse(o=>{const a=o.geometry?.attributes.position;if(a)for(let i=0;i<a.count;i++){
        vtx.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);soleMin=Math.min(soleMin,vtx.y);}});
      feet[side]={position:foot.getWorldPosition(new THREE.Vector3()).toArray(),soleMin,
        quaternion:foot.getWorldQuaternion(new THREE.Quaternion()).toArray(),
        stance:p.locomotion.contacts[side].stance,id:p.locomotion.contacts[side].id};
    }
    state.locomotion[name]={kind:p.locomotion.kind,step:p.locomotion.step,steps:p.locomotion.steps,
      root:actor.mesh.position.toArray(),yaw:actor.mesh.rotation.y,bob:p.bob,feet,
      legs:Object.fromEntries(['left','right'].map(side=>[side,p[side+'Leg']]))};
  }
  state.pov={y:camera.position.y,z:camera.position.z,
    pitchDeg:Math.atan2(c.look[1]-c.pos[1],Math.hypot(c.look[0]-c.pos[0],c.look[2]-c.pos[2]))*180/Math.PI};
  if(!capture)return state;
  renderer.render(scene,camera);
  ctx.clearRect(0,0,1280,720);ctx.drawImage(renderer.domElement,0,0);
  if(perf.card){const u=clamp((t-perf.entry.start)/(perf.entry.end-perf.entry.start));drawCard(perf.card,u);}
  else drawSubtitle(t);
  if(new URLSearchParams(location.search).has('debug-facepip'))ctx.drawImage(apai.face.canvas,0,0,256,256); // 脸画布画中画调试
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.setFreeCamera=c=>window.freeCamera=c;
window.checkTimes=[...new Set([...TL.segments.flatMap(e=>[e.start+.15,(e.start+e.end)/2,e.end-.1]),
  7.5,9.5,11.5,30.5,33,36.5,42,50.5,72,80,103.5,106,115.5,118,120,140,160.5,162,166.5,168.5]
  .filter(t=>t>0&&t<TL.duration))].sort((a,b)=>a-b);
if(!new URLSearchParams(location.search).has('capture')){
  const btn=document.createElement('button');btn.textContent='播放 / 暂停';
  btn.style.cssText='position:fixed;bottom:14px;left:14px;z-index:3;padding:10px 18px;border:0;border-radius:22px;background:#e8ddc8;color:#1c1410;cursor:pointer';
  document.body.append(btn);
  let playing=false,tt=0,last=0;
  btn.onclick=()=>{playing=!playing;last=performance.now();};
  (function loop(){requestAnimationFrame(loop);if(playing){tt+=Math.min(.1,(performance.now()-last)/1000);last=performance.now();draw(Math.min(tt,TL.duration));}})();
}
await document.fonts.ready;window.ready=true;
