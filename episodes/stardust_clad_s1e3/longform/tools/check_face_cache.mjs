import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(root,'../../../node_modules/dula-engine/package.json'));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4327/longform/viewer.html?capture=1',{waitUntil:'networkidle0'});
 await page.waitForFunction('window.ready===true',{timeout:120000});
 const checks=await page.evaluate(async()=>{
  const d=window.__dbg,results=[];
  // Do not read the live face canvas: Chromium changes its 2D raster backend
  // after repeated getImageData, producing a different antialiasing path.
  const pixels=async data=>{
   const im=new Image();im.src='data:image/jpeg;base64,'+data;await im.decode();
   const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
   const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
   return g.getImageData(0,0,c.width,c.height).data;
  };
  const difference=(a,b)=>{let bad=0,max=0;for(let i=0;i<a.length;i+=4){const delta=Math.max(...[0,1,2].map(k=>Math.abs(a[i+k]-b[i+k])));if(delta>16)bad++;max=Math.max(max,delta);}return{bad,max};};
  for(const name of Object.keys(d.actors)){
   const line=d.timeline.lines.find(l=>l.speaker===name),t=line.start+.8;
   const before=window.renderAt(t).image,initial=await pixels(before);
   for(let i=0;i<20;i++)window.stepAt(t);
   const repeated=difference(initial,await pixels(window.renderAt(t).image));
   for(let i=1;i<=30;i++)window.stepAt(t+i/30);
   const after=window.renderAt(t).image,sought=difference(initial,await pixels(after));
   results.push({name,t,repeated,sought,before,after});
  }
  return results;
 });
 for(const c of checks){for(const tag of ['before','after']){fs.writeFileSync(path.join(root,`review/seek_${c.name}_${tag}.jpg`),Buffer.from(c[tag],'base64'));delete c[tag];}}
 const result={checks,errors,passed:errors.length===0&&checks.every(c=>c.repeated.bad<=64&&c.sought.bad<=64),scope:'Actual output images after 20 repeated states and a 30-frame excursion; 64-pixel JPEG tolerance above 16/255. Not an aesthetic score.'};
 fs.writeFileSync(path.join(root,'review/face_cache_check.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
}finally{await browser.close();}
