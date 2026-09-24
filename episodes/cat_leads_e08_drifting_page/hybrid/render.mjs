import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..'),storyRoot=path.resolve(root,'../..');
const require=createRequire(path.join(storyRoot,'node_modules/dula-engine/package.json')),puppeteer=require('puppeteer');
const args=process.argv.slice(2),check=args.includes('--check'),serve=args.includes('--serve');
const board=path.join(here,'storyboard'),output=path.join(here,'output/output.mp4'),original=path.join(root,'painted/output/output.mp4');
fs.mkdirSync(board,{recursive:true});fs.mkdirSync(path.dirname(output),{recursive:true});
const mime={'.js':'text/javascript','.html':'text/html','.json':'application/json','.story':'text/plain','.mp4':'video/mp4','.jpg':'image/jpeg','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);let mount=root,relative=url.replace(/^\//,'')||'hybrid/viewer.html';
  if(url==='/favicon.ico'){res.writeHead(204).end();return;}
  if(url.startsWith('/node_modules/'))mount=storyRoot;
  if(url.startsWith('/node_modules/three/')){mount=path.resolve(path.dirname(require.resolve('three')),'..');relative=url.slice('/node_modules/three/'.length);}
  if(url.startsWith('/craft/')){mount=path.join(storyRoot,'episodes/yuki_morning_battle/craft_trial');relative=url.slice(7);}
  const target=path.resolve(mount,relative),rel=path.relative(mount,target);
  if(rel.startsWith('..')||path.isAbsolute(rel)){res.writeHead(403).end();return;}
  if(!fs.existsSync(target)){res.writeHead(404).end();return;}
  const stat=fs.statSync(target),headers={'Content-Type':mime[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
  const range=req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  if(range){const start=Number(range[1]),end=Math.min(stat.size-1,range[2]?Number(range[2]):stat.size-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});fs.createReadStream(target,{start,end}).pipe(res);}
  else{res.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(target).pipe(res);}
});
server.listen(serve?4200:0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${server.address().port}/hybrid/viewer.html`;console.log(url);
if(!serve){
  let browser,encoder;
  try{
    browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
    page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
    page.on('response',r=>{if(r.status()>=400)console.error(`HTTP ${r.status()} ${r.url()}`);});
    await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});await page.goto(url+'?capture=1',{waitUntil:'networkidle0'});await page.waitForFunction('window.ready===true',{timeout:60000});
    const duration=await page.evaluate(()=>window.duration),times=await page.evaluate(()=>window.checkTimes),keyFrames=new Set(times.map(t=>Math.round(t*30))),frames=duration*30;
    const trace=[],hashes={},metrics={frames:check?keyFrames.size:frames,maxBoneError:0,maxHandContactError:0,maxPenContactError:0,seekMatches:true};
    let encoderDone;
    if(!check){
      encoder=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-i',original,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',output],{stdio:['pipe','inherit','inherit'],windowsHide:true});
      encoderDone=once(encoder,'close');encoder.stdin.on('error',e=>console.error(e.message));
    }
    for(let i=0;i<frames;i++){
      if(check&&!keyFrames.has(i))continue;
      const r=await page.evaluate(t=>window.renderAt(t),i/30),buffer=Buffer.from(r.image,'base64');
      if(encoder&&!encoder.stdin.write(buffer))await once(encoder.stdin,'drain');
      for(const p of [r.state.girl,r.state.boy])for(const limb of ['leftArm','rightArm','leftLeg','rightLeg']){
        const points=p[limb],lengths=limb.endsWith('Arm')?p.armLengths:p.legLengths;
        for(let j=0;j<2;j++){const a=points[j],b=points[j+1],error=Math.abs(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)-lengths[j]);if(!Number.isFinite(error))throw new Error('Non-finite bone');metrics.maxBoneError=Math.max(metrics.maxBoneError,error);}
      }
      metrics.maxHandContactError=Math.max(metrics.maxHandContactError,r.state.handError);
      metrics.maxPenContactError=Math.max(metrics.maxPenContactError,r.state.penContactError);
      if(keyFrames.has(i)){
        const filename=`frame_${String(i).padStart(4,'0')}.jpg`;fs.writeFileSync(path.join(board,filename),buffer);trace.push({...r.state,filename});
        hashes[i]=createHash('sha256').update(buffer).digest('hex');
      }
      if(i%150===0)console.log(`${check?'check':'render'} ${i}/${frames}`);
    }
    if(encoder){encoder.stdin.end();const [code]=await encoderDone;if(code!==0)throw new Error(`ffmpeg ${code}`);encoder=undefined;}
    for(const frame of [...keyFrames].sort((a,b)=>b-a)){
      const r=await page.evaluate(t=>window.renderAt(t),frame/30),hash=createHash('sha256').update(Buffer.from(r.image,'base64')).digest('hex');
      if(hash!==hashes[frame]){metrics.seekMatches=false;fs.writeFileSync(path.join(board,`seek_difference_${frame}.jpg`),Buffer.from(r.image,'base64'));throw new Error(`Seek differs at ${frame}`);}
    }
    const characters=await page.evaluate(()=>window.characterChecks());
    const contactChecks=await page.evaluate(()=>window.contactChecks());
    const refinements=await page.evaluate(()=>window.refinementChecks());
    if(refinements.maxSupportDrift>1e-6||refinements.maxSolePenetration>.001||refinements.grips.some(g=>!g.opposed||Object.values(g.pads).some(p=>!p.samples||p.nearest>.004)))throw new Error(`Refinement checks failed: ${JSON.stringify(refinements)}`);
    if(contactChecks.some(s=>s.error>.005))throw new Error(`Transfer contact failed: ${JSON.stringify(contactChecks)}`);
    if(errors.length||metrics.maxBoneError>1e-6||metrics.maxHandContactError>.005||metrics.maxPenContactError>.005)throw new Error(`Validation failed: ${JSON.stringify({errors,metrics})}`);
    if(!check){
      const hashAudio=file=>execFileSync('ffmpeg',['-v','error','-i',file,'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-'],{encoding:'utf8',windowsHide:true}).trim();
      metrics.originalAudioHash=hashAudio(original);metrics.outputAudioHash=hashAudio(output);metrics.audioIdentical=metrics.originalAudioHash===metrics.outputAudioHash;
      if(!metrics.audioIdentical)throw new Error('Original audio packets changed');
    }
    fs.writeFileSync(path.join(board,check?'preview_validation.json':'validation.json'),JSON.stringify({duration,fps:30,metrics,errors,characters,refinements,trace},null,2));
    console.log(JSON.stringify(metrics));
  }finally{if(encoder&&!encoder.killed)encoder.kill();if(browser)await browser.close();server.close();}
}
