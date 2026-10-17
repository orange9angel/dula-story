import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compareNumericState} from 'dula-engine/lib/NumericAudit.js';
const root=process.argv[2]?pathToFileURL(path.resolve(process.argv[2])+path.sep):new URL('../tmp/romcom_revision/',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const picture=read('final/trace.json'),physics=read(`${process.argv[3]??'final_physics'}/trace.json`);
if(picture.frames.length!==physics.frames.length)throw new Error('Frame coverage mismatch');
const inputs=b=>JSON.stringify(b.inputs.map(x=>[x.path,x.sha256]).sort());
if(inputs(picture.build)!==inputs(physics.build))throw new Error('Physics build is not the picture build');
let maxDelta=0,failures=[];
for(let i=0;i<picture.frames.length;i++){
 const expected=picture.frames[i],full=physics.frames[i];
 // Physics adds importedSurface measurements; every state key actually
 // recorded by the picture renderer must still agree at every frame.
 const observed=Object.fromEntries(Object.keys(expected).map(k=>[k,full[k]]));
 const result=compareNumericState(expected,observed);maxDelta=Math.max(maxDelta,result.maxDelta);
 if(!result.equal)failures.push({i,...result});
}
const report={passed:!failures.length,frames:picture.frames.length,identicalBuildInputs:true,maxDelta,failures:failures.slice(0,10)};
fs.writeFileSync(new URL('final/state_equivalence.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
