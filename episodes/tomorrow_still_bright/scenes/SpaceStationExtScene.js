// 空间站外景（T1 占位）：蓝色星球 + 站体环（外环灯 12 段，s01 逐段熄灭 0→18；
// 最后一盏灯 s29 450 熄灭）+ 逃生飞船（s29 440→454 离站；s32 475→480 驶向晨光）+ 晨光泛金。
import * as THREE from 'three';
import {toon,flat,box,cyl,radialTex,clamp,ease,mix} from './common.js';

export class SpaceStationExtScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='SpaceStationExtScene';}
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#04070e');
    S.add(new THREE.HemisphereLight(0x2a3c52,0x05080e,.7));
    const sun=new THREE.DirectionalLight(0xd8e4f2,.5);sun.position.set(30,10,-20);S.add(sun);this.sun=sun;
    // 星空
    const n=400,pos=new Float32Array(n*3);
    for(let i=0;i<n;i++){const r=(i*2654435761>>>0)/4294967296;pos.set([(r-.5)*300,(((i*97)%100)/100-.5)*160,-60-((i*53)%120)],i*3);}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    S.add(new THREE.Points(sg,new THREE.PointsMaterial({color:'#cfe0f4',size:.5,sizeAttenuation:false})));
    // 蓝色星球（下方，s32 边缘泛金：金色晨光盘透明度升起）
    const planet=new THREE.Mesh(new THREE.SphereGeometry(50,48,32),
      new THREE.MeshToonMaterial({color:'#2e5c8c'}));
    planet.position.set(0,-64,-90);S.add(planet);
    const limb=new THREE.Mesh(new THREE.SphereGeometry(50.6,48,32),new THREE.MeshBasicMaterial({
      map:radialTex([[0,'rgba(255,200,120,0)'],[.82,'rgba(255,200,120,0)'],[.95,'rgba(255,210,140,.85)'],[1,'rgba(255,220,160,0)']]),
      transparent:true,opacity:0,depthWrite:false}));
    limb.position.copy(planet.position);S.add(limb);this.limb=limb;
    // 站体：主环 + 辐条 + 核心舱 + 外环灯 12 段
    const station=new THREE.Group();station.position.set(0,4,-48);S.add(station);this.station=station;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(9,.8,12,48),toon('#5a6a7e'));station.add(ring);
    station.add(cyl(1.6,1.6,3,'#6a7a8e',0,0,0));
    for(let k=0;k<4;k++){const sp=box(.5,.5,8,'#54647a',0,0,0);const h=new THREE.Group();h.rotation.z=k*Math.PI/4;
      sp.position.set(Math.cos(k*Math.PI/4)*4.5,Math.sin(k*Math.PI/4)*4.5,0);sp.rotation.z=k*Math.PI/4+Math.PI/2;station.add(sp);}
    this.segLights=[];
    for(let k=0;k<12;k++){
      const a=k/12*Math.PI*2,l=box(.7,.4,.5,'#ffd890',Math.cos(a)*9,Math.sin(a)*9,.6);
      l.material=new THREE.MeshBasicMaterial({color:'#ffd890'});station.add(l);this.segLights.push(l);
    }
    // 逃生飞船（占位小梭形；初始停泊在环侧）
    const shuttle=new THREE.Group();
    shuttle.add(box(1.6,.8,3.2,'#8a97a8',0,0,0));
    shuttle.add(box(2.6,.12,1.2,'#6a7a8e',0,.2,-.6));
    const cab=box(.9,.5,1,'#4a6a8a',0,.55,.8);shuttle.add(cab);
    const beacon=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),new THREE.MeshBasicMaterial({color:'#ffd890'}));
    beacon.position.set(0,.85,.8);shuttle.add(beacon);this.beacon=beacon;
    shuttle.position.set(11,4,-48);S.add(shuttle);this.shuttle=shuttle;
    this.anchors={station:[0,4,-48],planet:[0,-14,-90],shuttleDock:[11,4,-48]};
  }
  update(t){
    // 外环灯逐段熄灭：s01 段 i 在 t>2+i*1.2 灭；s29 末盏 450 灭；450 后全站熄
    for(let k=0;k<12;k++){
      const on=t<(2+k*1.2)?true:t<450?(k===11):false; // 第 12 段留到最后
      this.segLights[k].material.color.set(on?'#ffd890':'#28303c');
    }
    // 飞船：s29 440→454 离站（-z 远去+微升）；s32 475→480 继续驶向晨光（+x 金色地平线方向）
    let px=11,py=4,pz=-48;
    if(t>=440){const u=ease(clamp((t-440)/14));px=11+u*26;py=4+u*5;pz=-48-u*30;}
    if(t>=475){const u2=ease(clamp((t-475)/5));const u1=1;px=11+26+u2*30;py=4+5+u2*8;pz=-48-30-u2*40;}
    this.shuttle.position.set(px,py,pz);
    this.shuttle.rotation.y=t<440?.3:.3+ease(clamp((t-440)/10))*.5;
    // 舱内小灯仍亮（s29 起呼吸微光）
    this.beacon.material.color.set(t>=440&&Math.sin(t*2)>.6?'#ffe4ae':'#ffd890');
    // 晨光：s32 金色弧缘 + 阳光转暖
    const dawn=t>=474?ease(clamp((t-474)/5)):0;
    this.limb.material.opacity=.9*dawn;
    this.sun.color.setRGB(.85+.15*dawn,.89+.05*dawn,.95-.25*dawn);
  }
}
