// 本集静态服务：剧集目录 + /node_modules（dula-story 的 three）。
// 用法：node tools/serve.mjs [port=4270]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modules = path.resolve(root, '../../node_modules');
const port = Number(process.argv[2] ?? 4270);
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.wav': 'audio/wav'};

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = url.startsWith('/node_modules/') ? path.join(modules, url.slice(14)) : path.join(root, url);
  if (!file.startsWith(root) && !file.startsWith(modules)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store'}).end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}/`));
