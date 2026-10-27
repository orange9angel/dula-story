// script.story → config/timeline.json 编译器（《借走月光的女孩》）。
// 剧本是唯一时序数据源；本工具解析 SRT 扩展格式（@Scene / {Event:Beat} / {Event:Cue} /
// {Event:Act} / [Character]台词）生成 viewer 链消费的 segments（绝对秒）。
// 用法：node tools/compile_story.mjs   （剧本改动后重跑）
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url)),ep=path.resolve(here,'..');
const story=fs.readFileSync(path.join(ep,'script.story'),'utf8');

const SCENE_CLASS={SnowTownScene:'snowtown',ClockTowerScene:'clocktower',
  TowerTopScene:'towertop',MoonPalaceScene:'moonpalace'};

function parseTime(s){
  const m=/^(\d+):(\d+):(\d+),(\d+)$/.exec(s.trim());
  if(!m)throw new Error(`Bad timestamp: ${s}`);
  return (+m[1])*3600+(+m[2])*60+(+m[3])+(+m[4])/1000;
}
function parseTag(body){ // "Event:Beat|id=m01|..." → {ns:'Event',action:'Beat',kv:{...}}
  const parts=body.split('|'),[ns,action]=parts[0].split(':');
  const kv={};
  for(const p of parts.slice(1)){
    const i=p.indexOf('=');
    if(i<0){kv[p]='';continue;} // 容忍空值（如 context|）
    kv[p.slice(0,i)]=p.slice(i+1);
  }
  return {ns,action,kv};
}

const blocks=story.split(/\r?\n\s*\r?\n/).map(b=>b.trim()).filter(Boolean);
const segments=[],subtitles=[];
let sceneClass=null,prevEnd=-1;
for(const block of blocks){
  const lines=block.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const idx=Number(lines[0]);
  if(!Number.isInteger(idx))throw new Error(`Bad entry index: ${lines[0]}`);
  const tm=/^(\S+)\s+-->\s+(\S+)$/.exec(lines[1]);
  if(!tm)throw new Error(`Entry ${idx}: bad time range`);
  const start=parseTime(tm[1]),end=parseTime(tm[2]);
  if(start<prevEnd-1e-9)throw new Error(`Entry ${idx}: non-monotonic time (${start} < ${prevEnd})`);
  if(end<=start)throw new Error(`Entry ${idx}: end<=start`);
  prevEnd=end;

  let beat=null,act=null,character=null,line=null;const cues=[];
  for(const text of lines.slice(2)){
    const dm=/^\[(\w+)\](.*)$/.exec(text);
    const tail=dm?dm[2].trim():text;
    if(dm){character=dm[1];if(tail)line=tail;}
    for(const m of text.matchAll(/@(\w+)/g)){
      sceneClass=m[1];
      if(!SCENE_CLASS[sceneClass])throw new Error(`Entry ${idx}: unknown scene class ${sceneClass}`);
    }
    for(const m of text.matchAll(/\{([^{}]+)\}/g)){
      const tag=parseTag(m[1]);
      if(tag.ns==='Event'&&tag.action==='Beat')beat=tag.kv;
      else if(tag.ns==='Event'&&tag.action==='Cue'){
        if(!tag.kv.name)throw new Error(`Entry ${idx}: cue without name`);
        cues.push({name:tag.kv.name,at:Math.round((start+Number(tag.kv.offset??0))*1000)/1000});
      }
      else if(tag.ns==='Event'&&tag.action==='Act')act=tag.kv;
    }
    // 台词可能在标签之后同行
    if(dm&&!line){const t2=text.replace(/^\[\w+\]/,'').replace(/\{[^{}]+\}/g,'').trim();if(t2)line=t2;}
  }
  if(!beat)throw new Error(`Entry ${idx}: missing {Event:Beat}`);
  const scene=beat.scene??(sceneClass?SCENE_CLASS[sceneClass]:null);
  if(!scene)throw new Error(`Entry ${idx}: no scene (missing @Scene or scene= in Beat)`);
  if(sceneClass&&SCENE_CLASS[sceneClass]!==scene)
    throw new Error(`Entry ${idx}: @${sceneClass} contradicts scene=${scene}`);
  const expected=`m${String(idx).padStart(2,'0')}`;
  if(beat.id!==expected)console.warn(`warn: entry ${idx} beat id ${beat.id} != ${expected}`);
  segments.push({
    id:beat.id,kind:character?'dialogue':'action',character,
    start,end,
    move:beat.move??'hold',shot:beat.shot??'wide',scene,
    action:beat.action??'',cues,
    ...(act?{act:{id:act.id,emotion:act.emotion??'neutral',gaze:act.gaze??'none',
      camera:act.camera??'speech',context:act.context??''}}:{}),
    ...(line?{line}:{}),
  });
  if(character&&line)subtitles.push({character,start,end,text:line});
}

const duration=segments[segments.length-1].end;
const out={
  duration,step:0.01,
  generated_from:'script.story',
  generator:'node tools/compile_story.mjs',
  segments,subtitles,
};
fs.writeFileSync(path.join(ep,'config/timeline.json'),JSON.stringify(out,null,1)+'\n');
console.log(`timeline: ${segments.length} segments, ${subtitles.length} subtitles, duration ${duration}s`);
