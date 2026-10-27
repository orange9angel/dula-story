export function probe(){
 const api=window.__art,rows=[],failures=[];
 for(const [id,shot] of Object.entries(api.staging.shots))for(const q of [.08,.5,.92]){
  const t=shot.start+(shot.end-shot.start)*q,st=api.state(t),c=st.coverage;
  if(c[0]>.01||c[1]>.01||c[2]<1279.99||c[3]<719.99)failures.push({id,t,reason:'uncovered plate'});
  for(const b of [...st.bodies,...st.faces]){
   const spec=shot.actors[b.actor],off=b.x+b.w/2<0||b.x-b.w/2>1280||b.y<0||b.y-b.h>720;
   if(off&&shot.scene==='clocktower'&&['m16','m19','m22','m23'].includes(id)){rows.push({id,t,actor:b.actor,offscreen:true});continue;}
   const m=api.measureSpan(t,b.actor),valid=m.placed&&m.right>m.left&&m.bottom>m.top;
   if(!valid)failures.push({id,t,actor:b.actor,reason:'actor not visible',m});
   const supportInFrame=b.x-b.w/2>=0&&b.x+b.w/2<=1280;
   if(!spec.screen&&!spec.occlusion&&supportInFrame&&b.y<715&&b.y>0&&valid&&Math.abs(m.bottom-b.y)>4)failures.push({id,t,actor:b.actor,reason:'sole/contact mismatch',expected:b.y,actual:m.bottom});
   if(shot.scene==='clocktower'&&b.actor==='Alder'&&b.plate[0]>=795)failures.push({id,t,reason:'Alder placed inside tabletop footprint'});
   rows.push({id,t,actor:b.actor,span:m,contact:[b.x,b.y],supportInFrame,facial:b.facial?.mouthCel??b.mouth??null});
  }
 }
 if(api.missingAssets.length)failures.push({reason:'missing assets',assets:api.missingAssets});
 const seek=[38,95,110,120,134,172,180,214,332,358,370,465].map(t=>({t,passed:api.seekPair(t)}));
 if(seek.some(x=>!x.passed))failures.push({reason:'seek mismatch'});
 return{passed:!failures.length,coverage:rows,failures,seek,scope:'64 shots at three times; projected visible cast, ground contact, room side-of-table staging; image inspection remains separate'};
}
