import {bridge} from './bridge.mjs';
import fs from 'node:fs';
const command=process.argv[2],arg=process.argv[3];
if(command==='snapshot'){
 const r=bridge('snapshot'); const flat=[]; const walk=n=>{if(n.ref)flat.push({role:n.role,name:n.name,ref:n.ref});for(const c of n.children??[])walk(c);};r.tree.forEach(walk); console.log(JSON.stringify({url:r.url,items:flat.filter(n=>!arg||new RegExp(arg,'i').test(n.name??''))}));
}else if(command==='request'){const r=JSON.parse(fs.readFileSync(arg,'utf8'));console.log(JSON.stringify(bridge(r.action,r.args)));}
else console.log(JSON.stringify(bridge(command,arg?JSON.parse(arg):{})));
