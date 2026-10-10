// 《9章》S1E3《天台便当》表演谱：正午质感集（零打斗），姿势=站/走/坐矮沿/递接/进食。
// (t,state) 纯函数，顺序/seek 一致是铁律；twoBone/步态积木取自 dula-assets craft3d。
import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
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
export const DOOR=[-6.6,-7.55],SEAT_LEI=[-2.55,-11.12],SEAT_HONG=[-3.45,-11.12];
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
const LAP_L={left:V(-.14,.74,.22),right:V(.14,.74,.22)};   // 雷晓坐姿手放便当盒
const LAP_H={left:V(-.17,.80,.24),right:V(.17,.80,.24)};   // 轰刚坐姿

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
      const from=DOOR,to=[SEAT_LEI[0],-10.55],heading=Math.atan2(to[0]-from[0],to[1]-from[1]);
      s.left=V(-.12,1.10,.26);s.right=V(.12,1.10,.26); // 双手端盒
      s.gL={fist:.4};s.gR={fist:.4}; // 持盒手：指腹扣盒沿
      s.emotion='worry';
      // 左右张望：视线→头→肩错开起动（肩/身晚约 2-3 帧采同一条曲线）
      const lookL=ease(clamp(u/.05))*ease(clamp((.12-u)/.05)),
            lookR=ease(clamp((u-.14)/.05))*ease(clamp((.26-u)/.05));
      s.headYaw=-.6*lookL+.55*lookR;
      const lookLs=ease(clamp((u-.02)/.05))*ease(clamp((.14-u)/.05)),
            lookRs=ease(clamp((u-.16)/.05))*ease(clamp((.28-u)/.05));
      if(u<.04){ // 起步预备：反向沉身（大动作预备 0.15-0.3s 的对白级缩小版）
        const a=ease(u/.04);s.lean=-.025*a;s.bob=-.012*a;
        s.yaw=heading-.10*lookLs+.09*lookRs;s.rootX=from[0];s.rootZ=from[1];
      }else if(u<.60){
        const a=(u-.04)/.56;s.yaw=heading;
        if(a<1)s.walk={from,to,a,noSwing:1};
        s.rootX=mix(from[0],to[0],ease(a));s.rootZ=mix(from[1],to[1],ease(a));
        s.lean=-.025*(1-ease(clamp(a/.12)));s.bob=-.012*(1-ease(clamp(a/.12)));
        s.headYaw+=.05*Math.sin(t*1.7);
      }else if(u<.78){ // 转身面向天台
        const a=(u-.60)/.18;s.turn={fromYaw:heading,toYaw:0,a};
        s.yaw=heading+angleDelta(heading,0)*ease(a);s.rootX=to[0];s.rootZ=to[1];
      }else{ // 坐上矮沿（落座瞬间 squash 谷底对齐 bob 最低点）
        const a=ease((u-.78)/.22);s.sit=a;s.rootX=to[0];s.rootZ=mix(to[1],SEAT_LEI[1],a);
        s.left=blend(V(-.12,1.10,.26),LAP_L.left,a);s.right=blend(V(.12,1.10,.26),LAP_L.right,a);
        s.emotion='neutral';s.headYaw=0;
      }
      s.squash=squashPulse(t,13.80,.06);
      s.headYaw+=settle(t,11.2,.05); // 收步跟随：头阻尼衰减
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
      s.sit=1;s.left=V(-.12,.78,.18);s.right=V(.12,.78,.18);
      s.headPitch=.12;s.headYaw=-.35;s.emotion='worry';
      break;
    }
    case 'share_4':{ // 「普通的便当而已！」嘴硬
      s.sit=1;s.left={...LAP_L.left};s.right=V(.16,.78,.24);
      s.headPitch=-.04;s.headYaw=-.55;s.emotion='determined';
      break;
    }
    case 'offer_l':{ // 愣住，左手伸过去接签
      s.sit=1;s.emotion='worry';
      s.headYaw=-.5;s.headPitch=mix(.06,.20,ease(clamp((u-.20)/.30)));
      s.left=key(u,[[0,LAP_L.left],[.50,LAP_L.left],[.66,V(-.30,1.02,.30)],[.82,V(-.30,1.02,.30)],[.95,V(-.12,1.05,.28)],[1,V(-.12,1.05,.28)]]); // 愣住冻到 u=.5 再接
      s.gL={fist:.12+.38*ease(clamp((u-.60)/.10))}; // 接过时三指捏签
      s.right={...LAP_L.right};
      break;
    }
    case 'crack':{ // 接过咬一口，被逗笑破防；笑瞬间右臂微光一闪、左手按住
      s.sit=1;s.right=V(.16,.78,.24);
      if(dt<2.0){ // 进食弧线：胸前→弧顶抬起→嘴前停顿→送入口中→撤回（持签手半捏）
        s.left=key(dt,[[0,V(-.12,1.05,.28)],[.55,V(-.10,1.14,.34)],[.85,V(-.08,1.20,.31)],
          [1.15,V(-.08,1.20,.31)],[1.45,V(-.055,1.225,.27)],[1.80,V(-.055,1.225,.27)],[2.0,V(-.10,1.12,.30)]]);
        s.gL={fist:.5};
        s.emotion=dt<1.2?'worry':'laugh';s.headPitch=.08;
      }else if(dt<3.7){ // 憋不住笑
        s.emotion='laugh';s.headPitch=-.14;s.bob=.012*Math.sin(t*7);s.headRoll=.04*Math.sin(t*3.4);
        s.left=V(-.12,1.0,.26);s.gL={fist:.5};
      }else if(dt<5.4){ // 笑意未收
        const q=ease((dt-3.7)/1.7);s.emotion='laugh';s.headPitch=mix(-.14,.02,q);
        s.headRoll=.02*Math.sin(t*3.4);s.left=V(-.12,1.0,.26);s.gL={fist:.5};
      }else{ // 袖口微光：低头看右臂，左手按住（按臂手平贴前臂）
        const q=ease(clamp((dt-5.4)/.8));
        s.emotion='worry';s.headPitch=mix(.02,.30,q);s.headYaw=.35*q;
        s.left=blend(V(-.12,1.0,.26),V(.26,.88,.24),ease(clamp((dt-5.5)/.7)));
        s.gL={open:.35,fist:0};s.gR={fist:.12};
        s.right=V(.22,.85,.15);
      }
      s.flashT=Math.exp(-(((t-FLASH_T)/.42)**2));
      s.squash=squashPulse(t,FLASH_T,.05); // 微光瞬间肩部 0.95 压缩 2-3 帧
      break;
    }
    case 'empty_l':{ // 空拍：并排啃炸鸡（持签手随咀嚼节拍半捏起落）
      s.sit=1;s.emotion='neutral';
      const c=chewCycle(t,CHEW.lei.period,CHEW.lei.offset);
      s.left=blend(V(-.13,.82,.24),V(-.06,1.22,.28),c.raise);
      s.gL={fist:.12+.38*c.raise};
      s.right={...LAP_L.right};
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
    headYaw:0,headPitch:0,headRoll:0,point:0,fist:0,open:0,emotion:'neutral',
    walk:null,visible:true};
  const lap=()=>{s.left={...LAP_H.left};s.right={...LAP_H.right};};
  switch(phase){
    case 'hidden':s.visible=false;break;
    case 'hong_arrive':{ // 端着两人份堆高便当大步入侵（绕行小屋东南角，不穿山墙）
      const from=DOOR,mid=[-4.5,-6.85],to=[SEAT_HONG[0],-10.55];
      const h1=Math.atan2(mid[0]-from[0],mid[1]-from[1]),h2=Math.atan2(to[0]-mid[0],to[1]-mid[1]);
      s.left=V(-.10,1.27,.31); // 左手托住便当摞（指腹扣盒沿，盒顶 1.27）
      s.gL={fist:.4}; // 持盒手：指腹扣盒沿
      s.emotion=u<.35?'laugh':'neutral';s.headPitch=-.04;
      // 「哟！」举手招呼：反向沉肩预备（u 0-.03）→ 急起到位 → 摆动衰减 → 收回余振
      const wave=V(.44,1.58,.22);
      s.right=key(u,[[0,V(.10,1.30,.30)],[.03,V(.30,1.02,.06)],[.075,wave],[.13,V(.40,1.60,.24)],
        [.19,V(.48,1.56,.22)],[.25,V(.41,1.59,.23)],[.31,V(.47,1.57,.22)],[.40,wave],[.52,V(.10,1.30,.30)],[1,V(.10,1.30,.30)]]);
      s.right.z+=settle(u,.55,.05,9,22); // 手腕 settle：收回后余振
      const wo=.75*ease(clamp((u-.03)/.06))*ease(clamp((.50-u)/.08)); // 挥手=张开掌，收回即半握托盒
      s.gR={open:wo,fist:.4*(1-wo/.75)};
      if(u<.04){s.rootX=from[0];s.rootZ=from[1];s.yaw=h1;}
      else if(u<.32){ // 第一段：出门向东绕
        const a=(u-.04)/.28;s.yaw=h1;
        if(a<1)s.walk={from,to:mid,a,noSwing:1};
        s.rootX=mix(from[0],mid[0],ease(a));s.rootZ=mix(from[1],mid[1],ease(a));
      }else if(u<.72){ // 第二段：转向坐位
        const a=(u-.32)/.40;
        s.yaw=h1+angleDelta(h1,h2)*ease(clamp((u-.32)/.10));
        if(a<1)s.walk={from:mid,to,a,noSwing:1};
        s.rootX=mix(mid[0],to[0],ease(a));s.rootZ=mix(mid[1],to[1],ease(a));
      }else if(u<.86){
        const a=(u-.72)/.14;s.turn={fromYaw:h2,toYaw:0,a};
        s.yaw=h2+angleDelta(h2,0)*ease(a);s.rootX=to[0];s.rootZ=to[1];
      }else{
        const a=ease((u-.86)/.14);s.sit=a;s.rootX=to[0];s.rootZ=mix(to[1],SEAT_HONG[1],a);
        s.left=blend(V(-.10,1.30,.30),LAP_H.left,a);s.right=blend(s.right,LAP_H.right,a);
      }
      s.squash=squashPulse(t,21.86,.10); // 大块头落座：压缩更深
      break;
    }
    case 'share_1h':{ // 「食堂炸鸡，最后一盒，抢到的。」开盒显摆（得意：胸口起伏）
      s.sit=1;s.left={...LAP_H.left};
      s.right=key(u,[[0,V(.30,1.02,.30)],[.25,V(.34,.92,.34)],[.55,V(.20,.82,.26)],[1,LAP_H.right]]);
      s.headYaw=.45;s.headPitch=-.06;s.headRoll=.03;s.bob=.012*Math.sin(t*2.6);
      break;
    }
    case 'share_2h':{s.sit=1;lap();s.headYaw=.5;s.headPitch=.06+.05*Math.sin(Math.PI*clamp((u-.2)/.5));break;}
    case 'share_3h':{ // 「你那是啥？跟猫食似的。」凑过去指点
      s.sit=1;s.left={...LAP_H.left};s.right=V(.30,1.02,.34);s.point=.6;
      s.rootX=mix(SEAT_HONG[0],SEAT_HONG[0]+.12,ease(clamp(u/.4)));
      s.headYaw=.55;s.headPitch=.14;
      break;
    }
    case 'share_4h':{ // 被顶回来，乐
      s.sit=1;lap();const a=ease(clamp(u/.15))*ease(clamp((.7-u)/.3));
      s.emotion=u<.55?'laugh':'neutral';s.headPitch=-.16*a;s.bob=.014*Math.sin(t*6)*a;
      break;
    }
    case 'offer_h':{ // 插签递炸鸡：「尝一个。抢来的东西，分着吃才香。」
      s.sit=1;s.rootX=mix(SEAT_HONG[0],-3.25,ease(clamp(u/.3))); // 凑近
      // 取签→回拉预备→急出递到雷晓面前（发力 2-3 帧内到位）→ 保持 → 收回
      s.right=key(u,[[0,LAP_H.right],[.10,V(.32,.74,.16)],[.18,V(.22,.88,.20)],[.26,V(.30,1.06,.34)],[.80,V(.30,1.06,.34)],[.95,LAP_H.right],[1,LAP_H.right]]);
      const pinch=ease(clamp((u-.16)/.06))*ease(clamp((.82-u)/.08)); // 持签手：三指捏
      s.gR={fist:.12+.38*pinch};
      s.left={...LAP_H.left};
      s.headYaw=.5;s.headPitch=.06;s.emotion=u>.2&&u<.6?'laugh':'neutral';
      break;
    }
    case 'crack_h':{ // 看雷晓笑了跟着乐；随后转身够水壶（正好没看见微光）
      s.sit=1;s.rootX=-3.25;s.left={...LAP_H.left};
      const reach=ease(clamp((dt-4.5)/.6))*ease(clamp((7.7-dt)/.8)); // 51.0–54.2
      if(dt<2.2){s.emotion='laugh';s.headPitch=-.1;s.right={...LAP_H.right};} // 看雷晓笑了跟着乐（∩ 笑眼）
      else if(dt<4.2){ // 自己啃一口（进食弧线：抬起→嘴前停顿→咬→撤回）
        s.emotion='neutral';
        s.right=key(dt,[[1.0,LAP_H.right],[1.35,V(.16,1.14,.34)],[1.60,V(.14,1.22,.30)],
          [1.80,V(.14,1.22,.30)],[2.05,V(.12,1.26,.27)],[2.60,V(.12,1.26,.27)],[3.3,LAP_H.right],[9,LAP_H.right]]);
        s.gR={fist:.12+.38*ease(clamp((dt-1.2)/.3))*ease(clamp((3.3-dt)/.3))};
        s.headPitch=.04;
      }else{
        // 够水壶：手从体前绕行（先向外向前再向后），不横穿腹部
        s.right=key(dt,[[4.2,LAP_H.right],[4.9,V(.24,.86,.34)],[5.6,V(-.10,.80,.10)],[6.2,V(-.30,.85,-.15)],[7.0,V(-.30,.85,-.15)],[7.35,V(.10,.82,.34)],[7.8,LAP_H.right],[9,LAP_H.right]]);
        s.gR={open:.3*reach,fist:.12*(1-reach)}; // 够水壶：掌心张开
        s.headYaw=-.75*reach;s.yaw=-.18*reach;s.emotion='neutral';
      }
      break;
    }
    case 'empty_h':{ // 空拍：啃炸鸡，风微动（持物手随咀嚼节拍半捏起落）
      s.sit=1;s.emotion='neutral';s.left={...LAP_H.left};
      const c=chewCycle(t,CHEW.hong.period,CHEW.hong.offset);
      s.right=blend(V(.16,.84,.26),V(.12,1.25,.29),c.raise);
      s.gR={fist:.12+.38*c.raise};
      s.headPitch=.03;s.headYaw=.15+.12*Math.sin(t*.19);
      break;
    }
    case 'card_close':{s.sit=1;lap();break;}
  }
  return s;
}

// ── 公共骨架求解（两角色同契约，移植 S1E2 已验收实现）─────────────
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
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.25,-.65,-.5),armA,armB),target];
  }
  if(p.blink==null)p.blink=Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);
  actor.setPose(p);
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
  let gait=s.turn?turningFeet(s.turn,s.rootX,s.rootZ,s.yaw,half,d.footY):walk3(s.walk,s.rootX,s.rootZ,s.yaw,half,d.footY,(d.legA+d.legB)*1.25);
  const rootX=s.rootX+Math.cos(heading)*gait.sway,rootZ=s.rootZ-Math.sin(heading)*gait.sway;
  if(!s.turn)gait=walk3(s.walk,rootX,rootZ,s.yaw,half,d.footY,(d.legA+d.legB)*1.25);
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
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.25,-.65,-.5),d.armA,d.armB),target];
  }
  if(p.blink==null)p.blink=Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);
  actor.setPose(p);actor.mesh.visible=s.visible!==false;
  const gRest={fist:.12,open:0,point:s.point??0}; // 行走段同样需要手势（端盒/挥手）
  actor.hands.left.setGesture({...gRest,...(s.gL??{})});
  actor.hands.right.setGesture({...gRest,...(s.gR??{})});
  actor.setArmorState?.(0,0);actor.setEtch?.(0);actor.setGauntlet?.(0);
  return p;
}

const DIMS_LEI={hipIdle:.85,shoulderY:1.375,shoulderHalf:.13,hipHalf:.075,legA:.40,legB:.40,armA:.19,armB:.18,footY:.085};
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

export function poseAt(lei,hong,entries,t){
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
        if(typeof s[key]==='number')s[key]=key==='yaw'?(o[key]??0)+angleDelta(o[key]??0,s[key])*a:mix(o[key]??0,s[key],a);
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
    if(!s.walk&&!s.turn)continue;
    const ef=entries.findLast(e=>e.startTime<=t)??entries[0];
    const uf=clamp((t-ef.startTime)/(ef.endTime-ef.startTime));
    const sf=spec(map[ef.opts.move]??dflt,uf,t-ef.startTime,t);
    if(sf.walk||sf.turn){s.rootX=sf.rootX;s.rootZ=sf.rootZ;if(sf.walk)s.walk=sf.walk;if(sf.turn)s.turn=sf.turn;}
  }
  // 挂载件次级滞后信号：0.12s 前 bob 的差分（≈速度×0.12s），供 viewer 道具解析弹簧跟随
  for(const [s,spec,map,dflt] of [[sl,specLei,LEI_PHASE,'sit_listen'],[sh,specHong,HONG_PHASE,'hidden']]){
    const tb=Math.max(entry.startTime,tq-.12);
    const ub=clamp((tb-entry.startTime)/(entry.endTime-entry.startTime));
    s.bobLag=(s.bob??0)-(spec(map[opts.move]??dflt,ub,tb-entry.startTime,tb).bob??0);
  }
  const pL=buildPose(lei,sl,tq,DIMS_LEI),pH=buildPose(hong,sh,tq,DIMS_HONG);
  return {entry,i,opts,phase:opts.move,dt,u,sl,sh,pL,pH};
}
