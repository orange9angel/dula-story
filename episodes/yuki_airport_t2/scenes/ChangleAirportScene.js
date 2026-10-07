// 福州长乐机场 T2 出发大厅（全新积木场景，无现成注册表）。
// 布局：玻璃幕墙在 z=-12（外面是停机坪→海→天），马鞍墙波浪吊顶横跨 X，
// 树叶屏挂在中央轴，值机示范岛在 (-1.7,-2.8)，青橄榄自助机在 (2.8,-2.2)，
// 候机座椅排在右侧 (x≈2.8, z=2.6)，洗手间在 (3.4,-2.5) 斜向主舞台，
// 纪念品商店在 (-4.6,-6.4)。主舞台在原点附近。
import * as THREE from 'three';
import {SceneBase} from 'dula-engine';

const toon=c=>new THREE.MeshToonMaterial({color:c});
const basic=c=>new THREE.MeshBasicMaterial({color:c});

function canvasTex(w,h,draw){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  draw(canvas.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
// 树叶屏宣传片画面（监制指正：实景放的是城市宣传片，不是航班信息）——
// 三个变体：茉莉花 / 海浪 / 花+浪标题版，蓝绿暖橙渐变 + 白色茉莉 + 波纹。
function promoTexture(variant){
  return canvasTex(512,288,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,w,h);
    if(variant===1){g.addColorStop(0,'#3f9e8f');g.addColorStop(.6,'#7cc4b2');g.addColorStop(1,'#f0b46e');}
    else if(variant===2){g.addColorStop(0,'#2e7f9e');g.addColorStop(.6,'#5bb3c9');g.addColorStop(1,'#a8dcd8');}
    else{g.addColorStop(0,'#3aa5a0');g.addColorStop(.55,'#69c2b0');g.addColorStop(1,'#f5c87e');}
    c.fillStyle=g;c.fillRect(0,0,w,h);
    // 海浪波纹
    c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=5;c.lineCap='round';
    for(let r=0;r<3;r++){
      c.beginPath();
      for(let x=0;x<=w;x+=8)c.lineTo(x,h*.72+r*26+Math.sin(x/46+r)*10);
      c.stroke();
    }
    // 白色茉莉花（五瓣+花心）
    const flower=(fx,fy,s)=>{
      c.fillStyle='rgba(255,253,246,.95)';
      for(let p=0;p<5;p++){
        const a=p/5*Math.PI*2-Math.PI/2;
        c.beginPath();c.ellipse(fx+Math.cos(a)*s*.62,fy+Math.sin(a)*s*.62,s*.42,s*.62,a,0,Math.PI*2);c.fill();
      }
      c.fillStyle='#f2c14e';c.beginPath();c.arc(fx,fy,s*.20,0,Math.PI*2);c.fill();
    };
    if(variant!==2){flower(w*.32,h*.42,58);flower(w*.62,h*.30,34);}
    else{flower(w*.72,h*.34,40);}
    if(variant===0){
      c.fillStyle='rgba(255,255,255,.95)';c.textAlign='center';
      c.font='bold 52px Microsoft YaHei';c.fillText('有福之州',w/2,h*.40);
      c.font='26px Microsoft YaHei';c.fillText('幸福之城 · 滨海福州',w/2,h*.40+42);
    }
  });
}
function kioskTexture(){
  return canvasTex(256,320,(c,w,h)=>{
    c.fillStyle='#eef6e2';c.fillRect(0,0,w,h);
    c.fillStyle='#5c7a35';c.fillRect(0,0,w,64);
    c.fillStyle='#fff';c.font='bold 30px Microsoft YaHei';c.textAlign='center';
    c.fillText('自助值机',w/2,42);
    c.fillStyle='#7f9b4e';c.beginPath();c.ellipse(w/2,150,56,40,-.5,0,Math.PI*2);c.fill();
    c.fillStyle='#44584f';c.font='20px Microsoft YaHei';
    c.fillText('扫描证件 / 人脸识别',w/2,230);c.fillText('打印登机牌 · 行李条',w/2,264);
  });
}
function restroomSignTexture(){
  return canvasTex(512,128,(c,w,h)=>{
    c.fillStyle='#28418f';c.fillRect(0,0,w,h);
    c.fillStyle='#fff';c.font='bold 44px Microsoft YaHei';c.textAlign='center';
    c.fillText('洗手间  Restroom',w/2,72);
  });
}
function stallDisplayTexture(){
  return canvasTex(256,384,(c,w,h)=>{
    c.fillStyle='#10202c';c.fillRect(0,0,w,h);
    c.fillStyle='#e8f4ff';c.font='bold 30px Microsoft YaHei';c.textAlign='center';
    c.fillText('厕位余量',w/2,48);
    const rows=[['女卫',12,18],['男卫',9,15],['无障碍',2,3]];
    rows.forEach((r,i)=>{
      const y=104+i*88;c.fillStyle='#9fc6e8';c.font='24px Microsoft YaHei';c.textAlign='left';
      c.fillText(r[0],18,y);
      for(let k=0;k<r[2];k++){
        c.fillStyle=k<r[1]?'#58d68b':'#31465a';
        c.fillRect(80+k*(150/r[2]),y-20,150/r[2]-5,26);
      }
      c.fillStyle='#e8f4ff';c.textAlign='right';c.fillText(`${r[1]}/${r[2]}`,w-16,y);
    });
    c.fillStyle='#58d68b';c.textAlign='center';c.font='22px Microsoft YaHei';
    c.fillText('智能马桶垫 · 自动更换',w/2,h-24);
  });
}
function shopSignTexture(){
  return canvasTex(512,128,(c,w,h)=>{
    c.fillStyle='#a3452e';c.fillRect(0,0,w,h);
    c.fillStyle='#ffe8c8';c.font='bold 46px Microsoft YaHei';c.textAlign='center';
    c.fillText('纪念品商店 Gift Shop',w/2,74);
  });
}
function checkinSignTexture(){
  return canvasTex(512,128,(c,w,h)=>{
    c.fillStyle='#1f6f6a';c.fillRect(0,0,w,h);
    c.fillStyle='#eafff8';c.font='bold 44px Microsoft YaHei';c.textAlign='center';
    c.fillText('值机岛 A · Check-in',w/2,72);
  });
}
function skyTexture(){
  return canvasTex(64,512,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#8ec6e2');g.addColorStop(.55,'#cfe8ef');g.addColorStop(.78,'#f2ede0');g.addColorStop(1,'#e8f0ea');
    c.fillStyle=g;c.fillRect(0,0,w,h);
  });
}
function seaTexture(){
  return canvasTex(64,512,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#9fd0d8');g.addColorStop(.25,'#5b9eb8');g.addColorStop(.7,'#3f7f9e');g.addColorStop(1,'#356f8c');
    c.fillStyle=g;c.fillRect(0,0,w,h);
    c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=2;
    for(let i=0;i<14;i++){const y=40+i*32+((i*37)%13);c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  });
}

export class ChangleAirportScene extends SceneBase {
  roofY(x,z=-3){return 6.0+1.0*Math.cos(x*Math.PI/8)+.55*Math.sin((z+2)*Math.PI/6);}
  // 白色马鞍脊梁（实景 t2_concourse_saddle）：沿主轴 z 连续重复的几字形拱单元
  saddleUnits=[-12.4,-8.8,-5.2,-1.6,2.0,5.6];
  saddleP(x){return 1.9*Math.exp(-((x/1.05)**2))+0.6*Math.exp(-(((Math.abs(x)-2.6)/.5)**2));}
  saddleTopY(z){const u=(((z+12.4)%3.6)+3.6)%3.6/3.6;return 4.55+this.saddleP(0)*(0.85+0.15*Math.cos((u-.5)*2*Math.PI));}
  build(){
    this.scene.background=new THREE.Color('#cfe2ea');
    this.scene.add(new THREE.HemisphereLight(0xfdf1dc,0x9a9186,1.25));
    const sun=new THREE.DirectionalLight(0xffe8c8,1.15);
    sun.position.set(-4,7.5,-9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,far:40});sun.shadow.bias=-.0004;
    this.scene.add(sun);
    const fill=new THREE.DirectionalLight(0xdfeaf2,.35);fill.position.set(3,4,8);this.scene.add(fill);

    const box=(parent,n,p,s,c,opts={})=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(...s),opts.basic?basic(c):toon(c));
      m.name=n;m.position.set(...p);m.castShadow=opts.shadow??false;m.receiveShadow=true;
      if(opts.ry)m.rotation.y=opts.ry;if(opts.rx)m.rotation.x=opts.rx;if(opts.rz)m.rotation.z=opts.rz;
      parent.add(m);return m;
    };

    // ── 地面：灰底 + 橙红叶片轮廓地毯（实景 t2_concourse_saddle）──
    {
      const carpet=canvasTex(1024,1024,(c,w,h)=>{
        c.fillStyle='#aaa69f';c.fillRect(0,0,w,h);
        let seed=20260916;
        const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
        for(let i=0;i<45;i++){
          const x=rnd()*w,y=rnd()*h,rx=40+rnd()*95,ry=rx*(.45+rnd()*.45),rot=rnd()*Math.PI;
          c.save();c.translate(x,y);c.rotate(rot);
          c.strokeStyle=rnd()<.25?'rgba(240,238,232,.45)':'rgba(206,78,44,.42)';
          c.lineWidth=4+rnd()*3;
          c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.stroke();
          c.beginPath();c.moveTo(-rx*.7,0);c.quadraticCurveTo(0,ry*.35,rx*.7,0);c.stroke();
          c.restore();
        }
      });
      carpet.wrapS=carpet.wrapT=THREE.RepeatWrapping;carpet.repeat.set(4,4);
      const floor=new THREE.Mesh(new THREE.BoxGeometry(30,.16,26),
        new THREE.MeshToonMaterial({map:carpet,color:'#ffffff'}));
      floor.name='hall_floor';floor.position.set(0,-.08,-2);floor.receiveShadow=true;this.scene.add(floor);
    }

    // ── 马鞍墙波浪吊顶（实景 t2_hall_ceiling/t2_exterior2）：
    // 参数化波浪曲面（横向大 S 弧 + 纵向滚浪），贴木色条板纹理（板间白色发光缝），
    // 曲面法线朝下可见用 DoubleSide，computeVertexNormals 自动给浪面受光。
    {
      const NX=104,NZ=96,X0=-13,X1=13,Z0=-15,Z1=9;
      const pos=[],uvs=[],idx=[];
      for(let i=0;i<=NX;i++)for(let j=0;j<=NZ;j++){
        const x=X0+(X1-X0)*i/NX,z=Z0+(Z1-Z0)*j/NZ;
        pos.push(x,this.roofY(x,z),z);uvs.push(i/NX,j/NZ);
      }
      for(let i=0;i<NX;i++)for(let j=0;j<NZ;j++){
        const a=i*(NZ+1)+j,b=a+NZ+1;idx.push(a,b,a+1,b,b+1,a+1);
      }
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      g.setIndex(idx);g.computeVertexNormals();
      // 条板纹理：沿 X 密排的木色板 + 板缝白色发光带（u 跨 26m ≈ 74 条）
      const slatTex=canvasTex(1024,64,(c,w,h)=>{
        const n=74,bw=w/n;
        for(let k=0;k<n;k++){
          const v=(k*37%5)/5;
          c.fillStyle=`rgb(${202+Math.round(v*14)},${162+Math.round(v*10)},${110+Math.round(v*8)})`;
          c.fillRect(k*bw,0,bw,h);
          c.fillStyle='rgba(255,250,238,.95)';c.fillRect(k*bw,0,2.2,h); // 发光缝
        }
      });
      slatTex.wrapS=THREE.RepeatWrapping;
      const roof=new THREE.Mesh(g,new THREE.MeshToonMaterial({map:slatTex,side:THREE.DoubleSide}));
      roof.name='roof_wave';this.scene.add(roof);
    }
    // 白色膜结构喇叭口天窗阵列（倒漏斗/马蹄莲，口部采光）：中列 3 + 侧列 2×4
    {
      const pts=[[.14,0],[.16,.5],[.22,1.1],[.45,1.7],[.85,2.15],[1.30,2.42],[1.55,2.55]]
        .map(([r,y])=>new THREE.Vector2(r,y));
      const geo=new THREE.LatheGeometry(pts,28);
      const membrane=new THREE.MeshToonMaterial({color:'#f6f1e6',emissive:'#fff6e2',emissiveIntensity:.30,side:THREE.DoubleSide});
      const glow=basic('#fffdf2');
      // 喇叭口阵列只放两侧（出发大厅区）；中轴让给马鞍脊梁（实景里属不同区域）
      const spots=[];
      for(const sx of [-4.2,4.2])for(const z of [-7.2,-3.7,-.2,3.3])spots.push([sx,z]);
      this.funnels=[];
      for(const [x,z] of spots){
        const topY=this.roofY(x,z)+.06;
        const f=new THREE.Mesh(geo,membrane);f.position.set(x,topY-2.55,z);this.scene.add(f);
        const mouth=new THREE.Mesh(new THREE.CircleGeometry(1.42,32),glow);
        mouth.rotation.x=Math.PI/2;mouth.position.set(x,topY-.06,z);this.scene.add(mouth);
        this.funnels.push(f);
      }
    }

    // ── 白色马鞍脊梁（实景 t2_concourse_saddle 的签名元素）：
    // 沿主轴 z 的几字形拱单元阵列（两边低垂、中间耸起尖拱，节与节之间露出木条板），
    // 脊梁顶连续长条采光天窗。白色雕塑壳低于两侧木色浪面，垂坠感是形态重点。
    {
      const HX=3.5,NX=40,NU=14,L=2.6;
      const pos=[],uvs=[],idx=[];let base=0;
      for(const zc of this.saddleUnits){
        for(let i=0;i<=NX;i++)for(let j=0;j<=NU;j++){
          const x=-HX+2*HX*i/NX,u=j/NU,z=zc+(u-.5)*L;
          pos.push(x,4.55+this.saddleP(x)*(0.85+0.15*Math.cos((u-.5)*2*Math.PI)),z);
          uvs.push(i/NX,u);
        }
        for(let i=0;i<NX;i++)for(let j=0;j<NU;j++){
          const a=base+i*(NU+1)+j,b=a+NU+1;idx.push(a,b,a+1,b,b+1,a+1);
        }
        base+=(NX+1)*(NU+1);
      }
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      g.setIndex(idx);g.computeVertexNormals();
      const shell=new THREE.Mesh(g,new THREE.MeshToonMaterial({color:'#ece7dc',side:THREE.DoubleSide}));
      shell.name='saddle_spine';this.scene.add(shell);
      // 脊梁顶采光天窗长条（跟随拱顶起伏的连续发光带）
      const rp=[],ri=[],NZ=140;
      for(let j=0;j<=NZ;j++){
        const z=-13.4+20.8*j/NZ,y=this.saddleTopY(z)+.03;
        rp.push(-.28,y,z,.28,y,z);
      }
      for(let j=0;j<NZ;j++){const a=j*2;ri.push(a,a+1,a+2,a+1,a+3,a+2);}
      const rg=new THREE.BufferGeometry();
      rg.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));
      rg.setIndex(ri);
      const ribbon=new THREE.Mesh(rg,basic('#fffdf2'));
      ribbon.material.side=THREE.DoubleSide;ribbon.name='saddle_skylight';this.scene.add(ribbon);
    }

    // ── 树叶状吊顶液晶屏（循环播放城市宣传片）──
    const boards=[promoTexture(0),promoTexture(1),promoTexture(2)];
    this.leaves=[];
    for(const [li,[x,y,z,s]] of [[0,4.35,1.6,1],[0,4.55,-1.6,.92],[0,4.75,-4.8,.85],[-2.6,4.5,-3.2,.72],[2.6,4.5,-3.2,.72]].entries()){
      const g=new THREE.Group();g.position.set(x,y,z);this.scene.add(g);
      const rodTop=(x===0?this.saddleTopY(z)-.10:this.roofY(x,z)-.3); // 中央轴挂在马鞍脊梁下，两侧挂浪面下
      for(const rx of [-.55*s,.55*s]){
        const rod=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,rodTop-y,6),toon('#5a666e'));
        rod.position.set(rx,(rodTop-y)/2,0);g.add(rod);
      }
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),toon('#274b52'));
      leaf.scale.set(1.12*s,.14*s,.62*s);leaf.rotation.x=.32;g.add(leaf);
      const screen=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({map:boards[li%3]}));
      screen.scale.set(1.02*s,.46*s,1);screen.rotation.x=Math.PI/2-.35;screen.position.y=-.105*s;g.add(screen);
      this.leaves.push(g);
    }

    // ── 玻璃幕墙 + 窗外：停机坪 / 飞机 / 海 / 天 ──
    const glass=new THREE.Mesh(new THREE.PlaneGeometry(27,8.4),
      new THREE.MeshBasicMaterial({color:'#cfe4ee',transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
    glass.position.set(0,4.0,-12);this.scene.add(glass);
    for(let x=-13;x<=13;x+=1.55)box(this.scene,'mullion',[x,4.0,-12],[.09,8.4,.12],'#41525c');
    for(const y of [.12,2.9,5.7,8.3])box(this.scene,'mullion_h',[0,y,-12],[27,.1,.12],'#41525c');
    box(this.scene,'apron',[0,-.06,-17.1],[60,.1,10.2],'#9aa4a8');
    for(let x=-24;x<=24;x+=6)box(this.scene,'apron_mark',[x,.002,-15],[2.4,.004,.16],'#e8e4d2');
    // 远处停机坪上的飞机（剪影积木）
    {
      const plane=new THREE.Group();plane.position.set(5.5,0,-21);plane.rotation.y=.9;this.scene.add(plane);
      const fus=new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,7.2,20),toon('#dde3e6'));
      fus.rotation.z=Math.PI/2;fus.position.y=1.5;plane.add(fus);
      const nose=new THREE.Mesh(new THREE.SphereGeometry(.85,20,16),toon('#eef1f2'));
      nose.scale.set(1.4,1,1);nose.position.set(3.6,1.5,0);plane.add(nose);
      box(plane,'wing',[.2,1.35,0],[2.6,.12,7.2],'#dfe4e6');
      box(plane,'tailfin',[-3.4,2.6,0],[.9,1.7,.14],'#2e7f86');
      box(plane,'tailwing',[-3.4,2.2,0],[.8,.1,2.6],'#2e7f86');
      for(const ex of [[.6,1.0,2.2],[.6,1.0,-2.2]]){
        const eng=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,1.1,12),toon('#c9d2d4'));
        eng.rotation.z=Math.PI/2;eng.position.set(...ex);plane.add(eng);
      }
    }
    // ── GTC 综合交通中心（在建，T1/T2 之间陆侧；实景口径：地下 2 层地上 4 层、
    // 与 T2 同为曲线金属屋面）——窗外左侧的大工地：体量 + 波浪屋面雏形 + 塔吊 + 防护网 ──
    {
      const g=new THREE.Group();g.position.set(-7,0,-18.5);g.rotation.y=.12;this.scene.add(g);
      box(g,'gtc_base',[0,.5,0],[11,1,8],'#7e8589');
      box(g,'gtc_mass',[0,2.6,0],[10,4.8,7],'#a8b2b5');
      // 曲线金属屋面雏形（与 T2 波浪屋面呼应）
      const NX=20,NZ=14,rp=[],ruv=[],ri=[];
      for(let i=0;i<=NX;i++)for(let j=0;j<=NZ;j++){
        const x=-5.4+10.8*i/NX,z=-4+8*j/NZ;
        rp.push(x,5.0+.8*Math.cos(x*Math.PI/5.4)+.25*Math.sin(z*1.2),z);ruv.push(i/NX,j/NZ);
      }
      for(let i=0;i<NX;i++)for(let j=0;j<NZ;j++){const a=i*(NZ+1)+j,b=a+NZ+1;ri.push(a,b,a+1,b,b+1,a+1);}
      const rg=new THREE.BufferGeometry();
      rg.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));
      rg.setAttribute('uv',new THREE.Float32BufferAttribute(ruv,2));
      rg.setIndex(ri);rg.computeVertexNormals();
      const roof=new THREE.Mesh(rg,new THREE.MeshToonMaterial({color:'#9fb2bb',side:THREE.DoubleSide}));
      g.add(roof);
      // 防护网（前立面局部挂绿网）+ 脚手架立杆
      const net=new THREE.Mesh(new THREE.PlaneGeometry(5,2.6),
        new THREE.MeshBasicMaterial({color:'#2f8d4e',transparent:true,opacity:.5,side:THREE.DoubleSide}));
      net.position.set(1.6,3.4,3.53);g.add(net);
      for(let k=0;k<6;k++)box(g,'gtc_scaffold',[-.6+k*.9,3.4,3.6],[.05,2.6,.05],'#7d8489');
      // 塔吊两台（黄色，靠近侧那台高出屋面进入天窗带）
      for(const [cx,cz,ch] of [[.5,4.6,12.5],[4.5,-2,13]]){
        box(g,'crane_mast',[cx,ch/2,cz],[.34,ch,.34],'#dfa638');
        box(g,'crane_jib',[cx+1.8,ch+.15,cz],[3.9,.22,.22],'#dfa638');
        box(g,'crane_counter',[cx-1.1,ch+.15,cz],[1.6,.3,.3],'#c98f2e');
        box(g,'crane_cab',[cx,ch-.35,cz],[.6,.7,.6],'#c98f2e');
        box(g,'crane_cable',[cx+3.2,ch-1.6,cz],[.03,3.2,.03],'#6b6f72');
        box(g,'crane_hook',[cx+3.2,ch-3.3,cz],[.22,.3,.22],'#8a5a28');
      }
    }
    const sea=new THREE.Mesh(new THREE.PlaneGeometry(160,56),new THREE.MeshBasicMaterial({map:seaTexture()}));
    sea.rotation.x=-Math.PI/2;sea.rotation.z=Math.PI;sea.position.set(0,-.02,-50.5);this.scene.add(sea);
    const sky=new THREE.Mesh(new THREE.PlaneGeometry(180,50),new THREE.MeshBasicMaterial({map:skyTexture()}));
    sky.position.set(0,17,-78);this.scene.add(sky);

    // ── 立柱：前排木色包柱大圆柱（t2_hall2），后排树状分叉柱（t2_hall_ceiling 的 Y 形柱）──
    for(const [x,z] of [[-5.2,4.5],[5.2,4.5]]){
      const h=this.roofY(x,z)+.1;
      const col=new THREE.Mesh(new THREE.CylinderGeometry(.42,.48,h,20),toon('#c9a06b'));
      col.position.set(x,h/2,z);col.castShadow=true;this.scene.add(col);
    }
    for(const [x,z] of [[-5.2,-7.5],[5.2,-7.5]]){
      const g=new THREE.Group();g.position.set(x,0,z);this.scene.add(g);
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.30,.38,3.7,16),toon('#cfa877'));
      trunk.position.y=1.85;trunk.castShadow=true;g.add(trunk);
      const topY=this.roofY(x,z)-.1;
      for(const bsign of [-1,1]){
        const len=Math.hypot(1.15,topY-3.55);
        const br=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,len,12),toon('#cfa877'));
        br.position.set(bsign*.575,(3.55+topY)/2,0);
        br.rotation.z=bsign*Math.atan2(1.15,topY-3.55);
        g.add(br);
      }
    }

    // ── 值机示范岛（零高差传送带矮台）──
    {
      const g=new THREE.Group();g.position.set(-1.7,0,-2.8);this.scene.add(g);this.checkin=g;
      box(g,'counter',[0,.39,0],[2.3,.78,.6],'#f2efe8',{shadow:true});
      box(g,'counter_top',[0,.795,0],[2.4,.03,.7],'#cfdcd6');
      // 零高差行李带：与地面齐平的矮台
      box(g,'belt',[0,.05,.68],[2.0,.10,.6],'#3a4148');
      for(let k=0;k<8;k++)box(g,'belt_roller',[-.88+k*.25,.105,.68],[.18,.012,.55],'#4c565e');
      box(g,'belt_ramp',[0,.03,1.06],[2.0,.06,.22],'#59646c',{rx:-.12});
      box(g,'scale_display',[.9,1.06,-.12],[.3,.5,.05],'#2c3e46',{rx:-.2});
      // 值机岛吊牌
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.0,.5),new THREE.MeshBasicMaterial({map:checkinSignTexture(),side:THREE.DoubleSide}));
      sign.position.set(0,2.5,0);g.add(sign);
      for(const px of [-1.1,1.1]){
        const post=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1.72,8),toon('#5a666e'));
        post.position.set(px,2.6,0);g.add(post);
      }
    }

    // ── “青橄榄”自助值机 ──
    const kioskTex=kioskTexture();
    for(let k=0;k<3;k++){
      const g=new THREE.Group();g.position.set(0.2+k*.72,0,-3.4);g.rotation.y=-.25;this.scene.add(g);
      box(g,'kiosk_base',[0,.06,0],[.4,.12,.4],'#5c6658');
      const olive=new THREE.Mesh(new THREE.SphereGeometry(1,24,20),toon('#7f9b4e'));
      olive.scale.set(.24,.55,.24);olive.position.y=.62;olive.castShadow=true;g.add(olive);
      const scr=new THREE.Mesh(new THREE.PlaneGeometry(.26,.33),new THREE.MeshBasicMaterial({map:kioskTex}));
      scr.position.set(0,.72,.235);scr.rotation.x=-.18;g.add(scr);
    }

    // ── 候机座椅排（每个带 USB 小方块）──
    this.seats=[];
    for(let k=0;k<5;k++){
      const x=1.0+k*.64,z=2.6;
      const g=new THREE.Group();g.position.set(x,0,z);this.scene.add(g);
      const c=k%2?'#4f8f8b':'#67a39b';
      box(g,'seat',[0,.42,0],[.5,.09,.5],c,{shadow:true});
      box(g,'back',[0,.72,-.24],[.5,.58,.08],c,{rx:-.12,shadow:true});
      for(const sx of [-.26,.26])box(g,'arm',[sx,.5,0],[.06,.14,.44],'#3d5a58');
      for(const sx of [-.2,.2])box(g,'leg',[sx,.19,0],[.05,.38,.08],'#39484f');
      // USB 接口细节：扶手顶面前端的小方块 + 白点
      box(g,'usb',[.26,.575,.15],[.06,.014,.05],'#20262c');
      box(g,'usb_dot',[.26,.583,.15],[.02,.004,.02],'#9fd8f0',{basic:true});
      this.seats.push(g);
    }
    this.catSeat={x:1.0+2*.64,z:2.6,cushionY:.465};

    // ── 洗手间（门口 + 智能显示屏 + 指纹/掌纹感应面板 + 里面一只智能马桶）──
    {
      const g=new THREE.Group();g.position.set(3.5,0,-2.4);g.rotation.y=-.62;this.scene.add(g);this.restroom=g;
      box(g,'wall_l',[-1.15,1.55,0],[1.5,3.1,.16],'#e6e0d2',{shadow:true});
      box(g,'wall_r',[1.15,1.55,0],[1.5,3.1,.16],'#e6e0d2',{shadow:true});
      box(g,'wall_top',[0,2.75,0],[3.3,.7,.16],'#e6e0d2');
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.38),new THREE.MeshBasicMaterial({map:restroomSignTexture()}));
      sign.position.set(0,2.32,.09);g.add(sign);
      // 门口智能显示屏
      box(g,'display_case',[-.95,1.35,.12],[.52,.78,.07],'#22303a');
      const disp=new THREE.Mesh(new THREE.PlaneGeometry(.44,.68),new THREE.MeshBasicMaterial({map:stallDisplayTexture()}));
      disp.position.set(-.95,1.35,.165);g.add(disp);
      // 指纹/掌纹感应面板：独立于墙体的导览桩（门口旁，猫爪可及、镜头不被猫身挡）
      const pad=new THREE.Group();pad.position.set(2.78,0,-1.08);pad.rotation.y=-.78;this.scene.add(pad);this.pawPad=pad;
      box(pad,'pad_post',[0,.28,0],[.09,.56,.09],'#5a666e');
      box(pad,'pad_panel',[0,.68,.02],[.20,.20,.05],'#22303a');
      const pawTex=canvasTex(128,128,(c)=>{
        c.fillStyle='#101c26';c.fillRect(0,0,128,128);
        c.fillStyle='#7de89b';
        c.beginPath();c.ellipse(64,78,26,20,0,0,Math.PI*2);c.fill();
        for(const [x,y] of [[38,44],[58,34],[78,34],[94,48]]){c.beginPath();c.ellipse(x,y,10,13,0,0,Math.PI*2);c.fill();}
      });
      this.padGlow=new THREE.Mesh(new THREE.PlaneGeometry(.17,.17),new THREE.MeshBasicMaterial({map:pawTex}));
      this.padGlow.position.set(0,.68,.05);pad.add(this.padGlow);
      // 里面的智能马桶（门口视角可见一角）
      box(g,'inner_floor',[0,.01,-1.0],[3.0,.02,2.2],'#cfd8d4');
      const toilet=new THREE.Group();toilet.position.set(.55,0,-1.15);toilet.rotation.y=.5;g.add(toilet);
      box(toilet,'tank',[0,.52,-.2],[.4,.5,.22],'#f4f6f4');
      const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.19,.15,.34,20),toon('#f4f6f4'));
      bowl.position.set(0,.2,.05);toilet.add(bowl);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.16,.035,10,24),toon('#e8f0ee'));
      ring.rotation.x=Math.PI/2;ring.position.set(0,.40,.05);toilet.add(ring);
      box(toilet,'seat_sensor',[0,.62,-.12],[.12,.05,.05],'#7fb7c9',{basic:true});
    }

    // ── 纪念品商店（远景）──
    {
      const g=new THREE.Group();g.position.set(-4.6,0,-6.4);this.scene.add(g);
      box(g,'shop_base',[0,1.05,0],[3.4,2.1,.2],'#d9c8b2');
      box(g,'shop_window',[0,.95,.11],[2.9,1.3,.06],'#3d4c56');
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.5),new THREE.MeshBasicMaterial({map:shopSignTexture()}));
      sign.position.set(0,2.32,.12);g.add(sign);
      for(let k=0;k<4;k++)box(g,'shelf_box',[-1.0+k*.66,.72,.16],[.4,.3,.1],['#e0b65b','#d67c68','#7f9b4e','#5b9eb8'][k]);
      const fish=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),toon('#e8a34f'));
      fish.scale.set(.16,.10,.09);fish.position.set(.35,1.18,.16);g.add(fish);
      const tail=new THREE.Mesh(new THREE.ConeGeometry(.07,.12,8),toon('#d98a3c'));
      tail.rotation.z=Math.PI/2;tail.position.set(.53,1.18,.16);g.add(tail);
    }

    // ── 登机口导向吊牌（收尾空镜方向）──
    {
      const gateTex=canvasTex(512,128,(c,w,h)=>{
        c.fillStyle='#28418f';c.fillRect(0,0,w,h);
        c.fillStyle='#fff';c.font='bold 42px Microsoft YaHei';c.textAlign='center';
        c.fillText('登机口 Gates  A01-A19 ↓',w/2,72);
      });
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.65),new THREE.MeshBasicMaterial({map:gateTex,side:THREE.DoubleSide}));
      sign.position.set(-2.5,3.4,-10.5);this.scene.add(sign);
    }

    // ── 小雪的行李箱（viewer 驱动：pull/park/push 三态）──
    {
      const g=new THREE.Group();this.scene.add(g);this.suitcase=g;
      box(g,'case',[0,.30,0],[.34,.48,.20],'#d96a5a',{shadow:true});
      box(g,'case_band',[0,.30,.105],[.34,.07,.012],'#f2e3ce',{basic:true});
      for(const rx of [-.07,.07]){
        const rod=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,.42,8),toon('#8a939a'));
        rod.position.set(rx,.72,-.05);g.add(rod);
      }
      box(g,'grip',[0,.945,-.05],[.20,.035,.05],'#5a666e');
      for(const [wx,wz] of [[-.12,-.06],[.12,-.06],[-.12,.06],[.12,.06]]){
        const wheel=new THREE.Mesh(new THREE.SphereGeometry(.028,10,8),toon('#39484f'));
        wheel.position.set(wx,.028,wz);g.add(wheel);
      }
      this.suitcaseGrip=new THREE.Object3D();this.suitcaseGrip.position.set(0,.945,-.05);g.add(this.suitcaseGrip);
      g.position.set(-.95,0,.62);
    }

    // ── 年糕的手机（cat_phone 时挂在爪上）──
    {
      const g=new THREE.Group();this.scene.add(g);this.phone=g;
      box(g,'phone_body',[0,0,0],[.055,.11,.008],'#22303a');
      const scr=new THREE.Mesh(new THREE.PlaneGeometry(.048,.10),basic('#9fd8f0'));
      scr.position.z=.005;g.add(scr);
      g.visible=false;
    }
  }
}
