import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const require=createRequire(path.resolve('../../../dula-engine/package.json')),browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
const file='storyboard/craft3d_full_v4/render.json',report=JSON.parse(fs.readFileSync(file,'utf8'));
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:4235/craft3d/viewer.html?full=1&capture=1');await page.waitForFunction('window.ready',{timeout:60000});
 const recheck={samples:0,mismatches:[],method:'Fresh browser, full reverse order; exact JPEG SHA256 against original sequential frames. Initial mismatch preserved.'};
 for(const {time} of [...report.trace].reverse()){const r=await page.evaluate(t=>window.renderAt(t),time),actual=Buffer.from(r.image,'base64'),expected=fs.readFileSync(`storyboard/craft3d_full_v4/frame_${String(Math.round(time*30)).padStart(4,'0')}.jpg`),hash=b=>createHash('sha256').update(b).digest('hex');recheck.samples++;if(hash(actual)!==hash(expected)){recheck.mismatches.push(time);fs.writeFileSync(`storyboard/face_v4/recheck_${Math.round(time*30)}.jpg`,actual);}}
 report.seek.recheck=recheck;fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify(recheck));
}finally{await browser.close();}
