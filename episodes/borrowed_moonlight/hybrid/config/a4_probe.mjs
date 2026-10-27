// A4 art_pass 整集探针（pipeline --step probe，在 hybrid/art_pass.html 页上下文执行）。
// 在 a3_probe 基础上扩展为全片覆盖（A3 只覆盖 w1/w2 两窗口）：
//   1. manifest missingAssets=0 + 地标表与 trim 高度一致性（<7%）
//   2. 人高/眼线渲染实测断言（测像素不测参数）：五个姿势 cel 覆盖全部眼源类型
//      ——offer_lamp（地标表）/offer_lamp_back（A4 新补，地标表）/sit_throne（A4 复测 .135）/
//        crouch（A4 复测 .215）/stand_work（A4 复测 .123）；画中灯对 bake 灯焰锚点
//   3. 肖像层实测跨高（Eileen/LadyMoon/Alder 三角色的 face_close/macro 各一）
//   4. 走拍相位：行程单调 + 换腿节拍对齐 bake 左脚落地事件（m04）
//   5. seek 一致：全片 22 个乱序时刻双渲 PNG 全等（含泪碎/雪转花/聚字/终幕关键时刻）
//   6. 粒子存在性：十个大场面时刻逐一点名（萤火/星云/星阶/ONE_SPARK/消散/泪碎/
//      雪转花/钟声金波/胸口升星/金粒聚字）
//   7. m46 构图回归断言（P7 曾出画）：艾琳实测跨高>120px 且未剔除
export function probe(){
  const art=window.__art,motion=window.__motion;
  if(!art||!motion)return{passed:false,error:'art_pass not ready'};
  const R={passed:false,checks:{}};

  // 1) 资产清单
  R.checks.manifest={ok:art.missingAssets.length===0,missing:art.missingAssets};
  const drift=art.landmarkCheck.filter(x=>x.drift>.07);
  R.checks.landmarks={ok:drift.length===0,checked:art.landmarkCheck.length,tolerance:.07,
    note:'trim 含水彩软边余量，系统性 3-6% 偏高为已知（眼线上段实测断言兜底）',drift};

  // 2) 人高/眼线渲染实测（近景全身 cel 必然出画——测"头顶在框内"的上段：
  //    实测 alpha 顶到 bake 眼线锚的像素距 vs landmark eyeFrac × 摆放高，±max(6px,4%)）
  const bodyCases=[[345.5,'Eileen',.0778],[341,'LadyMoon',.135],[341.5,'Eileen',.100],
    [113.5,'Eileen',.215],[105,'Alder',.123]];
  const bodyResults=bodyCases.map(([t,actor,lm])=>{
    const m=art.measureSpan(t,actor);
    if(!m.placed)return{t,actor,ok:false,reason:'culled'};
    const above=m.eyeScreen[1]-m.top,expect=lm*m.expectedH;
    const err=Math.abs(above-expect),tol=Math.max(6,.04*m.expectedH);
    return{t,actor,key:m.key,above:+above.toFixed(1),expect:+expect.toFixed(1),
      err:+err.toFixed(1),tol:+tol.toFixed(1),top:m.top,ok:m.top>0&&err<=tol};
  });
  // 画中灯对 bake 灯焰锚点（m45 递灯正面：ONE_SPARK 与画灯同位的像素级验证）。
  // m46 过肩背影：灯在画幅下缘外（与 3D 成片同构图，P7 审定）——回归断言"灯投影在画幅下方之外"。
  {
    const flameP=art.projAt(335,art.frameAt(335).anchors.world.flameAnchor);
    const lampHit=art.alphaNear(335,'Eileen',flameP[0],flameP[1],15);
    bodyResults.push({t:335,actor:'Eileen',check:'lamp@flameAnchor',flameP:flameP.map(v=>+v.toFixed(1)),
      maxAlpha:lampHit.maxAlpha,ok:lampHit.placed&&lampHit.maxAlpha>24});
    const f46=art.projAt(341.5,art.frameAt(341.5).anchors.world.flameAnchor);
    bodyResults.push({t:341.5,actor:'Eileen',check:'m46_lamp_below_frame',flameP:f46.map(v=>+v.toFixed(1)),
      ok:f46[1]>720});
  }
  // m46 构图回归（P7：机位曾把她甩出画）
  {
    const m=art.measureSpan(341.5,'Eileen');
    bodyResults.push({t:341.5,actor:'Eileen',check:'m46_in_frame',key:m.key,
      measuredH:m.measuredH,ok:!!m.placed&&m.measuredH>120});
  }
  // 肖像层：实测 alpha 跨高=旋转后四角包络经画幅裁剪的期望跨高 ±2%
  // （头滚转 roll≠0 时旋转矩形竖向跨高 > drawnH，A3 的夹取公式漏算 roll，m52 假红）
  const faceAnchor={Eileen:{eyeY:.370,faceX:.500},LadyMoon:{eyeY:.261,faceX:.490},Alder:{eyeY:.314,faceX:.500}};
  const faceResults=[[355,'Eileen',1000],[370,'LadyMoon',1150],[391,'Alder',1000]].map(([t,actor,hExp])=>{
    const m=art.measureSpan(t,actor);
    if(!m.placed)return{t,actor,ok:false,reason:'not placed'};
    const fa=faceAnchor[actor],w=m.drawnW??hExp,h=m.expectedH,r=m.roll??0;
    const p=m.eyeScreen;
    const cr=Math.cos(r),sr=Math.sin(r);
    let top=Infinity,bot=-Infinity;
    for(const [cx,cy]of[[-fa.faceX*w,-fa.eyeY*h],[(1-fa.faceX)*w,-fa.eyeY*h],[-fa.faceX*w,(1-fa.eyeY)*h],[(1-fa.faceX)*w,(1-fa.eyeY)*h]]){
      const ry=p[1]+cx*sr+cy*cr;
      if(ry<top)top=ry;if(ry>bot)bot=ry;
    }
    const clipTop=Math.max(0,top),clipBot=Math.min(719,bot);
    const expect=clipBot-clipTop,err=Math.abs(m.measuredH-expect)/expect;
    return{t,actor,measuredH:m.measuredH,expect:+expect.toFixed(0),roll:r,err:+err.toFixed(3),ok:err<.02};
  });
  R.checks.eyeLine={ok:bodyResults.every(r=>r.ok)&&faceResults.every(r=>r.ok),body:bodyResults,face:faceResults};

  // 3) 走拍（m04）：相位随行程单调推进；相位整循环数 ≈ bake 左脚落地事件数
  const walkFrames=[];
  for(let i=0;i<=24;i++){
    const t=28.5+i*.25,st=art.state(t);
    const b=st.bodies.find(x=>x.actor==='Eileen'&&x.walk);
    if(!b)continue;
    walkFrames.push({t:+t.toFixed(2),index:b.index,foot:b.footScreen,dist:b.distance,contact:b.contact});
  }
  const mono=walkFrames.every((w,i)=>!i||w.dist>=walkFrames[i-1].dist-.001);
  let wraps=0;
  for(let i=1;i<walkFrames.length;i++)if(walkFrames[i].index<walkFrames[i-1].index)wraps++;
  let plants=0,prev=null;
  for(let i=Math.round(28.5*30);i<=Math.round(34.5*30);i++){
    const c=motion.frames[i].actors.Eileen.contact;
    if(prev&&c.left===true&&prev.left!==true)plants++;
    prev=c;
  }
  R.checks.walkPhase={ok:mono&&walkFrames.length>10&&Math.abs(plants-wraps)<=2,mono,plants,wraps,
    phases:walkFrames.map(w=>w.index)};

  // 4) seek 一致（全片 22 点，含切镜边界与大场面关键时刻）
  const seekTimes=[3.5,31,65,105,113.5,152,196,230.5,271,300.5,335,341,348.1,355,366.2,369.5,391,403,410,446,468,475.5];
  const seek=seekTimes.map(t=>({t,equal:art.seekPair(t)}));
  R.checks.seek={ok:seek.every(s=>s.equal),seek};

  // 5) 粒子存在性（十个大场面点名）
  const pTimes=[['fireflies',65],['nebula',160],['stair_climb',271],['one_spark',348.5],
    ['lady_dissolve',360],['tear_break',370],['snow_to_flower',402],['bell_wave',410],
    ['chest_star',450],['gold_text',468]];
  const particles=pTimes.map(([name,t])=>({name,t,...art.state(t).particles}));
  R.checks.particles={ok:particles.every(p=>p.visible>0),particles};

  R.passed=Object.values(R.checks).every(c=>c.ok);
  return R;
}
