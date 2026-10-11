// 《迟到的一拍》表演谱：P2 真角色版。节拍=timeline.json；(t,state) 纯函数、seek 一致。
// 骨架求解移植 S1E3 已验收 buildPose/buildWalkingPose 模式（twoBone IK + walkingFeet）。
// 台位语义→坐标：C=(0,-2.2) lip=(0,-1.0) SR=(1.3,-1.9) 翼门口=(3.7,-2.0) 灯控台=(4.4,-2.6)
import * as THREE from 'three';
import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {walkingFeet} from 'dula-assets/lib/craft3d/locomotion.js';
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,u)=>a+(b-a)*u,V=(x,y,z=0)=>({x,y,z}),blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));
const key=(t,ks)=>{if(t<=ks[0][0])return ks[0][1];
  for(let i=1;i<ks.length;i++){if(t<=ks[i][0]){const [t0,a]=ks[i-1],[t1,b]=ks[i];return mix(a,b,(t-t0)/(t1-t0));}}
  return ks[ks.length-1][1];};
const pulse=(t,c,w)=>Math.exp(-(((t-c)/w)**2));

const DIMS_APAI={hipIdle:.88,shoulderY:1.44,shoulderHalf:.125,hipHalf:.075,legA:.41,legB:.41,armA:.185,armB:.175,footY:.085};
const DIMS_DENG={hipIdle:.82,shoulderY:1.34,shoulderHalf:.115,hipHalf:.08,legA:.38,legB:.38,armA:.17,armB:.16,footY:.08};

// ── 公共骨架求解（站立/走动；本集无坐姿）──
function buildPose(actor,s,t,dims){
  const {hipIdle,shoulderY,shoulderHalf,hipHalf,legA,legB,armA,armB,footY}=dims;
  const hipY=s.hipY??(hipIdle+(s.bob??0));
  const p={rootX:s.rootX,rootZ:s.rootZ,yaw:s.yaw,bob:hipY-hipIdle,
    headYaw:s.headYaw,headPitch:s.headPitch,headRoll:s.headRoll??0,
    fist:s.fist??0,open:s.open??0,point:0,lean:s.lean??0};
  if(s.walk)return buildWalkingPose(actor,s,t,dims,p);
  for(const [side,sign] of [['left',-1],['right',1]]){
    const foot=V(sign*(s.footX??.09),footY,.02);
    p[side+'Leg']=[V(sign*hipHalf,hipY,0),null,foot];
    p[side+'Leg'][1]=twoBone(p[side+'Leg'][0],foot,V(0,0,1),legA,legB);
  }
  const torsoOffset=hipY-hipIdle;
  for(const [side,sign] of [['left',-1],['right',1]]){
    const shoulder=V(sign*shoulderHalf,shoulderY+torsoOffset,0),target=V(s[side].x,s[side].y+(s.bob??0),s[side].z);
    const delta=new THREE.Vector3(target.x-shoulder.x,target.y-shoulder.y,target.z-shoulder.z);
    const maxR=armA+armB-.005;
    if(delta.length()>maxR){delta.setLength(maxR);Object.assign(target,V(shoulder.x+delta.x,shoulder.y+delta.y,shoulder.z+delta.z));}
    const pole=s[side+'Pole']??V(sign*.25,-.65,-.5);
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,pole,armA,armB),target];
  }
  actor.setPose(p);
  // 站立帧必须重置足踝旋转（否则上一段走动的跖屈/偏航残留=seek 不一致——S1E3 同款纪律）
  for(const foot of Object.values(actor.feet))foot.rotation.set(0,0,0);
  const gRest={fist:.12,open:0,point:0};
  actor.hands.left.setGesture({...gRest,...(s.gL??{})});
  actor.hands.right.setGesture({...gRest,...(s.gR??{})});
  actor.mesh.visible=s.visible!==false;
  return p;
}
function buildWalkingPose(actor,s,t,d,p){ // 移植 S1E3：walkingFeet 距离驱动 + 髋部沉降
  const half=d.hipHalf*1.2,heading=s.walk.facingYaw??Math.atan2(s.walk.to[0]-s.walk.from[0],s.walk.to[1]-s.walk.from[1]);
  const stride=(d.legA+d.legB)*1.25*(d.strideFactor??.9);
  let gait=walkingFeet(s.walk,s.rootX,s.rootZ,s.yaw,half,d.footY,stride);
  const rootX=s.rootX+Math.cos(heading)*gait.sway,rootZ=s.rootZ-Math.sin(heading)*gait.sway;
  gait=walkingFeet(s.walk,rootX,rootZ,s.yaw,half,d.footY,stride);
  p.rootX=rootX;p.rootZ=rootZ;
  let hip=d.hipIdle+gait.hipDelta;
  for(const [side,sign] of [['left',-1],['right',1]]){
    const f=gait[side],horizontal=(f.x-sign*d.hipHalf)**2+f.z*f.z;
    hip=Math.min(hip,f.y+Math.sqrt(Math.max(.01,(d.legA+d.legB-.008)**2-horizontal)));
  }
  const twist=-gait.armSwing*.35,matrix=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0,twist,0));
  const pivot=new THREE.Vector3(0,d.hipIdle,0).applyMatrix4(matrix),offset=new THREE.Vector3(-pivot.x,hip-pivot.y,-pivot.z);
  const torso=v=>new THREE.Vector3(v.x,v.y,v.z).applyMatrix4(matrix).add(offset);
  p.torsoMatrix=matrix;p.torsoTranslation=offset;p.bob=hip-d.hipIdle;p.headYaw=(p.headYaw??0)-twist;
  p.locomotion={kind:'walk',step:gait.step,steps:gait.steps,
    contacts:Object.fromEntries(['left','right'].map(side=>[side,{stance:gait[side].stance,id:gait[side].contact}]))};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const foot=gait[side],start=V(sign*d.hipHalf,hip,0),end=V(foot.x,foot.y,foot.z);
    p[side+'Leg']=[start,twoBone(start,end,V(0,0,1),d.legA,d.legB),end];
    p[side+'FootPitch']=foot.pitch;p[side+'FootYaw']=foot.yaw;
    const shoulder=torso(V(sign*d.shoulderHalf,d.shoulderY,0)),hand={...s[side]};
    if(side==='right'&&!s.walk?.noSwing)hand.z+=gait.armSwing;
    const target=torso(hand),delta=target.clone().sub(shoulder),max=d.armA+d.armB-.005;
    if(delta.length()>max)target.copy(shoulder).add(delta.setLength(max));
    p[side+'Arm']=[shoulder,twoBone(shoulder,target,s[side+'Pole']??V(sign*.25,-.65,-.5),d.armA,d.armB),target];
  }
  actor.setPose(p);actor.mesh.visible=s.visible!==false;
  for(const side of ['left','right'])actor.feet[side].rotation.set(p[side+'FootPitch']??0,p[side+'FootYaw']??0,0,'YXZ');
  const gRest={fist:.12,open:0,point:0};
  actor.hands.left.setGesture({...gRest,...(s.gL??{})});
  actor.hands.right.setGesture({...gRest,...(s.gR??{})});
  return p;
}

// ── 阿拍（怯场→找回→释然）──
function specApai(id,t){
  const s={rootX:0,rootZ:-2.2,yaw:0,bob:0,lean:0,headYaw:0,headPitch:0,headRoll:0,
    left:V(-.16,1.10,.06),right:V(.16,1.10,.06), // 静息垂手微前
    emotion:'neutral',acting:null,tremble:0,sway:0,visible:true,
    symSweat:0,symDark:0,gL:null,gR:null,walk:null};
  switch(id){
    case 'card_open':s.visible=false;break;
    case 'house_hint':case 'curtain_open':{ // 幕开独站台中：攥歌词卡（双手腹前捧卡）
      s.visible=t>=7.0;s.emotion='fear';s.tremble=.006;
      s.left=V(-.05,1.20,.17);s.right=V(.05,1.20,.17);s.gL={fist:.42};s.gR={fist:.42};
      s.headPitch=.14;
      break;
    }
    case 'talk_1':{ // 怯场独白：攥卡、细颤、汗滴两次
      s.emotion='fear';s.tremble=.01;
      s.left=V(-.05,1.20,.17);s.right=V(.05,1.20,.17);s.gL={fist:.42};s.gR={fist:.42};
      s.headPitch=key(t,[[12,.14],[13.5,.06],[21,.08],[22.5,.24],[26.5,.24],[28,.14]]);
      s.symSweat=(t>=14&&t<=16.5)||(t>=23&&t<=25.5)?1:0; // 汗滴窗口（弹入-停留-退场归 viewer 包络）
      break;
    }
    case 'song_1a':{ // 第一句唱砸：30.8 破音→黑线罩脸+大汗滴，身体冻结（细颤掐死）
      const fz=ease(clamp((t-30.8)/.6));
      s.emotion='fear';s.acting={fear:1};s.freeze=fz;s.tremble=.01*(1-fz);
      s.left=V(-.15,1.06,.05);s.right=V(.15,1.06,.05);s.gL={fist:.2};s.gR={fist:.2};
      s.headPitch=mix(.10,.26,fz);s.headYaw=.12*Math.sin(t*4.1)*fz; // 眼神飘忽（头小幅快换向）
      s.symDark=(t>=30.8&&t<=33.2)?1:0;s.symSweat=(t>=31.2&&t<=34.5)?2:0; // 2=大汗滴
      break;
    }
    case 'song_1b':{ // 追光呼吸引导：解冻从指尖到肩膀，手缓缓抬起
      const th=ease(clamp((t-37)/4.5));
      s.emotion='fear';s.acting={fear:1-th};s.freeze=1-th;
      const rise=ease(clamp((t-42)/5));
      s.left=blend(V(-.15,1.06,.05),V(-.10,1.22,.15),rise);
      s.right=blend(V(.15,1.06,.05),V(.10,1.22,.15),rise);
      s.gL={fist:.3,open:.15*rise};s.gR={fist:.3,open:.15*rise};
      s.headPitch=mix(.26,.04,ease(clamp((t-40)/4)));
      s.sway=.008*ease(clamp((t-44)/3));
      break;
    }
    case 'song_1c':{ // 找回：主歌站桩手势放开 → 70-74 上步台唇（副歌张臂）
      s.emotion='focus';s.acting={focus:.7};
      s.sway=.02*ease(clamp((t-50)/3));
      s.headPitch=mix(.04,-.02,ease(clamp((t-52)/4)));
      const open=ease(clamp((t-72)/6))*ease(clamp((92-t)/8));
      s.left=blend(V(-.10,1.22,.15),V(-.26,1.20,.08),open);
      s.right=blend(V(.10,1.22,.15),V(.26,1.20,.08),open);
      s.leftPole=blend(V(-.25,-.65,-.5),V(-.4,-.6,-.2),open);s.rightPole=blend(V(.25,-.65,-.5),V(.4,-.6,-.2),open); // 肘极随张臂渐变（常时外偏=肘凸实录）
      s.gL={open:.2+.4*open};s.gR={open:.2+.4*open};
      if(t>=70&&t<74.5){ // 上步台唇：1.2m 两步
        s.walk={from:[0,-2.2],to:[0,-1.0]};
        s.rootZ=mix(-2.2,-1.0,ease(clamp((t-70)/4)));
      }else if(t>=74.5){s.rootZ=-1.0;}
      break;
    }
    case 'talk_2a':{ // 安静一拍：垂手，看侧台（+x 翼门）
      s.rootZ=-1.0;s.emotion='neutral';s.acting={focus:.3};
      s.headYaw=.55*ease(clamp((t-100.5)/1.2));s.yaw=.35*ease(clamp((t-101)/1.5));
      s.headPitch=.02;
      break;
    }
    case 'talk_2b':{ // 回正：「……再来一首？」
      s.rootZ=-1.0;s.emotion='smile';
      s.headYaw=.55*(1-ease(clamp((t-109)/1.2)));s.yaw=.35*(1-ease(clamp((t-109.5)/1.5)));
      s.headPitch=key(t,[[108,.02],[110,-.06],[114,-.04]]);
      break;
    }
    case 'song_2':{ // 二重唱：台唇左侧，与小灯对视半场
      s.rootX=-.4;s.rootZ=-1.0;s.emotion='smile';s.acting={focus:.5};
      s.sway=.018;
      s.yaw=.22*ease(clamp((t-116)/3))*(.6+.4*Math.sin(t*.5));
      s.headPitch=-.02;
      const open=ease(clamp((t-130)/6))*ease(clamp((156-t)/5));
      s.left=blend(V(-.12,1.14,.12),V(-.26,1.20,.10),open);
      s.right=blend(V(.12,1.14,.12),V(.26,1.20,.10),open);
      s.leftPole=blend(V(-.25,-.65,-.5),V(-.4,-.6,-.2),open);s.rightPole=blend(V(.25,-.65,-.5),V(.4,-.6,-.2),open);
      s.gL={open:.2+.3*open};s.gR={open:.2+.3*open};
      break;
    }
    case 'bow':case 'card_close':{ // 鞠躬：lean+沉髋+低头+手臂前垂（正面 POV 读法）
      const b=ease(clamp((t-160.2)/1.3))*(1-ease(clamp((t-165)/1.2)));
      s.rootX=-.4;s.rootZ=-1.0;s.emotion='smile';
      s.lean=.5*b;s.hipY=.88-.06*b;s.headPitch=.45*b;
      s.left=V(-.13,.98,.16);s.right=V(.13,.98,.16);
      s.sway=0;s.yaw=0;
      break;
    }
  }
  return s;
}

// ── 小灯（冷静→鼓励→笑；手电=道具状态机）──
function specDeng(id,t){
  const s={rootX:3.4,rootZ:-2.0,yaw:-.4,bob:0,lean:0,headYaw:0,headPitch:0,headRoll:0,
    left:V(-.14,.97,.06),right:V(.14,.97,.06),
    emotion:'neutral',acting:null,tremble:0,sway:0,visible:true,gL:null,gR:null,walk:null};
  switch(id){
    case 'card_open':case 'house_hint':s.visible=false;break;
    case 'curtain_open':case 'talk_1':case 'song_1a':{ // 翼门灯控位剪影（隐约）
      s.emotion='neutral';s.headPitch=.06;s.headYaw=-.35; // 面向台中
      break;
    }
    case 'song_1b':{ // 追光呼吸段：上身前倾盯台中（操作追光的专注）
      s.emotion='focus';s.acting={focus:.8};
      s.lean=.08;s.headPitch=.02;s.headYaw=-.4;
      s.right=V(.16,1.02,.14); // 手在灯控台推子上
      break;
    }
    case 'song_1c':{s.emotion='focus';s.acting={focus:.6};s.lean=.05;s.headYaw=-.3;
      s.right=V(.16,1.02,.14);break;}
    case 'talk_2a':{ // 取手电（102.8-103.6 右手落腰侧）→ 举起（105 到位）
      s.emotion='focus';s.acting={focus:.5};
      const grab=ease(clamp((t-102.8)/.8)),raise=ease(clamp((t-103.8)/1.2));
      s.right=blend(blend(V(.14,.97,.06),V(.15,1.00,.10),grab),V(.20,1.34,.16),raise);
      s.rightPole=V(.3,-.2,.6); // 举手电肘向前下（别架肘）
      s.gR={fist:.5};
      s.headYaw=-.15;
      break;
    }
    case 'talk_2b':{s.emotion='smile';s.right=V(.20,1.34,.16);s.rightPole=V(.3,-.2,.6);s.gR={fist:.5};s.headYaw=-.15;break;}
    case 'song_2':{ // 持手灯从翼门口上台：翼门缺口内 z=-2.0 直线横插 SR（两段式拐弯=步频域
      // 翻车+翼幕擦碰实录）；面朝行进方向（gait heading 断言），到位转身
      s.emotion='smile';s.acting={focus:.4};
      s.gR={fist:.5};s.rightPole=V(.35,-.6,-.3); // 持灯肘收前下（不架肘不凸出侧影）
      if(t<121){
        s.walk={from:[3.4,-2.0],to:[1.3,-2.0],facingYaw:-1.57};
        const w=ease(clamp((t-115)/6));
        s.rootX=mix(3.4,1.3,w);s.rootZ=-2.0;s.yaw=-1.57;
        s.right=V(.18,1.10,.14); // 手灯胸前照路
      }
      if(t>=121){s.walk=null;s.rootX=1.3;s.rootZ=-1.9;s.yaw=.15;s.sway=.016; // 到位转身面向观众
        s.rootZ=mix(-2.0,-1.9,ease(clamp((t-121)/1.5)));
        const open=ease(clamp((t-132)/6))*ease(clamp((156-t)/5));
        s.right=blend(V(.18,1.10,.14),V(.24,1.16,.10),open);
        s.left=blend(V(-.14,.97,.06),V(-.24,1.14,.10),open);
        s.leftPole=blend(V(-.25,-.65,-.5),V(-.4,-.6,-.2),open);
        s.rightPole=blend(V(.35,-.6,-.3),V(.4,-.6,-.2),open);
        s.gL={open:.2+.3*open};
      }
      break;
    }
    case 'bow':case 'card_close':{ // 鞠躬比阿拍晚 0.2s（跟随）
      const b=ease(clamp((t-160.4)/1.3))*(1-ease(clamp((t-165.2)/1.2)));
      s.rootX=.9;s.rootZ=-1.2;s.emotion='smile';
      s.lean=.48*b;s.hipY=.82-.05*b;s.headPitch=.42*b;
      s.left=V(-.12,.94,.13);s.right=V(.14,.94,.14);s.rightPole=V(.35,-.6,-.3); // 手电仍握在右手（垂）
      s.sway=0;s.yaw=.15;
      break;
    }
  }
  return s;
}

// ── 装置：幕布/追光/脚灯/手电光（纯时间函数；P1 已验收逻辑保留）──
function rigAt(id,t,pA,pD){
  const curtainK=key(t,[[0,0],[8,0],[11,1],[165.8,1],[168.8,0],[170,0]]);
  const footOn=key(t,[[0,0],[2.5,0],[3.2,1],[167.5,1],[168.5,0]]);
  let on=key(t,[[0,0],[11.5,0],[12.3,1],[166.5,1],[168.3,0]]),breathe=0;
  let tx=pA.rootX,tz=pA.rootZ;
  if(t>=30&&t<36){ // 迟疑：灯晚跟且暗抖
    const h=ease(clamp((t-30.5)/1.5))*(1-ease(clamp((t-34.5)/1.5)));
    on*=1-.4*h;tx+=.8*h;tz+=.4*h;breathe=.05*h*Math.sin(t*9);
  }else if(t>=36&&t<50){ // 明暗呼吸 2.4s 周期
    const ramp=ease(clamp((t-36)/2));
    breathe=.26*ramp*Math.sin((t-36)*Math.PI*2/2.4);
    const back=ease(clamp((t-36)/4));
    tx=mix(pA.rootX+.8*(1-back),pA.rootX,back);tz=mix(pA.rootZ+.4*(1-back),pA.rootZ,back);
  }
  const spot1={x:tx,y:1.0,z:tz,on,breathe};
  const on2=key(t,[[0,0],[114.5,0],[115.5,1],[166.5,1],[168.3,0]]);
  const spot2={x:pD.rootX,y:1.0,z:pD.rootZ,on:on2,breathe:0};
  const lampOn=key(t,[[0,0],[103,0],[105,1],[166,1],[167.8,0]]);
  return {curtainK,spot1,spot2,lampOn,footOn};
}

export function poseAt(entries,t){
  const entry=entries.findLast(e=>e.start<=t)??entries[0];
  const id=entry.move;
  const sA=specApai(id,t),sD=specDeng(id,t);
  // 冻结=次级运动清零（唱砸僵住读法）
  sA.bob+=Math.sin(t*13.1)*(sA.tremble??0)*(1-(sA.freeze??0));
  if(sA.freeze)sA.sway*=(1-sA.freeze);
  sA.lean=(sA.lean??0)+Math.sin(t*1.9)*(sA.sway??0);
  sD.lean=(sD.lean??0)+Math.sin(t*1.7+1.1)*(sD.sway??0);
  return {entry,id,sA,sD,...rigAt(id,t,sA,sD),
    card:entry.kind==='card'?entry.card:null};
}

// ── 驱动入口（viewer 每帧调）：buildPose 写进角色并返回 pose（探针用）──
export function driveFrame(apai,deng,perf,t){
  const pA=buildPose(apai,perf.sA,t,DIMS_APAI),pD=buildPose(deng,perf.sD,t,DIMS_DENG);
  return {pA,pD};
}
