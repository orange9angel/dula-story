// Episode-local 2.5D drawing prototype. Paths deform from the semantic rig;
// this is not a retouched still or an independently generated frame sequence.
const P={ink:'#382d38',skin:'#ffe3d1',skinShade:'#ecc1ad',hair:'#644039',hairShade:'#4a3030',
  hairLight:'#86584b',white:'#fff9ed',clothShade:'#dddce5',navy:'#35466f',navyDark:'#293452',
  navyLight:'#4b5c88',red:'#d95863',shoe:'#684c45',sole:'#352f39',iris:'#5aa5c1'};
const mix=(a,b,t)=>a+(b-a)*t;
const point=(x,y)=>({x,y});
const norm=p=>{const n=Math.hypot(p.x,p.y)||1;return{x:p.x/n,y:p.y/n};};

function shape(c, d, fill, width=.006, stroke=P.ink) {
  const p=new Path2D(d);c.fillStyle=fill;c.fill(p);
  if(width){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke(p);}
  return p;
}
function line(c,d,width=.004,color=P.ink){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke(new Path2D(d));}
function ellipse(c,x,y,rx,ry,fill,stroke=null,width=.004){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}

function ribbonSamples(points,radii,n=42) {
  const [a,b,d]=points;
  const tangent=norm({x:d.x-a.x,y:d.y-a.y});
  const bridge=Math.min(Math.hypot(b.x-a.x,b.y-a.y),Math.hypot(d.x-b.x,d.y-b.y))*.8;
  const samples=[];
  for(let i=0;i<=n;i++){
    const u=i/n*2,k=Math.min(1,Math.floor(u)),s=u-k;
    const p0=k?b:a,p1=k?d:b;
    const m0=k?{x:tangent.x*bridge,y:tangent.y*bridge}:{x:b.x-a.x,y:b.y-a.y};
    const m1=k?{x:d.x-b.x,y:d.y-b.y}:{x:tangent.x*bridge,y:tangent.y*bridge};
    const h00=2*s**3-3*s*s+1,h10=s**3-2*s*s+s,h01=-2*s**3+3*s*s,h11=s**3-s*s;
    const x=h00*p0.x+h10*m0.x+h01*p1.x+h11*m1.x;
    const y=h00*p0.y+h10*m0.y+h01*p1.y+h11*m1.y;
    const dx=(6*s*s-6*s)*p0.x+(3*s*s-4*s+1)*m0.x+(-6*s*s+6*s)*p1.x+(3*s*s-2*s)*m1.x;
    const dy=(6*s*s-6*s)*p0.y+(3*s*s-4*s+1)*m0.y+(-6*s*s+6*s)*p1.y+(3*s*s-2*s)*m1.y;
    const normal=norm({x:-dy,y:dx});
    const r=mix(radii[k],radii[k+1],s);
    samples.push({x,y,nx:normal.x,ny:normal.y,r,u:i/n});
  }
  return samples;
}
function ribbonPath(samples,extra=0) {
  const p=new Path2D();
  samples.forEach((s,i)=>{const x=s.x+s.nx*(s.r+extra),y=s.y+s.ny*(s.r+extra);i?p.lineTo(x,y):p.moveTo(x,y);});
  for(const s of [...samples].reverse())p.lineTo(s.x-s.nx*(s.r+extra),s.y-s.ny*(s.r+extra));
  p.closePath();return p;
}
function ribbon(c,points,radii,fill,sock=false){
  const ss=ribbonSamples(points,radii),p=ribbonPath(ss);
  c.fillStyle=fill;c.fill(p);
  if(sock){
    c.save();c.clip(p);c.fillStyle=P.white;c.fill(ribbonPath(ss.filter(s=>s.u>=.68),.008));c.restore();
    const a=ss.find(s=>s.u>=.68);
    line(c,`M ${a.x+a.nx*a.r} ${a.y+a.ny*a.r} Q ${a.x+.008} ${a.y-.006} ${a.x-a.nx*a.r} ${a.y-a.ny*a.r}`,.0035,'#8e8c9e');
  }
  c.strokeStyle=P.ink;c.lineWidth=.006;c.lineJoin='round';c.stroke(p);
  return ss;
}

function hand(c,wrist,elbow,{pointing=0,curl=0,flip=1}={}){
  const ang=Math.atan2(wrist.y-elbow.y,wrist.x-elbow.x);
  c.save();c.translate(wrist.x,wrist.y);c.rotate(ang);c.scale(1,flip);
  // One continuous four-digit silhouette (three fingers plus thumb).
  const low=mix(.094,.068,Math.max(curl,pointing)),mid=mix(.119,.076,Math.max(curl,pointing));
  const index=mix(.115,.163,pointing);
  const thumb=mix(.062,.046,curl);
  shape(c,`M -.008 -.024 C .012 -.031 .034 -.037 .053 -.037
    C ${low-.01} -.047 ${low+.012} -.052 ${low+.013} -.039
    C ${low+.017} -.025 ${low-.002} -.023 .065 -.020
    C ${mid} -.033 ${mid+.018} -.029 ${mid+.017} -.014
    C ${mid+.013} -.004 .087 -.004 .067 -.001
    C .084 .003 ${index} .002 ${index+.003} .017
    C ${index+.006} .033 ${index-.021} .035 .070 .032
    Q .057 .034 .046 .039
    C .046 .055 .043 ${thumb+.016} .026 ${thumb+.013}
    C .013 ${thumb+.01} .022 .045 .006 .027 L -.008 .023 Z`,P.skin,.0055);
  if(pointing>.25||curl>.4){line(c,'M .065 -.019 Q .076 -.012 .069 -.004',.003,'#b48078');line(c,'M .044 .037 Q .029 .029 .036 .011',.003,'#b48078');}
  c.restore();
}

function shoe(c,ankle,far=false,pitch=0){
  c.save();c.translate(ankle.x,ankle.y);c.rotate(pitch);
  shape(c,'M -.047 .034 Q -.058 .024 -.056 -.006 L -.055 -.059 Q -.046 -.080 -.022 -.080 L .102 -.080 Q .154 -.078 .154 -.047 Q .151 -.020 .113 -.013 Q .066 .000 .034 .033 Q .005 .055 -.047 .034 Z',far?'#59464b':P.shoe,.006);
  shape(c,'M -.055 -.055 Q .045 -.064 .151 -.046 Q .159 -.073 .108 -.080 L -.023 -.080 Q -.050 -.077 -.055 -.055 Z',P.sole,.003);
  shape(c,'M -.034 .030 Q -.006 .048 .027 .030 L .059 .004 Q .028 -.012 -.007 -.009 Z',far?'#8b7774':'#98796b',.003);
  line(c,'M .018 .022 Q .040 .024 .059 .004',.006,P.sole);
  c.restore();
}

function tail(c,side,pose){
  c.save();c.translate(pose.head.x+side*.265,pose.head.y+.15);
  c.rotate(side*(.1+Math.sin(pose.t*5-side*.6)*.025)+(pose.kind==='walk'?-.08:0));c.scale(side,1);
  shape(c,'M -.021 .068 C .116 .095 .172 -.031 .156 -.171 C .137 -.341 .165 -.455 .106 -.531 Q .104 -.473 .063 -.462 Q .046 -.509 .014 -.509 C .063 -.399 -.043 -.310 -.046 -.150 Q -.060 .012 -.021 .068 Z',P.hairShade,.007);
  shape(c,'M .007 .019 C .096 .045 .121 -.040 .092 -.218 Q .059 -.377 .085 -.445 Q .029 -.360 .036 -.229 Q .073 -.037 .007 .019 Z',P.hair,0);
  shape(c,'M -.032 .037 Q .040 .064 .090 .030 L .087 -.002 Q .029 .019 -.031 .005 Z',P.red,.004);
  c.restore();
}

function eye(c,x,y,turn,angry,blink,far=false){
  c.save();c.translate(x,y);c.scale(far?(.98-turn*.5):1,Math.max(.06,1-blink*.94));
  const top=.054-angry*.008;
  shape(c,`M -.053 .010 C -.047 ${top+.035} .024 ${top+.035} .052 .032 C .066 -.028 .034 -.062 -.007 -.060 Q -.050 -.055 -.053 .010 Z`,P.white,.0035);
  c.save();c.clip(new Path2D(`M -.053 .010 C -.047 ${top+.035} .024 ${top+.035} .052 .032 C .066 -.028 .034 -.062 -.007 -.060 Q -.050 -.055 -.053 .010 Z`));
  ellipse(c,.005+turn*.027,.006,.034,.059,'#304965');
  ellipse(c,.007+turn*.027,-.012,.029,.041,P.iris);
  ellipse(c,.005+turn*.027,.009,.015,.037,'#263143');
  ellipse(c,-.007+turn*.027,.039,.010,.014,'#fffdf4');
  ellipse(c,.022+turn*.027,-.025,.005,.007,'#d6f6ef');c.restore();
  line(c,`M -.062 .027 Q -.019 ${top+.053} .046 .044 L .059 .041`,.009);
  line(c,'M -.052 .035 L -.065 .050',.0045);
  c.restore();
}

// Reuse the approved eye drawing as a texture on the 3D head surface.
export {eye as drawEye};

function head(c,p){
  c.save();c.translate(p.head.x,p.head.y);c.rotate(-p.anticipation*.055+p.point*.035);
  // Back cap, ears, face, then explicitly drawn bangs and side locks.
  shape(c,'M -.296 -.123 C -.364 .146 -.290 .340 -.109 .353 C .151 .432 .350 .266 .320 -.081 L .257 -.186 L -.254 -.192 Z',P.hairShade,.007);
  ellipse(c,-.267,-.060,.046,.062,P.skin,P.ink,.005);
  ellipse(c,.267,-.060,.046,.062,P.skin,P.ink,.005);
  shape(c,'M -.240 .203 C -.288 .147 -.293 -.042 -.228 -.152 Q -.160 -.251 -.023 -.268 Q .133 -.278 .229 -.154 C .294 -.047 .288 .150 .223 .213 Q -.022 .293 -.240 .203 Z',P.skin,.006);
  shape(c,'M .243 .096 Q .287 -.091 .209 -.174 Q .116 -.252 -.023 -.268 Q .158 -.218 .201 -.095 Q .227 .037 .243 .096 Z',P.skinShade,0);
  const off=p.turn*.11;
  eye(c,-.106+off,.005,p.turn,p.point,p.blink,true);
  eye(c,.103+off,.005,p.turn,p.point,p.blink,false);
  const a=p.point;
  line(c,`M -.165 .126 Q -.123 ${.146-.030*a} -.064 ${.123-.033*a}`,.007,P.hairShade);
  line(c,`M .063 ${.122-.033*a} Q .123 ${.142-.030*a} .166 .127`,.007,P.hairShade);
  ellipse(c,-.177,-.10,.039,.015,'#efafa5');ellipse(c,.177,-.10,.039,.015,'#efafa5');
  line(c,`M ${.007+off} -.075 Q ${.018+off} -.093 ${.004+off} -.100`,.003,'#c5968a');
  line(c,a>.35?'M -.033 -.164 Q .005 -.149 .036 -.164':'M -.031 -.153 Q .002 -.184 .037 -.149',.005,'#985c64');
  shape(c,'M -.277 .044 C -.325 .186 -.245 .335 -.093 .337 Q .093 .377 .212 .289 Q .283 .230 .269 .084 Q .244 .113 .222 .151 Q .218 .093 .192 .073 Q .172 .152 .135 .177 Q .125 .115 .091 .088 Q .083 .184 .019 .220 Q .029 .169 -.010 .125 Q -.043 .158 -.066 .221 Q -.115 .157 -.193 .142 Q -.207 .076 -.226 -.051 L -.266 -.084 Q -.285 -.012 -.277 .044 Z',P.hair,.006);
  shape(c,'M -.248 .226 C -.136 .346 .063 .326 .160 .286 Q .034 .320 -.081 .279 Q -.194 .244 -.248 .226 Z',P.hairLight,0);
  line(c,'M -.073 .332 Q -.107 .417 -.025 .409 Q -.081 .391 -.057 .346',.006,P.hairShade);
  c.restore();
}

export function drawYuki(c,p,{silhouette=false,rig=false}={}){
  c.save();c.lineJoin='round';c.lineCap='round';
  // Layer order is deliberately shot-local: no arbitrary full orbit supported.
  tail(c,-1,p);tail(c,1,p);
  const limbs=[['leftLeg',true],['rightLeg',false]];
  for(const [key,far] of limbs){
    ribbon(c,p[key],[.064,.041,.031],far?'#eed0bf':P.skin,true);
    shoe(c,p[key][2],far,p[key==='leftLeg'?'leftFootPitch':'rightFootPitch']);
  }
  for(const side of ['left','right']){
    const arm=p[side+'Arm'];ribbon(c,arm,[.052,.036,.025],side==='left'?'#f3d3c2':P.skin);
    const short=[arm[0],{x:mix(arm[0].x,arm[1].x,.26),y:mix(arm[0].y,arm[1].y,.26)},{x:mix(arm[0].x,arm[1].x,.57),y:mix(arm[0].y,arm[1].y,.57)}];
    ribbon(c,short,[.071,.065,.055],side==='left'?P.clothShade:P.white);
  }
  c.save();c.translate(p.rootX+p.lean,p.bob);
  shape(c,'M -.048 1.135 L -.047 1.050 Q 0 1.005 .049 1.050 L .048 1.135 Z',P.skin,.005);
  shape(c,'M -.174 1.091 Q -.082 1.125 -.047 1.108 Q 0 1.067 .049 1.108 Q .118 1.119 .177 1.087 L .159 .916 Q .149 .850 .171 .803 Q 0 .778 -.172 .803 Q -.149 .873 -.16 .921 Z',P.white,.006);
  shape(c,'M .114 1.090 L .159 1.067 L .145 .918 Q .137 .855 .16 .811 L .10 .810 Q .125 .95 .114 1.090 Z',P.clothShade,0);
  shape(c,'M -.167 1.084 L -.070 1.104 L 0 1.006 L .069 1.104 L .172 1.084 Q .121 1.017 0 .963 Q -.119 1.011 -.167 1.084 Z',P.navy,.005);
  line(c,'M -.139 1.081 Q -.093 1.027 0 .990 Q .092 1.027 .145 1.083',.005,P.white);
  shape(c,'M -.017 1.006 Q -.070 1.013 -.095 .975 L -.027 .943 L 0 .981 L .030 .943 L .096 .975 Q .065 1.013 .017 1.006 Z',P.red,.004);
  shape(c,'M -.016 .987 L -.036 .920 L 0 .896 L .038 .922 L .016 .987 Z',P.red,.004);
  const sw=Math.sin(p.t*5)*.009*(p.kind==='walk'?1:.1);
  shape(c,`M -.166 .813 Q 0 .787 .167 .813 Q .196 .709 ${.274+sw} .554 Q .142 .527 .025 .540 Q -.130 .520 ${-.271+sw} .554 Q -.197 .707 -.166 .813 Z`,P.navy,.006);
  shape(c,`M .111 .800 L ${.163+sw} .542 Q .222 .544 ${.274+sw} .554 Q .202 .708 .167 .813 Z`,P.navyDark,0);
  for(const x of [-.11,-.037,.039,.108])line(c,`M ${x} .773 Q ${x*1.24+sw} .651 ${x*1.53+sw} .554`,.003,P.navyDark);
  line(c,`M ${-.238+sw} .577 Q .018 .551 ${.239+sw} .579`,.006,'#7382a2');
  c.restore();
  hand(c,p.leftArm[2],p.leftArm[1],{curl:Math.max(.24,p.point*.8),flip:-1});
  hand(c,p.rightArm[2],p.rightArm[1],{pointing:p.point,curl:Math.max(.24,p.anticipation*.7)});
  head(c,p);
  if(silhouette){c.globalCompositeOperation='source-in';c.fillStyle=P.ink;c.fillRect(-2,-1,4,4);}
  if(rig){
    for(const key of ['leftArm','rightArm','leftLeg','rightLeg']){
      const a=p[key];line(c,`M ${a[0].x} ${a[0].y} L ${a[1].x} ${a[1].y} L ${a[2].x} ${a[2].y}`,.006,'#ef4f76');
      for(const q of a)ellipse(c,q.x,q.y,.011,.011,'#fff','#ef4f76',.003);
    }
  }
  c.restore();
}
