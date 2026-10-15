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
  shape([['moveTo',188,89],['bezierCurveTo',153,41,83,56,60,116],['bezierCurveTo',34,184,68,265,124,302],['bezierCurveTo',146,319,170,314,180,292]],null,'#b97661',4);
  shape([['moveTo',163,114],['bezierCurveTo',133,90,94,111,85,157],['bezierCurveTo',74,208,98,251,144,270],['bezierCurveTo',156,274,164,268,171,255],['bezierCurveTo',150,235,145,213,160,196],['bezierCurveTo',179,171,187,137,163,114]],'#e9ac8e',null,0);
  shape([['moveTo',147,111],['bezierCurveTo',113,112,100,144,108,179],['bezierCurveTo',118,202,143,217,148,240]],null,'#bb7962',4);
  shape([['moveTo',155,182],['bezierCurveTo',137,180,127,197,136,212],['bezierCurveTo',146,223,156,222,166,229]],null,'#b7735f',4);
  shape([['moveTo',75,145],['bezierCurveTo',64,192,87,254,122,273]],null,'#ffe9cd',7);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
