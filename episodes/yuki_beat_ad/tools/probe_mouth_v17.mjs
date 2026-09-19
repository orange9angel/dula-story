import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(root,'../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer');
const server=spawn(process.execPath,[path.join(root,'tools/render.mjs'),'--v17','--serve'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
  await new Promise((resolve,reject)=>{
    server.stdout.once('data',resolve);server.once('error',reject);
    server.once('exit',code=>reject(new Error(`Probe server exited ${code}`)));
  });
  browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await page.setViewport({width:720,height:1280});
  page.on('pageerror',e=>console.error(e.message));
  await page.goto('http://127.0.0.1:4188/viewer_v17.html?capture=1',{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready === true',{timeout:60000});
  const folder=path.join(root,'tmp/mouth_probe_v17');fs.mkdirSync(folder,{recursive:true});
  const report=[];

  // 1. Purse probe: 步 bù at 4.215-4.56 — b seal, then a pursed small round u.
  const bu=await page.evaluate(()=>{
    const out=[];
    for(let t=4.20;t<=4.60;t+=.02){const s=window.stepAt(t);
      out.push({t:Math.round(t*100)/100,jaw:s.lip.jaw,seal:s.lip.seal,purse:s.lip.purse,teeth:s.lip.teeth,
        width:s.mouthRender.width,aperture:s.mouthRender.actualAperture,cavity:s.mouthRender.cavityVisible});}
    return out;
  });
  report.push({name:'bu_window',samples:bu});
  for(const [name,t] of [['bu_seal',4.23],['bu_purse',4.40],['xue_teeth',9.55],['zi_teeth',15.95]]){
    const r=await page.evaluate(t=>window.renderAt(t),t);
    fs.writeFileSync(path.join(folder,`${name}.jpg`),Buffer.from(r.image,'base64'));
    report.push({name,t,lip:{jaw:r.state.lip.jaw,seal:r.state.lip.seal,purse:r.state.lip.purse,teeth:r.state.lip.teeth},
      mouth:r.state.mouthRender});
  }

  // 2. Determinism: renderAt twice at the same t (and after visiting another
  // time in between, so boil ticks are re-derived) must be pixel-identical.
  const det=await page.evaluate(()=>{
    const a=window.renderAt(17.00).image;
    window.renderAt(5.00);
    const b=window.renderAt(17.00).image;
    const c1=window.renderAt(17.00).image;
    return {sameAfterOtherFrame:a===b,sameBackToBack:b===c1};
  });
  report.push({name:'determinism',...det});

  // 3. Mochi on each stage he appears in: diva (17.0), neon (18.0), star (22.5).
  for(const [name,t] of [['mochi_diva',17.0],['mochi_neon',18.0],['mochi_star',22.5]]){
    const r=await page.evaluate(t=>{const s=window.renderAt(t);return {image:s.image,mochi:s.state.mochi,scene:s.state.scene};},t);
    fs.writeFileSync(path.join(folder,`${name}.jpg`),Buffer.from(r.image,'base64'));
    report.push({name,t,mochi:r.mochi,scene:r.scene});
  }

  fs.writeFileSync(path.join(folder,'metadata.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,1));
}finally{if(browser)await browser.close();server.kill();}
