import * as THREE from 'three';
const V=()=>new THREE.Vector3();

// Include partially applied poses and both sides of action boundaries. Only
// checking fully locked grips misses the actual reach and release transitions.
export function inspectTransitions(episode,camera){
  const B=episode.plan.beats,out=[];
  for(const [name,start,end] of [
    ['pause_drawing',B.lift-1.2,B.lift+1],['resume_drawing',B.draw-1.6,B.draw+.25],
    ['offer_paper',B.offer-.7,B.offer+1.8],['release_paper',B.accept-1,B.accept+1]
  ]){
    const metrics={name,start,end,sampleRate:60,penStep:0,penRotation:0,hands:{}};let previous;
    for(let i=0;i<=Math.round((end-start)*60);i++){
      const t=start+i/60,state=episode.update(t,camera),pen={p:episode.pencil.position.clone(),q:episode.pencil.quaternion.clone()},hands={};
      for(const [kind,kid] of [['girl',episode.girl],['boy',episode.boy]])for(const side of ['left','right']){
        const key=kind+'_'+side,hand=kid.hands[side];
        hands[key]={p:hand.getWorldPosition(V()),q:hand.getWorldQuaternion(new THREE.Quaternion()),elbow:V().copy(state[kind][side+'Arm'][1])};
        metrics.hands[key]??={wristStep:0,rotationStep:0,elbowStep:0};
        if(previous){
          const a=hands[key],b=previous.hands[key],m=metrics.hands[key],step=a.p.distanceTo(b.p),rotation=a.q.angleTo(b.q)*180/Math.PI,elbow=a.elbow.distanceTo(b.elbow);
          if(step>m.wristStep){m.wristStep=step;m.wristAt=t;}
          if(rotation>m.rotationStep){m.rotationStep=rotation;m.rotationAt=t;}
          if(elbow>m.elbowStep){m.elbowStep=elbow;m.elbowAt=t;}
        }
      }
      if(previous){
        const step=pen.p.distanceTo(previous.pen.p),rotation=pen.q.angleTo(previous.pen.q)*180/Math.PI;
        if(step>metrics.penStep){metrics.penStep=step;metrics.penAt=t;}metrics.penRotation=Math.max(metrics.penRotation,rotation);
      }
      previous={pen,hands};
    }out.push(metrics);
  }
  return out;
}
