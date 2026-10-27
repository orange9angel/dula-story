// 《借走月光的女孩》S01/S05 雪国小镇（占位版，MeshToonMaterial 色块）。
// 空间按圣经附录 B：钟楼居中（0,0,-16，高 22m 预留），左侧低矮木屋、右侧巷口，
// 远景天幕背景板位 + 苍白月亮；雪/春双皮肤（setSkin('snow'|'spring')，S05 沿用同锚点）。
// update(t) 为纯时间函数：雪粒/花瓣用 LCG 确定性种子，顺序渲染与 seek 一致。
import * as THREE from 'three';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';
import {continuousBackdrop} from 'dula-assets/lib/craft3d/continuous-backdrop.js';
import {planarUVWorld,canvasTex,backdropGradient,texLoader,inst,skinMesh,radialTex} from './hybrid.js';

const ramp=coolShadowRamp();
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});
// P4 灯光调度共享色（update 里每帧 lerp，避免逐帧分配）
const WARM_C=new THREE.Color(0xffd9a0),BLACK_C=new THREE.Color('#05070c'),PETAL_C=new THREE.Color('#f4c8d8');

function skyTex(stops){
  const c=document.createElement('canvas');c.width=2;c.height=256;
  const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);
  for(const [u,col] of stops)gr.addColorStop(u,col);
  g.fillStyle=gr;g.fillRect(0,0,2,256);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export class SnowTownScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='SnowTownScene';this.skin=null;}
  build(){
    const S=this.scene;
    this.skySnow=skyTex([[0,'#0b1526'],[.55,'#1c3350'],[1,'#3a5a7a']]);
    this.skySpring=skyTex([[0,'#2a4a6a'],[.5,'#e8a860'],[1,'#f8e0b0']]);
    S.background=this.skySnow;
    S.fog=new THREE.Fog('#16283e',40,140);

    // 午夜冷蓝主光（月光向）+ 窗内琥珀点光；春皮切换强度/色温
    const moonLight=new THREE.DirectionalLight(0xbfd4f0,1.1);
    moonLight.position.set(14,30,-40);S.add(moonLight);this.moonLight=moonLight;
    S.add(new THREE.HemisphereLight(0x3a5a80,0x1a2432,1.0));this.hemi=S.children[S.children.length-1];
    const amber=new THREE.PointLight(0xffb050,12,26);amber.position.set(-8,3,-8);S.add(amber);this.amber=amber;
    // 正面冷补光：逆光剪影下保住建筑/塔身立面可读性（纹理不白贴——冷色夜景 hemi 要 1.0+ 量级）
    const fill=new THREE.DirectionalLight(0xcfe0f4,.5);fill.position.set(4,6,20);S.add(fill);this.fill=fill;

    // 雪地面
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160).rotateX(-Math.PI/2),toon('#cdd8e4'));
    ground.name='ground';ground.position.y=0;S.add(ground);this.ground=ground;
    // 远景天幕背景板位（分层绘画位：现为深色剪影带，P3 换文生图背景板）
    const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(220,40),
      new THREE.MeshBasicMaterial({color:'#101f33'}));
    backdrop.name='backdrop';backdrop.position.set(0,18,-75);S.add(backdrop);this.backdropPlane=backdrop;
    // 远山剪影层
    this.hills=[];
    for(const [x,w,h,c] of [[-40,60,14,'#1a2f47'],[30,70,11,'#22374f']]){
      const hill=new THREE.Mesh(new THREE.ConeGeometry(w/2,h,5),new THREE.MeshBasicMaterial({color:c}));
      hill.scale.z=.25;hill.position.set(x,h/2,-72);S.add(hill);this.hills.push(hill);
    }
    // 苍白月亮（径向渐变盘面+羽化光晕壳；平涂圆盘会像贴纸）；dim(t) 由 update 驱动
    const moon=new THREE.Mesh(new THREE.CircleGeometry(5,40),
      new THREE.MeshBasicMaterial({map:radialTex([[0,'#f6fafd'],[.6,'#dfe8f2'],[.88,'#c2d2e6'],[1,'rgba(194,210,230,0)']]),transparent:true,opacity:.95}));
    moon.name='moon';moon.position.set(14,30,-70);S.add(moon);this.moon=moon;
    const halo=new THREE.Mesh(new THREE.CircleGeometry(7.5,40),
      new THREE.MeshBasicMaterial({map:radialTex([[0,'rgba(159,184,216,.55)'],[.55,'rgba(159,184,216,.16)'],[1,'rgba(159,184,216,0)']]),transparent:true,opacity:.4,depthWrite:false}));
    halo.position.copy(moon.position).add(new THREE.Vector3(0,0,-.5));S.add(halo);this.halo=halo;

    // 钟楼居中：基座 6×16×6 + 钟面（+z 向）+ 尖顶 + 顶台（m59 站位锚点）
    const tower=new THREE.Group();tower.name='clockTower';tower.position.set(0,0,-16);
    const base=new THREE.Mesh(new THREE.BoxGeometry(6,16,6),toon('#5a6474'));base.position.y=8;tower.add(base);
    const shaft=new THREE.Mesh(new THREE.BoxGeometry(4.6,5,4.6),toon('#525c6c'));shaft.position.y=18.5;tower.add(shaft);
    this.towerWalls=[base,shaft];
    const face=new THREE.Mesh(new THREE.CircleGeometry(1.7,32),
      new THREE.MeshToonMaterial({color:'#c8b890',gradientMap:ramp}));
    face.name='clockFace';face.position.set(0,18.5,2.32);tower.add(face);
    const hand1=new THREE.Mesh(new THREE.BoxGeometry(.12,1.3,.04),toon('#3a3428'));
    hand1.position.set(0,18.9,2.36);tower.add(hand1);
    const hand2=new THREE.Mesh(new THREE.BoxGeometry(.1,.9,.04),toon('#3a3428'));
    hand2.position.set(.3,18.5,2.36);hand2.rotation.z=-1.1;tower.add(hand2);
    this.clockHands=[hand1,hand2];
    const spire=new THREE.Mesh(new THREE.ConeGeometry(3.4,5,4),toon('#2c3850'));
    spire.position.y=23.5;spire.rotation.y=Math.PI/4;tower.add(spire);this.spire=spire;
    const deck=new THREE.Mesh(new THREE.BoxGeometry(5,.4,5),toon('#46505e'));deck.position.y=21.2;tower.add(deck);
    // 顶台外挑阳台（m59-m61 艾琳站位锚点）：尖顶基座盖住 deck 中央，站位必须在塔身外沿
    const balcony=new THREE.Mesh(new THREE.BoxGeometry(2.6,.24,1.8),toon('#4e5866'));
    balcony.name='topBalcony';balcony.position.set(0,21.1,3.6);tower.add(balcony);
    const rail=new THREE.Mesh(new THREE.BoxGeometry(2.6,.5,.08),toon('#424c5c'));
    rail.position.set(0,21.5,4.45);tower.add(rail);
    this.towerWood=[deck,balcony,rail];
    // 木门（m11/m12 锚点）
    const door=new THREE.Mesh(new THREE.BoxGeometry(1.6,2.6,.15),toon('#4a3626'));
    door.name='towerDoor';door.position.set(0,1.3,3.02);tower.add(door);this.towerDoor=door;
    const doorGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.4,2.4),
      new THREE.MeshBasicMaterial({color:'#ffbf70',transparent:true,opacity:0,depthWrite:false}));
    doorGlow.position.set(0,1.3,3.11);tower.add(doorGlow);this.doorGlow=doorGlow;
    S.add(tower);this.tower=tower;

    // 左侧低矮木屋（窗内琥珀）/ 右侧巷口（两屋夹出巷子）
    this.houseWalls=[];this.houseRoofs=[];
    const house=(x,z,w,h,d,rot=0)=>{
      const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;
      const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon('#6b5a48'));body.position.y=h/2;g.add(body);
      const roof=new THREE.Mesh(new THREE.ConeGeometry(w*.75,2.2,4),toon('#33455c'));
      roof.rotation.y=Math.PI/4;roof.position.y=h+1.1;g.add(roof);
      this.houseWalls.push({m:body,w,h,d});this.houseRoofs.push({m:roof,w});
      const win=new THREE.Mesh(new THREE.PlaneGeometry(.7,.8),
        new THREE.MeshBasicMaterial({color:'#ffb050'}));
      win.position.set(w*.2,h*.55,d/2+.01);g.add(win);
      this.windows.push(win);S.add(g);return g;
    };
    this.windows=[];
    house(-9,-11,4.5,4,4,.15);house(-14.5,-9,4,3.4,3.6,-.1);house(-19.5,-11.5,5,4.6,4.4,.2);
    house(8,-11,4.2,3.8,3.8,-.12);house(14.5,-9.5,4.6,4.2,4,.1); // 两屋之间 x≈11 为巷口

    // 雪堆点缀
    this.mounds=[];
    for(let i=0;i<10;i++){
      const sd=(i*2654435761)>>>0,r=(k)=>((sd*(k+3)+12345)>>>0)%1000/1000;
      const mound=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),toon('#dbe4ee'));
      mound.scale.set(1+r(1)*1.6,.35+r(2)*.3,.8+r(3));mound.position.set(-20+r(4)*40,0,-4-r(5)*16);
      S.add(mound);this.mounds.push(mound);
    }

    // 雪粒（小而疏）/ 花瓣（S05）：LCG 确定性位置，纯 t 函数
    const mkPoints=(n,col,size)=>{
      const g=new THREE.BufferGeometry(),pos=new Float32Array(n*3);
      for(let i=0;i<n;i++){let sd=i*1103515245+12345;const r=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
        pos[i*3]=-25+r()*50;pos[i*3+1]=r()*24;pos[i*3+2]=-30+r()*40;}
      g.setAttribute('position',new THREE.BufferAttribute(pos,3));
      const m=new THREE.Points(g,new THREE.PointsMaterial({color:col,size,transparent:true,opacity:.85}));
      m.userData.base=pos.slice(); // 基准位置：update 只从这里派生（纯 t 函数）
      m.visible=false; // FX 可见性初值=false，update 每帧驱动
      S.add(m);return m;
    };
    this.snow=mkPoints(600,'#e8f0fa',.09);
    this.petals=mkPoints(400,'#f4c8d8',.12);
    this.springT=Infinity;
    // 终幕黑场纱罩（P4 FINALE_DIM@456）：BackSide 全包球壳普通混合压黑一切受光/自辉景物；
    // renderOrder=-1 先画，灯焰/光晕与加色粒子（renderOrder 20）在其后叠加——"黑场仅铜灯亮"
    const veil=new THREE.Mesh(new THREE.SphereGeometry(95,32,16),
      new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:0,depthWrite:false,side:THREE.BackSide,fog:false}));
    veil.position.set(0,8,-16);veil.renderOrder=-1;veil.visible=false;
    S.add(veil);this.finaleVeil=veil;
  }
  // craft3d-hybrid（P3）：文生图纹理/背景板注入（assets3d/tex/），任一缺失则该部位保持程序化外观。
  // 几何/锚点/动画不动，只换皮肤；背景板=连续天幕投影（低仰角圆柱构图、高处连续过渡天顶色），
  // 月亮本体不进图——程序化月轮世界锚定 (14,30,-70)，m06 moon_close / m26 moon_dim 均看向该锚点。
  async applyHybrid(base='./assets3d/tex/'){
    const load=texLoader(base);
    const names=['snow','snow_normal','woodwall','woodwall_normal','roof_tile','roof_tile_normal',
      'woodplank','woodplank_normal','meadow','meadow_normal','backdrop_snow','backdrop_spring'];
    const T={};await Promise.all(names.map(async n=>T[n]=await load(n)));
    this.tex=T;this.hybridApplied=[];
    if(T.snow){
      // 地面+雪堆共享雪纹理与世界比例尺（近水平面统一顶视投影 UV，.12≈8m 一砖）
      skinMesh(this.ground,T.snow,{color:'#b4bcc8',normal:T.snow_normal,normalScale:.9,worldUV:.12});
      for(const m of this.mounds)skinMesh(m,T.snow,{color:'#b4bcc8',normal:T.snow_normal,normalScale:.9,worldUV:.12});
      this.hybridApplied.push('snow');
    }
    if(T.woodwall){
      for(const {m,w,h,d} of this.houseWalls)
        skinMesh(m,T.woodwall,{repeat:[Math.max(w,d)/3,h/3],color:'#a89a8a',normal:T.woodwall_normal,normalScale:.7});
      // 钟楼木构墙身（十九世纪童话木构钟楼）
      skinMesh(this.towerWalls[0],T.woodwall,{repeat:[2,5],color:'#aaa29a',normal:T.woodwall_normal,normalScale:.7});
      skinMesh(this.towerWalls[1],T.woodwall,{repeat:[1.5,1.6],color:'#aaa29a',normal:T.woodwall_normal,normalScale:.7});
      this.hybridApplied.push('woodwall');
    }
    if(T.roof_tile){
      for(const {m,w} of this.houseRoofs)
        skinMesh(m,T.roof_tile,{repeat:[w/1.6,1.4],color:'#8a94a4',normal:T.roof_tile_normal,normalScale:.7});
      skinMesh(this.spire,T.roof_tile,{repeat:[3,1.6],color:'#7e8898',normal:T.roof_tile_normal,normalScale:.7});
      this.hybridApplied.push('roof_tile');
    }
    if(T.woodplank){
      for(const m of this.towerWood)skinMesh(m,T.woodplank,{repeat:[1.6,.5],color:'#9a9084',normal:T.woodplank_normal,normalScale:.6});
      skinMesh(this.towerDoor,T.woodplank,{repeat:[1,1.6],color:'#9a8a78',normal:T.woodplank_normal,normalScale:.6});
      this.hybridApplied.push('woodplank');
    }
    if(T.backdrop_snow){
      this.backdropPlane.visible=false;for(const h of this.hills)h.visible=false;
      // offset 1.5：图像水平中心对准主视野 -z 方位（repeat 2 镜像双幅，背面幅不入镜）
      this.bdSnow=continuousBackdrop(T.backdrop_snow,{center:[0,8,-16],cylinderRadius:85,
        cylinderHeight:48,radius:160,repeat:2,offset:1.5,zenith:'#0b1526'});
      this.scene.add(this.bdSnow);
      if(T.backdrop_spring){
        // offset 1.14：图内左 28% 处的日轮落在 m58 sunrise_wide 主视野画面左三分；天顶取晨空淡蓝
        this.bdSpring=continuousBackdrop(T.backdrop_spring,{center:[0,8,-16],cylinderRadius:85,
          cylinderHeight:48,radius:160,repeat:2,offset:1.14,zenith:'#8aa8c8'});
        this.bdSpring.visible=false;this.scene.add(this.bdSpring);
      }
      // scene.background 用采样自背景板实际像素的竖直渐变兜底（纯色会露平板边界）
      this.bgSnow=backdropGradient(T.backdrop_snow.image);
      this.bgSpring=T.backdrop_spring?backdropGradient(T.backdrop_spring.image):this.skySpring;
      this.scene.background=this.skin==='spring'?this.bgSpring:this.bgSnow;
      // 月轮/光晕是世界锚定发光体，不吃雾
      this.moon.material.fog=false;this.halo.material.fog=false;
      this.hybridApplied.push('backdrop');
    }
    return this.hybridApplied;
  }
  setSkin(name){ // 雪/春双皮肤：S05 沿用 S01 同建筑同机位锚点（applyHybrid 先、时段皮肤后）
    if(this.skin===name)return;
    this.skin=name;
    const spring=name==='spring';
    const hybrid=(this.hybridApplied??[]).length>0;
    this.scene.background=spring?(this.bgSpring??this.skySpring):(this.bgSnow??this.skySnow);
    this.scene.fog.color.set(spring?'#d8b890':'#16283e');
    this.moonLight.color.set(spring?0xffd9a0:0xbfd4f0);
    this.moonLight.intensity=spring?1.6:1.1;
    this.hemi.intensity=spring?1.1:1.0;
    this.amber.intensity=spring?5:12;
    this.fill.color.set(spring?0xffe8c0:0xcfe0f4);this.fill.intensity=spring?.95:.5;
    this.moon.visible=!spring;this.halo.visible=!spring;
    if(hybrid){
      if(this.bdSnow)this.bdSnow.visible=!spring;
      if(this.bdSpring)this.bdSpring.visible=spring;
      // 雪→春=地面/雪堆换图（meadow），不调色压色——纹理件不二次压色纪律
      const T=this.tex,alb=spring?T.meadow:T.snow,nrm=spring?T.meadow_normal:T.snow_normal;
      if(alb){
        const gm=this.ground.material;
        gm.map=inst(alb,1,1);gm.normalMap=nrm?inst(nrm,1,1):null;gm.needsUpdate=true;
        for(const m of this.mounds){const mm=m.material;
          mm.map=inst(alb,1,1);mm.normalMap=nrm?inst(nrm,1,1):null;mm.needsUpdate=true;}
      }
    }else{
      this.ground.material.color.set(spring?'#7a9a5c':'#cdd8e4');
    }
  }
  update(t){
    // 雪/花瓣飘落：竖直下落取模回绕 + 水平微漂；从 build 时的基准位置数组计算，
    // 全为 t 纯函数（直接在 attribute 上累加会让 seek 与顺序渲染漂移——P1 冒烟实录）
    const spring=this.skin==='spring';
    // ── P4 灯光色彩调度（绝对秒，纯 t 函数；setSkin 只管皮肤切换，强度/色温这里全字段重写）──
    const warmK=Math.min(1,Math.max(0,(t-407)/15)); // 钟声三响→日出（m55-m58）渐暖过渡
    const lowK=Math.max(0,Math.min(1,(t-376)/2.5))*Math.max(0,Math.min(1,(398-t)/2.5)); // m50-52 低谷：单一冷光源+大片阴影
    const fin=t<456?1:Math.max(0,1-(t-456)/7);       // FINALE_DIM@456：7s 渐暗至黑场
    this.moonLight.color.set(spring?0xffd9a0:0xbfd4f0);
    if(!spring&&warmK>0)this.moonLight.color.lerp(WARM_C,warmK*.55);
    this.moonLight.intensity=(spring?1.6:1.1)*(1-.35*lowK)*fin;
    this.hemi.intensity=(spring?1.1:1.0)*(1-.68*lowK)*fin;
    this.amber.intensity=(spring?5:12)*(1-.8*lowK)*fin;
    this.fill.color.set(spring?0xffe8c0:0xcfe0f4);
    this.fill.intensity=(spring?.95:.5)*(1-.6*lowK)*fin;
    this.scene.fog.color.set(spring?'#d8b890':'#16283e');
    if(fin<1)this.scene.fog.color.lerp(BLACK_C,1-fin);
    this.finaleVeil.visible=fin<1;
    this.finaleVeil.material.opacity=(1-fin)*.97;
    // 窗灯：低谷压暗；BELL3@418 依次亮起（m57 窗户蒙太奇）；终幕随黑场熄
    const winBase=(spring?1:1-.55*lowK);
    this.windows.forEach((w,i)=>{
      const seq=t>418+i*.5?Math.min(1,(t-418-i*.5)/.8):0;
      const b=Math.max(winBase,seq)*Math.max(fin,.001);
      w.material.color.setRGB(1*b,.69*b,.31*b);
    });
    // m54 雪花→花瓣空中形态转化（SNOW_TO_PETAL@400，慢动作窗 400-407.5）
    const morph=Math.min(1,Math.max(0,(t-400)/6));
    const slowK=Math.max(0,Math.min(1,(t-400)/1.5))*Math.max(0,Math.min(1,(407.5-t)/1.5));
    this.snow.visible=!spring&&morph<1;
    this.petals.visible=spring||morph>0;
    this.snow.material.opacity=.85*(1-morph)*Math.max(fin,.001);
    this.petals.material.opacity=.95*(spring?1:morph)*Math.max(fin,.001);
    this.snow.material.color.set('#e8f0fa').lerp(PETAL_C,morph); // 空中转粉
    this.snow.material.size=.09+.03*morph;   // 慢动作窗内雪花放大可读
    this.petals.material.size=.12+.05*morph*(spring?0:1);
    const drift=(pts,fall,sway)=>{
      const p=pts.geometry.attributes.position,base=pts.userData.base;
      for(let i=0;i<p.count;i++){
        p.setY(i,24-((base[i*3+1]+t*fall)%24));
        p.setX(i,base[i*3]+Math.sin(t*.6+i)*sway*.4);
      }
      p.needsUpdate=true;
    };
    if(!spring){drift(this.snow,.9-.55*slowK,.5);if(morph>0)drift(this.petals,.55,1.2);}
    else drift(this.petals,.55,1.2);
    // 月亮光晕随剧情衰减（m06 MOON_DIM→m26 之后更暗；日出由春皮隐藏月亮）
    const dim=t<44?1:t<185?.82:.55;
    this.moon.material.opacity=.95*dim;this.halo.material.opacity=.4*dim;
    // 门缝暖光：m12（84–91s）开启后残留微光
    this.doorGlow.material.opacity=(t>85&&t<92?Math.min(.75,(t-85)*.5):0)*fin;
    // 钟声三响（m55–m57，407s 起）：指针启动轻转；未启动帧也必须显式写回零位——
    // 视觉态每帧全字段驱动，否则顺序渲染残留的末帧角度会泄漏进 seek 直渲（P1 实录）
    this.clockHands[0].rotation.z=t>407?-(t-407)*.4:0;
    this.clockHands[1].rotation.z=-1.1-(t>407?(t-407)*.1:0);
  }
}
