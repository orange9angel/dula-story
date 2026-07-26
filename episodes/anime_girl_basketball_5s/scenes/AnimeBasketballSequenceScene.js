import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const ASSET_ROOT = '/episode/assets/';
const TIMELINE_URL = '/episode/config/keyframe_timeline.json';
const LIPSYNC_URL = '/episode/config/lipsync_cues.json';
const MOUTH_RIG_URL = '/episode/config/mouth_rigs.json';
const STORY_URL = '/episode/script.story';

const SPEAKER_LABELS = {
  Higurashi: '日暮',
  Boy: '男生',
};

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
    throw new Error('AnimeBasketballSequenceScene could not read a positive duration from script.story');
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
 */
export class AnimeBasketballSequenceScene extends SceneBase {
  constructor() {
    super('AnimeBasketballSequenceScene');
    this.timeline = [];
    this.imageByFile = new Map();
    this.mouthRigs = new Map();
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
    this.sequenceTexture.name = 'AnimeBasketballSequenceTexture';
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

    const loader = new THREE.ImageLoader();
    this.readyPromise = Promise.all([
      fetchText(STORY_URL).then(parseStory),
      fetchJson(TIMELINE_URL),
      fetchJson(LIPSYNC_URL),
      fetchJson(MOUTH_RIG_URL),
    ]).then(async ([story, rawTimeline, rawLipSync, rawMouthRigs]) => {
      this.sequenceDuration = story.duration;
      this.subtitles = story.subtitles;
      this.timeline = normalizeTimeline(rawTimeline, story.duration);
      this.lipSyncByEntry = normalizeLipSync(rawLipSync);
      this.mouthRigs = normalizeMouthRigs(rawMouthRigs);

      for (const frame of this.timeline) {
        if (frame.mouthRig && !this.mouthRigs.has(frame.mouthRig)) {
          throw new Error(`Timeline shot ${frame.shot} references unknown mouth rig ${frame.mouthRig}`);
        }
      }

      const files = new Set(this.timeline.map((frame) => frame.file));
      for (const rig of this.mouthRigs.values()) {
        if (rig.mode === 'image') Object.values(rig.variants).forEach((file) => files.add(file));
      }
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
    const motion = this._sampleMotion(frame.move, frameProgress, frame.mouthRig, sequenceTime);

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
          this._sampleMotion(nextFrame.move, 0, nextFrame.mouthRig, sequenceTime),
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
    return this.sourceCanvas;
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

  _sampleMotion(presetName, progress, mouthRig, sequenceTime) {
    const preset = MOTION_PRESETS[presetName] || MOTION_PRESETS.static;
    const dialogueBreath = mouthRig ? Math.sin(sequenceTime * Math.PI * 0.72) * 0.0018 : 0;
    return {
      zoom: lerp(preset.zoom[0], preset.zoom[1], progress) + dialogueBreath,
      panX: lerp(preset.panX[0], preset.panX[1], progress),
      panY: lerp(preset.panY[0], preset.panY[1], progress),
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
      horizontalSlack * (0.5 + clamp(motion.panX, -1, 1) * 0.5),
      0,
      horizontalSlack
    );
    const sourceY = clamp(
      verticalSlack * (0.5 + clamp(motion.panY, -1, 1) * 0.5),
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
