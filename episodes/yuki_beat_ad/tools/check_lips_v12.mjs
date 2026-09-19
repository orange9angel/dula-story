import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLipDriver} from '../lipsync_v12.js';
const root=new URL('../',import.meta.url);
const music=JSON.parse(fs.readFileSync(new URL('config/music_analysis_v12.json',root)));
const at=createLipDriver(music);
const chars=music.lyric_chars;
// Runtime must reject the start-only repair that let the previous syllable win.
const bad=structuredClone(music);bad.lyric_chars[0].end=bad.lyric_chars[1].start+.10;
assert.throws(()=>createLipDriver(bad),/Overlapping/);
let preframes=0,rests=0,closures=0;
for(let i=0;i<Math.round(music.duration*60);i++){
  const t=i/60,lip=at(t);
  assert(Number.isFinite(lip.open)&&lip.open>=0&&lip.open<=1);
  const active=chars.findIndex(c=>c.start<=t&&t<c.end);
  assert.equal(lip.index,active,`Wrong character on frame ${i}`);
  if(active<0){assert.equal(lip.open,0);rests++;}
  if(lip.phase==='prepare'){
    const c=chars[active];assert(t>=c.audio_start-.030001&&t<c.audio_start);preframes++;
  }
  if(lip.shape==='MBP'){assert.equal(lip.open,0);closures++;}
  assert.equal(lip.audioIndex,chars.findLastIndex(c=>c.audio_start<=t&&t<c.audio_end),`Lyric flicker on frame ${i}`);
}
for(const c of chars){
  const first=Math.ceil(c.start*60-1e-7)/60;
  assert(first<c.end,`Character never gets a rendered frame: ${c.ch}`);
  assert.equal(at(first).char,c.ch);
  if(['b','p','m'].includes(c.initial)){
    assert.equal(at(c.audio_start-.008).shape,'MBP',`${c.ch}: must seal lips before onset`);
    assert.notEqual(at(c.audio_start+.030).shape,'MBP',`${c.ch}: cannot delay vowel after onset`);
  }
}
// An explicit quiet-before/onset-after fixture verifies that anticipation is not
// nulled by energy at the current frame, while distant silence stays closed.
const fixture={lyric_chars:[{ch:'啊',initial:'',final:'a',start:.970,audio_start:1,end:1.3}],
  vocal_envelope:Array.from({length:160},(_,i)=>({t:i*.01+.005,level:i>=100&&i<130?.6:0}))};
const f=createLipDriver(fixture);
assert.equal(f(.96).open,0);assert(f(.985).open>.1);assert.equal(f(1.4).open,0);
console.log(JSON.stringify({characters:chars.length,restFrames:rests,preparationFrames:preframes,bilabialClosures:closures,overlapGuard:true,anticipationGate:true}));
