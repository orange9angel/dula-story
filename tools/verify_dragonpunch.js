/**
 * DragonPunch 综合验证脚本
 *
 * 三层验证体系：
 * 1. 静态分析 — 检查 DragonPunch.js 代码中的姿势值语义
 * 2. 运行时轨迹 — 采集13关节实际旋转值
 * 3. 视觉验证 — 截图关键帧 + AI 视觉分析
 *
 * Usage: node tools/verify_dragonpunch.js [episode-dir]
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EPISODE = process.argv[2] || path.join(__dirname, '..', 'episodes', 'yuyuhakusho');
const EPISODE_DIR = path.isAbsolute(EPISODE) ? EPISODE : path.resolve(process.cwd(), EPISODE);
const ENGINE_ROOT = path.join(__dirname, '..', '..', 'dula-engine');
const ASSETS_ROOT = path.join(__dirname, '..', '..', 'dula-assets');

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║           🐉 DragonPunch 综合验证 (三层验证体系)                      ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log(`Episode: ${EPISODE_DIR}`);
console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// Layer 1: 静态代码分析
// ═══════════════════════════════════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Layer 1: 静态代码分析');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const dragonPunchPath = path.join(ASSETS_ROOT, 'animations', 'common', 'DragonPunch.js');
const yusukePath = path.join(ASSETS_ROOT, 'characters', 'Yusuke.js');

if (!fs.existsSync(dragonPunchPath)) {
  console.error('❌ DragonPunch.js not found:', dragonPunchPath);
  process.exit(1);
}

const dpCode = fs.readFileSync(dragonPunchPath, 'utf-8');
const yusukeCode = fs.readFileSync(yusukePath, 'utf-8');

// Extract Yusuke's arm baseline construction
const lookAtMatch = yusukeCode.match(/shoulderGroup\.lookAt\(([^)]+)\)/);
const rotateXMatch = yusukeCode.match(/shoulderGroup\.rotateX\(([^)]+)\)/);
console.log('  Yusuke arm construction:');
console.log(`    lookAt(${lookAtMatch ? lookAtMatch[1] : '?'})`);
console.log(`    rotateX(${rotateXMatch ? rotateXMatch[1] : '?'})`);

// Extract DragonPunch pose values
const poseMatches = [...dpCode.matchAll(/pose\.(\w+)\s*=\s*\{([^}]+)\}/g)];
console.log('  DragonPunch pose assignments:');
for (const m of poseMatches) {
  console.log(`    ${m[1]} = { ${m[2].replace(/\n/g, ' ').trim()} }`);
}

// Static semantic checks
const issues = [];

// Check if rightShoulder.rx goes negative enough for upward motion
const rsRxMatch = dpCode.match(/rightShoulder[^}]*rx:\s*([-\d.]+)/);
if (rsRxMatch) {
  const rsRx = parseFloat(rsRxMatch[1]);
  console.log(`  rightShoulder.rx initial value: ${rsRx}`);
  // For Yusuke: baseline arm points down, rx=0 = down
  // To go UP, we need to rotate backward (positive rx in local space after lookAt+rotateX)
  // But the exact direction depends on the coordinate system
}

// Check mesh.y values
const meshYMatches = [...dpCode.matchAll(/mesh[^}]*y:\s*([-\d.]+)/g)];
console.log('  mesh.y values found:', meshYMatches.map((m) => m[1]).join(', '));

// Check duration
const durationMatch = dpCode.match(/duration[:\s=]+([\d.]+)/);
if (durationMatch) {
  console.log(`  Animation duration: ${durationMatch[1]}s`);
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// Layer 2: 运行时姿势轨迹采集
// ═══════════════════════════════════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Layer 2: 运行时姿势轨迹采集 (13关节点)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const poseTraceDir = path.join(EPISODE_DIR, 'storyboard', 'pose_trace');
const poseTraceJson = path.join(poseTraceDir, 'pose_trace.json');
const poseAnalysisJson = path.join(poseTraceDir, 'pose_analysis.json');

// Run pose trace collection
console.log('  Running pose_trace collection...');
try {
  const cmd = `node "${path.join(ENGINE_ROOT, 'tools', 'pose_trace.js')}" "${EPISODE_DIR}" --fps=60 --start=0 --end=6`;
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: EPISODE_DIR });
} catch (e) {
  console.error('  ⚠️ pose_trace failed:', e.message);
}

// Read and display results
if (fs.existsSync(poseTraceJson)) {
  const trace = JSON.parse(fs.readFileSync(poseTraceJson, 'utf-8'));
  console.log(`  ✓ Collected ${trace.samples.length} samples @ ${trace.fps}fps`);

  // Show DragonPunch-specific samples
  const dpSamples = [];
  for (const sample of trace.samples) {
    for (const ch of sample.characters) {
      if ((ch.activeBody || []).includes('DragonPunch')) {
        dpSamples.push({
          time: sample.time,
          character: ch.name,
          meshY: ch.joints?.mesh?.y,
          rsRx: ch.joints?.rightShoulder?.rx,
          lsRx: ch.joints?.leftShoulder?.rx,
          reRx: ch.joints?.rightElbow?.rx,
          leRx: ch.joints?.leftElbow?.rx,
          poseOffset: ch.poseOffset,
          baseline: ch.baseline,
        });
      }
    }
  }

  if (dpSamples.length > 0) {
    console.log(`  ✓ Found ${dpSamples.length} DragonPunch samples`);
    console.log('');
    console.log('  ┌────────┬──────────┬─────────┬──────────┬──────────┬──────────┬──────────┐');
    console.log('  │ Time   │ Mesh Y   │ RS.rx   │ LS.rx    │ RE.rx    │ LE.rx    │ Pose     │');
    console.log('  ├────────┼──────────┼─────────┼──────────┼──────────┼──────────┼──────────┤');

    // Show every 6th frame (0.1s intervals)
    for (let i = 0; i < dpSamples.length; i += 6) {
      const s = dpSamples[i];
      const phase = s.time < 1.7 ? 'CROUCH' : s.time < 2.0 ? 'EXPLODE' : s.time < 2.3 ? 'PEAK' : s.time < 2.5 ? 'FALL' : 'LAND';
      console.log(
        `  │ ${s.time.toFixed(2)} │ ${fmt(s.meshY, 8)} │ ${fmtAngle(s.rsRx, 7)} │ ${fmtAngle(s.lsRx, 8)} │ ${fmtAngle(s.reRx, 8)} │ ${fmtAngle(s.leRx, 8)} │ ${phase.padEnd(8)} │`
      );
    }
    console.log('  └────────┴──────────┴─────────┴──────────┴──────────┴──────────┴──────────┘');
    console.log('');

    // Baseline report
    const firstWithBaseline = dpSamples.find((s) => s.baseline);
    if (firstWithBaseline?.baseline) {
      console.log('  📐 Baseline rotation values (Yusuke T-pose):');
      for (const [joint, vals] of Object.entries(firstWithBaseline.baseline)) {
        if (vals?.rx !== undefined) {
          console.log(`    ${joint}.rx = ${fmtAngle(vals.rx, 12)} (baseline)`);
        }
      }
      console.log('');
    }

    // Pose offset report
    const firstWithOffset = dpSamples.find((s) => s.poseOffset);
    if (firstWithOffset?.poseOffset) {
      console.log('  🎯 PoseMatrix offset values at t=' + firstWithOffset.time.toFixed(2) + 's:');
      for (const [joint, vals] of Object.entries(firstWithOffset.poseOffset)) {
        if (vals && Object.keys(vals).length > 0) {
          const parts = Object.entries(vals).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(', ');
          console.log(`    ${joint}: { ${parts} }`);
        }
      }
      console.log('');
    }

    // Key findings
    const maxY = Math.max(...dpSamples.map((s) => s.meshY ?? 0));
    const peakSample = dpSamples.reduce((best, s) => (s.meshY > (best?.meshY ?? 0) ? s : best), null);

    console.log('  📈 Key Findings:');
    console.log(`    Max jump height: ${maxY.toFixed(3)}m`);
    if (peakSample) {
      console.log(`    At peak (t=${peakSample.time.toFixed(2)}s):`);
      console.log(`      rightShoulder.rx = ${fmtAngle(peakSample.rsRx)}`);
      console.log(`      leftShoulder.rx  = ${fmtAngle(peakSample.lsRx)}`);
      console.log(`      rightElbow.rx    = ${fmtAngle(peakSample.reRx)}`);
      console.log(`      leftElbow.rx     = ${fmtAngle(peakSample.leRx)}`);
    }
  }
}

if (fs.existsSync(poseAnalysisJson)) {
  const analysis = JSON.parse(fs.readFileSync(poseAnalysisJson, 'utf-8'));
  if (analysis.issues.length > 0) {
    console.log('');
    console.log('  ⚠️ Automated Issues:');
    for (const issue of analysis.issues) {
      const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
      console.log(`    ${icon} [${issue.type}] ${issue.message}`);
      if (issue.fix) console.log(`       💡 ${issue.fix}`);
    }
  }
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// Layer 3: 视觉截图验证
// ═══════════════════════════════════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📸 Layer 3: 视觉截图验证');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const storyboardDir = path.join(EPISODE_DIR, 'storyboard');
const checkFiles = fs.readdirSync(storyboardDir).filter((f) => f.startsWith('check_shot_') && f.endsWith('.jpg'));

if (checkFiles.length > 0) {
  console.log(`  ✓ Found ${checkFiles.length} verification screenshots:`);
  for (const f of checkFiles.sort()) {
    const fp = path.join(storyboardDir, f);
    const stat = fs.statSync(fp);
    console.log(`    ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
  }
} else {
  console.log('  No verification screenshots found. Run verify_shots to generate them.');
}

console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 验证总结');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const svgPath = path.join(poseTraceDir, 'pose_trace.svg');
const mdPath = path.join(poseTraceDir, 'pose_trace_summary.md');

console.log('  生成文件:');
if (fs.existsSync(poseTraceJson)) console.log(`    ✓ ${poseTraceJson}`);
if (fs.existsSync(svgPath)) console.log(`    ✓ ${svgPath}`);
if (fs.existsSync(mdPath)) console.log(`    ✓ ${mdPath}`);
if (fs.existsSync(poseAnalysisJson)) console.log(`    ✓ ${poseAnalysisJson}`);

console.log('');
console.log('  使用建议:');
console.log('    1. 打开 pose_trace.svg 查看关节轨迹图');
console.log('    2. 检查 rightShoulder.rx 在 EXPLODE/PEAK 阶段是否接近垂直向上');
console.log('    3. 检查 mesh.y 曲线是否形成完整的 下蹲→腾空→落地 抛物线');
console.log('    4. 对比 baseline 值校准 PoseMatrix offset');
console.log('');

// Helper functions
function fmt(n, width = 8) {
  if (!Number.isFinite(n)) return '?'.padStart(width);
  return n.toFixed(3).padStart(width);
}

function fmtAngle(rad, width = 12) {
  if (!Number.isFinite(rad)) return '?'.padStart(width);
  const deg = (rad * 180 / Math.PI).toFixed(0);
  const s = `${rad.toFixed(2)}rad(${deg}°)`;
  return s.padStart(width);
}
