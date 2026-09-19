import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(root,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer');
const server=spawn(process.execPath,[path.join(root,'tools/render.mjs'),'--serve'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
  await new Promise((resolve,reject)=>{
    server.stdout.once('data',resolve);server.once('error',reject);
    server.once('exit',code=>reject(new Error(`Probe server exited ${code}`)));
  });
  browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await page.setViewport({width:720,height:1280});
  page.on('pageerror',e=>console.error(e.message));
  await page.goto('http://127.0.0.1:4189/viewer.html?capture=1',{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready === true',{timeout:60000});
  const folder=path.join(root,'tmp/cel_probe');fs.mkdirSync(folder,{recursive:true});
  const report={};

  // 1. Determinism: same t renders byte-identical, also after visiting another t.
  report.determinism=await page.evaluate(()=>{
    const a=window.renderAt(6.70).image;window.renderAt(1.00);
    const b=window.renderAt(6.70).image;const c=window.renderAt(6.70).image;
    return {sameAfterOtherFrame:a===b,sameBackToBack:b===c};
  });

  // 2. 一拍二: body pose (yuki root + cat head) may change only on the 1/12s
  // grid; the lip jaw changes at 60fps.
  report.twos=await page.evaluate(()=>{
    const rows=[];
    for(let f=400;f<460;f++){const t=f/60;const s=window.stepAt(t);
      rows.push({t,root:s.root.map(x=>Math.round(x*1e4)),catRot:(s.mochi?1:0),jaw:s.yukiLip.jaw});}
    const poseChanges=rows.slice(1).filter((r,i)=>String(r.root)!==String(rows[i].root)).map(r=>r.t);
    const jawChanges=rows.slice(1).filter((r,i)=>r.jaw!==rows[i].jaw).length;
    const offGrid=poseChanges.filter(t=>Math.abs(t*12-Math.round(t*12))>1/60+1e-6);
    return {poseChangeTimes:poseChanges.slice(0,8),offGridCount:offGrid.length,jawChanges};
  });

  // 3. Close-up frames for cel inspection.
  for(const [name,t] of [['yuki_closeup',20.5],['mochi_sing_closeup',8.3],['wide_two',35.0],['freeze_card',45.4]]){
    const r=await page.evaluate(t=>window.renderAt(t),t);
    fs.writeFileSync(path.join(folder,`${name}.jpg`),Buffer.from(r.image,'base64'));
    report[name]={t,segment:r.state.segment,move:r.state.move};
  }
  fs.writeFileSync(path.join(folder,'metadata.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,1));
}finally{if(browser)await browser.close();server.kill();}
