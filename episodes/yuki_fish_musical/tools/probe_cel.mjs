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

  // 3. Hand-pose assertions (hand set in bootstrap.js buildHandPoses).
  const handCases=[['accuse_point',1.5,'point'],['reaction_inherits_point',2.9,'point'],
    ['listen_mitten',3.7,'mitten'],['songA_fist',10.0,'fist'],['press_point',20.3,'point'],
    ['songB_point',27.2,'point'],['songB_hold',31.2,'hold'],['songB_caught_point',34.8,'point'],
    ['songB_verdict_fist',38.5,'fist'],['freeze_wave',45.4,'wave']];
  report.hands=await page.evaluate(cases_=>cases_.map(([name,t,want])=>{
    const s=window.stepAt(t);
    return {name,t,actual:s.handPose,pass:s.handPose?.right===want,
      rightHandX:s.yukiHands?.[1]?.[0],rootX:s.root[0]};
  }),handCases);
  // 指证帧必须指向年糕方向（年糕在 +x）：右手世界 x 明显大于身体根 x
  const caught=report.hands.find(h=>h.name==='songB_caught_point');
  report.pointTowardsCat=caught&&caught.rightHandX>caught.rootX+.15;

  // 4. Close-up frames for cel inspection.
  for(const [name,t] of [['hand_accuse',1.5],['hand_caught',34.8],['yuki_closeup',20.5],['mochi_sing_closeup',8.3],['wide_two',35.0],['freeze_card',45.4]]){
    const r=await page.evaluate(t=>window.renderAt(t),t);
    fs.writeFileSync(path.join(folder,`${name}.jpg`),Buffer.from(r.image,'base64'));
    report[name]={t,segment:r.state.segment,move:r.state.move,handPose:r.state.handPose};
  }
  fs.writeFileSync(path.join(folder,'metadata.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,1));
}finally{if(browser)await browser.close();server.kill();}
