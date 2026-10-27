export function probe(){
 const api=window.__art,rows=[],failures=[];
 for(const [id,shot] of Object.entries(api.staging.shots)){
  for(const q of [.08,.5,.92]){
   const t=shot.start+(shot.end-shot.start)*q,st=api.state(t),c=st.coverage;
   if(c[0]>.01||c[1]>.01||c[2]<1279.99||c[3]<719.99)failures.push({id,t,reason:'uncovered plate',c});
   for(const b of [...st.bodies,...st.faces]){
    const m=api.measureSpan(t,b.actor);
    const valid=m.placed&&m.right>m.left&&m.bottom>m.top;
    if(!valid)failures.push({id,t,actor:b.actor,reason:'actor not visible',m});
    const spec=shot.actors[b.actor];
    // Screen inserts and authored occlusion have deliberately cropped feet.
    if(!spec.screen&&!spec.occlusion&&b.y<715&&b.y>0&&valid&&Math.abs(m.bottom-b.y)>4)failures.push({id,t,actor:b.actor,reason:'rendered sole differs from authored contact',expected:b.y,measured:m.bottom});
    rows.push({shot:id,t,actor:b.actor,mode:spec.screen?'insert':spec.occlusion??'ground',span:m,contact:[b.x,b.y]});
   }
  }
 }
 if(api.missingAssets.length)failures.push({reason:'missing assets',assets:api.missingAssets});
 const checkTimes=[28.2,81.1,105,188,237,273,341,369.5,470];
 const seek=checkTimes.map(t=>({t,passed:api.seekPair(t)}));if(seek.some(x=>!x.passed))failures.push({reason:'non deterministic seek'});
 return{passed:!failures.length,scope:'64 shots at three times; actual cel alpha spans, plate coverage, deterministic seek',coverage:rows,failures,seek,limit:'Pixel placement tests do not prove perspective, anatomy, natural acting or aesthetic quality; see visual review.'};
}
