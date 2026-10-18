// 《星屑战壳》S1E2《夜守》表演谱（320s 正片节奏长剧；故事载体=storyboard.md）：
// 夜铺零对白（风/帷幔/火盆/圣火）→ 阿鏊值夜独白+表情特写 → 蚀星兽夜袭（不避火=反常）
// → 轮番劣势（各人缺陷各付代价）→ 谷底盾痕最静拍 → 阿鏊拖兽挣窗口 → 小凿首秀
// 「千孔·银星雨」（蓄力特写+技名卡+爆发）→ 大釜「陨星·釜底落」终结 → F03 驭纹镜头
// （入画不解释）→ 余韵画外音+落点特写 → hook 字卡。F01/F02 冷静期：全程不提。
// (t,state) 纯函数；条目边界 0.3s 插值（walk/turn 拍跳过）；骨架沿用 S1E1 R13 验收版。
// R13 教训内建：后写条件块不得踩走拍 rootX（守卫 w>0&&w<1）；分支端点根位连续；
// ease 峰值≈均值×1.5，走位窗口按 peak<speed_max 校。
import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {createLocomotion,angleDelta} from 'dula-assets/lib/craft3d/locomotion.js';
const WALK_GAIT=createLocomotion({hipDelta:.040,lift:.068});
const RUN_GAIT=createLocomotion({hipDelta:.050,lift:.105,sway:.022,armSwingGain:.30,armSwingMax:.16,heelStrike:.30,toeOff:.30});
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)};
export const mix=(a,b,u)=>a+(b-a)*u;const V=(x,y,z=0)=>({x,y,z}),blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));

// ── 时刻表（viewer 特效/混音摆点共用）──
import {T} from './config/event_times.js';
import {serialState} from './serial_direction.js';
export {T};
// 接触锚点（世界坐标常量，trace 实测回修）
export const PIN_PT=[-.9,0,4.6];   // c3 银星雨压点（兽域地面）

const DIMS={
  aoao:{hipIdle:.87,standStraight:.049,shoulderY:1.42,shoulderHalf:.14,hipHalf:.078,legA:.42,legB:.42,armA:.20,armB:.19,footY:.085},
  xiaozao:{hipIdle:.81,standStraight:.034,shoulderY:1.32,shoulderHalf:.125,hipHalf:.072,legA:.385,legB:.385,armA:.185,armB:.175,footY:.080},
  dafu:{hipIdle:.96,standStraight:.054,shoulderY:1.58,shoulderHalf:.19,hipHalf:.105,legA:.46,legB:.46,armA:.23,armB:.22,footY:.100},
  yekari:{hipIdle:.93,standStraight:.010,shoulderY:1.52,shoulderHalf:.125,hipHalf:.068,legA:.49,legB:.49,armA:.21,armB:.20,footY:.090},
};
const IDLE={
  aoao:{left:V(-.20,1.10,.04),right:V(.20,1.10,.04)},
  xiaozao:{left:V(-.17,1.02,.03),right:V(.17,1.02,.03)},
  dafu:{left:V(-.28,1.16,.05),right:V(.28,1.16,.05)},
  yekari:{left:V(-.15,1.20,.05),right:V(.16,1.20,.06)}, // 右持镰
};
// 圣殿广场防线（背对圣火面向旷野 +z）
const LINE={aoao:[-.8,2.6],xiaozao:[-2.0,2.4],dafu:[.6,2.6],yekari:[2.0,3.0]};

function base(name){
  const spot=LINE[name];
  return {visible:true,rootX:spot[0],rootZ:spot[1],yaw:0,bob:0,lean:0,air:0,tuck:0,
    left:{...IDLE[name].left},right:{...IDLE[name].right},
    headYaw:0,headPitch:0,headRoll:0,fist:.12,open:0,point:0,walk:null,turn:null,
    cladT:1,emotion:name==='xiaozao'?'neutral':'determined',blink:null,capeLift:0};
}

// ── 独白（值夜：擦盾的人，心事在手上；手位全程在臂程内）──
function monoSpec(name,s,t){
  if(name!=='aoao'){s.visible=false;return;}
  // 坐在祭坛台阶上，面向圣火（-z），盾搁膝上
  s.rootX=1.3;s.rootZ=-2.2;s.yaw=Math.PI;
  s.sit={drop:.34,feet:.26};
  const polish=Math.sin(t*2.4); // 擦盾往复
  s.left=V(-.15,1.14,.12);                                   // 左手扶盾沿（臂程内）
  s.right=V(.15+.025*polish,1.12+.015*Math.abs(polish),.14); // 右手掌心打圈擦
  s.emotion='neutral';s.headPitch=.10;
  if(t>60&&t<70){s.headPitch=.16;const r=ease(clamp((t-60)/1.2)); // l02「直得只剩直了」自嘲低头
    s.emotion=r<1?'neutral':'sad';}
  if(t>75.5&&t<82){const r=ease(clamp((t-76)/.8)); // E1 抬眼（配得上吗→自己给）
    s.headPitch=mix(.10,-.06,r);s.emotion='determined';
    s.left=V(-.17,1.12,.14);s.right=V(.17,1.12,.14);} // 擦盾的手停了
  if(t>90){s.headPitch=.12;s.emotion='neutral';} // l04 再擦一遍
}
// ── 异动/集结 ──
function stirSpec(name,s,t){
  if(name!=='aoao'){s.visible=false;return;}
  if(t<102){ // 收盾起身
    const up=ease(clamp((t-100)/1.2));
    s.rootX=1.3;s.rootZ=-2.2;s.yaw=Math.PI;s.sit=up<1?{drop:.34*(1-up),feet:.26*(1-up)}:null;
    s.left=V(-.17,1.12,.10);s.right=V(.17,1.12,.10);s.emotion='neutral';return;
  }
  const w=clamp((t-102.5)/2.5); // 快步到广场缘，背火向旷野
  if(w>0&&w<1)s.walk={from:[1.3,-2.2],to:[0,1.6],a:w,facingYaw:0};
  s.rootX=mix(1.3,0,ease(w));s.rootZ=mix(-2.2,1.6,ease(w));
  s.yaw=Math.PI+angleDelta(Math.PI,0)*ease(clamp((t-103)/.8)); // 转身向外
  s.left=V(-.15,1.20,.14);s.right=V(.18,1.14,.06);s.emotion='surprised'; // 盾半抬戒备
  if(t>112)s.emotion='determined';
}
function rallySpec(name,s,t){
  if(name==='aoao'){ // 敲盾为号后固守中线
    s.rootX=0;s.rootZ=1.6;s.yaw=0;
    const bang=ease(clamp((t-T.RALLY)/.3)); // 盾沿磕地一声（臂程底线：蓄到肩侧再砸）
    s.right=blend(V(.18,1.14,.06),V(.26,1.34,.30),bang); // 举盾过头侧
    if(t>T.RALLY+.5)s.right=blend(V(.26,1.34,.30),V(.18,1.14,.06),ease(clamp((t-T.RALLY-.5)/.5)));
    s.left=V(-.15,1.20,.14);s.emotion='determined';
    if(t>128){const w=clamp((t-128)/1.6);if(w>0&&w<1)s.walk={from:[0,1.6],to:LINE.aoao,a:w};
      s.rootX=mix(0,LINE.aoao[0],ease(w));s.rootZ=mix(1.6,LINE.aoao[1],ease(w));}
    return;
  }
  // 小凿/大釜从两侧披甲赶到（诚实步速）
  const from=name==='xiaozao'?[-4.6,1.4]:[4.6,1.2];
  const w=clamp((t-(name==='dafu'?129.5:130.5))/3.2);
  if(w>0&&w<1)s.walk={from,to:LINE[name],a:w,run:true};
  s.rootX=mix(from[0],LINE[name][0],ease(w));s.rootZ=mix(from[1],LINE[name][1],ease(w));
  s.yaw=Math.atan2(LINE[name][0]-from[0],LINE[name][1]-from[1]);
  if(w>=1)s.yaw=0;
  s.emotion=name==='dafu'?'surprised':'neutral';
  if(name==='dafu'&&w>=1)s.left=V(-.28,1.16,.06),s.right=V(.28,1.16,.06),s.fist=.8;
  if(name==='xiaozao'&&w>=1)s.left=V(.05,1.20,.14); // 举盘读场（臂程内）
}
// ── 战斗（正片节奏：攻防有因果，人人有台词位）──
function fightSpec(name,s,phase,t){
  if(name==='aoao'){
    if(phase==='fight1'){ // 盾迎扑击（c1 挡下）
      s.rootX=LINE.aoao[0];s.rootZ=LINE.aoao[1];s.yaw=0;s.fist=1;
      s.left=V(-.14,1.30,.26);s.right=V(.22,1.16,.10);s.emotion='determined'; // 盾架起
      if(t>T.C1){const r=ease(clamp((t-T.C1)/.35)); // 承扑：后坐半步撑住
        s.bob=-.06*r;s.rootZ=2.6-.18*r;s.lean=-.06*r;s.emotion=r<1?'surprised':'determined';}
      if(t>156.5){const r=ease(clamp((t-156.5)/.5));s.emotion='determined';s.lean=0;} // l10 咬牙评力气
      return;
    }
    if(phase==='fight2'){ // 警戒大釜一侧（来不及补位）
      s.rootX=LINE.aoao[0];s.rootZ=LINE.aoao[1];s.yaw=.3;s.emotion='worry';
      s.left=V(-.15,1.22,.16);s.right=V(.18,1.14,.06);return;
    }
    if(phase==='fight3'){ // 兽压小凿，他横移试图咬回注意力
      const w=clamp((t-196)/2.2);if(w>0&&w<1)s.walk={from:LINE.aoao,to:[-1.2,3.0],a:w};
      s.rootX=mix(-.8,-1.2,ease(w));s.rootZ=mix(2.6,3.0,ease(w));s.yaw=-.3;
      s.left=V(-.15,1.22,.16);s.emotion='worry';return;
    }
    return;
  }
  if(name==='dafu'){
    if(phase==='fight1'){s.rootX=LINE.dafu[0];s.rootZ=LINE.dafu[1];s.yaw=-.2;
      s.left=V(-.28,1.16,.06);s.right=V(.28,1.16,.06);s.fist=.8;s.emotion='determined';return;}
    if(phase==='fight2'){ // 全力一拳挥空 → 被肩撞撞飞（c2）
      s.rootX=LINE.dafu[0];s.rootZ=LINE.dafu[1];s.yaw=-.4;
      const w=clamp((t-168)/1.6); // 上步逼近
      if(w>0&&w<1)s.walk={from:LINE.dafu,to:[1.5,3.2],a:w};
      s.rootX=mix(.6,1.5,ease(w));s.rootZ=mix(2.6,3.2,ease(w));
      const wind=ease(clamp((t-170)/1.6)); // 蓄力过顶
      s.left=blend(V(-.28,1.16,.06),V(-.28,1.70,-.08),wind);
      s.right=blend(V(.28,1.16,.06),V(.28,1.70,-.08),wind);s.fist=1;s.emotion='determined';
      const sw=ease(clamp((t-172.6)/.3)); // 挥空
      if(sw>0){s.left=blend(V(-.28,1.70,-.08),V(-.06,1.30,.34),sw);
        s.right=blend(V(.28,1.70,-.08),V(.06,1.32,.34),sw);s.lean=.14*sw;}
      if(sw>=1&&t<178.4){const rc=ease(clamp((t-173.6)/.8)); // 随挥回收（别让臂挂在超伸位）
        s.left=blend(V(-.06,1.30,.34),V(-.28,1.16,.06),rc);
        s.right=blend(V(.06,1.32,.34),V(.28,1.16,.06),rc);s.lean=.14*(1-rc);}
      if(t>T.C2){const r=ease(clamp((t-T.C2)/.3)),fly=ease(clamp((t-T.C2)/.8)); // 被撞飞
        s.air=.5*Math.sin(fly*Math.PI);s.rootX=mix(1.5,2.6,fly);s.rootZ=mix(3.2,2.2,fly);
        s.lean=-.3*fly;s.emotion='surprised';s.capeLift=.6*fly;
        if(fly>=1){s.bob=-.30;s.sit={drop:.30,feet:.26};s.left=V(-.30,1.00,.08);s.right=V(.30,1.00,.08);}}
      return;
    }
    if(phase==='fight3'){ // 倒地未起（代价持续；撑地低手位=动作本体白名单）
      s.rootX=2.6;s.rootZ=2.2;s.yaw=-.6;s.sit={drop:.30,feet:.26};s.bob=-.30;
      s.left=V(-.30,1.00,.08);s.right=V(.30,1.00,.08);s.emotion='scared';return;
    }
    return;
  }
  if(name==='xiaozao'){
    if(phase==='fight1'){s.rootX=LINE.xiaozao[0];s.rootZ=LINE.xiaozao[1];s.yaw=.2;
      s.left=V(.05,1.20,.14);s.right=V(.17,1.02,.03);s.emotion='neutral';return;}
    if(phase==='fight2'){s.rootX=LINE.xiaozao[0];s.rootZ=LINE.xiaozao[1];s.yaw=.1;
      s.left=V(.05,1.20,.14);s.emotion='worry';return;} // 大釜飞了，读场变急
    if(phase==='fight3'){ // 兽压他：连退，盘被打脱
      const w=clamp((t-190)/4.0);if(w>0&&w<1)s.walk={from:LINE.xiaozao,to:[-3.0,3.0],a:w,facingYaw:.6};
      s.rootX=mix(-2.0,-3.0,ease(w));s.rootZ=mix(2.4,3.0,ease(w));s.yaw=.6; // 面兽后退
      s.left=V(.05,1.20,.14);s.emotion='worry';
      if(t>200)s.emotion='scared';
      if(t>T.DISC_DROP){const r=ease(clamp((t-T.DISC_DROP)/.4)); // 盘脱手：臂被振开
        s.left=blend(V(.05,1.20,.14),V(.14,1.00,.08),r);s.bob=-.05*r;s.emotion='scared';}
      return;
    }
    return;
  }
}
// ── 谷底+转机+首秀+终结 ──
function turnSpec(name,s,phase,t){
  if(name==='aoao'){
    if(phase==='valley'){ // 撑盾喘息，盾痕特写位（SCAR 213）→ E2 立誓（216）
      s.rootX=0;s.rootZ=3.2;s.yaw=0;
      const dn=ease(clamp((t-208)/.6));
      s.sit={drop:.26*dn,feet:.22*dn};s.bob=-.04*dn;s.emotion='scared'; // 单膝压地
      s.left=V(-.18,1.10,.22);s.right=V(.10,.96,.16); // 盾拄地撑身（白名单：坐姿低手位）
      s.headPitch=.18;
      if(t>214){const r=ease(clamp((t-214)/1.4));s.headPitch=mix(.18,-.04,r);s.emotion='determined';}
      if(t>219){const up=ease(clamp((t-219)/.9)); // 起（话落人起）
        s.sit={drop:.26*(1-up),feet:.22*(1-up)};s.left=blend(V(-.18,1.10,.22),V(-.15,1.24,.18),up);}
      return;
    }
    if(phase==='turn'){ // 正面拖兽：盾压低身位，随兽绕步（它要绕，就让它绕我）
      s.rootX=.2;s.rootZ=3.6;s.yaw=0;s.fist=1;s.emotion='determined';
      s.left=V(-.14,1.28,.22);s.right=V(.20,1.16,.08);
      const circ=Math.sin((t-236)*.9); // 随兽小幅横移封线
      s.rootX=.2+.3*circ*clamp((t-236)/2);s.bob=-.03;
      if(t>244){s.left.z+=.02*Math.sin(t*6);} // 承压微颤
      return;
    }
    if(phase==='rain'||phase==='finisher'){ // 拖住位不动如山
      s.rootX=.2;s.rootZ=3.6;s.yaw=0;s.fist=1;s.emotion='determined';
      s.left=V(-.14,1.28,.22);s.right=V(.20,1.16,.08);
      if(t>T.C4){s.emotion='happy';} // 成了
      return;
    }
    return;
  }
  if(name==='xiaozao'){
    if(phase==='valley'){s.rootX=-3.0;s.rootZ=3.0;s.yaw=.6;s.emotion='scared';
      s.left=V(.14,1.00,.08);s.right=V(.17,1.02,.03);s.bob=-.04;return;} // 盘脱手的空手（白名单段）
    if(phase==='turn'){ // 拾盘（242）→ 归位 → 蓄力（孔洞亮归 viewer 战壳活效）
      if(t<T.DISC_BACK){const w=clamp((t-236)/3.0);if(w>0&&w<1)s.walk={from:[-3.0,3.0],to:[-2.4,3.5],a:w};
        s.rootX=mix(-3.0,-2.4,ease(w));s.rootZ=mix(3.0,3.5,ease(w));s.yaw=.4;s.emotion='worry';
        s.left=V(.14,1.00,.08);return;}
      if(t<244.5){const c=ease(clamp((t-T.DISC_BACK)/.8)); // 蹲下拾盘
        s.rootX=-2.4;s.rootZ=3.5;s.yaw=.3;s.bob=-.14*c;s.sit={drop:.14*c,feet:.10*c};
        s.left=V(.08,.80,.16);s.emotion='neutral';return;}
      const w=clamp((t-244.5)/1.6);if(w>0&&w<1)s.walk={from:[-2.4,3.5],to:[-2.6,2.9],a:w};
      s.rootX=mix(-2.4,-2.6,ease(w));s.rootZ=mix(3.5,2.9,ease(w));s.sit=null;s.yaw=.35;
      const ch=ease(clamp((t-T.EYE3)/2.0)); // 蓄力：盘举到体侧外上方（E3 特写位；别挡脸）
      s.left=blend(V(.05,1.10,.12),V(-.24,1.44,.16),ch);s.right=V(.17,1.06,.04);
      s.emotion='neutral';s.fist=.2;
      return;
    }
    if(phase==='rain'){ // 「千孔·银星雨」：举盘定格→爆发下压
      s.rootX=-2.6;s.rootZ=2.9;s.yaw=.35;s.emotion='determined';
      const p=ease(clamp((t-T.CALL1)/.3));
      s.left=blend(V(-.24,1.44,.16),V(-.16,1.12,.22),p); // 爆发=盘面前倾下压（白名单段）
      s.noSwing=1;s.fist=.6;s.capeLift=.4;
      if(t>T.C3+.8)s.emotion='neutral'; // l19 给自己
      return;
    }
    if(phase==='finisher'){s.rootX=-2.6;s.rootZ=2.9;s.yaw=.35;s.emotion='determined';
      s.left=V(-.17,1.02,.03);s.right=V(.17,1.02,.03);return;} // 静观终结（垂挂豁免位）
    return;
  }
  if(name==='dafu'){
    if(phase==='valley'){ // 撑膝缓过来（被撞的人自己爬起；低手位=白名单）
      s.rootX=2.6;s.rootZ=2.2;s.yaw=-.6;s.sit={drop:.30,feet:.26};s.bob=-.30;
      s.left=V(-.30,1.00,.08);s.right=V(.30,1.00,.08);s.emotion='scared';
      if(t>212){const r=ease(clamp((t-212)/1.6));s.emotion=r<1?'scared':'determined';
        s.bob=-.30+.06*r;s.sit={drop:.30-.08*r,feet:.26-.06*r};}
      return;
    }
    if(phase==='turn'){ // 起身→听令左翼三步（248）→把兽往点位赶
      if(t<226){const up=ease(clamp((t-224.5)/1.2));
        s.sit={drop:.30*(1-up),feet:.26*(1-up)};s.bob=-.30*(1-up);s.emotion='determined';
        s.left=V(-.30,1.00,.08);s.right=V(.30,1.00,.08);return;}
      const w=clamp((t-226.5)/3.0);if(w>0&&w<1)s.walk={from:[2.6,2.2],to:[1.8,3.8],a:w};
      s.rootX=mix(2.6,1.8,ease(w));s.rootZ=mix(2.2,3.8,ease(w));s.yaw=-.7;s.emotion='determined';
      s.left=V(-.28,1.16,.06);s.right=V(.28,1.16,.06);s.fist=.8;
      if(t>T.FLANK){const st=clamp((t-T.FLANK)/1.5); // 左翼三步逼兽
        if(st>0&&st<1)s.walk={from:[1.8,3.8],to:[.9,4.4],a:st};
        s.rootX=mix(1.8,.9,ease(st));s.rootZ=mix(3.8,4.4,ease(st));s.yaw=-.9;s.capeLift=.3;}
      return;
    }
    if(phase==='rain'){s.rootX=.9;s.rootZ=4.4;s.yaw=-.9;s.emotion='determined';
      s.left=V(-.28,1.18,.06);s.right=V(.28,1.18,.06);s.fist=.8;return;}
    if(phase==='finisher'){ // 「陨星·釜底落」：助跑→过顶蓄力特写→砸落（c4 双拳×兽背）
      if(t<268){const w=clamp((t-265)/2.0);if(w>0&&w<1)s.walk={from:[.9,4.4],to:[-.4,4.0],a:w,run:true};
        s.rootX=mix(.9,-.4,ease(w));s.rootZ=mix(4.4,4.0,ease(w));s.yaw=-1.0;
        s.left=V(-.28,1.18,.06);s.right=V(.28,1.18,.06);s.fist=1;s.emotion='determined';return;}
      const up=ease(clamp((t-268)/1.4)); // 起跳腾空（FIN_CHARGE 270 特写位；白名单段）
      s.rootX=mix(-.4,-.9,up);s.rootZ=mix(4.0,4.25,up);s.yaw=-1.0;
      s.air=Math.sin(clamp((t-268)/3.2)*Math.PI)*.9*(t<276?1:0);
      s.left=blend(V(-.28,1.18,.06),V(-.26,1.72,-.06),up); // 双拳过顶
      s.right=blend(V(.28,1.18,.06),V(.26,1.72,-.06),up);s.fist=1;s.capeLift=.7;s.tuck=.2*up;
      const dn=ease(clamp((t-T.C4)/.3)); // 砸落
      if(dn>0){s.air=0;s.rootX=-.9;s.rootZ=4.49;s.yaw=-1.0;
        s.left=blend(V(-.26,1.72,-.06),V(-.14,1.06,.34),dn);
        s.right=blend(V(.26,1.72,-.06),V(.14,1.06,.34),dn);
        s.bob=-.22*dn;s.sit=dn<1?null:{drop:.22,feet:.18};s.lean=.16*dn;}
      if(t>279){const w=clamp((t-279)/.8); // 收势退开，腾空收腿必须随起身一起释放
        s.tuck=.2*(1-ease(w));
        if(w>0&&w<1&&t>279.6)s.walk={from:[-.9,4.49],to:[-.5,3.95],a:clamp((t-279.6)/.6),facingYaw:-1.0}; // 先起身再迈步（低髋+大跨步会碰腿长帽）
        const r=ease(w);s.sit=null;s.bob=-.22*(1-r);s.lean=.16*(1-r);
        s.rootX=mix(-.9,-.4,r);s.rootZ=mix(4.49,3.9,r);
        s.emotion='happy';s.left=V(-.28,1.16,.05);s.right=V(.28,1.16,.05);}
      return;
    }
    return;
  }
}
// ── 收尾（驭纹/余韵/hook）──
function outroSpec(name,s,phase,t){
  if(phase==='downed'){ // 围拢跪伏的他（警戒半步）
    const p={aoao:[-.2,3.4],xiaozao:[-2.2,3.2],dafu:[.4,3.0]}[name];
    const from={aoao:[.2,3.6],xiaozao:[-2.6,2.9],dafu:[-.6,4.5]}[name];
    const w=clamp((t-285)/2.4);if(w>0&&w<1)s.walk={from,to:p,a:w};
    s.rootX=mix(from[0],p[0],ease(w));s.rootZ=mix(from[1],p[1],ease(w));
    s.yaw=Math.atan2(-1.2-p[0],4.4-p[1]); // 面兽
    s.emotion='neutral';s.fist=.3;
    if(t>T.BOLT){s.emotion='surprised';s.bob=-.02;} // 兽醒
    return;
  }
  // aftermath/hook：面向圣火归队
  const spot=LINE[name];
  if(phase==='aftermath'){
    const from={aoao:[-.2,3.4],xiaozao:[-2.2,3.2],dafu:[.4,3.0]}[name];
    const w=clamp((t-298)/2.6);if(w>0&&w<1)s.walk={from,to:spot,a:w,facingYaw:Math.PI};
    s.rootX=mix(from[0],spot[0],ease(w));s.rootZ=mix(from[1],spot[1],ease(w));
    s.yaw=Math.PI; // 回身向火
    s.emotion='neutral';s.fist=.15;
    if(name==='aoao'){
      s.left=V(-.20,1.10,.04);s.right=V(.20,1.10,.04); // 盾垂回臂侧（不再擦）
      if(t>309){s.headPitch=-.06;s.emotion='determined';} // E4 看火
    }
    if(name==='dafu')s.emotion='happy';
    return;
  }
  // hook：静立余韵入黑
  s.rootX=spot[0];s.rootZ=spot[1];s.yaw=Math.PI;s.emotion='neutral';
}

// ── 夜刈路径（所有段的敌位唯一事实源；人侧 read 用；分支端点根位连续——gait 探针抓跳变）──
export function enemyPath(t){
  if(t<116)return{x:3.5,z:16,yaw:Math.PI};          // 藏夜色（不可见）
  if(t<124)return{x:3.5,z:mix(16,9.0,ease(clamp((t-116)/8))),yaw:Math.PI}; // reveal 走出夜色
  if(t<140)return{x:mix(3.5,1.5,ease(clamp((t-124)/16))),z:mix(9.0,6.5,ease(clamp((t-124)/16))),yaw:Math.PI}; // 压近
  if(t<149.5)return{x:mix(1.5,-.3,ease(clamp((t-140)/9.5))),z:mix(6.5,4.9,ease(clamp((t-140)/9.5))),yaw:Math.PI}; // 横移逼近
  if(t<152.6)return{x:mix(-.3,-.9,ease(clamp((t-149.5)/2.5))),z:mix(4.9,3.45,ease(clamp((t-149.5)/2.5))),yaw:Math.PI}; // 突进斩（c1 镰刃上盾）
  if(t<156)return{x:mix(-.9,0,ease(clamp((t-152.6)/3.4))),z:mix(3.45,4.4,ease(clamp((t-152.6)/3.4))),yaw:Math.PI}; // 收势退
  if(t<168)return{x:mix(0,1.6,ease(clamp((t-156)/12))),z:mix(4.4,4.0,ease(clamp((t-156)/12))),yaw:mix(Math.PI,-Math.PI/2,ease(clamp((t-156)/12)))}; // 绕向大釜
  if(t<177.4)return{x:1.7,z:mix(4.0,3.3,ease(clamp((t-168)/9.4))),yaw:-Math.PI/2}; // 对峙
  if(t<178.5)return{x:mix(1.7,1.42,ease(clamp((t-177.4)/.9))),z:mix(3.3,3.0,ease(clamp((t-177.4)/.9))),yaw:-Math.PI/2}; // 闪身入怀肩撞（c2）
  if(t<186)return{x:mix(1.42,.6,ease(clamp((t-178.5)/7.5))),z:mix(3.0,4.2,ease(clamp((t-178.5)/7.5))),yaw:mix(-Math.PI/2,-2.2,ease(clamp((t-178.5)/7.5)))}; // 得手即退
  if(t<206)return{x:mix(.6,-1.8,ease(clamp((t-186)/20))),z:mix(4.2,3.9,ease(clamp((t-186)/20))),yaw:-2.2}; // 压小凿
  if(t<224)return{x:mix(-1.8,-1.6,ease(clamp((t-206)/18))),z:mix(3.9,4.4,ease(clamp((t-206)/18))),yaw:1.9}; // 环伺
  if(t<232)return{x:mix(-1.6,-.2,ease(clamp((t-224)/8))),z:mix(4.4,5.5,ease(clamp((t-224)/8))),yaw:mix(1.9,-1.2,ease(clamp((t-224)/8)))}; // 绕阿鏊外圈
  if(t<240)return{x:mix(-.2,1.4,ease(clamp((t-232)/8))),z:mix(5.5,4.9,ease(clamp((t-232)/8))),yaw:-1.2};
  if(t<246)return{x:mix(1.4,1.2,ease(clamp((t-240)/6))),z:mix(4.9,4.2,ease(clamp((t-240)/6))),yaw:-1.9};
  if(t<250)return{x:mix(1.2,-.9,ease(clamp((t-246)/4))),z:mix(4.2,4.6,ease(clamp((t-246)/4))),yaw:mix(-1.9,Math.PI,ease(clamp((t-246)/4)))}; // 被大釜赶进标点
  if(t<295.5)return{x:-.9,z:4.6,yaw:Math.PI};      // 星雨压点→被终结（面向三人）
  if(t<298.5)return{x:mix(-.9,4.5,ease(clamp((t-295.5)/2.2))),z:mix(4.6,14,ease(clamp((t-295.5)/2.2))),yaw:.6}; // 起身败走入夜
  return{x:6,z:18,yaw:.6};
}
// 夜刈姿态谱（人形敌役：走 buildPose 同骨架；镰/徽记锚点见 characters.js YekariCraft 头注）
export function enemySpec(s,phase,t){
  const B=enemyPath(t);
  s.rootX=B.x;s.rootZ=B.z;s.yaw=B.yaw;
  s.visible=t>=116;
  s.left=V(-.15,1.20,.05);s.right=V(.16,1.20,.06);s.fist=.6; // 右持镰
  const inPh=(...ps)=>ps.includes(phase);
  if(inPh('wind_colonnade','fire_a','fire_b','mono_a','mono_eye','mono_c','stir')){s.visible=false;return s;}
  if(phase==='reveal'||phase==='rally'){ // 走出夜色/压近（诚实慢速，压迫感来自不停）
    const a=clamp((t-(phase==='reveal'?116:124))/(phase==='reveal'?8:16));
    if(a>0&&a<1)s.walk={from:phase==='reveal'?[3.5,16]:[3.5,9.0],to:phase==='reveal'?[3.2,9.0]:[1.5,6.5],a};
    s.capeLift=.2;s.emotion='neutral';s.headPitch=.04;return s;
  }
  if(phase==='fight1'){
    if(t<T.POUNCE){const a=clamp((t-140)/9.5);
      if(a>0&&a<1)s.walk={from:[1.5,6.5],to:[-.3,4.9],a};
      s.emotion='neutral';return s;}
    if(t<T.C1+.3){const u=clamp((t-T.POUNCE)/2.4); // 突进斩（镰弧起手）
      if(u>0&&u<1)s.walk={from:[-.3,4.9],to:[-.9,3.45],a:u,run:true};
      const w=ease(clamp((t-(T.C1-.5))/.5)); // 挥镰压帧
      s.right=blend(V(.18,1.14,.08),V(.10,1.30,.34),w);s.noSwing=1;s.capeLift=.5;
      s.emotion='determined';return s;}
    const r=ease(clamp((t-T.C1)/.5)); // 被盾弹开收势
    s.right=blend(V(.10,1.30,.34),V(.18,1.14,.08),r);s.bob=-.03*r;s.emotion='surprised';
    if(r>=1)s.emotion='neutral';
    return s;
  }
  if(phase==='fight2'){
    if(t<168){const a=clamp((t-156)/12);if(a>0&&a<1)s.walk={from:[0,4.4],to:[1.6,4.0],a};
      s.emotion='neutral';return s;}
    if(t<177.4){s.emotion='neutral';return s;} // 对峙（看他蓄力）
    if(t<178.5){const u=clamp((t-177.4)/.9); // 闪身入怀：左肩撞胸（c2）
      if(u>0&&u<1)s.walk={from:[1.7,3.3],to:[1.42,3.0],a:u,run:true};
      s.lean=.12*u;s.emotion='determined';return s;}
    const r=ease(clamp((t-178.5)/.8));s.lean=.12*(1-r);s.emotion='neutral';
    const w=clamp((t-178.5)/7.5);if(w>0&&w<1)s.walk={from:[1.42,3.0],to:[.6,4.2],a:w}; // 得手即退
    return s;
  }
  if(phase==='fight3'){ // 压小凿：镰背连点逼退
    const a=clamp((t-186)/20);if(a>0&&a<1)s.walk={from:[.6,4.2],to:[-1.8,3.9],a};
    s.emotion='determined';
    const jab=Math.sin(t*4.2);
    s.right=V(.18+.02*Math.max(0,jab),1.14,.10+.06*Math.max(0,jab));s.noSwing=1;
    if(t>205){const r=ease(clamp((t-205)/.4));s.right=blend(s.right,V(.30,1.24,.28),r);} // 镰背打脱他的盘
    return s;
  }
  if(phase==='valley'){ // 环伺踱步（不赶尽——他在读他们）
    s.emotion='neutral';s.headYaw=.08*Math.sin(t*.8);
    const a=clamp((t-210)/6);if(a>0&&a<1)s.walk={from:[-1.8,4.0],to:[-1.6,4.4],a};
    return s;
  }
  if(phase==='turn'){ // 绕阿鏊（"它要绕就让它绕我"的另一半）
    s.emotion='determined';s.capeLift=.25;
    const leg=(a0,a1,from,to)=>{const a=clamp((t-a0)/(a1-a0));if(a>0&&a<1)s.walk={from,to,a};};
    if(t<232)leg(224,232,[-1.6,4.4],[-.2,5.5]);
    else if(t<240)leg(232,240,[-.2,5.5],[1.4,4.9]);
    else leg(240,246,[1.4,4.9],[1.2,4.2]);
    return s;
  }
  if(phase==='rain'){ // 被弹雨压进标点（举镰格挡流光）
    const w=clamp((t-246)/4);if(w>0&&w<1)s.walk={from:[1.2,4.2],to:[-.9,4.6],a:w,run:true};
    s.emotion='surprised';
    if(t>T.C3){const r=ease(clamp((t-T.C3)/.5));s.bob=-.18*r;s.capeLift=0;
      s.left=V(-.14,1.22,.14);s.right=V(.14,1.22,.14);} // 压伏抱守
    return s;
  }
  if(phase==='finisher'){
    if(t<T.C4){s.bob=-.18;s.emotion='determined'; // 压伏中挣扎要起
      s.left=V(-.14,1.22,.14);s.right=V(.14,1.22,.14);return s;}
    const r=ease(clamp((t-T.C4)/.4)); // 被砸趴
    s.sit={drop:.5*r,feet:.30*r};s.bob=-.18-.2*r;s.headPitch=.3*r;s.emotion='surprised';
    return s;
  }
  if(phase==='downed'){ // 跪伏；F03 镜头读胸口徽记
    s.sit={drop:.5,feet:.30};s.bob=-.38;s.headPitch=.28;s.emotion='neutral';
    if(t>T.BOLT){const u=ease(clamp((t-T.BOLT)/.5)); // 骤起败走
      s.sit=u<1?{drop:.5*(1-u),feet:.30*(1-u)}:null;s.bob=-.38*(1-u);s.headPitch=.28*(1-u);
      if(u>=1){ // 败走=两次无声闪跃（镰刺客不跑连续步态；跳跃腿在腿长帽内）
        const hu=(t-T.BOLT-.5)%1.2,k=Math.floor((t-T.BOLT-.5)/1.2);
        const hops=[[-.9,4.6],[.8,7.2],[3.2,10]];
        if(k<2){const[fx,fz]=hops[k],[tx,tz]=hops[k+1];
          s.rootX=mix(fx,tx,hu);s.rootZ=mix(fz,tz,hu);
          s.air=Math.sin(hu*Math.PI)*.7;s.capeLift=.7;s.tuck=.25;
          s.yaw=Math.atan2(tx-fx,tz-fz);}
        else s.visible=false;}}
    return s;
  }
  s.visible=false;return s;
}

// ── 公共骨架求解（S1E1 R13 验收版同契约）──
function buildPose(actor,s,t,d){
  // Derive neutral height from THIS actor's bone lengths: 172-degree knees.
  // A copied offset left the new long-legged enemy standing at 120 degrees.
  const hipIdle=d.hipIdle,half=d.hipHalf*1.15;
  const restReach=(d.legA+d.legB)*Math.cos(4*Math.PI/180);
  const restHip=d.footY+Math.sqrt(restReach**2-(half-d.hipHalf)**2);
  const st=restHip-hipIdle;
  let hipY=hipIdle+s.bob+st;
  const p={rootX:s.rootX,rootZ:s.rootZ,yaw:s.yaw,bob:s.bob+st,lean:s.lean,
    headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll,
    fist:s.fist,open:s.open,point:s.point,blink:s.blink,capeLift:s.capeLift??0};
  let locomotion=null;
  if(s.walk||s.turn){
    const G=!s.turn&&s.walk.run?RUN_GAIT:WALK_GAIT;
    const gait=s.turn?WALK_GAIT.turningFeet(s.turn,s.rootX,s.rootZ,s.yaw,half,d.footY)
      :G.walkingFeet({...s.walk,facingYaw:s.walk.facingYaw??s.yaw},s.rootX,s.rootZ,s.yaw,half,d.footY,(d.legA+d.legB)*.75);
    // Foot roll resolves to flat soles at both finite-path endpoints.
    const settle=s.walk?ease(s.walk.a/.06)*ease((1-s.walk.a)/.10):1;
    for(const side of ['left','right']){
      const f=gait[side],oldPitch=f.pitch;
      f.pitch*=settle;
      f.y+=Math.sin(Math.abs(f.pitch))*(f.pitch<0?.08:.17)-Math.sin(Math.abs(oldPitch))*(oldPitch<0?.08:.17);
    }
    const heading=s.turn?s.yaw:(s.walk.facingYaw??s.yaw);
    p.rootX=s.rootX+Math.cos(heading)*gait.sway;p.rootZ=s.rootZ-Math.sin(heading)*gait.sway;
    hipY=hipIdle+st+s.bob-(s.sit?.drop??0)+gait.hipDelta-(s.tuck??0)*.1;
    for(const [side,sign] of [['left',-1],['right',1]]){
      const f=gait[side],horizontal=(f.x-sign*d.hipHalf)**2+f.z*f.z;
      hipY=Math.min(hipY,f.y+Math.sqrt(Math.max(.01,(d.legA+d.legB-mix(.0015,.008,settle))**2-horizontal)));
    }
    for(const [side,sign] of [['left',-1],['right',1]]){
      const f=gait[side],start=V(sign*d.hipHalf,hipY,0),end=V(f.x,f.y,f.z+(s.tuck??0)*.3);
      try{p[side+'Leg']=[start,twoBone(start,end,V(0,0,1),d.legA,d.legB),end];}
      catch(e){throw new Error(`leg[${side}] hip=${start.y.toFixed(3)} foot=(${end.x.toFixed(2)},${end.y.toFixed(2)},${end.z.toFixed(2)}) ${e.message}`);} // 腿长帽撞线时的真值
      p[side+'FootPitch']=f.pitch;p[side+'FootYaw']=f.yaw;
    }
    p.bob=hipY-hipIdle;
    locomotion={kind:s.turn?'turn':'walk',step:gait.step,steps:gait.steps,bob:p.bob,
      root:[p.rootX,0,p.rootZ],feet:Object.fromEntries(['left','right'].map(side=>[side,
        {stance:gait[side].stance,contact:gait[side].contact}]))};
    for(const [side,sign] of [['left',-1],['right',1]]){
      const shoulder=V(sign*d.shoulderHalf,d.shoulderY+p.bob,0);
      const hand={...s[side]};
      if(!s.turn&&!s.noSwing){
        const dy=s[side].y-d.shoulderY,horiz0=Math.hypot(s[side].x-sign*d.shoulderHalf,s[side].z);
        const hangDeg=Math.atan2(horiz0,Math.max(.01,-dy))*180/Math.PI;
        const swingWeight=clamp((32-hangDeg)/18);
        hand.z+=(side==='right'?1:-1)*gait.armSwing*swingWeight;
        hand.y+=Math.abs(gait.armSwing)*(s.walk.run?.45:.20)*swingWeight;
      }
      const target=V(hand.x,hand.y+p.bob,hand.z);
      const delta=new THREE.Vector3(target.x-shoulder.x,target.y-shoulder.y,target.z-shoulder.z);
      const maxR=d.armA+d.armB-.005;
      if(delta.length()>maxR){delta.setLength(maxR);Object.assign(target,V(shoulder.x+delta.x,shoulder.y+delta.y,shoulder.z+delta.z));}
      p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.25,-.65,-.5),d.armA,d.armB),target];
    }
  }else{
    const tuck=s.tuck??0;
    if(s.sit){
      hipY=hipIdle+s.bob+st-s.sit.drop;
      p.bob=s.bob+st-s.sit.drop;
    }
    // R16 站直：腿长帽细化到脚位水平距（epsilon .003 留膝向 slack），挺身被帽收成微屈不抛错
    for(const [side,sign] of [['left',-1],['right',1]]){
      const end=s.sit?V(sign*.13,d.footY,s.sit.feet):V(sign*half,d.footY+tuck,-.4*tuck);
      hipY=Math.min(hipY,end.y+Math.sqrt(Math.max(.01,(d.legA+d.legB-.003)**2-((end.x-sign*d.hipHalf)**2+end.z*end.z))));
    }
    p.bob=hipY-hipIdle;
    for(const [side,sign] of [['left',-1],['right',1]]){
      const end=s.sit?V(sign*.13,d.footY,s.sit.feet):V(sign*half,d.footY+tuck,-.4*tuck);
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
  actor.setCladState(s.cladT);
  actor.setPose(p);
  actor.mesh.visible=s.visible!==false;
  actor.mesh.position.y=s.air??0;
  return {...p,locomotion};
}

function spec(name,phase,t){
  const s=base(name);
  if(name==='yekari'){if(t<284)enemySpec(s,phase,t);return s;} // Later recovery is directed by serialState.
  switch(phase){
    case 'wind_colonnade':case 'fire_a':case 'fire_b':s.visible=false;return s; // 夜铺零角色
    case 'mono_a':case 'mono_eye':case 'mono_c':monoSpec(name,s,t);return s;
    case 'stir':stirSpec(name,s,t);return s;
    case 'reveal':s.visible=false;return s; // 兽的独镜
    case 'rally':rallySpec(name,s,t);return s;
    case 'fight1':case 'fight2':case 'fight3':fightSpec(name,s,phase,t);return s;
    case 'valley':case 'turn':case 'rain':case 'finisher':turnSpec(name,s,phase,t);return s;
    case 'downed':case 'aftermath':case 'hook':outroSpec(name,s,phase,t);return s;
  }
  return s;
}

export const CAST=['aoao','xiaozao','dafu','yekari']; // 卡司表（scan_reach/工具链遍历用）
export function poseAt(actors,entries,t){
  const entry=entries.findLast(e=>e.startTime<=t)??entries[0],i=entries.indexOf(entry);
  const phase=entry.opts.move;
  const states={};
  for(const name of ['aoao','xiaozao','dafu','yekari'])states[name]=serialState(name,spec(name,phase,t),phase,t);
  const dt=t-entry.startTime;
  if(i&&dt<.3){ // 条目边界 0.3s 插值（walk/turn 拍跳过）
    const prev=entries[i-1],a=ease(dt/.3);
    for(const name of ['aoao','xiaozao','dafu','yekari']){
      const o=serialState(name,spec(name,prev.opts.move,prev.endTime),prev.opts.move,prev.endTime);
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
  for(const name of ['aoao','xiaozao','dafu','yekari'])
    try{poses[name]=buildPose(actors[name],states[name],t,DIMS[name]);}
    catch(e){throw new Error(`[${name}@${t.toFixed(2)}] ${e.message}`);} // 超伸抛错带卡司+时刻（离线扫描定案用）
  return {entry,i,opts:entry.opts,phase,dt,states,poses};
}
