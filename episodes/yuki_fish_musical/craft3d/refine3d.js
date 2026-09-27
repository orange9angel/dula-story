// 形象精修（任务 B）：只加细节不改辨识度，描边口径不变。
// 小雪：脸用增强版 CanvasTexture 覆盖（虹膜渐变 + 双层高光 + 上睫毛，
// 布局/眨眼机构与 craft_trial head3d.js 相同，线色对齐 cel 0x25222a）；
// 皮肤换柔和四档 ramp；发色加高光带与刘海分缕；百褶裙顶点色压褶谷。
// 年糕的精修直接在 mochi3d.js（本目录自有文件）。
import * as THREE from 'three';

const C={ink:'#25222a',skin:'#ffe3d1',hairDark:'#4a3030'};
const mix=(a,b,t)=>a+(b-a)*t;

function ellipse(c,x,y,rx,ry,fill){
  c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
}

// 分层眼：巩膜 → 虹膜径向渐变 → 瞳 → 双层高光 → 底缘反光 → 上睫毛加粗 + 外角睫尖。
// 眨眼沿用 head3d eyeWithLid 的 aperture 裁剪参数（lid 裁固定虹膜，不挤虹膜）。
function eyeEnhanced(c,x,point,blink,far){
  c.save();c.translate(x,.005);c.scale(far?.98:1,1);
  const a=mix(.010,-.006,blink),b=mix(.032,.004,blink),top=mix(.089-point*.008,-.023,blink);
  const bottom=mix(-.062,-.024,blink);
  const aperture=new Path2D();
  aperture.moveTo(-.053,a);aperture.bezierCurveTo(-.047,top,.024,top,.052,b);
  aperture.bezierCurveTo(.066,bottom,.034,bottom,-.007,bottom);aperture.quadraticCurveTo(-.050,bottom,-.053,a);
  c.save();c.clip(aperture);
  c.fillStyle='#fffdf8';c.fillRect(-.09,-.09,.18,.18);
  if(blink<.98){
    const iris=c.createRadialGradient(.004,-.012,.004,.005,.004,.052);
    iris.addColorStop(0,'#82d4ef');iris.addColorStop(.45,'#5aa5c1');iris.addColorStop(1,'#2e4a68');
    c.fillStyle=iris;c.beginPath();c.ellipse(.005,.004,.031,.050,0,0,Math.PI*2);c.fill();
    ellipse(c,.007,.007,.013,.034,'#22304a');
    ellipse(c,-.008,.028,.0105,.0145,'#fffdf4');
    ellipse(c,.021,-.018,.005,.007,'#c8ecf4');
    c.strokeStyle='rgba(150,215,238,.85)';c.lineWidth=.0035;
    c.beginPath();c.ellipse(.005,.004,.024,.043,0,Math.PI*.22,Math.PI*.78);c.stroke();
  }
  c.restore();
  c.strokeStyle=C.ink;c.lineCap='round';
  c.lineWidth=.008;c.beginPath();
  c.moveTo(-.059,a+.002);c.bezierCurveTo(-.042,top,.025,top,.057,b+.003);c.stroke();
  c.lineWidth=.004;c.beginPath();c.moveTo(-.051,a+.002);c.lineTo(-.064,a+.014);c.stroke();
  // 上睫毛：外角两根小挑
  c.lineWidth=.0045;
  c.beginPath();c.moveTo(.046,b+.006);c.lineTo(.062,b+.018);c.stroke();
  c.beginPath();c.moveTo(.052,b-.004);c.lineTo(.068,b+.006);c.stroke();
  c.restore();
}

function faceTextureEnhanced(point,blink){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const c=canvas.getContext('2d');c.fillStyle=C.skin;c.fillRect(0,0,1024,1024);
  c.translate(512,512);c.scale(1024/.7,-1024/.7);
  eyeEnhanced(c,-.106,point,blink,true);eyeEnhanced(c,.103,point,blink,false);
  c.lineCap='round';c.strokeStyle=C.hairDark;c.lineWidth=.007;
  for(const sign of [-1,1]){
    c.beginPath();c.moveTo(sign*.165,.126);c.quadraticCurveTo(sign*.123,.146-.03*point,sign*.064,.123-.033*point);c.stroke();
    c.fillStyle='#efafa5';c.beginPath();c.ellipse(sign*.177,-.10,.034,.012,0,0,Math.PI*2);c.fill();
  }
  c.strokeStyle='#d69d8b';c.lineWidth=.0026;
  c.beginPath();c.moveTo(.005,-.082);c.quadraticCurveTo(.012,-.092,.003,-.095);c.stroke();
  c.strokeStyle='#985c64';c.lineWidth=.0045;c.beginPath();c.moveTo(-.031,-.153);
  c.quadraticCurveTo(.002,point>.35?-.144:-.179,.037,-.149);c.stroke();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;return texture;
}

// 覆盖 craft 默认纹理脸。HeadAssembly.setPose 仍会按 point/blink 重建默认贴图，
// 本模块在其后把自己的贴图盖回去（按同一 key 缓存，代价只在键变化帧）。
export function installEnhancedFace(actor){
  const ha=actor.headAssembly;
  let lastKey='';
  return {update(point,blink){
    const key=`${point.toFixed(2)}/${blink.toFixed(2)}`;
    if(key===lastKey)return;
    lastKey=key;
    ha.faceMat.map?.dispose();
    ha.faceMat.map=faceTextureEnhanced(point,blink);
    ha.faceMat.needsUpdate=true;
  }};
}

// 身体精修：皮肤柔和 ramp、头发高光带、刘海分缕、裙褶顶点色。
export function enhanceYukiBody(actor){
  // 皮肤：三档硬切 → 柔和四档（线性滤波）
  const soft=new THREE.DataTexture(new Uint8Array([140,190,226,255]),4,1,THREE.RedFormat);
  soft.minFilter=soft.magFilter=THREE.LinearFilter;soft.needsUpdate=true;
  const swapped=new Map();
  actor.mesh.traverse(o=>{
    if(!o.isMesh||!o.material?.isMeshToonMaterial)return;
    if(o.material.color.getHexString()!=='ffe3d1')return;
    if(!swapped.has(o.material)){
      const m=o.material.clone();m.gradientMap=soft;swapped.set(o.material,m);
    }
    o.material=swapped.get(o.material);
  });
  // 头发高光带（无描边 Basic 件，贴在头顶前缘的弧）
  const head=actor.headAssembly.head;
  // 头发高光带（无描边 Basic 椭圆贴片，贴在头顶前缘表面）
  const band=new THREE.Mesh(new THREE.CircleGeometry(.085,24),
    new THREE.MeshBasicMaterial({color:'#a5715f'}));
  band.scale.set(1.7,.55,1);band.position.set(0,.272,.128);band.rotation.set(-.62,0,-.12);
  head.add(band);
  // 刘海分缕：三根深色细丝沿额发表面
  const strandMat=new THREE.MeshBasicMaterial({color:C.hairDark});
  for(const [x0,y0,z0,x1,y1,z1] of [
    [-.10,.185,.215,-.11,.115,.25],[.02,.205,.225,.025,.125,.255],[.12,.175,.205,.13,.105,.245]]){
    const curve=new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x0,y0,z0),new THREE.Vector3((x0+x1)/2,(y0+y1)/2-.01,(z0+z1)/2+.012),
      new THREE.Vector3(x1,y1,z1));
    head.add(new THREE.Mesh(new THREE.TubeGeometry(curve,10,.0032,6),strandMat));
  }
  // 百褶裙：顶点色压褶谷（cos(θ*10) 与 ringsGeometry 的 pleats 同相），衫摆略沉
  for(const child of actor.body.children){
    if(!child.isMesh||child.material.color?.getHexString()!=='35466f')continue;
    const g=child.geometry,p=g.attributes.position,n=p.count;
    if(n%81!==0)continue;
    const colors=new Float32Array(n*3);
    for(let i=0;i<n;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const theta=Math.atan2(x,z);
      const valley=(1-Math.cos(theta*10))/2;      // 褶谷 1 / 褶峰 0
      const hem=THREE.MathUtils.clamp((.62-y)/.24,0,1); // 越近摆越暗
      const shade=1-.20*valley*(.35+.65*hem)-.06*hem;
      colors[i*3]=colors[i*3+1]=colors[i*3+2]=shade;
    }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    child.material=child.material.clone();child.material.vertexColors=true;
  }
}
