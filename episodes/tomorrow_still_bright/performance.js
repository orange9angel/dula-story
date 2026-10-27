// 《明天还会亮》T1 表演谱：32 镜运镜表 + M-07 逐镜表演 + 眼光圈状态轨 + 道具时间线。
import * as THREE from 'three';
// 关键节拍（bible 五节，绝对秒锁定）：
//   腿部喜剧 s03：车轮 34s 静 → 1s 静默 → 38s 左腿吱响（bob 下沉脉冲）→ 低头两秒；
//   失效电池 s14：209.5 眼光亮(100% 标签) → 212.5 光圈缩(0%) → 静止 3s(212.5→216.5) → 放回；
//   焊接保护 s24：367.2 火星瞬间左手伸出遮挡 → 369.5 意识到小苗不在 → 370.5→373.5 缓慢收回；
//   触叶 s31：467→468.2 伸(1.2s) → 468.2→469.0 停(0.8s，距叶 1cm) → 469.0→470.8 收(1.8s)；
//   结尾 s30：454→458 先看窗外 → 458→461 再看小苗（身体微转）→ 461→464 落座肩部放松。
// 纪律：(t,state) 纯函数；道具/状态机先于姿势求解；冻结与"不动"显式写。
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const mix=(a,b,u)=>a+(b-a)*u;
const V=(x,y,z=0)=>({x,y,z});
const angDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const angLerp=(a,b,u)=>a+angDelta(a,b)*clamp(u);

export function beatAt(segments,t){
  const i=segments.findIndex(s=>t>=s.start&&t<s.end);
  const idx=i<0?segments.length-1:i,seg=segments[idx];
  return {seg,i:idx,u:clamp((t-seg.start)/(seg.end-seg.start))};
}

// ── 运镜锚点表：scene → shot → {pos,look,fov}（终态构图；move 决定到达方式）──
export const ANCHORS={
  exterior:{
    station_far:{pos:[0,8,6],look:[0,4,-48],fov:42},
    departure:{pos:[-8,10,-4],look:[4,4,-48],fov:40},
    dawn_final:{pos:[-6,12,4],look:[24,-8,-80],fov:46},
    wide:{pos:[0,8,10],look:[0,4,-48],fov:48},
  },
  corridor:{
    corridor_track:{pos:[1.9,1.1,1.2],look:[0.7,0.5,-3.5],fov:42},
    legs_mid:{pos:[2.2,0.85,-1.6],look:[1.0,0.5,-4],fov:32},
    lights_off:{pos:[0,1.4,3.5],look:[1.2,0.9,-6],fov:44},
    drawing_close:{pos:[-0.6,1.1,-3.6],look:[-1.99,1.25,-5.2],fov:30},
    shutdown_cuts:{pos:[0.9,1.1,-21.2],look:[1.9,0.9,-24],fov:34},
    greenhouse_door:{pos:[0,1.1,-21],look:[0,1.1,-29.9],fov:40},
    wide:{pos:[0,1.6,4],look:[0,1,-14],fov:48},
  },
  greenhouse:{
    finger_switch:{pos:[4.5,1.1,-0.5],look:[4.85,0.72,-1.2],fov:32},   // M-07 主观（眼后上方俯视：指尖+开关；T2 再收头灯入画程度）
    sprout_macro:{pos:[-1.05,0.95,-6.85],look:[-1.5,0.88,-7.6],fov:18},
    eye_close:{pos:[-1.05,0.85,-6.55],look:[-1.42,0.8,-7.3],fov:16},
    hand_hesitate:{pos:[3.9,0.95,-2.3],look:[4.75,0.8,-1],fov:26},
    lamp_side:{pos:[-0.55,0.95,-6.6],look:[-1.3,0.8,-7.6],fov:24},
    wide:{pos:[0,1.6,1.5],look:[-0.5,0.9,-7],fov:48},
  },
  warehouse:{
    drawers:{pos:[0.9,1.0,-5.4],look:[-0.6,0.55,-7.0],fov:34},
    battery_close:{pos:[0.2,0.95,-5.9],look:[0.62,0.55,-6.9],fov:26},
    big_battery:{pos:[2.8,1.5,-1.0],look:[-0.4,0.35,-4.5],fov:40},
    screw_pickup:{pos:[1.1,0.22,-1.1],look:[1.75,0.06,-2.0],fov:26},
    workbench:{pos:[2.0,1.15,-1.5],look:[3.4,0.75,-3],fov:32},
    welding:{pos:[-0.9,1.0,-1.7],look:[-2,0.72,-3],fov:26},
    wide:{pos:[0,1.6,1.2],look:[0,0.8,-6],fov:48},
  },
  lounge:{
    holo_photo:{pos:[0,1.1,-0.6],look:[0,1.5,-5.98],fov:36},
    photo_close:{pos:[0.6,1.35,-3.9],look:[0,1.55,-5.98],fov:24},
    music_box:{pos:[0.9,1.0,-0.9],look:[1.45,0.78,-2],fov:24},
    wide:{pos:[0,1.5,1.5],look:[0,1,-4],fov:48},
  },
  powerroom:{
    aux_battery:{pos:[0.9,1.15,-3.2],look:[0,0.8,-5.7],fov:30},
    hand_retract:{pos:[0.45,0.95,-4.5],look:[0,0.8,-5.55],fov:22},
    chest_panel:{pos:[0.55,0.7,-2.6],look:[0,0.48,-3.5],fov:20},
    wide:{pos:[0,1.5,1.2],look:[0,0.9,-5],fov:48},
  },
  cockpit:{
    reading_light:{pos:[0.2,1.05,-1.6],look:[-1.3,0.8,-3.3],fov:30},
    cup_foam:{pos:[-0.5,1.0,-2.2],look:[-1.2,0.75,-3.2],fov:24},
    habitat:{pos:[-0.35,1.0,-2.15],look:[-1.25,0.8,-3.2],fov:24},
    look_back:{pos:[1.5,1.05,0.9],look:[-0.3,0.6,-1.5],fov:34},
    sit_beside:{pos:[-0.2,0.95,-1.9],look:[-1.3,0.55,-3.0],fov:30},
    hand_leaf:{pos:[-0.75,1.0,-2.15],look:[-1.3,0.88,-3.25],fov:20},
    wide:{pos:[1.8,1.3,1.5],look:[-0.6,0.7,-3],fov:44},
  },
};

// move → 相机运动（锚点是拍内终态；macro/low/pov/hold 由锚点本身编码景别）
export function cameraFor(seg,u){
  const table=ANCHORS[seg.scene]??{};
  const a=table[seg.shot]??table.wide;
  const e=ease(u);
  const dir=(()=>{const d=[a.pos[0]-a.look[0],a.pos[1]-a.look[1],a.pos[2]-a.look[2]];
    const n=Math.hypot(...d)||1;return d.map(x=>x/n);})();
  switch(seg.move){
    case 'push_slow':{
      const k=seg.scene==='exterior'?6:0.9;
      return {pos:a.pos.map((v,i)=>v+dir[i]*k*(1-e)),look:a.look,fov:a.fov};
    }
    case 'pull_far':{
      const k=10;
      return {pos:a.pos.map((v,i)=>v-dir[i]*k*(1-e)),look:a.look,fov:a.fov};
    }
    case 'pan':{
      const k=1.2;
      return {pos:[a.pos[0]-k+2*k*e,a.pos[1],a.pos[2]],
        look:[a.look[0]-k*.5+k*e,a.look[1],a.look[2]],fov:a.fov};
    }
    case 'follow':{
      const k=.55;
      return {pos:a.pos.map((v,i)=>v+dir[i]*k*(1-e)),look:a.look,fov:a.fov};
    }
    case 'pov':{ // 主观：极缓推向目标（指尖逼近感）
      const k=.12;
      return {pos:a.pos.map((v,i)=>v-dir[i]*k*e),look:a.look,fov:a.fov};
    }
    case 'montage':case 'slow_drift':{
      const k=.3;
      return {pos:[a.pos[0]-k+2*k*e,a.pos[1],a.pos[2]],look:a.look,fov:a.fov};
    }
    case 'hold':case 'macro':case 'low':default:
      return {pos:a.pos,look:a.look,fov:a.fov};
  }
}

// ── 微关键帧插值器（借 borrowed_moonlight：航点+累积，patch 间 ease 混合）──
const isV=o=>o&&typeof o==='object'&&'x' in o&&'y' in o;
function blendPatch(a,b,u){
  const o={...a};
  for(const k in b){
    const x=a[k],y=b[k];
    if(y==null||x==null){o[k]=u<.5?x:y??x;continue;}
    if(typeof y==='number'&&typeof x==='number')o[k]=mix(x,y,u);
    else if(Array.isArray(x)&&Array.isArray(y))o[k]=x.map((v,i)=>mix(v,y[i],u));
    else if(isV(x)&&isV(y))o[k]={x:mix(x.x,b[k].x,u),y:mix(x.y,b[k].y,u),z:mix(x.z,b[k].z,u)};
    else o[k]=u<.5?x:y;
  }
  return o;
}
function cumKeys(keys){const out=[];let acc={};for(const [t,p] of keys){acc={...acc,...p};out.push([t,acc]);}return out;}
function keysAt(keys,t){
  if(t<=keys[0][0])return keys[0][1];
  const last=keys[keys.length-1];if(t>=last[0])return last[1];
  let i=0;while(keys[i+1][0]<=t)i++;
  const u=ease((t-keys[i][0])/(keys[i+1][0]-keys[i][0]));
  return blendPatch(keys[i][1],keys[i+1][1],u);
}
const yawAt=(keys,t)=>{ // [[t0,a0],...]：每个航点在到达时刻前 0.9s 内从上一角度缓转到位
  if(t<=keys[0][0])return keys[0][1];
  let a=keys[0][1];
  for(let i=1;i<keys.length;i++){
    if(t<keys[i][0])return angLerp(keys[i-1][1],keys[i][1],ease(clamp((t-(keys[i][0]-.9))/.9)));
    a=keys[i][1];
  }
  return a;
};

// ── 眼光圈状态轨（a=光圈缩放 g=发光 al=报警闪；全片累积航点）──
const EYE=cumKeys([
  [0,{a:1,g:.15,al:0}],
  [66,{a:1.1,g:.9,al:0}],[70,{a:1,g:.15,al:0}],                 // s05 扫描儿童画
  [128,{a:.7,g:.3,al:0}],[133,{a:1,g:.15,al:0}],                // s09 发现小苗的屏息
  [146,{a:1.15,g:1,al:0}],[152,{a:.75,g:.4,al:0}],[157,{a:1,g:.15,al:0}], // s10 生命扫描→2.1%
  [164,{a:.8,g:.2,al:0}],[172,{a:1,g:.15,al:0}],                // s11 犹豫
  [210.5,{a:1.15,g:1,al:0}],[212.5,{a:.45,g:.08,al:0}],         // s14 眼光先亮再缩
  [216.5,{a:.45,g:.08,al:0}],[218,{a:1,g:.15,al:0}],            //   静止 3s 后恢复
  [304,{a:1.05,g:.6,al:0}],[318,{a:.6,g:.25,al:0}],[326,{a:1,g:.15,al:0}], // s20/s21 想拆→收回
  [334,{a:.9,g:.5,al:1}],[342,{a:1,g:.15,al:0}],                // s22 CORE CRITICAL 报警闪
  [367.2,{a:1.05,g:.6,al:0}],[368.2,{a:.5,g:.3,al:0}],[373.5,{a:1,g:.15,al:0}], // s24 火星→愣住
  [384,{a:1.1,g:.8,al:0}],[388,{a:1,g:.2,al:0}],                // s25 暖光亮起
  [418,{a:1.05,g:.5,al:0}],[422,{a:1,g:.2,al:0}],               // s27 确认小苗安全
  [458,{a:1.1,g:.4,al:0}],[480,{a:1.1,g:.35,al:0}],             // s30/s31 柔和收尾
]);

// ── M-07 逐镜表演表（keys patch：left/right=手目标(机身局部) headYaw/headPitch/lean/bob/gL=左指蜷曲）──
const REST_L=V(-.20,.42,.06),REST_R=V(.20,.42,.06);
const B={
  s02:{walk:{from:[1.0,2.5],to:[1.0,-4],window:[18.5,29.5],strideFactor:.85},
    keys:[[18,{left:V(-.16,.56,.28),right:V(.16,.56,.28),headPitch:.05}], // 推车握把
      [29.5,{left:V(-.16,.56,.28),right:V(.16,.56,.28)}],
      [30,{bob:-.12,lean:.3,right:V(.15,.14,.3),left:V(-.20,.42,.06),headPitch:.3}], // 蹲下喷油（OIL_SPRAY@30）
      [32,{bob:-.12,lean:.3,right:V(.15,.14,.3),headPitch:.3}],
      [33.2,{bob:0,lean:0,right:V(.20,.42,.06),headPitch:.05}]]},
  s03:{pos:[1.0,-4],yaw:Math.PI,
    keys:[[34,{}],[38,{bob:-.035}],[38.7,{bob:0}],                  // 38 左腿吱响（1s 静默后）
      [39,{headPitch:.38}],[41.2,{headPitch:.38}],[43,{headPitch:.06}]]}, // 低头停两秒
  s04:{moves:[{from:[1.0,-4],to:[1.78,-2],window:[48.5,50.8]},
      {from:[1.78,-2],to:[1.78,-4.5],window:[51.6,54.1]},
      {from:[1.78,-4.5],to:[1.78,-7],window:[55.1,57.6]},
      {from:[1.78,-7],to:[1.78,-9.5],window:[58.6,61.1]}],
    yawKeys:[[48,Math.PI],[50.6,Math.PI/2],[52.4,Math.PI],[54,Math.PI/2],[55.6,Math.PI],[57.4,Math.PI/2],[59.2,Math.PI],[61,Math.PI/2],[62.5,Math.PI]],
    keys:[[48,{}],[50.6,{right:V(.05,.8,.22)}],[51.4,{right:V(.20,.42,.06)}],   // 开关1@51
      [53.9,{right:V(.05,.8,.22)}],[54.9,{right:V(.20,.42,.06)}],               // 开关2@54.5
      [57.4,{right:V(.05,.8,.22)}],[58.4,{right:V(.20,.42,.06)}],               // 开关3@58
      [60.9,{right:V(.05,.8,.22)}],[62,{right:V(.20,.42,.06)}]]},               // 开关4@61.5
  s05:{pos:[-1.1,-5.2],yaw:-Math.PI/2,
    keys:[[64,{headPitch:.05}],[66,{headPitch:.12,headYaw:.1}],                 // 扫描
      [70,{headYaw:-.12}],[74,{headYaw:.06}],[78,{headYaw:0,headPitch:.02}]]},  // 思考性缓慢偏头
  s06:{pos:[1.85,-24],yaw:Math.PI/2,
    keys:[[80,{}],[80.6,{right:V(.05,.85,.2),lean:.1}],[81.2,{right:V(.05,.7,.2),lean:.12}], // 扳闸@81
      [82,{right:V(.20,.42,.06),lean:0}],[84,{headPitch:-.35}],[86,{headPitch:-.35}],        // 抬头看风扇
      [89.5,{headPitch:.25}],[91,{headPitch:.25}],[93,{headPitch:.05}]]},                    // 螺丝落地低头
  s07:{walk:{from:[1.0,-4],to:[0.35,-29.45],window:[96.5,100.5],strideFactor:1.05},
    yawKeys:[[96,Math.PI]],
    keys:[[96.5,{headPitch:.02}],[100.3,{left:V(-.05,.7,.3),right:V(.05,.7,.3),lean:.08}], // 推门（DOOR_CREAK@102）
      [103.5,{left:V(-.05,.7,.3),right:V(.05,.7,.3),lean:.1}],
      [105,{left:REST_L,right:REST_R,lean:0}]]},
  s08:{pos:[4.62,-.85],yaw:2.21,
    keys:[[112,{left:V(-.20,.42,.06)}],[113,{left:V(-.12,.6,.2)}],
      [117,{left:V(-.05,.8,.25)}],                              // 三指指尖逼近（117 到位，距开关 6cm）
      [120,{left:V(-.05,.8,.25)}],                              // 停住——叶在晃（POV 留白）
      [124,{left:V(-.05,.8,.25)}]]},
  s09:{pos:[-1.45,-7.35],yaw:-2.94,
    keys:[[128,{headPitch:.1,lean:.1,left:V(-.12,.55,.2)}],     // 凑近看（微距镜）
      [133,{headPitch:.1,lean:.1}],
      [134.5,{headPitch:-.05,lean:-.06,bob:.02}],               // 散热风→立刻后退
      [136,{headPitch:-.02,lean:0,bob:0}]]},
  s10:{pos:[-1.35,-7.1],yaw:-2.9,
    keys:[[144,{headPitch:.05}],[146,{headPitch:.02}],[150,{headPitch:.08}],[155,{headPitch:.03}]]},
  s11:{pos:[4.62,-.85],yaw:2.21,
    keys:[[160,{left:V(-.20,.42,.06)}],[162,{left:V(-.12,.6,.2)}],
      [166,{left:V(-.05,.8,.25)}],                              // 伸向开关（EVA 催促）
      [168.5,{left:V(-.05,.8,.25)}],                            // 停住——第一次不按任务执行
      [172,{left:V(-.20,.42,.06)}],[176,{left:V(-.20,.42,.06)}]]}, // 缩回
  s12:{pos:[-1.1,-7.3],yaw:-2.8,
    keys:[[176.5,{}],[177.5,{right:V(.1,.75,.12)}],             // 取下头灯
      [181.5,{right:V(-.05,.82,.3)}],                           // 放到杯旁（接触@181.5）
      [183,{right:V(.20,.42,.06)}],
      [186,{left:V(-.02,.86,.26)}],                             // 左手挡半边光
      [190,{left:V(-.02,.86,.26)}],[191.5,{left:REST_L}]]},
  s13:{pos:[-0.62,-6.85],yaw:Math.PI, // 抽屉滑出 .5m 朝人来——站位让在滑轨终点外
    keys:[[192,{}],[193.5,{right:V(.02,.52,.14)}],[195.5,{right:V(.02,.52,.14)}], // 开抽屉（滑轨@194）
      [196.5,{right:V(.02,.62,.12)}],[199,{right:V(.02,.62,.12)}],   // 电池A 0%
      [199.8,{right:V(.02,.52,.14)}],
      [201,{right:V(.02,.62,.12)}],[203.5,{right:V(.02,.62,.12)}],   // 电池B 0%
      [204.5,{right:V(.02,.52,.14)}],[206,{right:V(.20,.42,.06)}]]},
  s14:{pos:[0.62,-6.85],yaw:Math.PI,
    keys:[[208,{}],[209.5,{right:V(.02,.52,.14)}],               // 第三块电池（100% 标签）
      [211,{right:V(.02,.6,.12)}],                              // 揭开标签（眼亮→缩 见 EYE 轨）
      [212.5,{right:V(.02,.6,.12),headPitch:.12}],
      [216.5,{right:V(.02,.6,.12),headPitch:.12}],              // 静止 3 秒（212.5→216.5 冻结区）
      [218,{right:V(.02,.52,.14),headPitch:.05}],               // 放回
      [219,{right:V(.20,.42,.06)}]]},
  s15:{pos:[-1,-4.4],yaw:Math.PI,
    keys:[[224,{}],[225.5,{left:V(-.12,.35,.28),right:V(.12,.35,.28),lean:.2,bob:-.06}], // 抱住大电池
      [228,{left:V(-.12,.35,.28),right:V(.12,.35,.28),lean:.2,bob:-.06}],
      [232.5,{left:V(-.12,.4,.3),right:V(.12,.4,.3),lean:.25,bob:-.08}],      // 奋力拖（向工具车）
      [233.2,{left:V(-.3,.55,.1),right:V(.3,.55,.1),lean:-.08,bob:.03,headPitch:.2}], // 散架踉跄
      [235,{left:REST_L,right:REST_R,lean:0,bob:0,headPitch:.3}],              // 低头看一地零件
      [238,{headPitch:.3}]]},
  s16:{pos:[1.5,-2.2],yaw:.98,
    keys:[[240,{headPitch:.2}],[243.5,{headPitch:.25}],
      [245,{bob:-.16,lean:.32,right:V(.1,.1,.26),headPitch:.3}],   // 蹲下（接触 SCREW_PING@246）
      [247,{bob:-.16,lean:.32,right:V(.1,.1,.26),headPitch:.3}],
      [248.5,{bob:0,lean:0,right:V(.15,.4,.1),headPitch:.15}],     // 捏起
      [250,{right:V(-.1,.42,.16)}],                                // 放进口袋
      [251.5,{right:V(.20,.42,.06),headPitch:.05}]]},
  s17:{pos:[0,-3.3],yaw:Math.PI,keys:[[254,{headPitch:-.22}],[258,{headPitch:-.25}],[262,{headPitch:-.22}]]},
  s18:{pos:[0,-3.3],yaw:Math.PI,keys:[[270,{headPitch:-.25}],[280,{headPitch:-.25}],[284,{headPitch:-.2}]]}, // 静止观看
  s19:{pos:[1.35,-1.85],yaw:2.12,
    keys:[[286,{}],[287.5,{right:V(.12,.8,.22),lean:.08}],       // 捏住发条
      [292,{right:V(.12,.8,.22),lean:.08}],                      // 转动发条（288→292，音乐盒四五个音）
      [293,{right:V(.12,.8,.22)}],[295,{right:V(.20,.42,.06),lean:0,headPitch:.12}],
      [298,{headPitch:.12}]]},                                   // 音停后仍看着它
  s20:{pos:[0,-5.3],yaw:Math.PI,
    keys:[[300,{}],[303,{right:V(.12,.6,.2)}],[307,{right:V(.05,.8,.24)}], // 伸手欲拆（AUX 38%）
      [315.5,{right:V(.05,.8,.24)}]]},
  s21:{pos:[0,-5.3],yaw:Math.PI,
    keys:[[316,{right:V(.05,.8,.24)}],[318,{right:V(.05,.8,.24)}], // REMOVAL DISABLES LAUNCH
      [320,{right:V(.05,.8,.24)}],                                 // 静音一秒（320→321）
      [325,{right:V(.12,.55,.15)}],                                // 手指缓慢收回（321→325）
      [327,{right:V(.20,.42,.06)}],[330,{headPitch:.15}]]},
  s22:{pos:[0,-3.5],yaw:0,
    keys:[[332,{}],[333.5,{right:V(.08,.45,.2)}],                  // 拆自身电池
      [336,{right:V(.05,.45,.22)}],                                // 胸板开（chest 机，报警 334→342）
      [337,{right:V(.1,.5,.18)}],[338,{right:V(.05,.45,.22)}],     // 慌忙（快速小幅抖动）
      [339,{right:V(.1,.48,.18)}],[340,{right:V(.05,.46,.2)}],
      [342.5,{right:V(.15,.42,.1)}],                               // 装回螺丝
      [344,{right:V(.20,.42,.06),headPitch:.2}],[346,{headPitch:.12}]]},
  s23:{pos:[3.25,-3],yaw:Math.PI/2,
    keys:[[348,{}],[349.5,{right:V(.05,.8,.25)}],[350.3,{right:V(.05,.76,.25)}], // 测压1@350
      [351.5,{right:V(.05,.8,.22)}],[352.8,{right:V(.05,.76,.25)}],              // 测压2
      [354,{right:V(.05,.8,.22)}],[355.3,{right:V(.05,.76,.25)}],                // 测压3
      [356.5,{right:V(.12,.62,.18),headPitch:-.05}],[358,{right:V(.20,.42,.06),headPitch:.05}]]}, // 有电！
  s24:{pos:[-2,-2.62],yaw:Math.PI,
    keys:[[364,{}],[365,{right:V(.05,.75,.3),lean:.12}],           // 持焊枪
      [367,{right:V(.02,.74,.32),lean:.12}],
      [367.7,{left:V(-.15,.9,.3),headPitch:-.1}],                  // 火星飞出瞬间→左手遮挡（0.5s 内）
      [369.5,{left:V(-.15,.9,.3),headPitch:-.1}],
      [370.5,{left:V(-.15,.88,.3),headPitch:.05,headYaw:-.3}],     // 意识到小苗不在（看自己手）
      [373.5,{left:REST_L,headPitch:.1,headYaw:0}],                // 缓慢收回（1.8s+）
      [376,{right:V(.05,.75,.28)}],[379,{right:V(.20,.42,.06),lean:0,headPitch:.02}]]},
  s25:{pos:[-1.1,-2.95],yaw:-2.76,
    keys:[[380,{}],[381.5,{right:V(-.1,.75,.22)}],                 // 接缓冲包/修灯
      [383.5,{right:V(-.1,.78,.2)}],                               // LIGHT_ONLINE@384
      [386,{right:V(.20,.42,.06),headPitch:-.08}],[389,{headPitch:-.08}]]}, // 退半步看暖光
  s26:{pos:[-1.1,-2.95],yaw:-2.76,
    keys:[[396.5,{}],[398,{left:V(-.18,.74,.22),right:V(-.02,.74,.24)}], // 垫泡棉
      [400,{left:V(-.16,.76,.22),right:V(-.04,.76,.24)}],          // 试放1（CUP_CLINK@400）
      [402.5,{left:V(-.16,.76,.22),right:V(-.04,.76,.24)}],
      [404,{left:V(-.16,.78,.2),right:V(-.04,.78,.22)}],           // 试放2（倾斜）
      [406.5,{left:V(-.16,.78,.2),right:V(-.04,.78,.22)}],
      [408,{left:V(-.16,.76,.2),right:V(-.04,.76,.22)}],           // 第三次固定稳固
      [410,{left:V(-.16,.76,.2),right:V(-.04,.76,.22)}],
      [411,{left:REST_L,right:REST_R,headPitch:-.05}]]},
  s27:{pos:[-1.1,-2.95],yaw:-2.76,
    keys:[[412,{}],[413.5,{right:V(-.08,.78,.2)}],                 // 接通气温控（接管@415）
      [416,{right:V(-.08,.78,.2)}],[417,{right:V(.16,.5,.1)}],
      [419,{left:V(-.2,.76,.2)}],[420.5,{left:V(-.2,.76,.2)}],     // 调低灯光@420
      [421.5,{left:REST_L,headPitch:-.08}],[424.5,{headPitch:-.08}]]}, // 确认安全
  s28:{pos:[0,-1.2],yaw:0,
    keys:[[426,{headYaw:.3}],[428,{headYaw:.3}],                   // 回望温室方向
      [430,{headYaw:0,headPitch:.05}],
      [432.5,{right:V(.25,.4,.1)}],                                // 手里取下儿童画
      [434.5,{right:V(-.08,.44,.16)}],                             // 放进胸前口袋（435.5 画消失）
      [436,{right:V(.20,.42,.06)}],[438,{headPitch:-.05}]]},
  s30:{moves:[{from:[-0.6,-2.2],to:[-1.4,-2.9],window:[458.5,460.8]}],
    pos:[-0.6,-2.2],yawKeys:[[454,Math.PI],[460.8,-2.6]],
    sit:{at:461,hipY:.45,footY:.20,footZ:.12,dur:3},
    keys:[[454,{headPitch:-.12,headYaw:-.54}],                     // 先看窗外
      [458,{headPitch:-.12,headYaw:-.54}],
      [460.5,{headYaw:0,headPitch:.05}],                           // 再看小苗（身体微转）
      [462,{headPitch:.1,left:V(-.22,.34,.1),right:V(.22,.34,.1)}],// 肩部放松
      [465,{headPitch:.06,left:V(-.22,.34,.1),right:V(.22,.34,.1)}]]},
  s31:{pos:[-1.4,-2.9],yaw:-2.6,sit:{at:0,hipY:.45,footY:.20,footZ:.12,dur:.01},
    keys:[[466,{left:V(-.28,.45,.12),headPitch:.08}],
      [468.2,{left:V(-.316,.92,.154),headPitch:.06}],              // 伸 1.2s（466→468.2）距叶 1cm（叶局部坐标实测）
      [469,{left:V(-.316,.92,.154),headPitch:.06}],                // 停 0.8s（468.2→469.0）没有碰
      [470.8,{left:V(-.28,.5,.12),headPitch:.08}],                 // 收 1.8s（469.0→470.8）
      [472,{left:V(-.28,.45,.12)}],                                // 轻放杯旁
      [474.5,{left:V(-.28,.45,.12),headPitch:.02}]]},
};

// ── 道具时间线：[t, scene, [x,y,z], rotY, visible]（同 scene 相邻键间 ease 插值）──
const PROPS={
  cart:[[18,'corridor',[1.0,0,1.88],Math.PI,true],[29.5,'corridor',[1.0,0,-4.62],Math.PI,true],
    [224,'warehouse',[.5,0,-4],.3,true]],
  headLamp:[[176,'greenhouse',[-1.45,.86,-7.3],-2.8,true],[181.5,'greenhouse',[-1.0,.79,-7.6],-2.8,true]], // 176 前跟头顶（代码特判）
  batteryA:[[192,'warehouse',[-.62,.54,-6.95],0,true]],
  batteryB:[[192,'warehouse',[-.72,.54,-6.95],.4,true]],
  batteryC:[[208,'warehouse',[.62,.54,-6.95],0,true]],
  bigBattery:[[224,'warehouse',[-1,.2,-5],0,true],[232.5,'warehouse',[.3,.2,-4.2],.4,true]],
  screw:[[90,'corridor',[0,2.75,-18],0,true],[90.45,'corridor',[.3,.02,-16.8],1.2,true],
    [233,'warehouse',[.3,.4,-4.2],0,true],[234.5,'warehouse',[1.8,.02,-2],.7,true],[248.5,'warehouse',[1.8,.02,-2],.7,false]],
  musicBox:[[254,'lounge',[1.5,.815,-2],.3,true]],
  welder:[[348,'warehouse',[-2,.745,-3],.4,true]],
  bufferPack:[[368,'warehouse',[-1.75,.78,-2.7],0,true],[380,'cockpit',[.9,1.02,-3.3],0,true]],
  cupSprout:[[112,'greenhouse',[-1.5,.79,-7.6],0,true],[380,'cockpit',[-1.2,.73,-3.2],0,true]],
  foamPad:[[396,'cockpit',[-1.2,.71,-3.2],0,true]],
  habitatDome:[[415,'cockpit',[-1.2,.755,-3.2],0,true]],
  readingLamp:[[380,'cockpit',[-1.5,.71,-3.35],.9,true]],
  drawing:[[0,'corridor',[-1.99,1.3,-5.2],Math.PI/2,true],
    [426,'cockpit',[.25,.42,-1.12],0,true],[434.8,'cockpit',[-.08,.45,-1.05],0,true],[436,'cockpit',[-.08,.45,-1.05],0,false]],
};
// 大电池外壳散架（233s）：四片壳飞落（局部偏移，ease 0.5s）
const SHELL_SCATTER=[[.55,-.1,.3,.9],[-.45,-.1,-.4,-.7],[.35,-.1,-.55,.5],[-.5,-.1,.25,1.4]];

function propAt(name,t){
  const keys=PROPS[name];if(!keys||t<keys[0][0])return{scene:null,visible:false};
  let i=0;while(i+1<keys.length&&keys[i+1][0]<=t)i++;
  const k=keys[i];
  if(i+1<keys.length&&keys[i+1][1]===k[1]&&k[4]&&keys[i+1][4]){
    const u=ease((t-k[0])/(keys[i+1][0]-k[0])),n=keys[i+1];
    return{scene:k[1],pos:[mix(k[2][0],n[2][0],u),mix(k[2][1],n[2][1],u),mix(k[2][2],n[2][2],u)],
      rotY:mix(k[3],n[3],u),visible:true};
  }
  return{scene:k[1],pos:k[2],rotY:k[3],visible:!!k[4]};
}

// 杯体倾斜（s26 试放两次倾斜，第三次稳固）：400/404 倾斜脉冲，408 后稳
function cupTilt(t){
  if(t>=400&&t<402.5)return .22*Math.sin(Math.PI*(t-400)/2.5);
  if(t>=404&&t<406.5)return -.18*Math.sin(Math.PI*(t-404)/2.5);
  return 0;
}

// ── 主入口 ──
export function performAt(ctx,seg,t,u){
  const {m07,props}=ctx;
  const out={contact:{hands:{},props:{}},locomotion:{},roots:{}};
  const beat=B[seg.id]??{};

  // 0) 道具状态机先于姿势求解（手持/头载道具当帧被消费）
  for(const [name,g] of Object.entries(props)){
    const p=propAt(name,t);
    if(p.scene===seg.scene&&p.visible){if(g.parent!==ctx.stage.scene)ctx.stage.scene.add(g);g.visible=true;}
    else g.visible=false;
    if(p.pos)g.position.set(...p.pos);
    if(p.rotY!==undefined)g.rotation.y=p.rotY;
  }
  // 头灯：176 前戴在头顶（镜片色全字段每帧写；位置在 setPose 后由当帧 root/yaw 写，见下）
  const lamp=props.headLamp;
  if(t>=186&&t<192)lamp.userData.lens.material.color.set('#c8b888'); // s12 左手挡半边光：光减半
  else lamp.userData.lens.material.color.set('#fff2cc');
  // 大电池外壳散架
  const shell=props.bigBattery.userData.shell;
  if(shell){
    const k=ease(clamp((t-233)/.5));
    shell.forEach((p,i)=>{
      if(p.userData.ox===undefined){p.userData.ox=p.position.x;p.userData.oy=p.position.y;p.userData.oz=p.position.z;}
      const s=SHELL_SCATTER[i];
      p.position.set(p.userData.ox+s[0]*k,p.userData.oy+s[1]*k,p.userData.oz+s[2]*k);
      p.rotation.z=s[3]*k;p.rotation.x=s[3]*.4*k;
    });
  }
  // 音乐盒发条旋转（288→292 上弦）；电池C 标签 211 揭开
  props.musicBox.userData.key.rotation.x=t>=288&&t<=292?(t-288)*7:0;
  if(props.batteryC.userData.tag)props.batteryC.userData.tag.visible=t<211;
  // 杯倾斜 + 叶弯（s09 散热风 130→133）
  props.cupSprout.rotation.z=cupTilt(t);
  props.cupSprout.userData.setLeafBend(t>=130&&t<=133?Math.sin(Math.PI*(t-130)/3):0);
  // 阅读灯：384 亮起，420 调低
  props.readingLamp.userData.bulb.intensity=t<384?0:t<420?2.2:.85;

  // 1) M-07 显隐与根运动
  const visible=seg.scene!=='exterior';
  let root=[0,0],yaw=Math.PI,walk=null;
  if(visible){
    if(beat.walk){
      const w=beat.walk,[w0,w1]=w.window,p=ease(clamp((t-w0)/(w1-w0)));
      root=[mix(w.from[0],w.to[0],p),mix(w.from[1],w.to[1],p)];
      yaw=w.facingYaw??Math.atan2(w.to[0]-w.from[0],w.to[1]-w.from[1]);
      if(t>w0&&t<w1)walk={from:w.from,to:w.to,facingYaw:yaw,strideFactor:w.strideFactor};
    }else if(beat.moves){
      root=beat.moves[0].from.slice();let yawMove=null;
      for(const m of beat.moves){
        const [w0,w1]=m.window;
        if(t<w0){yawMove=yawMove??Math.atan2(m.to[0]-m.from[0],m.to[1]-m.from[1]);break;}
        if(t<=w1){const p=ease((t-w0)/(w1-w0));
          root=[mix(m.from[0],m.to[0],p),mix(m.from[1],m.to[1],p)];
          walk={from:m.from,to:m.to,facingYaw:Math.atan2(m.to[0]-m.from[0],m.to[1]-m.from[1]),strideFactor:.95};
          break;}
        root=m.to.slice();
      }
      yaw=beat.yawKeys?yawAt(beat.yawKeys,t):(walk?walk.facingYaw:(beat.yaw??Math.PI));
    }else{
      root=(beat.pos??[0,-3]).slice();
      yaw=beat.yawKeys?yawAt(beat.yawKeys,t):(beat.yaw??Math.PI);
    }
    if(beat.walk&&beat.yawKeys)yaw=yawAt(beat.yawKeys,t);
  }
  // 2) 姿势 keys + 基底呼吸
  const patch=beat.keys?keysAt(beat._ck??(beat._ck=cumKeys(beat.keys)),t):{};
  const bobBase=.004*Math.sin(t*1.3);
  const spec={rootX:root[0],rootZ:root[1],yaw,visible,
    headYaw:patch.headYaw??.02*Math.sin(t*.5),headPitch:patch.headPitch??.03,
    lean:patch.lean??0,bob:(patch.bob??0)+bobBase,
    left:patch.left??REST_L,right:patch.right??REST_R,
    leftPole:patch.leftPole,rightPole:patch.rightPole};
  if(walk)spec.walk=walk;
  // 坐姿混合（s30 落座 / s31 全程坐姿）
  if(beat.sit){
    const k=ease(clamp((t-beat.sit.at)/(beat.sit.dur??2)));
    if(k>0)spec.sit={hipY:mix(.35,beat.sit.hipY,k),footY:beat.sit.footY,footZ:mix(.02,beat.sit.footZ,k)};
  }
  // 3) 道具→姿势耦合：s02 推车时工具车根随（车把在 M-07 手前）
  if(t>=18&&t<29.6){
    const c=props.cart;
    c.visible=true;if(c.parent!==ctx.stage.scene)ctx.stage.scene.add(c);
    c.position.set(root[0]+Math.sin(yaw)*.62,0,root[1]+Math.cos(yaw)*.62);c.rotation.y=yaw;
  }
  m07.userData.setChest(seg.id==='s22'?ease(clamp((t-334.5)/1.2))*(1-ease(clamp((t-341)/1.2))):0);
  m07.userData.setGesture('left',patch.gL??.15);
  const p=m07.userData.setPose(spec,t);
  m07.updateMatrixWorld(true);
  // 头灯跟头顶：必须在 setPose 之后、用当帧 root/yaw 写（读 m07.position 会拿到上一帧=seek 分叉）
  if(t<176&&visible){
    if(lamp.parent!==ctx.stage.scene)ctx.stage.scene.add(lamp);
    lamp.visible=true;
    lamp.position.set(root[0]+Math.sin(yaw)*.05,.88,root[1]+Math.cos(yaw)*.05);
    lamp.rotation.y=yaw;
  }
  // 4) 眼光圈
  const eye=keysAt(EYE,t);
  m07.userData.setEye({aperture:eye.a,glow:eye.g,alarm:eye.al>.5},t);

  // 5) trace（接触探针/Foley 时钟消费）
  const _w=new THREE.Vector3();
  const wp=o=>{o.getWorldPosition(_w);return[+_w.x.toFixed(4),+_w.y.toFixed(4),+_w.z.toFixed(4)];};
  if(visible){
    out.contact.hands.left=wp(m07.userData.hands.left);
    out.contact.hands.right=wp(m07.userData.hands.right);
    out.contact.eye=wp(m07.userData.eyeAnchor);
    out.roots.m07=[+m07.position.x.toFixed(4),+m07.position.z.toFixed(4)];
    out.contact.aperture=+eye.a.toFixed(3);
    if(p.locomotion)out.locomotion.m07={kind:'walk',step:p.locomotion.step,
      feet:{left:{stance:p.locomotion.contacts.left.stance},right:{stance:p.locomotion.contacts.right.stance}}};
  }
  for(const [name,g] of Object.entries(props))
    if(g.visible)out.contact.props[name]=[+g.position.x.toFixed(3),+g.position.y.toFixed(3),+g.position.z.toFixed(3)];
  return out;
}
