import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const ep=path.resolve(import.meta.dirname,'..'),phase=process.argv[2]??'before';
const out=path.join(ep,'tmp/natural_audio/attention',phase);fs.mkdirSync(out,{recursive:true});
const require=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.setViewport({width:1280,height:720});
 await page.goto('http://127.0.0.1:4215/viewer.html?capture=1',{waitUntil:'networkidle0',timeout:120000});await page.waitForFunction('window.ready===true',{timeout:120000});
 const rows=[];
 for(const t of [8,12.5,17,21.4,23.3,36.6,42.4,48.5,50.5,54.8,60,66,70.2,72.5,76.5]){
  const r=await page.evaluate(t=>{
   const result=window.renderAt(t),geometry={};
   for(const [k,a] of Object.entries(window.actors)){
    const v=a.neutral.head.clone(),p=a.bones.head.getWorldPosition(v.clone()),target=window.actors[k==='lei'?'aoi':'lei'].bones.head.getWorldPosition(v.clone());
    const q=a.bones.head.getWorldQuaternion(a.neutralQuaternion.head.clone()).multiply(a.neutralQuaternion.head.clone().invert());
    const forward=v.clone().set(0,0,1).applyQuaternion(q),want=target.clone().sub(p).normalize();
    geometry[k]={head:p.toArray(),forward:forward.toArray(),partner:target.toArray(),partnerAngleDeg:forward.angleTo(want)*180/Math.PI,gaze:a.face.state.gaze,attention:result.state.attention?.[k]};
   }
   return {...result,geometry};
  },t);
  fs.writeFileSync(path.join(out,`${t}.png`),Buffer.from(r.image,'base64'));rows.push({t,geometry:r.geometry,performance:r.state.performance,faces:r.state.faces});
 }
 fs.writeFileSync(path.join(out,'states.json'),JSON.stringify(rows,null,2));
 console.log(JSON.stringify(rows.map(r=>({t:r.t,lei:r.geometry.lei.partnerAngleDeg,aoi:r.geometry.aoi.partnerAngleDeg}))));
}finally{await browser.close();}
