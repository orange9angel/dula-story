// A0 中间验收：bake 数据能否复现构图——m05（艾琳望月近景）与 m15（工坊双人）逐拍
// 并排（3D 原帧 | 占位骨架）+ 骨架 overlay 重合图，附相机重建指纹数值。
// 前置：node render.mjs --serve --port 4217 常驻；hybrid/config/motion_full.json 已由 bake 产出。
// 用法：node hybrid/tools/ab_compare.mjs
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const storyRoot = path.resolve(root, '../..');
const board = path.join(root, 'storyboard/a0');
fs.mkdirSync(board, {recursive: true});
const BASE = 'http://127.0.0.1:4217/';
const puppeteer = createRequire(path.join(storyRoot, 'node_modules/dula-engine/package.json'))('puppeteer');

// m05 艾琳望月近景（35-43）、m15 工坊双人（109-117）：始/中/末三点
const TIMES = [
  {beat: 'm05', t: 36.5}, {beat: 'm05', t: 39}, {beat: 'm05', t: 42},
  {beat: 'm15', t: 110.5}, {beat: 'm15', t: 113}, {beat: 'm15', t: 116},
];
const ffmpeg = (args) => {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], {windowsHide: true});
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
};

const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
try {
  const open = async url => {
    const page = await browser.newPage();
    await page.setViewport({width: 1280, height: 720, deviceScaleFactor: 1});
    await page.goto(url, {waitUntil: 'networkidle0'});
    await page.waitForFunction('window.ready===true', {timeout: 120000});
    return page;
  };
  const src = await open(BASE + 'viewer.html?capture=1');
  const proto = await open(BASE + 'hybrid/art_pass_a0.html?capture=1');
  const protoT = await open(BASE + 'hybrid/art_pass_a0.html?capture=1&transparent=1');

  const report = {times: [], fingerprintMax: 0};
  for (const {beat, t} of TIMES) {
    const tag = `${beat}_t${String(t).replace('.', '_')}`;
    const a = await src.evaluate(t => window.renderAt(t), t);
    const b = await proto.evaluate(t => window.renderAt(t), t);
    const sk = await protoT.evaluate(t => window.renderAt(t), t);
    const fSrc = path.join(board, `src_${tag}.jpg`), fProto = path.join(board, `proto_${tag}.png`),
      fSkel = path.join(board, `skel_${tag}.png`);
    fs.writeFileSync(fSrc, Buffer.from(a.image, 'base64'));
    fs.writeFileSync(fProto, Buffer.from(b.image, 'base64'));
    fs.writeFileSync(fSkel, Buffer.from(sk.image, 'base64'));
    ffmpeg(['-i', fSrc, '-i', fProto, '-filter_complex', '[0][1]hstack', '-frames:v', '1', path.join(board, `ab_${tag}.png`)]);
    ffmpeg(['-i', fSrc, '-i', fSkel, '-filter_complex', '[0][1]overlay=0:0', '-frames:v', '1', path.join(board, `overlay_${tag}.png`)]);
    const v = await proto.evaluate(t => window.__verify(t), t);
    report.fingerprintMax = Math.max(report.fingerprintMax, v.maxDelta);
    report.times.push({beat, t, cameraFingerprintMaxDelta: v.maxDelta, worst: v.worst,
      state3d: {beat: a.state.beat, shot: a.state.shot}, stateProto: {beat: b.state.beat, shot: b.state.shot}});
    console.log(`${tag}: fingerprint maxDelta=${v.maxDelta.toFixed(5)}px beat=${a.state.beat}/${b.state.beat}`);
  }
  report.passed = report.fingerprintMax < .05
    && report.times.every(r => r.state3d.beat === r.stateProto.beat && r.state3d.shot === r.stateProto.shot);
  fs.writeFileSync(path.join(board, 'ab_report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({passed: report.passed, fingerprintMax: report.fingerprintMax, board}));
  if (!report.passed) process.exitCode = 1;
} finally { await browser.close(); }
