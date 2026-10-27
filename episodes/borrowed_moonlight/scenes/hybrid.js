// 《借走月光的女孩》P3 混合场景共享助手（hybrid-craft-scene 工艺）。
// 纪律来源：dula-skills/hybrid-craft-scene/SKILL.md 翻车记录——
// · planarUVWorld 必须用 updateWorldMatrix 后的完整 matrixWorld（含父级与缩放），
//   只算 Y 旋转+位置会让 CircleGeometry 一类几何的投影 UV 退化（S1E2 R15 实测）；
// · 法线等数据贴图走 NoColorSpace，基础色才 sRGB（通用 loader 对法线也设 sRGB 的翻车修正）；
// · 文生图不是真无缝：MirroredRepeatWrapping 镜像平铺免接缝；map×color 相乘，贴图材质 color 压灰。
import * as THREE from 'three';

// 世界空间顶视平面投影 UV：所有近水平表面共享同一比例尺（texel density 一致），
// 免疫锥体/圆盘自带 UV 的拉花。须在 mesh 就位（含父级 transform）后调用。
export function planarUVWorld(m,s){
  m.updateWorldMatrix(true,false);
  const g=m.geometry,p=g.attributes.position;
  let uv=g.attributes.uv;
  if(!uv){uv=new THREE.BufferAttribute(new Float32Array(p.count*2),2);g.setAttribute('uv',uv);}
  const v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);
    uv.setXY(i,v.x*s,v.z*s);
  }
  uv.needsUpdate=true;
}

export function canvasTex(w,h,draw){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}

// 径向渐变圆盘纹理（程序化月轮/光晕用：白热核→羽化缘；平涂圆盘会像贴纸——S1E2 纪律）
export function radialTex(stops,size=128){
  return canvasTex(size,size,(c)=>{
    const g=c.createRadialGradient(size/2,size/2,2,size/2,size/2,size/2);
    for(const [u,col] of stops)g.addColorStop(u,col);
    c.fillStyle=g;c.beginPath();c.arc(size/2,size/2,size/2,0,Math.PI*2);c.fill();
  });
}

// 采样背景板实际像素的竖直渐变（scene.background 兜底；纯色会露平板边界）
export function backdropGradient(img,stops=[[0,.06],[.3,.30],[.62,.60],[1,.92]]){
  const c=document.createElement('canvas');c.width=8;c.height=8;
  const g=c.getContext('2d',{willReadFrequently:true});
  g.drawImage(img,0,0,8,8);
  const px=y=>{const d=g.getImageData(4,Math.max(0,Math.min(7,Math.round(y*7))),1,1).data;
    return `rgb(${d[0]},${d[1]},${d[2]})`;};
  return canvasTex(2,256,(cc,w,h)=>{
    const gr=cc.createLinearGradient(0,0,0,h);
    for(const [u,sy] of stops)gr.addColorStop(u,px(sy));
    cc.fillStyle=gr;cc.fillRect(0,0,w,h);
  });
}

// 纹理加载器：逐集 assets3d/tex/，缺失返回 null（该部位保持程序化外观，静默回退）
export function texLoader(base){
  const L=new THREE.TextureLoader(),cache={};
  return n=>{
    if(!(n in cache))cache[n]=new Promise(res=>L.load(base+n+'.png',t=>{
      t.colorSpace=n.endsWith('_normal')?THREE.NoColorSpace:THREE.SRGBColorSpace;
      t.anisotropy=4;res(t);
    },undefined,()=>{console.warn('[hybrid] tex missing:',n);res(null);}));
    return cache[n];
  };
}

// 纹理实例：repeat 是 Texture 级属性，同图不同 repeat 必须 clone（共享 image，开销极小）
export function inst(t,rx=1,ry=1){
  if(!t)return null;
  const c=t.clone();
  c.wrapS=c.wrapT=THREE.MirroredRepeatWrapping;
  c.repeat.set(rx,ry);c.needsUpdate=true;
  return c;
}

// 贴图+可选法线一次性上材质（color 压灰防 map×color 过曝）
export function skinMesh(m,albedo,{repeat=[1,1],color='#a39b90',normal=null,normalRepeat=null,normalScale=.8,worldUV=0}={}){
  if(!m||!albedo)return;
  const mat=m.material;
  mat.map=inst(albedo,repeat[0],repeat[1]);
  mat.color.set(color);
  if(normal){
    const nr=normalRepeat??repeat;
    mat.normalMap=inst(normal,nr[0],nr[1]);
    mat.normalScale=new THREE.Vector2(normalScale,normalScale);
  }
  mat.needsUpdate=true;
  if(worldUV)planarUVWorld(m,worldUV);
}
