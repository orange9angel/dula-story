// 维修仓库（T1 占位）：x∈[-5,5] z∈[-8,2]。密集抽屉墙（-z）、工作台（右侧 x3.5 台面 y0.85）、
// 焊台（左中 x-2 台面 y0.8，s24 焊接火星窗 367±1.2s 橙色火花粒子）、大电池位（地面 x-1 z-5）。
// 支撑面锚点：drawer1 / workbenchTop / weldTop / floor。
import * as THREE from 'three';
import {toon,flat,box,cyl,lcg,clamp,ease} from './common.js';

export class WarehouseScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='WarehouseScene';}
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#131a24');
    S.add(new THREE.HemisphereLight(0x46586c,0x161e28,1.0));
    const key=new THREE.DirectionalLight(0xcfe0f0,.4);key.position.set(3,5,6);S.add(key);
    const bench=new THREE.PointLight(0xffd9a0,5,8);bench.position.set(3.5,2,-3);S.add(bench);
    const drawersLight=new THREE.PointLight(0xbfd4e8,4,8);drawersLight.position.set(0,1.6,-6);S.add(drawersLight);

    S.add(box(10.4,.2,10.4,'#3c4450',0,-.1,-3));
    S.add(box(10.4,3.4,.2,'#333d4a',0,1.6,-8.1));
    S.add(box(.2,3.4,10.4,'#38424f',5.1,1.6,-3));S.add(box(.2,3.4,10.4,'#38424f',-5.1,1.6,-3));
    S.add(box(10.4,3.4,.2,'#2e3844',0,1.6,2.1));S.add(box(10.4,.2,10.4,'#2a333f',0,3.3,-3));
    // 密集抽屉墙（-z）：6列×4排，drawer(1,2) 是 s13/s14 的两只目标抽屉（可滑出）
    this.drawers={};
    for(let c=0;c<6;c++)for(let r=0;r<4;r++){
      const d=box(1.1,.62,.5,'#4e5a6c',-3.1+c*1.24,.5+r*.68,-7.75);
      S.add(d);
      const h=box(.3,.08,.06,'#8a96a6',-3.1+c*1.24,.5+r*.68,-7.48);S.add(h);
      if(c===2&&r===0)this.drawers.d1=d;if(c===3&&r===0)this.drawers.d2=d; // 底层抽屉（M-07 臂展可达）
    }
    // 工作台（右侧，s23 测压；台面高 0.75 按 M-07 臂展校准）
    S.add(box(2.6,.1,1.2,'#6a5a44',3.5,.75,-3));
    for(const [dx,dz] of [[-1.1,-.45],[1.1,-.45],[-1.1,.45],[1.1,.45]])S.add(box(.1,.75,.1,'#54483a',3.5+dx,.37,-3+dz));
    // 旧设备堆（台面上占位）
    S.add(box(.6,.3,.4,'#5a6678',2.9,.95,-3.2));S.add(box(.4,.22,.5,'#62606a',4.1,.86,-2.8));
    // 焊台（左中，s24；台面高 0.72）
    S.add(box(1.6,.09,1,'#5c6674',-2,.72,-3));
    for(const [dx,dz] of [[-.7,-.4],[.7,-.4],[-.7,.4],[.7,.4]])S.add(box(.09,.72,.09,'#4a5460',-2+dx,.36,-3+dz));
    // 焊接火星（367±1.4s 窗口内可见的橙色火花；LCG 确定性抛物线）
    const rnd=lcg(77),n=26;this.sparkSeed=[];
    const pos=new Float32Array(n*3);
    for(let i=0;i<n;i++){const s=[rnd()*2-1,rnd()*.8+.4,rnd()*2-1];this.sparkSeed.push(s);pos.set([-2,.85,-3],i*3);}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    this.sparks=new THREE.Points(sg,new THREE.PointsMaterial({color:'#ffb050',size:.03,transparent:true,opacity:0,depthWrite:false}));
    S.add(this.sparks);
    this.weldGlow=new THREE.PointLight(0xffa050,0,4);this.weldGlow.position.set(-2,1.0,-3);S.add(this.weldGlow);

    this.anchors={floor:[0,0,-3],drawer1:[-0.62,.5,-7.48],drawer2:[0.62,.5,-7.48],
      workbenchTop:[3.5,.8,-3],weldTop:[-2,.72,-3],bigBatteryHome:[-1,.2,-5],cartSpot:[.5,0,-4]};
  }
  update(t){
    // 抽屉滑轨：d1 在 193.5→206.5 滑出保持后回推（s13 取放两块电池），d2 在 209.5→218（s14）
    this.drawers.d1.position.z=-7.75+(t<193.5?0:t<206.5?.5*ease(clamp((t-193.5)/1)):.5*(1-ease(clamp((t-206.5)/1))));
    this.drawers.d2.position.z=-7.75+(t<209.5?0:t<217.5?.5*ease(clamp((t-209.5)/1)):.5*(1-ease(clamp((t-217.5)/1))));
    // 焊接火星：366.6→368.2 窗口（WELD_SPARKS@367）；窗口外 opacity=0（FX 初始隐藏纪律）
    const w=t>=366.6&&t<=368.2,u=w?(t-366.6)/1.6:0;
    this.sparks.material.opacity=w?.9:0;this.sparks.visible=w;
    this.weldGlow.intensity=w?3.5*(1-u*.6):0;
    const pos=this.sparks.geometry.attributes.position;
    for(let i=0;i<this.sparkSeed.length;i++){
      const s=this.sparkSeed[i],life=(u+i*.037)%1;
      pos.setXYZ(i,-2+s[0]*.5*life,.72+s[1]*life-1.6*life*life*.5,-3+s[2]*.5*life);
    }
    pos.needsUpdate=true;
  }
}
