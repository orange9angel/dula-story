// 《9章》S1E2 — 西岸废工地·黄昏（SceneBase 积木，参考 S1E1 style_master 构图：
// 左侧钢筋骨架烂尾楼+风动篷布、右侧塔吊剪影、散落混凝土管与沙堆、积水倒映夕阳、
// 远处无文字城市天际线、乌鸦归巢）。横屏 1280×720。
import * as THREE from 'three';
import {SceneBase} from 'dula-engine';
import {continuousBackdrop} from './ContinuousBackdrop.js';

const toon=c=>new THREE.MeshToonMaterial({color:c});
const basic=c=>new THREE.MeshBasicMaterial({color:c});
// 世界空间顶视平面投影 UV：所有近水平表面共享同一比例尺（texel density 一致），
// 且免疫锥体/补丁自带 UV 的拉花问题
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
function skyTexture(){
  return canvasTex(128,512,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#5a3a5e');g.addColorStop(.35,'#8E4A6B');g.addColorStop(.62,'#E8863C');
    g.addColorStop(.82,'#f5a54e');g.addColorStop(1,'#f8c46a');
    c.fillStyle=g;c.fillRect(0,0,w,h);
  });
}

export class RuinsDuskScene extends SceneBase {
  build(){
    this.scene.background=new THREE.Color('#3a2c42');
    // 暮色照明：金橙逆光（低角度）+ 深蓝环境
    this.scene.add(new THREE.HemisphereLight(0x8e5a6b,0x2E3A52,1.05));
    const sun=new THREE.DirectionalLight(0xffb45e,1.7);
    sun.position.set(-14,5.5,-24);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-14,right:14,top:10,bottom:-6,far:60});sun.shadow.bias=-.0004;
    this.scene.add(sun);
    const fill=new THREE.DirectionalLight(0x5a7a9a,.5);fill.position.set(6,4,9);this.scene.add(fill);
    // 正面暖补光：逆光剪影下保住脸部可读性
    const faceFill=new THREE.DirectionalLight(0xffd9b0,.55);faceFill.position.set(2,3,12);this.scene.add(faceFill);

    const box=(parent,n,p,s,c,opts={})=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(...s),opts.basic?basic(c):toon(c));
      m.name=n;m.position.set(...p);m.castShadow=opts.shadow??false;m.receiveShadow=true;
      if(opts.ry)m.rotation.y=opts.ry;if(opts.rx)m.rotation.x=opts.rx;if(opts.rz)m.rotation.z=opts.rz;
      parent.add(m);return m;
    };

    // ── 地面：湿泥地 + 车辙（主区 box + 半径 65 远景圆盘，统一顶视投影 UV）──
    this.groundMesh=box(this.scene,'ground',[0,-.08,-8],[46,.16,42],'#4a4038');
    planarUVWorld(this.groundMesh,.13);
    this.mudMat=toon('#453e38');
    this.groundDisc=new THREE.Mesh(new THREE.CircleGeometry(78,48),this.groundMesh.material);
    this.groundDisc.rotation.x=-Math.PI/2;this.groundDisc.position.set(0,-.012,-8);
    this.groundDisc.receiveShadow=true;this.scene.add(this.groundDisc);
    planarUVWorld(this.groundDisc,.13);
    // 中景剪影环带（远处料场/矮废墟）：填地面尽头与天际线之间的过渡，破"天台沿"
    let seed2=31;const rnd2=()=>{seed2=(seed2*1103515245+12345)&0x7fffffff;return seed2/0x7fffffff;};
    // 压扁土丘（吃泥地纹理+光照响应，读成远处料堆/废墟，不再是悬浮色块）
    for(let i=0;i<30;i++){
      const a=i/30*Math.PI*2+rnd2()*.18,r=38+rnd2()*16;
      const m=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),this.mudMat);
      m.scale.set(1.5+rnd2()*3,.3+rnd2()*.5,1+rnd2()*2);
      m.position.set(Math.cos(a)*r,0,-8+Math.sin(a)*r);m.rotation.y=rnd2()*Math.PI;
      planarUVWorld(m,.13);
      this.scene.add(m);
    }
    this.mudPatches=[];
    for(let i=0;i<26;i++){
      const x=-18+((i*37)%36),z=-24+((i*53)%36);
      const mp=box(this.scene,'mud_patch',[x,.005,z],[.9+((i*29)%10)/10,.012,.8+((i*13)%10)/10],i%2?'#473d35':'#4e443a',{ry:i*.7});
      planarUVWorld(mp,.13);mp.material=this.mudMat;this.mudPatches.push(mp); // 同纹理同比例尺，压暗一号读色差
    }
    // ── 积水倒映夕阳（径向羽化边缘，暗镜面 + 一线落日反光）──
    const puddleTex=canvasTex(128,128,(c,w,h)=>{
      const g=c.createRadialGradient(64,64,6,64,64,63);
      g.addColorStop(0,'#c98a54');g.addColorStop(.45,'#8a5548');g.addColorStop(.78,'#453550');g.addColorStop(1,'rgba(58,44,66,0)');
      c.fillStyle=g;c.beginPath();c.arc(64,64,64,0,Math.PI*2);c.fill();
      c.fillStyle='rgba(255,214,150,.5)';c.fillRect(22,56,84,7);
    });
    this.puddles=[];
    for(const [x,z,r,sx] of [[-1.5,-3.2,1.5,1.6],[3.2,-5.5,1.1,1.2],[-5.5,-8,1.8,2.2],[.8,-9.5,1.3,1.7]]){
      const p=new THREE.Mesh(new THREE.CircleGeometry(r,28),
        new THREE.MeshBasicMaterial({map:puddleTex,transparent:true,opacity:.5,depthWrite:false}));
      p.rotation.x=-Math.PI/2;p.rotation.z=x*1.7;p.scale.x=sx;p.position.set(x,.012,z);this.scene.add(p);this.puddles.push(p);
    }

    // ── 天空 + 落日日轮 ──
    const sky=this.sky=new THREE.Mesh(new THREE.PlaneGeometry(200,64),new THREE.MeshBasicMaterial({map:skyTexture()}));
    sky.position.set(25,16,-58);this.scene.add(sky);
    const sunDisc=this.sunDisc=new THREE.Mesh(new THREE.CircleGeometry(3.2,40),basic('#ffd98a'));
    sunDisc.position.set(-13,5.2,-56);this.scene.add(sunDisc);
    const sunGlow=this.sunGlow=new THREE.Mesh(new THREE.CircleGeometry(6.5,40),new THREE.MeshBasicMaterial({color:'#f5a54e',transparent:true,opacity:.4}));
    sunGlow.position.set(-13,5.2,-56.2);this.scene.add(sunGlow);

    // ── 城市天际线剪影（无文字）+ 零星暖窗 ──
    let seed=9;
    const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
    this.skyline=[];
    for(let i=0;i<22;i++){
      const x=-34+i*3.2+rnd(),h=3+rnd()*9;
      this.skyline.push(box(this.scene,'skyline',[x,h/2,-42],[2.2+rnd()*1.4,h,2],i%3?'#342c40':'#2a2436'));
      if(rnd()<.5)for(let k=0;k<3;k++)this.skyline.push(box(this.scene,'skyline_lit',[x-.6+rnd()*1.2,1+rnd()*(h-2),-40.9],[.22,.3,.05],'#f5b45e',{basic:true}));
    }

    // ── 未完工建筑钢筋骨架（左）──
    {
      const g=new THREE.Group();g.position.set(-10,0,-13);g.rotation.y=.18;this.scene.add(g);
      const steel='#3d3a42';
      for(let f=0;f<4;f++)for(const [cx,cz] of [[-3,-2],[0,-2],[3,-2],[-3,2],[0,2],[3,2]]){
        box(g,'column',[cx,1.5+f*3,cz],[.22,3,.22],steel,{shadow:true});
        if(f<3)box(g,'beam',[cx,3.05+f*3,0],[.22,.22,4.4],steel);
      }
      for(let f=0;f<4;f++)box(g,'beam_x',[0,1.55+f*3,-2],[6.4,.2,.2],f%2?steel:'#4a464e');
      // 骨架顶部外露钢筋头
      for(const [cx,cz] of [[-3,-2],[0,-2],[3,-2],[-3,2],[3,2]])
        for(let k=0;k<3;k++)box(g,'rebar',[cx-.06+k*.06,12.4+((cx+k)%2)*.2,cz],[.025,.9,.025],'#2c2a30',{rz:(k-1)*.1});
      // 风动篷布（挂在二层，update(t) 波动）
      const geo=new THREE.PlaneGeometry(4.6,2.6,18,10);
      this.tarp=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color:'#7d8a8a',side:THREE.DoubleSide}));
      this.tarp.position.set(.5,7.6,2.05);g.add(this.tarp);
      this.tarpBase=geo.attributes.position.array.slice();
    }

    // ── 塔吊剪影（右后）：格构塔身 + 臂架伸进工地上空 + 斜拉索三角 ──
    {
      const g=new THREE.Group();g.position.set(10.5,0,-19);this.scene.add(g);
      const dark='#241f2c';
      for(const [sx,sz] of [[-.32,-.32],[.32,-.32],[-.32,.32],[.32,.32]])
        box(g,'mast_post',[sx,8,sz],[.14,16,.14],dark);
      for(let f=0;f<8;f++){
        box(g,'mast_tie',[0,1.6+f*2,0],[.9,.1,.9],dark);
        box(g,'mast_brace',[0,.8+f*2,-.34],[.08,2.2,.08],dark,{rz:.55});
        box(g,'mast_brace',[0,.8+f*2,.34],[.08,2.2,.08],dark,{rz:-.55});
      }
      box(g,'crane_jib',[-4.6,16.1,0],[9.2,.4,.4],dark);       // 臂架伸向工地（-x）
      box(g,'crane_counter',[2.4,16.1,0],[3.2,.6,.6],dark);   // 平衡臂 + 配重
      box(g,'crane_weight',[3.9,15.6,0],[.6,1.3,.7],dark);
      box(g,'crane_apex',[0,17.1,0],[.25,2.2,.25],dark);      // 塔尖
      // 斜拉索：塔尖 → 臂尖 / 平衡臂端
      box(g,'tie_front',[-4.6,17.2,0],[9.45,.05,.05],dark,{rz:.215});
      box(g,'tie_back',[1.85,17.25,0],[4.2,.05,.05],dark,{rz:-.47});
      box(g,'crane_cab',[-.85,15.3,0],[1.0,1.1,1.0],dark);
      box(g,'crane_cable',[-7.8,13.2,0],[.045,5.4,.045],dark);
      box(g,'crane_hook',[-7.8,10.3,0],[.45,.55,.45],dark);
      // 吊着的钢筋捆（剪影趣味点）
      box(g,'crane_load',[-7.8,9.8,0],[1.6,.35,.5],dark,{rz:.06});
    }

    // ── 混凝土管（轰刚跳下的那根在右中）+ 沙堆 ──
    const pipeMat=this.pipeMat=toon('#8a857c');
    const pipe=(x,z,ry,r=.62)=>{
      const g=new THREE.Group();g.position.set(x,r,z);g.rotation.y=ry;this.scene.add(g);
      const body=new THREE.Mesh(new THREE.CylinderGeometry(r,r,2.4,24),pipeMat);
      body.rotation.z=Math.PI/2;body.castShadow=true;g.add(body);
      const bore=new THREE.Mesh(new THREE.CircleGeometry(r*.72,24),basic('#2c2622'));
      bore.position.set(1.21,0,0);bore.rotation.y=Math.PI/2;g.add(bore);
      return g;
    };
    pipe(-4.5,-5,.4);pipe(-5.4,-5.6,.9);pipe(-4.8,-4.3,1.9);
    this.pipeJump=pipe(4.6,-5.2,-.5,.75); // 轰刚起跳点，顶 y≈1.5
    this.sandMat=toon('#9a8a72');
    for(const [x,z,s] of [[-7.5,-9,1.6],[6.5,-9.5,1.9],[1.5,-12,1.3]]){
      const pile=new THREE.Mesh(new THREE.ConeGeometry(s,s*.55,20),this.sandMat);
      pile.name='sandpile';pile.position.set(x,s*.27,z);pile.castShadow=true;this.scene.add(pile);
      planarUVWorld(pile,.5); // 顶视投影：锥面不再拉成放射条纹
    }
    // 散落钢筋条
    for(let i=0;i<8;i++)box(this.scene,'scrap',[-6+i*1.6,.04,-2-((i*7)%6)],[1.1,.05,.05],'#4a464e',{ry:i*.9});
    // 打斗区地面细节：发丝裂缝 + 碎石瓦砾
    for(let i=0;i<10;i++){
      const x=-4.5+((i*41)%90)/10,z=-.8-((i*23)%38)/10;
      box(this.scene,'ground_crack',[x,.006,z],[.025,.008,.4+((i*31)%10)/16],'#332b24',{ry:i*1.3});
    }
    for(let i=0;i<14;i++){
      const x=-6+((i*47)%120)/10,z=-.5-((i*19)%50)/10;
      const r=new THREE.Mesh(new THREE.TetrahedronGeometry(.05+((i*11)%5)*.02),toon('#5a5044'));
      r.position.set(x,.045,z);r.rotation.set(i,i*2.2,i*.7);r.castShadow=true;this.scene.add(r);
    }

    // ── 乌鸦（update 盘旋）──
    this.crows=[];
    for(let i=0;i<3;i++){
      const g=new THREE.Group();this.scene.add(g);
      const body=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),basic('#1a1620'));
      body.scale.set(1.6,.7,.8);g.add(body);
      const wl=new THREE.Mesh(new THREE.BoxGeometry(.5,.02,.14),basic('#1a1620'));wl.position.x=-.28;g.add(wl);
      const wr=wl.clone();wr.position.x=.28;g.add(wr);
      g.userData={r:6+i*2.5,h:9+i*1.6,ph:i*2.1,sp:.25+i*.06,wl,wr};
      this.crows.push(g);
    }
  }
  // craft3d-hybrid：加载文生图纹理/背景板（assets3d/tex/），任一缺失则该部位保持程序化外观
  async applyHybrid(base='./assets3d/tex/',{continuousSky=true}={}){
    const L=new THREE.TextureLoader();
    const load=n=>new Promise(res=>L.load(base+n+'.png',
      t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;res(t);},undefined,()=>res(null)));
    const T={};await Promise.all(['ground','concrete','steel','tarp','sand','backdrop','backdrop_nosun','ground_normal','concrete_normal','steel_normal','tarp_normal','sand_normal'].map(async n=>T[n]=await load(n)));
    this.hybridApplied=[];
    const tile=(t,rx,ry)=>{t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.repeat.set(rx,ry);return t;};
    if(T.ground){
      this.groundMesh.material.map=tile(T.ground,1,1); // 比例尺由 planarUVWorld 统一
      this.groundMesh.material.color.set('#9a9088');
      // 法线图（亮度派生）：泥地车辙吃夕阳低角度光——"贴皮"→"材质化"的分界
      if(T.ground_normal){const n=tile(T.ground_normal,1,1);
        this.groundMesh.material.normalMap=n;this.groundMesh.material.normalScale=new THREE.Vector2(.9,.9);
        this.mudMat.normalMap=n;this.mudMat.normalScale=new THREE.Vector2(.9,.9);}
      this.groundMesh.material.needsUpdate=true;
      this.mudMat.map=T.ground;this.mudMat.color.set('#7a726a');this.mudMat.needsUpdate=true;
      this.hybridApplied.push('ground');
    }
    if(T.concrete){
      this.pipeMat.map=tile(T.concrete,2,1);this.pipeMat.color.set('#8f877c');
      if(T.concrete_normal){this.pipeMat.normalMap=tile(T.concrete_normal,2,1);this.pipeMat.normalScale=new THREE.Vector2(.8,.8);}
      this.pipeMat.needsUpdate=true;
      this.hybridApplied.push('concrete');
    }
    if(T.steel){
      // 钢件在骨架 group 里，遍历整树
      this.scene.traverse(o=>{if(['column','beam','beam_x','rebar'].includes(o.name)&&o.material){
        o.material.map=T.steel;o.material.color.set('#b8b2ac');
        if(T.steel_normal){o.material.normalMap=tile(T.steel_normal,1,1);o.material.normalScale=new THREE.Vector2(.8,.8);}
        o.material.needsUpdate=true;}});
      this.hybridApplied.push('steel');
    }
    if(T.tarp){this.tarp.material.map=T.tarp;this.tarp.material.color.set('#b8bcb4');if(T.tarp_normal){this.tarp.material.normalMap=T.tarp_normal;this.tarp.material.normalScale=new THREE.Vector2(.6,.6);}this.tarp.material.needsUpdate=true;this.hybridApplied.push('tarp');}
    // 沙堆：顶视投影 UV（build 时已写入），贴图不再拉花
    if(T.sand){this.sandMat.map=tile(T.sand,1,1);this.sandMat.color.set('#b8ac98');if(T.sand_normal){this.sandMat.normalMap=tile(T.sand_normal,1,1);this.sandMat.normalScale=new THREE.Vector2(.7,.7);}this.sandMat.needsUpdate=true;this.hybridApplied.push('sand');}
    if(T.backdrop){
      // 圆柱内壁 360° 背景：无日轮版绕 4 圈（横向形变从 2.3x 降到 1.15x，太阳改程序化）
      const bt=T.backdrop_nosun??T.backdrop,rep=T.backdrop_nosun?4:2;
      bt.wrapS=THREE.MirroredRepeatWrapping;bt.repeat.x=rep;bt.offset.x=T.backdrop_nosun?0:.61;
      const cyl=new THREE.Mesh(new THREE.CylinderGeometry(70,70,36,64,1,true),
        new THREE.MeshBasicMaterial({map:bt,side:THREE.BackSide,fog:false}));
      cyl.position.set(0,6,-8);this.scene.add(cyl);
      // 闭合天穹：球壳 BackSide + 按世界仰角的竖直渐变（v=0.5 赤道=地平线，
      // 与背景板顶缘色衔接），任何仰角无接缝——不用靠摄像机规避头顶
      const domeTex=canvasTex(4,512,(c,w,h)=>{
        const g=c.createLinearGradient(0,0,0,h);
        g.addColorStop(0,'#4a3a66');g.addColorStop(.30,'#8a62a0');
        g.addColorStop(.395,'#b877a0');g.addColorStop(.45,'#e89a6a');
        g.addColorStop(.5,'#241f30');g.addColorStop(1,'#241f30');
        c.fillStyle=g;c.fillRect(0,0,w,h);
      });
      const dome=new THREE.Mesh(new THREE.SphereGeometry(95,48,24),
        new THREE.MeshBasicMaterial({map:domeTex,side:THREE.BackSide,fog:false}));
      dome.position.set(0,0,-8);this.scene.add(dome);
      if(continuousSky){
        cyl.visible=false;dome.visible=false;
        this.scene.add(continuousBackdrop(bt,{repeat:rep,offset:bt.offset.x}));
      }
      if(T.backdrop_nosun){ // 程序化日轮 + 光晕（世界锚定，-z 偏 -x 方位，楼群檐口之上）
        const sunTex=canvasTex(128,128,(c)=>{
          const g=c.createRadialGradient(64,64,4,64,64,64);
          g.addColorStop(0,'#fff8dc');g.addColorStop(.35,'#ffe9a8');g.addColorStop(.7,'#ffc46a');g.addColorStop(1,'rgba(255,170,80,0)');
          c.fillStyle=g;c.beginPath();c.arc(64,64,64,0,Math.PI*2);c.fill();
        });
        const sunD=new THREE.Mesh(new THREE.CircleGeometry(3.6,40),new THREE.MeshBasicMaterial({map:sunTex,transparent:true,fog:false,depthWrite:false}));
        sunD.position.set(-31.6,6.2,-65.9);sunD.lookAt(0,6.2,-8);this.scene.add(sunD);
        const glow=new THREE.Mesh(new THREE.CircleGeometry(10,40),new THREE.MeshBasicMaterial({map:sunTex,transparent:true,opacity:.5,fog:false,depthWrite:false}));
        glow.position.set(-31.9,6.2,-66.4);glow.lookAt(0,6.2,-8);this.scene.add(glow);
      }
      this.sky.visible=false;
      for(const m of this.skyline)m.visible=false;
      this.sunDisc.visible=false;this.sunGlow.visible=false;
      this.scene.fog=new THREE.Fog('#54404e',30,100);
      // 背景板边缘之外用同色系竖直渐变兜底（纯色背景会露出平板边界）
      this.scene.background=canvasTex(2,256,(c,w,h)=>{
        const g=c.createLinearGradient(0,0,0,h);
        g.addColorStop(0,'#9774b8');g.addColorStop(.25,'#c17da5');g.addColorStop(.5,'#f4a86c');
        g.addColorStop(.8,'#c9764e');g.addColorStop(1,'#241f30');
        c.fillStyle=g;c.fillRect(0,0,w,h);
      });
      this.hybridApplied.push('backdrop');
    }
    return this.hybridApplied;
  }
  update(t){
    // 篷布风动
    const p=this.tarp.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=this.tarpBase[i*3],y=this.tarpBase[i*3+1];
      const edge=(x/4.6+.5);
      p.setZ(i,Math.sin(x*2.2+t*3.1)*(.12+.3*edge)*Math.sin(t*1.3+x)+Math.cos(y*2.5+t*2.2)*.06*edge);
    }
    p.needsUpdate=true;this.tarp.geometry.computeVertexNormals();
    // 乌鸦归巢盘旋
    for(const c of this.crows){
      const u=c.userData,a=t*u.sp+u.ph;
      c.position.set(-6+Math.cos(a)*u.r*1.6,u.h+Math.sin(t*.8+u.ph)*.6,-26+Math.sin(a)*u.r);
      c.rotation.y=-a;
      const flap=Math.sin(t*9+u.ph)*.5;
      u.wl.rotation.z=flap;u.wr.rotation.z=-flap;
    }
    // 积水微光呼吸（羽化后保持低调，不抢戏）
    this.puddles.forEach((p,i)=>p.material.opacity=.5+.08*Math.sin(t*.9+i*2));
  }
}
