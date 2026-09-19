import * as THREE from 'three';
import {poseDance,actFace,buildDanceRig} from './performance_v11.js';
import {applyLipsV17} from './lipsync_v17.js';
import {setWardrobe} from './wardrobe_v3.js';
export function poseActors(yuki,cat,t,entry,opts,lipY,lipC,beats,previous){
  // 一拍二 (cel-look): body/face acting samples on the 12fps grid; lips
  // (lipY/lipC, computed upstream at full t) and the camera stay at 60fps.
  const tq=Math.floor(t*12)/12;
  setWardrobe(yuki,'original','none');buildDanceRig(yuki);
  yuki.danceRig.headset.visible=false;
  const py=poseDance(yuki,opts.Yuki,entry,tq,beats,previous);
  py.acting=actFace(yuki,opts.Yuki,entry,tq,previous);
  yuki.mesh.position.x-=.43;
  const mouth=applyLipsV17(yuki,lipY);
  yuki.leftTail.rotation.z=yuki.leftTail.userData.baseRotZ-.05*Math.sin(tq*5);
  yuki.rightTail.rotation.z=yuki.rightTail.userData.baseRotZ+.05*Math.sin(tq*5);
  yuki.ahoge.rotation.z=.6+.04*Math.sin(tq*7);
  const move=opts.Mochi.move,dt=tq-entry.startTime;
  const i=Math.max(0,beats.findLastIndex(b=>b<=tq));
  const phase=Math.min(1,Math.max(0,(tq-beats[i])/(beats[i+1]-beats[i]||.5)));
  const sway=Math.sin((i+phase)*Math.PI),hit=Math.exp(-phase*8);
  cat.mesh.position.set(.69,0,0);cat.mesh.rotation.set(0,0,0);cat.mesh.scale.set(1,1,1);
  cat.headGroup.position.set(0,cat.headBaseY,.22);cat.headGroup.rotation.set(0,0,0);
  for(const limb of [cat.leftArm,cat.rightArm,cat.leftLeg,cat.rightLeg])limb.rotation.set(0,0,0);
  for(const eye of [cat.leftEye,cat.rightEye]){eye.visible=true;eye.scale.set(1,1,1);}
  cat.leftEyelid.visible=cat.rightEyelid.visible=true;
  cat.leftEyelid.scale.set(1.05,.55,.5);cat.rightEyelid.scale.set(1.05,.55,.5);
  cat.tail.rotation.set(0,.20*Math.sin(tq*1.4),0);
  if(['cat_deny','cat_taste','cat_innocent'].includes(move)){
    cat.mesh.rotation.z=.075*sway;cat.mesh.scale.set(1+.025*hit,1-.045*hit,1+.015*hit);
    cat.headGroup.rotation.z=-.07*sway;
    if(move==='cat_deny'){
      cat.headGroup.rotation.y=.22*sway;
      cat.rightArm.rotation.z=-.28-.45*(.5+.5*sway);
      cat.leftArm.rotation.z=.28+.45*(.5-.5*sway);
    }else if(move==='cat_taste'){
      cat.headGroup.rotation.x=-.08;cat.rightArm.rotation.x=-.4-.22*hit;
      cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.95;
    }else{
      cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.15;
      cat.headGroup.rotation.z=.13;cat.leftArm.rotation.z=.35;cat.rightArm.rotation.z=-.35;
    }
  }else if(move==='cat_guilty'){
    cat.headGroup.rotation.y=-.14;cat.headGroup.rotation.x=.06;
    cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.75;
  }else if(move==='cat_defeat'||move==='cat_wash'){
    cat.headGroup.rotation.x=.17;cat.mesh.scale.set(1.015,.97,1.015);
    cat.leftEyelid.scale.y=cat.rightEyelid.scale.y=.85;
    if(move==='cat_wash'){cat.rightArm.rotation.x=-.35-.17*Math.sin(tq*11);cat.leftArm.rotation.x=-.25;}
  }else if(move==='cat_talk'){
    cat.headGroup.rotation.z=.07*Math.sin(dt*2);cat.headGroup.rotation.y=-.08;
  }
  // A cat's two smile strokes cannot become an open mouth by scaling them.
  if(!cat.songMouth){
    const g=new THREE.Group();g.position.set(0,-.063,.259);cat.headGroup.add(g);
    const dark=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({color:0x48212a,side:THREE.DoubleSide}));g.add(dark);
    const tongue=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:0xd07880,side:THREE.DoubleSide}));tongue.position.z=.002;g.add(tongue);
    cat.songMouth={g,dark,tongue};
  }
  const jaw=lipC.jaw,open=jaw>.025;
  cat.mouth.visible=!open;cat.mouth.scale.set(1,1,1);cat.mouth.position.y=cat.mouthBaseY;
  const rig=cat.songMouth;rig.g.visible=open;
  const width=.020+.016*(1-(lipC.rounding||0))+.008*jaw;
  const height=.006+.038*jaw;
  rig.dark.scale.set(width,height,1);rig.dark.position.y=-height*.55;
  rig.tongue.visible=jaw>.38;rig.tongue.scale.set(width*.52,height*.20,1);rig.tongue.position.y=-height*1.14;
  cat.mesh.updateMatrixWorld(true);yuki.mesh.updateMatrixWorld(true);
  return {yuki:py,yukiMouth:mouth,cat:{jaw:Math.round(jaw*1000)/1000,open,width,height:open?height:0,move},opts:opts.Yuki,entry};
}
