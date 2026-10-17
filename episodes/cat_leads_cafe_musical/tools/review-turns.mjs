import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const root=process.cwd(),require=createRequire(path.resolve(root,'../../../dula-engine/package.json')),puppeteer=require('puppeteer');
const tag=process.argv[2]??'candidate',dir=path.join(root,'storyboard/turns',tag);fs.mkdirSync(dir,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage();page.on('pageerror',e=>{throw e;});await page.goto('http://127.0.0.1:4235/craft3d/viewer.html?capture=1',{waitUntil:'domcontentloaded'});await page.waitForFunction('window.ready===true',{timeout:60000});
 for(const kind of [null,'Girl','Boy'])for(const degrees of [0,45,75,90,135,180,225,270,315]){const b64=await page.evaluate(({a,k})=>window.reviewAt(a,k),{a:degrees*Math.PI/180,k:kind});fs.writeFileSync(path.join(dir,`${kind??'pair'}_${degrees}.jpg`),Buffer.from(b64,'base64'));}
 // Browser canvas makes comparison/contact sheets without changing source art.
 for(const kind of ['Girl','Boy','pair']){const bytes=await page.evaluate(async({kind,tag})=>{const c=document.createElement('canvas');c.width=1440;c.height=810;const x=c.getContext('2d');let i=0;for(const a of [0,45,75,90,135,180,225,270,315]){const img=new Image();img.src=`/storyboard/turns/${tag}/${kind}_${a}.jpg`;await img.decode();x.drawImage(img,(i%3)*480,Math.floor(i/3)*270,480,270);x.fillStyle='#102232';x.font='20px sans-serif';x.fillText(String(a)+'°',(i%3)*480+12,Math.floor(i/3)*270+26);i++;}return c.toDataURL('image/jpeg',.94).split(',')[1];},{kind,tag});fs.writeFileSync(path.join(dir,kind+'_sheet.jpg'),Buffer.from(bytes,'base64'));}
 console.log(JSON.stringify({tag,views:27,dir}));
}finally{await browser.close();}
