import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const episodeSources=['performance.js','viewer.js','viewer.html','render.mjs','scenes/RooftopNoonScene.js',
  'tools/door_probe.js','tools/surface_probe.js','tools/audit_inputs.mjs','tools/plan_clearance.mjs',
  'config/timeline.json','config/contact_contract.json'];

export function auditInputs(episode){
  const story=path.resolve(episode,'../..'),files=episodeSources.map(p=>path.join(episode,p));
  for(const dir of ['node_modules/dula-assets/lib/craft3d','node_modules/dula-assets/characters/bioarmor'])
    for(const f of fs.readdirSync(path.join(story,dir)))if(f.endsWith('.js'))files.push(path.join(story,dir,f));
  for(const f of ['MeshCollision.js','NumericAudit.js','ConstrainedLimb.js'])files.push(path.join(story,'node_modules/dula-engine/lib',f));
  return {inputs:files.map(p=>({path:fs.realpathSync(p),sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}))};
}
