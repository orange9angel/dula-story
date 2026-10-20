import * as THREE from 'three';

// Opt-in, independently authored main-lock study. Does not change the old hair.
const V = p => new THREE.Vector3(...p);
const smooth = THREE.MathUtils.smoothstep;
const center = V([0,.082,-.018]);
const N=40,M=24;
const palette={base:'#203e47',dark:'#18323b',light:'#294b55',ink:'#102832'};

function hairMaterial(color,key,{graphicMass=false,lightPlane=false}={}){
 const material=new THREE.MeshBasicMaterial({color:graphicMass?'#1d3740':color,side:THREE.DoubleSide});
 material.onBeforeCompile=s=>{
  s.uniforms.hairKey={value:key};
  s.vertexShader='varying vec3 lockNormal; varying vec2 lockUV;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   lockNormal=normalize(mat3(modelMatrix)*normal);lockUV=uv;`);
  s.fragmentShader='varying vec3 lockNormal; varying vec2 lockUV; uniform vec3 hairKey;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float facing=dot(normalize(lockNormal),hairKey);
   float lit=smoothstep(-.12,.08,facing);
   diffuseColor.rgb*=mix(vec3(.80,.83,.88),vec3(1.),lit);
   // An authored light plane follows each lock's longitudinal coordinates.
   // It changes width along the lock; no head-height band or strand noise.
   float u=lockUV.x,v=lockUV.y;
   float centerline=.30+.11*sin(u*3.14159265);
   float width=.18*pow(max(0.,sin(u*3.14159265)),.55);
   float shape=1.-smoothstep(width-.012,width+.012,abs(v-centerline));
   float ends=smoothstep(.08,.23,u)*(1.-smoothstep(.82,.98,u));
   diffuseColor.rgb+=vec3(.020,.037,.044)*shape*ends*smoothstep(.12,.55,facing);`);
  if(graphicMass)s.fragmentShader=s.fragmentShader.replace(
   /float facing=dot\(normalize\(lockNormal\),hairKey\);[\s\S]*?smoothstep\(\.12,\.55,facing\);/,
   `// All overlapping masses share the exact same dark fill. Only selected
    // broad planes receive drawn light; no per-tuft cylindrical form shading.
    float u=lockUV.x,v=lockUV.y;
    float mid=.28+.12*sin(u*3.14159265);
    float w=.12*pow(max(0.,sin(u*3.14159265)),.6)
      *smoothstep(.08,.32,u)*(1.-smoothstep(.70,.94,u));
    float mask=(1.-smoothstep(w-.01,w+.01,abs(v-mid)))
      *smoothstep(.08,.25,u)*(1.-smoothstep(.77,.96,u));
    float facing=dot(normalize(lockNormal),hairKey);
    diffuseColor.rgb+=vec3(.016,.032,.038)*mask
      *smoothstep(-.1,.5,facing)*${lightPlane?'1.0':'0.0'};`);
 };
 material.customProgramCacheKey=()=> `sculpted-hair-lock-v3-${graphicMass}-${lightPlane}`;
 return material;
}

function makeLock(root,parts,mat,{name,points,widths,normal,depth=.014,lag=1,ink=true,rootedEdge=false}){
 // Bury only the proximal roots in the backing volume. Middle and silhouette
 // remain authored; they are not all projected onto a scalp-sized ellipsoid.
 const controls=points.map(V);
 controls[0].sub(center).multiplyScalar(.81).add(center);
 for(const i of [1,2]){
  const d=controls[i].clone().sub(center),r=V([.158,.218,.178]);
  if(d.clone().divide(r).length()>1){
   const inner=d.clone().divide(r).normalize().multiply(r).add(center);
   controls[i].lerp(inner,i===1?.30:.12);
  }
 }
 const curve=new THREE.CatmullRomCurve3(controls);
 const hint=V(normal),pos=[],uv=[],ix=[],edgePoints=[[],[]],outwards=[],radials=[];
 const width=u=>{
  const q=u*(widths.length-1),i=Math.min(widths.length-2,Math.floor(q));
  const t=q-i,p0=widths[Math.max(0,i-1)],p1=widths[i],p2=widths[i+1],p3=widths[Math.min(widths.length-1,i+2)];
  return Math.max(0,.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t));
 };
 const tangents=Array.from({length:N+1},(_,i)=>curve.getTangent(i/N));
 const transported=hint.clone().cross(tangents[0]).normalize();
 for(let i=0;i<=N;i++){
  const u=i/N,p=curve.getPoint(u);
  // Parallel transport avoids the abrupt cross-section flips produced by
  // rebuilding a frame from a fixed axis at every point.
  if(i)transported.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(tangents[i-1],tangents[i]));
  const side=transported.clone(),outward=tangents[i].clone().cross(side).normalize();
  outwards.push(outward);
  const w=width(u)*smooth(u,0,.10)+.00002,bulge=w*.22;
  for(let j=0;j<=M;j++){
   const phi=j/M*Math.PI*2,c=Math.cos(phi),s=Math.sin(phi);
   const across=c,front=s;
   const radial=side.clone().multiplyScalar(w*across).addScaledVector(outward,bulge*front);
   const q=p.clone().add(radial);
   if(rootedEdge){
    // Small directional tips break the exposed lower border. They only extend
    // the existing fringe; no root is moved back to enlarge the forehead.
    const tip=(at,left,right,height)=>{
     const d=u-at;
     return height*(d<0?smooth(u,at-left,at):1-smooth(u,at,at+right));
    };
    const extra=tip(.33,.12,.025,.006)+tip(.49,.14,.03,.008)+tip(.65,.10,.025,.004);
    q.y-=extra*Math.max(0,-side.y*across)**.6;
   }
   if(s<0){
    const d=q.clone().sub(center),r=V([.150,.210,.169]);
    if(d.clone().divide(r).length()>1){
     const inner=d.clone().divide(r).normalize().multiply(r).add(center);
     q.lerp(inner,(-s)**.8*(1-smooth(u,.72,.98)));
    }
   }
   pos.push(...q.toArray());uv.push(u,(across+1)/2);radials.push(radial.normalize());
   if(j===0)edgePoints[0].push(q.clone());
   if(j===M/2)edgePoints[1].push(q.clone());
   if(i<N&&j<M){const k=i*(M+1)+j;ix.push(k,k+1,k+M+1,k+1,k+M+2,k+M+1);}
  }
 }
 // Keep the authored crown airy without dwarfing the unchanged face.
 const finish=(x,y,z)=>[x*.94,.082+(y-.082)*.89,z*(z<0?.92:.96)];
 for(let i=0;i<pos.length;i+=3)[pos[i],pos[i+1],pos[i+2]]=finish(pos[i],pos[i+1],pos[i+2]);
 for(const edge of edgePoints)for(const p of edge)p.set(...finish(p.x,p.y,p.z));
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(ix);geometry.computeVertexNormals();
 // Keep outward normals coherent for the artist's lighting field.
 const normals=geometry.attributes.normal;
 for(let i=0;i<normals.count;i++){
  const n=new THREE.Vector3().fromBufferAttribute(normals,i),out=radials[i];
  if(n.dot(out)<0)n.negate();normals.setXYZ(i,n.x,n.y,n.z);
 }
 const mesh=new THREE.Mesh(geometry,mat);mesh.name=name;root.add(mesh);
 const geometries=[geometry];
 if(ink)for(let e=0;e<2;e++){
  const pts=[],indices=[];
  for(let i=0;i<=N;i++){
    const u=i/N,edge=edgePoints[e][i],q=curve.getPoint(u),toCenter=V(finish(q.x,q.y,q.z)).sub(edge).normalize();
   const thickness=.00085*Math.sin(Math.PI*smooth(u,.08,1))**.45;
   for(const w of [0,thickness]){
    const q=edge.clone().addScaledVector(toCenter,w).addScaledVector(outwards[i],.0009);
    pts.push(...q.toArray());
   }
   if(i<N){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(indices);
  const line=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:palette.ink,side:THREE.DoubleSide}));
  line.name=name+'-edge-'+e;root.add(line);geometries.push(g);
 }
 parts.push({name,lag,geometries:geometries.map(g=>({g,rest:g.attributes.position.array.slice(),restNormals:g.attributes.normal?.array.slice(),columns:g.attributes.position.count/(N+1)}))});
}

function boundaryFringe(root,parts,mat,{ink=true}={}){
 // Two independently drawn silhouette boundaries, then a shallow closed
 // surface between them. This experiment replaces only the central fringe.
 const outer=new THREE.CubicBezierCurve3(
  V([.016,.270,.090]),V([-.105,.284,.160]),V([-.105,.160,.184]),V([-.020,.118,.157]));
 const inner=new THREE.CubicBezierCurve3(
  V([.016,.270,.090]),V([-.016,.242,.164]),V([-.055,.190,.181]),V([-.020,.118,.157]));
 const finish=p=>p.set(p.x*.94,.082+(p.y-.082)*.89,p.z*.96);
 const pos=[],uv=[],ix=[];
 for(let i=0;i<=N;i++){
  const u=i/N,a=outer.getPoint(u),b=inner.getPoint(u);
  for(let j=0;j<=M;j++){
   const front=j<=M/2,v=front?j/(M/2):(M-j)/(M/2);
   const q=a.clone().lerp(b,v);
   q.z+=(front?.006:-.004)*Math.sin(Math.PI*v)*Math.sin(Math.PI*u);
   finish(q);pos.push(...q.toArray());uv.push(u,v);
   if(i<N&&j<M){const k=i*(M+1)+j;ix.push(k,k+M+1,k+1,k+1,k+M+1,k+M+2);}
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setIndex(ix);g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,mat);mesh.name='contour-central-fringe';root.add(mesh);
 const geometries=[g];
 if(ink)for(const edge of [outer,inner]){
  const p=[],index=[];
  for(let i=0;i<=N;i++){
   const u=i/N,a=edge.getPoint(u),middle=outer.getPoint(u).lerp(inner.getPoint(u),.5);
   const inward=middle.sub(a).normalize();
   for(const d of [0,.0008*Math.sin(Math.PI*u)**.5]){
    const q=a.clone().addScaledVector(inward,d);q.z+=.0005;finish(q);p.push(...q.toArray());
   }
   if(i<N){const k=i*2;index.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const line=new THREE.BufferGeometry();line.setAttribute('position',new THREE.Float32BufferAttribute(p,3));line.setIndex(index);
  root.add(new THREE.Mesh(line,new THREE.MeshBasicMaterial({color:palette.ink,side:THREE.DoubleSide})));
  geometries.push(line);
 }
 parts.push({name:'contour-central-fringe',lag:1.1,geometries:geometries.map(g=>({
  g,rest:g.attributes.position.array.slice(),restNormals:g.attributes.normal?.array.slice(),columns:g.attributes.position.count/(N+1)
 }))});
}

function connectedLowerMass(root,mat,{neckLength=false,parts}={}){
 // One continuous lower occipital surface. It occupies only the ear-back and
 // nape region; it must not expand into the ear or cheek silhouette.
 const rows=neckLength?N:36,cols=100,pos=[],uv=[],ix=[];
 const hem=[[1.94,1.86],[2.15,2.08],[2.38,2.22],[2.56,2.39],
  [2.78,2.29],[2.98,2.45],[3.16,2.32],[3.36,2.47],[3.58,2.30],
  [3.81,2.36],[4.02,2.16],[4.34,1.86]];
 const longHem=[[1.94,.008],[2.12,-.030],[2.40,-.078],[2.49,-.052],
  [2.80,-.101],[2.90,-.065],[3.24,-.110],[3.34,-.077],
  [3.70,-.097],[3.79,-.057],[4.06,-.073],[4.20,-.023],[4.34,.008]];
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
  const a=1.94+j/cols*(4.34-1.94);
  let end=2.1;
  for(let k=1;k<hem.length;k++)if(a<=hem[k][0]){
   end=THREE.MathUtils.lerp(hem[k-1][1],hem[k][1],smooth(a,hem[k-1][0],hem[k][0]));break;
  }
  const u=i/rows,th=THREE.MathUtils.lerp(1.43,end,u);
  let x=.132*Math.sin(th)*Math.sin(a),y=.082+.184*Math.cos(th),z=-.018+.165*Math.sin(th)*Math.cos(a);
  if(neckLength){
   let bottom=longHem.at(-1)[1];
   for(let k=1;k<longHem.length;k++)if(a<=longHem[k][0]){
    bottom=THREE.MathUtils.lerp(longHem[k-1][1],longHem[k][1],smooth(a,longHem[k-1][0],longHem[k][0]));break;
   }
   const bend=smooth(u,.1,1);
   x=THREE.MathUtils.lerp(.132,.082,bend**1.4)*Math.sin(a);
   y=THREE.MathUtils.lerp(.108,bottom,u);
   z=-.018+THREE.MathUtils.lerp(.165,.114,bend**1.6)*Math.cos(a);
  }
  pos.push(x*.94,.082+(y-.082)*.89,z*.92);uv.push(u,j/cols);
  if(i<rows&&j<cols){const k=i*(cols+1)+j;ix.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(ix);geometry.computeVertexNormals();
 const back=new THREE.Mesh(geometry,mat);back.name='connected-lower-hair-mass';root.add(back);
 if(neckLength)parts.push({name:'neck-length-mass',lag:.45,geometries:[{
  g:geometry,rest:geometry.attributes.position.array.slice(),restNormals:geometry.attributes.normal.array.slice(),columns:cols+1
 }]});
 for(const sign of [-1,1]){
  const outer=neckLength?new THREE.CubicBezierCurve3(
   V([sign*.120,.170,.062]),V([sign*.141,.112,.064]),V([sign*.128,.031,.049]),V([sign*.113,-.006,.037])):new THREE.CubicBezierCurve3(
   V([sign*.120,.170,.062]),V([sign*.140,.121,.077]),V([sign*.135,.071,.061]),V([sign*.127,.045,.043]));
  const inner=neckLength?new THREE.CubicBezierCurve3(
   V([sign*.120,.170,.062]),V([sign*.134,.108,.030]),V([sign*.120,.025,.022]),V([sign*.113,-.006,.037])):new THREE.CubicBezierCurve3(
   V([sign*.120,.170,.062]),V([sign*.135,.122,.041]),V([sign*.130,.078,.032]),V([sign*.127,.045,.043]));
  const p=[],t=[],index=[];
  for(let i=0;i<=N;i++)for(let j=0;j<=M;j++){
   const u=i/N,front=j<=M/2,v=front?j/(M/2):(M-j)/(M/2);
   const q=outer.getPoint(u).lerp(inner.getPoint(u),v);
   q.x+=sign*(front?.004:-.003)*Math.sin(Math.PI*v)*Math.sin(Math.PI*u);
   p.push(q.x*.94,.082+(q.y-.082)*.89,q.z*.96);t.push(u,v);
   if(i<N&&j<M){const k=i*(M+1)+j;index.push(k,k+1,k+M+1,k+1,k+M+2,k+M+1);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(t,2));g.setIndex(index);g.computeVertexNormals();
  const side=new THREE.Mesh(g,mat);side.name='connected-temple-mass-'+sign;root.add(side);
  if(neckLength)parts.push({name:'long-sideburn-'+sign,lag:.25,geometries:[{
   g,rest:g.attributes.position.array.slice(),restNormals:g.attributes.normal.array.slice(),columns:M+1
  }]});
 }
}

export function installSculptedHair(actor,{contourFringe=false,graphicMass=false,neckLength=false,rootedHairline=false}={}){
 const root=new THREE.Group();root.name='sculpted-hair-study';actor.headGroup.add(root);
 const key=V([-3,5,4]).normalize(),parts=[];
 const mats={base:hairMaterial(palette.base,key,{graphicMass}),dark:hairMaterial(palette.dark,key,{graphicMass}),
  light:hairMaterial(palette.light,key,{graphicMass,lightPlane:true})};
 const litNames=new Set(['forelock-left','forelock-right','side-high--1','side-high-1',
  'side-mid--1','side-mid-1','rear-main','rear-left-upper','rear-right-middle']);
 const add=(name,points,widths,normal,options={})=>{
  const p=points.map(p=>p.slice());
  // Profile contour must carry the swept direction as well as the front view.
  // The previous side tips stayed inside the posterior silhouette.
  if(graphicMass&&name.startsWith('side-high-')){
   p[1][2]=-.05;p[2][2]=-.19;p[2][1]=.19;p[3][2]=-.225;p[3][1]=.26;
   p[2][0]*=.93;p[3][0]*=.84;
  }
  if(graphicMass&&name.startsWith('side-mid-')){
   p[1][2]=-.02;p[2][2]=-.20;p[2][1]=.09;p[3][2]=-.255;p[3][1]=.14;
   p[2][0]*=.93;p[3][0]*=.85;
  }
  if(neckLength&&name.startsWith('nape-')){
   // Carry the existing nape flow down into the lower fill, instead of leaving
   // a separate rectangular extension hanging below the old short haircut.
   p[2][1]-=.020;p[3][1]-=.045;
   p[3][0]*=.82;p[3][2]*=.84;
  }
  if(neckLength&&name==='rear-main'){
   p[2][1]=.065;p[3][1]=-.098;p[3][2]=-.159;
  }
  makeLock(root,parts,mats[graphicMass?(litNames.has(name)?'light':'base'):options.shade??'base'],
   {name,points:p,widths,normal,...options,ink:!graphicMass,
    rootedEdge:rootedHairline&&['forelock-left','forelock-right','temple-left','temple-right'].includes(name)});
 };

 // A hidden inner scalp closes roots; front edge stays above the visible bangs.
 const cap=new THREE.BufferGeometry(),cp=[],ci=[],rows=40,cols=rootedHairline?240:80;
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
  const a=j/cols*Math.PI*2,b=Math.acos(Math.cos(a));
  // Local overlap behind front/temple junctions. The center forehead opening
  // is retained; a uniformly lower cap would cover the face and ears.
  const keys=graphicMass?
   [[0,.67],[.3,.86],[.7,1.28],[1.15,1.42],[1.57,1.41],[2.15,1.94],[Math.PI,2.15]]:
   [[0,.67],[.9,1.02],[1.57,1.41],[2.15,1.94],[Math.PI,2.15]];
  let end=2.15;
  for(let k=1;k<keys.length;k++)if(b<=keys[k][0]){
   end=THREE.MathUtils.lerp(keys[k-1][1],keys[k][1],smooth(b,keys[k-1][0],keys[k][0]));break;
  }
  if(rootedHairline){
   // Preserve the accepted central forehead anchor. Unequal low-amplitude
   // extensions at exposed temple roots avoid a uniformly machined hem.
   const az=a>Math.PI?a-Math.PI*2:a;
   for(const [at,l,r,amount]of [[-.78,.13,.035,.032],[-.56,.10,.035,.024],
    [.39,.09,.028,.027],[.58,.12,.032,.034],[.87,.12,.035,.025]]){
    end+=amount*(az<at?smooth(az,at-l,at):1-smooth(az,at,at+r));
   }
  }
  const th=i/rows*end;
  const flow=1+.035*Math.sin(a*3+.7)*Math.sin(th);
  cp.push(.146*Math.sin(th)*Math.sin(a)*flow,.082+.207*Math.cos(th),-.018+.166*Math.sin(th)*Math.cos(a));
  if(i<rows&&j<cols){const k=i*(cols+1)+j;ci.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
 }
 cap.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));cap.setIndex(ci);
 cap.computeVertexNormals();
 const scalp=new THREE.Mesh(cap,hairMaterial(palette.dark,key,{graphicMass}));scalp.name='inner-scalp';root.add(scalp);
 if(graphicMass)connectedLowerMass(root,mats.base,{neckLength,parts});

 // Back mass has an off-centre flow, not mirrored chevrons.
 add('rear-left-upper',[[.025,.267,-.060],[-.066,.259,-.141],[-.151,.210,-.187],[-.239,.238,-.175]],
  [.025,.052,.042,.016,0],[-.3,.25,-1],{depth:.009,lag:.5});
 add('rear-right-upper',[[.035,.265,-.060],[.113,.240,-.145],[.156,.156,-.197],[.235,.195,-.173]],
  [.025,.048,.040,.014,0],[.3,.25,-1],{depth:.009,lag:.55});
 add('rear-left-middle',[[-.035,.224,-.131],[-.113,.170,-.200],[-.151,.073,-.186],[-.181,.051,-.145]],
  [.035,.057,.043,.018,0],[-.25,.1,-1],{depth:.010,lag:.8});
 add('rear-right-middle',[[.027,.221,-.138],[.094,.163,-.215],[.129,.050,-.202],[.165,.060,-.165]],
  [.035,.061,.046,.017,0],[.25,.1,-1],{depth:.010,lag:.85});
 add('rear-main',[[.059,.269,-.066],[.010,.225,-.187],[-.041,.089,-.224],[-.063,-.062,-.190]],
  [.028,.052,.048,.018,0],[0,.05,-1],{depth:.013,lag:.7});
 for(const s of [-1,1]){
  add('nape-'+s,[[s*.033,.106,-.164],[s*.049,.035,-.185],[s*.070,-.019,-.176],[s*.099,-.031,-.142]],
   [.030,.047,.035,.015,0],[s*.2,.1,-1],{depth:.008,lag:1.1});
 }
 add('nape-center',[[.006,.160,-.177],[.015,.078,-.217],[-.009,-.008,-.198],[.020,-.039,-.168]],
  [.029,.055,.041,.018,0],[0,.05,-1],{depth:.010,lag:.9});

 // Side masses sweep back; separate the ear-facing fringe from the rear layers.
 for(const s of [-1,1]){
  add('side-high-'+s,[[s*.035,.260,.014],[s*.114,.249,.008],[s*.182,.210,-.061],[s*.245,.231,-.148]],
   [.025,.050,.043,.016,0],[s,.35,.35],{depth:.008,lag:.6});
  add('side-mid-'+s,[[s*.070,.242,.053],[s*.142,.212,.028],[s*.178,.122,-.061],[s*.221,.133,-.156]],
   [.025,.046,.038,.015,0],[s,.12,.45],{depth:.007,lag:.75});
  add('side-low-'+s,[[s*.113,.177,.039],[s*.149,.121,-.016],[s*.151,.036,-.085],[s*.162,.002,-.117]],
   [.028,.037,.028,.010,0],[s,0,.5],{depth:.005,lag:1});
 }
 // Three large asymmetrical bangs: narrow roots merge, middle carries volume.
 add('forelock-left',[[.015,.260,.061],[-.069,.261,.116],[-.126,.191,.154],[-.152,.079,.116]],
  [.025,.045,.037,.014,0],[0,.25,1],{depth:.007,lag:.9});
 if(contourFringe)boundaryFringe(root,parts,graphicMass?mats.light:mats.base,{ink:!graphicMass});
 else add('forelock-main',[[.016,.260,.061],[-.026,.259,.145],[-.046,.186,.172],[-.015,.096,.153]],
   [.020,.038,.031,.011,0],[0,.1,1],{depth:.008,lag:1.1});
 add('forelock-right',[[.024,.259,.053],[.076,.231,.132],[.093,.175,.155],[.137,.107,.111]],
  [.020,.039,.030,.011,0],[.1,.15,1],{depth:.006,lag:1});
 add('temple-left',[[-.080,.227,.088],[-.137,.191,.130],[-.149,.111,.104],[-.129,.053,.065]],
  [.018,.032,.029,.015,0],[-.65,.1,1],{depth:.009,lag:1.1,shade:'dark'});
 add('temple-right',[[.091,.222,.068],[.141,.180,.093],[.146,.110,.075],[.126,.060,.062]],
  [.019,.033,.027,.012,0],[.7,.1,1],{depth:.008,lag:1,shade:'dark'});
 // Crown accents connect broad middle forms to a few swept ends.
 add('crown-left',[[.012,.259,.010],[-.055,.299,.009],[-.141,.290,-.033],[-.230,.251,-.058]],
  [.025,.037,.027,.009,0],[0,1,.25],{depth:.006,lag:.4});
 add('crown-right',[[.014,.261,.006],[.056,.300,-.018],[.138,.288,-.066],[.219,.280,-.086]],
  [.024,.036,.025,.009,0],[0,1,.15],{depth:.006,lag:.45});

 const state={root,parts,key,setEnabled(enabled){root.visible=enabled;actor.softPortrait.hair.visible=!enabled;},
  update({lagYaw=0,lagPitch=0,wind=0,lightDirection}={}){
   if(lightDirection)key.copy(lightDirection).normalize();
   const yaw=THREE.MathUtils.clamp(lagYaw,-.35,.35),pitch=THREE.MathUtils.clamp(lagPitch,-.25,.25);
   for(const part of parts)for(const {g,rest,restNormals,columns}of part.geometries){
    const pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){
     const u=Math.floor(i/columns)/N,w=smooth(u,.12,1)**2*part.lag;
     const x=rest[3*i],y=rest[3*i+1],z=rest[3*i+2];
     // Small angular trailing motion about the head; exact analytic inputs
     // make sequential and random-access render paths identical.
     const a=yaw*w,ca=Math.cos(a),sa=Math.sin(a);
     pos.setXYZ(i,x*ca+z*sa+wind*.003*w,y,z*ca-x*sa-pitch*.035*w);
     if(restNormals){
      const nx=restNormals[i*3],ny=restNormals[i*3+1],nz=restNormals[i*3+2];
      g.attributes.normal.setXYZ(i,nx*ca+nz*sa,ny,nz*ca-nx*sa);
     }
    }
    pos.needsUpdate=true;
    if(restNormals)g.attributes.normal.needsUpdate=true;
   }
  }
 };
 state.setEnabled(true);actor.sculptedHair=state;return state;
}
