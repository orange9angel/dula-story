import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import {once} from 'node:events';
const ep=path.resolve(import.meta.dirname,'..'),req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const browser=await req('puppeteer').launch({headless:true});let encoder;
try{
 const page=await browser.newPage();page.on('pageerror',e=>console.error(e.message));page.on('console',m=>{if(m.type()==='error')console.error(m.text());});await page.setViewport({width:1280,height:720});
 await page.goto('http://127.0.0.1:4215/motion_lab.html');await page.waitForFunction('window.ready',{timeout:90000});
 const duration=await page.evaluate(()=>window.duration),out=path.join(ep,'storyboard/remake_r3/tripo_motion');fs.mkdirSync(out,{recursive:true});
 for(const t of [0,.8,1.6,2.4,3.2,4.6]){await page.evaluate(t=>renderAt(t),t);await page.screenshot({path:path.join(out,`rub_${t}.png`)});}
 encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(ep,'output/tripo_text_motion_trial_v1.mp4')],{stdio:['pipe','inherit','inherit'],windowsHide:true});
 for(let i=0;i<Math.floor(duration*30);i++){await page.evaluate(t=>renderAt(t),i/30);const buf=await page.screenshot({type:'jpeg',quality:95});if(!encoder.stdin.write(buf))await once(encoder.stdin,'drain');}
 encoder.stdin.end();const [code]=await once(encoder,'close');if(code)throw new Error('Encoder failed '+code);console.log('Motion trial exported',duration);
}finally{await browser.close();if(encoder&&!encoder.killed)encoder.kill();}
