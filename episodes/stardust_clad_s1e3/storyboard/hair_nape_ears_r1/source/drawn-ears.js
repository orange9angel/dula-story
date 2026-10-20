import * as THREE from 'three';

// Opt-in ear study: a shallow auricle with sparse drawn structure.
// This is head-local geometry; it never turns independently toward the camera.
export function installDrawnEars(actor){
 const root=new THREE.Group();root.name='drawn-ear-pair';actor.headGroup.add(root);
 const face=actor.face.skull.material;
 const skin=new THREE.MeshBasicMaterial({color:new THREE.Color('#efe4e6').multiply(face.color),side:THREE.DoubleSide});
 skin.onBeforeCompile=face.onBeforeCompile;
 skin.customProgramCacheKey=()=> 'drawn-ear-skin-v1';
 const ink=new THREE.MeshBasicMaterial({color:'#865f58'});
 const shade=new THREE.MeshBasicMaterial({color:'#c59b8e',side:THREE.DoubleSide});
 const outline=[[-.010,.023],[-.004,.037],[.008,.037],[.017,.027],[.020,.008],
  [.015,-.018],[.006,-.031],[-.003,-.029],[-.010,-.017],[-.008,-.003],[-.011,.010]];
 const contour=new THREE.CatmullRomCurve3(outline.map(([x,y])=>new THREE.Vector3(x,y,0)),true,'centripetal');
 const surfaces=[];
 for(const sign of [-1,1]){
  const side=new THREE.Group();side.name='ear-'+sign;
  side.position.set(sign*.111,.043,-.011);side.rotation.y=sign*1.05;
  side.scale.x=sign;root.add(side);
  const R=16,C=72,pos=[],uv=[],ix=[];
  const frontZ=(r,y)=>.001+.006*Math.exp(-(((r-.82)/.16)**2))-.0015*Math.exp(-(((r-.4)/.4)**2))-y*.10;
  for(let back=0;back<2;back++)for(let i=0;i<=R;i++)for(let j=0;j<=C;j++){
   const r=i/R,b=contour.getPoint(j/C),x=THREE.MathUtils.lerp(.001,b.x,r),y=THREE.MathUtils.lerp(-.003,b.y,r);
   const z=back?-.004-y*.10:frontZ(r,y);
   pos.push(x,y,z);uv.push((x+.025)/.05,(y+.04)/.08);
   if(i<R&&j<C){
    const k=back*(R+1)*(C+1)+i*(C+1)+j;
    if(back)ix.push(k,k+C+1,k+1,k+1,k+C+1,k+C+2);
    else ix.push(k,k+1,k+C+1,k+1,k+C+2,k+C+1);
   }
  }
  for(let j=0;j<C;j++){
   const a=R*(C+1)+j,b=(R+1)*(C+1)+a;
   ix.push(a,b,a+1,a+1,b,b+1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
  const shell=new THREE.Mesh(g,skin);shell.name='continuous-auricle';side.add(shell);surfaces.push(shell);
  const stroke=(points,r=.00065)=>{
   const curve=new THREE.CatmullRomCurve3(points.map(([x,y,z=.008])=>new THREE.Vector3(x,y,z-y*.10)));
   const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,36,r,6,false),ink);side.add(mesh);
  };
  // Incomplete outer contour and a tapered inner fold; no white raised rings.
  stroke([[-.010,.021,.004],[-.004,.035,.004],[.008,.035,.004],[.017,.025,.004],
   [.019,.007,.004],[.014,-.017,.004],[.005,-.030,.004],[-.003,-.028,.004]],.0006);
  stroke([[-.006,.018],[-.002,.027],[.008,.026],[.012,.014]],.00065);
  stroke([[.005,.016],[.002,.006],[.006,-.004],[.003,-.017]],.00055);
  stroke([[.002,.006],[-.003,.013]],.00045);
  const concha=new THREE.Shape();
  concha.moveTo(-.006,.004);concha.bezierCurveTo(.002,.006,.006,-.001,.002,-.006);
  concha.bezierCurveTo(-.004,-.010,-.001,-.017,-.006,-.016);
  concha.bezierCurveTo(-.011,-.014,-.008,-.006,-.006,.004);
  const hollow=new THREE.Mesh(new THREE.ShapeGeometry(concha,24),shade);
  hollow.position.z=.004;side.add(hollow);
  stroke([[-.008,-.003],[-.005,-.006],[-.007,-.011]],.0007);
 }
 const state={root,surfaces,setEnabled(on){root.visible=on;actor.softPortrait.ears.visible=!on;}};
 state.setEnabled(true);actor.drawnEars=state;return state;
}
