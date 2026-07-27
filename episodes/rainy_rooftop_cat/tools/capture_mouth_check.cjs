// One-off mouth-rig visual check: captures the sequence at times when the
// lip-sync cues should hold the mouth open/half, into storyboard/mouth_check_*.jpg.
// Usage (from dula-story): node episodes/rainy_rooftop_cat/tools/capture_mouth_check.cjs
const puppeteer = require('D:/opensource/movie/dula-engine/node_modules/puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ENGINE_ROOT = 'D:/opensource/movie/dula-engine';
const EPISODE_DIR = path.resolve(__dirname, '..');
const CHECK_DIR = path.join(EPISODE_DIR, 'storyboard');
const PORT = 8767;

// (time, rig expectation) — all inside audible segments of the rig entries.
const SAMPLES = [
  { t: 2.0, note: 'full rain on frame_00' },
  { t: 4.0, note: 'walk_alt inbetween + full rain' },
  { t: 8.55, note: 'cat meow tail on frame_04 rig' },
  { t: 9.6, note: 'crouch_mid inbetween' },
  { t: 10.5, note: 'entry4 audible on frame_05 rig' },
  { t: 11.4, note: 'tilt_mid inbetween' },
  { t: 16.8, note: 'cat soft meow on frame_08 rig' },
  { t: 20.8, note: 'rain weakening' },
  { t: 22.0, note: 'light drizzle' },
  { t: 23.0, note: 'no rain after 22.6' },
  { t: 25.4, note: 'nuzzle_alt inbetween' },
  { t: 28.1, note: 'pickup_mid inbetween' },
  { t: 29.5, note: 'walkaway_alt inbetween' },
];

const server = http.createServer((req, res) => {
  const reqPath = req.url.split('?')[0];
  let filePath;
  if (reqPath.startsWith('/episode/')) {
    filePath = path.join(EPISODE_DIR, decodeURIComponent(reqPath.slice('/episode/'.length)));
  } else if (reqPath.startsWith('/node_modules/')) {
    const relPath = decodeURIComponent(reqPath.slice('/node_modules/'.length));
    filePath = path.join(EPISODE_DIR, 'node_modules', relPath);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'node_modules', relPath);
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(ENGINE_ROOT, 'node_modules', relPath);
    }
  } else {
    filePath = path.join(ENGINE_ROOT, reqPath === '/' ? 'render.html' : decodeURIComponent(reqPath));
  }
  const mime = {
    '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
    '.story': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav',
  }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.listen(PORT, async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));
  await page.goto(`http://localhost:${PORT}/tools/verify.html`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(async () => { await window.loadStoryboard(); });
  await new Promise((r) => setTimeout(r, 4000));

  for (const sample of SAMPLES) {
    const dataUrl = await page.evaluate(async (time) => await window.captureAtTime(time), sample.t);
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
    const filename = path.join(CHECK_DIR, `mouth_check_t${String(sample.t).replace('.', '_')}.jpg`);
    fs.mkdirSync(CHECK_DIR, { recursive: true });
    fs.writeFileSync(filename, buffer);
    console.log(`t=${sample.t}s (${sample.note}) -> ${filename}`);
  }
  await browser.close();
  server.close();
  console.log('Mouth check captures complete.');
});
