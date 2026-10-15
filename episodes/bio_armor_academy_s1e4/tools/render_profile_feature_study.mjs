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
if(additionalAngles.some(a=>!Number.isFinite(a)||Math.abs(a)>180))throw new Error('Angles must be finite and within [-180,180]');
const sourcePath=path.resolve(ep,'../../../dula-assets/characters/bioarmor/aoi-generated-paint.js');
const source=fs.readFileSync(sourcePath,'utf8');
const configs={baseline:{},eye_relief:{recess:.007}};
const fit=path.join(study,'fit_candidate.json');
if(fs.existsSync(fit))configs.contour_fit=JSON.parse(fs.readFileSync(fit,'utf8'));
const names=(arg('--variants')??'baseline,eye_relief').split(',');
const browser=await req('puppeteer').launch({headless:true});
try{
  for(const name of names){
    if(!configs[name])throw new Error(`Missing variant ${name}`);
    const overrides=configs[name],dest=path.join(out,name);fs.mkdirSync(dest,{recursive:true});
    if(overrides.baseline_source_sha256&&overrides.baseline_source_sha256!==sha(source))throw new Error('Candidate was fitted against a different source revision');
    let text=source;
    if(overrides.recess!=null)text=text.replace('recess:.014',`recess:${overrides.recess}`);
    if(overrides.profileContour)text=text.replace(/^    profileContour:\[.*\],$/m,`    profileContour:${JSON.stringify(overrides.profileContour)},`);
    if(name!=='baseline'&&text===source)throw new Error('Experiment override did not apply');
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
    const report={variant:name,sourcePath,originalSha256:sha(source),experimentSha256:sha(text),overrides,frames:{},errors};
    async function capture([id,angle,bare=false,state={}]){
      const result=await page.evaluate(async({angle,bare,state})=>{
        const THREE=await import('three');
        actor.mesh.traverse(o=>{if(o.userData.kind==='painted curved hair shell with thickness')o.visible=!bare;});
        renderAt({...state,turn:angle*Math.PI/180});
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
        const facePoints={eye:at((500-642)/3300,1.473+(658-656)/3300),far_eye:at((785-642)/3300,1.473+(658-655)/3300),mouth:at((641-642)/3300,1.473+(658-852)/3300)};
        const nose=median.filter(v=>v.local[1]>1.43&&v.local[1]<1.46).sort((a,b)=>b.local[2]-a.local[2])[0];
        facePoints.nose=new THREE.Vector3(...nose.local);facePoints.chin=new THREE.Vector3(...median[0].local);
        const projectedFeatures=Object.fromEntries(Object.entries(facePoints).map(([k,v])=>[k,project(v)]));
        return {png:renderer.domElement.toDataURL('image/png').split(',')[1],median,projectedFeatures,finite:Array.from(p.array).every(Number.isFinite)};
      },{angle,bare,state});
      const buffer=Buffer.from(result.png,'base64');
      return {buffer,median:result.median,projectedFeatures:result.projectedFeatures,finite:result.finite};
    }
    for(const spec of specs){
      const result=await capture(spec);
      fs.writeFileSync(path.join(dest,spec[0]+'.png'),result.buffer);
      report.frames[spec[0]]={sha256:sha(result.buffer),angle:spec[1],projectedFeatures:result.projectedFeatures,finite:result.finite};
      if(spec[0]==='turn_90')report.median90=result.median;
    }
    for(const spec of [specs[3],specs[0]]){
      const r=await capture(spec);report.frames[spec[0]].reverseSeekEqual=sha(r.buffer)===report.frames[spec[0]].sha256;
    }
    fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify(report,null,2));
    await page.close();
    if(errors.length||Object.values(report.frames).some(f=>!f.finite)||!report.frames.front.reverseSeekEqual||!report.frames.turn_90.reverseSeekEqual)throw new Error(JSON.stringify(report.errors));
    console.log(`${name}: ${specs.length} views, deterministic front/profile, no browser errors`);
  }
}finally{await browser.close();}
