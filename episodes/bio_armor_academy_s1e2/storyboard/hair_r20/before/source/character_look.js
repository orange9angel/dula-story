// Shared face artwork for dialogue and the approved counterattack performance.
// Curved geometry supplies the silhouette; eyes, brows and mouth share one surface.
import * as THREE from 'three';
import {SKIN,skinMaterial} from './character_finish.js';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;

function outlined(parent,geometry,material,width=.0014){
  const mesh=new THREE.Mesh(geometry,material);parent.add(mesh);mesh.castShadow=true;
  const ink=new THREE.MeshBasicMaterial({color:'#3a3039',side:THREE.BackSide});
  ink.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed += normal * ${width.toFixed(5)};`);};
  ink.customProgramCacheKey=()=>`portrait-outline-${width}`;
  mesh.add(new THREE.Mesh(geometry,ink));return mesh;
}
function surface(strong){
  // y, half width, front depth, back depth, forward chin offset.
  const profile=strong?
    [[-.077,.050,.069,.034,.033],[-.058,.081,.087,.06,.023],[-.018,.111,.112,.099,.004],[.042,.128,.132,.119,0],[.105,.126,.131,.128,0],[.166,.108,.112,.12,0],[.212,.065,.077,.083,0],[.232,.001,.001,.001,0]]:
    [[-.073,.025,.058,.025,.032],[-.055,.052,.080,.048,.019],[-.021,.079,.106,.082,.006],[.038,.108,.125,.112,0],[.105,.112,.125,.12,0],[.164,.095,.108,.112,0],[.211,.052,.068,.072,0],[.231,.001,.001,.001,0]];
  const positions=[],uv=[],indices=[],n=40,rows=(profile.length-1)*6;
  // Duplicate the two side seams. No triangle may interpolate from the front
  // face artwork across to a constant rear-head UV (that smears facial features).
  for(let half=0;half<2;half++){
  const start=positions.length/3;
  for(let row=0;row<=rows;row++){
    const p=row/6,k=Math.min(profile.length-2,Math.floor(p)),f=p-k;
    const a=profile[k],b=profile[k+1];
    const values=a.map((v,i)=>{
      if(i===0)return mix(v,b[i],f);
      const prev=profile[Math.max(0,k-1)][i],next=profile[Math.min(profile.length-1,k+2)][i];
      return Math.max(i===4?-1:.001,.5*((2*v)+(-prev+b[i])*f+(2*prev-5*v+4*b[i]-next)*f*f+(-prev+3*v-3*b[i]+next)*f*f*f));
    });
    const [y,rx,frontDepth,backDepth,shift]=values;
    for(let j=0;j<=n;j++){
      const angle=-Math.PI/2+half*Math.PI+j/n*Math.PI,c=Math.cos(angle),x=rx*Math.sin(angle);
      const front=clamp(c),plane=c>=0?(c*.78+Math.sin(c*Math.PI/2)*.22):c;
      const nose=Math.exp(-((x/(strong?.016:.014))**2))*
        (.016*Math.exp(-(((y-.045)/.019)**2))+.004*Math.exp(-(((y-.083)/.039)**2)))*front**12;
      const lip=.003*Math.exp(-((x/.022)**2)-((y-.004)/.017)**2)*front**8;
      const jawLift=.028*Math.max(0,1-row/6)**2*(1-c)*.5;
      positions.push(x,y+jawLift,(c>=0?frontDepth:backDepth)*plane+shift+nose+lip);
      uv.push(half===0?.5+x/.30:.015,half===0?(y+.073)/.305:.48);
      if(row<rows&&j<n){const q=start+row*(n+1)+j;indices.push(q,q+1,q+n+1,q+1,q+n+2,q+n+1);}
    }
  }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function scalpPoint(strong,theta,azimuth,lift=0){
  const s=Math.sin(theta),c=Math.cos(theta),rx=strong?.137:.129,rz=strong?.149:.145;
  let y=.075+(strong?.199:.178)*c;
  if(strong){
    // Soften the flat crown without pushing the front mid-scalp into the skull.
    const h=clamp(.5+.5*(.240-y)/.025);
    y=mix(.240,y,h)-.025*h*(1-h);
  }
  return new THREE.Vector3((rx+lift)*s*Math.sin(azimuth),y+lift*c,(rz+lift)*s*Math.cos(azimuth)-.007);
}
function hairGeometry(strong){
  const p=[],colors=[],idx=[],n=80,m=28;
  for(let i=0;i<=m;i++)for(let j=0;j<=n;j++){
    const a=j/n*TAU,front=Math.cos(a);
    const end=strong?(front>0?1.00+(1-front)*.73:1.73-front*.22):(front>0?1.14+(1-front)*.59:1.73-front*.26);
    const wave=(strong?.018:.047)*Math.sin(a*(strong?17:9))*(i/m)**7;
    const point=scalpPoint(strong,i/m*end+wave,a);p.push(...point.toArray());
    const color=new THREE.Color(strong?'#30303a':'#503a3b');
    if(strong)color.lerp(new THREE.Color('#40404a'),clamp((Math.cos(a+.65)+.1)/1.1)*.68);
    colors.push(color.r,color.g,color.b);
    if(i<m&&j<n){const k=i*(n+1)+j;idx.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function sweptTuft(parent,a,b,c,width,color){
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a),new THREE.Vector3(...b),new THREE.Vector3(...c));
  const points=[],indices=[],n=16,sides=8;
  for(let i=0;i<=n;i++){
    const u=i/n,p=curve.getPoint(u),t=curve.getTangent(u).normalize();
    const right=new THREE.Vector3(0,0,1).cross(t).normalize(),up=t.clone().cross(right);
    const r=width*Math.pow(1-u,.75)+.00015;
    for(let j=0;j<=sides;j++){
      const angle=j/sides*TAU,v=p.clone().addScaledVector(right,Math.cos(angle)*r).addScaledVector(up,Math.sin(angle)*r*.40);points.push(...v.toArray());
      if(i<n&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();
  outlined(parent,g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}),.0006);
}
function hairPanel(parent,strong,start,end,thetaEnd,width,color){
  const p=[],colors=[],idx=[],n=24,m=8,base=new THREE.Color(color),shade=base.clone().multiplyScalar(.86);
  for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
    const u=i/n,v=j/m*2-1,az=mix(start,end,u)+v*width*Math.pow(1-u,.65);
    const theta=mix(.30,thetaEnd,u),bulge=.002+.007*Math.sin(Math.PI*u)*(1-v*v);
    const point=scalpPoint(strong,theta,az,bulge);p.push(...point.toArray());
    const c=base.clone().lerp(shade,clamp((v+.15)*.75));colors.push(c.r,c.g,c.b);
    if(i<n&&j<m){const k=i*(m+1)+j;idx.push(k,k+m+1,k+1,k+1,k+m+1,k+m+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));parent.add(mesh);return mesh;
}

function paintFace(ctx,strong,emotion,blink,lip,acting,gaze){
  const g=ctx;g.setTransform(2,0,0,2,0,0);g.clearRect(0,0,512,512);
  const fear=clamp(acting?.fear??(emotion==='scared'?.8:emotion==='worry'?.35:0));
  const focus=clamp(acting?.focus??(['determined','declare','angry'].includes(emotion)?.75:0));
  const smile=emotion==='laugh'?1:0,close=clamp(acting?.blink??blink);
  const palette=SKIN[strong?'hong':'lei'],skin=palette.base;
  g.fillStyle=skin;g.fillRect(0,0,512,512);
  // The prior fixed forehead/cheek polygons looked like different skin patches.
  // Keep a single base here; silhouette, eyes and nose provide the form.
  const eyeY=strong?242:244,dx=strong?95:90;
  const gazeX=clamp(acting?.gazeX??gaze.x,-1,1),gazeY=clamp(acting?.gazeY??gaze.y,-1,1);
  for(const side of [-1,1]){
    const cx=256+side*dx,openness=1-close;
    const h=(strong?24:32)*(1+.20*fear-.23*focus),upper=h*openness,lower=h*.45*openness;
    const isClosed=openness<.045||smile>.5;
    g.save();g.translate(cx,eyeY);g.scale(side,1);
    const eye=()=>{g.beginPath();g.moveTo(-51,1);g.bezierCurveTo(-26,-upper,20,-upper*1.05,53,-7*openness);g.quadraticCurveTo(28,lower,-22,lower*.86);g.quadraticCurveTo(-41,lower*.55,-51,1);g.closePath();};
    if(!isClosed){
      g.save();eye();g.clip();g.fillStyle='#fff7e8';g.fillRect(-58,-48,116,90);
      const eyeShade=g.createLinearGradient(0,-h,0,5);
      eyeShade.addColorStop(0,'#d9c9bc');eyeShade.addColorStop(.55,'#fff7e8');
      eyeShade.addColorStop(1,'#fff7e8');g.fillStyle=eyeShade;g.fillRect(-58,-48,116,90);
      const ix=gazeX*side*16-3,iy=gazeY*10,ir=strong?16:23;
      const iris=g.createLinearGradient(0,-24,0,25);iris.addColorStop(0,strong?'#594139':'#594642');iris.addColorStop(.52,strong?'#91603d':'#a67944');iris.addColorStop(1,strong?'#d39a51':'#ddb469');
      g.fillStyle=iris;g.beginPath();g.ellipse(ix,iy,ir,strong?26:34,0,0,TAU);g.fill();
      g.strokeStyle='#4d3734';g.lineWidth=2.3;g.stroke();
      g.fillStyle='#302b34';g.beginPath();g.ellipse(ix,iy-1,(strong?7:10)*(acting?.pupil??1),strong?18:23,0,0,TAU);g.fill();
      g.fillStyle='#fffaf0';g.beginPath();g.ellipse(ix-6*side,iy-13,4.5,6,-.3,0,TAU);g.fill();
      g.globalAlpha=.6;g.beginPath();g.arc(ix+8*side,iy+13,2.5,0,TAU);g.fill();g.restore();
    }
    g.strokeStyle='#392b31';g.lineCap='round';g.lineWidth=strong?6:5.5;
    g.beginPath();g.moveTo(-51,1);
    if(isClosed){g.quadraticCurveTo(2,smile?-h*.9:5,53,-3);}
    else{g.bezierCurveTo(-26,-upper,20,-upper*1.05,53,-7*openness);}
    g.stroke();
    if(!isClosed){
      g.lineWidth=1.65;g.strokeStyle=palette.line;g.beginPath();g.moveTo(-17,lower*.94);g.quadraticCurveTo(25,lower+1,44,3);g.stroke();
      g.fillStyle='#392b31';g.beginPath();g.moveTo(39,-upper*.6);g.lineTo(59,-10*openness);g.lineTo(51,0);g.fill();
    }
    g.restore();
    // Brows are tapered shapes, with independently controlled inner and outer ends.
    const by=eyeY-(strong?40:51)-(fear*3),asym=(acting?.browAsym??.08)*side*6;
    const inner=by+focus*17-fear*19+asym,outer=by-3+fear*6;
    g.fillStyle=strong?'#343039':'#644339';g.beginPath();
    g.moveTo(256+side*(dx-43),inner);g.quadraticCurveTo(cx,by-8,256+side*(dx+51),outer);
    g.lineTo(256+side*(dx+48),outer+(strong?8:4));
    g.quadraticCurveTo(cx,by+(strong?9:1),256+side*(dx-41),inner+(strong?12:7));g.closePath();g.fill();
  }
  // Short nose accents follow the actual nose volume; no large drawn hook.
  g.strokeStyle=palette.line;g.lineWidth=1.8;g.lineCap='round';
  g.beginPath();g.moveTo(262,312);g.quadraticCurveTo(268,319,259,321);g.stroke();
  const jaw=clamp(Math.max(lip.jaw??0,acting?.jawOverride??0));
  const w=(strong?30:27)*clamp(lip.width??1,.7,1.35),my=378;
  const corner=smile?-8:focus?2:fear?3:0;
  if(jaw<.035){
    g.strokeStyle=strong?'#8d5b4f':'#a16e61';g.lineWidth=2.6;g.beginPath();g.moveTo(256-w,my+corner);g.quadraticCurveTo(256,my+(smile?4:fear?-2:0),256+w,my+corner);g.stroke();
  }else{
    const top=1+jaw*11,bottom=3+jaw*(strong?42:38);
    g.beginPath();g.moveTo(256-w,my+corner);g.bezierCurveTo(243,my-top,269,my-top,256+w,my+corner);
    g.bezierCurveTo(271,my+bottom,241,my+bottom,256-w,my+corner);g.closePath();
    g.fillStyle='#69443f';g.fill();g.save();g.clip();
    if(jaw>.32){g.fillStyle='#fff1d8';g.fillRect(216,my-top,80,5+focus*3);}
    if(jaw>.42){g.fillStyle='#b76d71';g.beginPath();g.ellipse(256,my+bottom*.82,w*.70,7,0,0,TAU);g.fill();}
    g.restore();g.strokeStyle=strong?'#986354':'#ac7563';g.lineWidth=1.4;g.stroke();
  }
  if(jaw>.15){g.strokeStyle=strong?'#c6967c':'#d8b39b';g.lineWidth=1.3;g.beginPath();g.moveTo(251,402+jaw*14);g.quadraticCurveTo(257,404+jaw*14,262,402+jaw*14);g.stroke();}
}

export function animatedHead(body,kind,height){
  const strong=kind==='hong',head=new THREE.Group();head.name=`${kind}_animated_head`;head.position.y=height+.026;body.add(head);
  const skin=skinMaterial(kind);
  // A single restrained under-chin value separates the head from the neck.
  const neckSkin=skin.clone();neckSkin.color.multiplyScalar(.92);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(strong?.063:.048,strong?.077:.063,.148,32),neckSkin);
  neck.position.set(0,height-.05,-.018);body.add(neck);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  // A normal-expanded hull also outlines the concave nose/cheek boundary inside
  // the face. Keep the skin contour clean instead of drawing that false crease.
  const skull=new THREE.Mesh(surface(strong),new THREE.MeshBasicMaterial({map:texture}));head.add(skull);skull.castShadow=true;
  for(const side of [-1,1]){
    const ear=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),skin);
    ear.scale.set(.019,.032,.014);ear.position.set(side*(strong?.124:.110),.043,-.020);head.add(ear);
    const inner=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:SKIN[kind].inner}));
    inner.scale.set(.002,.016,.006);inner.position.set(side*(strong?.141:.127),.045,-.013);head.add(inner);
  }
  const hairColor=strong?'#302e39':'#503a3b';
  outlined(head,hairGeometry(strong),new THREE.MeshBasicMaterial(strong?{vertexColors:true}:{color:hairColor}),.0013);
  if(strong){
    // A close-cropped, flatter silhouette. The hairline is part of the cap;
    // avoid long fringe panels or detached individual "stubble" tubes.
    for(const side of [-1,1])hairPanel(head,true,side*1.4,side*1.48,1.71,.08,'#33313c');
  }else{
    const locks=[[-.94,-1.04,1.80,.24],[-.63,-.67,1.53,.29],[-.28,-.21,1.46,.28],[.08,.26,1.68,.31],[.47,.66,1.48,.27],[.91,1.06,1.81,.22]];
    locks.forEach(([a,b,t,w],i)=>hairPanel(head,false,a,b,t,w,i%2?'#674748':'#5c4042'));
    for(const side of [-1,1])hairPanel(head,false,side*1.38,side*1.62,1.85,.23,'#4a353c');
    sweptTuft(head,[-.025,.237,-.008],[.021,.285,-.010],[.066,.262,.005],.018,'#5c4042');
    sweptTuft(head,[-.047,.222,-.039],[-.024,.274,-.035],[.015,.261,-.028],.014,'#51383e');
  }
  let emotion='neutral',blink=0,lip={jaw:0,width:1},acting=null,last='';
  const gaze={x:0,y:0};
  function draw(){
    const key=JSON.stringify([emotion,blink,lip,acting,gaze]);if(key===last)return;last=key;
    paintFace(ctx,strong,emotion,blink,lip,acting,gaze);texture.needsUpdate=true;
  }
  draw();
  return {head,skull,
    setEmotion(e='neutral',b=0){emotion=e;blink=b;},
    setActing(a){acting=a;},
    lookAtWorld(target){head.updateWorldMatrix(true,false);const local=head.worldToLocal(target.clone());gaze.x=clamp(local.x/Math.max(.3,Math.abs(local.z)),-1,1)*.55;gaze.y=clamp(-local.y/Math.max(.3,Math.abs(local.z)),-1,1)*.5;},
    applyLip(value){lip=value;draw();return {jaw:value.jaw};},
    mouth:{apply(value){lip=value;draw();return {jaw:value.jaw};}},
  };
}
