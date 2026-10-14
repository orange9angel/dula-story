import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {auditInputs} from './audit_inputs.mjs';

const ep=path.resolve(import.meta.dirname,'..');
const req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const option=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1];};
const revision=option('--revision')??'v3';
if(!/^v[0-9]+$/.test(revision))throw new Error('Invalid revision');
const out=path.join(ep,`output/aoi_profile_polish_${revision}.mp4`);
const board=path.join(ep,`storyboard/hybrid_character/profile_polish_${revision}`);
fs.mkdirSync(path.dirname(out),{recursive:true});fs.mkdirSync(board,{recursive:true});
const fps=24,duration=6,keys=[[0,0],[.5,0],[1.6,75],[2.2,90],[3.2,0],[4.4,-75],[5,-90],[6,0]];
const report={build:auditInputs(ep),kind:'silent head-turn geometry review; not a dialogue shot',fps,duration,frames:fps*duration,keys,errors:[]};
const browser=await req('puppeteer').launch({headless:true});
let encoder;
try{
  const page=await browser.newPage();await page.setViewport({width:900,height:900});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto('http://127.0.0.1:4215/face_lab.html?actor=aoi&cel=direct',{timeout:120000});await page.waitForFunction('window.ready',{timeout:90000});
  encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out],{windowsHide:true,stdio:['pipe','ignore','pipe']});
  let log='';encoder.stderr.on('data',b=>{log=(log+b).slice(-4000);});
  const done=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(new Error('ffmpeg: '+log)));});
  for(let frame=0;frame<fps*duration;frame++){
    const t=frame/fps,k=Math.max(0,keys.findIndex(p=>p[0]>t)-1),u=(t-keys[k][0])/(keys[k+1][0]-keys[k][0]),ease=(1-Math.cos(u*Math.PI))/2;
    const turn=(keys[k][1]*(1-ease)+keys[k+1][1]*ease)*Math.PI/180;
    const blink=Math.max(...[.3,3.0,5.7].map(c=>Math.max(0,1-Math.abs(t-c)/.10)));
    const encoded=await page.evaluate(state=>{renderAt(state);return renderer.domElement.toDataURL('image/png').split(',')[1];},{turn,blink});
    if(!encoder.stdin.write(Buffer.from(encoded,'base64')))await once(encoder.stdin,'drain');
  }
  encoder.stdin.end();await done;
  fs.writeFileSync(path.join(board,'turn_video_build.json'),JSON.stringify(report,null,2));
  if(report.errors.length)throw new Error(JSON.stringify(report.errors));
  console.log(out);
}finally{if(encoder&&encoder.exitCode===null)encoder.kill();await browser.close();}
