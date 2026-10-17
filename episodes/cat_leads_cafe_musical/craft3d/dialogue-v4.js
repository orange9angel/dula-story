import {blink} from '../pilot/performance.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,t)=>a+(b-a)*t;
const P=(x,y,z)=>({x,y,z});
export function dialogueAt(t,story,cues){
 const song=story.find(e=>e.text.includes('CafeDuet')),entry=story.find(e=>e.start<=t&&t<e.end),rise=story.find(e=>e.text.includes('SunlightPause'));
 const coda=t>song.end,u=t>=rise.start&&t<song.start?smooth((t-rise.start)/(song.start-rise.start)):0;
 const tap=entry?.text.includes('CeramicPickup')??false;
 const tapLift=Math.min(.07,...[12.65,13.25].map(hit=>.07*(1-Math.exp(-(((t-hit)/.13)**2)))));
 const p={t,mode:'dialogue',coda,cupInsert:tap,tapLift,standing:u>0,steam:!coda,camera:{x:-1.3,y:1.02,span:2.08}};
 for(const kind of ['Girl','Boy']){
  const girl=kind==='Girl',s=girl?1:1.07,dir=girl?1:-1,speaking=entry?.text.startsWith('['+kind+']'),cue=cues[kind][Math.floor(t*100)]??{};
  const bob=mix(-.385,0,u),yaw=dir*.13,baseX=girl?-1.95:-.65,baseZ=-1.35+.30*u;
  const gesture=speaking?.5-.5*Math.cos(Math.min(1,(t-entry.start)/.5)*Math.PI):0;
  const left=P(-.19*s,.83+.50*u,.36-.20*u),right=P(.19*s,.83+.50*u,.36-.20*u);
  if(girl){left.x-=gesture*.05;left.y+=gesture*.11;left.z-=gesture*.04;}
  else{right.x+=gesture*.04;right.y+=gesture*.09;right.z-=gesture*.05;}
  if(tap&&girl){right.x=.25;right.y=.94+tapLift*.30;right.z=.34;}
  const drawing=!girl&&t<6.6;
  if(drawing){right.x=.08+.006*Math.sin(t*2);right.y=.88;right.z=.40;}
  const attention=(!girl&&t<2.6)?0:dir*(speaking?.20:.30);
  p[kind]={time:t,x:baseX,z:baseZ,yaw,bob,roll:0,
   headYaw:attention,headPitch:!girl&&t<2.6?.12:speaking?.015+Math.sin((t-entry.start)*4)*.015:.025,headRoll:girl?-.025:.015,
   leftWrist:left,rightWrist:right,leftFoot:P(-.11*s,.074*s,.34-.30*u),rightFoot:P(.11*s,.074*s,.34-.30*u),leftFootYaw:-.03,rightFootYaw:.03,stance:{left:true,right:true},
   leftGesture:{open:.3},rightGesture:{open:tap&&girl?0:.3},rightGrip:(tap&&girl)||drawing?.78:0,rightPalm:(tap&&girl)||drawing?P(0,-1,0):null,rightDirection:(tap&&girl)||drawing?P(0,-.5,1):null,seatedHair:.16*(1-u),hairSway:.003*Math.sin(t*1.7),
   face:{jaw:cue.jaw??0,width:cue.width??1,blink:blink(t%18,girl?0:.65),gaze:[dir*.6,-.05],smile:speaking?.14:.08}};
 }
 if(entry?.text.startsWith('[Girl]'))p.camera={x:-1.90,y:1.23,span:1.13};
 if(entry?.text.startsWith('[Boy]'))p.camera={x:-.65,y:1.27,span:1.13};
 if(tap)p.camera={x:-1.69,y:.91,span:.61};
 return p;
}
