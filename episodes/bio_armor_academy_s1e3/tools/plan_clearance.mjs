// Offline fixed-wrist elbow proposals, selected from a numerical audit report.
// Does not bake candidates or generate images. Unresolved constraints stay red.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {auditInputs} from './audit_inputs.mjs';
import {compareNumericState} from 'dula-engine/lib/NumericAudit.js';

const episode=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=process.argv[2],output=path.resolve(episode,process.argv[3]??'storyboard/physics_p23/correction_plan.json');
if(!source)throw new Error('Usage: node tools/plan_clearance.mjs <contact_validation.json> [output.json]');
const seed=JSON.parse(fs.readFileSync(path.resolve(episode,source),'utf8'));
if(!Array.isArray(seed.surface?.events))throw new Error('Missing surface events in source report');
const times=[...new Set(seed.surface.events.map(e=>Math.round(e.worst_t*30)/30))].sort((a,b)=>a-b);
if(times.some(t=>!Number.isFinite(t)||t<0))throw new Error('Invalid report timestamps');
const require=createRequire(path.resolve(episode,'../../node_modules/dula-engine/package.json'));
const server=spawn(process.execPath,['render.mjs','--serve','--port','0'],{cwd:episode,windowsHide:true,stdio:['ignore','pipe','pipe']});
let browser;
try{
  const url=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Viewer server startup timeout')),15000);let stdout='';
    server.once('error',e=>{clearTimeout(timer);reject(e);});
    server.once('exit',code=>{clearTimeout(timer);reject(new Error(`Viewer server exited ${code}`));});
    server.stdout.on('data',chunk=>{stdout+=chunk;const match=stdout.match(/http:\/\/127\.0\.0\.1:\d+\/viewer.html/);if(match){clearTimeout(timer);resolve(match[0]);}});
  });
  browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();let error=null;page.on('pageerror',e=>{error=e;});
  await page.goto(url+'?capture=1&probe-surface=1',{waitUntil:'networkidle0'});await page.waitForFunction('window.ready');
  const results=[];
  for(const t of times){
    const before=await page.evaluate(t=>window.stepAt(t),t);
    const planned=await page.evaluate(t=>window.planSurfaceAt(t),t);
    const geometryRestored=compareNumericState(planned.surface,planned.surfaceAfterPlanning);
    if(!geometryRestored.equal)throw new Error(`Planner leaked geometry at ${t}: ${JSON.stringify(geometryRestored)}`);
    const after=await page.evaluate(t=>window.stepAt(t),t);
    const restored=compareNumericState(before,after);
    if(!restored.equal)throw new Error(`Planner leaked scene state at ${t}: ${JSON.stringify(restored)}`);
    if(error)throw error;
    results.push({t,...planned.correctionPlan,restored:restored.equal,geometryRestored:geometryRestored.equal});
    console.log(`planned ${results.length}/${times.length} @${t.toFixed(3)}s`);
  }
  const counts={};for(const row of results)for(const plan of row.plans){const key=plan.reason??plan.status;counts[key]=(counts[key]??0)+1;}
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify({build:auditInputs(episode),seedReport:path.resolve(episode,source),
    scope:'proposals at event witness times; not a baked or full-scene-validated motion',counts,results},null,2));
  console.log(JSON.stringify({output,times:times.length,counts}));
}finally{if(browser)await browser.close();server.kill();}
