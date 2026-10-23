import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const require=createRequire(path.resolve(root,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer');
const board=path.join(root,'storyboard/art_pass_pilot/r1'),output=path.join(root,'output');
fs.mkdirSync(board,{recursive:true});
const flags=new Set(process.argv.slice(2));
const buildFiles=['viewer_palace.js','art_pass_r1.js','duel_performance.js','palace_camera.js','script.story','assets3d/art_pass_r1/aoao_head_base.png'];
const windows=[{id:'resolve',start:132,end:137},{id:'guard',start:56.5,end:59}];
const times=[132,132.3,132.8,133.5,134.5,136.6,56.5,57.3,57.9,58.0,58.2,58.5,58.9];
const sha=b=>createHash('sha256').update(b).digest('hex');
fs.writeFileSync(path.join(board,'build.json'),JSON.stringify({sourceSha256:Object.fromEntries(buildFiles.map(f=>[f,sha(fs.readFileSync(path.join(root,f)))])),windows},null,2));
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const errors=[],page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,700));});
 await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:4249/viewer.html?capture=1&captureFormat=png&artPass=1');
 await page.waitForFunction('window.ready===true',{timeout:30000});
 const capture=async t=>{const r=await page.evaluate(t=>window.renderAt(t),t);if(errors.length)throw Error(errors.join('\n'));return {buffer:Buffer.from(r.image,'base64'),state:r.artPass,trace:r.state};};
 const compare=async(a,b)=>{
  const equal=sha(a)===sha(b);if(equal)return{equal,maxChannelDelta:0,changedPixels:0,withinBaselineNoise:true};
  const diff=await page.evaluate(async data=>{
   const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d'),arrays=[];
   for(const s of data){const im=new Image();im.src='data:image/png;base64,'+s;await im.decode();g.drawImage(im,0,0);arrays.push(g.getImageData(0,0,1280,720).data);}
   let maxChannelDelta=0,changedPixels=0;for(let i=0;i<arrays[0].length;i+=4){let d=0;for(let j=0;j<4;j++)d=Math.max(d,Math.abs(arrays[0][i+j]-arrays[1][i+j]));if(d)changedPixels++;maxChannelDelta=Math.max(d,maxChannelDelta);}
   return{maxChannelDelta,changedPixels};
  },[a.toString('base64'),b.toString('base64')]);
  // The unmodified viewer also varies by one 8-bit channel level in tiny areas
  // (probe_art_pass_r1.mjs). Retain exact failures; never hide geometry drift.
  return{equal,...diff,withinBaselineNoise:diff.maxChannelDelta<=1&&diff.changedPixels<=100};
 };
 const samples=[];
 for(const t of times){const r=await capture(t);fs.writeFileSync(path.join(board,`t${String(t).replace('.','_')}.png`),r.buffer);samples.push({t,...r.state,sha256:sha(r.buffer)});}
 fs.writeFileSync(path.join(board,'samples.json'),JSON.stringify(samples,null,2));
 for(const [name,t]of [['resolve',133.5],['pain',58.2]]){await capture(t);const b=await page.evaluate(()=>window.__dbg.artPass.exportCel());fs.writeFileSync(path.join(board,`${name}_cel.png`),Buffer.from(b.split(',')[1],'base64'));}
 if(flags.has('--render')){
  const checks=[];
  for(const w of windows){
   const file=path.join(output,`art_pass_${w.id}_r1.mp4`);
   const enc=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-ss',String(w.start),'-t',String(w.end-w.start),'-i',path.join(root,'assets3d/mixed.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-b:a','192k','-t',String(w.end-w.start),'-movflags','+faststart',file],{stdio:['pipe','inherit','inherit'],windowsHide:true});
   const done=once(enc,'close'),frames=Math.round((w.end-w.start)*30),selected=new Map();
   for(let f=0;f<frames;f++){
    const t=w.start+f/30,r=await capture(t);if(!enc.stdin.write(r.buffer))await once(enc.stdin,'drain');
    if(f%15===0||f===frames-1)selected.set(t,r.buffer);
    if(f%30===0)console.log(`${w.id}: ${f}/${frames}`);
   }
   enc.stdin.end();const[code]=await done;if(code!==0)throw Error(`encode failed: ${code}`);
   for(const [t,buffer]of [...selected].reverse()){const r=await capture(t);checks.push({window:w.id,t,...await compare(buffer,r.buffer)});}
  }
  const repeat=[];
  for(const t of [132.8,134.5,58.2,58.9]){const a=await capture(t),b=await capture(t);repeat.push({t,...await compare(a.buffer,b.buffer)});}
  fs.writeFileSync(path.join(board,'determinism.json'),JSON.stringify({sequentialVsSeek:checks,repeat,exactMatchPassed:[...checks,...repeat].every(x=>x.equal),passed:[...checks,...repeat].every(x=>x.withinBaselineNoise),tolerance:{maxChannelDelta:1,maxChangedPixels:100,reason:'Unmodified viewer repeat captures show up to 40 pixels differing by one 8-bit level; exact failures remain reported.'}},null,2));
  if([...checks,...repeat].some(x=>!x.withinBaselineNoise))throw Error('Pixel determinism exceeds measured baseline noise');
 }
 console.log(JSON.stringify({board,errors,rendered:flags.has('--render')}));
}finally{await browser.close();}
