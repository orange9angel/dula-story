// Continuous eye direction, asymmetric brow tension and speech-aware mouth for this study.
import * as THREE from 'three';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

export function installFightFace(actor,kind){
  if(actor.face.setActing){
    actor.mouth.apply=lip=>{actor.face.setActing(actor.fightAct??null);return actor.face.applyLip(lip);};
    return;
  }
  const strong=kind==='hong',c=document.createElement('canvas');c.width=c.height=1024;
  const g=c.getContext('2d'),texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const material=actor.face.skull.material;
  const originalEmotion=actor.setEmotion.bind(actor),originalMouth=actor.mouth.apply.bind(actor.mouth);
  const oldMouth=actor.headGroup.children.find(o=>o.isGroup&&o.children.some(x=>x.geometry?.type==='CircleGeometry'));
  let baselineMap=null,wasActive=false,lastBlink=0,lastLip={jaw:0,width:1};
  function draw(){
    const a=actor.fightAct;if(!a)return;
    const fear=clamp(a.fear??0),focus=clamp(a.focus??0),blink=clamp(a.blink??lastBlink);
    const squint=clamp((a.squint??0)+focus*.14,0,.45),skin=strong?'#dfb28f':'#efd0b4';
    g.setTransform(2,0,0,2,0,0);g.clearRect(0,0,512,512);
    const shade=g.createLinearGradient(0,0,512,0);
    shade.addColorStop(0,strong?'#b47f66':'#c39783');shade.addColorStop(.3,skin);
    shade.addColorStop(.6,strong?'#edc3a0':'#f8dfc5');shade.addColorStop(1,strong?'#c08c6e':'#d0a38c');
    g.fillStyle=shade;g.fillRect(0,0,512,512);
    const eyeY=strong?214:222,dx=strong?98:91,ry=(strong?17:24)*(1+.15*fear)*(1-squint);
    const openness=1-blink;
    for(const side of [-1,1]){
      const cx=256+side*dx,asym=(a.browAsym??0)*side;
      g.save();g.translate(cx,eyeY);
      const eye=()=>{g.beginPath();g.moveTo(-44,0);g.quadraticCurveTo(-8,-ry*1.55,43,-3);g.quadraticCurveTo(6,ry,-44,0);g.closePath();};
      if(openness>.035){
        g.save();eye();g.clip();g.fillStyle='#fff3db';g.fillRect(-48,-42,96,84);
        const ix=side*-3+clamp(a.gazeX??0,-1,1)*17,iy=clamp(a.gazeY??0,-1,1)*11;
        g.fillStyle=strong?'#755330':'#886f4a';g.beginPath();g.ellipse(ix,iy,strong?13:18,strong?20:25,0,0,TAU);g.fill();
        g.fillStyle='#25252a';g.beginPath();g.ellipse(ix,iy+1,(strong?6:8)*(a.pupil??1),17*(a.pupil??1),0,0,TAU);g.fill();
        g.fillStyle='#fffcef';g.beginPath();g.arc(ix-5,iy-9,strong?3:4,0,TAU);g.fill();
        g.fillStyle=skin;g.fillRect(-48,-42,96,42-ry*openness+ry*(1-openness));g.restore();
      }
      g.strokeStyle='#342928';g.lineWidth=strong?6:4.5;g.lineCap='round';
      g.beginPath();g.moveTo(-44,0);g.quadraticCurveTo(-8,-ry*1.5*openness,43,-3);g.stroke();
      if(openness>.15){g.strokeStyle=strong?'#9e6e59':'#b48a73';g.lineWidth=2;g.beginPath();g.moveTo(-36,7);g.quadraticCurveTo(0,ry*.8,33,7);g.stroke();}
      g.restore();
      const outerX=256+side*(dx+42),innerX=256+side*(dx-38);
      const browY=eyeY-(strong?38:43)-5*fear+asym*6;
      g.strokeStyle=strong?'#28292e':'#574032';g.lineWidth=strong?13:7;g.lineCap='round';
      g.beginPath();g.moveTo(outerX,browY);g.quadraticCurveTo(cx,browY-4,innerX,browY+16*focus-15*fear+asym*9);g.stroke();
      if(!strong){g.strokeStyle='rgba(144,102,87,.55)';g.lineWidth=2.5;g.beginPath();g.moveTo(cx-27,eyeY+34);g.quadraticCurveTo(cx,eyeY+42,cx+28,eyeY+34);g.stroke();}
    }
    g.strokeStyle=strong?'#ae7c60':'#b88d72';g.lineWidth=2.7;
    g.beginPath();g.moveTo(255,252);g.quadraticCurveTo(249,279,264,288);g.stroke();
    g.beginPath();g.moveTo(247,295);g.quadraticCurveTo(256,299,266,294);g.stroke();
    const jaw=Math.max(lastLip.jaw??0,a.jawOverride??0),width=(strong?33:28)*(lastLip.width??1);
    const my=strong?371:378,tension=a.mouthTension??0;
    const corners=4*fear+1*focus,top=2+15*jaw,bottom=3+36*jaw;
    g.beginPath();g.moveTo(256-width,my+corners);
    g.bezierCurveTo(246,my-top,266,my-top,256+width,my+corners);
    g.bezierCurveTo(267,my+bottom,245,my+bottom,256-width,my+corners);g.closePath();
    g.fillStyle=jaw>.025?'#57272c':'#76453c';g.fill();
    if(jaw>.14){g.save();g.clip();g.fillStyle='#fff1d4';g.fillRect(215,my-top,84,3+5*tension);g.restore();}
    g.strokeStyle='#8a4a4a';g.lineWidth=2.4;g.stroke();
    texture.needsUpdate=true;material.map=texture;material.needsUpdate=true;
  }
  actor.setEmotion=(emotion,blink)=>{
    if(actor.fightAct){
      if(!wasActive)baselineMap=material.map;
      wasActive=true;lastBlink=blink;oldMouth.visible=false;
    }else{
      if(wasActive){material.map=baselineMap;material.needsUpdate=true;oldMouth.visible=true;wasActive=false;}
      originalEmotion(emotion,blink);
    }
  };
  actor.mouth.apply=lip=>{
    if(actor.fightAct){lastLip=lip;draw();return {jaw:lip.jaw};}
    return originalMouth(lip);
  };
}
