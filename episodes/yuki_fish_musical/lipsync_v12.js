// V12 uses disjoint visual windows and a separate acoustic onset. Body acting
// remains V11. Anticipation never shifts the music or the lyric highlight clock.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const shapes={rest:[.8,0],MBP:[.8,0],FV:[1.0,.16],A:[1.05,.95],E:[1.1,.48],I:[1.32,.24],O:[.67,.69],U:[.47,.40]};

function vowel(final){
  if(final.includes('a'))return 'A';
  if(final.includes('o'))return 'O';
  if(final.includes('e'))return 'E';
  if(/[uüv]/.test(final))return 'U';
  return 'I';
}

export function createLipDriver(music){
  const chars=music.lyric_chars,env=music.vocal_envelope;
  chars.forEach((c,i)=>{
    if(!(c.start<=c.audio_start&&c.audio_start<c.end))throw new Error(`Invalid mouth span ${i}`);
    if(i&&chars[i-1].end>c.start+1e-7)throw new Error(`Overlapping mouth spans ${i-1}/${i}`);
  });
  const levelAt=t=>{
    const f=clamp((t-env[0].t)/.01,0,env.length-1),i=Math.floor(f);
    return mix(env[i].level,env[Math.min(i+1,env.length-1)].level,f-i);
  };
  function rawShape(c,t){
    const onset=c.audio_start,len=c.end-onset,dt=t-onset;
    if(dt<0&&['b','p','m'].includes(c.initial))return 'MBP';
    if(dt<.020&&c.initial==='f')return 'FV';
    if(dt<.010&&['w','y'].includes(c.initial)&&/[uüv]/.test(c.final))return 'U';
    // A held diphthong changes its ending late; it does not restart per frame.
    if(dt>len*.74){
      if(/(ai|ei|ui)$/.test(c.final))return 'I';
      if(/(ao|ou|iu)$/.test(c.final))return 'U';
    }
    return vowel(c.final);
  }
  const rest=()=>({shape:'rest',open:0,width:.8,char:null,index:-1,level:0,phase:'rest',audioIndex:-1});
  return t=>{
    // Last-start lookup is explicit, even though preparation enforces no overlap.
    const ci=chars.findLastIndex(c=>c.start<=t);
    if(ci<0||t>=chars[ci].end)return rest();
    const c=chars[ci],dt=t-c.audio_start,prepare=dt<0;
    const shape=rawShape(c,t);let [width,opening]=shapes[shape];
    const current=levelAt(t);
    // Anticipation consults the upcoming onset only inside its bounded 30ms
    // preparation window. Rests elsewhere cannot inherit a smiling/open mouth.
    const onsetLevel=Math.max(levelAt(c.audio_start),levelAt(c.audio_start+.02));
    const level=prepare?Math.max(current,onsetLevel*.65):current;
    const prev=chars[ci-1],continuous=prev&&c.start-prev.end<.035;
    const attack=prepare?smooth((t-c.start)/Math.max(.001,c.audio_start-c.start)):
      ['b','p','m'].includes(c.initial)?smooth((dt+.006)/.024):1;
    const next=chars[ci+1],gap=!next||next.start-c.end>.06;
    const release=gap?smooth((c.end-t)/.035):1;
    opening*=clamp(level/.12)*(.7+.3*Math.sqrt(level))*release;
    if(prepare&&continuous&&shape!=='MBP'){
      const old=shapes[rawShape(prev,prev.end-.001)];
      opening=mix(old[1]*clamp(current/.12)*(.7+.3*Math.sqrt(current)),opening,attack);
      width=mix(old[0],width,attack);
    }else opening*=attack;
    // No early vowel leakage through a bilabial closure.
    if(shape==='MBP')opening=0;
    const audioIndex=chars.findLastIndex(ch=>ch.audio_start<=t&&t<(ch.audio_end??ch.end));
    return {shape,open:opening,width,char:c.ch,index:ci,level:current,
      phase:prepare?'prepare':'voice',audioIndex,audioStart:c.audio_start,start:c.start};
  };
}
