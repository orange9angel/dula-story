// 《借走月光的女孩》共享动画头模块：canvas 五官 + 曲面雕刻头 + 发帽/刘海/后颈发片。
// 结构移植自 late_beat_musical/characters/theater.js（已验收 canvas 动画头工艺），
// 表情通道按本集圣经附录 A 扩展：awe(好奇) sad(孤独) smile firm(坚定) shock daze(失神)
// weary(疲惫慈爱) tear(含泪) + blink/gaze/jaw。
// 眨眼纪律：眼皮从上往下盖住固定虹膜（皮肤色遮罩+睑缘线），不纵向压扁整眼。
// UV 约定与 theater 一致：前脸半球映射整幅 canvas（u=.5+x/.30, v=(y+.073)/.305），
// 各角色用 head.scale 调头大小，profile 只改脸型不改量程，避免重算发际落点。
import * as THREE from 'three';
import {coolShadowRamp,outlined} from 'dula-assets/lib/craft3d/look.js';

const ramp=coolShadowRamp();
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2,mix=(a,b,t)=>a+(b-a)*t;
const smooth2=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};

// ── canvas 五官：分层动漫眼 + 表情通道 + 符号（泪）──
function paintFace(g,cfg,st){
  const {awe=0,sad=0,smile=0,firm=0,shock=0,daze=0,weary=0,blink=0,
    gazeX=0,gazeY=0,jaw=0,tear=0}=st;
  g.setTransform(2,0,0,2,0,0);g.clearRect(0,0,512,512);
  g.fillStyle=cfg.skin;g.fillRect(0,0,512,512);
  const open=1-clamp(blink),lid=clamp(Math.max(daze*.62,weary*.55)); // 失神/疲惫的上睑下垂
  const eyeY=246,dx=cfg.eyeDx;
  for(const side of [-1,1]){
    const cx=256+side*dx;
    const h=cfg.eyeH*(1+.20*awe+.34*shock-.16*firm-.08*weary);
    const w=cfg.eyeW*(1+.06*awe+.10*shock-.10*firm);
    g.save();g.translate(cx,eyeY);g.scale(side,1);
    const cover=clamp(lid*open+(1-open)); // 睑缘从上往下的覆盖比例
    if(cover<.93){
      // 固定形状的眼内容（眨眼靠遮罩，不压扁）
      g.beginPath();g.ellipse(0,0,w,h,0,0,TAU);
      g.save();g.clip();
      g.fillStyle='#fff8ec';g.fillRect(-w,-h,w*2,h*2);
      const ix=gazeX*side*w*.28,iy=gazeY*h*.22,ir=cfg.irisR*(1+.08*awe+.14*shock-.12*daze);
      g.fillStyle='#4d3734';g.beginPath();g.ellipse(ix,iy,ir*1.14,ir*1.30,0,0,TAU);g.fill(); // 缘圈
      const iris=g.createLinearGradient(0,-ir,0,ir);
      iris.addColorStop(0,cfg.iris0);iris.addColorStop(.55,cfg.iris1);iris.addColorStop(1,cfg.iris2);
      g.fillStyle=iris;g.beginPath();g.ellipse(ix,iy,ir,ir*1.25,0,0,TAU);g.fill();
      g.fillStyle=cfg.iris2;g.beginPath();g.ellipse(ix,iy+ir*.62,ir*.62,ir*.38,0,0,TAU);g.fill(); // 光池
      g.fillStyle='#26222a';g.beginPath();g.ellipse(ix,iy-ir*.06,ir*.40,ir*.52,0,0,TAU);g.fill(); // 瞳孔
      g.fillStyle='#fffdf4'; // 双高光（含泪时副高光放大=泪光）
      const gl=1+.9*clamp(tear);
      g.beginPath();g.ellipse(ix-ir*.3,iy-ir*.5,ir*.20*gl,ir*.26*gl,-.3,0,TAU);g.fill();
      g.globalAlpha=.75;g.beginPath();g.ellipse(ix+ir*.28,iy+ir*.42,ir*.11*gl,ir*.13*gl,0,0,TAU);g.fill();g.globalAlpha=1;
      if(tear>0){ // 下睑泪膜亮边
        g.strokeStyle='rgba(255,253,244,.85)';g.lineWidth=2.2;g.lineCap='round';
        g.beginPath();g.moveTo(-w*.7,h*.86);g.quadraticCurveTo(0,h*1.02,w*.7,h*.86);g.stroke();
      }
      g.restore();
      // 上睑遮罩：皮肤色从上盖到睑缘线（cover 部分）
      if(cover>.02){
        g.save();g.beginPath();g.ellipse(0,0,w+1,h+1,0,0,TAU);g.clip();
        const lidY=-h+2*h*cover;
        g.fillStyle=cfg.skin;g.fillRect(-w-1,-h-1,(w+1)*2,lidY+h+1);
        g.strokeStyle='#33262b';g.lineWidth=4.0;g.lineCap='round';
        g.beginPath();g.moveTo(-w*.94,lidY+h*.10);g.quadraticCurveTo(0,lidY-h*.14,w*.94,lidY-h*.02);g.stroke();
        g.restore();
      }
      // 上眼线（睫毛线，两端微挑）——未被睑遮罩盖住时画在原位
      if(cover<.35){
        g.strokeStyle='#33262b';g.lineWidth=4.6;g.lineCap='round';
        g.beginPath();g.moveTo(-w*.96,h*.12);g.quadraticCurveTo(0,-h*1.12,w*.96,-h*.06);g.stroke();
      }
    }else{
      // 全闭：弯线（笑眼上拱 / 平静微垂分开）
      g.strokeStyle='#33262b';g.lineWidth=4.2;g.lineCap='round';
      g.beginPath();g.moveTo(-w,0);g.quadraticCurveTo(0,smile>.5?-h*.9:h*.22,w,0);g.stroke();
    }
    g.restore();
    // 眉：sad 内端上挑 / firm 内端下压（坚定）/ shock·awe 整体上抬 / weary 平柔
    const by=eyeY-cfg.browUp;
    const inner=by+sad*13+daze*5-firm*9-shock*15-awe*8+weary*3;
    const outer=by-sad*3-firm*2-shock*13-awe*6+weary*3;
    g.fillStyle=cfg.brow;g.beginPath();
    g.moveTo(256+side*(dx-w*.8),inner);
    g.quadraticCurveTo(cx,by-6-firm*3,256+side*(dx+w*.9),outer);
    g.lineTo(256+side*(dx+w*.9),outer+cfg.browT);
    g.quadraticCurveTo(cx,by+2,256+side*(dx-w*.8),inner+cfg.browT*1.2);
    g.closePath();g.fill();
    // 含泪：下睑外角将落未落的泪珠
    if(tear>=1){
      const tx=cx+side*w*.62,ty=eyeY+h+5+clamp(tear-1)*14;
      g.fillStyle='#cfe6f4';g.beginPath();g.ellipse(tx,ty,4.2,5.6,0,0,TAU);g.fill();
      g.fillStyle='#fff';g.beginPath();g.ellipse(tx-1.4,ty-2,1.5,2,-.3,0,TAU);g.fill();
    }
  }
  // 鼻：小撇
  g.strokeStyle=cfg.line;g.lineWidth=1.8;g.lineCap='round';
  g.beginPath();g.moveTo(262,314);g.quadraticCurveTo(268,320,260,322);g.stroke();
  // 嘴：闭合曲线 / jaw 张嘴椭圆 / shock 小圆口
  const my=386,mw=cfg.mouthW*(1+.12*smile-.15*firm);
  const shockMouth=shock>.4&&jaw<.2;
  if(jaw<.04&&!shockMouth){
    g.strokeStyle=cfg.mouth;g.lineWidth=2.8;g.lineCap='round';
    const bend=smile?8:firm?2:sad?-5:weary?3:0;
    g.beginPath();g.moveTo(256-mw,my+sad*3);
    g.quadraticCurveTo(256,my+bend,256+mw,my+sad*3-smile*4);g.stroke();
  }else{
    const j=shockMouth?.5:jaw,wm=shockMouth?mw*.55:mw;
    const top=1+j*10,bottom=3+j*(shockMouth?26:34);
    g.beginPath();g.moveTo(256-wm,my);
    g.bezierCurveTo(246,my-top,266,my-top,256+wm,my);
    g.bezierCurveTo(268,my+bottom,244,my+bottom,256-wm,my);g.closePath();
    g.fillStyle='#5d3a3a';g.fill();
    if(j>.4&&!shockMouth){g.fillStyle='#b4767a';g.beginPath();g.ellipse(256,my+bottom*.75,wm*.6,6,0,0,TAU);g.fill();}
    g.strokeStyle=cfg.mouth;g.lineWidth=1.6;g.stroke();
  }
}

// ── 曲面雕刻头（断面插值曲面：下颌收窄/脸颊微凸/颅顶圆；前后面缝 UV 约定同 theater）──
// cfg.profile: [y, 半宽rx, 前深, 后深] 自下而上，量程固定 y∈[-.070,.229]（配 head.scale 用）
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
        uv.push(half===0?.5+x/.30:.015,half===0?(y+.073)/.305:.48);
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
export function scalpPoint(cfg,theta,azimuth,lift=0){
  const s=Math.sin(theta),c=Math.cos(theta),{rx,rz,h}=cfg.hair;
  const y=.075+h*c;
  const rear=smooth2(.25,-.55,Math.cos(azimuth))*smooth2(.65,1.25,theta);
  const width=mix(rx*s,Math.max(rx*s,cfg.hair.napeRx??rx*.6),rear);
  const depth=mix(rz*s,Math.max(rz*s,cfg.hair.napeRz??rz*.55),rear);
  return new THREE.Vector3((width+lift*s)*Math.sin(azimuth),y+lift*c,(depth+lift*s)*Math.cos(azimuth)-.006);
}
function hairColor(cfg,theta,azimuth){
  const base=new THREE.Color(cfg.hair.color),dark=new THREE.Color(cfg.hair.dark);
  return base.clone().lerp(dark,smooth2(.55,1,theta/cfg.hair.boundary(azimuth))*.35);
}
// 发帽：颅顶到发际线的整片曲面（发际线=boundary(az) 方位角函数）
export function hairCap(head,cfg,material){
  const p=[],colors=[],idx=[],n=96,m=30;
  for(let i=0;i<=m;i++)for(let j=0;j<=n;j++){
    const a=j/n*TAU,end=cfg.hair.boundary(a);
    const wave=.010*(Math.sin(a*9+.7)+.4*Math.sin(a*17))*(i/m)**8;
    const pt=scalpPoint(cfg,i/m*end+wave,a);p.push(...pt.toArray());
    const c=hairColor(cfg,i/m*end,a);colors.push(c.r,c.g,c.b);
    if(i<m&&j<n){const k=i*(n+1)+j;idx.push(k,k+n+1,k+1,k+n+1,k+n+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
  outlined(head,g,material??new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),.0007);
}
// 刘海片：前额发际线下垂条（发根进帽内，片体贴颅曲面）
export function fringePanel(head,cfg,a0,a1,thetaEnd,width,color,material){
  const p=[],colors=[],idx=[],n=16,m=6,base=new THREE.Color(color),shade=base.clone().multiplyScalar(.965);
  for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
    const u=i/n,v=j/m*2-1,az=mix(a0,a1,u)+v*width*Math.pow(1-u,.65);
    const theta=mix(.34,thetaEnd,u),bulge=.003+.006*Math.sin(Math.PI*u)*(1-v*v);
    const pt=scalpPoint(cfg,theta,az,bulge);p.push(...pt.toArray());
    const c=base.clone().lerp(shade,clamp((v+.2)*.7));colors.push(c.r,c.g,c.b);
    if(i<n&&j<m){const k=i*(m+1)+j;idx.push(k,k+m+1,k+1,k+1,k+m+1,k+m+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
  head.add(new THREE.Mesh(g,material??new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})));
}
// 后颈/侧发片：后脑到颈后的覆盖（短发）或垂落长片（thetaStart..thetaEnd 大跨度）
export function napeLock(head,cfg,a0,a1,thetaStart,thetaEnd,width,color,material){
  const p=[],colors=[],idx=[],n=16,m=6,base=new THREE.Color(color),shade=base.clone().multiplyScalar(.92);
  for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
    const u=i/n,v=j/m*2-1,az=mix(a0,a1,u)+v*width*Math.pow(1-u,.6);
    const theta=mix(thetaStart,thetaEnd,u);
    const pt=scalpPoint(cfg,theta,az,.002*Math.sin(Math.PI*u)*(1-v*v));p.push(...pt.toArray());
    const c=base.clone().lerp(shade,.3+.4*Math.abs(v));colors.push(c.r,c.g,c.b);
    if(i<n&&j<m){const k=i*(m+1)+j;idx.push(k,k+m+1,k+1,k+1,k+m+1,k+m+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
  head.add(new THREE.Mesh(g,material??new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})));
}

// ── 头总成：颈 + 曲面头 + 耳 + 发（配置驱动）+ 表情接口 ──
// cfg.emotions: {名字: 通道补丁}——setEmotion 先清零再套用，避免情绪串台。
export function stageHead(body,cfg,height){
  const head=new THREE.Group();head.name=cfg.name+'_head';head.position.set(0,height,cfg.headZ??0);body.add(head);
  if(cfg.headScale)head.scale.setScalar(cfg.headScale);
  const skinMat=new THREE.MeshToonMaterial({color:cfg.skin,gradientMap:ramp});
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(cfg.neckR,cfg.neckR*1.2,.17,20),skinMat);
  neck.position.set(0,height-.09,cfg.neckZ??-.01);body.add(neck); // 颈在 body：头绕颈根转，颈根留在领口
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const skull=outlined(head,headSurface(cfg),new THREE.MeshBasicMaterial({map:texture}),.0010);
  skull.castShadow=true;
  for(const side of [-1,1]){
    const ear=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),skinMat);
    ear.scale.set(.013,.024,.010);
    ear.position.set(side*(cfg.profile[3][1]+.004),.043,-.012);head.add(ear);
  }
  hairCap(head,cfg,cfg.hairMaterial);
  for(const [a0,a1,te,w,col] of cfg.hair.fringe??[])fringePanel(head,cfg,a0,a1,te,w,col,cfg.hairMaterial);
  for(const [a0,a1,ts,te,w,col] of cfg.hair.nape??[])napeLock(head,cfg,a0,a1,ts,te,w,col,cfg.hairMaterial);
  const BLANK={awe:0,sad:0,smile:0,firm:0,shock:0,daze:0,weary:0,tear:0};
  let last='';
  const state={...BLANK,blink:0,gazeX:0,gazeY:0,jaw:0};
  function draw(){
    const key=JSON.stringify(state);if(key===last)return;last=key;
    paintFace(ctx,cfg,state);texture.needsUpdate=true;
  }
  draw();
  return {head,skull,canvas,
    setEmotion(e='neutral',b){
      Object.assign(state,BLANK,cfg.emotions?.[e]??{});
      if(b!==undefined)state.blink=b;
      draw();
    },
    setActing(a){Object.assign(state,a);draw();},
    acting:state,
    lookAtWorld(target){head.updateWorldMatrix(true,false);const local=head.worldToLocal(target.clone());
      state.gazeX=clamp(local.x/Math.max(.3,Math.abs(local.z)),-1,1)*.6;
      state.gazeY=clamp(-local.y/Math.max(.3,Math.abs(local.z)),-1,1)*.5;draw();},
    mouth:{apply(lip){state.jaw=clamp(lip.jaw??0);draw();return {jaw:state.jaw};}},
    redraw(){last='';draw();},
  };
}
