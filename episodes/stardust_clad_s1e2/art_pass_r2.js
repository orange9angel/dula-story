// Shot-specific 2D cels, deformation, photography and effects over the R27 layout.
// Source cues/audio remain in script.story; art_pass_r2.story owns these trial cuts.
import * as THREE from 'three';
import {createMotionController} from './assets3d/art_pass_runtime/motion-controls.js';
import {T} from './config/event_times.js';
const options=new URLSearchParams(location.search),useParticles=options.get('fx')==='particles',integrateCels=options.get('integrate')==='1';
const W=1280,H=720,START=T.HERO_CHARGE,END=174,FPS=30;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,u)=>a+(b-a)*u;
const pulse=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const gauss=(x,y,cx,cy,rx,ry)=>Math.exp(-(((x-cx)/rx)**2+((y-cy)/ry)**2)*2);
const rand=i=>{const n=Math.sin(i*91.37+17.13)*43758.54;return n-Math.floor(n);};
const [story,envs,dialogue]=await Promise.all([fetch('./art_pass_r2.story').then(r=>r.text()),fetch('./config/voice_envs.json').then(r=>r.json()),fetch('./config/dialogue.json').then(r=>r.json())]);
const sec=s=>{const [h,m,v]=s.replace(',','.').split(':').map(Number);return h*3600+m*60+v;};
const shots=story.trim().split(/\r?\n\s*\r?\n/).map(block=>{const m=block.match(/(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})/),kind=block.match(/\|shot=([^|}]+)/),id=block.match(/\|id=([^|}]+)/);if(!m||!kind)throw Error('Invalid pilot story block');return{id:id[1],start:sec(m[1]),end:sec(m[2]),kind:kind[1]};});
if(shots[0].start!==START||shots.at(-1).end!==END||shots.some((s,i)=>s.end<=s.start||(i&&s.start!==shots[i-1].end)))throw Error('Shot timeline has a gap/overlap');
if(T.RELEASE!==168.4||T.C7!==171||T.LAND!==172.6)throw Error('Source cue changed: re-direct the pilot');
const keys=['background','hero_charge','hero_breakdown','hero_release','hero_portrait','enemy_ready','enemy_hit','enemy_land'];
const [motion,poseEdits]=await Promise.all([fetch('./config/art_pass_r2_counter_motion.json').then(r=>r.json()),fetch('./config/art_pass_r2_pose_edits.json').then(r=>r.json())]);
if(motion.start!==START||motion.fps!==FPS||motion.frames.length!==331)throw Error('Missing or stale 3D motion bake');
const images=Object.fromEntries(await Promise.all(keys.map(async k=>{const im=new Image();im.src=`./assets3d/art_pass_r2/${k}.png`;await im.decode();return[k,im];})));
const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;document.body.append(canvas);const g=canvas.getContext('2d');
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,W,0,H,-100,100);camera.position.z=10;
const particleStage=useParticles?await(async()=>{
 const [{createParticleStage},{combustionAura}]=await Promise.all([import('./assets3d/art_pass_runtime/particle-stage.js'),import('dula-assets/lib/craft3d/combustion-particles.js')]);
 return createParticleStage({THREE,renderer,makeAura:combustionAura,width:W,height:H,pixelsPerUnit:200});
})():null;
const integration=integrateCels?await import('./assets3d/art_pass_runtime/cel-integration.js'):null;
const celLight=integration?.createCelIntegration({width:W,height:H});
const portrait=document.createElement('canvas');portrait.width=portrait.height=1254;const pg=portrait.getContext('2d');
const cells={};
for(const key of keys.filter(k=>k!=='background')){
 const im=images[key],tex=key==='hero_portrait'?new THREE.CanvasTexture(portrait):new THREE.Texture(im);tex.needsUpdate=true;tex.colorSpace=THREE.SRGBColorSpace;
 const geo=new THREE.PlaneGeometry(1,1,36,48),material=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.018,side:THREE.DoubleSide,depthWrite:false});
 const mesh=new THREE.Mesh(geo,material);mesh.frustumCulled=false;scene.add(mesh);cells[key]={im,geo,material,mesh,tex};
}
function path(ctx,p,fill,stroke=null,width=2){ctx.beginPath();for(const a of p){if(a[0]==='M')ctx.moveTo(a[1],a[2]);else if(a[0]==='L')ctx.lineTo(a[1],a[2]);else if(a[0]==='Q')ctx.quadraticCurveTo(...a.slice(1));else if(a[0]==='C')ctx.bezierCurveTo(...a.slice(1));else ctx.closePath();}if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function eye(ctx,cx,cy,sx,sy,open,far=false){
 ctx.save();ctx.translate(cx,cy);ctx.scale(far?-sx:sx,sy);const h=40*open,ink='#39252a';ctx.lineJoin='round';ctx.lineCap='round';
 const shape=[['M',-82,6],['L',-66,-h*.65],['Q',-12,-h-9,33,-h*.65],['L',78,-h*.10],['Q',31,28*open,-16,26*open],['Q',-63,24*open,-82,6],['Z']];
 if(open>.06){ctx.save();path(ctx,shape,'#fff3d9');ctx.clip();const iris=far?-25:28;ctx.fillStyle='#af8c78';ctx.fillRect(-90,-60,180,32);ctx.fillStyle='#765034';ctx.beginPath();ctx.ellipse(iris,3,25,41,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c58b44';ctx.beginPath();ctx.ellipse(iris+3,19,20,22,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=ink;ctx.beginPath();ctx.ellipse(iris,-1,10,30,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fffbe8';ctx.beginPath();ctx.ellipse(iris-10,-16,6,8,0,0,Math.PI*2);ctx.fill();ctx.restore();path(ctx,shape,null,ink,2.6);path(ctx,shape.slice(0,4),null,ink,6.2);}
 else path(ctx,[['M',-83,-1],['Q',-14,18,78,-3]],null,ink,5.6);
 path(ctx,[['M',-90,-61],['Q',-20,-65,78,-27],['L',75,-15],['Q',-5,-46,-89,-56],['Z']],ink);
 path(ctx,[['M',-69,-h-18],['Q',-10,-h-22,53,-h-9]],null,'#b47c60',2.1);
 ctx.restore();
}
function paintPortrait(t){
 pg.clearRect(0,0,1254,1254);pg.drawImage(images.hero_portrait,0,0);
 const dt=t-START,open=mix(.02,.78,ease((dt-.12)/.38)),line=envs.lines.find(x=>x.id==='p19'),jaw=clamp(line?.jaw[Math.floor((t-line.t0)/line.dt)]??0);
 eye(pg,755,626,1.02,1,open);eye(pg,974,602,.36,.85,open,true);
 // A forceful mouth and cheek tension; no smiling corners during the call.
 pg.save();pg.translate(857,765);pg.rotate(-.10);const w=42+18*jaw,h=4+67*jaw;
 if(jaw>.04){path(pg,[['M',-w,0],['Q',-7,-16,w,-1],['Q',w-7,h,3,h+6],['Q',-w+8,h,-w,0],['Z']],'#542d32','#3b2529',3);path(pg,[['M',-w+5,0],['Q',0,-9,w-5,0],['L',w-10,10],['Q',0,6,-w+10,12],['Z']],'#fff2d9');if(jaw>.35)path(pg,[['M',-w*.55,h-6],['Q',0,h-25,w*.6,h-5],['Q',0,h+4,-w*.55,h-6],['Z']],'#c07870');}
 else path(pg,[['M',-48,3],['Q',-5,-5,46,0]],null,'#4a2d2c',3.5);
 path(pg,[['M',-18,h+14],['Q',2,h+19,24,h+10]],null,'#b47e62',2.3);pg.restore();
 for(const x of [695,705])path(pg,[['M',x,704],['L',x+9,717]],null,'#b27b60',1.8);
 cells.hero_portrait.tex.needsUpdate=true;return{jaw,open};
}
// Authored drawing landmarks connect an illustration to the 3D motion channel.
// These are per-angle controls, not an automatic arbitrary-image skeleton fit.
const rigs={
 hero_charge:{actor:'aoao',ref:0,pins:[[940,1390],[360,1260],[90,1400]],j:{head:[750,350,260,250],leftHand:[330,1040,180,230],rightHand:[910,780,120,150],pelvis:[610,850,300,260]}},
 hero_breakdown:{actor:'aoao',ref:153,pins:[[925,1450],[80,1270]],j:{head:[640,270,240,250],leftHand:[800,650,230,300],rightHand:[140,735,160,170],pelvis:[510,780,310,260]}},
 hero_release:{actor:'aoao',ref:167,pins:[[930,1340],[70,1120]],j:{head:[510,330,260,240],leftHand:[830,620,260,300],rightHand:[140,660,160,180],pelvis:[480,760,280,240]}},
 enemy_ready:{actor:'yekari',ref:0,pins:[[100,1490],[960,1390]],j:{head:[480,200,260,240],rightHand:[190,410,150,180],leftHand:[360,440,160,170],pelvis:[580,740,260,250]}},
 enemy_hit:{actor:'yekari',ref:241,pins:[[113,1482]],j:{head:[770,210,260,240],rightHand:[130,320,200,180],leftHand:[915,610,170,190],pelvis:[610,790,270,270]}},
 enemy_land:{actor:'yekari',ref:288,pins:[[130,1397],[890,1250]],j:{head:[470,370,270,240],rightHand:[150,800,170,170],leftHand:[650,630,180,180],pelvis:[550,880,270,250]}}
};
const motionControls=createMotionController({motion,poseEdits,rigs});
let offsets={};
const bakeFrame=t=>motionControls.frameAt(t);
function updateMotion(t){const frame=motionControls.update(t);offsets=motionControls.offsets;return frame;}
function deform(key,x,y,t){
 const dt=t-START,body=ease((dt-2.4)/2.3),hair=Math.sin(dt*13)*2.5*body;
 let dx=0,dy=0;
 if(key==='hero_charge'){
  const upper=1-ease((y-720)/620),pin=1-gauss(x,y,190,1400,260,170);
  dx=(-14*body+4*Math.sin(dt*3))*upper*pin;dy=(13*body-3*Math.sin(dt*3))*upper;
  dx+=(-10*body+hair)*gauss(x,y,600,220,480,260);
  dx+=5*Math.sin(dt*17)*body*gauss(x,y,915,790,80,100);
 }else if(key==='hero_breakdown'){
  const u=ease((t-167.96)/.24),upper=1-ease((y-750)/650);dx=18*u*upper;dy=-24*u*upper;dx+=7*Math.sin(u*4)*gauss(x,y,550,150,380,250);
 }else if(key==='hero_release'){
  const d=Math.max(0,t-T.RELEASE),snap=1-Math.exp(-d*12),settle=Math.exp(-d*5)*Math.sin(d*18),upper=1-ease((y-710)/650);
  dx=(14*snap+8*settle)*upper;dy=8*settle*upper;dx-=14*Math.exp(-d*3)*Math.sin(d*9)*gauss(x,y,430,230,450,260);
 }else if(key==='enemy_ready'){
  const pull=pulse(t,164.1,164.32,164.43,164.78),near=gauss(x,y,255,420,210,170);dx=14*pull*near;dy=-8*pull*near;
  dx+=5*ease((t-169)/2)*gauss(x,y,500,200,250,250);dy+=3*Math.sin(dt*3)*gauss(x,y,500,560,390,350);
 }else if(key==='enemy_hit'){
  const d=Math.max(0,t-T.C7),recoil=pulse(d,0,.1,.26,.7),land=pulse(t,T.LAND,T.LAND+.12,T.LAND+.22,T.LAND+.75);
  dx=24*recoil*gauss(x,y,680,450,500,650);dy=20*land*(1-ease((y-700)/700));dx+=18*Math.exp(-d*2)*Math.sin(d*10)*gauss(x,y,850,170,300,280);
 }else if(key==='enemy_land'){
  const d=Math.max(0,t-T.LAND),compress=pulse(d,0,.12,.18,.50),upper=1-ease((y-870)/500);dy=18*compress*upper;dx=-9*compress*upper;dx+=8*Math.exp(-d*4)*Math.sin(d*13)*gauss(x,y,520,250,310,260);
 }else if(key==='hero_portrait'){
  const head=1-ease((y-820)/180),lift=ease((dt-.18)/.55);dx=9*lift*head;dy=-14*lift*head;dx+=(-7*body+hair)*gauss(x,y,540,230,550,360);
 }

 return motionControls.deform(key,x,y,dx,dy);
}
let view={cx:640,cy:360,z:1,roll:0};
function screen(x,y){const dx=(x-view.cx)*view.z,dy=(y-view.cy)*view.z,c=Math.cos(view.roll),s=Math.sin(view.roll);return[W/2+dx*c-dy*s,H/2+dx*s+dy*c];}
function place(key,pos,t,order=1){const cell=cells[key],a=cell.geo.attributes.position,uv=cell.geo.attributes.uv,w=cell.im.width,h=cell.im.height,c=Math.cos(pos.rot??0),s=Math.sin(pos.rot??0);
 cell.mesh.visible=true;cell.mesh.renderOrder=order;
 for(let i=0;i<a.count;i++){const [x,y]=deform(key,uv.getX(i)*w,(1-uv.getY(i))*h,t),rx=(x-(pos.px??0))*pos.s,ry=(y-(pos.py??0))*pos.s;const p=screen(pos.x+rx*c-ry*s,pos.y+rx*s+ry*c);a.setXYZ(i,p[0],p[1],0);}
 a.needsUpdate=true;return cell;
}
const placements={hero_charge:{x:209,y:180,s:.32},hero_breakdown:{x:195.5,y:132,s:.34},hero_release:{x:194,y:164,s:.34},enemy_ready:{x:826,y:113.4,s:.34},enemy_land:{x:905,y:148,s:.34}};
function enemyHitPlacement(t){const current=bakeFrame(t).actors.yekari.root,base=bakeFrame(T.C7).actors.yekari.root;return{x:842+(current[0]-base[0])*45,y:119-(current[1]-base[1])*145,s:.34};}
function worldPoint(key,x,y,t,pos=placements[key]){const p=deform(key,x,y,t),c=Math.cos(pos.rot??0),s=Math.sin(pos.rot??0),a=(p[0]-(pos.px??0))*pos.s,b=(p[1]-(pos.py??0))*pos.s;return[pos.x+a*c-b*s,pos.y+a*s+b*c];}
function viewTransform(ctx){ctx.translate(W/2,H/2);ctx.rotate(view.roll);ctx.scale(view.z,view.z);ctx.translate(-view.cx,-view.cy);}
function backdrop(t){g.fillStyle='#171827';g.fillRect(0,0,W,H);g.save();const b={...view,z:1+(view.z-1)*.18,cx:640+(view.cx-640)*.28,cy:360+(view.cy-360)*.28};g.translate(W/2,H/2);g.rotate(b.roll*.3);g.scale(b.z,b.z);g.translate(-b.cx,-b.cy);g.drawImage(images.background,-70,-40,1420,800);g.restore();
 const grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,'rgba(9,13,32,.18)');grad.addColorStop(.7,'rgba(10,9,20,0)');grad.addColorStop(1,'rgba(8,11,28,.30)');g.fillStyle=grad;g.fillRect(0,0,W,H);
}
function floorShadow(x,y,rx,ry,a=.45){g.save();viewTransform(g);if(integration)integration.drawGroundContact(g,{x,y,radiusX:rx,radiusY:ry,opacity:Math.min(a,.35),cast:[x<700?120:75,-24]});else{g.fillStyle=`rgba(10,9,22,${a})`;g.beginPath();g.ellipse(x,y,rx,ry,-.05,0,Math.PI*2);g.fill();}g.restore();}
function flamePath(x,y,h,w,seed,time){const n=Math.sin(time*8+seed)*w*.8;return[['M',x-w*.4,y],['C',x-w*1.7,y-h*.13,x-w*1.1,y-h*.25,x+n-w*.5,y-h*.35],['Q',x+n+w*.35,y-h*.48,x+n-w*.4,y-h*.61],['Q',x+n+w*.6,y-h*.72,x+n,y-h],['C',x+n+w*1.7,y-h*.67,x+w*.1,y-h*.59,x+w*.5,y-h*.48],['Q',x+w*1.6,y-h*.32,x+w*.6,y-h*.23],['Q',x-w*.25,y-h*.15,x+w*.5,y],['Z']];}
function aura(t,front=false){const d=t-START,p=clamp(d/5.4),fade=1-ease((t-T.RELEASE)/.55);if(fade<=0)return;
 g.save();viewTransform(g);g.globalAlpha=fade*(front?.30:.78);
 const count=front?2:5;for(let i=0;i<count;i++){const x=front?265+i*295:[249,316,389,489,563][i],y=625+rand(i+4)*12,h=(80+rand(i+12)*130+p*(110+rand(i+23)*150)+Math.sin(t*7+i*2)*15)*(front?.65:1),w=20+rand(i+9)*23;
 const grad=g.createLinearGradient(0,y,0,y-h);grad.addColorStop(0,'rgba(239,113,23,0)');grad.addColorStop(.20,'#eca336');grad.addColorStop(.7,'#ffd779');grad.addColorStop(1,'#fff7d9');
 path(g,flamePath(x,y,h,w,i,t),grad);}
 for(let i=0;i<16;i++){const age=(t*(.7+rand(i)*.6)+rand(i+28))%1,x=260+rand(i+44)*310+Math.sin(i+age*4)*13,y=630-age*(240+p*200);g.fillStyle='#ffe9a9';g.fillRect(x,y,1.6,3+rand(i)*5);}
 g.restore();
}
const slot=[280,630],hitWorld=[1064,316];
function chainPoints(t,energyPath=false){let end=worldPoint('enemy_ready',181,480,t);if(energyPath){const q=ease((t-T.C7+.14)/.14);end=end.map((v,i)=>mix(v,hitWorld[i],q));}const u=clamp((t-T.RELEASE)/(T.C7-T.RELEASE));return{end,u:Math.pow(u,1.65),points:Array.from({length:61},(_,i)=>{const a=i/60;return[mix(slot[0],end[0],a),mix(slot[1],end[1],a)+Math.sin(a*Math.PI)*8];})};}
function chain(t){if(t>=T.C7+.1)return;const {points}=chainPoints(t);g.save();viewTransform(g);g.strokeStyle='#b3a8bb';g.lineWidth=2.3;
 for(let i=0;i<points.length-1;i++){const p=points[i],q=points[Math.min(i+1,60)],angle=Math.atan2(q[1]-p[1],q[0]-p[0]);g.save();g.translate(p[0],p[1]);g.rotate(angle);g.beginPath();g.ellipse(0,0,7,i%2===0?3.4:1.6,0,0,Math.PI*2);g.stroke();g.restore();}g.restore();}
function energy(t){if(t<T.RELEASE||t>T.C7+.11)return;const {points,u}=chainPoints(t,true),count=Math.max(2,Math.floor(u*60)),line=points.slice(0,count+1);g.save();viewTransform(g);g.lineCap='round';g.lineJoin='round';
 for(const [width,color]of [[31,'rgba(255,112,20,.28)'],[17,'#fca331'],[8,'#fff0ae'],[3,'#fffdf1']]){g.beginPath();line.forEach((p,i)=>{const jitter=Math.sin(i*1.8+t*34)*4*Math.sin(i/60*Math.PI);if(i===0)g.moveTo(...p);else g.lineTo(p[0],p[1]+jitter);});g.strokeStyle=color;g.lineWidth=width;g.stroke();}
 const e=line.at(-1),d=points[Math.min(count+1,60)],angle=Math.atan2(d[1]-e[1],d[0]-e[0]);g.translate(...e);g.rotate(angle);path(g,[['M',-38,-15],['C',-8,-23,17,-16,40,0],['Q',9,-3,-4,11],['L',-32,18],['Q',-17,2,-38,-15],['Z']],'#fff5c9');g.restore();}
function speedLines(t,cx,cy,amount=1){g.save();g.globalAlpha=amount*.6;const f=Math.floor(t*15);for(let i=0;i<38;i++){const a=rand(i+7)*Math.PI*2,r=270+rand(i+39)*180,tail=100+rand(i+87)*310,shift=rand(f+i)*35;g.beginPath();g.moveTo(cx+Math.cos(a)*(r+shift),cy+Math.sin(a)*(r+shift));g.lineTo(cx+Math.cos(a)*(r+tail),cy+Math.sin(a)*(r+tail));g.strokeStyle=i%3?'#ffe6b8':'#35263a';g.lineWidth=.8+rand(i+13)*2;g.stroke();}g.restore();}
function impact(t){const d=t-T.C7;if(d<0||d>1.15)return;const center=screen(...hitWorld),u=d/1.15;g.save();g.translate(...center);
 if(d<.075){g.globalAlpha=1-d/.09;path(g,[['M',-28,-70],['L',0,-26],['L',32,-82],['L',32,-22],['L',104,-15],['L',28,12],['L',68,80],['L',6,26],['L',-38,95],['L',-27,20],['L',-110,15],['L',-31,-14],['Z']],'#fff9dc','#302335',3);}
 g.globalAlpha=Math.pow(1-u,1.4);g.strokeStyle='#fff1bb';g.lineWidth=4*(1-u);g.beginPath();g.ellipse(0,0,30+d*340,18+d*170,-.35,0,Math.PI*2);g.stroke();
 for(let i=0;i<32;i++){const a=rand(i+14)*Math.PI*2,v=100+rand(i+80)*450,r=d*v;g.beginPath();g.moveTo(Math.cos(a)*r,Math.sin(a)*r+d*d*80);g.lineTo(Math.cos(a)*(r+15+rand(i)*25),Math.sin(a)*(r+15+rand(i)*25)+d*d*80);g.strokeStyle=i%3?'#ffd48a':'#d6abf2';g.lineWidth=1.2+rand(i)*2;g.stroke();}g.restore();}
function debris(t){const d=t-T.C7;if(d<0)return;g.save();viewTransform(g);for(let i=0;i<9;i++){const x=930+d*(rand(i+3)-.2)*100,y=310-d*(90+rand(i)*70)+d*d*95;if(y>630)continue;g.save();g.translate(x,y);g.rotate(d*(i%2?4:-5));path(g,[['M',-3,-7],['L',6,-3],['L',4,7],['L',-5,3],['Z']],i%2?'#ae98bc':'#4e4767','#241f39',1);g.restore();}g.restore();
 if(t>T.LAND){const age=t-T.LAND;g.save();viewTransform(g);g.globalAlpha=Math.max(0,.4-age*.35);for(let i=0;i<8;i++){g.fillStyle=i%2?'#c8bdb2':'#736a79';g.beginPath();g.ellipse(1030+(i-4)*(14+age*34),620-age*24-rand(i)*13,15+age*37,7+age*15,-.2,0,Math.PI*2);g.fill();}g.restore();}}
function subtitle(t){const active=dialogue.lines.find(l=>{const e=envs.lines.find(x=>x.id===l.id);return e&&t>=e.t0&&t<e.t0+e.dur+.12;});if(!active)return;g.font='bold 27px Microsoft YaHei';g.textAlign='center';g.lineJoin='round';g.lineWidth=5;g.strokeStyle='#241d25';g.fillStyle='#ffe4a3';const text=`${active.speaker==='aoao'?'阿鏊':'夜刈'}：${active.text}`;g.strokeText(text,W/2,675);g.fillText(text,W/2,675);}
function draw(t){
 if(t<START||t>=END)throw Error('Pilot time outside source window');const motionFrame=updateMotion(t),shot=shots.find(s=>t>=s.start&&t<s.end),dt=t-START,u=clamp((t-shot.start)/(shot.end-shot.start));for(const c of Object.values(cells))c.mesh.visible=false;
 const face=paintPortrait(t);let portraitOnly=false,heroKey=t<167.98?'hero_charge':t<T.RELEASE?'hero_breakdown':'hero_release';
 view={cx:640,cy:360,z:1,roll:0};
 if(shot.kind==='eyes'){portraitOnly=true;view={cx:640,cy:360,z:1,roll:mix(-.025,0,ease(u))};}
 if(shot.kind==='call'){portraitOnly=true;view={cx:640,cy:360,z:1,roll:-.045};}
 if(shot.kind==='cuff')view={cx:928,cy:290,z:2.15,roll:.04};
 if(shot.kind==='shield')view={cx:315,cy:mix(565,465,ease(u)),z:1.75,roll:-.05};
 if(shot.kind==='coil')view={cx:415,cy:mix(450,380,ease(u)),z:mix(1.15,1.35,ease(u)),roll:-.035};
 if(shot.kind==='rise')view={cx:430,cy:390,z:1.25,roll:mix(-.035,.018,u)};
 if(shot.kind==='release')view={cx:475,cy:395,z:mix(1.45,1.18,ease(u)),roll:-.065*(1-u)};
 if(shot.kind==='chain'){const progress=ease(u);view={cx:mix(550,900,progress),cy:mix(490,340,progress),z:1.35,roll:-.08};}
 if(shot.kind==='alarm')view={cx:1000,cy:240,z:2.1,roll:.04};
 if(shot.kind==='impact')view={cx:1010,cy:330,z:1.55,roll:.07};
 if(shot.kind==='recoil')view={cx:mix(800,920,ease(u)),cy:360,z:1.1,roll:.045*(1-u)};
 if(shot.kind==='settle')view={cx:690,cy:390,z:.95,roll:0};
 const shake=t>=T.C7&&t<T.C7+.25?Math.sin(dt*92)*5*(1-(t-T.C7)/.25):0;view.cx+=shake;view.cy+=shake*.4;
 backdrop(t);
 const chargePower=(.35+.65*ease((t-START)/3))*(1-ease((t-T.RELEASE)/.45));
 particleStage?.update(t,{view,base:[410,625],power:portraitOnly?0:chargePower,start:START,height:2.05,color:'#ffbf5b'});
 if(!portraitOnly){
  for(const pin of rigs[heroKey].pins.slice(0,2)){const p=worldPoint(heroKey,...pin,t);floorShadow(...p,26,5,.48);}
  if(t<T.C7){for(const pin of rigs.enemy_ready.pins){const p=worldPoint('enemy_ready',...pin,t);floorShadow(...p,29,5,.48);}}
  else if(t<T.LAND){const pos=enemyHitPlacement(t);floorShadow(pos.x+113*.34,119+1482*.34,31,5,.25);}
  else{for(const pin of rigs.enemy_land.pins){const p=worldPoint('enemy_land',...pin,t);floorShadow(...p,29,5,.48);}}
  g.save();viewTransform(g);path(g,[['M',251,621],['L',287,610],['L',314,627],['L',278,646],['Z']],'#272336','#ae7437',3);path(g,[['M',270,630],['L',299,620]],null,'#f4a13b',5);g.restore();
  if(particleStage)particleStage.draw(g,'back');else aura(t,false);chain(t);
  place(heroKey,placements[heroKey],t,1);
  if(t<T.C7)place('enemy_ready',placements.enemy_ready,t,2);
  else if(t<T.LAND)place('enemy_hit',enemyHitPlacement(t),t,2);
  else place('enemy_land',placements.enemy_land,t,2);
 }else{
  const pos=shot.kind==='eyes'?{x:mix(-1900,-1965,ease(u)),y:mix(-1480,-1530,ease(u)),s:mix(3,3.08,ease(u))}:{x:-135,y:-250,s:.94};
  place('hero_portrait',pos,t,2);
 }
 renderer.render(scene,camera);
 if(celLight)celLight.draw(g,renderer.domElement,{warmPoint:screen(140,480),warmRadius:900*view.z,firePoint:screen(410,460),firePower:chargePower,time:t});
 else g.drawImage(renderer.domElement,0,0);
 if(!portraitOnly){energy(t);if(particleStage)particleStage.draw(g,'front');else aura(t,true);impact(t);debris(t);}
 if(shot.kind==='release')speedLines(t,785,360,.6*(1-u));if(shot.kind==='impact')speedLines(t,...screen(1025,300),.9*(1-u));
 if(portraitOnly&&shot.kind==='call'){const grad=g.createLinearGradient(0,720,800,0);grad.addColorStop(0,'rgba(255,168,40,.22)');grad.addColorStop(1,'rgba(255,168,40,0)');g.fillStyle=grad;g.fillRect(0,0,W,H);}
 // Local compositing clock; source sound is never quantized with cel exposures.
 subtitle(t);return{image:canvas.toDataURL('image/png').split(',')[1],state:{t,shot:shot.id,kind:shot.kind,heroCel:portraitOnly?'hero_portrait':heroKey,enemyCel:t<T.C7?'enemy_ready':t<T.LAND?'enemy_hit':'enemy_land',face,view,motionFrame,motionOffsets:offsets,particles:particleStage?.counts??null,sceneIntegration:integrateCels,sourceCues:{RELEASE:T.RELEASE,C7:T.C7,LAND:T.LAND}}};
}
await document.fonts.ready;window.renderAt=draw;window.ready=true;window.duration=END-START;window.shots=shots;window.__dbg={cells,images,shots,placements,deform,worldPoint,motion,poseEdits,rigs};
if(!new URLSearchParams(location.search).has('capture')){
 const audio=new Audio('./output/stardust_clad_s1e2_palace_r27.mp4'),button=document.createElement('button');let raf=0;button.textContent='播放 11 秒试片';document.body.append(button);draw(START);
 const slider=document.createElement('input'),readout=document.createElement('span');slider.type='range';slider.min=0;slider.max=329;slider.step=1;slider.value=0;slider.style.width='50vw';document.body.append(slider,readout);slider.oninput=()=>{cancelAnimationFrame(raf);audio.pause();const frame=Number(slider.value);draw(START+frame/30);readout.textContent=`第 ${frame} 帧 · 原片 ${(START+frame/30).toFixed(3)} 秒`;};
 button.onclick=async()=>{cancelAnimationFrame(raf);audio.currentTime=START;await audio.play();const tick=()=>{if(audio.currentTime>=END||audio.paused){audio.pause();return;}const t=Math.max(START,audio.currentTime);draw(t);slider.value=Math.floor((t-START)*30);readout.textContent=`第 ${slider.value} 帧`;raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);};
}
