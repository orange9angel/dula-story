// Episode-specific known moving frame and drawing controls; shared runner owns execution.
export function probe(){
 const report=(()=>{
  const d=window.__dbg,t=163+140/30,original=window.renderAt(t).image;
  const curve=d.poseEdits.curves[0],keys=curve.keys;curve.keys=keys.map(k=>[k[0],0,0]);
  const edited=window.renderAt(t).image;curve.keys=keys;
  // The charge head is static in the source bake. Probe a frame with measured
  // nonzero source displacement during release instead of assuming motion.
  const releaseTime=168.5,releaseOriginal=window.renderAt(releaseTime).image;
  const frame=d.motion.frames[165],head=frame.actors.aoao.world.head,reference=d.motion.frames[167].actors.aoao;
  frame.actors.aoao.world.head=reference.world.head.map((v,i)=>v-reference.root[i]+frame.actors.aoao.root[i]);
  const unbaked=window.renderAt(releaseTime).image;frame.actors.aoao.world.head=head;
  const restored=window.renderAt(t).image;let maxAnchorDrift=0;
  for(const time of [163,165.9,167.9,168.15,168.5,171.05,171.5,172.7,173.8]){
   window.renderAt(time);
   for(const [key,rig]of Object.entries(d.rigs))for(const p of rig.pins){const q=d.deform(key,...p,time);maxAnchorDrift=Math.max(maxAnchorDrift,Math.hypot(q[0]-p[0],q[1]-p[1]));}
  }
  return{twoDOverridesAffectPixels:original!==edited,baked3DHeadAffectsPixels:releaseOriginal!==unbaked,restoredIdentical:original===restored,maxAnchorDriftImagePixels:maxAnchorDrift,scope:'Drawing-space pins; does not prove physical or background contact',probeTimes:{twoD:t,threeD:releaseTime}};
 })();
 report.passed=report.twoDOverridesAffectPixels&&report.baked3DHeadAffectsPixels&&report.restoredIdentical&&report.maxAnchorDriftImagePixels<1e-6;
 return report;
}
