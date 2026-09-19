import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(root,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer');
const server=spawn(process.execPath,[path.join(root,'tools/render.mjs'),'--v15','--serve'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
  await new Promise((resolve,reject)=>{
    server.stdout.once('data',resolve);server.once('error',reject);
    server.once('exit',code=>reject(new Error(`Probe server exited ${code}`)));
  });
  browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await page.setViewport({width:720,height:1280});
  page.on('pageerror',e=>console.error(e.message));
  await page.goto('http://127.0.0.1:4188/viewer_v15.html?capture=1',{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready === true',{timeout:60000});
  const folder=path.join(root,'tmp/mouth_probe_v15');fs.mkdirSync(folder,{recursive:true});
  const report=[];
  for(const [name,open] of [['closed',0],['quiet',.18],['loud',.9]]){
    const result=await page.evaluate(open=>window.renderLipProbe(.45,{open,jaw:open,width:1.1,rounding:0,labiodental:0,seal:open===0?1:0}),open);
    fs.writeFileSync(path.join(folder,`${name}.png`),Buffer.from(result.image,'base64'));
    report.push({name,open,center:result.center,mouth:result.mouth});
  }
  // V15 continuity probe: the live track must pass through intermediate
  // (non 0 / 0.5 / 1) jaw values between keyframes, not stepped constants.
  const track=await page.evaluate(()=>{
    const out=[];
    for(let t=1.10;t<=1.55;t+=.02){const s=window.stepAt(t);out.push({t:Math.round(t*100)/100,jaw:s.lip.jaw,width:s.lip.width,rounding:s.lip.rounding,seal:s.lip.seal});}
    return out;
  });
  const jaws=track.map(s=>s.jaw);
  const intermediate=jaws.filter(j=>j>1e-3&&Math.abs(j-.5)>1e-3&&Math.abs(j-1)>1e-3).length;
  report.push({name:'track_pai_window',samples:track,intermediateFraction:intermediate/jaws.length});
  fs.writeFileSync(path.join(folder,'metadata.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();server.kill();}
