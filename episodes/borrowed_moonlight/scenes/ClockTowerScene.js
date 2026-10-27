// 《借走月光的女孩》S02 钟楼工坊（占位版）。
// 附录 B：高挑圆形空间（半径 12m 高 18m 预留）、前景木桌、中景悬浮星瓶阵、背景巨齿轮；
// 暖琥珀 × 深青对比。齿轮转速、星瓶浮动均为 t 纯函数（seek 一致）。
import * as THREE from 'three';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';
import {texLoader,skinMesh} from './hybrid.js';

const ramp=coolShadowRamp();
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});

export class ClockTowerScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='ClockTowerScene';}
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#0e1a1e');
    S.fog=new THREE.Fog('#0e1a1e',18,60);

    // 暖琥珀主光（工作台上方）+ 深青环境 + 齿轮区冷补光 + 顶部冷光（高挑空间顶盖纹理吃光）
    const warm=new THREE.PointLight(0xffc080,24,30);warm.position.set(0,5,-3);S.add(warm);this.warm=warm;
    S.add(new THREE.HemisphereLight(0x2a4a52,0x141a18,1.05));
    const cool=new THREE.DirectionalLight(0x6a9ab0,.6);cool.position.set(-5,10,8);S.add(cool);
    const topGlow=new THREE.PointLight(0x6a9ab0,120,30);topGlow.position.set(0,17,-2);S.add(topGlow);

    // 圆形高挑内壁（BackSide 深青筒）+ 木地板
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(12,12,18,36,1,true),
      new THREE.MeshToonMaterial({color:'#22363c',gradientMap:ramp,side:THREE.BackSide}));
    wall.position.y=9;S.add(wall);this.wall=wall;
    const floor=new THREE.Mesh(new THREE.CircleGeometry(12,36).rotateX(-Math.PI/2),toon('#4a3a2c'));
    floor.name='floor';S.add(floor);this.floor=floor;
    // 顶部收拢的暗锥（高挑感；有顶内景：P3 顶盖做成带纹理几何）
    const roof=new THREE.Mesh(new THREE.ConeGeometry(12,5,36,1,true),
      new THREE.MeshToonMaterial({color:'#16242a',gradientMap:ramp,side:THREE.BackSide}));
    roof.position.y=20.5;S.add(roof);this.roof=roof;

    // 前景木桌（工作台）：奥尔德修星位
    const bench=new THREE.Group();bench.name='workbench';bench.position.set(0,0,-3);
    const top=new THREE.Mesh(new THREE.BoxGeometry(3,.14,1.3),toon('#6b4e30'));top.position.y=.95;bench.add(top);
    this.benchWood=[top];
    for(const [x,z] of [[-1.35,-.55],[1.35,-.55],[-1.35,.55],[1.35,.55]]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.14,.95,.14),toon('#543e26'));
      leg.position.set(x,.48,z);bench.add(leg);this.benchWood.push(leg);
    }
    const anvil=new THREE.Mesh(new THREE.BoxGeometry(.5,.22,.3),toon('#3c3c44'));
    anvil.position.set(-.6,1.13,0);bench.add(anvil);this.anvil=anvil;
    S.add(bench);this.bench=bench;

    // 中景悬浮星瓶阵：玻璃瓶（半透明）+ 内藏星核（发光小球）；苏醒度由 update 驱动
    this.bottles=[];
    const glassMat=new THREE.MeshToonMaterial({color:'#9ab8c8',gradientMap:ramp,transparent:true,opacity:.35});
    for(let i=0;i<28;i++){
      const g=new THREE.Group();
      const a=i/28*Math.PI*2,r=4.5+(i%3)*1.3,y=2.4+(i%5)*.9;
      g.position.set(Math.cos(a)*r,y,Math.sin(a)*r-2);
      const body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,.5,10),glassMat);g.add(body);
      const neck=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,.18,8),glassMat);neck.position.y=.33;g.add(neck);
      const star=new THREE.Mesh(new THREE.SphereGeometry(.085,10,8),
        new THREE.MeshBasicMaterial({color:'#ffd980'}));
      star.name='starCore';g.add(star);
      S.add(g);this.bottles.push({g,star,phase:i*.7,baseY:y});
    }

    // 背景巨齿轮（黄铜旧化）：一大两小，update 缓缓转动
    this.gears=[];this.gearParts=[];
    const gear=(x,y,z,r,teeth,dir)=>{
      const g=new THREE.Group();g.position.set(x,y,z);
      const disc=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.35,24).rotateX(Math.PI/2),toon('#8a6a34'));g.add(disc);
      const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.25,r*.25,.5,12).rotateX(Math.PI/2),toon('#6b5028'));g.add(hub);
      this.gearParts.push(disc,hub);
      for(let i=0;i<teeth;i++){
        const t=new THREE.Mesh(new THREE.BoxGeometry(.3,.5,.34),toon('#7a5c2c'));
        const a=i/teeth*Math.PI*2;
        t.position.set(Math.cos(a)*(r+.2),Math.sin(a)*(r+.2),0);t.rotation.z=a;g.add(t);
        this.gearParts.push(t);
      }
      S.add(g);this.gears.push({g,dir,r});return g;
    };
    gear(-3,6.5,-10.6,3.4,14,.12);
    gear(3.8,4.2,-10.8,2.2,10,-.18);
    gear(-7.6,3.2,-10.4,1.5,8,-.24);
  }
  // craft3d-hybrid（P3）：有顶内景纹理注入——地板/墙/拱顶/木桌/齿轮全部贴图，缺失部位保持程序化。
  // 顶盖（roof 锥筒 BackSide）本身就是带纹理几何；灯光沿用窗洞/顶光方向（工作台暖琥珀点光+深青环境）。
  async applyHybrid(base='./assets3d/tex/'){
    const load=texLoader(base);
    const names=['woodplank','woodplank_normal','woodwall','woodwall_normal','brass','brass_normal'];
    const T={};await Promise.all(names.map(async n=>T[n]=await load(n)));
    this.hybridApplied=[];
    if(T.woodplank){
      // 地板：近水平面世界顶视投影（.35≈2.9m 一砖）
      skinMesh(this.floor,T.woodplank,{color:'#a89880',normal:T.woodplank_normal,normalScale:.7,worldUV:.35});
      skinMesh(this.benchWood[0],T.woodplank,{repeat:[1.5,.7],color:'#a08868',normal:T.woodplank_normal,normalScale:.6});
      for(const leg of this.benchWood.slice(1))
        skinMesh(leg,T.woodplank,{repeat:[.5,1.2],color:'#94806a',normal:T.woodplank_normal,normalScale:.6});
      this.hybridApplied.push('woodplank');
    }
    if(T.woodwall){
      // 圆筒内壁：自带 UV 按周长/层高定 repeat（周长 75m/≈3m 一砖）
      skinMesh(this.wall,T.woodwall,{repeat:[24,6],color:'#7e8e94',normal:T.woodwall_normal,normalRepeat:[24,6],normalScale:.6});
      // 顶盖锥筒（BackSide）：斜面 UV u 绕周、v 沿坡
      skinMesh(this.roof,T.woodwall,{repeat:[24,3],color:'#7e8c92',normal:T.woodwall_normal,normalRepeat:[24,3],normalScale:.6});
      this.hybridApplied.push('woodwall');
    }
    if(T.brass){
      // 巨齿轮黄铜旧化（法线强度档 2.2：铜绿斑驳吃琥珀光）
      for(const m of this.gearParts)
        skinMesh(m,T.brass,{repeat:[1,1],color:'#b0a088',normal:T.brass_normal,normalScale:.9});
      skinMesh(this.anvil,T.brass,{repeat:[1,1],color:'#8a8884',normal:T.brass_normal,normalScale:.7});
      this.hybridApplied.push('brass');
    }
    return this.hybridApplied;
  }
  update(t){
    // 齿轮转动；GEARS_STOP@179 起逐一制动停转（指数趋停，纯 t 函数）
    for(const [gi,{g,dir}] of this.gears.entries()){
      const s=179+gi*.7,over=Math.max(0,t-s);
      g.rotation.z=(t-over+(1-Math.exp(-over*2.5))/2.5)*dir;
    }
    // 星醒（m21 STAR_WAKE≈156s / m24 RESONANCE≈178s）：星核由奄奄一息逐瓶点亮
    const wake=t<156?0:Math.min(1,(t-156)/22);
    this.warm.intensity=24+14*wake; // 苏醒暖光反哺工坊（与瓶光同包络）
    for(const {g,star,phase,baseY} of this.bottles){
      const lit=Math.min(1,Math.max(0,wake*1.6-phase*.12));
      star.material.color.setRGB(.35+.65*lit,.28+.57*lit,.12+.38*lit);
      g.position.y=baseY+Math.sin(t*.5+phase)*.08*(0.3+lit); // 苏醒后浮动加剧
      g.rotation.y=t*.05+phase;
    }
  }
}
