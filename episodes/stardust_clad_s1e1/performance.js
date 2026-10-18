// 《星屑战壳》S1E1 表演谱（72.8s，无歌曲拍网，按对白/动作节拍打点）：晨景晨练 → 柱廊追逐跑
// （人形走/跑正片展示）→ 年检通告 → 阿箸登场生长秀 → 考核三连 gag → 筷刃切磋（接触帧纪律）→
// 火锅反差收尾 + 赫斯提亚画外音。(t,state) 纯函数，顺序/seek 一致是铁律；条目边界 0.3s 插值。
// 骨架沿用 OP（stardust_clad_op R7 人形步态）：standStraight 直立偏移 + WALK/RUN 双 GAIT +
// 垂挂门控摆臂 + hipY cap 永不超伸。阿箸为第四角色（筷子座，修长梯队）。
import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {createLocomotion,angleDelta} from 'dula-assets/lib/craft3d/locomotion.js';
const WALK_GAIT=createLocomotion({hipDelta:.040,lift:.068});
const RUN_GAIT=createLocomotion({hipDelta:.050,lift:.105,sway:.022,armSwingGain:.30,armSwingMax:.16,heelStrike:.30,toeOff:.30});
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,u)=>a+(b-a)*u,V=(x,y,z=0)=>({x,y,z}),blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));

// ── 时刻表（viewer 特效/混音摆点共用同一常量）──
export const T={
  CHASE:10.8,            // 追逐起跑
  SCROLL:19.4,           // 卷轴喷出
  AZU_CLAD:27.4,         // 阿箸战壳生长起点（2.6s 长满）
  EGG:35.0,              // 打蛋落盾
  STONE_SLIP:42.8,       // 石头脱手
  STONE_LAND:43.6,       // 石头落地
  SIT:44.0,              // 大釜坐地
  EXAM3:47.0,            // 小凿穿孔开始（6 连）
  TAP1:54.4,             // 筷刃点盾（接触帧）
  TAP2:57.8,             // 筷刃点肩甲（接触帧）
  PINCH:61.2,            // 双筷夹盘（接触帧）
  POT:63.4,              // 火锅登场
  STEAM:64.2,            // 热气起
  HESTIA:69.6,           // 女神现身
  CLANG:74.3,            // 锅鸣收尾（压在「逃。」尾字上）
  FADE:74.5,             // 淡黑起
};
// 接触锚点（世界坐标常量，viewer 特效锚与探针对照；调参纪律：以 trace 实测回修）
export const SHIELD_PT=[-0.09,1.30,2.50];   // TAP1 盾心（阿鏊 guard 位）
export const PAULDRON_PT=[-0.85,1.60,2.31]; // TAP2 大釜右肩甲（挥空踉跄位）
export const DISC_PT=[-0.68,1.24,2.66];     // PINCH 小凿花窗盘（小凿上步后盘位）
export const STONE_LAND=[1.7,0.19,0.7];

const DIMS={
  aoao:{hipIdle:.87,standStraight:.013,shoulderY:1.42,shoulderHalf:.14,hipHalf:.078,legA:.42,legB:.42,armA:.20,armB:.19,footY:.085},
  xiaozao:{hipIdle:.81,standStraight:.012,shoulderY:1.32,shoulderHalf:.125,hipHalf:.072,legA:.385,legB:.385,armA:.185,armB:.175,footY:.080},
  dafu:{hipIdle:.96,standStraight:.008,shoulderY:1.58,shoulderHalf:.19,hipHalf:.105,legA:.46,legB:.46,armA:.23,armB:.22,footY:.100},
  // hipIdle+standStraight+maxBob(.04)=1.00 ≤ legA+legB+footY=1.05（DIMS 纪律）
  azu:{hipIdle:.95,standStraight:.010,shoulderY:1.56,shoulderHalf:.13,hipHalf:.070,legA:.48,legB:.48,armA:.22,armB:.21,footY:.090},
};
const SPOTS={aoao:[-1.6,1.8],xiaozao:[-3.2,2.2],dafu:[.8,2.0]}; // 圣殿群像位
const IDLE={
  aoao:{left:V(-.20,1.10,.04),right:V(.20,1.10,.04)},
  xiaozao:{left:V(-.17,1.02,.03),right:V(.17,1.02,.03)},
  dafu:{left:V(-.28,1.16,.05),right:V(.28,1.16,.05)},
  azu:{left:V(-.16,1.20,.04),right:V(.16,1.20,.04)},
};
const AZU_CROSS={left:V(-.10,1.26,.16),right:V(.12,1.24,.14)}; // 阿箸抱臂冷看
const AZU_SPOT=[1.5,3.0];
// 追逐跑道（柱廊，z≈3 走廊 +x 方向）
const CHASE={aoao:{from:[-4.2,3.0],to:[4.0,3.2]},xiaozao:{from:[-4.6,2.4],to:[2.2,2.6]},dafu:{from:[-4.8,3.8],to:[.4,3.8]}};
export const HESTIA_SEAT={x:0,y:4.375,z:-5.06}; // 与 OP 同（圣物大锅沿前点）

function base(name){
  const spot=SPOTS[name]??AZU_SPOT;
  return {visible:true,rootX:spot[0],rootZ:spot[1],yaw:0,bob:0,lean:0,air:0,tuck:0,
    left:{...IDLE[name].left},right:{...IDLE[name].right},
    headYaw:0,headPitch:0,headRoll:0,fist:.12,open:0,point:0,walk:null,turn:null,
    cladT:name==='azu'?0:1,emotion:name==='xiaozao'||name==='azu'?'neutral':'determined',blink:null,capeLift:0};
}

// ── 各拍谱 ──
function morningSpec(name,s,t){
  if(name==='aoao'){ // 挥盾空击晨练（左盾起落+右拳小击）
    const k=Math.sin(t*1.7);
    s.left=blend(IDLE.aoao.left,V(-.16,1.30,.26),.5+.5*k);
    s.right=blend(IDLE.aoao.right,V(.24,1.22,.18),.5+.5*Math.sin(t*1.7+1.2));
    s.fist=.6;s.bob=.012*Math.sin(t*3.4);s.emotion='determined';
  }else if(name==='dafu'){ // 深蹲（ preparatory 举石训练）
    const k=Math.max(0,Math.sin(t*1.15));
    s.bob=-.14*k;s.fist=.5;
    s.left=blend(IDLE.dafu.left,V(-.30,1.02,.22),k);s.right=blend(IDLE.dafu.right,V(.30,1.02,.22),k);
    s.headPitch=.08*k;s.emotion='determined';
  }else if(name==='xiaozao'){ // 抱臂冷看
    s.left=V(-.06,1.06,.12);s.right=V(.04,1.05,.10);s.fist=.3;s.emotion='neutral';
    s.headYaw=.06*Math.sin(t*.9);
  }else{ // azu 未登场
    s.visible=false;
  }
}
function chaseSpec(name,s,t){
  const q=CHASE[name];
  const a=clamp((t-T.CHASE)/5.6); // 10.8→16.4 跑程
  if(name==='azu'){s.visible=false;return;}
  const stopA=ease(clamp((t-16.4)/.8));
  if(a<1){
    s.walk={from:q.from,to:q.to,a,run:true};
    s.rootX=mix(q.from[0],q.to[0],ease(a));s.rootZ=mix(q.from[1],q.to[1],ease(a));
    s.yaw=Math.PI/2;s.capeLift=.55;s.lean=.10;
  }else{ // 终点收步喘气（大釜最惨）
    s.rootX=q.to[0];s.rootZ=q.to[1];s.yaw=Math.PI/2+angleDelta(Math.PI/2,.35)*stopA*.3;
    const pant=name==='dafu'?1:name==='xiaozao'?.4:.6;
    s.bob=.022*pant*Math.sin(t*6.5);s.lean=.06*pant;s.capeLift=.2*(1-stopA);
  }
  if(name==='aoao'){ // 右手举饭团领跑；双臂 noSwing（摆动会把低臂腕点顶过 reach .9 阈）
    s.right=V(.30,1.42,.08);s.noSwing=1;s.fist=.7;
    s.left=V(-.24,1.16,.02);s.emotion='laugh';
  }else if(name==='xiaozao'){
    s.left=V(.06,1.20,.22);s.right=V(-.10,1.16,.10);s.fist=.5;s.emotion='neutral';s.headPitch=-.03;
  }else{
    s.noSwing=1; // 摆臂幅度对大釜臂长必超伸——静态屈臂+喘起伏读奔跑
    s.left=V(-.28,1.22,.06);s.right=V(.28,1.22,.06);s.fist=.8;s.emotion='worry';s.headPitch=.10;
  }
}
function noticeSpec(name,s,t){
  if(name==='azu'){s.visible=false;return;}
  // 从柱廊方向走回群像位（17.6→19.6 walk；别用 ease 全程冲太快——速度上限 4.0）
  const from={aoao:[-4.4,3.0],xiaozao:[-4.8,2.6],dafu:[-3.4,3.4]}[name];
  const a=clamp((t-17.6)/2.0);
  if(a<1){
    s.walk={from,to:SPOTS[name],a};
    s.rootX=mix(from[0],SPOTS[name][0],ease(a));s.rootZ=mix(from[1],SPOTS[name][1],ease(a));
    s.yaw=Math.atan2(SPOTS[name][0]-from[0],SPOTS[name][1]-from[1]);
  }else{
    const heading=Math.atan2(SPOTS[name][0]-from[0],SPOTS[name][1]-from[1]);
    const ta=clamp((t-19.6)/.6);
    if(ta<1){s.turn={fromYaw:heading,toYaw:0,a:ta};s.yaw=heading+angleDelta(heading,0)*ease(ta);}
    else s.yaw=0;
    if(t>T.SCROLL){ // 卷轴来了：抬头读
      s.headPitch=mix(s.headPitch,-.14,ease(clamp((t-T.SCROLL)/.5)));
      s.headYaw=.05*Math.sin(t*.8);
    }
    if(name==='dafu'&&t>19.7){ // 慌
      s.bob=.018*Math.sin(t*8);s.emotion='scared';
      s.left=V(-.30,1.24,.14);s.right=V(.30,1.24,.14);s.fist=.8;
    }
    if(name==='aoao'&&t>21.9){s.emotion='determined';s.left=V(-.26,1.22,.14);s.fist=.7;}
    if(name==='xiaozao'){s.left=V(-.06,1.06,.12);s.right=V(.04,1.05,.10);s.fist=.3;}
  }
}
function azuEnterSpec(s,phase,t){
  if(phase==='azu_walk'){ // 人形走路登场（右侧入画，面对三人站定）
    const a=clamp((t-23.6)/3.0);
    if(a<1){
      s.walk={from:[5.2,3.2],to:AZU_SPOT,a,facingYaw:-Math.PI/2};
      s.rootX=mix(5.2,AZU_SPOT[0],ease(a));s.rootZ=mix(3.2,AZU_SPOT[1],ease(a));
      s.yaw=-Math.PI/2;s.capeLift=.3;
    }else{s.rootX=AZU_SPOT[0];s.rootZ=AZU_SPOT[1];s.yaw=-Math.PI/2;s.capeLift=.15;}
    s.emotion='neutral';return;
  }
  if(phase==='azu_clad'){ // 转向镜头 + 战壳生长秀（排面：蓄力微颤+英雄展臂）
    const ta=clamp((t-27.0)/.5);
    if(ta<1)s.turn={fromYaw:-Math.PI/2,toYaw:0,a:ta};
    s.yaw=ta<1?-Math.PI/2+angleDelta(-Math.PI/2,0)*ease(ta):0;
    const g=clamp((t-T.AZU_CLAD)/2.6);
    s.cladT=g;s.capeLift=.5*g;
    const a=ease(clamp((t-T.AZU_CLAD)/.5));
    s.left=blend(IDLE.azu.left,V(-.30,1.34,.10),a);s.right=blend(IDLE.azu.right,V(.30,1.34,.10),a);
    s.headPitch=-.05*a;s.fist=.3;s.bob=.012*Math.sin(t*5)*a*(1-g);
    return;
  }
  // azu_idle 及之后默认：面向三人（yaw -π/2），抱臂冷看（战壳已长满）
  s.rootX=AZU_SPOT[0];s.rootZ=AZU_SPOT[1];s.yaw=-Math.PI/2;s.cladT=1;
  const a=ease(clamp((t-30.2)/.6));
  s.left=blend(IDLE.azu.left,AZU_CROSS.left,a);s.right=blend(IDLE.azu.right,AZU_CROSS.right,a);
  if(phase==='azu_idle'&&t>32.0){ // 出题手势：右手筷刃指向阿鏊（收臂程，刃尖代指）
    const p=ease(clamp((t-32.0)/.4));
    s.right=blend(AZU_CROSS.right,V(.06,1.28,.22),p);
  }
}
function exam1Spec(name,s,t){
  if(name==='azu')return; // 阿箸在 spec 前置分支（监考冷看+眼角抽搐）
  if(name!=='aoao'){ // 大釜小凿围观（只转头不转身，防 0.3s 边界滑步）
    s.headYaw=name==='dafu'?.22:-.14;
    return;
  }
  // 阿鏊：上前两步，盾当煎锅
  const w=clamp((t-33.0)/.6);
  if(w<1)s.walk={from:SPOTS.aoao,to:[-.5,2.4],a:w,facingYaw:.5};
  s.rootX=mix(SPOTS.aoao[0],-.5,ease(w));s.rootZ=mix(SPOTS.aoao[1],2.4,ease(w));
  s.yaw=.5*ease(w);
  const raise=ease(clamp((t-33.6)/.5));
  s.left=blend(IDLE.aoao.left,V(-.10,1.26,.28),raise); // 盾面平举当锅（收臂程 ≤.85）
  s.emotion='determined';
  if(t>34.6){ // 打蛋动作
    const k=ease(clamp((t-34.6)/.4));
    s.right=blend(IDLE.aoao.right,V(.04,1.42,.30),k*(1-ease(clamp((t-T.EGG)/.3))));
  }
  if(t>T.EGG){ // 煎制：小幅颠勺 + 得意
    s.emotion='laugh';s.fist=.5;
    s.left.z+=.02*Math.sin(t*7);s.headPitch=-.06;
  }
}
function exam2Spec(name,s,t,phase){
  if(name==='azu')return;
  if(name==='aoao'){ // 煎锅 gag 完走回群像位
    const w=clamp((t-40.0)/.8);
    if(w<1)s.walk={from:[-.5,2.4],to:SPOTS.aoao,a:w,facingYaw:.3};
    s.rootX=mix(-.5,SPOTS.aoao[0],ease(w));s.rootZ=mix(2.4,SPOTS.aoao[1],ease(w));
    s.yaw=.5*(1-ease(w));s.headYaw=.18;s.fist=.3;
    return;
  }
  if(name!=='dafu'){s.headYaw=-.08;return;} // 小凿围观
  const STONE=[2.4,1.3]; // 青石座（石头搁在 .55 高石台上——地面直举对 .45 臂长物理不可达）
  if(phase==='exam2_lift'){
    const w=clamp((t-40.0)/1.0); // 走到石台（1.0s：步频与 ease 峰值都不超限）
    if(w<1)s.walk={from:SPOTS.dafu,to:STONE,a:w};
    s.rootX=mix(SPOTS.dafu[0],STONE[0],ease(w));s.rootZ=mix(SPOTS.dafu[1],STONE[1],ease(w));
    s.yaw=angleDelta(0,-.3)*ease(w);
    if(t>40.8){ // 深蹲抱石（石台高 .8，石顶 1.18；深蹲 bob 把肩点降下来才够得着）
      const c=ease(clamp((t-40.8)/.6));
      s.bob=-.24*c;s.left=blend(IDLE.dafu.left,V(-.26,1.39,.26),c);s.right=blend(IDLE.dafu.right,V(.26,1.39,.26),c);
      s.fist=.9;s.headPitch=.08*c;s.lean=.10*c;
    }
    if(t>41.4){ // 发力高举（过顶双臂 reach 仍在臂程内：台高省去弯腰行程）
      const L=ease(clamp((t-41.4)/1.0));
      s.bob=mix(-.24,.02,L)+.008*Math.sin(t*13)*L; // 起身+发力颤
      s.lean=.10*(1-L);
      s.left=blend(V(-.26,1.39,.26),V(-.15,1.92,.14),L);s.right=blend(V(.26,1.39,.26),V(.15,1.92,.14),L);
      s.headPitch=mix(.08,-.10,L);s.emotion='determined';
    }
    return;
  }
  // exam2_drop：脱手 → 失衡后踉跄（退离石台）→ 坐地
  s.rootX=STONE[0];s.rootZ=STONE[1];s.yaw=-.3;
  const fl=ease(clamp((t-T.STONE_SLIP)/.3));
  s.left=blend(V(-.15,1.92,.14),V(-.36,1.66,.10),fl);s.right=blend(V(.15,1.92,.14),V(.36,1.66,.10),fl);
  s.emotion='scared';s.headPitch=.14*fl;
  const stag=clamp((t-43.2)/.8);
  s.bob=-.06*Math.sin(stag*Math.PI);s.rootZ=STONE[1]+.55*ease(stag); // 向后踉跄退离石台
  if(t>T.SIT){ // 一屁股坐地（hipY 覆盖+双脚前伸，不整体倒机）
    const k=ease(clamp((t-T.SIT)/.3));
    s.rootZ=STONE[1]+.55+.15*k; // 坐到 (2.4,2.0)，石台前方空地
    s.sit={drop:.62*k,feet:.40*k};
    s.left=V(-.34,.82,-.10);s.right=V(.34,.82,-.10); // 双手后撑
    s.emotion='scared';s.headPitch=.18;
    if(t>44.8){const r=ease(clamp((t-44.8)/.6));s.emotion=r<1?'scared':'neutral';s.headRoll=.06*Math.sin(t*2);}
  }
}
function exam3Spec(name,s,t){
  if(name==='azu')return;
  if(name==='dafu'){ // 坐地爬起来走回群像位（46.6-47.6 起身走位）
    const up=ease(clamp((t-46.6)/.5));
    if(up<1){s.sit={drop:.62*(1-up),feet:.40*(1-up)};s.rootX=2.4;s.rootZ=2.0;s.yaw=-.3;
      s.left=V(-.34,1.0,.02);s.right=V(.34,1.0,.02);return;}
    const w=clamp((t-47.1)/.9);
    if(w<1)s.walk={from:[2.4,2.0],to:SPOTS.dafu,a:w};
    s.rootX=mix(2.4,SPOTS.dafu[0],ease(w));s.rootZ=mix(2.0,SPOTS.dafu[1],ease(w));
    s.yaw=angleDelta(-.3,0)*ease(w);s.emotion=up<1?'scared':'neutral';
    return;
  }
  if(name!=='xiaozao'){s.headYaw=.14;return;}
  const w=clamp((t-46.6)/1.1); // 上步演示位（步频 cadence ≤8.5：窗口给足 1.1s）
  if(w<1)s.walk={from:SPOTS.xiaozao,to:[-1.2,2.5],a:w,facingYaw:.3};
  s.rootX=mix(SPOTS.xiaozao[0],-1.2,ease(w));s.rootZ=mix(SPOTS.xiaozao[1],2.5,ease(w));
  s.yaw=.3*ease(w);
  const raise=ease(clamp((t-47.0)/.4));
  s.left=blend(IDLE.xiaozao.left,V(.04,1.16,.20),raise); // 左前臂横抬，花窗盘翻出
  s.right=V(.18,1.00,.02);s.fist=.2;s.emotion='neutral';
  if(t>48.8){const d=ease(clamp((t-48.8)/.4));s.left=blend(V(.04,1.16,.20),IDLE.xiaozao.left,d);}
}
// 切磋三段（接触帧锚点=常量，探针实测回修）
function sparSpec(name,s,phase,t){
  if(name==='azu'){
    s.cladT=1;
    if(phase==='spar1'){ // 滑步近身 → 右筷点盾（TAP1）
      const st=clamp((t-52.8)/1.0);
      if(st<1)s.walk={from:AZU_SPOT,to:[.32,2.62],a:st,facingYaw:-Math.PI/2};
      s.rootX=mix(AZU_SPOT[0],.32,ease(st));s.rootZ=mix(AZU_SPOT[1],2.62,ease(st));s.yaw=-Math.PI/2;
      s.left=AZU_CROSS.left;s.right=AZU_CROSS.right;s.capeLift=.3;
      const p=ease(clamp((t-(T.TAP1-.35))/.35)); // 出刃（收臂程，刃尖够盾）
      s.right=blend(AZU_CROSS.right,V(.04,1.34,.26),p);s.noSwing=1;
      s.left=blend(AZU_CROSS.left,V(-.14,1.24,.06),p);
      if(t>T.TAP1){const r=ease(clamp((t-T.TAP1)/.4));s.right=blend(V(.04,1.34,.26),AZU_CROSS.right,r);} // 收刃
      return;
    }
    if(phase==='spar2'){ // 侧闪进大釜怀内（精英读招：不后退，贴进盲区）→ 左筷点肩甲（TAP2）
      const d=clamp((t-56.2)/.8);
      if(d<1)s.walk={from:[.32,2.62],to:[-.25,2.70],a:d,facingYaw:-Math.PI/2};
      s.rootX=mix(.32,-.25,ease(d));s.rootZ=mix(2.62,2.70,ease(d));
      const ta=clamp((t-57.2)/.5); // 转身面向大釜
      if(ta<1)s.turn={fromYaw:-Math.PI/2,toYaw:-2.15,a:ta};
      s.yaw=ta<1?-Math.PI/2+angleDelta(-Math.PI/2,-2.15)*ease(ta):-2.15;
      s.lean=-.10*Math.sin(d*Math.PI); // 侧闪让拳
      const p=ease(clamp((t-(T.TAP2-.30))/.30));
      s.left=blend(AZU_CROSS.left,V(-.05,1.50,.36),p);s.noSwing=1;
      s.right=blend(AZU_CROSS.right,V(.16,1.26,.08),p);
      if(t>T.TAP2){const r=ease(clamp((t-T.TAP2)/.4));s.left=blend(V(-.05,1.50,.36),AZU_CROSS.left,r);}
      return;
    }
    // spar3：双筷合拢夹花窗盘（PINCH）——阿箸刃长臂短：刃尖行程覆盖，腕点收臂程内
    const ta=clamp((t-59.5)/.4); // 先转回面向小凿（-x）
    if(ta<1)s.turn={fromYaw:-1.89,toYaw:-Math.PI/2,a:ta};
    s.yaw=ta<1?-1.89+angleDelta(-1.89,-Math.PI/2)*ease(ta):-Math.PI/2;
    const st=clamp((t-59.9)/.7);
    if(ta>=1&&st<1)s.walk={from:[-.25,2.70],to:[-.15,2.70],a:st,facingYaw:-Math.PI/2};
    s.rootX=mix(-.25,-.15,ease(st));s.rootZ=2.70;
    const p=ease(clamp((t-(T.PINCH-.35))/.35));
    s.left=blend(AZU_CROSS.left,V(-.07,1.28,.26),p);   // 双腕前伸，刃尖夹盘两侧
    s.right=blend(AZU_CROSS.right,V(.07,1.28,.26),p);s.noSwing=1;s.fist=.4;
    if(t>T.PINCH+.9){const r=ease(clamp((t-T.PINCH-.9)/.5)); // 松夹收势
      s.left=blend(V(-.07,1.28,.26),AZU_CROSS.left,r);s.right=blend(V(.07,1.28,.26),AZU_CROSS.right,r);}
    return;
  }
  if(name==='aoao'){
    if(phase==='spar1'){ // 举盾戒备 → 被点盾后坐
      const w=clamp((t-52.0)/.8);
      if(w<1)s.walk={from:SPOTS.aoao,to:[-.5,2.4],a:w,facingYaw:Math.PI/2};
      s.rootX=mix(SPOTS.aoao[0],-.5,ease(w));s.rootZ=mix(SPOTS.aoao[1],2.4,ease(w));s.yaw=Math.PI/2;
      const g=ease(clamp((t-52.5)/.5));
      s.left=blend(IDLE.aoao.left,V(-.14,1.30,.26),g);s.right=V(.22,1.16,.10);s.fist=1;s.emotion='determined';
      if(t>T.TAP1){const r=ease(clamp((t-T.TAP1)/.25));
        s.bob=-.05*r*(1-ease(clamp((t-T.TAP1-.25)/.4)));s.rootX-=.08*r;s.headPitch=.08*r;s.emotion='scared';}
      if(t>T.TAP1+.6)s.emotion='determined';
      return;
    }
    s.rootX=-.5;s.rootZ=2.4;s.yaw=Math.PI/2;s.left=V(-.14,1.26,.22);s.right=V(.22,1.14,.08);s.fist=.7;
    if(phase==='spar3')s.headYaw=-.1;
    return;
  }
  if(name==='dafu'){
    if(phase==='spar1'){ // 绕到阿箸正面另一侧（左前翼，读招预备；慢走 2.6s 不超速）
      const w=clamp((t-52.4)/2.6);
      if(w<1)s.walk={from:[2.4,1.3],to:[-1.7,2.2],a:w,facingYaw:Math.PI/2};
      s.rootX=mix(2.4,-1.7,ease(w));s.rootZ=mix(1.3,2.2,ease(w));s.yaw=Math.PI/2;
      s.left=V(-.32,1.28,.12);s.right=V(.32,1.28,.12);s.fist=.8;
      return;
    }
    if(phase==='spar2'){ // 冲刺摆拳挥空（拳势带人前冲过阿箸原位）
      const w=clamp((t-56.2)/1.0);
      if(w<1)s.walk={from:[-1.7,2.2],to:[-.85,2.50],a:w,facingYaw:Math.PI/2,run:true};
      s.rootX=mix(-1.7,-.85,ease(w));s.rootZ=mix(2.2,2.50,ease(w));s.yaw=Math.PI/2;
      const wind=ease(clamp((t-56.4)/.5)),swing=ease(clamp((t-57.0)/.4));
      s.right=blend(V(.32,1.28,.12),V(.30,1.56,-.14),wind); // 蓄力
      s.right=blend(s.right,V(.02,1.42,.30),swing);          // 挥空（收臂程，跨体目标会超伸）
      s.left=V(-.34,1.26,.14);s.fist=1;s.lean=.12*swing;
      if(t>T.TAP2){const r=ease(clamp((t-T.TAP2)/.3));s.bob=-.05*r;s.emotion='scared';
        if(t>T.TAP2+.7)s.emotion='neutral';}
      return;
    }
    s.rootX=-1.3;s.rootZ=2.3;s.yaw=Math.PI/2;s.left=V(-.32,1.24,.10);s.right=V(.32,1.24,.10);s.fist=.5;
    return;
  }
  // xiaozao：spar3 上步挥盘被夹
  if(phase!=='spar3'){s.rootX=-1.6;s.rootZ=2.6;s.yaw=Math.PI/2*.7;s.left=V(-.10,1.08,.10);s.right=V(.10,1.06,.08);s.fist=.4;return;}
  const w=clamp((t-59.4)/.6);
  if(w<1)s.walk={from:[-1.6,2.6],to:[-1.4,2.6],a:w,facingYaw:Math.PI/2};
  s.rootZ=2.6;s.yaw=Math.PI/2;
  const adv=clamp((t-60.2)/.6); // 挥盘带小上步（臂短够不到就上步压行程）
  if(adv<1)s.walk={from:[-1.4,2.6],to:[-.9,2.65],a:adv,facingYaw:Math.PI/2};
  s.rootX=mix(-1.4,-.9,ease(adv));s.rootZ=mix(2.6,2.65,ease(adv));
  const sw=ease(clamp((t-60.4)/.6));
  s.left=blend(V(-.10,1.08,.10),V(.03,1.20,.24),sw); // 花窗盘横扫（被夹点=DISC_PT）
  s.right=V(.16,1.06,.06);s.fist=.6;s.emotion='neutral'; // 右臂收右体侧（过中线=跨体超伸+插躯干双翻车）
  if(t>T.PINCH){s.headPitch=.04;} // 被夹住：微顿
  if(t>T.PINCH+.9){const r=ease(clamp((t-T.PINCH-.9)/.5));s.left=blend(V(.03,1.20,.24),IDLE.xiaozao.left,r);}
}
function hotpotSpec(name,s,phase,t){
  // 围锅位（锅在 (.3,3.6)）
  const GATHER={aoao:[-.7,3.0],xiaozao:[-1.2,3.9],dafu:[1.6,3.6],azu:[.9,2.5]};
  if(phase==='hotpot'){
    const home={aoao:[-.5,2.4],xiaozao:[-.9,2.65],dafu:[-1.3,2.3],azu:[-.15,2.7]}[name];
    const g=GATHER[name],w=clamp((t-63.0)/1.2);
    if(name==='dafu'){ // 走到锅位掏锅架锅（锅=viewer 道具 T.POT 弹出）
      const w0=clamp((t-63.0)/1.0);
      if(w0<1)s.walk={from:[-1.3,2.3],to:[.9,3.1],a:w0,facingYaw:-.6};
      s.rootX=mix(-1.3,.9,ease(w0));s.rootZ=mix(2.3,3.1,ease(w0));s.yaw=-.6;
      const reach1=ease(clamp((t-63.2)/.5)); // 背后掏锅
      s.right=blend(V(.32,1.24,.10),V(.34,1.30,-.18),reach1);
      if(t>T.POT){const put=ease(clamp((t-T.POT)/.6)); // 放下锅
        s.right=blend(V(.34,1.30,-.18),V(.24,.86,.30),put);s.bob=-.10*put;s.emotion='laugh';}
      if(t>64.4){const up=ease(clamp((t-64.4)/.5));s.bob=-.10*(1-up);s.right=blend(V(.24,.86,.30),V(.28,1.16,.05),up);}
      if(t>64.9){ // 归位围锅
        const w2=clamp((t-64.9)/.9);
        if(w2<1)s.walk={from:[.9,3.1],to:g,a:w2,facingYaw:-.4};
        s.rootX=mix(.9,g[0],ease(w2));s.rootZ=mix(3.1,g[1],ease(w2));s.yaw=-.4;
      }
      return;
    }
    if(w<1&&name!=='azu')s.walk={from:home,to:g,a:w};
    if(name==='azu'){s.rootX=home[0];s.rootZ=home[1];s.yaw=-Math.PI/2;s.cladT=1;return;} // 阿箸原地冷看
    s.rootX=mix(home[0],g[0],ease(w));s.rootZ=mix(home[1],g[1],ease(w));
    s.yaw=Math.atan2(.3-g[0],3.6-g[1]); // 面向锅
    s.emotion=name==='xiaozao'?'neutral':'happy';s.fist=.2;
    s.left=IDLE[name].left;s.right=IDLE[name].right;
    return;
  }
  // azu_break / finale：全员围锅；阿箸破功
  const g=GATHER[name];
  s.rootX=g[0];s.rootZ=g[1];s.yaw=Math.atan2(.3-g[0],3.6-g[1]);
  if(name==='azu'){
    s.cladT=1;
    if(phase==='azu_break'){
      const sn=ease(clamp((t-66.8)/.4)); // 嗅到香气：前倾+抬头
      const w=clamp((t-66.8)/.8); // 被香气勾着走近一步（真走路，不滑步）
      if(w<1){s.walk={from:[-.15,2.7],to:g,a:w};s.rootX=mix(-.15,g[0],ease(w));s.rootZ=mix(2.7,g[1],ease(w));}
      s.yaw=mix(-Math.PI/2,Math.atan2(.3-g[0],3.6-g[1]),ease(w));
      s.lean=.08*sn;s.headPitch=-.10*sn;s.emotion=sn>.5?'surprised':'neutral';
      s.left=blend(AZU_CROSS.left,V(-.14,1.22,.12),sn);s.right=blend(AZU_CROSS.right,V(.14,1.22,.12),sn);
      if(t>67.6){const c=ease(clamp((t-67.6)/.4));s.emotion=c<1?'surprised':'determined';s.headRoll=-.04*c;} // 干咳掩饰
      return;
    }
    s.emotion='happy';s.headPitch=-.04; // 收尾放弃表情管理
    return;
  }
  s.rootX=g[0];s.rootZ=g[1];s.yaw=Math.atan2(.3-g[0],3.6-g[1]);
  s.emotion=name==='xiaozao'?'neutral':'happy';s.fist=.2;
  if(phase==='finale'&&t>T.HESTIA){ // 抬头看女神
    s.headPitch=-.22;s.headYaw=Math.atan2(HESTIA_SEAT.x-g[0],HESTIA_SEAT.z-g[1])-s.yaw;
    s.headYaw=Math.max(-.6,Math.min(.6,s.headYaw));
  }
}

function spec(name,phase,t){
  const s=base(name);
  if(name==='hestia')return s; // 女神走独立链
  if(name==='azu'&&['azu_walk','azu_clad','azu_idle'].includes(phase)){azuEnterSpec(s,phase,t);return s;}
  if(name==='azu'&&phase!=='spar1'&&phase!=='spar2'&&phase!=='spar3'&&
     !['hotpot','azu_break','finale'].includes(phase)&&
     !['azu_walk','azu_clad','azu_idle'].includes(phase)){
    if(['establish','morning','chase','notice'].includes(phase)){s.visible=false;return s;}
    // 考核段：监考冷看（含 azu 台词段表情）
    if(!s.visible)s.visible=true;
    azuEnterSpec(s,'azu_idle',t);
    s.left={...AZU_CROSS.left};s.right={...AZU_CROSS.right};
    if(phase==='exam2_lift'||phase==='exam2_drop'){ // 让开大釜的机位走廊（监考移步中后方）
      const w=clamp((t-40.0)/.8);
      if(w<1)s.walk={from:AZU_SPOT,to:[.2,4.0],a:w,facingYaw:-Math.PI/2};
      s.rootX=mix(AZU_SPOT[0],.2,ease(w));s.rootZ=mix(AZU_SPOT[1],4.0,ease(w));
    }
    if(phase==='exam3'||phase==='exam3b'){ // 回监考位
      const w=clamp((t-46.6)/.8);
      if(w<1)s.walk={from:[.2,4.0],to:AZU_SPOT,a:w,facingYaw:-Math.PI/2};
      s.rootX=mix(.2,AZU_SPOT[0],ease(w));s.rootZ=mix(4.0,AZU_SPOT[1],ease(w));
    }
    if(phase==='exam1b'||phase==='exam1'){if(t>37.0){s.headRoll=-.06;s.headYaw=-.16;}}
    if(phase==='exam2_drop'&&t>44.2)s.headPitch=.04; // 扣分记录低头
    if(phase==='exam3b'){const n=ease(clamp((t-50.0)/.5));s.headPitch=.12*n*(1-ease(clamp((t-50.6)/.4)));} // 首肯点头
    return s;
  }
  switch(phase){
    case 'establish':s.visible=false;return s;
    case 'morning':morningSpec(name,s,t);return s;
    case 'chase':chaseSpec(name,s,t);return s;
    case 'notice':noticeSpec(name,s,t);return s;
    case 'exam1':case 'exam1b':exam1Spec(name,s,t);return s;
    case 'exam2_lift':case 'exam2_drop':exam2Spec(name,s,t,phase);return s;
    case 'exam3':case 'exam3b':exam3Spec(name,s,t);return s;
    case 'spar1':case 'spar2':case 'spar3':sparSpec(name,s,phase,t);return s;
    case 'hotpot':case 'azu_break':case 'finale':hotpotSpec(name,s,phase,t);return s;
  }
  return s;
}

// ── 公共骨架求解（OP buildPose 同契约 + sit 扩展）─────────────────
function buildPose(actor,s,t,d){
  const hipIdle=d.hipIdle,st=d.standStraight??0;
  let hipY=hipIdle+s.bob+st;
  const p={rootX:s.rootX,rootZ:s.rootZ,yaw:s.yaw,bob:s.bob+st,lean:s.lean,
    headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll,
    fist:s.fist,open:s.open,point:s.point,blink:s.blink,capeLift:s.capeLift??0};
  let locomotion=null;
  if(s.walk||s.turn){
    const half=d.hipHalf*1.15,G=!s.turn&&s.walk.run?RUN_GAIT:WALK_GAIT;
    const gait=s.turn?WALK_GAIT.turningFeet(s.turn,s.rootX,s.rootZ,s.yaw,half,d.footY)
      :G.walkingFeet(s.walk,s.rootX,s.rootZ,s.yaw,half,d.footY,(d.legA+d.legB)*.75);
    const heading=s.turn?s.yaw:(s.walk.facingYaw??Math.atan2(s.walk.to[0]-s.walk.from[0],s.walk.to[1]-s.walk.from[1]));
    p.rootX=s.rootX+Math.cos(heading)*gait.sway;p.rootZ=s.rootZ-Math.sin(heading)*gait.sway;
    hipY=hipIdle+st+gait.hipDelta-(s.tuck??0)*.1;
    for(const [side,sign] of [['left',-1],['right',1]]){
      const f=gait[side],horizontal=(f.x-sign*d.hipHalf)**2+f.z*f.z;
      hipY=Math.min(hipY,f.y+Math.sqrt(Math.max(.01,(d.legA+d.legB-.008)**2-horizontal)));
    }
    for(const [side,sign] of [['left',-1],['right',1]]){
      const f=gait[side],start=V(sign*d.hipHalf,hipY,0),end=V(f.x,f.y,f.z+(s.tuck??0)*.3);
      p[side+'Leg']=[start,twoBone(start,end,V(0,0,1),d.legA,d.legB),end];
      p[side+'FootPitch']=f.pitch;p[side+'FootYaw']=f.yaw;
    }
    p.bob=hipY-hipIdle;
    locomotion={kind:s.turn?'turn':'walk',step:gait.step,steps:gait.steps,bob:p.bob,
      root:[p.rootX,0,p.rootZ]};
    for(const [side,sign] of [['left',-1],['right',1]]){
      const shoulder=V(sign*d.shoulderHalf,d.shoulderY+p.bob,0);
      const hand={...s[side]};
      if(!s.turn&&!s.noSwing){ // 双臂对摆仅垂挂臂（抬臂架势按前臂抬角线性收掉，>32° 归零）
        const dy=s[side].y-d.shoulderY,horiz0=Math.hypot(s[side].x-sign*d.shoulderHalf,s[side].z);
        const hangDeg=Math.atan2(horiz0,Math.max(.01,-dy))*180/Math.PI;
        hand.z+=(side==='right'?1:-1)*gait.armSwing*clamp((32-hangDeg)/18);
      }
      const target=V(hand.x,hand.y+p.bob,hand.z);
      const delta=new THREE.Vector3(target.x-shoulder.x,target.y-shoulder.y,target.z-shoulder.z);
      const maxR=d.armA+d.armB-.005;
      if(delta.length()>maxR){delta.setLength(maxR);Object.assign(target,V(shoulder.x+delta.x,shoulder.y+delta.y,shoulder.z+delta.z));}
      p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.25,-.65,-.5),d.armA,d.armB),target];
    }
  }else{
    const tuck=s.tuck??0;
    if(s.sit){ // 坐地：髋部下沉+双脚前伸（S1E2 击倒工艺：不整体旋转机身）
      hipY=hipIdle+s.bob+st-s.sit.drop;
      p.bob=s.bob+st-s.sit.drop;
    }
    for(const [side,sign] of [['left',-1],['right',1]]){
      const end=s.sit?V(sign*.13,d.footY,s.sit.feet):V(sign*.09,d.footY+tuck,.02-.4*tuck);
      p[side+'Leg']=[V(sign*d.hipHalf,hipY,0),null,end];
    }
    for(const [side,sign] of [['left',-1],['right',1]]){
      const leg=p[side+'Leg'];leg[1]=twoBone(leg[0],leg[2],V(0,0,1),d.legA,d.legB);
      const shoulder=V(sign*d.shoulderHalf,d.shoulderY+p.bob,0),target=V(s[side].x,s[side].y+p.bob,s[side].z);
      const delta=new THREE.Vector3(target.x-shoulder.x,target.y-shoulder.y,target.z-shoulder.z);
      const maxR=d.armA+d.armB-.005;
      if(delta.length()>maxR){delta.setLength(maxR);Object.assign(target,V(shoulder.x+delta.x,shoulder.y+delta.y,shoulder.z+delta.z));}
      p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.25,-.65,-.5),d.armA,d.armB),target];
    }
  }
  if(p.blink==null)p.blink=Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);
  actor.setCladState(s.cladT); // 先长甲后摆姿势：fitMetrics 读的是本帧生长 scale
  // （上一帧 scale 会让甲件探针在生长段读出一帧前的陈旧值，seek 逆序求值必翻车）
  actor.setPose(p);
  actor.mesh.visible=s.visible!==false;
  actor.mesh.position.y=s.air??0;
  return {...p,locomotion};
}

// ── 女神赫斯提亚（finale 坐锅沿现身；坐姿直出腿链复用 OP 链）────────────
function specHestia(phase,t){
  const s={visible:phase==='finale'&&t>=T.HESTIA,
    bob:0,headYaw:.08*Math.sin(t*.7)+.05,headPitch:.06,headRoll:0,
    swingAmp:.10,wave:0,blink:null,fistR:.55,fistL:.35,openL:0};
  if(!s.visible)return s;
  s.bob=.008*Math.sin(t*1.1);
  if(t>73.4&&t<74.2)s.wave=Math.sin((t-73.4)/.8*Math.PI); // 说完挥手（73.4-74.2）
  if(t>=T.CLANG&&t<T.CLANG+.18){s.blink=1;s.bob=-.015;}
  return s;
}
function buildPoseHestia(actor,s,t){
  const {x,y,z}=HESTIA_SEAT;
  const p={rootX:x,rootY:y+s.bob,rootZ:z,yaw:0,bob:0,t,
    headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll,
    blink:s.blink,fistR:s.fistR,fistL:s.fistL,openL:s.openL};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const sw=s.swingAmp*Math.sin(t*1.35+(side==='left'?0:Math.PI));
    p[side+'Leg']=[V(sign*.075,-.02,.02),V(sign*.09,-.20,.44),V(sign*.10,-.64,.34+sw*.5)];
    p[side+'FootPitch']=.5+.2*sw;
  }
  const poleR=V(.3,-.6,-.4),poleL=V(-.3,-.6,-.4);
  const shR=V(.13,.52,.02),shL=V(-.13,.52,.02);
  let wR=V(.20,.30,.20),wL=V(-.20,.26,.08);
  if(s.wave>0){wL=blend(wL,V(-.28,.58,.18),s.wave);wL.z+=.04*Math.sin(t*7)*s.wave;
    p.openL=.7*s.wave;p.fistL=.35-.25*s.wave;}
  p.rightArm=[shR,twoBone(shR,wR,poleR,.17,.16),wR];
  p.leftArm=[shL,twoBone(shL,wL,poleL,.17,.16),wL];
  actor.setPose(p);
  actor.mesh.visible=s.visible;
  return p;
}

// entries 由 viewer 从 config/timeline.json 派生：{startTime,endTime,opts:{move,shot,scene}}
export function poseAt(actors,entries,t){
  const entry=entries.findLast(e=>e.startTime<=t)??entries[0],i=entries.indexOf(entry);
  const phase=entry.opts.move;
  const states={};
  for(const name of ['aoao','xiaozao','dafu','azu'])states[name]=spec(name,phase,t);
  const dt=t-entry.startTime;
  if(i&&dt<.3){ // 条目边界 0.3s 原地缘插值（上一拍未登场的角色直接定格新拍起点）
    const prev=entries[i-1],a=ease(dt/.3);
    for(const name of ['aoao','xiaozao','dafu','azu']){
      const o=spec(name,prev.opts.move,prev.endTime);
      if(o.visible===false)continue;
      const s=states[name];
      if(s.walk||s.turn||o.walk||o.turn)continue; // 走/跑/转身拍不做边界混合：walk.from 与旧拍
      // root 不同源（场景跳切/走位起点），混入会把髋部拉离落脚点抛 twoBone 不可达（P1 翻车实录）
      for(const key of ['rootX','rootZ','yaw','bob','headYaw','headRoll','headPitch','cladT','fist','open','point','lean','air','tuck','capeLift'])
        if(typeof s[key]==='number')s[key]=key==='yaw'?(o[key]??0)+angleDelta(o[key]??0,s[key])*a:mix(o[key]??0,s[key],a);
      s.left=blend(o.left,s.left,a);s.right=blend(o.right,s.right,a);
      s.emotion=a<.5?o.emotion:s.emotion;
    }
  }
  const poses={};
  for(const name of ['aoao','xiaozao','dafu','azu'])poses[name]=buildPose(actors[name],states[name],t,DIMS[name]);
  if(actors.hestia){
    const hs=specHestia(phase,t);
    states.hestia=hs;
    poses.hestia=buildPoseHestia(actors.hestia,hs,t);
  }
  return {entry,i,opts:entry.opts,phase,dt,states,poses};
}
