// 《借走月光的女孩》S04 月亮宫殿（占位版）。
// 附录 B：银白纱幕自高空垂落、破碎王座、镜面地板、大片负空间；冷银顶光；
// 泪碎（m49 TEAR_BREAK≈369s）时中心向外柔和渐亮。均为 t 纯函数。
import * as THREE from 'three';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';
import {texLoader,skinMesh,inst} from './hybrid.js';

const ramp=coolShadowRamp();
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});

export class MoonPalaceScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='MoonPalaceScene';}
  build(){
    const S=this.scene;
    S.background=new THREE.Color('#0c1018');
    S.fog=new THREE.Fog('#0c1018',25,90);

    // 冷银顶光（王座上方）+ 极弱环境，负空间留黑；穹顶冷银反光补光（顶盖纹理吃光）
    const top=new THREE.SpotLight(0xd8e4f4,60,50,.5,.45);
    top.position.set(0,18,-7);top.target.position.set(0,0,-7);S.add(top,top.target);this.top=top;
    S.add(new THREE.HemisphereLight(0x3c4a60,0x0c0e14,.62));this.hemi=S.children[S.children.length-1];
    const domeGlow=new THREE.PointLight(0xa8bcd8,20,30);domeGlow.position.set(0,15,-7);S.add(domeGlow);this.domeGlow=domeGlow;

    // 镜面地板：深色高光圆盘（占位：高光 toon + 低透明度王座假倒影片）
    const floor=new THREE.Mesh(new THREE.CircleGeometry(22,48).rotateX(-Math.PI/2),
      new THREE.MeshToonMaterial({color:'#2c3644',gradientMap:ramp}));
    floor.name='mirrorFloor';S.add(floor);this.floor=floor;
    // 穹顶（有顶内景纪律：半球壳 BackSide 带纹理几何，冷银顶光自穹顶泻下；仰拍不露平板边界）。
    // Basic 自发光读感：BackSide 内翻法线吃 hemi 的 groundColor≈黑（实测翻车），穹顶按
    // "微弱自辉冰晶拱顶"处理，纹理可见性不依赖灯光角度。
    const dome=new THREE.Mesh(new THREE.SphereGeometry(26,48,24,0,Math.PI*2,0,Math.PI/2),
      new THREE.MeshBasicMaterial({color:'#182230',side:THREE.BackSide}));
    dome.name='dome';S.add(dome);this.dome=dome;
    const sheen=new THREE.Mesh(new THREE.CircleGeometry(9,40).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({color:'#9fb8d8',transparent:true,opacity:.10,depthWrite:false}));
    sheen.position.y=.01;S.add(sheen);this.sheen=sheen;

    // 银白纱幕：八幅高空垂落的半透明长幕，环列成殿
    this.veils=[];
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2+.4,r=13;
      const v=new THREE.Mesh(new THREE.PlaneGeometry(3.2,15),
        new THREE.MeshBasicMaterial({color:'#cfdcee',transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
      v.position.set(Math.cos(a)*r,8,Math.sin(a)*r-4);v.rotation.y=-a+Math.PI/2;
      S.add(v);this.veils.push({v,phase:i*.9});
    }

    // 破碎王座（0,0,-9）：高背主座 + 倾塌侧翼 + 散落碎块
    const throne=new THREE.Group();throne.name='throne';throne.position.set(0,0,-9);
    const seat=new THREE.Mesh(new THREE.BoxGeometry(1.8,.9,1.4),toon('#aeb9cc'));seat.position.y=.45;throne.add(seat);
    const backrest=new THREE.Mesh(new THREE.BoxGeometry(1.8,3.4,.4),toon('#bcc7da'));backrest.position.set(0,2.2,-.6);throne.add(backrest);
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.3,1.2,6),toon('#cfd8ea'));spike.position.set(0,4.4,-.6);throne.add(spike);
    const wingL=new THREE.Mesh(new THREE.BoxGeometry(.5,2.6,1.1),toon('#a3afc2'));
    wingL.position.set(-1.5,1.1,-.3);wingL.rotation.z=.5;throne.add(wingL); // 倾塌
    const wingR=new THREE.Mesh(new THREE.BoxGeometry(.5,2.0,1.0),toon('#a3afc2'));
    wingR.position.set(1.6,.8,-.2);wingR.rotation.z=-.9;wingR.rotation.x=.3;throne.add(wingR);
    this.throneParts=[seat,backrest,spike,wingL,wingR];
    for(let i=0;i<5;i++){
      const shard=new THREE.Mesh(new THREE.TetrahedronGeometry(.35),toon('#93a1b8'));
      shard.position.set(-2.4+i*1.1,.18,1.2+(i%2)*.9);shard.rotation.set(i,i*2.1,i*.7);throne.add(shard);
      this.throneParts.push(shard);
    }
    S.add(throne);this.throne=throne;
    // 王座在镜面地板上的假倒影（占位：压扁半透明副本）
    const refl=new THREE.Mesh(new THREE.PlaneGeometry(3.5,4.5).rotateX(Math.PI/2),
      new THREE.MeshBasicMaterial({color:'#7a8ca8',transparent:true,opacity:.12,depthWrite:false}));
    refl.position.set(0,.015,-8.2);S.add(refl);

    // 低密度光雾（银蓝，占位大面片）+ 悬浮银粉
    const n=160,g=new THREE.BufferGeometry(),pos=new Float32Array(n*3);
    for(let i=0;i<n;i++){let sd=i*2654435761+12345;const r=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
      pos[i*3]=-12+r()*24;pos[i*3+1]=r()*12;pos[i*3+2]=-16+r()*20;}
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    this.dust=new THREE.Points(g,new THREE.PointsMaterial({color:'#bcd0e8',size:.06,transparent:true,opacity:.5}));
    this.dust.userData.base=pos.slice(); // 基准位置：update 只从这里派生
    this.dust.visible=false;S.add(this.dust);
  }
  // craft3d-hybrid（P3）：有顶内景纹理注入——镜面地板/冰晶穹顶与王座/纱幕绸面。
  // 穹顶本身=带纹理几何（半球壳 BackSide）；冷银顶光按顶光方向布置（占位灯光不变）。
  async applyHybrid(base='./assets3d/tex/'){
    const load=texLoader(base);
    const names=['mirror_floor','mirror_floor_normal','ice_crystal','ice_crystal_normal',
      'veil_silk','veil_silk_normal'];
    const T={};await Promise.all(names.map(async n=>T[n]=await load(n)));
    this.hybridApplied=[];
    if(T.mirror_floor){
      // 镜面地板：近水平面世界顶视投影（.15≈6.7m 一砖）；法线最弱档保"镜面"读感
      skinMesh(this.floor,T.mirror_floor,{color:'#96a2b6',normal:T.mirror_floor_normal,normalScale:.4,worldUV:.15});
      this.hybridApplied.push('mirror_floor');
    }
    if(T.ice_crystal){
      // 穹顶自辉冰晶（Basic：map×暗色，微弱均匀的结晶光泽）
      this.dome.material.map=inst(T.ice_crystal,10,5);this.dome.material.color.set('#33414f');
      this.dome.material.needsUpdate=true;
      for(const m of this.throneParts)
        skinMesh(m,T.ice_crystal,{repeat:[1,1],color:'#b4c0d4',normal:T.ice_crystal_normal,normalScale:.7});
      this.hybridApplied.push('ice_crystal');
    }
    if(T.veil_silk){
      // 纱幕绸面：半透明 Basic 面片贴织物纹理，透明度仍由 update 剧情驱动
      for(const {v} of this.veils){
        v.material.map=inst(T.veil_silk,1,4);v.material.color.set('#c2cede');v.material.needsUpdate=true;
      }
      this.hybridApplied.push('veil_silk');
    }
    return this.hybridApplied;
  }
  update(t){
    // P4 灯光调度（纯 t）：月光逐缕熄灭（MOONLIGHT_DIM@317 → m44 宫殿失光=单一冷顶光+大片阴影）
    const dimK=t<317?1:Math.max(.22,1-(t-317)/9);
    // 泪碎回暖（TEAR_BREAK@369）：自中心向外柔和渐亮
    const glow=t<369?0:Math.min(1,(t-369)/6);
    this.top.intensity=60*dimK+95*glow;
    this.hemi.intensity=.62*(.45+.55*dimK)+.55*glow;
    this.domeGlow.intensity=20*dimK+25*glow;
    this.sheen.material.opacity=.10*dimK+.25*glow;
    // 纱幕：微光随剧情渐暗（m43-m44）；泪碎后逐层依次点亮（i*.45 间隔由内向外）
    const dim=t<325?1:Math.max(.4,1-(t-325)*.02);
    for(const [vi,{v,phase}] of this.veils.entries()){
      const lit=glow>0?Math.min(1,Math.max(0,(t-369-vi*.45)/1.6)):0;
      const le=lit*lit*(3-2*lit);
      v.material.opacity=Math.min(.35,.16*dim*dimK*(1+.15*Math.sin(t*.4+phase))+.16*le);
      v.rotation.x=.02*Math.sin(t*.3+phase);
    }
    // 悬浮银粉：失光段（m44 起）缓沉加速、亮度随月光衰减；泪碎后重新受光
    this.dust.visible=true;
    this.dust.material.opacity=.5*(.4+.6*dimK)+.25*glow;
    const p=this.dust.geometry.attributes.position,base=this.dust.userData.base;
    for(let i=0;i<p.count;i++){ // 银粉缓沉（取模回绕，纯 t；失光后加速=分段积分距离，防跳变）
      const dist=(Math.min(t,325)*.05+Math.max(0,t-325)*.14)*(1+(i%3));
      const y=(base[i*3+1]-dist)%12;
      p.setY(i,y<0?y+12:y);
    }
    p.needsUpdate=true;
  }
}
