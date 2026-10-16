// Controlled experiments reuse the real face lab. Overrides are confined to
// this browser request; shared character source and approved assets stay intact.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const ep=path.resolve(import.meta.dirname,'..');
const req=createRequire(path.join(ep,'../../node_modules/dula-engine/package.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const arg=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1];};
const actorId=arg('--actor')??'aoi';
if(!['aoi','lei'].includes(actorId))throw new Error('Unknown actor');
const sourceSuffix=arg('--source-suffix')??(actorId==='aoi'?'/characters/bioarmor/aoi-generated-paint.js':'/characters/bioarmor/tripo-drawn-look.js');
const study=path.join(ep,'storyboard/hybrid_character/profile_feature_study_v1');
const out=arg('--out')?path.resolve(ep,arg('--out')):study;
const additionalAngles=(arg('--additional-angles')??'').split(',').filter(Boolean).map(Number);
const layerAngles=(arg('--layer-angles')??'45,-45,60,-60,90,-90').split(',').filter(Boolean).map(Number);
const pitchAngles=(arg('--pitch-angles')??'0,45,-45,90,-90').split(',').filter(Boolean).map(Number);
if(!pitchAngles.length||pitchAngles.some(a=>!Number.isFinite(a)||Math.abs(a)>180))throw new Error('Pitch study yaw angles must be finite and within [-180,180]');
if(layerAngles.some(a=>!Number.isFinite(a)||Math.abs(a)>180))throw new Error('Layer angles must be finite and within [-180,180]');
if(additionalAngles.some(a=>!Number.isFinite(a)||Math.abs(a)>180))throw new Error('Angles must be finite and within [-180,180]');
const sourcePath=arg('--source')?path.resolve(ep,arg('--source')):path.resolve(ep,'../../../dula-assets'+sourceSuffix);
const source=fs.readFileSync(sourcePath,'utf8');
// Per-request module overrides let parallel studies share a stable live model.
const moduleOverrides=arg('--module-overrides')?Object.entries(JSON.parse(fs.readFileSync(path.resolve(ep,arg('--module-overrides')),'utf8'))).map(([suffix,file])=>{
  if(!suffix.startsWith('/')||!suffix.endsWith('.js'))throw new Error('Module override key must be a JavaScript URL path suffix');
  const absolute=path.resolve(ep,file),body=fs.readFileSync(absolute,'utf8');
  return {suffix,path:absolute,sha256:sha(body),body};
}):[];
const configs={baseline:{},eye_relief:{recess:.007}};
const fit=path.join(study,'fit_candidate.json');
if(fs.existsSync(fit))configs.contour_fit=JSON.parse(fs.readFileSync(fit,'utf8'));
if(arg('--experiments'))Object.assign(configs,JSON.parse(fs.readFileSync(path.resolve(ep,arg('--experiments')),'utf8')));
const turnMode=arg('--turn-mode')??'head';
if(!['head','body'].includes(turnMode))throw new Error('--turn-mode must be head or body');
const diagnostics=process.argv.includes('--eye-diagnostics');
if(diagnostics&&actorId!=='aoi')throw new Error('Legacy eye probe is calibrated only for Aoi');
const names=(arg('--variants')??'baseline,eye_relief').split(',');
const browser=await req('puppeteer').launch({headless:true});
try{
  for(const name of names){
    if(!configs[name])throw new Error(`Missing variant ${name}`);
    const overrides=configs[name],dest=path.join(out,name);fs.mkdirSync(dest,{recursive:true});
    if(['deepForehead','deepFaceSupport','farFringeOffset','farFringeLift','foreheadSupport','supportTop','obliqueNoseRecess'].some(k=>Object.hasOwn(overrides.obliqueFaceSupport??{},k))||overrides.eyeSurface?.centerX!=null)throw new Error('Rejected archived sculpt: implementation removed; select a retained candidate');
    if(overrides.baseline_source_sha256&&overrides.baseline_source_sha256!==sha(source))throw new Error('Candidate was fitted against a different source revision');
    let text=source;
    if(Object.hasOwn(overrides,'obliqueFaceSupport'))text=text.replace(/^const AOI_OBLIQUE_FACE_SUPPORT=.*;$/m,`const AOI_OBLIQUE_FACE_SUPPORT=${JSON.stringify(overrides.obliqueFaceSupport)};`);
    if(overrides.recess!=null)text=text.replace(/(eyeSurface:\{[^}\n]*\brecess:)[^,}]+/,(_,prefix)=>prefix+overrides.recess);
    for(const field of ['earZ','earY','eyeInset','browInset','temporalLashScale','nasalLashLength']){
      if(overrides[field]==null)continue;
      if(!Number.isFinite(overrides[field]))throw new Error(`${field} must be finite`);
      const re=new RegExp(`(${field}:)[-\\d.]+`);
      if(!re.test(text))throw new Error(`Missing override anchor: ${field}`);
      text=text.replace(re,(_,prefix)=>prefix+overrides[field]);
    }
    if(Object.hasOwn(overrides,'eyeSurface'))text=text.replace(/^    eyeSurface:.*,$/m,`    eyeSurface:${JSON.stringify(overrides.eyeSurface)},`);
    if(Object.hasOwn(overrides,'jawDefinition'))text=text.replace(/^    jawDefinition:.*,$/m,`    jawDefinition:${JSON.stringify(overrides.jawDefinition)},`);
    if(Object.hasOwn(overrides,'cranium'))text=text.replace(/^    cranium:.*,$/m,`    cranium:${JSON.stringify(overrides.cranium)},`);
    if(Object.hasOwn(overrides,'earRootDefinition'))text=text.replace(/drawnEar:true,(?:earRootDefinition:\w+,)?/,`drawnEar:true,earRootDefinition:${!!overrides.earRootDefinition},`);
    if(overrides.faceRoundness!=null){
      if(!Number.isFinite(overrides.faceRoundness)||overrides.faceRoundness<=0)throw new Error('faceRoundness must be positive');
      text=text.replace(/faceRoundness:[\d.]+/,`faceRoundness:${overrides.faceRoundness}`);
    }
    if(overrides.sideFaceSupport||overrides.frontFaceSupport||overrides.obliqueFaceSupport?.eyePaintShift)
      throw new Error('Archived rejected experiment: its mesh/UV trial code is not present in the live assets');
    if(overrides.profileContour)text=text.replace(/^    profileContour:\[.*\],$/m,`    profileContour:${JSON.stringify(overrides.profileContour)},`);
    if(overrides.jawContour)text=text.replace(/^    jawContour:\[.*\],$/m,`    jawContour:${JSON.stringify(overrides.jawContour)},`);
    if(name!=='baseline'&&text===source)throw new Error('Experiment override did not apply');
    const supportDeclaration=text.match(/^const AOI_OBLIQUE_FACE_SUPPORT=(.*);$/m);
    const viewDeformation=supportDeclaration?JSON.parse(supportDeclaration[1]):null;
    const paintEyeInset=Number(text.match(/\beyeInset:([-\d.]+)/)?.[1]??0);
    if(diagnostics&&viewDeformation)throw new Error('CPU eye visibility excludes the active GPU view deformation; use rendered evidence instead');
    const page=await browser.newPage(),errors=[];
    await page.setViewport({width:900,height:900});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.setRequestInterception(true);
    page.on('request',r=>{
      const pathname=new URL(r.url()).pathname,override=moduleOverrides.find(o=>pathname.endsWith(o.suffix));
      if(override)r.respond({status:200,contentType:'text/javascript',body:override.body});
      else if(pathname.endsWith(sourceSuffix))
        r.respond({status:200,contentType:'text/javascript',body:text});
      else r.continue();
    });
    await page.goto(`http://127.0.0.1:4215/face_lab.html?actor=${actorId}&cel=direct`,{timeout:90000});
    await page.waitForFunction('window.ready===true',{timeout:90000});
    if(process.argv.includes('--face-mask'))await page.evaluate(()=>{
      const m=face.root.children[0].material,previous=m.onBeforeCompile,key=m.customProgramCacheKey();
      m.onBeforeCompile=function(s,r){previous.call(this,s,r);
        s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor=vec4(1.0);');
      };m.customProgramCacheKey=()=>key+'|rendered-face-mask';m.needsUpdate=true;
      scene.background.set('#000000');window.faceMask=true;
    });
    if(process.argv.includes('--no-shell-outline'))await page.evaluate(()=>{
      face.root.children[1].visible=false;
      const inner=face.root.getObjectByName('drawn-head-interior-outline');if(inner)inner.visible=false;
    });
    if(process.argv.includes('--surface-coordinates'))await page.evaluate(()=>{
      const m=face.root.children[0].material,previous=m.onBeforeCompile,key=m.customProgramCacheKey();
      m.onBeforeCompile=function(s,r){previous.call(this,s,r);
        s.vertexShader='varying vec3 surfaceCoordinate;\n'+s.vertexShader;
        s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsurfaceCoordinate=position;');
        s.fragmentShader='varying vec3 surfaceCoordinate;\n'+s.fragmentShader;
        s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor=vec4(surfaceCoordinate.x*4.0+.5,(surfaceCoordinate.y-1.35)*3.0,surfaceCoordinate.z*4.0+.5,1.0);');
      };m.customProgramCacheKey=()=>key+'|surface-coordinate-diagnostic';m.needsUpdate=true;
    });
    let specs=[['front',0],['turn_45',45],['turn_65',65],['turn_90',90],['turn_minus45',-45],['turn_minus65',-65],['turn_minus90',-90],['structure_90',90,true],['half_blink',45,false,{blink:.5}],['talk',65,false,{jaw:.6,gaze:[-.5,0]}],...([15,25,35,55].map(a=>['turn_'+a,a]))];
    for(const angle of additionalAngles){
      if(!specs.some(s=>s[1]===angle&&!s[2]&&!s[3]))specs.push([`turn_${angle<0?'minus':''}${Math.abs(angle)}`,angle]);
    }
    if(process.argv.includes('--ear-layers'))for(const angle of layerAngles){
      for(const layer of ['no_ears','no_hair','no_face_paint'])specs.push([`${layer}_${angle}`,angle,false,{},layer]);
    }
    if(arg('--expression-angles'))for(const angle of arg('--expression-angles').split(',').map(Number)){
      if(!Number.isFinite(angle)||Math.abs(angle)>180)throw new Error('Invalid expression angle');
      for(const [name,state] of Object.entries({blink_half:{blink:.5},blink_closed:{blink:1},gaze_left:{gaze:[-1,0]},gaze_right:{gaze:[1,0]},gaze_up:{gaze:[0,1]},gaze_down:{gaze:[0,-1]}}))
        specs.push([`${name}_${angle}`,angle,false,state]);
    }
    if(process.argv.includes('--pitch-study'))specs=[-15,15].flatMap(pitch=>pitchAngles.map(angle=>[`pitch_${pitch}_${angle}`,angle,false,{pitch:pitch*Math.PI/180}]));
    if(arg('--only-frames')){
      const selected=new Set(arg('--only-frames').split(','));
      for(const id of selected)if(!specs.some(s=>s[0]===id))throw new Error(`Unknown requested frame: ${id}`);
      specs=specs.filter(s=>selected.has(s[0]));
    }
    const report={actor:actorId,variant:name,turnMode,shellOutline:!process.argv.includes('--no-shell-outline'),sourcePath,sourceSuffix,originalSha256:sha(source),experimentSha256:sha(text),overrides,
      moduleOverrides:moduleOverrides.map(({body,...metadata})=>metadata),finiteCheckScope:'face position buffer only; not every mesh or rendered aesthetic quality',
      viewDeformation,profileReferenceActive:text.includes('profileReference:'),jawSculptActive:text.includes('jawDefinition:'),cranialScalpActive:text.includes('cranium:'),paintEyeInset,
      projectedFeatureSpace:viewDeformation?'CPU before GPU view/profile/jaw deformation; not rendered eye visibility':'undeformed mesh projected to camera',
      layerNotes:'no_face_paint swaps only the main map; geometry, jaw shader and skin underpaint remain. no_hair/no_ears toggle named layers.',frames:{},errors};
    async function capture([id,angle,bare=false,state={},layer='']){
      const result=await page.evaluate(async({angle,bare,state,turnMode,diagnostics,paintEyeInset,layer,actorId})=>{
        const THREE=await import('three');
        actor.mesh.traverse(o=>{if(o.userData.kind==='painted curved hair shell with thickness'||o.userData.tail)o.visible=!bare&&layer!=='no_hair';});
        for(const i of [2,4])face.root.children[i].visible=layer!=='no_ears';
        const skinMaterial=face.root.children[0].material;
        if(!window.originalFaceMap)window.originalFaceMap=skinMaterial.map;
        if(!window.flatFaceMap){
          const c=document.createElement('canvas');c.width=c.height=2;
          const ctx=c.getContext('2d');ctx.fillStyle='#ffddbf';ctx.fillRect(0,0,2,2);
          window.flatFaceMap=new THREE.CanvasTexture(c);window.flatFaceMap.colorSpace=THREE.SRGBColorSpace;
        }
        skinMaterial.map=layer==='no_face_paint'?window.flatFaceMap:window.originalFaceMap;
        if(window.faceMask)scene.traverse(o=>{if(o.isMesh)o.visible=o===face.root.children[0];});
        actor.mesh.rotation.y=turnMode==='body'?angle*Math.PI/180:0;
        actor.mesh.updateMatrixWorld(true);
        renderAt({...state,turn:turnMode==='head'?angle*Math.PI/180:0});
        const mesh=face.root.children[0],p=mesh.geometry.attributes.position;
        const half=p.count/2,columns=97,rows=half/columns;
        const median=[];
        for(let row=0;row<rows;row++){
          const i=row*columns+48,v=new THREE.Vector3().fromBufferAttribute(p,i),screen=v.clone().applyMatrix4(mesh.matrixWorld).project(camera);
          median.push({local:v.toArray(),pixel:[450*(screen.x+1),450*(1-screen.y)]});
        }
        const project=v=>{v=v.clone().applyMatrix4(mesh.matrixWorld).project(camera);return [450*(v.x+1),450*(1-v.y)];};
        const at=(x,y)=>{
          let row=0;while(row<rows-2&&p.getY((row+1)*columns)<y)row++;
          const rowZ=r=>{let c=0;while(c<columns-2&&p.getX(r*columns+c+1)<x)c++;
            const i=r*columns+c,j=i+1;return THREE.MathUtils.lerp(p.getZ(i),p.getZ(j),(x-p.getX(i))/(p.getX(j)-p.getX(i)));};
          const y0=p.getY(row*columns),y1=p.getY((row+1)*columns);
          return new THREE.Vector3(x,y,THREE.MathUtils.lerp(rowZ(row),rowZ(row+1),(y-y0)/(y1-y0)));
        };
        const facePoints=actorId==='aoi'?{eye:at((500+paintEyeInset-642)/3300,1.473+(658-656)/3300),far_eye:at((785-paintEyeInset-642)/3300,1.473+(658-655)/3300),mouth:at((641-642)/3300,1.473+(658-852)/3300)}:{};
        const nose=median.filter(v=>v.local[1]>(actorId==='aoi'?1.43:1.54)&&v.local[1]<(actorId==='aoi'?1.46:1.59)).sort((a,b)=>b.local[2]-a.local[2])[0];
        facePoints.nose=new THREE.Vector3(...nose.local);facePoints.chin=new THREE.Vector3(...median[0].local);
        const projectedFeatures=Object.fromEntries(Object.entries(facePoints).map(([k,v])=>[k,project(v)]));
        // Ears are separate rigid meshes, so these centres remain valid with
        // the optional face shader. Their centres are not visible skin edges.
        const projectedEars=[2,4].map(i=>({local:face.root.children[i].position.toArray(),pixel:project(face.root.children[i].position)}));
        const forward=new THREE.Vector3(0,0,1).transformDirection(mesh.matrixWorld);
        const bodyForward=new THREE.Vector3(0,0,1).transformDirection(actor.mesh.matrixWorld);
        const actualYaw=Math.atan2(forward.x,forward.z)*180/Math.PI;
        const actualBodyYaw=Math.atan2(bodyForward.x,bodyForward.z)*180/Math.PI;
        let eyeDiagnostics;
        if(diagnostics){
          // Horizontal section: the eye plane should join the forehead/temple
          // without hiding the far iris behind an artificial depression.
          // This ray test includes the face mesh only, not hair alpha/eyelids.
          const eyeY=1.473,section=[];
          for(let c=0;c<columns;c++){
            let row=0;while(row<rows-2&&p.getY((row+1)*columns)<eyeY)row++;
            const i=row*columns+c,j=i+columns,t=(eyeY-p.getY(i))/(p.getY(j)-p.getY(i));
            const v=new THREE.Vector3().fromBufferAttribute(p,i).lerp(new THREE.Vector3().fromBufferAttribute(p,j),t);
            section.push(v.toArray());
          }
          const eyeVisibility={};
          const ray=new THREE.Raycaster();
          for(const [id,ex] of [['left',-142/3300],['right',143/3300]]){
            let visible=0,total=0;const centre=at(ex,eyeY);
            for(let xi=-2;xi<=2;xi++)for(let yi=-2;yi<=2;yi++){
              const point=at(ex+xi*.004,eyeY+yi*.005).applyMatrix4(mesh.matrixWorld);
              const projected=point.clone().project(camera);ray.setFromCamera(new THREE.Vector2(projected.x,projected.y),camera);
              const hit=ray.intersectObject(mesh,false)[0];total++;
              if(hit&&hit.point.distanceTo(point)<.0008)visible++;
            }
            eyeVisibility[id]={visibleSamples:visible,totalSamples:total,centreLocal:centre.toArray(),centrePixel:project(centre)};
          }
          eyeDiagnostics={sectionEyeY:eyeY,section,eyeVisibility,method:'25 small iris-region samples per eye; front face depth only; excludes hair and drawn eyelids'};
        }
        return {png:renderer.domElement.toDataURL('image/png').split(',')[1],median,projectedFeatures,projectedEars,actualYaw,actualBodyYaw,eyeDiagnostics,finite:Array.from(p.array).every(Number.isFinite)};
      },{angle,bare,state,turnMode,diagnostics,paintEyeInset,layer,actorId});
      const buffer=Buffer.from(result.png,'base64');
      return {...result,png:undefined,buffer};
    }
    for(const spec of specs){
      const result=await capture(spec);
      fs.writeFileSync(path.join(dest,spec[0]+'.png'),result.buffer);
      report.frames[spec[0]]={sha256:sha(result.buffer),angle:spec[1],pose:spec[3]??{},actualYaw:result.actualYaw,actualBodyYaw:result.actualBodyYaw,projectedFeatures:result.projectedFeatures,projectedEars:result.projectedEars,eyeDiagnostics:result.eyeDiagnostics,finite:result.finite};
      if(spec[0]==='turn_90')report.median90=result.median;
    }
    const reverseSpecs=process.argv.includes('--reverse-all')?[...specs].reverse():[specs[3],...specs.filter(s=>Math.abs(s[1])===45||Math.abs(s[1])===60),specs[0]];
    for(const spec of [...new Map(reverseSpecs.filter(Boolean).map(s=>[s[0],s])).values()]){
      const r=await capture(spec);report.frames[spec[0]].reverseSeekEqual=sha(r.buffer)===report.frames[spec[0]].sha256;
      if(!report.frames[spec[0]].reverseSeekEqual)fs.writeFileSync(path.join(dest,spec[0]+'_reverse_mismatch.png'),r.buffer);
    }
    fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify(report,null,2));
    await page.close();
    const failedFrames=Object.entries(report.frames).filter(([,f])=>!f.finite||f.reverseSeekEqual===false).map(([id])=>id);
    if(errors.length||failedFrames.length)throw new Error(JSON.stringify({browserErrors:errors,failedFrames}));
    console.log(`${name}: ${specs.length} views, sampled reverse seeks agree, no browser errors`);
  }
}finally{await browser.close();}
