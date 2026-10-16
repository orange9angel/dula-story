import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const ep=path.resolve(import.meta.dirname,'..'),phase=process.argv[2]??'before';
const out=path.join(ep,'tmp/romcom_revision',phase);fs.mkdirSync(out,{recursive:true});
const require=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
const expressions={neutral:{},smile:{smile:.8,eyeSmile:.5,browLift:.2},tease:{smile:.6,eyeSmile:.18,browLift:.25,browAsym:.8},surprise:{fear:.55,browLift:.65,jaw:.25}};
try{
 for(const actor of ['lei','aoi']){
  const page=await browser.newPage();await page.setViewport({width:900,height:900});
  await page.goto(`http://127.0.0.1:4215/face_lab.html?actor=${actor}&cel=direct`,{waitUntil:'networkidle0',timeout:120000});await page.waitForFunction('window.ready===true',{timeout:120000});
  for(const [angle,states] of [[0,Object.keys(expressions)],[45,['neutral','smile']],[70,['neutral','smile']]]){
   for(const name of states){
    const data=await page.evaluate(({state,angle})=>{
     window.renderer.setSize(1800,1800);window.renderAt({...state,turn:angle*Math.PI/180});
     const c=document.createElement('canvas');c.width=900;c.height=900;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(window.renderer.domElement,0,0,900,900);return c.toDataURL('image/png').split(',')[1];
    },{state:expressions[name],angle});
    fs.writeFileSync(path.join(out,`${actor}_${angle}_${name}.png`),Buffer.from(data,'base64'));
   }
  }await page.close();
 }
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4215/viewer.html?capture=1',{waitUntil:'networkidle0',timeout:120000});await page.waitForFunction('window.ready===true',{timeout:120000});
 const states=[];
 for(const t of [8,17,22,34,55,66,71,76]){
  const r=await page.evaluate(t=>window.renderAt(t),t);fs.writeFileSync(path.join(out,`episode_${t}.png`),Buffer.from(r.image,'base64'));states.push({t,state:r.state});
 }
 fs.writeFileSync(path.join(out,'states.json'),JSON.stringify(states));console.log(phase+' appearance and acting frames ready');
}finally{await browser.close();}
