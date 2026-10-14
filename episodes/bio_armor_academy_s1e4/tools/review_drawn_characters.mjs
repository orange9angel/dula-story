import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
import {auditInputs} from './audit_inputs.mjs';
const ep=path.resolve(import.meta.dirname,'..'),req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const oi=process.argv.indexOf('--out');
const option=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const mode=option('--mode')??'anime',actorIds=(option('--actors')??'aoi,lei').split(',');
const out=path.resolve(ep,oi<0?'storyboard/hybrid_character/anime_review':process.argv[oi+1]);fs.mkdirSync(out,{recursive:true});
const browser=await req('puppeteer').launch({headless:true});
const specs=[['neutral',{}],['listen',{gaze:[-.8,.1],smile:.25}],['concern',{gaze:[.7,-.2],fear:.8}],['firm',{focus:.9,gaze:[-.6,0]}],['talk',{jaw:.65,smile:.5,gaze:[-.6,0]}],['half_blink',{blink:.5}],['closed',{blink:1}],['left',{turn:-.75}],['right',{turn:.75}],['profile',{turn:Math.PI/2}],['profile_left',{turn:-Math.PI/2}],['back_right',{turn:Math.PI*.72}],['back',{turn:Math.PI}],['down',{pitch:.32}],['up',{pitch:-.28}]];
const report={build:auditInputs(ep),errors:[],actors:{}};
for(const file of ['face_lab.js','face_lab.html','tools/review_drawn_characters.mjs'])report.build.inputs.push({path:path.join(ep,file),sha256:createHash('sha256').update(fs.readFileSync(path.join(ep,file))).digest('hex')});
try{
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});await page.setViewport({width:900,height:900});
 for(const actor of actorIds){
  await page.goto(`http://127.0.0.1:4215/face_lab.html?actor=${actor}&cel=${mode}`,{timeout:120000});await page.waitForFunction('window.ready',{timeout:90000});
  const results={};
  for(const [name,state] of specs){const result=await page.evaluate(state=>{window.renderAt(state);return {image:renderer.domElement.toDataURL('image/png').split(',')[1],state:face.state};},state);const data=Buffer.from(result.image,'base64');fs.writeFileSync(path.join(out,`${actor}_${name}.png`),data);results[name]={state:result.state,sha256:createHash('sha256').update(data).digest('hex')};}
  for(const [name,state] of specs.toReversed()){const image=await page.evaluate(state=>{window.renderAt(state);return renderer.domElement.toDataURL('image/png').split(',')[1];},state);const data=Buffer.from(image,'base64');results[name].seekEqual=results[name].sha256===createHash('sha256').update(data).digest('hex');if(!results[name].seekEqual)fs.writeFileSync(path.join(out,`${actor}_${name}_seek_mismatch.png`),data);}
  report.actors[actor]=results;
  for(const lookMode of [mode,'original']){
   await page.goto(`http://127.0.0.1:4215/face_lab.html?actor=${actor}&cel=${lookMode}`,{timeout:120000});await page.waitForFunction('window.ready',{timeout:90000});
   for(const full of [false,true]){
    const image=await page.evaluate(full=>{
     const range=full?1.0:.27,cy=full?.89:(actor.height===1.65?1.46:1.61);
     camera.left=-range;camera.right=range;camera.top=range;camera.bottom=-range;camera.position.set(0,cy,2);camera.lookAt(0,cy,0);camera.updateProjectionMatrix();window.renderAt({});return renderer.domElement.toDataURL('image/png').split(',')[1];
    },full);
    fs.writeFileSync(path.join(out,`${actor}_${lookMode}_${full?'body':'front'}.png`),Buffer.from(image,'base64'));
   }
  }
 }
 await page.goto('http://127.0.0.1:4215/viewer.html?capture=1'+(mode==='anime'?'':'&cel='+mode),{timeout:120000});await page.waitForFunction('window.ready',{timeout:90000});
 report.scene={modes:await page.evaluate(()=>Object.fromEntries(Object.entries(actors).map(([id,a])=>[id,a.celLook?.mode]))),frames:{}};
 for(const t of [12.8,16.2,25.0,41.3,65.4]){
  const frame=await page.evaluate(t=>window.renderAt(t),t),data=Buffer.from(frame.image,'base64');
  fs.writeFileSync(path.join(out,`scene_${t}.jpg`),data);
  report.scene.frames[t]={sha256:createHash('sha256').update(data).digest('hex'),stateSha256:createHash('sha256').update(JSON.stringify(frame.state)).digest('hex')};
 }
 for(const t of [65.4,41.3,25.0,16.2,12.8]){
  const frame=await page.evaluate(t=>window.renderAt(t),t),result=report.scene.frames[t];
  result.seekEqual=result.sha256===createHash('sha256').update(Buffer.from(frame.image,'base64')).digest('hex');
  if(!result.seekEqual)fs.writeFileSync(path.join(out,`scene_${t}_seek_mismatch.jpg`),Buffer.from(frame.image,'base64'));
  result.stateEqual=result.stateSha256===createHash('sha256').update(JSON.stringify(frame.state)).digest('hex');
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 const failures=[...Object.entries(report.actors).flatMap(([a,states])=>Object.entries(states).filter(([,s])=>!s.seekEqual).map(([s])=>a+':'+s)),...Object.entries(report.scene.frames).filter(([,s])=>!s.seekEqual||!s.stateEqual).map(([t])=>'scene:'+t)];
 if(report.errors.length||failures.length||Object.entries(report.scene.modes).some(([id,m])=>m!==(mode==='direct'&&id==='aoi'?'direct':'anime')))throw new Error(JSON.stringify({errors:report.errors,failures,modes:report.scene.modes}));
 console.log(`${specs.length*actorIds.length} head/expression states and 5 scene frames; reverse seek identical; no browser or shader errors.`);
}finally{await browser.close();}
