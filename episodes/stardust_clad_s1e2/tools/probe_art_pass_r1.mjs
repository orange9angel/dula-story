import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..');
const require=createRequire(path.resolve(root,'../../node_modules/dula-engine/package.json'));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
const out=path.join(root,'storyboard/art_pass_pilot/r1');
const report=[];
try{
 for(const mode of [0,1]){
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:4249/viewer.html?capture=1&captureFormat=png&artPass=${mode}`);
  await page.waitForFunction('window.ready===true',{timeout:30000});
  for(const t of [58,58.9]){
   await page.evaluate(()=>window.renderAt(56.5));
   const frames=[];
   for(let i=0;i<3;i++)frames.push(await page.evaluate(t=>window.renderAt(t).image,t));
   frames.forEach((s,i)=>fs.writeFileSync(path.join(out,`probe_${mode}_${t}_${i}.png`),Buffer.from(s,'base64')));
   const stats=await page.evaluate(async frames=>{
    const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');
    const arrays=[];for(const f of frames){const im=new Image();im.src='data:image/png;base64,'+f;await im.decode();g.drawImage(im,0,0);arrays.push(g.getImageData(0,0,1280,720).data);}
    return arrays.slice(1).map(b=>{let count=0,max=0,minx=1280,miny=720,maxx=0,maxy=0;const a=arrays[0];for(let i=0;i<a.length;i+=4){let d=0;for(let j=0;j<3;j++)d=Math.max(d,Math.abs(a[i+j]-b[i+j]));if(d){count++;max=Math.max(max,d);const x=i/4%1280,y=Math.floor(i/4/1280);minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y);}}return{count,max,bbox:[minx,miny,maxx,maxy]};});
   },frames);
   console.log(JSON.stringify({mode,t,stats}));
   report.push({mode,t,stats});
  }
  await page.close();
 }
 fs.writeFileSync(path.join(out,'baseline_pixel_noise.json'),JSON.stringify(report,null,2));
}finally{await browser.close();}
