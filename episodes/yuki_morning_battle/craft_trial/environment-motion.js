// Episode-local inspection cues, independent of wall clock and render order.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const seed=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
const seconds=s=>{const a=s.replace(',','.').split(':').map(Number);return a[0]*3600+a[1]*60+a[2];};
export function parseEnvironmentStory(text,duration){
  const cues=[];
  for(const block of text.trim().split(/\r?\n\s*\r?\n/)){
    const m=block.match(/(\d\d:\d\d:\d\d,\d+) --> (\d\d:\d\d:\d\d,\d+)\r?\n\[(Wind|Birds)\]([^\n]*)/);
    if(!m)throw new Error('Invalid environment inspection cue');
    const cue={kind:m[3].toLowerCase(),start:seconds(m[1]),end:seconds(m[2])};
    for(const [,name,value] of m[4].matchAll(/(attack|strength|count|direction)=(-?[\d.]+)/g))cue[name]=Number(value);
    if(cue.start<0||cue.end<=cue.start||cue.end>duration)throw new Error('Environment cue outside inspection timeline');
    if(cue.kind==='wind'&&!(cue.attack>0&&cue.attack<cue.end-cue.start&&cue.strength>0))throw new Error('Invalid gust envelope');
    if(cue.kind==='birds'&&!(Number.isInteger(cue.count)&&cue.count>0&&[1,-1].includes(cue.direction)))throw new Error('Invalid bird flock');
    cues.push(cue);
  }
  return cues;
}
export class EnvironmentMotion {
  constructor(cues,duration){
    this.cues=cues;this.duration=duration;this.hz=240;
    // Integrate velocity once at a fixed timestep. t * instantaneousWind(t)
    // would send particles backwards when a gust subsides.
    this.travel=new Float64Array(Math.ceil(duration*this.hz)+1);
    for(let i=1;i<this.travel.length;i++)this.travel[i]=this.travel[i-1]+(this.speed((i-1)/this.hz)+this.speed(i/this.hz))/(2*this.hz);
  }
  gust(t){
    let value=0;
    for(const c of this.cues)if(c.kind==='wind'&&t>c.start&&t<c.end){
      const u=t-c.start;
      value+=c.strength*(u<c.attack?smooth(u/c.attack):1-smooth((u-c.attack)/(c.end-c.start-c.attack)));
    }
    return value;
  }
  wind(t,x=0,z=0){
    const q=t-(x+4)*.065-z*.012;
    return Math.max(.02,.13+.025*Math.sin(q*1.17)+.017*Math.sin(q*2.41+.7)+this.gust(q));
  }
  response(t,x,z,lag=.16){return .72*this.wind(t-lag,x,z)+.28*this.wind(t-lag-.23,x,z);}
  speed(t){return .52+1.35*this.wind(t);}
  distance(t){
    const k=clamp(t,0,this.duration)*this.hz,i=Math.min(this.travel.length-2,Math.floor(k));
    return this.travel[i]+(this.travel[i+1]-this.travel[i])*(k-i);
  }
  bird(cue,index,t){
    const start=cue.start+index*.18,span=cue.end-cue.start-index*.18,u=clamp((t-start)/span);
    const progress=.65*u+.35*smooth(u),direction=cue.direction;
    const glide=smooth((u-.33)/.10)*(1-smooth((u-.67)/.10));
    const phase=(t-start)*(2.5+seed(index+2)*.45)+index*.31;
    return {visible:t>=start&&t<=cue.end,x:direction*(-8+16*progress),y:2.25+index*.10+.25*Math.sin(u*Math.PI*1.45+index*.16),
      z:-5.8-index*.42+.7*Math.sin(u*Math.PI),wing:Math.sin(phase*Math.PI*2)*(1-glide),direction,glide};
  }
}
