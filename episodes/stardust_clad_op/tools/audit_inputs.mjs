import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const episodeSources=['performance.js','viewer.js','viewer.html','render.mjs',
  'tools/audit_inputs.mjs',
  'config/timeline.json','config/review_shots.json','config/contact_contract.json'];

export function auditInputs(episode){
  const story=path.resolve(episode,'../..'),files=episodeSources.map(p=>path.join(episode,p));
  // R8 起角色/场景晋升 dula-assets（characters/stardust、scenes/stardust），指纹覆盖同源
  for(const dir of ['node_modules/dula-assets/lib/craft3d','node_modules/dula-assets/characters/bioarmor',
      'node_modules/dula-assets/characters/stardust','node_modules/dula-assets/scenes/stardust'])
    for(const f of fs.readdirSync(path.join(story,dir)))if(f.endsWith('.js'))files.push(path.join(story,dir,f));
  files.push(path.join(story,'node_modules/dula-engine/lib/NumericAudit.js'));
  return {inputs:files.map(p=>({path:fs.realpathSync(p),sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}))};
}
