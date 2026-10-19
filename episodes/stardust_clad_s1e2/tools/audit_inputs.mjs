import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const episodeSources=['script.story','duel_performance.js','viewer_palace.js','palace_camera.js','serial_direction.js','shot_direction.js','story_fx.js','look_direction.js','config/event_times.js','config/voices.json','tools/compile_story.py','performance.js','viewer.js','viewer.html','render.mjs',
  'tools/audit_inputs.mjs','tools/check_palace.py','tools/build_foley.mjs','tools/mix_serial.py','config/foley_contacts.json',
  'config/timeline.json','config/dialogue.json','config/voice_envs.json','config/editorial_cuts.json','config/palace_review_shots.json','config/palace_runtime_contract.json','config/scene_contract.json'];

export function auditInputs(episode){
  const story=path.resolve(episode,'../..'),files=episodeSources.map(p=>path.join(episode,p));
  // 角色/场景住 dula-assets（stardust 晋升包），指纹覆盖同源
  for(const dir of ['node_modules/dula-assets/lib/craft3d','node_modules/dula-assets/characters/bioarmor',
      'node_modules/dula-assets/characters/stardust','node_modules/dula-assets/scenes/stardust'])
    for(const f of fs.readdirSync(path.join(story,dir)))if(f.endsWith('.js'))files.push(path.join(story,dir,f));
  files.push(path.join(story,'node_modules/dula-engine/lib/NumericAudit.js'));
  files.push(path.join(story,'node_modules/dula-engine/lib/MeshCollision.js'));
  files.push(path.join(episode,'assets3d/tex/armor_engraved_r20.png'));
  files.push(path.join(episode,'config/palace_stage_contract.json'));
  return {inputs:files.map(p=>({path:fs.realpathSync(p),sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}))};
}
