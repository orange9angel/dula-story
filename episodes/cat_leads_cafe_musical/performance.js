import {dance,blink} from './pilot/performance.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function performanceAt(t,story,timing,mouth,beats){
 const entry=story.find(s=>s.start<=t&&t<s.end);const song=story.find(s=>s.text.includes('Event:CafeDuet'));const local=t-song.start,singing=local>=0&&t<song.end,beat=60/beats.tempo;
 const p={t,entry:entry?.id??0,mode:singing?'dance':'table',steam:t<song.start,cupInsert:entry?.text.includes('CeramicPickup')??false,decisionProgress:entry?.text.includes('SunlightPause')?(t-entry.start)/(entry.end-entry.start):null};
 const lyric=timing.lyrics.find(l=>l.start<=t&&t<l.end);p.lyric=lyric;
 for(const actor of ['Girl','Boy']){
  const girl=actor==='Girl',scale=girl?1:1.07,side=girl?1:-1;
  // One short hesitant phrase, a real hold, then shared phrases from the chorus.
  const chorus=37.94;let motionTime=local,offset=girl?1.9969:1.9969+beat*.5;
  if(local<chorus){const phrase=beat*4;const active=2;motionTime=Math.min(local,offset+phrase*active);}
  else{offset=chorus;motionTime=Math.min(local,chorus+Math.floor((66-chorus)/(beat*4))*(beat*4));}
  const d=dance(motionTime,offset,beat),motion=singing&&local>offset&&Math.abs(motionTime-local)<.001,settle=singing?smooth((song.end-t)/1.2):0;
  const baseX=girl?-.78:.72,feet={};for(const key of ['left','right'])feet[key]={x:(d.feet[key].x-d.root)*scale,y:d.feet[key].y*scale,z:0};
  const face=mouth[actor][Math.min(mouth[actor].length-1,Math.max(0,Math.floor(t*100)))]??{};
  const lift=singing?(.055+.08*(motion?1:.35)+.035*Math.sin(local*2*Math.PI/(beat*4)))*settle:0;
  const waiting=local>1.9969+8*beat&&local<1.9969+8.5*beat,reply=local>1.9969+8.5*beat&&local<1.9969+9.5*beat;
  p[actor]={time:t,x:baseX+(singing?d.root*scale:0),scale,bob:singing?d.bob*scale:0,roll:motion?.015*Math.sin(d.phase*Math.PI*2):.006*Math.sin(t*.8),headRoll:girl&&waiting?-.055:!girl&&reply?.045:side*(.015+.018*Math.sin(t*.9)),armLift:[lift*(girl?1:.65),lift*(girl?.65:1)],elbowBend:[.04+.06*lift,.04+.06*lift],leftFoot:feet.left,rightFoot:feet.right,stance:d.stance,face:{blink:blink(t%18,girl?0:.65),jaw:face.jaw??0,width:face.width??1,gaze:waiting||reply?[side*.45,0]:[0,0],smile:0}};
 }
 if(p.mode==='table'){
  p.camera={x:0,y:1.05,span:3.32};
  if(p.cupInsert)p.camera={x:-1.59,y:.255,span:.85};
  else if(entry?.text.startsWith('[Girl]'))p.camera={x:-.67,y:1.40,span:2.28};
  else if(entry?.text.startsWith('[Boy]'))p.camera={x:.65,y:1.45,span:2.28};
  else if(entry?.text.includes('SunlightPause'))p.camera={x:.65,y:1.45,span:2.28};
 }else{
  p.camera={x:.02,y:1.08,span:3.05};
  if(local>7&&local<15)p.camera={x:-.65,y:1.39,span:1.8};
  else if(local>21&&local<31)p.camera={x:.82,y:1.45,span:1.8};
  else if(local>47.3&&local<51.6)p.camera={x:-.6,y:1.49,span:1.6};
  else if(local>51.6&&local<56.5)p.camera={x:.8,y:1.49,span:1.6};
  else if(local>66)p.camera={x:.02,y:1.18,span:2.8};
 }
 return p;
}
