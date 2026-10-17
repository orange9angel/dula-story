import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const ep=path.resolve(import.meta.dirname,'..'),root=path.join(ep,'tmp/edge_stability/cards');fs.mkdirSync(root,{recursive:true});
const meta=JSON.parse(fs.readFileSync(path.join(ep,'config/cards.json'),'utf8'));
const require=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4215/viewer.html?capture=1',{waitUntil:'networkidle0',timeout:120000});
 await page.waitForFunction('window.ready===true',{timeout:120000});
 const profile=await page.evaluate(()=>window.renderProfile),checks=[];
 if(profile.titleCards!=='series-ink'||profile.edgeQuality!=='stable'||profile.sampling!==2||profile.alphaToCoverage)throw new Error('Unexpected default render profile');
 for(const c of meta.cards){
  for(const i of [0,5,18,36,c.frames.length-9,c.frames.length-1]){
   const t=c.start+i/c.fps,expected=fs.readFileSync(path.join(ep,c.frames[i])).toString('base64');
   const result=await page.evaluate(async(t,expected)=>{
    const render=window.renderAt(t),im=new Image();im.src='data:image/png;base64,'+expected;await im.decode();
    const actual=new Image();actual.src='data:image/png;base64,'+render.image;await actual.decode();
    const cv=document.createElement('canvas');cv.width=1280;cv.height=720;const g=cv.getContext('2d',{willReadFrequently:true});
    g.drawImage(im,0,0);const a=g.getImageData(0,0,1280,720).data;g.drawImage(actual,0,0);const b=g.getImageData(0,0,1280,720).data;
    let max=0,white=0,lo=255,hi=0;for(let j=0;j<a.length;j++)max=Math.max(max,Math.abs(a[j]-b[j]));
    for(let j=0;j<b.length;j+=4){if(b[j]>=250&&b[j+1]>=250&&b[j+2]>=250)white++;lo=Math.min(lo,b[j],b[j+1],b[j+2]);hi=Math.max(hi,b[j],b[j+1],b[j+2]);}
    return {image:render.image,max,whiteFraction:white/(1280*720),range:hi-lo};
   },t,expected);
   const visibleOpening=c.id==='open'&&i===0&&c.inMode==='image';
   checks.push({card:c.id,frame:i,t,maxPixelDifference:result.max,
    ...(visibleOpening?{firstFrameVisible:result.whiteFraction<.95&&result.range>20}: {})});
   fs.writeFileSync(path.join(root,`${c.id}_${String(i).padStart(3,'0')}.png`),Buffer.from(result.image,'base64'));
  }
 }
 // A missing image must stop readiness instead of showing a static fallback.
 const bad=await browser.newPage(),missingErrors=[];await bad.setRequestInterception(true);
 bad.on('request',r=>r.url().endsWith('/cards/open/f_005.png')?r.abort():r.continue());
 bad.on('pageerror',e=>missingErrors.push(e.message));
 await bad.goto('http://127.0.0.1:4215/viewer.html?capture=1',{waitUntil:'networkidle0',timeout:120000});
 const missingRejected=missingErrors.some(e=>e.includes('Missing title-card frame'))&&await bad.evaluate(()=>window.ready!==true);
 const report={profile,checks,errors,missingRejected,passed:checks.every(c=>c.maxPixelDifference===0&&c.firstFrameVisible!==false)&&!errors.length&&missingRejected};
 fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(!report.passed)throw new Error('Title-card regression check failed');
}finally{await browser.close();}
