// 浏览器 import map 的 Node 侧等价：'three' 与 'dula-assets/' 前缀 → 文件 URL
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const story=path.resolve(import.meta.dirname,'../../..');
export function resolve(specifier,context,next){
  if(specifier==='three')
    return {url:pathToFileURL(path.join(story,'node_modules/dula-engine/node_modules/three/build/three.module.js')).href,shortCircuit:true};
  if(specifier.startsWith('dula-assets/'))
    return {url:pathToFileURL(path.join(story,'node_modules/dula-assets',specifier.slice('dula-assets/'.length))).href,shortCircuit:true};
  return next(specifier,context);
}
