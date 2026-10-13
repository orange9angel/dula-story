// 《9章》S1E3《天台便当》表演谱：正午质感集（零打斗），姿势=站/走/坐矮沿/递接/进食。
// (t,state) 纯函数，顺序/seek 一致是铁律；twoBone/步态积木取自 dula-assets craft3d。
import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {rotateLimbElbow,correctionAngle} from 'dula-engine/lib/ConstrainedLimb.js';
import {walkingFeet,turningFeet,angleDelta,createLocomotion} from 'dula-assets/lib/craft3d/locomotion.js';
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,u)=>a+(b-a)*u,V=(x,y,z=0)=>({x,y,z}),blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));
// 阻尼衰减振荡（跟随/收步余振）：k≈8-12、ω≈20-30，(t,state) 纯函数解析式
const settle=(t,t0,A,k=10,w=24)=>{const d=t-t0;return d<=0||d>.6?0:A*Math.exp(-k*d)*Math.cos(w*d);};
// 挤压拉伸脉冲：谷底 2-4 帧 → 回弹 overshoot → 归 1（只写躯干 group 局部 scale，不动 IK）
function squashPulse(t,t0,depth){
  const d=t-t0;
  if(d<0||d>.20)return 1;
  if(d<.08)return 1-depth*Math.sin(Math.PI*d/.08);
  return 1+depth*.4*Math.sin(Math.PI*(d-.08)/.12);
}

// 场景锚点：楼梯间门口 / 女儿墙坐位（轰刚在雷晓左侧，雷晓右臂朝外）
export const DOOR=[-6.5,-8.65],SEAT_LEI=[-2.55,-11.12],SEAT_HONG=[-3.45,-11.12];
export const FLASH_T=52.2;              // 袖口微光一闪（壳疹 emissive 提亮再压回）
export const PICK_T=41.2,TAKE_T=44.5;   // 轰刚插签 / 雷晓接过
// 咀嚼循环：viewer 口型与 performance 手部共用同一相位源
export function chewCycle(t,period,offset){
  const ph=(((t-offset)/period)%1+1)%1;
  return {raise:ease(clamp(ph/.14))*ease(clamp((.36-ph)/.14)),
    chew:Math.max(0,Math.sin(clamp((ph-.40)/.5)*Math.PI))};
}
export const CHEW={lei:{period:3.0,offset:55.3},hong:{period:2.6,offset:56.4}};

// 关键点插值（手部路径用）：[[u,V],...] 线性+平滑
function key(u,keys){
  if(u<=keys[0][0])return {...keys[0][1]};
  const last=keys[keys.length-1];if(u>=last[0])return {...last[1]};
  let i=0;while(i<keys.length-2&&keys[i+1][0]<=u)i++;
  const a=keys[i],b=keys[i+1],s=ease((u-a[0])/(b[0]-a[0]));
  return blend(a[1],b[1],s);
}

const IDLE_L={left:V(-.21,.95,.03),right:V(.21,.95,.03)};
const IDLE_H={left:V(-.27,1.12,.04),right:V(.27,1.12,.04)};
// 坐姿静息=垂放腿侧、掌心贴腿（本 rig 手臂短：坐姿肩-腿面距离 > 臂长，腿上平放不可达——
// 垂放腿侧是唯一有支撑的静息；P14 实测 LAP 悬空 .13–.17m 翻车）
const LAP_L={left:V(-.19,.73,.02),right:V(.15,.85,.20)};   // 雷晓：左垂放腿侧，右手托盒位
const LAP_H={left:V(-.15,.88,.22),right:V(.00,.91,.20)};   // 轰刚：左托盒位，右垂放腿侧

// Exit along the doorway normal first; turn only after body + props clear the jamb.
// Both actors use the same safe corridor, with separate finite walk/turn phases.
// o.bounds=七段边界覆盖；o.pause=[a,b] 转角后停步（面朝 heading，张望由谱面 headYaw 给）；
// o.profile='trap' 梯形速度剖面（缓起缓停、中段匀速，峰值≈1/(1-r)×均值；ease 峰值 1.5× 像机器人）
const trap=(x,r=.12)=>{x=clamp(x);
  if(x<r)return x*x/(2*r*(1-r));
  if(x>1-r)return 1-(1-x)*(1-x)/(2*r*(1-r));
  return (x-r/2)/(1-r);};
function enterRooftop(s,u,to,o={}){
  const outside=[-6.5,-7.12],corner=[-4.45,-7.12];
  const heading=Math.atan2(to[0]-corner[0],to[1]-corner[1]);
  const prof=o.profile==='trap'?trap:ease; // 根位移剖面；walkingFeet 落脚跟随根投影，步频随速度自然变化
  const b=o.bounds??[.04,.20,.26,.44,.50,.80,.88];
  const walk=(a,z,from,target)=>{
    const p=clamp((u-a)/(z-a)),d=prof(p);
    s.walk={from,to:target,a:p,noSwing:1};s.turn=null;
    s.rootX=mix(from[0],target[0],d);s.rootZ=mix(from[1],target[1],d);
    s.yaw=Math.atan2(target[0]-from[0],target[1]-from[1]);
  };
  const turn=(a,z,at,fromYaw,toYaw)=>{
    const p=clamp((u-a)/(z-a));s.walk=null;s.turn={fromYaw,toYaw,a:p};
    s.rootX=at[0];s.rootZ=at[1];s.yaw=fromYaw+angleDelta(fromYaw,toYaw)*ease(p);
  };
  const stand=(at,yaw)=>{s.walk=null;s.turn=null;s.rootX=at[0];s.rootZ=at[1];s.yaw=yaw;};
  if(u<b[0])stand(DOOR,0);
  else if(u<b[1])walk(b[0],b[1],DOOR,outside);
  else if(u<b[2])turn(b[1],b[2],outside,0,Math.PI/2);
  else if(u<b[3])walk(b[2],b[3],outside,corner);
  else if(u<b[4])turn(b[3],b[4],corner,Math.PI/2,heading);
  else if(o.pause&&u<o.pause[1])stand(corner,heading); // 转角停步（pause[0] 必须等于 b[4]）
  else if(u<b[5])walk(o.pause?o.pause[1]:b[4],b[5],corner,to);
  else turn(b[5],b[6],to,heading,0);
}

// ── 雷晓 ─────────────────────────────────────────────────────────
function specLei(phase,u,dt,t){
  const s={rootX:SEAT_LEI[0],rootZ:SEAT_LEI[1],yaw:0,bob:0,hipY:null,sit:0,sitHip:.55,
    sitFootX:.17,sitFootZ:.42,left:{...IDLE_L.left},right:{...IDLE_L.right},
    headYaw:0,headPitch:0,headRoll:0,point:0,fist:0,open:0,emotion:'neutral',
    walk:null,visible:true,flashT:0};
  const lap=()=>{s.left={...LAP_L.left};s.right={...LAP_L.right};};
  switch(phase){
    case 'hidden':s.visible=false;break;
    case 'walk_in':{ // 端便当出楼梯间，左右看一眼，走到围栏角落坐下
      const to=[SEAT_LEI[0],-10.55];
      s.left=V(-.02,1.19,.22);s.right=V(.11,1.18,.22); // 双手端盒：右手托底（锚盒）、左手扶盒左沿
      s.gL={fist:.4};s.gR={fist:.4}; // 持盒手：指腹扣盒沿
      s.emotion='worry';
      // 左右张望：视线→头→肩错开起动（肩/身晚约 2-3 帧采同一条曲线）
      const lookL=ease(clamp(u/.05))*ease(clamp((.12-u)/.05)),
            lookR=ease(clamp((u-.14)/.05))*ease(clamp((.26-u)/.05));
      s.headYaw=-.6*lookL+.55*lookR;
      // 转角停步张望（u .44–.48 心虚一瞥，与 enterRooftop pause 窗对齐）
      s.headYaw+=.45*Math.sin(Math.PI*clamp((u-.44)/.04));
      if(u<.88){ // 梯形速度+停步：平台≈1.14×均值（原 ease 峰值 1.5× 像赶机器人）
        enterRooftop(s,u,to,{profile:'trap',bounds:[.04,.185,.215,.41,.44,.85,.88],pause:[.44,.48]});
        if(u<.04){const a=ease(u/.04);s.lean=-.025*a;s.bob=-.012*a;}
      }else{ // 坐上矮沿（落座瞬间 squash 谷底对齐 bob 最低点）；左手顺势掀开自己盒盖再收回腿上
        const a=ease((u-.88)/.12);s.sit=a;s.rootX=to[0];s.rootZ=mix(to[1],SEAT_LEI[1],a);
        s.left=key(u,[[.88,V(-.02,1.17,.24)],[.93,V(.08,.91,.30)],[.96,V(.08,.91,.30)],[.985,V(-.15,.78,.14)],[1,LAP_L.left]]); // 手到盖把位→掀盖→从外侧收回腿侧（不直线穿腹）
        s.right=blend(V(.11,1.18,.22),LAP_L.right,a);
        s.emotion='neutral';s.headYaw=0;
      }
      s.squash=squashPulse(t,13.80,.06);
      s.headYaw+=settle(t,12.6,.05); // 收步跟随：头阻尼衰减
      break;
    }
    case 'startled':{ // 门哐当一响，回头看，见是轰刚才松下来
      s.sit=1;lap();
      const j=Math.exp(-(((u-.06)/.05)**2));s.bob=-.03*j;
      s.emotion=u<.25?'scared':'worry';
      s.headYaw=mix(-.95,-.45,ease(clamp((u-.30)/.55)));s.headPitch=.05;
      break;
    }
    case 'sit_listen':{s.sit=1;lap();s.headYaw=-.45;s.headPitch=.04;break;}
    case 'share_2':{ // 「……恭喜你啊。」自嘲，看一眼自己的便当
      s.sit=1;lap();const shrug=Math.sin(Math.PI*clamp((u-.25)/.5));
      s.bob=-.018*shrug;s.headPitch=.14;s.headYaw=-.5;s.headRoll=-.03*shrug;
      break;
    }
    case 'share_3':{ // 被说猫食，把便当往回收一点
      s.sit=1;s.left=V(-.01,.85,.20);s.right=V(.08,.84,.18);
      s.leftPole=V(-.6,-.45,-.35); // 收盒左肘外摆出体侧（默认坐姿极肘折进胸壁 -21mm——P20 探针收紧实录；-.9 强极在段界混出 2 帧肘凸——P21 实录，取中值）
      s.headPitch=.12;s.headYaw=-.35;s.emotion='worry';
      break;
    }
    case 'share_4':{ // 「普通的便当而已！」嘴硬
      s.sit=1;s.left={...LAP_L.left};s.right=V(.15,.85,.20);
      s.leftPole=V(-.6,-.45,-.35); // 与 share_3 同极：边界混合 2 帧内手还在收盒位，极跳回默认会折肘嵌胸（P20 实录；P21 同步降中值）
      s.headPitch=-.04;s.headYaw=-.55;s.emotion='determined';
      break;
    }
    case 'offer_l':{ // 愣住，左手伸过去接签
      s.sit=1;s.emotion='worry';
      s.headYaw=-.5;s.headPitch=mix(.06,.20,ease(clamp((u-.20)/.30)));
      s.left=key(u,[[0,LAP_L.left],[.50,LAP_L.left],[.66,V(-.27,1.00,.28)],[.82,V(-.27,1.00,.28)],[.95,V(-.12,1.05,.28)],[1,V(-.12,1.05,.28)]]); // 愣住冻到 u=.5 再接
      s.gL={fist:.12+.38*ease(clamp((u-.60)/.10))}; // 接过时三指捏签
      s.right={...LAP_L.right};
      break;
    }
    case 'crack':{ // 接过咬一口，被逗笑破防；笑瞬间右臂微光一闪、左手按住
      s.sit=1;s.right=V(.15,.85,.20);
      s.right.z+=settle(t,51.4,.04); // 放下便当盒后右手带跟随衰减收回腿边
      if(dt<2.0){ // 进食弧线：胸前→弧顶抬起→嘴前下方停顿（掌心自然朝上向内）→签尖送入口中→撤回（持签手半捏）
        s.left=key(dt,[[0,V(-.12,1.05,.28)],[.55,V(-.10,1.12,.30)],[.85,V(-.08,1.16,.30)],
          [1.15,V(-.08,1.16,.30)],[1.45,V(-.06,1.15,.25)],[1.80,V(-.06,1.15,.25)],[2.0,V(-.10,1.12,.30)]]);
        s.gL={fist:.5};
        s.emotion=dt<1.2?'worry':'laugh';s.headPitch=.08;
      }else if(dt<3.7){ // 憋不住笑
        s.emotion='laugh';s.headPitch=-.14;s.bob=.012*Math.sin(t*7);s.headRoll=.04*Math.sin(t*3.4);
        s.left=V(-.10,1.01,.28);s.gL={fist:.5}; // 横持空签：目标收回再稍前移，肘角开到 ~107°（P21 横伸肘凸实录）
        s.leftPole=V(-.35,-.5,-.75); // 肘收到体侧后下方（默认极把肘顶出侧影读成"多一节"）
      }else if(dt<5.4){ // 笑意未收 + 右手把盒子放上右侧矮沿（手随盒沉到台面再释放）
        const q=ease((dt-3.7)/1.7);s.emotion='laugh';s.headPitch=mix(-.14,.02,q);
        s.headRoll=.02*Math.sin(t*3.4);s.left=V(-.12,1.02,.28);s.gL={fist:.5}; // 稍外前让开 lean 前倾的胸廓（P14 手-身嵌入实录；P21 收回 3cm 肘贴体侧）
        s.leftPole=V(-.35,-.5,-.75);
        s.right=key(dt,[[3.7,V(.15,.85,.20)],[3.9,V(.28,.72,.08)],[4.4,V(.40,.70,-.07)],
          [4.85,V(.40,.70,-.07)],[5.1,V(.30,.76,.04)],[5.4,V(.16,.78,.24)]]);
        s.lean=.12*ease(clamp((dt-3.95)/.3))*ease(clamp((5.15-dt)/.3)); // 微俯身才能够到矮沿（.15→.12，肩窝片兜缝）
      }else{ // 袖口微光：低头看右臂，左手按住（按臂手平贴前臂）
        const q=ease(clamp((dt-5.4)/.8));
        s.emotion='worry';s.headPitch=mix(.02,.30,q);s.headYaw=.35*q;
        // 重构（P20 左上臂嵌躯干实录）：左肘向前向外、上臂全程在躯干表面之外；
        // 前臂腹前经过留 2-3cm 净空；右前臂抬起到腹前承接按压
        s.left=blend(V(-.10,1.01,.28),V(.15,.94,.22),ease(clamp((dt-5.5)/.7))); // 按上右前臂中段（起点跟憋笑位，免边界跳变）
        s.leftPole=V(-.8,-.3,.3);
        s.gL={open:.35,fist:0};s.gR={fist:.12};
        s.right=blend(V(.19,.73,.02),V(.14,.86,.22),ease(clamp((dt-5.4)/.5))*ease(clamp((54.8-t)/.4))); // 抬到腹前承接，看完放下 // 看微光：右前臂抬起到面前（按袖对凑）
      }
      s.flashT=Math.exp(-(((t-FLASH_T)/.42)**2));
      s.squash=squashPulse(t,FLASH_T,.05); // 微光瞬间肩部 0.95 压缩 2-3 帧
      break;
    }
    case 'empty_l':{ // 空拍：并排啃炸鸡（持签手随咀嚼节拍半捏起落）
      s.sit=1;s.emotion='neutral';
      const c=chewCycle(t,CHEW.lei.period,CHEW.lei.offset);
      s.left=blend(V(-.19,.74,.06),V(-.06,1.15,.26),c.raise); // 不嚼时持签手垂放腿侧；抬到嘴前下方（掌心向内）
      s.gL={fist:.12+.38*c.raise};
      s.right=V(.19,.73,.02); // 垂放腿侧（盒已落台，不空手端托盘位）
      s.headPitch=.04;s.headYaw=-.22*(.5+.5*Math.sin(t*.23));s.headRoll=.01*Math.sin(t*.9);
      break;
    }
    case 'card_close':{s.sit=1;lap();break;}
  }
  return s;
}

// ── 轰刚 ─────────────────────────────────────────────────────────
function specHong(phase,u,dt,t){
  const s={rootX:SEAT_HONG[0],rootZ:SEAT_HONG[1],yaw:0,bob:0,hipY:null,sit:0,sitHip:.58,
    sitFootX:.18,sitFootZ:.46,left:{...IDLE_H.left},right:{...IDLE_H.right},
    // 右肘极外前偏置：手收回腹前/盒沿时肘出体侧，不折进胸口
    // （P20 探针收紧实录：默认极的肘落 (0.125,0.95,0.036) 嵌胸 -46mm，外偏后肘 (0.197,1.01,0.10) 净空 +30mm）
    rightPole:V(.9,-.35,-.15),
    headYaw:0,headPitch:0,headRoll:0,point:0,fist:0,open:0,emotion:'neutral',
    walk:null,visible:true};
  const lap=()=>{s.left={...LAP_H.left};s.right={...LAP_H.right};};
  switch(phase){
    case 'hidden':s.visible=false;break;
    case 'hong_arrive':{ // 端着两人份堆高便当大步入侵（绕行小屋东南角，不穿山墙）
      const to=[SEAT_HONG[0],-10.55];
      s.left=V(-.09,1.28,.18); // 左手托住便当摞（抱到胸前，右手才够得着扶沿）
      s.leftPole=V(-.9,-.35,-.15); // 抱摞左肘外摆出体侧（默认行走极把肘折进胸壁 -24mm——P20 探针收紧实录）
      s.gL={fist:.4}; // 持盒手：指腹扣盒沿
      s.emotion=u<.35?'laugh':'neutral';s.headPitch=-.04;
      // 「哟！」举手招呼：反向沉肩预备（u 0-.03）→ 急起到位 → 摆动衰减 → 收回余振
      // 手不过肩线（肩高 1.56，峰值 1.47）：再高袖根会脱出躯干肩环覆盖（肩部断缝实录）
      const wave=V(.44,1.46,.22);
      s.right=key(u,[[0,V(.10,1.30,.24)],[.03,V(.30,1.02,.06)],[.075,wave],[.13,V(.40,1.47,.24)],
        [.19,V(.46,1.44,.22)],[.25,V(.41,1.46,.23)],[.31,V(.45,1.45,.22)],[.40,wave],[.52,V(.10,1.28,.24)],
        [.62,V(.28,1.12,.10)],[.80,V(.28,1.12,.10)],[.86,V(-.06,1.33,.36)],[1,V(-.06,1.33,.36)]]); // 挥完垂手；转身时右手抬到摞顶准备接盒
      s.right.z+=settle(u,.55,.05,9,22); // 手腕 settle：收回后余振
      const wo=.75*ease(clamp((u-.03)/.06))*ease(clamp((.50-u)/.08)); // 挥手=张开掌，收回即半握托盒
      s.gR={open:wo,fist:.4*(1-wo/.75)};
      // Keep the waving arm inside the aperture until shoulders have cleared it.
      const clear=ease(clamp((u-.14)/.06));
      s.right=blend(V(.10,1.30,.30),s.right,clear);
      s.gR={open:wo*clear,fist:.4*(1-wo*clear/.75)};
      if(u<.88){
        enterRooftop(s,u,to);
      }else{
        const a=ease((u-.88)/.12);s.sit=a;s.rootX=to[0];s.rootZ=mix(to[1],SEAT_HONG[1],a);
        s.left=blend(V(-.09,1.28,.18),LAP_H.left,a);
        // 右手接摞顶第二盒 → 落座顺势俯身放上右侧矮沿（手随盒、释放后收回，禁止盒子独立飞行）
        s.right=key(u,[[.88,V(-.06,1.33,.36)],[.93,V(-.06,1.33,.36)], // 摞顶已接到盒（与转身段末同位）
          [.955,V(.24,1.06,.14)], // 外摆绕行：肘从体侧下，不横穿胸口（P15 上肢穿胸实录）
          [.985,V(.12,.85,-.10)],[1,V(.12,.83,-.10)]]); // 落座小弧沉到腿平面之后（盒不穿膝、手不嵌腿），落台+推滑在 share_1 开头完成
        s.lean=.18*ease(clamp((u-.93)/.04)); // 俯身才够到矮沿（share_1 开头由边界混合收回；减幅+肩窝片兜开缝）
        const grip=ease(clamp((u-.84)/.03))*ease(clamp((1.0-u)/.04)); // 扣盒沿手型
        s.gR={fist:.12+.30*grip};
      }
      s.squash=squashPulse(t,21.86,.10); // 大块头落座：压缩更深
      break;
    }
    case 'share_1h':{ // 「食堂炸鸡，最后一盒，抢到的。」开盒显摆（得意：胸口起伏）
      s.sit=1;s.left={...LAP_H.left};
      // 开头指尖把第二盒推滑到两人中间，然后收回开盒显摆
      s.right=key(u,[[0,V(.10,.78,-.10)],[.05,V(.14,.74,-.11)],[.11,V(.22,.72,-.10)],[.16,V(.28,.72,-.08)],
        [.22,V(.32,.74,-.04)],[.28,V(.30,.80,.06)],[.36,V(-.02,.92,.30)],[.42,V(-.02,.92,.30)],
        [.52,V(.14,.82,.24)],[.7,V(.20,.82,.26)],[1,LAP_H.right]]); // 推滑收回途中顺手掀开左手盒盖（23.6–23.9 手过盖把）
      s.lean=.18*ease(clamp((.2-u)/.1)); // 俯身随推滑收回（.22→.18：减幅兜肩缝，够台不变——臂根不随 lean）
      s.gR={fist:.12+.30*ease(clamp((.14-u)/.06))};
      s.headYaw=.45;s.headPitch=-.06;s.headRoll=.03;s.bob=.012*Math.sin(t*2.6);
      break;
    }
    case 'share_2h':{s.sit=1;lap();s.headYaw=.5;s.headPitch=.06+.05*Math.sin(Math.PI*clamp((u-.2)/.5));break;}
    case 'share_3h':{ // 「你那是啥？跟猫食似的。」凑过去指点
      s.sit=1;s.left={...LAP_H.left};s.right=V(.30,1.02,.34);s.point=.6;
      s.rootX=mix(SEAT_HONG[0],SEAT_HONG[0]+.06,ease(clamp(u/.4))); // 凑近幅度收敛（不蹭到矮沿上的盒子）
      s.headYaw=.55;s.headPitch=.14;
      break;
    }
    case 'share_4h':{ // 被顶回来，乐
      s.sit=1;lap();const a=ease(clamp(u/.15))*ease(clamp((.7-u)/.3));
      s.emotion=u<.55?'laugh':'neutral';s.headPitch=-.16*a;s.bob=.014*Math.sin(t*6)*a;
      break;
    }
    case 'offer_h':{ // 插签递炸鸡：「尝一个。抢来的东西，分着吃才香。」
      s.sit=1;s.rootX=mix(SEAT_HONG[0],-3.32,ease(clamp(u/.3))); // 凑近（收敛：不蹭到身侧矮沿上的盒子）
      // 取签→回拉预备→急出递到雷晓面前（发力 2-3 帧内到位）→ 保持 → 收回
      s.right=key(u,[[0,LAP_H.right],[.10,V(.32,.74,.16)],[.18,V(.22,.88,.20)],[.26,V(.30,1.06,.34)],[.80,V(.30,1.06,.34)],[.95,LAP_H.right],[1,LAP_H.right]]);
      const pinch=ease(clamp((u-.16)/.06))*ease(clamp((.82-u)/.08)); // 持签手：三指捏
      s.gR={fist:.12+.38*pinch};
      s.left={...LAP_H.left};
      s.headYaw=.5;s.headPitch=.06;s.emotion=u>.2&&u<.6?'laugh':'neutral';
      break;
    }
    case 'crack_h':{ // 看雷晓笑了跟着乐；随后转身够水壶（正好没看见微光）
      s.sit=1;s.rootX=-3.32;s.left={...LAP_H.left};
      const reach=ease(clamp((dt-4.5)/.6))*ease(clamp((7.7-dt)/.8)); // 51.0–54.2
      if(dt<2.2){s.emotion='laugh';s.headPitch=-.1;s.right={...LAP_H.right};} // 看雷晓笑了跟着乐（∩ 笑眼）
      else if(dt<4.2){ // 自己啃一口（进食弧线：抬起→嘴前停顿→咬→撤回）
        s.emotion='neutral';
        s.right=key(dt,[[1.0,LAP_H.right],[1.35,V(.16,1.11,.33)],[1.60,V(.13,1.18,.30)],
          [1.80,V(.13,1.18,.30)],[2.05,V(.11,1.19,.29)],[2.60,V(.11,1.19,.29)],[3.3,LAP_H.right],[9,LAP_H.right]]);
        s.rightPole=blend(V(.9,-.35,-.15),V(.28,-.66,-.5),ease(clamp((3.05-dt)/.3))); // 嘴前段默认极（架肘修），撤回到腿侧渐回外偏极（嵌胸修）——P20 双实录
        s.gR={fist:.12+.38*ease(clamp((dt-1.2)/.3))*ease(clamp((3.3-dt)/.3))};
        s.headPitch=.10; // 头迎向食物，手臂不过肩（袖肩接缝）
      }else{
        // 够水壶：手从体前绕行（先向外向前再向后），不横穿腹部
        s.right=key(dt,[[4.2,LAP_H.right],[4.9,V(.24,.86,.34)],[5.6,V(0,.82,.30)],[6.2,V(-.20,.80,.30)],[7.0,V(-.20,.80,.30)],[7.2,V(0,.82,.30)],[7.35,V(.10,.82,.34)],[7.8,LAP_H.right],[9,LAP_H.right]]);
        s.gR={open:.3*reach,fist:.12*(1-reach)}; // 够水壶：掌心张开
        s.headYaw=-.75*reach;s.yaw=-.34*reach;s.emotion='neutral'; // 转身带动臂不走胸线（P15 穿胸实录：臂全展直指=肘腕线锯胸）
      }
      break;
    }
    case 'empty_h':{ // 空拍：啃炸鸡，风微动（持物手随咀嚼节拍半捏起落）
      s.sit=1;s.emotion='neutral';s.left={...LAP_H.left};
      const c=chewCycle(t,CHEW.hong.period,CHEW.hong.offset);
      s.right=blend(V(.00,.91,.20),V(.12,1.21,.28),c.raise); // 不嚼时搭盒A右沿；抬到嘴前略下方（掌心向内；食物在手）
      s.rightPole=blend(V(.9,-.35,-.15),V(.28,-.66,-.5),c.raise); // 低位外偏出体侧（嵌胸修），抬嘴渐回默认极（架肘修）——P20 双实录
      s.gR={fist:.12+.38*c.raise};
      s.headPitch=.03;s.headYaw=.15+.12*Math.sin(t*.19);
      break;
    }
    case 'card_close':{s.sit=1;lap();break;}
  }
  return s;
}

// ── 公共骨架求解（两角色同契约，移植 S1E2 已验收实现）─────────────
function applyElbowCorrections(p,s){
  for(const side of ['left','right']){
    const angle=s[side+'ElbowDelta']??0;
    if(Math.abs(angle)>Math.PI/2)throw new Error('Overlapping elbow corrections exceed the angular bound');
    if(angle)p[side+'Arm']=rotateLimbElbow(p[side+'Arm'],angle);
  }
}
function buildPose(actor,s,t,dims){
  const {hipIdle,shoulderY,shoulderHalf,hipHalf,legA,legB,armA,armB,footY}=dims;
  const sy=s.squash??1,sxz=1/Math.sqrt(sy);actor.body.scale.set(sxz,sy,sxz); // 挤压拉伸：躯干局部 scale，体积守恒
  const sit=s.sit??0;
  const hipY=s.walk||s.turn?null:(s.hipY??mix(hipIdle+s.bob,s.sitHip??.55,sit));
  const p={rootX:s.rootX,rootZ:s.rootZ,yaw:s.yaw,bob:hipY==null?s.bob:hipY-hipIdle,blink:s.blink,
    headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll,point:s.point??0,fist:s.fist??0,open:s.open??0,lean:s.lean??0};
  if(s.walk||s.turn)return buildWalkingPose(actor,s,t,dims,p);
  for(const [side,sign] of [['left',-1],['right',1]]){
    const stand=V(sign*.09,footY,.02),sitFoot=V(sign*(s.sitFootX??.17),footY,s.sitFootZ??.42);
    const foot=sit>0?blend(stand,sitFoot,sit):stand;
    p[side+'Leg']=[V(sign*hipHalf,hipY,0),null,foot];
  }
  const torsoOffset=hipY-hipIdle;
  for(const [side,sign] of [['left',-1],['right',1]]){
    const leg=p[side+'Leg'];leg[1]=twoBone(leg[0],leg[2],V(0,0,1),legA,legB);
    const shoulder=V(sign*shoulderHalf,shoulderY+torsoOffset,0),target=V(s[side].x,s[side].y+s.bob,s[side].z);
    const delta=new THREE.Vector3(target.x-shoulder.x,target.y-shoulder.y,target.z-shoulder.z);
    const maxR=armA+armB-.005;
    if(delta.length()>maxR){delta.setLength(maxR);Object.assign(target,V(shoulder.x+delta.x,shoulder.y+delta.y,shoulder.z+delta.z));}
    // 坐姿肘极：体侧后下方收（.35 外摆在托盘 beat 读成"多长一节"——0:20 实录；
    // 同色贴壁分离主要靠 P16 托盘收臂，不靠肘翼）
    const pole=s[side+'Pole']??(s.sit>0?V(sign*.28,-.66,-.5):V(sign*.25,-.65,-.5));
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,pole,armA,armB),target];
  }
  if(p.blink==null)p.blink=Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);
  applyElbowCorrections(p,s);actor.setPose(p);
  // Shared characters position the shoes but do not consume FootYaw/FootPitch.
  // Reset locally as well, so seeking from a turn into a seated pose is deterministic.
  for(const foot of Object.values(actor.feet))foot.rotation.set(0,0,0);
  // 手势库（viewer 链覆盖 setPose 的共享手型）：静息半握为底，逐 beat 左右手可分别覆盖
  const gRest={fist:.12,open:0,point:s.point??0};
  actor.hands.left.setGesture({...gRest,...(s.gL??{})});
  actor.hands.right.setGesture({...gRest,...(s.gR??{})});
  actor.setArmorState?.(0,0);actor.setEtch?.(0);actor.setGauntlet?.(0);
  actor.mesh.visible=s.visible!==false;
  return p;
}

function buildWalkingPose(actor,s,t,d,p){
  const walk3=d.gait??walkingFeet;
  const sy=s.squash??1,sxz=1/Math.sqrt(sy);actor.body.scale.set(sxz,sy,sxz);
  const half=d.hipHalf*1.2,heading=Math.atan2((s.walk?.to[0]??0)-(s.walk?.from[0]??0),(s.walk?.to[1]??1)-(s.walk?.from[1]??0));
  const stride=(d.legA+d.legB)*1.25*(d.strideFactor??1); // strideFactor：小个子短步人设（步幅小、步频稳）
  let gait=s.turn?turningFeet(s.turn,s.rootX,s.rootZ,s.yaw,half,d.footY):walk3(s.walk,s.rootX,s.rootZ,s.yaw,half,d.footY,stride);
  const rootX=s.rootX+Math.cos(heading)*gait.sway,rootZ=s.rootZ-Math.sin(heading)*gait.sway;
  if(!s.turn)gait=walk3(s.walk,rootX,rootZ,s.yaw,half,d.footY,stride);
  p.rootX=rootX;p.rootZ=rootZ;
  let hip=d.hipIdle+gait.hipDelta;
  for(const [side,sign] of [['left',-1],['right',1]]){
    const f=gait[side],horizontal=(f.x-sign*d.hipHalf)**2+f.z*f.z;
    hip=Math.min(hip,f.y+Math.sqrt(Math.max(.01,(d.legA+d.legB-.008)**2-horizontal)));
  }
  const twist=s.turn?0:-gait.armSwing*.35,lean=s.turn?0:.025*Math.sin(Math.PI*clamp(s.walk.a??.5));
  const matrix=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(lean,twist,0));
  const pivot=new THREE.Vector3(0,d.hipIdle,0).applyMatrix4(matrix),offset=new THREE.Vector3(-pivot.x,hip-pivot.y,-pivot.z);
  const torso=v=>new THREE.Vector3(v.x,v.y,v.z).applyMatrix4(matrix).add(offset);
  p.torsoMatrix=matrix;p.torsoTranslation=offset;p.bob=hip-d.hipIdle;p.headYaw-=twist;
  p.locomotion={kind:s.turn?'turn':'walk',step:gait.step,steps:gait.steps,
    contacts:Object.fromEntries(['left','right'].map(side=>[side,{stance:gait[side].stance,id:gait[side].contact}]))};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const foot=gait[side],start=V(sign*d.hipHalf,hip,0),end=V(foot.x,foot.y,foot.z);
    p[side+'Leg']=[start,twoBone(start,end,V(0,0,1),d.legA,d.legB),end];
    p[side+'FootPitch']=foot.pitch;p[side+'FootYaw']=foot.yaw;
    const shoulder=torso(V(sign*d.shoulderHalf,d.shoulderY,0)),hand={...s[side]};
    if(side==='right'&&!s.turn&&!s.walk?.noSwing)hand.z+=gait.armSwing;
    const target=torso(hand),delta=target.clone().sub(shoulder),max=d.armA+d.armB-.005;
    if(delta.length()>max)target.copy(shoulder).add(delta.setLength(max));
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,s[side+'Pole']??V(sign*.25,-.65,-.5),d.armA,d.armB),target];
  }
  if(p.blink==null)p.blink=Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);
  applyElbowCorrections(p,s);actor.setPose(p);actor.mesh.visible=s.visible!==false;
  for(const side of ['left','right'])actor.feet[side].rotation.set(p[side+'FootPitch']??0,p[side+'FootYaw']??0,0,'YXZ');
  const gRest={fist:.12,open:0,point:s.point??0}; // 行走段同样需要手势（端盒/挥手）
  actor.hands.left.setGesture({...gRest,...(s.gL??{})});
  actor.hands.right.setGesture({...gRest,...(s.gR??{})});
  actor.setArmorState?.(0,0);actor.setEtch?.(0);actor.setGauntlet?.(0);
  return p;
}

// 雷晓小步人设：抬脚/俯仰更收、髋起伏稍明显（去机器人感）；strideFactor .85 短步稳频
const DIMS_LEI={hipIdle:.85,shoulderY:1.375,shoulderHalf:.13,hipHalf:.075,legA:.40,legB:.40,armA:.19,armB:.18,footY:.085,
  strideFactor:.85,gait:createLocomotion({lift:.05,pitch:.14,sway:.02,hipDelta:.014}).walkingFeet};
// 轰刚大步：抬脚更高、髋部起伏与横摆更大（步频由路径长度/时间决定，两人同框同速感）
const DIMS_HONG={hipIdle:.98,shoulderY:1.56,shoulderHalf:.18,hipHalf:.10,legA:.45,legB:.45,armA:.22,armB:.21,footY:.10,
  gait:createLocomotion({lift:.075,pitch:.19,sway:.022,hipDelta:.012}).walkingFeet};

// 条目→角色 phase 映射
const LEI_PHASE={card_open:'hidden',establish:'hidden',walk_in:'walk_in',hong_arrive:'startled',
  share_1:'sit_listen',share_2:'share_2',share_3:'share_3',share_4:'share_4',
  offer:'offer_l',crack:'crack',empty_beat:'empty_l',card_close:'card_close'};
const HONG_PHASE={card_open:'hidden',establish:'hidden',walk_in:'hidden',hong_arrive:'hong_arrive',
  share_1:'share_1h',share_2:'share_2h',share_3:'share_3h',share_4:'share_4h',
  offer:'offer_h',crack:'crack_h',empty_beat:'empty_h',card_close:'card_close'};

export function poseAt(lei,hong,entries,t,corrections=[]){
  // 一拍二：姿势/表情量化到 15Hz（floor(t*15)/15）；根位移与腿部落脚另取满帧率防滑步；
  // 相机/口型/光效各层时钟分离（viewer 侧满帧率），条目边界缘插值同量化防混合抖动。
  const tq=Math.floor(t*15)/15;
  const entry=entries.findLast(e=>e.startTime<=tq)??entries[0],i=entries.indexOf(entry),opts=entry.opts;
  const dt=tq-entry.startTime,u=clamp(dt/(entry.endTime-entry.startTime));
  let sl=specLei(LEI_PHASE[opts.move]??'sit_listen',u,dt,tq);
  let sh=specHong(HONG_PHASE[opts.move]??'hidden',u,dt,tq);
  if(i&&dt<.3){ // 条目边界 0.3s 原地缘插值（量化时钟）
    const prev=entries[i-1],pu=1;
    const ol=specLei(LEI_PHASE[prev.opts.move]??'sit_listen',pu,prev.endTime-prev.startTime,prev.endTime);
    const oh=specHong(HONG_PHASE[prev.opts.move]??'hidden',pu,prev.endTime-prev.startTime,prev.endTime);
    const a=ease(dt/.3);
    for(const [s,o] of [[sl,ol],[sh,oh]]){
      if(o.visible===false)continue; // 上一拍未登场：直接定格在新拍起点，不做浮起插值
      for(const key of ['rootX','rootZ','yaw','bob','headYaw','headRoll','headPitch','sit','fist','open','point','lean','flashT','squash'])
        if(typeof s[key]==='number')s[key]=key==='yaw'?(o[key]??0)+angleDelta(o[key]??0,s[key])*a:mix(o[key]??(key==='squash'?1:0),s[key],a); // squash 中性值是 1：旧拍未设置时从 1 混合（46.53 压扁两帧翻车实录）
      s.left=blend(o.left,s.left,a);s.right=blend(o.right,s.right,a);
      for(const g of ['gL','gR']){ // 手势参数同样进边界混合，换手型不瞬切
        if(!s[g]&&!o[g])continue;
        const A=o[g]??{},B=s[g]??{},out={};
        for(const k of ['fist','open','point']){
          if(A[k]==null&&B[k]==null)continue;
          const dft=k==='fist'?.12:0;
          out[k]=mix(A[k]??dft,B[k]??dft,a);
        }
        s[g]=out;
      }
    }
  }
  // 行走/转身段：根与步态相位用满帧率重取（支撑脚钉世界地面，量化只落在躯干/四肢姿势层）
  for(const [s,spec,map,dflt] of [[sl,specLei,LEI_PHASE,'sit_listen'],[sh,specHong,HONG_PHASE,'hidden']]){
    const ef=entries.findLast(e=>e.startTime<=t)??entries[0];
    const uf=clamp((t-ef.startTime)/(ef.endTime-ef.startTime));
    const sf=spec(map[ef.opts.move]??dflt,uf,t-ef.startTime,t);
    if(sf.walk||sf.turn||s.walk||s.turn){
      s.rootX=sf.rootX;s.rootZ=sf.rootZ;s.yaw=sf.yaw;
      s.walk=sf.walk;s.turn=sf.turn;
      // The walk/turn/sit boundary must use one clock; never retain a stale turn
      // beside a newly active walk (the solver would silently choose the turn).
      if(!sf.walk&&!sf.turn){s.sit=sf.sit;s.bob=sf.bob;}
    }
  }
  // 挂载件次级滞后信号：0.12s 前 bob 的差分（≈速度×0.12s），供 viewer 道具解析弹簧跟随
  for(const [s,spec,map,dflt] of [[sl,specLei,LEI_PHASE,'sit_listen'],[sh,specHong,HONG_PHASE,'hidden']]){
    const tb=Math.max(entry.startTime,tq-.12);
    const ub=clamp((tb-entry.startTime)/(entry.endTime-entry.startTime));
    s.bobLag=(s.bob??0)-(spec(map[opts.move]??dflt,ub,tb-entry.startTime,tb).bob??0);
  }
  for(const track of corrections){
    if(!['lei','hong'].includes(track.actor)||!['left','right'].includes(track.side))throw new Error('Invalid correction target');
    if(track.beat!==opts.move)continue;
    const state=track.actor==='lei'?sl:sh,key=track.side+'ElbowDelta';
    state[key]=(state[key]??0)+correctionAngle(dt,track);
  }
  const pL=buildPose(lei,sl,tq,DIMS_LEI),pH=buildPose(hong,sh,tq,DIMS_HONG);
  return {entry,i,opts,phase:opts.move,dt,u,sl,sh,pL,pH};
}
