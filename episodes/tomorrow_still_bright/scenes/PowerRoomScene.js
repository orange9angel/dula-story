// 能源室（T1 占位）：x∈[-4,4] z∈[-6,2]。-z 墙电池阵列 + 逃生舱辅助电池槽 (0,1.0,-5.8)，
// 状态灯：38% 琥珀（s20-s21）→ s22 CORE POWER CRITICAL 红闪（334→342 窗口）。
import * as THREE from 'three';
import {toon,flat,box,cyl,canvasTex} from './common.js';

export class PowerRoomScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='PowerRoomScene';}
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#101820');
    S.add(new THREE.HemisphereLight(0x3e5468,0x121a24,.85));
    const hum=new THREE.PointLight(0x7ab8ff,5,10);hum.position.set(0,2,-4);S.add(hum);this.hum=hum;

    S.add(box(8.4,.2,8.4,'#39424e',0,-.1,-2));
    S.add(box(8.4,3,.2,'#303a46',0,1.4,-6.1));
    S.add(box(.2,3,8.4,'#36404e',4.1,1.4,-2));S.add(box(.2,3,8.4,'#36404e',-4.1,1.4,-2));
    S.add(box(8.4,3,.2,'#2e3742',0,1.4,2.1));S.add(box(8.4,.2,8.4,'#2a323e',0,2.9,-2));
    // 电池阵列（-z 墙圆柱排）
    for(let i=0;i<5;i++){
      const b=cyl(.32,.36,1.6,i===2?'#5e7a8a':'#4a5a68',-2.6+i*1.3,.8,-5.5);
      S.add(b);S.add(cyl(.1,.1,.12,'#8a96a6',-2.6+i*1.3,1.66,-5.5));
    }
    // 辅助电池槽（中央，s20/s21 伸手目标；中心高 0.8 按 M-07 臂展校准）：琥珀状态灯 + 铭牌
    S.add(box(1.1,.9,.5,'#54627a',0,.8,-5.85));
    this.status=box(.5,.12,.06,'#e8b060',0,1.28,-5.58);this.status.material=new THREE.MeshBasicMaterial({color:'#e8b060'});
    S.add(this.status);
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(.9,.24),new THREE.MeshBasicMaterial({
      map:canvasTex(256,64,(g)=>{g.fillStyle='#20262e';g.fillRect(0,0,256,64);g.fillStyle='#e8b060';
        g.font='bold 30px monospace';g.textAlign='center';g.fillText('AUX BATTERY',128,42);})}));
    plate.position.set(0,.42,-5.58);S.add(plate);
    // 管线
    for(const x of [-3.4,3.2])S.add(cyl(.06,.06,3,'#566473',x,1.5,-5.9));

    this.anchors={floor:[0,0,-2],auxBattery:[0,.8,-5.55],chestStand:[0,0,-3.5]};
  }
  update(t){
    // 状态灯：常态琥珀；s22 自拆电池报警窗（334→342）红闪 6Hz；之后恢复
    const alarm=t>=334&&t<342;
    this.status.material.color.set(alarm?(Math.sin(t*38)>0?'#ff5040':'#5a1a14'):'#e8b060');
    this.hum.intensity=alarm?7:5;
  }
}
