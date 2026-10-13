import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const ep=path.resolve(import.meta.dirname,'..');
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const three=pathToFileURL(path.resolve(ep,'../../node_modules/dula-engine/node_modules/three/build/three.module.js')).href;
let source=fs.readFileSync(path.join(ep,'performance_remake.js'),'utf8');
for(const name of ['pose','locomotion','supported-performance']){
  const code=fs.readFileSync(path.resolve(ep,'../../node_modules/dula-assets/lib/craft3d',name+'.js'),'utf8').replace("from 'three'","from '"+three+"'");
  source=source.replace('dula-assets/lib/craft3d/'+name+'.js',uri(code));
}
let posesAt;
try { ({posesAt}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))); }
catch(e) { console.error(e.message); process.exit(1); }
const tl=JSON.parse(fs.readFileSync(path.join(ep,'config/timeline.json')));
try{for(let i=0;i<Math.round(tl.duration*60);i++)posesAt(i/60,{},tl);}
catch(e){console.error(e.message);process.exit(1);}
console.log('All poses reachable at 60 Hz');
