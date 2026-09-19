import * as THREE from 'three';
import {createLipDriver as baseDriver} from './lipsync_v12.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
// [jaw aperture, width, rounding]. Lip contours use all three independently.
const vowels={A:[1.0,1.10,0],E:[.62,1.05,.10],I:[.27,1.30,0],O:[.80,.79,.85],U:[.47,.60,1],FV:[.10,1.08,0],MBP:[0,1.08,0]};

function trajectory(final,u){
  let first,core,last;
  if(final.includes('a'))core='A';else if(final.includes('o'))core='O';else if(final.includes('e'))core='E';else if(/[uüv]/.test(final))core='U';else core='I';
  if(/^i[aeou]/.test(final))first='I';else if(/^[uüv][aeio]/.test(final))first='U';else first=core;
  last=/(ai|ei|ui)$/.test(final)?'I':/(ao|ou|iu)$/.test(final)?'U':core;
  let a=first,b=core,f=ease(u/.16);
  if(u>=.16){a=core;b=last;f=ease((u-.73)/.24);}
  return {shape:f<.5?a:b,params:vowels[a].map((x,i)=>mix(x,vowels[b][i],f))};
}

export function createLipDriver(music,features){
  const base=baseDriver(music),ff=features.frames;
  const sample=t=>{
    const f=clamp(t/.01,0,ff.length-1),i=Math.floor(f),a=ff[i],b=ff[Math.min(i+1,ff.length-1)];
    return {rms:mix(a.rms,b.rms,f-i),amplitude:mix(a.amplitude,b.amplitude,f-i),gate:mix(a.gate,b.gate,f-i),high:mix(a.high_ratio,b.high_ratio,f-i)};
  };
  return t=>{
    const basic=base(t),audio=sample(t);
    if(basic.index<0)return {...basic,jaw:0,rounding:0,labiodental:0,seal:0,rms:audio.rms,amplitude:audio.amplitude};
    const c=music.lyric_chars[basic.index],dt=t-c.audio_start,u=clamp(dt/(c.audio_end-c.audio_start));
    let {shape,params}=trajectory(c.final,u);
    let labiodental=0,seal=0;
    if(basic.phase==='prepare'&&['b','p','m'].includes(c.initial)){shape='MBP';params=vowels.MBP;seal=1;}
    else if(c.initial==='f'&&dt<.055){shape='FV';params=vowels.FV;labiodental=1-ease((dt-.015)/.040);}
    let strength=audio.amplitude,gate=audio.gate;
    if(basic.phase==='prepare'){
      const ahead=sample(c.audio_start+.012);
      strength=Math.max(strength,ahead.amplitude*.65);gate=Math.max(gate,ahead.gate);
    }
    // Continuous dynamic range: a 12% energy threshold no longer turns nearly
    // every voiced frame into the same maximum-opening state.
    let open=params[0]*(.15+.85*strength)*gate;
    const prev=music.lyric_chars[basic.index-1],next=music.lyric_chars[basic.index+1];
    const joined=prev&&c.start-prev.end<.02;
    if(basic.phase==='prepare'&&!joined)open*=ease((t-c.start)/.030);
    if(['b','p','m'].includes(c.initial)&&dt>=0)open*=ease((dt+.005)/.024);
    if(!next||next.start-c.end>.06)open*=ease((c.end-t)/.035);
    if(seal)open=0;
    // Fricatives favour a narrow channel; they do not acquire a full vowel jaw
    // merely because their high-frequency sound has substantial RMS energy.
    if(['s','sh','x','z','zh','c','ch'].includes(c.initial)&&dt<.04&&dt>=0){
      open*=mix(.42,1,ease(dt/.04));
    }
    if(basic.level===0&&basic.phase!=='prepare')open=0;
    return {...basic,shape,open,width:params[1],jaw:open,rounding:params[2],labiodental,seal,
      rms:audio.rms,amplitude:audio.amplitude,highRatio:audio.high};
  };
}

const N=32;
function geometryStrip(){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array((N+1)*2*3),3));
  const indices=[];for(let i=0;i<N;i++)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
  g.setIndex(indices);return g;
}
function buildMouth(c){
  if(c.singingMouth)return c.singingMouth;
  const group=new THREE.Group();group.position.set(0,0,.035);c.mouth.add(group);
  const material=color=>new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});
  const cavity=new THREE.Mesh(geometryStrip(),material(0x431923));group.add(cavity);
  const upper=new THREE.Mesh(geometryStrip(),material(0x9d4654));group.add(upper);
  const lower=new THREE.Mesh(geometryStrip(),material(0xb65d69));group.add(lower);
  const teeth=new THREE.Mesh(geometryStrip(),material(0xf2dfd3));group.add(teeth);
  const tongue=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),material(0xbc5365));group.add(tongue);
  for(const o of [cavity,upper,lower,teeth,tongue]){o.userData.noSketch=true;o.frustumCulled=false;}
  c.singingMouth={group,cavity,upper,lower,teeth,tongue};return c.singingMouth;
}

export function applyLips(c,lip){
  const rig=buildMouth(c);
  c.upperLip.visible=c.lowerLip.visible=c.mouthCavity.visible=false;
  c.beatFace.smile.visible=c.beatFace.tongue.visible=false;
  c.mouth.scale.set(1,1,1);c.mouth.position.y=c.mouthBaseY;
  const open=lip.open>.018,width=.045*lip.width;
  const height=open?.006+.059*lip.jaw:0;
  const round=lip.rounding||0,pucker=.012*round;
  const upper=[],lower=[];
  for(let i=0;i<=N;i++){
    const x=i/N*2-1,q=Math.max(0,1-x*x),arc=q**mix(.65,.5,round);
    let top,bottom;
    if(!open){top=bottom=(lip.seal?-.002:-.009)*q;}
    else{
      top=(.004+.24*height*round)*arc;
      bottom=-(height*(1-.24*round)-.004)*arc;
    }
    upper.push([x*width,top,pucker]);lower.push([x*width,bottom,pucker]);
  }
  function put(mesh,top,bottom,z){
    const pos=mesh.geometry.attributes.position;
    for(let i=0;i<=N;i++){
      pos.setXYZ(i*2,top[i][0],top[i][1],top[i][2]+z);
      pos.setXYZ(i*2+1,bottom[i][0],bottom[i][1],bottom[i][2]+z);
    }pos.needsUpdate=true;
  }
  put(rig.cavity,upper,lower,0);rig.cavity.visible=open;
  const thickness=.0026;
  put(rig.upper,upper.map(p=>[p[0],p[1]+thickness,p[2]]),upper,.002);
  put(rig.lower,lower,lower.map(p=>[p[0],p[1]-thickness*.7,p[2]]),.002);
  rig.lower.visible=open;rig.upper.visible=true;
  // A thin upper tooth contact appears for F/V; it is the same anchored strip,
  // never a flashing full white block. No teeth are shown in silence.
  rig.teeth.visible=open&&lip.labiodental>.05;
  const toothTop=upper.map(p=>[p[0]*.72,p[1]-.001,p[2]]);
  const toothBottom=toothTop.map(p=>[p[0],p[1]-.004*lip.labiodental,p[2]]);
  put(rig.teeth,toothTop,toothBottom,.003);
  rig.tongue.visible=open&&lip.jaw>.40&&round<.5;
  rig.tongue.scale.set(width*.45,height*.115,.001);
  rig.tongue.position.set(0,-height*.71,pucker+.002);
  return {jaw:lip.jaw,width:width*2,height,rounding:round,upperY:upper[N/2][1],lowerY:lower[N/2][1],
    cavityVisible:rig.cavity.visible,toothVisible:rig.teeth.visible,tongueVisible:rig.tongue.visible,
    actualAperture:upper[N/2][1]-lower[N/2][1]};
}
