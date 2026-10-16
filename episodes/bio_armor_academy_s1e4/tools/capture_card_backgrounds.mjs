import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const ep=path.resolve(import.meta.dirname,'..');
const require=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:4215/viewer.html?capture=1&aa=legacy&ssaa=2&capture-format=png&cards=legacy',{waitUntil:'networkidle0',timeout:120000});
 await page.waitForFunction('window.ready===true',{timeout:120000});
 const out=path.join(ep,'cards');fs.mkdirSync(out,{recursive:true});
 // Capture the scene immediately inside the existing opening/closing camera.
 // Read the WebGL canvas so no static placeholder/subtitle enters the background.
 for(const [id,t] of [['open',0],['close',79]]){
  const data=await page.evaluate(t=>{
   window.renderAt(t);const c=document.createElement('canvas');c.width=1280;c.height=720;
   const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
   g.drawImage(window.renderer.domElement,0,0,1280,720);return c.toDataURL('image/png').split(',')[1];
  },t);
  fs.writeFileSync(path.join(out,id+'_background.png'),Buffer.from(data,'base64'));
 }
}finally{await browser.close();}
