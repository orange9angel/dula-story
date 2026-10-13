import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {torsoFrame,transformPoint} from 'dula-assets/lib/craft3d/supported-performance.js';
const V=(x,y,z=0)=>({x,y,z}),ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>V(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);
const pulse=(t,start,rise,hold,fall)=>ease((t-start)/rise)*(1-ease((t-start-rise-hold)/fall));
export const LIMITS={armLengths:[.19,.18],legLengths:[.40,.40],maxHeadTurn:.5,maxWristStep:.065};
export function posesAt(t,cues,timeline){
  const tq=Math.floor((t+1e-9)*15)/15;
  const entry=n=>timeline.segments.find(s=>s.entry===n).start;
  const since=(cue,delay=0)=>cues[cue]===undefined?-100:tq-cues[cue]-delay;
  const beat=(n,delay,rise,hold,fall)=>pulse(tq,entry(n)+delay,rise,hold,fall);
  const release=ease(since('ReleaseHand')/1.6);
  const liftR=ease(since('ShowRight')/1.3)*(1-ease(since('ShowLeft',.6)/1.3));
  const liftL=ease(since('ShowLeft',.6)/1.8)*(1-release);
  const firstTry=ease(since('TestMark',2)/.7)*(1-ease(since('TestMark',3.5)/.8));
  const secondTry=ease(since('TryAgain',.8)/1.4)*(1-ease(since('StopTrying')/.7));
  const testing=Math.max(firstTry,secondTry);
  // Narrative beats, including listener responses. Stillness between beats is intentional.
  const correct=beat(4,.08,.65,1.45,.9),joke=beat(5,.22,.8,1.15,.85);
  const explain=beat(6,.08,.65,1.7,.9),warning=beat(8,.02,.5,.65,.65);
  const stop=beat(11,.02,.5,2.1,1.1),recoil=beat(11,.20,.4,.4,1.1);
  const appointment=beat(14,.2,.85,2.2,1.0),answer=beat(15,.3,.7,1.4,.8);
  const tease=beat(16,.3,.8,1.8,1.3);
  const inspect=beat(7,-.5,.75,2.2,.8)+beat(9,0,.8,1.8,.9);
  const lookLeaf=beat(6,.2,.65,.85,.9)+beat(15,.2,.7,.8,.9);
  const result={};
  for(const key of ['lei','aoi']){
    const lei=key==='lei',sign=lei?1:-1,home=lei?-.9:.9;
    const settle=ease((t-entry(2)-.15)/1.8);
    const attention=beat(3,.1,1.0,3.2,.8)+.7*correct;
    const shift=lei?-.024*settle-.027*recoil+.018*release:-.018*correct-.024*stop+.02*tease;
    const yaw=sign*(.10+.16*settle+(lei?.04*liftL:.10*correct+.06*appointment)-.04*release);
    const p={rootX:home+shift,rootZ:lei?.025*recoil:0,yaw,bob:0,lean:0,
      headPitch:lei?.015+.15*inspect+.09*testing-.07*joke:.02+.09*correct+.06*warning-.045*tease,
      headYaw:lei?.16+.10*attention-.16*inspect:.16*lookLeaf-.22-.07*correct,
      headRoll:lei?-.06*joke+.045*recoil:.065*tease-.035*appointment,
      torso:{pivot:.86,shift:[0,-.010*(lei?testing:correct),0],
        rotation:[lei?.045*inspect-.035*recoil:.035*correct,.035*sign*(lei?liftL:stop),
          lei?-.028*joke+.022*release:.025*correct-.025*tease]},
      localArms:{},feet:{},gestures:{},fist:.1};
    const frame=torsoFrame(p.torso);
    for(const [side,s] of [['left',-1],['right',1]]){
      const sy=lei?1.375:1.295,sx=lei?.17:.156;
      const shoulder=V(s*sx,sy,0),rest=V(s*(lei?.29:.277),sy-.310,.045);
      let target=rest;
      if(lei){
        const u=side==='left'?liftL:liftR;
        target=mix(rest,V(s*.34,sy-.095,.235),u);
        if(side==='right')target=mix(target,V(.35,1.18,.14),Math.max(joke,answer));
        else target=mix(target,V(-.34,1.25,.215),joke*.25);
        target=mix(target,V(s*.31,sy-.15,.18),recoil*(side==='left'?.55:.20));
        p.gestures[side]={fist:side==='left'?.12+.5*testing:.1,open:Math.max(joke,answer)*.6};
      }else{
        if(side==='left'){
          target=mix(rest,V(-.414,1.12,.13),Math.max(correct,appointment*.7));
          target=mix(target,V(-.32,1.19,.235),Math.max(stop,warning));
        }else target=mix(rest,V(.37,1.12,.12),Math.max(explain,tease*.65));
        p.gestures[side]={fist:.06,point:side==='left'?Math.max(correct,appointment*.65):explain,
          open:side==='left'?Math.max(stop,warning):tease*.65};
      }
      const elbow=twoBone(shoulder,target,V(s*.7,-.5,.3),.19,.18);
      p.localArms[side]=[shoulder,elbow,target];
      p[side+'Arm']=p.localArms[side].map(point=>transformPoint(point,frame));
      // One finite settling step. Later weight shifts keep both world contacts fixed.
      const stepStart=entry(2)+.25,stepDuration=1.1,progress=ease((t-stepStart)/stepDuration);
      const stepping=side===(lei?'left':'right');
      const moving=stepping&&t>stepStart&&t<stepStart+stepDuration;
      const lift=moving?.035*Math.sin(Math.PI*(t-stepStart)/stepDuration):0;
      const wx=home+s*.115+(stepping?s*.045*progress:0),wz=.025+(stepping?-.045*progress:0);
      const dx=wx-p.rootX,dz=wz-p.rootZ;
      const ankle=V(Math.cos(yaw)*dx-Math.sin(yaw)*dz,.095+lift,Math.sin(yaw)*dx+Math.cos(yaw)*dz);
      const hip=transformPoint(V(s*.075,lei?.85:.83,0),frame);
      p[side+'Leg']=[hip,twoBone(hip,ankle,V(0,0,1),.4,.4),ankle];
      p.feet[side]={stance:!moving,contact:side+(stepping&&progress>=1?':settled':':initial'),yaw:0};
    }
    p.leftFist=p.gestures.left.fist;
    p.emotion=lei?(release>.5?'neutral':'worry'):'neutral';
    p.acting=lei?{fear:.16+.12*testing-.12*release,focus:.2*inspect,smile:.25*Math.max(joke,answer)}:
      {fear:0,focus:.12+.35*stop,smile:.4*tease,browAsym:.4*tease};
    p.gaze=lei?(inspect>.2||testing>.1?'mark':answer>.4?'jar':'partner'):
      (lookLeaf>.3?'jar':correct>.3||warning>.2?'mark':'partner');
    p.blink=Math.max(0,1-Math.abs(((tq+(lei?0:1.2))%4.3)-4.05)/.12);
    result[key]=p;
  }
  result.mark=.45+.25*ease(since('TestMark',2.3)/.8);
  result.phase={liftL,liftR,testing,release,correct,joke,explain,warning,stop,recoil,appointment,answer,tease};return result;
}
