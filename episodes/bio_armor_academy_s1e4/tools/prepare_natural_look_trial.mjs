// Isolated, reproducible edits to the existing characters. No live asset writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const ep=path.resolve(import.meta.dirname,'..'),assets=path.resolve(ep,'../../../dula-assets');
const out=path.join(ep,'tmp/natural_look');fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(path.join(assets,p),'utf8');
const write=(p,x)=>fs.writeFileSync(path.join(out,p),typeof x==='string'?x:JSON.stringify(x,null,2)+'\n');
const shape=read('characters/bioarmor/tripo-drawn-look.js');
const soften=`
// Work on the existing metre-space ring profiles; no new view-dependent warp.
function softenLowerFace(original,key){
  const c={...original};
  const widths=key==='lei'?[.006,.013,.021,.027,.041,.055,.068,.082,.095,.101]:[.005,.027,.050,.064,.075,.085,.093];
  const nose=key==='lei'?1.562:1.446,mouth=key==='lei'?1.532:1.423;
  const retreat=y=>(key==='lei'?.007:.0035)*Math.exp(-Math.pow((y-nose)/.017,2))+(key==='lei'?.003:.002)*Math.exp(-Math.pow((y-mouth)/.020,2));
  c.profiles=original.profiles.map((p,i)=>[p[0],widths[i]??p[1],p[2]-retreat(p[0])*.45,p[3]]);
  c.profileContour=original.profileContour.map(([y,z])=>[y,z-retreat(y)]);
  if(original.profileReference)c.profileReference={...original.profileReference,profileContour:original.profileReference.profileContour.map(([y,z])=>[y,z-retreat(y)])};
  c.faceRoundness=key==='lei'?.95:1.30;
  return c;
}
`;
const needle='const face=createDrawnHead(actor,config);';
if(!shape.includes(needle))throw new Error('Live character entrypoint changed');
write('tripo-drawn-look.js',shape.replace(needle,'const face=createDrawnHead(actor,softenLowerFace(config,key));')+soften);
const body=read('lib/craft3d/illustrated-import.js');
const toned=body.replace("shirtShade:'#b4bdc9'","shirtShade:'#d1d3d6'").replace("vestShade:'#17372e'","vestShade:'#204837'");
if(toned===body)throw new Error('Body palette anchors changed');
write('illustrated-import.js',toned);
const shapeMap={'/characters/bioarmor/tripo-drawn-look.js':'tmp/natural_look/tripo-drawn-look.js'};
write('shape.json',shapeMap);
write('combined.json',{...shapeMap,'/lib/craft3d/illustrated-import.js':'tmp/natural_look/illustrated-import.js'});
write('baseline.json',Object.fromEntries([
  ['characters/bioarmor/tripo-drawn-look.js',shape],['lib/craft3d/illustrated-import.js',body],
].map(([file,data])=>[path.join(assets,file),sha(data)]).concat([
  ['output/current.mp4',sha(fs.readFileSync(path.join(ep,'output/current.mp4')))],
  ['script.story',sha(fs.readFileSync(path.join(ep,'script.story')))]
])));
console.log(out);
