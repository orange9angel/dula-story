// Configuration-driven source-art compositing for createDrawnHead.paintFace.
// Coordinates and curve control points are authored in source-image pixels.
const artCaches=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;

function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function cubic(points,t){const u=1-t;return [0,1].map(k=>u*u*u*points[0][k]+3*u*u*t*points[1][k]+3*u*t*t*points[2][k]+t*t*t*points[3][k]);}
function curveY(points,x){
  let lo=0,hi=1;
  for(let i=0;i<16;i++){const t=(lo+hi)*.5;if(cubic(points,t)[0]<x)lo=t;else hi=t;}
  return cubic(points,(lo+hi)*.5)[1];
}
function pathFromCommands(ctx,commands){
  ctx.beginPath();
  for(const [op,...p] of commands){
    if(op==='M')ctx.moveTo(...p);else if(op==='L')ctx.lineTo(...p);
    else if(op==='Q')ctx.quadraticCurveTo(...p);else if(op==='C')ctx.bezierCurveTo(...p);
    else if(op==='Z')ctx.closePath();else throw new Error('Unknown portrait path command: '+op);
  }
}
function getCache(art,paint){
  // Configurations are immutable per head. Cache by identity rather than
  // serializing the entire source-coordinate recipe on every animation frame.
  let versions=artCaches.get(art);if(!versions){versions=new WeakMap();artCaches.set(art,versions);}
  if(versions.has(paint))return versions.get(paint);
  const source=canvas(art.width,art.height),ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(art,0,0);
  const cache={source,pixels:ctx.getImageData(0,0,art.width,art.height),patches:new Map(),ribbons:new Map(),layers:new Map(),mask:faceMask(art.width,art.height,paint)};
  versions.set(paint,cache);return cache;
}
function faceMask(w,h,paint){
  const c=canvas(w,h),ctx=c.getContext('2d',{willReadFrequently:true});
  pathFromCommands(ctx,paint.facePath);ctx.fillStyle='#fff';ctx.fill();
  const feather=paint.faceFeatherPixels??0;if(!(feather>0))return c;
  const im=ctx.getImageData(0,0,w,h),distance=new Float32Array(w*h),diagonal=Math.SQRT2;
  // Two cached chamfer passes approximate inward distance. Unlike a blurred
  // polygon this never spreads source pixels beyond the approved face domain.
  for(let i=0;i<distance.length;i++)distance[i]=im.data[i*4+3]===255?1e6:0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;let d=distance[i];
    if(x)d=Math.min(d,distance[i-1]+1);
    if(y){d=Math.min(d,distance[i-w]+1);if(x)d=Math.min(d,distance[i-w-1]+diagonal);if(x<w-1)d=Math.min(d,distance[i-w+1]+diagonal);}
    distance[i]=d;
  }
  for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){
    const i=y*w+x;let d=distance[i];
    if(x<w-1)d=Math.min(d,distance[i+1]+1);
    if(y<h-1){d=Math.min(d,distance[i+w]+1);if(x)d=Math.min(d,distance[i+w-1]+diagonal);if(x<w-1)d=Math.min(d,distance[i+w+1]+diagonal);}
    distance[i]=d;im.data[i*4+3]=Math.round(im.data[i*4+3]*smooth(0,feather,d));
  }
  ctx.putImageData(im,0,0);return c;
}
function sample(cache,x,y,out,offset=0){
  const {data,width,height}=cache.pixels;x=clamp(x,0,width-1);y=clamp(y,0,height-1);
  const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),tx=x-x0,ty=y-y0;
  for(let k=0;k<4;k++)out[offset+k]=mix(mix(data[(y0*width+x0)*4+k],data[(y0*width+x1)*4+k],tx),mix(data[(y1*width+x0)*4+k],data[(y1*width+x1)*4+k],tx),ty);
}
function cleanPatch(cache,region){
  if(cache.patches.has(region))return cache.patches.get(region);
  const [x0,y0,w,h]=region.rect,c=canvas(w,h),ctx=c.getContext('2d'),im=ctx.createImageData(w,h),a=[],b=[],old=[];
  const [sampleLeft,sampleRight]=region.sampleX??[x0,x0+w-1],feather=region.feather??6;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const sx=clamp(x0+x,sampleLeft,sampleRight),sy=y0+y;
    sample(cache,sx,region.sampleTop,a);sample(cache,sx,region.sampleBottom,b);sample(cache,x0+x,sy,old);
    const t=clamp((sy-region.sampleTop)/(region.sampleBottom-region.sampleTop),0,1);
    const blend=smooth(0,feather,Math.min(x,w-1-x,y,h-1-y)),j=(y*w+x)*4;
    for(let k=0;k<3;k++)im.data[j+k]=mix(old[k],mix(a[k],b[k],t),blend);
    im.data[j+3]=255;
  }
  ctx.putImageData(im,0,0);cache.patches.set(region,c);return c;
}
function erase(ctx,cache,region){ctx.drawImage(cleanPatch(cache,region),region.rect[0],region.rect[1]);}
function openingPath(ctx,eye,blink){
  const points=eye.upper,x0=points[0][0],x1=points[3][0],steps=Math.ceil(x1-x0);
  ctx.beginPath();
  for(let i=0;i<=steps;i++){const x=mix(x0,x1,i/steps),y=mix(curveY(eye.upper,x),curveY(eye.closed,x),blink);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  for(let i=steps;i>=0;i--){const x=mix(x0,x1,i/steps),y=mix(curveY(eye.lower,x),curveY(eye.closed,x),blink);ctx.lineTo(x,y);}
  ctx.closePath();
}
function gazeImage(cache,eye,gaze){
  const [x0,y0,w,h]=eye.clear.rect,c=canvas(w,h),ctx=c.getContext('2d'),im=ctx.createImageData(w,h);
  const dx=gaze[0]*(eye.gazePixels?.[0]??8),dy=-gaze[1]*(eye.gazePixels?.[1]??5);
  const left=eye.upper[0][0],right=eye.upper[3][0],margin=eye.pinMargin??9;
  for(let x=0;x<w;x++){
    const sx=x0+x,top=curveY(eye.upper,sx),bottom=curveY(eye.lower,sx);
    for(let y=0;y<h;y++){
      const sy=y0+y,border=Math.min(sx-left,right-sx,sy-top,bottom-sy),weight=smooth(0,margin,border);
      // Inverse sampling moves the original iris and white in one pass. There
      // is no second iris and the authored eyelid boundary stays pinned.
      sample(cache,sx-dx*weight,sy-dy*weight,im.data,(y*w+x)*4);
    }
  }
  ctx.putImageData(im,0,0);return c;
}
function ribbon(cache,curve,band){
  const key=JSON.stringify([curve,band]);if(cache.ribbons.has(key))return cache.ribbons.get(key);
  const x0=Math.floor(curve[0][0]),w=Math.ceil(curve[3][0]-x0)+1,above=band.above??7,below=band.below??5,h=above+below+1;
  const c=canvas(w,h),ctx=c.getContext('2d'),im=ctx.createImageData(w,h),pixel=[];
  for(let x=0;x<w;x++)for(let y=0;y<h;y++){
    sample(cache,x0+x,curveY(curve,x0+x)+y-above,pixel);const k=(y*w+x)*4;
    const luma=.2126*pixel[0]+.7152*pixel[1]+.0722*pixel[2];
    for(let ch=0;ch<3;ch++)im.data[k+ch]=pixel[ch];
    // Extract existing ink only; do not carry a white/skin rectangle with it.
    im.data[k+3]=pixel[3]*(1-smooth(band.inkMin??105,band.inkMax??175,luma));
  }
  ctx.putImageData(im,0,0);const result={canvas:c,x0,above,w,h};cache.ribbons.set(key,result);return result;
}
function drawRibbon(ctx,cache,sourceCurve,targetCurve,band,amount=1,verticalScale=1){
  const r=ribbon(cache,sourceCurve,band);ctx.save();ctx.globalAlpha*=amount;
  const scaleX=(targetCurve[3][0]-targetCurve[0][0])/(sourceCurve[3][0]-sourceCurve[0][0]);
  for(let x=0;x<r.w;x++){
    const dx=targetCurve[0][0]+(r.x0+x-sourceCurve[0][0])*scaleX;
    ctx.drawImage(r.canvas,x,0,1,r.h,dx,curveY(targetCurve,dx)-r.above*verticalScale,scaleX,r.h*verticalScale);
  }
  ctx.restore();
}
function blendCurve(a,b,t){return a.map((p,i)=>[p[0],mix(p[1],b[i][1],t)]);}
function paintEye(ctx,cache,eye,state){
  const blink=clamp(state.blink??0,0,1),gaze=(state.gaze??[0,0]).map(v=>clamp(v,-1,1));
  if(state.noEyes){erase(ctx,cache,eye.clear);return;}
  if(blink<.0001&&Math.abs(gaze[0])+Math.abs(gaze[1])<.0001)return;
  if(blink>0)erase(ctx,cache,eye.clear);
  if(blink<.995){
    ctx.save();openingPath(ctx,eye,blink);ctx.clip();
    if(Math.abs(gaze[0])+Math.abs(gaze[1])>.0001)ctx.drawImage(gazeImage(cache,eye,gaze),eye.clear.rect[0],eye.clear.rect[1]);
    else ctx.drawImage(cache.source,0,0);
    ctx.restore();
  }
  if(blink>0){
    drawRibbon(ctx,cache,eye.upper,blendCurve(eye.upper,eye.closed,blink),eye.upperBand??{},1,mix(1,eye.closedInkScale??.48,blink));
    // The lower original line converges into the closed lid, then yields to
    // the upper line so closing does not create a doubled black crease.
    drawRibbon(ctx,cache,eye.lower,blendCurve(eye.lower,eye.closed,blink),eye.lowerBand??{above:2,below:3,inkMin:90,inkMax:155},1-smooth(.65,1,blink));
  }
}
function paintMouth(ctx,cache,mouth,state){
  const jaw=clamp(state.jaw??0,0,mouth.maxJaw??.8);if(jaw<.005)return;
  erase(ctx,cache,mouth.clear);
  const width=clamp(state.width??1,.8,1.2),centre=(mouth.lip[0][0]+mouth.lip[3][0])*.5,depth=jaw*mouth.openPixels;
  const top=mouth.lip.map(([x,y],i)=>[centre+(x-centre)*width,y-((i===1||i===2)?depth*.15:0)]);
  const bottom=top.map(([x,y],i)=>[x,y+((i===1||i===2)?depth:0)]);
  ctx.save();ctx.beginPath();ctx.moveTo(...top[0]);ctx.bezierCurveTo(...top[1],...top[2],...top[3]);ctx.bezierCurveTo(...bottom[2],...bottom[1],...bottom[0]);ctx.closePath();ctx.clip();
  ctx.fillStyle=mouth.inside??'#69413e';ctx.fillRect(mouth.clear.rect[0],mouth.clear.rect[1],mouth.clear.rect[2],mouth.clear.rect[3]);
  if(jaw>.35){ctx.fillStyle=mouth.tongue??'#b97872';ctx.beginPath();ctx.ellipse(centre,curveY(mouth.lip,centre)+depth*.8,(top[3][0]-top[0][0])*.34,depth*.24,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  // Keep the authored upper lip's varying ink. This restrained rig leaves
  // brows/nose intact and is not a complete phoneme/expression atlas.
  drawRibbon(ctx,cache,mouth.lip,top,mouth.lipBand??{above:2,below:3,inkMin:115,inkMax:190});
}

function portraitLayer(cache,paint,state){
  // Separate normal and eye-free underpaint slots prevent their alternating
  // calls from evicting each other. Reuse each full-size canvas and redraw
  // only when the small normalized expression key actually changes.
  const normalized={blink:clamp(state.blink??0,0,1),gaze:(state.gaze??[0,0]).map(v=>clamp(v,-1,1)),jaw:clamp(state.jaw??0,0,paint.mouth?.maxJaw??.8),width:clamp(state.width??1,.8,1.2),noEyes:!!state.noEyes};
  if(normalized.noEyes){normalized.blink=0;normalized.gaze=[0,0];}
  const slot=normalized.noEyes?'under':'normal',key=JSON.stringify(normalized);
  let layer=cache.layers.get(slot);
  if(!layer){const c=canvas(cache.source.width,cache.source.height);layer={canvas:c,ctx:c.getContext('2d'),key:null};cache.layers.set(slot,layer);}
  if(layer.key===key)return layer.canvas;
  const ctx=layer.ctx;ctx.clearRect(0,0,layer.canvas.width,layer.canvas.height);ctx.drawImage(cache.source,0,0);
  for(const eye of paint.eyes)paintEye(ctx,cache,eye,normalized);
  if(paint.mouth)paintMouth(ctx,cache,paint.mouth,normalized);
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(cache.mask,0,0);ctx.globalCompositeOperation='source-over';
  layer.key=key;return layer.canvas;
}

export function paintGeneratedPortrait(ctx,config,state,art){
  if(!art)return;const paint=config.paint;
  if(!paint?.facePath||!Array.isArray(paint.eyes)||paint.eyes.some(e=>!e.upper||!e.lower||!e.closed||!e.clear))throw new Error('Generated portrait requires source-coordinate facePath and eye curves/clear regions');
  const ppm=paint.pixelsPerMetre;if(!(ppm>0))throw new Error('Generated portrait pixelsPerMetre must be positive');
  const cache=getCache(art,paint);
  ctx.save();ctx.translate((paint.originWorldX??config.centerX??0)-paint.originX/ppm,paint.anchorY+paint.originY/ppm);ctx.scale(1/ppm,-1/ppm);
  // One inward-feathered domain masks both the source and animation updates.
  // Ear, source jaw outline and neck never re-enter through a clean patch;
  // interior authored eye/nose/mouth pixels retain full opacity.
  ctx.drawImage(portraitLayer(cache,paint,state),0,0);
  ctx.restore();
}
