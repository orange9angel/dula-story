// 《星屑战壳》OP 程序化角色 R2（华丽战壳轮）：AoaoCraft（平底锅座，鎏金橙铜+青绿宝石核）/
// XiaozaoCraft（漏勺座，亮银+银蓝核）/ DafuCraft（汤釜座，铁灰鎏金+琥珀核）。
// 骨架不变：mesh(Group)→body(Group)→LimbSurface 四肢+ArticulatedHand+animatedHead（bioarmor 正本）。
// 战壳体系：setCladState 分段生长（额饰→胸甲→肩甲逐层→臂铠→裙甲→腿甲，clamp(t*N-ord*.8)）
// + 生长前锋环 + 加色接缝行波 + 宝石核脉动（纯 (t,state) 确定函数，seek 安全）。
// 探针锚点保留：shieldDome（格挡 bite 锚）/bracerDiscL（gag 星屑锚）。
import * as THREE from 'three';
import {LimbSurface,ringsGeometry,mesh,mat,jointInk,shoeGeometry} from 'dula-assets/lib/craft3d/surface.js';
import {ArticulatedHand} from 'dula-assets/lib/craft3d/hand.js';
import {animatedHead} from 'dula-assets/characters/bioarmor/character_look.js';
import {skinMaterial,SKIN} from 'dula-assets/characters/bioarmor/character_finish.js';

// R2.5 脸谱差异化：运行时注入本集肤色板（episode 侧参数化，不改资产文件——
// SKIN 是逐角色调色板表，本集会话内仅此三人+女神使用这些 kind）
SKIN.lei={base:'#f4cfa8',inner:'#e0ac85',line:'#b08264'};  // 阿鏊：暖肤
SKIN.aoi={base:'#efe4e6',inner:'#d9c0c4',line:'#a88a92'};  // 小凿：冷白

const V=p=>new THREE.Vector3(p.x,p.y,p.z??0);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;
// 接缝/生长环用加色混合独立材质（每缝一条，行波逐条调透明度）
const seamMat=color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
// 主甲片 Phong 高光（s1e2 R14 金属思路：高光+接缝返光呼吸）；哑光黑内衣打底衬甲片
const phong=(color,shin=90,spec=0xffe8c0)=>new THREE.MeshPhongMaterial({color,shininess:shin,specular:spec});

// ── 少年体型底盘（三人共用骨架，比例/底装配色由 opts 拉开梯队）──────────────
function boyBase(name,opts){
  const o={mesh:new THREE.Group(),limbs:{},hands:{},feet:{},caps:{}};
  o.mesh.name=name;o.body=new THREE.Group();o.mesh.add(o.body);
  const skin=skinMaterial(opts.kind);
  for(const [side,sign] of [['left',-1],['right',1]]){
    o.limbs[side+'Leg']=new LimbSurface(o.mesh,opts.pants,opts.leg,{depth:.94});
    const shoe=new THREE.Group();o.mesh.add(shoe);o.feet[side]=shoe;
    mesh(shoe,shoeGeometry(),opts.shoe).scale.setScalar(opts.shoeScale);
    const sole=mesh(shoe,shoeGeometry(),'#141216');sole.scale.set(opts.shoeScale,.13,opts.shoeScale);sole.position.y=-.08447*opts.shoeScale;
    // 哑光黑作战服打底（长袖，免袖根修型）
    o.limbs[side+'Arm']=new LimbSurface(o.mesh,opts.sleeve,opts.arm,{depth:.9});
    const hand=new ArticulatedHand(sign,skin,jointInk);hand.scale.setScalar(opts.handScale);
    o.mesh.add(hand);o.hands[side]=hand;
    // 三角肌盖（肩窝桥接件，S1E3 方案）：跟随肩点与上臂根方向，永远盖住肩关节断面；
    // 垂臂时内嵌进躯干缘（缝隙小即缩回）
    const cap=mesh(o.mesh,new THREE.SphereGeometry(1,16,12),opts.sleeve);
    cap.scale.set(.078,.062,.085);o.caps[side]=cap;
  }
  o.torso=mesh(o.body,ringsGeometry(opts.torso),opts.sleeve);
  // 躯干剖面（贴身甲基准面）+ 插值器（clad_fit 探针同源）
  o.torsoProfile=opts.torso;
  o.profileAt=y=>{
    const pr=o.torsoProfile;
    if(y<=pr[0][0])return [pr[0][1],pr[0][2]];
    for(let i=1;i<pr.length;i++)if(y<=pr[i][0]){
      const a=pr[i-1],b=pr[i],u=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));
      return [a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];
    }
    return [pr.at(-1)[1],pr.at(-1)[2]];
  };
  o.fitRefs={pauldrons:[],leaves:[],shins:[]};
  o.face=animatedHead(o.body,opts.kind,opts.headHeight);
  o.headGroup=o.face.head;o.mouth=o.face.mouth;
  return o;
}

// ── 脸谱差异化发型件（episodes 侧几何加件，不动 bioarmor 资产）──
// 阿鏊：冲天翘发锥簇 + 两根呆毛（翘发管+端珠）
function addAoaoHair(head){
  const hair='#503a3b';
  for(let i=0;i<5;i++){ // 颅顶前缘翘发簇（向斜后上方冲）
    const a=-.5+i*.25;
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.020,.11,7),mat(hair));
    spike.position.set(Math.sin(a)*.075,.215,Math.cos(a)*.05+.02);
    spike.rotation.set(-.55,-a*.5,-a*.35);head.add(spike);
  }
  for(const sign of [-1,1]){ // 呆毛两根（不同步态微波由时间驱动太花——固定造型即可）
    const curve=new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(sign*.012,.24,.02),new THREE.Vector3(sign*.05,.30,.01),
      new THREE.Vector3(sign*.085,.31,-.01));
    const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,8,.005,5),mat(hair));
    head.add(tube);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(.011,8,6),mat(hair));
    tip.position.set(sign*.085,.31,-.01);head.add(tip);
  }
}
// 小凿：斜刘海遮左半眉（前额斜楔片）+ 左眼下泪痣
function addXiaozaoAccents(head){
  const fringe=new THREE.Mesh(new THREE.SphereGeometry(.132,20,8,0,Math.PI*.6,.30,.34),
    new THREE.MeshBasicMaterial({color:'#24393e',side:THREE.DoubleSide}));
  fringe.position.set(-.018,.062,.004);fringe.rotation.z=-.30; // 斜向盖住左眉上方
  head.add(fringe);
  const mole=new THREE.Mesh(new THREE.CircleGeometry(.0042,8),
    new THREE.MeshBasicMaterial({color:'#3a3238'}));
  mole.position.set(-.046,.038,.117);mole.rotation.y=-.28;head.add(mole); // 左眼下泪痣
}

// 骨骼跟随 rig（肘→腕 / 膝→踝 对齐组）：甲件挂这里随 twoBone 肢体走
function forearmRig(host){
  const rig=new THREE.Group();host.mesh.add(rig);
  return {rig,align(a,b){
    rig.position.copy(V(a));
    rig.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),V(b).sub(V(a)).normalize());
  }};
}

// ── 华丽战壳共享建造器（R2.6 贴身化：所有甲件贴身穿戴，禁止悬浮环）─────────
// 参考风格（监制供图提炼的风格特征，零第三方名词落盘）：上扬翻卷壳状层叠肩甲（根部锚
// 三角肌盖）/额饰头冠（中央尖角+侧翼变体）/贴身胸甲整筒（圆形纹章嵌凹槽+V 形棱线收腰）/
// 贴髋腰带+菱形尖甲叶/分段贴身臂腿甲（肘翼/胫前棱线/踝小翼）/披风（纯 t 简化摆动）。
// cfg.style: {pri, sec, trim, gem, seam, priGlow?, secGlow?}
// cfg.dims: {shoulderY,shoulderHalf,hipIdle,hipHalf,chestY,chestR:[rx,ry,rz],profile(躯干剖面)}
// cfg: {crown:'spike'|'wing'|'band', shield, strainer, shoulderLayers, cape:{len,w,color}|null, scale}
// 生长序（ord）：0 额饰 → 1 胸甲 → 2/3(/4) 肩甲逐层（披风随末层）→ 臂铠(含盾) → 裙甲 → 腿甲
function buildOrnateClad(host,cfg){
  const S=cfg.style,d=cfg.dims,k=cfg.scale??1;host.dimsRef=d;
  const pri=phong(S.pri,100),sec=phong(S.sec,70),trimM=mat(S.trim);
  // 冷色甲片夜景里被灶火染暖：主甲片允许带微弱自发光固色（独立 Phong 实例，非共享缓存）
  if(S.priGlow){pri.emissive=new THREE.Color(S.priGlow);pri.emissiveIntensity=.30;}
  if(S.secGlow){sec.emissive=new THREE.Color(S.secGlow);sec.emissiveIntensity=.22;}
  const edgeM=new THREE.MeshBasicMaterial({color:S.trim}); // 硬边高光条（cel 棱线）
  const parts=[];
  const part=ord=>{const p={ord,groups:[],rings:[],seams:[],gems:[]};parts.push(p);return p;};
  const reg=(p,g,ringR,ringPos=[0,0,0])=>{
    p.groups.push(g);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(ringR,.005,6,28),seamMat(S.seam));
    ring.visible=false;ring.position.set(...ringPos);g.add(ring);p.rings.push(ring);return g;
  };
  const gem=(p,parent,r,pos)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),
      new THREE.MeshBasicMaterial({color:S.gem})); // 独立材质：宝石核脉动不染色共享件
    m.position.set(...pos);parent.add(m);p.gems.push(m);return m;
  };
  // 贴面接缝纹：贴在甲面上的细纹（不悬空）
  const seamTorus=(p,g,r,tube,pos,rot=[Math.PI/2,0,0])=>{
    const s=new THREE.Mesh(new THREE.TorusGeometry(r,tube,6,28),seamMat(S.seam));
    s.position.set(...pos);s.rotation.set(...rot);g.add(s);p.seams.push(s);return s;
  };
  // 躯干剖面插值（贴身基准面）：profile [[y,rx,rz],...]
  const prof=d.profile;
  const at=host.profileAt;

  // 0 额饰头冠（露脸）：贴额弧带 + 每人造型变体（中央尖角/单侧翼/宽厚冠）
  {
    const p=part(0),g=reg(p,new THREE.Group(),.11,[0,.12,.06]);host.headGroup.add(g);
    const band=new THREE.Mesh(new THREE.TorusGeometry(.106,.010,8,24,Math.PI*1.25),pri);
    band.position.set(0,.110,.050);band.rotation.set(-.45,0,0);g.add(band);
    gem(p,g,.016,[0,.108,.102]); // 额心小核
    if(cfg.crown==='spike'){ // 阿鏊：中央尖角上扬 + 两侧翼状突起
      const spike=new THREE.Mesh(new THREE.ConeGeometry(.017,.085,6),pri);
      spike.position.set(0,.185,.045);spike.rotation.x=-.22;spike.castShadow=true;g.add(spike);
      for(const sign of [-1,1]){
        const wing=new THREE.Mesh(new THREE.ConeGeometry(.013,.06,5),trimM);
        wing.position.set(sign*.095,.150,.005);wing.rotation.z=-sign*.65;wing.rotation.x=-.15;g.add(wing);
      }
    }else if(cfg.crown==='wing'){ // 小凿：左侧单翼（冷面不对称）
      const wing=new THREE.Mesh(new THREE.ConeGeometry(.015,.075,5),pri);
      wing.position.set(-.10,.155,.005);wing.rotation.z=.62;wing.rotation.x=-.12;g.add(wing);
      const wingEdge=new THREE.Mesh(new THREE.ConeGeometry(.008,.05,5),edgeM);
      wingEdge.position.set(-.108,.162,.008);wingEdge.rotation.z=.62;wingEdge.rotation.x=-.12;g.add(wingEdge);
    }else{ // 大釜：宽厚冠带 + 双钝角
      const band2=new THREE.Mesh(new THREE.TorusGeometry(.112,.016,8,24,Math.PI*1.2),sec);
      band2.position.set(0,.112,.048);band2.rotation.set(-.45,0,0);g.add(band2);
      for(const sign of [-1,1]){
        const horn=new THREE.Mesh(new THREE.ConeGeometry(.026,.05,8),trimM);
        horn.position.set(sign*.09,.165,.02);horn.rotation.z=-sign*.4;g.add(horn);
      }
    }
  }

  // 1 贴身胸甲：随胸廓剖面的整筒（+12mm）+ 圆形纹章嵌凹槽 + V 形棱线收腰 + 硬边高光
  {
    const p=part(1),g=reg(p,new THREE.Group(),.16,[0,d.chestY,d.chestR[2]+.06]);host.body.add(g);
    const levels=[];
    for(const [y,rx,rz] of prof)
      if(y>d.chestY-d.chestR[1]-.05&&y<d.chestY+d.chestR[1]+.07)levels.push([y,rx+.012,rz+.012]);
    const cuirass=new THREE.Mesh(ringsGeometry(levels),pri);
    cuirass.castShadow=true;g.add(cuirass);
    const [erx,erz]=at(d.chestY+.02);
    // 圆形纹章嵌凹槽：凹槽底盘 + 凸起的槽圈棱 + 宝石核内凹于槽圈
    const medal=new THREE.Mesh(new THREE.CircleGeometry(.032,20),sec);
    medal.position.set(0,d.chestY+.02,erz+.014);g.add(medal);
    const groove=new THREE.Mesh(new THREE.TorusGeometry(.045,.009,8,24),trimM);
    groove.position.set(0,d.chestY+.02,erz+.016);g.add(groove);
    gem(p,g,.023,[0,d.chestY+.02,erz+.015]);
    // 放射纹（纹章表面四短棱，贴面）
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+Math.PI/4;
      const ray=new THREE.Mesh(new THREE.BoxGeometry(.004,.02,.003),edgeM);
      ray.position.set(Math.cos(a)*.028,d.chestY+.02+Math.sin(a)*.028,erz+.016);
      ray.rotation.z=a+Math.PI/2;g.add(ray);
    }
    // V 形棱线：纹章下缘两侧收束到腰带（贴面棱，逐段贴表面）
    for(const sign of [-1,1]){
      const y0=d.chestY-.005,y1=d.chestY-d.chestR[1]-.03,my=(y0+y1)/2;
      const bar=new THREE.Mesh(new THREE.BoxGeometry(.007,(y0-y1)+.02,.005),edgeM);
      bar.position.set(sign*.055,my,at(my)[1]+.010);
      bar.rotation.z=-sign*.40;g.add(bar);
    }
    // 胸甲上缘硬边高光条（贴领口棱）
    const hy=d.chestY+d.chestR[1]*.60;
    for(const sign of [-1,1]){
      const bar=new THREE.Mesh(new THREE.BoxGeometry(.05,.006,.005),edgeM);
      bar.position.set(sign*erx*.42,hy,at(hy)[1]+.009);bar.rotation.z=-sign*.25;g.add(bar);
    }
    seamTorus(p,g,.058,.0035,[0,d.chestY+.02,erz+.015],[0,0,0]); // 纹章表面纹
    const wy=d.chestY-d.chestR[1]*.55;
    seamTorus(p,g,at(wy)[0]*.92,.003,[0,wy,.002]); // 收腰处表面纹
    host.fitRefs.chest=new THREE.Object3D();host.fitRefs.chest.position.set(0,d.chestY,erz+.012);
    g.add(host.fitRefs.chest);
  }

  // 2/3(/4) 上扬壳状层叠肩甲：mesh 空间锚肩点（根部骑三角肌盖），外缘向上翻卷
  host.pauldronGroups=[];
  const layers=cfg.shoulderLayers??2;
  for(const [li] of Array(layers).entries()){
    const p=part(2+li);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const g=reg(p,new THREE.Group(),.10);host.mesh.add(g);
      host.pauldronGroups.push({g,sign,li,side});
      const r=(.118+li*.034)*k;
      // 上扬翻卷壳：半球壳外缘向上翻（rotation.z 外倾），层叠向外向下错开
      const shell=new THREE.Mesh(new THREE.SphereGeometry(1,22,12,0,TAU,0,Math.PI*.55),li?sec:pri);
      shell.scale.set(r,r*.60,r);shell.rotation.z=sign*(.58-li*.10);
      shell.position.set(sign*r*.26,.01+li*.004,0);shell.castShadow=true;g.add(shell);
      // 壳缘硬边高光（贴壳面弧条）
      const lip=new THREE.Mesh(new THREE.TorusGeometry(r*.92,.0055,6,26,Math.PI*1.15),edgeM);
      lip.rotation.set(Math.PI/2,0,0);lip.rotation.z=-Math.PI*.07;
      lip.position.set(sign*r*.26,.01,0);lip.rotation.x=Math.PI/2;
      lip.rotation.y=sign*(.58-li*.10);g.add(lip);
      // 壳面棱线两条（随壳倾角）
      for(const off of [-.30,.30]){
        const rib=new THREE.Mesh(new THREE.BoxGeometry(.0055,r*.8,.0055),edgeM);
        rib.position.set(sign*r*.26+Math.sin(off)*r*.5,r*.32,Math.cos(off)*r*.5);
        rib.rotation.z=sign*(.58-li*.10)-off*.5;g.add(rib);
      }
      seamTorus(p,g,r*.62,.003,[sign*r*.26,r*.20,0]);
      const ref=new THREE.Object3D();g.add(ref);
      host.fitRefs.pauldrons.push({ref,side});
    }
  }

  // 披风（随肩甲末层生长；分段网格，摆动=纯 (t,lift) 函数，站姿垂坠/冲锋后扬）
  if(cfg.cape){
    const p=part(1+layers); // 末层肩甲同段
    const g=reg(p,new THREE.Group(),.10);host.body.add(g);
    const [crx,crz]=at(d.shoulderY+.02);
    g.position.set(0,d.shoulderY+.03,-(crz+.012));
    const {len,w,color}=cfg.cape;
    const geo=new THREE.PlaneGeometry(w,len,6,12);geo.translate(0,-len/2,0);
    const capeMesh=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color,side:THREE.DoubleSide}));
    capeMesh.castShadow=true;g.add(capeMesh);
    const collar=new THREE.Mesh(new THREE.BoxGeometry(w,.018,.012),edgeM);g.add(collar);
    host.cape={group:g,mesh:capeMesh,geo,len,lift:0,base:geo.attributes.position.array.slice()};
  }

  // 4 臂铠（贴臂分段板）：肘甲盖+肘翼 + 前臂半管板（分段环纹贴板面）；
  {
    host.rigs={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      const r=host.rigs[side]=forearmRig(host);
      const p=part(1+layers+1),g=reg(p,r.rig,.062);
      const rr=.050*k;
      // 肘甲盖贴肘点 + 肘部翼状突起
      const elbow=new THREE.Mesh(new THREE.SphereGeometry(.046*k,16,12,0,TAU,0,Math.PI/2),pri);
      elbow.rotation.x=-Math.PI/2;elbow.position.z=-.012;g.add(elbow);
      const ewing=new THREE.Mesh(new THREE.ConeGeometry(.014,.05,6),trimM);
      ewing.position.set(sign*.040,.005,-.028);ewing.rotation.z=sign*1.9;g.add(ewing);
      // 前臂半管贴板（弧面贴前臂前外侧，不悬空）
      const plate=new THREE.Mesh(new THREE.CylinderGeometry(rr,rr+.006*k,.17,16,1,false,-.75,1.5),pri);
      plate.rotation.x=Math.PI/2;plate.position.z=.078;plate.castShadow=true;g.add(plate);
      // 分段环纹（贴板面弧条，非悬空环）
      for(const z of [.035,.125]){
        const band=new THREE.Mesh(new THREE.TorusGeometry(rr+.004,.0035,6,20,Math.PI*1.15),edgeM);
        band.position.z=z;band.rotation.z=-Math.PI*.07;g.add(band);
      }
      seamTorus(p,g,rr+.003,.0028,[0,0,.08]);
      // 漏勺花窗盘（打孔阵保留：盘贴臂板+孔阵+银丝框）
      if(cfg.strainer){
        const disc=new THREE.Mesh(new THREE.CircleGeometry(.066,24),phong('#e8f2fa',140));
        disc.position.set(sign*(rr+.006),0,.08);disc.rotation.y=sign*Math.PI/2;g.add(disc);
        const holeMat=new THREE.MeshBasicMaterial({color:'#10161c'});
        for(const [hx,hz] of [[0,0],[.03,0],[-.03,0],[0,.03],[0,-.03],[.021,.021],[-.021,-.021],[.021,-.021],[-.021,.021]]){
          const h=new THREE.Mesh(new THREE.CircleGeometry(.0068,8),holeMat);
          h.position.set(sign*(rr+.0075),hz,.08+hx);h.rotation.y=sign*Math.PI/2;g.add(h);
        }
        const frame=new THREE.Mesh(new THREE.TorusGeometry(.066,.005,6,24),edgeM);
        frame.position.set(sign*(rr+.006),0,.08);frame.rotation.y=sign*Math.PI/2;g.add(frame);
        if(side==='left')host.bracerDiscL=disc; // gag 星屑锚点
        seamTorus(p,g,.040,.003,[sign*(rr+.0075),0,.08],[0,sign*Math.PI/2,0]);
      }
      // 锅盖盾（阿鏊左臂）：鎏金穹顶贴臂挂点 + 金沿 + 宝石盾心
      if(cfg.shield&&side==='left'){
        const dome=new THREE.Mesh(new THREE.SphereGeometry(.27,28,14,0,TAU,0,Math.PI/2),phong(S.pri,120));
        dome.scale.set(1,.32,1);dome.position.set(-.085,0,.15);dome.rotation.z=Math.PI/2;
        dome.castShadow=true;g.add(dome);
        host.shieldDome=dome; // 格挡接触点/探针锚
        const rim=new THREE.Mesh(new THREE.TorusGeometry(.245,.013,8,36),trimM);
        rim.position.set(-.092,0,.15);rim.rotation.y=Math.PI/2;g.add(rim);
        const inner=new THREE.Mesh(new THREE.TorusGeometry(.17,.007,6,28),edgeM);
        inner.position.set(-.095,0,.15);inner.rotation.y=Math.PI/2;g.add(inner);
        const grip=new THREE.Mesh(new THREE.BoxGeometry(.02,.10,.024),sec);
        grip.position.set(-.055,0,.11);g.add(grip);
        gem(p,g,.028,[-.128,0,.15]); // 盾心宝石
        seamTorus(p,g,.15,.004,[-.098,0,.15],[0,Math.PI/2,0]);
        seamTorus(p,g,.21,.004,[-.096,0,.15],[0,Math.PI/2,0]);
      }
    }
  }

  // 5 裙甲：贴髋腰带筒（断面含大腿根，不悬空）+ 菱形尖甲叶 6 片铰接下沿
  // （内面-大腿间隙 5~10mm；摆动=大腿姿态纯函数，探针 clad_fit 逐片采样）
  host.skirtLeaves=[];
  {
    const p=part(1+layers+2);
    const thR=host.limbs.leftLeg.radius(.12); // 大腿根管半径（实测同源）
    const beltY0=d.hipIdle-.07,beltY1=d.hipIdle+.04;
    // 腰带断面=髋部含大腿根：比大腿面宽 12mm（侧向不夹腿管）
    const rxB=d.hipHalf+thR+.018,rzB=thR+.032,zcB=.008;
    const beltLevels=[[beltY0,rxB,rzB,zcB],[(beltY0+beltY1)/2,rxB+.004,rzB+.004,zcB],[beltY1,rxB+.008,rzB+.008,zcB]];
    const g=reg(p,new THREE.Group(),.14,[0,d.hipIdle,zcB+rzB+.05]);host.body.add(g);
    const belt=new THREE.Mesh(ringsGeometry(beltLevels),pri);belt.castShadow=true;g.add(belt);
    // 腰带中央圆扣（贴面带）
    const buckle=new THREE.Mesh(new THREE.CircleGeometry(.026,16),trimM);
    buckle.position.set(0,d.hipIdle-.01,zcB+rzB+.012);g.add(buckle);
    gem(p,g,.013,[0,d.hipIdle-.01,zcB+rzB+.016]);
    // 腰带下沿硬边（贴带面椭圆弧）
    const beltEdge=new THREE.Mesh(new THREE.TorusGeometry(1,.004,6,32),edgeM);
    beltEdge.scale.set(rxB,rzB,1);beltEdge.rotation.x=Math.PI/2;
    beltEdge.position.set(0,beltY0+.006,zcB);g.add(beltEdge);
    const beltSeam=seamTorus(p,g,1,.003,[0,d.hipIdle+.01,zcB]); // 带面纹（椭圆缩放贴面）
    beltSeam.scale.set(rxB+.012,rzB+.012,1);
    host.fitRefs.belt=new THREE.Object3D();host.fitRefs.belt.position.set(rxB-.006,d.hipIdle-.01,zcB); // 侧向接触点（腰带贴髋在两侧）
    g.add(host.fitRefs.belt);
    // 6 片菱形尖叶：铰接腰带下沿，内面贴腿/臀曲线（前 3 + 两侧 + 后 1）
    // 叶面位置按大腿面实测半径排（frontZ/backZ=腿管前后缘+间隙）
    const frontZ=.02+thR*.94-.004,backZ=-(at(beltY0)[1]+.012),sideX=d.hipHalf+thR*.55+.002; // 后叶贴臀面
    const fx=Math.sin(.5)*rxB*.62; // 前侧叶横向位
    const leafSpec=[ // [x, z, tag, 跟随腿]
      [0,frontZ,'FC','both'],[-fx,(frontZ+.030)*.92,'FL','left'],[fx,(frontZ+.030)*.92,'FR','right'],
      [-sideX,.012,'SL','left'],[sideX,.012,'SR','right'],[0,backZ,'B','both'],
    ];
    for(const [lx,lz,tag,leg] of leafSpec){
      const hinge=new THREE.Group();
      hinge.position.set(lx,beltY0,lz);
      hinge.rotation.y=Math.atan2(lx,lz-.008);
      host.body.add(hinge);p.groups.push(hinge);
      // 菱形尖叶（拉长压扁八面体=菱形截面尖甲叶）
      const leaf=new THREE.Mesh(new THREE.OctahedronGeometry(.055*k,0),tag.startsWith('S')||tag==='B'?sec:pri);
      leaf.scale.set(1,2.35,.16);leaf.position.y=-.125*k;leaf.castShadow=true;hinge.add(leaf);
      // 叶尖硬边
      const tip=new THREE.Mesh(new THREE.ConeGeometry(.008,.02,5),edgeM);
      tip.position.y=-.245*k;tip.rotation.x=Math.PI;hinge.add(tip);
      const ref=new THREE.Object3D();{const nl=Math.hypot(lx,lz-zcB)||1;ref.position.set(-lx/nl*.012,-.10,-(lz-zcB)/nl*.012);}hinge.add(ref); // 内面采样点沿各叶真实内法线
      const entry={g:hinge,sign:Math.sign(lx)||1,front:tag.startsWith('F'),leg,tag,ref,
        nrm:new THREE.Vector3(-lx/Math.hypot(lx,lz-zcB||1),0,-(lz-zcB)/Math.hypot(lx,lz-zcB||1))}; // 叶内面法线（mesh 系，指向身体）
      host.skirtLeaves.push(entry);host.fitRefs.leaves.push(entry);
    }
  }

  // 6 腿甲（贴腿弧形甲片）：膝甲盖贴膝点前侧 + 胫甲前片贴小腿前侧（膝→踝 rig）+ 踝小翼
  host.kneeCaps={};host.shinRigs={};
  {
    const p=part(1+layers+3);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const kc=new THREE.Group();host.mesh.add(kc);host.kneeCaps[side]=kc;p.groups.push(kc);
      // 膝甲盖：圆弧甲盖贴膝点（不悬浮；盖心略前移出膝前）
      const cap=new THREE.Mesh(new THREE.SphereGeometry(.050*k,18,12),pri);
      cap.scale.set(.9,.78,.55);cap.position.set(0,.008,.024);cap.castShadow=true;kc.add(cap);
      const capEdge=new THREE.Mesh(new THREE.TorusGeometry(.042*k,.0035,6,20,Math.PI*1.3),edgeM);
      capEdge.position.set(0,.008,.030);capEdge.rotation.z=Math.PI*(1-.65);kc.add(capEdge);
      const sr=host.shinRigs[side]=forearmRig(host);
      const g=reg(p,sr.rig,.052);
      const shinR=host.limbs[side+'Leg'].radius(.62)+.008; // 贴腿=实测腿管半径+间隙
      // 胫甲前片：半管弧板贴小腿前侧（rig 局部 -y=腿前向）
      const plate=new THREE.Mesh(new THREE.CylinderGeometry(shinR,shinR+.006*k,.24,14,1,false,-.8,1.6),pri);
      plate.rotation.x=Math.PI/2;plate.rotation.z=0;plate.position.z=.12;
      plate.castShadow=true;g.add(plate);
      // 胫前棱线（贴板面）
      const ridge=new THREE.Mesh(new THREE.BoxGeometry(.006,.006,.20),edgeM);
      ridge.position.set(0,-(shinR+.003),.12);g.add(ridge);
      // 分段环纹（贴板面弧条）
      for(const z of [.05,.19]){
        const band=new THREE.Mesh(new THREE.TorusGeometry(shinR+.003,.003,6,18,Math.PI*1.15),edgeM);
        band.position.z=z;band.rotation.z=-Math.PI*.07;g.add(band);
      }
      // 踝部小翼（贴踝两侧）
      for(const ws of [-1,1]){
        const wing=new THREE.Mesh(new THREE.ConeGeometry(.010,.035,5),trimM);
        wing.position.set(ws*(shinR+.002),0,.235);wing.rotation.z=ws*1.9;wing.rotation.x=-.3;g.add(wing);
      }
      seamTorus(p,g,shinR+.002,.0025,[0,0,.12]);
      const ref=new THREE.Object3D();ref.position.set(0,-(shinR+.002),.12);g.add(ref);
      host.fitRefs.shins.push({ref,side});
    }
  }
  return parts;
}

function applyCladState(parts,t){
  const N=Math.max(...parts.map(p=>p.ord))+1; // 生长段数按最大序（肩甲层数因角色而异）
  for(const p of parts){
    const a=clamp(t*N-p.ord*.8);
    for(const g of p.groups){g.visible=a>.001;g.scale.setScalar(Math.max(a,.001));}
    for(const s of p.seams)s.visible=a>.55;
    for(const g2 of p.gems)g2.visible=a>.75;
  }
}
function cladFX(parts,t,cladT,colorHi){
  const growing=cladT>.02&&cladT<.98,spd=growing?9:2.6,N=Math.max(...parts.map(p=>p.ord))+1;
  for(const p of parts){
    const a=clamp(cladT*N-p.ord*.8);
    for(const ring of p.rings){
      ring.visible=a>.02&&a<.98;
      if(ring.visible){ring.scale.setScalar(1+.18*Math.sin(t*11));
        ring.material.opacity=.5+.5*Math.max(0,Math.sin(t*11));}
    }
    for(const [k,s] of p.seams.entries()){if(!s.visible)continue;
      const crest=Math.max(0,Math.sin(t*spd-(p.ord+k*.5)*.95));
      s.material.opacity=.52+.48*crest; // 保底亮度抬高：群像远景也读得出接缝光
      if(colorHi)s.material.color.set(s.material.userData.base??(s.material.userData.base=s.material.color.getHex())).lerp(colorHi,crest*.5);}
    // 宝石核脉动在各角色 updateCladFX 里做（需要角色自己的基色/高光色）
  }
}

// 甲叶摆动=大腿姿态纯函数；披风摆动=纯 (t,lift) 函数
function updateSkirtAndCape(host,p){
  for(const lf of host.skirtLeaves??[]){
    let pitch=0,spread=0;
    for(const legName of lf.leg==='both'?['left','right']:[lf.leg]){
      const leg=p[legName+'Leg'];if(!leg)continue;
      const d=new THREE.Vector3(leg[1].x-leg[0].x,leg[1].y-leg[0].y,leg[1].z-leg[0].z);
      pitch=Math.max(pitch,Math.atan2(d.z,-d.y)); // 前抬为正
      spread=Math.max(spread,Math.abs(Math.atan2(d.x,-d.y)));
    }
    if(lf.front)lf.g.rotation.x=.06-Math.max(0,pitch)*.9; // 抬腿顶起前叶外撇
    else lf.g.rotation.z=lf.sign*(.05+Math.max(0,spread)*.7);
  }
  if(host.cape)host.cape.lift=p.capeLift??0;
}
function updateCape(cape,t){
  if(!cape||!cape.group.visible)return;
  const pos=cape.geo.attributes.position,base=cape.base,lift=cape.lift;
  for(let i=0;i<pos.count;i++){
    const bx=base[i*3],by=base[i*3+1];
    const v=-by/cape.len; // 0 顶 1 底
    pos.setZ(i,-(lift*v*v*.30+Math.sin(t*1.25+v*2.2+bx*6)*.025*v));
    pos.setX(i,bx+Math.sin(t*.9+v*3)*.01*v);
  }
  pos.needsUpdate=true;cape.geo.computeVertexNormals();
}
// clad_fit 探针量（mesh 局部系，与实际渲染同源）：甲件内面-躯干/大腿间隙
function fitMetrics(host,p){
  const M={},tmp=new THREE.Vector3(),q=new THREE.Vector3();
  const at=host.profileAt;
  const localOf=o=>{o.getWorldPosition(tmp);return host.mesh.worldToLocal(q.copy(tmp));};
  const segDist=(pt,a,b)=>{
    const ab=new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);
    const u=Math.max(0,Math.min(1,((pt.x-a.x)*ab.x+(pt.y-a.y)*ab.y+(pt.z-a.z)*ab.z)/Math.max(ab.lengthSq(),1e-9)));
    return Math.hypot(pt.x-(a.x+ab.x*u),pt.y-(a.y+ab.y*u),pt.z-(a.z+ab.z*u));
  };
  if(host.fitRefs.chest){const pt=localOf(host.fitRefs.chest);M.chest=pt.z-at(pt.y)[1];}
  if(host.fitRefs.belt){const pt=localOf(host.fitRefs.belt);M.belt=pt.x-(host.dimsRef.hipHalf+host.limbs.leftLeg.radius(.12));} // 腰带侧向贴髋净空
  for(const lf of host.fitRefs.leaves){
    // 骨轴最近点 → 叶内面平面的垂直净空（负=搭盖/交叠区，搭盖合法；正=悬空间隙）
    const pt=localOf(lf.ref);
    const legs=lf.leg==='both'?['left','right']:[lf.leg];
    if(lf.tag==='B'){ // 后叶贴臀：对躯干剖面后缘（大腿骨前弓不相关）
      M['leaf_B']=(-pt.z)-host.profileAt(pt.y)[1];
      continue;
    }
    M['leaf_'+lf.tag]=Math.min(...legs.map(ln=>{
      const leg=p[ln+'Leg'];if(!leg)return 99;
      const a=leg[0],b=leg[1],ab=new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);
      const u=Math.max(0,Math.min(1,((pt.x-a.x)*ab.x+(pt.y-a.y)*ab.y+(pt.z-a.z)*ab.z)/Math.max(ab.lengthSq(),1e-9)));
      const bx=a.x+ab.x*u,by=a.y+ab.y*u,bz=a.z+ab.z*u;
      return (bx-pt.x)*lf.nrm.x+(bz-pt.z)*lf.nrm.z-host.limbs[ln+'Leg'].radius(.12)*.5; // 管半径半扣：管面-平面接触带
    }));
  }
  for(const sr of host.fitRefs.shins){
    const pt=localOf(sr.ref);const leg=p[sr.side+'Leg'];
    M['shin_'+sr.side]=segDist(pt,leg[1],leg[2])-host.limbs[sr.side+'Leg'].radius(.62);
  }
  for(const pd of host.fitRefs.pauldrons){
    const pt=localOf(pd.ref);const sh=p[pd.side+'Arm'][0];
    M['pauldron_'+pd.side]=Math.hypot(pt.x-sh.x,pt.y-sh.y,pt.z-sh.z);
  }
  return M;
}

// 三人共用 setPose 骨架（pose 对象契约同 P1/P3）
function sharedSetPose(host,p){
  host.mesh.position.x=p.rootX;host.mesh.position.z=p.rootZ??0;host.mesh.rotation.y=p.yaw;
  host.body.position.y=p.bob;host.body.rotation.x=p.lean??0;
  host.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
  for(const [side,sign] of [['left',-1],['right',1]]){
    const arm=p[side+'Arm'],leg=p[side+'Leg'];
    host.limbs[side+'Arm'].update(arm);host.limbs[side+'Leg'].update(leg);
    const hand=host.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
    const forward=new THREE.Vector3(0,0,1);
    const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
    y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
    hand.position.copy(V(arm[2]));
    hand.setGesture({fist:p.fist??0,open:p.open??0,point:p.point??0});
    host.feet[side].position.copy(V(leg[2]));
    host.feet[side].rotation.set(p[side+'FootPitch']??0,p[side+'FootYaw']??0,0);
    host.rigs[side].align(arm[1],arm[2]);
    host.kneeCaps[side].position.copy(V(leg[1]));
    host.shinRigs[side].align(leg[1],leg[2]);
    // 三角肌盖跟到肩点-肘根连线（盖住肩关节断面；垂臂时自然内嵌躯干缘）
    const cap=host.caps[side],sd=V(arm[1]).sub(V(arm[0]));
    const sdLen=sd.length()||1;cap.position.copy(V(arm[0])).addScaledVector(sd,.16/sdLen+.03);
    cap.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),sd.normalize());
  }
  // 上扬壳肩甲根部锚三角肌盖（随肩点；抬臂时壳外缘再上扬一点）
  for(const pd of host.pauldronGroups??[]){
    const arm=p[pd.side+'Arm'];
    pd.g.position.set(arm[0].x,arm[0].y+.055,arm[0].z);
    const ua=V(arm[1]).sub(V(arm[0])).normalize();
    pd.g.rotation.z=-pd.sign*clamp(ua.y+.85,0,1.1)*.16;
  }
  updateSkirtAndCape(host,p);
  host.lastFit=fitMetrics(host,p);
  host.mesh.updateMatrixWorld(true);
}

// ── 阿鏊（平底锅座）：鎏金橙铜 + 暖铜勾边 + 青绿宝石核 ──────────────
export class AoaoCraft{
  constructor(){
    const o=boyBase('AoaoCraft',{kind:'lei',headHeight:1.51,
      torso:[[.80,.120,.090],[.90,.133,.096],[1.00,.136,.098],[1.10,.120,.086],[1.20,.132,.094],[1.32,.142,.100],[1.40,.124,.086],[1.47,.060,.054]],
      leg:[[0,.082],[.25,.069],[.55,.053],[.8,.044],[1,.039]],
      arm:[[0,.050],[.3,.046],[.6,.036],[1,.028]],
      sleeve:'#241d18',pants:'#1c1a1e',shoe:'#2a241e',shoeScale:1,handScale:.80});
    Object.assign(this,o);
    // 脸谱：圆脸大眼浓眉元气咧嘴 + 冲天翘发呆毛（剪影即辨）
    this.face.setStyle({eyeWidth:1.18,eyeHeight:1.12,eyeSpacing:92,mouthWidth:1.15});
    this.face.setActing({smile:.4});
    addAoaoHair(this.headGroup);
    this.cladStyle={pri:'#d8a04a',sec:'#b06a2a',trim:'#f0c568',gem:'#3dffc8',seam:'#3dffc8'};
    this.gemBase=new THREE.Color('#3dffc8');this.gemHi=new THREE.Color('#d8fff2');
    this.cladParts=buildOrnateClad(this,{style:this.cladStyle,shield:true,shoulderLayers:2,
      crown:'spike',cape:{len:.80,w:.42,color:'#f0ece2'},
      dims:{shoulderY:1.42,shoulderHalf:.14,hipIdle:.87,hipHalf:.078,chestY:1.24,chestR:[.155,.20,.105],profile:o.torsoProfile}});
    this.setCladState(0);
  }
  setCladState(t){applyCladState(this.cladParts,t);}
  updateCladFX(t,cladT){
    cladFX(this.cladParts,t,cladT,this.gemHi);
    for(const p of this.cladParts)for(const g of p.gems)if(g.visible)
      g.material.color.copy(this.gemBase).lerp(this.gemHi,.35+.35*Math.sin(t*2.4+p.ord*1.1));
    updateCape(this.cape,t);
  }
  setEmotion(e,b){this.face.setEmotion(e,b);}
  setPose(p){sharedSetPose(this,p);}
}

// ── 小凿（漏勺座）：亮银 + 青蓝勾边 + 银蓝宝石核 ──────────────────────
export class XiaozaoCraft{
  constructor(){
    const o=boyBase('XiaozaoCraft',{kind:'aoi',headHeight:1.40,
      torso:[[.74,.108,.082],[.85,.120,.088],[.95,.124,.090],[1.05,.108,.078],[1.15,.118,.086],[1.26,.128,.092],[1.33,.112,.078],[1.40,.054,.050]],
      leg:[[0,.072],[.25,.061],[.55,.048],[.8,.040],[1,.035]],
      arm:[[0,.044],[.3,.040],[.6,.032],[1,.025]],
      sleeve:'#1a2026',pants:'#161a20',shoe:'#1e242a',shoeScale:.92,handScale:.74});
    Object.assign(this,o);
    // 脸谱：尖瘦脸细长眼+眼距收窄、薄唇抿线、斜刘海遮左半眉、左眼下泪痣
    this.face.setStyle({eyeHeight:.62,eyeSpacing:80,eyeWidth:1.02,mouthWidth:.8});
    addXiaozaoAccents(this.headGroup);
    this.cladStyle={pri:'#d8e4f0',sec:'#a8bccf',trim:'#7fd4f0',gem:'#8fd8ff',seam:'#8fe4ff',
      priGlow:'#3d5468',secGlow:'#2c4054'};
    this.gemBase=new THREE.Color('#8fd8ff');this.gemHi=new THREE.Color('#e8f8ff');
    this.cladParts=buildOrnateClad(this,{style:this.cladStyle,strainer:true,shoulderLayers:2,scale:.92,
      crown:'wing',
      dims:{shoulderY:1.32,shoulderHalf:.125,hipIdle:.81,hipHalf:.072,chestY:1.15,chestR:[.13,.18,.095],profile:o.torsoProfile}});
    this.setCladState(0);
  }
  setCladState(t){applyCladState(this.cladParts,t);}
  updateCladFX(t,cladT){
    cladFX(this.cladParts,t,cladT,this.gemHi);
    for(const p of this.cladParts)for(const g of p.gems)if(g.visible)
      g.material.color.copy(this.gemBase).lerp(this.gemHi,.35+.35*Math.sin(t*2.4+p.ord*1.1));
    updateCape(this.cape,t);
  }
  setEmotion(e,b){this.face.setEmotion(e,b);}
  setPose(p){sharedSetPose(this,p);}
}

// ── 大釜（汤釜座）：铁灰鎏金 + 金勾边 + 琥珀宝石核（三层肩甲） ──────────────
export class DafuCraft{
  constructor(){
    const o=boyBase('DafuCraft',{kind:'hong',headHeight:1.66,
      torso:[[.92,.175,.122],[1.02,.190,.130],[1.12,.186,.125],[1.20,.175,.118],[1.34,.210,.142],[1.46,.212,.140],[1.54,.178,.120],[1.60,.096,.084]],
      leg:[[0,.108],[.25,.093],[.55,.071],[.8,.058],[1,.051]],
      arm:[[0,.070],[.3,.062],[.6,.050],[1,.040]],
      sleeve:'#1c1e22',pants:'#181a1e',shoe:'#201e24',shoeScale:1.28,handScale:.95});
    Object.assign(this,o);
    // 脸谱：宽下颌方脸（hong 脸型）+眯缝笑眼（眼高压最低）+眼距放宽+一字阔嘴
    this.face.setStyle({eyeHeight:.5,eyeSpacing:98,mouthWidth:1.2});
    this.face.setActing({smile:.35});
    this.cladStyle={pri:'#5c6167',sec:'#787d84',trim:'#e8b45e',gem:'#ffb35e',seam:'#ffb35e',
      priGlow:'#241c10',secGlow:'#1c160c'};
    this.gemBase=new THREE.Color('#ffb35e');this.gemHi=new THREE.Color('#ffe8c8');
    this.cladParts=buildOrnateClad(this,{style:this.cladStyle,shoulderLayers:3,scale:1.22,
      crown:'band',cape:{len:.48,w:.50,color:'#2a2c34'},
      dims:{shoulderY:1.58,shoulderHalf:.19,hipIdle:.96,hipHalf:.105,chestY:1.36,chestR:[.225,.26,.13],profile:o.torsoProfile}});
    this.setCladState(0);
  }
  setCladState(t){applyCladState(this.cladParts,t);}
  updateCladFX(t,cladT){
    cladFX(this.cladParts,t,cladT,this.gemHi);
    for(const p of this.cladParts)for(const g of p.gems)if(g.visible)
      g.material.color.copy(this.gemBase).lerp(this.gemHi,.35+.35*Math.sin(t*2.4+p.ord*1.1));
    updateCape(this.cape,t);
  }
  setEmotion(e,b){this.face.setEmotion(e,b);}
  setPose(p){sharedSetPose(this,p);}
}

// ── 赫斯提亚（炉灶与家宅女神）：白金长袍+金边围裙+金色大波浪长发+半垂眼睑慵懒脸+
// 灶台火焰光环头冠（头顶悬浮小火环，纯 t 闪烁）+金色长柄锅铲权杖。
// 只在 outro 坐大锅圣物锅沿登场（坐姿直出腿链，不走步行 IK）。
export class HestiaCraft{
  constructor(){
    const o={mesh:new THREE.Group()};o.mesh.name='HestiaCraft';
    o.body=new THREE.Group();o.mesh.add(o.body);this.mesh=o.mesh;this.body=o.body;
    const skin=skinMaterial('lei');
    this.dims={hipY:0,shoulderY:.52,shoulderHalf:.13,armA:.17,armB:.16}; // 坐姿：mesh 原点在臀位
    // 白金长袍裙身（肩→小腿的落地裙剖面；坐姿时裙摆垂在锅沿前）
    this.limbs={};this.hands={};this.feet={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,skin,[[0,.042],[.3,.038],[.6,.030],[1,.024]],{depth:.9});
      const hand=new ArticulatedHand(sign,skin,jointInk);hand.scale.setScalar(.72);
      this.mesh.add(hand);this.hands[side]=hand;
      // 小腿+金色凉鞋（裙摆下露出晃腿）
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,'#efe4d4',[[0,.052],[.5,.044],[1,.032]],{depth:.94});
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      mesh(shoe,shoeGeometry(),'#d8b45e').scale.setScalar(.92);
    }
    // 裙身（髋部最宽，垂坠感；冷白主色+背侧淡金阴影层=明暗两层）
    mesh(this.body,ringsGeometry([[.0,.16,.13],[.12,.20,.15],[.26,.155,.12],[.40,.135,.105],[.50,.105,.09],[.535,.055,.055]]),'#f4f0e6');
    const shade=mesh(this.body,ringsGeometry([[.0,.165,.06,-.10],[.12,.205,.07,-.115],[.26,.16,.055,-.10],[.40,.14,.05,-.09],[.50,.11,.04,-.075]]),'#e8d5ae');
    shade.rotation.y=Math.PI; // 淡金阴影层罩背侧（zc 负=靠后）
    // 裙前片（坐姿时盖大腿的垂布）：腰铰链挂片
    this.skirtFront=new THREE.Group();this.skirtFront.position.set(0,.02,.11);this.body.add(this.skirtFront);
    const drape=mesh(this.skirtFront,ringsGeometry([[0,.15,.05],[.30,.17,.055],[.52,.14,.05]]),'#f4f0e6');
    drape.rotation.x=.12;
    // 金边围裙（前襟一片贴袍身的小围裙——窄于袍身，别读成盒子；金边勾线读得出）
    const apron=mesh(this.body,ringsGeometry([[.02,.085,.155],[.26,.095,.16]]),'#e8cf9a');
    apron.position.z=.015;
    const apronEdge=new THREE.Mesh(new THREE.TorusGeometry(.095,.004,6,20,Math.PI),new THREE.MeshBasicMaterial({color:'#c8a24e'}));
    apronEdge.position.set(0,.02,.172);apronEdge.rotation.z=Math.PI;this.body.add(apronEdge); // 围裙下沿金勾线
    for(const sign of [-1,1]){ // 围裙两侧金勾线
      const eb=new THREE.Mesh(new THREE.BoxGeometry(.004,.24,.004),new THREE.MeshBasicMaterial({color:'#c8a24e'}));
      eb.position.set(sign*.088,.14,.155);eb.rotation.z=-sign*.06;this.body.add(eb);
    }
    mesh(this.body,new THREE.TorusGeometry(.115,.012,8,24),'#c8a24e').rotation.x=Math.PI/2; // 腰金环
    const knot=new THREE.Group();knot.position.set(0,.30,-.13);this.body.add(knot); // 腰带结（后腰）
    mesh(knot,new THREE.SphereGeometry(.028,10,8),'#c8a24e');
    for(const sign of [-1,1])mesh(knot,new THREE.BoxGeometry(.022,.06,.008),'#c8a24e').position.set(sign*.035,-.035,0);
    // 裙摆金边
    mesh(this.body,new THREE.TorusGeometry(.20,.008,8,32),'#c8a24e').rotation.x=Math.PI/2;
    // ── 头：慵懒脸（半垂眼睑+微抿笑，眉眼必须露出）──
    this.face=animatedHead(this.body,'lei',.60); // 坐姿版头位（mesh 原点在臀）
    this.headGroup=this.face.head;this.mouth=this.face.mouth;
    this.face.setStyle({eyeHeight:.55,eyeSpacing:88,lashes:true,mouthWidth:.95});
    this.face.setActing({smile:.15});
    // 金色大波浪长卷发：颅顶壳（前沿在眉上，露出眉眼）+ 前发中分两缕短束 + 六缕波浪垂发留肩后
    const gold='#e8c46a',goldD='#c8a24e';
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.158,24,16,0,TAU,0,Math.PI*.46),mat(gold));
    cap.position.set(0,.062,-.010);cap.rotation.x=.12;this.headGroup.add(cap);
    // 中分短束（前额两侧斜分，不收过眉）
    for(const sign of [-1,1]){
      const curve=new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(sign*.015,.155,.085),new THREE.Vector3(sign*.07,.12,.10),
        new THREE.Vector3(sign*.115,.045,.06));
      const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,8,.016,6),mat(gold));
      this.headGroup.add(tube);
    }
    const backCurtain=new THREE.Mesh(new THREE.SphereGeometry(.15,20,12,Math.PI*.6,Math.PI*.8,Math.PI*.3,Math.PI*.55),mat(gold));
    backCurtain.position.set(0,.02,-.02);this.headGroup.add(backCurtain);
    for(let i=0;i<6;i++){ // 波浪垂发：正弦曲线管（全部从耳后/后背走，不糊脸）
      const side=i<3?-1:1,k=i%3;
      const curve=new THREE.CatmullRomCurve3([
        new THREE.Vector3(side*(.12+k*.02),.05,-.05),
        new THREE.Vector3(side*(.15+k*.01),-.10,-.08-k*.02),
        new THREE.Vector3(side*(.12+k*.02),-.26,-.10-k*.02),
        new THREE.Vector3(side*(.15+k*.01),-.40,-.08-k*.03)]);
      const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,12,.026-k*.005,7),mat(k===1?goldD:gold));
      this.headGroup.add(tube);
    }
    // 灶台火焰光环头冠：头顶悬浮小火环（金环+火舌 sprite，纯 t 闪烁）
    this.halo=new THREE.Group();this.halo.position.set(0,.30,0);this.headGroup.add(this.halo);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.10,.008,8,28),
      new THREE.MeshBasicMaterial({color:'#ffd98a',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
    ring.rotation.x=Math.PI/2;this.halo.add(ring);
    this.haloFlames=[];
    {const c=document.createElement('canvas');c.width=c.height=64;const g2=c.getContext('2d');
     const gr=g2.createRadialGradient(32,32,2,32,32,32);
     gr.addColorStop(0,'#fff6dc');gr.addColorStop(.4,'rgba(255,190,110,.85)');gr.addColorStop(1,'rgba(255,150,60,0)');
     g2.fillStyle=gr;g2.fillRect(0,0,64,64);
     const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
     for(let i=0;i<6;i++){
       const f=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
       const a=i/6*TAU;f.position.set(Math.cos(a)*.10,0,Math.sin(a)*.10);
       f.userData={a,ph:i*1.1};this.halo.add(f);this.haloFlames.push(f);
     }}
    // ── 金色长柄锅铲权杖（右手持；挂点=右手世界位姿×固定偏移）──
    this.staff=new THREE.Group();this.mesh.add(this.staff);
    const handle=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.85,10),mat(goldD));
    handle.rotation.x=Math.PI/2;this.staff.add(handle);
    const blade=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),mat(gold));
    blade.scale.set(.075,.10,.018);blade.position.z=.48;this.staff.add(blade);
    const bladeRim=new THREE.Mesh(new THREE.TorusGeometry(.072,.008,6,20),mat(goldD));
    bladeRim.position.z=.48;this.staff.add(bladeRim);
    mesh(this.staff,new THREE.SphereGeometry(.02,10,8),'#c8a24e').position.z=-.44; // 柄尾珠
    this.setEmotion('neutral',0);
  }
  setEmotion(e,b){this.face.setEmotion(e,b);}
  // 坐姿直出：p={leftLeg:[臀,膝,踝]…, leftArm:[肩,肘,腕]…, headYaw/Pitch/Roll, fistL/fistR, haloT}
  setPose(p){
    this.mesh.position.set(p.rootX,p.rootY,p.rootZ);this.mesh.rotation.y=p.yaw??0;
    this.body.position.y=p.bob??0;this.body.rotation.x=p.lean??0;
    this.headGroup.rotation.set(p.headPitch??0,p.headYaw??0,p.headRoll??0);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.limbs[side+'Leg'].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.position.copy(V(arm[2]));
      hand.setGesture({fist:p[side==='left'?'fistL':'fistR']??.4,open:p[side==='left'?'openL':'openR']??0});
      this.feet[side].position.copy(V(leg[2]));
      this.feet[side].rotation.set(p[side+'FootPitch']??.5,0,0); // 垂腿自然绷脚
    }
    // 权杖=右手位姿×固定偏移（握持点在手心，柄沿掌轴）
    const hand=this.hands.right;
    this.staff.position.copy(hand.position);this.staff.quaternion.copy(hand.quaternion);
    this.staff.rotateX(Math.PI/2);this.staff.translateY(.10);
    // 光环呼吸（纯 t）
    const t=p.t??0;
    this.halo.position.y=.30+.012*Math.sin(t*1.4);
    for(const f of this.haloFlames){
      f.scale.set(.05,.09+.04*Math.max(0,Math.sin(t*6+f.userData.ph)),1);
      f.material.opacity=.5+.4*Math.max(0,Math.sin(t*5+f.userData.ph*2));
    }
    this.mesh.updateMatrixWorld(true);
  }
}
