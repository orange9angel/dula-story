// 《明天还会亮》道具库（T1 占位）：工具车/头灯/电池×3/大电池/螺丝/音乐盒/焊枪/
// 缓冲电池包/陶瓷杯+小苗/培养罩/阅读灯/儿童画/减震泡棉。
// 纪律：位置/旋转/可见性全部由 performance.js 每帧全字段驱动（此处只建几何）。
import * as THREE from 'three';
import {toon,flat,box,cyl,canvasTex,clamp,ease} from '../scenes/common.js';

function grp(name){const g=new THREE.Group();g.name=name;return g;}

export function makeProps(){
  const P={};
  // 工具车（一只坏轮：左前轮外八倾斜——s02 吱响源）
  const cart=grp('cart');
  cart.add(box(.5,.07,.72,'#6a7688',0,.26,0));
  cart.add(box(.5,.3,.05,'#5a6678',0,.45,-.36));                 // 背板
  cart.add(box(.4,.04,.04,'#8a96a6',0,.62,-.36));                // 推手
  for(const [x,z,bad] of [[-.2,.28,0],[.2,.28,0],[-.2,-.28,1],[.2,-.28,0]]){
    const w=cyl(.09,.09,.05,'#3c4450',x,.09,z);w.rotation.z=Math.PI/2;
    if(bad)w.rotation.y=.35;                                     // 坏轮外八
    cart.add(w);
  }
  cart.userData.handle=new THREE.Object3D();cart.userData.handle.position.set(0,.62,-.36);cart.add(cart.userData.handle);
  P.cart=cart;
  // 头灯（s12 放到杯旁）
  const headLamp=grp('headLamp');
  headLamp.add(cyl(.045,.05,.07,'#c8b060',0,0,0).rotateX(Math.PI/2));
  const lens=new THREE.Mesh(new THREE.CircleGeometry(.038,16),new THREE.MeshBasicMaterial({color:'#fff2cc'}));
  lens.position.z=.038;headLamp.add(lens);
  headLamp.userData.lens=lens;
  P.headLamp=headLamp;
  // 电池×3（C 贴 100% 假标签，可揭开）
  const mkBattery=(name,label)=>{
    const b=grp(name);
    b.add(box(.14,.07,.10,'#5e6c7e',0,0,0));
    b.add(box(.14,.02,.10,'#3c4450',0,.045,0));
    if(label){
      const tag=new THREE.Mesh(new THREE.PlaneGeometry(.09,.05),new THREE.MeshBasicMaterial({
        map:canvasTex(128,64,(g)=>{g.fillStyle='#e8e0c8';g.fillRect(0,0,128,64);g.fillStyle='#c04030';
          g.font='bold 34px monospace';g.textAlign='center';g.fillText(label,64,44);})}));
      tag.rotation.x=-Math.PI/2;tag.position.y=.036;b.add(tag);b.userData.tag=tag;
    }
    return b;
  };
  P.batteryA=mkBattery('batteryA');P.batteryB=mkBattery('batteryB');P.batteryC=mkBattery('batteryC','100%');
  // 大电池（外壳四片可散架，s15 PARTS_SCATTER@233）
  const big=grp('bigBattery');
  big.add(box(.40,.26,.24,'#4e5a68',0,0,0));                     // 电芯（散架后裸露）
  const shell=[];
  for(const [x,y,z,w,h,d,rx] of [[0,.15,0,.44,.05,.28,0],[0,-.15,0,.44,.05,.28,0],
      [0,0,.15,.44,.32,.05,0],[0,0,-.15,.44,.32,.05,0]]){
    const p=box(w,h,d,'#7a6a4a',x,y,z);big.add(p);shell.push(p);
  }
  big.userData.shell=shell;P.bigBattery=big;
  // 螺丝（s06 落地/s16 捡起）
  const screw=grp('screw');screw.add(cyl(.012,.012,.045,'#b8c2ce',0,0,0));P.screw=screw;
  // 音乐盒（s19 发条钥匙可转）
  const mb=grp('musicBox');
  mb.add(box(.17,.10,.13,'#8a5a3a',0,0,0));
  mb.add(box(.15,.02,.11,'#c8a050',0,.06,0));
  const key=grp('key');key.position.set(.095,.02,0);
  key.add(box(.02,.05,.02,'#d8c088',0,0,0));key.add(box(.05,.015,.015,'#d8c088',.03,.02,0));
  mb.add(key);mb.userData.key=key;P.musicBox=mb;
  // 焊枪（s24）
  const welder=grp('welder');
  welder.add(box(.05,.05,.14,'#5a6678',0,0,0));
  welder.add(cyl(.008,.014,.10,'#c8a050',0,0,.11).rotateX(Math.PI/2));
  P.welder=welder;
  // 缓冲电池包（s24 制作完成 → s25 接入）
  const bp=grp('bufferPack');
  bp.add(box(.20,.12,.14,'#6a7a5a',0,0,0));
  bp.add(cyl(.015,.015,.2,'#3c4450',.06,.02,.12).rotateX(1.2));
  bp.add(cyl(.015,.015,.2,'#8a4030',-.06,.02,.12).rotateX(1.2));
  P.bufferPack=bp;
  // 陶瓷杯 + 小苗（两片叶，裂口杯；leafBend=散热风吹弯 s09）
  const cup=grp('cupSprout');
  cup.add(cyl(.065,.055,.12,'#e8ded0',0,.06,0,18));
  cup.add(box(.012,.07,.005,'#8a7a68',.05,.07,.052));            // 裂口
  cup.add(cyl(.058,.058,.015,'#4a3a2c',0,.115,0,18));            // 基质
  const stem=cyl(.006,.008,.07,'#6a9a4a',0,.15,0);cup.add(stem);
  const leafGeo=new THREE.CircleGeometry(.035,10);
  const leafL=new THREE.Mesh(leafGeo,new THREE.MeshBasicMaterial({color:'#7ab85a',side:THREE.DoubleSide}));
  leafL.scale.set(1,.55,1);leafL.position.set(-.035,.19,0);leafL.rotation.z=.7;cup.add(leafL);
  const leafR=leafL.clone();leafR.position.x=.035;leafR.rotation.z=-.7;cup.add(leafR);
  cup.userData.leaves=[leafL,leafR];
  cup.userData.setLeafBend=k=>{const b=ease(clamp(k))*.55;leafL.rotation.z=.7+b;leafR.rotation.z=-.7-b;};
  P.cupSprout=cup;
  // 透明培养罩（s27）
  const dome=grp('habitatDome');
  const hemi=new THREE.Mesh(new THREE.SphereGeometry(.16,20,12,0,Math.PI*2,0,Math.PI/2),
    new THREE.MeshBasicMaterial({color:'#bfe8ff',transparent:true,opacity:.22,depthWrite:false}));
  dome.add(hemi);dome.add(cyl(.17,.18,.03,'#6a7688',0,-.005,0,20));
  P.habitatDome=dome;
  // 阅读灯（s25 修好后暖光亮起；light 成员由 performance 驱动）
  const rl=grp('readingLamp');
  rl.add(cyl(.02,.03,.05,'#8a96a6',0,0,0));
  rl.add(box(.03,.2,.03,'#6a7688',0,.12,0));
  const lampHead=cyl(.05,.07,.08,'#c8b060',0,.26,.04);lampHead.rotation.x=.8;rl.add(lampHead);
  const bulb=new THREE.PointLight(0xffd9a0,0,3);bulb.position.set(0,.24,.08);rl.add(bulb);
  rl.userData.bulb=bulb;P.readingLamp=rl;
  // 儿童太阳画（SEE YOU TOMORROW；s05 墙上，s28 取下入口袋）
  const drawing=grp('drawing');
  const dm=new THREE.Mesh(new THREE.PlaneGeometry(.5,.4),new THREE.MeshBasicMaterial({
    map:canvasTex(256,204,(g)=>{
      g.fillStyle='#f4ecd8';g.fillRect(0,0,256,204);
      g.strokeStyle='#e8a030';g.lineWidth=5;
      g.beginPath();g.arc(128,80,34,0,7);g.stroke();
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2;g.beginPath();
        g.moveTo(128+Math.cos(a)*44,80+Math.sin(a)*44);g.lineTo(128+Math.cos(a)*62,80+Math.sin(a)*62);g.stroke();}
      g.fillStyle='#e8a030';g.beginPath();g.arc(128,80,26,0,7);g.fill();
      g.fillStyle='#4a6a9a';g.font='bold 20px sans-serif';g.textAlign='center';
      g.fillText('SEE YOU TOMORROW',128,170);
    })}));
  drawing.add(dm);P.drawing=drawing;
  // 减震泡棉（s26）
  const foam=grp('foamPad');foam.add(box(.17,.02,.17,'#9aa4ae',0,0,0));P.foamPad=foam;
  for(const g of Object.values(P))g.visible=false; // FX/道具初始隐藏纪律
  return P;
}
