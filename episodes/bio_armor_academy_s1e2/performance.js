// 《9章》S1E2 表演谱：雷晓（lean 少年，右臂殖装三态）+ 轰刚（力量型，碎岩拳甲）。
// 风林火山节奏：静拍全收（林/山）、动作拍爆发（风/火）；口型入点=音频入点。
import * as THREE from 'three';
import {twoBone} from '/craft/pose3d.js';
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,u)=>a+(b-a)*u,V=(x,y,z=0)=>({x,y,z}),blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));
export const LEI_HOME=[-.5,-2],HONG_HOME=[3.9,-3.3],YAW_LEI=1.86,YAW_HONG=-1.86;

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
    case 'card_open':case 'establish':s.rootX=3.6;s.rootZ=-.6;break; // 还没进场
    case 'walk_in':{ // 绕路走进工地，紧张自语
      move([3.6,-.6],[-.5,-2],u/.8);
      s.yaw=mix(-1.9,YAW_LEI,ease(u/.8));s.emotion='worry';
      s.left=V(-.10,1.05,.16);s.right=V(.10,1.05,.16); // 抓着书包带
      s.headYaw=.15*Math.sin(t*1.3);s.headRoll=.03;
      break;
    }
    case 'lei_idle':{s.emotion='worry';s.headYaw=-.1;s.left=V(-.16,1.02,.12);s.right=V(.16,1.02,.12);break;}
    case 'lei_panic':{ // 慌：后退半步，双手推拒
      s.rootX=-.5-.35*ease(u/.3);s.emotion='scared';
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
    case 'hong_drop':{ // 从混凝土管顶跳下震尘
      const a=ease(u/.5);
      s.rootX=mix(4.6,3.9,a);s.rootZ=mix(-5.2,-3.3,a);
      s.air=Math.sin(a*Math.PI)*1.7+(1-a)*1.5; // 管顶起跳弧
      s.bob=-.22*ease((u-.55)/.2)*(1-ease((u-.8)/.2)); // 落地深蹲缓冲
      s.left=V(-.4,1.5,.2);s.right=V(.4,1.5,.2);s.headPitch=-.1;
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
    case 'charge1':case 'charge2':{ // 冲锋直拳（风拍）
      const a=ease(u/.4);
      s.rootX=mix(3.9,1.7,a);s.rootZ=mix(-3.3,-2.5,a);
      s.gauntletT=1;
      s.punchT=clamp((u-.45)/.2);
      const p=ease(s.punchT);
      s.right=blend(V(.30,1.25,.10),V(.34,1.32,.62),p);
      s.left=blend(IDLE_H.left,V(-.30,1.15,-.12),p);
      s.yaw=mix(YAW_HONG,-1.5,p);s.bob=-.05*p;s.headPitch=.03;
      break;
    }
    case 'knockdown':{ // 甲碎、坐地
      s.gauntletT=1;s.hitT=clamp((u-.1)/.25);
      const h=ease(s.hitT);
      s.rootX=mix(1.7,4.4,h);s.rootZ=mix(-2.5,-2.9,h);s.air=Math.sin(h*Math.PI)*.5;
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
    headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll,point:s.point??0};
  if(s.walk){
    const ph=t*4.6;
    for(const [side,sign] of [['left',-1],['right',1]]){
      const f={x:sign*hipHalf,y:footY+.07*Math.max(0,Math.sin(ph+(sign<0?0:Math.PI))),z:.09*Math.sin(ph-.5)};
      const dx=f.x-sign*hipHalf,dy=hipY-f.y,dz=f.z;
      const len=Math.hypot(dx,dy,dz);
      if(len>legA+legB-.01)hipY=Math.min(hipY,f.y+Math.sqrt(Math.max(.01,(legA+legB-.01)**2-dx*dx-dz*dz)));
      p[side+'Leg']=[V(sign*hipHalf,hipY,0),null,V(f.x,f.y,f.z)];
    }
  }else if(s.sit){
    for(const [side,sign] of [['left',-1],['right',1]])
      p[side+'Leg']=[V(sign*hipHalf,hipY,0),null,V(sign*.16,footY,.55)];
  }else{
    for(const [side,sign] of [['left',-1],['right',1]])
      p[side+'Leg']=[V(sign*hipHalf,hipY,0),null,V(sign*.09,footY,.02)];
  }
  for(const [side,sign] of [['left',-1],['right',1]]){
    const leg=p[side+'Leg'];leg[1]=twoBone(leg[0],leg[2],V(0,0,1),legA,legB);
    const shoulder=V(sign*shoulderHalf,shoulderY+s.bob,0),target=V(s[side].x,s[side].y+s.bob,s[side].z);
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
const DIMS_LEI={hipIdle:.85,shoulderY:1.375,shoulderHalf:.155,hipHalf:.075,legA:.40,legB:.40,armA:.19,armB:.18,footY:.085};
const DIMS_HONG={hipIdle:.98,shoulderY:1.56,shoulderHalf:.21,hipHalf:.10,legA:.45,legB:.45,armA:.22,armB:.21,footY:.10};

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
      for(const key of ['rootX','rootZ','yaw','bob','headYaw','headRoll','headPitch','armorT','shieldT','gauntletT','etchT','air'])
        if(typeof s[key]==='number')s[key]=mix(o[key]??0,s[key],a);
      s.left=blend(o.left,s.left,a);s.right=blend(o.right,s.right,a);
    }
  }
  const pL=buildPose(lei,sl,t,DIMS_LEI),pH=buildPose(hong,sh,t,DIMS_HONG);
  return {entry,i,opts,phase:opts.move,dt,u,sl,sh,pL,pH};
}
