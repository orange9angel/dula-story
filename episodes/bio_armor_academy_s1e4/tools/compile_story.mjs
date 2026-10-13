import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {StoryParser} from 'dula-engine/lib/StoryParser.js';
const ep=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const text=fs.readFileSync(path.join(ep,'script.story'),'utf8'),entries=StoryParser.parse(text);
const segments=entries.map(e=>({id:`entry_${e.index}`,entry:e.index,start:e.startTime,end:e.endTime,
  character:e.character,kind:e.dialogue?'dialogue':'action',text:e.dialogue,camera:e.cameraMove,events:(e.storyEvents??[]).map(x=>({type:x.name,options:x.options}))}));
const dialogue=segments.filter(s=>s.text).map(s=>({id:s.id,entry:s.entry,character:s.character,text:s.text,start:s.start+.2,end:s.end-.3}));
const result={duration:entries.at(-1).endTime,source:{path:'script.story',sha256:createHash('sha256').update(text).digest('hex')},segments,dialogue};
fs.mkdirSync(path.join(ep,'config'),{recursive:true});
fs.writeFileSync(path.join(ep,'config/timeline.json'),JSON.stringify(result,null,2)+'\n');
console.log(`story compiled: ${segments.length} entries, ${dialogue.length} lines, ${result.duration}s`);
