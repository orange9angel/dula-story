import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {auditInputs} from './audit_inputs.mjs';

const ep=path.resolve(import.meta.dirname,'..');
const req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const option=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1];};
const actorId=option('--actor')??'aoi';
if(!['aoi','lei'].includes(actorId))throw new Error('Unknown actor');
const revision=option('--revision')??'v3';
if(!/^v[0-9]+$/.test(revision))throw new Error('Invalid revision');
const out=path.resolve(ep,option('--out')??`output/aoi_profile_polish_${revision}.mp4`);
const board=path.resolve(ep,option('--board')??`storyboard/hybrid_character/profile_polish_${revision}`);
const turnMode=option('--turn-mode')??'head';
if(!['head','body'].includes(turnMode))throw new Error('Invalid turn mode');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.mkdirSync(board,{recursive:true});
const fps=24,duration=6,keys=[[0,0],[.5,0],[1.6,75],[2.2,90],[3.2,0],[4.4,-75],[5,-90],[6,0]];
const hashFile=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const overrideFiles=option('--module-overrides')?JSON.parse(fs.readFileSync(path.resolve(ep,option('--module-overrides')),'utf8')):{};
if(option('--source'))overrideFiles[option('--source-suffix')??(actorId==='aoi'?'/characters/bioarmor/aoi-generated-paint.js':'/characters/bioarmor/tripo-drawn-look.js')]=option('--source');
const moduleOverrides=Object.entries(overrideFiles).map(([suffix,file])=>{
  if(!suffix.startsWith('/')||!suffix.endsWith('.js'))throw new Error('Module override key must be a JavaScript URL path suffix');
  const absolute=path.resolve(ep,file);
  return {suffix,path:absolute,sha256:hashFile(absolute),body:fs.readFileSync(absolute,'utf8')};
});
const renderSource=path.join(import.meta.dirname,'render_character_profile_turn.mjs');
const report={actor:actorId,startedAt:new Date().toISOString(),build:auditInputs(ep),renderer:{path:renderSource,sha256:hashFile(renderSource)},kind:`silent ${turnMode} turn geometry review; not a dialogue shot`,turnMode,fps,duration,frames:fps*duration,keys,poses:[],errors:[]};
report.moduleOverrides=moduleOverrides.map(({body,...metadata})=>metadata);
const browser=await req('puppeteer').launch({headless:true});
let encoder;
try{
  const page=await browser.newPage();await page.setViewport({width:900,height:900});await page.setCacheEnabled(false);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  if(moduleOverrides.length){
    await page.setRequestInterception(true);
    page.on('request',request=>{
      const pathname=new URL(request.url()).pathname,override=moduleOverrides.find(o=>pathname.endsWith(o.suffix));
      if(override)request.respond({status:200,contentType:'text/javascript',body:override.body});
      else request.continue();
    });
  }
  await page.goto(`http://127.0.0.1:4215/face_lab.html?actor=${actorId}&cel=direct`,{timeout:120000});await page.waitForFunction('window.ready',{timeout:90000});
  encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out],{windowsHide:true,stdio:['pipe','ignore','pipe']});
  let log='';encoder.stderr.on('data',b=>{log=(log+b).slice(-4000);});
  const done=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(new Error('ffmpeg: '+log)));});
  for(let frame=0;frame<fps*duration;frame++){
    const t=frame/fps,k=Math.max(0,keys.findIndex(p=>p[0]>t)-1),u=(t-keys[k][0])/(keys[k+1][0]-keys[k][0]),ease=(1-Math.cos(u*Math.PI))/2;
    const turn=(keys[k][1]*(1-ease)+keys[k+1][1]*ease)*Math.PI/180;
    const blink=Math.max(...[.3,3.0,5.7].map(c=>Math.max(0,1-Math.abs(t-c)/.10)));
    report.poses.push({frame,time:t,yawDegrees:turn*180/Math.PI,blink});
    const encoded=await page.evaluate(({turn,blink,turnMode})=>{
      actor.mesh.rotation.y=turnMode==='body'?turn:0;
      actor.mesh.updateMatrixWorld(true);
      renderAt({turn:turnMode==='head'?turn:0,blink});
      return renderer.domElement.toDataURL('image/png').split(',')[1];
    },{turn,blink,turnMode});
    if(!encoder.stdin.write(Buffer.from(encoded,'base64')))await once(encoder.stdin,'drain');
  }
  encoder.stdin.end();await done;
  report.changedInputs=[...report.build.inputs,...report.moduleOverrides,report.renderer].filter(item=>hashFile(item.path)!==item.sha256).map(item=>item.path);
  if(report.changedInputs.length)report.errors.push('Inputs changed during render: '+report.changedInputs.join(', '));
  report.video={path:out,sha256:hashFile(out),bytes:fs.statSync(out).size};
  // Decode the delivered MP4 itself, so the contact sheet cannot silently
  // represent another render or a separately generated set of stills.
  const contact=path.join(board,'turn_contact.jpg');
  const contactJob=spawn('ffmpeg',['-y','-v','error','-i',out,'-vf','fps=2,scale=300:300,tile=4x3','-frames:v','1','-q:v','2',contact],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  let contactLog='';contactJob.stderr.on('data',b=>{contactLog=(contactLog+b).slice(-4000);});
  await new Promise((resolve,reject)=>{contactJob.on('error',reject);contactJob.on('close',code=>code===0?resolve():reject(new Error('contact ffmpeg: '+contactLog)));});
  report.contact={path:contact,sha256:hashFile(contact),sourceVideoSha256:report.video.sha256,filter:'fps=2,scale=300:300,tile=4x3'};
  report.completedAt=new Date().toISOString();
  report.status=report.errors.length?'failed':'rendered';
  fs.writeFileSync(path.join(board,'turn_video_build.json'),JSON.stringify(report,null,2));
  if(report.errors.length)throw new Error(JSON.stringify(report.errors));
  console.log(out);
}finally{if(encoder&&encoder.exitCode===null)encoder.kill();await browser.close();}
