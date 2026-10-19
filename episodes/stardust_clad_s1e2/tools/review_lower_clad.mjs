import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const ep=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.resolve(ep,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer'),base=process.argv.slice(2).find(a=>a.startsWith('http'))??'http://127.0.0.1:4235';
const board=path.join(ep,'storyboard/palace_r23');fs.mkdirSync(board,{recursive:true});
const TAU=Math.PI*2;
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const pages=[];for(const q of ['&greaves=0','']){
  const p=await browser.newPage();p.on('pageerror',e=>{throw e;});await p.goto(base+'/viewer.html?capture=1'+q);await p.waitForFunction('window.ready===true');pages.push(p);
 }
 const compositor=await browser.newPage();await compositor.setContent('<canvas width="1440" height="720"></canvas>');
 const composite=async(imgs,label)=>compositor.evaluate(async({imgs,label})=>{
  const c=document.querySelector('canvas'),ctx=c.getContext('2d');
  for(let i=0;i<2;i++){const im=new Image();im.src='data:image/jpeg;base64,'+imgs[i];await im.decode();ctx.drawImage(im,280,0,720,720,i*720,0,720,720);}
  ctx.fillStyle='rgba(7,11,18,.88)';ctx.fillRect(0,0,1440,52);ctx.font='bold 24px Microsoft YaHei';ctx.textAlign='center';ctx.fillStyle='#eee';ctx.fillText('R22 · 原护腿与腰带',360,35);ctx.fillStyle='#ffdc99';ctx.fillText('R23 · '+label,1080,35);return c.toDataURL('image/jpeg',.95).split(',')[1];
 },{imgs,label});
 const capture=(page,cfg)=>page.evaluate(async({enemy=false,t,angle=0,view='lower'})=>{
  const THREE=await import('three'),{actors,scene,renderer}=window.__dbg;window.stepAt(t??(enemy?29:9));
  const a=actors[enemy?'yekari':'aoao'];a.mesh.updateMatrixWorld(true);
  if(!window.__lowerReviewScene){const s=window.__lowerReviewScene=new THREE.Scene();s.background=new THREE.Color('#233342');for(const l of scene.scene.children.filter(o=>o.isLight))s.add(l.clone());}
  const stage=window.__lowerReviewScene,cam=new THREE.PerspectiveCamera(34,1280/720,.01,30),yaw=a.mesh.rotation.y+angle;
  const hip=a.body.localToWorld(new THREE.Vector3(0,a.dimsRef.hipIdle,0)),foot=a.feet.right.getWorldPosition(new THREE.Vector3());
  const headTop=new THREE.Box3().setFromObject(a.headGroup).max.y;
  const target=view==='whole'?new THREE.Vector3(hip.x,(headTop+.04)*.5,hip.z):view==='belt'?hip.clone().add(new THREE.Vector3(0,.06,0)):new THREE.Vector3(hip.x,(hip.y+foot.y)*.5+.055,hip.z+.025);
  const distance=view==='whole'?(headTop+.12)/(2*Math.tan(17*Math.PI/180))*1.18:view==='belt'?.95:1.95;
  cam.position.copy(target).add(new THREE.Vector3(Math.sin(yaw)*distance,.09,Math.cos(yaw)*distance));cam.lookAt(target);
  const parent=a.mesh.parent;stage.add(a.mesh);renderer.render(stage,cam);const result=renderer.domElement.toDataURL('image/jpeg',.96).split(',')[1];parent.add(a.mesh);return result;
 },cfg);
 const shots=[['hero_whole',{view:'whole'},'阿鏊 · 腰线与全身比例'],['enemy_whole',{enemy:true,view:'whole'},'夜刈 · 腰线与全身比例'],['hero_front',{},'护腿前面'],['hero_side',{angle:Math.PI/2},'护腿侧面与脚踝'],['hero_back',{angle:Math.PI},'护腿背面'],['enemy_front',{enemy:true},'冷钢腿套'],['enemy_back',{enemy:true,angle:Math.PI},'冷钢腿套背面'],['hero_belt',{view:'belt',angle:.25},'实心金属腰带'],['belt_back',{view:'belt',angle:Math.PI},'腰带后侧'],['hero_crouch',{t:152.4,angle:1.1},'屈膝与腰腿衔接'],['enemy_walk',{enemy:true,t:23.1,angle:.8},'走路姿态']];
 for(const [name,cfg,label] of shots){const imgs=await Promise.all(pages.map(p=>capture(p,cfg)));fs.writeFileSync(path.join(board,name+'.jpg'),Buffer.from(await composite(imgs,label),'base64'));}
 const probes=[];
 for(const p of pages)probes.push(await p.evaluate(async()=>{
  const THREE=await import('three'),{actors}=window.__dbg,poses=[],shells=[],rays=[];
  for(const t of [9,15.8,21.3,23.1,26.5,58,103,149,152,168.4,171,195]){
   window.stepAt(t);poses.push({t,shield:actors.aoao.shieldDome.localToWorld(new THREE.Vector3(0,.278,0)).toArray(),shoulders:Object.values(actors).flatMap(a=>a.pauldronGroups.map(p=>p.g.matrixWorld.toArray())),hands:Object.values(actors).flatMap(a=>Object.values(a.hands).map(h=>h.matrixWorld.toArray())),feet:Object.values(actors).flatMap(a=>Object.values(a.feet).map(h=>h.matrixWorld.toArray()))});
  }
  window.stepAt(29);
  function closed(m){
   const g=m.geometry,pos=g.attributes.position,ix=g.index.array,edges=new Map();
   const point=i=>[pos.getX(i),pos.getY(i),pos.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
   for(let i=0;i<ix.length;i+=3)for(let j=0;j<3;j++){const a=point(ix[i+j]),b=point(ix[i+(j+1)%3]);if(a===b)continue;const key=a<b?a+'|'+b:b+'|'+a;edges.set(key,(edges.get(key)??0)+1);}
   return{name:m.name,nonManifoldEdges:[...edges.values()].filter(n=>n!==2).length,finite:[...pos.array].every(Number.isFinite),opaque:!m.material.transparent&&m.material.opacity===1,frontSide:m.material.side===THREE.FrontSide};
  }
  for(const [name,a] of Object.entries(actors))if(a.lowerClad){
   const targets=[a.lowerClad.belt,a.lowerClad.buckle,...Object.values(a.lowerClad.legs).flatMap(r=>[r.shell,r.instep,r.ankle])];
   shells.push(...targets.map(closed));
   // Probe from outside at twelve azimuths; the back must occlude just like the front.
   for(const m of [a.lowerClad.belt,...Object.values(a.lowerClad.legs).map(r=>r.shell)])for(let i=0;i<12;i++){
    const angle=(i+.23)/12*Math.PI*2,belt=m===a.lowerClad.belt,center=new THREE.Vector3(0,belt?a.lowerClad.beltCenter:0,belt?0:a.lowerClad.legs.left.length*.5),out=new THREE.Vector3(Math.sin(angle)*.45,belt?0:Math.cos(angle)*.45,belt?Math.cos(angle)*.45:0);
    const origin=m.localToWorld(center.clone().add(out)),target=m.localToWorld(center.clone()),ray=new THREE.Raycaster(origin,target.sub(origin).normalize(),0,.46);
    rays.push({actor:name,mesh:m.name,angle,hit:ray.intersectObject(m,false).length>0});
   }
  }
  // Actual visible boot vertices, not ankle anchors: ensure armor adds no lower
  // point than the retained shoe/sole over walking, turning and combat poses.
  const floor=[];for(let t=0;t<=213;t+=.2){window.stepAt(t);for(const [name,a] of Object.entries(actors))for(const [side,r] of Object.entries(a.lowerClad?.legs??{})){
   let soleMin=Infinity,armorMin=Infinity;const v=new THREE.Vector3();
   for(const c of a.feet[side].children.filter(c=>c.isMesh)){const p=c.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(c.matrixWorld);soleMin=Math.min(soleMin,v.y);}}
   r.boot.traverse(c=>{if(!c.isMesh)return;const p=c.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(c.matrixWorld);armorMin=Math.min(armorMin,v.y);}});
   floor.push({t:Number(t.toFixed(3)),actor:name,side,soleMin,armorMin,clearance:armorMin-soleMin});
  }}
  const worst=floor.length?floor.reduce((a,b)=>a.clearance<b.clearance?a:b):null;
  return{poses,shells,rays,bootFloor:{samples:floor.length,worst},belt:Object.fromEntries(Object.entries(actors).filter(([,a])=>a.lowerClad).map(([n,a])=>[n,{center:a.lowerClad.beltCenter,rise:a.lowerClad.beltRise}]))};
 }));
 const after=probes[1],passed=JSON.stringify(probes[0].poses)===JSON.stringify(after.poses)&&after.shells.every(s=>!s.nonManifoldEdges&&s.finite&&s.opaque&&s.frontSide)&&after.rays.every(r=>r.hit)&&after.bootFloor.worst.clearance>=-.001;
 fs.writeFileSync(path.join(board,'lower_clad_probe.json'),JSON.stringify({passed,before:probes[0],after,limits:'Closed shell topology, outside visibility, retained joint transforms and boot-vs-original-sole at 5Hz. Not full-body self-collision or between-frame CCD.'},null,2));
 if(!passed)throw new Error('Lower armor probe failed; inspect lower_clad_probe.json');
 if(process.argv.includes('--video')){
  const out=path.join(ep,'output/lower_armor_comparison_r23.mp4'),encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit'],windowsHide:true}),done=once(encoder,'exit');
  for(let f=0;f<420;f++){
   const section=Math.floor(f/120),u=f%120/119;
   const cfg=section===0?{angle:u*TAU,view:'lower'}:section===1?{enemy:true,angle:u*TAU,view:'lower'}:section===2?{view:'belt',angle:u*TAU}:{t:151+u*2,angle:1.1};
   const imgs=await Promise.all(pages.map(p=>capture(p,cfg))),data=await composite(imgs,section===0?'阿鏊 · 连续腿套':section===1?'夜刈 · 连续腿套':section===2?'上移的金属腰带':'屈膝与脚踝');
   if(!encoder.stdin.write(Buffer.from(data,'base64')))await once(encoder.stdin,'drain');if(f%120===0)console.log('lower armor comparison '+f+'/420');
  }
  encoder.stdin.end();const [code]=await done;if(code)throw new Error('ffmpeg failed '+code);console.log(out);
 }
 console.log(JSON.stringify({passed,shells:after.shells.length,rays:after.rays.length,bootFloor:after.bootFloor}));
}finally{await browser.close();}
