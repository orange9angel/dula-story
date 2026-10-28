// Pilot blocking only. Other story cues remain explicitly outside this test.
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const V=(x,y,z=0)=>({x,y,z}),mix=(a,b,u)=>Object.fromEntries(['x','y','z'].map(k=>[k,a[k]+(b[k]-a[k])*u]));
export function performPilot(actors,t,cues){
 const start=cues.sing_to_me.start,heart=cues.wooden_heartbeat.start,song=cues.borrow_a_melody.start;
 const reach=ease((t-(start+4.8))/3.3),release=ease((t-(song+3))/3),hold=reach*(1-release);
 const result={};
 for(const [id,actor] of Object.entries(actors)){
  const d=actor.dims,s={root:{Noa:[.65,.045,0],Pip:[-.33,.045,.18],Selene:[1.6,.045,-.05],Vesper:[-2.3,.045,-1.55]}[id]};
  s.left=V(-d.half-.04,d.hip+.09,.04);s.right=V(d.half+.04,d.hip+.09,.04);
  s.headYaw={Noa:.4,Selene:-.4,Pip:.45,Vesper:.3}[id];s.headPitch=0;s.headRoll=0;
  const blink=Math.max(0,1-Math.abs(((t+{Noa:0,Pip:1.2,Selene:.7,Vesper:2}[id])%4.8)-4.5)/.09);
  const face={blink,jaw:0,smile:id==='Noa'?.25:0,worry:id==='Selene'?.7:0,gaze:s.headYaw};
  if(id==='Noa'){
   s.right=mix(s.right,V(.43,1.04,.18),hold);s.rightGesture={fist:.18*hold};s.headPitch=-.04*hold;
   s.left=mix(s.left,V(-.26,1.05,.20),ease((t-start)/1.1)*(1-ease((t-(start+3.8))/1.2)));
   face.smile=.2+.28*hold;
  }
  if(id==='Selene'){
   s.left=mix(s.left,V(-.44,1.04,.23),hold);s.leftGesture={fist:.16*hold};s.headPitch=.07-.13*hold;face.worry=.7-.55*hold;face.smile=.22*hold;
  }
  if(id==='Pip'){
   const active=ease((t-heart)/.6),beat=Math.max(0,1-((t-heart+10)%(.77))/.18)*active;
   s.right=mix(s.right,V(.018,.79,.145+.035*(1-beat)),active);s.rightGesture={fist:.35*active};s.headRoll=.035*Math.sin((t-heart)*4)*active;face.smile=.45*active;
  }
  actor.setPose(s);actor.setFace(face);result[id]={pose:s,face,limbs:actor.report};
 }
 return {actors:result,handhold:hold,contactActive:hold>.999};
}
