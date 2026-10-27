// 《借走月光的女孩》粒子引擎（集内）。
// 纪律（dula-skills/direct-animation-craft/references/particle-effects.md）：
// 动态特效统一用粒子——每颗粒有独立出生/寿命/位置速度/尺寸透明度演变；禁几何火舌、
// 菱形光斑、静态贴图冒充特效。确定性 LCG 种子 + 绝对时间闭式轨迹（不积分），
// 顺序渲染与 seek 直渲逐位一致。FX 件创建即 visible=false，update 每帧驱动、
// 窗口外自行隐藏（stardust S1E2 踩坑纪律）。
import * as THREE from 'three';

export const lcg=s=>()=> (s=(s*1664525+1013904223)>>>0)/4294967296;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const lerp=(a,b,u)=>a+(b-a)*u;

let TEX=null;
// 柔和光点 sprite：径向羽化圆点（白，顶点色染色），不露方形/菱形边界
export function glowTexture(){
  if(TEX)return TEX;
  const c=document.createElement('canvas');c.width=c.height=64;
  const g=c.getContext('2d');
  const gr=g.createRadialGradient(32,32,1,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.32,'rgba(255,255,255,.55)');
  gr.addColorStop(.7,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);
  TEX=new THREE.CanvasTexture(c);TEX.colorSpace=THREE.SRGBColorSpace;return TEX;
}

const VERT=`
attribute float aSize;attribute float aAlpha;attribute vec3 aColor;
varying float vA;varying vec3 vC;uniform float uScale;
void main(){
  vA=aAlpha;vC=aColor;
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_PointSize=min(aSize*uScale/max(.1,-mv.z),240.0);
  gl_Position=projectionMatrix*mv;
}`;
const FRAG=`
uniform sampler2D map;varying float vA;varying vec3 vC;
void main(){
  vec4 tex=texture2D(map,gl_PointCoord);
  gl_FragColor=vec4(vC,vA*tex.a);
}`;

// ParticleSystem：一簇同材质粒子。
// spec.build(i,rnd) → {t0,t1,pos(u,t,out)→out(相对锚点偏移),size(u,t),alpha(u,t),color|[r,g,b]}
// spec.anchor：Object3D（活体 getWorldPosition）或 fn(t,out)→out；null=原点（pos 直接给世界坐标）。
export class ParticleSystem{
  constructor(scene,{count,seed=1,build,anchor=null,blending=THREE.AdditiveBlending}){
    this.count=count;this.anchor=anchor;
    const g=new THREE.BufferGeometry();
    this.pos=new Float32Array(count*3);this.col=new Float32Array(count*3);
    this.sz=new Float32Array(count);this.al=new Float32Array(count);
    g.setAttribute('position',new THREE.BufferAttribute(this.pos,3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor',new THREE.BufferAttribute(this.col,3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize',new THREE.BufferAttribute(this.sz,1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha',new THREE.BufferAttribute(this.al,1).setUsage(THREE.DynamicDrawUsage));
    const rnd=lcg(seed>>>0||1);
    this.parts=[];for(let i=0;i<count;i++)this.parts.push(build(i,rnd));
    this.points=new THREE.Points(g,new THREE.ShaderMaterial({
      uniforms:{map:{value:glowTexture()},uScale:{value:900}},
      vertexShader:VERT,fragmentShader:FRAG,
      transparent:true,blending,depthWrite:false,depthTest:true,fog:false,
    }));
    this.points.frustumCulled=false; // 位置逐帧重写，包围球无意义
    this.points.visible=false;       // FX 初值=false，update 每帧驱动
    this.points.renderOrder=20;      // 加色粒子压在黑场纱罩（renderOrder -1）之上
    scene.add(this.points);
    this._o=new THREE.Vector3();this._tmp=new THREE.Vector3();
  }
  update(t,camera){
    const o=this._o;
    if(this.anchor){
      if(typeof this.anchor==='function')this.anchor(t,o);else this.anchor.getWorldPosition(o);
    }else o.set(0,0,0);
    const fov=camera?.fov??44;
    this.points.material.uniforms.uScale.value=720/(2*Math.tan(fov*Math.PI/360));
    let any=false;
    for(let i=0;i<this.count;i++){
      const p=this.parts[i],u=(t-p.t0)/(p.t1-p.t0),i3=i*3;
      if(u<0||u>1){if(this.al[i]!==0)this.al[i]=0;continue;}
      const a=p.alpha(u,t);
      if(a<=0){if(this.al[i]!==0)this.al[i]=0;continue;}
      any=true;
      const v=p.pos(u,t,this._tmp,o);
      this.pos[i3]=o.x+v.x;this.pos[i3+1]=o.y+v.y;this.pos[i3+2]=o.z+v.z;
      this.sz[i]=p.size(u,t);this.al[i]=a;
      const c=typeof p.color==='function'?p.color(u,t):p.color;
      this.col[i3]=c[0];this.col[i3+1]=c[1];this.col[i3+2]=c[2];
    }
    this.points.visible=any;
    if(any){
      const at=this.points.geometry.attributes;
      at.position.needsUpdate=true;at.aColor.needsUpdate=true;
      at.aSize.needsUpdate=true;at.aAlpha.needsUpdate=true;
    }
  }
}

// ParticleDirector：按场景键分组驱动；反馈光源（活体锚点+包络函数）每帧全字段驱动。
export class ParticleDirector{
  constructor(){this.systems=new Map();this.lights=new Map();}
  add(key,sys){
    if(!this.systems.has(key))this.systems.set(key,[]);
    this.systems.get(key).push(sys);return sys;
  }
  // intensityFn(t,seg)→强度（0=熄）；anchor 同 ParticleSystem
  addLight(key,light,anchor,intensityFn){
    light.intensity=0;light.visible=false;
    if(!this.lights.has(key))this.lights.set(key,[]);
    this.lights.get(key).push({light,anchor,intensityFn});
  }
  update(t,key,camera,seg){
    for(const s of this.systems.get(key)??[])s.update(t,camera);
    for(const L of this.lights.get(key)??[]){
      const I=L.intensityFn(t,seg);
      L.light.intensity=Math.max(0,I);
      L.light.visible=I>.001;
      if(typeof L.anchor==='function')L.anchor(t,L.light.position);
      else L.anchor.getWorldPosition(L.light.position);
    }
  }
}
