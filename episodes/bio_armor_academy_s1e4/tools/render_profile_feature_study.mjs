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
const study=path.join(ep,'storyboard/hybrid_character/profile_feature_study_v1');
const out=arg('--out')?path.resolve(ep,arg('--out')):study;
const additionalAngles=(arg('--additional-angles')??'').split(',').filter(Boolean).map(Number);
const layerAngles=(arg('--layer-angles')??'45,-45,60,-60,90,-90').split(',').filter(Boolean).map(Number);
if(layerAngles.some(a=>!Number.isFinite(a)||Math.abs(a)>180))throw new Error('Layer angles must be finite and within [-180,180]');
if(additionalAngles.some(a=>!Number.isFinite(a)||Math.abs(a)>180))throw new Error('Angles must be finite and within [-180,180]');
const sourcePath=arg('--source')?path.resolve(ep,arg('--source')):path.resolve(ep,'../../../dula-assets/characters/bioarmor/aoi-generated-paint.js');
const source=fs.readFileSync(sourcePath,'utf8');
const configs={baseline:{},eye_relief:{recess:.007}};
const fit=path.join(study,'fit_candidate.json');
if(fs.existsSync(fit))configs.contour_fit=JSON.parse(fs.readFileSync(fit,'utf8'));
if(arg('--experiments'))Object.assign(configs,JSON.parse(fs.readFileSync(path.resolve(ep,arg('--experiments')),'utf8')));
const turnMode=arg('--turn-mode')??'head';
if(!['head','body'].includes(turnMode))throw new Error('--turn-mode must be head or body');
const diagnostics=process.argv.includes('--eye-diagnostics');
const names=(arg('--variants')??'baseline,eye_relief').split(',');
const browser=await req('puppeteer').launch({headless:true});
try{
  for(const name of names){
    if(!configs[name])throw new Error(`Missing variant ${name}`);
    const overrides=configs[name],dest=path.join(out,name);fs.mkdirSync(dest,{recursive:true});
    if(overrides.baseline_source_sha256&&overrides.baseline_source_sha256!==sha(source))throw new Error('Candidate was fitted against a different source revision');
    let text=source;
    if(Object.hasOwn(overrides,'obliqueFaceSupport'))text=text.replace(/^const AOI_OBLIQUE_FACE_SUPPORT=.*;$/m,`const AOI_OBLIQUE_FACE_SUPPORT=${JSON.stringify(overrides.obliqueFaceSupport)};`);
    if(overrides.recess!=null)text=text.replace(/(eyeSurface:\{[^}\n]*\brecess:)[^,}]+/,(_,prefix)=>prefix+overrides.recess);
    for(const field of ['earZ','earY','eyeInset','temporalLashScale','nasalLashLength']){
      if(overrides[field]==null)continue;
      if(!Number.isFinite(overrides[field]))throw new Error(`${field} must be finite`);
      const re=new RegExp(`(${field}:)[-\\d.]+`);
      if(!re.test(text))throw new Error(`Missing override anchor: ${field}`);
      text=text.replace(re,(_,prefix)=>prefix+overrides[field]);
    }
    if(Object.hasOwn(overrides,'eyeSurface'))text=text.replace(/^    eyeSurface:.*,$/m,`    eyeSurface:${JSON.stringify(overrides.eyeSurface)},`);
    if(Object.hasOwn(overrides,'jawDefinition'))text=text.replace(/^    jawDefinition:.*,$/m,`    jawDefinition:${JSON.stringify(overrides.jawDefinition)},`);
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
      if(new URL(r.url()).pathname.endsWith('/characters/bioarmor/aoi-generated-paint.js'))
        r.respond({status:200,contentType:'text/javascript',body:text});
      else r.continue();
    });
    await page.goto('http://127.0.0.1:4215/face_lab.html?actor=aoi&cel=direct',{timeout:90000});
    await page.waitForFunction('window.ready===true',{timeout:90000});
    const specs=[['front',0],['turn_45',45],['turn_65',65],['turn_90',90],['turn_minus45',-45],['turn_minus65',-65],['turn_minus90',-90],['structure_90',90,true],['half_blink',45,false,{blink:.5}],['talk',65,false,{jaw:.6,gaze:[-.5,0]}],...([15,25,35,55].map(a=>['turn_'+a,a]))];
    for(const angle of additionalAngles){
      if(!specs.some(s=>s[1]===angle&&!s[2]&&!s[3]))specs.push([`turn_${angle<0?'minus':''}${Math.abs(angle)}`,angle]);
    }
    if(process.argv.includes('--ear-layers'))for(const angle of layerAngles){
      for(const layer of ['no_ears','no_hair','no_face_paint'])specs.push([`${layer}_${angle}`,angle,false,{},layer]);
    }
    const report={variant:name,turnMode,sourcePath,originalSha256:sha(source),experimentSha256:sha(text),overrides,
      viewDeformation,profileReferenceActive:text.includes('profileReference:'),jawSculptActive:text.includes('jawDefinition:'),cranialScalpActive:text.includes('cranium:'),paintEyeInset,
      projectedFeatureSpace:viewDeformation?'CPU before GPU view/profile/jaw deformation; not rendered eye visibility':'undeformed mesh projected to camera',
      layerNotes:'no_face_paint swaps only the main map; geometry, jaw shader and skin underpaint remain. no_hair/no_ears toggle named layers.',frames:{},errors};
    async function capture([id,angle,bare=false,state={},layer='']){
      const result=await page.evaluate(async({angle,bare,state,turnMode,diagnostics,paintEyeInset,layer})=>{
        const THREE=await import('three');
        actor.mesh.traverse(o=>{if(o.userData.kind==='painted curved hair shell with thickness')o.visible=!bare&&layer!=='no_hair';});
        for(const i of [2,4])face.root.children[i].visible=layer!=='no_ears';
        const skinMaterial=face.root.children[0].material;
        if(!window.originalFaceMap)window.originalFaceMap=skinMaterial.map;
        if(!window.flatFaceMap){
          const c=document.createElement('canvas');c.width=c.height=2;
          const ctx=c.getContext('2d');ctx.fillStyle='#ffddbf';ctx.fillRect(0,0,2,2);
          window.flatFaceMap=new THREE.CanvasTexture(c);window.flatFaceMap.colorSpace=THREE.SRGBColorSpace;
        }
        skinMaterial.map=layer==='no_face_paint'?window.flatFaceMap:window.originalFaceMap;
        actor.mesh.rotation.y=turnMode==='body'?angle*Math.PI/180:0;
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
        const facePoints={eye:at((500+paintEyeInset-642)/3300,1.473+(658-656)/3300),far_eye:at((785-paintEyeInset-642)/3300,1.473+(658-655)/3300),mouth:at((641-642)/3300,1.473+(658-852)/3300)};
        const nose=median.filter(v=>v.local[1]>1.43&&v.local[1]<1.46).sort((a,b)=>b.local[2]-a.local[2])[0];
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
      },{angle,bare,state,turnMode,diagnostics,paintEyeInset,layer});
      const buffer=Buffer.from(result.png,'base64');
      return {...result,png:undefined,buffer};
    }
    for(const spec of specs){
      const result=await capture(spec);
      fs.writeFileSync(path.join(dest,spec[0]+'.png'),result.buffer);
      report.frames[spec[0]]={sha256:sha(result.buffer),angle:spec[1],actualYaw:result.actualYaw,actualBodyYaw:result.actualBodyYaw,projectedFeatures:result.projectedFeatures,projectedEars:result.projectedEars,eyeDiagnostics:result.eyeDiagnostics,finite:result.finite};
      if(spec[0]==='turn_90')report.median90=result.median;
    }
    for(const spec of [specs[3],...specs.filter(s=>Math.abs(s[1])===45||Math.abs(s[1])===60),specs[0]]){
      const r=await capture(spec);report.frames[spec[0]].reverseSeekEqual=sha(r.buffer)===report.frames[spec[0]].sha256;
      if(!report.frames[spec[0]].reverseSeekEqual)fs.writeFileSync(path.join(dest,spec[0]+'_reverse_mismatch.png'),r.buffer);
    }
    fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify(report,null,2));
    await page.close();
    if(errors.length||Object.values(report.frames).some(f=>!f.finite||f.reverseSeekEqual===false))throw new Error(JSON.stringify(report.errors));
    console.log(`${name}: ${specs.length} views, deterministic front/profile, no browser errors`);
  }
}finally{await browser.close();}
