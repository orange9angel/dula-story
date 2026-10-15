const plates=new WeakMap();
function cleanPlate(art){
  if(plates.has(art))return plates.get(art);
  const c=document.createElement('canvas');c.width=art.width;c.height=art.height;
  const p=c.getContext('2d',{willReadFrequently:true});p.drawImage(art,0,0);
  const original=p.getImageData(0,0,c.width,c.height),out=p.getImageData(0,0,c.width,c.height);
  for(const [x0,y0,w,h] of [[365,566,218,176],[702,565,218,176],[380,487,210,78],[695,487,210,78]]){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const t=y/(h-1),weight=Math.min(1,Math.min(x,w-1-x,y,h-1-y)/15);
      // Outer columns at the lower eye boundary touch the painted ear/jaw.
      // Sampling those dark pixels stretches an ear crease up the temple.
      const sx=x0+x,topX=Math.max(380,Math.min(900,sx)),bottomX=y0>560?Math.max(425,Math.min(855,sx)):Math.max(380,Math.min(900,sx));
      const k=((y0+y)*c.width+sx)*4,top=(y0*c.width+topX)*4,bottom=((y0+h-1)*c.width+bottomX)*4;
      for(let ch=0;ch<3;ch++){const skin=original.data[top+ch]*(1-t)+original.data[bottom+ch]*t;out.data[k+ch]=original.data[k+ch]*(1-weight)+skin*weight;}
    }
  }
  p.putImageData(out,0,0);plates.set(art,c);return c;
}

/** Composite the generated face directly into the curved head UV. Neutral
 * artwork is preserved; only live eye, brow and mouth regions are updated. */
export function paintGeneratedFace(ctx,config,state,art){
  if(!art)return;
  const {originX,originY,anchorY,pixelsPerMetre:ppm,eyes,mouth}=config.paint;
  ctx.save();ctx.translate(-originX/ppm,anchorY+originY/ppm);ctx.scale(1/ppm,-1/ppm);
  // Do not project the painted neck/shadow onto the side of the jaw.
  ctx.save();ctx.beginPath();
  for(const [i,p] of [[640,217],[780,240],[907,357],[949,550],[936,600],[920,650],[900,700],[875,750],[847,800],[813,845],[766,914],[666,972],[641,978],[613,969],[516,907],[438,839],[405,790],[381,740],[361,690],[348,630],[341,520],[374,397],[434,303]].entries()){
    // The model owns the silhouette. Exclude the old painted jaw outline after
    // widening the cheeks, otherwise two different jaw curves remain visible.
    const x=642+(p[0]-642)*.965,y=p[1]>760?p[1]-25:p[1];i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.closePath();ctx.clip();ctx.drawImage(art,0,0);
  // Keep the face boundary active for every live edit too. A rectangular eye
  // clean plate can otherwise reintroduce source-ear pixels onto the temple.
  // Ear paint belongs to an ear UV chart, not to this frontal projection.
  // Projecting these narrow source rectangles here stretches them over temples.
  const plate=cleanPlate(art);
  const path=(p,blink)=>{
    const top=blink*68;
    p.moveTo(-31,top-39);p.bezierCurveTo(-8,top-55,20,top-62,48,top-47);p.quadraticCurveTo(88,top-27,110,-4);
    p.bezierCurveTo(69,65,-5,70,-28,45);
    // Close to the iris on the nasal side: a short, small-radius turn, not
    // extra white space produced by rounding a large triangular corner.
    p.bezierCurveTo(-42,33,-49,15,-49,0);
    p.bezierCurveTo(-49,top-15,-41,top-30,-31,top-39);p.closePath();
  };
  for(let i=0;i<eyes.length;i++){
    const [ex,ey,irisX,irisY,irisW,irisH]=eyes[i],side=i===0?-1:1;
    const blink=state.blink,gaze=state.gaze;
    ctx.save();ctx.translate(ex,ey);ctx.scale(side,1);
    ctx.save();ctx.scale(side,1);ctx.drawImage(plate,ex-135,ey-90,270,176,-135,-90,270,176);ctx.restore();
    const opening=new Path2D();path(opening,blink);
    if(blink<.94){
      ctx.save();ctx.clip(opening);ctx.fillStyle='#fffaf0';ctx.fillRect(-80,-90,230,170);
      const ix=gaze[0]*side*20,iy=gaze[1]*-12;
      ctx.save();ctx.translate(ix,iy);ctx.scale(side,1);ctx.beginPath();ctx.ellipse(0,0,irisW*.5,irisH*.5,0,0,Math.PI*2);ctx.clip();
      ctx.drawImage(art,irisX,irisY,irisW,irisH,-irisW*.5,-irisH*.5,irisW,irisH);ctx.restore();ctx.restore();
    }
    if(blink<.002){
      // Preserve the painted outer lash and upper lid; only the nasal opening
      // is reshaped. Do not reduce the original lash to one uniform arc.
      ctx.save();ctx.beginPath();ctx.moveTo(-37,-90);ctx.lineTo(145,-90);ctx.lineTo(145,17);ctx.lineTo(100,17);
      ctx.bezierCurveTo(63,-34,12,-53,-37,-25);ctx.closePath();ctx.clip();ctx.scale(side,1);ctx.drawImage(art,0,0,art.width,art.height,-ex,-ey,art.width,art.height);ctx.restore();
      ctx.strokeStyle='#6c403a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-49,-2);ctx.bezierCurveTo(-48,-15,-40,-30,-31,-39);ctx.stroke();
      // Short nasal lashes follow the iris rim; the temporal fan remains the
      // dominant accent. A uniform pale nasal line left this side unfinished.
      ctx.fillStyle='#35242a';ctx.beginPath();ctx.moveTo(-20,-48);
      ctx.bezierCurveTo(-35,-48,-48,-30,-50,-13);
      ctx.bezierCurveTo(-49,-33,-39,-48,-23,-52);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#35242a';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-36,-43);ctx.quadraticCurveTo(-44,-45,-48,-49);ctx.stroke();
      ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-43,-33);ctx.quadraticCurveTo(-49,-34,-52,-38);ctx.stroke();
    }
    if(blink>.002){
      ctx.strokeStyle='#35242a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-48,8+blink*26);
      ctx.bezierCurveTo(-34,-58+blink*112,52,-55+blink*105,110,-4);ctx.stroke();
      ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(90,8+blink*10);ctx.lineTo(122,-4);ctx.stroke();
    }
    ctx.restore();
  }
  // Production paint remains the default brow. Expressions replace only its
  // small local region, preserving the rest of the generated face.
  if(state.fear>.02||state.focus>.02){
    for(let i=0;i<2;i++){
      const bx=i===0?487:800,side=i===0?-1:1;
      ctx.drawImage(plate,bx-107,487,214,78,bx-107,487,214,78);
      const tilt=state.focus*16-state.fear*21;
      ctx.fillStyle='#30484a';ctx.beginPath();ctx.moveTo(bx-side*91,531+tilt);
      ctx.bezierCurveTo(bx-side*40,505,bx+side*38,503,bx+side*100,542-tilt*.3);
      ctx.bezierCurveTo(bx+side*38,512,bx-side*40,514,bx-side*91,531+tilt);ctx.fill();
    }
  }
  if(state.jaw>.055){
    const [mx,my]=mouth,w=40*Math.max(.75,Math.min(1.25,state.width)),h=2+state.jaw*29;
    ctx.save();ctx.beginPath();ctx.ellipse(mx,my,w,h,0,0,Math.PI*2);ctx.clip();ctx.fillStyle='#713b49';ctx.fillRect(mx-w,my-h,w*2,h*2);
    if(state.jaw>.25){ctx.fillStyle='#e39c9d';ctx.beginPath();ctx.ellipse(mx,my+h*.83,w*.70,h*.47,0,0,Math.PI*2);ctx.fill();}
    if(state.smile>.35){ctx.fillStyle='#fff7e8';ctx.fillRect(mx-w,my-h,w*2,h*.40);}
    ctx.restore();
  }
  ctx.restore();ctx.restore();
}
