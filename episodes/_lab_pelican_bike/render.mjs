// node render.mjs [stills t1,t2,...] —— 无参数则渲全片 output/pelican_bike.mp4（30fps）
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {once} from 'node:events';
import {puppeteerFor} from '../../../dula-skills/draw-over-animation/scripts/pipeline.mjs';
const dir=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const b=await puppeteerFor(dir).launch({headless:'new',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.setViewport({width:1280,height:720});await p.goto('http://127.0.0.1:4271/index.html');
await p.waitForFunction('window.ready===true',{timeout:120000}).catch(e=>{console.log(errs);throw e;});
const stills=process.argv[2];
if(stills){for(const t of stills.split(',')){fs.writeFileSync(path.join(dir,'frames',`t${t}.png`),Buffer.from(await p.evaluate(t=>window.renderAt(t),+t),'base64'));}}
else{const enc=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',path.join(dir,'output','pelican_bike.mp4')],{stdio:['pipe','inherit','inherit']});
  const n=await p.evaluate(()=>window.DUR*30);for(let i=0;i<n;i++){const s=Buffer.from(await p.evaluate(t=>window.renderAt(t),i/30),'base64');if(!enc.stdin.write(s))await once(enc.stdin,'drain');}
  enc.stdin.end();await once(enc,'close');}
console.log('done',errs);await b.close();
