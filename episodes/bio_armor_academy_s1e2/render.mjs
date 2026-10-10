import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const here=path.dirname(fileURLToPath(import.meta.url)),root=here,storyRoot=path.resolve(root,'../..');
const require=createRequire(path.join(storyRoot,'node_modules/dula-engine/package.json')),puppeteer=require('puppeteer');
const args=process.argv.slice(2),check=args.includes('--check'),serve=args.includes('--serve');
const legacyPerformance=args.includes('--legacy-performance');
const fightFinal=!legacyPerformance&&(args.includes('--fight-final')||!args.includes('--fight-trial'));
const fightTrial=!legacyPerformance;
const opt=(name)=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
const cameraArg=opt('--camera'); // "px,py,pz,lx,ly,lz[,fov]" — locks a free camera for the whole run
const rangeArg=opt('--range');   // "start,end" in seconds
const outArg=opt('--out');       // filename under output/
const traceArg=opt('--trace');   // 逐帧 {t,root,yaw} 落盘（步态检测用），如 output/gait_trace.json
const noRefine=args.includes('--norefine'); // 关闭精修层（前后对比帧用）
const sourceOverride=opt('--source')?path.resolve(here,opt('--source')):null;
const sourcePath=relative=>sourceOverride&&fs.existsSync(path.join(sourceOverride,relative))?path.join(sourceOverride,relative):path.join(here,relative);
const board=path.join(here,opt('--board')??(fightFinal?'storyboard/character_look_r16/check':fightTrial?'storyboard/fight_trial':'storyboard/legacy_check'));
const audioFile=path.join(here,fightFinal?'output/craft3d_full_r11_2026_10_9.mp4':'assets3d/mixed.wav');
const output=path.join(here,'output',outArg??(fightFinal?'craft3d_full_r16.mp4':fightTrial?'fight_trial_r16.mp4':'craft3d_legacy_performance.mp4'));
const fps=30;
fs.mkdirSync(board,{recursive:true});fs.mkdirSync(path.dirname(output),{recursive:true});
const mime={'.js':'text/javascript','.html':'text/html','.json':'application/json','.story':'text/plain','.wav':'audio/wav','.mp4':'video/mp4','.jpg':'image/jpeg','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);let mount=root,relative=url.replace(/^\/episode\//,'').replace(/^\//,'')||'viewer.html';
  if(url==='/favicon.ico'){res.writeHead(204).end();return;}
  if(url.startsWith('/node_modules/'))mount=storyRoot;
  if(url.startsWith('/node_modules/three/')){mount=path.resolve(path.dirname(require.resolve('three')),'..');relative=url.slice('/node_modules/three/'.length);}
  if(url.startsWith('/craft/')){mount=path.join(storyRoot,'episodes/yuki_morning_battle/craft_trial');relative=url.slice(7);}
  if(url.startsWith('/fish/')){mount=path.join(storyRoot,'episodes/yuki_fish_musical/craft3d');relative=url.slice(6);}
  let target=path.resolve(mount,relative);const rel=path.relative(mount,target);
  if(rel.startsWith('..')||path.isAbsolute(rel)){res.writeHead(403).end();return;}
  if(mount===root&&sourceOverride&&['performance.js','fight_trial.js','viewer.js','characters.js','locomotion.js'].includes(relative))target=sourcePath(relative);
  if(!fs.existsSync(target)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store','Content-Length':fs.statSync(target).size});
  fs.createReadStream(target).pipe(res);
});
server.listen(serve?4214:0,'127.0.0.1');await once(server,'listening');
const url=`http://127.0.0.1:${server.address().port}/viewer.html`;console.log(url);
if(!serve){
  let browser,encoder;
  try{
    browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
    page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
    page.on('response',r=>{if(r.status()>=400)console.error(`HTTP ${r.status()} ${r.url()}`);});
    await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
    await page.goto(url+'?capture=1'+(noRefine?'&norefine=1':'')+(legacyPerformance?'&legacy-performance=1':'&fight-trial=1')+(args.includes('--legacy-look')?'&legacy-look=1':''),{waitUntil:'networkidle0'});
    await page.waitForFunction('window.ready===true',{timeout:120000});
    if(cameraArg){
      const n=cameraArg.split(',').map(Number);
      if(n.length!==6&&n.length!==7||n.some(x=>!Number.isFinite(x)))throw new Error(`Bad --camera "${cameraArg}"`);
      await page.evaluate(cfg=>window.setFreeCamera(cfg),{pos:n.slice(0,3),lookAt:n.slice(3,6),fov:n[6]});
    }
    const duration=await page.evaluate(()=>window.duration);
    const sources=['character_look.js','character_finish.js','character_details.js','characters.js','performance.js','locomotion.js','fight_trial.js','fight_trial_face.js','viewer.js','render.mjs','scenes/RuinsDuskScene.js','scenes/ContinuousBackdrop.js'];
    const {createHash}=await import('node:crypto');
    fs.writeFileSync(path.join(board,check?'check_build.json':'render_build.json'),JSON.stringify({
      args,output,audioFile,fightFinal,fightTrial,legacyPerformance,sourceOverride,
      characterLook:args.includes('--legacy-look')?'legacy':'nape-hair-r20',
      locomotion:sourceOverride?'source-override':'finite-footsteps-r21',
      sourceSha256:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(fs.readFileSync(p==='render.mjs'?path.join(here,p):sourcePath(p))).digest('hex')]))
    },null,2));
    let checks=await page.evaluate(()=>window.checkTimes);
    const frames=Math.round(duration*fps);
    const trialRange=fightTrial&&!fightFinal?await page.evaluate(()=>window.fightTrialRange):null;
    const range=rangeArg?rangeArg.split(',').map(Number):trialRange;
    if(trialRange&&(range[0]<trialRange[0]-1e-6||range[1]>trialRange[1]+1e-6))
      throw new Error(`Fight study is scoped to ${trialRange.join(',')} seconds; adjacent shots are not upgraded.`);
    const startFrame=range?Math.round(range[0]*fps):0,endFrame=range?Math.min(frames,Math.round(range[1]*fps)):frames;
    if(range)checks=checks.filter(t=>t>=startFrame/fps&&t<endFrame/fps);
    let ci=0;const trace=[],gaitTrace=[];
    if(!check){
      const audioArgs=range?['-ss',String(range[0]),'-t',String(range[1]-range[0])]:[];
      const audioCodec=fightFinal?['-c:a','copy']:['-c:a','aac','-ar','48000','-ac','2','-b:a','192k'];
      const sound=fs.existsSync(audioFile)?[...audioArgs,'-i',audioFile,'-map','0:v:0','-map','1:a:0',...audioCodec]:['-an'];
      encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0',...sound,'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-t',String((endFrame-startFrame)/fps),'-movflags','+faststart',output],{stdio:['pipe','inherit','inherit'],windowsHide:true});
    }
    for(let i=startFrame;i<endFrame;i++){
      const t=i/fps;
      const capture=!check||(ci<checks.length&&t>=checks[ci]);
      const result=await page.evaluate((t,capture)=>capture?window.renderAt(t):window.stepAt(t),t,capture);
      if(traceArg)gaitTrace.push({t:Math.round(t*1000)/1000,...(result.state??result)});
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
    if(traceArg){const tp=path.isAbsolute(traceArg)?traceArg:path.join(here,traceArg);fs.mkdirSync(path.dirname(tp),{recursive:true});
      fs.writeFileSync(tp,JSON.stringify({fps,frames:gaitTrace},null,1));console.log(`gait trace: ${tp} (${gaitTrace.length} frames)`);}
    if(errors.length)throw new Error(errors.join('\n'));
    if(check){
      const seek=[];
      for(const shot of [...trace].reverse()){
        // 像素容差比较：JPEG 编码器在复杂边缘偶有单个 8×8 块的字节级非确定性，
        // 字节相等会把"同一画面不同编码"误判为状态漂移（2026-10-08 shot_32 实测）。
        const refB64=fs.readFileSync(path.join(board,shot.filename)).toString('base64');
        const stats=await page.evaluate(async(t,ref)=>{
          const r=window.renderAt(t);
          const load=b=>new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.src='data:image/jpeg;base64,'+b;});
          const [a,b]=await Promise.all([load(r.image),load(ref)]);
          const W=a.width,H=a.height,c=document.createElement('canvas');c.width=W;c.height=H;
          const g=c.getContext('2d',{willReadFrequently:true});
          g.drawImage(a,0,0);const da=g.getImageData(0,0,W,H).data;
          g.drawImage(b,0,0);const db=g.getImageData(0,0,W,H).data;
          let bad=0,max=0;
          for(let i=0;i<da.length;i+=4){
            const d=Math.max(Math.abs(da[i]-db[i]),Math.abs(da[i+1]-db[i+1]),Math.abs(da[i+2]-db[i+2]));
            if(d>max)max=d;if(d>16)bad++;
          }
          return{bad,max,image:r.image};
        },shot.t,refB64);
        const equal=stats.bad<=64; // 至多约两个 8×8 编码块的噪声
        if(!equal)fs.writeFileSync(path.join(board,shot.filename.replace('.jpg','_seek.jpg')),Buffer.from(stats.image,'base64'));
        seek.push({t:shot.t,equal,bad:stats.bad,max:stats.max});
      }
      fs.writeFileSync(path.join(board,'seek_check.json'),JSON.stringify({checks:seek,passed:seek.every(s=>s.equal)},null,2));
      fs.writeFileSync(path.join(board,'craft3d_trace.json'),JSON.stringify({duration,fps,errors,shots:trace},null,2));
      if(seek.some(s=>!s.equal))throw new Error('Sequential/direct seek image mismatch');
    }
    if(check)fs.writeFileSync(path.join(board,'craft3d_trace.json'),JSON.stringify({duration,fps,errors,shots:trace},null,2));
    console.log(check?`check complete: ${ci} frames`:`video complete: ${output}`);
  }finally{if(encoder&&!encoder.killed)encoder.kill();if(browser)await browser.close();server.close();}
}
