// 输入指纹审计（《借走月光的女孩》）：render.mjs 在 check/render 板上落 build JSON，
// physics 门禁的 trace 复用靠这些 sha256 判断输入是否过期。
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const episodeSources=['performance.js','viewer.js','viewer.html','render.mjs',
  'scenes/SnowTownScene.js','scenes/ClockTowerScene.js','scenes/TowerTopScene.js','scenes/MoonPalaceScene.js',
  'scenes/hybrid.js','effects/particles.js','effects/magic.js',
  'characters/face.js','characters/rig.js','characters/poses.js',
  'characters/eileen.js','characters/alder.js','characters/ladymoon.js',
  'tools/audit_inputs.mjs','tools/compile_story.mjs',
  'config/timeline.json','config/contact_contract.json','script.story'];

export function auditInputs(episode){
  const story=path.resolve(episode,'../..'),files=episodeSources.map(p=>path.join(episode,p));
  for(const f of ['NumericAudit.js'])files.push(path.join(story,'node_modules/dula-engine/lib',f));
  for(const f of ['look.js','surface.js','hand.js','pose.js','locomotion.js']){
    const p=path.join(story,'node_modules/dula-assets/lib/craft3d',f);
    if(fs.existsSync(p))files.push(p);
  }
  return {inputs:files.map(p=>({path:fs.realpathSync(p),sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}))};
}
