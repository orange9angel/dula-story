// Absolute-time pose evaluation: playback and direct seek share the same result.
export const clamp = (x, a=0, b=1) => Math.max(a, Math.min(b, x));
export const smooth = x => { x=clamp(x); return x*x*(3-2*x); };
export const mix = (a,b,t) => a+(b-a)*t;
export const lerp = (a,b,t) => ({x:mix(a.x,b.x,t), y:mix(a.y,b.y,t)});
const pt = (x,y) => ({x,y});

export function solveKnee(hip, ankle, bend=1, a=.305, b=.295) {
  const dx=ankle.x-hip.x,dy=ankle.y-hip.y, raw=Math.hypot(dx,dy);
  const d=clamp(raw,.001,a+b-.0001), ux=dx/(raw||1),uy=dy/(raw||1);
  const along=(a*a-b*b+d*d)/(2*d), h=Math.sqrt(Math.max(0,a*a-along*along));
  return pt(hip.x+ux*along-uy*h*bend, hip.y+uy*along+ux*h*bend);
}

export function samplePose(time, kind, duration, {quantize=true}={}) {
  const t=quantize ? Math.floor((time+1e-7)*15)/15 : time;
  const phase=clamp(t/duration);
  let rootX=0,hipY=.688,bob=0,turn=0, lean=0, point=0, anticipation=0;
  let leftFoot=pt(-.09,.095),rightFoot=pt(.09,.095);
  let leftLift=0,rightLift=0,leftContact=true,rightContact=true;
  if(kind==='walk') {
    hipY=.651;
    // Foot positions are authored in WORLD space. During stance they never move.
    // Alternating swings include a lifted arc, then an explicit landing hold.
    const q=phase*3.4;
    const foot=(initial,swings)=>{
      let x=initial,y=.095,lift=0,contact=true;
      for(const [start,end,target] of swings) {
        if(q<start)break;
        if(q>=end){x=target;continue;}
        const u=(q-start)/(end-start);
        x=mix(x,target,smooth(u));lift=Math.sin(Math.PI*u)*.13;
        y+=lift;contact=false;break;
      }
      return {x,y,lift,contact};
    };
    const lf=foot(-.38,[[.22,.78,-.06],[1.54,2.12,.35]]);
    const rf=foot(-.20,[[.88,1.46,.15],[2.23,2.80,.51]]);
    leftFoot=lf;rightFoot=rf;leftLift=lf.lift;rightLift=rf.lift;
    leftContact=lf.contact;rightContact=rf.contact;
    rootX=mix(-.29,.43,smooth((q-.05)/3.10));
    const moving=smooth(q/.22)*(1-smooth((q-2.85)/.35));
    bob=-.018*Math.sin(q*Math.PI/.66)**2*moving;
    hipY+=bob;lean=.025*moving;turn=.24;
  } else {
    anticipation=smooth((t-.23)/.32)*(1-smooth((t-.69)/.25));
    point=smooth((t-.62)/.38)*(1-smooth((t-2.30)/.52));
    lean=-.010*anticipation+.019*point;turn=.07*point;
    bob=-.012*anticipation;hipY+=bob;
  }
  const hipLeft=pt(rootX-.075,hipY),hipRight=pt(rootX+.075,hipY);
  const kneeLeft=solveKnee(hipLeft,leftFoot,kind==='walk'?1:-1);
  const kneeRight=solveKnee(hipRight,rightFoot,1);
  const shoulderLeft=pt(rootX-.18+lean,1.075+bob);
  const shoulderRight=pt(rootX+.18+lean,1.075+bob);
  let elbowLeft=pt(rootX-.27, .91+bob),wristLeft=pt(rootX-.255,.76+bob);
  let elbowRight=pt(rootX+.265,.91+bob),wristRight=pt(rootX+.26,.76+bob);
  if(kind==='point') {
    elbowRight=lerp(elbowRight,pt(rootX+.34,.98+bob),point);
    wristRight=lerp(wristRight,pt(rootX+.53,1.10+bob),point);
    elbowRight=lerp(elbowRight,pt(rootX+.29,.96),anticipation*.65);
    wristRight=lerp(wristRight,pt(rootX+.29,1.08),anticipation*.70);
    elbowLeft=lerp(elbowLeft,pt(rootX-.31,.925),point);
    wristLeft=lerp(wristLeft,pt(rootX-.19,.815),point);
  } else {
    const stride=rightFoot.x-leftFoot.x;
    elbowRight.x+=stride*.13;wristRight.x+=stride*.25;
    elbowLeft.x-=stride*.13;wristLeft.x-=stride*.25;
    wristRight.y+=.035;wristLeft.y+=.035;
  }
  return {t,kind,rootX,hipY,bob,turn,lean,point,anticipation,
    head:pt(rootX+lean,1.325+bob),
    leftArm:[shoulderLeft,elbowLeft,wristLeft],rightArm:[shoulderRight,elbowRight,wristRight],
    leftLeg:[hipLeft,kneeLeft,leftFoot],rightLeg:[hipRight,kneeRight,rightFoot],
    leftLift,rightLift,leftContact,rightContact,
    leftFootPitch:0,rightFootPitch:0,
    blink:Math.max(0,1-Math.abs(t-(kind==='point'?2.8:2.98))/.10)};
}
