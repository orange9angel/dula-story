// 《9章》S1E3《天台便当》— 教学楼顶·正午。与 S1E2 黄昏逆光相反的光照方案：
// 高角度白光主光（投影压淡）+ 天蓝半球光 + 淡蓝地面反弹，赛璐璐友好的均匀照明。
// 全场景 MeshToonMaterial 共享 4 阶冷阴影 ramp（craft3d/look.js coolShadowRamp）。
// 元素：水泥地面（程序纹理）、铁丝网围栏（透明贴图，不堆面数）、楼梯间小屋（门朝镜头）、
// 水塔、远处校舍剪影、正午蓝天 + 少量程序化积云。横屏 1280×720。
import * as THREE from 'three';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';

const ramp=coolShadowRamp();
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});
const basic=c=>new THREE.MeshBasicMaterial({color:c});
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};

// 世界空间顶视平面投影 UV：近水平表面共享同一比例尺（S1E2 同款纪律）
function planarUVWorld(m,s){
  const g=m.geometry,p=g.attributes.position,uv=g.attributes.uv;
  const cos=Math.cos(m.rotation.y),sin=Math.sin(m.rotation.y);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i);
    uv.setXY(i,(x*cos+z*sin+m.position.x)*s,(-x*sin+z*cos+m.position.z)*s);
  }
  uv.needsUpdate=true;
}
function canvasTex(w,h,draw){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  draw(canvas.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
// 水泥地程序纹理：均匀散射、无方向性阴影（光影归灯光）、镜像平铺免接缝
function concreteTex(){
  const t=canvasTex(256,256,(c,w,h)=>{
    c.fillStyle='#b8b4ac';c.fillRect(0,0,w,h);
    let sd=5;const r=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
    for(let i=0;i<2600;i++){
      const v=r();c.fillStyle=v>.5?`rgba(255,255,255,${.04+r()*.07})`:`rgba(44,42,38,${.04+r()*.08})`;
      c.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);
    }
    c.strokeStyle='rgba(72,68,62,.30)';c.lineWidth=1.4;
    for(let i=0;i<5;i++){c.beginPath();let x=r()*w,y=r()*h;c.moveTo(x,y);
      for(let k=0;k<5;k++){x+=r()*40-20;y+=r()*40-20;c.lineTo(x,y);}c.stroke();}
    c.strokeStyle='rgba(62,58,52,.45)';c.lineWidth=2; // 伸缩缝（周期整除，镜像无缝）
    c.beginPath();c.moveTo(0,1);c.lineTo(w,1);c.moveTo(1,0);c.lineTo(1,h);c.stroke();
  });
  t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;return t;
}
// 铁丝网：菱格双线族，周期整除 128 保证镜像无缝；alphaTest 硬边免排序问题
function fenceTex(){
  const t=canvasTex(128,128,(c,w,h)=>{
    c.clearRect(0,0,w,h);c.strokeStyle='rgba(95,104,116,.95)';c.lineWidth=3.2; // 加粗降摩尔纹
    for(let i=-2;i<=2;i++){
      c.beginPath();c.moveTo(i*64-64,0);c.lineTo(i*64+64,128);c.stroke();
      c.beginPath();c.moveTo(i*64-64,128);c.lineTo(i*64+64,0);c.stroke();
    }
  });
  t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;return t;
}

export class RooftopNoonScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='RooftopNoonScene';}
  build(){
    const S=this.scene;
    // 正午蓝天（background 用竖直渐变兜底，天空主体是闭合球壳）
    S.background=canvasTex(2,256,(c,w,h)=>{
      const g=c.createLinearGradient(0,0,0,h);
      g.addColorStop(0,'#3d7bd0');g.addColorStop(.6,'#9cc8ee');g.addColorStop(1,'#d8ecf8');
      c.fillStyle=g;c.fillRect(0,0,w,h);
    });
    S.fog=new THREE.Fog('#d3e6f4',45,170);

    // ── 正午照明：顶光主光 + 半球光 + 正面淡补光 ──
    const sun=new THREE.DirectionalLight(0xfff6e6,2.0);
    sun.position.set(7,20,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    sun.shadow.intensity=.5; // 阴影压淡：软阴影只留给地面投影，自阴影交给 ramp 阶梯
    Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:2,far:60});
    sun.shadow.bias=-.0004;S.add(sun);
    S.add(new THREE.HemisphereLight(0x9ec8f5,0xb9c9de,.85)); // 天蓝 / 淡蓝地面反弹
    const faceFill=new THREE.DirectionalLight(0xeaf4ff,.35);faceFill.position.set(-4,6,14);S.add(faceFill);

    const box=(parent,n,p,s,c,opts={})=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(...s),opts.mat??toon(c));
      m.name=n;m.position.set(...p);m.castShadow=opts.shadow??false;m.receiveShadow=true;
      if(opts.ry)m.rotation.y=opts.ry;parent.add(m);return m;
    };

    // ── 水泥地面（屋面板 + 地面纹理，顶视投影 UV）──
    const concrete=concreteTex();
    const groundMat=new THREE.MeshToonMaterial({color:'#a39e96',gradientMap:ramp,map:concrete});
    this.groundMesh=box(S,'ground',[0,-.15,-1.9],[29.6,.3,19.4],null,{mat:groundMat});
    planarUVWorld(this.groundMesh,.25);
    // 远景地面霾（城市低处兜底，别露虚空）
    const haze=new THREE.Mesh(new THREE.CircleGeometry(160,48),basic('#c8dcee'));
    haze.rotation.x=-Math.PI/2;haze.position.y=-32;S.add(haze);

    // ── 女儿墙（矮沿）：北墙是两人的坐位，外缘立铁丝网 ──
    const parapetMat=new THREE.MeshToonMaterial({color:'#aaa69d',gradientMap:ramp,map:concrete});
    const capMat=toon('#c6c2b9');
    this.parapetN=box(S,'parapet_n',[0,.26,-11.25],[29.6,.52,.30],null,{mat:parapetMat,shadow:true});
    box(S,'parapet_n_cap',[0,.545,-11.25],[29.6,.05,.36],null,{mat:capMat});
    box(S,'parapet_w',[-14.65,.26,-1.9],[.3,.52,19.0],null,{mat:parapetMat});
    box(S,'parapet_e',[14.65,.26,-1.9],[.3,.52,19.0],null,{mat:parapetMat});
    box(S,'parapet_s',[0,.26,7.65],[29.6,.52,.3],null,{mat:parapetMat});

    // ── 铁丝网围栏：立柱 + 顶杆 + 透明贴图网面（北墙满铺，西墙一段）──
    const fence=fenceTex();fence.repeat.set(140,8); // 网格间距放大，近景摩尔纹减弱
    const fenceMat=new THREE.MeshBasicMaterial({map:fence,alphaTest:.45,side:THREE.DoubleSide,color:'#8b96a2'});
    const postMat=toon('#5f6874');
    const net=this.net=new THREE.Mesh(new THREE.PlaneGeometry(29.3,1.62),fenceMat);
    net.position.set(0,1.35,-11.37);S.add(net);
    const netW=new THREE.Mesh(new THREE.PlaneGeometry(18.6,1.62),fenceMat);
    netW.position.set(-14.62,1.35,-2.0);netW.rotation.y=Math.PI/2;S.add(netW);
    for(let i=0;i<=12;i++){
      const p=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.68,8),postMat);
      p.position.set(-14.3+i*2.44,1.36,-11.37);p.castShadow=true;S.add(p);
    }
    const rail=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,29.3,8),postMat);
    rail.rotation.z=Math.PI/2;rail.position.set(0,2.19,-11.37);S.add(rail);
    // 围栏角旗（风微动的读点，update 摆动）
    {
      const geo=new THREE.PlaneGeometry(.5,.3,6,2);geo.translate(.25,0,0);
      this.flag=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:'#d9644a',gradientMap:ramp,side:THREE.DoubleSide}));
      this.flag.position.set(3.2,2.1,-11.37);S.add(this.flag);
      this.flagBase=geo.attributes.position.array.slice();
    }

    // ── 楼梯间小屋（门朝镜头 +z；门板 update 里按时间开合）──
    {
      const hut=new THREE.Group();hut.position.set(-6.5,0,-9.3);S.add(hut);this.hut=hut;
      box(hut,'hut_body',[0,1.35,0],[2.6,2.7,2.6],'#b0aca2',{shadow:true}).material=parapetMat;
      box(hut,'hut_roof',[0,2.76,0],[3.0,.14,3.0],null,{mat:capMat,shadow:true});
      box(hut,'hut_step',[0,.04,1.55],[1.6,.08,.7],null,{mat:capMat});
      // 门框 + 铰链门（门板绕左缘开合）
      box(hut,'door_frame_t',[0,2.06,1.31],[1.15,.1,.1],'#6a6258');
      box(hut,'door_frame_l',[-.55,1.03,1.31],[.1,2.16,.1],'#6a6258');
      box(hut,'door_frame_r',[.55,1.03,1.31],[.1,2.16,.1],'#6a6258');
      const hinge=this.doorHinge=new THREE.Group();hinge.position.set(-.475,1.02,1.34);hut.add(hinge);
      const door=box(hinge,'door',[.475,0,0],[.95,2.0,.05],'#7a6a52',{shadow:true});
      box(door,'door_knob',[.38,.02,.05],[.05,.05,.05],'#3c3830');
      // 屋顶天线
      box(hut,'antenna',[.8,3.5,-.6],[.04,1.4,.04],'#5f6874');
      box(hut,'antenna_bar',[.8,3.85,-.6],[.5,.03,.03],'#5f6874');
      box(hut,'antenna_bar2',[.8,3.6,-.6],[.34,.03,.03],'#5f6874');
    }

    // ── 水塔（圆罐 + 四腿 + 拉杆）──
    {
      const g=new THREE.Group();g.position.set(6.0,0,-9.8);S.add(g);
      const steel=toon('#6e7884');
      for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
        const leg=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,4.3,8),steel);
        leg.position.set(sx*.72,2.05,sz*.72);leg.rotation.z=sx*.09;leg.rotation.x=-sz*.09;
        leg.castShadow=true;g.add(leg);
      }
      for(const y of [1.1,2.2]){
        const b1=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,2.1,6),steel);
        b1.rotation.z=Math.PI/2;b1.position.set(0,y,-.76);g.add(b1);
        const b2=b1.clone();b2.position.z=.76;g.add(b2);
        const b3=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,2.1,6),steel);
        b3.rotation.x=Math.PI/2;b3.position.set(-.76,y,0);g.add(b3);
        const b4=b3.clone();b4.position.x=.76;g.add(b4);
      }
      const tank=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,1.7,20),toon('#7d8894'));
      tank.position.y=4.95;tank.castShadow=true;g.add(tank);
      const cap=new THREE.Mesh(new THREE.ConeGeometry(1.28,.55,20),toon('#5f6874'));
      cap.position.y=6.1;g.add(cap);
      const belly=new THREE.Mesh(new THREE.CylinderGeometry(1.18,1.05,.5,20),toon('#6a7480'));
      belly.position.y=4.0;g.add(belly);
    }

    // ── 通风管与屋面点缀 ──
    for(const [x,z] of [[2.6,-6.5],[-10.5,-3.5],[5.5,-2.5]]){
      const v=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.6,10),toon('#9a968e'));
      v.position.set(x,.3,z);v.castShadow=true;S.add(v);
      const cowl=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8,0,Math.PI*2,0,Math.PI/2),toon('#8a867e'));
      cowl.position.set(x,.66,z);S.add(cowl);
    }

    // ── 远处校舍剪影 + 中景楼群（压低推远、色随雾走，避免读成贴背板的巨墙）──
    box(S,'school_main',[-20,-4,-68],[50,16,8],'#aec2da');
    box(S,'school_gym',[26,-6,-58],[26,10,8],'#b4c8de');
    box(S,'school_side',[-46,-6,-32],[14,10,20],'#b9cade');
    let seed=17;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
    for(let i=0;i<11;i++){
      const a=-.4+i*.32+rnd()*.1,r=30+rnd()*16,h=3+rnd()*6;
      box(S,'mid_roof',[Math.cos(a)*r,-h/2-6,-12-Math.sin(a)*r],[3+rnd()*5,h,3+rnd()*4],i%2?'#a7bccf':'#bccadb');
    }

    // ── 天空闭合球壳（正午蓝渐变，任何仰角不露底）──
    const domeTex=canvasTex(4,512,(c,w,h)=>{
      const g=c.createLinearGradient(0,0,0,h);
      g.addColorStop(0,'#d8ecf8');g.addColorStop(.38,'#b8dbf2'); // 地平线（v=0 向下）
      g.addColorStop(.52,'#8ec2ec');g.addColorStop(.75,'#5b9ade');g.addColorStop(1,'#3d7bd0');
      c.fillStyle=g;c.fillRect(0,0,w,h);
    });
    const dome=new THREE.Mesh(new THREE.SphereGeometry(120,48,24),
      new THREE.MeshBasicMaterial({map:domeTex,side:THREE.BackSide,fog:false}));
    S.add(dome);

    // ── 程序化积云（压扁球簇，toon 阶梯自带卡通体积感；update 缓移）──
    const cloudMat=new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:ramp,fog:false});
    this.clouds=[];
    for(let i=0;i<6;i++){
      const g=new THREE.Group();
      const n=3+(i%2);
      for(let k=0;k<n;k++){
        const m=new THREE.Mesh(new THREE.SphereGeometry(1,12,9),cloudMat);
        m.scale.set(2.2+k*.9,.62+k*.12,1.1);
        m.position.set(k*2.0-(n-1),.12*Math.sin(k*2),.3*Math.cos(k));
        g.add(m);
      }
      g.position.set(-55+i*19+rnd()*6,17+rnd()*8,-34-rnd()*34);
      g.userData={baseX:g.position.x,spd:.25+rnd()*.2};
      S.add(g);this.clouds.push(g);
    }
  }
  // 楼梯间门开合（纯时间函数）：雷晓 6.9–7.5 开门、9.2–10.4 带上；
  // 轰刚 13.92 哐当撞开（带回弹）、15.8–17.2 弹回。
  doorA(t){
    const seg=(a,b)=>ease(clamp((t-a)/(b-a)));
    let a=seg(6.9,7.5)*(1-seg(9.2,10.4))+seg(13.92,14.18)*(1-seg(15.8,17.2));
    let ang=-1.75*Math.min(1,a);
    if(t>14.18&&t<15.4)ang-=.10*Math.sin((t-14.18)*22)*Math.exp(-(t-14.18)*5); // 撞门回弹
    return ang;
  }
  update(t){
    if(this.doorHinge)this.doorHinge.rotation.y=this.doorA(t);
    for(const c of this.clouds){
      const d=c.userData;c.position.x=d.baseX+((t*d.spd)%30); // 30 米缓程，远距+雾看不出回绕
    }
    // 角旗风动
    const p=this.flag.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=this.flagBase[i*3],w=x/.5;
      p.setZ(i,Math.sin(x*9-t*6.2)*.06*w+Math.sin(t*2.1+x*3)*.03*w);
      p.setY(i,this.flagBase[i*3+1]+Math.sin(x*7-t*5.1)*.02*w);
    }
    p.needsUpdate=true;this.flag.geometry.computeVertexNormals();
  }
}
