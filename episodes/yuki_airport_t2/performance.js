import * as THREE from 'three';
import {samplePose3D,twoBone} from '/craft/pose3d.js';
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,u)=>a+(b-a)*u,V=(x,y,z=0)=>({x,y,z}),blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));
const idle={left:V(-.228,.713,.035),right:V(.228,.713,.035)};
// 站位：主舞台原点；值机示范岛 (-1.7,-2.8)；座椅排 x 1..3.6 / z 2.6；洗手间 (3.5,-2.4)
const YAW_CHECKIN=-1.9,YAW_SEAT=.785,YAW_RESTROOM=1.7,YAW_SEA=Math.PI;

function spec(phase,u,dt,t){
 const s={rootX:-.5,rootZ:.2,yaw:0,bob:0,left:{...idle.left},right:{...idle.right},
  headYaw:.10,headPitch:0,headRoll:0,point:0,fist:0,open:0,emotion:'neutral',gaze:0,walk:null,
  suitcase:'park',pitch:0,roll:0};
 const move=(from,to,a)=>{a=clamp(a);if(a<1)s.walk={from,to,a};s.rootX=mix(from[0],to[0],ease(a));s.rootZ=mix(from[1],to[1],ease(a));};
 switch(phase){
  case 'establish':{ // 拖行李箱入场（左→中），左手向镜头挥手
   move([-2.3,.55],[-.5,.2],u/.85);
   s.suitcase='pull';
   s.left=V(-.36,1.12+.05*Math.sin(t*6.5),.14);s.open=.85;s.emotion='happy';s.headRoll=.05;
   s.right=V(.34,.74,-.16); // 身后拉箱
   break;
  }
  case 'guide_wave':{
   s.right=V(.36,1.16+.055*Math.sin(t*6.5),.16);s.open=.85;s.emotion='happy';
   s.left=V(-.26,.80,.12);s.headYaw=.08;s.headRoll=.045*Math.sin(t*1.8);
   break;
  }
  case 'talk':{
   s.right=V(.29,.86,.17);s.left=V(-.25,.78,.10);s.emotion='happy';s.headYaw=.22;s.headPitch=.08;
   break;
  }
  case 'beg':{ // 听猫要出场费，低头看它
   s.headPitch=.15;s.headYaw=.26;s.emotion='happy';s.right=V(.26,.82,.14);s.left=V(-.24,.76,.08);
   break;
  }
  case 'cat_climb':{ // 还望着屋顶笑
   s.headPitch=-.16;s.emotion='happy';s.headRoll=.04;break;
  }
  case 'cat_kiosk':{s.headPitch=.12;s.headYaw=.24;s.emotion='happy';break;}
  case 'peek':{s.headPitch=.12;s.headYaw=.28;s.emotion='neutral';break;}
  case 'smug':{s.headRoll=-.07;s.headPitch=.10;s.emotion='worry';break;}
  case 'point_up':case 'point_up2':{ // 仰头指马鞍墙吊顶 / 树叶屏
   s.right=V(.30,1.36,.14);s.point=1;s.headPitch=-.26;s.headYaw=phase==='point_up2'?.16:.02;
   s.emotion='happy';s.left=V(-.24,.76,.08);s.headRoll=-.03;
   break;
  }
  case 'sea_point':{ // 转身向玻璃幕墙外的海
   s.yaw=YAW_SEA;s.right=V(.25,1.02,.24);s.point=1;s.headPitch=-.04;s.emotion='happy';
   s.left=V(-.24,.76,.06);
   break;
  }
  case 'sea_listen':{s.yaw=YAW_SEA;s.headRoll=.06;s.emotion='happy';break;}
  case 'gtc_ask':{s.yaw=YAW_SEA;s.headPitch=.05;s.emotion='neutral';break;} // 一起看窗外工地
  case 'gtc_tell':{ // 指向 GTC 讲解
   s.yaw=YAW_SEA-.28;s.right=V(.27,1.10,.24);s.point=1;s.headPitch=-.02;s.emotion='happy';
   s.left=V(-.24,.76,.06);
   break;
  }
  case 'gtc_punch':{s.yaw=YAW_SEA;s.headRoll=.06;s.emotion='happy';break;}
  case 'checkin_push':{ // 转身把行李箱推上零高差行李带
   s.yaw=YAW_CHECKIN;
   if(u<.25){s.right=V(.33,.80,-.10);s.left=V(-.20,.78,.05);s.emotion='happy';}
   else{
    const a=ease((u-.25)/.45);s.suitcase='push';s.suitcaseA=a;
    s.bob=-.055*a;s.pitch=.07*a;
    s.left=V(-.10,.86-.10*a,.30+.10*a);s.right=V(.16,.86-.10*a,.30+.10*a);s.fist=.5*a;
    s.headPitch=.10;s.emotion='happy';
   }
   break;
  }
  case 'checkin_idle':{s.yaw=-2.35;s.headPitch=.16;s.emotion='happy';s.headYaw=.1;break;}
  case 'seat_usb':{ // 走到座椅排前，指向扶手上的 USB 口
   move([-.5,.2],[.8,1.15],dt/1.3);
   s.yaw=YAW_SEAT;s.right=V(.30,.78,.27);s.point=1;s.headPitch=.14;s.emotion='smug';
   s.left=V(-.22,.78,.08);
   break;
  }
  case 'seat_talk':{s.rootX=.8;s.rootZ=1.15;s.yaw=YAW_SEAT;s.headPitch=.13;s.headYaw=.12;s.emotion='happy';break;}
  case 'explain':{ // 走向洗手间方向并指向它
   move([.8,1.15],[1.2,-.3],dt/2.4);
   s.yaw=YAW_RESTROOM;s.right=V(.30,1.00,.24);s.point=1;s.emotion='smug';s.headYaw=.05;
   break;
  }
  case 'press_watch':{s.rootX=1.2;s.rootZ=-.3;s.yaw=YAW_RESTROOM;s.headPitch=.10;s.emotion='happy';s.left=V(-.24,.80,.12);s.right=V(.24,.80,.12);break;}
  case 'finale_proud':{ // 走回主舞台，大数字总结，双手张开
   move([1.2,-.3],[-.5,.2],u/.3);
   s.left=V(-.30,1.10,.13);s.right=V(.30,1.10,.13);s.open=1;s.emotion='happy';
   s.bob=.018*Math.sin(t*3.2);s.headRoll=.04*Math.sin(t*2.1);
   break;
  }
  case 'speechless':{
   s.emotion=u<.45?'shock':'worry';s.headPitch=.07;s.headRoll=-.06;
   s.left=V(-.26,.88,.18);s.right=V(.26,.88,.18);s.open=.6;
   break;
  }
  case 'outro':{ // 向登机口/海的方向走远（空手：箱子已托运；左偏避开自助机与值机岛）
   move([-.5,.2],[-.6,-7.8],u/.75);
   s.yaw=YAW_SEA;
   if(u<.18){s.left=V(-.36,1.14+.05*Math.sin(t*6.5),.10);s.open=.85;s.headYaw=.5;} // 回头挥手
   s.emotion='happy';
   break;
  }
 }
 return s;
}

export function poseAt(actor,entries,t){
 const entry=entries.findLast(e=>e.startTime<=t)??entries[0],i=entries.indexOf(entry),opts=entry.storyEvents[0].options;
 const dt=t-entry.startTime,u=clamp(dt/(entry.endTime-entry.startTime));
 let s=spec(opts.move,u,dt,t);
 if(i&&dt<.32){const prev=entries[i-1],old=spec(prev.storyEvents[0].options.move,1,prev.endTime-prev.startTime,prev.endTime);
  const a=ease(dt/.32);for(const key of ['rootX','rootZ','yaw','bob','headYaw','headRoll','headPitch','fist','open','point','pitch','roll'])s[key]=mix(old[key],s[key],a);
  s.left=blend(old.left,s.left,a);s.right=blend(old.right,s.right,a);
  if(old.suitcase==='pull'&&s.suitcase==='park')s.suitcase='pull'; // 交接瞬间不跳变
 }
 const p=samplePose3D(t,'idle',entries.at(-1).endTime);
 Object.assign(p,{rootX:s.rootX,yaw:s.yaw,headYaw:s.headYaw,headRoll:s.headRoll,headPitch:s.headPitch,point:s.point,bob:s.bob,hipY:.6925+s.bob});
 if(s.walk){
  for(const [side,sign] of [['left',-1],['right',1]]){
   // 原地踏步 + 平移（craft3d 口径）：长距离位移下脚掌不做世界锚定
   const ph=t*4.4+(sign===-1?0:Math.PI),foot=p[side+'Leg'][2],hip=p[side+'Leg'][0];
   foot.y+=.06*Math.max(0,Math.sin(ph));foot.z+=.06*Math.sin(ph-.5);
   // 腿长到顶（0.6）前收髋，永不超程
   const dx=foot.x-hip.x,dz=foot.z-hip.z,dy=hip.y-foot.y;
   const len=Math.hypot(dx,dy,dz);
   if(len>.596)p.hipY=Math.min(p.hipY,foot.y+Math.sqrt(Math.max(.01,.596**2-dx*dx-dz*dz)));
  }
  p.bob=s.bob=p.hipY-.6925;
 }
 p.blink=Math.max(0,1-Math.abs((t%3.9)-3.6)/.12);
 if(p.bob>0){p.leftLeg[2].y+=p.bob;p.rightLeg[2].y+=p.bob;} // 正 bob=小跳，双脚离地保持腿长
 for(const [side,sign] of [['left',-1],['right',1]]){
  const shoulder=V(sign*.175,1.075+s.bob),target=V(s[side].x,s[side].y+s.bob,s[side].z),delta=new THREE.Vector3(target.x-shoulder.x,target.y-shoulder.y,target.z);
  if(delta.length()>.363){delta.setLength(.363);Object.assign(target,V(shoulder.x+delta.x,shoulder.y+delta.y,shoulder.z+delta.z));}
  p[side+'Arm']=[shoulder,twoBone(shoulder,target,V(sign*.25,-.65,-.5),.19,.18),target];
  p[side+'Leg'][0].y=p.hipY;p[side+'Leg'][1]=twoBone(p[side+'Leg'][0],p[side+'Leg'][2],V(0,0,1),.305,.295);
 }
 actor.mesh.position.z=s.rootZ;actor.setPose(p);
 actor.mesh.rotation.x=s.pitch??0;actor.mesh.rotation.z=s.roll??0;
 actor.hands.left.setGesture({fist:s.fist,open:s.open});actor.hands.right.setGesture({fist:s.fist,open:s.open,point:s.point});
 actor.mesh.updateMatrixWorld(true);
 const hands=['left','right'].map(side=>actor.hands[side].localToWorld(new THREE.Vector3(.027,0,.006)).toArray());
 return {entry,i,opts,phase:opts.move,dt,u,p,s,hands};
}

// ── 年糕 ──────────────────────────────────────────────────────
const CAT_HOME=[.62,0,.12],CAT_SEAT=[2.28,.465,2.6],CAT_PAD=[3.05,0,-1.45],CAT_CHECKIN=[-1.15,0,-1.0];
function catReset(cat,t){
 cat.mesh.position.set(...CAT_HOME);cat.mesh.rotation.set(0,0,0);cat.mesh.scale.set(1,1,1);
 cat.headGroup.position.set(0,cat.headBaseY,.22);cat.headGroup.rotation.set(0,0,0);
 for(const limb of [cat.leftArm,cat.rightArm,cat.leftLeg,cat.rightLeg])limb.rotation.set(0,0,0);
 cat.leftEyelid.scale.set(1.05,.55,.5);cat.rightEyelid.scale.set(1.05,.55,.5);
 cat.tail.rotation.set(0,.20*Math.sin(t*1.4),0);
}
function trot(cat,t){ // 小跑：起伏 + 前爪摆动
 cat.mesh.position.y=.035*Math.abs(Math.sin(t*9));
 cat.leftArm.rotation.x=.35*Math.sin(t*9);cat.rightArm.rotation.x=-.35*Math.sin(t*9);
 cat.tail.rotation.set(0,.30*Math.sin(t*5),0);
}
function walkTo(cat,from,to,a,t){
 a=ease(a);
 cat.mesh.position.set(mix(from[0],to[0],a),mix(from[1],to[1],a),mix(from[2],to[2],a));
 const dx=to[0]-from[0],dz=to[2]-from[2];
 if(Math.hypot(dx,dz)>.01&&a<1)cat.mesh.rotation.y=Math.atan2(dx,dz);
 if(a<1)trot(cat,t);
}
export function poseCat(cat,move,dt,u,t,ctx={}){
 catReset(cat,t);
 const pawL=[-.205,.073,.415],pawR=[.205,.073,.415];
 let pawTargets=null;
 switch(move){
  case 'trot_follow':{ // 跟着小雪进场
   const y=ctx.yuki??[-.5,.2];
   cat.mesh.position.set(y[0]+1.0,.035*Math.abs(Math.sin(t*9)),y[1]+.15);
   cat.mesh.rotation.y=Math.PI/2;trot(cat,t);cat.mesh.rotation.y=Math.PI/2;
   cat.headGroup.rotation.y=-.5; // 头朝镜头（身体侧行，头转 ≤60°）
   break;
  }
  case 'gtc_watch':{ // 转身看窗外的 GTC 工地（背身+回头 3/4，猫头可达域内）
   cat.mesh.rotation.y=Math.PI*ease(Math.min(1,dt/.5));
   cat.headGroup.rotation.y=.55;cat.headGroup.rotation.x=-.06;
   cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.7;
   break;
  }
  case 'gtc_back':{ // 转回镜头前冷面吐槽
   cat.mesh.rotation.y=Math.PI*(1-ease(Math.min(1,dt/.45)));
   cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.3;
   cat.headGroup.rotation.z=.07;
   break;
  }
  case 'beg':{ // 要出场费：右爪前伸
   pawTargets=[pawL,[.10,.36,.44]];
   cat.headGroup.rotation.z=.10;cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.75;
   cat.headGroup.rotation.x=-.06;
   break;
  }
  case 'talk':
   cat.headGroup.rotation.z=.07*Math.sin(dt*2);cat.headGroup.rotation.y=-.08;break;
  case 'logic':{ // “逻辑闭环”：面向镜头，左爪举起
   pawTargets=[[-.10,.37,.44],pawR];
   cat.headGroup.rotation.z=-.10;cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.3;
   break;
  }
  case 'follow_checkin':{walkTo(cat,CAT_HOME,CAT_CHECKIN,clamp(dt/2.2),t);
   if(dt>=2.2){cat.mesh.position.set(...CAT_CHECKIN);cat.mesh.rotation.y=YAW_CHECKIN;}break;}
  case 'talk_checkin':{
   cat.mesh.position.set(...CAT_CHECKIN);cat.mesh.rotation.y=YAW_CHECKIN+1.5; // 抬头看柜台/小雪
   cat.headGroup.rotation.x=-.16;
   pawTargets=[pawL,[.16,.16,.46]];
   break;
  }
  case 'walk_seat':{
   if(u<.82){walkTo(cat,CAT_CHECKIN,[CAT_SEAT[0]-.35,0,CAT_SEAT[2]-.4],u/.82,t);}
   else{ // 跳上座位
    const a=ease((u-.82)/.18);
    cat.mesh.position.set(mix(CAT_SEAT[0]-.35,CAT_SEAT[0],a),.465*ease(Math.min(1,(u-.82)/.10))+ .10*Math.sin(Math.PI*a),mix(CAT_SEAT[2]-.4,CAT_SEAT[2],a));
    cat.mesh.rotation.y=mix(-.9,0,a);
   }
   break;
  }
  case 'cat_phone':{ // 瘫坐候机椅举手机
   cat.mesh.position.set(...CAT_SEAT);cat.mesh.rotation.y=-.30;
   cat.mesh.rotation.x=-.06; // 瘫靠
   cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.32;
   cat.headGroup.rotation.y=.18;cat.headGroup.rotation.x=.05;cat.headGroup.rotation.z=-.06;
   pawTargets=[[-.04,.30,.42],[.22,.05,.40]];
   cat.tail.rotation.set(.25,.08*Math.sin(t*1.2),0);
   break;
  }
  case 'walk_restroom':{
   if(u<.14){const a=ease(u/.14);cat.mesh.position.set(CAT_SEAT[0],.465*(1-a)+.08*Math.sin(Math.PI*a),CAT_SEAT[2]);cat.mesh.rotation.y=-.5;}
   else walkTo(cat,[CAT_SEAT[0],0,CAT_SEAT[2]],CAT_PAD,(u-.14)/.82,t);
   if(u>=.96){cat.mesh.position.set(...CAT_PAD);cat.mesh.rotation.y=-1.04;}
   break;
  }
  case 'paw_press':{ // 按爪印（面板世界坐标由 ctx.padWorld 给入，先定姿态再求局部坐标）
   cat.mesh.position.set(...CAT_PAD);cat.mesh.rotation.y=-1.04;
   cat.mesh.updateMatrixWorld(true);
   const press=u<.18?ease(u/.18):u<.42?1:u<.52?1-ease((u-.42)/.10):u<.62?ease((u-.52)/.10):1;
   if(ctx.padWorld){
    const lp=cat.mesh.worldToLocal(ctx.padWorld.clone());
    pawTargets=[pawL,[lp.x,mix(.10,lp.y,press),mix(.30,lp.z,press)]];
   }
   cat.headGroup.rotation.x=-.05;cat.headGroup.rotation.y=.15;
   cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=u>.6?.2:.45;
   if(u>.8)cat.headGroup.rotation.z=-.08; // 识别成功的小得意
   break;
  }
  case 'walk_back':{walkTo(cat,CAT_PAD,CAT_HOME,clamp(dt/3.4),t);
   if(dt>=3.4){cat.mesh.position.set(...CAT_HOME);cat.mesh.rotation.y=0;}break;}
  case 'peek':{ // 探头（往纪念品商店方向的好奇）
   cat.mesh.rotation.z=.10;cat.mesh.position.x-=.10;
   cat.headGroup.rotation.y=.42;cat.headGroup.rotation.x=.10;
   cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.3;
   pawTargets=[pawL,[.20,.30,.38]];
   break;
  }
  case 'smug':{
   cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.25;
   cat.headGroup.rotation.z=.09;cat.headGroup.rotation.y=-.10;
   cat.tail.rotation.set(0,.34*Math.sin(t*3.2),0);
   break;
  }
  case 'outro':{ // 跟小雪走向登机口/海（走她左侧，避开自助机）
   const y=ctx.yuki??[-.5,.2];
   const done=u>=.75;
   cat.mesh.position.set(y[0]-.75,done?0:.035*Math.abs(Math.sin(t*9)),y[1]+.35);
   cat.mesh.rotation.y=Math.PI;cat.headGroup.rotation.x=-.05;
   if(!done){cat.leftArm.rotation.x=.3*Math.sin(t*9);cat.rightArm.rotation.x=-.3*Math.sin(t*9);}
   break;
  }
 }
 if(pawTargets){cat.setForepaw('leftArm',pawTargets[0]);cat.setForepaw('rightArm',pawTargets[1]);}
 else{cat.setForepaw('leftArm',pawL);cat.setForepaw('rightArm',pawR);}
 cat.mesh.updateMatrixWorld(true);
 // 周期眨眼
 const blink=Math.max(0,1-Math.abs((t%4.6)-4.15)/.12);
 cat.leftEyelid.scale.y=Math.max(blink,cat.leftEyelid.scale.y);
 cat.rightEyelid.scale.y=Math.max(blink,cat.rightEyelid.scale.y);
 return {pos:cat.mesh.position.toArray()};
}
