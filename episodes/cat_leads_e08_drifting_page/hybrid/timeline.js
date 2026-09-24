export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const mix=(a,b,t)=>a+(b-a)*t;
const sec=s=>s.replace(',','.').split(':').reduce((a,b)=>a*60+Number(b),0);
export function compile(story,direction,lips){
  const entries=story.trim().split(/\r?\n\s*\r?\n/).map(block=>{
    const lines=block.split(/\r?\n/),times=lines[1].split(' --> '),text=lines.slice(2).join(' ');
    return {id:Number(lines[0]),start:sec(times[0]),end:sec(times[1]),text,character:text.match(/\[(Girl|Boy)\]/)?.[1],dialogue:text.replace(/\{[^}]*\}|\[[^\]]*\]|@\w+/g,'').trim()};
  });
  const E=Object.fromEntries(entries.map(e=>[e.id,e])),duration=Math.max(...entries.map(e=>e.end));
  const shots=direction.shots.map(s=>({...s,start:E[s.anchor][s.edge]+(s.offset??0)}));
  shots.forEach((s,i)=>{s.end=shots[i+1]?.start??duration;if(s.end<=s.start)throw new Error('Invalid shot anchors');});
  const beats={arrival:E[1].end,arrived:E[2].start,gust:E[4].start,gustEnd:E[4].end,lift:E[5].start,alarm:E[6].start,stop:E[6].end,calm:E[7].start,drift:E[7].end,regret:E[8].start,reassure:E[9].start,draw:E[10].start,offer:E[11].start,accept:E[12].start,symbol:E[12].end,fade:E[13].start-.4};
  const environment=[{kind:'wind',start:beats.gust-.4,end:beats.gustEnd+1.1,attack:.7,strength:1.15},
    {kind:'birds',start:E[1].start+.8,end:E[2].start+.5,count:5,direction:1},
    {kind:'birds',start:E[3].end+.6,end:E[4].start-.2,count:3,direction:-1},
    {kind:'birds',start:beats.symbol+3.5,end:duration-.2,count:4,direction:1}];
  return {entries,shots,duration,beats,environment,lips};
}
export function mouthAt(plan,character,t){
  const e=plan.lips.entries.find(e=>e.character===character&&t>=e.timelineStart&&t<e.timelineEnd);
  if(!e)return 0;
  return {closed:0,half:1,open:2}[e.cells[Math.floor((t-e.timelineStart)*plan.lips.mouthFrameRate)]]??0;
}
