// 《迟到的一拍》— 社区剧院·暖暗场。观众席暗、舞台亮；幕布开闭是节拍装置。
// 积木口径见 dula-skills/stage-musical/SKILL.md：板条顺台口 / 幕布几何褶皱+顶点色 /
// 脚灯亮壳不逐颗点灯 / 追光=注意力导演 / 观众席剪影近黑。全场景 MeshToonMaterial
// 共享 4 阶冷阴影 ramp（craft3d/look.js coolShadowRamp）。横屏 1280×720。
// 坐标约定：台唇平面 z=0，舞台向 −z 纵深，观众席在 +z；台面高 0.6m。
import * as THREE from 'three';
import {coolShadowRamp} from 'dula-assets/lib/craft3d/look.js';

const ramp=coolShadowRamp();
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});
const basic=c=>new THREE.MeshBasicMaterial({color:c});

function canvasTex(w,h,draw){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  draw(canvas.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
// 木地板：板条顺台口（纹理横线=板缝平行台唇线），镜像平铺免接缝
function woodTex(){
  const t=canvasTex(256,256,(c,w,h)=>{
    c.fillStyle='#7d5c3e';c.fillRect(0,0,w,h);
    let sd=11;const r=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
    for(let i=0;i<1800;i++){
      const v=r();c.fillStyle=v>.5?`rgba(255,230,200,${.03+r()*.06})`:`rgba(40,26,16,${.04+r()*.07})`;
      c.fillRect(r()*w,r()*h,1+r()*3,1+r()*2);
    }
    c.strokeStyle='rgba(30,20,12,.5)';c.lineWidth=1.6; // 板缝：横线=顺台口
    for(let y=0;y<=h;y+=32){c.beginPath();c.moveTo(0,y+.5);c.lineTo(w,y+.5);c.stroke();}
    c.strokeStyle='rgba(30,20,12,.35)'; // 板条端部错缝
    for(let y=0;y<h;y+=32){let x=((y/32)%2)*128;for(;x<w;x+=128){c.beginPath();c.moveTo(x+.5,y);c.lineTo(x+.5,y+32);c.stroke();}}
  });
  t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;return t;
}
// 幕布：正弦几何褶皱 + 顶点色深浅（褶谷深褶峰浅）；两片对开
function curtainMesh(w,h){
  const geo=new THREE.PlaneGeometry(w,h,48,24);
  const pos=geo.attributes.position,col=[];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i);
    const z=Math.sin(x*7.5)*.09+Math.sin(x*17.3+1.2)*.03; // 主褶+细纹
    pos.setZ(i,z);
    const v=.5+.5*Math.sin(x*7.5); // 顶点色随主褶明暗
    col.push(.35+.25*v,.06+.05*v,.07+.05*v);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo,new THREE.MeshToonMaterial({vertexColors:true,gradientMap:ramp,side:THREE.DoubleSide}));
}

export class TheaterStageScene{
  constructor(){this.scene=new THREE.Scene();this.scene.name='TheaterStageScene';}
  build(){
    const S=this.scene;
    // 暖暗场：观众席全暗，环境光只给一点点暖底
    S.background=new THREE.Color('#0e0b09');
    S.fog=new THREE.Fog('#0e0b09',14,40); // 观众席深处没入黑
    S.add(new THREE.AmbientLight(0x2a1e18,.9)); // 暖底，极弱
    // 舞台正面主光（面光桥）：暖白，自上而下
    const face=new THREE.DirectionalLight(0xffe8c8,1.6);face.position.set(0,6,6);S.add(face);
    const faceFill=new THREE.DirectionalLight(0xffd9b0,.5);faceFill.position.set(-4,3,5);S.add(faceFill);
    // 轮廓光：幕后天桥上向下往台口的暖边光（演员与幕布的分离层，暗场必须）
    const rim=new THREE.DirectionalLight(0xffe2bb,.85);rim.position.set(0,5.5,-7);S.add(rim);

    const box=(parent,n,p,s,c,opts={})=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(...s),opts.mat??toon(c));
      m.name=n;m.position.set(...p);m.castShadow=opts.shadow??false;m.receiveShadow=true;
      if(opts.ry)m.rotation.y=opts.ry;parent.add(m);return m;
    };

    // ── 台体：木地板台面 + 台唇 + 台裙 ──
    const wood=woodTex();
    const stageMat=new THREE.MeshToonMaterial({color:'#a98a68',gradientMap:ramp,map:wood});
    this.stage=box(S,'stage',[0,.3,-3],[10,.6,6],null,{mat:stageMat,shadow:true});
    box(S,'apron_lip',[0,.64,-.02],[10.2,.08,.14],'#c9a476',{shadow:true}); // 台唇沿口
    box(S,'stage_skirt',[0,.28,.06],[10.2,.56,.10],'#241a16'); // 台裙（台体正面深一号）
    // 台唇外沿=观众席地面（暗）
    box(S,'house_floor',[0,-.02,4.5],[14,.06,10],'#161110');

    // ── 台口框（proscenium）：两侧柱 + 顶梁 + 檐幕 ──
    box(S,'pros_l',[-5.15,2.7,-.4],[.5,4.8,.6],'#3a2320',{shadow:true});
    box(S,'pros_r',[5.15,2.7,-.4],[.5,4.8,.6],'#3a2320',{shadow:true});
    box(S,'pros_top',[0,5.0,-.4],[11,1.0,.6],'#3a2320');
    const valance=curtainMesh(10.4,1.2);valance.position.set(0,4.15,-.75);S.add(valance); // 檐幕（不动）

    // ── 主幕：左右两片对开（curtainK 0=闭 1=开，纯时间函数驱动）──
    this.curtainL=curtainMesh(5.3,4.3);this.curtainL.position.set(-2.62,2.75,-5.2);S.add(this.curtainL);
    this.curtainR=curtainMesh(5.3,4.3);this.curtainR.position.set(2.62,2.75,-5.2);S.add(this.curtainR);
    this.curtainTravel=4.6; // 全开时各向外滑 4.6m（藏进侧翼）
    // 幕后墙（开幕后兜底，别露虚空）
    box(S,'back_wall',[0,2.7,-6.2],[11,5.4,.3],'#1c1414');

    // ── 侧翼幕：左右各两片，斜排出上下场门（门缝留到 z -2.2..-3.2，灯控台在缝后隐约可见）──
    for(const sx of [-1,1]){
      for(const [j,z] of [[0,-1.4],[1,-4.0]]){
        const wing=curtainMesh(1.6,4.0);wing.name=`wing_${sx>0?'R':'L'}_${j}`;
        wing.position.set(sx*4.45,2.6,z);wing.rotation.y=-sx*.5;S.add(wing);
      }
    }

    // ── 脚灯排：台唇上一排亮壳朝上（视觉上只是亮壳，照明归面光/追光）──
    this.footlights=[];
    for(let i=0;i<9;i++){
      const shell=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8,0,Math.PI*2,0,Math.PI/2),
        new THREE.MeshBasicMaterial({color:'#ffd9a0'}));
      shell.position.set(-4+i,0.70,-.12);shell.rotation.x=-.35;S.add(shell);this.footlights.push(shell);
    }
    // 脚灯对演员的下巴补光：一盏朝上弱光合并表达（不逐颗点灯）
    const footGlow=new THREE.SpotLight(0xffc890,.8,9,.9,.6,1.2);
    footGlow.position.set(0,.75,.4);footGlow.target.position.set(0,2.2,-3);
    S.add(footGlow);S.add(footGlow.target);this.footGlow=footGlow;

    // ── 追光×2：一主一备。SpotLight + 假光斑地贴 + 体积感锥片（additive 薄片）──
    this.spots=[];
    for(const [name,fx] of [['main',-2.6],['backup',2.6]]){
      const sp=new THREE.SpotLight(0xfff2dc,0,14,.24,.42,1.1);
      sp.position.set(fx,5.6,2.2);S.add(sp);S.add(sp.target);
      // 假光斑：落在台面/演员处的亮圆片（读感主角，真阴影交给 SpotLight）
      const blob=new THREE.Mesh(new THREE.CircleGeometry(.55,24),
        new THREE.MeshBasicMaterial({color:'#fff3dd',transparent:true,opacity:0,depthWrite:false}));
      blob.rotation.x=-Math.PI/2;S.add(blob);
      // 锥片：灯位→目标的半透明 additive 锥（体积光读感）
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.62,1,20,1,true),
        new THREE.MeshBasicMaterial({color:'#ffedd0',transparent:true,opacity:0,
          blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));
      S.add(cone);
      this.spots.push({name,sp,blob,cone,fixture:new THREE.Vector3(fx,5.6,2.2)});
    }

    // ── 侧台灯控位（小灯的位置）：右翼幕后隐约的灯控台轮廓+手灯 ──
    {
      const g=new THREE.Group();g.position.set(4.2,0.6,-2.4);g.rotation.y=-.5;S.add(g); // 翼门缺口处（台面高），侧台可见
      box(g,'console',[0,.55,0],[1.1,.5,.5],'#191514');
      for(let i=0;i<4;i++){ // 台面小指示灯
        const dot=new THREE.Mesh(new THREE.SphereGeometry(.018,6,6),
          new THREE.MeshBasicMaterial({color:i%2?'#7fd0a0':'#e0b060'}));
        dot.position.set(-.36+i*.24,.82,-.1);g.add(dot);
      }
      // 小灯的手灯（talk_2 举起时发光）：talk_2 前常暗
      this.handLamp=new THREE.Mesh(new THREE.SphereGeometry(.05,10,8),
        new THREE.MeshBasicMaterial({color:'#fff0c8'}));
      this.handLamp.position.set(-.3,1.35,.1);this.handLamp.visible=false;g.add(this.handLamp);
      this.lampGlow=new THREE.PointLight(0xffe6b0,0,3,1.6);this.lampGlow.position.copy(this.handLamp.position);g.add(this.lampGlow);
      this.consoleGroup=g;
    }

    // ── 观众席剪影：前两排头顶轮廓（近黑不纯黑），永远在画面下缘 ──
    {
      const mat=basic('#0d0b10');
      let sd=7;const r=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};
      for(const [row,z,y] of [[0,4.4,1.02],[1,5.15,1.14]]){
        for(let i=0;i<8;i++){
          const head=new THREE.Mesh(new THREE.SphereGeometry(.16+(r()*.03),12,10),mat);
          head.scale.set(1,.92+(r()*.1),.9);
          head.position.set(-3.5+i*1.0+(r()-.5)*.3,y+(r()-.5)*.05,z+(r()-.5)*.12);
          // 肩膀兜住头（单球悬浮读成气球）
          const sh=new THREE.Mesh(new THREE.SphereGeometry(.24,10,8),mat);
          sh.scale.set(1.4,.55,.8);sh.position.set(head.position.x,y-.24,z+.02);
          S.add(head);S.add(sh);
        }
      }
    }
    return this;
  }
  // perf：{curtainK, spot1:{x,z,on,breathe}, spot2:{...}, lampOn, footOn} —— 全部 (t,state) 纯函数
  update(t,perf={}){
    const k=perf.curtainK??0;
    this.curtainL.position.x=-2.62-k*this.curtainTravel;
    this.curtainR.position.x=2.62+k*this.curtainTravel;
    // 追光：目标跟随 + 明暗呼吸 + 迟疑由 perf 数值表达；锥片从灯位拉到目标
    for(const [i,s] of this.spots.entries()){
      const p=(i===0?perf.spot1:perf.spot2)??{x:0,y:1.4,z:-2,on:0,breathe:0};
      const inten=(p.on??0)*(1+(p.breathe??0));
      s.sp.intensity=inten*3.2;
      s.sp.target.position.set(p.x,p.y??.6,p.z);
      s.blob.position.set(p.x,.612,p.z);s.blob.material.opacity=inten*.34;
      s.blob.scale.setScalar(.8+.3*inten);
      const a=s.fixture,b=new THREE.Vector3(p.x,p.y??.6,p.z),d=b.clone().sub(a),len=d.length();
      s.cone.position.copy(a).addScaledVector(d,.5);
      s.cone.scale.set(1,len,1);
      s.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),d.clone().normalize());
      s.cone.material.opacity=inten*.10;
    }
    this.footGlow.intensity=.8*(perf.footOn??1);
    const lampOn=perf.lampOn??0;
    this.handLamp.visible=lampOn>0.02;this.lampGlow.intensity=lampOn*1.4;
  }
}
