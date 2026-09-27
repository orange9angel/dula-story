import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..'),storyRoot=path.resolve(root,'../..');
const require=createRequire(path.join(storyRoot,'node_modules/dula-engine/package.json')),puppeteer=require('puppeteer');
const args=process.argv.slice(2),check=args.includes('--check'),serve=args.includes('--serve');
const opt=(name)=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
const cameraArg=opt('--camera'); // "px,py,pz,lx,ly,lz[,fov]" — locks a free camera for the whole run
const rangeArg=opt('--range');   // "start,end" in seconds
const outArg=opt('--out');       // filename under craft3d/output/
const board=path.join(here,'storyboard');
const audioFile=path.join(root,'assets/audio/mixed.wav');
const output=path.join(here,'output',outArg??'craft3d_v2.mp4');
const fps=60;
fs.mkdirSync(board,{recursive:true});fs.mkdirSync(path.dirname(output),{recursive:true});
const mime={'.js':'text/javascript','.html':'text/html','.json':'application/json','.story':'text/plain','.wav':'audio/wav','.mp4':'video/mp4','.jpg':'image/jpeg','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);let mount=root,relative=url.replace(/^\/episode\//,'').replace(/^\//,'')||'craft3d/viewer.html';
  if(url==='/favicon.ico'){res.writeHead(204).end();return;}
  if(url.startsWith('/node_modules/'))mount=storyRoot;
  if(url.startsWith('/node_modules/three/')){mount=path.resolve(path.dirname(require.resolve('three')),'..');relative=url.slice('/node_modules/three/'.length);}
  if(url.startsWith('/craft/')){mount=path.join(storyRoot,'episodes/yuki_morning_battle/craft_trial');relative=url.slice(7);}
  const target=path.resolve(mount,relative),rel=path.relative(mount,target);
  if(rel.startsWith('..')||path.isAbsolute(rel)){res.writeHead(403).end();return;}
  if(!fs.existsSync(target)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store','Content-Length':fs.statSync(target).size});
  fs.createReadStream(target).pipe(res);
});
server.listen(serve?4210:0,'127.0.0.1');await once(server,'listening');
const url=`http://127.0.0.1:${server.address().port}/craft3d/viewer.html`;console.log(url);
if(!serve){
  let browser,encoder;
  try{
    browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
    page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
    page.on('response',r=>{if(r.status()>=400)console.error(`HTTP ${r.status()} ${r.url()}`);});
    await page.setViewport({width:720,height:1280,deviceScaleFactor:1});
    await page.goto(url+'?capture=1',{waitUntil:'networkidle0'});
    await page.waitForFunction('window.ready===true',{timeout:120000});
    if(cameraArg){
      const n=cameraArg.split(',').map(Number);
      if(n.length!==6&&n.length!==7||n.some(x=>!Number.isFinite(x)))throw new Error(`Bad --camera "${cameraArg}"`);
      await page.evaluate(cfg=>window.setFreeCamera(cfg),{pos:n.slice(0,3),lookAt:n.slice(3,6),fov:n[6]});
    }
    const duration=await page.evaluate(()=>window.duration);
    const checks=await page.evaluate(()=>window.checkTimes);
    const frames=Math.round(duration*fps);
    const range=rangeArg?rangeArg.split(',').map(Number):null;
    const startFrame=range?Math.round(range[0]*fps):0,endFrame=range?Math.min(frames,Math.round(range[1]*fps)):frames;
    let ci=0;const trace=[];
    if(!check){
      const audioArgs=range?['-ss',String(range[0]),'-t',String(range[1]-range[0])]:[];
      encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0',...audioArgs,'-i',audioFile,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-b:a','192k','-t',String((endFrame-startFrame)/fps),'-movflags','+faststart',output],{stdio:['pipe','inherit','inherit'],windowsHide:true});
    }
    for(let i=startFrame;i<endFrame;i++){
      const t=i/fps;
      const capture=!check||(ci<checks.length&&t>=checks[ci]);
      const result=await page.evaluate((t,capture)=>capture?window.renderAt(t):window.stepAt(t),t,capture);
      if(capture){
        const buffer=Buffer.from(result.image,'base64');
        if(!check&&!encoder.stdin.write(buffer))await once(encoder.stdin,'drain');
        if(check&&ci<checks.length&&t>=checks[ci]){
          const filename=`shot_${String(ci+1).padStart(2,'0')}.jpg`;
          fs.writeFileSync(path.join(board,filename),buffer);
          trace.push({t,filename,...result.state});ci++;
        }
      }
      if(i%300===0)console.log(`${check?'check':'render'} ${i}/${endFrame}`);
    }
    if(encoder){encoder.stdin.end();const [code]=await once(encoder,'close');if(code!==0)throw new Error(`ffmpeg failed: ${code}`);}
    if(errors.length)throw new Error(errors.join('\n'));
    if(check)fs.writeFileSync(path.join(board,'craft3d_trace.json'),JSON.stringify({duration,fps,errors,shots:trace},null,2));
    console.log(check?`check complete: ${ci} frames`:`video complete: ${output}`);
  }finally{if(encoder&&!encoder.killed)encoder.kill();if(browser)await browser.close();server.close();}
}
