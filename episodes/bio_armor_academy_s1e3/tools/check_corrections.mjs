// Candidate screening only: replaced frames plus a historical context trace.
// A fresh whole-episode numerical gate is required before applying a track.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {compareNumericState} from 'dula-engine/lib/NumericAudit.js';
import {auditInputs} from './audit_inputs.mjs';

const episode=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [inputArg,baseArg,boardArg]=process.argv.slice(2);
if(!inputArg||!baseArg||!boardArg)throw new Error('Usage: node tools/check_corrections.mjs proposal.json baseline_trace.json board');
const proposal=JSON.parse(fs.readFileSync(path.resolve(episode,inputArg),'utf8'));
const baseline=JSON.parse(fs.readFileSync(path.resolve(episode,baseArg),'utf8'));
const timeline=JSON.parse(fs.readFileSync(path.join(episode,'config/timeline.json'),'utf8'));
const contract=JSON.parse(fs.readFileSync(path.join(episode,'config/contact_contract.json'),'utf8'));
if(baseline.fps!==30||!proposal.tracks?.length||!proposal.targets?.length)throw new Error('Require 30fps context, correction tracks and targets');
const windows=proposal.tracks.map(track=>{
  const beat=timeline.segments.find(s=>s.move===track.beat);if(!beat)throw new Error(`Unknown beat ${track.beat}`);
  if(track.times[0]<0||track.times[3]>beat.end-beat.start)throw new Error('Correction extends beyond its beat');
  return [beat.start+track.times[0],beat.start+track.times[3]];
});
const start=Math.max(0,Math.floor((Math.min(...windows.map(w=>w[0]))-.15)*30));
const end=Math.min(Math.round(timeline.duration*30),Math.ceil((Math.max(...windows.map(w=>w[1]))+.15)*30));
const targets=proposal.targets.map(target=>{
  const rule=contract.surface_clearance.pairs.find(p=>p.key===target.pair);
  const [a,b]=target.window??[];
  if(!rule||!target.pair.endsWith(':torso')||![a,b].every(Number.isFinite)||a>=b||a<start/30||b>end/30)
    throw new Error('Invalid or uncovered target window');
  return {...target,limit:rule.max_depth,frames:0,worstDepth:0};
});
const board=path.resolve(episode,boardArg);fs.mkdirSync(board,{recursive:true});
const require=createRequire(path.resolve(episode,'../../node_modules/dula-engine/package.json'));
const server=spawn(process.execPath,['render.mjs','--serve','--port','0'],{cwd:episode,windowsHide:true,stdio:['ignore','pipe','pipe']});
let browser;
try{
  const url=await new Promise((resolve,reject)=>{
    let output='';const timer=setTimeout(()=>reject(new Error('Viewer startup timeout')),15000);
    server.once('error',e=>{clearTimeout(timer);reject(e);});
    server.once('exit',code=>{clearTimeout(timer);reject(new Error(`Viewer exited ${code}`));});
    server.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/http:\/\/127\.0\.0\.1:\d+\/viewer.html/);if(m){clearTimeout(timer);resolve(m[0]);}});
  });
  browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();let pageError=null;page.on('pageerror',e=>{pageError=e;});
  await page.goto(url+'?capture=1&probe-door=1&probe-bento=1&probe-surface=1',{waitUntil:'networkidle0'});await page.waitForFunction('window.ready');
  const failures=[],warnings=[],frames=[],baseFrames=[],distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
  const metrics={maxElbowDelta:0,maxAddedStep:0,maxBoneError:0,maxWristDelta:0,maxPropDelta:0,clothCountIncreases:0};
  let previous=null;
  for(let tick=start;tick<end;tick++){
    const t=tick/30;
    const before=await page.evaluate(({t,tracks})=>window.stepWithCorrectionsAt(t,tracks),{t,tracks:proposal.baselineTracks??[]});
    const after=await page.evaluate(({t,tracks})=>window.stepWithCorrectionsAt(t,tracks),{t,tracks:proposal.tracks});
    const historical=baseline.frames.find(f=>Math.round(f.t*30)===tick);
    if(!historical)throw new Error(`Missing context frame ${tick}`);
    const {t:ignore,...old}=historical;
    if(!compareNumericState(old,before).equal)failures.push(`historical context changed @${t}`);
    for(const [actor,sides] of Object.entries(before.contact.arms))for(const [side,arm] of Object.entries(sides)){
      const next=after.contact.arms[actor][side];
      const moved=distance(arm[1],next[1]);metrics.maxElbowDelta=Math.max(metrics.maxElbowDelta,moved);
      for(const i of [0,2]){
        const endpoint=distance(arm[i],next[i]),bone=Math.abs(distance(arm[1],arm[i])-distance(next[1],next[i]));
        metrics.maxWristDelta=Math.max(metrics.maxWristDelta,endpoint);metrics.maxBoneError=Math.max(metrics.maxBoneError,bone);
        if(endpoint>1e-7||bone>1e-7)failures.push(`endpoint/length drift ${actor}:${side} @${t}`);
      }
      if(previous){
        const delta=distance(next[1],previous.after.contact.arms[actor][side][1])-distance(arm[1],previous.before.contact.arms[actor][side][1]);
        metrics.maxAddedStep=Math.max(metrics.maxAddedStep,delta);
      }
    }
    for(const [name,p] of Object.entries(before.contact.boxPos))metrics.maxPropDelta=Math.max(metrics.maxPropDelta,distance(p,after.contact.boxPos[name]));
    for(const [key,a] of Object.entries(before.surface.pairs)){
      const b=after.surface.pairs[key];
      if(b.depth>a.depth+1e-6)failures.push(`depth regression ${key} @${t}: ${a.depth} -> ${b.depth}`);
      if(a.crossings!==undefined&&b.crossings>a.crossings){metrics.clothCountIncreases++;warnings.push(`cloth count ${key} @${t}: ${a.crossings} -> ${b.crossings}`);}
      if(a.crossings===0&&b.crossings>0)failures.push(`new cloth crossing ${key} @${t}`);
    }
    for(const target of targets)if(t>=target.window[0]-1e-7&&t<target.window[1]-1e-7){
      const value=after.surface.pairs[target.pair];
      if(!value||!Number.isFinite(value.depth)||value.evaluated<=0)throw new Error('Missing target surface measurement');
      target.frames++;target.worstDepth=Math.max(target.worstDepth,value.depth);
      if(value.depth>target.limit+1e-7)failures.push(`target still penetrates ${target.pair} @${t}`);
    }
    const frame={t:Math.round(t*1000)/1000,...after};frames.push(frame);baseFrames.push({t:frame.t,...before});previous={before,after};
  }
  if(metrics.maxElbowDelta>(proposal.maxElbowDelta??.015))failures.push('elbow displacement exceeds budget');
  for(const target of targets)if(!target.frames)failures.push(`target has no required samples: ${target.pair}`);
  if(metrics.maxAddedStep>(proposal.maxAddedStep??.005))failures.push('added frame step exceeds budget');
  if(metrics.maxPropDelta>(proposal.maxPropDelta??.002))failures.push('prop anchor moved');
  // Conservative screening: increased triangle counts are not a depth measure,
  // but do require resolving the cloth conflict before accepting this candidate.
  if(metrics.clothCountIncreases)failures.push('existing cloth crossings changed unfavourably; joint solve required');
  const checks=[];
  for(const frame of [...frames].reverse()){
    const current=await page.evaluate(({t,tracks})=>window.stepWithCorrectionsAt(t,tracks),{t:Math.round(frame.t*30)/30,tracks:proposal.tracks});
    const {t,...expected}=frame;checks.push({t,...compareNumericState(expected,current)});
  }
  if(checks.some(c=>!c.equal))failures.push('candidate seek mismatch');
  if(pageError)throw pageError;
  fs.writeFileSync(path.join(board,'local_frames.json'),JSON.stringify({fps:30,build:auditInputs(episode),baseline:baseFrames,frames,checks},null,1));
  const patches=new Map(frames.map(f=>[Math.round(f.t*30),f]));
  fs.writeFileSync(path.join(board,'context_trace.json'),JSON.stringify({...baseline,mode:'candidate-context-only',frames:baseline.frames.map(f=>patches.get(Math.round(f.t*30))??f)},null,1));
  delete contract.surface_clearance;
  fs.writeFileSync(path.join(board,'legacy_contract.json'),JSON.stringify(contract));
  const python=path.resolve(episode,'../../.venv/Scripts/python.exe');
  const script=path.resolve(episode,'../../../dula-skills/direct-animation-craft/scripts/contact_probe.py');
  const legacy=spawnSync(python,['-X','utf8',script,path.join(board,'context_trace.json'),'--contract',path.join(board,'legacy_contract.json'),'--summary'],{cwd:episode,windowsHide:true,encoding:'utf8'});
  if(legacy.status!==0)failures.push('legacy contact checks failed');
  const report={passed:!failures.length,scope:'local candidate screening; historical context is not a fresh whole-episode gate',
    build:auditInputs(episode),input:path.resolve(episode,inputArg),frames:frames.length,targets,metrics,failureCount:failures.length,failures,warnings: warnings.slice(0,8),legacy:legacy.status};
  fs.writeFileSync(path.join(board,'correction_check.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,build:undefined,failures:failures.slice(0,8)}));
  if(legacy.error)throw legacy.error;
  if(legacy.status!==0)console.log(legacy.stdout+legacy.stderr);
  if(failures.length)process.exitCode=2;
}finally{if(browser)await browser.close();server.kill();}
