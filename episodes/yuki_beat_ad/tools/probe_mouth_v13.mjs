import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(root,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer');
const server=spawn(process.execPath,[path.join(root,'tools/render.mjs'),'--v13','--serve'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
  await new Promise((resolve,reject)=>{
    server.stdout.once('data',resolve);server.once('error',reject);
    server.once('exit',code=>reject(new Error(`Probe server exited ${code}`)));
  });
  browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await page.setViewport({width:720,height:1280});
  page.on('pageerror',e=>console.error(e.message));
  await page.goto('http://127.0.0.1:4188/viewer_v13.html?capture=1',{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready === true',{timeout:60000});
  const folder=path.join(root,'tmp/mouth_probe');fs.mkdirSync(folder,{recursive:true});
  const report=[];
  for(const [name,open] of [['closed',0],['quiet',.18],['loud',.9]]){
    const result=await page.evaluate(open=>window.renderLipProbe(.45,{open,jaw:open,width:1.1,rounding:0,labiodental:0,seal:open===0?1:0}),open);
    fs.writeFileSync(path.join(folder,`${name}.png`),Buffer.from(result.image,'base64'));
    report.push({name,open,center:result.center,mouth:result.mouth});
  }
  fs.writeFileSync(path.join(folder,'metadata.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();server.kill();}
