// E08 片头 OP 渲染器：静态服务器 + puppeteer 逐帧 + ffmpeg。
//   node painted/op/render.mjs --seg duet          # -> output/duet.mp4
//   node painted/op/render.mjs --seg title         # -> output/title.mp4
//   node painted/op/render.mjs --check             # 只出检查帧（storyboard/）
//   node painted/op/render.mjs --serve             # 预览服务
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const opRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const epRoot = path.resolve(opRoot, '..', '..');
const require = createRequire(path.join(epRoot, '../../node_modules/dula-engine/package.json'));
const puppeteer = require('puppeteer');
const seg = process.argv.includes('--seg') ? process.argv[process.argv.indexOf('--seg') + 1] : 'duet';
const check = process.argv.includes('--check');
const serveOnly = process.argv.includes('--serve');
const fps = 30;
const W = 1920, H = 1080;
const mime = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const mount = url.startsWith('/op/') ? opRoot : url.startsWith('/episode/') ? epRoot : opRoot;
  const rel = url.replace(/^\/(op|episode)\//, '').replace(/^\//, '') || 'viewer.html';
  const target = path.resolve(mount, rel);
  if (!target.startsWith(mount + path.sep) && target !== mount) { res.writeHead(403).end(); return; }
  fs.readFile(target, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});
server.listen(serveOnly ? 4190 : 0, '127.0.0.1');
await once(server, 'listening');
const url = `http://127.0.0.1:${server.address().port}/viewer.html?seg=${seg}&capture=1`;
console.log(url);
if (!serveOnly) {
  let browser, encoder;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.ready === true', { timeout: 60000 });
    const duration = await page.evaluate(() => window.duration);
    const outDir = path.join(opRoot, 'output');
    const boardDir = path.join(opRoot, 'storyboard');
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(boardDir, { recursive: true });
    const outFile = path.join(outDir, `${seg}.mp4`);
    if (!check) {
      encoder = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps),
        '-vcodec', 'mjpeg', '-i', 'pipe:0', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
        '-pix_fmt', 'yuv420p', '-t', String(duration), outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
    }
    // 检查帧：duet 段六个镜头的中点 + 四句唱词的开口中点
    const checkTimes = seg === 'title' ? [2.0] : [0.4, 2.0, 5.5, 9.0, 11.5, 15.0, 18.5, 20.3];
    const trace = [];
    for (let i = 0; i < Math.round(duration * fps); i++) {
      const t = i / fps;
      const r = await page.evaluate(t => window.renderAt(t), t);
      if (!check && !encoder.stdin.write(Buffer.from(r.image, 'base64'))) await once(encoder.stdin, 'drain');
      if (checkTimes.some(ct => Math.abs(t - ct) < 1 / fps / 2 + 1e-6)) {
        fs.writeFileSync(path.join(boardDir, `${seg}_${String(t.toFixed(2)).replace('.', '_')}.jpg`), Buffer.from(r.image, 'base64'));
        const mouth = await page.evaluate(t => window.mouthAt(t), t);
        trace.push({ t, ...mouth });
      }
      if (i % 30 === 0) console.log(`${check ? 'check' : 'render'} ${seg} ${i}/${Math.round(duration * fps)}`);
    }
    if (encoder) { encoder.stdin.end(); const [code] = await once(encoder, 'close'); if (code !== 0) throw new Error(`ffmpeg failed: ${code}`); }
    if (errors.length) throw new Error(errors.join('\n'));
    fs.writeFileSync(path.join(boardDir, `${seg}_trace.json`), JSON.stringify({ seg, duration, fps, errors, trace }, null, 2));
    console.log(check ? 'Checks complete' : `${outFile} complete`);
  } finally {
    if (encoder && !encoder.killed) encoder.kill();
    if (browser) await browser.close();
    server.close();
  }
}
