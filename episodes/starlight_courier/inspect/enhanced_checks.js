/**
 * starlight_courier 增强质检规则
 * 补充 dula-inspect-team 未覆盖的检测维度
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EPISODE_DIR = join(__dirname, '..');

// ============ 1. 剧本解析工具 ============

function parseStory(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) {
        entries.push(current);
        current = null;
      }
      continue;
    }

    // 序号行
    if (/^\d+$/.test(trimmed)) {
      if (current) entries.push(current);
      current = { id: parseInt(trimmed), text: '', tags: [] };
      continue;
    }

    // 时间轴行
    const timeMatch = trimmed.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
    if (timeMatch && current) {
      current.startTime = parseTime(timeMatch[1]);
      current.endTime = parseTime(timeMatch[2]);
      continue;
    }

    // 内容行（合并多行）
    if (current) {
      current.text += (current.text ? ' ' : '') + trimmed;
    }
  }
  if (current) entries.push(current);

  // 解析标签
  for (const entry of entries) {
    entry.scene = entry.text.match(/@(\w+)/)?.[1] || null;
    entry.characters = [...entry.text.matchAll(/\[(\w+)\]/g)].map(m => m[1]);
    entry.animations = [...entry.text.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    entry.camera = entry.text.match(/\{Camera:(\w+)\|([^}]*)\}/);
    entry.events = [...entry.text.matchAll(/\{Event:(\w+)\|([^}]*)\}/g)].map(m => ({
      type: m[1],
      params: parseParams(m[2])
    }));
    entry.positions = [...entry.text.matchAll(/\{Position:(\w+)\|([^}]*)\}/g)].map(m => ({
      character: m[1],
      params: parseParams(m[2])
    }));
    entry.dialogue = entry.text.replace(/\{[^}]+\}/g, '').replace(/@\w+/g, '').trim();
  }

  return entries;
}

function parseTime(t) {
  const [h, m, s] = t.replace(',', '.').split(':');
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
}

function parseParams(paramStr) {
  const params = {};
  if (!paramStr) return params;
  for (const part of paramStr.split('|')) {
    const [k, v] = part.split('=');
    if (k && v !== undefined) {
      params[k.trim()] = v.trim();
    }
  }
  return params;
}

// ============ 2. 增强检测规则 ============

const CHECKS = {
  // D13: 角色移动出画面检测
  characterOutOfFrame(entry) {
    const issues = [];
    for (const evt of entry.events) {
      if (evt.type === 'Move') {
        const x = parseFloat(evt.params.x);
        const z = parseFloat(evt.params.z);
        // 简单判断：x 或 z 绝对值超过 10 视为可能出画
        if (Math.abs(x) > 10 || Math.abs(z) > 10) {
          issues.push({
            severity: 'ERROR',
            message: `Entry ${entry.id}: Event:Move 角色移动到 (${x}, ${z})，可能移出画面导致相机穿模`,
            fix: '减小移动距离，或使用 FollowCharacter 运镜跟随'
          });
        }
      }
    }
    return issues;
  },

  // D14: 角色堆叠检测
  characterStacking(entry, allEntries) {
    const issues = [];
    const moveTargets = {};

    for (const evt of entry.events) {
      if (evt.type === 'Move') {
        const char = evt.params.character;
        const key = `${evt.params.x},${evt.params.y || 0},${evt.params.z}`;
        if (!moveTargets[key]) moveTargets[key] = [];
        moveTargets[key].push(char);
      }
    }

    for (const [pos, chars] of Object.entries(moveTargets)) {
      if (chars.length > 1) {
        issues.push({
          severity: 'ERROR',
          message: `Entry ${entry.id}: 多个角色 (${chars.join(', ')}) 移动到同一坐标 (${pos})，会堆叠`,
          fix: `为每个角色分配不同坐标，如 ${chars.map((c, i) => `${c}: x=${(i - 1) * 0.5}`).join(', ')}`
        });
      }
    }

    return issues;
  },

  // D15: 一字排线构图检测
  linearFormation(entry) {
    const issues = [];
    if (entry.positions.length >= 3) {
      const zs = entry.positions.map(p => parseFloat(p.params.z) || 0);
      const xs = entry.positions.map(p => parseFloat(p.params.x) || 0);

      // 检查是否所有 z 相同（一字横排）
      const allSameZ = zs.every(z => Math.abs(z - zs[0]) < 0.1);
      if (allSameZ) {
        issues.push({
          severity: 'WARNING',
          message: `Entry ${entry.id}: ${entry.positions.length} 个角色 z 坐标相同(${zs[0]})，站成一字横排，构图呆板`,
          fix: '调整 z 坐标形成三角形或错落布局'
        });
      }

      // 检查是否所有 x 相同（一字纵排）
      const allSameX = xs.every(x => Math.abs(x - xs[0]) < 0.1);
      if (allSameX) {
        issues.push({
          severity: 'WARNING',
          message: `Entry ${entry.id}: ${entry.positions.length} 个角色 x 坐标相同(${xs[0]})，站成一字纵排`,
          fix: '调整 x 坐标形成错落布局'
        });
      }
    }
    return issues;
  },

  // D16: 台词与动作语义匹配
  dialogueActionMismatch(entry) {
    const issues = [];
    const dialogue = entry.dialogue;
    const hasMoveOut = entry.events.some(e => e.type === 'Move' && parseFloat(e.params.z) < -1);

    // "跟我来" 应该有走向某处的动作
    if (dialogue.includes('跟我来') && !hasMoveOut) {
      issues.push({
        severity: 'WARNING',
        message: `Entry ${entry.id}: 台词"跟我来"但角色没有向目标移动的动作`,
        fix: '添加 Event:Move 让角色走向目标位置'
      });
    }

    // 检查多余台词
    if (dialogue.includes('这时光机') && dialogue.length < 10) {
      issues.push({
        severity: 'INFO',
        message: `Entry ${entry.id}: 台词"这时光机"可能是重复信息`,
        fix: '考虑删除或合并到前一句台词中'
      });
    }

    return issues;
  },

  // D17: Static 相机 + 角色移动 = 穿模风险
  staticCameraWithMovement(entry) {
    const issues = [];
    const isStatic = entry.camera && entry.camera[1] === 'Static';
    const hasMove = entry.events.some(e => e.type === 'Move');

    if (isStatic && hasMove) {
      const camParams = parseParams(entry.camera[2]);
      const lookAtZ = parseFloat((camParams.lookAt || '0,0,0').split(',')[2]) || 0;
      const moveZ = entry.events.find(e => e.type === 'Move')?.params.z;

      // 如果角色移向相机后方而相机不动
      if (moveZ && parseFloat(moveZ) < lookAtZ - 2) {
        issues.push({
          severity: 'WARNING',
          message: `Entry ${entry.id}: Static 相机 + 角色向深处移动，可能穿模或出画`,
          fix: '改用 FollowCharacter 运镜，或限制角色移动范围'
        });
      }
    }
    return issues;
  }
};

// ============ 3. 主运行 ============

function runEnhancedChecks() {
  const storyPath = join(EPISODE_DIR, 'script.story');
  const entries = parseStory(storyPath);

  console.log('=== Starlight Courier 增强质检报告 ===\n');

  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const entry of entries) {
    const entryIssues = [];

    for (const [checkName, checkFn] of Object.entries(CHECKS)) {
      const issues = checkFn(entry, entries);
      entryIssues.push(...issues);
    }

    if (entryIssues.length > 0) {
      console.log(`\n--- Entry ${entry.id} (${formatTime(entry.startTime)}-${formatTime(entry.endTime)}) ---`);
      console.log(`台词: ${entry.dialogue.substring(0, 60)}${entry.dialogue.length > 60 ? '...' : ''}`);
      for (const issue of entryIssues) {
        const icon = issue.severity === 'ERROR' ? '❌' : issue.severity === 'WARNING' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} [${issue.severity}] ${issue.message}`);
        console.log(`     修复建议: ${issue.fix}`);

        if (issue.severity === 'ERROR') errorCount++;
        else if (issue.severity === 'WARNING') warningCount++;
        else infoCount++;
      }
    }
  }

  console.log(`\n=== 统计 ===`);
  console.log(`❌ ERROR: ${errorCount}`);
  console.log(`⚠️ WARNING: ${warningCount}`);
  console.log(`ℹ️ INFO: ${infoCount}`);

  if (errorCount > 0) {
    console.log(`\n请先修复 ERROR 级别问题后再渲染。`);
    process.exit(1);
  } else if (warningCount > 0) {
    console.log(`\nWARNING 级别问题建议修复，但不阻塞渲染。`);
  } else {
    console.log(`\n✅ 所有增强检测通过！`);
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m${s}s`;
}

runEnhancedChecks();
