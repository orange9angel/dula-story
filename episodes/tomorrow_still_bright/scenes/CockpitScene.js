// 飞船驾驶舱（T1 占位）：x∈[-2.5,2.5] z∈[-4,2]，狭小。前舷窗（-z，星球景）、蓝色仪表盘、
// 磨损座椅 (1.2,·,-1.5) 座面 y0.45、靠窗小苗固定台 (-1.2,0.8,-3.2)、阅读灯位。
// 支撑面锚点：seat / shelf（小苗台）/ console / floor。
import * as THREE from 'three';
import {toon,flat,box,cyl,canvasTex,radialTex} from './common.js';

export class CockpitScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='CockpitScene';}
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#0c121c');
    S.add(new THREE.HemisphereLight(0x3a4c60,0x10161f,.8));
    const dashGlow=new THREE.PointLight(0x6aa8e8,3,7);dashGlow.position.set(0,1.2,-2.6);S.add(dashGlow);

    S.add(box(5.4,.2,6.4,'#333c48',0,-.1,-1));
    S.add(box(5.4,2.6,.2,'#2b3440',0,1.2,-4.1));
    S.add(box(.2,2.6,6.4,'#303a46',2.6,1.2,-1));S.add(box(.2,2.6,6.4,'#303a46',-2.6,1.2,-1));
    S.add(box(5.4,2.6,.2,'#28303c',0,1.2,2.1));S.add(box(5.4,.2,6.4,'#242c38',0,2.5,-1));
    // 前舷窗（大，星球弧面+星空 canvas）
    const win=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.5),new THREE.MeshBasicMaterial({
      map:canvasTex(1024,448,(g)=>{
        g.fillStyle='#060a12';g.fillRect(0,0,1024,448);
        g.fillStyle='#cfe0f4';for(let i=0;i<120;i++){const r=(i*2654435769>>>0)/4294967296;
          g.globalAlpha=.3+.7*((i*97)%10)/10;g.fillRect((i*811)%1024,(i*397)%300,1.6,1.6);}
        g.globalAlpha=1;
        const gr=g.createRadialGradient(512,900,100,512,900,720);
        gr.addColorStop(0,'#3a6a9a');gr.addColorStop(.8,'#274a6e');gr.addColorStop(1,'#16283e');
        g.fillStyle=gr;g.beginPath();g.arc(512,900,720,0,7);g.fill();
      })}));
    win.position.set(0,1.45,-3.98);S.add(win);
    S.add(box(3.6,.1,.12,'#465266',0,2.25,-3.95));S.add(box(3.6,.1,.12,'#465266',0,.65,-3.95));
    // 蓝色仪表盘（emissive 贴图）+ 台面（右半区，左半留给小苗固定台，避免遮挡）
    S.add(box(2,.5,.9,'#3e4856',.9,.75,-3.3));
    const dash=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.4),new THREE.MeshBasicMaterial({
      map:canvasTex(512,80,(g)=>{g.fillStyle='#0e1a28';g.fillRect(0,0,512,80);
        for(let i=0;i<9;i++){g.fillStyle=i%3?'#3a78b8':'#58b8e8';g.fillRect(20+i*54,18,40,44);}
      })}));
    dash.position.set(.9,1.05,-2.84);dash.rotation.x=-.35;S.add(dash);
    // 磨损座椅（座面 y0.45，s30 落座支撑面）
    S.add(box(.9,.12,.8,'#6a5c4c',1.2,.45,-1.5));
    S.add(box(.9,.9,.14,'#6a5c4c',1.2,.95,-1.9));
    S.add(box(.1,.45,.1,'#54483c',.85,.22,-1.3));S.add(box(.1,.45,.1,'#54483c',1.55,.22,-1.3));
    // 靠窗小苗固定台（s26 垫杯/s27 培养罩/s31 触叶支撑面；高 0.7 按 M-07 坐姿臂展校准）
    S.add(box(.7,.07,.5,'#54627a',-1.2,.7,-3.2));
    S.add(box(.07,.7,.07,'#465266',-1.45,.35,-3.3));S.add(box(.07,.7,.07,'#465266',-.95,.35,-3.3));
    // 小凳（s30/s31 落座支撑面，座面 y0.35，坐姿肩部才能及叶）
    S.add(box(.4,.35,.4,'#5c5648',-1.4,.175,-2.9));

    this.anchors={floor:[0,0,-1],seat:[1.2,.51,-1.5],shelf:[-1.2,.74,-3.2],stool:[-1.4,.35,-2.9],
      console:[.9,1.0,-3.3],window:[0,1.45,-3.98]};
  }
  update(t){}
}
