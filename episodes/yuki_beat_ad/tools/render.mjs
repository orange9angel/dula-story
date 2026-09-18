import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storyRoot = path.resolve(root, '../..');
const require = createRequire(path.join(storyRoot, 'node_modules/dula-engine/package.json'));
const puppeteer = require('puppeteer');
const check = process.argv.includes('--check');
const serveOnly = process.argv.includes('--serve');
const v2 = process.argv.includes('--v2');
const v3 = process.argv.includes('--v3');
const v4 = process.argv.includes('--v4');
const v5 = process.argv.includes('--v5');
const v6 = process.argv.includes('--v6');
const v8 = process.argv.includes('--v8');
const version = v8 ? 'v8' : v6 ? 'v6' : v5 ? 'v5' : v4 ? 'v4' : v3 ? 'v3' : v2 ? 'v2' : '';
const boardDir = path.join(root, version ? `storyboard/${version}` : 'storyboard');
const audioFile = version ? `assets/audio/mixed_${version}.wav` : 'assets/audio/mixed.wav';
const outputFile = version ? `output/yuki_beat_ad_${version}.mp4` : 'output/yuki_beat_ad.mp4';
const fps = v3 || v4 || v5 || v6 || v8 ? 60 : 30;
const backendArg = process.argv.find(a => a.startsWith('--video-backend='));
const videoBackend = backendArg ? backendArg.split('=')[1] : 'program';
if (videoBackend === 'model') throw new Error('video-backend=model 尚未接入（预留 Seedance 参考链，见 cat_leads_e09），请使用默认 program');
if (videoBackend !== 'program') throw new Error(`未知 video-backend: ${videoBackend}（可选 program|model）`);
const mime = {'.js':'text/javascript','.html':'text/html','.json':'application/json','.story':'text/plain','.wav':'audio/wav','.png':'image/png','.jpg':'image/jpeg'};
const server = http.createServer((req,res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const engineDependency = url.startsWith('/node_modules/three/');
  const mount = engineDependency ? path.join(storyRoot,'node_modules/dula-engine') : url.startsWith('/node_modules/') ? storyRoot : root;
  const rel = url.startsWith('/node_modules/') ? url.slice(1) : url.replace(/^\/episode\//,'').replace(/^\//,'') || 'viewer.html';
  const target = path.resolve(mount,rel);
  if (!target.startsWith(mount + path.sep)) {res.writeHead(403).end();return;}
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end();return;} res.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
});
server.listen(serveOnly ? 4188 : 0,'127.0.0.1');
await once(server,'listening');
const url = `http://127.0.0.1:${server.address().port}/${version ? `viewer_${version}.html` : 'viewer.html'}`;
console.log(url);
if (!serveOnly) {
  let browser, encoder;
  try {
    browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
    const page = await browser.newPage();
    const errors=[];
    page.on('pageerror',e=>{ errors.push(e.message); console.error(e.message); });
    page.on('response',r=>{if(r.status()>=400 && /\.(js|html)(\?|$)/.test(r.url()))console.error(`HTTP ${r.status()} ${r.url()}`);});
    await page.setViewport({width:720,height:1280,deviceScaleFactor:1});
    await page.goto(url+'?capture=1',{waitUntil:'networkidle0'});
    await page.waitForFunction('window.ready === true',{timeout:60000});
    const duration = await page.evaluate(()=>window.duration);
    fs.mkdirSync(boardDir,{recursive:true});
    fs.mkdirSync(path.join(root,'output'),{recursive:true});
    const checks=version ? await page.evaluate(()=>window.checkTimes) : [0.5,2.1,3.7,5.4,6.9,8.45,10.4,12.1];
    let ci=0; const trace=[];
    if (!check) {
      encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-i',path.join(root,audioFile),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-b:a','192k','-t',String(duration),'-movflags','+faststart',path.join(root,outputFile)],{stdio:['pipe','inherit','inherit']});
    }
    for(let i=0;i<Math.round(duration*fps);i++) {
      const t=i/fps;
      const capture=!check || (ci<checks.length && t >= checks[ci]);
      const result = await page.evaluate((t,capture)=> capture ? window.renderAt(t) : (window.stepAt ? window.stepAt(t) : window.renderAt(t).state), t, capture);
      if(capture) {
        const buffer=Buffer.from(result.image,'base64');
        if(!check && !encoder.stdin.write(buffer)) await once(encoder.stdin,'drain');
        if(ci<checks.length && t>=checks[ci]) {
          const filename=`portrait_${String(ci+1).padStart(2,'0')}.jpg`;
          fs.writeFileSync(path.join(boardDir,filename),buffer);
          trace.push({t,filename,...result.state}); ci++;
        }
      }
      if(i%60===0) console.log(`${check?'check':'render'} ${i}/${Math.round(duration*fps)}`);
    }
    if(encoder){encoder.stdin.end();const [code]=await once(encoder,'close');if(code!==0)throw new Error(`ffmpeg failed: ${code}`);}
    if(errors.length)throw new Error(errors.join('\n'));
    fs.writeFileSync(path.join(boardDir,'portrait_trace.json'),JSON.stringify({duration,fps,errors,shots:trace},null,2));
    console.log(check?'Portrait checks complete':'Video complete');
  } finally { if(encoder&&!encoder.killed)encoder.kill();if(browser)await browser.close();server.close(); }
}
