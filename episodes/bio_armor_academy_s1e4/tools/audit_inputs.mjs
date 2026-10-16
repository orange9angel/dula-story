import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const episodeSources=['script.story','bootstrap.js','viewer.js','viewer.html','render.mjs','face_lab.js','face_lab.html',
  'performance_remake.js','performance_tripo.js','tools/imported_probe.js','tools/check_imported_contact.py','tools/check_imported_motion.py','config/episode_motion_review.json','config/imported_contact_contract.json','scenes/BiologyRoomRemakeScene.js',
  'tools/audit_inputs.mjs','tools/compile_story.mjs','tools/numeric_probe.js',
  'config/timeline.json','config/contact_contract.json','config/scene_contract.json','config/audio_direction.json',
  'config/audio_timing.json','tools/build_audio.py','tools/check_audio_sync.py','tools/check_contact.py',
  'tools/check_story_motion.py','tools/prepare_ambience.py','tools/build_visemes.py',
  'config/viseme_leixiao.json','config/viseme_qiantangkui.json','config/dialogue_alignment.json',
  'config/sound_cues.json','config/foley_anchors.json','tools/build_foley_anchors.mjs',
  'tools/configure_episode.py','tools/configure_contracts.py','assets3d/textures/biology_wall_r3.png'];
export function auditInputs(ep){
  const story=path.resolve(ep,'../..'),files=episodeSources.map(p=>path.join(ep,p));
  for(const dir of ['node_modules/dula-assets/lib/craft3d','node_modules/dula-assets/characters/bioarmor'])
    for(const name of fs.readdirSync(path.join(story,dir)))if(name.endsWith('.js'))files.push(path.join(story,dir,name));
  for(const name of ['MeshCollision.js','NumericAudit.js'])files.push(path.join(story,'node_modules/dula-engine/lib',name));
  for(const name of ['known_text_alignment.py','viseme_core.py'])files.push(path.join(story,'node_modules/dula-assets/lib/audio',name));
  for(const name of ['contact_probe.py','surface_audit.py','bounded_staging_audit.py'])files.push(path.join(story,'../dula-skills/direct-animation-craft/scripts',name));
  for(const name of ['config/voice_features.json','assets3d/mixed.wav'])if(fs.existsSync(path.join(ep,name)))files.push(path.join(ep,name));
  for(const id of ['lei','aoi'])files.push(path.join(ep,`assets3d/tripo_${id}_trial/${id}_h31_lod160k_v2.glb`));
  for(const name of ['drawn-face-reference.png','aoi-painted-face-v1.png','aoi-painted-hair-v1.png','aoi-painted-back-v1.png','aoi-profile-hair-atlas-v1.png','lei-painted-face-v1.png','lei-painted-hair-v1.png','lei-painted-back-v1.png'])files.push(path.join(story,'node_modules/dula-assets/characters/bioarmor/textures',name));
  files.push(path.join(ep,'assets3d/tripo_lei_trial/lei_text_rub_v1.glb'));
  return {inputs:files.map(p=>({path:fs.realpathSync(p),sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}))};
}
