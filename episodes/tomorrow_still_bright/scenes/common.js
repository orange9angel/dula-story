// 《明天还会亮》T1 场景公共件：toon 材质/几何助手/纹理工具（占位色块级）。
// update(t) 纪律：条件分支每帧全字段写（顺序渲染与 seek 一致，borrowed_moonlight P1 纪律）。
import * as THREE from 'three';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';

const ramp=coolShadowRamp();
export const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});
export const flat=c=>new THREE.MeshBasicMaterial({color:c});

export function box(w,h,d,c,x=0,y=0,z=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(c));
  m.position.set(x,y,z);return m;
}
export function cyl(rt,rb,h,c,x=0,y=0,z=0,seg=20){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),toon(c));
  m.position.set(x,y,z);return m;
}
export function canvasTex(w,h,draw){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function radialTex(stops,size=128){
  return canvasTex(size,size,(g)=>{
    const gr=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
    for(const [u,col] of stops)gr.addColorStop(u,col);
    g.fillStyle=gr;g.fillRect(0,0,size,size);
  });
}
// LCG 确定性随机（粒子种子；顺序渲染与 seek 一致）
export function lcg(seed){let s=seed>>>0;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const mix=(a,b,u)=>a+(b-a)*u;
