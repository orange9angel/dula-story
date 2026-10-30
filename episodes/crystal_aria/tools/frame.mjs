// node tools/frame.mjs <viewer-url> <t> <out.png>  —— 取单帧 renderAt(t)
import fs from 'node:fs';import path from 'node:path';
import {puppeteerFor} from '../../../../dula-skills/draw-over-animation/scripts/pipeline.mjs';
const [url,t,out]=process.argv.slice(2);const b=await puppeteerFor(path.resolve('.')).launch({headless:'new',args:['--no-sandbox']});
const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));await p.setViewport({width:1280,height:720});await p.goto(url);
await p.waitForFunction('window.ready===true',{timeout:120000}).catch(e=>{console.log(errs);throw e;});
const a=await p.evaluate(t=>window.renderAt(t),Number(t));fs.writeFileSync(out,Buffer.from(a.image,'base64'));console.log('ok',errs);await b.close();
