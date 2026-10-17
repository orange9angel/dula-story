import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
export function bridge(action,args={}){
  const file=path.join(here,'webbridge-'+randomUUID()+'.json');
  fs.writeFileSync(file,JSON.stringify({session:'sunprint-cafe-musical',action,args}));
  try{
    const result=JSON.parse(execFileSync('curl.exe',['-s','--max-time','45','-X','POST','http://127.0.0.1:10086/command','-H','Content-Type: application/json','--data-binary','@'+file],{encoding:'utf8',windowsHide:true}));
    if(!result.ok)throw new Error(JSON.stringify(result.error));
    return result.data;
  }finally{fs.unlinkSync(file);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)&&process.argv[2]){const request=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));console.log(JSON.stringify(bridge(request.action,request.args)));}
