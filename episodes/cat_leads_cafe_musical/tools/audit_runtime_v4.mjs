import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(path.resolve('../../../dula-engine/package.json')),puppeteer=require('puppeteer');
const b=await puppeteer.launch({headless:true,args:['--no-sandbox']});try{
 const page=await b.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:4235/craft3d/viewer.html?full=1&capture=1');await page.waitForFunction('window.ready',{timeout:60000});
 const audit=await page.evaluate(async()=>{
  const THREE=await import('three'),ids=Object.fromEntries(Object.entries(window.actors).map(([k,a])=>[k,a.mesh.uuid]));let vertexSamples=0;
  for(const a of Object.values(window.actors))for(const m of a.face.root.children){if(!m.geometry)continue;for(const attr of ['position','normal']){const array=m.geometry.attributes[attr].array;for(const v of array){if(!Number.isFinite(v))throw Error('Non-finite head '+attr);vertexSamples++;}}}
  const samples=[];
  for(const t of [.7,4,8,10.5,12.65,13.25,14.8,16.4,18.7,19.2,40.066667,76.933333,96,100,102]){
   const r=window.renderAt(t);for(const [k,a] of Object.entries(window.actors)){if(ids[k]!==a.mesh.uuid||!a.mesh.visible)throw Error('Actor replaced or hidden at '+t);a.mesh.traverse(m=>{if(!m.matrixWorld.elements.every(Number.isFinite))throw Error('Non-finite matrix '+m.name);});}
   if(r.props.tap){const q=r.props.tap;if(Math.abs(q.tip[1]-.888)>.0001||Math.abs(Math.hypot(q.tip[0]+1.68,q.tip[2]+.76)-.05)>.008)throw Error('Tap missed rim');}
   const garment=r.limbs.Girl.garment;if(!garment||garment.minClearance<.006)throw Error('Skirt capsule clearance '+JSON.stringify({t,garment}));
   for(const v of window.actors.Girl.fittedSkirt.mesh.geometry.attributes.position.array)if(!Number.isFinite(v))throw Error('Non-finite skirt vertex');
   samples.push({t,mode:r.state.mode,visible:r.actorsVisible,jaw:{Girl:r.state.Girl.face.jaw,Boy:r.state.Boy.face.jaw},tap:r.props.tap,garment});
  }
  return{sameActors:true,finiteHeadValues:vertexSamples,samples};
 });
 if(errors.length)throw Error(errors.join('\n'));if(requests.some(u=>u.includes('cafe_table_v1')))throw Error('Legacy illustrated people loaded');
 audit.legacyTableImageRequested=false;audit.errors=errors;fs.writeFileSync('config/unified_runtime_audit_v4.json',JSON.stringify(audit,null,2));console.log(JSON.stringify({sameActors:audit.sameActors,finiteHeadValues:audit.finiteHeadValues,samples:audit.samples.length,legacyTableImageRequested:false,errors}));
}finally{await b.close();}
