// 温室（T1 占位）：x∈[-5,5] z∈[-8,2]。宽舷窗在 -z 墙（暖黄光斑+光柱尘埃），
// 舷窗台 y=0.85（小苗杯固定位 x-1.5）、总开关在右墙门旁 (4.9,1.1,-1)、枯萎植物、锈管。
// 支撑面锚点：sill（窗台）/ masterSwitch / floor。
import * as THREE from 'three';
import {toon,flat,box,cyl,radialTex,lcg} from './common.js';

export class GreenhouseScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='GreenhouseScene';}
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#101822');
    S.add(new THREE.HemisphereLight(0x3c5266,0x141c26,.8));
    // 舷窗暖光（唯一的暖源）+ 冷补
    const warm=new THREE.PointLight(0xffc87a,2.5,12);warm.position.set(-1.5,1.6,-6.2);S.add(warm);this.warm=warm;
    const fill=new THREE.DirectionalLight(0x9fb8d0,.35);fill.position.set(2,4,6);S.add(fill);

    S.add(box(10.4,.2,10.4,'#39434f',0,-.1,-3));          // 地面
    S.add(box(10.4,3.4,.2,'#2e3846',0,1.6,-8.1));          // 舷窗墙
    S.add(box(.2,3.4,10.4,'#323d4c',5.1,1.6,-3));          // 右墙
    S.add(box(.2,3.4,10.4,'#323d4c',-5.1,1.6,-3));         // 左墙
    S.add(box(10.4,3.4,.2,'#2b3542',0,1.6,2.1));           // 门墙
    S.add(box(10.4,.2,10.4,'#28313e',0,3.3,-3));           // 顶
    // 宽舷窗（暖黄透光板 + 窗框）z=-7.98
    const win=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.7),
      new THREE.MeshBasicMaterial({map:radialTex([[0,'#ffe2ae'],[.55,'#d9a868'],[1,'#6a5138']])}));
    win.position.set(-.8,1.7,-7.98);S.add(win);this.win=win;
    S.add(box(4.9,.12,.1,'#4a5566',-.8,2.62,-7.95));S.add(box(4.9,.12,.1,'#4a5566',-.8,.78,-7.95));
    // 舷窗台（支撑面：小苗杯/头灯落点；高度按 M-07 臂展校准到 0.75）
    S.add(box(3.4,.08,.6,'#54627a',-1.2,.75,-7.7));
    // 光柱（舷窗斜射体积光占位：半透明渐变面）
    const shaft=new THREE.Mesh(new THREE.PlaneGeometry(4.2,3.6),
      new THREE.MeshBasicMaterial({map:radialTex([[0,'rgba(255,214,150,.34)'],[1,'rgba(255,214,150,0)']]),
        transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    shaft.position.set(-.8,1.5,-5.6);shaft.rotation.x=.5;S.add(shaft);
    // 光柱尘埃（LCG 确定性，缓慢漂移；圣经：温室光柱少量尘埃）
    const rnd=lcg(20261107),n=90,pos=new Float32Array(n*3);this.dustSeed=[];
    for(let i=0;i<n;i++){const p=[-2.6+rnd()*3.6,.3+rnd()*2.6,-7+rnd()*3];this.dustSeed.push(p);pos.set(p,i*3);}
    const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    this.dust=new THREE.Points(dg,new THREE.PointsMaterial({color:'#ffe0b0',size:.018,transparent:true,opacity:.55,depthWrite:false}));
    S.add(this.dust);
    // 枯萎植物（褐锥+弯杆占位）与锈管
    for(const [x,z,s] of [[-3.5,-5,1],[2.8,-6.5,.8],[3.6,-4,.6]]){
      S.add(cyl(.16,.2,.5,'#5a4a38',x,.25,z));
      const stem=cyl(.015,.02,.7,'#6a5638',x,.8,z);stem.rotation.z=.25*S.children.length%2-.12;S.add(stem);
      S.add(box(.3,.06,.06,'#4c3f30',x+.08* (x%2),1.05,z));
    }
    for(const x of [-4.2,4.4]){const p=cyl(.06,.06,3.2,'#7a5a42',x,1.6,-7.6);S.add(p);}
    const pipe2=cyl(.05,.05,8,'#6e5040',-4.4,2.9,-3);pipe2.rotation.x=Math.PI/2;S.add(pipe2);
    // 总开关（右墙门旁，s08/s11 指尖目标；按 M-07 臂展校准到 0.8）
    S.add(box(.3,.44,.14,'#5c6a7e',4.98,.85,-1));
    this.switchKnob=box(.07,.16,.07,'#c85040',4.9,.8,-1);S.add(this.switchKnob);

    this.anchors={floor:[0,0,-3],sill:[-1.5,.79,-7.6],sillLamp:[-1.0,.79,-7.6],
      masterSwitch:[4.9,.8,-1],window:[-.8,1.7,-7.98]};
  }
  update(t){
    // 尘埃缓慢漂移（闭式：种子 + t，y 缓慢下落回绕）
    const pos=this.dust.geometry.attributes.position;
    for(let i=0;i<this.dustSeed.length;i++){
      const s=this.dustSeed[i];
      pos.setXYZ(i,s[0]+.05*Math.sin(t*.3+i),s[1]+.06*Math.sin(t*.21+i*1.7),s[2]+.04*Math.sin(t*.26+i*.6));
    }
    pos.needsUpdate=true;
  }
}
