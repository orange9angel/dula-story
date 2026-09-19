import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const smooth = t => { t=clamp(t,0,1); return t*t*(3-2*t); };

export function prepareFace(c) {
  if (c.beatFace) return;
  const ink = new THREE.MeshBasicMaterial({color:0x322333});
  const eyes = [-1,1].map(side => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-.050,0,0),new THREE.Vector3(0,.055,.006),new THREE.Vector3(.050,0,0));
    const arc = new THREE.Mesh(new THREE.TubeGeometry(curve,20,.008,8,false),ink);
    arc.position.set(side*.105,.016,.296);
    c.headGroup.add(arc); return arc;
  });
  const shape=new THREE.Shape();
  shape.moveTo(-.046,0);shape.quadraticCurveTo(0,-.008,.046,0);
  shape.quadraticCurveTo(.032,-.049,0,-.050);shape.quadraticCurveTo(-.032,-.049,-.046,0);
  const smile = new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0x5c2433,side:THREE.DoubleSide}));
  smile.position.z=.013;c.mouth.add(smile);
  const tongue=new THREE.Mesh(new THREE.SphereGeometry(.018,16,8),new THREE.MeshBasicMaterial({color:0xf28399}));
  tongue.scale.set(1.2,.35,.12);tongue.position.set(0,-.036,.015);c.mouth.add(tongue);
  c.beatFace={eyes,smile,tongue};
}

export function perform(c, camera, scene, t, entry, hits) {
  prepareFace(c);
  const options=entry.storyEvents.find(e=>e.options?.action==='AdPose').options;
  const {pose,expression,edit}=options;
  const local=t-entry.startTime, duration=entry.endTime-entry.startTime;
  const previous=hits.findLast(h=>h.time<=t);
  const next=hits.find(h=>h.time>t);
  const since=previous ? t-previous.time : 99;
  const until=next ? next.time-t : 99;
  const strength=previous ? clamp(previous.strength/.07,.45,1.2) : .5;
  const pulse=Math.exp(-since*16)*strength;
  const lift=until<.17 ? Math.sin(Math.PI*until/.17)**2 : 0;
  const last=pose==='finale';
  const frozen=last && local>=.299999;
  const p=frozen?0:pulse;
  // Absolute pose after the engine update: no random auto-blink, pose blending,
  // or accumulated frame delta may displace a planned facial apex.
  c.mesh.userData.adPose=pose;
  c.mesh.position.set(0,-.03+(frozen?0:.035*lift),0);
  c.mesh.rotation.set(0,pose==='step'?.17*Math.sin(t*7):-.06,0);
  c.mesh.scale.set(1+p*.018,1-p*.025,1+p*.018);
  c.leftLeg.rotation.set(pose==='step'?.27*Math.sin(t*7):0,0,0);
  c.rightLeg.rotation.set(pose==='step'?-.27*Math.sin(t*7):0,0,0);
  c.leftArm.rotation.set(-.2,0,-.48);
  c.rightArm.rotation.set(-.5,0,1.8);
  c.headGroup.rotation.set(.02,0,(pose==='wink'?.12:pose==='swing'?-.12:0)-p*.055);
  if(pose==='pop'||pose==='swing') {
    c.leftArm.rotation.z=-1.35-p*.2;c.rightArm.rotation.z=1.35+p*.2;
  }
  if(pose==='turn') {
    c.leftArm.rotation.z=-.8;c.rightArm.rotation.z=.8;
    c.headGroup.rotation.z=-.12;
  }
  c.leftTail.rotation.z=c.leftTail.userData.baseRotZ-(frozen?0:.065*Math.sin(t*8));
  c.rightTail.rotation.z=c.rightTail.userData.baseRotZ+(frozen?0:.065*Math.sin(t*8));
  c.ahoge.rotation.z=.6+(frozen?0:p*.22);

  let face=expression;
  // A readable squeeze 2-4 frames before the cut, followed by the new expression
  // on the attack. Avoid blink flutter on every beat.
  if (!last && edit==='snap' && entry.endTime-t<.12) face='squeeze';
  const leftClosed=['wink','grin','squeeze'].includes(face);
  const rightClosed=['grin','squeeze'].includes(face);
  c.leftEye.scale.set(1,face==='surprise'?1.08:1,1);
  c.rightEye.scale.copy(c.leftEye.scale);
  c.leftEye.visible=!leftClosed;c.rightEye.visible=!rightClosed;
  c.leftEyelid.visible=false;c.rightEyelid.visible=false;
  c.beatFace.eyes[0].visible=leftClosed;c.beatFace.eyes[1].visible=rightClosed;
  c.leftEyebrow.position.y=face==='surprise'?.17:.15;
  c.rightEyebrow.position.y=face==='curious'?.17:c.leftEyebrow.position.y;
  c.leftEyebrow.rotation.z=Math.PI/2-.15;
  c.rightEyebrow.rotation.z=Math.PI/2+.15;
  c.mouth.scale.set(1,1,1);c.mouth.position.y=c.mouthBaseY;
  const open=['grin','wink'].includes(face);
  c.upperLip.visible=!open && face!=='surprise';
  c.lowerLip.visible=false;
  c.beatFace.smile.visible=open;c.beatFace.tongue.visible=open;
  c.mouthCavity.visible=face==='surprise';
  c.mouthCavity.scale.set(1.05,1.65,.6);
  c.mouthCavity.position.z=.016;

  // The main spin is CAMERA ROLL in post-camera space. It finishes at the next
  // musical attack; the character keeps facing the viewer throughout.
  let roll=0;
  if(edit==='spin') {
    const u=smooth((local-(duration-.44))/.44);
    roll=Math.PI*2*u;
    camera.fov=42+17*Math.sin(u*Math.PI);
  } else if(edit==='tilt') {
    roll=(entry.index%2?1:-1)*.09*Math.exp(-local*7);
  }
  camera.rotateZ(roll);
  if(edit!=='spin') camera.fov*=1-(edit==='burst'?.09:.035)*p;
  camera.updateProjectionMatrix();
  // Set the palette immediately after the pose (the scene normally reads it
  // one update earlier). All ornament pulses use detected attacks.
  scene.update(frozen?entry.startTime+.3:t,0);
  scene.halo.scale.setScalar(1+.07*p);
  scene.footRing.scale.setScalar(1+.18*p);
  return {pose,face,edit,local,pulse:p,roll,until,nearestOnset:previous?.time??null,
    apexErrorMs:Math.round(since*1000),frozen};
}
