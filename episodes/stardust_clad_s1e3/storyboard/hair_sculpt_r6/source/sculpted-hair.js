import * as THREE from 'three';

// Opt-in, independently authored main-lock study. Does not change the old hair.
const V = p => new THREE.Vector3(...p);
const smooth = THREE.MathUtils.smoothstep;
const center = V([0,.082,-.018]);
const N=40,M=24;
const palette={base:'#203e47',dark:'#18323b',light:'#294b55',ink:'#102832'};

function hairMaterial(color,key){
 const material=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});
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
 };
 material.customProgramCacheKey=()=> 'sculpted-hair-lock-v1';
 return material;
}

function makeLock(root,parts,mat,{name,points,widths,normal,depth=.014,lag=1,ink=true}){
 // Bury only the proximal roots in the backing volume. Middle and silhouette
 // remain authored; they are not all projected onto a scalp-sized ellipsoid.
 const controls=points.map(V);
 controls[0].sub(center).multiplyScalar(.81).add(center);
 const curve=new THREE.CatmullRomCurve3(controls);
 const hint=V(normal),pos=[],uv=[],ix=[],edgePoints=[[],[]],outwards=[],radials=[];
 const width=u=>{
  const q=u*(widths.length-1),i=Math.min(widths.length-2,Math.floor(q));
  const t=q-i,p0=widths[Math.max(0,i-1)],p1=widths[i],p2=widths[i+1],p3=widths[Math.min(widths.length-1,i+2)];
  return Math.max(0,.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t));
 };
 const artistSide=Math.abs(normal[1])>.8?V([0,0,1]):Math.abs(normal[0])>.7?V([0,1,0]):V([1,0,0]);
 artistSide.addScaledVector(hint,-artistSide.dot(hint)/hint.lengthSq()).normalize();
 for(let i=0;i<=N;i++){
  const u=i/N,p=curve.getPoint(u);
  // Width is an authored drawing direction per group. A rotating Frenet-like
  // frame had converted curved roots into upright fins in the profile.
  const side=artistSide.clone(),outward=hint.clone().normalize();
  outwards.push(outward);
  const w=width(u),bulge=Math.max(.001,depth*1.8)*(Math.sin(Math.PI*u*.94)**.55)*(1-smooth(u,.8,1));
  for(let j=0;j<=M;j++){
   const phi=j/M*Math.PI*2,c=Math.cos(phi),s=Math.sin(phi);
   const across=Math.sign(c)*Math.abs(c)**.82,front=Math.sign(s)*Math.abs(s)**.6;
   const radial=side.clone().multiplyScalar(w*across).addScaledVector(outward,bulge*front);
   const q=p.clone().add(radial);
   if(s<0){
    // Close the raised middle back into a hidden root volume. Only the
    // underside is fitted; the drawn outer contour retains its authored arc.
    const d=q.clone().sub(center),r=V([.148,.210,.168]);
    const scalp=d.clone().divide(r).normalize().multiply(r).add(center);
    q.lerp(scalp,Math.pow(-s,.55)*(1-smooth(u,.62,.98)));
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
 parts.push({name,lag,geometries:geometries.map(g=>({g,rest:g.attributes.position.array.slice(),columns:g.attributes.position.count/(N+1)}))});
}

export function installSculptedHair(actor){
 const root=new THREE.Group();root.name='sculpted-hair-study';actor.headGroup.add(root);
 const key=V([-3,5,4]).normalize(),parts=[];
 const mats={base:hairMaterial(palette.base,key),dark:hairMaterial(palette.dark,key),light:hairMaterial(palette.light,key)};
 const add=(name,points,widths,normal,options={})=>makeLock(root,parts,mats[options.shade??'base'],{name,points,widths,normal,...options});

 // A hidden inner scalp closes roots; front edge stays above the visible bangs.
 const cap=new THREE.BufferGeometry(),cp=[],ci=[],rows=40,cols=80;
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
  const a=j/cols*Math.PI*2,b=Math.acos(Math.cos(a));
  const keys=[[0,.67],[.9,1.02],[1.57,1.41],[2.15,1.94],[Math.PI,2.15]];
  let end=2.15;
  for(let k=1;k<keys.length;k++)if(b<=keys[k][0]){
   end=THREE.MathUtils.lerp(keys[k-1][1],keys[k][1],smooth(b,keys[k-1][0],keys[k][0]));break;
  }
  const th=i/rows*end;
  const flow=1+.035*Math.sin(a*3+.7)*Math.sin(th);
  cp.push(.146*Math.sin(th)*Math.sin(a)*flow,.082+.207*Math.cos(th),-.018+.166*Math.sin(th)*Math.cos(a));
  if(i<rows&&j<cols){const k=i*(cols+1)+j;ci.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
 }
 cap.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));cap.setIndex(ci);
 cap.computeVertexNormals();
 const scalp=new THREE.Mesh(cap,hairMaterial(palette.dark,key));scalp.name='inner-scalp';root.add(scalp);

 // Back mass has an off-centre flow, not mirrored chevrons.
 add('rear-left-upper',[[.025,.267,-.060],[-.066,.279,-.141],[-.151,.210,-.187],[-.208,.217,-.175]],
  [.030,.059,.049,.019,0],[-.3,.25,-1],{depth:.009,lag:.5});
 add('rear-right-upper',[[.035,.265,-.060],[.113,.250,-.145],[.156,.156,-.197],[.205,.171,-.173]],
  [.030,.055,.044,.016,0],[.3,.25,-1],{depth:.009,lag:.55});
 add('rear-left-middle',[[-.035,.224,-.131],[-.113,.170,-.200],[-.151,.073,-.186],[-.181,.051,-.145]],
  [.035,.057,.043,.018,0],[-.25,.1,-1],{depth:.010,lag:.8});
 add('rear-right-middle',[[.027,.221,-.138],[.094,.163,-.215],[.129,.050,-.202],[.165,.060,-.165]],
  [.035,.061,.046,.017,0],[.25,.1,-1],{depth:.010,lag:.85});
 add('rear-main',[[.059,.269,-.066],[.010,.225,-.187],[-.041,.089,-.224],[-.013,-.017,-.190]],
  [.028,.062,.065,.024,0],[0,.05,-1],{depth:.013,lag:.7});
 for(const s of [-1,1]){
  add('nape-'+s,[[s*.033,.106,-.164],[s*.049,.035,-.185],[s*.070,-.019,-.176],[s*.099,-.031,-.142]],
   [.030,.047,.035,.015,0],[s*.2,.1,-1],{depth:.008,lag:1.1});
 }
 add('nape-center',[[.006,.160,-.177],[.015,.078,-.217],[-.009,-.008,-.198],[.020,-.039,-.168]],
  [.029,.055,.041,.018,0],[0,.05,-1],{depth:.010,lag:.9});

 // Side masses sweep back; separate the ear-facing fringe from the rear layers.
 for(const s of [-1,1]){
  add('side-high-'+s,[[s*.035,.280,.014],[s*.114,.269,.008],[s*.182,.210,-.061],[s*.221,.221,-.128]],
   [.032,.056,.052,.020,0],[s,.35,.35],{depth:.008,lag:.6});
  add('side-mid-'+s,[[s*.070,.252,.053],[s*.142,.212,.028],[s*.178,.122,-.061],[s*.201,.123,-.136]],
   [.031,.053,.043,.018,0],[s,.12,.45],{depth:.007,lag:.75});
  add('side-low-'+s,[[s*.113,.177,.039],[s*.149,.121,-.016],[s*.151,.036,-.085],[s*.162,.002,-.117]],
   [.028,.037,.028,.010,0],[s,0,.5],{depth:.005,lag:1});
 }
 // Three large asymmetrical bangs: narrow roots merge, middle carries volume.
 add('forelock-left',[[-.016,.283,.081],[-.089,.285,.136],[-.146,.221,.164],[-.139,.089,.136]],
  [.026,.049,.050,.020,0],[0,.25,1],{depth:.007,lag:.9});
 add('forelock-main',[[.006,.281,.081],[-.016,.279,.165],[-.036,.206,.192],[.010,.086,.163]],
  [.028,.051,.044,.018,0],[0,.1,1],{depth:.008,lag:1.1});
 add('forelock-right',[[.024,.279,.073],[.076,.251,.142],[.083,.185,.165],[.117,.107,.131]],
  [.029,.043,.033,.014,0],[.1,.15,1],{depth:.006,lag:1});
 add('temple-left',[[-.080,.227,.088],[-.137,.191,.130],[-.149,.111,.104],[-.129,.053,.065]],
  [.018,.032,.029,.015,0],[-.65,.1,1],{depth:.009,lag:1.1,shade:'dark'});
 add('temple-right',[[.091,.222,.068],[.141,.180,.093],[.146,.110,.075],[.126,.060,.062]],
  [.019,.033,.027,.012,0],[.7,.1,1],{depth:.008,lag:1,shade:'dark'});
 // Crown accents connect broad middle forms to a few swept ends.
 add('crown-left',[[-.012,.289,-.010],[-.075,.329,.009],[-.151,.310,-.033],[-.190,.271,-.058]],
  [.030,.043,.033,.013,0],[0,1,.25],{depth:.006,lag:.4});
 add('crown-right',[[.004,.291,-.006],[.056,.330,-.018],[.128,.318,-.066],[.169,.300,-.086]],
  [.029,.042,.031,.012,0],[0,1,.15],{depth:.006,lag:.45});

 const state={root,parts,key,setEnabled(enabled){root.visible=enabled;actor.softPortrait.hair.visible=!enabled;},
  update({lagYaw=0,lagPitch=0,wind=0,lightDirection}={}){
   if(lightDirection)key.copy(lightDirection).normalize();
   const yaw=THREE.MathUtils.clamp(lagYaw,-.35,.35),pitch=THREE.MathUtils.clamp(lagPitch,-.25,.25);
   for(const part of parts)for(const {g,rest,columns}of part.geometries){
    const pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){
     const u=Math.floor(i/columns)/N,w=smooth(u,.12,1)**2*part.lag;
     const x=rest[3*i],y=rest[3*i+1],z=rest[3*i+2];
     // Small angular trailing motion about the head; exact analytic inputs
     // make sequential and random-access render paths identical.
     const a=-yaw*w,ca=Math.cos(a),sa=Math.sin(a);
     pos.setXYZ(i,x*ca+z*sa+wind*.003*w,y,z*ca-x*sa-pitch*.035*w);
    }
    pos.needsUpdate=true;
   }
  }
 };
 state.setEnabled(true);actor.sculptedHair=state;return state;
}
