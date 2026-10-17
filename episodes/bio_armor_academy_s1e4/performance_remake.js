import {twoBone} from 'dula-assets/lib/craft3d/pose.js';
import {torsoFrame,transformPoint} from 'dula-assets/lib/craft3d/supported-performance.js';
import {createLocomotion} from 'dula-assets/lib/craft3d/locomotion.js';
const V=(x,y,z=0)=>({x,y,z}),clamp=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const lerp=(a,b,u)=>a+(b-a)*u,mix=(a,b,u)=>V(lerp(a.x,b.x,u),lerp(a.y,b.y,u),lerp(a.z,b.z,u));
const pulse=(t,s,r,h,f)=>ease((t-s)/r)*(1-ease((t-s-r-h)/f));
const gait=createLocomotion({lift:.032,turnLift:.026,heelStrike:0,toeOff:0,hipDelta:.004,sway:.009});
export const LIMITS={armLengths:[.19,.18],legLengths:[.4,.4],maxHeadTurn:.5,maxWristStep:.065};
export const GRIP_OFFSET={lei:.133,aoi:.139};
// Attention is a sequence of story decisions. Times are entry-relative arrivals;
// the eyes shift first and the viewer samples this same score later for the head.
export function attentionAt(t,tl,transition=.38){
  const e=n=>tl.segments.find(s=>s.entry===n).start;
  const scores={
    lei:[[2,0,'jar'],[3,0,'partner'],[4,.8,'mark'],[5,0,'partner'],[5,2.5,'jar'],[5,3.3,'partner'],
      [7,.2,'mark'],[10,3.8,'partner'],[12,0,'mark'],[13,-.6,'partner'],[14,.2,'mark'],[14,1.5,'partner'],
      [15,1.1,'jar'],[16,1.7,'partner'],[17,0,'partner'],[18,0,'jar'],[18,1.6,'partner'],[18,3.2,'jar']],
    aoi:[[2,0,'jar'],[3,-.25,'partner'],[4,.8,'mark'],[5,1.2,'partner'],[7,.3,'mark'],
      [10,2.6,'partner'],[10,3.5,'mark'],[11,.2,'partner'],[12,.2,'mark'],[13,1.05,'partner'],
      [15,.5,'jar'],[15,1.1,'partner'],[15,1.8,'jar'],[16,2.1,'partner'],[18,.15,'jar'],[18,1.9,'partner'],[18,3.4,'jar']]};
  return Object.fromEntries(Object.entries(scores).map(([key,score])=>{
    let previous=score[0][2],weights={partner:0,mark:0,jar:0};weights[previous]=1;
    for(const [entry,offset,target] of score){
      const at=e(entry)+offset;if(t<at-transition)break;
      const u=ease((t-at+transition)/transition);weights={partner:0,mark:0,jar:0};weights[previous]+=1-u;weights[target]+=u;
      if(t<at)break;previous=target;
    }
    return [key,weights];
  }));
}
// A bounded acceleration profile with a long constant-speed middle.
function travel(u){u=clamp(u);const a=.18;return u<a?u*u/(2*a*(1-a)):u>1-a?1-(1-u)**2/(2*a*(1-a)):(u-a/2)/(1-a);}
function grounded(x,z,yaw){return {rootX:x,rootZ:z,yaw,
  feet:{left:{x:-.115,y:.095,z:0,pitch:0,yaw:0,stance:true,contact:`left:home:${x}:${z}:${yaw}`},
    right:{x:.115,y:.095,z:0,pitch:0,yaw:0,stance:true,contact:`right:home:${x}:${z}:${yaw}`}},hipDelta:0,armSwing:0};}
function walk(t,start,end,from,to,yaw){
  const u=travel((t-start)/(end-start)),x=lerp(from[0],to[0],u),z=lerp(from[1],to[1],u);
  const f=gait.walkingFeet({from,to,facingYaw:yaw},x,z,yaw,.115,.095,.40);
  for(const side of ['left','right'])f[side].contact=`walk:${start}:${f[side].contact}`;
  return {rootX:x,rootZ:z,yaw,feet:f,hipDelta:f.hipDelta,armSwing:f.armSwing};
}
function inverseWorld(w,p,frame){
  const dx=w.x-p.rootX,dz=w.z-p.rootZ,c=Math.cos(p.yaw),s=Math.sin(p.yaw);
  return transformPoint(V(c*dx-s*dz,w.y,s*dx+c*dz),frame.clone().invert());
}
export function posesAt(t,cues,tl){
  const e=n=>tl.segments.find(s=>s.entry===n).start;
  const b=(n,d,r,h,f)=>pulse(t,e(n)+d,r,h,f);
  const release=ease((t-e(14)-.3)/1.5),show=ease((t-e(4)-.25)/1.4)*(1-release);
  const hide=b(3,0,.5,2.6,.9),joke=b(5,.2,.65,1.8,1),answer=b(16,.2,.65,1.6,1);
  const rub=b(7,.1,.7,1.3,.6),tryHard=b(9,.2,.45,1.4,.8),recoil=b(9,1.85,.23,.4,1.2);
  const warn=b(8,0,.55,1.1,.65),stop=b(10,0,.55,2.0,.85),tease=b(6,.15,.7,1.6,.9),reassure=b(17,.2,.8,2.1,1);
  const inspect=b(7,0,.7,2.3,.7)+b(8,0,.6,1.1,.6);
  const offer=e(15),take=e(16),slide=ease((t-offer-1.8)/2.1),lift=ease((t-take-1.5)/1.7);
  const jar=V(.4*(1-slide)-.14*lift,1.005+.085*lift,.30);
  const aoiHold=ease((t-offer-.05)/1.35)*(1-ease((t-offer-4.0)/1.05));
  const leiHold=ease((t-take-.1)/1.15);
  const result={jar,jarOwner:t>=take+1.25?'lei':t>=offer+1.4&&t<offer+4.0?'aoi':'table'};
  const doubt=b(11,.25,.6,1.3,.8),decision=b(14,.3,.8,1.5,1),listen=b(13,.8,.7,2.0,.9);
  // Listener reactions follow the speaker, with deterministic story-time cues.
  const caught=b(6,1.5,.25,.65,.8),aoiAmused=b(5,2.1,.5,.7,.6),
    labelReply=b(16,1.8,.55,.9,.7),invitation=b(17,.1,.6,3.3,.7),
    pleased=b(17,1.6,.5,1.8,1.2),shared=b(18,.6,.8,1.6,1);
  for(const key of ['lei','aoi']){
    const lei=key==='lei',yaw=lei?.26:-.28;
    let route=grounded(lei?-.68:.60,lei?-.10:0,yaw);
    if(lei){
      const heading=Math.atan2(1.02,.45),start=e(2)+.2,end=start+2.5;
      if(t<end)route=walk(t,start,end,[-1.7,-.55],[-.68,-.10],heading);
      else if(t<end+1.05){const u=ease((t-end)/1.05),y=lerp(heading,yaw,u);
        const f=gait.turningFeet({fromYaw:heading,toYaw:yaw,a:u},-.68,-.10,y,.115,.095);
        route={rootX:-.68,rootZ:-.10,yaw:y,feet:f,hipDelta:f.hipDelta,armSwing:0};}
      if(t>=offer+3.3)route=walk(t,offer+3.3,take-.1,[-.68,-.10],[-.14,.025],yaw);
    }else{
      if(t>=e(10))route=walk(t,e(10),e(10)+1.5,[.60,0],[.50,.09],yaw);
      if(t>=offer+4.3)route=walk(t,offer+4.3,take-.3,[.50,.09],[.64,.02],yaw);
    }
    const p={...route,bob:0,lean:0,localArms:{},feet:{},gestures:{},fist:.10,
      headPitch:lei?.025+.18*inspect+.13*tryHard-.065*joke-.045*doubt+.08*decision+.07*lift-.055*pleased:.035+.10*show+.08*stop+.045*slide-.04*tease-.035*invitation,
      headYaw:lei?.27-.22*inspect-.14*lift-.07*joke+.10*pleased:-.33+.23*slide+.05*tease-.08*invitation,
      headRoll:lei?-.030-.065*joke+.07*recoil+.05*doubt-.025*answer+.055*caught:.025+.06*tease-.055*stop-.04*reassure+.025*aoiAmused,
      torso:{pivot:.86,shift:[lei?-.007*(1-release)+.008*listen:.006,route.hipDelta-.010*(lei?tryHard:stop),0],
        rotation:[lei?.025+.045*inspect-.065*recoil-.02*release:.015+.035*stop+.025*aoiHold,0,lei?-.018-.025*joke+.03*decision:.018+.02*tease]},
      gaze:lei?(pleased>.1||answer>.1?'partner':inspect>.15||tryHard>.1?'mark':lift>.2?'jar':'partner'):
        (invitation>.1||aoiAmused>.1||tease>.1||labelReply>.1?'partner':show>.4&&t<e(11)?'mark':aoiHold>.2||t>e(18)?'jar':'partner')};
    p.gazeWeights=attentionAt(t,tl)[key];
    p.gaze=Object.entries(p.gazeWeights).sort((a,b)=>b[1]-a[1])[0][0];
    // Small discrete acknowledgements, timed to the other person's answer.
    const nod=lei?b(6,2.8,.18,.05,.36)+b(13,3.5,.24,.05,.42)+b(17,3.15,.22,.05,.4):b(3,3.5,.20,.04,.35);
    p.attentionNod=.055*nod;
    p.torso.rotation[1]=(lei?.075:-.075)*p.gazeWeights.partner*ease((t-e(3))/.6);
    const frame=torsoFrame(p.torso);
    for(const [side,s] of [['left',-1],['right',1]]){
      const sy=lei?1.375:1.295,sx=lei?.17:.156,shoulder=V(s*sx,sy,0);
      const rest=V(s*(lei?(side==='left'?.242:.229):.223),sy-(side==='left'?.345:.354),-.028+s*route.armSwing*.7);
      let target=rest;let pole=V(s*.65,-.80,.20);
      if(lei){
        if(side==='left'){
          target=mix(target,V(-.25,1.095,-.025),hide);
          target=mix(target,V(-.285,1.245,.24),show);
          target=mix(target,V(-.055,1.205,.23),rub);
          target=mix(target,V(-.27,1.24,.21),recoil);
          const hand=V(jar.x-GRIP_OFFSET.lei,jar.y+.18,jar.z-.015);
          target=mix(target,inverseWorld(hand,p,frame),leiHold);
        }else{
          target=mix(target,V(.27,1.18,.22),Math.max(joke,answer*.7));
          target=mix(target,V(.028,1.20,.27),rub);
          target.y+=rub*.012*Math.sin((t-e(7)) * Math.PI*3);
          target.z+=.075*Math.sin(Math.PI*rub);
          target.y+=.035*Math.sin(Math.PI*rub);
        }
        p.gestures[side]={fist:side==='left'?.08+.56*tryHard+.2*leiHold:.08,open:side==='right'?.65*Math.max(joke,answer):.38*release*(1-leiHold)};
      }else{
        if(side==='right'){target=V(.25,1.095,.20);pole=V(.65,-.5,-.12);}
        else {
          // The inward jar reach needs a forward elbow arc above the tabletop.
          // Keep the relaxed downward elbow during all other acting beats.
          pole=V(-.65,lerp(-.80,-.45,aoiHold),lerp(.20,.95,aoiHold));
          target=mix(target,V(-.31,1.14,.22),Math.max(warn,stop));
          target=mix(target,V(-.25,1.10,.18),Math.max(tease*.6,reassure*.45));
          target=mix(target,inverseWorld(V(jar.x+GRIP_OFFSET.aoi,jar.y+.18,jar.z-.015),p,frame),aoiHold);
          target.y+=.28*Math.sin(Math.PI*aoiHold);
          target.y+=.065*Math.exp(-Math.pow((aoiHold-.26)/.11,2))*Math.sin(Math.PI*aoiHold);
          target.x+=.07*Math.sin(Math.PI*aoiHold);
          target.z+=.11*Math.sin(Math.PI*aoiHold);
        }
        p.gestures[side]={fist:side==='right'?.20:.06+.20*aoiHold,open:side==='left'?Math.max(warn,stop)*.7:0};
      }
      const distance=Math.hypot(target.x-shoulder.x,target.y-shoulder.y,target.z-shoulder.z);
      if(distance>.37)throw new Error(key+' '+side+' unreachable '+distance.toFixed(5)+' at '+t);
      p.localArms[side]=[shoulder,twoBone(shoulder,target,pole,.19,.18),target];
      p[side+'Arm']=p.localArms[side].map(x=>transformPoint(x,frame));
      const f=route.feet[side],ankle=V(f.x,f.y,f.z),hip=transformPoint(V(s*.075,lei?.85:.83,0),frame);
      p[side+'Leg']=[hip,twoBone(hip,ankle,V(0,0,1),.4,.4),ankle];
      p.feet[side]={...f,yaw:p.yaw+f.yaw};
    }
    p.leftFist=p.gestures.left.fist;
    p.emotion='neutral';
    p.acting=lei?{fear:.12*tryHard+.5*recoil+.28*doubt,focus:.2*inspect,
      smile:.18*hide+.65*joke+.42*caught+.58*answer+.72*pleased+.32*shared+.20*decision,
      eyeSmile:.25*joke+.45*pleased+.18*shared,browLift:.15*hide+.4*caught+.35*recoil+.2*pleased,
      browAsym:.55*joke+.42*answer}:
      {fear:.12*recoil+.10*listen,focus:.48*stop+.08*inspect,
      smile:.32*aoiAmused+.55*tease+.32*labelReply+.72*reassure+.35*shared,
      eyeSmile:.2*tease+.35*reassure+.15*shared,browLift:.16*invitation+.12*listen,
      browAsym:.5*tease+.28*labelReply};
    const blinks=lei?[5.6,11.65,19.8,24.25,35.5,42.1,48.3,54.8,63.6,69.1,75.7]:[4.2,14.85,21.6,28.7,35.95,44.8,53.3,58.1,64.0,74.3,78.0];
    p.blink=Math.max(...blinks.map(at=>Math.max(0,1-Math.abs(t-at)/.12)));
    result[key]=p;
  }
  result.mark=.38+.48*ease((t-e(9)-1.1)/.7);
  result.phase={show,hide,rub,tryHard,recoil,release,slide,lift,aoiHold,leiHold};
  return result;
}
