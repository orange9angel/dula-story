import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const ep=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(ep,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer'),base=process.argv.slice(2).find(a=>a.startsWith('http'))??'http://127.0.0.1:4235',video=process.argv.includes('--video');
const board=path.join(ep,'storyboard/palace_r21');fs.mkdirSync(board,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const pages=[];
 for(const q of ['&sculpted=0','']){
  const p=await browser.newPage();p.on('pageerror',e=>{throw e;});await p.goto(base+'/viewer.html?capture=1'+q);await p.waitForFunction('window.ready===true');pages.push(p);
 }
 const reports=[];
 for(const page of pages)reports.push(await page.evaluate(async()=>{
  const THREE=await import('three'),{actors}=window.__dbg;window.stepAt(9);
  const dome=actors.aoao.shieldDome,ray=new THREE.Raycaster(),rays=[];
  for(const side of [-1,1])for(let i=-4;i<=4;i++)for(let j=-4;j<=4;j++){
   // Avoid landing exactly on the meridian seam/triangle vertices: topology is
   // checked separately below, while these rays test rendered face winding.
   const x=i*.045+.0011,z=j*.045+.0007;if(Math.hypot(x,z)>.24)continue;
   const from=dome.localToWorld(new THREE.Vector3(x,side*.65,z)),to=dome.localToWorld(new THREE.Vector3(x,0,z));
   ray.set(from,to.sub(from).normalize());const hits=ray.intersectObject(dome,false);
   rays.push({side,x,z,hit:!!hits.length,localY:hits.length?dome.worldToLocal(hits[0].point.clone()).y:null});
  }
  function topology(m){
   const g=m.geometry,p=g.attributes.position,ids=[],weld=new Map(),edges=new Map();let degenerate=0;
   for(let i=0;i<p.count;i++){
    const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
    if(!weld.has(key))weld.set(key,weld.size);ids.push(weld.get(key));
   }
   const ix=g.index;for(let i=0;i<(ix?.count??p.count);i+=3){
    const vs=[0,1,2].map(j=>ids[ix?ix.getX(i+j):i+j]);if(new Set(vs).size<3){degenerate++;continue;}
    for(let j=0;j<3;j++){const a=vs[j],b=vs[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');edges.set(key,(edges.get(key)??0)+1);}
   }
   return{name:m.name,vertices:weld.size,boundaryEdges:[...edges.values()].filter(n=>n===1).length,nonManifoldEdges:[...edges.values()].filter(n=>n>2).length,degenerate,frontSide:m.material.side===THREE.FrontSide,opaque:!m.material.transparent&&m.material.opacity===1};
  }
  const shells=[dome];for(const a of Object.values(actors))a.mesh.traverse(m=>{if(m.userData.armorShell)shells.push(m);});
  return {shieldRays:rays,closedShells:shells.map(topology),anchors:Object.fromEntries([9,58,103,152,168.4,171].map(t=>{window.stepAt(t);return[t,actors.aoao.shieldDome.localToWorld(new THREE.Vector3(0,.278,0)).toArray()];}))};
 }));
 const after=reports[1];after.passed=after.shieldRays.every(r=>r.hit)&&after.closedShells.every(s=>!s.boundaryEdges&&!s.nonManifoldEdges&&s.frontSide&&s.opaque)&&JSON.stringify(reports[0].anchors)===JSON.stringify(after.anchors);
 fs.writeFileSync(path.join(board,'shell_probe.json'),JSON.stringify({before:reports[0],after},null,2));
 if(!after.passed)throw new Error('Closed shell or contact regression failed; inspect shell_probe.json');
 const compositor=await browser.newPage();await compositor.setContent('<canvas width="1440" height="720"></canvas>');
 const composite=async(imgs,label)=>compositor.evaluate(async({imgs,label})=>{
  const c=document.querySelector('canvas'),ctx=c.getContext('2d');
  for(let i=0;i<2;i++){const im=new Image();im.src='data:image/jpeg;base64,'+imgs[i];await im.decode();ctx.drawImage(im,280,0,720,720,i*720,0,720,720);}
  ctx.fillStyle='rgba(7,11,18,.8)';ctx.fillRect(0,0,1440,52);ctx.font='bold 24px Microsoft YaHei';ctx.textAlign='center';ctx.fillStyle='#eee';ctx.fillText('R20 · 修订前',360,35);ctx.fillStyle='#ffdc99';ctx.fillText('R21 · '+label,1080,35);
  return c.toDataURL('image/jpeg',.94).split(',')[1];
 },{imgs,label});
 const poseImage=(page,{enemy=false,angle=.85,t=9,shield=false})=>page.evaluate(async({enemy,angle,t,shield})=>{
  window.stepAt(t);const THREE=await import('three'),{actors,scene,camera,renderer}=window.__dbg,a=actors[enemy?'yekari':'aoao'];
  if(shield){
   const d=a.shieldDome,p=d.getWorldPosition(new THREE.Vector3());
   const n=new THREE.Vector3(Math.sin(angle),Math.cos(angle),.15).normalize().transformDirection(d.matrixWorld);
   const isolation=new THREE.Scene();isolation.background=new THREE.Color('#233342');
   const copy=d.clone(true);copy.matrixAutoUpdate=false;copy.matrix.copy(d.matrixWorld);isolation.add(copy);
   const cam=new THREE.PerspectiveCamera(35,1280/720,.01,10);cam.position.copy(p).addScaledVector(n,1.14);cam.lookAt(p);renderer.render(isolation,cam);
   return renderer.domElement.toDataURL('image/jpeg',.96).split(',')[1];
  }
  // A palace wall occludes the rear orbit at the real blocking position. Use a
  // neutral review stage with the SAME lights and actual posed actor, so all
  // declared shoulder angles remain visible. Final-shot review stays in situ.
  const p=a.headGroup.getWorldPosition(new THREE.Vector3());
  if(!window.__armorReviewScene){
   const stage=window.__armorReviewScene=new THREE.Scene();stage.background=new THREE.Color('#233342');
   for(const light of scene.scene.children.filter(o=>o.isLight))stage.add(light.clone());
  }
  const isolation=window.__armorReviewScene;
  const parent=a.mesh.parent;isolation.add(a.mesh);
  const cam=new THREE.PerspectiveCamera(34,1280/720,.05,100);cam.position.set(p.x+Math.sin(angle)*2.2,p.y+.02,p.z+Math.cos(angle)*2.2);cam.lookAt(p.x,p.y-.23,p.z);
  renderer.render(isolation,cam);const result=renderer.domElement.toDataURL('image/jpeg',.96).split(',')[1];parent.add(a.mesh);return result;
 },{enemy,angle,t,shield});
 const shots=[['hero_front',{angle:.85},'曲面肩甲与宽高光'],['hero_side',{angle:2.4},'肩甲侧面厚度'],['hero_back',{angle:3.85},'肩甲后侧包裹'],['enemy_front',{enemy:true,t:29,angle:-.85},'冷钢月刃肩甲'],['enemy_back',{enemy:true,t:29,angle:2.3},'肩甲背面'],['shield_front',{shield:true,angle:0},'盾面'],['shield_back',{shield:true,angle:Math.PI},'盾牌内壁与实心边缘']];
 for(const [name,cfg,label] of shots){const imgs=await Promise.all(pages.map(p=>poseImage(p,cfg)));fs.writeFileSync(path.join(board,name+'.jpg'),Buffer.from(await composite(imgs,label),'base64'));}
 if(video){
  const out=path.join(ep,'output/armor_shape_comparison_r21.mp4'),encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit'],windowsHide:true}),done=once(encoder,'exit');
  for(let f=0;f<540;f++){
   const section=Math.floor(f/180),u=f%180/179;
   const cfg=section===2?{shield:true,angle:u*Math.PI*2}:section===1?{enemy:true,t:29,angle:-.85+u*Math.PI*2}:{t:9,angle:.85+u*Math.PI*2};
   const imgs=await Promise.all(pages.map(p=>poseImage(p,cfg))),data=await composite(imgs,section===2?'盾牌正反面':section===1?'夜刈 · 连续转面':'阿鏊 · 连续转面');
   if(!encoder.stdin.write(Buffer.from(data,'base64')))await once(encoder.stdin,'drain');if(f%90===0)console.log('shape comparison '+f+'/540');
  }
  encoder.stdin.end();const [code]=await done;if(code)throw new Error('ffmpeg failed '+code);console.log(out);
 }
 console.log(JSON.stringify({passed:after.passed,shieldRays:after.shieldRays.length,shells:after.closedShells.length,beforeMisses:reports[0].shieldRays.filter(r=>!r.hit).length}));
}finally{await browser.close();}
