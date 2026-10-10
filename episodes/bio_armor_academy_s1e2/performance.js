// 《9章》S1E2 表演谱：雷晓（lean 少年，右臂殖装三态）+ 轰刚（力量型，碎岩拳甲）。
// 风林火山节奏：静拍全收（林/山）、动作拍爆发（风/火）；口型入点=音频入点。
import * as THREE from 'three';
import {twoBone} from '/craft/pose3d.js';
import {walkingFeet,turningFeet,angleDelta} from './locomotion.js';
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,u)=>a+(b-a)*u,V=(x,y,z=0)=>({x,y,z}),blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));
export const LEI_HOME=[-.5,-2],HONG_HOME=[3.9,-3.3],YAW_LEI=1.86,YAW_HONG=-1.86;

// 距离驱动步态：支撑脚钉在世界地面、摆动脚抛物线换步；相位=已走路程/步长，
// 与根位移同源（根怎么 ease 脚就怎么跟），从根上消除滑步。纯 (t,state) 确定函数。
export function gaitFeet(walk,rootX,rootZ,yaw,hipHalf,footY,stepLen,run=false){
  if(!run)return walkingFeet(walk,rootX,rootZ,yaw,hipHalf,footY,stepLen);
  const {from,to}=walk;
  const D=Math.max(1e-6,Math.hypot(to[0]-from[0],to[1]-from[1]));
  const dirX=(to[0]-from[0])/D,dirZ=(to[1]-from[1])/D,perpX=-dirZ,perpZ=dirX;
  const d=Math.min(D,Math.hypot(rootX-from[0],rootZ-from[1])),g=d/stepLen;
  const stance=run?.5:.62,lift=run?.09:.055;
  const cy=Math.cos(yaw),ny=Math.sin(yaw),feet={};
  for(const [side,sign,off] of [['left',-1,0],['right',1,.5]]){
    const c=g+off,n=Math.floor(c),fc=c-n;
    let pd,y=footY,pitch=0;
    if(fc<stance)pd=(n-off)*stepLen; // 支撑：世界钉住
    else{ // 摆动：抛物线换到下一个落点
      const q=(fc-stance)/(1-stance);
      pd=mix((n-off)*stepLen,(n+1-off)*stepLen,ease(q));
      y=footY+lift*Math.sin(Math.PI*q);
      pitch=.22*Math.cos(Math.PI*q); // 蹬地伸脚 → 脚跟着地勾脚
    }
    pd=Math.max(-.3*stepLen,Math.min(D,pd));
    const wx=from[0]+dirX*pd+perpX*sign*hipHalf,wz=from[1]+dirZ*pd+perpZ*sign*hipHalf;
    const dx=wx-rootX,dz=wz-rootZ;
    feet[side]={x:cy*dx-ny*dz,y,z:ny*dx+cy*dz,pitch};
  }
  return {...feet,g,hipDelta:-.02*Math.abs(Math.cos(Math.PI*g))}; // 双支撑期髋部最低
}

const IDLE_L={left:V(-.21,.95,.03),right:V(.21,.95,.03)};
const IDLE_H={left:V(-.27,1.12,.04),right:V(.27,1.12,.04)};

// ── 雷晓 ─────────────────────────────────────────────────────────
function specLei(phase,u,dt,t){
  const s={rootX:LEI_HOME[0],rootZ:LEI_HOME[1],yaw:YAW_LEI,bob:0,hipY:null,
    left:{...IDLE_L.left},right:{...IDLE_L.right},
    headYaw:0,headPitch:0,headRoll:0,point:0,fist:0,open:0,emotion:'neutral',walk:null,
    armorT:0,shieldT:0,etchT:0,blink:null,sit:false};
  const move=(from,to,a)=>{a=clamp(a);if(a<1)s.walk={from,to,a};s.rootX=mix(from[0],to[0],ease(a));s.rootZ=mix(from[1],to[1],ease(a));};
  switch(phase){
    case 'card_open':case 'establish':s.rootX=3.6;s.rootZ=-.6;s.yaw=-1.9;break; // 入场前朝向行进方向
    case 'walk_in':{ // 绕路走进工地，紧张自语
      const from=[3.6,-.6],to=[-.5,-2],heading=Math.atan2(to[0]-from[0],to[1]-from[1]);
      move(from,to,u/.72);s.yaw=heading;s.emotion='worry';
      s.left=V(-.10,1.05,.13);s.right=V(.21,1.01,.02); // 左手靠书包带，右臂自然随步摆动
      s.headYaw=.07*Math.sin(t*1.3);s.headRoll=.015;
      if(u>=.72){
        const a=clamp((u-.74)/.24);
        s.turn={fromYaw:heading,toYaw:YAW_LEI,a};
        s.yaw=heading+angleDelta(heading,YAW_LEI)*ease(a);
      }
      break;
    }
    case 'lei_idle':{s.emotion='worry';s.headYaw=-.1;s.left=V(-.16,1.02,.12);s.right=V(.16,1.02,.12);break;}
    case 'lei_panic':{ // 慌：后退半步，双手推拒
      move([-.5,-2],[-.85,-2],u/.3);s.walk={from:[-.5,-2],to:[-.85,-2],facingYaw:YAW_LEI,startHalf:.09};s.emotion='scared'; // 后退仍面向对方
      s.left=V(-.26,1.24,.26);s.right=V(.26,1.24,.26);s.open=.9;
      s.headYaw=.18*Math.sin(t*4.2);s.headPitch=.06;s.bob=.008*Math.sin(t*13);
      break;
    }
    case 'flinch':case 'flinch2':{ // 抱头蹲防；后半骨板自动展开
      const a=ease(u/.3);
      s.bob=-.14*a;s.emotion='scared';s.headPitch=.32*a;
      s.left=blend(IDLE_L.left,V(-.16,1.52,.16),a);s.right=blend(IDLE_L.right,V(.12,1.42,.28),a);
      s.fist=.7;
      if(phase==='flinch')s.shieldT=clamp((u-.45)/.25); // 9章自动防御
      if(phase==='flinch2'){s.blink=u<.6?1:null;s.shieldT=1-clamp((u-.55)/.2);} // 闭眼硬扛
      break;
    }
    case 'lei_shocked':{ // 看它自己动的右臂
      s.bob=-.06;s.yaw=1.3;s.headYaw=.42;s.headPitch=.3;s.emotion='scared';
      s.right=V(.26,1.16,.30);s.open=.4;s.left=V(-.18,1.0,.1);
      s.shieldT=1-clamp(u/.3); // 骨板缓缓收回
      break;
    }
    case 'will_up':{ // 首次意志驱动：不是它……是我！
      if(u<.38){ // 从蹲防里站起来，眼神变
        const a=ease(u/.38);s.bob=-.14*(1-a);s.headPitch=mix(.32,-.06,a);
        s.left=blend(V(-.16,1.52,.16),V(-.20,1.0,.10),a);s.right=blend(V(.12,1.42,.28),V(.20,1.05,.14),a);
        s.emotion=u<.2?'scared':'determined';s.fist=.7;
      }else{
        s.emotion='determined';s.armorT=clamp((u-.38)/.30); // 黑甲从肘向腕蔓延
        s.fist=1;s.headPitch=-.06;s.headYaw=-.08;
        if(u>.55){ // 反击一拳
          const p=ease(clamp((u-.55)/.16));
          s.rootX=mix(-.5,.35,p);s.yaw=mix(YAW_LEI,1.4,p);
          s.right=blend(V(.20,1.05,.14),V(.15,1.34,.34),p); // 直拳（可达域内打直）
          s.left=blend(V(-.20,1.0,.10),V(-.24,1.05,-.10),p);
          s.bob=-.04*p;
        }
      }
      break;
    }
    case 'lei_after':{s.armorT=1;s.emotion='worry';s.headPitch=.12;s.right=V(.24,1.0,.12);s.fist=.6;break;}
    case 'first_mark':{ // 撸起左袖：左前臂第一道蚀纹
      s.armorT=1;s.emotion='scared';s.headPitch=.38;s.headYaw=-.22;
      s.left=V(.04,1.20,.28);s.open=.3;s.right=V(.22,1.0,.10);
      s.etchT=clamp((u-.25)/.3);s.bob=-.02;
      break;
    }
    case 'hook':{s.armorT=1;s.etchT=1;s.emotion='worry';s.headPitch=.18;break;}
  }
  return s;
}

// ── 轰刚 ─────────────────────────────────────────────────────────
function specHong(phase,u,dt,t){
  const s={rootX:HONG_HOME[0],rootZ:HONG_HOME[1],yaw:YAW_HONG,bob:0,hipY:null,air:0,
    left:{...IDLE_H.left},right:{...IDLE_H.right},
    headYaw:0,headPitch:0,headRoll:0,fist:1,walk:null,gauntletT:0,sit:false,visible:true,
    punchT:0,hitT:0,hornBroken:false};
  const move=(from,to,a)=>{a=clamp(a);if(a<1)s.walk={from,to,a};s.rootX=mix(from[0],to[0],ease(a));s.rootZ=mix(from[1],to[1],ease(a));};
  switch(phase){
    case 'card_open':case 'establish':case 'walk_in':s.visible=false;break; // 未登场
    case 'hong_drop':{ // 管顶跳下：预备下蹲 → 抛体飞行（水平匀速、竖直重力）→ 深蹲缓冲
      if(u<.10){ // 预备：管顶上蹲伏摆臂
        const a=ease(u/.10);
        s.air=1.5;s.bob=-.13*a;s.lean=.06*a;s.headPitch=.14;
        s.left=V(-.30,1.5-.32*a,.20-.34*a);s.right=V(.30,1.5-.32*a,.20-.34*a);
      }else if(u<.55){ // 空中：水平匀速；竖直 v0=1.2、g=9.8 抛体（T=等效实秒）
        const q=(u-.10)/.45,T=.689*q;
        s.air=Math.max(0,1.5+1.2*T-4.9*T*T);
        s.rootX=mix(4.6,3.9,q);s.rootZ=mix(-5.2,-3.3,q);
        s.tuck=q<.7?.34*ease(q/.28):.34*(1-ease((q-.7)/.28)); // 收腿→落地前伸腿
        s.lean=.10;s.headPitch=.16;
        s.left=V(-.42,1.42,.18);s.right=V(.42,1.42,.18); // 展开保持平衡
      }else{ // 触地深蹲缓冲 → 回弹站稳（震尘环由 viewer 在 u=.55 触发）
        const a=ease((u-.55)/.09),r=ease((u-.66)/.30);
        s.bob=-.26*a*(1-r);s.footSpread=.08*(1-.5*r);
        s.lean=mix(.10,0,r);s.headPitch=mix(.16,-.08,r);
        s.left=blend(V(-.42,1.42,.18),V(-.32,1.10,.08),r);
        s.right=blend(V(.42,1.42,.18),V(.32,1.10,.08),r);
      }
      break;
    }
    case 'hong_declare':{ // 点名叫阵
      s.right=V(.46,1.58,.30);s.fist=1;s.headPitch=-.06;s.headYaw=.05;
      s.left=V(-.30,1.1,.1);s.bob=.012*Math.sin(t*2.2);
      break;
    }
    case 'hong_armor':{ // 规则宣告 + 碎岩上身
      s.gauntletT=clamp(u/.5);
      s.right=u<.5?V(.40,1.30,.30):V(.34,1.42,.22);
      s.headPitch=-.04;s.emotion='declare';s.headRoll=-.04;
      break;
    }
    case 'charge1':case 'charge2':{ // 冲锋直拳（风拍）——脚步与位移同源，不滑冰
      const a=ease(u/.4);
      move([3.9,-3.3],[.55,-2.35],u/.4);if(s.walk)s.walk.run=true;
      s.lean=.12*a; // 前冲压身
      s.gauntletT=1;
      s.punchT=clamp((u-.45)/.2);
      const p=ease(s.punchT);
      s.right=blend(V(.30,1.25,.10),V(.34,1.32,.62),p);
      s.left=blend(IDLE_H.left,V(-.30,1.15,-.12),p);
      s.yaw=mix(YAW_HONG,-1.5,p);s.bob=-.05*p;s.headPitch=.03;
      break;
    }
    case 'knockdown':{ // 甲碎、坐地
      s.gauntletT=1;s.hitT=clamp((u-.1)/.25);s.emotion='scared'; // 被击飞是吃惊
      const h=ease(s.hitT);
      s.rootX=mix(.55,4.4,h);s.rootZ=mix(-2.35,-2.9,h);s.air=Math.sin(h*Math.PI)*.5; // 从接触点被击飞
      if(s.hitT>.55){s.sit=true;s.hornBroken=true;s.gauntletT=.55;}
      s.left=V(-.4,1.3,.3);s.right=V(.4,1.3,.3);s.headPitch=.2;
      break;
    }
    case 'hong_laugh':{ // 坐地大笑放话
      s.sit=true;s.hornBroken=true;s.gauntletT=.55;
      s.headPitch=-.28;s.bob=.02*Math.sin(t*6);s.headRoll=.05*Math.sin(t*3);
      s.right=V(.30,.95,.30);s.left=V(-.30,.9,.15);
      break;
    }
    case 'leave':{ // 起身走出画面（留话退场）
      const a=ease(u/.4);
      if(a<1){s.sit=true;s.hornBroken=true;s.gauntletT=.55;s.bob=.2*a;}
      else{move([4.4,-2.9],[9.5,-1.5],(u-.4)/.5);s.yaw=mix(YAW_HONG,1.4,ease((u-.4)/.3));}
      if(u>.8)s.visible=false;
      break;
    }
  }
  return s;
}

// ── 公共骨架求解（两角色同契约）────────────────────────────────
function buildPose(actor,s,t,dims){
  const {hipIdle,shoulderY,shoulderHalf,hipHalf,legA,legB,armA,armB,footY}=dims;
  let hipY=s.sit?.46:(s.hipY??hipIdle+s.bob);
  const p={rootX:s.rootX,rootZ:s.rootZ,yaw:s.yaw,bob:s.bob,blink:s.blink,
    headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll,point:s.point??0,fist:s.fist??0,open:s.open??0,lean:s.lean??0};
  if((s.walk&&!s.walk.run)||s.turn)return buildWalkingPose(actor,s,t,dims,p);
  if(s.walk){ // 距离驱动步态：支撑脚钉地、摆动脚抛物线换步，相位与根位移同源
    const {from,to}=s.walk;
    const D=Math.max(1e-6,Math.hypot(to[0]-from[0],to[1]-from[1]));
    const dd=Math.min(D,Math.hypot(s.rootX-from[0],s.rootZ-from[1]));
    const stepLen=(legA+legB)*.68,g0=dd/stepLen;
    const fade=Math.min(1,Math.min(dd,D-dd)/.18); // 起止渐出，上身动作不瞬跳
    const perpX=-(to[1]-from[1])/D,perpZ=(to[0]-from[0])/D;
    const sway=.5*hipHalf*Math.sin(2*Math.PI*g0+.9*Math.PI)*fade; // 重心倒向支撑脚
    const rootX=s.rootX+perpX*sway,rootZ=s.rootZ+perpZ*sway;
    p.rootX=rootX;p.rootZ=rootZ;
    const gait=gaitFeet(s.walk,rootX,rootZ,s.yaw,hipHalf,footY,stepLen,s.walk.run);
    p.walkTwist=(s.walk.run?.10:.055)*Math.sin(2*Math.PI*g0)*fade; // 肩线反向扭转
    p.lean=(s.lean??0)+(s.walk.run?.09:.03)*Math.max(fade,.3);
    p.headYaw=(p.headYaw??0)-p.walkTwist*1.1; // 头稳定朝前
    hipY=hipIdle+gait.hipDelta;
    for(const [side,sign] of [['left',-1],['right',1]]){
      const f=gait[side],dx=f.x-sign*hipHalf,dz=f.z,h=Math.min(dx*dx+dz*dz,(legA+legB-.01)**2-.01);
      hipY=Math.min(hipY,f.y+Math.sqrt(Math.max(.01,(legA+legB-.01)**2-h)));
    }
    for(const [side,sign] of [['left',-1],['right',1]]){
      p[side+'Leg']=[V(sign*hipHalf,hipY,0),null,V(gait[side].x,gait[side].y,gait[side].z)];
      if(gait[side].pitch)p[side+'FootPitch']=gait[side].pitch;
    }
  }else if(s.sit){
    for(const [side,sign] of [['left',-1],['right',1]])
      p[side+'Leg']=[V(sign*hipHalf,hipY,0),null,V(sign*.16,footY,.55)];
  }else{
    const tuck=s.tuck??0,spread=s.footSpread??0;
    for(const [side,sign] of [['left',-1],['right',1]])
      p[side+'Leg']=[V(sign*hipHalf,hipY,0),null,V(sign*(.09+spread),footY+tuck,.02-.5*tuck+spread*.4)];
  }
  const walkTwist=p.walkTwist??0,rotY=(v,a)=>{const c=Math.cos(a),n=Math.sin(a);return V(v.x*c+v.z*n,v.y,-v.x*n+v.z*c);};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const leg=p[side+'Leg'];leg[1]=twoBone(leg[0],leg[2],V(0,0,1),legA,legB);
    const torsoOffset=s.sit?hipY-hipIdle:(s.walk?hipY-hipIdle:s.bob);
    let shoulder=V(sign*shoulderHalf,shoulderY+torsoOffset,0),target=V(s[side].x,s[side].y+s.bob,s[side].z);
    if(walkTwist){shoulder=rotY(shoulder,walkTwist);target=rotY(target,walkTwist);}
    const delta=new THREE.Vector3(target.x-shoulder.x,target.y-shoulder.y,target.z-shoulder.z);
    const maxR=armA+armB-.005;
    if(delta.length()>maxR){delta.setLength(maxR);Object.assign(target,V(shoulder.x+delta.x,shoulder.y+delta.y,shoulder.z+delta.z));}
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.25,-.65,-.5),armA,armB),target];
  }
  p.bob=s.sit?hipY-hipIdle:(s.walk?hipY-hipIdle:s.bob);
  actor.mesh.position.y=s.air??0;
  if(p.blink==null)p.blink=Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);
  actor.setPose(p);
  if(actor.setArmorState){actor.setArmorState(s.armorT??0,s.shieldT??0);actor.setEtch(s.etchT??0);}
  if(actor.setGauntlet){actor.setGauntlet(s.gauntletT??0);if(actor.rigGauntlet)actor.horn.forEach(h=>h.visible=!s.hornBroken);}
  actor.mesh.visible=s.visible!==false;
  return p;
}

function buildWalkingPose(actor,s,t,d,p){
  const half=s.walk?.facingYaw!=null?.12:d.hipHalf*1.2,heading=s.walk?.facingYaw??Math.atan2((s.walk?.to[0]??0)-(s.walk?.from[0]??0),(s.walk?.to[1]??1)-(s.walk?.from[1]??0));
  let gait=s.turn?turningFeet(s.turn,s.rootX,s.rootZ,s.yaw,half,d.footY):gaitFeet(s.walk,s.rootX,s.rootZ,s.yaw,half,d.footY,(d.legA+d.legB)*1.25);
  const rootX=s.rootX+Math.cos(heading)*gait.sway,rootZ=s.rootZ-Math.sin(heading)*gait.sway;
  if(!s.turn)gait=gaitFeet(s.walk,rootX,rootZ,s.yaw,half,d.footY,(d.legA+d.legB)*1.25);
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
  p.locomotion={kind:s.turn?'turn':s.walk.facingYaw!=null?'backstep':'walk',step:gait.step,steps:gait.steps,
    contacts:Object.fromEntries(['left','right'].map(side=>[side,{stance:gait[side].stance,id:gait[side].contact}]))};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const foot=gait[side],start=V(sign*d.hipHalf,hip,0),end=V(foot.x,foot.y,foot.z);
    p[side+'Leg']=[start,twoBone(start,end,V(0,0,1),d.legA,d.legB),end];
    p[side+'FootPitch']=foot.pitch;p[side+'FootYaw']=foot.yaw;
    const shoulder=torso(V(sign*d.shoulderHalf,d.shoulderY,0)),hand={...s[side]};
    if(side==='right'&&!s.walk?.facingYaw&&!s.turn)hand.z+=gait.armSwing;
    const target=torso(hand),delta=target.clone().sub(shoulder),max=d.armA+d.armB-.005;
    if(delta.length()>max)target.copy(shoulder).add(delta.setLength(max));
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.25,-.65,-.5),d.armA,d.armB),target];
  }
  actor.mesh.position.y=s.air??0;if(p.blink==null)p.blink=Math.max(0,1-Math.abs((t%3.7)-3.4)/.12);
  actor.setPose(p);actor.mesh.visible=s.visible!==false;
  actor.setArmorState?.(s.armorT??0,s.shieldT??0);actor.setEtch?.(s.etchT??0);actor.setGauntlet?.(s.gauntletT??0);
  return p;
}
const DIMS_LEI={hipIdle:.85,shoulderY:1.375,shoulderHalf:.13,hipHalf:.075,legA:.40,legB:.40,armA:.19,armB:.18,footY:.085};
const DIMS_HONG={hipIdle:.98,shoulderY:1.56,shoulderHalf:.18,hipHalf:.10,legA:.45,legB:.45,armA:.22,armB:.21,footY:.10};

// 条目→角色 move 映射
const LEI_PHASE={card_open:'card_open',establish:'establish',walk_in:'walk_in',hong_drop:'lei_idle',
  hong_declare:'lei_idle',lei_panic:'lei_panic',hong_armor:'lei_idle',clash1:'flinch',
  lei_shocked:'lei_shocked',clash2:'flinch2',will_up:'will_up',hong_laugh:'lei_after',
  first_mark:'first_mark',hook:'hook'};
const HONG_PHASE={card_open:'card_open',establish:'establish',walk_in:'walk_in',hong_drop:'hong_drop',
  hong_declare:'hong_declare',lei_panic:'lei_idle_h',hong_armor:'hong_armor',clash1:'charge1',
  lei_shocked:'lei_idle_h',clash2:'charge2',will_up:'knockdown',hong_laugh:'hong_laugh',
  first_mark:'hong_laugh',hook:'leave'};

function specHongFix(phase,u,dt,t){
  const s=specHong(phase==='lei_idle_h'?'hong_declare':phase,u,dt,t);
  if(phase==='lei_idle_h'){s.right=V(.30,1.2,.15);s.headPitch=0;}
  return s;
}

export function poseAt(lei,hong,entries,t){
  const entry=entries.findLast(e=>e.startTime<=t)??entries[0],i=entries.indexOf(entry),opts=entry.storyEvents[0].options;
  const dt=t-entry.startTime,u=clamp(dt/(entry.endTime-entry.startTime));
  let sl=specLei(LEI_PHASE[opts.move]??'lei_idle',u,dt,t);
  let sh=specHongFix(HONG_PHASE[opts.move]??'lei_idle_h',u,dt,t);
  if(i&&dt<.3){ // 条目边界 0.3s 原地缘插值
    const prev=entries[i-1],pu=1;
    const ol=specLei(LEI_PHASE[prev.storyEvents[0].options.move]??'lei_idle',pu,prev.endTime-prev.startTime,prev.endTime);
    const oh=specHongFix(HONG_PHASE[prev.storyEvents[0].options.move]??'lei_idle_h',pu,prev.endTime-prev.startTime,prev.endTime);
    const a=ease(dt/.3);
    for(const [s,o] of [[sl,ol],[sh,oh]]){
      if(o.visible===false)continue; // 上一拍未登场：直接定格在新拍起点，不做浮起插值
      for(const key of ['rootX','rootZ','yaw','bob','headYaw','headRoll','headPitch','armorT','shieldT','gauntletT','etchT','air','fist','open','point','lean'])
        if(typeof s[key]==='number')s[key]=key==='yaw'?(o[key]??0)+angleDelta(o[key]??0,s[key])*a:mix(o[key]??0,s[key],a);
      s.left=blend(o.left,s.left,a);s.right=blend(o.right,s.right,a);
    }
  }
  const pL=buildPose(lei,sl,t,DIMS_LEI),pH=buildPose(hong,sh,t,DIMS_HONG);
  return {entry,i,opts,phase:opts.move,dt,u,sl,sh,pL,pH};
}
