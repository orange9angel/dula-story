import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../node_modules/dula-engine/package.json',import.meta.url)),puppeteer=require('puppeteer');
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4235/viewer.html?capture=1&probe-stage=1');await page.waitForFunction('window.ready===true');
 const result=await page.evaluate(async()=>{
  const {createStageClearance}=await import('dula-assets/lib/craft3d/stage-clearance.js');
  const before=window.stepAt(21).environment,{actors,stageAudit}=window.__dbg;
  // Deliberately place the real final character inside the original column bay.
  actors.yekari.mesh.position.set(4.8,0,-.03);actors.yekari.mesh.rotation.y=-.85;actors.yekari.mesh.updateMatrixWorld(true);
  const injected=stageAudit.sample();const restored=window.stepAt(21).environment;
  let emptyRejected=false;try{createStageClearance(actors,[]);}catch{emptyRejected=true;}
  return{passed:before.collisions.length===0&&injected.collisions.some(c=>c.obstacle==='column_1_1_shaft')&&restored.collisions.length===0&&emptyRejected,
   cleanRoute:before,injectedColumn:injected,restoredRoute:restored,emptyRejected};
 });
 fs.writeFileSync(new URL('../storyboard/palace_r20/stage_negative_probe.json',import.meta.url),JSON.stringify(result,null,2));
 console.log(JSON.stringify({passed:result.passed,injectedDepth:result.injectedColumn.maxDepth,emptyRejected:result.emptyRejected}));
 if(!result.passed)process.exitCode=1;
}finally{await browser.close();}
