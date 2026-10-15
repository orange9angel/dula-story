import * as THREE from 'three';

// A restrained side chart: the helix encloses the concha; the tragus stays
// close to the face. It follows the ear surface, without frontal-art stretching.
export function drawEarMap(skin,{rootDefinition=false,attachedLobe=false}={}){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=384;
  const c=canvas.getContext('2d');c.fillStyle=skin;c.fillRect(0,0,256,384);
  c.lineCap='round';c.lineJoin='round';
  const shape=(commands,fill,stroke,width)=>{
    c.beginPath();for(const [op,...p] of commands)c[op](...p);
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  };
  if(attachedLobe){
    // An open helix, a single connected concha, and a short attached lobe.
    // Do not stack a second lower oval on top of the ear-root crease.
    shape([['moveTo',192,88],['bezierCurveTo',176,30,119,16,76,51],['bezierCurveTo',23,93,27,178,60,241],['bezierCurveTo',87,286,132,320,165,307]],null,'#ac735e',4.2);
    shape([['moveTo',165,112],['bezierCurveTo',137,89,109,105,92,129],['bezierCurveTo',78,153,82,180,101,194],['bezierCurveTo',115,205,133,209,145,228],['bezierCurveTo',164,243,181,230,178,214],['bezierCurveTo',170,196,148,185,155,169],['bezierCurveTo',173,151,177,130,165,112],['closePath']], '#d99b81',null,0);
    shape([['moveTo',110,119],['bezierCurveTo',105,143,118,155,139,166]],null,'#ffe3c6',6);
    shape([['moveTo',183,192],['bezierCurveTo',163,189,155,207,169,220],['bezierCurveTo',178,227,184,234,183,246]],skin,'#b77761',3.2);
    shape([['moveTo',108,274],['bezierCurveTo',126,291,153,295,172,281]],null,'#bd8168',3);
    shape([['moveTo',189,88],['bezierCurveTo',207,119,203,153,188,177]],null,'#a96f5b',3.1);
    shape([['moveTo',183,246],['bezierCurveTo',197,267,189,293,165,307]],null,'#b97e65',3.1);
  }else{
  shape([['moveTo',190,97],['bezierCurveTo',161,54,115,48,83,77],['bezierCurveTo',43,110,39,164,55,213],['bezierCurveTo',64,243,87,274,118,293]],null,'#b8755e',5);
  // A branched antihelix and shaded concha, open toward the face (+z/right).
  // Avoid the previous nested rings, which read as a button in oblique views.
  // One connected concha: two separate dark islands looked like two ears.
  shape([['moveTo',164,108],['bezierCurveTo',137,84,110,88,94,115],['bezierCurveTo',82,138,84,166,102,190],['bezierCurveTo',112,216,140,237,151,254],['bezierCurveTo',155,265,146,279,136,285],['bezierCurveTo',165,282,177,268,170,249],['bezierCurveTo',159,230,153,218,168,198],['bezierCurveTo',182,179,179,159,161,150],['bezierCurveTo',150,143,162,124,164,108]],'#d99b81',null,0);
  shape([['moveTo',110,112],['bezierCurveTo',103,134,110,150,134,163],['bezierCurveTo',121,175,117,185,120,196]],null,'#ffe3c6',7);
  shape([['moveTo',175,190],['bezierCurveTo',154,182,146,202,157,215],['bezierCurveTo',164,222,171,220,178,226]],skin,'#a96655',4);
  shape([['moveTo',123,289],['bezierCurveTo',142,306,164,302,171,282]],null,'#c4896d',3);
  if(rootDefinition){
    // A short anterior attachment and a distinct, attached lobe. Leave the
    // upper root open; tracing a second closed oval creates a duplicate ear.
    shape([['moveTo',180,222],['bezierCurveTo',172,242,181,264,192,279],['bezierCurveTo',201,295,192,317,171,325],['bezierCurveTo',190,329,210,319,211,299],['bezierCurveTo',205,274,193,249,197,231],['closePath']], '#e5ab90',null,0);
    shape([['moveTo',194,235],['bezierCurveTo',184,250,195,271,198,285]],null,'#a66654',3.4);
    shape([['moveTo',112,293],['bezierCurveTo',129,319,151,333,174,325],['bezierCurveTo',188,321,195,310,195,298]],null,'#a96e58',3.7);
    shape([['moveTo',179,99],['bezierCurveTo',196,113,201,132,197,146]],null,'#bb7d66',2.8);
  }
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
