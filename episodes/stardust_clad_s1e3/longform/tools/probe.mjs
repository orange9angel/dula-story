import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(root,'../../../node_modules/dula-engine/package.json'));
const puppeteer=require('puppeteer');
const args=process.argv.slice(2),url=args[0]??'http://127.0.0.1:4327/longform/viewer.html';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.setViewport({width:1280,height:720});
 let count=0;
 page.on('pageerror',e=>console.log('PAGEERROR',e.stack));
 page.on('console',m=>{if(m.type()==='error'&&count++<4)console.log('CONSOLE',m.text(),JSON.stringify(m.stackTrace()));});
 await page.evaluateOnNewDocument(()=>{const original=console.error;console.error=(...a)=>original(...a,new Error().stack);});
 await page.goto(url,{waitUntil:'networkidle0'});await page.waitForFunction('window.ready===true',{timeout:120000});
 const out=path.join(root,'review','pilot_r1');fs.mkdirSync(out,{recursive:true});
 for(const t of[.5,5.5,8.5,11.5,14.5,17.5,22]){
  const result=await page.evaluate(t=>window.renderAt(t),t);fs.writeFileSync(path.join(out,`${String(t).replace('.','_')}.jpg`),Buffer.from(result.image,'base64'));
  console.log(t,JSON.stringify(result.state));
 }
}finally{await browser.close();}
