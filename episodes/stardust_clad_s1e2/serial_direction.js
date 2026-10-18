// Episode-specific dramatic changes over the existing rig. All state is absolute-time.
import {T} from './config/event_times.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,u)=>a+(b-a)*u;
const V=(x,y,z=0)=>({x,y,z});
const blend=(a,b,u)=>V(mix(a.x,b.x,u),mix(a.y,b.y,u),mix(a.z,b.z,u));
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const pulse=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const walkProgress=u=>{
  const r=.12,k=1/(1-r);u=clamp(u);
  return u<r?k*u*u/(2*r):u>1-r?1-k*(1-u)**2/(2*r):k*(u-r/2);
};

function travel(s,t,a,b,from,to,{facing,run=false,after}={}){
  const u=clamp((t-a)/(b-a)),k=walkProgress(u),heading=Math.atan2(to[0]-from[0],to[1]-from[1]);
  s.rootX=mix(from[0],to[0],k);s.rootZ=mix(from[1],to[1],k);
  s.yaw=facing??heading;
  s.walk=u>0&&u<1?{from,to,a:u,run,...(facing!=null?{facingYaw:facing}:{})}:null;
  if(t>=b&&after!=null){
    const turn=clamp((t-b)/.7);s.yaw=(facing??heading)+wrap(after-(facing??heading))*ease(turn);
    if(turn>0&&turn<1)s.turn={fromYaw:facing??heading,toYaw:after,a:turn};
  }
}

export function serialState(name,s,phase,t){
  if(name==='yekari')return enemyDirection(s,phase,t);
  if(phase.startsWith('mono')){
    s.visible=name!=='dafu';s.bob=0;s.air=0;s.walk=null;s.turn=null;
    if(name==='aoao'){
      s.rootX=1.3;s.rootZ=-2.2;s.yaw=Math.PI+.38;s.sit={drop:.34,feet:.26};
      const rub=(t<36?1:0)*Math.sin(t*2.4);
      s.left=V(-.10,1.22,.19);s.right=V(.065+.025*rub,1.23,.24);
      s.headPitch=t<37?.10:.03;s.headYaw=.1;
      s.emotion=t<31?'worry':t<78?'sad':'neutral';s.fist=.15;
      if(t>=76){s.headYaw=.48*ease((t-76)/.8);s.headPitch=-.015;}
      if(t>=92){s.emotion='happy';s.right=blend(s.right,V(.20,1.12,.04),ease((t-92)/1.1));}
    }else if(name==='xiaozao'){
      s.rootX=.05;s.rootZ=-2.08;s.yaw=Math.PI-.55;s.sit={drop:.30,feet:.25};
      s.left=V(-.17,1.05,.12);s.right=V(.17,1.03,.10);s.headYaw=-.32;s.headPitch=.02;
      s.emotion=t>=63&&t<80?'worry':'neutral';
      const offer=pulse(t,30.5,31.3,33,34.2);
      s.right=blend(s.right,V(.19,1.22,.20),offer);s.open=.28*offer;
      if(t>=95){
        const up=ease((t-95)/1.1);s.sit={drop:.30*(1-up),feet:.25*(1-up)};
        s.headYaw=-.32*(1-up);
        if(t>=96.2)travel(s,t,96.2,99.5,[.05,-2.08],[-3.4,-1.3],{after:Math.PI});
      }
    }
    return s;
  }
  if(phase==='stir'&&name==='aoao'&&t<102.5){
    s.yaw=Math.PI+.38*(1-ease((t-100)/1.2));
  }
  if(phase==='rally'&&name!=='aoao'){
    const from=name==='xiaozao'?[-4.6,1.4]:[4.6,1.2];
    const to=name==='xiaozao'?[-2,2.4]:[.6,2.6];
    const a=name==='xiaozao'?130.5:129.5;
    travel(s,t,a,a+3.2,from,to,{run:true,after:0});
    if(name==='dafu'){s.left=V(-.28,1.25,.08);s.right=V(.28,1.25,.08);}
  }
  if(name==='aoao'){
    if(phase==='valley')s.left=V(-.18,1.17,.18);
    if(t>=T.SECOND_CUT&&t<162){
      const hit=pulse(t,T.SECOND_CUT,T.SECOND_CUT+.14,T.SECOND_CUT+.5,T.SECOND_CUT+1.3);
      s.left.y-=.11*hit;s.headPitch=.08*hit;s.emotion=hit>.1?'pain':'worry';s.fist=.25;
    }
    if(phase==='turn'||phase==='rain'||phase==='finisher'){
      s.rootX=.2;s.rootZ=3.6;s.yaw=-.35;s.bob=-.010;s.sit=null;
      s.left=V(-.07,1.20,.25);s.right=V(-.03,1.22,.17);s.fist=.20;s.noSwing=1;
      s.headPitch=-.02;s.emotion='determined';
      if(t>=T.C4+.7){s.bob=0;s.emotion='worry';}
    }
  }
  if(name==='xiaozao'&&phase==='fight3'&&t>=T.TEST_SHOT-.6&&t<T.DISC_DROP){
    const shoot=pulse(t,T.TEST_SHOT-.6,T.TEST_SHOT,T.TEST_SHOT+.5,T.TEST_SHOT+1.2);
    s.left=blend(s.left,V(-.18,1.35,.22),shoot);s.noSwing=1;
    s.headYaw=t>201?-.2:0;s.emotion=t>201?'worry':'determined';
  }
  if(name==='xiaozao'&&t>=207&&t<T.DISC_BACK){s.left=V(-.16,1.04,.05);s.right=V(.17,1.04,.03);}
  if(name==='xiaozao'&&(phase==='rain'||phase==='finisher')){
    const release=ease((t-T.RAIN_RELEASE)/.3),relax=ease((t-(T.C4-.8))/1.2);
    s.left=blend(blend(V(-.24,1.44,.16),V(-.16,1.20,.24),release),V(-.17,1.02,.03),relax);
    s.right=V(.17,1.06,.04);s.noSwing=1;s.fist=.6*(1-relax);s.emotion='determined';
  }
  if(name==='dafu'&&t>=T.BRAKE-.5&&t<269){
    s.walk=null;s.turn=null;s.sit=null;s.bob=0;s.air=0;s.tuck=0;s.emotion='determined';s.fist=.7;
    travel(s,t,T.BRAKE,T.BRAKE+1.7,[.9,4.4],[.25,4.18],{after:-1.05});
    const brake=pulse(t,T.BRAKE+1.4,T.BRAKE+1.7,T.BRAKE+1.9,T.BRAKE+2.8);
    s.bob=-.10*brake;s.left=V(-.28,1.22,.06);s.right=V(.28,1.22,.06);return s;
  }
  if(name==='dafu'&&phase==='finisher'){
    s.walk=null;s.turn=null;s.sit=null;s.bob=0;s.air=0;s.tuck=0;
    s.emotion='determined';s.fist=1;s.yaw=-1.05;s.capeLift=0;
    s.rootX=.25;s.rootZ=4.18;
    const charge=ease((t-269)/1.4);
    s.left=blend(V(-.28,1.22,.06),V(-.24,1.78,-.04),charge);
    s.right=blend(V(.28,1.22,.06),V(.24,1.78,-.04),charge);
    const take=T.C4-1.7,u=clamp((t-take)/1.7);
    if(t>=take){
      s.rootX=mix(.25,-.9,ease(u));s.rootZ=mix(4.18,4.15,ease(u));
      s.yaw=mix(-1.05,0,ease(u));s.air=.82*Math.sin(Math.PI*u);
      s.tuck=.14*Math.sin(Math.PI*u);s.capeLift=.5*Math.sin(Math.PI*u);
      const strike=ease((t-(T.C4-.23))/.23);
      s.left=blend(V(-.24,1.78,-.04),V(-.14,1.30,.30),strike);
      s.right=blend(V(.24,1.78,-.04),V(.14,1.30,.30),strike);
    }
    if(t>=T.C4){
      const absorb=pulse(t,T.C4,T.C4+.25,T.C4+.65,T.C4+1.4);
      s.bob=-.15*absorb;s.lean=.09*absorb;s.air=0;s.tuck=0;
      const relax=ease((t-278)/.7);
      s.left=blend(s.left,V(-.28,1.16,.05),relax);s.right=blend(s.right,V(.28,1.16,.05),relax);
    }
    if(t>=279)travel(s,t,279,281,[-.9,4.15],[-.4,3.9],{facing:0,after:-.3});
    return s;
  }
  if(phase==='downed'&&name==='dafu'){
    travel(s,t,285,287.4,[-.4,3.9],[.4,3],{after:-.9});
  }
  if(t>=282&&t<309&&name==='xiaozao'){
    const weak=pulse(t,282,283.2,304.5,309);
    s.bob-=.14*weak;s.headPitch=.12*weak;s.emotion='pain';
    s.left=V(-.12,1.06,.07);s.right=V(.12,1.07,.06);s.fist=.05;
  }
  if(phase==='aftermath'||phase==='briefing'){
    s.sit=null;s.walk=null;s.turn=null;s.air=0;s.tuck=0;s.lean=0;s.bob=0;
    const from={aoao:[-.2,3.4],xiaozao:[-2.2,3.2],dafu:[.4,3]}[name];
    const to={aoao:[0,2.7],xiaozao:[.8,2.68],dafu:[-.65,2.72]}[name];
    const face={aoao:0,xiaozao:-.45,dafu:.3}[name];
    travel(s,t,307,310,from,to,{after:face});
    if(t<307){s.rootX=from[0];s.rootZ=from[1];s.yaw={aoao:-.35,xiaozao:.45,dafu:-.6}[name];s.walk=null;}
    s.emotion='worry';s.fist=.15;
    if(name==='aoao'){
      s.left=V(-.14,1.18,.17);s.right=V(.19,1.14,.10);
      const trem=t<336?Math.sin(t*27)*.004:0;s.left.x+=trem;s.left.y+=trem;
      s.headPitch=t>323&&t<337?.1:0;
      if(t>=335&&t<338)s.emotion='pain';
      if(t>=385)s.emotion='determined';
    }
    if(name==='xiaozao'){
      s.left=V(-.17,1.08,.10);s.right=V(.18,1.10,.08);
      s.headPitch=t<338?.08:0;
    }
    if(name==='dafu'){
      const help=pulse(t,326.5,328.5,335.7,339);
      if(help>0){s.yaw=.3*(1-help);s.sit={drop:.15*help,feet:.08*help};}
      s.right=blend(V(.28,1.22,.05),V(.19-.025*pulse(t,331,332,334,335),1.38,.34),help);
      s.left=V(-.28,1.16,.05);s.open=0;s.fist=.18+.58*help;s.headPitch=.12*help;
    }
    if(t>=342){
      const u=ease((t-342)/1.3)*(1-ease((t-372.5)/1.3));
      s.yaw=face+wrap(Math.PI-face)*u;
      const a=t<350?clamp((t-342)/1.3):clamp((t-372.5)/1.3);
      if(a>0&&a<1)s.turn=t<350?{fromYaw:face,toYaw:Math.PI,a}:{fromYaw:Math.PI,toYaw:face,a};
      s.headYaw=0;s.headPitch=-.06;s.emotion='determined';
    }
    return s;
  }
  if(phase==='departure'){
    s.sit=null;s.bob=0;s.air=0;s.tuck=0;s.emotion='determined';
    const from={aoao:[0,2.7],xiaozao:[.8,2.68],dafu:[-.65,2.72]}[name];
    const to={aoao:[.2,8.8],xiaozao:[1.1,8.1],dafu:[-.85,8.0]}[name];
    travel(s,t,393+(name==='aoao'?0:.5),405,from,to,{after:0});
    if(name==='aoao'){s.left=V(-.16,1.12,.12);s.right=V(.18,1.11,.04);}
    return s;
  }
  if(phase==='gate'||phase==='hook'){
    s.sit=null;s.bob=0;s.air=0;s.tuck=0;s.emotion='worry';
    const x={aoao:0,xiaozao:-.95,dafu:1.0}[name];
    travel(s,t,408,414,[x,5.6],[x,2.3+(name==='aoao'?0:.5)],{after:Math.PI});
    s.headPitch=-.08;s.headYaw=0;
    if(name==='aoao'){s.left=V(-.16,1.15,.12);s.right=V(.18,1.12,.05);}
    return s;
  }
  return s;
}

function enemyDirection(s,phase,t){
  if(t<116)return s;
  if(phase==='reveal')travel(s,t,118,123.9,[3.5,12],[3.2,9],{facing:Math.PI});
  if(phase==='rally')travel(s,t,124,138,[3.2,9],[1.5,6.5],{facing:Math.PI});
  if(t>=140.4&&t<144.4)s.left=blend(V(-.15,1.20,.05),V(-.10,1.34,.27),pulse(t,140.4,141.1,143.5,144.4));
  // Finite movement paths also drive the feet: no root-only creeping during dialogue.
  if(t>=152.6&&t<156){
    travel(s,t,152.6,154.6,[-.9,3.45],[0,4.4],{facing:Math.PI,after:Math.PI});
    s.bob=-.03*(1-ease((t-153.2)/.8));
  }
  if(t>=156&&t<168)travel(s,t,163.5,166,[0,4.4],[1.7,4],{facing:-Math.PI/2,after:-Math.PI/2});
  if(t>=168&&t<177.4){s.rootX=1.7;s.rootZ=4;s.walk=null;s.yaw=-Math.PI/2;}
  if(t>=177.4&&t<178.5){
    travel(s,t,177.4,178,[1.7,4],[1.42,3.65],{facing:-Math.PI/2,run:true});
    s.bob=-.11*ease((t-177.4)/.6);s.lean=.06;s.noSwing=1;
  }
  if(t>=178.5&&t<186){
    travel(s,t,178.5,180.5,[1.42,3.65],[.6,4.2],{facing:-Math.PI/2,after:-2.2});
    s.bob=-.11*(1-ease((t-178.5)/.6));
  }
  if(t>=186&&t<206)travel(s,t,189.5,193,[.6,4.2],[-1.8,3.9],{facing:-2.2,after:-2.2});
  if(t>=206&&t<224){
    travel(s,t,207,209,[-1.8,3.9],[-1.6,4.4],{facing:1.9,after:1.9});
    const memory=pulse(t,215.5,216.3,222,223.2);
    s.left=blend(V(-.15,1.20,.05),V(-.02,1.42,.14),memory);s.headPitch=.06*memory;
    if(t>=206.7)s.right=V(.16,1.20,.10);
    s.emotion=t>=220?'sad':'neutral';
  }
  if(phase==='turn'){
    s.walk=null;s.turn=null;
    if(t<229){s.rootX=-1.6;s.rootZ=4.4;s.yaw=1.9;}
    else if(t<240)travel(s,t,229.5,233.5,[-1.6,4.4],[1.2,4.9],{facing:Math.PI,after:-1.2});
    else travel(s,t,246,250,[1.2,4.9],[-.9,4.6],{facing:Math.PI,run:true});
  }
  if(phase==='rain'){
    s.rootX=-.9;s.rootZ=4.6;s.yaw=Math.PI;s.walk=null;
    const parry=t>=T.RAIN_RELEASE?Math.max(0,Math.sin((t-T.RAIN_RELEASE)*7))*.65:0;
    s.right=blend(V(.10,1.42,.24),V(.23,1.55,.12),parry);s.left=V(-.14,1.27,.14);s.bob=-.01;s.emotion='determined';
    if(t>=T.BLOCK_RIGHT&&t<259)travel(s,t,T.BLOCK_RIGHT,T.BLOCK_RIGHT+1.2,[-.9,4.6],[-1.35,4.9],{facing:Math.PI});
    if(t>=259&&t<261.2)travel(s,t,259,260.2,[-1.35,4.9],[-.9,4.6],{facing:Math.PI});
    if(t>=261.2&&t<262.4)travel(s,t,261.2,262.4,[-.9,4.6],[-.5,4.65],{facing:Math.PI});
    if(t>=262.4)travel(s,t,262.4,263.9,[-.5,4.65],[-.9,4.6],{facing:Math.PI});
  }
  if(phase==='finisher'){
    s.rootX=-.9;s.rootZ=4.6;s.yaw=Math.PI;s.walk=null;s.sit=null;
    s.bob=-.025;s.left=V(-.14,1.30,.21);s.right=V(.14,1.30,.21);
    if(t>=274.7&&t<T.C4){s.rootX+=.10*Math.sin((t-274.7)/1.3*Math.PI);s.emotion='surprised';}
    if(t>=T.C4){const hit=ease((t-T.C4)/.35);
      s.sit={drop:.24*hit,feet:.22*hit};s.bob=-.025-.145*hit;s.headPitch=.18*hit;s.emotion='pain';}
  }
  if(t>=284){
    s.visible=t<304;s.rootX=-.9;s.rootZ=4.6;s.yaw=Math.PI;
    s.sit={drop:.24,feet:.22};s.bob=-.17;s.headPitch=.18;s.emotion='pain';s.walk=null;s.turn=null;
    s.left=V(-.15,1.20,.13);s.right=V(.16,1.22,.12);
    if(t>=T.BOLT){const up=ease((t-T.BOLT)/.75);s.sit={drop:.24*(1-up),feet:.22*(1-up)};s.bob=-.17*(1-up);s.headPitch=.18*(1-up);}
    if(t>=T.BOLT+.8){s.sit=null;s.bob=0;
      if(t<300.2)travel(s,t,T.BOLT+.8,300.2,[-.9,4.6],[.3,8.5],{run:true});
      else travel(s,t,300.2,303.8,[.3,8.5],[2,14],{run:true});
    }
  }
  return s;
}
