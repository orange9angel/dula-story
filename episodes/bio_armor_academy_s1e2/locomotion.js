// Episode-local finite footsteps. +Z is forward; +X is the character's right.
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const local=(wx,wz,rootX,rootZ,yaw)=>{
  const x=wx-rootX,z=wz-rootZ,c=Math.cos(yaw),s=Math.sin(yaw);
  return {x:c*x-s*z,z:s*x+c*z};
};

export function walkingFeet(walk,rootX,rootZ,yaw,half,footY,stride){
  const {from,to}=walk,dx=to[0]-from[0],dz=to[1]-from[1],D=Math.hypot(dx,dz);
  const heading=walk.facingYaw??Math.atan2(dx,dz),rightX=Math.cos(heading),rightZ=-Math.sin(heading);
  const distance=clamp(((rootX-from[0])*dx+(rootZ-from[1])*dz)/(D*D))*D;
  // stride is the distance between consecutive landings of the SAME foot.
  const count=Math.max(1,Math.ceil(D/(stride*.5))),h=D/count;
  const j=Math.min(count,Math.floor(distance/h+.5));
  const lo=j===0?0:(j-.5)*h,hi=j===count?D:(j+.5)*h;
  const phase=clamp((distance-lo)/(hi-lo)),q=ease((phase-.08)/.84);
  const moving=j%2===0?'left':'right',result={};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const swing=side===moving,old=Math.max(0,(j-1)*h),next=Math.min(D,(j+1)*h);
    const pd=swing?mix(old,next,q):Math.min(D,j*h);
    // A startled backstep widens only as each foot actually changes landing.
    const footHalf=mix(walk.startHalf??half,half,clamp(pd/D));
    const wx=from[0]+dx/D*pd+rightX*sign*footHalf,wz=from[1]+dz/D*pd+rightZ*sign*footHalf;
    const lift=swing?.060*Math.sin(Math.PI*q):0,pitch=swing?.16*Math.sin(2*Math.PI*q):0;
    result[side]={...local(wx,wz,rootX,rootZ,yaw),y:footY+lift,pitch,
      yaw:angleDelta(yaw,heading),stance:!swing||q===0||q===1,
      contact:`${side}:${swing?(q===1?next:old):pd}`};
  }
  const movingSign=moving==='left'?-1:1,envelope=Math.sin(Math.PI*phase)**2;
  return {...result,g:(j+phase)/2,phase,step:j,steps:count+1,heading,
    sway:-movingSign*.016*envelope,hipDelta:.008*envelope,
    armSwing:Math.max(-.11,Math.min(.11,(result.left.z-result.right.z)*.24))};
}

export function turningFeet(turn,rootX,rootZ,yaw,half,footY){
  const delta=angleDelta(turn.fromYaw,turn.toYaw),count=Math.max(1,Math.ceil(Math.abs(delta)/.9));
  const progress=clamp(turn.a)*(count+1),j=Math.min(count,Math.floor(progress));
  const phase=progress>=count+1?1:progress-j,q=ease((phase-.06)/.88);
  const moving=j%2===0?'left':'right',result={};
  for(const [side,sign] of [['left',-1],['right',1]]){
    const swing=side===moving,old=Math.max(0,j-1)/count,next=Math.min(count,j+1)/count;
    const a0=turn.fromYaw+delta*(swing?old:Math.min(count,j)/count);
    const a1=turn.fromYaw+delta*(swing?next:Math.min(count,j)/count);
    const wx=rootX+sign*half*mix(Math.cos(a0),Math.cos(a1),q);
    const wz=rootZ-sign*half*mix(Math.sin(a0),Math.sin(a1),q);
    const heading=mix(a0,a1,q);
    result[side]={...local(wx,wz,rootX,rootZ,yaw),y:footY+(swing?.038*Math.sin(Math.PI*q):0),
      pitch:0,yaw:angleDelta(yaw,heading),stance:!swing||q===0||q===1,
      contact:`turn:${side}:${swing?(q===1?next:old):Math.min(count,j)/count}`};
  }
  return {...result,g:0,phase,step:j,steps:count+1,hipDelta:-.008*Math.sin(Math.PI*phase)**2,sway:0,armSwing:0};
}
