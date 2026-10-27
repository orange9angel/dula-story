// 休息室（T1 占位）：x∈[-4,4] z∈[-6,2]。空沙发椅、小桌（音乐盒位）、-z 墙全息旧照片位
// （s17-s18 254→286 亮起，TAPE_CUT 283 后录音停但照片保持到镜尾）。
import * as THREE from 'three';
import {toon,flat,box,cyl,canvasTex,radialTex,clamp,ease} from './common.js';

export class LoungeScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='LoungeScene';}
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#151a24');
    S.add(new THREE.HemisphereLight(0x50607a,0x181f2a,.85));
    const warm=new THREE.PointLight(0xffcf90,4,9);warm.position.set(0,2.4,-3);S.add(warm);

    S.add(box(8.4,.2,8.4,'#414a58',0,-.1,-2));
    S.add(box(8.4,3,.2,'#37404e',0,1.4,-6.1));
    S.add(box(.2,3,8.4,'#3c4654',4.1,1.4,-2));S.add(box(.2,3,8.4,'#3c4654',-4.1,1.4,-2));
    S.add(box(8.4,3,.2,'#333c4a',0,1.4,2.1));S.add(box(8.4,.2,8.4,'#2c3440',0,2.9,-2));
    // 旧沙发椅×2 + 茶几
    for(const x of [-1.6,1.6]){
      S.add(box(1,.18,.9,'#5e5648',x,.35,-4.2));S.add(box(1,.8,.16,'#5e5648',x,.85,-4.6));
    }
    S.add(box(1.2,.08,.7,'#6a5c48',0,.5,-3.4));
    // 小桌（音乐盒位，s19）
    S.add(box(.8,.07,.6,'#6a5c48',1.5,.72,-2));
    S.add(box(.08,.72,.08,'#54483a',1.2,.36,-2));S.add(box(.08,.72,.08,'#54483a',1.8,.36,-2));
    // 全息旧照片（-z 墙）：暖色画框 + 女孩窗边剪影占位（canvas 画）
    const photo=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.15),new THREE.MeshBasicMaterial({
      map:canvasTex(512,344,(g)=>{
        const gr=g.createLinearGradient(0,0,0,344);gr.addColorStop(0,'#f8e2b8');gr.addColorStop(1,'#c89858');
        g.fillStyle=gr;g.fillRect(0,0,512,344);
        g.fillStyle='#fff4dc';g.fillRect(300,40,170,240);            // 窗
        g.strokeStyle='#a87840';g.lineWidth=8;g.strokeRect(300,40,170,240);
        g.beginPath();g.moveTo(385,40);g.lineTo(385,280);g.moveTo(300,160);g.lineTo(470,160);g.stroke();
        g.fillStyle='#8a5a30';g.beginPath();g.arc(180,150,42,0,7);g.fill();   // 女孩头剪影
        g.fillRect(148,190,64,110);
        g.fillStyle='#7a9a4a';g.fillRect(330,220,60,14);              // 窗台小盆栽
        g.fillStyle='#5a7a3a';g.beginPath();g.ellipse(345,205,14,22,.4,0,7);g.fill();
        g.beginPath();g.ellipse(368,200,12,20,-.5,0,7);g.fill();
      }),transparent:true,opacity:0}));
    photo.position.set(0,1.6,-5.98);S.add(photo);this.photo=photo;
    const halo=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.6),new THREE.MeshBasicMaterial({
      map:radialTex([[0,'rgba(255,220,160,.4)'],[1,'rgba(255,220,160,0)']]),transparent:true,opacity:0,depthWrite:false}));
    halo.position.set(0,1.6,-5.95);S.add(halo);this.halo=halo;

    this.anchors={floor:[0,0,-2],photoWall:[0,1.6,-5.98],tableTop:[1.5,.76,-2]};
  }
  update(t){
    // 全息照片：254(TAPE_NOISE 255 前)亮起 → s18 镜尾保持；283 TAPE_CUT 后亮度微降（录音停，影像在）
    const on=t>=254&&t<286,k=on?(t<283?1:.82):0;
    this.photo.material.opacity=.96*k;this.halo.material.opacity=.8*k;
  }
}
