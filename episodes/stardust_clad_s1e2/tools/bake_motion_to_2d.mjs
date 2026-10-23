// Compatibility entry; shared implementation lives in the checked-out skill.
import path from 'node:path';
import {runPipeline} from '../../../../dula-skills/draw-over-animation/scripts/pipeline.mjs';
await runPipeline({episode:path.resolve(import.meta.dirname,'..'),config:'config/art_pass_r2_pipeline.json',step:'bake',render:process.argv.includes('--render')});
