// 《星屑战壳》OP 正式表演谱（49.2s，152BPM）：五段式——intro 全景 → verse1 三人战壳生长秀 →
// verse1' 阿鏊 vs 大釜切磋蒙太奇（小凿场边冷看）→ verse2 冲锋+颠勺合体 gag 定格 → outro 画外音+锅盖收尾。
// (t,state) 纯函数，顺序/seek 一致是铁律；条目边界 0.3s 姿势插值（机位硬切归 viewer）。
// 关键绝对时刻（全部压 beatgrid）：生长起点 5.317/8.568/13.305（downbeat），
// 接触帧 16.625（格挡）/19.83（拳甲相撞）/23.034（击飞落地），gag 顶点 33.855，收尾 47.02。
import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {walkingFeet,turningFeet,angleDelta} from 'dula-assets/lib/craft3d/locomotion.js';
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,u)=>a+(b-a)*u,V=(x,y,z=0)=>({x,y,z}),blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));

// ── 位置表（祭坛前表演区；+z 朝机位）──
export const SPOTS={aoao:[-1.6,1.6],xiaozao:[-3.4,2.2],dafu:[.4,2.0]};   // 群像/出场落位
const FIGHT={aoao:[-2.0,1.7],dafu:[1.05,1.85],xiao:[-4.4,2.8]};          // 对峙位
const CONTACT_A=[-0.1,1.8],CONTACT_D=[1.05,1.85];                          // 交锋接触位
const DAFU_BACK=[1.7,2.05];                                                // 大釜踉跄后退位
const LAND_A=[-2.6,2.3];                                                   // 阿鏊击飞落点
const CHARGE={aoao:[-.5,3.6],xiaozao:[-2.9,3.9],dafu:[.3,3.5]};           // 冲锋终点（gag 位；阿鏊贴到大釜臂程内等颠勺）
// 特效锚点（viewer 冲击环/火花/裂缝共用；接触帧真实坐标）
export const BLOCK_PT=[0.40,1.28,1.95],CLASH_PT=[0.40,1.36,1.87],LAND_PT=[-2.6,.05,2.3];
export const T={ // 绝对时刻表（全部来自 beatgrid）
  CLAD:{aoao:5.317,xiaozao:8.568,dafu:13.305},
  BLOCK:16.625,CLASH:19.83,HOP:21.432,KNOCK:23.034,
  CHARGE_DB:31.045,GAG:33.855,FREEZE:34.35,VOICE:45.0,CLANG:47.02,
};
const DIMS={
  aoao:{hipIdle:.87,shoulderY:1.42,shoulderHalf:.14,hipHalf:.078,legA:.42,legB:.42,armA:.20,armB:.19,footY:.085},
  xiaozao:{hipIdle:.81,shoulderY:1.32,shoulderHalf:.125,hipHalf:.072,legA:.385,legB:.385,armA:.185,armB:.175,footY:.080},
  // hipIdle 必须 ≤ legA+legB+footY−.06：正 bob 挺身时腿不可拉直过伸（gag 颠勺翻车实录）
  dafu:{hipIdle:.96,shoulderY:1.58,shoulderHalf:.19,hipHalf:.105,legA:.46,legB:.46,armA:.23,armB:.22,footY:.100},
};
const IDLE={
  aoao:{left:V(-.20,1.10,.04),right:V(.20,1.10,.04)},
  xiaozao:{left:V(-.17,1.02,.03),right:V(.17,1.02,.03)},
  dafu:{left:V(-.28,1.16,.05),right:V(.28,1.16,.05)},
};
// 战壳生长秀英雄姿势（小凿：左前臂横抬胸前，漏勺打孔阵盘面翻向镜头）
const HERO={
  aoao:{left:V(-.44,1.38,.16),right:V(.40,1.24,.10)},
  xiaozao:{left:V(.04,1.16,.18),right:V(.24,1.04,.06)},
  dafu:{left:V(-.52,1.46,.14),right:V(.52,1.46,.14)},
};
const CLAD_YAW={aoao:0,xiaozao:0,dafu:0};
const YAW_A=Math.PI/2,YAW_D=-Math.PI/2; // 交锋互向
const YAW_X=Math.atan2(0-FIGHT.xiao[0],1.8-FIGHT.xiao[1]); // 小凿望向场中
// 颠勺 gag 定格姿势
const GAG_POSE={
  aoao:{left:V(-.46,1.45,.10),right:V(.46,1.42,.10)},
  xiaozao:{left:V(-.08,1.42,.26),right:V(.16,1.02,.04)},
  dafu:{left:V(-.50,1.66,.15),right:V(.50,1.66,.15)},
};

function base(name,phase){
  const spot=SPOTS[name];
  return {visible:true,rootX:spot[0],rootZ:spot[1],yaw:0,bob:0,lean:0,air:0,tuck:0,
    left:{...IDLE[name].left},right:{...IDLE[name].right},
    headYaw:0,headPitch:0,headRoll:0,fist:.12,open:0,point:0,walk:null,turn:null,
    cladT:1,emotion:name==='xiaozao'?'neutral':'determined',blink:null,freeze:false,capeLift:0};
}
// 战壳秀：走入 → 换脚转身 → 生长（起点压 downbeat）→ 定格持甲
const CLAD_SEQ={
  aoao:{from:[-3.8,-1.0],w0:3.32,w1:4.946,t1:5.317},
  xiaozao:{from:[-4.9,.2],w0:6.966,w1:8.173,t1:8.568},
  dafu:{from:[2.6,-.8],w0:10.588,w1:12.144,t1:12.492},
};
function cladSpec(name,s,t){
  const q=CLAD_SEQ[name],spot=SPOTS[name],toYaw=CLAD_YAW[name];
  const heading=Math.atan2(spot[0]-q.from[0],spot[1]-q.from[1]);
  if(t<q.w1){
    const a=clamp((t-q.w0)/(q.w1-q.w0));
    s.walk={from:q.from,to:spot,a};s.yaw=heading;
    s.rootX=mix(q.from[0],spot[0],ease(a));s.rootZ=mix(q.from[1],spot[1],ease(a));
    s.cladT=0;return s;
  }
  if(t<q.t1){ // 换脚转身面向观众（小凿多转 46° 亮左护腕侧面）
    const a=clamp((t-q.w1)/(q.t1-q.w1));
    s.turn={fromYaw:heading,toYaw,a};s.yaw=heading+angleDelta(heading,toYaw)*ease(a);
    s.cladT=0;return s;
  }
  s.yaw=toYaw;
  const g0=T.CLAD[name],g=clamp((t-g0)/1.3);
  s.cladT=g;
  const a=ease(clamp((t-g0)/.5));
  s.left=blend(IDLE[name].left,HERO[name].left,a);
  s.right=blend(IDLE[name].right,HERO[name].right,a);
  s.fist=.12+.3*a;s.headPitch=-.04*a;
  s.bob=.012*Math.sin(t*5)*a*(1-g); // 生长蓄力微颤，长满即稳
  return s;
}
// 切磋蒙太奇（阿鏊/大釜）
function fightSpec(name,s,phase,t){
  const A=FIGHT.aoao,D=FIGHT.dafu;
  const sA=(fn)=>{ // 阿鏊
    switch(phase){
      case 'f1':{ // 侧步进对峙位+互向
        const a=ease(clamp((t-14.211)/.7));
        s.rootX=mix(SPOTS.aoao[0],A[0],a);s.rootZ=mix(SPOTS.aoao[1],A[1],a);
        s.yaw=angleDelta(0,YAW_A)*a;s.fist=.6;
        s.left=V(-.24,1.18,.20);s.right=V(.24,1.22,.16);s.bob=.01*Math.sin(t*6);
        break;}
      case 'f2':{ // 冲刺（风拍）
        const a=clamp((t-15.023)/(16.231-15.023));
        s.walk={from:A,to:CONTACT_A,a,run:true};s.yaw=YAW_A;
        s.rootX=mix(A[0],CONTACT_A[0],ease(a));s.rootZ=mix(A[1],CONTACT_A[1],ease(a));
        s.lean=.12;s.fist=1;s.capeLift=.5;s.left=V(-.20,1.10,-.10);s.right=V(.22,1.20,.10);
        break;}
      case 'f3':{ // 锅盖盾格挡（接触帧 T.BLOCK）：迎盾小上步+受震后坐
        const stepA=clamp((t-16.231)/.3); // 迎上去，缩短拳程差
        if(stepA<1)s.walk={from:CONTACT_A,to:[-.02,1.8],a:stepA,facingYaw:YAW_A};
        s.rootX=mix(CONTACT_A[0],-.02,ease(stepA));s.rootZ=CONTACT_A[1];s.yaw=YAW_A;
        const raise=ease(clamp((t-16.231)/.25)),hit=T.BLOCK;
        const rec=t>hit?ease(clamp((t-hit)/.18)):0;
        s.left=blend(V(-.20,1.10,.05),V(-.12,1.32,.30),raise); // 盾面迎向大釜（收臂程）
        s.right=V(.24,1.10,-.05);s.fist=1;
        s.rootX+=-.10*rec;s.bob=-.05*rec*(1-ease(clamp((t-hit-.18)/.3))); // 后坐+回稳
        s.headPitch=.06*raise;
        if(t>hit)s.emotion='determined';
        break;}
      case 'f4':{ // 绕步（小凿镜头拍他冷看）
        const a=clamp((t-17.415)/(19.435-17.415));
        s.walk={from:CONTACT_A,to:[-.7,1.9],a,facingYaw:YAW_A};
        s.rootX=mix(CONTACT_A[0],-.7,ease(a));s.rootZ=mix(CONTACT_A[1],1.9,ease(a));s.yaw=YAW_A;
        s.left=V(-.18,1.14,.16);s.right=V(.22,1.18,.12);s.fist=.6;
        break;}
      case 'f5':{ // 拳甲相撞（接触帧 T.CLASH）
        const a=clamp((t-19.435)/(T.CLASH+.12-19.435)); // 步态窗略过接触帧，腿不在命中瞬跳
        if(a<1)s.walk={from:[-.7,1.9],to:[.05,1.8],a,run:true};
        s.rootX=mix(-.7,.05,ease(a));s.rootZ=mix(1.9,1.8,ease(a));s.yaw=YAW_A;
        const p=ease(clamp((t-(T.CLASH-.22))/.22));
        s.noSwing=1;s.capeLift=.5;
        s.right=blend(V(.22,1.18,.12),V(.10,1.35,.30),p); // 直拳打进拳程（≤.85 臂长）
        s.left=blend(V(-.20,1.16,.22),V(-.26,1.10,-.08),p);s.fist=1;s.lean=.10*p;
        if(t>T.CLASH){const r=ease(clamp((t-T.CLASH)/.2));s.bob=-.03*r;s.lean=.10*(1-r*.5);}
        break;}
      case 'f6':{ // 追击小跳步（T.HOP 压点）
        const a=clamp((t-T.HOP)/.5);
        if(a<1)s.walk={from:[.05,1.8],to:[.45,1.8],a,run:true};
        s.rootX=mix(.05,.45,ease(a));s.rootZ=1.8;s.yaw=YAW_A;
        s.fist=1;s.capeLift=.4;s.left=V(-.22,1.14,.10);s.right=V(.24,1.24,.16);
        break;}
      case 'f7':{ // 被大釜反震击飞：抛物线 air + 落地深蹲缓冲（T.KNOCK 触地）
        s.yaw=YAW_A;s.fist=1;
        if(t<T.KNOCK){ // 出拳被反震前瞬
          const p=ease(clamp((t-22.639)/(T.KNOCK-22.639)));
          s.rootX=.45;s.rootZ=1.8;s.right=blend(V(.24,1.24,.16),V(.10,1.34,.30),p);
          s.left=V(-.24,1.12,-.05);
        }else{
          const u=(t-T.KNOCK)/.813,flight=clamp(u/.45);
          s.rootX=mix(.45,LAND_A[0],ease(flight));s.rootZ=mix(1.8,LAND_A[1],ease(flight));
          s.air=Math.sin(flight*Math.PI)*.7;s.tuck=.3*Math.sin(flight*Math.PI);
          const land=ease(clamp((u-.45)/.25)),rec=ease(clamp((u-.7)/.3));
          s.bob=-.22*land*(1-rec); // 触地深蹲 → 回弹
          s.capeLift=.85;s.left=V(-.36,1.26,.18);s.right=V(.36,1.24,.18);s.headPitch=.2*land;
          s.emotion='scared'; // 被击飞是吃惊，不笑
        }
        break;}
      case 'f8':{ // 爬起，眼神重新咬住
        const a=ease(clamp((t-23.847)/.7));
        s.rootX=LAND_A[0];s.rootZ=LAND_A[1];s.yaw=YAW_A;s.bob=-.22*(1-a);
        s.emotion=a<.5?'scared':'determined';
        s.left=blend(V(-.36,1.26,.18),V(-.20,1.12,.06),a);s.right=blend(V(.36,1.24,.18),V(.20,1.14,.08),a);
        s.fist=.7;s.headPitch=mix(.2,-.04,a);
        break;}
      case 'f9':{ // 走回群像位（先侧身后转身）
        const a=clamp((t-26.239)/1.4);
        if(a<1)s.walk={from:LAND_A,to:SPOTS.aoao,a};
        s.rootX=mix(LAND_A[0],SPOTS.aoao[0],ease(a));s.rootZ=mix(LAND_A[1],SPOTS.aoao[1],ease(a));
        const ta=clamp((t-27.6)/.8);
        if(a>=1)s.turn={fromYaw:YAW_A,toYaw:0,a:ta};
        s.yaw=a<1?YAW_A:YAW_A+angleDelta(YAW_A,0)*ease(ta);
        break;}
      case 'f10':{ // 冲锋预备：压重心
        s.rootX=SPOTS.aoao[0];s.rootZ=SPOTS.aoao[1];s.yaw=0;
        const a=ease(clamp((t-28.653)/.6));
        s.bob=-.07*a;s.lean=.08*a;s.fist=.9;
        s.left=V(-.24,1.10,-.02);s.right=V(.24,1.10,-.02);s.headPitch=.06;
        break;}
      default:chargeSpec(name,s,phase,t);
    }
  };
  const sD=(fn)=>{ // 大釜
    switch(phase){
      case 'f1':{
        const a=ease(clamp((t-14.211)/.7));
        s.rootX=mix(SPOTS.dafu[0],D[0],a);s.rootZ=mix(SPOTS.dafu[1],D[1],a);
        s.yaw=angleDelta(0,YAW_D)*a;s.fist=.7;
        s.left=V(-.34,1.30,.16);s.right=V(.34,1.32,.14);s.bob=.008*Math.sin(t*5);
        break;}
      case 'f2':{s.rootX=D[0];s.rootZ=D[1];s.yaw=YAW_D;s.bob=-.05;s.fist=1;
        s.left=V(-.36,1.28,.20);s.right=V(.36,1.30,.18);s.headPitch=.08;break;} // 迎击架势
      case 'f3':{ // 右臂挥击（接触帧 T.BLOCK 打进锅盖盾）+小上步
        const a=clamp((t-16.231)/.3);
        if(a<1)s.walk={from:D,to:[.62,1.85],a,facingYaw:YAW_D}; // 上步压进拳程（收臂不拉直）
        s.rootX=mix(D[0],.62,ease(a));s.rootZ=1.85;s.yaw=YAW_D;
        const wind=ease(clamp((t-16.231)/.22));          // 抬臂蓄力
        const strike=ease(clamp((t-(T.BLOCK-.15))/.15)); // 挥下命中
        const rec=ease(clamp((t-T.BLOCK)/.3));           // 收势
        let r1=blend(V(.36,1.30,.18),V(.30,1.62,-.18),wind);
        r1=blend(r1,V(.02,1.28,.15),strike);
        s.right=blend(r1,V(.32,1.24,.10),rec);
        s.left=V(-.36,1.28,.10);s.fist=1;s.headPitch=.04;
        break;}
      case 'f4':{
        const a=clamp((t-17.415)/(19.435-17.415));
        if(a<1)s.walk={from:[.78,1.85],to:[1.15,1.9],a,facingYaw:YAW_D};
        s.rootX=mix(.78,1.15,ease(a));s.rootZ=mix(1.85,1.9,ease(a));s.yaw=YAW_D;
        s.left=V(-.34,1.28,.16);s.right=V(.34,1.30,.14);s.fist=.7;
        break;}
      case 'f5':{ // 对拳（接触帧 T.CLASH）
        const a=clamp((t-19.435)/(T.CLASH+.12-19.435));
        if(a<1)s.walk={from:[1.15,1.9],to:[.70,1.85],a,run:true};
        s.rootX=mix(1.15,.70,ease(a));s.rootZ=mix(1.9,1.85,ease(a));s.yaw=YAW_D;
        const p=ease(clamp((t-(T.CLASH-.22))/.22));
        s.right=blend(V(.34,1.30,.14),V(.05,1.38,.22),p);
        s.left=blend(V(-.34,1.28,.16),V(-.36,1.24,-.06),p);s.fist=1;s.lean=.08*p;
        break;}
      case 'f6':{ // 踉跄后退两步
        const a=clamp((t-20.619)/.9);
        if(a<1)s.walk={from:[.70,1.85],to:DAFU_BACK,a,facingYaw:YAW_D};
        s.rootX=mix(.70,DAFU_BACK[0],ease(a));s.rootZ=mix(1.85,DAFU_BACK[1],ease(a));s.yaw=YAW_D;
        s.bob=-.06*Math.sin(a*Math.PI);s.headPitch=.16;s.fist=.5;
        s.left=V(-.38,1.34,.20);s.right=V(.38,1.36,.20);
        break;}
      case 'f7':{ // 双臂交叉硬接+反震（T.KNOCK 把阿鏊崩飞）
        s.rootX=DAFU_BACK[0];s.rootZ=DAFU_BACK[1];s.yaw=YAW_D;s.fist=1;
        if(t<T.KNOCK){
          const p=ease(clamp((t-22.639)/(T.KNOCK-22.639)));
          s.left=blend(V(-.38,1.34,.20),V(-.02,1.30,.16),p);
          s.right=blend(V(.38,1.36,.20),V(.04,1.28,.20),p); // 交叉格挡（收臂程）
          s.bob=-.04*p;
        }else{ // 反震发力
          const r=ease(clamp((t-T.KNOCK)/.3));
          s.left=blend(V(-.02,1.30,.16),V(-.34,1.28,.05),r);
          s.right=blend(V(.04,1.28,.20),V(.05,1.36,.26),r);
          s.bob=-.04*(1-r)+.02*r;
        }
        break;}
      case 'f8':{ // 憨厚大笑（笑只留前段，后段收住放话感）
        s.rootX=DAFU_BACK[0];s.rootZ=DAFU_BACK[1];s.yaw=YAW_D;
        s.emotion=t<25.0?'laugh':'determined';
        s.headPitch=-.24;s.headRoll=.05*Math.sin(t*3);s.bob=.02*Math.sin(t*6);
        s.left=V(-.34,1.24,.10);s.right=V(.34,1.24,.10);s.fist=.4;
        break;}
      case 'f9':{
        const a=clamp((t-26.239)/1.4);
        if(a<1)s.walk={from:DAFU_BACK,to:SPOTS.dafu,a};
        s.rootX=mix(DAFU_BACK[0],SPOTS.dafu[0],ease(a));s.rootZ=mix(DAFU_BACK[1],SPOTS.dafu[1],ease(a));
        const ta=clamp((t-27.6)/.8);
        if(a>=1)s.turn={fromYaw:YAW_D,toYaw:0,a:ta};
        s.yaw=a<1?YAW_D:YAW_D+angleDelta(YAW_D,0)*ease(ta);
        s.emotion='neutral';
        break;}
      case 'f10':{
        s.rootX=SPOTS.dafu[0];s.rootZ=SPOTS.dafu[1];s.yaw=0;
        const a=ease(clamp((t-28.653)/.6));
        s.bob=-.09*a;s.lean=.08*a;s.fist=1;s.emotion='determined';
        s.left=V(-.32,1.24,-.06);s.right=V(.32,1.24,-.06);s.headPitch=.06;
        break;}
      default:chargeSpec(name,s,phase,t);
    }
  };
  if(name==='aoao')sA();else sD();
}
// 小凿：场边冷看（头跟战况）→ 群像
function watchSpec(s,phase,t){
  const X=FIGHT.xiao;
  s.rootX=X[0];s.rootZ=X[1];s.yaw=YAW_X;
  // 双臂交叉冷看（左手压右前臂，右手垂放）
  s.left=V(-.04,1.06,.10);s.right=V(.02,1.05,.08);s.fist=.3;
  s.emotion='neutral';
  const focus=phase<='f3'?-1:1; // 战团在其右前方
  s.headYaw=.18*focus+.03*Math.sin(t*1.1);
  if(phase==='f4'){s.headYaw=.24;s.headRoll=-.06;s.blink=t%1.2<.15?1:null;} // 冷看特写：眯一瞬
  if(phase==='f7'&&t>T.KNOCK){s.headPitch=.08;s.emotion='neutral';} // 击飞也只抬眉
  if(phase==='f8')s.headRoll=.05*Math.sin(t*2);
  if(phase==='f9'){
    const a=clamp((t-26.239)/1.2);
    if(a<1)s.walk={from:X,to:SPOTS.xiaozao,a};
    s.rootX=mix(X[0],SPOTS.xiaozao[0],ease(a));s.rootZ=mix(X[1],SPOTS.xiaozao[1],ease(a));
    const ta=clamp((t-27.4)/.8);
    if(a>=1)s.turn={fromYaw:YAW_X,toYaw:0,a:ta};
    s.yaw=a<1?YAW_X:YAW_X+angleDelta(YAW_X,0)*ease(ta);
    s.left={...IDLE.xiaozao.left};s.right={...IDLE.xiaozao.right};
  }
  if(phase==='f10'){
    s.rootX=SPOTS.xiaozao[0];s.rootZ=SPOTS.xiaozao[1];s.yaw=0;
    const a=ease(clamp((t-28.653)/.6));
    s.bob=-.06*a;s.lean=.06*a;s.fist=.6;s.left=V(-.22,1.04,-.02);s.right=V(.22,1.04,-.02);
  }
}
// verse2 冲锋 + 颠勺 gag + 定格
function chargeSpec(name,s,phase,t){
  const home=SPOTS[name],charge=CHARGE[name];
  if(phase==='v2charge'){ // 低机位仰拍冲锋（31.045 downbeat 已冲出）
    const a=clamp((t-30.256)/1.6);
    if(a<1)s.walk={from:home,to:charge,a,run:true};
    s.rootX=mix(home[0],charge[0],ease(a));s.rootZ=mix(home[1],charge[1],ease(a));
    s.lean=.10;s.fist=.7;s.capeLift=.6;
    s.left=V(name==='dafu'?-.32:-.24,1.14,-.10);s.right=V(name==='dafu'?.32:.24,1.14,-.10);
    return;
  }
  // gag/定格/outro 停在冲锋落点（不瞬移回群像位——空间连续性）
  s.rootX=charge[0];s.rootZ=charge[1];
  // gag：大釜下蹲颠勺把阿鏊抛向空中，小凿举漏勺护腕接星屑；T.FREEZE 起全员定格
  const ft=Math.min(t,T.FREEZE),gag=clamp((ft-32.647)/(T.GAG-32.647));
  if(name==='dafu'){
    const crouch=ease(clamp((ft-32.9)/.5)),toss=ease(clamp((ft-(T.GAG-.12))/.24));
    s.bob=-.16*crouch*(1-toss)+.04*toss;
    s.left=blend(V(-.32,1.14,-.10),V(-.28,1.28,.14),crouch);
    s.right=blend(V(.32,1.14,-.10),V(.28,1.28,.14),crouch);
    s.left=blend(s.left,GAG_POSE.dafu.left,toss);s.right=blend(s.right,GAG_POSE.dafu.right,toss);
    s.headPitch=mix(.14,-.14,toss);s.emotion='laugh';s.fist=.3;
  }else if(name==='aoao'){
    if(ft<T.GAG){s.left=V(-.3,1.15,0);s.right=V(.3,1.18,0);s.fist=.6;}
    else{ // 连人带盾被抛起：FREEZE 后停在顶点（漫画定格+微浮）
      const air=clamp((ft-T.GAG)/(T.FREEZE-T.GAG));
      s.air=1.35*ease(air);s.tuck=.25*air;
      s.left=blend(V(-.3,1.15,0),GAG_POSE.aoao.left,air);
      s.right=blend(V(.3,1.18,0),GAG_POSE.aoao.right,air);
      s.open=.4*air;s.fist=.1;s.emotion='laugh';s.headPitch=-.1*air;
    }
  }else{
    const raise=ease(clamp((ft-(T.GAG-.35))/.35));
    s.left=blend(V(-.22,1.04,-.02),GAG_POSE.xiaozao.left,raise);
    s.right=blend(V(.22,1.04,-.02),GAG_POSE.xiaozao.right,raise);
    s.headPitch=-.10*raise;s.emotion='neutral';s.open=.2*raise;
  }
  if(t>T.FREEZE){ // 定格生命感：接缝光继续行波，阿鏊空中微浮
    s.freeze=true;
    if(name==='aoao')s.air=1.35+.05*Math.sin(t*1.6);
    else s.bob=(name==='dafu'?.04:0)+.006*Math.sin(t*1.8);
  }
}

function spec(name,phase,t){
  const s=base(name,phase);
  const order=['establish','clad_aoao','clad_xiaozao','clad_dafu'];
  const myClad='clad_'+name;
  if(phase==='establish'||order.indexOf(phase)>-1&&order.indexOf(phase)<order.indexOf(myClad)){
    s.visible=false;s.cladT=0;return s;
  }
  if(phase===myClad)return cladSpec(name,s,t);
  if(name==='xiaozao'&&['f1','f2','f3','f4','f5','f6','f7','f8','f9','f10'].includes(phase)){
    watchSpec(s,phase,t);return s;
  }
  if(['f1','f2','f3','f4','f5','f6','f7','f8','f9','f10'].includes(phase)){
    fightSpec(name,s,phase,t);return s;
  }
  if(['v2charge','v2gag','v2pose','v2hold','outfreeze','outclang','outfade'].includes(phase)){
    chargeSpec(name,s,phase,t);
    if(phase==='outclang'&&t>=T.CLANG&&t<T.CLANG+.15)s.blink=1; // 锅盖声一齐眨眼
    return s;
  }
  return s;
}

// ── 公共骨架求解（三角色同契约；twoBone IK + 距离驱动步态）─────────────────
function buildPose(actor,s,t,d){
  const hipIdle=d.hipIdle;
  let hipY=hipIdle+s.bob;
  const p={rootX:s.rootX,rootZ:s.rootZ,yaw:s.yaw,bob:s.bob,lean:s.lean,
    headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll,
    fist:s.fist,open:s.open,point:s.point,blink:s.blink,capeLift:s.capeLift??0};
  let locomotion=null;
  if(s.walk||s.turn){
    const half=d.hipHalf*1.15;
    const gait=s.turn?turningFeet(s.turn,s.rootX,s.rootZ,s.yaw,half,d.footY)
      :walkingFeet(s.walk,s.rootX,s.rootZ,s.yaw,half,d.footY,(d.legA+d.legB)*.75);
    const heading=s.turn?s.yaw:(s.walk.facingYaw??Math.atan2(s.walk.to[0]-s.walk.from[0],s.walk.to[1]-s.walk.from[1]));
    p.rootX=s.rootX+Math.cos(heading)*gait.sway;p.rootZ=s.rootZ-Math.sin(heading)*gait.sway;
    hipY=hipIdle+gait.hipDelta-(s.tuck??0)*.1;
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
      const hand={...s[side]};if(side==='right'&&!s.turn&&!s.noSwing)hand.z+=gait.armSwing;
      const target=V(hand.x,hand.y+p.bob,hand.z);
      const delta=new THREE.Vector3(target.x-shoulder.x,target.y-shoulder.y,target.z-shoulder.z);
      const maxR=d.armA+d.armB-.005;
      if(delta.length()>maxR){delta.setLength(maxR);Object.assign(target,V(shoulder.x+delta.x,shoulder.y+delta.y,shoulder.z+delta.z));}
      p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.25,-.65,-.5),d.armA,d.armB),target];
    }
  }else{
    const tuck=s.tuck??0;
    for(const [side,sign] of [['left',-1],['right',1]])
      p[side+'Leg']=[V(sign*d.hipHalf,hipY,0),null,V(sign*.09,d.footY+tuck,.02-.4*tuck)];
    for(const [side,sign] of [['left',-1],['right',1]]){
      const leg=p[side+'Leg'];leg[1]=twoBone(leg[0],leg[2],V(0,0,1),d.legA,d.legB);
      const shoulder=V(sign*d.shoulderHalf,d.shoulderY+s.bob,0),target=V(s[side].x,s[side].y+s.bob,s[side].z);
      const delta=new THREE.Vector3(target.x-shoulder.x,target.y-shoulder.y,target.z-shoulder.z);
      const maxR=d.armA+d.armB-.005;
      if(delta.length()>maxR){delta.setLength(maxR);Object.assign(target,V(shoulder.x+delta.x,shoulder.y+delta.y,shoulder.z+delta.z));}
      p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.25,-.65,-.5),d.armA,d.armB),target];
    }
  }
  if(p.blink==null)p.blink=s.freeze?0:Math.max(0,1-Math.abs((t%3.7)-3.4)/.12); // 定格不眨眼（漫画静帧）
  actor.setPose(p);
  actor.setCladState(s.cladT);
  actor.mesh.visible=s.visible!==false;
  actor.mesh.position.y=s.air??0;
  return {...p,locomotion};
}

// ── 女神赫斯提亚（outro 坐大锅圣物锅沿；坐姿直出腿链，不走步行 IK）────────────
// 锅沿前排世界位：锅心 (0,3.55,-6)，沿顶 y≈4.375，前点 z≈-5.02
export const HESTIA_SEAT={x:0,y:4.375,z:-5.06};
function specHestia(phase,t){
  const s={visible:['outfreeze','outgoddess','outclang','outfade'].includes(phase),
    bob:0,headYaw:.08*Math.sin(t*.7)+.05,headPitch:.06,headRoll:0,
    swingAmp:.10,wave:0,blink:null,fistR:.55,fistL:.35,openL:0};
  if(!s.visible)return s;
  s.bob=.008*Math.sin(t*1.1);
  if(t>46.35&&t<47.3)s.wave=Math.sin((t-46.35)/.95*Math.PI); // 说完懒洋洋挥手
  if(phase==='outclang'&&t>=T.CLANG&&t<T.CLANG+.18){s.blink=1;s.bob=-.015;} // 锅鸣惊一瞬
  if(phase==='outfade'){s.swingAmp=.06;}
  return s;
}
function buildPoseHestia(actor,s,t){
  const {x,y,z}=HESTIA_SEAT;
  const p={rootX:x,rootY:y+s.bob,rootZ:z,yaw:0,bob:0,t,
    headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll,
    blink:s.blink,fistR:s.fistR,fistL:s.fistL,openL:s.openL};
  for(const [side,sign] of [['left',-1],['right',1]]){
    // 晃腿：双膝前伸下垂，踝部交替小弧（纯 t）
    const sw=s.swingAmp*Math.sin(t*1.35+(side==='left'?0:Math.PI));
    p[side+'Leg']=[V(sign*.075,-.02,.02),V(sign*.09,-.20,.44),V(sign*.10,-.64,.34+sw*.5)];
    p[side+'FootPitch']=.5+.2*sw;
  }
  // 右手持杖（杖头拄在锅沿前方），左手搭沿；挥手窗左手抬起
  const poleR=V(.3,-.6,-.4),poleL=V(-.3,-.6,-.4);
  const shR=V(.13,.52,.02),shL=V(-.13,.52,.02);
  const wR=V(.20,.30,.20); // 右手持杖位（杖拄地感；目标点收臂程内）
  let wL=V(-.20,.26,.08); // 左手搭锅沿
  if(s.wave>0){ // 懒洋洋挥手：抬到肩侧小幅晃
    wL=blend(wL,V(-.28,.58,.18),s.wave);wL.z+=.04*Math.sin(t*7)*s.wave;
    p.openL=.7*s.wave;p.fistL=.35-.25*s.wave;
  }
  p.rightArm=[shR,twoBone(shR,wR,poleR,.17,.16),wR];
  p.leftArm=[shL,twoBone(shL,wL,poleL,.17,.16),wL];
  actor.setPose(p);
  actor.mesh.visible=s.visible;
  return p;
}

// entries 由 viewer 从 config/timeline.json 派生：{startTime,endTime,opts:{move,shot}}
export function poseAt(actors,entries,t){
  const entry=entries.findLast(e=>e.startTime<=t)??entries[0],i=entries.indexOf(entry);
  const phase=entry.opts.move;
  const states={};
  for(const name of ['aoao','xiaozao','dafu'])states[name]=spec(name,phase,t);
  const dt=t-entry.startTime;
  if(i&&dt<.3){ // 条目边界 0.3s 原地缘插值（上一拍未登场的角色直接定格新拍起点，不浮起）
    const prev=entries[i-1],a=ease(dt/.3);
    for(const name of ['aoao','xiaozao','dafu']){
      const o=spec(name,prev.opts.move,prev.endTime);
      if(o.visible===false)continue;
      const s=states[name];
      for(const key of ['rootX','rootZ','yaw','bob','headYaw','headRoll','headPitch','cladT','fist','open','point','lean','air','tuck','capeLift'])
        if(typeof s[key]==='number')s[key]=key==='yaw'?(o[key]??0)+angleDelta(o[key]??0,s[key])*a:mix(o[key]??0,s[key],a);
      s.left=blend(o.left,s.left,a);s.right=blend(o.right,s.right,a);
      s.emotion=a<.5?o.emotion:s.emotion;
    }
  }
  const poses={};
  for(const name of ['aoao','xiaozao','dafu'])poses[name]=buildPose(actors[name],states[name],t,DIMS[name]);
  // 女神（outro 坐锅沿；上一拍未登场直接定格新拍起点）
  if(actors.hestia){
    const hs=specHestia(phase,t);
    states.hestia=hs;
    poses.hestia=buildPoseHestia(actors.hestia,hs,t);
  }
  return {entry,i,opts:entry.opts,phase,dt,states,poses};
}
