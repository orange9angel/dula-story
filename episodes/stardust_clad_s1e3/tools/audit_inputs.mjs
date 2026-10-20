import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const episodeSources=['script.story','viewer.js','performance.js','viewer.html','render.mjs','bootstrap.js','config/timeline.json','config/dialogue.json','config/event_times.js','config/voice_envs.json','tools/compile_story.py','tools/audit_inputs.mjs'];
export function auditInputs(ep){
 const assets=path.resolve(ep,'../../node_modules/dula-assets');
 const files=new Set(),visit=f=>{
  f=fs.realpathSync(f);if(files.has(f))return;files.add(f);
  if(!/\.(js|mjs)$/.test(f))return;
  const source=fs.readFileSync(f,'utf8');
  for(const [,spec]of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
   const candidate=spec.startsWith('.')?path.resolve(path.dirname(f),spec):spec.startsWith('dula-assets/')?path.join(assets,spec.slice(12)):null;
   if(candidate&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile())visit(candidate);
  }
 };
 episodeSources.forEach(f=>visit(path.join(ep,f)));
 for(const f of fs.readdirSync(path.join(ep,'assets3d/tex')))visit(path.join(ep,'assets3d/tex',f));
 visit(path.join(ep,'assets3d/mixed.wav'));
 visit(path.resolve(ep,'../../package-lock.json'));
 return {inputs:[...files].sort().map(f=>({path:f,sha256:createHash('sha256').update(fs.readFileSync(f)).digest('hex')}))};
}
