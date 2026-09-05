import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const ASSET_ROOT = '/episode/assets/';
const TIMELINE_URL = '/episode/config/keyframe_timeline.json';
const LIPSYNC_URL = '/episode/config/lipsync_cues.json';
const MOUTH_RIG_URL = '/episode/config/mouth_rigs.json';
const STORY_URL = '/episode/script.story';
const EYE_RIG_URL = '/episode/config/eye_rigs.json';

// Living-manga overlay palette, straight from STYLE_BIBLE.md: warm paper for
// the page-turn back and the narrator subtitle tint, black ink for outlines,
// and the two accent inks reserved for onomatopoeia.
const MANGA = {
  paper: '#F4EFE6',
  paperShadow: '#D8CFBE',
  ink: '#111111',
  sfxRed: '#FF3B3B',
  sfxTeal: '#3DFFC8',
};

const BUBBLE_FONT = '"Noto Sans SC", "Microsoft YaHei", sans-serif';

const SPEAKER_LABELS = {
  LeiXiao: '雷晓',
  BaiLan: '白岚',
};

// Bottom subtitle strip (rainy_rooftop_cat grammar): rounded dark translucent
// bar with stroked white text, centered near the bottom edge. Narrator lines
// carry no prefix and use italic warm-paper text instead.
const SUBTITLE_MAX_TEXT_WIDTH = 1550;
const SUBTITLE_FONT_SIZE = 46;
const SUBTITLE_LINE_HEIGHT = 62;
const SUBTITLE_FADE_SECONDS = 0.12;

const SFX_POP_SECONDS = 0.1;
const TITLE_FADE_SECONDS = 0.4;

function hash01(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function hashString(text) {
  let hash = 7;
  for (const character of text) {
    hash = (hash * 31 + character.charCodeAt(0)) % 100003;
  }
  return hash;
}

// Classic easeOutBack: overshoots 1.0 around t≈0.7 then settles — the manga
// "pop" used by the onomatopoeia overlays.
function easeOutBack(value) {
  const t = clamp(value, 0, 1) - 1;
  const s = 1.70158;
  return 1 + (s + 1) * t * t * t + s * t * t;
}

const MOTION_PRESETS = {
  static: { zoom: [1, 1], panX: [0, 0], panY: [0, 0] },
  push_in: { zoom: [1.004, 1.026], panX: [0, 0], panY: [0, -0.04] },
  push_in_strong: { zoom: [1.008, 1.052], panX: [0, 0], panY: [0.02, -0.08] },
  pull_out: { zoom: [1.046, 1.008], panX: [0, 0], panY: [-0.04, 0] },
  drift_left: { zoom: [1.018, 1.035], panX: [0.28, -0.28], panY: [0, -0.04] },
  drift_right: { zoom: [1.018, 1.035], panX: [-0.28, 0.28], panY: [0, -0.04] },
  drift_left_fast: { zoom: [1.02, 1.044], panX: [0.55, -0.55], panY: [0.04, -0.05] },
  drift_right_fast: { zoom: [1.02, 1.044], panX: [-0.55, 0.55], panY: [0.04, -0.05] },
  pull_out_fast: { zoom: [1.06, 1.012], panX: [0.2, -0.08], panY: [-0.04, 0.02] },
  tilt_up: { zoom: [1.018, 1.04], panX: [0, 0], panY: [0.22, -0.5] },
  tilt_up_fast: { zoom: [1.026, 1.052], panX: [0, 0], panY: [0.42, -0.68] },
  tilt_down: { zoom: [1.032, 1.045], panX: [0.05, -0.05], panY: [-0.38, 0.55] },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function timestampToSeconds(hours, minutes, seconds, milliseconds) {
  return Number(hours) * 3600
    + Number(minutes) * 60
    + Number(seconds)
    + Number(milliseconds) / 1000;
}

function parseTimestampRange(value) {
  const match = value.match(
    /^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})$/
  );
  if (!match) return null;
  return {
    start: timestampToSeconds(match[1], match[2], match[3], match[4]),
    end: timestampToSeconds(match[5], match[6], match[7], match[8]),
  };
}

function parseStory(storyText) {
  const normalized = storyText.replace(/\r\n?/g, '\n').trim();
  const subtitles = [];
  let duration = 0;

  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    const range = parseTimestampRange(lines[1].trim());
    if (!range) continue;
    duration = Math.max(duration, range.end);

    const content = lines.slice(2).join('\n');
    const speakerMatch = content.match(/\[([A-Za-z0-9_]+)\]/);
    if (!speakerMatch) continue;
    const dialogue = content
      .replace(/^@\w+(?:\{[^}]*\})*\s*/, '')
      .replace(/\[[^\]]+\]\s*/, '')
      .replace(/\{[^}]+\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!dialogue) continue;
    subtitles.push({
      index: Number(lines[0].trim()),
      start: range.start,
      end: range.end,
      speaker: speakerMatch[1],
      text: dialogue,
    });
  }

  if (!(duration > 0)) {
    throw new Error('BioArmorCityScene could not read a positive duration from script.story');
  }
  return { duration, subtitles };
}

function normalizeAssetPath(file, defaultFolder = 'keyframes') {
  if (typeof file !== 'string' || !file.trim()) {
    throw new Error(`Invalid empty asset path: ${file}`);
  }
  const normalized = file.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('..') || !/^[A-Za-z0-9_./-]+\.(png|jpe?g|webp)$/i.test(normalized)) {
    throw new Error(`Unsafe or unsupported image asset path: ${file}`);
  }
  return normalized.includes('/') ? normalized : `${defaultFolder}/${normalized}`;
}

// bubbleAnchors: { "LeiXiao": [nx, ny], ... } — legacy normalized source-image
// speaker anchors from the retired speech-bubble renderer. Kept parseable so
// existing keyframe_timeline.json configs stay valid; the bottom subtitle
// strip ignores them.
function normalizeBubbleAnchors(raw) {
  if (!raw) return null;
  const anchors = {};
  for (const [speaker, point] of Object.entries(raw)) {
    if (
      !Array.isArray(point) || point.length !== 2
      || point.some((v) => !Number.isFinite(Number(v)))
    ) {
      throw new Error(`Invalid bubbleAnchors point for ${speaker}: ${JSON.stringify(point)}`);
    }
    anchors[speaker] = point.map(Number);
  }
  return anchors;
}

// speedlines: { "type": "converge", "cx": 0.5, "cy": 0.42, "density": 40 } —
// screen-space concentration lines radiating from the canvas edges toward the
// normalized focus point; they ignore the crop move on purpose.
function normalizeSpeedlines(raw) {
  if (!raw) return null;
  if (raw.type !== 'converge') {
    throw new Error(`Unsupported speedlines type: ${raw.type}`);
  }
  const cx = Number(raw.cx);
  const cy = Number(raw.cy);
  const density = Number(raw.density);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
    throw new Error('speedlines config needs finite cx/cy');
  }
  if (!Number.isInteger(density) || density <= 0 || density > 240) {
    throw new Error('speedlines density must be an integer in 1..240');
  }
  return { type: 'converge', cx, cy, density };
}

// fx: { "type": "impact", "at": 0.9, "duration": 0.12 } — a short full-cel
// invert+contrast flash with two-axis shake, `at` seconds into the frame.
function normalizeFx(raw) {
  if (!raw) return null;
  if (raw.type !== 'impact') {
    throw new Error(`Unsupported fx type: ${raw.type}`);
  }
  const at = Number(raw.at);
  const duration = Number(raw.duration);
  if (!Number.isFinite(at) || at < 0) throw new Error('fx config needs at >= 0');
  if (!Number.isFinite(duration) || duration <= 0 || duration > 0.5) {
    throw new Error('fx duration must be in (0, 0.5]');
  }
  return { type: 'impact', at, duration };
}

// sfxTexts: [{ "text", "from", "to", "style": "red"|"teal", "x", "y" }] —
// absolute-seconds onomatopoeia overlays at normalized canvas positions.
function normalizeSfxTexts(raw) {
  if (!raw) return [];
  if (!Array.isArray(raw)) throw new Error('sfxTexts must be an array');
  return raw.map((item, index) => {
    const from = Number(item.from);
    const to = Number(item.to);
    if (typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error(`sfxTexts[${index}] needs a non-empty text`);
    }
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
      throw new Error(`sfxTexts[${index}] needs from < to`);
    }
    const style = item.style === 'teal' ? 'teal' : 'red';
    const x = Number.isFinite(Number(item.x)) ? Number(item.x) : 0.5;
    const y = Number.isFinite(Number(item.y)) ? Number(item.y) : 0.4;
    return {
      text: item.text,
      from,
      to,
      style,
      x,
      y,
      seed: hashString(item.text),
    };
  });
}

// titleCard: { "text", "sub", "from", "to", "x", "y" } — chapter title in
// black ink with a white outline, absolute seconds, normalized position.
function normalizeTitleCard(raw) {
  if (!raw) return null;
  const from = Number(raw.from);
  const to = Number(raw.to);
  if (typeof raw.text !== 'string' || !raw.text.trim()) {
    throw new Error('titleCard needs a non-empty text');
  }
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    throw new Error('titleCard needs from < to');
  }
  return {
    text: raw.text,
    sub: typeof raw.sub === 'string' ? raw.sub : '',
    from,
    to,
    x: Number.isFinite(Number(raw.x)) ? Number(raw.x) : 0.5,
    y: Number.isFinite(Number(raw.y)) ? Number(raw.y) : 0.2,
  };
}

function normalizeTimeline(rawTimeline, storyDuration) {
  if (!rawTimeline || !Array.isArray(rawTimeline.frames) || rawTimeline.frames.length === 0) {
    throw new Error('keyframe_timeline.json must contain a non-empty frames array');
  }
  // The timeline may declare a duration slightly longer than the story's last
  // cue end (e.g. a trailing SFX tail); the declared duration is authoritative.
  const declaredDuration = Number(rawTimeline.duration);
  if (!Number.isFinite(declaredDuration) || declaredDuration < storyDuration - 0.001) {
    throw new Error(
      `Keyframe timeline duration ${declaredDuration} is shorter than story duration ${storyDuration}`
    );
  }

  const frames = rawTimeline.frames.map((frame, index) => {
    const at = Number(frame.at);
    if (!Number.isFinite(at) || at < 0 || at >= declaredDuration) {
      throw new Error(`Invalid keyframe time at timeline index ${index}: ${frame.at}`);
    }
    if (!MOTION_PRESETS[frame.move || 'static']) {
      throw new Error(`Unknown keyframe motion preset at timeline index ${index}: ${frame.move}`);
    }
    const transition = frame.transition === 'crossfade' || frame.transition === 'page'
      ? frame.transition
      : 'cut';
    return {
      at,
      file: normalizeAssetPath(frame.file),
      shot: frame.shot || `shot_${index}`,
      move: frame.move || 'static',
      mouthRig: frame.mouthRig || null,
      eyeRig: frame.eyeRig || null,
      shiver: frame.shiver === true,
      bubbleAnchors: normalizeBubbleAnchors(frame.bubbleAnchors),
      speedlines: normalizeSpeedlines(frame.speedlines),
      fx: normalizeFx(frame.fx),
      transition,
      // Page turns need room to breathe; crossfades stay snappy.
      transitionSeconds: clamp(
        Number(frame.transitionSeconds) || 0,
        0,
        transition === 'page' ? 1.2 : 0.5
      ),
    };
  });

  if (Math.abs(frames[0].at) > 0.001) {
    throw new Error('The first keyframe must start at 0 seconds');
  }
  for (let index = 1; index < frames.length; index += 1) {
    if (frames[index].at <= frames[index - 1].at) {
      throw new Error(`Keyframe timeline must be strictly increasing at index ${index}`);
    }
  }
  return {
    frames,
    duration: declaredDuration,
    sfxTexts: normalizeSfxTexts(rawTimeline.sfxTexts),
    titleCard: normalizeTitleCard(rawTimeline.titleCard),
  };
}

function normalizeEyeRigs(rawRigs) {
  const rigs = new Map();
  for (const [id, source] of Object.entries(rawRigs?.rigs || {})) {
    const rect = source.rect?.map(Number);
    if (!rect || rect.length !== 4 || rect.some((value) => !Number.isFinite(value))) {
      throw new Error(`Eye rig ${id} needs a four-value closed-lid rect`);
    }
    if (!source.closed) throw new Error(`Eye rig ${id} is missing a closed variant`);
    const interval = Array.isArray(source.intervalSeconds)
      ? source.intervalSeconds.map(Number)
      : [2.6, 4.4];
    if (interval.length !== 2 || interval.some((v) => !(v > 0))) {
      throw new Error(`Eye rig ${id} intervalSeconds must be two positive numbers`);
    }
    rigs.set(id, {
      id,
      rect,
      closed: normalizeAssetPath(source.closed, 'eye_variants'),
      interval,
      // Hash the whole rig id so every shot blinks on its own schedule.
      seed: hash01([...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 100003, 7)),
    });
  }
  return rigs;
}

function normalizeMouthRigs(rawRigs) {
  const rigs = new Map();
  for (const [id, source] of Object.entries(rawRigs?.rigs || {})) {
    const entry = Number(source.entry);
    if (!Number.isInteger(entry)) throw new Error(`Mouth rig ${id} needs an integer entry`);
    if (source.mode === 'procedural') {
      const anchor = source.anchor?.map(Number);
      const size = source.size?.map(Number);
      if (!anchor || anchor.length !== 2 || !size || size.length !== 2) {
        throw new Error(`Procedural mouth rig ${id} needs anchor and size pairs`);
      }
      rigs.set(id, { id, entry, mode: 'procedural', anchor, size });
      continue;
    }
    const rect = source.rect?.map(Number);
    if (!rect || rect.length !== 4 || rect.some((value) => !Number.isFinite(value))) {
      throw new Error(`Image mouth rig ${id} needs a four-value source rect`);
    }
    const variants = {};
    for (const state of ['closed', 'half', 'open']) {
      if (!source.variants?.[state]) throw new Error(`Mouth rig ${id} is missing ${state}`);
      variants[state] = normalizeAssetPath(source.variants[state], 'mouth_variants');
    }
    rigs.set(id, { id, entry, mode: 'image', rect, variants });
  }
  return rigs;
}

function normalizeLipSync(rawCue) {
  const frameRate = Number(rawCue?.mouthFrameRate);
  if (!(frameRate > 0)) throw new Error('lipsync_cues.json needs a positive mouthFrameRate');
  const entries = new Map();
  for (const entry of rawCue.entries || []) {
    if (!Array.isArray(entry.cells)) continue;
    entries.set(Number(entry.index), {
      ...entry,
      timelineStart: Number(entry.timelineStart),
      effectiveDuration: Number(entry.effectiveDuration),
      mouthFrameRate: frameRate,
    });
  }
  return entries;
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function wrapTextLines(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const character of text) {
    const candidate = line + character;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = character;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Bio-Armor Academy S1E1 — a living-manga (cel) sequence player.
 *
 * Deterministic limited-animation playback over 13 keyframes: cover-crop
 * motion presets, crossfade/cut plus a manga page-turn entrance, coverage-swept
 * blink rigs, and energy-gated Chinese viseme cels, all preloaded through
 * this.readyPromise for render.js.
 *
 * On top of the cel the scene draws the living-manga layer stack, in order:
 * converging speedlines, the bottom subtitle strip, onomatopoeia overlays,
 * and the chapter title card. Every overlay is a pure function of
 * absolute sequence time, so segmented re-renders stay identical.
 */
export class BioArmorCityScene extends SceneBase {
  constructor() {
    super('BioArmorCityScene');
    this.timeline = [];
    this.imageByFile = new Map();
    this.mouthRigs = new Map();
    this.eyeRigs = new Map();
    this.lipSyncByEntry = new Map();
    this.subtitles = [];
    this.sfxTexts = [];
    this.titleCard = null;
    this.sequenceCanvas = null;
    this.sequenceContext = null;
    this.sourceCanvas = null;
    this.sourceContext = null;
    this.sequenceTexture = null;
    this.sequenceDuration = 0;
    this.readyPromise = Promise.resolve();
  }

  build() {
    this.sequenceCanvas = document.createElement('canvas');
    this.sequenceCanvas.width = CANVAS_WIDTH;
    this.sequenceCanvas.height = CANVAS_HEIGHT;
    this.sequenceContext = this.sequenceCanvas.getContext('2d', { alpha: false });
    this.sequenceContext.imageSmoothingEnabled = true;
    this.sequenceContext.imageSmoothingQuality = 'high';
    this.sequenceContext.fillStyle = '#000000';
    this.sequenceContext.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.sourceCanvas = document.createElement('canvas');
    this.sourceContext = this.sourceCanvas.getContext('2d', { alpha: false });
    this.sourceContext.imageSmoothingEnabled = true;
    this.sourceContext.imageSmoothingQuality = 'high';

    this.sequenceTexture = new THREE.CanvasTexture(this.sequenceCanvas);
    this.sequenceTexture.name = 'BioArmorGymSequenceTexture';
    this.sequenceTexture.colorSpace = THREE.SRGBColorSpace;
    this.sequenceTexture.minFilter = THREE.LinearFilter;
    this.sequenceTexture.magFilter = THREE.LinearFilter;
    this.sequenceTexture.generateMipmaps = false;
    this.scene.background = this.sequenceTexture;

    const fetchText = (url) => fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Unable to load ${url} (${response.status})`);
      return response.text();
    });
    const fetchJson = (url) => fetch(url).then((response) => {
      if (!response.ok) throw new Error(`Unable to load ${url} (${response.status})`);
      return response.json();
    });

    // Eye rigs are optional: a 404 just means "no blink variants generated yet".
    const fetchOptionalJson = (url) => fetch(url).then((response) => {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Unable to load ${url} (${response.status})`);
      return response.json();
    });

    const loader = new THREE.ImageLoader();
    this.readyPromise = Promise.all([
      fetchText(STORY_URL).then(parseStory),
      fetchJson(TIMELINE_URL),
      fetchJson(LIPSYNC_URL),
      fetchJson(MOUTH_RIG_URL),
      fetchOptionalJson(EYE_RIG_URL),
    ]).then(async ([story, rawTimeline, rawLipSync, rawMouthRigs, rawEyeRigs]) => {
      this.subtitles = story.subtitles;
      const normalized = normalizeTimeline(rawTimeline, story.duration);
      this.timeline = normalized.frames;
      this.sequenceDuration = normalized.duration;
      this.sfxTexts = normalized.sfxTexts;
      this.titleCard = normalized.titleCard;
      this.lipSyncByEntry = normalizeLipSync(rawLipSync);
      this.mouthRigs = normalizeMouthRigs(rawMouthRigs);
      this.eyeRigs = normalizeEyeRigs(rawEyeRigs);

      for (const frame of this.timeline) {
        if (frame.mouthRig && !this.mouthRigs.has(frame.mouthRig)) {
          throw new Error(`Timeline shot ${frame.shot} references unknown mouth rig ${frame.mouthRig}`);
        }
        if (frame.eyeRig && !this.eyeRigs.has(frame.eyeRig)) {
          throw new Error(`Timeline shot ${frame.shot} references unknown eye rig ${frame.eyeRig}`);
        }
      }

      const files = new Set(this.timeline.map((frame) => frame.file));
      for (const rig of this.mouthRigs.values()) {
        if (rig.mode === 'image') Object.values(rig.variants).forEach((file) => files.add(file));
      }
      for (const rig of this.eyeRigs.values()) files.add(rig.closed);
      const orderedFiles = [...files];
      const images = await Promise.all(
        orderedFiles.map((file) => loader.loadAsync(`${ASSET_ROOT}${file}`))
      );
      this.imageByFile = new Map(orderedFiles.map((file, index) => [file, images[index]]));
      this._drawAtTime(0);
      return this.scene;
    });

    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);
    this._drawAtTime(time);
  }

  _drawAtTime(absoluteTime) {
    if (
      !this.sequenceContext
      || !this.sequenceTexture
      || this.timeline.length === 0
      || this.imageByFile.size === 0
      || !(this.sequenceDuration > 0)
    ) return;

    const sequenceTime = clamp(
      Number.isFinite(absoluteTime) ? absoluteTime : 0,
      0,
      this.sequenceDuration
    );
    let frameIndex = this.timeline.length - 1;
    for (let index = 0; index < this.timeline.length - 1; index += 1) {
      if (sequenceTime < this.timeline[index + 1].at) {
        frameIndex = index;
        break;
      }
    }

    const frame = this.timeline[frameIndex];
    const nextFrame = this.timeline[frameIndex + 1] || null;
    const frameEnd = nextFrame ? nextFrame.at : this.sequenceDuration;
    const frameDuration = Math.max(0.001, frameEnd - frame.at);
    const frameProgress = smoothstep01((sequenceTime - frame.at) / frameDuration);
    const motion = this._sampleMotion(frame, frameProgress, sequenceTime);

    // Impact fx: a short invert+contrast flash with two-axis shake, applied
    // only to the cel so the ink overlays on top keep their colors.
    const fxLocal = frame.fx ? sequenceTime - frame.at - frame.fx.at : -1;
    const fxActive = frame.fx && frame.fx.type === 'impact' && fxLocal >= 0 && fxLocal < frame.fx.duration;
    if (fxActive) {
      const tick = Math.floor(sequenceTime * 60);
      motion.jitterX += (hash01(tick * 7 + 1) - 0.5) * 12;
      motion.jitterY += (hash01(tick * 7 + 2) - 0.5) * 12;
    }

    const ctx = this.sequenceContext;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const shotSource = this._renderShotSource(frame, sequenceTime);
    const pageProgress = frame.transition === 'page' && frame.transitionSeconds > 0
      ? (sequenceTime - frame.at) / frame.transitionSeconds
      : Infinity;
    if (pageProgress < 1) {
      // Page-turn entrance: the cel is revealed from the right as the blank
      // paper page flips leftward (frame_00 only).
      this._drawPaperBack();
      ctx.save();
      this._clipPageReveal(pageProgress);
      if (fxActive) ctx.filter = 'invert(1) contrast(1.5)';
      this._drawImageCover(shotSource, motion, 1);
      ctx.restore();
      this._drawPageEdgeShadow(pageProgress);
    } else {
      if (fxActive) ctx.filter = 'invert(1) contrast(1.5)';
      this._drawImageCover(shotSource, motion, 1);
      ctx.filter = 'none';
    }

    if (nextFrame && frame.transition === 'crossfade' && frame.transitionSeconds > 0) {
      const transitionDuration = Math.min(frame.transitionSeconds, frameDuration * 0.45);
      const transitionStart = frameEnd - transitionDuration;
      const blend = smoothstep01((sequenceTime - transitionStart) / transitionDuration);
      if (blend > 0) {
        this._drawImageCover(
          this._renderShotSource(nextFrame, sequenceTime),
          this._sampleMotion(nextFrame, 0, sequenceTime),
          blend
        );
      }
    }

    if (frame.speedlines) this._drawSpeedlines(frame.speedlines, sequenceTime);
    this._drawSubtitle(sequenceTime);
    this._drawSfxTexts(sequenceTime);
    this._drawTitleCard(sequenceTime);
    ctx.restore();
    this.sequenceTexture.needsUpdate = true;
  }

  _renderShotSource(frame, sequenceTime) {
    const base = this.imageByFile.get(frame.file);
    if (!base) return null;
    const width = base.naturalWidth || base.width;
    const height = base.naturalHeight || base.height;
    if (this.sourceCanvas.width !== width || this.sourceCanvas.height !== height) {
      this.sourceCanvas.width = width;
      this.sourceCanvas.height = height;
      this.sourceContext.imageSmoothingEnabled = true;
      this.sourceContext.imageSmoothingQuality = 'high';
    }
    const ctx = this.sourceContext;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(base, 0, 0, width, height);

    if (frame.mouthRig) {
      const rig = this.mouthRigs.get(frame.mouthRig);
      const state = this._mouthStateAt(rig.entry, sequenceTime);
      if (rig.mode === 'procedural') {
        this._drawProceduralMouth(rig, state);
      } else {
        const variant = this.imageByFile.get(rig.variants[state]);
        if (variant) {
          const [x, y, patchWidth, patchHeight] = rig.rect;
          ctx.drawImage(
            variant,
            x,
            y,
            patchWidth,
            patchHeight,
            x,
            y,
            patchWidth,
            patchHeight
          );
        }
      }
    }

    if (frame.eyeRig) {
      const rig = this.eyeRigs.get(frame.eyeRig);
      const coverage = rig ? this._blinkCoverageAt(rig, sequenceTime - frame.at) : 0;
      if (rig && coverage > 0) {
        const variant = this.imageByFile.get(rig.closed);
        if (variant) {
          const [x, y, patchWidth, patchHeight] = rig.rect;
          // Paste only the top `coverage` fraction of the closed-lid rect: on
          // the way down the lid line sweeps over the eyes, on the way up it
          // lifts again — a cheap half-lid transition instead of a hard cut
          // between fully open and fully closed.
          const coveredHeight = Math.max(1, Math.round(patchHeight * coverage));
          ctx.drawImage(
            variant,
            x,
            y,
            patchWidth,
            coveredHeight,
            x,
            y,
            patchWidth,
            coveredHeight
          );
        }
      }
    }

    return this.sourceCanvas;
  }

  // Deterministic blink schedule per rig, anchored to the shot start so every
  // blink-rigged shot is guaranteed a lid closure: first blink 0.7–1.3s into
  // the shot, then one every interval[0]..interval[1] seconds. Returns lid
  // coverage 0..1: a 0.16s blink with ~0.05s close/open sweeps so the lids
  // ease through a half-closed pose instead of snapping shut.
  _blinkCoverageAt(rig, shotLocalTime) {
    const offset = lerp(0.7, 1.3, rig.seed);
    if (shotLocalTime < offset) return 0;
    const period = lerp(rig.interval[0], rig.interval[1], rig.seed);
    const phase = (shotLocalTime - offset) % period;
    const blinkSeconds = 0.16;
    const sweepSeconds = 0.05;
    if (phase >= blinkSeconds) return 0;
    if (phase < sweepSeconds) return phase / sweepSeconds;
    if (phase > blinkSeconds - sweepSeconds) return (blinkSeconds - phase) / sweepSeconds;
    return 1;
  }

  _mouthStateAt(entryIndex, sequenceTime) {
    const cue = this.lipSyncByEntry.get(Number(entryIndex));
    if (!cue) return 'closed';
    const localTime = sequenceTime - cue.timelineStart;
    if (localTime < 0 || localTime >= cue.effectiveDuration) return 'closed';
    const cell = Math.floor(localTime * cue.mouthFrameRate);
    const state = cue.cells[clamp(cell, 0, cue.cells.length - 1)];
    return state === 'open' || state === 'half' ? state : 'closed';
  }

  _drawProceduralMouth(rig, state) {
    if (state === 'closed') return;
    const ctx = this.sourceContext;
    const [x, y] = rig.anchor;
    const [width, height] = rig.size;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (state === 'half') {
      ctx.strokeStyle = '#351b1e';
      ctx.lineWidth = Math.max(1.2, height * 0.24);
      ctx.beginPath();
      ctx.moveTo(x - width * 0.5, y);
      ctx.quadraticCurveTo(x, y + height * 0.42, x + width * 0.5, y);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#32171b';
      ctx.beginPath();
      ctx.ellipse(x, y + height * 0.06, width * 0.52, height * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d77b82';
      ctx.beginPath();
      ctx.ellipse(x, y + height * 0.23, width * 0.34, height * 0.18, 0, 0, Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }

  _sampleMotion(frame, progress, sequenceTime) {
    const preset = MOTION_PRESETS[frame.move] || MOTION_PRESETS.static;
    const dialogueBreath = frame.mouthRig ? Math.sin(sequenceTime * Math.PI * 0.72) * 0.0018 : 0;
    // Shiver: tiny high-frequency crop jitter for the startled close-up. Two
    // incommensurate sines keep it from looking like a metronome.
    const jitterX = frame.shiver
      ? Math.sin(sequenceTime * 47) * 1.1 + Math.sin(sequenceTime * 23.7) * 0.7
      : 0;
    const jitterY = frame.shiver
      ? Math.sin(sequenceTime * 41.3 + 1.7) * 0.9
      : 0;
    return {
      zoom: lerp(preset.zoom[0], preset.zoom[1], progress) + dialogueBreath,
      panX: lerp(preset.panX[0], preset.panX[1], progress),
      panY: lerp(preset.panY[0], preset.panY[1], progress),
      jitterX,
      jitterY,
    };
  }

  // The cover-crop source rect for a given image+motion sample.
  _computeView(image, motion) {
    if (!image) return null;
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) return null;

    const targetAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    const sourceAspect = sourceWidth / sourceHeight;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    if (sourceAspect > targetAspect) cropWidth = sourceHeight * targetAspect;
    else if (sourceAspect < targetAspect) cropHeight = sourceWidth / targetAspect;

    cropWidth /= motion.zoom;
    cropHeight /= motion.zoom;
    const horizontalSlack = Math.max(0, sourceWidth - cropWidth);
    const verticalSlack = Math.max(0, sourceHeight - cropHeight);
    const sourceX = clamp(
      horizontalSlack * (0.5 + clamp(motion.panX, -1, 1) * 0.5) + (motion.jitterX || 0),
      0,
      horizontalSlack
    );
    const sourceY = clamp(
      verticalSlack * (0.5 + clamp(motion.panY, -1, 1) * 0.5) + (motion.jitterY || 0),
      0,
      verticalSlack
    );
    return { sourceX, sourceY, cropWidth, cropHeight, sourceWidth, sourceHeight };
  }

  _drawImageCover(image, motion, alpha) {
    if (!image) return;
    const view = this._computeView(image, motion);
    if (!view) return;

    this.sequenceContext.globalAlpha = alpha;
    this.sequenceContext.drawImage(
      image,
      view.sourceX,
      view.sourceY,
      view.cropWidth,
      view.cropHeight,
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );
  }

  // ---------------------------------------------------------------- overlays

  // Paper back for the page-turn entrance: flat paper tone with a soft
  // vertical shade toward the bottom, like a blank manga page.
  _drawPaperBack() {
    const ctx = this.sequenceContext;
    ctx.fillStyle = MANGA.paper;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, 'rgba(216, 207, 190, 0)');
    gradient.addColorStop(1, 'rgba(216, 207, 190, 0.55)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Clip region of the already-revealed cel: everything right of the curved
  // page boundary. progress 0..1 sweeps the boundary from the right edge to
  // the left; the curl bulge peaks mid-flip for a turned-page feel.
  _clipPageReveal(progress) {
    const p = smoothstep01(progress);
    const boundaryX = CANVAS_WIDTH * (1 - p);
    const curl = 110 * Math.sin(p * Math.PI);
    const ctx = this.sequenceContext;
    ctx.beginPath();
    ctx.moveTo(boundaryX - curl * 0.3, 0);
    ctx.bezierCurveTo(
      boundaryX + curl,
      CANVAS_HEIGHT * 0.35,
      boundaryX - curl,
      CANVAS_HEIGHT * 0.65,
      boundaryX + curl * 0.3,
      CANVAS_HEIGHT
    );
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, 0);
    ctx.closePath();
    ctx.clip();
  }

  // Soft cast shadow hugging the page boundary on the paper side.
  _drawPageEdgeShadow(progress) {
    const p = smoothstep01(progress);
    const boundaryX = CANVAS_WIDTH * (1 - p);
    const curl = 110 * Math.sin(p * Math.PI);
    const width = 90 + curl * 0.4;
    const ctx = this.sequenceContext;
    const gradient = ctx.createLinearGradient(boundaryX - width, 0, boundaryX, 0);
    gradient.addColorStop(0, 'rgba(40, 32, 24, 0)');
    gradient.addColorStop(1, 'rgba(40, 32, 24, 0.28)');
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(0, boundaryX - width), 0, width, CANVAS_HEIGHT);
    ctx.clip();
    ctx.fillStyle = gradient;
    ctx.fillRect(Math.max(0, boundaryX - width), 0, width, CANVAS_HEIGHT);
    ctx.restore();
  }

  // Concentration lines: black strokes radiating from the canvas edges toward
  // the normalized focus point, screen-space so the crop move never bends
  // them. Line length/alpha come from hash01(line index); a 0.3s loop adds a
  // slight radial breathing. All deterministic.
  _drawSpeedlines(config, sequenceTime) {
    const ctx = this.sequenceContext;
    const focusX = config.cx * CANVAS_WIDTH;
    const focusY = config.cy * CANVAS_HEIGHT;
    const flowPhase = (sequenceTime / 0.3) * Math.PI * 2;
    ctx.save();
    ctx.lineCap = 'round';
    for (let index = 0; index < config.density; index += 1) {
      const seed = index * 13.7 + 3;
      const edge = index % 4;
      const along = hash01(seed);
      let edgeX;
      let edgeY;
      if (edge === 0) { edgeX = along * CANVAS_WIDTH; edgeY = 0; }
      else if (edge === 1) { edgeX = along * CANVAS_WIDTH; edgeY = CANVAS_HEIGHT; }
      else if (edge === 2) { edgeX = 0; edgeY = along * CANVAS_HEIGHT; }
      else { edgeX = CANVAS_WIDTH; edgeY = along * CANVAS_HEIGHT; }

      const dirX = focusX - edgeX;
      const dirY = focusY - edgeY;
      const distance = Math.hypot(dirX, dirY);
      if (distance < 1) continue;
      const unitX = dirX / distance;
      const unitY = dirY / distance;

      const flow = Math.sin(flowPhase + hash01(seed + 2) * Math.PI * 2);
      const startOffset = distance * 0.03 * flow;
      const lineLength = lerp(0.12, 0.3, hash01(seed + 1)) * distance * (1 + 0.12 * flow);
      const alpha = lerp(0.18, 0.55, hash01(seed + 3));
      ctx.strokeStyle = `rgba(17, 17, 17, ${alpha})`;
      ctx.lineWidth = lerp(1, 2.6, hash01(seed + 4));
      ctx.beginPath();
      ctx.moveTo(edgeX + unitX * startOffset, edgeY + unitY * startOffset);
      ctx.lineTo(
        edgeX + unitX * (startOffset + lineLength),
        edgeY + unitY * (startOffset + lineLength)
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  // Bottom subtitle strip, replacing the speech bubbles / narrator caption
  // boxes: a rounded dark translucent bar with stroked white text, centered
  // near the bottom edge. Dialogue lines get a `雷晓:` / `白岚:` speaker
  // prefix; Narrator lines have no prefix and use italic warm-paper text.
  _drawSubtitle(sequenceTime) {
    const subtitle = this.subtitles.find(
      (item) => sequenceTime >= item.start && sequenceTime <= item.end
    );
    if (!subtitle) return;

    const fadeIn = clamp((sequenceTime - subtitle.start) / SUBTITLE_FADE_SECONDS, 0, 1);
    const fadeOut = clamp((subtitle.end - sequenceTime) / SUBTITLE_FADE_SECONDS, 0, 1);
    const opacity = Math.min(fadeIn, fadeOut);
    if (opacity <= 0) return;

    const isNarrator = subtitle.speaker === 'Narrator';
    const label = SPEAKER_LABELS[subtitle.speaker] || subtitle.speaker;
    const text = isNarrator ? subtitle.text : `${label}: ${subtitle.text}`;

    const ctx = this.sequenceContext;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `${isNarrator ? 'italic ' : ''}600 ${SUBTITLE_FONT_SIZE}px ${BUBBLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = wrapTextLines(ctx, text, SUBTITLE_MAX_TEXT_WIDTH);
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
    const boxWidth = Math.min(CANVAS_WIDTH - 120, widest + 70);
    const boxHeight = lines.length * SUBTITLE_LINE_HEIGHT + 34;
    const boxX = (CANVAS_WIDTH - boxWidth) / 2;
    const boxY = CANVAS_HEIGHT - boxHeight - 48;
    roundedRectPath(ctx, boxX, boxY, boxWidth, boxHeight, 20);
    ctx.fillStyle = 'rgba(8, 13, 22, 0.62)';
    ctx.fill();

    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 8;
    ctx.fillStyle = isNarrator ? MANGA.paper : '#FFFFFF';
    const firstLineY = boxY + boxHeight / 2 - ((lines.length - 1) * SUBTITLE_LINE_HEIGHT) / 2;
    lines.forEach((line, index) => {
      const y = firstLineY + index * SUBTITLE_LINE_HEIGHT;
      ctx.strokeText(line, CANVAS_WIDTH / 2, y);
      ctx.fillText(line, CANVAS_WIDTH / 2, y);
    });
    ctx.restore();
  }

  // Onomatopoeia overlays: big hand-drawn-burst characters with a heavy ink
  // outline and a white outer glow. 0.1s pop-in plus a deterministic
  // ±1.5px per-frame tremor seeded from the text hash, so segmented renders
  // stay identical.
  _drawSfxTexts(sequenceTime) {
    if (this.sfxTexts.length === 0) return;
    const ctx = this.sequenceContext;
    for (const sfx of this.sfxTexts) {
      if (sequenceTime < sfx.from || sequenceTime > sfx.to) continue;
      const popIn = clamp((sequenceTime - sfx.from) / SFX_POP_SECONDS, 0, 1);
      const fadeOut = clamp((sfx.to - sequenceTime) / 0.15, 0, 1);
      const opacity = Math.min(popIn, fadeOut);
      if (opacity <= 0) continue;
      const scale = 0.6 + 0.4 * easeOutBack(popIn);

      // Deterministic tremor: quantized per render frame, seeded by the text.
      const tick = Math.floor(sequenceTime * 30);
      const jitterX = (hash01(sfx.seed + tick * 1.7) - 0.5) * 3;
      const jitterY = (hash01(sfx.seed * 3 + tick * 2.3 + 11) - 0.5) * 3;

      const x = sfx.x * CANVAS_WIDTH + jitterX;
      const y = sfx.y * CANVAS_HEIGHT + jitterY;
      // The teal hum reads quieter than the red impact crash.
      const fontSize = sfx.style === 'teal' ? 84 : 120;
      const fill = sfx.style === 'teal' ? MANGA.sfxTeal : MANGA.sfxRed;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.font = `900 ${fontSize}px ${BUBBLE_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = MANGA.ink;
      ctx.lineWidth = 6;
      ctx.strokeText(sfx.text, 0, 0);
      ctx.shadowBlur = 0;
      ctx.fillStyle = fill;
      ctx.fillText(sfx.text, 0, 0);
      ctx.restore();
    }
  }

  // Chapter title card: large black-ink title with a white outline over the
  // keyframe, smaller subtitle below, fading in and out.
  _drawTitleCard(sequenceTime) {
    const card = this.titleCard;
    if (!card) return;
    if (sequenceTime < card.from || sequenceTime > card.to) return;
    const fadeIn = clamp((sequenceTime - card.from) / TITLE_FADE_SECONDS, 0, 1);
    const fadeOut = clamp((card.to - sequenceTime) / TITLE_FADE_SECONDS, 0, 1);
    const opacity = Math.min(fadeIn, fadeOut);
    if (opacity <= 0) return;

    const ctx = this.sequenceContext;
    const x = card.x * CANVAS_WIDTH;
    const y = card.y * CANVAS_HEIGHT;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    ctx.font = `900 96px ${BUBBLE_FONT}`;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 10;
    ctx.strokeText(card.text, x, y);
    ctx.fillStyle = MANGA.ink;
    ctx.fillText(card.text, x, y);

    if (card.sub) {
      ctx.font = `bold 44px ${BUBBLE_FONT}`;
      ctx.lineWidth = 6;
      ctx.strokeText(card.sub, x, y + 78);
      ctx.fillText(card.sub, x, y + 78);
    }
    ctx.restore();
  }
}
