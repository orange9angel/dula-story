const mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const point=(x,y,z=0)=>({x,y,z});
export function parseStory(text){return text.trim().split(/\r?\n\s*\r?\n/).map(block=>{const lines=block.split(/\r?\n/),times=lines[1].split(' --> ').map(s=>{const a=s.replace(',','.').split(':').map(Number);return a[0]*3600+a[1]*60+a[2];});return {id:+lines[0],start:times[0],end:times[1],text:lines.slice(2).join('\n')};});}
// Small authored side-step phrases. Each lifted foot moves only in its swing
// interval; planted feet remain fixed in world space. No sinusoidal skating.
export function dance(t,offset,beat=60/104){
  const local=t-offset;
  const feet={left:point(-.11,.074),right:point(.11,.074)},stance={left:true,right:true};let root=0,bob=0;
  if(local<0)return {feet,stance,root,bob,phase:0};
  const count=Math.floor(local/(beat*4)),u=(local%(beat*4))/(beat*4),direction=count%2===0?1:-1;
  const start=count%2===0?0:.23,target=count%2===0?.23:0;
  const lead=direction>0?'right':'left',follow=direction>0?'left':'right';
  feet.left.x+=start;feet.right.x+=start;
  const move=(side,a,b)=>{const q=Math.max(0,Math.min(1,(u-a)/(b-a))),x=smooth(q);feet[side].x+=direction*.23*x;feet[side].y+=.058*Math.sin(Math.PI*q);stance[side]=q===0||q===1;};
  move(lead,.06,.30);move(follow,.52,.78);
  root=mix(start,target,smooth((u-.12)/.58));bob=-.022*Math.sin(Math.PI*Math.max(0,Math.min(1,(u-.04)/.8)))**2;
  return {feet,stance,root,bob,phase:u};
}
export function blink(t,offset){for(const b of [1.4+offset,4.8+offset,8.7+offset,13.2+offset,16.6+offset]){const d=t-b;if(d>=0&&d<.17)return Math.sin(Math.PI*d/.17);}return 0;}
export function performanceAt(t,story,visemes){
  const event=story.find(e=>t>=e.start&&t<e.end)??story.at(-1);const songStart=story[2].start;
  const data={event:event.id,t};
  for(const kind of ['Girl','Boy']){
    const girl=kind==='Girl',s=girl?1:1.07,start=girl?songStart:songStart+2.3;
    const stop=story[5].start,lastCycle=Math.floor((stop-start)/(60/104*4)),settled=start+lastCycle*(60/104*4),d=dance(Math.min(t,settled),start),w=smooth((t-start)/.6),release=smooth((t-settled)/.8);
    const baseX=girl?-.78:.72,x=baseX+d.root*s,side=girl?1:-1;
    const wrists={left:point(-.23*s,.925*s,.08),right:point(.23*s,.925*s,.08)};
    if(t<songStart){
      const gesture=girl?smooth((t-.35)/.4)*(1-smooth((t-1.7)/.45)):smooth((t-2.25)/.4)*(1-smooth((t-4.15)/.6));
      const hand=girl?'right':'left';wrists[hand]=point(side*mix(.23,.34,gesture)*s,mix(.925,1.24,gesture)*s,.08+gesture*.12);
    }else{
      const swing=Math.sin(d.phase*Math.PI*2),amp=w*(1-release*.65);
      wrists.left=point((-.23-.10*amp)*s,(1.02+.16*amp+.07*swing*amp)*s,.10+.08*amp);
      wrists.right=point((.23+.10*amp)*s,(1.02+.16*amp-.07*swing*amp)*s,.10+.08*amp);
    }
    const cue=visemes?.find(c=>c.character===kind&&t>=c.start&&t<c.end);
    const jaw=cue?cue.jaw:0;
    const feet={};for(const key of ['left','right'])feet[key]=point((d.feet[key].x-d.root)*s,d.feet[key].y*s,d.feet[key].z);
    const lift=t<songStart?(.10*smooth((t-(girl?.3:2.2))/.5)*(1-smooth((t-(girl?1.5:4.1))/.5))):.14*w*(1-release)+.045*Math.sin(d.phase*Math.PI*2)*w*(1-release);
    data[kind]={time:t,x,yaw:0,headYaw:0,headPitch:0,headRoll:side*(.018+.018*Math.sin(t*1.3)),bob:d.bob*s,roll:.018*Math.sin(d.phase*Math.PI*2)*w,armLift:[lift,lift],elbowBend:[.07+lift*.6,.07+lift*.6],leftWrist:wrists.left,rightWrist:wrists.right,leftFoot:feet.left,rightFoot:feet.right,leftGesture:{open:.42},rightGesture:{open:.42},hairSway:.008*Math.sin(t*2.7-.6)*w,face:{blink:blink(t,girl?0:.65),jaw,gaze:[side*.25,0],smile:t>songStart?.20:.06},stance:d.stance,scale:s};
  }
  data.camera=t<2?{x:-.2,y:1.17,span:3.25}:t<5?{x:.58,y:1.49,span:1.39}:t<9?{x:-.49,y:1.39,span:1.78}:{x:.1,y:1.05,span:3.18};
  return data;
}
