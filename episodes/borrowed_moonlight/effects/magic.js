// 《借走月光的女孩》P4 魔法粒子系统装配 + 灯光反馈（圣经总指令：星辰金粒/月光银蓝/春天转化）。
// 全部 LCG 确定性种子 + 绝对时间闭式轨迹；发射器锚点一律活体 getWorldPosition
// （灯芯 flameAnchor、瓶口、泪点、钟面、怀表），不手写世界坐标常量；
// 静态场景件（台阶/天窗/瓶阵）在装配时从活体对象快照世界坐标（布局改动自动跟随）。
// 密度随高潮递增：m08 萤火 8 颗 → m21 星云 140 → m24 星座 170 → m49 泪碎 700（全片最高点）
// → m63 金粒聚字 ~850（签名镜头）。加色混合 + 低 alpha 小尺寸，避免过曝满屏。
//
// A3 起分两层（cel-cinema 粒子 3D 层重宿主）：
//   buildMagicFX({scenes,actors,TL})      —— viewer 链入口：活体对象树 → world → assembleMagicFX(mode:'3d')
//   assembleMagicFX({TL,world,mode})      —— 系统装配核心；world 只依赖锚点接口
//     world.anchors：Object3D 或 fn(t,out)→out（ParticleSystem 原生支持两种）
//     world.statics：steps/bottles/windows/skylight(Vector3 快照)/step0Anchor/moonSnow/moonTower/tower/petalHand
//     mode '3d' = 含反馈光 PointLight 与 m53 花瓣实体；'2d' = 纯粒子（art_pass 页自行承担光效）
import * as THREE from 'three';
import {ParticleSystem,ParticleDirector,lcg,clamp,ease,lerp} from './particles.js';
import {stagingFor,ANCHORS} from '../performance.js';

const GOLD=[1,.83,.48],GOLD_HOT=[1,.94,.72];
const SILVER=[.78,.88,1],SILVER_BLUE=[.60,.76,.98],MOON_WHITE=[.92,.96,1];
const PETAL=[1,.80,.88],LEAF_GOLD=[.72,.90,.52],AMBER=[1,.72,.38];

const _a=new THREE.Vector3(),_b=new THREE.Vector3();

// viewer 链活体 world：锚点挂角色头组/道具树（随骨骼姿态每帧更新），静态件快照世界坐标
function liveMagicWorld(scenes,actors){
  for(const s of Object.values(scenes))s.scene.updateMatrixWorld(true);
  const flameAnchor=actors.Eileen.userData.flameAnchor;
  const mkAnchor=(parent,p,name)=>{const a=new THREE.Object3D();a.name=name;a.position.set(...p);parent.add(a);return a;};
  // 眼睫锚点：脸部 UV 约定反解（眼心 y≈.086、x≈±.046）；z=.15 必须大于该高度前脸深 .128，
  // 否则锚点埋进颅骨、落睫粒子被头部网格遮挡（P4 探针实录）
  const eyeAnchor=mkAnchor(actors.Eileen.userData.actor.headGroup,[.046,.086,.15],'eyeAnchor');
  // 泪点锚点：夫人右下睑下方（z=.15 同理须出前脸表面）
  const tearAnchor=mkAnchor(actors.LadyMoon.userData.actor.headGroup,[.048,.058,.15],'tearAnchor');
  const chestAnchor=actors.Alder.userData.actor.watches[1]; // 胸口中号怀表
  const clockFace=scenes.snowtown.scene.getObjectByName('clockFace');
  // 苏醒瓶=艾琳手中星瓶道具（m20-m24 捧瓶拍由 viewer 接线 setBottle 显形）；
  // 工坊悬浮瓶阵离手部特写机位 3m+，拿场景瓶当锚点会把星云拍出画外
  const wakeBottle=actors.Eileen.userData.bottle;
  return {
    scenes,
    anchors:{
      flameAnchor,eyeAnchor,tearAnchor,chestAnchor,wakeBottle,clockFace,
      eileenHead:actors.Eileen.userData.actor.headGroup,
      eileenRoot:actors.Eileen,ladyRoot:actors.LadyMoon,
    },
    statics:{
      skylight:(()=>{const o=scenes.towertop.scene.getObjectByName('skylight');return o?o.getWorldPosition(new THREE.Vector3()):null;})(),
      steps:scenes.towertop.steps.map(({s})=>s.getWorldPosition(new THREE.Vector3())),
      step0Anchor:scenes.towertop.steps[0].s, // m36 脚部特写锚定的第一级（活体）
      bottles:scenes.clocktower.bottles.map(({g})=>g.getWorldPosition(new THREE.Vector3())),
      windows:scenes.snowtown.windows.map(w=>w.getWorldPosition(new THREE.Vector3())),
      moonSnow:scenes.snowtown.moon,moonTower:scenes.towertop.moon,
      tower:scenes.snowtown.tower,
      petalHand:actors.Alder.userData.actor.hands.right,
    },
  };
}

export function buildMagicFX({scenes,actors,TL}){
  return assembleMagicFX({TL,world:liveMagicWorld(scenes,actors),mode:'3d'});
}

export function assembleMagicFX({TL,world,mode='3d'}){
  const {scenes,anchors,statics}=world;
  const {flameAnchor,eyeAnchor,tearAnchor,chestAnchor,wakeBottle,clockFace,eileenHead,eileenRoot,ladyRoot}=anchors;
  const {skylight,steps,step0Anchor,bottles,windows:winPos,moonSnow,moonTower,tower,petalHand}=statics;
  const cueAt=name=>TL.segments.flatMap(s=>s.cues).find(c=>c.name===name)?.at??Infinity;
  const LAMP_OUT=cueAt('LAMP_OUT'),LAMP_RELIGHT=cueAt('LAMP_RELIGHT');
  const D=new ParticleDirector();
  // 锚点双形态读取：Object3D（活体）或 fn(t,out)（bake 重宿主）
  const readA=(a,t,out)=>typeof a==='function'?a(t,out):a.getWorldPosition(out);

  const visIn=(seg,name,sceneKey)=>seg.scene===sceneKey&&stagingFor(seg)[name]?.visible===true;
  // 终幕黑场因子（与 SnowTownScene.update 同式）：456 起 7s 渐暗
  const finK=t=>t<456?1:clamp(1-(t-456)/7);

  // ═══ 一、星辰金粒系统 ═══

  // 灯芯微金粒子（常开，点燃时；终幕黑场中它正是"仅存的亮"，不被 finK 压掉；
  // 圣经：情绪坚定时轻微上浮——P5 情绪包络，此处恒定缓升）
  const emberGate=t=>((t>=27&&t<LAMP_OUT)||(t>=LAMP_RELIGHT&&t<477.5))?1:0;
  D.add('snowtown',new ParticleSystem(scenes.snowtown.scene,{count:8,seed:101,anchor:flameAnchor,
    build:(i,rnd)=>{const ph=rnd()*1.7,a0=rnd()*6.28;return{
      t0:0,t1:1e9,
      pos:(u,t,out)=>{const l=((t*.62+ph)%1.7)/1.7;
        return out.set(Math.cos(a0+t*2.1)*.008*(1-l),l*.11,Math.sin(a0+t*2.1)*.008*(1-l));},
      size:()=>.006,
      alpha:(u,t)=>emberGate(t)*Math.sin(Math.PI*((t*.62+ph)%1.7)/1.7)*.8,
      color:GOLD};}}));
  // m47 一颗金点（ONE_SPARK@348）：熄灭的灯芯里浮起一颗金点，缓升向夫人
  D.add('moonpalace',new ParticleSystem(scenes.moonpalace.scene,{count:7,seed:147,anchor:flameAnchor,
    build:(i,rnd)=>{const head=i===0;return{
      t0:348+(head?0:.3+i*.28),t1:352.5+(head?0:i*.2),
      pos:(u,t,out)=>out.set(-.05*u*u+Math.sin(u*9+i)*.012*(head?0:1),
        .8*u*(head?1:.6+.3*Math.sin(i)),-.55*u*u),
      size:()=>head?.022:.008,
      alpha:(u,t)=>(head?.95:.6)*clamp(u/.08)*clamp((1-u)/.12),
      color:head?GOLD_HOT:GOLD};}}));

  // m08-m10 灯芯萤火：七八颗金粒自灯芯逸出，绕脸盘旋；最后一颗落上睫毛（m10）
  // 注意：粒子偏移加在世界空间，艾琳 yaw=π 脸朝 -z——"脸前方"=锚点背埋头心的方向，
  // 手写 +z 偏置会把盘旋轨迹埋进颅骨（P4 探针实录）； outward 由活体头心→眼睫锚点反解
  const _c=new THREE.Vector3(),_out=new THREE.Vector3();
  const lampToEye=(t,out)=>{readA(flameAnchor,t,_a);readA(eyeAnchor,t,_b);
    const land=ease(clamp((t-75.8)/.6)); // m10 落睫段（t≥75.8 最后一颗收向睑缘）
    const k=ease(clamp((t-59)/7));
    out.lerpVectors(_a,_b,k);
    if(k>0){readA(eileenHead,t,_c);_out.subVectors(_b,_c);_out.y=0;_out.normalize();
      out.addScaledVector(_out,(.10-.07*land)*k); // 脸前悬浮（落睫段收回 3cm）
      out.x+=.004*land*k;out.y-=.004*land*k;} // 落睫修型：探出碎发片（yaw π 世界系）
    return out;};
  D.add('snowtown',new ParticleSystem(scenes.snowtown.scene,{count:8,seed:108,anchor:lampToEye,
    build:(i,rnd)=>{const last=i===7,a0=rnd()*6.28,w=2.6+rnd()*1.6,r0=.18+rnd()*.13;
      const t0=58.5+i*.4,t1=last?77.6:69+rnd()*3.5;return{
      t0,t1,
      pos:(u,t,out)=>{
        if(last&&u>.90)return out.set(0,0,0); // 落睫：锚点已含落睫修型，贴睑缘
        const ang=a0+u*w*Math.PI*2,r=(last?r0*(1-u*.92):r0*(1-u*.4))+.015;
        return out.set(Math.cos(ang)*r,.03+.10*u+.05*Math.sin(ang*.7+i),Math.sin(ang)*r*.55);},
      size:(u,t)=>.013+.005*Math.sin(t*9+i*2),
      alpha:(u,t)=>clamp(u/.06)*clamp((1-u)/.08)*.95,
      color:i%3?[1,.74,.36]:[1,.86,.55]};}}));

  // m20 瓶内星核脉冲（STAR_PULSE@150）：瓶心小轨道微粒，随脉冲呼吸
  D.add('clocktower',new ParticleSystem(scenes.clocktower.scene,{count:24,seed:120,anchor:wakeBottle,
    build:(i,rnd)=>{const a0=rnd()*6.28,w=2+rnd()*2,rr=rnd();return{
      t0:0,t1:1e9,
      pos:(u,t,out)=>{const r=.03+rr*.02;
        return out.set(Math.cos(a0+t*w)*r,.02*Math.sin(a0*2+t*w*.7),Math.sin(a0+t*w)*r);},
      size:()=>.007,
      alpha:(u,t)=>clamp((t-150)/1.5)*clamp((157.5-t)/1.5)*(.45+.4*Math.sin(t*4.2+i)),
      color:GOLD_HOT};}}));

  // m21 星星苏醒（STAR_WAKE@156）：金色粒子旋转成星云，盘径渐张，尾段向上逃逸
  D.add('clocktower',new ParticleSystem(scenes.clocktower.scene,{count:140,seed:121,anchor:wakeBottle,
    build:(i,rnd)=>{const a0=rnd()*6.28,w=3.2+rnd()*3.4,rndr=rnd(),t0=156+rnd()*1.4;return{
      t0,t1:t0+21.5,
      pos:(u,t,out)=>{
        const ang=a0+u*w*Math.PI,r=.05+.36*ease(u)*(.4+rndr*.6);
        const esc=u>.82?(u-.82)*2.2:0; // 尾段上升逃逸
        return out.set(Math.cos(ang)*r*(1-esc*.4),.05*u+.03*Math.sin(ang*2)+esc,Math.sin(ang)*r*(1-esc*.4));},
      size:(u,t)=>.009+.005*Math.sin(t*7+i),
      alpha:(u,t)=>clamp(u/.08)*clamp((1-u)/.15)*.85,
      color:i%4?GOLD:GOLD_HOT};}}));

  // m24 群瓶共振（RESONANCE@178）：光线沿瓶间连线奔流成悬空星座 + 节点星点亮起
  {
    const nodes=Array.from({length:12},(_,i)=>bottles[Math.round(i*(bottles.length-1)/11)]);
    const edges=[];for(let i=0;i<12;i++)edges.push([i,(i+1)%12]);
    edges.push([0,5],[2,8],[4,10]); // 跨接辐条，构成星座而非单环
    const parts=[];
    for(const [ia,ib] of edges)for(let k=0;k<16;k++)parts.push({e:[ia,ib],k});
    D.add('clocktower',new ParticleSystem(scenes.clocktower.scene,{count:parts.length+12,seed:124,
      build:(i,rnd)=>{
        if(i>=parts.length){ // 节点星点
          const n=nodes[i-parts.length];return{t0:178,t1:192,
            pos:(u,t,out)=>out.copy(n),
            size:(u,t)=>.06+.02*Math.sin(t*5+i),
            alpha:(u,t)=>clamp(u/.12)*clamp((1-u)/.15)*(.6+.3*Math.sin(t*4+i*1.7)),
            color:i%2?GOLD_HOT:MOON_WHITE};}
        const {e:[ia,ib],k}=parts[i],A=nodes[ia],B=nodes[ib],t0=178.2+(i%48)*.06+rnd()*.3;
        return{t0,t1:t0+3.2,
          pos:(u,t,out)=>out.lerpVectors(A,B,u).setY(lerp(A.y,B.y,u)+.18*Math.sin(Math.PI*u)),
          size:()=>.05,
          alpha:(u,t)=>Math.sin(Math.PI*u)*.9,
          color:k%3?GOLD:SILVER};}}));
  }

  // m30 第一颗星离瓶（STAR_RISE@220）：亮头 + 长尾金粒盘旋升空
  {
    const riseAnchor=(t,out)=>{readA(eileenRoot,t,out);out.y+=1.0;return out;};
    D.add('towertop',new ParticleSystem(scenes.towertop.scene,{count:90,seed:130,anchor:riseAnchor,
      build:(i,rnd)=>{const head=i===0,a0=rnd()*6.28,t0=220+(head?0:i*.045);return{
        t0,t1:t0+(head?6.5:5.2),
        pos:(u,t,out)=>{const rise=u*7.5,ang=a0+u*4*Math.PI,r=(.14+u*1.1)*(head?0.3:1);
          return out.set(Math.cos(ang)*r,rise,Math.sin(ang)*r-u*3.2);},
        size:head?(u,t)=>.08+.025*Math.sin(t*10):()=> .026, // P7：远机位尾粒 .013 亚像素不可读，翻倍
        alpha:(u,t)=>(head?1:.75)*clamp(u/.05)*clamp((1-u)/.12),
        color:head?GOLD_HOT:GOLD};}}));
  }

  // m31 群星穿过天窗（STARS_SWARM@227）：金粒自天窗涌向星阶各级（路径闭环到台阶锚点）
  D.add('towertop',new ParticleSystem(scenes.towertop.scene,{count:180,seed:131,
    build:(i,rnd)=>{
      const target=steps[i%steps.length],t0=227+rnd()*2.2,dur=6+rnd()*5;
      const sx=skylight??new THREE.Vector3();
      const jx=(rnd()-.5)*.6,jy=(rnd()-.5)*.5;
      return{t0,t1:t0+dur,
        pos:(u,t,out)=>{const e=ease(u);
          return out.lerpVectors(sx,target,e).set(
            out.x+jx*Math.sin(Math.PI*u)+.15*Math.sin(u*9+i),
            out.y+jy*Math.sin(Math.PI*u)+.3*Math.sin(Math.PI*u),
            out.z+.12*Math.cos(u*7+i));},
        size:()=>.052, // P7：环绕广角机位 15-25m，.032 读出不足
        alpha:(u,t)=>clamp(u/.07)*clamp((1-u)/.1)*.85,
        color:i%5?GOLD:GOLD_HOT};}}));

  // m32 星阶生成（STAIR_FORM@235）：每级台阶凝形时银蓝晶化冰晶迸点
  {
    const per=16,parts=[];
    for(let s=0;s<steps.length;s++)for(let k=0;k<per;k++)parts.push(s);
    D.add('towertop',new ParticleSystem(scenes.towertop.scene,{count:parts.length,seed:132,
      build:(i,rnd)=>{
        const si=parts[i],c=steps[si],birth=235+si*.55+rnd()*.2;
        const a0=rnd()*6.28,el=(rnd()-.5)*.9;return{t0:birth,t1:birth+1.0,
        pos:(u,t,out)=>{const r=.1+u*.42;
          return out.set(c.x+Math.cos(a0)*r*Math.cos(el),c.y+.06+Math.sin(el)*r*.4,c.z+Math.sin(a0)*r*Math.cos(el));},
        size:()=>.09, // P7：stair_form 侧面全景下晶化迸点加大
        alpha:(u,t)=>(1-u)*.95,
        color:i%4?SILVER_BLUE:MOON_WHITE};}}));
  }

  // m36 登阶波纹（STEP_RING@263）：落脚级银蓝粒子环形波纹三连荡开
  {
    const per=40;
    D.add('towertop',new ParticleSystem(scenes.towertop.scene,{count:per*3,seed:136,anchor:step0Anchor,
      build:(i,rnd)=>{const ring=Math.floor(i/per),a0=(i%per)/per*6.283+rnd()*.1;
        return{t0:263+ring*.45,t1:263+ring*.45+1.35,
        pos:(u,t,out)=>{const r=.14+u*1.35;
          return out.set(Math.cos(a0)*r,.03+.05*Math.sin(Math.PI*u),Math.sin(a0)*r);},
        size:()=>.017,
        alpha:(u,t)=>(1-u)*.95,
        color:ring===1?MOON_WHITE:SILVER_BLUE};}}));
  }

  // m37 登月远景（CHOIR@267）：星阶长尾轨迹——沿阶梯路径的拖尾流光
  D.add('towertop',new ParticleSystem(scenes.towertop.scene,{count:130,seed:137,
    build:(i,rnd)=>{const w=rnd()*(steps.length-1.01),si=Math.floor(w),f=w-si;
      const base=new THREE.Vector3().lerpVectors(steps[si],steps[si+1],f);
      const t0=267+rnd()*2.5,ph=rnd()*6.28;return{t0,t1:t0+8.5,
      pos:(u,t,out)=>out.set(base.x+.2*Math.sin(ph+t*.8),base.y+.05+.35*u,base.z+.2*Math.cos(ph+t*.8)),
      size:()=>.032,
      alpha:(u,t)=>clamp(u/.06)*clamp((1-u)/.2)*(.5+.35*Math.sin(t*6+ph)),
      color:i%3?SILVER_BLUE:GOLD};}}));

  // m61 胸口升星（STAR_CHEST@446）：沉睡三十年的星自怀表升起，螺旋金尘相随
  D.add('snowtown',new ParticleSystem(scenes.snowtown.scene,{count:80,seed:161,anchor:chestAnchor,
    build:(i,rnd)=>{const head=i===0,a0=rnd()*6.28,rise=.7+rnd()*.5,t0=446+(head?0:rnd()*.9);return{
      t0,t1:t0+(head?7:3+rnd()*2.2),
      pos:(u,t,out)=>{const ang=a0+u*4*Math.PI,r=head?.03:.04+.3*u;
        return out.set(Math.cos(ang)*r,u*(head?1.15:rise)+.02,Math.sin(ang)*r+.02);},
      size:head?(u,t)=>.034+.012*Math.sin(t*8):()=>.009,
      alpha:(u,t)=>(head?clamp(u/.1)*clamp((1-u)/.25):clamp(u/.1)*(1-u)*.8)*finK(t),
      color:head?GOLD_HOT:GOLD};}}));

  // m63 终幕签名镜头（GOLD_TEXT@466）：金粒聚成「只要还有人等待，光就不会真正消失。」
  // 粒子吸附到 canvas 文字采样点；最后一粒散场后升向月亮。
  {
    const {targets,center}=textTargets();
    const n=targets.length;
    D.add('snowtown',new ParticleSystem(scenes.snowtown.scene,{count:n,seed:163,anchor:flameAnchor,
      build:(i,rnd)=>{
        const tg=targets[i],t0=466+rnd()*.5;
        const off=new THREE.Vector3((rnd()-.5)*1.1,(rnd()-.5)*.8-.15,(rnd()-.5)*.7);
        const sw=(rnd()-.5)*.5,upV=.55+rnd()*.3,lone=i===0;
        return{t0,t1:lone?477.8:472.3,
        pos:(u,t,out,o)=>{ // o=灯芯世界位（本段艾琳静立，灯为唯一点光）
          if(u<.52){ // 聚集：灯周云团 → 文字采样点（螺旋收拢）
            const e=ease(u/.52),r=(1-e);
            _a.copy(o).add(off);_a.x+=Math.sin(u*9+i)*.15*r;_a.y+=Math.cos(u*7+i)*.1*r;
            return out.copy(_a).lerp(tg,e).sub(o);
          }
          if(u<.82)return out.copy(tg).sub(o); // 持字（微烁在 alpha 承担）
          const d=(u-.82)/.18; // 散去：上扬漂散
          _a.copy(tg);_a.x+=sw*d*.5;_a.y+=d*(lone?0:upV);_a.z+=d*.2;
          if(lone){_a.y+=d*2.4;_a.x+=d*.6;} // 最后一粒升向月亮（d 连续起算防跳变）
          return out.sub(o);},
        size:(u,t)=>lone?.016:(u<.82?.0095:.008),
        alpha:(u,t)=>{
          if(lone&&u>=.82)return .95*clamp((u-.82)/.06)*clamp((1-u)/.05);
          const hold=u>=.52&&u<.82;
          return clamp(u/.1)*clamp((1-u)/.06)*(hold?.8+.18*Math.sin(t*7+i*1.3):.85);},
        color:i%6?GOLD_HOT:GOLD};}}));
  }

  // ═══ 二、月光银蓝系统 ═══

  // m06/m26 月晕边缘银粉消散（MOON_DIM/MOON_FADE）：月轮边缘银粉缓慢剥离飘散
  for(const [key,moon,win] of [['snowtown',moonSnow,[43,60]],['towertop',moonTower,[192,215]]]){
    D.add(key,new ParticleSystem(scenes[key].scene,{count:36,seed:206,anchor:moon,
      build:(i,rnd)=>{const a0=rnd()*6.28,t0=win[0]+rnd()*(win[1]-win[0]-6);return{
        t0,t1:t0+6,
        pos:(u,t,out)=>{const r=key==='snowtown'?5:7; // 月轮半径
          const x=Math.cos(a0)*r,y=Math.sin(a0)*r;
          return out.set(x+u*.9+u*u*.6,y-u*.5-u*u*.8,.3);},
        size:()=>.25,
        alpha:(u,t)=>clamp(u/.15)*(1-u)*.4,
        color:SILVER};}}));
  }

  // m41 起月亮夫人身体边缘银粉消散（被遗忘→消失）；泪碎后停止
  D.add('moonpalace',new ParticleSystem(scenes.moonpalace.scene,{count:70,seed:241,anchor:ladyRoot,
    build:(i,rnd)=>{const side=rnd()<.5?-1:1,y0=.15+rnd()*1.5,ph=rnd()*6.28,w=.06+rnd()*.05;
      return{t0:0,t1:1e9,
      pos:(u,t,out)=>{const l=((t*w+ph)%1);
        return out.set(side*(.20+.05*Math.sin(ph*3))+l*.22*side,y0+l*.25,-.05+l*.1);},
      size:()=>.009,
      alpha:(u,t)=>{if(t<300||t>369)return 0;const l=((t*w+ph)%1);
        return Math.sin(Math.PI*l)*.38*clamp((t-300)/6);},
      color:SILVER};}}));

  // m49 泪珠（TEAR_FALL@366）：悬浮泪珠 + 泪中细小星河（内旋微粒），静止三秒
  D.add('moonpalace',new ParticleSystem(scenes.moonpalace.scene,{count:26,seed:249,anchor:tearAnchor,
    build:(i,rnd)=>{const core=i<6,a0=rnd()*6.28,w=1.5+rnd()*2,rr=.02+rnd()*.012;return{
      t0:366,t1:369.3,
      pos:(u,t,out)=>{
        const bob=-.02*u-.06*ease(clamp((u-.55)/.45)); // 悬停缓沉，将落未落
        if(core)return out.set(Math.cos(a0+t*w)*.011,bob+Math.sin(a0*2+t*w)*.008,Math.sin(a0+t*w)*.011);
        return out.set(Math.cos(a0)*rr,bob+Math.sin(a0)*rr*1.3,Math.sin(a0)*rr);}, // 泪膜壳层
      size:()=>core?.006:.005,
      alpha:(u,t)=>clamp(u/.1)*clamp((1-u)/.05)*(.9+.1*Math.sin(t*12+i)),
      color:core?MOON_WHITE:(i%4?SILVER_BLUE:GOLD_HOT)};}}));

  // m49 泪碎（TEAR_BREAK@369，全片特效最高点）：万千银粒螺旋扩散
  D.add('moonpalace',new ParticleSystem(scenes.moonpalace.scene,{count:700,seed:250,anchor:tearAnchor,
    build:(i,rnd)=>{const a0=rnd()*6.28,el=(rnd()-.42)*1.1,sp=.7+rnd()*1.7,curl=2+rnd()*2.5;
      const t0=369+rnd()*.22,life=2.4+rnd()*1.8;return{
      t0,t1:t0+life,
      pos:(u,t,out)=>{
        const r=sp*2.1*(1-(1-u)*(1-u)),ang=a0+u*curl; // 减速扩散 + 螺旋上卷
        return out.set(Math.cos(a0)*r*Math.cos(el)+(Math.cos(ang)-Math.cos(a0))*.18*r,
          Math.sin(el)*r*.8+.45*u*u,
          Math.sin(a0)*r*Math.cos(el)+(Math.sin(ang)-Math.sin(a0))*.18*r);},
      size:(u,t)=>.007+.005*Math.sin(i+t*6),
      alpha:(u,t)=>clamp(u/.04)*(1-u)*.42,
      color:i%7?SILVER:(i%2?MOON_WHITE:GOLD_HOT)};}}));

  // ═══ 三、春天转化系统 ═══

  // S01 常开：雪粒落地前化蓝色光点（小而疏，近地闪烁）
  D.add('snowtown',new ParticleSystem(scenes.snowtown.scene,{count:60,seed:301,
    build:(i,rnd)=>{const x=-22+rnd()*44,z=-26+rnd()*32,off=rnd()*24;return{
      t0:0,t1:1e9,
      pos:(u,t,out)=>out.set(x+Math.sin(t*.6+i)*.2,24-((off+t*.9)%24),z),
      size:()=>.06,
      alpha:(u,t)=>{const y=24-((off+t*.9)%24);
        if(y>1.1||t>404)return 0;
        return (1-y/1.1)*(.5+.4*Math.sin(t*8+i*2.1))*clamp((404-t)/2)*finK(t);},
      color:SILVER_BLUE};}}));

  // m55 钟声第一响（BELL1@408）：钟面金色声波环三连扩散（檐雪消融由灯光承担）
  {
    const per=46;
    D.add('snowtown',new ParticleSystem(scenes.snowtown.scene,{count:per*3,seed:355,anchor:clockFace,
      build:(i,rnd)=>{const ring=Math.floor(i/per),a0=(i%per)/per*6.283+rnd()*.08;
        return{t0:408+ring*.85,t1:408+ring*.85+1.7,
        pos:(u,t,out)=>{const r=.4+u*6;
          return out.set(Math.cos(a0)*r,Math.sin(a0)*r*.82,.4+u*2.2);},
        size:()=>.09,
        alpha:(u,t)=>(1-u)*.9,
        color:ring===0?GOLD_HOT:GOLD};}}));
  }

  // m56 第二响（BELL2@413）：枯树抽芽——沿街绿金微粒上浮
  D.add('snowtown',new ParticleSystem(scenes.snowtown.scene,{count:170,seed:356,
    build:(i,rnd)=>{const w=winPos[i%winPos.length];
      const bx=w.x+(rnd()-.5)*3.5,bz=w.z+1.2+rnd()*2.5,by=.3+rnd()*2.2;
      const t0=413.2+rnd()*3,ph=rnd()*6.28,l=2.6+rnd()*1.6,rise=1.2+rnd();return{
      t0,t1:t0+l,
      pos:(u,t,out)=>out.set(bx+.3*Math.sin(ph+u*5),by+u*rise,bz+.25*Math.cos(ph+u*4)),
      size:()=>.038,
      alpha:(u,t)=>clamp(u/.1)*(1-u)*.85,
      color:u=>u<.5?LEAF_GOLD:GOLD};}}));

  // m57 第三响（BELL3@418）：窗灯依次亮起——琥珀光点自窗口升腾（窗体亮序在场景 update）
  D.add('snowtown',new ParticleSystem(scenes.snowtown.scene,{count:60,seed:357,
    build:(i,rnd)=>{const wi=i%winPos.length,w=winPos[wi];
      const t0=418+wi*.5+rnd()*.6,jx=(rnd()-.5)*.5;return{
      t0,t1:t0+2.2,
      pos:(u,t,out)=>out.set(w.x+jx,w.y+.2+u*1.1,w.z+.4+u*.3),
      size:()=>.06,
      alpha:(u,t)=>clamp(u/.12)*(1-u)*.95,
      color:AMBER};}}));

  // m58 日出花瓣风场（SUNRISE@422）：金色花粉随风阵掠过春野（花瓣本体=场景双皮肤系统）
  D.add('snowtown',new ParticleSystem(scenes.snowtown.scene,{count:140,seed:358,
    build:(i,rnd)=>{const x=-20+rnd()*34,y=.6+rnd()*5,z=-24+rnd()*26,t0=422+rnd()*9,l=5+rnd()*4;
      const ph=rnd()*6.28;return{
      t0,t1:t0+l,
      pos:(u,t,out)=>{const gust=.7+.5*Math.sin(t*.5+ph)+.25*Math.sin(t*1.3+ph*2);
        return out.set(x+u*l*1.15*gust,y+.5*Math.sin(ph+u*6)+u*.4,z-u*l*.22*gust);},
      size:()=>.042,
      alpha:(u,t)=>clamp(u/.08)*clamp((1-u)/.15)*.6,
      color:i%4?GOLD:PETAL};}}));

  // m51 星阶远去（STAIR_FADE@382）：高空金粒渐远
  D.add('snowtown',new ParticleSystem(scenes.snowtown.scene,{count:40,seed:351,anchor:tower,
    build:(i,rnd)=>{const x=(rnd()-.5)*8,y=16+rnd()*14,z=-6-rnd()*20,t0=382+rnd()*2;return{
      t0,t1:t0+7,
      pos:(u,t,out)=>out.set(x+u*3,y+u*2.5,z-u*6),
      size:()=>.12,
      alpha:(u,t)=>clamp(u/.1)*(1-u)*.5,
      color:GOLD};}}));

  // ═══ 四、面部/环境光照反馈（3D 模式专属：与粒子同包络，活体锚点；光无声则假、光无火则浮）═══
  // 2D 重宿主模式跳过 PointLight（无受光面）；art_pass 页以同包络二维辉光承担反馈。
  if(mode==='3d'){
  for(const key of ['snowtown','clocktower','towertop','moonpalace']){
    const lampLight=new THREE.PointLight(0xffbe58,0,2.6,2);
    scenes[key].scene.add(lampLight);
    D.addLight(key,lampLight,flameAnchor,(t,seg)=>{
      if(!visIn(seg,'Eileen',key))return 0;
      const lit=t<LAMP_OUT||t>=LAMP_RELIGHT;if(!lit)return 0;
      let I=.85*(1+.14*Math.sin(t*11.7)+.06*Math.sin(t*5.3));
      if(key==='moonpalace')I*=.7;
      if(t>=LAMP_RELIGHT)I*=1.15; // 重燃更暖
      if(t>473)I*=clamp((477.5-t)/4.5); // FADE：灯火缓灭
      return I;
    });
  }
  { // 萤火映脸（m08-m10 金粒在脸旁盘旋的暖反馈）
    const l=new THREE.PointLight(0xffd080,0,1.6,2);scenes.snowtown.scene.add(l);
    D.addLight('snowtown',l,eyeAnchor,t=>clamp((t-59)/2)*clamp((77-t)/2)*.5);
  }
  { // 星瓶苏醒暖光（m20-m24）
    const l=new THREE.PointLight(0xffd980,0,9,2);scenes.clocktower.scene.add(l);
    D.addLight('clocktower',l,wakeBottle,t=>{
      if(t<150||t>192)return 0;
      const pulse=.6+.4*Math.sin(t*3.2);
      return clamp((t-150)/2)*pulse*(t<178?3.2:3.2+5*clamp((t-178)/4))*clamp((192-t)/2);
    });
  }
  { // 泪光（m49）：悬停蓄积 → 碎裂闪 → 余辉
    const l=new THREE.PointLight(0xcfe0f4,0,16,2);scenes.moonpalace.scene.add(l);
    D.addLight('moonpalace',l,tearAnchor,t=>{
      if(t<366)return 0;
      if(t<369)return .6+2.4*clamp((t-366)/3);
      if(t<369.6)return 9;
      return 9-4*clamp((t-369.6)/4)+5*clamp((t-373)/3); // 余辉由场景 glow 接管
    });
  }
  { // 胸口升星暖光（m61）
    const l=new THREE.PointLight(0xffd080,0,3.5,2);scenes.snowtown.scene.add(l);
    D.addLight('snowtown',l,chestAnchor,t=>t<446||t>456?0:1.8*clamp((t-446)/3)*clamp((456-t)/3));
  }
  }

  // m53 第一片花瓣（FIRST_PETAL@396）：单片花瓣实体落在老人摊开的手背上（落点=活体右手，
  // 下落/飘摆/停歇全部 (t) 闭式）；m53 手部特写的内容本体。3D 网格实体，2D 模式不建。
  let petal=null;
  if(mode==='3d'){
    petal=new THREE.Mesh(new THREE.CircleGeometry(.024,8),
      new THREE.MeshBasicMaterial({color:'#f4b8cc',side:THREE.DoubleSide}));
    petal.geometry.scale(1,.55,1);
    petal.visible=false;scenes.snowtown.scene.add(petal);
  }

  return {update(t,seg,camera){D.update(t,seg.scene,camera,seg);
    if(petal){
      petal.visible=t>=395.2&&t<407;
      if(petal.visible){
        petalHand.getWorldPosition(_a);
        const k=clamp((t-395.2)/1.1); // 395.2 高处入画 → 396.3 落上手背
        petal.position.set(_a.x+.06*(1-k)*Math.sin(t*7),_a.y+.045+1.1*(1-k)*(1-k),_a.z+.04*(1-k)*Math.cos(t*6));
        petal.rotation.set(-Math.PI/2+.5*(1-k)*Math.sin(t*9),0,.4*(1-k)*Math.sin(t*5));
      }
    }
  },director:D,
    anchors:{flameAnchor,eyeAnchor,tearAnchor,chestAnchor,wakeBottle,clockFace}};
}

// 终幕文字采样：canvas 生成「只要还有人等待，光就不会真正消失。」底图，
// 亮度阈值取采样点，映射到 m63 goodnight 机位前方的世界平面（面向相机）。
function textTargets(){
  const c=document.createElement('canvas');c.width=1024;c.height=160;
  const g=c.getContext('2d',{willReadFrequently:true});
  g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';
  g.font='600 84px KaiTi,STKaiti,serif';
  g.fillText('只要还有人等待，',512,46);g.fillText('光就不会真正消失。',512,124);
  const img=g.getImageData(0,0,1024,160).data;
  let pts=[];for(let y=0;y<160;y+=3)for(let x=0;x<1024;x+=3)
    if(img[(y*1024+x)*4+3]>110)pts.push([x,y]);
  if(pts.length>950){const k=pts.length/950,out=[];
    for(let i=0;i<950;i++)out.push(pts[Math.floor(i*k)]);pts=out;}
  const a=ANCHORS.snowtown.goodnight;
  const pos=new THREE.Vector3(...a.pos),look=new THREE.Vector3(...a.look);
  const fwd=look.clone().sub(pos).normalize();
  const right=new THREE.Vector3().crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();
  const up=new THREE.Vector3().crossVectors(right,fwd).normalize();
  const center=look.clone().add(new THREE.Vector3(.58,.50,-.03)); // 灯焰右上方黑场空位（让开艾琳头身遮挡；P7 复验：旧 +.25 左缘仍压脸、+.42 压奥尔德面部，上移并收窄）
  const W=.60,H=.11;
  const targets=pts.map(([x,y])=>center.clone()
    .addScaledVector(right,(x/1024-.5)*W).addScaledVector(up,(.5-y/160)*H));
  return {targets,center};
}
