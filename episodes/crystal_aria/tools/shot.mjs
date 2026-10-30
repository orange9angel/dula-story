// node tools/shot.mjs <url> <out.png> [jsonOut]
import fs from 'node:fs';import path from 'node:path';
import {puppeteerFor} from '../../../../dula-skills/draw-over-animation/scripts/pipeline.mjs';
const [url,out,json]=process.argv.slice(2);const b=await puppeteerFor(path.resolve('.')).launch({headless:'new',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.setViewport({width:1280,height:800});await p.goto(url);
try{await p.waitForFunction('window.ready===true',{timeout:120000});}catch(e){console.log(errs);throw e;}
await p.screenshot({path:out});if(json)fs.writeFileSync(json,JSON.stringify(await p.evaluate(()=>window.out),null,1));console.log('ok',errs);await b.close();
