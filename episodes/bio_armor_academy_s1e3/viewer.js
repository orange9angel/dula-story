// 《9章》S1E3《天台便当》viewer：横屏 1280×720，RooftopNoonScene + dula-assets bioarmor 角色。
// P1 静默版：无音频/无视素轨；对白=字幕条 + 说话方嘴部开合循环；字卡=纯文字平铺兜底。
// 形象赛璐璐统一（modeling-techniques §9）：viewer 侧遍历角色 mesh 统一成
// MeshToonMaterial + 共享 coolShadowRamp，不动 dula-assets 已验收资产。
import * as THREE from 'three';
import {LeiXiaoCraft,HongGangCraft} from 'dula-assets/characters/bioarmor/characters.js';
import {coolShadowRamp,outlined} from 'dula-assets/lib/craft3d/look.js';
import {RooftopNoonScene} from './scenes/RooftopNoonScene.js';
import {poseAt,ease,clamp,chewCycle,CHEW,PICK_T,TAKE_T} from './performance.js';
const doorProbe=new URLSearchParams(location.search).has('probe-door')
  ?(await import('./tools/door_probe.js')).probeDoorway:null;
const bentoProbe=new URLSearchParams(location.search).has('probe-bento')
  ?(await import('./tools/door_probe.js')).probeBoxMeshes:null;
// 铁丝网面片的薄板代理（道具/身体 vs 环境的净空探针用，不进画面）
let fenceProxies=null;
function ensureFenceProxies(){
  if(fenceProxies)return fenceProxies;
  const mk=(name,w,h,rotY,pos)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.02));
    m.name=name;m.rotation.y=rotY;m.position.set(...pos);m.visible=false;stage.scene.add(m);return m;};
  fenceProxies=[mk('fence_n',29.3,1.7,0,[0,1.35,-11.37]),mk('fence_w',18.6,1.7,Math.PI/2,[-14.62,1.35,-2.0])];
  return fenceProxies;
}
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
for(const actor of [lei,hong]){
  const label=(root,part)=>root?.traverse(o=>{if(o.isMesh)o.userData.contactPart=part;});
  label(actor.body,'body');label(actor.headGroup,'head');
  for(const [key,limb] of Object.entries(actor.limbs))label(limb.mesh,key);
  for(const [key,sleeve] of Object.entries(actor.sleeves??actor.wraps))label(sleeve.mesh,'sleeve_'+key);
  for(const side of ['left','right']){label(actor.hands[side],side+'Hand');label(actor.feet[side],side+'Foot');}
}

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
// 书包三件套（包体/包盖/背带）是身体的合法穿戴接触：worn_prop 探针里跳过它们自身，
// 只断言"包体 vs 躯干其它件"的深穿（probeBoxMeshes 无遍历剪枝，靠标记跳过）
// 穿戴位校正（viewer 侧常量，不改资产）：枢轴移到包顶 + 外移 + 重力外倾，
// 包底甩出大腿摆动面（原中心枢轴内埋大腿 5.7cm，走路/落座穿模实录）
if(leiBag){
  const bagLid=lei.body.children.find(o=>o.isMesh&&o.geometry.parameters?.width===.2&&o.geometry.parameters?.height===.06);
  const bagStrap=lei.body.children.find(o=>o.isMesh&&o.geometry.type==='TubeGeometry');
  leiBag.geometry.translate(0,-.12,0); // pivot：中心→包顶（描边壳共用同一 geometry，跟随）
  leiBag.position.set(-.25,.90,.04);   // 世界挂点=原包顶；外移 8cm 微后移（扫描实证：-.25 起零命中）
  if(bagLid){leiBag.add(bagLid);bagLid.position.set(0,-.015,0);} // 包盖挂到包体上随摆
  leiBag.userData.hangTilt=-.16;       // 重力外倾角（secondary 叠加风摆；负=包底朝外）
  leiBag.userData.lid=bagLid;leiBag.userData.strap=bagStrap;
  // 斜挎包可读性：包体提亮（深棕撞深蓝裤子远景读不出——"只有一条绳"实录）+ 背带尾连接件
  leiBag.material.color.set('#9a6b42');
  if(bagLid)bagLid.material.color.set('#7a4f30');
  if(bagStrap){
    const link=outlined(lei.body,new THREE.CylinderGeometry(.008,.008,1,6),
      new THREE.MeshToonMaterial({color:'#8a6a3a',gradientMap:ramp}),.0004);
    link.userData.probeExclude=1;leiBag.userData.strapLink=link;
  }
  for(const m of [leiBag,bagLid,bagStrap])if(m)m.userData.probeExclude=1;
}
// 肩窝覆盖件（viewer 侧补件，资产不动）：lean 俯身时躯干前倾、臂根不动，袖根与肩环开缝——
// 椭球桥接"躯干肩点（含 lean，body 系换算）→臂根（mesh 系）"，缝隙为零时缩到内嵌不可见
const shoulderCaps=[];
for(const [actor,r,c,sh,shY] of [[lei,.055,'#ede8dd',.13,1.375],[hong,.075,'#303440',.18,1.56]]){
  for(const [side,sign] of [['left',-1],['right',1]]){
    const cap=outlined(actor.mesh,new THREE.SphereGeometry(1,14,10),
      new THREE.MeshToonMaterial({color:c,gradientMap:ramp}),.0005);
    cap.userData.contactPart='body'; // 与躯干同部件参与接触判定
    shoulderCaps.push({actor,side,sign,cap,r,torso:new THREE.Vector3(sign*(sh-.02),shY-.04,0)});
  }
}
// 手-躯干/大腿网格级探针代理（不可见盒，不渲染；坐姿段手嵌入深穿断言用）：
// 躯干盒挂 body（随 lean/bob），大腿盒逐帧对准髋→膝段
const bodyProxies=[],thighProxies=new Map(),torsoProxyMap=new Map();
for(const [actor,tw,tY0,tY1,td,thR] of [[lei,.30,.95,1.45,.19,.077],[hong,.38,.98,1.58,.22,.098]]){
  const torso=new THREE.Mesh(new THREE.BoxGeometry(tw,tY1-tY0,td));
  torso.name='torso';torso.position.y=(tY0+tY1)/2;torso.visible=false;actor.body.add(torso);
  bodyProxies.push(torso);torsoProxyMap.set(actor,torso);
  const pair={};
  for(const side of ['left','right']){
    const thigh=new THREE.Mesh(new THREE.BoxGeometry(thR*2.2,1,thR*2.0));
    thigh.name='thigh_'+side;thigh.visible=false;actor.mesh.add(thigh);bodyProxies.push(thigh);pair[side]=thigh;
  }
  thighProxies.set(actor,pair);
}
const hongFlaps=hong.body.children.filter(o=>o.isMesh&&Math.abs(Math.abs(o.position.x)-.152)<.005);
for(const flap of hongFlaps){flap.geometry.translate(0,-1.52,0);flap.position.y=1.52;
  flap.position.x*=1.22;} // 静态外张：襟片让出垂臂通道（P17 前臂穿襟实录）
const leiTufts=[];lei.headGroup.traverse(o=>{if(o.isMesh&&o.geometry.type==='TubeGeometry'&&o.material.side!==THREE.BackSide)leiTufts.push(o);});
// 阵风包络（解析微风正弦，(t,state) 纯函数）：空拍段加强
// 18.2s 阵风脉冲：把轰刚没关严的门带上（门迁移的可见环境触发——状态/声音/动因一致）
const gustAt=t=>Math.exp(-(((t-18.2)/.35)**2));
function windAt(t){return Math.max(0,.55*Math.sin(t*.31)+.45*Math.sin(t*.13+1.7))*(t>=55&&t<68?1.8:1)*(1+1.4*gustAt(t));}
function secondary(t,sl,sh,pH){
  const w=windAt(t),lean=sl.lean??0,lerp=THREE.MathUtils.lerp;
  if(leiBag){ // 书包：硬材质，小幅；枢轴在包顶，重力外倾+风摆；俯身时逆 lean 回摆保持垂感
    leiBag.rotation.z=(leiBag.userData.hangTilt??0)+.08*w*Math.sin(t*3.1)+.018*Math.sin(t*7.3);
    leiBag.rotation.x=-.6*lean+.05*w*Math.sin(t*2.6+1);
    // 挂点保持 P12 净空位（坐姿前摆会重新嵌入大腿——坐姿大腿外侧鼓到 x -.20，实测复穿）；
    // 可读性靠包体提亮+背带连接件，不靠移位
    const link=leiBag.userData.strapLink;
    if(link){ // 背带尾端→包顶挂点的连接绳（随包摆动，body 局部系）
      const a=new THREE.Vector3(-.14,.85,.08),b=leiBag.position.clone().add(new THREE.Vector3(.03,-.01,0));
      const d=b.sub(a),len=d.length();
      link.position.copy(a).addScaledVector(d,.5);
      link.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
      link.scale.set(1,len,1);
    }
  }
  hongFlaps.forEach((f,i)=>{ // 外套襟：软材质，摆幅稍大；襟片静息即搭在臂前外侧（不共面穿刺），
    const side=f.position.x>0?'right':'left',a=pH?.[side==='left'?'leftArm':'rightArm'];
    let letOff=0; // 前臂前摆/上抬时再加让位（绕臂外倾）
    if(a){const fdz=a[2].z-a[1].z,fdy=a[2].y-a[1].y;letOff=Math.max(0,fdz)*1.2+Math.max(0,fdy)*.3;}
    f.rotation.x=-.06+w*.10*Math.sin(t*2.9+i*1.3)-letOff*.35; // 底缘微前倾盖过臂外侧
    f.rotation.z=(f.position.x>0?1:-1)*(.14+letOff*.25)+(f.position.x>0?-1:1)*.05*w*Math.sin(t*3.4+i*.8);
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
  const baseM=outlined(g,new THREE.BoxGeometry(.17,.05,.12),pmat(base),.0006);baseM.position.y=.025;
  const lidM=outlined(g,new THREE.BoxGeometry(.17,.012,.12),pmat(lid),.0006);
  lidM.geometry.translate(0,0,.06);lidM.position.set(0,.052,-.06); // negative X raises the lid
  g.base=baseM;g.lid=lidM;
  g.foods=[];
  for(const [x,z,c,r] of foods){
    const f=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),pmat(c));
    f.scale.y=.7;f.position.set(x,.046,z);g.add(f);g.foods.push(f);
  }
  return g;
}
const leiBento=bento('#3a4a5a','#2c3844',[[-.04,.02,'#f4f0e6',.030],[.045,-.02,'#7a5a3a',.020],[.03,.035,'#5a7a4a',.016]]);
const hongBoxA=bento('#5a2e28','#48201c',[[-.04,.02,'#f4f0e6',.030],[.04,-.02,'#d8963c',.024],[.03,.035,'#d8963c',.020]]);
const hongBoxB=bento('#8a2e22','#6e241c',[[-.045,.02,'#d8963c',.026],[0,-.025,'#d8963c',.026],[.05,.02,'#d8963c',.026]]);
for(const [name,box] of Object.entries({leiBento,hongBoxA,hongBoxB})){
  box.base.name=name+'_base';box.lid.name=name+'_lid';
}
leiBento.scale.setScalar(1.15);hongBoxA.scale.setScalar(1.25);hongBoxB.scale.setScalar(1.25);
const skewer=new THREE.Group();
{
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.15,6),pmat('#caa86a'));
  stick.rotation.z=Math.PI/2;stick.position.x=.04;skewer.add(stick);
  var skewerNug=new THREE.Mesh(new THREE.IcosahedronGeometry(.024,1),pmat('#d8963c'));
  skewerNug.position.set(.115,.008,0);skewer.add(skewerNug); // 签尖从球体下半进入（球心略高于签轴）
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
// 放置落点从谱面派生（初始化时对固定释放时刻摆一次姿势读腕部坐标——纯函数常数，seek 安全）
const LEI_REL=51.35,HONG_REL=22.2,LEI_GRIP=[0,-.055,.05],HONG_GRIP=[0,-.10,.05];
let LEI_GUIDE=null,HONG_GUIDE=null,HONG_DROP=null,LEI_SET=null,FIXED_B=null;
const bp=(actor,x,y,z)=>actor.body.localToWorld(new THREE.Vector3(x,y,z));
// 掌面顶面厚度（hand.js：掌椭球半径 .0205 沿 sign*Z=掌向；乘手部 scale 得世界厚度）。
// 托盘偏移与 grip 断言共用这一常数，避免"拍脑袋偏移"再次浮盒
const PALM_TOP=.0205;
function supportedBox(actor,side,offset){ // mesh 系偏移（抓握/提沿段用）
  // Use the solved wrist exactly once: body-space y already includes the sitting drop.
  return actor.hands[side].getWorldPosition(new THREE.Vector3())
    .add(new THREE.Vector3(...offset).applyQuaternion(actor.mesh.quaternion));
}
function handBox(actor,side,x,y){ // 手系锚定（托盘段）：盒底中心=掌面中点，落在掌面顶面
  const hand=actor.hands[side],s=hand.scale.x;
  return hand.getWorldPosition(new THREE.Vector3())
    .add(new THREE.Vector3(x*s,y*s,hand.sign*PALM_TOP*s).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())));
}
// 道具状态机同源：托盘手强度=盒状态（hidden→held→placing→down）的函数，
// 只在手持/放下过渡期间生效，放下后缓回谱面手势（杜绝"手举着盒不在"）。
function trayK(t,appear,placeT1){
  if(t<appear)return 0;
  const inK=ease(clamp((t-appear)/.3));
  if(placeT1==null)return inK;
  return inK*(1-ease(clamp((t-placeT1)/.12))); // 放下后 .12s 内缓出（与手部收回同步，防托盘泄漏）
}
// 手腕生理域（所有手部朝向覆盖的唯一入口）：掌朝向由前臂轴推导，相对自然掌向扭转限 ±60°。
// 无条件"世界掌心向上"会在前臂下垂时把腕扭到不生理角度（S1E3 23s 特写翻车实录）。
const wristAudit={}; // 每帧 twist 需求/实际值 → contact 日志
const palmAudit={};  // 送嘴掌向语义（掌心-躯干点积）→ contact 日志
function physioTray(actor,side,k,arm,gripFist=.22){
  if(k<=0)return; // k=0：姿势完全归谱面（setPose+gL/gR）
  const hand=actor.hands[side];
  const qBase=hand.quaternion.clone();
  const fd=actor.mesh.localToWorld(new THREE.Vector3(arm[2].x,arm[2].y,arm[2].z))
    .sub(actor.mesh.localToWorld(new THREE.Vector3(arm[1].x,arm[1].y,arm[1].z))).normalize(); // 肘→腕
  const fwd=new THREE.Vector3(0,0,1);
  const y0=fwd.clone().addScaledVector(fd,-fwd.dot(fd)).normalize(),z0=fd.clone().cross(y0).normalize();
  const palmNat=z0.clone().multiplyScalar(hand.sign);
  const up=new THREE.Vector3(0,1,0);
  const upProj=up.clone().addScaledVector(fd,-up.dot(fd));
  const palmUp=upProj.length()>.1?upProj.normalize():palmNat.clone(); // 前臂近竖直时退回自然掌向
  const demand=Math.acos(clamp(palmNat.dot(palmUp),-1,1));
  const applied=Math.min(demand,Math.PI/3); // 扭转限位 ±60°
  const palm=demand>Math.PI/3?palmNat.clone().lerp(palmUp,Math.PI/3/demand).normalize():palmUp;
  const z=palm.clone().multiplyScalar(hand.sign).normalize();
  const y=z.clone().cross(fd).normalize();const z2=fd.clone().cross(y).normalize();
  const qTray=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(fd,y,z2));
  hand.quaternion.copy(qBase).slerp(qTray,k);
  hand.setGesture({fist:.12+(gripFist-.12)*k,open:0,point:0}); // 扣边托：指腹扣上盒侧壁
  hand.updateMatrixWorld(true);
  wristAudit[actor.mesh.name+':'+side]={demandDeg:demand*180/Math.PI,appliedDeg:applied*180/Math.PI,
    palmDot:Math.abs(z.dot(fd)),k}; // palmDot≈0：掌法向量与前臂轴垂直
}
// 动作语义掌向约束（与 physioTray 同级）：bring-to-mouth 类动作掌法向量必须朝向躯干半球——
// 前臂旋后、掌心朝自己；自然基在抬手送嘴时是掌心朝外（反掌送嘴翻车实录）。
// 只扭腕部朝向，不动手型（持签的半捏由谱面 gL/gR 保持）。
function physioPalm(actor,side,k,arm){
  if(k<=0)return;
  const hand=actor.hands[side];
  const qBase=hand.quaternion.clone();
  const fd=actor.mesh.localToWorld(new THREE.Vector3(arm[2].x,arm[2].y,arm[2].z))
    .sub(actor.mesh.localToWorld(new THREE.Vector3(arm[1].x,arm[1].y,arm[1].z))).normalize();
  const fwd=new THREE.Vector3(0,0,1);
  const y0=fwd.clone().addScaledVector(fd,-fwd.dot(fd)).normalize(),z0=fd.clone().cross(y0).normalize();
  const palmNat=z0.clone().multiplyScalar(hand.sign);
  const handPos=hand.getWorldPosition(new THREE.Vector3());
  const inward=actor.mesh.localToWorld(new THREE.Vector3(0,1.15,0)).sub(handPos); // 指向胸口
  const inw=inward.clone().normalize();
  const inProj=inw.clone().addScaledVector(fd,-inw.dot(fd));
  const palmIn=inProj.length()>.1?inProj.normalize():palmNat.clone(); // 前臂直指胸口时退回自然掌向
  const demand=Math.acos(clamp(palmNat.dot(palmIn),-1,1));
  const applied=Math.min(demand,Math.PI*4/9); // 前臂旋后生理域 ~85°，限 80°（托盘腕扭仍是 ±60°）
  const palm=demand>Math.PI*4/9?palmNat.clone().lerp(palmIn,(Math.PI*4/9)/demand).normalize():palmIn;
  const z=palm.clone().multiplyScalar(hand.sign).normalize();
  const y=z.clone().cross(fd).normalize();const z2=fd.clone().cross(y).normalize();
  hand.quaternion.copy(qBase).slerp(new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(fd,y,z2)),k);
  hand.updateMatrixWorld(true);
  palmAudit[actor.mesh.name+':'+side]={dot:palm.dot(inw),k, // 世界掌向=palm（sign 已在基底下换算）
    demandDeg:demand*180/Math.PI}; // dot≥0：掌心在躯干半球
}
// 放置落点校准：对固定释放时刻摆一次谱面姿势，读腕部世界坐标（纯函数常数，seek 安全）；
// 落点=引导点竖直落到台面（重力沉降），保证"释放帧盒位=静置位姿"零跳变
function calibratePlacement(){
  const perf1=poseAt(lei,hong,entries,LEI_REL);physioTray(lei,'right',1,perf1.pL.rightArm);
  LEI_GUIDE=lei.hands.right.getWorldPosition(new THREE.Vector3())
    .add(new THREE.Vector3(...LEI_GRIP).applyQuaternion(lei.mesh.quaternion));
  LEI_SET=new THREE.Vector3(LEI_GUIDE.x,.575,LEI_GUIDE.z);
  const perf2=poseAt(lei,hong,entries,HONG_REL);physioTray(hong,'left',1,perf2.pH.leftArm);
  HONG_GUIDE=hong.hands.right.getWorldPosition(new THREE.Vector3())
    .add(new THREE.Vector3(...HONG_GRIP).applyQuaternion(hong.mesh.quaternion));
  HONG_DROP=new THREE.Vector3(HONG_GUIDE.x,.575,HONG_GUIDE.z); // 落台点=引导点正下方
  FIXED_B=new THREE.Vector3(-2.88,.575,-11.22); // 推滑终点：两人中间（P5/P6 探针验证过的净空位）
}
calibratePlacement();
function props(t,sl,sh,pL,pH){
  for(const k in wristAudit)delete wristAudit[k]; // 审计逐帧重建（k=0 的帧不留陈值）
  for(const k in palmAudit)delete palmAudit[k];
  // 托盘手全部挂道具状态且过手腕生理域限位：雷晓右手托盒 6.9→51.35（放下后 .35s 缓出）；
  // 轰刚左手 13.9 起全程托；雷晓左手扶沿仅搬运段（坐定收回，不续到 40s——空托盘外翻翻车实录）；
  // 轰刚右手出门段（13.9–15.1）。托盘手型=扣边托（指腹扣上盒侧壁，gripFist .45）
  physioTray(lei,'right',trayK(t,6.9,51.35),pL.rightArm,.45);
  physioTray(hong,'left',trayK(t,13.9,null),pH.leftArm,.45);
  physioTray(lei,'left',ease(clamp((t-6.9)/.3))*ease(clamp((13.9-t)/.6)),pL.leftArm,.35); // 搬运段扶沿，坐定收回
  // 轰刚右手不挂托盘：出门段挥手→垂放身侧→21s 接第二盒（挥手时掌心向上=外翻，实录）
  // 送嘴掌向语义：咬签/咀嚼抬手时掌心向内旋后（盖过自然基的外翻；不动持签手型）
  physioPalm(lei,'left',Math.max(
    ease(clamp((t-46.8)/.5))*ease(clamp((48.7-t)/.3)), // crack 进食弧线
    t>=55&&t<68?ease(clamp((chewCycle(t,CHEW.lei.period,CHEW.lei.offset).raise-.25)/.3)):0)* (t>=TAKE_T?1:0),pL.leftArm);
  physioPalm(hong,'right',Math.max(
    ease(clamp((t-48.0)/.35))*ease(clamp((49.9-t)/.4)), // crack_h 自吃嘴前停顿段（抬起过渡不约束）
    t>=55&&t<68?ease(clamp((chewCycle(t,CHEW.hong.period,CHEW.hong.offset).raise-.25)/.3)):0),pH.rightArm);
  leiBento.visible=sl.visible!==false&&t>=6.9;
  if(leiBento.visible){ // 便当盒随身体次级滞后（解析弹簧：bob 差分）
    const g=ease(clamp((t-50.4)/.3)); // 托盘→提沿抓握偏移过渡（盒随手动、零跳变）
    if(t<LEI_REL){ // 手持（含放置引导）：托盘段盒底贴掌面（手系锚定），放置段过渡回 mesh 系抓握点
      leiBento.position.lerpVectors(handBox(lei,'right',.055,0),supportedBox(lei,'right',LEI_GRIP),g);
    }else{ // 释放后重力落台 .15s → 静置（起点=引导点，零跳变）
      const d=ease(clamp((t-LEI_REL)/.15));
      leiBento.position.lerpVectors(LEI_GUIDE,LEI_SET,d);
    }
    leiBento.rotation.y=t<LEI_REL?lei.mesh.rotation.y:0;
    leiBento.lid.rotation.x=-1.62*ease(clamp((t-13.65)/.45)); // 左手先到盖把位再掀盖（13.65–14.10 手贴盖）
  }
  const hongOut=sh.visible!==false;
  hongBoxA.visible=hongOut&&t>=13.9;
  if(hongBoxA.visible){
    hongBoxA.position.copy(handBox(hong,'left',.065,0)); // 盒底贴掌面（手系锚定）
    hongBoxA.rotation.y=hong.mesh.rotation.y;
    hongBoxA.lid.rotation.x=-1.62*ease(clamp((t-23.6)/.4)); // 右手推滑收回路过盒盖时掀开（23.6–24.0 手过盖）
  }
  // 两人份的第二盒：摞在左手盒上 → 21.3s 右手接过来 → 落座顺势放上矮沿（手全程贴盒，
  // 释放后重力落台 .15s 到 FIXED_B；FIXED_B 由释放帧谱面派生，见 calibratePlacement）
  const grab=ease(clamp((t-20.85)/.25)); // 右手到了摞顶才开始接盒
  hongBoxB.visible=hongOut&&t>=13.9;
  if(hongBoxB.visible){
    if(t>=HONG_REL){ // 释放：重力落台 .15s → 先后推滑离网、再横向推滑到两人中间（分轴不斜扫）
      const d=ease(clamp((t-HONG_REL)/.15)),slZ=ease(clamp((t-22.35)/.15)),slX=ease(clamp((t-22.35)/.45));
      hongBoxB.position.lerpVectors(HONG_GUIDE,HONG_DROP,d);
      hongBoxB.position.z+=(FIXED_B.z-HONG_DROP.z)*slZ;
      hongBoxB.position.x+=(FIXED_B.x-HONG_DROP.x)*slX;
      hongBoxB.rotation.y=0;
    }else{
      const wrist=hong.hands.right.getWorldPosition(new THREE.Vector3());
      const grip=new THREE.Vector3(...HONG_GRIP).applyQuaternion(hong.mesh.quaternion);
      if(grab<1){ // 仍摞在 boxA 上；右手接近时位置连续过渡到抓握点
        const stack=hongBoxA.position.clone().add(new THREE.Vector3(0,.082,0));
        hongBoxB.position.lerpVectors(stack,wrist.clone().add(grip),grab);
      }else hongBoxB.position.copy(wrist).add(grip); // 抓握搬运（物随手动）
      hongBoxB.rotation.y=hong.mesh.rotation.y;
    }
    hongBoxB.lid.rotation.x=-1.62*ease(clamp((t-21.55)/.5)); // 右手抓握搬运期间开盖（手在盒上）
  }
  for(const b of [leiBento,hongBoxA,hongBoxB])for(const f of b.foods)f.visible=b.lid.rotation.x<-.3;
  // 竹签炸鸡：轰刚右手递出 → 雷晓左手接过（捏持锚点=拇指腹与食/中指第一节之间）
  skewer.visible=sl.visible!==false&&hongOut&&t>=PICK_T;
  if(skewer.visible){
    const hand=t<TAKE_T?hong.hands.right:lei.hands.left;
    const hq=hand.getWorldQuaternion(new THREE.Quaternion());
    // 捏持锚点先定（手局部捏合区），四元数调整（递签指向/咬下腕翻）全部绕锚点转
    const anchor=hand.getWorldPosition(new THREE.Vector3())
      .add(new THREE.Vector3(.048,.026,hand.sign*.006).applyQuaternion(hq));
    skewer.quaternion.copy(hq);
    // 递签指向：轰刚持签段把签尖（炸鸡端）转向雷晓嘴边——递出去的是吃食不是拳头（近景实录：
    // 签沿前臂轴自然垂坠时炸鸡端拖在拳后）
    if(t<TAKE_T){
      const aimW=ease(clamp((t-41.6)/.4))*ease(clamp((44.6-t)/.3))*.85;
      if(aimW>.01){
        const aim=lei.face.head.localToWorld(new THREE.Vector3(0,.007,.125)).sub(anchor).normalize();
        skewer.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),aim),aimW);
      }
    }
    // 腕翻：咬下窗口（crack 47.3–48.6）与空拍咀嚼抬手（raise>.4）把签尖转向嘴
    let bite=ease(clamp((t-47.3)/.4))*ease(clamp((48.6-t)/.25));
    if(t>=55&&t<68)bite=Math.max(bite,chewCycle(t,CHEW.lei.period,CHEW.lei.offset).raise);
    if(bite>.01&&t>=TAKE_T){
      const mouth=lei.face.head.localToWorld(new THREE.Vector3(0,.007,.125)).sub(anchor).normalize();
      const qTarget=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),mouth);
      skewer.quaternion.slerp(qTarget,bite);
    }
    skewer.position.copy(anchor).add(new THREE.Vector3(-.015,0,0).applyQuaternion(skewer.quaternion)); // 捏在签下 1/3 段
    skewerNug.visible=t<48.3||t>=56.0;
  }
  // 轰刚手里那块
  hongNug.visible=hongOut&&((t>=47.6&&t<50.6)||t>=55.4);
  if(hongNug.visible){
    const hand=hong.hands.right;
    hand.getWorldPosition(hongNug.position);hand.getWorldQuaternion(hongNug.quaternion);
    hongNug.position.add(new THREE.Vector3(.05,0,.01).applyQuaternion(hongNug.quaternion));
  }
  // 轰刚转身够水壶：伸手未触及（臂长不可达——近景审片实录原"带歪壶身"是无接触作假），
  // 诚实化为"够了一下"：壶不动、手停在瓶前
  //（原 bottle.rotation.z 脉冲删除：无接触不得有物理反馈）
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
  props(t,sl,sh,performance.pL,performance.pH);
  secondary(t,sl,sh,performance.pH);
  for(const {actor,side,sign,cap,r,torso} of shoulderCaps){ // 肩窝桥接：躯干肩点（lean 后）→臂根
    const p=actor===lei?performance.pL:performance.pH,a=p?.[side+'Arm'];
    if(!a||actor.mesh.visible===false){cap.visible=false;continue;}
    actor.body.updateWorldMatrix(true,false);
    const tp=actor.mesh.worldToLocal(actor.body.localToWorld(torso.clone())); // 躯干肩点→mesh 系
    const ar=new THREE.Vector3(a[0].x,a[0].y,a[0].z);
    const d=ar.clone().sub(tp),len=d.length();
    cap.visible=len>.06; // 缝隙<6cm 时袖根内埋足够，桥接件缩回
    if(!cap.visible)continue;
    cap.position.copy(tp).addScaledVector(d,.55); // 偏向臂根一侧
    cap.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
    cap.scale.set(r,Math.max(len*.62,r),r);
  }

  let c=window.freeCamera?{pos:window.freeCamera.pos,look:window.freeCamera.lookAt,fov:window.freeCamera.fov??44}:camFor(opts.shot??'two',t,entry);
  camera.position.set(...c.pos);camera.lookAt(...c.look);camera.fov=c.fov;camera.updateProjectionMatrix();
  // 铁丝网远近双层：>9m 换粗网（远距细网成亚像素噪点；镜头驱动、(t,state) 纯函数）
  const netFar=camera.position.distanceTo(stage.net.position)>9;
  stage.net.material=stage.fenceMats[netFar?'far':'fine'];
  stage.netW.material=stage.fenceMats[netFar?'far':'fine'];
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
    locomotion[name]={...p.locomotion,root:actor.mesh.position.toArray(),yaw:actor.mesh.rotation.y,bob:p.bob,feet,
      legs:Object.fromEntries(['left','right'].map(side=>[side,p[side+'Leg']]))};
  }
  const state={entry:i+1,phase:opts.move,shot:opts.shot,leiEmotion:sl.emotion,hongEmotion:sh.emotion,
    flash:sl.flashT,leiRoot:[sl.rootX,sl.rootZ],hongRoot:[sh.rootX,sh.rootZ],
    ...(Object.keys(locomotion).length?{locomotion}:{})};
  // 接触探针数据（tools/check_contact.py）：手/门板/签尖/嘴/便当盒世界坐标
  const contact={doorA:stage.doorA(t),
    doorOpen:-stage.doorA(t)/1.75, // 0..1 开度（state_consistency 段）
    doorPos:stage.doorHinge.getWorldPosition(new THREE.Vector3()).toArray(),
    windGust:gustAt(t),
    hands:{lei:{left:lei.hands.left.getWorldPosition(new THREE.Vector3()).toArray(),
                right:lei.hands.right.getWorldPosition(new THREE.Vector3()).toArray()},
           hong:{left:hong.hands.left.getWorldPosition(new THREE.Vector3()).toArray(),
                 right:hong.hands.right.getWorldPosition(new THREE.Vector3()).toArray()}},
    mouthLei:lei.face.head.localToWorld(new THREE.Vector3(0,.007,.125)).toArray()};
  // 静息手支撑量（rest_support 段）：掌面接触点→大腿髋膝轴距离−腿半径（thigh），
  // 掌点→可见盒 OBB 最近距离（box）；support=min 两个通道（垂放贴腿 / 持盒皆算支撑）
  contact.handRest={};
  for(const [name,actor,p,thR] of [['lei',lei,performance.pL,.085],['hong',hong,performance.pH,.107]]){
    if(actor.mesh.visible===false)continue;
    const out={};
    for(const side of ['left','right']){
      const leg=p?.[side+'Leg'];if(!leg||!leg[1])continue;
      const hand=actor.hands[side],hq=hand.getWorldQuaternion(new THREE.Quaternion());
      const palm=hand.getWorldPosition(new THREE.Vector3())
        .add(new THREE.Vector3(.035*hand.scale.x,0,hand.sign*PALM_TOP*hand.scale.x).applyQuaternion(hq));
      const a=actor.mesh.localToWorld(new THREE.Vector3(leg[0].x,leg[0].y,leg[0].z)),
            b=actor.mesh.localToWorld(new THREE.Vector3(leg[1].x,leg[1].y,leg[1].z));
      const ab=b.sub(a),u=clamp(palm.clone().sub(a).dot(ab)/Math.max(ab.lengthSq(),1e-9),-.3,1); // 髋端外延（骨盆侧翼贴靠）
      const thigh=palm.distanceTo(a.clone().addScaledVector(ab,u))-thR;
      let box=99;
      for(const bx of [leiBento,hongBoxA,hongBoxB]){
        if(!bx.visible)continue;
        bx.updateMatrixWorld(true);
        const lp=bx.worldToLocal(palm.clone());
        box=Math.min(box,Math.hypot(Math.max(0,Math.abs(lp.x)-.085),
          Math.max(0,-lp.y,lp.y-.13),Math.max(0,Math.abs(lp.z)-.06))); // 底面 y=0，盖顶 ~.13
      }
      const r3=v=>Math.round(v*10000)/10000;
      out[side]={thigh:r3(thigh),box:r3(box),support:r3(Math.min(thigh,box))};
    }
    contact.handRest[name]=out;
  }
  // limb_attach 探针：手臂三点（肩/肘/腕，mesh 局部→世界）+ 躯干轴两点（body 局部 Y 轴，含 bob/lean）
  contact.arms={};contact.torsoAxis={};
  for(const [name,actor,p] of [['lei',lei,performance.pL],['hong',hong,performance.pH]]){
    if(actor.mesh.visible===false)continue;
    actor.mesh.updateWorldMatrix(true,false);
    const a={};
    for(const side of ['left','right']){
      const arm=p?.[side+'Arm'];
      if(arm)a[side]=arm.map(v=>actor.mesh.localToWorld(new THREE.Vector3(v.x,v.y,v.z)).toArray());
    }
    contact.arms[name]=a;
    contact.torsoAxis[name]=[actor.body.localToWorld(new THREE.Vector3(0,.6,0)).toArray(),
      actor.body.localToWorld(new THREE.Vector3(0,1.3,0)).toArray()];
  }
  if(skewer.visible)contact.skewerTip=skewer.position.clone().add(new THREE.Vector3(.13,0,0).applyQuaternion(skewer.quaternion)).toArray();
  if(skewer.visible)contact.skewerPos=skewer.position.toArray();
  if(skewer.visible){ // 掌心参考点（捏持断言：签轴-掌心距离）
    const hand=t<TAKE_T?hong.hands.right:lei.hands.left;
    contact.palm=hand.getWorldPosition(new THREE.Vector3())
      .add(new THREE.Vector3(.035,0,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()))).toArray();
  }
  if(skewer.visible&&skewerNug.visible){ // 食物握持：签尖-球心 + 指骨-球心不穿心
    const nc=skewerNug.getWorldPosition(new THREE.Vector3());
    contact.nug=nc.toArray();
    const hand=t<TAKE_T?hong.hands.right:lei.hands.left,bv=new THREE.Vector3();
    let minB=99;
    for(const ch of hand.chains)for(const bone of ch.bones){bone.getWorldPosition(bv);minB=Math.min(minB,bv.distanceTo(nc));}
    contact.nugBoneMin=minB;
  }
  if(leiBento.visible)contact.leiBento=leiBento.position.toArray();
  if(hongBoxA.visible)contact.hongBoxA=hongBoxA.position.toArray();
  contact.LEI_SET=LEI_SET.toArray();contact.FIXED_B=FIXED_B.toArray(); // 派生落点（校准可见性）
  // P10 探针日志：托盘强度/手腕审计/盖角度/盖把最近手距/盒位（支撑者存在性断言用）
  contact.trayK={leiR:trayK(t,6.9,51.35),hongL:trayK(t,13.9,null),
    leiL:ease(clamp((t-6.9)/.3))*ease(clamp((13.9-t)/.6))};
  contact.boxVis={leiBento:leiBento.visible,hongBoxA:hongBoxA.visible,hongBoxB:hongBoxB.visible};
  contact.wrist={...wristAudit};
  contact.boxPos={leiBento:leiBento.position.toArray(),hongBoxA:hongBoxA.position.toArray(),hongBoxB:hongBoxB.position.toArray()};
  contact.lidAngle={leiBento:leiBento.lid.rotation.x,hongBoxA:hongBoxA.lid.rotation.x,hongBoxB:hongBoxB.lid.rotation.x};
  contact.lidOpen={leiBento:-leiBento.lid.rotation.x/1.62,hongBoxA:-hongBoxA.lid.rotation.x/1.62,
    hongBoxB:-hongBoxB.lid.rotation.x/1.62}; // 归一化开度（state_consistency 段）
  contact.lidTabDist={};
  for(const [name,box,actor] of [['leiBento',leiBento,lei],['hongBoxA',hongBoxA,hong],['hongBoxB',hongBoxB,hong]]){
    if(!box.visible)continue;
    box.updateMatrixWorld(true);
    const tab=box.lid.localToWorld(new THREE.Vector3(0,0,.12));
    contact.lidTabDist[name]=Math.min(...['left','right'].map(s=>actor.hands[s].getWorldPosition(new THREE.Vector3()).distanceTo(tab)));
  }
  state.contact=contact;
  // grip 断言日志：托底接触成立=盒底投影内存在顶点距底面 ≤palm_max（touchMin=min|y|，
  // 指节扣进盒体底角属合法接触，由 whitelist 三角探针兜底穿透上限）+ 指节-盒体最近距离（扣边）
  contact.grip={};
  for(const [key,actor,side,box] of [['leiR',lei,'right',leiBento],['hongL',hong,'left',hongBoxA]]){
    if(!box.visible)continue;
    const hand=actor.hands[side];
    box.updateMatrixWorld(true);
    hand.skeleton.update();
    let touchMin=99,fingerMin=99,inFoot=false;const bv=new THREE.Vector3();
    const pos=hand.surface.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      hand.surface.getVertexPosition(i,bv); // 蒙皮后局部坐标→世界→盒局部
      bv.applyMatrix4(hand.surface.matrixWorld);box.worldToLocal(bv);
      if(Math.abs(bv.x)>.085||Math.abs(bv.z)>.06)continue; // 盒底投影外不算托底
      if(bv.y<.04){inFoot=true;touchMin=Math.min(touchMin,Math.abs(bv.y));}
    }
    for(const ch of hand.chains)for(const bone of ch.bones){
      bone.getWorldPosition(bv);box.worldToLocal(bv);
      const dx=Math.max(0,Math.abs(bv.x)-.085),dz=Math.max(0,Math.abs(bv.z)-.06),
            dy=Math.max(0,-bv.y,bv.y-.052); // 盒身局部范围（含盖）
      fingerMin=Math.min(fingerMin,Math.hypot(dx,dy,dz));
    }
    contact.grip[key]={palmGap:touchMin,inFoot,fingerMin};
  }
  contact.palmIn=palmAudit; // 送嘴掌向（physioPalm 激活帧才有记录）
  if(doorProbe&&t>=6.8&&t<=22.0){
    state.doorway=doorProbe(stage,{lei:lei.mesh,hong:hong.mesh,leiBento,hongBoxA,hongBoxB});
  }
  if(bentoProbe&&t>=7&&t<68){
    stage.scene.updateMatrixWorld(true);
    // 大腿代理逐帧对准髋→膝（手-身网格探针的障碍物）
    for(const [actor,p] of [[lei,performance.pL],[hong,performance.pH]]){
      for(const side of ['left','right']){
        const th=thighProxies.get(actor)?.[side],leg=p?.[side+'Leg'];
        if(!th||!leg||!leg[1])continue;
        const a=new THREE.Vector3(leg[0].x,leg[0].y,leg[0].z),d=new THREE.Vector3(leg[1].x,leg[1].y,leg[1].z).sub(a);
        // 轴向髋端延伸 .13m 盖住骨盆侧翼（垂放手的合法贴靠面）；半径取真值 92%（盒角裕量）
        const dir=d.clone().normalize();
        th.position.copy(a).addScaledVector(d,.5).addScaledVector(dir,-.13);
        th.scale.y=d.length()+.26;
        th.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
      }
    }
    stage.scene.updateMatrixWorld(true);
    const boxes=[leiBento,hongBoxA,hongBoxB].filter(b=>b.visible);
    state.bento=bentoProbe(boxes.flatMap(b=>[b.base,b.lid]),{lei:lei.mesh,hong:hong.mesh});
    state.bento.positions=Object.fromEntries(boxes.map(b=>[b.base.name,b.position.toArray()]));
    // 手 vs 躯干/大腿：margin −10mm 深穿才报（垂放贴腿/贴骨盆侧翼的接触合法）
    state.handBody=bentoProbe(bodyProxies,{leiL:lei.hands.left,leiR:lei.hands.right,
      hongL:hong.hands.left,hongR:hong.hands.right},-.010);
    // 外套襟 vs 手臂：解析式穿透检测（盒代理太粗、常接触误报——P17 实录）——
    // 襟片面片（枢轴原点、下摆 −y、法向 z）局部系看臂管段：段端点在面片两侧且
    // 交点落在襟片范围内=穿透；贴面（|z| 小但不换号）=搭盖合法
    if(hongFlaps.length){
      const hits=[];
      hongFlaps.forEach((f,i)=>{
        f.updateWorldMatrix(true,false);
        const a=performance.pH?.[f.position.x>0?'rightArm':'leftArm'];if(!a)return;
        for(const [seg,x,y,tr] of [['u',0,1,.075],['f',1,2,.06]]){
          const p0=f.worldToLocal(new THREE.Vector3(a[x].x,a[x].y,a[x].z)),
                p1=f.worldToLocal(new THREE.Vector3(a[y].x,a[y].y,a[y].z));
          if(p0.z*p1.z>=0)continue; // 同侧=未穿
          const u=p0.z/(p0.z-p1.z),cx=p0.x+(p1.x-p0.x)*u,cy=p0.y+(p1.y-p0.y)*u;
          if(Math.abs(cx)<.085+tr&&cy>-.62&&cy<.03){
            const wp=f.localToWorld(new THREE.Vector3(cx,cy,0));
            hits.push({subject:'flap'+i,obstacle:'arm_'+(f.position.x>0?'right':'left')+'_'+seg,
              point:[wp.x,wp.y,wp.z]});
          }
        }
      });
      state.cloth={margin:-.01,hits,obstacles:['arm tubes'],counts:{hong:hits.length}};
    }
    // 上肢管 vs 躯干侧壁：解析式（躯干截面是变半径椭圆环列，盒代理角部误报率太高——
    // P15 首扫盒代理全员常命中翻车实录）。沿臂轴采样：g=到躯干表面的有符号距离
    // （正=分离，0=贴触，负=嵌入）；嵌入深度 > 管半径+15mm 才报。袖根 .12m 内埋区跳过。
    const TORSO_RINGS={lei:[[.78,.127,.096],[.88,.140,.102],[.97,.143,.103],[1.06,.127,.091],[1.18,.138,.099],[1.30,.149,.105],[1.38,.130,.090]],
      hong:[[.90,.170,.118],[1.00,.184,.126],[1.10,.180,.121],[1.18,.169,.113],[1.32,.204,.138],[1.44,.207,.136],[1.52,.172,.116]]};
    const TUBE_R={lei:[.050,.032],hong:[.065,.045]}; // 上臂/前臂管半径
    const limbBody={};
    for(const [actor,p,tag] of [[lei,performance.pL,'lei'],[hong,performance.pH,'hong']]){
      if(actor.mesh.visible===false)continue;
      const rings=TORSO_RINGS[tag],bob=actor.body.position.y,lean=actor.body.rotation.x,sxz=actor.body.scale.x;
      const cl=Math.cos(lean),sl2=Math.sin(lean);
      for(const [side,sign] of [['left','L'],['right','R']]){
        const arm=p?.[(side==='left'?'left':'right')+'Arm'];
        if(!arm)continue;
        let worst=99,worstAt=null,rootG=null;
        for(const [a,b,tubeR] of [[arm[0],arm[1],TUBE_R[tag][0]],[arm[1],arm[2],TUBE_R[tag][1]]]){
          for(let i=1;i<=5;i++){
            const mx=a.x+(b.x-a.x)*i/5,my=a.y+(b.y-a.y)*i/5,mz=a.z+(b.z-a.z)*i/5;
            const dSh=Math.hypot(mx-arm[0].x,my-arm[0].y,mz-arm[0].z);
            // mesh 局部 → body 局部（解 bob/lean；squash 的 sxz 进椭圆半径）
            const py=my-bob,px=mx,pz=mz;
            const by=py*cl+pz*sl2,bz=-py*sl2+pz*cl; // rotation.x=lean 的逆变换
            const ring=rings.find(r=>by<=r[0])??rings[rings.length-1];
            if(by<rings[0][0])continue; // 髋以下不管（腿段）
            const ex=px/(ring[1]*sxz),ez=bz/(ring[2]*sxz),e=Math.sqrt(ex*ex+ez*ez);
            const g=(e-1)*Math.min(ring[1],ring[2])*sxz;
            if(dSh<.12)continue; // 袖根内埋区
            if(dSh<.22&&(rootG===null||g>rootG))rootG=g; // 袖根邻域间隙（外摆过量=断开）
            if(g<worst){worst=g;worstAt=[Math.round((px)*1000)/1000,Math.round(by*1000)/1000,Math.round(bz*1000)/1000];}
          }
        }
        limbBody[tag+(side==='left'?'L':'R')]={g:Math.round(worst*10000)/10000,at:worstAt,tubeR:TUBE_R[tag][0],
          rootG:rootG===null?null:Math.round(rootG*10000)/10000,
          reach:Math.round(Math.hypot(arm[2].x-arm[0].x,arm[2].y-arm[0].y,arm[2].z-arm[0].z)/(tag==='lei'?.37:.43)*1000)/1000};
      }
    }
    state.limbBody=limbBody;
    // 道具/身体 vs 铁丝网：网面薄板代理，零命中才合格（坐着的合法接触只有矮沿）
    state.env=bentoProbe(ensureFenceProxies(),{lei:lei.mesh,hong:hong.mesh,leiBento,hongBoxA,hongBoxB});
    // 穿戴件净空：书包（probeExclude 跳过包体/盖/带自身） vs 雷晓躯干；margin -20mm：
    // 挎包贴胯的软接触（<2cm）合法，更深的嵌入才算穿模
    // （挂点 x=-.25/外倾 -.16 由 wornScan 扫描实证：全程零命中且留 ~2cm 余量）
    if(leiBag)state.worn=bentoProbe([leiBag],{lei:lei.mesh},-.02);
  }
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
  6.9,7.0,7.3,7.5,7.7,7.9,8.1,8.4,8.8,9.0,9.4,9.8,10.1,10.5,12.7,
  13.85,14.0,14.45,14.9,15.1,15.4,15.7,16.0,16.4,16.8,17.1,17.5,18.1,
  21.0,21.95,27.5,31.5,42.5,44.8,47.2,48.5,52.2,52.8,53.5,57,63]
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
