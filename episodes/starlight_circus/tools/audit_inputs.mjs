import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
export const episodeSources=['script.story','viewer.js','viewer.html','performance.js','characters/cast.js','scenes/StarlightTheatre.js','config/timeline.json','config/light_score.json','tools/compile_story.mjs','assets/draw_over_runtime/scene-light-score.js'];
export function auditInputs(root){return {inputs:episodeSources.map(p=>({path:p,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')}))};}
