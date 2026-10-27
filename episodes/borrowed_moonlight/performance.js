// 《借走月光的女孩》表演谱（P5）：按拍 (t,state) 表演谱 + 每拍运镜表。
// 64 拍逐拍指定：姿势 spec（blocking 关键姿势=预备/极值/接触/缓冲）、emotion 映射角色表情集、
// gaze 目标、手型（fist/open/point/抱瓶/捧灯）、次级运动（斗篷/胡须/发片跟随衰减）、
// 走拍 walkingFeet 有限落脚（艾琳 strideFactor .55 短而急）、台词 mouth 包络占位（P6 接真口型）。
// 静默留白拍（m47-m49 后段、m52）不塞动作；泪前静止三秒（TEAR_FALL 366→TEAR_BREAK 369）全身冻结。
// 纪律：(t,state) 纯函数——所有量由 seg/u/t 闭式求值，顺序渲染与 seek 一致。
import * as THREE from 'three';
import {V,blend,mix,buildPose} from './characters/rig.js';
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};

// 当前拍：线性 u（运镜内部再 ease）
export function beatAt(segments,t){
  const i=segments.findIndex(s=>t>=s.start&&t<s.end);
  const idx=i<0?segments.length-1:i,seg=segments[idx];
  return {seg,i:idx,u:clamp((t-seg.start)/(seg.end-seg.start))};
}

// ── 运镜锚点表：scene → shot → {pos,look,fov}（终态构图；move 决定如何到达）──
// P5 对白轴线纪律：同一对话轴的覆盖机位保持在轴线同侧（越轴修正：girl_step/alder_side/
// girl_lookback/girl_stars/girl_determined/lady_side/girl_frown，见 NOTES.md P5）。
export const ANCHORS={
  snowtown:{
    town_far:{pos:[0,7,26],look:[0,9,-16],fov:55},
    clock_face:{pos:[0,9,2],look:[0,18.5,-16],fov:36},
    street_empty:{pos:[-8,3.5,6],look:[6,2.5,-10],fov:50},
    girl_enter:{pos:[5,2.2,7],look:[2,1,-0.5],fov:46},
    girl_close:{pos:[2.9,1.4,-2.4],look:[2,1.1,-0.5],fov:30},
    moon_close:{pos:[2,4,8],look:[14,30,-70],fov:22},
    lamp_close:{pos:[2.6,0.95,-1.9],look:[1.86,0.67,-0.52],fov:24},
    lamp_macro:{pos:[2.3,0.85,-1.5],look:[1.86,0.67,-0.52],fov:18},
    eye_macro:{pos:[2.35,1.25,-1.8],look:[2,1.14,-0.45],fov:18},
    tower_door:{pos:[4,2.8,-3],look:[0,2,-13],fov:42},
    door_open:{pos:[2.4,1.9,2.0],look:[0,2.2,-13],fov:40},
    tower_wait:{pos:[4.5,2.6,-4],look:[1,2.5,-11.5],fov:44},
    stair_fade:{pos:[0,2.5,2],look:[4,22,-50],fov:40},
    alder_down:{pos:[2.6,1.5,-9.8],look:[1.5,1.35,-11.4],fov:26},
    hand_petal:{pos:[2.2,1.3,-10.2],look:[1.55,1.05,-11.35],fov:20},
    snow_to_petal:{pos:[1.5,3.5,9],look:[0,4,-12],fov:48}, // P5：压低拉近，前景雪花转化可读（原广角偏含蓄）
    clock_bell1:{pos:[0,9,2],look:[0,18.5,-16],fov:36},
    street_bud:{pos:[-8,3.5,6],look:[6,2.5,-10],fov:50},
    windows_light:{pos:[-6,3,4],look:[-13,3.5,-10],fov:44},
    sunrise_wide:{pos:[0,15,26],look:[0,4,-16],fov:52},
    tower_reunion:{pos:[3.5,22.6,-7],look:[0,22.0,-12.4],fov:40},
    girl_answer:{pos:[1.5,22.2,-10.2],look:[0,22.0,-12.4],fov:32},
    locket:{pos:[2.1,1.35,-10.4],look:[1.5,1.05,-11.35],fov:20},
    finale:{pos:[1.6,1.4,-3.4],look:[1,1.1,-6],fov:34},
    goodnight:{pos:[1.7,1.2,-3.2],look:[1.05,0.9,-5.85],fov:24}, // P4 聚字同屏 + P5 捧灯升高后脸入画
    fade:{pos:[1.8,1.2,-3.8],look:[1.21,0.6,-5.9],fov:26},
    wide:{pos:[0,6,22],look:[0,6,-14],fov:50},
  },
  clocktower:{
    workshop_wide:{pos:[0,8,10],look:[0,5,-4],fov:55},
    oldman_work:{pos:[1.6,1.9,0.8],look:[0,1.1,-3.6],fov:38},
    two_mid:{pos:[3.6,2.1,2.8],look:[0,1.3,-2.4],fov:42},
    alder_close:{pos:[1.1,1.6,-1.6],look:[0,1.4,-4.0],fov:30},
    bottles_row:{pos:[-5.5,3.6,3.5],look:[0,4,-5],fov:44},
    girl_step:{pos:[0.9,1.7,-3.35],look:[1.5,1.15,-0.7],fov:34}, // P5 越轴修正：改到对话轴 +x 侧，奥尔德肩后看艾琳
    alder_side:{pos:[2.6,1.6,-2.6],look:[0.1,1.35,-4.0],fov:30}, // P5 越轴修正：原 -x 侧越轴，改同侧侧脸
    hand_bottle:{pos:[2.4,1.4,-2.2],look:[1.54,0.97,-0.77],fov:24},
    bottle_macro:{pos:[1.9,1.3,-1.9],look:[1.54,0.97,-0.77],fov:17},
    alder_shock:{pos:[0.9,1.7,-2.2],look:[0,1.42,-4.0],fov:28},
    girl_smile:{pos:[0.9,1.4,-2.4],look:[1.6,1.15,-0.6],fov:30},
    wide:{pos:[0,7,10],look:[0,4,-4],fov:50},
  },
  towertop:{
    skylight:{pos:[0,1.2,5],look:[0,4,-3],fov:46},
    moon_dim:{pos:[0,3,6],look:[6,26,-70],fov:16},
    girl_determined:{pos:[1.3,1.15,-2.0],look:[1,1.28,0.5],fov:30}, // P5：正面低位仰脸——两人都朝 -z 看月亮（并肩望天场景），特写要从正面读"抬头"
    two_mid:{pos:[4.5,2.2,4],look:[-0.5,1.3,-0.5],fov:42},
    hand_star:{pos:[1.6,1.3,-1.3],look:[1,1.05,0.3],fov:24},
    first_star:{pos:[0,1.6,5.5],look:[1,4,-3],fov:40},
    stars_swarm:{pos:[9,5,6],look:[0,6,-6],fov:55},
    stair_form:{pos:[11,5,7],look:[2,9,-18],fov:48},
    alder_tear:{pos:[-1.0,1.55,1.6],look:[-2,1.4,0],fov:26},
    girl_lookback:{pos:[2.6,1.6,2.8],look:[1,1.25,0.5],fov:32}, // P5 越轴修正
    girl_stars:{pos:[2.4,1.55,2.2],look:[1,1.3,0.5],fov:28},     // P5 越轴修正
    feet_step:{pos:[6.7,0.75,-6.3],look:[5.15,0.5,-4.65],fov:24}, // P5：从星阶外侧低位回看（阶在护墙圈外，内侧机位全被护墙挡）
    climb_far:{pos:[7,7,9],look:[2,10,-22],fov:45},
    wide:{pos:[8,4,8],look:[0,3,-4],fov:48},
  },
  moonpalace:{
    palace_establish:{pos:[0,6,15],look:[0,4,-9],fov:68},
    lady_moon:{pos:[1.6,2.3,-2.5],look:[0,1.7,-9],fov:32},
    two_mid:{pos:[3.8,2.2,0.5],look:[-0.2,1.4,-8],fov:42}, // P5：真双人镜头（原机位把她甩出画外）
    lady_side:{pos:[3.2,1.9,-6.6],look:[0,1.75,-8.7],fov:28}, // P5 越轴修正（原 -x 侧）
    girl_frown:{pos:[1.3,1.5,-5.2],look:[0.3,1.25,-3.4],fov:26}, // P5 越轴修正
    lady_half:{pos:[2.2,2.1,-5.6],look:[0,1.8,-8.7],fov:30},
    palace_wide:{pos:[-9,6,9],look:[0,3.5,-8],fov:55},
    offer_lamp:{pos:[0.8,1.0,-4.6],look:[0.28,0.82,-3.62],fov:22}, // P5：对准真实递灯点（局部(0,.82,.30)→世界(.30,.82,-3.70)）
    two_close:{pos:[0.85,1.7,-1.6],look:[0,1.5,-8.6],fov:30}, // P7：旧机位艾琳在镜头旁侧 40° 仍出画；移到她正后方成真过肩（保持 +x 轴侧）
    girl_lamp:{pos:[0.2,1.3,-4.6],look:[0.28,0.95,-3.5],fov:26},
    girl_tears:{pos:[-0.2,1.4,-4.9],look:[0.3,1.2,-3.4],fov:24},
    tear_macro:{pos:[0.9,2.0,-6.6],look:[0,1.75,-8.5],fov:22}, // P2 真角色坐姿头高 1.75（占位版 2.35 拍空）
    wide:{pos:[0,5,13],look:[0,3.5,-8],fov:55},
  },
};

// move → 相机运动参数：锚点是拍内终态构图，运动从偏移处到达（或反演）
export function cameraFor(seg,u){
  const table=ANCHORS[seg.scene]??{};
  const a=table[seg.shot]??table.wide;
  const e=ease(u);
  const dir=(()=>{const d=[a.pos[0]-a.look[0],a.pos[1]-a.look[1],a.pos[2]-a.look[2]];
    const n=Math.hypot(...d)||1;return d.map(x=>x/n);})();
  // m54 雪转花：圣经要"慢动作广角"但 P4 广角偏含蓄——终态锚点已压低拉近，叠加缓慢推近
  const move=seg.id==='m54'?'push_slow':seg.move;
  switch(move){
    case 'push_in':case 'push_slow':{
      const k=move==='push_in'?2.2:1.2;
      return {pos:a.pos.map((v,i)=>v+dir[i]*k*(1-e)),look:a.look,fov:a.fov};
    }
    case 'pull_far':{
      const k=4.5;
      return {pos:a.pos.map((v,i)=>v-dir[i]*k*(1-e)),look:a.look,fov:a.fov};
    }
    case 'pan':{
      const k=2.4;
      return {pos:[a.pos[0]-k+2*k*e,a.pos[1],a.pos[2]],
        look:[a.look[0]-k*.6+1.2*k*e,a.look[1],a.look[2]],fov:a.fov};
    }
    case 'orbit':{
      const ang=-.4+.8*e,[lx,ly,lz]=a.look,dx=a.pos[0]-lx,dz=a.pos[2]-lz;
      const c=Math.cos(ang),s=Math.sin(ang);
      return {pos:[lx+dx*c-dz*s,a.pos[1],lz+dx*s+dz*c],look:a.look,fov:a.fov};
    }
    case 'tilt_up':case 'look_up':
      return {pos:a.pos,look:[a.look[0],a.look[1]*(.75+.25*e),a.look[2]],fov:a.fov};
    case 'crane_up':
      return {pos:[a.pos[0],a.pos[1]*(.3+.7*e),a.pos[2]+1.5*(1-e)],look:a.look,fov:a.fov};
    case 'telescope':
      return {pos:a.pos,look:a.look,fov:a.fov+4-4*e};
    case 'follow_up':{
      const k=.8;
      return {pos:a.pos.map((v,i)=>v+dir[i]*k*(1-e)),
        look:[a.look[0],a.look[1]*(.5+1.2*e),a.look[2]],fov:a.fov};
    }
    case 'follow':case 'follow_back':{
      const k=.8;
      return {pos:a.pos.map((v,i)=>v+dir[i]*k*(1-e)),look:a.look,fov:a.fov};
    }
    case 'slow_drift':case 'montage':{
      const k=.5;
      return {pos:[a.pos[0]-k+2*k*e,a.pos[1],a.pos[2]],look:a.look,fov:a.fov};
    }
    case 'hold':case 'over_shoulder':case 'slowmo':case 'ultrawide':
    default:
      return {pos:a.pos,look:a.look,fov:a.fov};
  }
}

// ── 角色站位与显隐（按拍归属场景 + 剧情节点）──
const STAGE={
  snowtown:{Eileen:{pos:[2,0,-0.5],yaw:Math.PI},Alder:{pos:[1.5,0,-11.5],yaw:0}},
  clocktower:{Eileen:{pos:[1.6,0,-0.6],yaw:Math.PI+.35},Alder:{pos:[0,0,-3.95],yaw:0}}, // P5：奥尔德移到工作台前（原 -4.5 够不到台面）
  towertop:{Eileen:{pos:[1,0,0.5],yaw:Math.PI},Alder:{pos:[-2,0,0],yaw:.6}},
  moonpalace:{Eileen:{pos:[.3,0,-3.4],yaw:Math.PI},LadyMoon:{pos:[0,.9,-8.6],yaw:0}},
};
export function stagingFor(seg){
  const n=Number(seg.id.slice(1)),base=STAGE[seg.scene]??{};
  const vis={Eileen:false,Alder:false,LadyMoon:false};
  if(seg.scene==='snowtown'){
    if(n<13)vis.Eileen=n>=4;          // 第一幕：m04 艾琳提灯入画
    else{vis.Alder=true;vis.Eileen=n>=59;} // 第五幕：奥尔德等待；m59 艾琳钟楼顶重现
  }else if(seg.scene==='clocktower'||seg.scene==='towertop'){vis.Eileen=true;vis.Alder=true;}
  else if(seg.scene==='moonpalace'){vis.Eileen=true;vis.LadyMoon=true;}
  const out={};
  for(const k of ['Eileen','Alder','LadyMoon'])
    out[k]={visible:vis[k]&&!!base[k],...(base[k]??{pos:[0,-50,0],yaw:0})};
  // 特殊站位：m59-m61 艾琳在钟楼顶台；m62 起回到钟楼前向观众道晚安
  if(seg.scene==='snowtown'&&n>=59)out.Eileen={visible:true,pos:[0,21.24,-12.4],yaw:.5};
  if(seg.scene==='snowtown'&&n>=62)out.Eileen={visible:true,pos:[1,0,-6],yaw:0};
  return out;
}

// S05 春景皮肤：m58 日出全景起
export function skinFor(seg){
  return seg.scene==='snowtown'&&Number(seg.id.slice(1))>=58?'spring':'snow';
}

// ═══════════════════════ P5 表演谱 ═══════════════════════

// ── 微关键帧插值器：keys=[[t,patch],...]，patch 内 V/数值/手型线性混合，其余离散切换 ──
const isV=o=>o&&typeof o==='object'&&'x' in o&&'y' in o;
function blendPatch(a,b,u){
  const o={...a};
  for(const k in b){
    const x=a[k],y=b[k];
    if(y==null||x==null){o[k]=u<.5?x:y??x;continue;}
    if(typeof y==='number'&&typeof x==='number')o[k]=mix(x,y,u);
    else if(Array.isArray(x)&&Array.isArray(y))o[k]=x.map((v,i)=>mix(v,y[i],u));
    else if(isV(x)&&isV(y))o[k]=blend(x,y,u);
    else if(typeof x==='object'&&typeof y==='object'){ // 手型 {fist,open,point} 逐字段
      const g={...x};for(const f in y)if(typeof y[f]==='number'&&typeof x[f]==='number')g[f]=mix(x[f],y[f],u);else g[f]=y[f];
      o[k]=g;
    }else o[k]=u<.5?x:y;
  }
  return o;
}
// keys 语义=航点+累积：每个 key 的 patch 叠在之前所有 key 之上（未写字段保持），
// 航点间 ease 混合；要"保持"就写 {}（保持累积态），要"恢复"就显式写字段。
function cumKeys(keys){
  const out=[];let acc={};
  for(const [t,p] of keys){acc={...acc,...p};out.push([t,acc]);}
  return out;
}
function keysAt(keys,t){
  if(t<=keys[0][0])return keys[0][1];
  const last=keys[keys.length-1];if(t>=last[0])return last[1];
  let i=0;while(keys[i+1][0]<=t)i++;
  const u=ease((t-keys[i][0])/(keys[i+1][0]-keys[i][0])),a=keys[i][1],b=keys[i+1][1];
  if(Array.isArray(a))return a.map((v,j)=>mix(v,b[j],u)); // 坐标关键帧（lampKeys/bottleKeys）保持数组可展开
  return blendPatch(a,b,u);
}
const angDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const angLerp=(a,b,u)=>a+angDelta(a,b)*clamp(u);

// ── 表情映射：script act emotion → 各角色表情集（含通道补丁）──
const EMO={
  Eileen:{curious:['curious',{}],sad:['lonely',{}],gentle:['smile',{smile:.75}],
    determined:['determined',{}],happy:['smile',{awe:.15}],excited:['curious',{smile:.5,awe:.9}],
    worried:['lonely',{firm:.35}],neutral:['neutral',{sad:.15}]},
  Alder:{neutral:['neutral',{daze:.2}],sad:['neutral',{sad:.55,daze:.3}],surprised:['shocked',{}],
    excited:['relieved',{awe:.45}],relieved:['relieved',{}]},
  LadyMoon:{sad:['weary',{sad:.35}],relieved:['revived',{}],neutral:['weary',{}]},
};
// 各角色待机基底（替代 P2 drive）：姿态 + 呼吸 + 慢微动
function baseSpec(name,t){
  if(name==='Eileen')return{headPitch:.02,headYaw:.02*Math.sin(t*.7),
    left:V(-.115,.82,.05),right:V(.13,.865,.055),gL:{fist:.12},gR:{fist:.55},
    lean:0,bob:.004*Math.sin(t*1.6),blink:Math.exp(-((((t+1.3)%3.9)-.12)**2)/.006)};
  if(name==='Alder')return{headPitch:.12,headYaw:.015*Math.sin(t*.5),
    left:V(-.155,.90,.10),right:V(.155,.90,.10),gL:{fist:.15},gR:{fist:.15},
    lean:0,bob:.003*Math.sin(t*1.1),blink:Math.exp(-((((t+2.1)%4.6)-.12)**2)/.007)};
  // LadyMoon：坐姿由 staging y>.3 决定；水中飘=极慢浮动
  return{headPitch:.04,headYaw:.02*Math.sin(t*.4),
    left:V(-.13,.42,.10),right:V(.13,.42,.10),gL:{open:.25},gR:{open:.25},
    lean:.04,bob:.004*Math.sin(t*.9),blink:Math.exp(-((((t+.6)%5.3)-.15)**2)/.010)};
}

// ── gaze 目标解算（活体锚点优先，不手写可动目标的世界坐标）──
const _gv=new THREE.Vector3();
function gazeTarget(name,ctx,seg){
  const {actors}=ctx;
  const head=n=>actors[n]?.userData.actor?.headGroup?.getWorldPosition(_gv.set(0,0,0));
  switch(name){
    case 'moon':return _gv.set(...(seg.scene==='towertop'?[6,26,-70]:[14,30,-70])).clone();
    case 'lamp':return actors.Eileen.userData.lamp.getWorldPosition(_gv).clone();
    case 'bottle':return actors.Eileen.userData.bottle.getWorldPosition(_gv).clone();
    case 'bottles':return _gv.set(0,4,-5).clone();
    case 'workbench':return _gv.set(0,1.0,-3.3).clone();
    case 'alder':return head('Alder')?.clone();
    case 'eileen':return head('Eileen')?.clone();
    case 'ladymoon':return head('LadyMoon')?.clone().add(new THREE.Vector3(0,-.3,0)); // 坐着也看她胸口高度（仰视角自然）
    case 'stair':return _gv.set(2,9,-18).clone();
    case 'sky':return _gv.set(2,24,-40).clone();
    case 'star':return _gv.set(1,9,-3).clone();
    case 'locket':return actors.Alder.userData.actor.watches[1].getWorldPosition(_gv).clone();
    case 'door':return _gv.set(0,1.5,-13).clone();
    case 'skylight':return _gv.set(0,5,-3).clone();
    case 'clock':return _gv.set(0,18.5,-13.7).clone();
    case 'street':return _gv.set(6,2.5,-10).clone();
    case 'windows':return _gv.set(-13,3.5,-10).clone();
    case 'hand':return actors.Alder.userData.actor.hands.right.getWorldPosition(_gv).clone();
    default:return null;
  }
}

// 台词口型包络占位（无 voice_envs.json 时的回退）：确定性音节样起伏 + 起收缓入缓出 + 伪停顿
function jawEnv(t,start,end){
  if(t<start+.12||t>end-.28)return 0;
  const a=ease((t-start-.12)/.3)*ease((end-.28-t)/.4);
  const syl=Math.max(0,Math.sin(t*15.7))*.62+Math.max(0,Math.sin(t*6.3+1.7))*.38;
  const gap=.35+.65*(.5+.5*Math.sin(t*2.1+start)); // 停顿感（占位，不与标点对齐）
  return .52*a*syl*gap;
}

// P6 真口型：config/voice_envs.json（最终对白 PCM 的 20ms 能量包络，t0=混音摆点同一零点，
// viewer 启动时 setVoiceEnvs 注入；缺失或越界回退占位/0）。能量开合，不是音素视素。
let VOICE_ENVS=null;
export function setVoiceEnvs(v){VOICE_ENVS=v;}
function jawReal(actId,t){
  const e=VOICE_ENVS?.lines?.find(l=>l.id===actId);
  if(!e)return null;
  const i=Math.floor((t-e.t0)/e.dt);
  return i<0||i>=e.jaw.length?0:e.jaw[i];
}

// ── 逐拍表演表：只写偏离基底的量。字段：
// pos[x,z]/yaw(数值或[from,to,t0,t1])/rootY(同) walk{from,to,window,strideFactor?}
// keys:[[t,patch]]（patch: left/right/leftPole/rightPole/gL/gR/headPitch/headYaw/lean/bob/footX/leftFoot/rightFoot）
// emotion:[名,补丁] gaze:'目标名' jaw:true=该拍开口 tap:[时刻...]=右手下敲
// tremble:幅度 freeze:[t0,t1] blink0:[t0,t1] lampKeys:[[t,[x,y,z]]] lamp:'hand'|'ground'|null
// bottleAt:[x,y,z]（可见即捧瓶） cloak:阵风加成 beard/locks:次级运动开关 ──
const B={
  // ── 第一幕 雪国小镇 ──
  m04:{E:{walk:{from:[4.6,3.2],to:[2.0,-0.5],window:[27,34.3]},emotion:['neutral',{sad:.25}],cloak:.03}},
  m05:{E:{keys:[[35,{headPitch:.05}],[36.5,{headPitch:-.38}]],gaze:'moon',emotion:null,jaw:1}},
  m06:{E:{keys:[[43,{headPitch:-.38}]],gaze:'moon',emotion:['lonely',{awe:.3}],jaw:1}},
  m07:{E:{keys:[[51,{}],[52,{left:V(-.03,.86,.13),gL:{open:.4},headPitch:.22}],[55.5,{left:V(-.115,.82,.05),gL:{fist:.12},headPitch:.10}]],
    gaze:'lamp',emotion:['lonely',{awe:.2}],cloak:.10}},
  m08:{E:{keys:[[57,{headPitch:.10}],[58,{headPitch:.26,lean:.04}]],gaze:'lamp',emotion:['lonely',{awe:.2}],blink0:[57.8,60.5]}},
  m09:{E:{keys:[[63.5,{}],[64.4,{left:V(.02,.87,.10),gL:{open:.3}}],[65.6,{left:V(-.115,.82,.05),gL:{fist:.12}}]],
    gaze:'lamp',emotion:['smile',{smile:.7}],jaw:1}},
  m10:{E:{keys:[[70,{headPitch:.10,tear:0}],[73,{headPitch:-.32,tear:.15}],[77.5,{headPitch:-.34,tear:.45}]],
    gaze:'moon',jaw:1}}, // 落睫金粒已有 fx 锚点（eyeAnchor），泪光随 tear 通道
  m11:{E:{walk:{from:[0.95,-7.3],to:[0.35,-11.25],window:[78,83.9]},emotion:['neutral',{firm:.3,sad:.15}],cloak:.03}},
  m12:{E:{pos:[0.35,-11.25],yaw:[-2.99,-2.94,84,85],keys:[[84,{}],[85.5,{headPitch:-.22}]],
    gaze:'door',emotion:['curious',{awe:.45}]}},
  // ── 第二幕 钟楼工坊 ──
  m13:{E:{walk:{from:[2.5,1.8],to:[2.0,0.5],window:[91,95]},keys:[[91,{headPitch:-.15,headYaw:.18}],[94,{headPitch:-.3,headYaw:-.12}],[96,{headPitch:-.2,headYaw:0}]],
      gaze:'bottles',emotion:['curious',{awe:.4}],cloak:.02},
    A:{keys:[[91,{lean:.06,headPitch:.3,left:V(-.13,1.08,.22),right:V(.13,1.06,.22)}]],gaze:'workbench',tap:[93,95.5,98]}},
  m14:{A:{keys:[[101,{lean:.06,headPitch:.3,left:V(-.13,1.08,.22),right:V(.13,1.06,.22)}]],gaze:'workbench',tap:[102.5,103.7,105.8,107.2]},
    E:{pos:[2.0,0.5],gaze:'alder',emotion:['curious',{}]}},
  m15:{E:{walk:{from:[2.0,0.5],to:[1.6,-0.6],window:[109,111.4],footX:.078},
      keys:[[111.4,{}],[112.7,{bob:-.34,lean:.40,right:V(.27,.38,.15),headPitch:.30,gaze:'lamp'}], // 蹲下放灯（接触帧）
        [114.9,{bob:-.34,lean:.40,right:V(.27,.38,.15),headPitch:.30}],
        [116.2,{bob:0,lean:0,right:V(.13,.865,.055),headPitch:-.38,gaze:'bottles'}]],
      gaze:'bottles',emotion:null,jaw:1,lampHandUntil:114.9},
    A:{keys:[[109,{lean:.06,headPitch:.3,left:V(-.13,1.08,.22),right:V(.13,1.06,.22)}]],gaze:'workbench',tap:[111.5]}},
  m16:{A:{keys:[[117,{lean:.06,headPitch:.3,left:V(-.13,1.08,.22),right:V(.13,1.06,.22)}],
      [118.4,{lean:0,right:V(.075,1.06,.20),rightPole:V(.4,-.3,-.2),gR:{open:.4},headPitch:.24,headYaw:-.08}]], // 摸怀表（习惯动作）
    gaze:'locket',emotion:['neutral',{daze:.3,sad:.3}],jaw:1},
    E:{gaze:'bottles',emotion:['curious',{awe:.3}],keys:[[117,{headPitch:-.3}],[124,{headPitch:-.1,gaze:'alder'}]]}},
  m17:{A:{keys:[[126,{right:V(.075,1.06,.20),rightPole:V(.4,-.3,-.2),gR:{open:.4},headPitch:.24,headYaw:-.08}],
      [128,{lean:.06,headPitch:.3,left:V(-.13,1.08,.22),right:V(.13,1.06,.22),gR:{fist:.15},headYaw:0}]],gaze:'workbench',tap:[129.5]},
    E:{gaze:'bottles',emotion:['curious',{awe:.4}],keys:[[126,{headPitch:-.35}]]}},
  m18:{E:{walk:{from:[1.6,-0.6],to:[1.32,-1.55],window:[132.3,134.2],footX:.078}, // 向前一步
      gaze:'alder',emotion:['curious',{firm:.4}],jaw:1},
    A:{keys:[[132,{lean:.06,headPitch:.3,left:V(-.13,1.08,.22),right:V(.13,1.06,.22)}]],gaze:'workbench'}},
  m19:{A:{keys:[[140,{lean:.06,headPitch:.3,left:V(-.13,1.08,.22),right:V(.13,1.06,.22)}],
      [141.5,{lean:0,right:V(.075,1.06,.20),rightPole:V(.4,-.3,-.2),gR:{open:.4},headPitch:.26,headYaw:-.18}]], // 摸表+侧脸回避
    gaze:'none',emotion:['neutral',{sad:.6,daze:.2}],jaw:1},
    E:{pos:[1.32,-1.55],gaze:'alder',emotion:['lonely',{firm:.2}]}},
  m20:{E:{keys:[[149,{left:V(-.075,.95,.16),right:V(.075,.95,.16),gL:{open:.35},gR:{open:.35},headPitch:.10}],[150.4,{}],[151.4,{headPitch:.06}]],
      gaze:'bottle',emotion:['curious',{awe:.5}],bottleAt:[0,.95,.185]},
    A:{keys:[[149,{right:V(.075,1.06,.20),gR:{open:.4},headPitch:.24}]],gaze:'eileen'}},
  m21:{E:{keys:[[155,{left:V(-.075,.95,.16),right:V(.075,.95,.16),gL:{open:.35},gR:{open:.35},headPitch:.10}]],
      gaze:'bottle',emotion:null,jaw:1,bottleAt:[0,.95,.185]},
    A:{keys:[[155,{lean:.06,headPitch:.3,left:V(-.13,1.08,.22),right:V(.13,1.06,.22)}]],gaze:'workbench'}},
  m22:{A:{keys:[[162,{lean:.06,headPitch:.3,left:V(-.13,1.08,.22),right:V(.13,1.06,.22)}],
      [163.4,{lean:0,headPitch:.02,left:V(-.16,.95,.10),right:V(.16,.95,.10),gL:{fist:.3},gR:{fist:.3}}]], // 震惊站直+手指颤抖（不踮脚——bob 正压会腿长不可达）
    gaze:'bottle',emotion:null,tremble:.008,jaw:1},
    E:{keys:[[162,{left:V(-.075,.95,.16),right:V(.075,.95,.16),gL:{open:.35},gR:{open:.35},headPitch:.06}]],
      gaze:'alder',emotion:['smile',{awe:.4}],bottleAt:[0,.95,.185]}},
  m23:{E:{keys:[[170,{left:V(-.075,.95,.16),right:V(.075,.95,.16),gL:{open:.35},gR:{open:.35},headPitch:.06}]],
      gaze:'alder',emotion:null,jaw:1,bottleAt:[0,.95,.185]},
    A:{keys:[[170,{}],[172.5,{}]],gaze:'eileen',emotion:['neutral',{daze:.4,awe:.4}]}},
  m24:{E:{keys:[[178,{left:V(-.075,.95,.16),right:V(.075,.95,.16),gL:{open:.35},gR:{open:.35},headPitch:.10}],
      [180.5,{left:V(-.09,1.02,.20),right:V(.09,1.02,.20),headPitch:-.05}]],
      gaze:'bottles',emotion:['curious',{awe:.7}],bottleAt:[0,1.0,.215],bottleKeys:[[178,[0,.95,.185]],[180.5,[0,1.0,.215]]]},
    A:{gaze:'bottles',emotion:['neutral',{awe:.5,daze:.3}]}},
  // ── 第三幕 钟楼顶/星阶 ──
  m25:{E:{keys:[[184,{headPitch:-.15}],[186,{headPitch:-.5}]],gaze:'skylight',emotion:['curious',{awe:.55}]},
    A:{keys:[[184,{}],[186,{headPitch:-.2}]],gaze:'skylight',emotion:['neutral',{awe:.3}]}},
  m26:{A:{keys:[[192,{headPitch:-.1}],[194,{headPitch:-.28,right:V(.075,1.06,.20),rightPole:V(.4,-.3,-.2),gR:{open:.4}}]],
      gaze:'moon',emotion:['neutral',{sad:.5,daze:.4}],jaw:1},
    E:{keys:[[192,{}],[193.5,{headPitch:-.42}]],gaze:'moon',emotion:['lonely',{awe:.3}]}},
  m27:{E:{keys:[[200,{headPitch:.12,gR:{fist:.55}}],[201.3,{headPitch:.12,gR:{fist:.92}}],[202.6,{headPitch:-.32,gR:{fist:.9}}]], // 攥紧灯柄再抬头
      gaze:'moon',emotion:null,jaw:1},
    A:{gaze:'eileen',emotion:['neutral',{daze:.3,awe:.3}]}},
  m28:{A:{keys:[[206,{}],[207.5,{right:V(.26,1.42,.14),rightPole:V(.45,.1,-.3),gR:{point:.8},headPitch:-.3}],[211,{right:V(.155,.90,.10),gR:{fist:.15},headPitch:-.1}]],
      gaze:'moon',emotion:['neutral',{sad:.55,daze:.3}],jaw:1},
    E:{gaze:'alder',emotion:['determined',{}],cloak:.05}},
  m29:{E:{keys:[[213,{left:V(-.10,1.0,.17),gL:{fist:.5},headPitch:-.08}],[214.8,{}]],
      gaze:'bottle',emotion:null,jaw:1,bottleAt:[-.10,1.03,.20]},
    A:{gaze:'eileen',emotion:['neutral',{awe:.3}]}},
  m30:{E:{keys:[[220,{left:V(-.10,1.0,.17),gL:{fist:.5}}],[220.7,{}],[221.5,{left:V(-.12,.86,.06),gL:{fist:.15},headPitch:-.3}]], // 瓶脱手时刻=星离瓶（bottleHideAt 220.6）之后
      gaze:'star',emotion:['curious',{awe:.8}],bottleAt:[-.10,1.03,.20],bottleHideAt:220.6},
    A:{keys:[[220,{}],[221,{headPitch:-.3}]],gaze:'star',emotion:['neutral',{awe:.5}]}},
  m31:{E:{gaze:'sky',emotion:['curious',{awe:.6}],keys:[[227,{headPitch:-.35}]]},
    A:{gaze:'sky',emotion:['neutral',{awe:.5}],keys:[[227,{headPitch:-.3}]]}},
  m32:{E:{gaze:'stair',emotion:['curious',{awe:.65}],keys:[[234,{headPitch:-.3}]]},
    A:{gaze:'stair',emotion:['neutral',{awe:.5,daze:.3}],keys:[[234,{headPitch:-.25}]]}},
  m33:{A:{keys:[[241,{headPitch:-.2}]],gaze:'stair',emotion:['shocked',{shock:.35,tear:.5}],jaw:1},
    E:{gaze:'alder',emotion:['smile',{awe:.3}]}},
  m34:{E:{keys:[[248,{headYaw:0}],[249.5,{headYaw:-.85,headPitch:-.05}]], // 转身回眸（奥尔德在她右手侧：右转）
      gaze:'alder',emotion:['smile',{smile:1}],jaw:1},
    A:{gaze:'eileen',emotion:['neutral',{awe:.4,tear:.3}]}},
  m35:{E:{keys:[[254,{headYaw:-.85}],[255.5,{headYaw:0,headPitch:-.25}]],
      gaze:'stair',emotion:['smile',{awe:.35}],jaw:1},
    A:{gaze:'stair',emotion:['neutral',{awe:.45}]}},
  m36:{E:{pos:[5.15,-4.45],yaw:2.78,keys:[[261,{}],[262.1,{rightFoot:V(.10,.30,.28),headPitch:.15}],
      [262.9,{rightFoot:V(.08,.435,.36),headPitch:.10}],[263.3,{rightFoot:V(.08,.435,.36),bob:-.02}]], // 踏上星阶（接触帧=STEP_RING 263）
      gaze:'stair',emotion:['determined',{}]},
    A:{gaze:'eileen',emotion:['neutral',{awe:.5}]}},
  m37:{E:{climb:1,gaze:'moon',emotion:['determined',{awe:.3}],cloak:.05},
    A:{gaze:'eileen',emotion:['neutral',{awe:.5,tear:.3}],keys:[[267,{headPitch:-.15}],[272,{headPitch:-.35}]]}},
  // ── 第四幕 月亮宫殿 ──
  m38:{E:{walk:{from:[1.9,1.2],to:[0.9,-1.4],window:[276.5,282.5]}, // 入殿：小心慢步
      gaze:'ladymoon',emotion:['curious',{awe:.5,sad:.15}]},
    L:{keys:[[276,{gaze:'none'}],[280,{headPitch:.06}]],gaze:'eileen',emotion:['weary',{}]}},
  m39:{L:{gaze:'eileen',emotion:['weary',{sad:.25}],jaw:1},
    E:{pos:[0.9,-1.4],keys:[[284,{}],[285.5,{headPitch:-.3}]],gaze:'ladymoon',emotion:['lonely',{awe:.35}]}},
  m40:{E:{walk:{from:[0.9,-1.4],to:[.3,-3.4],window:[293,298.5]}, // 小心走近
      gaze:'ladymoon',emotion:['lonely',{firm:.35}],jaw:1},
    L:{gaze:'eileen',emotion:['weary',{}]}},
  m41:{L:{keys:[[300,{headPitch:.04}],[302,{headPitch:.16,gaze:'none'}]],gaze:'none',emotion:['weary',{sad:.45}],jaw:1},
    E:{gaze:'ladymoon',emotion:['lonely',{firm:.3}]}},
  m42:{E:{keys:[[308,{headPitch:-.05}],[309.5,{headPitch:-.12,headYaw:.06}]],gaze:'ladymoon',emotion:['curious',{firm:.5,sad:.2}],jaw:1},
    L:{gaze:'eileen',emotion:['weary',{sad:.3}]}},
  m43:{L:{keys:[[315,{}],[320.5,{right:V(.08,.68,.20),rightPole:V(.35,-.5,-.3),gR:{open:.45},headPitch:.10}],[323,{}]], // 极缓抬手触胸前（5s 水中飘）
      gaze:'none',emotion:['weary',{sad:.4}],jaw:1},
    E:{gaze:'ladymoon',emotion:['lonely',{firm:.4}]}},
  m44:{E:{keys:[[325,{}],[326.5,{headPitch:.25,gaze:'lamp'}], // 决断：低头看灯
      [328.3,{left:V(-.06,.92,.16),right:V(.06,.92,.16),gL:{open:.4},gR:{open:.4},headPitch:.18}], // 双手捧起（预备）
      [330,{headPitch:-.05,gaze:'ladymoon'}]],
      gaze:'ladymoon',emotion:['determined',{firm:.6}],
      lampKeys:[[326.5,[.13,.69,.067]],[328.3,[0,.90,.155]]]}, // 灯：手提→胸前捧（切换帧与腕位重合，零跳变）
    L:{gaze:'eileen',emotion:['weary',{}]}},
  m45:{E:{keys:[[331,{left:V(-.06,.92,.16),right:V(.06,.92,.16),gL:{open:.4},gR:{open:.4}}],
      [333.5,{left:V(-.055,.87,.245),right:V(.055,.87,.245),leftPole:V(-.3,-.4,-.3),rightPole:V(.3,-.4,-.3), // 递出（极值+接触）
        gL:{open:.5},gR:{open:.5},headPitch:.14,lean:.08}],[334.5,{}]],
      gaze:'ladymoon',emotion:null,jaw:1,
      lampKeys:[[331,[0,.90,.155]],[333.5,[0,.82,.30]]]},
    L:{keys:[[331,{}],[333,{headPitch:.12,gaze:'lamp'}]],gaze:'lamp',emotion:['weary',{awe:.15}]}},
  m46:{L:{keys:[[338,{headYaw:0}],[340.5,{headYaw:.09}],[343,{headYaw:-.09}],[344.6,{headYaw:0}]], // 缓慢摇头（慈爱地拒绝）
      gaze:'lamp',emotion:['weary',{smile:.3,sad:.3}],jaw:1},
    E:{keys:[[338,{left:V(-.055,.87,.245),right:V(.055,.87,.245),leftPole:V(-.3,-.4,-.3),rightPole:V(.3,-.4,-.3),
        gL:{open:.5},gR:{open:.5},headPitch:.14,lean:.08}]],
      gaze:'ladymoon',emotion:['determined',{}],lampKeys:[[338,[0,.82,.30]]]}},
  m47:{E:{keys:[[345,{left:V(-.055,.87,.245),right:V(.055,.87,.245),gL:{open:.5},gR:{open:.5},headPitch:.14,lean:.08}],
      [347.3,{left:V(-.06,.92,.16),right:V(.06,.92,.16),gL:{open:.4},gR:{open:.4},headPitch:.10,lean:.02}], // 收回抱怀
      [349,{}]], // 留白：之后不再塞动作
      gaze:'ladymoon',emotion:['determined',{sad:.2}],jaw:1,
      lampKeys:[[345,[0,.82,.30]],[347.3,[0,.90,.155]]]},
    L:{keys:[[345,{}],[346.5,{headPitch:.06}]],gaze:'eileen',emotion:['weary',{awe:.2}]}},
  m48:{E:{keys:[[352,{left:V(-.06,.92,.16),right:V(.06,.92,.16),gL:{open:.4},gR:{open:.4},headPitch:.10,lean:.02,tear:.25}],
      [362,{tear:1.1}]], // 含泪：身体不动，只有泪光蓄积（留白）
      gaze:'ladymoon',emotion:['tearful',{}],jaw:1,lampKeys:[[352,[0,.90,.155]]]},
    L:{gaze:'eileen',emotion:['weary',{smile:.2}]}},
  m49:{L:{keys:[[364,{}],[365.9,{tear:1.2}],[369.3,{tear:1.2}],[371,{tear:0}]], // TEAR_FALL 366→静止三秒→TEAR_BREAK 369
      freeze:[366,369.2],revivedAt:369.4,
      gaze:'eileen',emotion:['weary',{awe:.1}],jaw:1,jawUntil:370},
    E:{keys:[[364,{left:V(-.06,.92,.16),right:V(.06,.92,.16),gL:{open:.4},gR:{open:.4},headPitch:.10,lean:.02,tear:1.1}],[372,{tear:.5}]],
      gaze:'ladymoon',emotion:['tearful',{}],lampKeys:[[364,[0,.90,.155]]]}},
  // ── 第五幕 春天归来 ──
  m50:{A:{keys:[[374,{}],[375.5,{right:V(.075,1.06,.20),rightPole:V(.4,-.3,-.2),gR:{open:.4},headPitch:-.18}],[379.5,{}],[380.6,{right:V(.155,.90,.10),gR:{fist:.15},headPitch:-.25}]],
      gaze:'sky',emotion:['neutral',{sad:.5,daze:.3}],jaw:1}},
  m51:{A:{gaze:'sky',emotion:['neutral',{sad:.4,awe:.2}],keys:[[382,{headPitch:-.3}]]}},
  m52:{A:{keys:[[388,{}],[389.5,{headPitch:.30}]],gaze:'none',emotion:['neutral',{sad:.55}]}}, // 静默留白：只有垂视
  m53:{A:{keys:[[394,{}],[395.3,{right:V(.10,1.06,.20),rightPole:V(.4,-.2,-.3),gR:{open:.6},headPitch:.30}]], // 摊掌接花瓣（FIRST_PETAL 396）
      gaze:'hand',emotion:['neutral',{awe:.3,sad:.3}]}},
  m54:{A:{gaze:'sky',emotion:['neutral',{awe:.5}],keys:[[400,{headPitch:-.1}],[403,{headPitch:-.25}]]}},
  m55:{A:{gaze:'clock',emotion:['neutral',{awe:.6}],keys:[[407,{headPitch:-.3}],[408.5,{headPitch:-.45}]]}},
  m56:{A:{gaze:'street',emotion:['neutral',{awe:.7}],keys:[[412,{headYaw:.2,headPitch:-.1}]]}},
  m57:{A:{gaze:'windows',emotion:['neutral',{awe:.8}],keys:[[417,{headYaw:-.25,headPitch:-.05}]]}},
  m58:{A:{gaze:'sky',emotion:['relieved',{awe:.6}],keys:[[422,{headPitch:-.2}]]}},
  m59:{E:{keys:[[429,{}],[430.6,{right:V(.16,1.02,.10),gR:{fist:.6}}]], // 铜灯重亮，提灯微举
      gaze:'alder',emotion:['smile',{awe:.4}]},
    A:{gaze:'eileen',emotion:null,jaw:1,keys:[[429,{headPitch:-.35}]]}},
  m60:{E:{gaze:'alder',emotion:null,jaw:1},
    A:{gaze:'eileen',emotion:['relieved',{awe:.4}]}},
  m61:{A:{keys:[[443,{}],[444.3,{right:V(.09,1.12,.24),rightPole:V(.4,-.2,-.3),gR:{fist:.35},headPitch:.32}],[446,{tear:.7}]],
      gaze:'locket',emotion:['relieved',{tear:.7}],jaw:1}, // 怀表内画像+胸口升星（STAR_CHEST 446）
    E:{gaze:'alder',emotion:['smile',{awe:.3}]}},
  m62:{E:{keys:[[451,{}],[453,{}],[454.5,{left:V(-.06,.92,.16),right:V(.06,.92,.16),gL:{open:.4},gR:{open:.4},headPitch:.12}]],
      gaze:'lamp',emotion:['smile',{smile:.7}],
      lampKeys:[[453,[.13,.69,.067]],[454.5,[0,.90,.155]]]}, // 黑场前把灯捧到胸前（终幕构图）
    A:{gaze:'eileen',emotion:['relieved',{awe:.3}]}},
  m63:{E:{keys:[[464,{left:V(-.06,.92,.16),right:V(.06,.92,.16),gL:{open:.4},gR:{open:.4},headPitch:.10}],
      [467.5,{headPitch:-.28}]], // 抬头看月亮
      gaze:'moon',emotion:['smile',{awe:.35}],jaw:1,lampKeys:[[464,[0,.90,.155]]]},
    A:{gaze:'eileen',emotion:['relieved',{awe:.3}]}},
  m64:{E:{keys:[[472,{left:V(-.06,.92,.16),right:V(.06,.92,.16),gL:{open:.4},gR:{open:.4},headPitch:-.2,tear:0}],[476,{headPitch:-.1}]],
      gaze:'moon',emotion:['smile',{smile:.4}],lampKeys:[[472,[0,.90,.155]]]},
    A:{gaze:'eileen',emotion:['relieved',{}]}},
};

// 灯状态机：默认手提；m15 放到脚边（lampHandUntil 前仍手提，接触帧才落地）；
// m44-m49 / m62-m64 由 lampKeys 驱动（首个 key=手提位，切换零跳变）
function lampModeAt(e,t){
  if(e.lampKeys)return{at:keysAt(e.lampKeys,t)};
  if(e.lampHandUntil&&t<e.lampHandUntil)return{hand:'right'};
  if(t>=109&&t<184.5)return{ground:[.27,0,.16]};
  return{hand:'right'};
}

// ── 主入口：performAt(ctx,seg,t,u) → {contact,locomotion,limbBody,roots}（trace 用）──
// ctx={actors,scenes,TL,staging}
export function performAt(ctx,seg,t,u){
  const {actors,staging}=ctx;
  const out={contact:{hands:{}},locomotion:{},limbBody:{},roots:{}};
  const beat=B[seg.id]??{};
  for(const name of ['Eileen','Alder','LadyMoon']){
    const g=actors[name],actor=g.userData.actor,st=staging[name];
    const letter=name[0]==='E'?'E':name[0]==='A'?'A':'L';
    const e=beat[letter]??{};
    if(!st.visible){ // 不可见角色也要每帧归位到 staging（否则 seek 逆序访问时残留最后可见帧的位置）
      g.visible=false;g.position.set(...st.pos);g.rotation.y=st.yaw;continue;
    }
    g.visible=true;
    // 1) 根运动：走拍（walkingFeet 有限落脚）/ m37 登星阶 / 静态站位
    let walk=null,rootY=st.pos[1]??0;
    let root=[st.pos[0],st.pos[2]],yaw=st.yaw;
    if(e.walk){
      const w=e.walk,[w0,w1]=w.window,p=ease(clamp((t-w0)/(w1-w0)));
      root=[mix(w.from[0],w.to[0],p),mix(w.from[1],w.to[1],p)];
      const heading=w.facingYaw??Math.atan2(w.to[0]-w.from[0],w.to[1]-w.from[1]);
      yaw=angLerp(w.yawFrom??(t<w0+.6?st.yaw:heading),heading,ease(clamp((t-w0)/.8)));
      if(p>0&&p<1)walk={from:w.from,to:w.to,facingYaw:heading,strideFactor:w.strideFactor};
    }else if(e.climb){
      walk=climbSpec(ctx.scenes.towertop,t);
      root=[walk.rootX,walk.rootZ];yaw=walk.yaw;rootY=walk.rootY;
    }else{
      if(e.pos)root=e.pos;
      if(Array.isArray(e.yaw))yaw=angLerp(e.yaw[0],e.yaw[1],ease(clamp((t-e.yaw[2])/(e.yaw[3]-e.yaw[2]))));
      else if(typeof e.yaw==='number')yaw=e.yaw;
    }
    g.position.y=rootY;
    // 2) 姿势 patch：基底 + 拍级 keys（累积航点，cumKeys 缓存）
    const patch=e.keys?keysAt(e._ck??(e._ck=cumKeys(e.keys)),t):{};
    const base=baseSpec(name,t);
    const frozen=e.freeze&&t>=e.freeze[0]&&t<=e.freeze[1];
    const spec={rootX:root[0],rootZ:root[1],yaw,visible:true,
      headYaw:patch.headYaw??base.headYaw,headPitch:patch.headPitch??base.headPitch,headRoll:patch.headRoll??0,
      lean:patch.lean??base.lean,bob:frozen?0:(patch.bob??base.bob),
      left:patch.left??base.left,right:patch.right??base.right,
      leftPole:patch.leftPole,rightPole:patch.rightPole,
      gL:patch.gL??base.gL,gR:patch.gR??base.gR,
      footX:patch.footX??(e.walk?e.walk.footX??.078:undefined), // 走拍到位后保持落脚步宽（防滑步跳变）
      leftFoot:patch.leftFoot,rightFoot:patch.rightFoot};
    if(name==='LadyMoon'&&rootY>.3)spec.sit={hipY:.10,footY:-.55,footZ:.30};
    if(walk)spec.walk=walk;
    // 敲击（奥尔德修星）：右手在 tap 时刻下压
    if(e.tap&&spec.right)for(const tt of e.tap)spec.right=V(spec.right.x,spec.right.y-.03*Math.exp(-((t-tt)**2)/.02),spec.right.z);
    // 震惊手指颤抖（m22）
    if(e.tremble)spec.right=V(spec.right.x+e.tremble*Math.sin(t*41),spec.right.y+e.tremble*Math.sin(t*37+1),spec.right.z);
    // 道具状态机必须先于姿势求解（生长/道具态先于 setPose 纪律：setPose 当帧消费 lampMode，
    // 放后面会让 seek 逆序访问时读到未来帧的道具态——t=113 灯落地翻车实录）
    if(name==='Eileen'){
      actor.setLamp(lampModeAt(e,t));
      const bottleAt=e.bottleKeys?keysAt(e.bottleKeys,t):e.bottleAt;
      const hideBottle=e.bottleHideAt&&t>=e.bottleHideAt;
      actor.setBottle(bottleAt&&!hideBottle?{at:bottleAt}:null);
    }
    const p=buildPose(actor,spec,t,actor.dims);
    // 4) 表情：拍级覆盖 > act 映射 > 基底情绪（emotion:null=消费 act 映射）
    let emo=e.emotion;
    if(emo==null&&seg.act&&seg.character===name)
      emo=(EMO[name]??{})[seg.act.emotion]??['neutral',{}];
    if(emo==null)emo={E:['neutral',{}],A:['neutral',{}],L:['weary',{}]}[letter];
    if(e.revivedAt&&t>=e.revivedAt)emo=['revived',{}];
    actor.setEmotion(emo[0]);
    // 5) 视线：keys patch > 拍级 > 台词 act.gaze > 说话者互看
    let gz=patch.gaze??e.gaze;
    if(gz==null&&seg.act&&seg.character===name)gz=seg.act.gaze;
    if(gz==null&&seg.character&&actors[seg.character]&&seg.character!==name
      &&staging[seg.character]?.visible)gz=seg.character.toLowerCase();
    const gt=gz&&gz!=='none'?gazeTarget(gz,ctx,seg):null;
    if(gt)actor.face.lookAtWorld(gt);else actor.setActing({gazeX:0,gazeY:0});
    // 6) 口型包络占位 + 眨眼 + 拍级表情通道补丁（tear 等）
    const act={blink:frozen||e.blink0&&t>=e.blink0[0]&&t<=e.blink0[1]?0:clamp(base.blink)};
    const jawEnd=Math.min(seg.end,e.jawUntil??Infinity);
    if(seg.character===name&&seg.line){
      const jr=seg.act?jawReal(seg.act.id,t):null;
      act.jaw=jr==null?jawEnv(t,seg.start,jawEnd):jr;
    }
    const patch2={...emo[1]};
    if(patch.tear!==undefined)patch2.tear=patch.tear;
    if(Object.keys(patch2).length)Object.assign(act,patch2);
    actor.setActing(act);
    // 7) 次级运动（挂载件跟随衰减，全部 (t) 闭式）
    secondary(name,actor,t,e,frozen);
    // 8) trace：手/道具/步态/臂展世界坐标
    emitTrace(out,name,actor,g,p);
  }
  return out;
}

// m37 登星阶：沿真实台阶位置走（XZ walkingFeet + 根高随台阶），活体读场景几何不抄常量
function climbSpec(scene,t){
  const pts=scene.steps.slice(0,5).map(({s})=>[s.position.x,s.position.z,s.position.y]);
  const from=[pts[0][0],pts[0][1]],to=[pts[4][0],pts[4][1]];
  const p=ease(clamp((t-267)/9));
  const rootX=mix(from[0],to[0],p),rootZ=mix(from[1],to[1],p);
  // 根高=最近两台阶级插值（沿路径进度近似）
  const y=mix(pts[0][2],pts[4][2],p)+.06;
  return{from,to,rootX,rootZ,rootY:y,yaw:Math.atan2(to[0]-from[0],to[1]-from[1]),
    strideFactor:1.15}; // 星阶大跨步（极远景剪影，strideFactor 覆盖 .55 短步幅）
}

// 次级运动：斗篷摆（艾琳）/ 胡须跟随（奥尔德）/ 发片水中飘（夫人）——纯 t 函数，seek 安全。
// 冻结帧也必须写零位（跳过=残留上次写入值，顺序/seek 分叉——m49 泪前静止翻车实录）
function secondary(name,actor,t,e,frozen){
  if(name==='Eileen'&&actor.cloakPivot){
    let sway=0;
    if(!frozen){
      sway=.012*Math.sin(t*.8+2)+(e.cloak??0)*Math.sin(t*2.2);
      // 阵风（WIND_GUST 51 / WIND_HIGH 206-213）：冲击后阻尼衰减振荡
      if(t>51&&t<56)sway+=.10*Math.exp(-2.2*(t-51))*Math.sin(9*(t-51));
      if(t>206&&t<213)sway+=.05*Math.sin(8.5*t)*Math.sin(Math.PI*(t-206)/7);
    }
    actor.cloakPivot.rotation.x=sway;
  }else if(name==='Alder'&&actor.beard){
    actor.beard.rotation.x=.24+(frozen?0:.015*Math.sin(t*.9+4)+(e.tremble?.01*Math.sin(t*40):0));
    if(actor.beardTip)actor.beardTip.position.y=-.305+(frozen?0:.004*Math.sin(t*.9+3.2));
  }else if(name==='LadyMoon'&&actor.backLocks){
    actor.backLocks.forEach((m,i)=>{m.rotation.z=frozen?0:.02*Math.sin(t*.5+i*.7);m.rotation.x=frozen?0:.015*Math.sin(t*.38+i);});
  }
}

// trace 输出：世界坐标（接触探针消费，全部取自最终 matrixWorld——探针与渲染同源）
const _w=new THREE.Vector3();
const wp=o=>{o.getWorldPosition(_w);return[+_w.x.toFixed(4),+_w.y.toFixed(4),+_w.z.toFixed(4)];};
const wl=(m,x,y,z)=>{_w.set(x,y,z).applyMatrix4(m);return[+_w.x.toFixed(4),+_w.y.toFixed(4),+_w.z.toFixed(4)];};
function emitTrace(out,name,actor,g,p){
  const c=out.contact;
  c.hands[name]={left:wp(actor.hands.left),right:wp(actor.hands.right)};
  // 手臂三点 + 躯干轴（limb_attach / reach 豁免判定）
  (c.arms??={})[name]={};
  let armLen=0;
  for(const side of ['left','right']){
    const arm=p[side+'Arm'];
    c.arms[name][side]=[wl(g.matrixWorld,...Object.values(arm[0])),wl(g.matrixWorld,...Object.values(arm[1])),wl(g.matrixWorld,...Object.values(arm[2]))];
    if(side==='left')armLen=actor.dims.armA+actor.dims.armB;
    const sh=arm[0],wr=arm[2];
    const reach=Math.hypot(wr.x-sh.x,wr.y-sh.y,wr.z-sh.z)/armLen;
    out.limbBody[name+(side==='left'?'L':'R')]={reach:+reach.toFixed(3)};
  }
  // 躯干轴：[低点, 高点]——探针 down=ax[0]-ax[1] 要指向躯干下方（垂臂 elev≈0 才成立）
  (c.torsoAxis??={})[name]=[wl(actor.body.matrixWorld,0,actor.dims.hipIdle-.1,0),wl(actor.body.matrixWorld,0,actor.dims.shoulderY,0)];
  out.roots[name]=[+g.position.x.toFixed(4),+g.position.z.toFixed(4)]; // [x,z]：probe torso_dist 约定
  if(p.locomotion){
    out.locomotion[name]={kind:'walk',root:[+g.position.x.toFixed(4),+g.position.y.toFixed(4),+g.position.z.toFixed(4)],bob:+p.bob.toFixed(4),step:p.locomotion.step,
      feet:{left:{pitch:+(p.leftFootPitch??0).toFixed(4),stance:p.locomotion.contacts.left.stance},
            right:{pitch:+(p.rightFootPitch??0).toFixed(4),stance:p.locomotion.contacts.right.stance}}};
  }
  if(name==='Eileen'){
    if(actor.lamp.visible){c.lamp=wp(actor.lamp);(c.boxPos??={}).lamp=c.lamp;(c.boxVis??={}).lamp=true;}
    else if(c.boxVis)c.boxVis.lamp=false;
    if(actor.bottle.visible){c.bottle=wp(actor.bottle);(c.boxPos??={}).bottle=c.bottle;(c.boxVis??={}).bottle=true;}
    else if(c.boxVis)c.boxVis.bottle=false;
  }
  if(name==='Alder')c.watch=wp(actor.watches[1]);
  if(name==='LadyMoon'){c.ladyHip=wl(g.matrixWorld,0,.10,0);c.seatTop=[0,.9,-9];} // 髋在 mesh 空间（body 组含坐姿下沉偏移）
}
