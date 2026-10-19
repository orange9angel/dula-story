import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const ep=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(ep,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer'),base=process.argv[2]??'http://127.0.0.1:4235';
const board=path.join(ep,'storyboard/palace_r20');fs.mkdirSync(board,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const pages=[];
 for(const q of ['&metal=0&anatomy=0&particles=0','']){
  const p=await browser.newPage();p.on('pageerror',e=>{throw e;});await p.goto(base+'/viewer.html?capture=1'+q);await p.waitForFunction('window.ready===true');pages.push(p);
 }
 const report=await pages[1].evaluate(async()=>{
  const THREE=await import('three'),{actors,scene}=window.__dbg;window.stepAt(9);scene.scene.updateMatrixWorld(true);
  const rays=[],raycaster=new THREE.Raycaster();
  for(const cx of [-3,0,3])for(const x of [-1.7,0,1.7])for(const y of [1.9,3.3,4.8]){
   const from=new THREE.Vector3(cx,3,5),to=new THREE.Vector3(x,y,-10),dir=to.clone().sub(from).normalize();raycaster.set(from,dir);
   const hits=raycaster.intersectObjects(scene.portalSolids,false);rays.push({from:from.toArray(),target:to.toArray(),hit:hits[0]?.object.name??null,z:hits[0]?.point.z??null});
  }
  return {portal:{tested:rays.length,passed:rays.every(r=>r.hit&&r.z>-14),rays},armor:Object.fromEntries(Object.entries(actors).map(([n,a])=>[n,{meshes:a.metalClad.converted,materials:a.metalClad.materials.length,metalness:a.metalClad.materials.map(m=>m.metalness),albedo:a.metalClad.map.colorSpace,environment:a.metalClad.materials.every(m=>!!m.envMap)}]))};
 });
 if(!report.portal.passed)throw new Error('Palace doorway leaks beyond its enclosure');
 fs.writeFileSync(path.join(board,'upgrade_probe.json'),JSON.stringify(report,null,2));
 // Side-by-side crops keep the material readable at the ordinary viewing size.
 const compositor=await browser.newPage();await compositor.setContent('<canvas width="1440" height="720"></canvas>');
 const out=path.join(ep,'output/armor_comparison_r20.mp4'),encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit'],windowsHide:true});
 const done=once(encoder,'exit');
 for(let f=0;f<360;f++){
  const enemy=f>=180,u=(f%180)/179,t=enemy?29:9,angle=(enemy?-.85:.85)+(u-.5)*1.3;
  const imgs=[];
  for(const page of pages){
   const im=await page.evaluate(({t,angle,enemy})=>{window.stepAt(t);const a=window.__dbg.actors[enemy?'yekari':'aoao'],p=a.headGroup.getWorldPosition(a.mesh.position.clone());
    window.setFreeCamera({pos:[p.x+Math.sin(angle)*2.30,p.y-.06,p.z+Math.cos(angle)*2.30],lookAt:[p.x,p.y-.23,p.z],fov:34});return window.renderAt(t).image;},{t,angle,enemy});imgs.push(im);
  }
  const data=await compositor.evaluate(async({imgs,enemy})=>{
   const c=document.querySelector('canvas'),ctx=c.getContext('2d');
   for(let i=0;i<2;i++){const im=new Image();im.src='data:image/jpeg;base64,'+imgs[i];await im.decode();ctx.drawImage(im,280,0,720,720,i*720,0,720,720);}
   ctx.fillStyle='rgba(7,11,18,.78)';ctx.fillRect(0,0,1440,54);ctx.font='bold 26px Microsoft YaHei';ctx.textAlign='center';ctx.fillStyle='#eee';ctx.fillText('原色块圣衣',360,37);ctx.fillStyle='#ffdc99';ctx.fillText('金属反射＋刻纹 · '+(enemy?'夜刈':'阿鏊'),1080,37);
   return c.toDataURL('image/jpeg',.94).split(',')[1];
  },{imgs,enemy});
  if(!encoder.stdin.write(Buffer.from(data,'base64')))await once(encoder.stdin,'drain');
  if(f%90===0)console.log('armor comparison '+f+'/360');
 }
 encoder.stdin.end();const [code]=await done;if(code)throw new Error('ffmpeg failed: '+code);
 console.log(JSON.stringify({output:out,portalRays:report.portal.tested,armor:report.armor}));
}finally{await browser.close();}
