// 生活区长廊（T1 占位）：蓝灰金属长廊 x∈[-2,2] z∈[-30,8] 高3m。
// 支撑面锚点：地面 y=0 / 开关排(右墙 y1.2) / 拉闸箱(右墙 z-24) / 吊扇(z-18) / 温室门(z-29.9)。
// 剧情实体：4 组泛黄灯箱（s04 逐一熄灭 51/54.5/58/61.5）、空椅×2、旧杯、拉闸、吊扇（s06 停转）、
// 温室门（s07 滑开）。update(t) 全字段每帧写。
import * as THREE from 'three';
import {toon,flat,box,cyl,canvasTex,clamp,ease} from './common.js';

export const LIGHT_OFF=[51,54.5,58,61.5]; // 开关咔哒绝对秒（contact_events.json 同源）
const LIGHT_Z=[-2,-4.5,-7,-9.5]; // 开关间距按 M-07 步速校准（2.5m/2.5s≈1m/s）

export class CorridorScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='CorridorScene';}
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#141c28');
    S.fog=new THREE.Fog('#141c28',14,44);
    S.add(new THREE.HemisphereLight(0x4a6076,0x1a222e,1.1));
    const key=new THREE.DirectionalLight(0xbfd0e4,.7);key.position.set(3,6,8);S.add(key);
    const amber=new THREE.PointLight(0xffc26a,6,12);amber.position.set(1.5,2.2,-11);S.add(amber);this.amber=amber;

    S.add(box(4.4,.2,42,'#3a4656',0,-.1,-11));            // 地面
    S.add(box(.2,3.2,42,'#4a5a6e',-2.1,1.5,-11));          // 左墙
    S.add(box(.2,3.2,42,'#44536a',2.1,1.5,-11));           // 右墙
    S.add(box(4.4,.2,42,'#333e4e',0,3.1,-11));             // 顶
    S.add(box(4.4,3.2,.2,'#3e4c60',0,1.5,-30.1));          // 端墙
    // 墙面肋条与踢脚（旧工业感）
    for(let z=6;z>-30;z-=4){S.add(box(.06,2.6,.18,'#52627a',-2.0,1.3,z));S.add(box(.06,2.6,.18,'#4c5b72',2.0,1.3,z));}

    // 4 组泛黄灯箱（右墙上方，各带真实点光）+ 对应开关（右墙 y0.8）
    this.lamps=[];this.lampLights=[];this.switches=[];
    for(let i=0;i<4;i++){
      const lamp=box(.5,.28,.9,'#e8d8a8',1.9,2.35,LIGHT_Z[i]);
      lamp.material=new THREE.MeshBasicMaterial({color:'#e8d8a8'});
      S.add(lamp);this.lamps.push(lamp);
      const pl=new THREE.PointLight(0xffd9a0,3.2,8);pl.position.set(1.5,2.1,LIGHT_Z[i]);S.add(pl);this.lampLights.push(pl);
      const sw=box(.08,.14,.1,'#8a97a8',1.98,.8,LIGHT_Z[i]);sw.name='switch'+(i+1);S.add(sw);this.switches.push(sw);
    }
    // 空椅×2 + 旧杯（衰老街区陈设）
    for(const z of [-10,-12.2]){
      S.add(box(.5,.08,.5,'#5a6678',-1.5,.45,z));
      S.add(box(.5,.5,.08,'#5a6678',-1.72,.75,z));
      S.add(box(.08,.45,.08,'#4a5666',-1.35,.22,z-.18));S.add(box(.08,.45,.08,'#4a5666',-1.35,.22,z+.18));
    }
    S.add(cyl(.05,.04,.1,'#b8a888',-1.5,.55,-10));
    // 拉闸箱（右墙 z-24，s06 BREAKER@81；高度按 M-07 臂展校准到 0.95）
    S.add(box(.4,.6,.16,'#6a7688',1.9,.95,-24));
    this.lever=box(.06,.3,.06,'#c85040',1.9,.95,-24.1);S.add(this.lever);
    // 吊扇（z-18，s06 FAN_STOP@84：缓停不是瞬停）
    const fan=new THREE.Group();fan.position.set(0,2.85,-18);
    fan.add(cyl(.05,.05,.2,'#5a6678',0,0,0));
    for(let k=0;k<3;k++){const b=box(.9,.02,.14,'#7a8698',.45,-.12,0);const h=new THREE.Group();h.rotation.y=k*2.094;h.add(b);fan.add(h);}
    S.add(fan);this.fan=fan;this.fanAngle=0;
    // 温室门（端墙中央，s07 DOOR_CREAK@102 滑开）：BOTANICAL EXPERIMENT 门牌
    this.door=box(1.6,2.4,.12,'#5e6c80',0,1.2,-29.9);S.add(this.door);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.3),
      new THREE.MeshBasicMaterial({map:canvasTex(512,96,(g)=>{g.fillStyle='#2a3444';g.fillRect(0,0,512,96);
        g.fillStyle='#9fd8a8';g.font='bold 44px monospace';g.textAlign='center';g.fillText('BOTANICAL EXPERIMENT',256,64);})}));
    sign.position.set(0,2.6,-29.78);S.add(sign);

    this.anchors={
      floor:[0,0,-5],
      switch1:[1.94,.8,-2],switch2:[1.94,.8,-4.5],switch3:[1.94,.8,-7],switch4:[1.94,.8,-9.5],
      breaker:[1.9,.95,-24],fan:[0,2.75,-18],door:[.8,1.2,-29.8],drawingWall:[-1.99,1.3,-5.2],
    };
  }
  update(t){
    // 灯箱：s04 逐一熄灭（全字段每帧写）；s06 拉闸后全部彻底灭
    for(let i=0;i<4;i++){
      const on=t<LIGHT_OFF[i]&&t<81;
      this.lamps[i].material.color.set(on?'#e8d8a8':'#3a4050');
      this.lampLights[i].intensity=on?3.2:0;
    }
    this.amber.intensity=t<81?6:0;
    // 拉闸杆：81s 扳下
    this.lever.rotation.x=t<81?0:ease(clamp((t-81)/.5))*.9;
    // 吊扇：84s 起缓停（闭式积分：线性段 + 指数衰减段解析积分，seek 安全）
    this.fan.rotation.y=t<84?9*t:9*84+9*2.2*(1-Math.exp(-(t-84)/2.2));
    // 温室门：100→104 滑开（s07 推进），开度保持
    this.door.position.x=ease(clamp((t-100)/4))*1.5;
  }
}
