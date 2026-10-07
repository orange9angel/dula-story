// 《9章》S1E2 — 西岸废工地·黄昏（SceneBase 积木，参考 S1E1 style_master 构图：
// 左侧钢筋骨架烂尾楼+风动篷布、右侧塔吊剪影、散落混凝土管与沙堆、积水倒映夕阳、
// 远处无文字城市天际线、乌鸦归巢）。横屏 1280×720。
import * as THREE from 'three';
import {SceneBase} from 'dula-engine';

const toon=c=>new THREE.MeshToonMaterial({color:c});
const basic=c=>new THREE.MeshBasicMaterial({color:c});

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
    const sun=new THREE.DirectionalLight(0xffb45e,1.5);
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

    // ── 地面：湿泥地 + 车辙 ──
    box(this.scene,'ground',[0,-.08,-8],[46,.16,42],'#4a4038');
    for(let i=0;i<26;i++){
      const x=-18+((i*37)%36),z=-24+((i*53)%36);
      box(this.scene,'mud_patch',[x,.005,z],[.9+((i*29)%10)/10,.012,.8+((i*13)%10)/10],i%2?'#473d35':'#4e443a',{ry:i*.7});
    }
    // ── 积水倒映夕阳（亮橙渐变片）──
    const puddleTex=canvasTex(128,128,(c,w,h)=>{
      const g=c.createLinearGradient(0,0,0,h);
      g.addColorStop(0,'#f8b45e');g.addColorStop(.5,'#c96a45');g.addColorStop(1,'#4a3550');
      c.fillStyle=g;c.fillRect(0,0,w,h);
      c.fillStyle='rgba(255,220,160,.8)';c.fillRect(0,h*.42,w,h*.10);
    });
    this.puddles=[];
    for(const [x,z,r,sx] of [[-1.5,-3.2,1.5,1.6],[3.2,-5.5,1.1,1.2],[-5.5,-8,1.8,2.2],[.8,-9.5,1.3,1.7]]){
      const p=new THREE.Mesh(new THREE.CircleGeometry(r,28),
        new THREE.MeshBasicMaterial({map:puddleTex,transparent:true,opacity:.35}));
      p.rotation.x=-Math.PI/2;p.scale.x=sx;p.position.set(x,.012,z);this.scene.add(p);this.puddles.push(p);
    }

    // ── 天空 + 落日日轮 ──
    const sky=new THREE.Mesh(new THREE.PlaneGeometry(180,60),new THREE.MeshBasicMaterial({map:skyTexture()}));
    sky.position.set(0,16,-58);this.scene.add(sky);
    const sunDisc=new THREE.Mesh(new THREE.CircleGeometry(3.2,40),basic('#ffd98a'));
    sunDisc.position.set(-13,5.2,-56);this.scene.add(sunDisc);
    const sunGlow=new THREE.Mesh(new THREE.CircleGeometry(6.5,40),new THREE.MeshBasicMaterial({color:'#f5a54e',transparent:true,opacity:.4}));
    sunGlow.position.set(-13,5.2,-56.2);this.scene.add(sunGlow);

    // ── 城市天际线剪影（无文字）+ 零星暖窗 ──
    let seed=9;
    const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
    for(let i=0;i<22;i++){
      const x=-34+i*3.2+rnd(),h=3+rnd()*9;
      box(this.scene,'skyline',[x,h/2,-42],[2.2+rnd()*1.4,h,2],i%3?'#342c40':'#2a2436');
      if(rnd()<.5)for(let k=0;k<3;k++)box(this.scene,'skyline_lit',[x-.6+rnd()*1.2,1+rnd()*(h-2),-40.9],[.22,.3,.05],'#f5b45e',{basic:true});
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

    // ── 塔吊剪影（右后）──
    {
      const g=new THREE.Group();g.position.set(9.5,0,-19);this.scene.add(g);
      const dark='#241f2c';
      box(g,'crane_mast',[0,8.5,0],[.9,17,.9],dark);
      for(let f=0;f<8;f++)box(g,'mast_lattice',[0,1+f*2.1,0],[1.3,.12,1.3],dark,{rz:.78});
      box(g,'crane_jib',[3.8,16.4,0],[12,.55,.55],dark);
      box(g,'crane_counter',[-2.2,16.4,0],[3.4,.7,.7],dark);
      box(g,'crane_cab',[0,15.6,0],[1.1,1.2,1.1],dark);
      box(g,'crane_cable',[7.5,13.4,0],[.05,5.6,.05],dark);
      box(g,'crane_hook',[7.5,10.5,0],[.5,.6,.5],dark);
    }

    // ── 混凝土管（轰刚跳下的那根在右中）+ 沙堆 ──
    const pipeMat=toon('#8a857c');
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
    for(const [x,z,s] of [[-7.5,-9,1.6],[6.5,-9.5,1.9],[1.5,-12,1.3]]){
      const pile=new THREE.Mesh(new THREE.ConeGeometry(s,s*.55,20),toon('#9a8a72'));
      pile.position.set(x,s*.27,z);pile.castShadow=true;this.scene.add(pile);
    }
    // 散落钢筋条
    for(let i=0;i<8;i++)box(this.scene,'scrap',[-6+i*1.6,.04,-2-((i*7)%6)],[1.1,.05,.05],'#4a464e',{ry:i*.9});

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
    // 积水微光呼吸
    this.puddles.forEach((p,i)=>p.material.opacity=.78+.1*Math.sin(t*.9+i*2));
  }
}
