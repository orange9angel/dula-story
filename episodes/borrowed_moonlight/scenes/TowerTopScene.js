// 《借走月光的女孩》S03 钟楼顶/星阶（占位版）。
// 附录 B：屋顶平台为地面锚点（半径 7m 圆台）、天窗、透明星阶向月亮盘旋、云层≥3 层视差；
// 深蓝背光 + 银蓝阶缘 + 金粒点缀。云漂移、星阶凝形均为 t 纯函数。
import * as THREE from 'three';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';
import {continuousBackdrop} from 'dula-assets/lib/craft3d/continuous-backdrop.js';
import {texLoader,skinMesh,backdropGradient,radialTex,canvasTex} from './hybrid.js';

const ramp=coolShadowRamp();
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});

export class TowerTopScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='TowerTopScene';}
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#0a1224');
    S.fog=new THREE.Fog('#0a1224',30,120);

    // 深蓝背光（月亮方向）+ 微弱顶光
    const back=new THREE.DirectionalLight(0x7a9cd8,.9);back.position.set(6,26,-60);S.add(back);
    S.add(new THREE.HemisphereLight(0x2c4468,0x101820,.75));

    // 屋顶平台（钟楼塔身顶部截面）+ 矮护墙
    const deck=new THREE.Mesh(new THREE.CylinderGeometry(7,7.4,.8,24),toon('#4c5666'));
    deck.position.y=-.4;S.add(deck);this.deck=deck;
    this.crenels=[];
    for(let i=0;i<18;i++){
      const a=i/18*Math.PI*2;
      const crenel=new THREE.Mesh(new THREE.BoxGeometry(1.1,.8,.4),toon('#424c5c'));
      crenel.position.set(Math.cos(a)*6.9,.4,Math.sin(a)*6.9);crenel.rotation.y=-a;S.add(crenel);
      this.crenels.push(crenel);
    }
    // 天窗（向两侧开启的舱口，m25 锚点）：框 + 两块可开面板
    const skyFrame=new THREE.Group();skyFrame.name='skylight';skyFrame.position.set(0,0,-3);
    const frame=new THREE.Mesh(new THREE.BoxGeometry(2.4,.3,1.8),toon('#3a4452'));frame.position.y=.15;skyFrame.add(frame);
    this.skyWood=[frame];
    const hole=new THREE.Mesh(new THREE.PlaneGeometry(2,1.4).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({color:'#050a14'}));hole.position.y=.32;skyFrame.add(hole);
    this.hatchL=new THREE.Mesh(new THREE.BoxGeometry(1,.06,1.5),toon('#556078'));
    this.hatchL.geometry.translate(.5,0,0);this.hatchL.position.set(-1,.34,0);skyFrame.add(this.hatchL);
    this.hatchR=new THREE.Mesh(new THREE.BoxGeometry(1,.06,1.5),toon('#556078'));
    this.hatchR.geometry.translate(-.5,0,0);this.hatchR.position.set(1,.34,0);skyFrame.add(this.hatchR);
    S.add(skyFrame);this.skyWood.push(this.hatchL,this.hatchR);
    // 天窗泻下的月光薄雾柱（半透明，占位）
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.7,1.6,7,12,1,true),
      new THREE.MeshBasicMaterial({color:'#bcd4f0',transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false}));
    shaft.position.set(0,3.8,-3);S.add(shaft);

    // 星阶：透明台阶绕轴盘旋升向月亮（m32 STAIR_FORM≈235s 起逐级凝形）
    // P5：首级降到踏步高（y .32，m36 短靴真实踏上），级高 .9 等差——原 .6 起级高不可踏
    this.steps=[];
    const stepMat=new THREE.MeshToonMaterial({color:'#8ab8e8',gradientMap:ramp,transparent:true,opacity:.55});
    for(let i=0;i<22;i++){
      const a=.6+i*.42,r=5.5-i*.13,y=.32+i*.9;
      const s=new THREE.Mesh(new THREE.BoxGeometry(1.5,.12,.9),stepMat.clone());
      s.position.set(Math.cos(a)*r*.9+1.2,y,-2-Math.sin(a)*r*.9-i*.9);
      s.rotation.y=-a;s.visible=false; // FX 初值=false，update 驱动
      S.add(s);this.steps.push({s,i});
    }
    // 云层视差：三层半透明大平面，不同深度/速度（软边团块纹理，硬边矩形会穿帮）
    const cloudTex=canvasTex(256,128,(c)=>{
      for(const [cx,cy,r,a] of [[70,70,55,.9],[150,60,65,.8],[210,75,45,.7],[40,80,35,.6]]){
        const g=c.createRadialGradient(cx,cy,4,cx,cy,r);
        g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(1,'rgba(255,255,255,0)');
        c.fillStyle=g;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();
      }
    });
    this.clouds=[];
    for(const [y,z,w,h,op,speed] of [[5,-22,60,7,.16,.10],[9,-38,80,9,.13,.06],[13,-58,110,12,.11,.035]]){
      const c=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
        new THREE.MeshBasicMaterial({color:'#4a6a94',map:cloudTex,transparent:true,opacity:op,depthWrite:false}));
      c.position.set(0,y,z);S.add(c);this.clouds.push({c,speed});
    }
    // 月亮（比小镇视角更大更近；径向渐变盘面）+ 羽化光晕
    this.moon=new THREE.Mesh(new THREE.CircleGeometry(7,48),
      new THREE.MeshBasicMaterial({map:radialTex([[0,'#f6fafd'],[.6,'#dfe8f2'],[.88,'#c2d2e6'],[1,'rgba(194,210,230,0)']]),transparent:true,opacity:.9}));
    this.moon.position.set(6,26,-70);S.add(this.moon);
    const halo=new THREE.Mesh(new THREE.CircleGeometry(10.5,48),
      new THREE.MeshBasicMaterial({map:radialTex([[0,'rgba(143,176,216,.5)'],[.55,'rgba(143,176,216,.14)'],[1,'rgba(143,176,216,0)']]),transparent:true,opacity:.4,depthWrite:false}));
    halo.position.set(6,26,-70.5);S.add(halo);this.halo=halo;
    // 星点金粒（点缀，静态散布+缓浮）
    const n=220,g=new THREE.BufferGeometry(),pos=new Float32Array(n*3);
    for(let i=0;i<n;i++){let sd=i*1103515245+12345;const r=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
      pos[i*3]=-15+r()*30;pos[i*3+1]=r()*22;pos[i*3+2]=-40+r()*45;}
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    this.sparks=new THREE.Points(g,new THREE.PointsMaterial({color:'#ffd980',size:.07,transparent:true,opacity:.8}));
    this.sparks.userData.base=pos.slice(); // 基准位置：update 只从这里派生
    this.sparks.visible=false;S.add(this.sparks);
  }
  // craft3d-hybrid（P3）：露天夜景——屋顶木石贴图 + 雪夜天幕连续背景板（与 S01 同图同方位纪律：
  // 月亮本体程序化世界锚定 (6,26,-70)，m26 moon_dim 望远镜特写看向该锚点；云层视差件保留在筒内）。
  async applyHybrid(base='./assets3d/tex/'){
    const load=texLoader(base);
    const names=['roof_tile','roof_tile_normal','woodplank','woodplank_normal','backdrop_snow'];
    const T={};await Promise.all(names.map(async n=>T[n]=await load(n)));
    this.hybridApplied=[];
    if(T.roof_tile){
      // 台面：近水平面世界顶视投影（.3≈3.3m 一砖），侧沿矮墙自带 UV
      skinMesh(this.deck,T.roof_tile,{color:'#8490a0',normal:T.roof_tile_normal,normalScale:.8,worldUV:.3});
      for(const c of this.crenels)
        skinMesh(c,T.roof_tile,{repeat:[1.2,.9],color:'#788494',normal:T.roof_tile_normal,normalScale:.7});
      this.hybridApplied.push('roof_tile');
    }
    if(T.woodplank){
      for(const m of this.skyWood)
        skinMesh(m,T.woodplank,{repeat:[1.2,.8],color:'#8a8078',normal:T.woodplank_normal,normalScale:.6});
      this.hybridApplied.push('woodplank');
    }
    if(T.backdrop_snow){
      this.backdrop=continuousBackdrop(T.backdrop_snow,{center:[0,10,0],cylinderRadius:90,
        cylinderHeight:60,radius:170,repeat:2,offset:1.5,zenith:'#0a1224'});
      this.scene.add(this.backdrop);
      this.scene.background=backdropGradient(T.backdrop_snow.image);
      this.moon.material.fog=false;this.halo.material.fog=false; // 月轮世界锚定发光体不吃雾
      this.hybridApplied.push('backdrop');
    }
    return this.hybridApplied;
  }
  update(t){
    // 天窗开启：m25（184–192s）向两侧滑开
    const open=Math.min(1,Math.max(0,(t-184.5)/3));
    const e=open*open*(3-2*open);
    this.hatchL.rotation.z=e*1.35;this.hatchR.rotation.z=-e*1.35;
    // 星阶逐级凝形（m32≈235s 起，0.55s/级）
    for(const {s,i} of this.steps){
      const local=(t-235-i*.55)/1.2;
      s.visible=local>0;
      if(s.visible){const k=Math.min(1,local);s.material.opacity=.55*k;s.scale.setScalar(.6+.4*k);}
    }
    // 群星升起后金粒出现（m31≈227s）
    this.sparks.visible=t>=227;
    if(this.sparks.visible){
      const p=this.sparks.geometry.attributes.position,base=this.sparks.userData.base;
      for(let i=0;i<p.count;i++)p.setY(i,(base[i*3+1]+t*.18*(1+(i%3)))%22);
      p.needsUpdate=true;
    }
    // 云层视差漂移（纯 t）
    for(const {c,speed} of this.clouds)c.position.x=((t*speed)%40)-20;
    // 月亮衰减（m26 MOON_FADE≈186s 起更细更暗）
    const fade=t<186?1:Math.max(.45,1-(t-186)*.008);
    this.moon.material.opacity=.9*fade;this.halo.material.opacity=.4*fade;
    this.moon.scale.setScalar(1-(1-fade)*.25);
  }
}
