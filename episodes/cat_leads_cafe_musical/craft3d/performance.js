import {dance,blink} from '../pilot/performance.js';
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const P=(x,y,z)=>({x,y,z});
function blend(a,b,t){return P(mix(a.x,b.x,t),mix(a.y,b.y,t),mix(a.z,b.z,t));}
const handPoses=[
 [P(-.30,1.02,.12),P(.30,1.02,.12)],
 [P(-.39,1.22,.14),P(.33,1.57,.12)],
 [P(-.33,1.58,.12),P(.39,1.22,.14)],
 [P(-.39,1.43,.15),P(.39,1.43,.15)],
 [P(-.23,1.10,.28),P(.31,1.47,.25)],
 [P(-.36,1.53,.14),P(.34,1.20,.23)],
 [P(-.36,1.46,.22),P(.36,1.46,.22)],
 [P(-.35,1.20,.17),P(.35,1.20,.17)],
 [P(-.30,1.04,.10),P(.30,1.04,.10)]
];
export function performanceAt(t,absoluteTime,beat,cues){
 const p={t,absoluteTime};
 for(const kind of ['Girl','Boy']){
  const girl=kind==='Girl',s=girl?1:1.07,delay=girl?0:beat*.35,lt=Math.max(0,t-delay),d=dance(lt,0,beat),phrase=lt/(beat*4),i=Math.min(7,Math.floor(phrase)),u=phrase-i;
  const stepPose=smooth((u-.12)/.70),hands=handPoses[i].map((a,k)=>blend(a,handPoses[i+1][k],stepPose));
  // The hips turn on planted-toe pivots; feet then travel in world space.
  const turnValues=[0,.42,-.42,.12,girl?.72:-.72,girl?-.35:.35,0,.25,0];
  const yaw=mix(turnValues[i],turnValues[i+1],smooth(u));
  const worldRoot=(girl?-.82:.82)+d.root*s;
  const feet={};
  for(const side of ['left','right']){
   const world=P((d.feet[side].x-d.root)*s,d.feet[side].y*s,0),c=Math.cos(yaw),sn=Math.sin(yaw);
   feet[side]=P(c*world.x,world.y,sn*world.x);
  }
  const cue=cues[kind][Math.floor(absoluteTime*100)]??{},swing=Math.sin(lt/beat*Math.PI),roll=.025*swing;
  p[kind]={time:absoluteTime,x:worldRoot,yaw,bob:d.bob*s,roll,headYaw:-yaw*.35,headPitch:.025*Math.sin(lt/beat*Math.PI),headRoll:(girl?1:-1)*.025,
   leftWrist:P(hands[0].x*s,hands[0].y*s+d.bob*s,hands[0].z*s),rightWrist:P(hands[1].x*s,hands[1].y*s+d.bob*s,hands[1].z*s),leftFoot:feet.left,rightFoot:feet.right,
   leftFootYaw:-yaw*.88-.04,rightFootYaw:-yaw*.88+.04,leftFootPitch:-Math.max(0,feet.left.y-.074*s)*1.4,rightFootPitch:-Math.max(0,feet.right.y-.074*s)*1.4,
   leftGesture:{open:.78},rightGesture:{open:.78},hairSway:.018*Math.sin(lt/beat*Math.PI-.7),stance:d.stance,
   face:{jaw:cue.jaw??0,width:cue.width??1,blink:blink(t%18,girl?0:.65),gaze:[girl?.15:-.15,0],smile:0}};
 }
 return p;
}
