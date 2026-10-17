// 《星屑战壳》OP — 星屑柱廊旷野（StarfallColonnadeScene）：断裂巨柱阵+碎石原+流星+
// 地平线星云（小凿的登场场景，冷色调）。世界布局与圣殿一致（地面 y=0，表演走廊
// |x|<5, z>0 无遮挡），供跨场景跳切硬切换背景。程序化几何+applyHybrid 预留（纹理
// 缺失静默回退），update(t) 纯 (t,state)。
import * as THREE from 'three';
import {SceneBase} from 'dula-engine';

const TAU=Math.PI*2;
const toon=c=>new THREE.MeshToonMaterial({color:c});
const canvasTex=(w,h,draw)=>{
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  draw(canvas.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
};
const lcg=seed=>()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
function planarUVWorld(m,s){
  m.updateWorldMatrix(true,false);
  const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv,v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);
    uv.setXY(i,v.x*s,v.z*s);
  }
  uv.needsUpdate=true;
}
function glowTexture(inner='#fff6dc',mid='rgba(160,190,255,.85)',outer='rgba(160,190,255,0)'){
  return canvasTex(64,64,(c)=>{
    const g=c.createRadialGradient(32,32,2,32,32,32);
    g.addColorStop(0,inner);g.addColorStop(.4,mid);g.addColorStop(1,outer);
    c.fillStyle=g;c.fillRect(0,0,64,64);
  });
}
// 流星拖尾纹理（横向羽化长条）
function streakTexture(){
  return canvasTex(128,16,(c)=>{
    const g=c.createLinearGradient(0,0,128,0);
    g.addColorStop(0,'rgba(190,220,255,0)');g.addColorStop(.7,'rgba(220,238,255,.9)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,128,16);
  });
}

export class StarfallColonnadeScene extends SceneBase{
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#060a16');
    S.fog=new THREE.Fog('#0a1224',28,100);
    // 冷色双色光：冷蓝主光（月色）+ 极弱暖 rim（远处灶火方向）
    // R3：月光+冷补加强（夜景偏暗吞纹理）
    S.add(new THREE.HemisphereLight(0x3a5288,0x0c0e18,1.12));
    const moon=new THREE.DirectionalLight(0x9fb8e8,1.5);
    moon.position.set(-8,12,4);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);
    Object.assign(moon.shadow.camera,{left:-16,right:16,top:12,bottom:-4,far:60});
    moon.shadow.bias=-.0004;S.add(moon);
    const rim=new THREE.DirectionalLight(0xff9a5a,.28);rim.position.set(6,3,-10);S.add(rim);
    const fill=new THREE.DirectionalLight(0x6a88bb,.72);fill.position.set(0,3,10);S.add(fill);

    // ── 地面：碎石原（hybrid 换 AI 纹理）──
    const floor=this.floorMesh=new THREE.Mesh(new THREE.CircleGeometry(34,64),toon('#252b38'));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;S.add(floor);
    const far=this.farMesh=new THREE.Mesh(new THREE.CircleGeometry(100,48),toon('#141a26'));
    far.rotation.x=-Math.PI/2;far.position.y=-.02;S.add(far);
    S.updateMatrixWorld(true);
    planarUVWorld(this.floorMesh,.11);planarUVWorld(far,.11);

    // ── 断裂巨柱阵（环布表演区外；断口/倾倒/残段错落）──
    const stone='#46506a',stoneD='#38415a'; // 冷色月蓝石材（受月光面读得出层次）
    this.pillarMeshes=[];this.breakMeshes=[];this.pileMeshes=[];this.bandMeshes=[];
    const rr=lcg(61);
    const pillarSpots=[[-9,-3],[9,-4],[-12,4],[12,3],[-7,-12],[7,-13],[-16,-6],[16,-7],[0,-17],[-19,8],[19,7]];
    for(let i=0;i<pillarSpots.length;i++){
      const [x,z]=pillarSpots[i];
      const r=.8+rr()*.6,h=i%3===0?3+rr()*2:6+rr()*3.5;
      const p=new THREE.Mesh(new THREE.CylinderGeometry(r*.85,r,h,14),toon(i%2?stone:stoneD));
      p.position.set(x,h/2,z);p.castShadow=p.receiveShadow=true;
      if(i%4===1){p.rotation.z=.12+rr()*.15;} // 倾倒
      S.add(p);this.pillarMeshes.push(p);
      // 柱顶断口残冠 + 柱顶冷光勾边（轮廓光读感）
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(r*.9,r*.95,.3,14),toon(stoneD));
      cap.position.set(x,h+.15,z);cap.rotation.y=rr();S.add(cap);this.pillarMeshes.push(cap);
      // R3 柱头残件：高柱顶加残破柱头板（半错位读坍塌感），矮柱顶贴断口截面
      if(i%3!==0){
        const slab=new THREE.Mesh(new THREE.BoxGeometry(r*1.9,.3,r*1.9),toon(stone));
        slab.position.set(x+(rr()-.5)*.3,h+.42,z+(rr()-.5)*.3);
        slab.rotation.y=rr();slab.rotation.z=(rr()-.5)*.12;
        slab.castShadow=true;S.add(slab);this.pillarMeshes.push(slab);
      }else{
        const face=new THREE.Mesh(new THREE.CircleGeometry(r*.82,14),toon('#3d4763'));
        face.rotation.x=-Math.PI/2;face.position.set(x,h+.02,z);S.add(face);
        this.breakMeshes.push(face);
      }
      const edge=new THREE.Mesh(new THREE.TorusGeometry(r*.87,.03,6,20),
        new THREE.MeshBasicMaterial({color:'#6a9bd8',transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));
      edge.rotation.x=Math.PI/2;edge.position.set(x,h+.02,z);S.add(edge);
      // 柱脚碎石（断口截面纹）
      for(let k=0;k<3;k++){
        const rb=new THREE.Mesh(new THREE.TetrahedronGeometry(.2+rr()*.3),toon(stoneD));
        const a=rr()*TAU;rb.position.set(x+Math.cos(a)*(r+.5),.12,z+Math.sin(a)*(r+.5));
        rb.rotation.set(rr()*3,rr()*3,rr()*3);rb.castShadow=true;S.add(rb);
        this.breakMeshes.push(rb);
      }
    }

    // ── R3 倒塌横卧柱段（半埋/错落，断口截面贴两端）──
    for(const [x,z,len,r,ry,bury] of [[-5.5,-9.5,4.2,.72,.4,.78],[6.5,-8.5,5.0,.8,-.7,.72],
        [-13.5,-2,3.4,.62,1.2,.8],[13.5,-3.5,4.4,.75,-1.1,.75],[3.2,-15.5,3.6,.68,2.2,.8]]){
      const seg=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.94,len,14),toon(stone));
      seg.rotation.z=Math.PI/2;seg.rotation.x=(r*7%1-.5)*.12;seg.rotation.y=ry;
      seg.position.set(x,r*bury,z);seg.castShadow=seg.receiveShadow=true;
      S.add(seg);this.pillarMeshes.push(seg);
      // 两端断口截面（法线沿柱轴）
      const ax=new THREE.Vector3(1,0,0).applyEuler(seg.rotation); // 柱轴方向
      for(const sign of [-1,1]){
        const f=new THREE.Mesh(new THREE.CircleGeometry(r*.92,14),toon('#3d4763'));
        f.position.copy(seg.position).addScaledVector(ax,sign*(len/2+.005));
        f.lookAt(f.position.clone().addScaledVector(ax,sign));
        S.add(f);this.breakMeshes.push(f);
      }
    }

    // ── R3 乱石堆（压扁球体贴碎石纹，世界顶视投影同地面比例尺）──
    {const rr2=lcg(97);
     for(let i=0;i<12;i++){
       const a=rr2()*TAU,rad=7+rr2()*13;
       const x=Math.cos(a)*rad,z=-4+Math.sin(a)*rad;
       if(Math.abs(x)<5.5&&z>0)continue; // 表演走廊不堆料
       const sx=.9+rr2()*1.4;
       const m=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),toon(stoneD));
       m.scale.set(sx,.32*sx,sx*(.7+rr2()*.5));
       m.position.set(x,.05,z);m.rotation.y=rr2()*TAU;
       m.castShadow=m.receiveShadow=true;S.add(m);this.pileMeshes.push(m);
     }}
    // ── R3 远处废墟剪影带（r38-56：暗色土丘+断柱残桩，吃地面同族纹理靠雾糊边，
    //    不用悬浮色块——R8 教训；全部在背景筒 r60 内）──
    {const rr3=lcg(113);
     for(let i=0;i<18;i++){
       const a=rr3()*TAU,rad=38+rr3()*18;
       const x=Math.cos(a)*rad,z=-6+Math.sin(a)*rad;
       if(rr3()<.55){ // 土丘
         const sx=3+rr3()*4;
         const m=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),toon('#1a2233'));
         m.scale.set(sx,.28*sx,sx*(.6+rr3()*.6));m.position.set(x,0,z);
         m.rotation.y=rr3()*TAU;S.add(m);this.bandMeshes.push(m);
       }else{ // 断柱残桩
         const r=.9+rr3()*.9,h=2+rr3()*4.5;
         const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.85,r,h,8),toon('#161d2c'));
         m.position.set(x,h/2-.3,z);m.rotation.z=(rr3()-.5)*.22;
         S.add(m);this.bandMeshes.push(m);
       }
     }}
    S.updateMatrixWorld(true);
    for(const m of this.pileMeshes)planarUVWorld(m,.11); // 与地面同比例尺

    // ── 流星（update 划过；纯 t）──
    this.meteors=[];
    {const tex=streakTexture();
     for(let i=0;i<6;i++){
       const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
       s.userData={y:16+rr()*14,z:-30-rr()*20,x0:-50+rr()*30,sp:14+rr()*10,off:rr()*6,period:5+i*1.2}; // 流星周期调密
       s.scale.set(6,.5,1);S.add(s);this.meteors.push(s);
     }}
    // 冷色星屑浮尘
    this.motes=[];
    {const tex=glowTexture('rgba(220,236,255,1)','rgba(150,190,255,.7)','rgba(150,190,255,0)');
     const rr2=lcg(31);
     for(let i=0;i<36;i++){
       const a=rr2()*TAU,r=2+rr2()*12;
       const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false}));
       s.userData={x:Math.cos(a)*r,z:-4+Math.sin(a)*r,y:.3+rr2()*3,ph:rr2()*TAU,f:.3+rr2()*.7};
       s.scale.setScalar(.04+rr2()*.07);S.add(s);this.motes.push(s);
     }}
  }
  async applyHybrid(base='./assets3d/tex/'){
    const L=new THREE.TextureLoader();
    const load=(n,data=false)=>new Promise(res=>L.load(base+n+'.png',t=>{
      t.colorSpace=data?THREE.NoColorSpace:THREE.SRGBColorSpace;t.anisotropy=4;res(t);
    },undefined,()=>res(null)));
    this.hybridApplied=[];
    const T={};
    await Promise.all([['colonnade_ground'],['colonnade_ground_normal',1],
        ['colonnade_stone'],['colonnade_stone_normal',1],['break_face'],['break_face_normal',1],
        ['rubble_ground'],['rubble_ground_normal',1],['backdrop_colonnade']]
      .map(async([n,d])=>T[n]=await load(n,!!d)));
    // R3 通用贴皮器：clone 独立 repeat，压灰防过曝，法线共用 UV/镜像
    const skin=(meshes,tex,norm,ns,color,rx=2,ry=2)=>{
      if(!tex)return false;
      for(const m of meshes){
        const mp=tex.clone();mp.wrapS=mp.wrapT=THREE.MirroredRepeatWrapping;
        mp.repeat.set(rx,ry);mp.needsUpdate=true;
        m.material.map=mp;m.material.color.set(color);
        if(norm){const nm=norm.clone();nm.wrapS=nm.wrapT=THREE.MirroredRepeatWrapping;
          nm.repeat.set(rx,ry);nm.needsUpdate=true;
          m.material.normalMap=nm;m.material.normalScale=new THREE.Vector2(ns,ns);}
        m.material.needsUpdate=true;
      }
      return true;
    };
    if(T.colonnade_ground){
      for(const t of [T.colonnade_ground,T.colonnade_ground_normal])
        if(t){t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;}
      this.floorMesh.material.map=T.colonnade_ground;this.floorMesh.material.color.set('#8b94a6');
      if(T.colonnade_ground_normal){this.floorMesh.material.normalMap=T.colonnade_ground_normal;
        this.floorMesh.material.normalScale=new THREE.Vector2(1.6,1.6);}
      this.floorMesh.material.needsUpdate=true;
      this.hybridApplied.push('ground');
    }
    // R3 远景盘贴碎石荒原纹（压暗一号读色差，世界顶视投影已在 build 铺好）
    if(T.rubble_ground){
      const mp=T.rubble_ground.clone();mp.wrapS=mp.wrapT=THREE.MirroredRepeatWrapping;mp.needsUpdate=true;
      this.farMesh.material.map=mp;this.farMesh.material.color.set('#525c70');
      if(T.rubble_ground_normal){const nm=T.rubble_ground_normal.clone();
        nm.wrapS=nm.wrapT=THREE.MirroredRepeatWrapping;nm.needsUpdate=true;
        this.farMesh.material.normalMap=nm;this.farMesh.material.normalScale=new THREE.Vector2(2.0,2.0);}
      this.farMesh.material.needsUpdate=true;
    }
    // 断柱/残冠/柱头/横卧柱段：环纹风化柱材（横向 2 连）
    if(skin(this.pillarMeshes,T.colonnade_stone,T.colonnade_stone_normal,1.6,'#8a96b8',2,2))
      this.hybridApplied.push('stone');
    // 断口截面（柱顶面/横卧柱两端/柱脚碎石）
    if(skin(this.breakMeshes,T.break_face,T.break_face_normal,2.0,'#93a0b8',1,1))
      this.hybridApplied.push('break_face');
    // 乱石堆（顶视投影同地面比例尺，repeat 1 即可）
    if(skin(this.pileMeshes,T.rubble_ground,T.rubble_ground_normal,2.2,'#7d889e',1,1))
      this.hybridApplied.push('piles');
    // 远景剪影带：同族纹理压到剪影色（读层次不读细节）
    if(T.rubble_ground||T.colonnade_stone){
      for(const m of this.bandMeshes){
        const cyl=m.geometry.type==='CylinderGeometry';
        const src=cyl?T.colonnade_stone:T.rubble_ground;
        if(!src)continue;
        const mp=src.clone();mp.wrapS=mp.wrapT=THREE.MirroredRepeatWrapping;
        mp.repeat.set(cyl?2:1,cyl?2:1);mp.needsUpdate=true;
        m.material.map=mp;
        m.material.color.set(cyl?'#33405c':'#2c3648'); // 剪影化压暗
        m.material.needsUpdate=true;
      }
      this.hybridApplied.push('band');
    }
    if(T.backdrop_colonnade){
      // R3 专属背景板：废墟旷野+残柱剪影地平线（不再复用圣殿星空板）
      const bc=document.createElement('canvas');bc.width=2048;bc.height=768;
      const bg=bc.getContext('2d');bg.filter='brightness(1.4) saturate(1.1)';
      bg.drawImage(T.backdrop_colonnade.image,0,0);
      const bt=new THREE.CanvasTexture(bc);bt.colorSpace=THREE.SRGBColorSpace;bt.anisotropy=4;
      bt.wrapS=THREE.MirroredRepeatWrapping;
      const {continuousBackdrop}=await import('dula-assets/lib/craft3d/continuous-backdrop.js');
      this.backdrop=continuousBackdrop(bt,{center:[0,4,-6],cylinderRadius:60,
        cylinderHeight:30,radius:150,repeat:2,offset:.5,zenith:'#0d1430'});
      this.scene.add(this.backdrop);
      // scene.background：采样背景板实际像素的渐变兜底（纯色会露平板边界）
      const sample=(()=>{const c=document.createElement('canvas');c.width=64;c.height=48;
        const g=c.getContext('2d',{willReadFrequently:true});
        g.drawImage(T.backdrop_colonnade.image,0,0,2048,768,0,0,64,48);
        const d=g.getImageData(0,0,64,48).data;
        return row=>{let r=0,gg=0,b=0;for(let x=0;x<64;x++){const i=(row*64+x)*4;r+=d[i];gg+=d[i+1];b+=d[i+2];}
          return `rgb(${r/64|0},${gg/64|0},${b/64|0})`;};})();
      const top=sample(2),mid=sample(22),low=sample(34);
      this.scene.background=canvasTex(2,256,(c,w,h)=>{
        const g=c.createLinearGradient(0,0,0,h);
        g.addColorStop(0,top);g.addColorStop(.45,mid);g.addColorStop(.75,low);g.addColorStop(1,'#060a16');
        c.fillStyle=g;c.fillRect(0,0,w,h);
      });
      this.hybridApplied.push('backdrop');
    }
    return this.hybridApplied;
  }
  update(t){
    // 流星：周期性划过（每颗独立周期，纯 t）
    for(const m of this.meteors){
      const u=m.userData,ph=((t+u.off)%u.period)/u.period;
      const active=ph<.18,q=ph/.18;
      m.visible=active;
      if(active){
        m.position.set(u.x0+q*u.sp*2.2,u.y-q*u.sp*.55,u.z);
        m.material.opacity=.9*Math.sin(Math.PI*q);
      }
    }
    for(const s of this.motes){
      const u=s.userData;
      s.position.set(u.x+.3*Math.sin(t*u.f+u.ph),u.y+.25*Math.sin(t*u.f*.7+u.ph*2),u.z+.3*Math.cos(t*u.f*.8+u.ph));
      s.material.opacity=.25+.35*Math.max(0,Math.sin(t*1.1+u.ph));
    }
  }
}
