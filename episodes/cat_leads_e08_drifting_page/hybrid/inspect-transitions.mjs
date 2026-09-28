import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(path.resolve(here,'../../../../dula-engine/package.json'));
const browser=await require('puppeteer').launch({headless:true,args:['--no-sandbox']});
try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:4200/hybrid/viewer.html?capture=1',{waitUntil:'networkidle0'});await page.waitForFunction('window.ready');
  const result=await page.evaluate(async()=>{
    const T=await import('three'),{EpisodeScene}=await import('./scene.js'),{inspectTransitions}=await import('./transition-checks.js');
    return inspectTransitions(new EpisodeScene(window.plan),new T.PerspectiveCamera());
  });
  const name=process.argv[2]??'transition_validation';if(!/^[a-z0-9_-]+$/i.test(name))throw new Error('Expected a report name');
  fs.writeFileSync(path.join(here,`storyboard/${name}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
