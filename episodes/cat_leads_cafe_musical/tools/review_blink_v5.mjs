import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('../../../dula-engine/package.json')),b=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
fs.mkdirSync('storyboard/integration_v5',{recursive:true});
try{const p=await b.newPage();const errors=[];p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4235/craft3d/viewer.html?full=1&capture=1');await p.waitForFunction('window.ready',{timeout:60000});
 for(const t of [26.7,26.75,26.8,26.85,26.9,27.05]){const r=await p.evaluate(t=>window.renderAt(t),t);fs.writeFileSync(`storyboard/integration_v5/blink_${t}.jpg`,Buffer.from(r.image,'base64'));}
 for(const kind of ['Girl','Boy'])for(const blink of [0,.5,1]){
  const data=await p.evaluate(({kind,blink})=>{const actor=window.actors[kind],original=actor.setPose;actor.setPose=function(p){return original.call(this,{...p,face:{...p.face,blink}});};try{return window.reviewAt(0,kind);}finally{actor.setPose=original;}},{kind,blink});
  fs.writeFileSync(`storyboard/integration_v5/${kind}_blink_${blink}.jpg`,Buffer.from(data,'base64'));
 }
 if(errors.length)throw Error(errors.join('\n'));console.log('Six consecutive blink-window frames captured.');
}finally{await b.close();}
