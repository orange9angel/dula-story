import * as THREE from 'three';

// A restrained side chart: the helix encloses the concha; the tragus stays
// close to the face. It follows the ear surface, without frontal-art stretching.
export function drawEarMap(skin){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=384;
  const c=canvas.getContext('2d');c.fillStyle=skin;c.fillRect(0,0,256,384);
  c.lineCap='round';c.lineJoin='round';
  const shape=(commands,fill,stroke,width)=>{
    c.beginPath();for(const [op,...p] of commands)c[op](...p);
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  };
  shape([['moveTo',190,97],['bezierCurveTo',161,54,115,48,83,77],['bezierCurveTo',43,110,39,164,55,213],['bezierCurveTo',64,243,87,274,118,293]],null,'#b8755e',5);
  // A branched antihelix and shaded concha, open toward the face (+z/right).
  // Avoid the previous nested rings, which read as a button in oblique views.
  // One connected concha: two separate dark islands looked like two ears.
  shape([['moveTo',164,108],['bezierCurveTo',137,84,110,88,94,115],['bezierCurveTo',82,138,84,166,102,190],['bezierCurveTo',112,216,140,237,151,254],['bezierCurveTo',155,265,146,279,136,285],['bezierCurveTo',165,282,177,268,170,249],['bezierCurveTo',159,230,153,218,168,198],['bezierCurveTo',182,179,179,159,161,150],['bezierCurveTo',150,143,162,124,164,108]],'#d99b81',null,0);
  shape([['moveTo',110,112],['bezierCurveTo',103,134,110,150,134,163],['bezierCurveTo',121,175,117,185,120,196]],null,'#ffe3c6',7);
  shape([['moveTo',175,190],['bezierCurveTo',154,182,146,202,157,215],['bezierCurveTo',164,222,171,220,178,226]],skin,'#a96655',4);
  shape([['moveTo',123,289],['bezierCurveTo',142,306,164,302,171,282]],null,'#c4896d',3);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
