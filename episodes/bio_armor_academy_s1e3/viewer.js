// 《9章》S1E3《天台便当》viewer：横屏 1280×720，RooftopNoonScene + dula-assets bioarmor 角色。
// P1 静默版：无音频/无视素轨；对白=字幕条 + 说话方嘴部开合循环；字卡=纯文字平铺兜底。
// 形象赛璐璐统一（modeling-techniques §9）：viewer 侧遍历角色 mesh 统一成
// MeshToonMaterial + 共享 coolShadowRamp，不动 dula-assets 已验收资产。
import * as THREE from 'three';
import {LeiXiaoCraft,HongGangCraft} from 'dula-assets/characters/bioarmor/characters.js';
import {coolShadowRamp,outlined} from 'dula-assets/lib/craft3d/look.js';
import {RooftopNoonScene} from './scenes/RooftopNoonScene.js';
import {poseAt,ease,clamp,chewCycle,CHEW,PICK_T,TAKE_T} from './performance.js';
const W=1280,H=720;
const TL=await fetch('./config/timeline.json').then(r=>r.json());
window.duration=TL.duration;
const entries=TL.segments.map(s=>({startTime:s.start,endTime:s.end,character:s.character,
  opts:{move:s.move,shot:s.shot,kind:s.kind,card:s.card}}));
// P3 视素轨（缺失时静默降级回 talkJaw 循环）
let visemeLei=null,visemeHong=null,voiceFeatures=null;
try{visemeLei=await fetch('./config/viseme_leixiao.json').then(r=>r.ok?r.json():null);}catch{}
try{visemeHong=await fetch('./config/viseme_honggang.json').then(r=>r.ok?r.json():null);}catch{}
try{voiceFeatures=await fetch('./config/final_voice_features.json').then(r=>r.ok?r.json():null);}catch{}
const hasLip=!!(visemeLei&&visemeHong&&voiceFeatures);
function makeLip(track,name){
  const kf=track.keyframes,last=kf[kf.length-1];
  const chan=(t,k)=>{
    if(t<=kf[0].t)return kf[0][k];
    if(t>=last.t)return last[k];
    let lo=0,hi=kf.length-1;
    while(hi-lo>1){const m=(lo+hi)>>1;if(kf[m].t<=t)lo=m;else hi=m;}
    const a=kf[lo],b=kf[hi],u=(t-a.t)/Math.max(b.t-a.t,1e-6);
    const s=(1-Math.cos(Math.PI*u))/2;
    return a[k]+(b[k]-a[k])*s;
  };
  return t=>{
    const ff=voiceFeatures.characters[name],f=Math.min(ff.length-1,Math.max(0,t/.01)),ii=Math.floor(f);
    const gate=ff[ii].gate+(ff[Math.min(ii+1,ff.length-1)].gate-ff[ii].gate)*(f-ii);
    return {jaw:chan(t,'jaw')*gate,width:1+.4*chan(t,'width')};
  };
}
const lipTrackLei=hasLip?makeLip(visemeLei,'LeiXiao'):null;
const lipTrackHong=hasLip?makeLip(visemeHong,'HongGang'):null;
// 字卡帧序列（title-card 工具生成 config/cards.json；缺失时 drawCard 有纯文字兜底）
let cards={};
try{
  const meta=await fetch('./config/cards.json').then(r=>r.ok?r.json():null);
  if(meta)for(const c of meta.cards){
    cards[c.id]=await Promise.all(c.frames.map(f=>new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=f;})));
  }
}catch{}

const stage=new RooftopNoonScene();stage.build();
const lei=new LeiXiaoCraft(),hong=new HongGangCraft();
stage.scene.add(lei.mesh,hong.mesh);

// ── 赛璐璐材质统一：全身 toon + 共享 4 阶 ramp（皮肤/头发/衣服/装备一视同仁）──
// 例外：BackSide 描边壳、透明/加色光效、脸 canvas（animatedHead 组内，Basic 兜底保五官）。
const ramp=coolShadowRamp();
function celUnify(root){
  root.traverse(o=>{
    if(!o.isMesh||!o.material)return;
    const m=o.material;
    if(m.side===THREE.BackSide||m.transparent||m.blending!==THREE.NormalBlending)return;
    for(let p=o.parent;p;p=p.parent)if(p.name&&/_animated_head$/.test(p.name))return; // 脸与耳保持平涂
    if(m.isMeshToonMaterial){m.gradientMap=ramp;m.needsUpdate=true;return;} // 含壳疹 emissive 件
    const nm=new THREE.MeshToonMaterial({color:m.color?m.color.clone():0xffffff,map:m.map??null,
      gradientMap:ramp,vertexColors:!!m.vertexColors,side:m.side});
    if(m.emissive&&!m.isMeshLambertMaterial){nm.emissive=m.emissive.clone();nm.emissiveIntensity=m.emissiveIntensity??1;}
    o.material=nm;
  });
}
celUnify(lei.mesh);celUnify(hong.mesh);

// ── 次级运动挂载件识别（不写回资产，viewer 侧驱动）：雷晓书包 / 轰刚外套襟 / 雷晓发束尖 ──
const leiBag=lei.body.children.find(o=>o.isMesh&&o.geometry.parameters?.width===.2&&o.geometry.parameters?.height===.24);
const hongFlaps=hong.body.children.filter(o=>o.isMesh&&Math.abs(Math.abs(o.position.x)-.152)<.005);
const leiTufts=[];lei.headGroup.traverse(o=>{if(o.isMesh&&o.geometry.type==='TubeGeometry'&&o.material.side!==THREE.BackSide)leiTufts.push(o);});
// 阵风包络（解析微风正弦，(t,state) 纯函数）：空拍段加强
function windAt(t){return Math.max(0,.55*Math.sin(t*.31)+.45*Math.sin(t*.13+1.7))*(t>=55&&t<68?1.8:1);}
function secondary(t){
  const w=windAt(t);
  if(leiBag){ // 书包：硬材质，小幅
    leiBag.rotation.z=.08+.10*w*Math.sin(t*3.1)+.018*Math.sin(t*7.3);
    leiBag.rotation.x=.05*w*Math.sin(t*2.6+1);
  }
  hongFlaps.forEach((f,i)=>{ // 外套襟：软材质，摆幅稍大
    f.rotation.x=.10*w*Math.sin(t*2.9+i*1.3);
    f.rotation.z=(f.position.x>0?-1:1)*.05*w*Math.sin(t*3.4+i*.8);
  });
  leiTufts.forEach((m,i)=>{m.rotation.z=.012*w*Math.sin(t*2.2+i*1.9);m.rotation.x=.008*w*Math.sin(t*1.7+i);});
}

// ── 表情符号（billboard 载体：paintFace 属 dula-assets 不改；面片挂 headGroup、不进 boil）──
function symTex(draw){const c=document.createElement('canvas');c.width=c.height=128;draw(c.getContext('2d'));
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const dropTexture=symTex(g=>{ // 汗滴：水滴路径 + 高光点（配方坐标）
  g.translate(64,60);g.scale(2.6,2.6);
  g.beginPath();g.moveTo(0,-14);g.bezierCurveTo(9,-2,10,7,0,12);g.bezierCurveTo(-10,7,-9,-2,0,-14);
  g.fillStyle='#bfe3f2';g.fill();g.strokeStyle='#7fb6cf';g.lineWidth=1.5;g.stroke();
  g.fillStyle='#ffffff';g.beginPath();g.arc(-3,-5,2.5,0,Math.PI*2);g.fill();
});
const sweatPool=[];
for(let i=0;i<2;i++){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(.05,.06),
    new THREE.MeshBasicMaterial({map:dropTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  m.renderOrder=10;m.visible=false;lei.headGroup.add(m);sweatPool.push(m);
}
// 汗滴触发窗（情绪事件驱动，弹入 2-3 帧/停留/退场淡出，准时收场）：
// walk_in 收步坐定（转身面向镜头后符号才不被头发/后脑挡住）/ share_2 自嘲 / crack 愣住双滴与压光
const SWEAT=[{t0:12.2,t1:13.3,side:1},{t0:27.0,t1:28.2,side:1},{t0:46.7,t1:47.8,side:1,n:2},{t0:52.4,t1:53.5,side:1}];
// 豆豆眼：share_3「跟猫食似的」听到瞬间（硬切进硬切出；黑椭圆片贴眼位遮原眼）
// 豆豆眼面片会被刘海锁片挡住——按符号叠层处理：depthTest 关闭、renderOrder 置顶
//（仅 31.0–32.0s 正面镜头启用，侧背角度不穿帮窗口内不出现）
const beanGeo=new THREE.CircleGeometry(.0095,12);beanGeo.scale(1,1.45,1);
const beanMat=new THREE.MeshBasicMaterial({color:'#392b31',depthTest:false});
const beanL=new THREE.Mesh(beanGeo,beanMat),beanR=new THREE.Mesh(beanGeo,beanMat);
beanL.position.set(-.053,.087,.130);beanR.position.set(.053,.087,.130);
beanL.renderOrder=beanR.renderOrder=20;beanL.visible=beanR.visible=false;
lei.headGroup.add(beanL,beanR);
function symbols(t){
  let used=0;
  for(const ev of SWEAT){
    if(t<ev.t0||t>ev.t1)continue;
    for(let k=0;k<(ev.n??1)&&used<sweatPool.length;k++){
      const m=sweatPool[used++],d=(t-ev.t0)/(ev.t1-ev.t0);
      const pop=d<.07?ease(d/.07)*1.15:1.15-.15*ease(clamp((d-.07)/.13));
      const out=d>.8?1-(d-.8)/.2:1;
      m.visible=true;
      m.position.set(ev.side*(ev.x??.115)+k*.032*ev.side,.08-d*.06-k*.045,ev.z??.09);
      m.scale.setScalar(Math.max(pop,.001));m.material.opacity=out;
      m.lookAt(camera.position);
    }
  }
  for(let i=used;i<sweatPool.length;i++)sweatPool[i].visible=false;
  beanL.visible=beanR.visible=t>=31.0&&t<32.0;
}

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);
const ctx=canvas.getContext('2d');
const camera=new THREE.PerspectiveCamera(44,W/H,.05,200);

// ── 简化道具（便当盒/竹签炸鸡/水壶），viewer 侧挂接，纯时间函数 ──
const pmat=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});
function bento(base,lid,foods){
  const g=new THREE.Group();
  outlined(g,new THREE.BoxGeometry(.17,.05,.12),pmat(base),.0006).position.y=.025;
  const lidM=outlined(g,new THREE.BoxGeometry(.17,.012,.12),pmat(lid),.0006);
  lidM.geometry.translate(0,0,.06);lidM.position.set(0,.052,-.06);lidM.rotation.x=1.95; // 掀开靠在盒后
  for(const [x,z,c,r] of foods){
    const f=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),pmat(c));
    f.scale.y=.7;f.position.set(x,.046,z);g.add(f);
  }
  return g;
}
const leiBento=bento('#3a4a5a','#2c3844',[[-.04,.02,'#f4f0e6',.030],[.045,-.02,'#7a5a3a',.020],[.03,.035,'#5a7a4a',.016]]);
const hongBoxA=bento('#5a2e28','#48201c',[[-.04,.02,'#f4f0e6',.030],[.04,-.02,'#d8963c',.024],[.03,.035,'#d8963c',.020]]);
const hongBoxB=bento('#8a2e22','#6e241c',[[-.045,.02,'#d8963c',.026],[0,-.025,'#d8963c',.026],[.05,.02,'#d8963c',.026]]);
leiBento.scale.setScalar(1.15);hongBoxA.scale.setScalar(1.25);hongBoxB.scale.setScalar(1.25);
const skewer=new THREE.Group();
{
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.15,6),pmat('#caa86a'));
  stick.rotation.z=Math.PI/2;stick.position.x=.04;skewer.add(stick);
  var skewerNug=new THREE.Mesh(new THREE.IcosahedronGeometry(.024,1),pmat('#d8963c'));
  skewerNug.position.x=.115;skewer.add(skewerNug);
}
const hongNug=new THREE.Mesh(new THREE.IcosahedronGeometry(.026,1),pmat('#d8963c'));
const bottle=new THREE.Group();
{
  outlined(bottle,new THREE.CylinderGeometry(.042,.045,.15,12),pmat('#7a9ac8'),.0006).position.y=.075;
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.03,10),pmat('#e8e4da'));
  cap.position.y=.165;bottle.add(cap);
  bottle.position.set(-3.95,.545,-11.22);
}
stage.scene.add(leiBento,hongBoxA,hongBoxB,skewer,hongNug,bottle);
const FIXED_B=new THREE.Vector3(-3.1,.565,-11.05); // 轰刚放在矮沿上的那盒
const bp=(actor,x,y,z)=>actor.body.localToWorld(new THREE.Vector3(x,y,z));
function props(t,sl,sh){
  const sitL=sl.sit??0,sitH=sh.sit??0;
  const lagL=Math.max(-.03,Math.min(.03,(sl.bobLag??0)*1.5)),lagH=Math.max(-.03,Math.min(.03,(sh.bobLag??0)*1.5));
  leiBento.visible=sl.visible!==false&&t>=6.9;
  if(leiBento.visible){ // 便当盒随身体次级滞后（解析弹簧：bob 差分）
    leiBento.position.copy(bp(lei,0,(1-sitL)*1.10+sitL*.66,.27));
    leiBento.position.y-=lagL;
    leiBento.rotation.y=lei.mesh.rotation.y;
  }
  const hongOut=sh.visible!==false;
  hongBoxA.visible=hongOut&&t>=13.9;
  if(hongBoxA.visible){
    hongBoxA.position.copy(bp(hong,0,(1-sitH)*1.24+sitH*.70,.30));
    hongBoxA.position.y-=lagH;
    hongBoxA.rotation.y=hong.mesh.rotation.y;
  }
  // 两人份的第二盒：端着→坐下后放上矮沿
  const q=ease(clamp((t-21.3)/.9));
  hongBoxB.visible=hongOut&&t>=13.9;
  if(hongBoxB.visible){
    const carry=bp(hong,0,(1-sitH)*1.315+sitH*.775,.30);carry.y-=lagH;
    hongBoxB.position.lerpVectors(carry,FIXED_B,q);
    hongBoxB.rotation.y=hong.mesh.rotation.y*(1-q);
  }
  // 竹签炸鸡：轰刚右手递出 → 雷晓左手接过（签穿指缝锚定掌心；弧顶腕翻签尖朝嘴）
  skewer.visible=sl.visible!==false&&hongOut&&t>=PICK_T;
  if(skewer.visible){
    const hand=t<TAKE_T?hong.hands.right:lei.hands.left;
    hand.getWorldPosition(skewer.position);hand.getWorldQuaternion(skewer.quaternion);
    skewer.position.add(new THREE.Vector3(.025,.006,0).applyQuaternion(skewer.quaternion));
    // 腕翻：咬下窗口（crack 47.3–48.6）与空拍咀嚼抬手（raise>.4）把签尖转向嘴
    let bite=ease(clamp((t-47.3)/.4))*ease(clamp((48.6-t)/.25));
    if(t>=55&&t<68)bite=Math.max(bite,chewCycle(t,CHEW.lei.period,CHEW.lei.offset).raise);
    if(bite>.01&&t>=TAKE_T){
      const mouth=lei.face.head.localToWorld(new THREE.Vector3(0,.007,.125)).sub(skewer.position).normalize();
      const qTarget=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),mouth);
      skewer.quaternion.slerp(qTarget,bite);
    }
    skewerNug.visible=t<48.3||t>=56.0;
  }
  // 轰刚手里那块
  hongNug.visible=hongOut&&((t>=47.6&&t<50.6)||t>=55.4);
  if(hongNug.visible){
    const hand=hong.hands.right;
    hand.getWorldPosition(hongNug.position);hand.getWorldQuaternion(hongNug.quaternion);
    hongNug.position.add(new THREE.Vector3(.05,0,.01).applyQuaternion(hongNug.quaternion));
  }
  // 轰刚转身够水壶：壶身被带歪一点
  bottle.rotation.z=.25*Math.exp(-(((t-53.4)/.5)**2));
}

// ── 口型：对白段说话方嘴部开合循环（真视素轨 P3 再接）；咀嚼与表演谱同相位 ──
const talk={LeiXiao:[],HongGang:[]};
for(const s of TL.subtitles)talk[s.character]?.push([s.start,s.end]);
function talkJaw(t,wins){
  const w=wins.find(([a,b])=>t>=a&&t<b);if(!w)return null;
  const g=ease(clamp((t-w[0])/.2))*ease(clamp((w[1]-t)/.3));
  return {jaw:Math.max(0,.15+.19*Math.sin(t*8.3)+.09*Math.sin(t*13.7+1))*g,width:1+.05*Math.sin(t*5.1)};
}
function lipLei(t){
  if(t>=46.9&&t<48.6){const d=t-46.9; // 与手部进食弧线同帧：抬起→嘴前停顿→张口→咬下
    const open=ease(clamp((d-1.35)/.15))*ease(clamp((1.85-d)/.15));
    return{jaw:.05+.35*open,width:1};}
  if(t>=48.6&&t<50.2)return{jaw:.28+.06*Math.sin(t*9),width:1.12};                     // 笑
  if(t>=52.0&&t<54.6)return{jaw:.04,width:.9};                                         // 愣住压光
  if(t>=55&&t<68){const c=chewCycle(t,CHEW.lei.period,CHEW.lei.offset);return{jaw:.24*c.chew,width:1};}
  if(lipTrackLei)return lipTrackLei(t); // P3：视素轨驱动（咀嚼段优先咀嚼）
  return talkJaw(t,talk.LeiXiao)??{jaw:0,width:1};
}
function lipHong(t){
  if(t>=47.8&&t<50.4)return{jaw:.22*Math.max(0,Math.sin((t-47.8)*4)),width:1};
  if(t>=55&&t<68){const c=chewCycle(t,CHEW.hong.period,CHEW.hong.offset);return{jaw:.26*c.chew,width:1};}
  if(lipTrackHong)return lipTrackHong(t);
  return talkJaw(t,talk.HongGang)??{jaw:0,width:1};
}

// ── 字幕（底部描边条，角色分色，同 S1E2 版式）──
const SUB_COLOR={LeiXiao:'#d8ecff',HongGang:'#ffd9a0'};
function drawSubtitle(t){
  const sub=TL.subtitles.find(s=>t>=s.start-.06&&t<s.end);
  if(!sub||!sub.text)return null;
  const fragments=(sub.text.match(/[^，。！？…—]+[，。！？…—]?/g)??[sub.text])
    .flatMap(f=>{const out=[];while(f.length>24){out.push(f.slice(0,24));f=f.slice(24);}if(f)out.push(f);return out;});
  const lines=[];let line='';
  for(const f of fragments){
    if((line+f).length>24&&line){lines.push(line);line='';}
    line+=f;
    if(/[！？]$/.test(f)){lines.push(line);line='';}
  }if(line)lines.push(line);
  const y=H-66-(lines.length-1)*34;
  ctx.font='bold 25px Microsoft YaHei';ctx.textAlign='center';ctx.lineWidth=6;ctx.lineJoin='round';
  for(let i=0;i<lines.length;i++){
    ctx.strokeStyle='rgba(16,14,20,.88)';ctx.fillStyle=SUB_COLOR[sub.character]??'#fff';
    ctx.strokeText(lines[i],W/2,y+i*34);ctx.fillText(lines[i],W/2,y+i*34);
  }
  return sub.text;
}
// 字卡（title-card 帧序列；缺帧时退回纯文字平铺）
function drawCard(id,u){
  const frames=cards[id];
  if(frames&&frames.length){const f=frames[Math.min(frames.length-1,Math.floor(u*frames.length))];
    if(f){ctx.drawImage(f,0,0,W,H);return;}}
  ctx.fillStyle=`rgba(14,12,16,${Math.min(1,u*4,(1-u)*4+.2)})`;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#f4efe6';ctx.textAlign='center';
  ctx.font='bold 72px STKAITI,KaiTi,serif';
  ctx.fillText(id==='open'?'9章·残卷其三':'残卷·其三·终',W/2,H*.45);
}

const lerp3=(a,b,u)=>a.map((x,i)=>x+(b[i]-x)*u);
function camFor(shot,t,entry){
  const u=entry?ease(clamp((t-entry.startTime)/(entry.endTime-entry.startTime))):0;
  switch(shot){
    case 'establish':return{pos:lerp3([8.2,3.8,4.6],[5.8,2.7,1.2],u),look:[-4.2,1.2,-11],fov:50};
    case 'walk':{const p=lei.mesh.position;return{pos:lerp3([-1.2,1.7,-4.6],[-1.8,1.5,-6.4],u),look:[p.x+.3,1.0,p.z],fov:42};}
    case 'hong_arrive':return{pos:[-.6,1.8,-5.4],look:lerp3([-6.4,1.3,-8.0],[-3.2,1.0,-11.0],u),fov:44};
    case 'two':return{pos:[-3.0,1.15,-8.6],look:[-3.0,.95,-11.2],fov:41};
    case 'offer':return{pos:[-2.45,1.30,-9.35],look:[-3.05,1.00,-11.1],fov:35};
    case 'crack':return{pos:[-1.55,1.25,-9.75],look:[-2.55,1.02,-11.15],fov:34};
    case 'empty':return{pos:lerp3([4.4,2.5,-.6],[3.6,2.3,-1.8],u),look:[-3.4,.9,-11.3],fov:46};
    default:return{pos:[.5,1.9,6.2],look:[0,1,-6],fov:46};
  }
}

function draw(t,capture=true){
  const performance=poseAt(lei,hong,entries,t);
  const {entry,i,opts,u,sl,sh}=performance;
  stage.update(t);
  // 眼神跟随对戏搭档（P1 默认，空拍远望由 headYaw 谱面表达）
  lei.mesh.updateMatrixWorld(true);hong.mesh.updateMatrixWorld(true);
  const gazeLei=hong.headGroup.getWorldPosition(new THREE.Vector3());
  const gazeHong=lei.headGroup.getWorldPosition(new THREE.Vector3());
  lei.face.lookAtWorld?.(gazeLei);hong.face.lookAtWorld?.(gazeHong);
  lei.setEmotion(sl.emotion,poseBlink(t));
  hong.setEmotion(sh.emotion??'neutral',poseBlink(t+.83));
  lei.updateWeaponFX?.(t,0,0); // 壳疹日常微光心跳
  if(sl.flashT>.01)lei.dailyMats.forEach(m=>m.emissiveIntensity=Math.min(2.2,m.emissiveIntensity+sl.flashT*1.6)); // 袖口微光一闪
  lei.mouth.apply(lipLei(t));
  hong.mouth.apply(lipHong(t));
  props(t,sl,sh);
  secondary(t);

  let c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??44}:camFor(opts.shot??'two',t,entry);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();
  symbols(t); // billboard 朝向必须在相机定位之后（seek 直接跳转时相机无历史帧）

  const locomotion={};
  for(const [name,actor,p] of [['lei',lei,performance.pL],['hong',hong,performance.pH]])if(p?.locomotion){
    const feet={};actor.mesh.updateMatrixWorld(true);
    for(const side of ['left','right']){
      const foot=actor.feet[side];let soleMin=Infinity;
      const vertex=new THREE.Vector3();
      foot.traverse(o=>{const a=o.geometry?.attributes.position;if(a)for(let i=0;i<a.count;i++){
        vertex.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);soleMin=Math.min(soleMin,vertex.y);
      }});
      feet[side]={position:foot.getWorldPosition(new THREE.Vector3()).toArray(),soleMin,
        quaternion:foot.getWorldQuaternion(new THREE.Quaternion()).toArray(),...p.locomotion.contacts[side]};
    }
    locomotion[name]={...p.locomotion,root:actor.mesh.position.toArray(),yaw:actor.mesh.rotation.y,feet,
      legs:Object.fromEntries(['left','right'].map(side=>[side,p[side+'Leg']]))};
  }
  const state={entry:i+1,phase:opts.move,shot:opts.shot,leiEmotion:sl.emotion,hongEmotion:sh.emotion,
    flash:sl.flashT,leiRoot:[sl.rootX,sl.rootZ],hongRoot:[sh.rootX,sh.rootZ],
    ...(Object.keys(locomotion).length?{locomotion}:{})};
  // 接触探针数据（tools/check_contact.py）：手/门板/签尖/嘴/便当盒世界坐标
  const contact={doorA:stage.doorA(t),
    hands:{lei:{left:lei.hands.left.getWorldPosition(new THREE.Vector3()).toArray(),
                right:lei.hands.right.getWorldPosition(new THREE.Vector3()).toArray()},
           hong:{left:hong.hands.left.getWorldPosition(new THREE.Vector3()).toArray(),
                 right:hong.hands.right.getWorldPosition(new THREE.Vector3()).toArray()}},
    mouthLei:lei.face.head.localToWorld(new THREE.Vector3(0,.007,.125)).toArray()};
  if(skewer.visible)contact.skewerTip=skewer.position.clone().add(new THREE.Vector3(.13,0,0).applyQuaternion(skewer.quaternion)).toArray();
  if(leiBento.visible)contact.leiBento=leiBento.position.toArray();
  if(hongBoxA.visible)contact.hongBoxA=hongBoxA.position.toArray();
  state.contact=contact;
  if(!capture)return state;
  renderer.render(stage.scene,camera);
  ctx.clearRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0);
  if(opts.kind==='card')drawCard(opts.card,u);
  state.subtitle=drawSubtitle(t);
  return {image:canvas.toDataURL('image/jpeg',.93).split(',')[1],state};
}
function poseBlink(t){return Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);}
window.renderAt=t=>draw(t);window.stepAt=t=>draw(t,false);
window.setFreeCamera=c=>window.freeCamera=c;
window.checkTimes=[...new Set([...entries.flatMap(e=>[e.startTime+.15,(e.startTime+e.endTime)/2,e.endTime-.10]),
  6.9,9.0,10.5,12.7,13.85,14.45,14.9,17.5,21.0,21.95,27.5,31.5,42.5,44.8,47.2,48.5,52.2,52.8,53.5,57,63]
  .filter(t=>t>0&&t<window.duration))].sort((a,b)=>a-b);
await document.fonts.ready;window.ready=true;
if(!new URLSearchParams(location.search).has('capture')){
  const audio=new Audio('./assets3d/mixed.wav'); // P3 起带混音预览；缺失回退手动时钟
  let useAudio=true;audio.onerror=()=>{useAudio=false;};
  let playing=false,tt=0,last=0;
  const play=document.createElement('button');play.textContent='播放 / 暂停';play.style.cssText='position:fixed;bottom:14px;left:14px;z-index:3;padding:10px 18px;border:0;border-radius:22px;background:#f4efe6;color:#1c1a22;cursor:pointer';document.body.append(play);
  play.onclick=()=>{if(useAudio){audio.paused?audio.play():audio.pause();}else{playing=!playing;last=performance.now();}};
  const seek=document.createElement('input');seek.type='range';seek.min=0;seek.max=window.duration;seek.step=.01;seek.style.cssText='position:fixed;bottom:24px;left:160px;width:min(45vw,400px)';document.body.append(seek);
  seek.oninput=()=>{if(useAudio)audio.currentTime=Number(seek.value);else tt=Number(seek.value);};
  function tick(){
    let now=tt;
    if(useAudio)now=audio.currentTime;
    else{if(playing){const n=performance.now();tt=Math.min(window.duration-.01,tt+(n-last)/1000);last=n;}now=tt;}
    draw(now);if(document.activeElement!==seek)seek.value=now;requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
}
