const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sfxEvents = JSON.parse(fs.readFileSync('./sfx_events.json', 'utf8'));
const sfxDir = './sfx';
const outputWav = './mixed.wav';

// Get total duration
const maxTime = Math.max(...sfxEvents.map(e => e.time));
const totalDuration = maxTime + 2.0;
console.log('Total duration: ' + totalDuration.toFixed(2) + 's');

// Build ffmpeg filter_complex
const inputs = [];
const delays = [];
let inputIdx = 0;

for (const event of sfxEvents) {
  const wavPath = path.join(sfxDir, event.name + '.wav');
  if (!fs.existsSync(wavPath)) {
    console.log('WARNING: not found: ' + wavPath);
    continue;
  }
  inputs.push('-i "' + wavPath.replace(/\\/g, '/') + '"');
  const delayMs = Math.round(event.time * 1000);
  delays.push('[' + inputIdx + ']adelay=' + delayMs + '|' + delayMs + '[d' + inputIdx + ']');
  inputIdx++;
}

if (inputs.length === 0) {
  console.log('No valid SFX files found!');
  process.exit(1);
}

// Build amix filter
const mixInputs = [];
for (let i = 0; i < inputIdx; i++) {
  mixInputs.push('[d' + i + ']');
}

const filterComplex = delays.join(';') + ';' + mixInputs.join('') + 'amix=inputs=' + inputIdx + ':duration=longest:normalize=0,volume=' + Math.min(3.0, 1.5 + inputIdx * 0.02) + '[out]';

const cmd = 'ffmpeg -y ' + inputs.join(' ') + ' -filter_complex "' + filterComplex + '" -map "[out]" -ar 48000 -ac 2 "' + outputWav + '"';

console.log('Running ffmpeg with ' + inputs.length + ' inputs...');
console.log('Command length: ' + cmd.length);
try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('Done! Output: ' + outputWav);
} catch (e) {
  console.error('ffmpeg failed:', e.message);
}
