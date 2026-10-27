// 输入指纹审计（《明天还会亮》tomorrow_still_bright）：render.mjs 在 check/render 板上落 build JSON，
// physics 门禁的 trace 复用靠这些 sha256 判断输入是否过期。
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const episodeSources=['performance.js','viewer.js','viewer.html','render.mjs',
  'scenes/common.js','scenes/CorridorScene.js','scenes/GreenhouseScene.js','scenes/WarehouseScene.js',
  'scenes/LoungeScene.js','scenes/PowerRoomScene.js','scenes/CockpitScene.js','scenes/SpaceStationExtScene.js',
  'characters/m07.js','characters/props.js',
  'tools/audit_inputs.mjs','tools/compile_story.mjs',
  'config/timeline.json','config/contact_events.json','script.story'];

export function auditInputs(episode){
  const story=path.resolve(episode,'../..'),files=episodeSources.map(p=>path.join(episode,p));
  for(const f of ['NumericAudit.js'])files.push(path.join(story,'node_modules/dula-engine/lib',f));
  for(const f of ['look.js','pose.js','locomotion.js']){
    const p=path.join(story,'node_modules/dula-assets/lib/craft3d',f);
    if(fs.existsSync(p))files.push(p);
  }
  return {inputs:files.map(p=>({path:fs.realpathSync(p),sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}))};
}
