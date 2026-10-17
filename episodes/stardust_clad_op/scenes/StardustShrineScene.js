// 《星屑战壳》OP — 星屑灶台圣殿（StardustShrineScene）：夜空穹顶（canvas 渐变星野，
// 三层星+炊烟状星云带）+ 中央灶台式祭坛（圆形石灶+环形火焰槽+悬浮发光大锅圣物）
// + 12 座食位石龛环廊（发光厨具剪影）+ 石板地面星座连线刻纹。
// 双色光：暖金灶火（主光）vs 冷蓝星夜（环境/rim）。横屏 1280×720。
// 全程序化几何+canvas 纹理；applyHybrid() 预留文生图纹理接口（缺失即保持程序化）。
import * as THREE from 'three';
import {SceneBase} from 'dula-engine';

const TAU=Math.PI*2;
const toon=c=>new THREE.MeshToonMaterial({color:c});
const basic=c=>new THREE.MeshBasicMaterial({color:c});
const canvasTex=(w,h,draw)=>{
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  draw(canvas.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
};
// LCG 确定性种子（seek 一致铁律：场景纹理不走 Math.random）
const lcg=seed=>()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
// 世界空间顶视平面投影 UV：近水平表面共享同一比例尺（texel density 一致）。
// 必须用 matrixWorld 完整变换顶点再取世界 XZ（含父级与旋转/缩放）
function planarUVWorld(m,s){
  m.updateWorldMatrix(true,false);
  const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv,v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);
    uv.setXY(i,v.x*s,v.z*s);
  }
  uv.needsUpdate=true;
}

// 夜空穹顶：竖直渐变 + 三层星（高层细节）；近地平线 alpha 渐出——
// 低空与地平线归 ContinuousBackdrop 背景板（色阶与 #1a2440/#232c48 衔接）
function domeTexture(){
  return canvasTex(1024,512,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#04060f');g.addColorStop(.45,'#0c1226');g.addColorStop(.75,'#1a2440');
    g.addColorStop(1,'#232c48');
    c.fillStyle=g;c.fillRect(0,0,w,h);
    const rr=lcg(97);
    // 三层星：远景密小 → 中景 → 近景亮星带十字星芒（只画地平线上方）
    for(const [n,rMax,a0,a1] of [[260,.8,.35,.75],[110,1.4,.6,.95],[26,2.2,.85,1]]){
      for(let i=0;i<n;i++){
        const x=rr()*w,y=rr()*h*.42,r=.3+rr()*rMax,a=a0+rr()*(a1-a0);
        c.fillStyle=`rgba(226,236,255,${a})`;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
        if(rMax>2&&rr()<.6){c.strokeStyle=`rgba(226,236,255,${a*.5})`;c.lineWidth=.7;
          c.beginPath();c.moveTo(x-r*3,y);c.lineTo(x+r*3,y);c.moveTo(x,y-r*3);c.lineTo(x,y+r*3);c.stroke();}
      }
    }
    // 地平线渐出（v≈0.5 是赤道；canvas y 向下）：让背景板从低空接管
    const fade=c.createLinearGradient(0,h*.38,0,h*.56);
    fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,1)');
    c.globalCompositeOperation='destination-out';
    c.fillStyle=fade;c.fillRect(0,h*.38,w,h*.62);
    c.globalCompositeOperation='source-over';
  });
}
// 地面刻纹覆盖层（透明底，两种模式共用：程序化=底色板+本层；hybrid=AI 石板+本层）
// 星座连线刻纹 + 灶火暖光晕（加色叠加）
function floorOverlayTexture(){
  return canvasTex(1024,1024,(c,w,h)=>{
    const rr=lcg(41),cx=w/2,cy=h/2;
    // 石板环缝（暗线，hybrid 下强化 AI 石板的环形分区）
    c.strokeStyle='rgba(14,18,24,.5)';c.lineWidth=3;
    for(let ring=0;ring<9;ring++){const r0=60+ring*52;
      c.beginPath();c.arc(cx,cy,r0,0,TAU);c.stroke();}
    // 星座连线刻纹：三组折线+星点（冷蓝辉光）
    c.shadowColor='#5f8fd4';c.shadowBlur=6;
    for(let k=0;k<5;k++){
      const pts=[];const n=4+Math.floor(rr()*3),base=rr()*TAU,rad=170+rr()*250;
      for(let i=0;i<n;i++){const a=base+i*.5+rr()*.3,r=rad+rr()*90;
        pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}
      c.strokeStyle='rgba(120,168,228,.55)';c.lineWidth=2.2;
      c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
      c.fillStyle='rgba(180,214,255,.9)';
      for(const [x,y] of pts){c.beginPath();c.arc(x,y,3.2,0,TAU);c.fill();}
    }
    c.shadowBlur=0;
    // 中心暖光晕（灶火映地）
    const warm=c.createRadialGradient(cx,cy,10,cx,cy,300);
    warm.addColorStop(0,'rgba(255,166,90,.28)');warm.addColorStop(1,'rgba(255,166,90,0)');
    c.fillStyle=warm;c.fillRect(0,0,w,h);
  });
}
// 厨具剪影（食位石龛发光件）：铲/勺/刀/叉/蒸笼/筷 六式轮换
function utensilTexture(kind,color){
  return canvasTex(128,160,(c)=>{
    c.strokeStyle=color;c.fillStyle=color;c.lineWidth=9;c.lineCap='round';c.lineJoin='round';
    c.shadowColor=color;c.shadowBlur=10;
    const line=(x0,y0,x1,y1)=>{c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();};
    switch(kind%6){
      case 0: // 铲
        line(64,20,64,86);c.beginPath();c.moveTo(42,86);c.lineTo(86,86);c.lineTo(80,132);c.lineTo(48,132);c.closePath();c.fill();break;
      case 1: // 勺
        line(64,80,64,140);c.beginPath();c.ellipse(64,48,24,30,0,0,TAU);c.fill();
        c.fillStyle='rgba(10,12,20,.85)';c.beginPath();c.ellipse(64,44,16,21,0,0,TAU);c.fill();break;
      case 2: // 刀
        line(64,104,64,142);c.beginPath();c.moveTo(56,104);c.lineTo(56,30);c.quadraticCurveTo(56,14,72,10);c.lineTo(72,104);c.closePath();c.fill();break;
      case 3: // 叉
        line(64,74,64,140);for(const dx of [-14,0,14])line(64+dx,22,64+dx,70);
        line(50,70,78,70);break;
      case 4: // 蒸笼
        c.strokeRect(30,44,68,30);c.strokeRect(30,82,68,30);line(24,44,104,44);line(24,112,104,112);
        c.beginPath();c.arc(64,36,8,0,TAU);c.fill();break;
      default: // 筷（一双）
        line(50,18,58,142);line(78,18,70,142);break;
    }
  });
}
// 火焰/光点通用径向渐变 sprite 纹理
function glowTexture(inner='#fff6dc',outer='rgba(255,150,60,0)'){
  return canvasTex(64,64,(c)=>{
    const g=c.createRadialGradient(32,32,2,32,32,32);
    g.addColorStop(0,inner);g.addColorStop(.4,'rgba(255,190,110,.85)');g.addColorStop(1,outer);
    c.fillStyle=g;c.fillRect(0,0,64,64);
  });
}

export class StardustShrineScene extends SceneBase{
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#070b18');
    S.fog=new THREE.Fog('#0a1020',26,85);
    // ── 双色光：低环境（冷）+ 灶火暖主光（点光，update 闪烁）+ 冷 rim ──
    // R3：夜景整体偏暗吞纹理，环境/补光上调让 AI 材质读得出
    S.add(new THREE.HemisphereLight(0x2a3a5e,0x0c0a12,.78));
    this.fireLight=new THREE.PointLight(0xffa050,46,46,1.7);
    this.fireLight.position.set(0,2.6,-6);S.add(this.fireLight);
    const faceFill=new THREE.DirectionalLight(0xffc088,1.05); // 暖补光保脸（灶火方向）
    faceFill.position.set(0,4,8);S.add(faceFill);
    const rim=new THREE.DirectionalLight(0x6a8acf,.9); // 冷 rim：星夜背光
    rim.position.set(-6,9,-16);rim.castShadow=true;rim.shadow.mapSize.set(2048,2048);
    Object.assign(rim.shadow.camera,{left:-16,right:16,top:12,bottom:-4,far:60});
    rim.shadow.bias=-.0004;S.add(rim);

    // ── 夜空穹顶（星层高层细节；近地平线 alpha 渐出让位背景板）──
    const dome=new THREE.Mesh(new THREE.SphereGeometry(88,48,24),
      new THREE.MeshBasicMaterial({map:domeTexture(),side:THREE.BackSide,fog:false,
        transparent:true,depthWrite:false}));
    dome.position.set(0,0,-6);dome.renderOrder=-99;this.dome=dome;S.add(dome);
    // 亮星闪烁层（加色 sprite，update 呼吸）
    this.starSprites=[];
    {const rr=lcg(7),tex=glowTexture('rgba(230,240,255,1)','rgba(160,190,255,0)');
     for(let i=0;i<22;i++){
       const a=rr()*TAU,el=.12+rr()*.75,r=78;
       const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
       s.position.set(Math.cos(a)*r*Math.cos(el),Math.sin(el)*r,-6+Math.sin(a)*r*Math.cos(el));
       s.scale.setScalar(.5+rr()*1.1);s.userData={ph:rr()*TAU,f:1.2+rr()*2.4};
       S.add(s);this.starSprites.push(s);
     }}
    // 星屑浮尘（祭坛区缓漂微粒）
    this.motes=[];
    {const rr=lcg(23),tex=glowTexture('rgba(255,236,200,1)','rgba(255,190,110,0)');
     for(let i=0;i<46;i++){
       const a=rr()*TAU,r=2+rr()*11;
       const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
       s.userData={x:Math.cos(a)*r,z:-6+Math.sin(a)*r,y:.3+rr()*3.4,ph:rr()*TAU,f:.3+rr()*.7};
       s.scale.setScalar(.05+rr()*.08);S.add(s);this.motes.push(s);
     }}

    // ── 地面：底色板圆盘（hybrid 换 AI 石板）+ 刻纹覆盖层 + 远景暗盘兜底 ──
    const floor=this.floorMesh=new THREE.Mesh(new THREE.CircleGeometry(30,72),toon('#232733'));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;S.add(floor);
    const overlay=new THREE.Mesh(new THREE.CircleGeometry(30,72),
      new THREE.MeshBasicMaterial({map:floorOverlayTexture(),transparent:true,
        blending:THREE.AdditiveBlending,depthWrite:false}));
    overlay.rotation.x=-Math.PI/2;overlay.position.y=.005;S.add(overlay);
    const far=this.farMesh=new THREE.Mesh(new THREE.CircleGeometry(90,48),toon('#131722'));
    far.rotation.x=-Math.PI/2;far.position.y=-.02;S.add(far);

    // ── 中央灶台式祭坛（0,0,-6）：三层石基 + 石灶 + 环形火焰槽 + 悬浮大锅 ──
    // stoneMeshes：hybrid 石材贴图覆盖清单（贴图必须覆盖到每一个面，漏一个纯色件就破功）
    // R3 分组：reliefMeshes=祭坛浮雕 / ironMeshes=圣物铸铁 / wallMeshes=石龛内壁 /
    // fabricMeshes=帷幔旗帜 / rubbleMeshes=地面碎石；texR=每件独立 repeat 提示
    const altar=this.altar=new THREE.Group();altar.position.set(0,0,-6);S.add(altar);
    this.stoneMeshes=[];this.reliefMeshes=[];this.ironMeshes=[];this.wallMeshes=[];
    this.fabricMeshes=[];this.drapes=[];
    const stone='#3a3f4c',stoneD='#2c303b';
    const texR=(m,r)=>{m.userData.texR=r;return m;};
    for(const [r,hh,y,rp] of [[3.6,.26,.13,6],[3.0,.26,.39,5],[2.4,.26,.65,4]]){
      const tier=new THREE.Mesh(new THREE.CylinderGeometry(r,r+.08,hh,40),toon(stone));
      tier.position.y=y;tier.castShadow=tier.receiveShadow=true;altar.add(tier);
      this.reliefMeshes.push(texR(tier,[rp,1]));
    }
    const stove=new THREE.Mesh(new THREE.CylinderGeometry(1.55,1.85,1.0,32),toon(stoneD));
    stove.position.y=1.28;stove.castShadow=stove.receiveShadow=true;altar.add(stove);
    this.reliefMeshes.push(texR(stove,[3,1]));
    // 灶面七星灶眼
    for(let i=0;i<7;i++){
      const a=i/7*TAU,eye=new THREE.Mesh(new THREE.CircleGeometry(.11,14),basic('#0c0a08'));
      eye.rotation.x=-Math.PI/2;eye.position.set(Math.cos(a)*1.05,1.785,Math.sin(a)*1.05);altar.add(eye);
    }
    // 环形火焰槽（发光槽体 + 火舌 sprite 环）
    const trough=new THREE.Mesh(new THREE.TorusGeometry(1.32,.09,10,44),
      new THREE.MeshBasicMaterial({color:'#ff8a3a'}));
    trough.rotation.x=Math.PI/2;trough.position.y=1.80;altar.add(trough);
    this.flames=[];
    {const tex=glowTexture();
     for(let i=0;i<14;i++){
       const a=i/14*TAU;
       const f=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
       f.position.set(Math.cos(a)*1.32,1.92,Math.sin(a)*1.32);
       f.userData={ph:i*1.7,f:7+(i%4)};altar.add(f);this.flames.push(f);
     }}
    // 悬浮大锅（圣物）：半球锅体 + 外翻锅沿 + 双侧锅耳 + 底部三足 + 锅口内热光
    const pot=this.pot=new THREE.Group();pot.position.set(0,3.55,0);altar.add(pot);
    const potBody=new THREE.Mesh(new THREE.SphereGeometry(.95,32,18,0,TAU,Math.PI*.28,Math.PI*.72),
      toon('#26242c'));
    potBody.castShadow=true;pot.add(potBody);this.ironMeshes.push(texR(potBody,[3,2]));
    // 外翻锅沿：开口向上的喇叭沿 + 沿口圆环（读作"锅"的第一剪影要素）
    const flare=new THREE.Mesh(new THREE.CylinderGeometry(.98,.72,.20,32,1,true),
      new THREE.MeshToonMaterial({color:'#3c3640',side:THREE.DoubleSide}));
    flare.position.y=.68;pot.add(flare);this.ironMeshes.push(texR(flare,[4,1]));
    const potRim=new THREE.Mesh(new THREE.TorusGeometry(.98,.045,10,40),toon('#463f4a'));
    potRim.rotation.x=Math.PI/2;potRim.position.y=.78;pot.add(potRim);this.ironMeshes.push(texR(potRim,[4,1]));
    // 两侧锅耳（横把圆环）
    for(const sign of [-1,1]){
      const ear=new THREE.Mesh(new THREE.TorusGeometry(.14,.035,8,20),toon('#463f4a'));
      ear.position.set(sign*.92,.42,0);ear.rotation.y=Math.PI/2;pot.add(ear);
      this.ironMeshes.push(texR(ear,[2,1]));
    }
    // 底部三足（从下方机位读作釜）
    for(let i=0;i<3;i++){
      const a=i/3*TAU+.5;
      const foot=new THREE.Mesh(new THREE.CylinderGeometry(.05,.09,.34,10),toon('#3c3640'));
      foot.position.set(Math.cos(a)*.52,-.82,Math.sin(a)*.52);
      foot.rotation.set(Math.sin(a)*.3,0,-Math.cos(a)*.3);pot.add(foot);
      this.ironMeshes.push(texR(foot,[1,1]));
    }
    // 锅口内热：口沿内侧发光盘 + 内壁暖光环（祭坛火槽从下方打亮锅底）
    this.potGlow=new THREE.Mesh(new THREE.CircleGeometry(.88,32),
      new THREE.MeshBasicMaterial({color:'#ffd98a',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
    this.potGlow.rotation.x=-Math.PI/2;this.potGlow.position.y=.72;pot.add(this.potGlow);
    const mouthRing=new THREE.Mesh(new THREE.TorusGeometry(.82,.03,8,36),
      new THREE.MeshBasicMaterial({color:'#ffb35e',transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
    mouthRing.rotation.x=Math.PI/2;mouthRing.position.y=.60;pot.add(mouthRing);
    this.potHalo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));
    this.potHalo.scale.setScalar(2.6);this.potHalo.position.y=.5;pot.add(this.potHalo);

    // ── 12 食位石龛环廊（正对祭坛；正面留 30° 缺口给机位走廊）──
    this.nicheGlows=[];
    for(let i=0;i<12;i++){
      const a=Math.PI/2+Math.PI/12+i*TAU/12; // 缺口居中朝 +z（机位方向）
      const g=new THREE.Group();
      g.position.set(Math.cos(a)*15,0,-6+Math.sin(a)*15);
      g.lookAt(0,0,-6);S.add(g);
      const pillar=(x)=>{const p=new THREE.Mesh(new THREE.BoxGeometry(.5,2.7,.5),toon(stone));
        p.position.set(x,1.35,0);p.castShadow=p.receiveShadow=true;g.add(p);this.stoneMeshes.push(p);};
      pillar(-.95);pillar(.95);
      const lintel=new THREE.Mesh(new THREE.BoxGeometry(2.4,.42,.6),toon(stoneD));
      lintel.position.y=2.9;lintel.castShadow=true;g.add(lintel);this.stoneMeshes.push(lintel);
      const back=new THREE.Mesh(new THREE.BoxGeometry(1.9,2.3,.24),toon(stoneD));
      back.position.set(0,1.15,-.34);back.receiveShadow=true;g.add(back);
      this.wallMeshes.push(texR(back,[1,1])); // R3：龛内壁专用纹理
      // 发光厨具剪影（龛内悬浮，暖金/冷青轮换）
      const warm=i%2===0;
      const glyph=new THREE.Mesh(new THREE.PlaneGeometry(1.0,1.25),
        new THREE.MeshBasicMaterial({map:utensilTexture(i,warm?'#ffc478':'#9fd8ff'),
          transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
      glyph.position.set(0,1.35,-.2);g.add(glyph);
      this.nicheGlows.push({glyph,ph:i*.9,warm});
      // 龛前小食台
      const ledge=new THREE.Mesh(new THREE.BoxGeometry(1.5,.16,.6),toon(stone));
      ledge.position.set(0,.62,.2);ledge.castShadow=ledge.receiveShadow=true;g.add(ledge);
      this.stoneMeshes.push(ledge);
    }
    // ── R3 环廊楣梁：连起相邻石龛（缺口方向不封，留机位走廊）──
    const beamY=3.35;
    for(let i=0;i<11;i++){
      const am=Math.PI/2+Math.PI/12+i*TAU/12+TAU/24; // 相邻两龛中点方位
      const beam=new THREE.Mesh(new THREE.BoxGeometry(7.5,.5,.55),toon(stoneD));
      beam.position.set(Math.cos(am)*15,beamY,-6+Math.sin(am)*15);
      beam.rotation.y=Math.PI/2-am; // 长轴对齐切线方向（局部+x→切线，+z→径向）
      beam.castShadow=beam.receiveShadow=true;S.add(beam);
      this.stoneMeshes.push(texR(beam,[3,1]));
      // 龛间帷幔/旗帜：挂在楣梁下沿，顶点摆动纯 t（顶边钉住，下摆自由）
      const hang=(w,h,off,amp,ph)=>{
        const geo=new THREE.PlaneGeometry(w,h,8,10);
        const m=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:'#2c3a68',side:THREE.DoubleSide}));
        // 沿切线方向（-sin am, cos am）偏移 off，挂在梁下
        m.position.set(Math.cos(am)*15-Math.sin(am)*off,beamY-.25-h/2,
          -6+Math.sin(am)*15+Math.cos(am)*off);
        m.rotation.y=Math.PI/2-am; // 法线朝径向（与楣梁同向）
        m.userData={base:geo.attributes.position.array.slice(),h,ph,amp};
        S.add(m);this.fabricMeshes.push(m);this.drapes.push(m);
      };
      if(i%2===0)hang(2.6,1.5,0,.12,i*.9);
      else{hang(.55,1.15,-1.7,.10,i*.9);hang(.55,1.15,1.7,.10,i*.9+2.1);}
    }
    // ── R3 祭坛火盆圈（6 座：石座+浮雕铜盆+火舌；发光件）──
    this.brazierFlames=[];
    {const fireTex=glowTexture();
     for(let k=0;k<6;k++){
      const a=Math.PI/6+k*Math.PI/3,bx=Math.cos(a)*5.4,bz=-6+Math.sin(a)*5.4;
      const b=new THREE.Group();b.position.set(bx,0,bz);S.add(b);
      const stand=new THREE.Mesh(new THREE.CylinderGeometry(.10,.17,.85,12),toon(stoneD));
      stand.position.y=.425;stand.castShadow=true;b.add(stand);
      this.stoneMeshes.push(texR(stand,[1,1]));
      const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.38,.20,.28,20),toon(stone));
      bowl.position.y=.99;bowl.castShadow=true;b.add(bowl);
      this.reliefMeshes.push(texR(bowl,[2,1]));
      const brim=new THREE.Mesh(new THREE.TorusGeometry(.36,.032,8,24),toon('#463f4a'));
      brim.rotation.x=Math.PI/2;brim.position.y=1.13;b.add(brim);
      this.ironMeshes.push(texR(brim,[2,1]));
      const ember=new THREE.Mesh(new THREE.CircleGeometry(.30,20),
        new THREE.MeshBasicMaterial({color:'#ffb35e',transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));
      ember.rotation.x=-Math.PI/2;ember.position.y=1.10;b.add(ember);
      const fl=new THREE.Sprite(new THREE.SpriteMaterial({map:fireTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
      fl.position.y=1.42;b.add(fl);
      const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:fireTex,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false}));
      halo.scale.setScalar(1.5);halo.position.y=1.25;b.add(halo);
      this.brazierFlames.push({fl,halo,ember,ph:k*1.31,f:6+(k%3)});
     }}
    // ── R3 地面碎石（星屑散石：小体量贴石材纹，祭坛环区散布）──
    {const rr=lcg(57);
     for(let i=0;i<26;i++){
      const a=rr()*TAU,r=4.6+rr()*8.6;
      const m=rr()<.5?new THREE.Mesh(new THREE.TetrahedronGeometry(.08+rr()*.14),toon(stoneD))
        :(()=>{const s=new THREE.Mesh(new THREE.SphereGeometry(.12+rr()*.12,8,6),toon(stoneD));
            s.scale.y=.55;return s;})();
      m.position.set(Math.cos(a)*r,.06,-6+Math.sin(a)*r);
      m.rotation.set(rr()*3,rr()*3,rr()*3);m.castShadow=true;S.add(m);
      this.stoneMeshes.push(texR(m,[1,1]));
     }}
    // 近水平面世界空间顶视投影 UV（走 updateWorldMatrix 后的完整 matrixWorld——
    // R15 教训：CircleGeometry 原始顶点 z=0，只用 Y 旋转+平移会让投影退化）
    this.scene.updateMatrixWorld(true);
    planarUVWorld(this.floorMesh,.13);planarUVWorld(this.farMesh,.13);
  }
  // craft3d-hybrid：文生图纹理/背景板注入（几何/动画/光影不动，只换皮肤；
  // 任一纹理缺失静默回退程序化外观）。法线图是数值数据：NoColorSpace。
  async applyHybrid(base='./assets3d/tex/'){
    const L=new THREE.TextureLoader();
    const load=(n,data=false)=>new Promise(res=>L.load(base+n+'.png',t=>{
      t.colorSpace=data?THREE.NoColorSpace:THREE.SRGBColorSpace;t.anisotropy=4;res(t);
    },undefined,()=>res(null)));
    const T={};
    await Promise.all([['floor'],['floor_normal',1],['stone'],['stone_normal',1],['backdrop'],
        ['altar_relief'],['altar_relief_normal',1],['niche_wall'],['niche_wall_normal',1],
        ['fabric'],['fabric_normal',1],['cast_iron'],['cast_iron_normal',1]]
      .map(async ([n,d])=>T[n]=await load(n,!!d)));
    this.hybridApplied=[];
    const tile=t=>{t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;return t;}; // 免接缝镜像平铺（比例尺在 planarUVWorld）
    // R3 通用贴皮器：每件 clone 独立 repeat（texR 提示），map×color 压灰防过曝，法线共用 UV/镜像
    const skin=(meshes,tex,norm,ns,color,defR=[1,1])=>{
      if(!tex)return false;
      for(const m of meshes){
        const [rx,ry]=m.userData.texR??defR;
        const mp=tex.clone();mp.wrapS=mp.wrapT=THREE.MirroredRepeatWrapping;
        mp.repeat.set(rx,ry);mp.needsUpdate=true;
        m.material.map=mp;m.material.color.set(color);
        if(norm){const nm=norm.clone();nm.wrapS=nm.wrapT=THREE.MirroredRepeatWrapping;
          nm.repeat.set(rx,ry);nm.needsUpdate=true;
          m.material.normalMap=nm;m.material.normalScale=new THREE.Vector2(ns,ns);}
        m.material.needsUpdate=true;
      }
      return true;
    };
    if(T.floor){
      // map×color 压灰防过曝；法线与 albedo 共用同一 UV/镜像
      this.floorMesh.material.map=tile(T.floor);this.floorMesh.material.color.set('#9aa2ae');
      if(T.floor_normal){this.floorMesh.material.normalMap=tile(T.floor_normal);
        this.floorMesh.material.normalScale=new THREE.Vector2(1.6,1.6);}
      this.floorMesh.material.needsUpdate=true;
      this.farMesh.material.map=tile(T.floor);this.farMesh.material.color.set('#454c5c'); // 远景盘压暗一号读色差
      if(T.floor_normal){this.farMesh.material.normalMap=tile(T.floor_normal);
        this.farMesh.material.normalScale=new THREE.Vector2(1.6,1.6);}
      this.farMesh.material.needsUpdate=true;
      this.hybridApplied.push('floor');
    }
    if(T.stone){
      for(const m of this.stoneMeshes){
        // 每件 clone 独立 repeat：圆柱侧壁周长 ~22m 需要横向 6 连，箱件 1:1（texR 可逐件覆盖）
        const cyl=m.geometry.type==='CylinderGeometry';
        const [rx,ry]=m.userData.texR??(cyl?[6,1]:[1,1]);
        const mp=T.stone.clone();mp.wrapS=mp.wrapT=THREE.MirroredRepeatWrapping;
        mp.repeat.set(rx,ry);mp.needsUpdate=true;
        m.material.map=mp;m.material.color.set('#93a0b4'); // 夜景压暗（stone.png 偏亮）
        if(T.stone_normal){const nm=T.stone_normal.clone();
          nm.wrapS=nm.wrapT=THREE.MirroredRepeatWrapping;nm.repeat.set(rx,ry);nm.needsUpdate=true;
          m.material.normalMap=nm;m.material.normalScale=new THREE.Vector2(1.2,1.2);}
        m.material.needsUpdate=true;
      }
      this.hybridApplied.push('stone');
    }
    // R3 新材质组：祭坛浮雕 / 石龛内壁 / 帷幔布料 / 圣物铸铁
    if(skin(this.reliefMeshes,T.altar_relief,T.altar_relief_normal,1.8,'#8e99ac'))this.hybridApplied.push('altar_relief');
    if(skin(this.wallMeshes,T.niche_wall,T.niche_wall_normal,1.6,'#8b93a8'))this.hybridApplied.push('niche_wall');
    if(skin(this.fabricMeshes,T.fabric,T.fabric_normal,1.2,'#a3abc4'))this.hybridApplied.push('fabric');
    if(skin(this.ironMeshes,T.cast_iron,T.cast_iron_normal,1.4,'#9aa0ab'))this.hybridApplied.push('cast_iron');
    if(T.backdrop){
      // 深夜背景板原图过暗（远近景明度统一）：canvas 提亮预处理（皮肤侧调整，不动灯光）
      const bc=document.createElement('canvas');bc.width=2048;bc.height=768;
      const bg=bc.getContext('2d');bg.filter='brightness(1.55) saturate(1.08)';
      bg.drawImage(T.backdrop.image,0,0);
      const bt=new THREE.CanvasTexture(bc);bt.colorSpace=THREE.SRGBColorSpace;bt.anisotropy=4;
      bt.wrapS=THREE.MirroredRepeatWrapping;
      // 连续天空背景板（craft3d 晋升件）：低仰角圆柱投影保构图，高处连续过渡天顶色；
      // 圣殿剪影带置于主视野（offset 按方位校准）
      const {continuousBackdrop}=await import('dula-assets/lib/craft3d/continuous-backdrop.js');
      this.backdrop=continuousBackdrop(bt,{center:[0,4,-6],cylinderRadius:60,
        cylinderHeight:30,radius:150,repeat:2,offset:.5,zenith:'#131a30'});
      this.scene.add(this.backdrop);
      // scene.background：采样背景板实际像素的渐变兜底（纯色会露平板边界）
      const sample=(()=>{const c=document.createElement('canvas');c.width=64;c.height=48;
        const g=c.getContext('2d',{willReadFrequently:true});
        g.drawImage(T.backdrop.image,0,0,2048,768,0,0,64,48);
        const d=g.getImageData(0,0,64,48).data;
        return row=>{let r=0,gg=0,b=0;for(let x=0;x<64;x++){const i=(row*64+x)*4;r+=d[i];gg+=d[i+1];b+=d[i+2];}
          return `rgb(${r/64|0},${gg/64|0},${b/64|0})`;};})();
      const top=sample(2),mid=sample(22),low=sample(34);
      this.scene.background=canvasTex(2,256,(c,w,h)=>{
        const g=c.createLinearGradient(0,0,0,h);
        g.addColorStop(0,top);g.addColorStop(.45,mid);g.addColorStop(.75,low);g.addColorStop(1,'#070a14');
        c.fillStyle=g;c.fillRect(0,0,w,h);
      });
      this.hybridApplied.push('backdrop');
    }
    return this.hybridApplied;
  }
  update(t){
    // 灶火闪烁（纯 t 确定函数）
    this.fireLight.intensity=42*(1+.09*Math.sin(t*7.3)+.05*Math.sin(t*13.1));
    for(const f of this.flames){
      const u=f.userData;
      f.scale.set(.34+.10*Math.sin(t*u.f+u.ph),.5+.22*Math.max(0,Math.sin(t*u.f*1.3+u.ph)),1);
      f.material.opacity=.55+.4*Math.max(0,Math.sin(t*u.f*.9+u.ph*2));
    }
    // 圣物大锅：悬浮呼吸 + 圣光脉动
    this.pot.position.y=3.55+.07*Math.sin(t*.8);
    this.pot.rotation.y=t*.12;
    this.potGlow.material.opacity=.75+.2*Math.sin(t*1.7);
    this.potHalo.material.opacity=.45+.2*Math.sin(t*1.7+.6);
    // 星闪 + 星屑浮尘
    for(const s of this.starSprites)
      s.material.opacity=.35+.6*Math.max(0,Math.sin(t*s.userData.f+s.userData.ph));
    for(const m of this.motes){
      const u=m.userData;
      m.position.set(u.x+.3*Math.sin(t*u.f+u.ph),u.y+.25*Math.sin(t*u.f*.7+u.ph*2),u.z+.3*Math.cos(t*u.f*.8+u.ph));
      m.material.opacity=.3+.35*Math.max(0,Math.sin(t*1.1+u.ph));
    }
    // 食位厨具剪影：缓呼吸（暖金/冷青交替相位）
    for(const n of this.nicheGlows)
      n.glyph.material.opacity=.62+.3*Math.sin(t*.9+n.ph);
    // R3 帷幔/旗帜顶点摆动（顶边钉住，越往下摆幅越大；纯 t 确定函数）
    for(const d of this.drapes){
      const u=d.userData,p=d.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const bx=u.base[i*3],by=u.base[i*3+1];
        const w=(u.h/2-by)/u.h; // 0=顶边钉住 1=下摆
        p.setX(i,bx+w*(u.amp*Math.sin(t*1.4+u.ph+by*2.2)+u.amp*.4*Math.sin(t*2.7+u.ph*1.7+bx*3)));
        p.setZ(i,w*.6*u.amp*Math.sin(t*1.1+u.ph+bx*2.5));
      }
      p.needsUpdate=true;
    }
    // R3 火盆火舌闪烁（与灶火同族不同相）
    for(const b of this.brazierFlames){
      b.fl.scale.set(.36+.08*Math.sin(t*b.f+b.ph),.55+.2*Math.max(0,Math.sin(t*b.f*1.3+b.ph)),1);
      b.fl.material.opacity=.6+.35*Math.max(0,Math.sin(t*b.f*.9+b.ph*2));
      b.halo.material.opacity=.16+.08*Math.sin(t*2.2+b.ph);
      b.ember.material.opacity=.7+.25*Math.sin(t*3.1+b.ph);
    }
  }
}
