import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
import {auditInputs} from './audit_inputs.mjs';
const ep=path.resolve(import.meta.dirname,'..'),req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const oi=process.argv.indexOf('--out');
const out=path.resolve(ep,oi<0?'storyboard/hybrid_character/anime_review':process.argv[oi+1]);fs.mkdirSync(out,{recursive:true});
const browser=await req('puppeteer').launch({headless:true});
const specs=[['neutral',{}],['listen',{gaze:[-.8,.1],smile:.25}],['concern',{gaze:[.7,-.2],fear:.8}],['firm',{focus:.9,gaze:[-.6,0]}],['talk',{jaw:.65,smile:.5,gaze:[-.6,0]}],['half_blink',{blink:.5}],['closed',{blink:1}],['left',{turn:-.75}],['right',{turn:.75}],['profile',{turn:1.45}],['back',{turn:Math.PI}],['down',{pitch:.32}],['up',{pitch:-.28}]];
const report={build:auditInputs(ep),errors:[],actors:{}};
for(const file of ['face_lab.js','face_lab.html','tools/review_drawn_characters.mjs'])report.build.inputs.push({path:path.join(ep,file),sha256:createHash('sha256').update(fs.readFileSync(path.join(ep,file))).digest('hex')});
try{
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});await page.setViewport({width:900,height:900});
 for(const actor of ['aoi','lei']){
  await page.goto(`http://127.0.0.1:4215/face_lab.html?actor=${actor}&cel=anime`);await page.waitForFunction('window.ready',{timeout:90000});
  const results={};
  for(const [name,state] of specs){const result=await page.evaluate(state=>{window.renderAt(state);return {image:renderer.domElement.toDataURL('image/png').split(',')[1],state:face.state};},state);const data=Buffer.from(result.image,'base64');fs.writeFileSync(path.join(out,`${actor}_${name}.png`),data);results[name]={state:result.state,sha256:createHash('sha256').update(data).digest('hex')};}
  for(const [name,state] of specs.toReversed()){const image=await page.evaluate(state=>{window.renderAt(state);return renderer.domElement.toDataURL('image/png').split(',')[1];},state);results[name].seekEqual=results[name].sha256===createHash('sha256').update(Buffer.from(image,'base64')).digest('hex');}
  report.actors[actor]=results;
  for(const mode of ['anime','original']){
   await page.goto(`http://127.0.0.1:4215/face_lab.html?actor=${actor}${mode==='anime'?'&cel=anime':''}`);await page.waitForFunction('window.ready',{timeout:90000});
   for(const full of [false,true]){
    const image=await page.evaluate(full=>{
     const range=full?1.0:.27,cy=full?.89:(actor.height===1.65?1.46:1.61);
     camera.left=-range;camera.right=range;camera.top=range;camera.bottom=-range;camera.position.set(0,cy,2);camera.lookAt(0,cy,0);camera.updateProjectionMatrix();window.renderAt({});return renderer.domElement.toDataURL('image/png').split(',')[1];
    },full);
    fs.writeFileSync(path.join(out,`${actor}_${mode}_${full?'body':'front'}.png`),Buffer.from(image,'base64'));
   }
  }
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 if(report.errors.length||Object.values(report.actors).some(a=>Object.values(a).some(s=>!s.seekEqual)))throw new Error(JSON.stringify(report));
 console.log('26 head/expression states; reverse seek pixel-identical; no browser or shader errors.');
}finally{await browser.close();}
