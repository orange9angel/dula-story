// 《星屑战壳》S1E1 R13「圣火与战壳」表演谱（115s 剧情级重写；故事载体=storyboard.md）：
// 冷开圣火弱（F01）→ 柱廊巡逻 → 防务评估通告（真赌注）→ 上角斗场 → 考核三连（冲动被反制/
// 犹豫错失/蛮力落空，各付真实代价）→ 谷底空镜+阿鏊眼部特写 → 合体战术（颠勺升华为战术）
// → 逼出真招并接住 → 收刃留白 → 画外音收主题 + F02 报告独处（观众见角色不知）。
// (t,state) 纯函数；条目边界 0.3s 插值（walk/turn 拍跳过——R13 保留纪律）；骨架沿用 R7/R13 前。
import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {createLocomotion,angleDelta} from 'dula-assets/lib/craft3d/locomotion.js';
const WALK_GAIT=createLocomotion({hipDelta:.040,lift:.068});
const RUN_GAIT=createLocomotion({hipDelta:.050,lift:.105,sway:.022,armSwingGain:.30,armSwingMax:.16,heelStrike:.30,toeOff:.30});
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,u)=>a+(b-a)*u,V=(x,y,z=0)=>({x,y,z}),blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));

// ── 时刻表（viewer 特效/混音摆点共用）──
export const T={
  SCROLL:19.8,            // 防务令公文到
  AZU_IN:25.0,            // 阿箸入场
  DECLARE:30.0,           // 宣告段起
  TEST1:44.0,             // 考核战起
  CHARGE1:46.2,           // 阿鏊冲锋（无脑冲）
  C1:51.5,                // 刃点盾（冲被反制）
  C2:63.5,                // 刃点小凿肩甲（犹豫的句点）
  SWING3:72.8,            // 大釜全力挥空
  C3:74.0,                // 刃点大釜背（蛮力的句点）
  FIRE_CUT:78.0,          // 谷底空镜（圣火将熄特写，全片最静）
  EYE1:81.5,              // 阿鏊眼部特写（动摇→咬住）
  COMBO_CMD:88.5,         // 战术指令
  CROUCH:91.9,            // 大釜下蹲
  TOSS:92.5,              // 抛出阿鏊（连人带盾）
  CALL1:95.8,             // 阿鏊喊「震堂·锅鸣一击」
  C4:96.5,                // 刃架盾（空中突进被架开）
  CALL2:97.7,             // 阿箸喊「流星·双箸乱穿」
  BARRAGE:97.5,           // 乱穿弹幕
  C5:99.5,                // 接住一线（盾阵+网+压制）
  SHEATHE:100.0,          // 收刃
  EYE2:101.2,             // 阿箸眼部特写（认可）
  HESTIA:111.7,           // 画外音
  F02:113.0,              // 报告独处镜头
  EYE3:118.0,             // 结尾看火
  FADE:119.0,             // 淡黑起
};
// 接触锚点（世界坐标常量，trace 实测回修）
export const SHIELD_PT=[0.30,1.30,2.42];    // c1/c4/c5 盾区（角斗场阿鏊戒备位）
export const XIAO_PAULR_PT=[-1.55,1.35,2.62];// c2 小凿右肩甲
export const DAFU_BACK_PT=[1.55,1.35,1.85]; // c3 大釜背（挥空踉跄位）
export const COMBO_PT=[0.55,1.42,2.35];     // c4 刃架盾空中接触 / c5 乱穿接住区

const DIMS={
  aoao:{hipIdle:.87,standStraight:.013,shoulderY:1.42,shoulderHalf:.14,hipHalf:.078,legA:.42,legB:.42,armA:.20,armB:.19,footY:.085},
  xiaozao:{hipIdle:.81,standStraight:.012,shoulderY:1.32,shoulderHalf:.125,hipHalf:.072,legA:.385,legB:.385,armA:.185,armB:.175,footY:.080},
  dafu:{hipIdle:.96,standStraight:.008,shoulderY:1.58,shoulderHalf:.19,hipHalf:.105,legA:.46,legB:.46,armA:.23,armB:.22,footY:.100},
  azu:{hipIdle:.95,standStraight:.010,shoulderY:1.56,shoulderHalf:.13,hipHalf:.070,legA:.48,legB:.48,armA:.22,armB:.21,footY:.090},
};
const SPOTS={aoao:[-1.6,1.8],xiaozao:[-3.2,2.2],dafu:[.8,2.0]}; // 圣殿群像位
const ARENA={aoao:[-2.2,1.8],xiaozao:[-2.8,2.4],dafu:[2.8,1.7],azu:[1.6,2.4]}; // 角斗场落位
const IDLE={
  aoao:{left:V(-.20,1.10,.04),right:V(.20,1.10,.04)},
  xiaozao:{left:V(-.17,1.02,.03),right:V(.17,1.02,.03)},
  dafu:{left:V(-.28,1.16,.05),right:V(.28,1.16,.05)},
  azu:{left:V(-.16,1.20,.04),right:V(.16,1.20,.04)},
};
const AZU_CROSS={left:V(-.10,1.26,.16),right:V(.12,1.24,.14)};
export const HESTIA_SEAT={x:0,y:4.375,z:-5.06};

function base(name){
  const spot=SPOTS[name]??ARENA.azu;
  return {visible:true,rootX:spot[0],rootZ:spot[1],yaw:0,bob:0,lean:0,air:0,tuck:0,
    left:{...IDLE[name].left},right:{...IDLE[name].right},
    headYaw:0,headPitch:0,headRoll:0,fist:.12,open:0,point:0,walk:null,turn:null,
    cladT:1,emotion:name==='xiaozao'||name==='azu'?'neutral':'determined',blink:null,capeLift:0};
}

// ── 巡逻（柱廊晨景；位移=值夜巡逻路线，有动机）──
function patrolSpec(name,s,t){
  if(name==='azu'){s.visible=false;return;}
  const FILE={aoao:0,xiaozao:1,dafu:2}[name]; // 纵队：阿鏊领队
  const zLane=[2.6,3.0,3.4][FILE];
  if(t<12.5){ // 东巡（-4.2→+4.0）
    const a=clamp((t-5.5)/7.0),x0=-4.2-FILE*1.1,x1=4.0-FILE*1.1;
    s.walk={from:[x0,zLane],to:[x1,zLane],a};
    s.rootX=mix(x0,x1,ease(a));s.rootZ=zLane;s.yaw=Math.PI/2;
  }else if(t<13.5){ // 东廊尽头换脚转身（向西回巡）
    const a=clamp((t-12.5)/1.0);
    s.rootX=4.0-FILE*1.1;s.rootZ=zLane;
    s.turn={fromYaw:Math.PI/2,toYaw:-Math.PI/2,a};s.yaw=Math.PI/2+angleDelta(Math.PI/2,-Math.PI/2)*ease(a);
  }else{ // 回巡
    const a=clamp((t-13.5)/5.5),x0=4.0-FILE*1.1,x1=-2.6-FILE*1.1;
    s.walk={from:[x0,zLane],to:[x1,zLane],a};
    s.rootX=mix(x0,x1,ease(a));s.rootZ=zLane;s.yaw=-Math.PI/2;
  }
  s.fist=.15;s.emotion=name==='xiaozao'?'neutral':'determined';
}
// ── 通告+阿箸到来（真赌注）──
function noticeSpec(name,s,t){
  if(name==='azu'){s.visible=false;return;}
  const from={aoao:[-2.6,2.6],xiaozao:[-3.7,3.0],dafu:[-4.8,3.4]}[name]; // 接续巡逻回巡终点（-2.6-FILE*1.1, zLane），不跳位
  const a=clamp((t-19.0)/2.4);
  if(a<1){
    s.walk={from,to:SPOTS[name],a};
    s.rootX=mix(from[0],SPOTS[name][0],ease(a));s.rootZ=mix(from[1],SPOTS[name][1],ease(a));
    s.yaw=Math.atan2(SPOTS[name][0]-from[0],SPOTS[name][1]-from[1]);
  }else{
    s.yaw=0;
    if(t>T.SCROLL){s.headPitch=mix(s.headPitch,-.16,ease(clamp((t-T.SCROLL)/.5)));} // 抬头读公文
    if(name==='aoao'&&t>30.4){s.emotion='angry';s.left=V(-.26,1.22,.14);s.fist=.7;} // 冲动顶撞
    if(name==='dafu'&&t>24.0){s.emotion='worry';s.bob=.012*Math.sin(t*7);}
    if(name==='xiaozao'){s.left=V(-.06,1.06,.12);s.right=V(.04,1.05,.10);s.fist=.3;} // 读她的步幅
  }
}
function azuEnterSpec(s,phase,t){
  if(phase==='azu_walk'){ // 审查官入场（步伐有分量：步幅没有一步多余）
    const a=clamp((t-25.2)/4.2);
    if(a<1){
      s.walk={from:[5.2,3.2],to:[1.5,3.0],a,facingYaw:-Math.PI/2};
      s.rootX=mix(5.2,1.5,ease(a));s.rootZ=mix(3.2,3.0,ease(a));s.yaw=-Math.PI/2;s.capeLift=.2;
    }else{s.rootX=1.5;s.rootZ=3.0;s.yaw=-Math.PI/2;}
    s.emotion='neutral';return;
  }
  // azu_declare：站定宣告；末句亮刃尖（威慑不是出手）
  s.rootX=1.5;s.rootZ=3.0;s.yaw=-Math.PI/2;
  s.left={...AZU_CROSS.left};s.right={...AZU_CROSS.right};
  if(t>33.0&&t<34.4){const p=ease(clamp((t-33.0)/.5)); // 「证明给我看」抬刃一寸
    s.right=blend(AZU_CROSS.right,V(.08,1.32,.20),p);}
  if(t>36.0)s.headYaw=.06*Math.sin(t*.7);
}
// ── 上角斗场（上考场的步伐）──
function toArenaSpec(name,s,t,phase){
  if(name==='azu'){s.visible=false;return;} // 她已先到场（角斗场段她已在场内）
  if(phase==='to_arena'&&t<40.5){ // 圣殿侧走出（向画面右；走到近右缘即可，跳切接力）
    const a=clamp((t-38.0)/2.2);
    const from=SPOTS[name],to={aoao:[2.4,2.6],xiaozao:[.6,2.9],dafu:[3.4,2.7]}[name]; // 诚实步速不超阈
    if(a<1)s.walk={from,to,a}; // 到位后收步（跳切前 0.3s 站定，gait bout 干净闭合）
    s.rootX=mix(from[0],to[0],ease(a));s.rootZ=mix(from[1],to[1],ease(a));
    s.yaw=Math.atan2(to[0]-from[0],to[1]-from[1]);
  }else{ // 角斗场侧走入落位（从左入场）
    const a=clamp((t-40.5)/3.0);
    const from=[-5.0,2.4],to=ARENA[name];
    if(a<1)s.walk={from,to,a};
    s.rootX=mix(from[0],to[0],ease(a));s.rootZ=mix(from[1],to[1],ease(a));
    s.yaw=Math.atan2(to[0]-from[0],to[1]-from[1])*ease(clamp(a*2)) ; // 落位转向场心
    if(a>=1)s.yaw=name==='azu'?-Math.PI/2:Math.atan2(ARENA.azu[0]-to[0],ARENA.azu[1]-to[1]);
  }
}
// ── 考核战（认真的战斗：接近/试探/代价）──
function testSpec(name,s,phase,t){
  const A=ARENA;
  if(name==='azu'){ // 审查官：招招有杀气但收着力（她在评估）
    if(phase==='test1'){ // 侧闪让过冲锋 → 近身刃点盾（c1）
      if(t<47.2){s.rootX=A.azu[0];s.rootZ=A.azu[1];s.yaw=-Math.PI/2;}
      else if(t<47.9){const a=clamp((t-47.2)/.7);
        s.walk={from:[A.azu[0],A.azu[1]],to:[1.2,2.9],a,facingYaw:-Math.PI/2};
        s.rootX=mix(A.azu[0],1.2,ease(a));s.rootZ=mix(A.azu[1],2.9,ease(a));}
      else{s.rootX=1.2;s.rootZ=2.9;}
      s.yaw=-Math.PI/2;
      if(t>50.6){const a=clamp((t-50.6)/.7); // 上步进刃程（诚实步速，进得更深才够到盾面）
        if(a<1)s.walk={from:[1.2,2.9],to:[.62,2.5],a,facingYaw:-Math.PI/2};
        s.rootX=mix(1.2,.62,ease(a));s.rootZ=mix(2.9,2.5,ease(a));}
      const p=ease(clamp((t-(T.C1-.3))/.3));
      s.right=blend(AZU_CROSS.right,V(.05,1.33,.30),p);s.noSwing=1;
      if(t>T.C1){const r=ease(clamp((t-T.C1)/.4));s.right=blend(V(.05,1.33,.30),AZU_CROSS.right,r);}
      return;
    }
    if(phase==='test2'){ // 缓步逼近（给小凿的窗口读秒施压）→ 点肩（c2）
      if(t<63.2){const a=clamp((t-56.2)/6.8); // 极慢逼近=读秒压迫（接续 test1 进刃程落点；进到刃程才有点肩资格）
        s.walk={from:[.62,2.5],to:[-2.18,2.21],a,facingYaw:-Math.PI/2};
        s.rootX=mix(.62,-2.18,ease(a));s.rootZ=mix(2.5,2.21,ease(a));}
      else{s.rootX=-2.18;s.rootZ=2.21;}
      s.yaw=-Math.PI/2;
      const p=ease(clamp((t-(T.C2-.25))/.25));
      s.left=blend(AZU_CROSS.left,V(-.05,1.36,.34),p);s.noSwing=1;
      if(t>T.C2){const r=ease(clamp((t-T.C2)/.4));s.left=blend(V(-.05,1.36,.34),AZU_CROSS.left,r);}
      return;
    }
    if(phase==='test3'){ // 走回场心接招 → 滑步让挥空 → 绕背点背（c3；步幅没有一步多余）
      if(t<71.5){const a=clamp((t-66.0)/5.5); // 读完小凿就走回来接大釜的科目（慢=压迫感）
        if(a<1)s.walk={from:[-2.18,2.21],to:[.5,1.9],a,facingYaw:-Math.PI/2};
        s.rootX=mix(-2.18,.5,ease(a));s.rootZ=mix(2.21,1.9,ease(a));s.yaw=-Math.PI/2;}
      else if(t<73.2){ // 滑步让开全力一挥（读懂蓄力才动，不提前）
        const a=clamp((t-72.7)/.5);
        if(a>0&&a<1)s.walk={from:[.5,1.9],to:[1.1,1.35],a,facingYaw:-Math.PI/2};
        if(a>0){s.rootX=mix(.5,1.1,ease(a));s.rootZ=mix(1.9,1.35,ease(a));}
        else{s.rootX=.5;s.rootZ=1.9;}
        s.yaw=-Math.PI/2;}
      else{const a=clamp((t-73.2)/.6); // 绕到他背后（诚实步速，别瞬移）
        if(a<1)s.walk={from:[1.1,1.35],to:[1.95,1.669],a,facingYaw:-Math.PI/2};
        s.rootX=mix(1.1,1.95,ease(a));s.rootZ=mix(1.35,1.669,ease(a));s.yaw=-Math.PI/2;}
      const p=ease(clamp((t-(T.C3-.25))/.25));
      s.right=blend(AZU_CROSS.right,V(.05,1.44,.38),p);s.noSwing=1;
      if(t>T.C3){const r=ease(clamp((t-T.C3)/.4));s.right=blend(V(.05,1.44,.38),AZU_CROSS.right,r);}
      return;
    }
    return; // combo/sheathe 由 comboSpec 管
  }
  if(name==='aoao'){
    if(phase==='test1'){ // 无脑冲：蓄力→冲锋→挥空踉跄→戒备→被点倒
      if(t<46.2){s.rootX=A.aoao[0];s.rootZ=A.aoao[1];s.yaw=Math.atan2(A.azu[0]-A.aoao[0],A.azu[1]-A.aoao[1]);
        const c=ease(clamp((t-44.6)/.6));s.bob=-.06*c;s.lean=.08*c;s.fist=.9;
        s.left=V(-.24,1.10,-.02);s.right=V(.24,1.10,-.02);return;}
      if(t<47.6){const a=clamp((t-46.2)/1.4); // 冲锋（RUN_GAIT 正片展示）
        if(a<1)s.walk={from:A.aoao,to:[.3,2.1],a,run:true};
        s.rootX=mix(A.aoao[0],.3,ease(a));s.rootZ=mix(A.aoao[1],2.1,ease(a));s.yaw=Math.PI/2;
        s.lean=.12;s.capeLift=.5;s.fist=1;s.left=V(-.20,1.10,-.10);s.right=V(.22,1.20,.10);return;}
      // 挥空冲过位→折返戒备
      if(t<48.6){const a=clamp((t-47.6)/1.0);
        s.walk={from:[.3,2.1],to:[-.2,2.2],a,facingYaw:Math.PI/2};
        s.rootX=mix(.3,-.2,ease(a));s.rootZ=mix(2.1,2.2,ease(a));s.yaw=Math.PI/2;
        s.lean=.12*(1-a);s.emotion='surprised';return;}
      s.rootX=-.2;s.rootZ=2.2;s.yaw=Math.PI/2;s.fist=1;
      s.left=V(-.14,1.30,.26);s.right=V(.22,1.16,.10); // 盾架起
      if(t>T.C1){ // 被点：后坐→单膝触地→撑住
        const r=ease(clamp((t-T.C1)/.4)),dn=ease(clamp((t-52.2)/.8));
        s.bob=-.05*r*(1-dn*.5)-.30*dn;s.rootX=-.2-.12*r;s.emotion=r<1?'surprised':'determined';
        if(dn>0){s.sit={drop:.30*dn,feet:.24*dn};s.left=V(-.30,.95,.10);s.right=V(.10,.90,.24);
          s.headPitch=.20*dn;}
      }
      if(t>54.6){ // 撑膝起来退到场边（代价可见）
        const a=clamp((t-54.6)/1.2);
        if(a<1)s.walk={from:[-.32,2.2],to:[-3.0,2.6],a};
        s.sit=null;s.rootX=mix(-.32,-3.0,ease(a));s.rootZ=mix(2.2,2.6,ease(a));
        s.yaw=Math.PI/2;s.headPitch=.12*(1-a);s.emotion='determined';
        s.left=V(-.20,1.10,.04);s.right=V(.20,1.10,.04);
      }
      return;
    }
    if(phase==='test2'||phase==='test3'){ // 场边按住伤处看同伴（代价的持续性）
      s.rootX=-3.0;s.rootZ=2.6;s.yaw=Math.PI/2;
      s.left=V(-.20,1.08,.02);s.right=V(.24,1.12,.14);s.fist=.6;
      s.emotion='worry';s.headPitch=.06;
      if(phase==='test3'&&t>74.5)s.emotion='scared'; // 大釜也倒了
      return;
    }
    return;
  }
  if(name==='xiaozao'){
    if(phase==='test1'){s.rootX=A.xiaozao[0];s.rootZ=A.xiaozao[1];
      s.yaw=Math.atan2(1.6-A.xiaozao[0],2.4-A.xiaozao[1]);s.headYaw=.1; // 观战读招
      s.left=V(-.06,1.06,.12);s.right=V(.04,1.05,.10);return;}
    if(phase==='test2'){ // 举盘瞄准——读秒犹豫（过度计算的代价）→ 被点肩
      s.rootX=A.xiaozao[0];s.rootZ=A.xiaozao[1];s.yaw=Math.PI/2;
      const raise=ease(clamp((t-56.5)/.8));
      s.left=blend(IDLE.xiaozao.left,V(.06,1.20,.20),raise); // 举打孔阵
      s.right=V(.16,1.06,.06);
      if(t>59.0&&t<63.0){ // 读秒犹豫：臂微颤+指节收紧松开
        s.left.z+=.008*Math.sin(t*22);s.fist=.3+.3*Math.abs(Math.sin(t*3.5));
        s.headPitch=-.04;s.emotion='worry';
      }
      if(t>63.0){s.emotion='neutral';s.fist=.2;}
      if(t>T.C2){const r=ease(clamp((t-T.C2)/.3));s.bob=-.04*r;s.headPitch=.10*r;
        const d=ease(clamp((t-64.0)/.6));s.left=blend(V(.06,1.20,.20),IDLE.xiaozao.left,d);} // 垂盘
      return;
    }
    if(phase==='test3'){s.rootX=-2.8;s.rootZ=2.4;s.yaw=Math.PI/2;s.emotion='worry';
      s.left=V(-.17,1.02,.03);s.right=V(.17,1.02,.03);return;}
    return;
  }
  if(name==='dafu'){
    if(phase==='test1'||phase==='test2'){s.rootX=A.dafu[0];s.rootZ=A.dafu[1];
      s.yaw=Math.atan2(1.6-A.dafu[0],2.4-A.dafu[1]);s.emotion='worry';
      s.left=V(-.28,1.16,.05);s.right=V(.28,1.16,.05);return;}
    if(phase==='test3'){ // 蛮力：大步蓄力→全力挥空（不收敛）→ 被点背踉跄跪撑
      s.rootX=A.dafu[0];s.rootZ=A.dafu[1];s.yaw=-Math.PI/2;
      if(t>67.0&&t<68.4){const a=clamp((t-67.0)/1.4); // 逼近两步
        s.walk={from:A.dafu,to:[1.6,1.9],a,facingYaw:-Math.PI/2};
        s.rootX=mix(A.dafu[0],1.6,ease(a));s.rootZ=mix(A.dafu[1],1.9,ease(a));}
      const wind=ease(clamp((t-70.4)/1.6)); // 高举蓄力
      s.left=blend(V(-.32,1.28,.12),V(-.30,1.66,-.10),wind);
      s.right=blend(V(.32,1.28,.12),V(.30,1.66,-.10),wind);s.fist=1;s.emotion='determined';
      const sw=ease(clamp((t-T.SWING3)/.35)); // 全力挥空
      if(sw>0){s.left=blend(V(-.30,1.66,-.10),V(-.02,1.30,.34),sw);
        s.right=blend(V(.30,1.66,-.10),V(.02,1.32,.34),sw);s.lean=.14*sw;}
      const st=clamp((t-73.1)/.7); // 踉跄前冲（拳势带人）
      if(st>0){s.rootX=mix(1.6,1.35,ease(st));s.rootZ=mix(1.9,1.75,ease(st));} // st=0 时不得踩掉逼近走拍的 rootX
      if(t>T.C3){const r=ease(clamp((t-T.C3)/.4)),dn=ease(clamp((t-74.6)/.8));
        s.bob=-.05*r-.34*dn;s.emotion='scared';
        if(dn>0){s.sit={drop:.34*dn,feet:.26*dn};s.left=V(-.34,.90,.10);s.right=V(.34,.90,.10);}
      }
      if(t>76.2){const a=clamp((t-76.2)/1.7); // 撑膝退到场边（三人同侧；窗口放宽压住 peak 速度）
        if(a<1)s.walk={from:[1.35,1.75],to:[-2.2,2.8],a};
        s.sit=null;s.rootX=mix(1.35,-2.2,ease(a));s.rootZ=mix(1.75,2.8,ease(a));
        s.yaw=-Math.PI/2;s.emotion='worry';s.left=V(-.28,1.16,.05);s.right=V(.28,1.16,.05);}
      return;
    }
    return;
  }
}
// ── 谷底 → 转机（合体战术）→ 收刃 ──
function comboSpec(name,s,phase,t){
  const A=ARENA;
  if(name==='azu'){
    if(phase==='valley_fire'){s.visible=false;return;}
    if(phase==='valley_aoao'){ // 收刃抱臂旁观谷底（她的科目是"值不值"）
      s.rootX=1.2;s.rootZ=2.7;s.yaw=-Math.PI/2;
      s.left={...AZU_CROSS.left};s.right={...AZU_CROSS.right};s.emotion='neutral';
      return;
    }
    if(phase==='combo_cmd'||phase==='combo_toss'){ // 读指令，重心微沉戒备
      s.rootX=1.2;s.rootZ=2.7;s.yaw=-Math.PI/2;
      s.left={...AZU_CROSS.left};s.right={...AZU_CROSS.right};
      s.bob=-.03*ease(clamp((t-91.5)/.8));s.emotion='neutral';return;
    }
    if(phase==='combo_air'){ // 双刃交叉架开空中盾击（c4）
      s.rootX=1.2;s.rootZ=2.7;s.yaw=-Math.PI/2;
      const p=ease(clamp((t-(T.C4-.4))/.4));
      s.left=blend(AZU_CROSS.left,V(-.03,1.42,.34),p); // 双刃交叉上架（伸到拦截线才接得住盾）
      s.right=blend(AZU_CROSS.right,V(.03,1.42,.34),p);s.noSwing=1;
      if(t>T.C4){const r=ease(clamp((t-T.C4)/.3));s.bob=-.04*r;s.rootX=1.2+.06*r;} // 架开承力
      return;
    }
    if(phase==='combo_barrage'){ // 真招被逼出：「流星·双箸乱穿」（c5 被接住）
      const adv=clamp((t-97.5)/1.2); // 压着弹幕步步进逼（贴脸乱穿才有"被接住"的物理）
      if(adv>0&&adv<1)s.walk={from:[1.26,2.7],to:[.45,2.5],a:adv,facingYaw:-Math.PI/2};
      s.rootX=mix(1.26,.45,ease(adv));s.rootZ=mix(2.7,2.5,ease(adv));s.yaw=-Math.PI/2;
      const p=ease(clamp((t-T.CALL2)/.3));
      // 连续刺击：双臂交替前刺（弹幕由 VFX 承担）
      const jab=Math.sin(Math.min(t-T.BARRAGE,1.6)*14);
      s.left=V(-.04,1.34,.24+.06*Math.max(0,jab));
      s.right=V(.04,1.34,.24+.06*Math.max(0,-jab));
      s.noSwing=1;s.fist=.6;s.emotion='determined';s.capeLift=.4;
      if(t>T.C5){const r=ease(clamp((t-T.C5)/.3)); // 被接住：双刃被盾阵网压制停住
        s.left=blend(s.left,V(-.06,1.30,.18),r);s.right=blend(s.right,V(.06,1.30,.18),r);}
      return;
    }
    // sheathe：收刃，评语
    if(phase==='sheathe'){
      const back=clamp((t-100.0)/.8);
      if(back<1)s.walk={from:[.45,2.5],to:[1.8,2.6],a:back,facingYaw:-Math.PI/2};
      s.rootX=mix(.45,1.8,ease(back));s.rootZ=mix(2.5,2.6,ease(back));s.yaw=-Math.PI/2;
      s.left={...AZU_CROSS.left};s.right={...AZU_CROSS.right};s.capeLift=0;s.emotion='neutral';
      if(t>109.9){const a=clamp((t-110.0)/.6);s.yaw=-Math.PI/2+angleDelta(-Math.PI/2,Math.PI/2)*ease(a);} // 「明天还查」转身
      return;
    }
    return;
  }
  if(name==='aoao'){
    if(phase==='valley_fire'){s.visible=false;return;}
    if(phase==='valley_aoao'){ // 倒地→撑膝→抬头（E1 眼部特写段：动摇→咬住）
      s.rootX=-1.2;s.rootZ=2.2;s.yaw=Math.PI/2*.8;
      const dn=ease(clamp((t-81.5)/.3));
      s.sit={drop:.30,feet:.24};s.bob=0;
      s.left=V(-.30,.95,.10);s.right=V(.10,.90,.24);
      s.emotion=t<84.6?'scared':'determined'; // 84.6 咬住
      s.headPitch=t<84.6?.22:mix(.22,-.04,ease(clamp((t-84.6)/1.2))); // 抬头
      if(t>87.0){const up=ease(clamp((t-87.0)/.8));s.sit={drop:.30*(1-up),feet:.24*(1-up)}; // 站起
        s.left=blend(V(-.30,.95,.10),V(-.20,1.10,.04),up);s.right=blend(V(.10,.90,.24),V(.20,1.10,.04),up);}
      return;
    }
    if(phase==='combo_cmd'){ // 站起发令（缺陷认领为战术）
      const up=ease(clamp((t-88.0)/.7));
      s.sit=up<1?{drop:.30*(1-up),feet:.24*(1-up)}:null;
      s.rootX=-1.2;s.rootZ=2.2;s.yaw=Math.PI/2*.8;s.emotion='determined';
      s.left=V(-.22,1.16,.08);s.right=V(.26,1.30,.14); // 抬臂指挥
      return;
    }
    if(phase==='combo_toss'){ // 踏上大釜双掌（OP 颠勺升华为战术）
      const w=clamp((t-91.5)/.7); // 快步到大釜跟前（窗口放宽避免 cadence 探针误判）
      if(w<1)s.walk={from:[-1.2,2.2],to:[.15,2.15],a:w,run:true};
      s.rootX=mix(-1.2,.15,ease(w));s.rootZ=2.15;s.yaw=Math.PI/2;s.capeLift=.3;
      const c=ease(clamp((t-T.CROUCH)/.4)); // 大釜下蹲时他踩上去
      s.rootY=0;s.air=c*.28; // 站上双掌（近似：根抬升）
      s.left=V(-.30,1.15,0);s.right=V(.3,1.18,0);s.fist=.7;
      return;
    }
    if(phase==='combo_air'){ // 空中突进盾击（喊招压帧 c4）
      const u=clamp((t-92.6)/1.6); // 抛物线（OP gag 同源）
      const flight=ease(u);
      s.rootX=mix(.15,.27,flight);s.rootZ=mix(2.15,2.45,flight); // 停在双刃拦截线上（c4 接触成立）
      s.air=Math.sin(u*Math.PI)*1.1+.28*(1-u); // 抛弧+落地
      s.tuck=.25*Math.sin(u*Math.PI);
      s.yaw=Math.PI/2;s.capeLift=.7;
      s.left=V(-.14,1.38,.30);s.right=V(.24,1.20,.06);s.fist=1;s.emotion='determined';
      if(t>T.C4){const r=ease(clamp((t-T.C4)/.35)); // 被架开弹落
        s.air=Math.max(0,s.air*(1-r));s.bob=-.06*r;s.emotion='surprised';}
      return;
    }
    if(phase==='combo_barrage'){ // 落地回防→盾阵接乱穿（c5 接住一线）
      const w=clamp((t-97.2)/.6);
      if(w<1)s.walk={from:[.27,2.45],to:[-.4,2.2],a:w,run:true};
      s.rootX=mix(.27,-.4,ease(w));s.rootZ=mix(2.45,2.2,ease(w));s.yaw=Math.PI/2;
      const g=ease(clamp((t-97.8)/.5));
      s.left=blend(V(-.14,1.10,.04),V(-.14,1.30,.30),g); // 盾阵迎弹雨
      s.right=V(.22,1.12,.06);s.fist=1;s.emotion='determined';s.capeLift=.3;
      if(t>T.BARRAGE&&w>=1){const h=Math.sin((t-T.BARRAGE)*9); // 承弹微震（走拍结束后才接管 rootX）
        s.bob=-.015*Math.abs(h);s.rootX=-.4-.02*Math.abs(h);}
      return;
    }
    // sheathe：收势站定（接住的人不追击）
    s.rootX=-.4;s.rootZ=2.2;s.yaw=Math.PI/2;s.fist=.4;
    s.left=V(-.20,1.12,.06);s.right=V(.20,1.12,.06);s.emotion='determined';
    return;
  }
  if(name==='dafu'){
    if(phase==='valley_fire'){s.visible=false;return;}
    if(phase==='valley_aoao'){s.rootX=-2.2;s.rootZ=2.8;s.yaw=Math.PI/2;s.emotion='worry';
      s.left=V(-.28,1.16,.05);s.right=V(.28,1.16,.05);return;}
    if(phase==='combo_cmd'){const w=clamp((t-88.0)/1.2); // 归位到抛掷点（诚实步速）
      if(w<1)s.walk={from:[-2.2,2.8],to:[.4,2.1],a:w};
      s.rootX=mix(-2.2,.4,ease(w));s.rootZ=mix(2.8,2.1,ease(w));s.yaw=Math.PI/2;
      s.emotion='determined';return;}
    if(phase==='combo_toss'){ // 下蹲合掌→抛（OP 颠勺同源工艺，这里是战术）
      s.rootX=.4;s.rootZ=2.1;s.yaw=Math.PI/2;
      const c=ease(clamp((t-T.CROUCH)/.4));
      s.bob=-.16*c;s.left=blend(V(-.32,1.14,-.10),V(-.26,.98,.22),c);
      s.right=blend(V(.32,1.14,-.10),V(.26,.98,.22),c);s.fist=.4;
      const ts=ease(clamp((t-T.TOSS)/.3)); // 上抛
      if(ts>0){s.bob=-.16*(1-ts)+.03*ts; // 上抛挺身（别顶到腿长帽）
        s.left=blend(V(-.26,.98,.22),V(-.26,1.66,.16),ts);s.right=blend(V(.26,.98,.22),V(.26,1.66,.16),ts);
        s.headPitch=mix(.14,-.12,ts);}
      return;
    }
    if(phase==='combo_air'){ // 抛完立刻后撤让出弹道，再目送转接
      const sb=clamp((t-93.2)/1.0);
      if(sb>0&&sb<1)s.walk={from:[.4,2.1],to:[1.1,1.6],a:sb};
      s.rootX=mix(.4,1.1,ease(sb));s.rootZ=mix(2.1,1.6,ease(sb));s.yaw=Math.PI/2;
      s.left=V(-.26,1.30,.10);s.right=V(.26,1.30,.10);s.emotion='determined';s.headPitch=-.10;return;}
    if(phase==='combo_barrage'){ // 压制近身：绕到阿箸侧翼逼停双刃（c5 链第三环）
      const w=clamp((t-97.6)/1.2);
      if(w<1)s.walk={from:[1.1,1.6],to:[1.9,2.3],a:w,facingYaw:-Math.PI/2};
      s.rootX=mix(1.1,1.9,ease(w));s.rootZ=mix(1.6,2.3,ease(w));s.yaw=-Math.PI/2;
      s.left=V(-.30,1.30,.16);s.right=V(.30,1.30,.16);s.fist=.9;s.emotion='determined';
      return;
    }
    s.rootX=1.9;s.rootZ=2.3;s.yaw=-Math.PI/2;s.fist=.4;
    s.left=V(-.28,1.16,.05);s.right=V(.28,1.16,.05);s.emotion='happy';return;
  }
  if(name==='xiaozao'){
    if(phase==='valley_fire'){s.visible=false;return;}
    if(phase==='valley_aoao'){s.rootX=-2.8;s.rootZ=2.4;s.yaw=Math.PI/2;s.emotion='worry';
      s.left=V(-.17,1.02,.03);s.right=V(.17,1.02,.03);return;}
    if(phase==='combo_cmd'){const w=clamp((t-88.2)/.7);
      if(w<1)s.walk={from:[-2.8,2.4],to:[-1.6,2.5],a:w};
      s.rootX=mix(-2.8,-1.6,ease(w));s.rootZ=mix(2.4,2.5,ease(w));s.yaw=Math.PI/2;
      s.emotion='neutral';return;}
    if(phase==='combo_toss'){ // 打孔阵标定点（他的计算为同伴而用）
      s.rootX=-1.6;s.rootZ=2.5;s.yaw=Math.PI/2;
      const p=ease(clamp((t-91.8)/.5));
      s.left=blend(IDLE.xiaozao.left,V(.06,1.24,.22),p);s.emotion='neutral';return;}
    if(phase==='combo_air'){s.rootX=-1.6;s.rootZ=2.5;s.yaw=Math.PI/2;
      s.left=V(.06,1.24,.22);s.emotion='determined';return;}
    if(phase==='combo_barrage'){ // 星屑网收束侧翼（c5 链第二环）
      s.rootX=-1.6;s.rootZ=2.5;s.yaw=Math.PI/2;
      const p=ease(clamp((t-97.8)/.5));
      s.left=blend(V(.06,1.24,.22),V(.02,1.30,.30),p);s.emotion='determined';return;
    }
    s.rootX=-1.6;s.rootZ=2.5;s.yaw=Math.PI/2;s.emotion='neutral';
    s.left=V(-.17,1.02,.03);s.right=V(.17,1.02,.03);return;
  }
}
// ── 收尾（画外音/F02/末帧看火）──
function outroSpec(name,s,phase,t){
  if(phase==='f02_report'){ // 阿箸独处门阙写报告（观众见、角色不知）
    if(name!=='azu'){s.visible=false;return;}
    s.visible=true;s.rootX=.5;s.rootZ=2.5;s.yaw=.3;s.cladT=1;
    s.left=V(-.14,1.22,.10); // 左刃当笔，悬在公文上
    s.right=V(.16,1.18,.04);s.emotion='neutral';
    s.headPitch=.16+.02*Math.sin(t*.9); // 俯首书写
    if(t>116.2)s.headPitch=.02; // 停笔（半句独白）
    return;
  }
  if(name==='azu'){s.visible=false;return;} // 她已离场（收刃后走出画面）
  if(name==='hestia')return; // 独立链
  // 圣殿群像：看火（末帧眼部特写 E3 归 viewer 机位）
  s.rootX=SPOTS[name][0];s.rootZ=SPOTS[name][1];s.yaw=0;
  s.left={...IDLE[name].left};s.right={...IDLE[name].right};s.fist=.15;
  s.emotion=name==='xiaozao'?'neutral':'determined';
  s.headPitch=-.10; // 抬眼看灶火
  if(phase==='outro_final'&&t>T.EYE3)s.emotion=name==='aoao'?'determined':s.emotion;
}

function spec(name,phase,t){
  const s=base(name);
  if(name==='hestia')return s;
  if(name==='azu'&&phase==='azu_walk'||name==='azu'&&phase==='azu_declare'){azuEnterSpec(s,phase,t);return s;}
  if(name==='azu'&&phase==='f02_report'){outroSpec(name,s,phase,t);return s;}
  // 阿箸只在角斗场/圣殿登场段/门阙报告在场
  if(name==='azu'&&!['test1','test2','test3','valley_aoao','combo_cmd','combo_toss','combo_air',
      'combo_barrage','sheathe'].includes(phase)){s.visible=false;return s;}
  switch(phase){
    case 'coldopen':s.visible=false;return s;
    case 'patrol':patrolSpec(name,s,t);return s;
    case 'notice':noticeSpec(name,s,t);return s;
    case 'azu_walk':case 'azu_declare':{ // 三人静立看她（排面是对比出来的：他们不动，她走）
      if(name==='azu'){s.visible=true;return s;}
      s.rootX=SPOTS[name][0];s.rootZ=SPOTS[name][1];
      const ty=Math.atan2(1.5-SPOTS[name][0],3.0-SPOTS[name][1]); // 转身目送她入场/宣告
      s.yaw=mix(0,ty,ease(clamp((t-25.0)/.8)));
      if(name==='aoao'&&t>37.6){s.emotion='angry';s.left=V(-.26,1.22,.14);s.fist=.7;} // 顶撞「守了三年」前压火
      if(name==='dafu')s.emotion='worry';
      return s;}
    case 'to_arena':toArenaSpec(name,s,t,phase);return s;
    case 'test1':case 'test2':case 'test3':testSpec(name,s,phase,t);return s;
    case 'valley_fire':case 'valley_aoao':case 'combo_cmd':case 'combo_toss':
    case 'combo_air':case 'combo_barrage':case 'sheathe':comboSpec(name,s,phase,t);return s;
    case 'outro':case 'outro_final':outroSpec(name,s,phase,t);return s;
  }
  return s;
}

// ── 公共骨架求解（与前版同契约 + sit/air 扩展）──
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
      if(!s.turn&&!s.noSwing){ // 双臂对摆仅垂挂臂
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
    if(s.sit){ // 倒地/跪撑：髋部下沉+双脚前伸（不整体倒机）
      hipY=hipIdle+s.bob+st-s.sit.drop;
      p.bob=s.bob+st-s.sit.drop;
    }
    hipY=Math.min(hipY,d.legA+d.legB+d.footY-.02); // 非走拍同样受腿长帽（OP 颠勺 bob 过伸翻车实录）
    p.bob=Math.min(p.bob,d.legA+d.legB+d.footY-.02-hipIdle);
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
  actor.setCladState(s.cladT); // 先长甲后摆姿势（探针锚点读本帧 scale）
  actor.setPose(p);
  actor.mesh.visible=s.visible!==false;
  actor.mesh.position.y=s.air??0;
  return {...p,locomotion};
}

// ── 女神赫斯提亚（收尾画外音现身；坐姿直出腿链）──
function specHestia(phase,t){
  const s={visible:['outro','outro_final'].includes(phase)&&t>=T.HESTIA-.6,
    bob:0,headYaw:.08*Math.sin(t*.7)+.05,headPitch:.06,headRoll:0,
    swingAmp:.08,wave:0,blink:null,fistR:.55,fistL:.35,openL:0};
  if(!s.visible)return s;
  s.bob=.008*Math.sin(t*1.1);
  if(t>115.2&&t<116.0)s.wave=Math.sin((t-115.2)/.8*Math.PI); // 说完懒挥手
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

export function poseAt(actors,entries,t){
  const entry=entries.findLast(e=>e.startTime<=t)??entries[0],i=entries.indexOf(entry);
  const phase=entry.opts.move;
  const states={};
  for(const name of ['aoao','xiaozao','dafu','azu'])states[name]=spec(name,phase,t);
  const dt=t-entry.startTime;
  if(i&&dt<.3){ // 条目边界 0.3s 插值（walk/turn 拍跳过：root 不同源防 twoBone 抛错）
    const prev=entries[i-1],a=ease(dt/.3);
    for(const name of ['aoao','xiaozao','dafu','azu']){
      const o=spec(name,prev.opts.move,prev.endTime);
      if(o.visible===false)continue;
      const s=states[name];
      if(s.walk||s.turn||o.walk||o.turn)continue;
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
