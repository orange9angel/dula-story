import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const episodeSources=['script.story','bootstrap.js','performance.js','viewer.js','viewer.html','render.mjs',
  'scenes/BiologyRoomScene.js','tools/audit_inputs.mjs','tools/compile_story.mjs','tools/numeric_probe.js',
  'config/timeline.json','config/contact_contract.json','config/scene_contract.json','config/audio_direction.json',
  'config/audio_timing.json','tools/build_audio.py','tools/check_audio_sync.py','tools/check_contact.py',
  'tools/check_story_motion.py','tools/prepare_ambience.py'];
export function auditInputs(ep){
  const story=path.resolve(ep,'../..'),files=episodeSources.map(p=>path.join(ep,p));
  for(const dir of ['node_modules/dula-assets/lib/craft3d','node_modules/dula-assets/characters/bioarmor'])
    for(const name of fs.readdirSync(path.join(story,dir)))if(name.endsWith('.js'))files.push(path.join(story,dir,name));
  for(const name of ['MeshCollision.js','NumericAudit.js'])files.push(path.join(story,'node_modules/dula-engine/lib',name));
  for(const name of ['contact_probe.py','surface_audit.py','bounded_staging_audit.py'])files.push(path.join(story,'../dula-skills/direct-animation-craft/scripts',name));
  for(const name of ['config/voice_features.json','assets3d/mixed.wav'])if(fs.existsSync(path.join(ep,name)))files.push(path.join(ep,name));
  return {inputs:files.map(p=>({path:fs.realpathSync(p),sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}))};
}
