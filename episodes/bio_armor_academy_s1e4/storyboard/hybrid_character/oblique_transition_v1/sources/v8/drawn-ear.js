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
    // A thin outer rim around one broad concha. The former stacked curls made
    // the lower attachment read as another ear; leave the attached lobe plain.
    shape([['moveTo',193,87],['bezierCurveTo',176,39,130,22,89,45],['bezierCurveTo',44,70,31,125,43,177],['bezierCurveTo',51,217,76,255,111,277]],null,'#b77c65',3.5);
    shape([['moveTo',171,88],['bezierCurveTo',151,62,117,64,94,88],['bezierCurveTo',71,111,68,140,83,165],['bezierCurveTo',94,184,114,190,119,214],['bezierCurveTo',122,238,110,260,103,272],['bezierCurveTo',131,269,160,253,174,229],['bezierCurveTo',189,201,178,182,160,168],['bezierCurveTo',145,155,145,141,161,126],['bezierCurveTo',174,114,179,100,171,88],['closePath']], '#cf9277',null,0);
    shape([['moveTo',153,94],['bezierCurveTo',133,82,111,88,101,104],['bezierCurveTo',90,120,92,138,109,147],['bezierCurveTo',128,155,141,162,145,177],['bezierCurveTo',148,192,137,208,128,222],['bezierCurveTo',153,212,167,196,159,180],['bezierCurveTo',142,163,128,151,135,133],['bezierCurveTo',141,117,156,111,153,94],['closePath']], '#b97860',null,0);
    shape([['moveTo',167,84],['bezierCurveTo',143,70,111,81,95,104],['bezierCurveTo',86,120,90,140,111,150],['bezierCurveTo',124,156,135,161,140,172]],null,'#ffe4c9',7);
    // The tragus opens toward the face; it does not close a lower oval.
    shape([['moveTo',194,174],['bezierCurveTo',175,171,162,182,164,198],['bezierCurveTo',165,211,179,215,184,230],['lineTo',208,227],['closePath']],skin,null,0);
    shape([['moveTo',194,177],['bezierCurveTo',177,175,167,186,169,199]],null,'#b57861',3.3);
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
