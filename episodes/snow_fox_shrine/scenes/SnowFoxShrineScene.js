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

const SPEAKER_LABELS = {
  Tsumugi: '小紬',
  Fox: '小狐',
};

// "Yukie" (snow woodblock-print) post layers. Per STYLE_BIBLE.md every
// procedural layer is drawn as razor-clean flat vector shapes in source-image
// space (so the crop move carries them): zero grain, zero noise, no gradients,
// no blur. Colors come straight from the style palette.
const YUKIE = {
  snowWhite: '#F4F7FC',
  snowShadow: '#93A4CC', // periwinkle snow shadow, never grey
  lanternAmber: '#F2B45A', // lantern light is a shape, never a glow
  steamWhite: '#F4F7FC',
  nightIndigo: '#232F52',
};

function hash01(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
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
  // Walk shots: constant zoom (no per-cel scale pulsation) with a continuous
  // crop pan across the whole motionGroup span. The world slides screen-left
  // so the right-walking girl reads as actually going somewhere.
  walk_follow: { zoom: [1.1, 1.1], panX: [-0.5, 0.5], panY: [0.06, 0.06] },
  // Walk-away shot: single static cel, slow zoom-out so the girl recedes
  // toward the storefront. Replaces A/B leg-swap cels (repaint drift between
  // full-image cels made the calves/hips flicker; see generation_prompts.md
  // frame_06_walk_contact_* notes).
  walk_away: { zoom: [1.14, 1.045], panX: [0, 0], panY: [0.1, -0.04] },
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
    throw new Error('SnowFoxShrineScene could not read a positive duration from script.story');
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

function normalizeTimeline(rawTimeline, storyDuration) {
  if (!rawTimeline || !Array.isArray(rawTimeline.frames) || rawTimeline.frames.length === 0) {
    throw new Error('keyframe_timeline.json must contain a non-empty frames array');
  }
  // The store ambience and the closing cicada fade run past the last subtitle
  // cue, so the timeline may declare a duration longer than the story's last
  // cue end; the declared duration is the authoritative sequence length.
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
    return {
      at,
      file: normalizeAssetPath(frame.file),
      shot: frame.shot || `shot_${index}`,
      move: frame.move || 'static',
      mouthRig: frame.mouthRig || null,
      eyeRig: frame.eyeRig || null,
      // Walk-cycle cuts reuse one blink rig across several sub-frames; this
      // carries the shot-clock forward so the scheduler can still fire.
      blinkCarry: Number(frame.blinkCarry) || 0,
      // Walk-cycle sub-cuts sharing one motionGroup sample their crop motion
      // over the whole group span instead of restarting per cel.
      motionGroup: typeof frame.motionGroup === 'string' && frame.motionGroup
        ? frame.motionGroup
        : null,
      snowfall: normalizeSnowfall(frame.snowfall),
      breathFog: normalizeBreathFog(frame.breathFog),
      steam: normalizeSteam(frame.steam),
      lanternFlicker: normalizeLanternFlicker(frame.lanternFlicker),
      // Shiver: tiny high-frequency crop jitter for the cold-fox shots.
      shiver: frame.shiver === true,
      transition: frame.transition === 'crossfade' ? 'crossfade' : 'cut',
      transitionSeconds: clamp(Number(frame.transitionSeconds) || 0, 0, 0.25),
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
  return { frames, duration: declaredDuration };
}

// snowfall: { "layers": [ { "count": n, "speed": pxPerSec, "size": [min, max],
// "alpha": 0..1 }, ... ], "drift": px } — flat snowflake dots falling through
// the source image, wrapping vertically, with a gentle sinusoidal wind sway.
// Positions/phase are hash-seeded per flake, so renders are deterministic.
function normalizeSnowfall(raw) {
  if (!raw) return null;
  const layers = raw.layers;
  if (!Array.isArray(layers) || layers.length === 0) {
    throw new Error('snowfall config needs a non-empty layers array');
  }
  for (const layer of layers) {
    const count = Number(layer.count);
    const speed = Number(layer.speed);
    const size = layer.size;
    if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(speed) || speed <= 0) {
      throw new Error(`Invalid snowfall layer: ${JSON.stringify(layer)}`);
    }
    if (
      !Array.isArray(size) || size.length !== 2
      || size.some((v) => !Number.isFinite(Number(v)) || Number(v) <= 0)
    ) {
      throw new Error(`Invalid snowfall layer size: ${JSON.stringify(layer)}`);
    }
  }
  const drift = Number.isFinite(Number(raw.drift)) ? Number(raw.drift) : 14;
  return {
    layers: layers.map((layer) => ({
      count: Math.round(Number(layer.count)),
      speed: Number(layer.speed),
      size: layer.size.map(Number),
      alpha: clamp(Number(layer.alpha) || 0.8, 0.05, 1),
    })),
    drift,
  };
}

// breathFog: { "emitters": [[x, y], ...], "period": [min, max] } — slow flat
// white puffs from the girl's mouth in the cold air. Like steam but wider,
// slower, more horizontal drift, and a longer life.
function normalizeBreathFog(raw) {
  if (!raw) return null;
  const emitters = raw.emitters;
  if (!Array.isArray(emitters) || emitters.length === 0) {
    throw new Error('breathFog config needs a non-empty emitters array');
  }
  for (const emitter of emitters) {
    if (!Array.isArray(emitter) || emitter.length !== 2 || emitter.some((v) => !Number.isFinite(Number(v)))) {
      throw new Error(`Invalid breathFog emitter: ${JSON.stringify(emitter)}`);
    }
  }
  const period = Array.isArray(raw.period) ? raw.period.map(Number) : [3.6, 5.2];
  if (period.length !== 2 || period.some((v) => !(v > 0))) {
    throw new Error('breathFog period must be two positive numbers');
  }
  return { emitters: emitters.map((e) => e.map(Number)), period };
}

// steam: { "emitters": [[x, y], ...], "riseTo": y, "period": [min, max] } —
// flat soft-edged wisps rising from the roasted sweet potato. Same emitter
// shape as the reference episode's drips config.
function normalizeSteam(raw) {
  if (!raw) return null;
  const emitters = raw.emitters;
  if (!Array.isArray(emitters) || emitters.length === 0) {
    throw new Error('steam config needs a non-empty emitters array');
  }
  for (const emitter of emitters) {
    if (!Array.isArray(emitter) || emitter.length !== 2 || emitter.some((v) => !Number.isFinite(Number(v)))) {
      throw new Error(`Invalid steam emitter: ${JSON.stringify(emitter)}`);
    }
  }
  const riseTo = Number(raw.riseTo);
  if (!Number.isFinite(riseTo)) throw new Error('steam config needs a numeric riseTo');
  const period = Array.isArray(raw.period) ? raw.period.map(Number) : [2.2, 3.4];
  if (period.length !== 2 || period.some((v) => !(v > 0))) {
    throw new Error('steam period must be two positive numbers');
  }
  return { emitters: emitters.map((e) => e.map(Number)), riseTo, period };
}

// lanternFlicker: { "glows": [[cx, cy, rx, ry], ...], "period": [min, max],
// "alpha": 0.22 } — flat amber ellipses over the lantern light shapes in the
// artwork, with a slow alpha/size breathing. The light stays a hard-edged
// flat shape; only its strength moves.
function normalizeLanternFlicker(raw) {
  if (!raw) return null;
  const glows = raw.glows;
  if (!Array.isArray(glows) || glows.length === 0) {
    throw new Error('lanternFlicker config needs a non-empty glows array');
  }
  for (const glow of glows) {
    if (
      !Array.isArray(glow) || glow.length !== 4
      || glow.some((v) => !Number.isFinite(Number(v)))
      || Number(glow[2]) <= 0 || Number(glow[3]) <= 0
    ) {
      throw new Error(`Invalid lanternFlicker glow: ${JSON.stringify(glow)}`);
    }
  }
  const period = Array.isArray(raw.period) ? raw.period.map(Number) : [1.8, 2.6];
  if (period.length !== 2 || period.some((v) => !(v > 0))) {
    throw new Error('lanternFlicker period must be two positive numbers');
  }
  const alpha = clamp(Number(raw.alpha) || 0.22, 0.05, 0.6);
  return { glows: glows.map((g) => g.map(Number)), period, alpha };
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
      // Hash the whole rig id so every shot blinks on its own schedule;
      // the old length+first-char seed made all girl rigs identical.
      seed: hash01([...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 100003, 7)),
    });
  }
  return rigs;
}

function normalizeMouthRigs(rawRigs) {
  const rigs = new Map();
  for (const [id, source] of Object.entries(rawRigs?.rigs || {})) {
    // entry may be a single SRT index or an array (several consecutive lines
    // share one speaker plate, e.g. frame_12's two bell lines).
    const rawEntry = Array.isArray(source.entry) ? source.entry : [source.entry];
    const entries = rawEntry.map(Number);
    if (!entries.length || entries.some((e) => !Number.isInteger(e))) {
      throw new Error(`Mouth rig ${id} needs an integer entry (or integer array)`);
    }
    if (source.mode === 'procedural') {
      const anchor = source.anchor?.map(Number);
      const size = source.size?.map(Number);
      if (!anchor || anchor.length !== 2 || !size || size.length !== 2) {
        throw new Error(`Procedural mouth rig ${id} needs anchor and size pairs`);
      }
      rigs.set(id, { id, entry: entries, mode: 'procedural', anchor, size });
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
    rigs.set(id, { id, entry: entries, mode: 'image', rect, variants });
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

/**
 * Deterministic limited-animation playback with Chinese syllable viseme cels,
 * in the "yukie" snow woodblock-print style (see STYLE_BIBLE.md).
 *
 * The full image is kept stable for a dialogue shot. Only a small mouth
 * rectangle is taken from the closed/half/open variants, so generative drift
 * outside the lips never reaches the movie. Mouth state comes from the final
 * post-trim dialogue stem gates silence and jaw energy at 12 fps.
 *
 * Source keyframes are roughly 16:9 (1672x940 class); the cover-crop in
 * _drawImageCover fits them to the 1920x1080 presentation canvas.
 *
 * All ambient motion (snowfall, breath fog, sweet-potato steam, lantern
 * flicker) is procedural flat-shape drawing in source-image space, so the 2D
 * crop move carries every layer and re-renders stay deterministic. The cold
 * fox shots add a tiny high-frequency crop jitter (shiver).
 */
export class SnowFoxShrineScene extends SceneBase {
  constructor() {
    super('SnowFoxShrineScene');
    this.timeline = [];
    this.imageByFile = new Map();
    this.mouthRigs = new Map();
    this.eyeRigs = new Map();
    this.lipSyncByEntry = new Map();
    this.subtitles = [];
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
    this.sequenceTexture.name = 'SnowFoxShrineSequenceTexture';
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
    let frameProgress = smoothstep01((sequenceTime - frame.at) / frameDuration);
    if (frame.motionGroup) {
      // Walk-cycle sub-cuts: sample the crop motion over the whole group span
      // so the pan sweeps continuously instead of restarting at every cel.
      let groupStart = frameIndex;
      let groupEnd = frameIndex;
      while (groupStart > 0 && this.timeline[groupStart - 1].motionGroup === frame.motionGroup) {
        groupStart -= 1;
      }
      while (
        groupEnd < this.timeline.length - 1
        && this.timeline[groupEnd + 1].motionGroup === frame.motionGroup
      ) {
        groupEnd += 1;
      }
      const groupAt = this.timeline[groupStart].at;
      const groupEndAt = groupEnd + 1 < this.timeline.length
        ? this.timeline[groupEnd + 1].at
        : this.sequenceDuration;
      frameProgress = smoothstep01((sequenceTime - groupAt) / Math.max(0.001, groupEndAt - groupAt));
    }
    const motion = this._sampleMotion(frame, frameProgress, sequenceTime);

    const ctx = this.sequenceContext;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this._drawImageCover(this._renderShotSource(frame, sequenceTime), motion, 1);

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

    this._drawSubtitle(sequenceTime);
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
      const coverage = rig
        ? this._blinkCoverageAt(rig, sequenceTime - frame.at + frame.blinkCarry)
        : 0;
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

    // Yukie ambient layers, drawn in source-image space so the crop move
    // carries them. Order matters: snowfall behind breath fog/steam, lantern
    // flicker last.
    if (frame.snowfall) this._drawSnowfall(frame.snowfall, sequenceTime, width, height);
    if (frame.breathFog) this._drawBreathFog(frame.breathFog, sequenceTime);
    if (frame.steam) this._drawSteam(frame.steam, sequenceTime);
    if (frame.lanternFlicker) this._drawLanternFlicker(frame.lanternFlicker, sequenceTime);
    return this.sourceCanvas;
  }

  // Deterministic blink schedule per rig, anchored to the shot start so every
  // blink-rigged shot is guaranteed a lid closure: first blink 0.7–1.3s into
  // the shot, then one every interval[0]..interval[1] seconds. shotLocalTime
  // is seconds since the current timeline frame started, plus the optional
  // blinkCarry that keeps walk-cycle sub-cuts on one continuous shot clock.
  // Returns lid coverage 0..1: a 0.16s blink with ~0.05s close/open sweeps so
  // the lids ease through a half-closed pose instead of snapping shut.
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

  // Falling snow: per-layer flat dots, hash-seeded lanes wrapping vertically,
  // with a slow sinusoidal wind sway. Pure function of absolute time, so
  // re-renders and crossfades are deterministic.
  _drawSnowfall(config, sequenceTime, sourceWidth, sourceHeight) {
    const ctx = this.sourceContext;
    ctx.save();
    ctx.fillStyle = YUKIE.snowWhite;
    const margin = 30;
    const span = sourceHeight + margin * 2;
    for (let layerIndex = 0; layerIndex < config.layers.length; layerIndex += 1) {
      const layer = config.layers[layerIndex];
      ctx.globalAlpha = layer.alpha;
      for (let index = 0; index < layer.count; index += 1) {
        const laneSeed = hash01(index * 131 + layerIndex * 1013 + 7);
        const fallSeed = hash01(index * 197 + layerIndex * 733 + 29);
        const swaySeed = hash01(index * 89 + layerIndex * 389 + 3);
        const x0 = laneSeed * sourceWidth;
        const speed = layer.speed * (0.75 + fallSeed * 0.5);
        const y = ((fallSeed * span + sequenceTime * speed) % span) - margin;
        const x = x0
          + Math.sin(sequenceTime * (0.5 + swaySeed * 0.7) + swaySeed * Math.PI * 2)
            * config.drift * (0.5 + swaySeed);
        const radius = lerp(layer.size[0], layer.size[1], hash01(index * 53 + layerIndex * 61 + 17));
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Breath fog in cold air: a slow flat puff that swells, drifts up and
  // sideways, and dissolves. Longer period and lower alpha than steam, so it
  // reads as breath, not cooking steam.
  _drawBreathFog(config, sequenceTime) {
    const ctx = this.sourceContext;
    ctx.save();
    ctx.fillStyle = YUKIE.snowWhite;
    for (let index = 0; index < config.emitters.length; index += 1) {
      const [ex, ey] = config.emitters[index];
      const period = lerp(config.period[0], config.period[1], hash01(index * 17 + 3));
      const phase = ((sequenceTime + hash01(index * 29 + 7) * period) % period) / period;
      const ease = smoothstep01(phase);
      const y = ey - ease * 34;
      const x = ex + ease * 26 + Math.sin(phase * Math.PI * 2 + index * 1.7) * 4 * phase;
      const alpha = Math.sin(phase * Math.PI) * 0.26;
      if (alpha <= 0.02) continue;
      const w = 7 + phase * 20;
      const h = 5 + phase * 13;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.6;
      ctx.beginPath();
      ctx.ellipse(x + w * 0.55, y - h * 0.5, w * 0.62, h * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Steam wisps: each emitter loops rise -> fade as a pair of flat, rounded,
  // vertically stretched blobs. No blur, no gradient — alpha carries the
  // softness, staying inside the yukie flat-shape language.
  _drawSteam(config, sequenceTime) {
    const ctx = this.sourceContext;
    ctx.save();
    ctx.fillStyle = YUKIE.steamWhite;
    for (let index = 0; index < config.emitters.length; index += 1) {
      const [ex, ey] = config.emitters[index];
      const period = lerp(config.period[0], config.period[1], hash01(index * 17 + 3));
      const phase = ((sequenceTime + hash01(index * 29 + 7) * period) % period) / period;
      const rise = smoothstep01(phase);
      const y = lerp(ey, config.riseTo, rise);
      const x = ex + Math.sin(phase * Math.PI * 2 + index * 1.7) * 9 * phase;
      const alpha = Math.sin(phase * Math.PI) * 0.38;
      if (alpha <= 0.02) continue;
      const w = 9 + phase * 13;
      const h = 24 + phase * 30;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + w * 0.4, y - h * 0.7, w * 0.62, h * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Lantern glow: flat amber ellipses laid over the lantern light shapes in
  // the artwork. Slow per-glow breathing in alpha with a tiny size pulse —
  // the shape stays hard-edged; only its strength moves.
  _drawLanternFlicker(config, sequenceTime) {
    const ctx = this.sourceContext;
    ctx.save();
    ctx.fillStyle = YUKIE.lanternAmber;
    for (let index = 0; index < config.glows.length; index += 1) {
      const [cx, cy, rx, ry] = config.glows[index];
      const period = lerp(config.period[0], config.period[1], hash01(index * 13 + 5));
      const angle = (sequenceTime / period) * Math.PI * 2 + hash01(index * 7 + 3) * Math.PI * 2;
      const breathe = 0.72 + 0.28 * Math.sin(angle);
      const alpha = config.alpha * breathe;
      if (alpha <= 0.02) continue;
      const scale = 1 + 0.045 * Math.sin(angle + 0.9);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * scale, ry * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _mouthStateAt(entryOrEntries, sequenceTime) {
    const entries = Array.isArray(entryOrEntries) ? entryOrEntries : [entryOrEntries];
    for (const entryIndex of entries) {
      const cue = this.lipSyncByEntry.get(Number(entryIndex));
      if (!cue) continue;
      const localTime = sequenceTime - cue.timelineStart;
      if (localTime < 0 || localTime >= cue.effectiveDuration) continue;
      const cell = Math.floor(localTime * cue.mouthFrameRate);
      const state = cue.cells[clamp(cell, 0, cue.cells.length - 1)];
      return state === 'open' || state === 'half' ? state : 'closed';
    }
    return 'closed';
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
    // Shiver: tiny high-frequency crop jitter for the cold-fox shots. Two
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

  _drawImageCover(image, motion, alpha) {
    if (!image) return;
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) return;

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

    this.sequenceContext.globalAlpha = alpha;
    this.sequenceContext.drawImage(
      image,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );
  }

  _drawSubtitle(sequenceTime) {
    const subtitle = this.subtitles.find(
      (item) => sequenceTime >= item.start && sequenceTime <= item.end
    );
    if (!subtitle) return;

    const edgeFade = 0.12;
    const fadeIn = clamp((sequenceTime - subtitle.start) / edgeFade, 0, 1);
    const fadeOut = clamp((subtitle.end - sequenceTime) / edgeFade, 0, 1);
    const opacity = Math.min(fadeIn, fadeOut);
    const label = SPEAKER_LABELS[subtitle.speaker] || subtitle.speaker;
    const text = `${label}：${subtitle.text}`;
    const ctx = this.sequenceContext;
    const maxTextWidth = 1550;
    const fontSize = 50;
    const lineHeight = 66;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `600 ${fontSize}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = [];
    let line = '';
    for (const character of text) {
      const candidate = line + character;
      if (line && ctx.measureText(candidate).width > maxTextWidth) {
        lines.push(line);
        line = character;
      } else line = candidate;
    }
    if (line) lines.push(line);

    const widest = Math.max(...lines.map((item) => ctx.measureText(item).width));
    const boxWidth = Math.min(CANVAS_WIDTH - 120, widest + 70);
    const boxHeight = lines.length * lineHeight + 34;
    const boxX = (CANVAS_WIDTH - boxWidth) / 2;
    const boxY = CANVAS_HEIGHT - boxHeight - 48;
    roundedRectPath(ctx, boxX, boxY, boxWidth, boxHeight, 20);
    ctx.fillStyle = 'rgba(8, 13, 22, 0.62)';
    ctx.fill();

    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 8;
    ctx.fillStyle = '#ffffff';
    const firstLineY = boxY + boxHeight / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((item, index) => {
      const y = firstLineY + index * lineHeight;
      ctx.strokeText(item, CANVAS_WIDTH / 2, y);
      ctx.fillText(item, CANVAS_WIDTH / 2, y);
    });
    ctx.restore();
  }
}
