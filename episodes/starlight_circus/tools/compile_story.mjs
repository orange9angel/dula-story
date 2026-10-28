import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'script.story'),'utf8');
const seconds=s=>{const [h,m,v]=s.replace(',','.').split(':').map(Number);return h*3600+m*60+v;};
const segments=source.trim().split(/\r?\n\s*\r?\n/).map(block=>{
 const lines=block.split(/\r?\n/),times=lines[1].match(/(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})/);
 if(!times)throw Error('Missing story span');
 const tag=block.match(/\{Event:Cue\|([^}]+)\}/);if(!tag)throw Error('Missing cue');
 const opts=Object.fromEntries(tag[1].split('|').map(x=>x.split('='))),line=block.match(/^\[([^\]]+)\](.+)$/m);
 return {entry:Number(lines[0]),start:seconds(times[1]),end:seconds(times[2]),...opts,character:line?.[1]??null,text:line?.[2]??''};
});
for(let i=0;i<segments.length;i++){const s=segments[i];if(s.end<=s.start||(i&&s.start!==segments[i-1].end))throw Error('Non-contiguous story');if(s.character==='Selene'&&s.start<420)throw Error('Selene speaks too early');}
if(new Set(segments.map(s=>s.id)).size!==segments.length)throw Error('Duplicate cue');
const timeline={source:'script.story',sourceSha256:createHash('sha256').update(source).digest('hex'),duration:segments.at(-1).end,segments};
fs.writeFileSync(path.join(root,'config/timeline.json'),JSON.stringify(timeline,null,2));
console.log(`${segments.length} cues; ${timeline.duration}s; Selene first speech >=420s`);
