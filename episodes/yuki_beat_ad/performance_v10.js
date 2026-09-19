import * as THREE from 'three';

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const down=v(0,-1,0);
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.66});

export function buildDanceRig(c){
  if(c.danceRig)return;
  const skin=mat(0xffe3d0),sock=mat(0xffffff),shoe=mat(0x27324e);
  const limbs={};
  function segment(parent,length,radius,material){
    const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,Math.max(.005,length-2*radius),4,12),material);
    mesh.position.y=-length/2;mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  function joint(parent,radius){const m=new THREE.Mesh(new THREE.SphereGeometry(radius,16,12),skin);parent.add(m);}
  for(const side of [-1,1]){
    const name=side<0?'left':'right';
    const arm=c[name+'Arm'];
    // Preserve wardrobe sleeves, replace the original single-piece skin arm.
    arm.traverse(o=>{if(o.isMesh&&o.material?.color?.getHex()===0xffe3d0)o.visible=false;});
    const group=new THREE.Group();c.mesh.add(group);group.position.copy(arm.position);
    const upper=new THREE.Group(),lower=new THREE.Group();group.add(upper);upper.add(lower);lower.position.y=-.17;
    segment(upper,.17,.038,skin);segment(lower,.18,.034,skin);
    joint(lower,.037);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(.047,16,12),skin);
    hand.position.y=-.18;lower.add(hand);
    limbs[name+'Arm']={group,upper,lower,hand,l1:.17,l2:.18,origin:arm.position.clone(),sleeve:arm,side};
    const oldLeg=c[name+'Leg'];oldLeg.visible=false;
    const leg=new THREE.Group();c.mesh.add(leg);leg.position.copy(oldLeg.position);
    const thigh=new THREE.Group(),shin=new THREE.Group();leg.add(thigh);thigh.add(shin);shin.position.y=-.285;
    segment(thigh,.285,.048,skin);segment(shin,.315,.043,skin);
    joint(shin,.048);
    const stocking=segment(shin,.16,.052,sock);stocking.position.y=-.21;
    const foot=new THREE.Mesh(new THREE.SphereGeometry(.075,20,12),shoe.clone());
    foot.geometry.translate(0,0,.018);foot.scale.set(.9,.55,1.45);foot.position.set(0,-.315,0);shin.add(foot);
    limbs[name+'Leg']={group,upper:thigh,lower:shin,hand:foot,l1:.285,l2:.315,origin:oldLeg.position.clone(),side};
  }
  // Headset frees both hands for choreography and leaves the mouth unobscured.
  const headset=new THREE.Group();c.headGroup.add(headset);
  const dark=mat(0x252331);
  const cup=new THREE.Mesh(new THREE.SphereGeometry(.037,16,12),dark);
  cup.scale.set(.35,1,1);cup.position.set(.3,.01,.015);headset.add(cup);
  const curve=new THREE.CatmullRomCurve3([v(.3,.01,.04),v(.34,-.07,.16),v(.26,-.13,.28),v(.16,-.12,.32)]);
  const boom=new THREE.Mesh(new THREE.TubeGeometry(curve,28,.007,8,false),dark);headset.add(boom);
  const capsule=new THREE.Mesh(new THREE.SphereGeometry(.019,16,12),dark);
  capsule.position.set(.16,-.12,.32);capsule.scale.set(1.4,.75,.75);headset.add(capsule);
  c.danceRig={limbs,headset,capsule};
}

function solve(limb,target,pole){
  const delta=target.clone().sub(limb.origin),raw=delta.length();
  const dist=clamp(raw,Math.abs(limb.l1-limb.l2)+.001,limb.l1+limb.l2-.001);
  const direction=delta.normalize();
  const bend=pole.clone().addScaledVector(direction,-pole.dot(direction)).normalize();
  const along=(limb.l1**2-limb.l2**2+dist**2)/(2*dist);
  const height=Math.sqrt(Math.max(0,limb.l1**2-along**2));
  const elbow=direction.clone().multiplyScalar(along).addScaledVector(bend,height);
  limb.upper.quaternion.setFromUnitVectors(down,elbow.clone().normalize());
  const fore=direction.clone().multiplyScalar(dist).sub(elbow).normalize();
  fore.applyQuaternion(limb.upper.quaternion.clone().invert());
  limb.lower.quaternion.setFromUnitVectors(down,fore);
  if(limb.sleeve)limb.sleeve.quaternion.copy(limb.upper.quaternion);
  // Ankle counter-rotation keeps the shoe level at planted contacts.
  if(!limb.sleeve)limb.hand.quaternion.copy(limb.upper.quaternion.clone().multiply(limb.lower.quaternion).invert());
  return raw>limb.l1+limb.l2?raw-(limb.l1+limb.l2):0;
}

function rhythm(t,beats){
  let i=beats.findLastIndex(b=>b<=t);
  if(i<0)i=0;
  const per=beats[i+1]-beats[i]||.48;
  return {i,phase:clamp((t-beats[i])/per),period:per};
}

function authoredPose(opts,entry,t,beats){
  const local=t-entry.startTime,dur=entry.endTime-entry.startTime,u=clamp(local/dur);
  const {i,phase,period}=rhythm(t,beats),ang=(i+phase)*Math.PI;
  const impact=((1+Math.cos(phase*2*Math.PI))/2)**3;
  const p={x:0,y:-.02,rotY:0,lean:0,head:0,air:0,
    left:v(-.32,.87,.12),right:v(.32,.87,.12),
    footL:v(-.09,.044,.03),footR:v(.09,.044,.03)};
  const side=Math.sin(ang),breathe=Math.sin(phase*Math.PI);
  p.y-=.018*impact;p.head=.035*side;
  const open=(height=1.07,width=.46)=>{p.left.set(-width,height,.10);p.right.set(width,height,.10);};
  switch(opts.move){
    case 'invite':
      p.x=.025*side;p.lean=.018*side;p.left.set(-.36,.98,.21);
      p.right.set(.32,1.12+.045*Math.sin(ang),.23);break;
    case 'sing_out':
      open(1.18,.40);p.head=-.035;p.y+=.012*breathe;break;
    case 'present':
      p.left.set(-.40,1.12,.10);p.right.set(.40,1.14,.16);p.rotY=.13*Math.sin(Math.PI*u);break;
    case 'point_you':
      p.right.set(.23,1.1,.33);p.left.set(-.38,.90,.08);p.head=-.04;break;
    case 'open_arms':
      open(1.08+.08*ease(u),.46);p.rotY=.04*side;break;
    case 'star_reach':
      p.left.set(-.40,1.27,.08);p.right.set(.36,.96,.15);p.head=-.05;break;
    case 'heart_hit':
      p.left.set(-.13,1.04,.27);p.right.set(.13,1.04,.27);
      p.y-=.025*impact;p.lean=.025*side;break;
    case 'step_left': case 'step_right': {
      const sign=opts.move==='step_left'?-1:1;
      const land=Number(opts.land),a=ease((t-entry.startTime)/Math.max(.14,land-entry.startTime));
      const from=Number(opts.fromX)||0,to=Number(opts.toX)||0;
      p.x=mix(from,to,a);
      // Lead foot arrives on the contact; trailing foot follows over half a beat.
      const trail=ease((t-land)/Math.min(.32,dur*.35));
      const leadFoot=sign<0?p.footL:p.footR,trailFoot=sign<0?p.footR:p.footL;
      leadFoot.x=mix(from+sign*.09,to+sign*.09,a);
      leadFoot.y+=.085*Math.sin(Math.PI*a);
      trailFoot.x=mix(from-sign*.09,to-sign*.09,trail);
      trailFoot.y+=.06*Math.sin(Math.PI*trail);
      p.left.set(-.36,1.0+(sign<0?.16:0),.14);p.right.set(.36,1.0+(sign>0?.16:0),.14);
      p.lean=-sign*.025*Math.sin(Math.PI*a);return p;
    }
    case 'step_touch': case 'groove': {
      // Four contacts form a repeated side/touch/side/touch phrase, not a jump.
      const swing=Math.sin(ang),lift=Math.sin(Math.PI*phase);
      const enter=ease(local/.24),exit=ease((dur-local)/.22);
      p.x=.055*swing*enter*exit+(Number(opts.fromX)||0)*(1-enter);
      p.lean=-.035*swing;
      p.footL.x=-.11;p.footR.x=.11;
      if(i%2===0){p.footL.y+=.07*lift;p.footL.z+=.10*lift;}
      else{p.footR.y+=.07*lift;p.footR.z+=.10*lift;}
      p.left.set(-.36,1.02+.10*side,.17);p.right.set(.36,1.02-.10*side,.17);
      p.rotY=.10*side;return p;
    }
    case 'double_hop': {
      const contacts=beats.filter(b=>b>=entry.startTime+.25&&b<entry.endTime-.035);
      if(!contacts.length)contacts.push(entry.endTime-.08);
      for(const land of contacts){
        const takeoff=land-Math.min(.34,period*.70),dt=t-takeoff;
        if(dt>=0&&t<land){p.air=Math.max(p.air,Math.sin(Math.PI*dt/(land-takeoff)));}
        if(t>=land&&t<land+.10)p.y-=.04*Math.sin(Math.PI*(t-land)/.1);
      }
      p.y+=.19*p.air;open(1.1+.20*p.air,.39);p.footL.y+=.025*p.air;p.footR.y+=.025*p.air;break;
    }
    case 'twirl': {
      // One complete turn across the lyric instruction, with preparation/settle.
      const spin=ease((u-.10)/.80);p.rotY=2*Math.PI*spin;
      p.left.set(-.39,1.1,.10);p.right.set(.39,1.1,.10);
      p.y+=.015*Math.sin(Math.PI*spin);p.footR.z=.07;p.footL.z=-.03;break;
    }
    case 'disco_hits': {
      const high=i%2===0,reach=.5+.5*Math.cos(ang);
      p.left.set(-.39,1.28-.28*reach,.08);p.right.set(.39,1.0+.28*reach,.08);
      p.lean=.04*side;p.y-=.025*impact;
      if(high)p.footR.y+=.055*breathe;else p.footL.y+=.055*breathe;break;
    }
    case 'finale':
      open(1.23,.41);p.head=-.035;p.y=-.025;p.rotY=-.07;break;
    default: throw new Error(`Unknown V10 movement ${opts.move}`);
  }
  p.footL.x+=p.x;p.footR.x+=p.x;
  return p;
}

export function poseDance(c,opts,entry,t,beats,previous){
  buildDanceRig(c);
  const p=authoredPose(opts,entry,t,beats);
  // Short interpolation of joints between authored phrases, not repeated on beats.
  if(previous&&t-entry.startTime<.13){
    const old=authoredPose(previous.opts,previous.entry,previous.entry.endTime-1e-6,beats);
    const a=ease((t-entry.startTime)/.13);
    for(const k of ['left','right','footL','footR'])p[k].lerpVectors(old[k],p[k],a);
    for(const k of ['x','y','head','lean'])p[k]=mix(old[k],p[k],a);
  }
  // Lower the hips when feet spread so both leg chains can reach the floor.
  for(const [foot,s] of [[p.footL,-1],[p.footR,1]]){
    const dx=foot.x-p.x-s*.075;
    const h=Math.sqrt(Math.max(.08,.59**2-dx**2-foot.z**2));
    p.y=Math.min(p.y,h+foot.y-.66+.19*p.air);
  }
  c.mesh.position.set(p.x,p.y,0);c.mesh.rotation.set(0,p.rotY,p.lean);c.mesh.scale.set(1,1,1);
  c.headGroup.rotation.set(0,0,p.head);
  const L=c.danceRig.limbs;
  const handClearance=[];
  for(const name of ['left','right']){
    const hand=p[name],s=name==='left'?-1:1;
    // Head-proxy guard protects hands during reaches; actual stills also reviewed.
    const h=hand.clone().sub(v(0,1.28,0)),r=h.length();
    if(r<.365)hand.copy(h.multiplyScalar(.365/r).add(v(0,1.28,0)));
    handClearance.push(hand.distanceTo(v(0,1.28,0))-.345);
    solve(L[name+'Arm'],hand,v(s,.05,.45));
    const foot=(name==='left'?p.footL:p.footR).clone();
    // Foot goals in pre-root coordinates preserve ground height in a knee dip.
    foot.x-=p.x;foot.y-=p.y;
    if(p.air>0)foot.y+=.19*p.air;
    foot.applyAxisAngle(v(0,0,1),-p.lean);
    solve(L[name+'Leg'],foot,v(0,0,1));
    L[name+'Leg'].hand.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(v(0,0,1),-p.lean));
  }
  c.mesh.updateMatrixWorld(true);
  const feet=['left','right'].map(n=>L[n+'Leg'].hand.getWorldPosition(new THREE.Vector3()).toArray());
  const headInverse=c.headGroup.matrixWorld.clone().invert();
  const actualHands=['left','right'].map(n=>L[n+'Arm'].hand.getWorldPosition(new THREE.Vector3()).applyMatrix4(headInverse));
  const actualClearance=Math.min(...actualHands.map(h=>h.length()-.345));
  return {airborne:p.air,handClearance:actualClearance,feet,move:opts.move};
}

export function createLipDriver(music){
  const chars=music.lyric_chars,env=music.vocal_envelope;
  const shapes={rest:[.8,0],MBP:[.8,0],FV:[1.0,.16],A:[1.05,.95],E:[1.1,.48],I:[1.32,.24],O:[.67,.69],U:[.47,.40]};
  function vowel(final){
    if(final.includes('a'))return 'A';
    if(final.includes('o'))return 'O';
    if(final.includes('e'))return 'E';
    if(/[uüv]/.test(final))return 'U';
    return 'I';
  }
  return function at(t){
    const ci=chars.findIndex(c=>t>=c.start&&t<c.end);
    if(ci<0)return {shape:'rest',open:0,width:.8,char:null,index:-1,level:0};
    const c=chars[ci],dt=t-c.start,len=c.end-c.start;
    const e=env[Math.max(0,Math.min(env.length-1,Math.floor(t/.01)))].level;
    const initialHold=Math.min(.065,len*.23);
    let shape=vowel(c.final);
    if(dt<initialHold){
      if(['b','p','m'].includes(c.initial))shape='MBP';
      else if(c.initial==='f')shape='FV';
      else if(['u','w','y'].includes(c.initial)&&/[uüv]/.test(c.final))shape='U';
    }else if(dt>len*.73){
      if(/(ai|ei|ui)$/.test(c.final))shape='I';
      else if(/(ao|ou|iu)$/.test(c.final))shape='U';
    }
    const [width,open]=shapes[shape];
    // Energy modulates a held vowel; it never supplies the syllable identity.
    const audible=clamp(e/.12);
    const attack=shape==='MBP'?1:ease(dt/.025);
    const next=chars[ci+1],gap=!next||next.start-c.end>.08;
    const release=gap?ease((c.end-t)/.055):1;
    return {shape,open:open*(.7+.3*Math.sqrt(e))*audible*attack*release,width,char:c.ch,index:ci,level:e};
  };
}

export function applyLips(c,lip){
  c.upperLip.visible=lip.open<.025;c.lowerLip.visible=false;
  c.beatFace.smile.visible=false;c.beatFace.tongue.visible=false;
  c.upperLip.scale.set(1,1,1);
  c.mouth.scale.set(1,1,1);c.mouth.position.y=c.mouthBaseY;
  c.mouthCavity.visible=lip.open>=.025;
  c.mouthCavity.position.set(0,-.010,.025);
  c.mouthCavity.scale.set(2.15*lip.width,.18+2.05*lip.open,.45);
}
