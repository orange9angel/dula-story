import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {samplePose} from './pose.js';
import {samplePose3D} from './pose3d.js';

const root=path.dirname(fileURLToPath(import.meta.url)),episode=path.resolve(root,'..');
const storyRoot=path.resolve(episode,'../..'),workspace=path.dirname(storyRoot);
const engine=path.join(workspace,'dula-engine'),assets=path.join(workspace,'dula-assets');
const args=process.argv.slice(2),value=(k,d)=>{const i=args.indexOf(k);return i<0?d:args[i+1];};
const volume=args.includes('--3d'),preview=args.includes('--preview');
const check=args.includes('--check')||preview,serve=args.includes('--serve'),mode=value('--mode',volume?'volume':'compare');
const output=path.join(root,'output'),board=path.join(root,'storyboard');
const time=s=>{const a=s.replace(',','.').split(':').map(Number);return a[0]*3600+a[1]*60+a[2];};
const source=fs.readFileSync(path.join(episode,'script.story'),'utf8');
const entries=[...source.matchAll(/(?:^|\r?\n)(\d+)\r?\n(\d\d:\d\d:\d\d,\d+) --> (\d\d:\d\d:\d\d,\d+)/g)]
  .map(m=>({index:+m[1],start:time(m[2]),end:time(m[3])}));
let cursor=0;
const shots=[[15,'point'],[8,'walk']].map(([index,kind])=>{
  const e=entries.find(e=>e.index===index);if(!e)throw new Error(`Missing source story entry ${index}`);
  const shot={kind,sourceEntry:index,sourceStart:e.start,sourceEnd:e.end,start:cursor,end:cursor+e.end-e.start};cursor=shot.end;return shot;
});
if(volume){
  const inspection=fs.readFileSync(path.join(root,'inspection.story'),'utf8');
  const m=inspection.match(/(\d\d:\d\d:\d\d,\d+) --> (\d\d:\d\d:\d\d,\d+)/);
  if(!m)throw new Error('Missing turntable inspection interval');
  const length=time(m[2])-time(m[1]);
  shots.push({kind:'turn',sourceEntry:1,source:'inspection.story',sourceStart:time(m[1]),sourceEnd:time(m[2]),start:cursor,end:cursor+length});cursor+=length;
}
const plan={duration:cursor,fps:30,shots,source:'../script.story',audio:'silent visual study'};
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);
  if(url==='/favicon.ico'){res.writeHead(204).end();return;}
  if(url==='/plan.json'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(plan));return;}
  const mounts=[['/node_modules/three/',path.join(engine,'node_modules/three')],['/node_modules/dula-engine/',engine],['/node_modules/dula-assets/',assets],['/episode/',episode],['/trial/',root]];
  const found=mounts.find(([prefix])=>url.startsWith(prefix));
  const base=found?found[1]:root,rel=found?url.slice(found[0].length):url==='/'?'viewer.html':url.slice(1);
  const target=path.resolve(base,rel);
  if(!target.startsWith(base+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(target,(e,data)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);});
});
server.listen(serve?Number(value('--port',4198)):0,'127.0.0.1');await once(server,'listening');
const url=`http://127.0.0.1:${server.address().port}/${volume?'viewer3d':'viewer'}.html`;
console.log(url);
if(serve){console.log('Visual trial viewer ready');}else{
  const require=createRequire(path.join(engine,'package.json')),puppeteer=require('puppeteer');
  let browser,encoder,encoderClosed;
  try{
    fs.mkdirSync(board,{recursive:true});fs.mkdirSync(output,{recursive:true});
    browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
    const page=await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('response',r=>{if(r.status()>=400)console.error(`HTTP ${r.status()} ${r.url()}`);});
    await page.goto(`${url}?capture=1&mode=${mode}`,{waitUntil:'networkidle0'});
    await page.waitForFunction('window.ready===true',{timeout:30000});
    const frames=Math.round(plan.duration*30),checkFrames=volume?[0,18,36,57,79,96,110,128,149,168,186,192,237,282,327,371]:[0,18,36,57,79,96,110,128,149,168,186];
    const trace=[],hashes={},metrics={maxStanceDrift:0,maxLegLengthError:0,maxArmLengthError:0,seekMatches:true,frames,evaluatedFrames:0};
    if(!check){
      const file=path.join(output,volume?'yuki_craft_3d.mp4':mode==='compare'?'yuki_craft_comparison.mp4':'yuki_craft_after.mp4');
      encoder=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',file],{stdio:['pipe','inherit','inherit'],windowsHide:true});
      encoderClosed=once(encoder,'close');encoder.stdin.on('error',e=>console.error(`encoder: ${e.message}`));
    }
    let prev=null;
    for(let i=0;i<frames;i++){
      if(preview&&!checkFrames.includes(i))continue;
      metrics.evaluatedFrames++;
      const t=i/30,result=await page.evaluate(t=>window.renderAt(t),t),state=result.state;
      trace.push(state);
      for(const side of ['left','right'])if(prev&&state.shot!=='turn'&&prev.shot===state.shot&&prev[side+'Contact']&&state[side+'Contact']&&!preview)metrics.maxStanceDrift=Math.max(metrics.maxStanceDrift,Math.hypot(state[side+'Foot'].x-prev[side+'Foot'].x,state[side+'Foot'].y-prev[side+'Foot'].y,(state[side+'Foot'].z??0)-(prev[side+'Foot'].z??0)));
      prev=state;
      const s=shots.find(s=>t>=s.start&&t<s.end)??shots.at(-1),p=(volume?samplePose3D:samplePose)(t-s.start,s.kind,s.end-s.start);
      const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y,(b.z??0)-(a.z??0));
      for(const side of ['left','right']){
        const [a,b,c]=p[side+'Leg'];metrics.maxLegLengthError=Math.max(metrics.maxLegLengthError,Math.abs(distance(a,b)-.305),Math.abs(distance(b,c)-.295));
        if(volume){const [a,b,c]=p[side+'Arm'];metrics.maxArmLengthError=Math.max(metrics.maxArmLengthError,Math.abs(distance(a,b)-.19),Math.abs(distance(b,c)-.18));}
      }
      const buffer=Buffer.from(result.image,'base64');
      if(encoder&&!encoder.stdin.write(buffer))await once(encoder.stdin,'drain');
      if(checkFrames.includes(i)){
        const png=Buffer.from(await page.evaluate(t=>window.pngAt(t),t),'base64');
        fs.writeFileSync(path.join(board,`${mode}_${String(i).padStart(3,'0')}.png`),png);
        hashes[i]=createHash('sha256').update(png).digest('hex');
      }
      if(i%30===0)console.log(`${check?'check':'render'} ${mode} ${i}/${frames}`);
    }
    for(const i of [...checkFrames].reverse()){
      const png=Buffer.from(await page.evaluate(t=>window.pngAt(t),i/30),'base64');
      if(createHash('sha256').update(png).digest('hex')!==hashes[i])metrics.seekMatches=false;
    }
    if(volume){
      for(const angle of [-90,-45,45,90,180]){
        await page.evaluate(a=>window.setAngle(a),angle);
        fs.writeFileSync(path.join(board,`volume_angle_${angle}.png`),Buffer.from(await page.evaluate(()=>window.pngAt(1.2)),'base64'));
      }
      await page.evaluate(()=>window.setAngle(0));
      const handChecks=await page.evaluate(()=>window.handChecks());
      if(handChecks.some(c=>c.maxWeightError>1e-6))throw new Error('Hand skin weights are not normalized');
      fs.writeFileSync(path.join(board,'hand_validation.json'),JSON.stringify(handChecks,null,2));
      await page.evaluate(()=>window.setMode('hands'));
      fs.writeFileSync(path.join(board,'hand_multiview.png'),Buffer.from(await page.evaluate(()=>window.pngAt(1.2)),'base64'));
    }
    await page.evaluate(()=>window.setMode('silhouette'));
    for(const t of (volume?[0,1.2,4.27,9.4]:[1.2,4.27]))fs.writeFileSync(path.join(board,`${volume?'volume_':''}silhouette_${t.toFixed(2)}.png`),Buffer.from(await page.evaluate(t=>window.pngAt(t),t),'base64'));
    if(encoder){encoder.stdin.end();const [code]=await encoderClosed;if(code!==0)throw new Error(`ffmpeg exit ${code}`);encoder=null;}
    fs.writeFileSync(path.join(board,`${mode}_validation.json`),JSON.stringify({plan,metrics,errors,trace},null,2));
    console.log(JSON.stringify(metrics));
    if(errors.length)throw new Error(errors.join('\n'));
    if(metrics.maxStanceDrift>1e-8)throw new Error('Stance foot moved in world space');
    if(metrics.maxLegLengthError>.012)throw new Error('Leg target exceeded rig reach');
    if(metrics.maxArmLengthError>1e-7)throw new Error('Arm target exceeded rig reach');
    if(!metrics.seekMatches)throw new Error('Sequential versus seek rendering mismatch');
    console.log(check?'Checks complete':'Video complete');
  }finally{if(encoder)encoder.kill();if(browser)await browser.close();server.close();}
}
