// 《迟到的一拍》角色资产（集内建造，验收后另行晋升）：阿拍（调音师少年，瘦高怯场）/
// 小灯（灯光师少女，利落冷静）。工艺口径：character-modeler SKILL.md「服装-身体一体化
// 建造纪律」+ modeling-techniques.md §9/§10——袖子与肢体同数据、襟摆铰链枢轴在腰、
// 穿戴件挂点净空、canvas 动画头、coolShadowRamp 共享、描边分级。
// 参考 bioarmor/ 的结构模式（setPose/setEmotion/mouth 契约相同），比例与五官自绘。
import * as THREE from 'three';
import {LimbSurface,ringsGeometry,mesh,mat,ellipsoid,jointInk,shoeGeometry} from 'dula-assets/lib/craft3d/surface.js';
import {ArticulatedHand} from 'dula-assets/lib/craft3d/hand.js';
import {coolShadowRamp,outlined} from 'dula-assets/lib/craft3d/look.js';

const V=p=>new THREE.Vector3(p.x,p.y,p.z??0);
const ramp=coolShadowRamp();
const toon=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2,mix=(a,b,t)=>a+(b-a)*t;

// ── canvas 动画头（自绘五官比例：正面贴片盖 ±65°，暗场用 Basic 兜底读感）──
// 表情通道：fear（怯场：眉内端上挑+眼放大+嘴角下撇）/ focus（找回/专注：眉平+眼收窄）/
// smile（释然笑：闭眼弯嘴）/ blink / gaze / jaw（唱歌嘴）。符号（汗滴/黑线）归 viewer billboard。
function paintFace(g,cfg,st){
  const {fear=0,focus=0,smile=0,blink=0,gazeX=0,gazeY=0,jaw=0,sweat=0,dark=0}=st;
  g.setTransform(2,0,0,2,0,0);g.clearRect(0,0,512,512);
  g.fillStyle=cfg.skin;g.fillRect(0,0,512,512);
  const open=1-clamp(blink),eyeY=246,dx=cfg.eyeDx;
  for(const side of [-1,1]){
    const cx=256+side*dx;
    const h=(cfg.eyeH)*(1+.18*fear-.16*focus)*open;
    const w=cfg.eyeW*(1-.12*focus);
    g.save();g.translate(cx,eyeY);g.scale(side,1);
    if(open>.06&&smile<.6){
      // 分层动漫眼（§5 层序：眼白→缘圈→虹膜渐变→光池→瞳孔→双高光+上眼线）
      g.beginPath();g.ellipse(0,0,w,h,0,0,TAU);
      g.save();g.clip();
      g.fillStyle='#fff8ec';g.fillRect(-w,-h,w*2,h*2);
      const ix=gazeX*side*w*.28,iy=gazeY*h*.22,ir=cfg.irisR*(1+.1*fear);
      g.fillStyle='#4d3734';g.beginPath();g.ellipse(ix,iy,ir*1.14,ir*1.30,0,0,TAU);g.fill(); // 缘圈（深一环）
      const iris=g.createLinearGradient(0,-ir,0,ir);
      iris.addColorStop(0,cfg.iris0);iris.addColorStop(.55,cfg.iris1);iris.addColorStop(1,cfg.iris2);
      g.fillStyle=iris;g.beginPath();g.ellipse(ix,iy,ir,ir*1.25,0,0,TAU);g.fill(); // 虹膜渐变
      g.fillStyle=iris2glow(cfg);g.beginPath();g.ellipse(ix,iy+ir*.62,ir*.62,ir*.38,0,0,TAU);g.fill(); // 光池（虹膜底部浅色）
      g.fillStyle='#26222a';g.beginPath();g.ellipse(ix,iy-ir*.06,ir*.40,ir*.52,0,0,TAU);g.fill(); // 瞳孔
      g.fillStyle='#fffdf4'; // 双高光：主上大 + 副下小
      g.beginPath();g.ellipse(ix-ir*.3,iy-ir*.5,ir*.20,ir*.26,-.3,0,TAU);g.fill();
      g.globalAlpha=.75;g.beginPath();g.ellipse(ix+ir*.28,iy+ir*.42,ir*.11,ir*.13,0,0,TAU);g.fill();g.globalAlpha=1;
      g.restore();
      // 上眼线（睫毛线，两端微挑）
      g.strokeStyle='#33262b';g.lineWidth=4.6;g.lineCap='round';
      g.beginPath();g.moveTo(-w*.96,h*.12);g.quadraticCurveTo(0,-h*1.12,w*.96,-h*.06);g.stroke();
    }else{
      // 闭眼（眨眼到底/释然笑）：弯线
      g.strokeStyle='#33262b';g.lineWidth=4.2;g.lineCap='round';
      g.beginPath();g.moveTo(-w,0);g.quadraticCurveTo(0,smile>.5?-h*.9:h*.25,w,0);g.stroke();
    }
    g.restore();
    // 眉：怯场内端上挑（fear）、专注内端下压（focus）、冷静平（deng 默认低平）
    const by=eyeY-cfg.browUp,inner=by+fear*16-focus*10,outer=by-fear*5+focus*4;
    g.fillStyle=cfg.brow;g.beginPath();
    g.moveTo(256+side*(dx-w*.8),inner);
    g.quadraticCurveTo(cx,by-6,256+side*(dx+w*.9),outer);
    g.lineTo(256+side*(dx+w*.9),outer+cfg.browT);
    g.quadraticCurveTo(cx,by+2,256+side*(dx-w*.8),inner+cfg.browT*1.2);
    g.closePath();g.fill();
  }
  // 鼻：小撇
  g.strokeStyle=cfg.line;g.lineWidth=1.8;g.lineCap='round';
  g.beginPath();g.moveTo(262,314);g.quadraticCurveTo(268,320,260,322);g.stroke();
  // 嘴：闭合曲线 / 张嘴椭圆（jaw）
  const my=386,mw=cfg.mouthW*(1+.12*smile);
  if(jaw<.04){
    g.strokeStyle=cfg.mouth;g.lineWidth=2.8;g.lineCap='round';
    g.beginPath();g.moveTo(256-mw,my+fear*3);
    g.quadraticCurveTo(256,my+(smile?7:fear?-4:focus?1:0),256+mw,my+fear*3-smile*4);g.stroke();
  }else{
    const top=1+jaw*10,bottom=3+jaw*34;
    g.beginPath();g.moveTo(256-mw,my);
    g.bezierCurveTo(246,my-top,266,my-top,256+mw,my);
    g.bezierCurveTo(268,my+bottom,244,my+bottom,256-mw,my);g.closePath();
    g.fillStyle='#5d3a3a';g.fill();
    if(jaw>.4){g.fillStyle='#b4767a';g.beginPath();g.ellipse(256,my+bottom*.75,mw*.6,6,0,0,TAU);g.fill();}
    g.strokeStyle=cfg.mouth;g.lineWidth=1.6;g.stroke();
  }
  // ── 符号叠加层（五官之后；状态并入 draw() 缓存 key——st 整体 stringify）──
  if(sweat){ // 汗滴：太阳穴外侧水滴（anime-expression-symbols 配方）
    const drop=(x,y,s)=>{g.save();g.translate(x,y);g.scale(s,s);
      g.beginPath();g.moveTo(0,-14);g.bezierCurveTo(9,-2,10,7,0,12);g.bezierCurveTo(-10,7,-9,-2,0,-14);
      g.fillStyle='#bfe3f2';g.fill();g.strokeStyle='#7fb6cf';g.lineWidth=1.5;g.stroke();
      g.fillStyle='#fff';g.beginPath();g.arc(-3,-5,2.5,0,TAU);g.fill();g.restore();};
    drop(256+(cfg.eyeDx+64),eyeY-38,1.15);
    if(sweat>1)drop(256-(cfg.eyeDx+64),eyeY-24,.95); // 双侧
  }
  if(dark){ // 黑线罩脸：眉上到发际下沿 6 条竖线 + 渐变罩（发帽下沿以下——P2 被盖住实录）
    g.save();g.globalAlpha=.55;g.strokeStyle='#2c2730';g.lineWidth=3;
    for(let i=0;i<6;i++){const x=256-90+i*36;g.beginPath();g.moveTo(x,178);g.lineTo(x+4,246);g.stroke();}
    const grad=g.createLinearGradient(0,170,0,260);
    grad.addColorStop(0,'rgba(44,39,48,.32)');grad.addColorStop(1,'rgba(44,39,48,0)');
    g.globalAlpha=1;g.fillStyle=grad;g.fillRect(140,168,232,120);g.restore();
  }
}

// ── 曲面雕刻头（断面插值曲面：下颌收窄/脸颊微凸/颅顶圆；精简自 bioarmor
// character_look.js 的 surface()——去鼻部高斯/四点平滑，保留 UV 前后面缝约定）──
// cfg.profile: [y, 半宽rx, 前深, 后深] 自下而上；cfg.hair: {rx,rz,h,boundary(az),colors}
function headSurface(cfg){
  const profile=cfg.profile;
  const positions=[],uv=[],indices=[],n=40,rows=(profile.length-1)*6;
  for(let half=0;half<2;half++){
    const start=positions.length/3;
    for(let row=0;row<=rows;row++){
      const pp=row/6,k=Math.min(profile.length-2,Math.floor(pp)),f=pp-k;
      const a=profile[k],b=profile[k+1];
      const y=mix(a[0],b[0],f),rx=mix(a[1],b[1],f),fd=mix(a[2],b[2],f),bd=mix(a[3],b[3],f);
      for(let j=0;j<=n;j++){
        const angle=-Math.PI/2+half*Math.PI+j/n*Math.PI,c=Math.cos(angle),x=rx*Math.sin(angle);
        const plane=c>=0?(c*.78+Math.sin(Math.max(0,c)*Math.PI/2)*.22):c; // 脸颊微凸
        positions.push(x,y,(c>=0?fd:bd)*plane);
        uv.push(half===0?.5+x/.30:.015,half===0?(y+.073)/.305:.48); // 前脸 UV 映射到 canvas 中区
        if(row<rows&&j<n){const q=start+row*(n+1)+j;indices.push(q,q+1,q+n+1,q+1,q+n+2,q+n+1);}
      }
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();return g;
}
// 头皮点：椭球冠 + 后颈延伸（rear 权重把后半拉向后脑/颈后）
function scalpPoint(cfg,theta,azimuth,lift=0){
  const s=Math.sin(theta),c=Math.cos(theta),{rx,rz,h}=cfg.hair;
  const y=.075+h*c;
  const rear=smooth2(.25,-.55,Math.cos(azimuth))*smooth2(.65,1.25,theta);
  const width=mix(rx*s,Math.max(rx*s,cfg.hair.napeRx??rx*.6),rear);
  const depth=mix(rz*s,Math.max(rz*s,cfg.hair.napeRz??rz*.55),rear);
  return new THREE.Vector3((width+lift*s)*Math.sin(azimuth),y+lift*c,(depth+lift*s)*Math.cos(azimuth)-.006);
}
const smooth2=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function hairColor(cfg,theta,azimuth){ // 发根深→发梢浅+侧翼变化
  const base=new THREE.Color(cfg.hair.color),dark=new THREE.Color(cfg.hair.dark);
  const c=base.clone().lerp(dark,smooth2(.55,1,theta/cfg.hair.boundary(azimuth))*.5);
  return c;
}
// 发帽：颅顶到发际线的整片曲面（发际线=boundary(az) 方位角函数，鬓角/耳上收放）
function hairCap(head,cfg){
  const p=[],colors=[],idx=[],n=96,m=30;
  for(let i=0;i<=m;i++)for(let j=0;j<=n;j++){
    const a=j/n*TAU,end=cfg.hair.boundary(a);
    const wave=.010*(Math.sin(a*9+.7)+.4*Math.sin(a*17))*(i/m)**8; // 发际微波
    const pt=scalpPoint(cfg,i/m*end+wave,a);p.push(...pt.toArray());
    const c=hairColor(cfg,i/m*end,a);colors.push(c.r,c.g,c.b);
    if(i<m&&j<n){const k=i*(n+1)+j;idx.push(k,k+n+1,k+1,k+n+1,k+n+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
  outlined(head,g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),.0007);
}
// 刘海片：前额发际线下垂条（发根进帽内，片体贴颅曲面）
function fringePanel(head,cfg,a0,a1,thetaEnd,width,color){
  const p=[],colors=[],idx=[],n=16,m=6,base=new THREE.Color(color),shade=base.clone().multiplyScalar(.93); // 边缘色差减弱（片缝竖条=条形码实录）
  for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
    const u=i/n,v=j/m*2-1,az=mix(a0,a1,u)+v*width*Math.pow(1-u,.65);
    const theta=mix(.34,thetaEnd,u),bulge=.003+.006*Math.sin(Math.PI*u)*(1-v*v);
    const pt=scalpPoint(cfg,theta,az,bulge);p.push(...pt.toArray());
    const c=base.clone().lerp(shade,clamp((v+.2)*.7));colors.push(c.r,c.g,c.b);
    if(i<n&&j<m){const k=i*(m+1)+j;idx.push(k,k+m+1,k+1,k+1,k+m+1,k+m+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
  head.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})));
}
// 后颈发片：后脑到颈后的覆盖（短发自收）
function napeLock(head,cfg,a0,a1,thetaStart,thetaEnd,width,color){
  const p=[],colors=[],idx=[],n=16,m=6,base=new THREE.Color(color),shade=base.clone().multiplyScalar(.85);
  for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
    const u=i/n,v=j/m*2-1,az=mix(a0,a1,u)+v*width*Math.pow(1-u,.6);
    const theta=mix(thetaStart,thetaEnd,u);
    const pt=scalpPoint(cfg,theta,az,.002*Math.sin(Math.PI*u)*(1-v*v));p.push(...pt.toArray());
    const c=base.clone().lerp(shade,.3+.4*Math.abs(v));colors.push(c.r,c.g,c.b);
    if(i<n&&j<m){const k=i*(m+1)+j;idx.push(k,k+m+1,k+1,k+1,k+m+1,k+m+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
  head.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})));
}

function iris2glow(cfg){return cfg.iris2;}
function stageHead(body,cfg,height){
  const head=new THREE.Group();head.name=cfg.name+'_head';head.position.y=height;body.add(head);
  const skinMat=new THREE.MeshToonMaterial({color:cfg.skin,gradientMap:ramp});
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(cfg.neckR,cfg.neckR*1.2,.17,20),skinMat);
  neck.position.set(0,height-.09,-.01);body.add(neck);
  // 曲面头：断面插值曲面 + canvas 五官（UV 前脸中区）
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const skull=outlined(head,headSurface(cfg),new THREE.MeshBasicMaterial({map:texture}),.0010);
  skull.castShadow=true;
  for(const side of [-1,1]){ // 耳贴颅侧曲面
    const ear=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),skinMat);
    ear.scale.set(.013,.024,.010);
    ear.position.set(side*(cfg.profile[3][1]+.004),.043,-.012);head.add(ear);
  }
  // 发型：发帽（发际线=boundary 方位角函数）+ 刘海片 + 后颈发片（配置驱动）
  hairCap(head,cfg);
  for(const [a0,a1,te,w,col] of cfg.hair.fringe??[])fringePanel(head,cfg,a0,a1,te,w,col);
  for(const [a0,a1,ts,te,w,col] of cfg.hair.nape??[])napeLock(head,cfg,a0,a1,ts,te,w,col);
  let last='';
  const state={fear:0,focus:0,smile:0,blink:0,gazeX:0,gazeY:0,jaw:0};
  function draw(){
    const key=JSON.stringify(state);if(key===last)return;last=key;
    if(new URLSearchParams(location.search).has('debug-sym'))console.error('FACE',cfg.name,key);
    paintFace(ctx,cfg,state);texture.needsUpdate=true;
  }
  draw();
  return {head,skull,
    setEmotion(e='neutral',b=0){
      state.fear=e==='fear'?1:0;state.focus=e==='focus'?.8:0;
      state.smile=e==='smile'?1:0;state.blink=b;
    },
    setActing(a){Object.assign(state,a);},
    lookAtWorld(target){head.updateWorldMatrix(true,false);const local=head.worldToLocal(target.clone());
      state.gazeX=clamp(local.x/Math.max(.3,Math.abs(local.z)),-1,1)*.6;
      state.gazeY=clamp(-local.y/Math.max(.3,Math.abs(local.z)),-1,1)*.5;},
    mouth:{apply(lip){state.jaw=clamp(lip.jaw??0);draw();return {jaw:state.jaw};}},
    redraw(){draw();},
    canvas,
  };
}

// ── 阿拍：工装背带裤 + 耳返 + 软塌短发 + 大眼怯场相 ──
export class ApaiCraft{
  constructor(){
    this.mesh=new THREE.Group();this.mesh.name='ApaiCraft';
    this.body=new THREE.Group();this.mesh.add(this.body);
    const skin=toon('#f0d2b8'),tee=toon('#b8bec8'),overall=toon('#46546a'),pantsC=toon('#46546a');
    this.limbs={};this.sleeves={};this.hands={};this.feet={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,pantsC,[[0,.078],[.25,.064],[.55,.05],[.8,.042],[1,.037]],{depth:.94});
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      mesh(shoe,shoeGeometry(),'#3c3835');
      const sole=mesh(shoe,shoeGeometry(),'#cfc8ba');sole.scale.y=.13;sole.position.y=-.08447;
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,skin,[[0,.045],[.3,.041],[.6,.032],[1,.024]],{depth:.88});
      // 短袖 T 恤到肘上（袖终点盖过肘屈曲活动域：肘上 51% 处止）
      this.sleeves[side]=new LimbSurface(this.mesh,tee,[[0,.058],[.8,.050],[1,.046]],{end:.50});
      this.sleeves[side+'Roll']=new LimbSurface(this.mesh,tee,[[0,.056],[1,.050]],{start:.44,end:.51});
      const hand=new ArticulatedHand(sign,skin,jointInk);hand.scale.setScalar(.72);this.mesh.add(hand);this.hands[side]=hand;
    }
    // 躯干：瘦高少年环列（胸薄肩窄）
    mesh(this.body,ringsGeometry([[.80,.115,.085],[.90,.128,.090],[1.00,.132,.093],[1.10,.120,.086],[1.20,.126,.089],[1.32,.118,.083],[1.44,.096,.068],[1.49,.052,.048]]),tee);
    // 工装背带裤：胸前兜片 + 双肩背带（过肩到后腰），穿戴件标 probeExclude
    const bib=mesh(this.body,new THREE.BoxGeometry(.17,.20,.024),'#39435c'); // 兜片深一档
    bib.position.set(0,1.16,.096);bib.userData.probeExclude=1;
    for(const sign of [-1,1]){
      const strap=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(sign*.055,1.24,.105),new THREE.Vector3(sign*.085,1.45,.01),
        new THREE.Vector3(sign*.07,1.10,-.10)),10,.014,6),mat('#5a6a86')); // 背带浅一档+正面可见
      strap.userData.probeExclude=1;this.body.add(strap);
    }
    // ── 头：瘦长脸 + 大眼 + 软塌短发 ──
    this.face=stageHead(this.body,{
      name:'apai',skin:'#f0d2b8',line:'#b98a6e',brow:'#4a3a30',mouth:'#a16e61',
      eyeDx:84,eyeH:30,eyeW:30,irisR:22,iris0:'#5a4436',iris1:'#c69a58',iris2:'#e8c98e',browUp:46,browT:5,mouthW:26,
      neckR:.040,
      // 瘦长脸断面表（下颌收窄、脸颊微凸、颅顶圆）：[y, 半宽, 前深, 后深]
      profile:[[-.070,.026,.050,.040],[-.052,.058,.082,.062],[-.018,.086,.104,.088],
        [.040,.104,.120,.108],[.108,.108,.122,.116],[.168,.092,.106,.108],[.207,.054,.072,.078],[.229,.001,.001,.001]],
      hair:{rx:.120,rz:.132,h:.186,napeRx:.098,napeRz:.104,color:'#4a3a30',dark:'#342720',
        boundary:a=>{const t=Math.acos(Math.cos(a));
          const ks=[[0,1.14],[.8,1.26],[1.5,1.52],[1.95,1.92],[2.6,2.34],[Math.PI,2.40]];
          for(let i=1;i<ks.length;i++)if(t<=ks[i][0]){const[x0,y0]=ks[i-1],[x1,y1]=ks[i];
            return mix(y0,y1,smooth2(x0,x1,t));}return ks.at(-1)[1];},
        fringe:[[-.85,-.25,1.44,.20,'#4a3a30'],[-.55,.10,1.50,.22,'#534036'],[-.05,.55,1.46,.20,'#4a3a30'],[.25,.85,1.40,.19,'#413028']],
        nape:[[1.95,2.55,.9,2.44,.15,'#3c2d26'],[2.55,3.30,.9,2.50,.16,'#443329'],[3.30,4.00,.9,2.44,.16,'#3c2d26'],[4.00,4.45,.9,2.30,.13,'#443329']]},
    },1.565);
    this.headGroup=this.face.head;this.mouth=this.face.mouth;
    // 耳返（右耳）：小圆片 + 短线到颈后——穿戴件
    const mon=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.006,12),mat('#2c2f38'));
    mon.rotation.z=Math.PI/2;mon.position.set(.096,.02,-.01); // 右耳外侧贴耳
    mon.userData.probeExclude=1;this.headGroup.add(mon);
    const wire=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(.094,.01,-.01),new THREE.Vector3(.10,-.05,-.06),new THREE.Vector3(.06,-.13,-.07)),8,.0025,5),mat('#2c2f38'));
    wire.userData.probeExclude=1;this.headGroup.add(wire);
  }
  setEmotion(e,b){this.face.setEmotion(e,b);this.face.redraw();}
  setActing(a){this.face.setActing(a);this.face.redraw();}
  setPose(p){ // 契约同 bioarmor：mesh 位置/yaw、body bob/lean、头、四肢、手型
    this.mesh.position.x=p.rootX;this.mesh.position.z=p.rootZ??0;this.mesh.rotation.y=p.yaw;
    this.body.position.y=p.bob;this.body.rotation.x=p.lean??0;
    this.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.sleeves[side].update(arm);this.sleeves[side+'Roll'].update(arm);
      this.limbs[side+'Leg'].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.position.copy(V(arm[2]));
      hand.setGesture({fist:p.fist??0,open:p.open??0,point:p.point??0});
      this.feet[side].position.copy(V(leg[2]));
    }
    this.mesh.updateMatrixWorld(true);
  }
}

// ── 小灯：oversized 白衬衫（下摆铰链襟片）+ 挽袖 + 腰间手电 + 马尾 ──
export class XiaodengCraft{
  constructor(){
    this.mesh=new THREE.Group();this.mesh.name='XiaodengCraft';
    this.body=new THREE.Group();this.mesh.add(this.body);
    const skin=toon('#f4d8c0'),shirt=toon('#e9e5da'),pantsC=toon('#3a3f46');
    this.limbs={};this.sleeves={};this.hands={};this.feet={};
    for(const [side,sign] of [['left',-1],['right',1]]){
      this.limbs[side+'Leg']=new LimbSurface(this.mesh,pantsC,[[0,.072],[.25,.06],[.55,.047],[.8,.039],[1,.034]],{depth:.94});
      const shoe=new THREE.Group();this.mesh.add(shoe);this.feet[side]=shoe;
      mesh(shoe,shoeGeometry(),'#2e2c30');
      const sole=mesh(shoe,shoeGeometry(),'#d8d2c4');sole.scale.y=.13;sole.position.y=-.08447;
      this.limbs[side+'Arm']=new LimbSurface(this.mesh,skin,[[0,.042],[.3,.038],[.6,.030],[1,.022]],{depth:.88});
      // 白衬衫短袖 + 袖口挽边（卷到小臂）
      this.sleeves[side]=new LimbSurface(this.mesh,shirt,[[0,.060],[.8,.052],[1,.047]],{end:.48});
      this.sleeves[side+'Roll']=new LimbSurface(this.mesh,shirt,[[0,.058],[.5,.054],[1,.048]],{start:.42,end:.53});
      const hand=new ArticulatedHand(sign,skin,jointInk);hand.scale.setScalar(.66);this.mesh.add(hand);this.hands[side]=hand;
    }
    // 躯干：oversized 白衬衫环列（比净身宽一圈——环列含衣厚）
    mesh(this.body,ringsGeometry([[.76,.125,.095],[.86,.136,.100],[.96,.140,.102],[1.06,.125,.092],[1.16,.130,.095],[1.28,.120,.086],[1.34,.096,.068],[1.40,.050,.046]]),shirt);
    // 下摆襟片×3（前左/前右/后）：铰链枢轴在腰（y≈1.02），几何下摆 −y，
    // userData.hinge='hem'（viewer 臂推接口）+ probeExclude（软布不进三角相交探针）
    this.hems=[];
    for(const [x,z,ry] of [[-.065,.10,0],[.065,.10,0],[0,-.105,0]]){
      const pivot=new THREE.Group();pivot.position.set(x,1.02,z);pivot.rotation.y=ry;
      const fg=new THREE.PlaneGeometry(.105,.22,6,4); // 弧形底边（方盒切边翻车实录）
      {const pa=fg.attributes.position;
       for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i);
         if(y<-.08)pa.setY(i,y+.034*Math.pow(Math.abs(x)/.0525,2)); // 两端上提成弧
         pa.setZ(i,.012*Math.sin(Math.PI*(y+.11)/.22)*(1-Math.pow(x/.0525,2)));} // 微鼓腹
       fg.computeVertexNormals();}
      const flap=new THREE.Mesh(fg,shirt.clone());
      flap.geometry.translate(0,-.11,0);
      flap.material.side=THREE.DoubleSide;pivot.rotation.x=-.06; // 静息底缘微前倾
      flap.userData.hinge='hem';flap.userData.probeExclude=1;
      pivot.add(flap);this.body.add(pivot);this.hems.push(pivot);
    }
    // 腰间手电筒（右腰侧挂点，净空扫过）：挂耳+筒身；点亮由 viewer 按 state 驱动
    const belt=new THREE.Mesh(new THREE.BoxGeometry(.20,.03,.11),mat('#33302c'));
    belt.name='belt';belt.userData.probeExclude=1;
    belt.position.set(0,.86,0);this.body.add(belt);
    // 手电=viewer 侧道具状态机（腰间挂点↔右手，接触事件驱动）；角色只留腰带挂耳，
    // 腰间不建第二只筒身（双筒翻车实录：挂点筒与手持筒同框）
    // ── 头：利落脸 + 锐利眼 + 马尾 ──
    this.face=stageHead(this.body,{
      name:'xiaodeng',skin:'#f4d8c0',line:'#c08a70',brow:'#3a3234',mouth:'#a3706a',
      eyeDx:80,eyeH:22,eyeW:30,irisR:17,iris0:'#46332e',iris1:'#a87840',iris2:'#d8ab60',browUp:40,browT:4,mouthW:24,
      neckR:.038,
      // 利落圆脸断面表
      profile:[[-.068,.032,.056,.046],[-.050,.064,.086,.068],[-.016,.090,.108,.092],
        [.042,.106,.122,.110],[.110,.110,.124,.118],[.168,.096,.110,.112],[.206,.058,.076,.082],[.228,.001,.001,.001]],
      hair:{rx:.116,rz:.126,h:.172,napeRx:.094,napeRz:.098,color:'#3a3234',dark:'#2b2528',
        boundary:a=>{const t=Math.acos(Math.cos(a)); // 发际线压低至眉上（大额头=发际线后移翻车实录）
          const ks=[[0,1.02],[.8,1.18],[1.5,1.42],[1.95,1.80],[2.6,2.18],[Math.PI,2.26]];
          for(let i=1;i<ks.length;i++)if(t<=ks[i][0]){const[x0,y0]=ks[i-1],[x1,y1]=ks[i];
            return mix(y0,y1,smooth2(x0,x1,t));}return ks.at(-1)[1];},
        fringe:[[-.92,-.30,1.46,.20,'#3a3234'],[-.58,.10,1.52,.22,'#443a3c'],[-.10,.55,1.50,.22,'#3a3234'],[.30,.92,1.44,.20,'#443a3c']],
        nape:[[2.0,2.7,.9,2.22,.13,'#332b2d'],[2.7,3.5,.9,2.30,.14,'#3a3234'],[3.5,4.25,.9,2.20,.13,'#332b2d']]},
    },1.475);
    this.headGroup=this.face.head;this.mouth=this.face.mouth;
    // 马尾：发根组 + 三节链（viewer 每帧驱动 sway——次级运动）
    const ponyMat=toon('#3a3234');
    this.ponyBase=new THREE.Group();this.ponyBase.position.set(0,.06,-.10);this.headGroup.add(this.ponyBase);
    let parent=this.ponyBase;const segs=[];
    for(let i=0;i<3;i++){
      const g=new THREE.Group();g.position.set(0,i?-.10:0,i?-.02:0);parent.add(g);
      const seg=new THREE.Mesh(new THREE.CapsuleGeometry(.028-.005*i,.10,4,10),ponyMat);
      seg.position.y=-.055;g.add(seg);segs.push(g);parent=g;
    }
    this.ponySegs=segs;
  }
  setEmotion(e,b){this.face.setEmotion(e,b);this.face.redraw();}
  setActing(a){this.face.setActing(a);this.face.redraw();}
  setPose(p){
    this.mesh.position.x=p.rootX;this.mesh.position.z=p.rootZ??0;this.mesh.rotation.y=p.yaw;
    this.body.position.y=p.bob;this.body.rotation.x=p.lean??0;
    this.headGroup.rotation.set(p.headPitch,p.headYaw,p.headRoll);
    for(const [side,sign] of [['left',-1],['right',1]]){
      const arm=p[side+'Arm'],leg=p[side+'Leg'];
      this.limbs[side+'Arm'].update(arm);this.sleeves[side].update(arm);this.sleeves[side+'Roll'].update(arm);
      this.limbs[side+'Leg'].update(leg);
      const hand=this.hands[side],x=V(arm[2]).sub(V(arm[1])).normalize();
      const forward=new THREE.Vector3(0,0,1);
      const y=forward.clone().addScaledVector(x,-forward.dot(x)).normalize(),z=x.clone().cross(y).normalize();
      y.copy(z).cross(x).normalize();hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.position.copy(V(arm[2]));
      hand.setGesture({fist:p.fist??0,open:p.open??0,point:p.point??0});
      this.feet[side].position.copy(V(leg[2]));
    }
    this.mesh.updateMatrixWorld(true);
  }
}
