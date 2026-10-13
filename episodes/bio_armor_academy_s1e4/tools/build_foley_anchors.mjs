import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const ep=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,ep));
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const three=pathToFileURL(path.resolve(import.meta.dirname,'../../../node_modules/dula-engine/node_modules/three/build/three.module.js')).href;
let source=read('performance_remake.js').toString();
for(const name of ['pose','locomotion','supported-performance']){
  const code=read('../../node_modules/dula-assets/lib/craft3d/'+name+'.js').toString().replace("from 'three'","from '"+three+"'");
  source=source.replace('dula-assets/lib/craft3d/'+name+'.js',uri(code));
}
const {posesAt}=await import(uri(source));
const tl=JSON.parse(read('config/timeline.json')),fps=30,landings=[];
let prev=null;
for(let tick=0;tick<tl.duration*fps;tick++){
  const time=tick/fps,p=posesAt(time,{},tl);
  if(prev)for(const actor of ['lei','aoi'])for(const side of ['left','right'])
    if(!prev[actor].feet[side].stance&&p[actor].feet[side].stance)landings.push({actor,side,time});
  prev=p;
}
const out={sourceStory:tl.source,performanceSha256:createHash('sha256').update(read('performance_remake.js')).digest('hex'),
  fps,landings,slideStart:tl.segments.find(s=>s.events.some(e=>e.type==='OfferJar')).start+1.8};
fs.writeFileSync(new URL('config/foley_anchors.json',ep),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out));
