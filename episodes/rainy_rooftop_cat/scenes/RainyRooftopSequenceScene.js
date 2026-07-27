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
  Girl: '小蓝',
  // The inner monologue is the same girl's voice; Narrator is only a
  // voice-only pseudo-speaker used to satisfy the story-style linter.
  Narrator: '小蓝',
};

// Procedural rain overlay, drawn over the keyframes and under the subtitles.
// Every streak/ripple/splash is a pure function of (drop index, absolute time),
// so re-rendering the same frame always yields the identical image.
// Two parallax streak layers: a dense fine far layer and a sparse bright near
// layer. The near layer is what the eye tracks as "moving rain"; the baked-in
// rain on the keyframes is static, so the near layer must clearly out-contrast
// it or the whole shot reads as frozen.
const RAIN = {
  far: { count: 520, lengthPx: [14, 30], speedPx: [900, 1400], widthPx: 1.2, alpha: 0.3 },
  near: { count: 90, lengthPx: [34, 58], speedPx: [1800, 2500], widthPx: 2.3, alpha: 0.55 },
  slant: 0.28, // wind drift: dx per dy
  gustAmplitude: 0.07, // slow slant wobble so the rain direction breathes
  fullUntil: 19.5, // heavy rain until the sunbeam beat
  weakenUntil: 21.2, // ease down to the light drizzle
  lightIntensity: 0.25,
  endTime: 22.6, // the rainbow wide shot is rain-free
  rippleCount: 14,
  rippleZoneTop: 0.62, // ground puddle zone, as a canvas-height fraction
  rippleAlpha: 0.16,
  splashCount: 26, // impact crowns flickering in the puddle zone
  splashAlpha: 0.5,
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
    throw new Error('RainyRooftopSequenceScene could not read a positive duration from script.story');
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
  const declaredDuration = Number(rawTimeline.duration);
  if (!Number.isFinite(declaredDuration) || Math.abs(declaredDuration - storyDuration) > 0.001) {
    throw new Error(
      `Keyframe timeline duration ${declaredDuration} does not match story duration ${storyDuration}`
    );
  }

  const frames = rawTimeline.frames.map((frame, index) => {
    const at = Number(frame.at);
    if (!Number.isFinite(at) || at < 0 || at >= storyDuration) {
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
      shiver: frame.shiver === true,
      drips: normalizeDrips(frame.drips),
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
  return frames;
}

function normalizeDrips(rawDrips) {
  if (!rawDrips) return null;
  const emitters = rawDrips.emitters;
  if (!Array.isArray(emitters) || emitters.length === 0) {
    throw new Error('drips config needs a non-empty emitters array');
  }
  for (const emitter of emitters) {
    if (!Array.isArray(emitter) || emitter.length !== 2 || emitter.some((v) => !Number.isFinite(Number(v)))) {
      throw new Error(`Invalid drip emitter: ${JSON.stringify(emitter)}`);
    }
  }
  const waterY = Number(rawDrips.waterY);
  if (!Number.isFinite(waterY)) throw new Error('drips config needs a numeric waterY');
  const period = Array.isArray(rawDrips.period) ? rawDrips.period.map(Number) : [0.9, 1.6];
  if (period.length !== 2 || period.some((v) => !(v > 0))) {
    throw new Error('drips period must be two positive numbers');
  }
  return { emitters: emitters.map((e) => e.map(Number)), waterY, period };
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
      seed: hash01(id.length * 31 + id.charCodeAt(0)),
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

/**
 * Deterministic limited-animation playback with Chinese syllable viseme cels.
 *
 * The full image is kept stable for a dialogue shot. Only a small mouth
 * rectangle is taken from the closed/half/open variants, so generative drift
 * outside the lips never reaches the movie. Mouth state comes from the final
 * post-trim dialogue stem gates silence and jaw energy at 12 fps, while the
 * known dialogue selects syllable-aware limited visemes independently of
 * subtitle duration.
 *
 * Source keyframes are roughly 16:9 (1672x941 class); the cover-crop in
 * _drawImageCover fits them to the 1920x1080 presentation canvas.
 */
export class RainyRooftopScene extends SceneBase {
  constructor() {
    super('RainyRooftopScene');
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
    this.sequenceTexture.name = 'RainyRooftopSequenceTexture';
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
      this.sequenceDuration = story.duration;
      this.subtitles = story.subtitles;
      this.timeline = normalizeTimeline(rawTimeline, story.duration);
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

    this._drawRain(sequenceTime);
    this._drawSubtitle(sequenceTime);
    ctx.restore();
    this.sequenceTexture.needsUpdate = true;
  }

  _rainIntensityAt(sequenceTime) {
    if (sequenceTime >= RAIN.endTime) return 0;
    if (sequenceTime < RAIN.fullUntil) return 1;
    if (sequenceTime < RAIN.weakenUntil) {
      const progress = (sequenceTime - RAIN.fullUntil) / (RAIN.weakenUntil - RAIN.fullUntil);
      return lerp(1, RAIN.lightIntensity, progress);
    }
    return RAIN.lightIntensity;
  }

  _drawRain(sequenceTime) {
    const intensity = this._rainIntensityAt(sequenceTime);
    if (intensity <= 0) return;
    const ctx = this.sequenceContext;
    ctx.save();

    const gust = RAIN.slant + Math.sin(sequenceTime * 0.6) * RAIN.gustAmplitude;
    const travel = CANVAS_HEIGHT + 120;
    for (const layer of [RAIN.far, RAIN.near]) {
      const streaks = Math.floor(layer.count * intensity);
      ctx.strokeStyle = `rgba(182, 202, 226, ${layer.alpha})`;
      ctx.lineWidth = layer.widthPx;
      ctx.beginPath();
      for (let index = 0; index < streaks; index += 1) {
        const speed = lerp(layer.speedPx[0], layer.speedPx[1], hash01(index * 3 + 1));
        const length = lerp(layer.lengthPx[0], layer.lengthPx[1], hash01(index * 3 + 2));
        const baseX = hash01(index * 3 + 3) * (CANVAS_WIDTH + 240) - 120;
        const y = ((hash01(index * 7 + 5) * travel + sequenceTime * speed) % travel) - 60;
        const x = baseX + y * gust;
        ctx.moveTo(x, y);
        ctx.lineTo(x + length * gust, y + length);
      }
      ctx.stroke();
    }

    const ripples = Math.floor(RAIN.rippleCount * intensity);
    for (let index = 0; index < ripples; index += 1) {
      const centerX = hash01(index * 11 + 2) * CANVAS_WIDTH;
      const centerY = CANVAS_HEIGHT
        * (RAIN.rippleZoneTop + hash01(index * 11 + 3) * (1 - RAIN.rippleZoneTop));
      const cycleSpeed = lerp(0.5, 1.1, hash01(index * 11 + 7));
      const phase = (hash01(index * 11 + 5) + sequenceTime * cycleSpeed) % 1;
      const radius = 4 + phase * 26;
      const alpha = (1 - phase) * RAIN.rippleAlpha * intensity;
      if (alpha <= 0.01) continue;
      ctx.strokeStyle = `rgba(190, 210, 232, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius, radius * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Impact crowns: short bright ticks that pop where drops hit the puddles.
    // Fast cycle (~0.28s) so the ground reads as actively pounded by rain.
    const splashes = Math.floor(RAIN.splashCount * intensity);
    for (let index = 0; index < splashes; index += 1) {
      const centerX = hash01(index * 17 + 4) * CANVAS_WIDTH;
      const centerY = CANVAS_HEIGHT
        * (RAIN.rippleZoneTop + hash01(index * 17 + 6) * (1 - RAIN.rippleZoneTop));
      const cycleSpeed = lerp(2.8, 4.2, hash01(index * 17 + 8));
      const phase = (hash01(index * 17 + 10) + sequenceTime * cycleSpeed) % 1;
      if (phase > 0.35) continue;
      const life = phase / 0.35;
      const height = 2 + life * 5;
      const alpha = (1 - life) * RAIN.splashAlpha * intensity;
      if (alpha <= 0.02) continue;
      ctx.strokeStyle = `rgba(200, 218, 238, ${alpha})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(centerX - 2.5, centerY);
      ctx.lineTo(centerX - 2.5 - life * 2, centerY - height);
      ctx.moveTo(centerX + 2.5, centerY);
      ctx.lineTo(centerX + 2.5 + life * 2, centerY - height * 0.8);
      ctx.stroke();
    }
    ctx.restore();
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
      if (rig && this._blinkClosedAt(rig, sequenceTime - frame.at)) {
        const variant = this.imageByFile.get(rig.closed);
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

    if (frame.drips) this._drawDrips(frame.drips, sequenceTime);
    return this.sourceCanvas;
  }

  // Deterministic blink schedule per rig, anchored to the shot start so every
  // blink-rigged shot is guaranteed a lid closure: first blink 0.7–1.3s into
  // the shot, then one every interval[0]..interval[1] seconds. shotLocalTime
  // is seconds since the current timeline frame started (negative during a
  // crossfade-in of the next frame — no blink there).
  _blinkClosedAt(rig, shotLocalTime) {
    const offset = lerp(0.7, 1.3, rig.seed);
    if (shotLocalTime < offset) return false;
    const period = lerp(rig.interval[0], rig.interval[1], rig.seed);
    const phase = ((shotLocalTime - offset) / period) % 1;
    return phase < 0.13 / period;
  }

  // Umbrella-rib drip cycle, drawn in source-image space so the shot's crop
  // move carries the drops. Each emitter loops grow -> fall -> splash.
  _drawDrips(drips, sequenceTime) {
    const ctx = this.sourceContext;
    ctx.save();
    for (let index = 0; index < drips.emitters.length; index += 1) {
      const [ex, ey] = drips.emitters[index];
      const period = lerp(drips.period[0], drips.period[1], hash01(index * 17 + 3));
      const phase = ((sequenceTime + hash01(index * 29 + 7) * period) % period) / period;
      if (phase < 0.42) {
        // Grow: a brightening teardrop swelling under the rib.
        const growth = smoothstep01(phase / 0.42);
        const radius = 1.5 + growth * 5.5;
        const alpha = 0.35 + growth * 0.55;
        ctx.fillStyle = `rgba(228, 240, 252, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(ex, ey + radius * 0.9, radius * 0.72, radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(ex - radius * 0.22, ey + radius * 0.5, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (phase < 0.72) {
        // Fall: accelerating, slightly stretched droplet.
        const fall = (phase - 0.42) / 0.3;
        const y = ey + (drips.waterY - ey) * fall * fall;
        ctx.fillStyle = 'rgba(228, 240, 252, 0.9)';
        ctx.beginPath();
        ctx.ellipse(ex, y, 3.2, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(ex - 1, y - 2, 1.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Splash: expanding ring plus two rebound ticks at the water line.
        const life = (phase - 0.72) / 0.28;
        const alpha = (1 - life) * 0.65;
        if (alpha > 0.02) {
          ctx.strokeStyle = `rgba(230, 242, 252, ${alpha})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(ex, drips.waterY, 3 + life * 24, (3 + life * 24) * 0.3, 0, 0, Math.PI * 2);
          ctx.stroke();
          if (life < 0.5) {
            const tick = (1 - life * 2) * 6;
            ctx.beginPath();
            ctx.moveTo(ex - 3, drips.waterY);
            ctx.lineTo(ex - 5, drips.waterY - tick);
            ctx.moveTo(ex + 3, drips.waterY);
            ctx.lineTo(ex + 5, drips.waterY - tick * 0.8);
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
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
    // Shiver: tiny high-frequency crop jitter for the soaked-cat shots. Two
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
