import {createLocomotion} from '/assets-lib/lib/craft3d/locomotion.js';
import {blink} from '../pilot/performance.js';
const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);},mix=(a,b,t)=>a+(b-a)*t;
const P=(x,y,z=0)=>({x,y,z}),blend=(a,b,t)=>P(mix(a.x,b.x,t),mix(a.y,b.y,t),mix(a.z,b.z,t));
const turnGait=createLocomotion({turnLift:.065,turnStepAngle:Math.PI/3+.00001,hipDelta:.022});
export function beatState(time,grid,fallback=.58){
 const beats=grid?.beats;if(!beats)return Math.max(0,time/fallback);
 if(time<=beats[0])return Math.max(-1,(time-beats[0])/(beats[1]-beats[0]));
 let lo=0,hi=beats.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(beats[mid]<=time)lo=mid;else hi=mid;}
 return lo+(time-beats[lo])/(beats[hi]-beats[lo]);
}
const poses=[
 [P(-.21,1.00,.04),P(.22,1.04,.07)],
 [P(-.25,1.08,.14),P(.22,1.00,.02)],
 [P(-.32,1.17,.15),P(.22,1.03,.07)],
 [P(-.23,1.01,.07),P(.23,1.01,.07)],
 [P(-.33,1.30,.19),P(.21,1.00,.03)],
 [P(-.27,1.13,.15),P(.23,1.04,.06)],
 [P(-.21,1.00,.03),P(.33,1.29,.19)],
 [P(-.23,1.02,.07),P(.25,1.08,.11)],
 [P(-.31,1.11,.14),P(.30,1.12,.13)],
 [P(-.23,1.02,.08),P(.21,1.01,.04)],
 [P(-.23,1.04,.08),P(.33,1.46,.16)],
 [P(-.22,1.01,.04),P(.27,1.15,.17)],
 [P(-.32,1.29,.20),P(.21,1.02,.04)],
 [P(-.24,1.07,.12),P(.31,1.25,.19)],
 [P(-.35,1.24,.16),P(.35,1.24,.16)],
 [P(-.24,1.04,.08),P(.23,1.02,.06)]
];
function stepTouch(b,s){
 const q=((b%4)+4)%4,i=Math.floor(q),phase=q-i,u=smooth((phase-.16)/.84);
 const frames=[[-.11,.11],[-.11,.31],[.09,.31],[-.11,.31],[-.11,.11]];
 const moving=[1,0,0,1][i],feet={},stance={};let centre=0;
 for(const [k,side] of ['left','right'].entries()){
  const x=mix(frames[i][k],frames[i+1][k],u)*s,lift=k===moving?.074*Math.sin(Math.PI*u):0;
  feet[side]=P(x,(.074+lift)*s,0);stance[side]=k!==moving||u<1e-7||u>1-1e-7;centre+=x/2;
 }
 return {feet,stance,root:centre,bob:(-.027+.020*Math.sin(Math.PI*phase))*s,phase};
}
function turning(b,dir,s){
 const half=b<4?0:1,q=Math.min(4,Math.max(0,b-half*4)),j=Math.min(3,Math.floor(q)),f=q-j,from=dir*half*Math.PI,to=dir*(half+1)*Math.PI;
 // Re-time the existing finite-footstep engine so touchdown is exactly on
 // the musical beat. The engine's usual pre/post hold stays outside swing.
 const a=(j+.06+.88*f)/4,rough=turnGait.turningFeet({fromYaw:from,toYaw:to,a},0,0,from,.115*s,.074*s);
 const yaw=from+(rough.left.yaw+rough.right.yaw)/2,g=turnGait.turningFeet({fromYaw:from,toYaw:to,a},0,0,yaw,.115*s,.074*s);
 return {yaw,feet:{left:g.left,right:g.right},stance:{left:g.left.stance,right:g.right.stance},bob:(-.030+.014*Math.sin(Math.PI*f))*s,phase:f};
}
export function performanceAt(t,absoluteTime,beat,cues,grid){
 const b=beatState(grid?absoluteTime-grid.songStart:t,grid,beat),active=Math.max(0,b),index=Math.floor(active),phase=active-index;
 const turnStart=[32,96].find(n=>active>=n&&active<n+8),isTurn=turnStart!==undefined;
 const p={t,absoluteTime,beat:active,mode:isTurn?'turn':'step-touch',accent:index%4===0};
 for(const kind of ['Girl','Boy']){
  const girl=kind==='Girl',s=girl?1:1.07,dir=girl?1:-1;
  const d=isTurn?turning(active-turnStart,dir,s):stepTouch(active,s),yaw=isTurn?d.yaw:.16*Math.sin(active*Math.PI/4);
  const root=isTurn?0:d.root,feet={};
  for(const side of ['left','right']){if(isTurn)feet[side]=d.feet[side];else{const x=d.feet[side].x-root;feet[side]=P(Math.cos(yaw)*x,d.feet[side].y,Math.sin(yaw)*x);}}
  // Beat endpoints remain musical accents; the arms travel through low release
  // poses between responses. The duet shares timing, not permanent raised hands.
  const armBeat=active+(girl?0:8),poseAt=Math.floor(armBeat)%poses.length,next=(poseAt+1)%poses.length;
  const change=smooth((phase-.10)/.90),hands=poses[poseAt].map((a,k)=>blend(a,poses[next][k],change));
  for(let k=0;k<2;k++)hands[k].z+=.018*Math.sin(Math.PI*change)*(k?1:-1);
  if(isTurn){const q=active-turnStart,open=smooth(q/1.0)*(1-smooth((q-6.5)/1.5));hands[0]=P(-mix(.23,.27,open),mix(1.03,1.12,open),.13);hands[1]=P(mix(.23,.32,open),mix(1.03,1.23,open),.16);}
  const cue=cues[kind]?.[Math.floor(absoluteTime*100)]??{},bob=d.bob;
  const footYaw=side=>isTurn?d.feet[side].yaw:-yaw+(side==='left'?-.035:.035);
  p[kind]={time:absoluteTime,x:(girl?-.82:.82)+root,yaw,bob,roll:isTurn?.012*dir*Math.sin(Math.PI*d.phase):.028*Math.sin(active*Math.PI),
   headYaw:isTurn?dir*.10*Math.sin(Math.PI*(active-turnStart)/8):-.20*yaw,headPitch:.025*Math.cos(active*Math.PI*2),headRoll:dir*.025,
   leftWrist:P(hands[0].x*s,hands[0].y*s+bob,hands[0].z*s),rightWrist:P(hands[1].x*s,hands[1].y*s+bob,hands[1].z*s),leftFoot:feet.left,rightFoot:feet.right,
   leftFootYaw:footYaw('left'),rightFootYaw:footYaw('right'),leftFootPitch:0,rightFootPitch:0,
   naturalWrist:true,leftElbowPole:P(-.35,-1,-.30),rightElbowPole:P(.35,-1,-.30),
   leftPalm:P(.7,-.15,.3),rightPalm:P(-.7,-.15,.3),
   leftDirection:P(-.08,hands[0].y>1.35?.7:-.9,.3),rightDirection:P(.08,hands[1].y>1.35?.7:-.9,.3),
   leftGrip:.12,rightGrip:.12,leftGesture:{open:.35},rightGesture:{open:.35},hairSway:.012*Math.sin(active*Math.PI-.5),hairLag:isTurn?-dir*.085*Math.sin(Math.PI*d.phase):.015*Math.sin(active*Math.PI),stance:d.stance,
   face:{jaw:cue.jaw??0,width:cue.width??1,blink:blink(absoluteTime%18,girl?0:.65),gaze:[isTurn?0:girl?.12:-.12,0],smile:0}};
 }
 return p;
}
