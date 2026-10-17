// 《星屑战壳》OP — 云上灶膛火山口（EmberCalderaScene）：环形岩壁+岩浆槽=灶膛火光+
// 悬浮火星+远处云海（大釜的登场场景，暖色调）。世界布局与圣殿一致（地面 y=0，
// 表演走廊 |x|<5, z>0 无遮挡），供跨场景跳切硬切换背景。程序化几何+applyHybrid
// 预留（纹理缺失静默回退），update(t) 纯 (t,state)。
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
function glowTexture(inner='#fff2d0',mid='rgba(255,170,90,.85)',outer='rgba(255,140,60,0)'){
  return canvasTex(64,64,(c)=>{
    const g=c.createRadialGradient(32,32,2,32,32,32);
    g.addColorStop(0,inner);g.addColorStop(.4,mid);g.addColorStop(1,outer);
    c.fillStyle=g;c.fillRect(0,0,64,64);
  });
}

export class EmberCalderaScene extends SceneBase{
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#140a08');
    S.fog=new THREE.Fog('#1a0e08',24,95);
    // 暖色双色光：岩浆暖主光（点光 update 闪烁）+ 冷 rim 补轮廓
    // R3：岩浆暖光做主光上调（夜景偏暗吞纹理）
    S.add(new THREE.HemisphereLight(0x5a3826,0x160c08,1.05));
    this.magmaLight=new THREE.PointLight(0xff7a30,72,56,1.7);
    this.magmaLight.position.set(0,1.2,-8);S.add(this.magmaLight);
    const rim=new THREE.DirectionalLight(0x5a6a8a,.4);
    rim.position.set(-6,10,-14);rim.castShadow=true;rim.shadow.mapSize.set(2048,2048);
    Object.assign(rim.shadow.camera,{left:-16,right:16,top:12,bottom:-4,far:60});
    rim.shadow.bias=-.0004;S.add(rim);
    const fill=new THREE.DirectionalLight(0xffb070,1.2);fill.position.set(0,4,9);S.add(fill);

    // ── 地面：暗色玄武岩（hybrid 换 AI 纹理）──
    const floor=this.floorMesh=new THREE.Mesh(new THREE.CircleGeometry(34,64),toon('#261d18'));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;S.add(floor);
    const far=this.farMesh=new THREE.Mesh(new THREE.CircleGeometry(100,48),toon('#181009'));
    far.rotation.x=-Math.PI/2;far.position.y=-.02;S.add(far);
    S.updateMatrixWorld(true);
    planarUVWorld(this.floorMesh,.11);planarUVWorld(far,.11);

    // ── 岩浆槽（灶膛火光：地面发光槽道，加色；update 呼吸）──
    this.magma=[];
    const magmaMat=()=>new THREE.MeshBasicMaterial({color:'#ff8a3a',transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
    // 主槽：表演区后方弧线两条
    for(const [r,arc,rot] of [[6.5,2.6,2.9],[9.5,2.2,3.4]]){
      const m=new THREE.Mesh(new THREE.TorusGeometry(r,.10,8,48,arc),magmaMat());
      m.rotation.x=-Math.PI/2;m.rotation.z=rot;m.position.set(0,.03,-4);S.add(m);this.magma.push(m);
    }
    // 裂纹支槽
    const rr=lcg(83);
    for(let i=0;i<7;i++){
      const a=rr()*TAU,r0=5+rr()*8;
      const m=new THREE.Mesh(new THREE.PlaneGeometry(.14+rr()*.1,1.2+rr()*1.6),magmaMat());
      m.rotation.x=-Math.PI/2;m.rotation.z=a;
      m.position.set(Math.cos(a)*r0,.025,-4+Math.sin(a)*r0);S.add(m);this.magma.push(m);
    }
    // 岩浆潭（中心后方，灶膛本体；R3 hybrid 换岩浆纹理+emissive 脉动）
    const pool=new THREE.Mesh(new THREE.CircleGeometry(3.2,32),
      new THREE.MeshBasicMaterial({color:'#ff9a40'}));
    pool.rotation.x=-Math.PI/2;pool.position.set(0,.02,-12);S.add(pool);this.magmaPool=pool;
    planarUVWorld(pool,.35); // 世界顶视投影：裂纹比例尺不随圆盘 UV 拉花
    const poolGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
    poolGlow.scale.setScalar(9);poolGlow.position.set(0,1.2,-12);S.add(poolGlow);this.poolGlow=poolGlow;

    // ── 环形岩壁三层（R3：近景柱状节理岩壁 + 中景 + 远景剪影，全在背景筒 r60 内）──
    const rock='#33241c',rockD='#241a12';
    this.wallNear=[];this.wallMid=[];this.wallFar=[];
    for(let i=0;i<18;i++){
      const a=i/18*TAU;
      if(Math.abs(a-Math.PI/2)<.5)continue; // +z 方向开口（机位走廊）
      const r=17+lcg(91+i)()*2,h=3.5+Math.sin(i*2.7)*1.8+((i*13)%5)*.6;
      const m=new THREE.Mesh(new THREE.CylinderGeometry(1.6+(i%3)*.5,2.4+(i%3)*.6,h,7),toon(i%2?rock:rockD));
      m.position.set(Math.cos(a)*r,h/2-.2,-6+Math.sin(a)*r);
      m.rotation.y=a*.7;m.castShadow=m.receiveShadow=true;S.add(m);this.wallNear.push(m);
    }
    {const rrW=lcg(139); // 中景层 r26-31：更大更暗的岩壁块
     for(let i=0;i<12;i++){
       const a=i/12*TAU+rrW()*.3;
       if(Math.abs(a-Math.PI/2)<.42)continue;
       const r=26+rrW()*5,h=5+rrW()*4.5,rad=2.6+rrW()*1.6;
       const m=new THREE.Mesh(new THREE.CylinderGeometry(rad*.8,rad*1.15,h,7),toon(rockD));
       m.position.set(Math.cos(a)*r,h/2-.4,-6+Math.sin(a)*r);
       m.rotation.y=rrW()*TAU;S.add(m);this.wallMid.push(m);
     }
     // 远景层 r40-52：火山锥剪影（锥台，雾糊边）
     for(let i=0;i<9;i++){
       const a=i/9*TAU+.2+rrW()*.25;
       if(Math.abs(a-Math.PI/2)<.5)continue;
       const r=40+rrW()*12,h=7+rrW()*7,rad=4.5+rrW()*3;
       const m=new THREE.Mesh(new THREE.CylinderGeometry(rad*.25,rad,h,8),toon('#1c110a'));
       m.position.set(Math.cos(a)*r,h/2-.5,-6+Math.sin(a)*r);
       S.add(m);this.wallFar.push(m);
     }}

    // ── 悬浮火星（上升余烬，纯 t；R3 加密：全場 96 + 岩浆潭上空集群 24）──
    this.embers=[];
    {const tex=glowTexture();
     for(let i=0;i<96;i++){
       const a=rr()*TAU,r=1.5+rr()*12;
       const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));
       s.userData={x:Math.cos(a)*r,z:-6+Math.sin(a)*r,h:3.5+rr()*4,ph:rr()*TAU,f:.25+rr()*.5};
       s.scale.setScalar(.04+rr()*.08);S.add(s);this.embers.push(s);
     }
     for(let i=0;i<24;i++){ // 潭口集群：从岩浆面腾起
       const a=rr()*TAU,r=rr()*2.8;
       const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));
       s.userData={x:Math.cos(a)*r,z:-12+Math.sin(a)*r,h:5+rr()*4,ph:rr()*TAU,f:.35+rr()*.6};
       s.scale.setScalar(.05+rr()*.09);S.add(s);this.embers.push(s);
     }}
    // 远处云海（地平线上的暖色软光带）
    this.clouds=[];
    for(let i=0;i<8;i++){
      const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture('rgba(255,220,180,1)','rgba(255,170,110,.5)','rgba(255,150,90,0)'),
        transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false}));
      const a=-.6+i*.18;
      s.position.set(Math.sin(a)*40,3.5+((i*7)%3),-6-Math.cos(a)*38);
      s.scale.set(16+i%3*4,3.5,1);S.add(s);this.clouds.push(s);
    }
  }
  async applyHybrid(base='./assets3d/tex/'){
    const L=new THREE.TextureLoader();
    const load=(n,data=false)=>new Promise(res=>L.load(base+n+'.png',t=>{
      t.colorSpace=data?THREE.NoColorSpace:THREE.SRGBColorSpace;t.anisotropy=4;res(t);
    },undefined,()=>res(null)));
    this.hybridApplied=[];
    const T={};
    await Promise.all([['caldera_ground'],['caldera_ground_normal',1],
        ['basalt_wall'],['basalt_wall_normal',1],['scorched_ground'],['scorched_ground_normal',1],
        ['magma'],['magma_normal',1],['backdrop_caldera']]
      .map(async([n,d])=>T[n]=await load(n,!!d)));
    const skin=(meshes,tex,norm,ns,color,rx,ry)=>{
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
    if(T.caldera_ground){
      for(const t of [T.caldera_ground,T.caldera_ground_normal])
        if(t){t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;}
      this.floorMesh.material.map=T.caldera_ground;this.floorMesh.material.color.set('#98857a');
      if(T.caldera_ground_normal){this.floorMesh.material.normalMap=T.caldera_ground_normal;
        this.floorMesh.material.normalScale=new THREE.Vector2(1.6,1.6);}
      this.floorMesh.material.needsUpdate=true;
      this.hybridApplied.push('ground');
    }
    // R3 远景盘贴焦土纹（压暗一号；世界顶视投影已在 build 铺好）
    if(T.scorched_ground){
      const mp=T.scorched_ground.clone();mp.wrapS=mp.wrapT=THREE.MirroredRepeatWrapping;mp.needsUpdate=true;
      this.farMesh.material.map=mp;this.farMesh.material.color.set('#5a4638');
      if(T.scorched_ground_normal){const nm=T.scorched_ground_normal.clone();
        nm.wrapS=nm.wrapT=THREE.MirroredRepeatWrapping;nm.needsUpdate=true;
        this.farMesh.material.normalMap=nm;this.farMesh.material.normalScale=new THREE.Vector2(2.0,2.0);}
      this.farMesh.material.needsUpdate=true;
      this.hybridApplied.push('scorched');
    }
    // R3 岩壁三层：柱状节理玄武岩（近/中读细节，远景压成剪影色）
    if(skin(this.wallNear,T.basalt_wall,T.basalt_wall_normal,2.0,'#ab9484',3,2))this.hybridApplied.push('wall_near');
    if(skin(this.wallMid,T.basalt_wall,T.basalt_wall_normal,2.0,'#6b584a',3,2))this.hybridApplied.push('wall_mid');
    if(skin(this.wallFar,T.basalt_wall,T.basalt_wall_normal,2.0,'#31241a',2,2))this.hybridApplied.push('wall_far');
    // R3 岩浆潭：岩浆表面纹作 map+emissiveMap（亮橙裂纹黑底），update 脉动 emissiveIntensity
    if(T.magma){
      T.magma.wrapS=T.magma.wrapT=THREE.MirroredRepeatWrapping;
      const mat=new THREE.MeshToonMaterial({map:T.magma,color:'#ffffff',
        emissive:new THREE.Color('#ff6a22'),emissiveMap:T.magma,emissiveIntensity:1.2});
      if(T.magma_normal){T.magma_normal.wrapS=T.magma_normal.wrapT=THREE.MirroredRepeatWrapping;
        mat.normalMap=T.magma_normal;mat.normalScale=new THREE.Vector2(1.8,1.8);}
      this.magmaPool.material.dispose();
      this.magmaPool.material=mat;
      this.hybridApplied.push('magma');
    }
    if(T.backdrop_caldera){
      // R3 专属背景板：火山群剪影+烟云红光天（不再复用圣殿星空板）
      const bc=document.createElement('canvas');bc.width=2048;bc.height=768;
      const bg=bc.getContext('2d');bg.filter='brightness(1.25) saturate(1.15)';
      bg.drawImage(T.backdrop_caldera.image,0,0);
      const bt=new THREE.CanvasTexture(bc);bt.colorSpace=THREE.SRGBColorSpace;bt.anisotropy=4;
      bt.wrapS=THREE.MirroredRepeatWrapping;
      const {continuousBackdrop}=await import('dula-assets/lib/craft3d/continuous-backdrop.js');
      this.backdrop=continuousBackdrop(bt,{center:[0,4,-6],cylinderRadius:60,
        cylinderHeight:30,radius:150,repeat:2,offset:.5,zenith:'#2a140c'});
      this.scene.add(this.backdrop);
      // scene.background：采样背景板实际像素的渐变兜底
      const sample=(()=>{const c=document.createElement('canvas');c.width=64;c.height=48;
        const g=c.getContext('2d',{willReadFrequently:true});
        g.drawImage(T.backdrop_caldera.image,0,0,2048,768,0,0,64,48);
        const d=g.getImageData(0,0,64,48).data;
        return row=>{let r=0,gg=0,b=0;for(let x=0;x<64;x++){const i=(row*64+x)*4;r+=d[i];gg+=d[i+1];b+=d[i+2];}
          return `rgb(${r/64|0},${gg/64|0},${b/64|0})`;};})();
      const top=sample(2),mid=sample(22),low=sample(34);
      this.scene.background=canvasTex(2,256,(c,w,h)=>{
        const g=c.createLinearGradient(0,0,0,h);
        g.addColorStop(0,top);g.addColorStop(.45,mid);g.addColorStop(.75,low);g.addColorStop(1,'#140a08');
        c.fillStyle=g;c.fillRect(0,0,w,h);
      });
      this.hybridApplied.push('backdrop');
    }
    return this.hybridApplied;
  }
  update(t){
    // 岩浆呼吸 + 灶膛光闪烁（纯 t）；R3 岩浆潭 emissive 脉动
    this.magmaLight.intensity=72*(1+.10*Math.sin(t*6.3)+.06*Math.sin(t*11.7));
    this.magma.forEach((m,i)=>{m.material.opacity=.65+.3*Math.sin(t*1.8+i*1.3);});
    if(this.magmaPool.material.emissiveMap)
      this.magmaPool.material.emissiveIntensity=1.15+.45*Math.sin(t*2.0)+.15*Math.sin(t*5.3);
    this.poolGlow.material.opacity=.42+.14*Math.sin(t*2.2);
    // 火星上升循环（y 从地面升起，到顶回落淡出）
    for(const s of this.embers){
      const u=s.userData,ph=((t*u.f+u.ph)%1+1)%1;
      s.position.set(u.x+.4*Math.sin(t*.9+u.ph),ph*u.h,u.z+.3*Math.cos(t*.7+u.ph));
      s.material.opacity=.55*(1-ph)*Math.min(1,ph*6);
    }
    for(const [i,c] of this.clouds.entries())
      c.material.opacity=.13+.05*Math.sin(t*.5+i);
  }
}
