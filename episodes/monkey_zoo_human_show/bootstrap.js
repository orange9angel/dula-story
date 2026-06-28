import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import {
  AnimationBase,
  CharacterBase,
  PoseMatrix,
  SceneBase,
  registerAnimation,
  registerCharacter,
  registerScene,
} from 'dula-engine';

registerAll();

const TAU = Math.PI * 2;

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function easeInOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Texture helpers
// ─────────────────────────────────────────────────────────────────────────────

function createNoiseTexture(width = 128, height = 128, baseColor = '#8b5a3c', noiseIntensity = 0.12) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const v = Math.floor((Math.random() - 0.5) * 255 * noiseIntensity + 128);
    ctx.fillStyle = `rgba(${v},${v},${v},0.15)`;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createFurMaterial(color, roughness = 0.95) {
  const tex = createNoiseTexture(128, 128, '#' + new THREE.Color(color).getHexString(), 0.14);
  tex.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({
    color,
    map: tex,
    bumpMap: tex,
    bumpScale: 0.025,
    roughness,
    metalness: 0.0,
  });
}

// Head fur needs DoubleSide so the back of the head is rendered when a character
// turns away from the camera; otherwise the eyes embedded inside the head show
// through the culled back faces and look like floating black dots.
function createHeadMaterial(baseFurMat) {
  const mat = baseFurMat.clone();
  mat.side = THREE.DoubleSide;
  return mat;
}

// Find the closest facial surface z at a given (x, y) so the eyes can sit flush
// on the face instead of poking through it like glued-on marbles.
function computeFaceSurfaceZ(headGroup, x, y, fallbackZ) {
  for (const child of headGroup.children) {
    if (child.userData && child.userData.isFace && child.geometry && child.geometry.type === 'SphereGeometry') {
      const r = child.geometry.parameters.radius;
      const sx = child.scale.x || 1;
      const sy = child.scale.y || 1;
      const sz = child.scale.z || 1;
      const dx = (x - child.position.x) / sx;
      const dy = (y - child.position.y) / sy;
      const rr = r * r - dx * dx - dy * dy;
      if (rr > 0) {
        return child.position.z + sz * Math.sqrt(rr);
      }
    }
  }
  return fallbackZ;
}

function createSkinMaterial(color, roughness = 0.65) {
  const tex = createNoiseTexture(128, 128, '#' + new THREE.Color(color).getHexString(), 0.08);
  tex.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({ color, map: tex, bumpMap: tex, bumpScale: 0.01, roughness, metalness: 0.0 });
}

function createClothMaterial(color, roughness = 0.92) {
  const tex = createNoiseTexture(128, 128, '#888888', 0.12);
  tex.repeat.set(4, 4);
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, bumpMap: tex, bumpScale: 0.012 });
}

function createWoodTexture(color1 = '#8b6f47', color2 = '#6b5235') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = color2;
    ctx.fillRect(0, i * 6 + Math.random() * 4, 256, 1 + Math.random() * 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#d0d0c8';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.02)';
  ctx.fillRect(2, 2, 124, 124);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

function createJungleWindowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#4a9fd1');
  grad.addColorStop(0.5, '#87ceeb');
  grad.addColorStop(1, '#d4f1d4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 60; i++) {
    const h = 40 + Math.random() * 120;
    const x = Math.random() * 512;
    ctx.fillStyle = `hsl(${100 + Math.random() * 60}, 60%, ${20 + Math.random() * 20}%)`;
    ctx.beginPath();
    ctx.ellipse(x, 256, 10 + Math.random() * 30, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createSignTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a24';
  ctx.fillRect(0, 0, 512, 128);
  ctx.shadowColor = '#ff4d4d';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ff4d4d';
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createBananaPosterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 340;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffe135';
  ctx.fillRect(0, 0, 256, 340);
  ctx.fillStyle = '#6b4c1e';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍌', 128, 120);
  ctx.fillStyle = '#442200';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('演出香蕉', 128, 220);
  ctx.font = '24px sans-serif';
  ctx.fillText('偷吃扣五分', 128, 265);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createNoRunningPosterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 340;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 340);
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(128, 130, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(80, 82);
  ctx.lineTo(176, 178);
  ctx.stroke();
  ctx.fillStyle = '#cc0000';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('禁止', 128, 240);
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('翻越', 128, 290);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createCheckerTexture(color1 = '#d4a574', color2 = '#c49464') {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = color2;
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillRect(32, 32, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

function createTextPanelTexture(lines, options = {}) {
  const textLines = Array.isArray(lines) ? lines : [lines];
  const {
    width = 512,
    height = 256,
    background = '#151923',
    color = '#ffffff',
    accent = '#ffdf4d',
    fontSize = 54,
    border = true,
  } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  if (border) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(8, Math.round(width * 0.018));
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);
  }
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const gap = fontSize * 1.15;
  const startY = height / 2 - ((textLines.length - 1) * gap) / 2;
  textLines.forEach((line, i) => ctx.fillText(line, width / 2, startY + i * gap));
  return new THREE.CanvasTexture(canvas);
}

function addTextPlane(scene, lines, options = {}) {
  const {
    position = [0, 2, -5],
    rotation = [0, 0, 0],
    width = 3,
    height = 1,
    texture = {},
  } = options;
  const tex = createTextPanelTexture(lines, texture);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
  );
  panel.position.set(position[0], position[1], position[2]);
  panel.rotation.set(rotation[0], rotation[1], rotation[2]);
  scene.add(panel);
  return panel;
}

function createBananaProp(scale = 1, color = 0xffdf3d) {
  const group = new THREE.Group();
  const bananaMat = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.02 });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x5d3a13, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11 * scale, 1.05 * scale, 8, 20), bananaMat);
  body.rotation.z = Math.PI / 2;
  body.rotation.y = -0.18;
  body.scale.set(1.0, 0.82, 0.82);
  body.castShadow = true;
  group.add(body);
  for (const sx of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.065 * scale, 12, 12), tipMat);
    tip.scale.set(0.75, 0.55, 0.55);
    tip.position.set(sx * 0.58 * scale, sx * 0.04 * scale, 0);
    tip.castShadow = true;
    group.add(tip);
  }
  return group;
}

function addFoamBumper(scene, x, z, color, label) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const bumper = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.7, 24), mat);
  bumper.position.set(x, 0.35, z);
  bumper.castShadow = true;
  bumper.receiveShadow = true;
  scene.add(bumper);
  if (label) {
    addTextPlane(scene, label, {
      position: [x, 1.1, z + 0.02],
      width: 0.7,
      height: 0.26,
      texture: { width: 256, height: 96, background: '#ffffff', color: '#111111', accent: '#ffffff', fontSize: 34, border: false },
    });
  }
  return bumper;
}

function addCylinderBetween(scene, start, end, radius, material) {
  const a = new THREE.Vector3(start[0], start[1], start[2]);
  const b = new THREE.Vector3(end[0], end[1], end[2]);
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len <= 0.001) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 12, 1, true), material);
  mesh.position.copy(a.add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

function addTexturedGround(scene, width, depth, color, repeatX = 8, repeatY = 8) {
  const tex = createNoiseTexture(256, 256, '#' + new THREE.Color(color).getHexString(), 0.1);
  tex.repeat.set(repeatX, repeatY);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.86, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}

function addHabitatTree(scene, x, z, scale = 1, trunkColor = 0x7a5130, leafColor = 0x3f8f45) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.88 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 2.7 * scale, 14, 1, true), trunkMat);
  trunk.position.set(x, 1.35 * scale, z);
  trunk.castShadow = true;
  scene.add(trunk);

  for (const [ox, oy, oz, sx, sy, sz] of [
    [0, 2.75, 0, 1.25, 0.8, 1.05],
    [-0.45, 2.45, 0.05, 0.9, 0.65, 0.85],
    [0.5, 2.48, -0.12, 0.95, 0.7, 0.9],
    [0.15, 3.05, 0.35, 0.8, 0.55, 0.75],
  ]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.58 * scale, 18, 14), leafMat);
    leaf.scale.set(sx, sy, sz);
    leaf.position.set(x + ox * scale, oy * scale, z + oz * scale);
    leaf.castShadow = true;
    scene.add(leaf);
  }

  const branchMat = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9 });
  addCylinderBetween(scene, [x, 1.65 * scale, z], [x - 0.9 * scale, 2.0 * scale, z + 0.25 * scale], 0.055 * scale, branchMat);
  addCylinderBetween(scene, [x, 1.8 * scale, z], [x + 0.85 * scale, 2.18 * scale, z - 0.25 * scale], 0.055 * scale, branchMat);
}

function addHabitatLog(scene, x, z, length = 2.5, rotationY = 0, scale = 1) {
  const logMat = new THREE.MeshStandardMaterial({ color: 0x7b5636, roughness: 0.88 });
  const group = new THREE.Group();
  group.position.set(x, 0.28 * scale, z);
  group.rotation.y = rotationY;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * scale, 0.2 * scale, length, 18), logMat);
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  for (const sx of [-length / 2, length / 2]) {
    const cut = new THREE.Mesh(new THREE.CircleGeometry(0.2 * scale, 18), new THREE.MeshStandardMaterial({ color: 0xb7834a, roughness: 0.9 }));
    cut.position.x = sx;
    cut.rotation.y = Math.PI / 2;
    group.add(cut);
  }
  scene.add(group);
  return group;
}

function addRock(scene, x, z, scale = 1, color = 0x8c8f86) {
  const rock = new THREE.Mesh(new THREE.SphereGeometry(0.45 * scale, 16, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
  rock.scale.set(1.35, 0.62, 0.9);
  rock.position.set(x, 0.28 * scale, z);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  return rock;
}

function addViewingRail(scene, z = 4.2, xMin = -10, xMax = 10, color = 0x2f4f4f) {
  const railMat = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.08 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(xMax - xMin, 0.12, 0.12), railMat);
  top.position.set((xMin + xMax) / 2, 0.84, z);
  top.castShadow = true;
  scene.add(top);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(xMax - xMin, 0.08, 0.08), railMat);
  lower.position.set((xMin + xMax) / 2, 0.42, z);
  lower.castShadow = true;
  scene.add(lower);
  for (let x = xMin; x <= xMax + 0.01; x += 1.5) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.94, 10), railMat);
    post.position.set(x, 0.47, z);
    post.castShadow = true;
    scene.add(post);
  }
}

function addGlassPanel(scene, x, z, width = 10, height = 2.6, y = 1.55) {
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.06),
    new THREE.MeshPhysicalMaterial({
      color: 0xbbefff,
      transparent: true,
      opacity: 0.28,
      roughness: 0.02,
      metalness: 0.0,
      transmission: 0.3,
      side: THREE.DoubleSide,
    })
  );
  glass.position.set(x, y, z);
  glass.castShadow = false;
  scene.add(glass);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2c5966, roughness: 0.45, metalness: 0.2 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, 0.08, 0.1), frameMat);
  top.position.set(x, y + height / 2, z + 0.02);
  scene.add(top);
  const bottom = top.clone();
  bottom.position.y = y - height / 2;
  scene.add(bottom);
  for (const sx of [-width / 2, width / 2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, height + 0.12, 0.12), frameMat);
    post.position.set(x + sx, y, z + 0.03);
    scene.add(post);
  }
  return glass;
}

function addSimpleVisitor(scene, x, z, options = {}) {
  const {
    scale = 1,
    shirt = 0x4f8fd8,
    pants = 0x263238,
    phone = true,
    rotationY = Math.PI,
    child = false,
    popcorn = false,
    balloon = false,
    balloonColor = 0xe63946,
    map = false,
    iceCream = false,
    camera = false,
    selfie = false,
    waving = false,
    stroller = false,
  } = options;
  const s = child ? scale * 0.62 : scale;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c7a5, roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2d2018, roughness: 0.8 });

  const torsoRadius = 0.16 * s;

  // Rounded torso instead of a box
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(torsoRadius, 0.30 * s, 8, 12),
    shirtMat
  );
  torso.scale.set(1.3, 1.0, 0.75);
  torso.position.y = 0.98 * s;
  torso.castShadow = true;
  group.add(torso);

  // Chest volume to avoid a flat look
  const chest = new THREE.Mesh(
    new THREE.SphereGeometry(torsoRadius * 0.95, 14, 12),
    shirtMat
  );
  chest.scale.set(1.15, 0.7, 0.55);
  chest.position.set(0, 1.01 * s, torsoRadius * 0.32);
  chest.castShadow = true;
  group.add(chest);

  // Pelvis to bridge torso and legs
  const pelvis = new THREE.Mesh(
    new THREE.CapsuleGeometry(torsoRadius * 0.92, 0.20 * s, 6, 12),
    pantsMat
  );
  pelvis.scale.set(1.2, 1.0, 0.8);
  pelvis.position.y = 0.58 * s;
  pelvis.castShadow = true;
  group.add(pelvis);

  // Shirt hem / belt line
  const hem = new THREE.Mesh(
    new THREE.CylinderGeometry(torsoRadius * 1.05, torsoRadius * 1.08, 0.07 * s, 12),
    shirtMat
  );
  hem.position.y = 0.78 * s;
  hem.castShadow = true;
  group.add(hem);

  // Shoulders so arms don't float
  const shoulderY = 1.22 * s;
  for (const side of [-1, 1]) {
    const deltoid = new THREE.Mesh(
      new THREE.SphereGeometry(0.10 * s, 12, 10),
      shirtMat
    );
    deltoid.scale.set(1.0, 0.9, 0.85);
    deltoid.position.set(side * 0.22 * s, shoulderY, 0.02 * s);
    deltoid.castShadow = true;
    group.add(deltoid);
  }

  // Neck — embedded into torso so it doesn't hover
  const neckHeight = 0.10 * s;
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055 * s, 0.065 * s, neckHeight, 10),
    skinMat
  );
  neck.position.y = 1.30 * s;
  group.add(neck);

  // Collar to hide any seam
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.072 * s, 0.015 * s, 6, 14),
    shirtMat
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.30 * s - neckHeight * 0.35, 0);
  group.add(collar);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 16, 14), skinMat);
  head.position.y = 1.42 * s;
  head.castShadow = true;
  group.add(head);

  // Face features so background visitors don't look eyeless.
  // Use flat discs flush on the face so they never read as floating eyeballs.
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide });
  const eyeIrisMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.4, side: THREE.FrontSide });
  const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.FrontSide });
  const browMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const eyeRadius = 0.021 * s;
  const eyeZ = 0.174 * s; // flush on 0.18 head sphere
  for (const side of [-1, 1]) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.052 * s, 1.44 * s, eyeZ);
    group.add(eyeGroup);

    const sclera = new THREE.Mesh(new THREE.CircleGeometry(eyeRadius, 16), eyeWhiteMat);
    sclera.scale.set(1, 1.05, 1);
    eyeGroup.add(sclera);

    const iris = new THREE.Mesh(new THREE.CircleGeometry(eyeRadius * 0.65, 14), eyeIrisMat);
    iris.position.z = 0.0012 * s;
    eyeGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.CircleGeometry(eyeRadius * 0.34, 12), eyePupilMat);
    pupil.position.z = 0.0018 * s;
    eyeGroup.add(pupil);

    const highlight = new THREE.Mesh(new THREE.CircleGeometry(eyeRadius * 0.22, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.FrontSide }));
    highlight.position.set(eyeRadius * 0.25, eyeRadius * 0.28, 0.0024 * s);
    eyeGroup.add(highlight);

    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0042 * s, 0.034 * s, 4, 8), browMat);
    brow.position.set(0, eyeRadius * 1.35, 0.002 * s);
    brow.rotation.z = side * 0.08;
    eyeGroup.add(brow);
  }

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.012 * s, 10, 10), createSkinMaterial(0xc48a6e));
  nose.position.set(0, 1.40 * s, 0.175 * s);
  nose.scale.set(0.75, 0.9, 0.65);
  group.add(nose);

  // Mouth
  const mouth = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.005 * s, 0.022 * s, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x6e3a3a, roughness: 0.65 })
  );
  mouth.position.set(0, 1.34 * s, 0.168 * s);
  mouth.rotation.z = Math.PI / 2;
  group.add(mouth);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 14, 10), hairMat);
  hair.scale.set(1.02, 0.5, 1.02);
  hair.position.y = 1.53 * s;
  group.add(hair);

  // Slimmer arms with slightly longer length
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.026 * s, 0.50 * s, 6, 8), skinMat);
  armL.position.set(-0.26 * s, 1.20 * s, 0.04 * s);
  armL.rotation.z = -0.42;
  armL.castShadow = true;
  group.add(armL);

  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.026 * s, 0.50 * s, 6, 8), skinMat);
  armR.position.set(0.26 * s, 1.20 * s, 0.04 * s);
  armR.rotation.z = waving ? 2.2 : 0.42;
  armR.castShadow = true;
  group.add(armR);

  // Keep references for idle animation
  const visitorParts = { head, armL, armR, child, waving, s };

  // Slimmer legs + shoes so legs don't look stuck in the ground
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032 * s, 0.036 * s, 0.68 * s, 8), pantsMat);
    leg.position.set(sx * 0.11 * s, 0.34 * s, 0);
    leg.castShadow = true;
    group.add(leg);

    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.78 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 });
    const footLen = 0.14 * s;
    const footHeight = 0.05 * s;
    const footWidth = 0.06 * s;

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(footWidth, footHeight * 0.75, footLen), shoeMat);
    shoe.position.set(sx * 0.11 * s, footHeight * 0.375, footLen * 0.18);
    shoe.castShadow = true;
    group.add(shoe);

    const toe = new THREE.Mesh(new THREE.SphereGeometry(footWidth * 0.55, 10, 8), shoeMat);
    toe.scale.set(1, 0.6, 1.3);
    toe.position.set(sx * 0.11 * s, footHeight * 0.25, footLen * 0.58);
    group.add(toe);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(footWidth * 1.08, footHeight * 0.22, footLen * 1.05), soleMat);
    sole.position.set(sx * 0.11 * s, footHeight * 0.08, footLen * 0.18);
    group.add(sole);
  }

  if (phone) {
    const phoneMesh = new THREE.Mesh(new THREE.BoxGeometry(0.17 * s, 0.27 * s, 0.025 * s), new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.35 }));
    phoneMesh.position.set(0.3 * s, 1.32 * s, -0.1 * s);
    phoneMesh.rotation.z = -0.16;
    group.add(phoneMesh);
  }
  if (camera) {
    const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 0.12 * s, 0.14 * s), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35 }));
    camBody.position.set(0.32 * s, 1.40 * s, -0.08 * s);
    group.add(camBody);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.06 * s, 12), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 }));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0.32 * s, 1.40 * s, -0.16 * s);
    group.add(lens);
  }
  if (selfie) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.85 * s, 8), new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.5 }));
    stick.position.set(0.55 * s, 1.68 * s, 0.1 * s);
    stick.rotation.z = -0.35;
    stick.rotation.x = 0.25;
    group.add(stick);
    const phoneTip = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.2 * s, 0.02 * s), new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.35 }));
    phoneTip.position.set(0.7 * s, 2.05 * s, 0.22 * s);
    phoneTip.rotation.z = -0.35;
    phoneTip.rotation.x = 0.25;
    group.add(phoneTip);
  }
  if (popcorn) {
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.09 * s, 0.22 * s, 12), new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.8 }));
    bucket.position.set(-0.28 * s, 1.20 * s, 0.18 * s);
    group.add(bucket);
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.022 * s, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffeebb, roughness: 0.6 }));
      p.position.set(-0.28 * s + (Math.random() - 0.5) * 0.12 * s, 1.35 * s + Math.random() * 0.04 * s, 0.18 * s + (Math.random() - 0.5) * 0.1 * s);
      group.add(p);
    }
  }
  if (balloon) {
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004 * s, 0.004 * s, 0.7 * s, 6), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    string.position.set(-0.34 * s, 1.68 * s, 0.1 * s);
    group.add(string);
    const balloonMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 14, 14), new THREE.MeshStandardMaterial({ color: balloonColor, roughness: 0.35 }));
    balloonMesh.position.set(-0.34 * s, 2.05 * s, 0.1 * s);
    group.add(balloonMesh);
    visitorParts.balloon = balloonMesh;
    visitorParts.balloonBaseY = balloonMesh.position.y;
  }
  if (map) {
    const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32 * s, 0.22 * s), new THREE.MeshBasicMaterial({ color: 0xfff8dc, side: THREE.DoubleSide }));
    mapMesh.position.set(0.26 * s, 1.35 * s, 0.16 * s);
    mapMesh.rotation.x = -0.4;
    mapMesh.rotation.y = -0.2;
    group.add(mapMesh);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xcc4444 });
    for (const [lx, ly] of [[0, 0.03], [0.04, -0.02], [-0.05, 0.01]]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012 * s, 6, 6), lineMat);
      dot.position.set(0.26 * s + lx, 1.35 * s + ly, 0.17 * s);
      group.add(dot);
    }
  }
  if (iceCream) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.18 * s, 12), new THREE.MeshStandardMaterial({ color: 0xeecfa1, roughness: 0.8 }));
    cone.position.set(-0.3 * s, 1.28 * s, 0.16 * s);
    group.add(cone);
    const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 10, 10), new THREE.MeshStandardMaterial({ color: 0xffaacc, roughness: 0.6 }));
    scoop.position.set(-0.3 * s, 1.40 * s, 0.16 * s);
    group.add(scoop);
  }
  if (stroller) {
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.28 * s, 0.8 * s), new THREE.MeshStandardMaterial({ color: 0x5a6e7c, roughness: 0.8 }));
    basket.position.set(-0.55 * s, 0.32 * s, 0.2 * s);
    group.add(basket);
    for (const sx of [-0.22, 0.22]) {
      for (const sz of [-0.32, 0.32]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.04 * s, 10), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(-0.55 * s + sx, 0.07 * s, 0.2 * s + sz);
        group.add(wheel);
      }
    }
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * s, 0.015 * s, 0.5 * s, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    handle.position.set(-0.2 * s, 0.78 * s, 0.2 * s);
    handle.rotation.z = -0.6;
    group.add(handle);
  }

  // Idle animation so background visitors don't look like puppets.
  // Each visitor gets a slightly different phase and speed so the crowd feels alive.
  const phase = Math.random() * Math.PI * 2;
  const speed = 0.7 + Math.random() * 0.6;
  const headSwayAmp = child ? 0.10 : 0.06;
  const armSwayAmp = child ? 0.14 : 0.08;
  const bodySwayAmp = child ? 0.05 : 0.03;
  const baseY = group.position.y;
  group.update = (time, _delta) => {
    const t = time * speed + phase;
    // Whole-body sway and gentle bob so they don't look glued to the ground.
    group.rotation.y = rotationY + Math.sin(t * 0.35 + phase) * bodySwayAmp;
    group.position.y = baseY + Math.sin(t * 1.1 + phase) * 0.008 * s;

    // Head sway / look-around with occasional bigger turns.
    if (visitorParts.head) {
      const lookEnvelope = 0.6 + 0.4 * Math.sin(t * 0.22 + phase);
      visitorParts.head.rotation.y = Math.sin(t * 0.65 + phase) * headSwayAmp * lookEnvelope;
      visitorParts.head.rotation.x = Math.sin(t * 0.5 + 1.0 + phase) * (headSwayAmp * 0.35);
      visitorParts.head.rotation.z = Math.sin(t * 0.45 + phase) * (headSwayAmp * 0.15);
    }
    // Arm sway with a bit of forward/back motion.
    if (visitorParts.armL) {
      visitorParts.armL.rotation.z = -0.42 + Math.sin(t * 0.9 + 0.5 + phase) * armSwayAmp;
      visitorParts.armL.rotation.x = Math.sin(t * 1.3 + phase) * 0.05;
    }
    if (visitorParts.armR) {
      const baseR = visitorParts.waving ? 2.2 : 0.42;
      visitorParts.armR.rotation.z = baseR + Math.sin(t * 0.85 + 2.0 + phase) * armSwayAmp;
      visitorParts.armR.rotation.x = Math.sin(t * 1.25 + phase) * 0.05;
      // Waving visitors keep a larger, cheerier motion.
      if (visitorParts.waving) {
        visitorParts.armR.rotation.x = Math.sin(t * 3.5 + phase) * 0.22;
        visitorParts.armR.rotation.z = baseR + Math.sin(t * 3.5 + phase) * 0.18;
      }
    }
    // Children bounce more energetically.
    if (visitorParts.child) {
      group.position.y = baseY + Math.abs(Math.sin(t * 1.8 + phase)) * 0.022 * visitorParts.s;
    }
    // Balloon floats gently.
    if (visitorParts.balloon) {
      visitorParts.balloon.position.y = visitorParts.balloonBaseY + Math.sin(t * 1.1 + phase) * 0.035 * visitorParts.s;
      visitorParts.balloon.position.x = -0.34 * visitorParts.s + Math.sin(t * 0.6 + phase) * 0.015 * visitorParts.s;
    }
  };
  group.userData = { isBackgroundVisitor: true, visitorPhase: phase };

  scene.add(group);
  return group;
}

function addScoringBoard(scene, lines, position, width = 4, height = 1.8) {
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.25, height + 0.25, 0.08), new THREE.MeshStandardMaterial({ color: 0x6d4c2f, roughness: 0.75 }));
  frame.position.set(position[0], position[1], position[2] - 0.16);
  frame.castShadow = true;
  scene.add(frame);
  addTextPlane(scene, lines, {
    position,
    width,
    height,
    texture: { width: 768, height: 320, background: '#25352b', color: '#fff7c2', accent: '#b9e37b', fontSize: 54 },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene: ERScene — 综艺主舞台
// ─────────────────────────────────────────────────────────────────────────────

class ERScene extends SceneBase {
  constructor() {
    super('ERScene');
  }

  build() {
    super.build();

    this.scene.background = new THREE.Color(0xe8f4f8);
    this.scene.fog = new THREE.Fog(0xe8f4f8, 20, 90);

    // Clean tiled floor
    const tileTex = createTileTexture();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.55 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Walls — light mint green
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8f0e8, roughness: 0.85 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(28, 10, 0.5), wallMat);
    backWall.position.set(0, 5, -7.5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 28), wallMat);
    leftWall.position.set(-7.5, 5, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // White wainscoting / hygiene rail
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const backTrim = new THREE.Mesh(new THREE.BoxGeometry(28, 1.2, 0.55), trimMat);
    backTrim.position.set(0, 0.6, -7.5);
    this.scene.add(backTrim);
    const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.2, 28), trimMat);
    leftTrim.position.set(-7.5, 0.6, 0);
    this.scene.add(leftTrim);

    const agencySignTex = createSignTexture('猴山人类观察站');
    const agencySign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.8),
      new THREE.MeshBasicMaterial({ map: agencySignTex })
    );
    agencySign.position.set(1.1, 4.8, -7.22);
    this.scene.add(agencySign);

    // Hospital bed / gurney
    const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.4, metalness: 0.4 });
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0x87ceeb, roughness: 0.9 });
    const bedGroup = new THREE.Group();
    bedGroup.position.set(1.5, 0.0, -2);
    this.scene.add(bedGroup);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 1.3), mattressMat);
    mattress.position.set(0, 0.75, 0);
    mattress.castShadow = true;
    bedGroup.add(mattress);

    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.4), bedFrameMat);
    bedFrame.position.set(0, 0.62, 0);
    bedFrame.castShadow = true;
    bedGroup.add(bedFrame);

    for (const [bx, bz] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 8), bedFrameMat);
      leg.position.set(bx, 0.31, bz);
      bedGroup.add(leg);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(bx, 0.03, bz);
      bedGroup.add(wheel);
    }

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pillow.position.set(-0.8, 0.95, 0);
    bedGroup.add(pillow);

    // Medical cabinets along back wall
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 });
    for (let c = 0; c < 3; c++) {
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.6), cabinetMat);
      cabinet.position.set(-5.5 + c * 1.8, 1.4, -7.0);
      cabinet.castShadow = true;
      this.scene.add(cabinet);
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 })
      );
      handle.rotation.z = Math.PI / 2;
      handle.position.set(0, 0, 0.32);
      cabinet.add(handle);
      // White backing plate + dark-red cross so it reads as a sign, not a glowing dot
      const crossPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.38, 0.015),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      crossPlate.position.set(0, 0.5, 0.31);
      cabinet.add(crossPlate);
      const crossMat = new THREE.MeshBasicMaterial({ color: 0xc62828 });
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.02), crossMat);
      crossV.position.set(0, 0.5, 0.32);
      cabinet.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.02), crossMat);
      crossH.position.set(0, 0.5, 0.32);
      cabinet.add(crossH);
    }

    // Doctor desk
    const deskMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 1.6), deskMat);
    deskTop.position.set(4.5, 1.0, -5.5);
    deskTop.castShadow = true;
    this.scene.add(deskTop);
    for (const dx of [-1.5, 1.5]) {
      const dleg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 1.3), deskMat);
      dleg.position.set(4.5 + dx, 0.5, -5.5);
      this.scene.add(dleg);
    }

    // Clipboard on desk
    const clipboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.04, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x8b5a3c })
    );
    clipboard.position.set(4.5, 1.08, -5.5);
    clipboard.rotation.y = 0.3;
    this.scene.add(clipboard);
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.02, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    paper.position.set(0, 0.03, 0);
    clipboard.add(paper);

    // IV stand
    const ivPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 3.0, 8),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.4 })
    );
    ivPole.position.set(4.5, 1.5, -2.5);
    ivPole.castShadow = true;
    this.scene.add(ivPole);
    const ivHook = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.4 })
    );
    ivHook.rotation.z = Math.PI / 2;
    ivHook.position.set(0, 1.4, 0);
    ivPole.add(ivHook);
    const ivBag = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.25, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xd4f1d4, transparent: true, opacity: 0.8 })
    );
    ivBag.position.set(0.2, 1.2, 0);
    ivPole.add(ivBag);

    // Wall posters
    const bananaPosterTex = createBananaPosterTexture();
    const bananaPoster = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.3),
      new THREE.MeshBasicMaterial({ map: bananaPosterTex })
    );
    bananaPoster.position.set(-3, 3.5, -7.2);
    this.scene.add(bananaPoster);

    const noRunTex = createNoRunningPosterTexture();
    const noRunPoster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.2),
      new THREE.MeshBasicMaterial({ map: noRunTex })
    );
    noRunPoster.position.set(-1.5, 3.5, -7.2);
    this.scene.add(noRunPoster);

    // Window showing jungle
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.5, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x3d3d3d })
    );
    windowFrame.position.set(6, 3.5, -1);
    this.scene.add(windowFrame);
    const jungleTex = createJungleWindowTexture();
    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2.2),
      new THREE.MeshBasicMaterial({ map: jungleTex })
    );
    windowGlass.position.set(6, 3.5, -0.94);
    this.scene.add(windowGlass);

    // Wall clock
    const clockGroup = new THREE.Group();
    clockGroup.position.set(2.5, 3.6, -7.25);
    this.scene.add(clockGroup);
    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    clockFace.rotation.x = Math.PI / 2;
    clockGroup.add(clockFace);
    const handH = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.01), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    handH.position.z = 0.03;
    clockGroup.add(handH);
    const handM = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.3, 0.01), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    handM.rotation.z = -0.8;
    handM.position.z = 0.03;
    clockGroup.add(handM);

    // Potted plant near window
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.18, 0.45, 12),
      new THREE.MeshStandardMaterial({ color: 0xd2691e, roughness: 0.8 })
    );
    pot.position.set(5.2, 0.23, 1.2);
    pot.castShadow = true;
    this.scene.add(pot);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.9 })
      );
      leaf.scale.set(0.6, 1.4, 0.6);
      leaf.position.set(
        5.2 + Math.sin(i * 1.3) * 0.12,
        0.55 + Math.random() * 0.25,
        1.2 + Math.cos(i * 1.3) * 0.12
      );
      leaf.rotation.z = Math.sin(i * 1.3) * 0.3;
      leaf.rotation.x = Math.cos(i * 1.3) * 0.2;
      leaf.castShadow = true;
      this.scene.add(leaf);
    }

    // Medical monitor on desk
    const monitorBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.05, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    monitorBase.position.set(4.2, 1.05, -5.6);
    this.scene.add(monitorBase);
    const monitorStand = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.22, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    monitorStand.position.set(4.2, 1.18, -5.6);
    this.scene.add(monitorStand);
    const monitorScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.38, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 })
    );
    monitorScreen.position.set(4.2, 1.38, -5.55);
    this.scene.add(monitorScreen);
    const monitorGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.34),
      new THREE.MeshBasicMaterial({ color: 0x44ffaa })
    );
    monitorGlow.position.set(4.2, 1.38, -5.52);
    this.scene.add(monitorGlow);

    // Wall baseboards and tile wainscoting for clinical detail
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x4a7c88, roughness: 0.6 });
    for (const [wx, wz, ry, len] of [[0, -7.48, 0, 14], [-7.48, 0, Math.PI / 2, 16]]) {
      const bb = new THREE.Mesh(new THREE.BoxGeometry(len, 0.15, 0.06), baseboardMat);
      bb.position.set(wx, 0.08, wz);
      bb.rotation.y = ry;
      this.scene.add(bb);
      const tileStripe = new THREE.Mesh(
        new THREE.BoxGeometry(len, 1.2, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xe8f1f2, roughness: 0.5 })
      );
      tileStripe.position.set(wx, 0.75, wz);
      tileStripe.rotation.y = ry;
      this.scene.add(tileStripe);
    }

    // Medical cart with wheels and supply trays
    const cartGroup = new THREE.Group();
    cartGroup.position.set(-1.5, 0.45, -4.2);
    const cartFrameMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.5, roughness: 0.3 });
    const cartTrayMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    for (const cy of [0.25, 0.55, 0.85]) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.55), cartTrayMat);
      tray.position.y = cy;
      cartGroup.add(tray);
    }
    for (const [px, pz] of [[-0.4, -0.22], [0.4, -0.22], [-0.4, 0.22], [0.4, 0.22]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 8), cartFrameMat);
      pole.position.set(px, 0.45, pz);
      cartGroup.add(pole);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(px, -0.38, pz);
      cartGroup.add(wheel);
    }
    // Tiny colored supply boxes
    for (let i = 0; i < 4; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.08, 0.12),
        new THREE.MeshStandardMaterial({ color: [0x4fc3f7, 0x81c784, 0xffb74d, 0xe57373][i], roughness: 0.5 })
      );
      box.position.set(-0.25 + i * 0.16, 0.59, 0);
      cartGroup.add(box);
    }
    this.scene.add(cartGroup);

    // Wall-mounted blood pressure cuff
    const cuffBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.35, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    cuffBox.position.set(0.5, 1.6, -7.45);
    this.scene.add(cuffBox);
    const cuffTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    cuffTube.rotation.z = Math.PI / 3;
    cuffTube.position.set(0.5, 1.45, -7.4);
    this.scene.add(cuffTube);

    // Waste bin
    const bin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.15, 0.45, 16),
      new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.6, metalness: 0.3 })
    );
    bin.position.set(5.8, 0.23, -3.0);
    bin.castShadow = true;
    this.scene.add(bin);

    // Ceiling air vent
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.7 })
    );
    vent.position.set(-2.0, 5.9, -2.5);
    this.scene.add(vent);

    // Ceiling tiles
    const tileGeo = new THREE.PlaneGeometry(1.8, 1.0);
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.9 });
    for (let cx = -4; cx <= 4; cx++) {
      for (let cz = -3; cz <= 3; cz++) {
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(cx * 1.85, 5.95, cz * 1.05);
        this.scene.add(tile);
      }
    }

    // Ceiling lights
    for (const lx of [-3, 0, 3]) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.05, 1.0),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      panel.position.set(lx, 5.8, 0);
      this.scene.add(panel);
      const ceilingLight = new THREE.PointLight(0xffffff, 0.5, 8);
      ceilingLight.position.set(lx, 5.5, 0);
      this.scene.add(ceilingLight);
    }

    // Lighting — bright clinical
    for (const light of this.lights) {
      if (light.isDirectionalLight) {
        light.intensity = 0.9;
        light.position.set(4, 12, 8);
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
      }
      if (light.isAmbientLight) light.intensity = 0.5;
    }
    const spot = new THREE.SpotLight(0xffffff, 2.4, 30, Math.PI / 4, 0.4, 1);
    spot.position.set(0, 8, 6);
    spot.target.position.set(0, 1, -2);
    spot.castShadow = true;
    this.scene.add(spot);
    this.scene.add(spot.target);

    const rimLight = new THREE.SpotLight(0xcceeff, 1.2, 30, Math.PI / 3, 0.6, 1);
    rimLight.position.set(-8, 5, -4);
    rimLight.target.position.set(0, 1, 0);
    this.scene.add(rimLight);
    this.scene.add(rimLight.target);

    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(1.5, 0.8, -2), size: new THREE.Vector3(2.6, 1.0, 1.5) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(-3.5, 1.4, -7), size: new THREE.Vector3(5.4, 2.9, 0.7) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(4.5, 0.8, -5.5), size: new THREE.Vector3(3.7, 1.2, 1.7) });

    return this.scene;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hospital corridor — for the chase sequence
// ─────────────────────────────────────────────────────────────────────────────
class HospitalCorridorScene extends SceneBase {
  build() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdce9ec);
    this.scene.fog = new THREE.Fog(0xdce9ec, 8, 24);
    this.characters = [];
    this.addLights();

    // Floor tiles
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xeef2f3, roughness: 0.4, metalness: 0.05 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(32, 7), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Tile grid lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xcfd8dc });
    for (let lx = -15; lx <= 15; lx += 2) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 7), lineMat);
      line.position.set(lx, 0.005, 0);
      this.scene.add(line);
    }
    for (let lz = -3; lz <= 3; lz += 1.5) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(32, 0.01, 0.04), lineMat);
      line.position.set(0, 0.005, lz);
      this.scene.add(line);
    }

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe0eaec, roughness: 0.7 });
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(32, 5.5, 0.4), wallMat);
    leftWall.position.set(0, 2.75, -3.2);
    this.scene.add(leftWall);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(32, 5.5, 0.4), wallMat);
    rightWall.position.set(0, 2.75, 3.2);
    this.scene.add(rightWall);

    // Baseboards and doors
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x4a7c88, roughness: 0.6 });
    for (const side of [-1, 1]) {
      const bb = new THREE.Mesh(new THREE.BoxGeometry(32, 0.15, 0.06), baseboardMat);
      bb.position.set(0, 0.08, side * 3.02);
      this.scene.add(bb);
      for (let dx = -12; dx <= 12; dx += 6) {
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.08), new THREE.MeshStandardMaterial({ color: 0xcfe0e4, roughness: 0.5 }));
        door.position.set(dx, 1.2, side * 3.16);
        this.scene.add(door);
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 }));
        handle.rotation.z = Math.PI / 2;
        handle.position.set(dx + (side === -1 ? 0.5 : -0.5), 1.2, side * 3.21);
        this.scene.add(handle);
        const numPlate = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 0.18),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        numPlate.position.set(dx, 2.55, side * 3.21);
        this.scene.add(numPlate);
      }
    }

    // Ceiling and lights
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(32, 7), new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5.5;
    this.scene.add(ceiling);
    for (let lx = -14; lx <= 14; lx += 4) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      panel.position.set(lx, 5.4, 0);
      this.scene.add(panel);
      const light = new THREE.PointLight(0xffffff, 0.45, 8);
      light.position.set(lx, 5.1, 0);
      this.scene.add(light);
    }

    // Direction signs hanging from ceiling
    for (const [sx, text] of [[-8, '猴山区'], [0, '游客通道'], [8, '香蕉摊']]) {
      const signGroup = new THREE.Group();
      signGroup.position.set(sx, 3.6, 0);
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.06), new THREE.MeshBasicMaterial({ color: 0x1565c0 }));
      signGroup.add(board);
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1565c0';
      ctx.fillRect(0, 0, 256, 80);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 40);
      const tex = new THREE.CanvasTexture(canvas);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.38), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      label.position.z = 0.04;
      signGroup.add(label);
      this.scene.add(signGroup);
    }

    // Gurney / stretcher on the side
    const gurneyGroup = new THREE.Group();
    gurneyGroup.position.set(-10, 0.55, 1.8);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x81d4fa, roughness: 0.5 });
    const gurneyBed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.8), bedMat);
    gurneyGroup.add(gurneyBed);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.55), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pillow.position.set(-0.65, 0.1, 0);
    gurneyGroup.add(pillow);
    for (const [gx, gz] of [[-0.85, -0.32], [0.85, -0.32], [-0.85, 0.32], [0.85, 0.32]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.4 }));
      leg.position.set(gx, -0.32, gz);
      gurneyGroup.add(leg);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(gx, -0.6, gz);
      gurneyGroup.add(wheel);
    }
    this.scene.add(gurneyGroup);

    // Potted plant
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.42, 12), new THREE.MeshStandardMaterial({ color: 0xd2691e, roughness: 0.8 }));
    pot.position.set(9, 0.21, -1.8);
    pot.castShadow = true;
    this.scene.add(pot);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), foliageMat);
      leaf.position.set(9 + Math.cos(i * 1.3) * 0.15, 0.5 + i * 0.12, -1.8 + Math.sin(i * 1.3) * 0.15);
      this.scene.add(leaf);
    }

    // Lighting
    for (const light of this.lights) {
      if (light.isDirectionalLight) {
        light.intensity = 0.8;
        light.position.set(2, 10, 6);
        light.castShadow = true;
      }
      if (light.isAmbientLight) light.intensity = 0.45;
    }

    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(-10, 0.8, 1.8), size: new THREE.Vector3(2.4, 1.2, 1.0) });
    return this.scene;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hospital reception desk — for the final punchline
// ─────────────────────────────────────────────────────────────────────────────
class ReceptionScene extends SceneBase {
  build() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdce9ec);
    this.scene.fog = new THREE.Fog(0xdce9ec, 10, 26);
    this.characters = [];
    this.addLights();

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshStandardMaterial({ color: 0xeef2f3, roughness: 0.4 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe0eaec, roughness: 0.7 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(16, 5.5, 0.4), wallMat);
    backWall.position.set(0, 2.75, -6.2);
    this.scene.add(backWall);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 12), wallMat);
    leftWall.position.set(-8.2, 2.75, 0);
    this.scene.add(leftWall);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 12), wallMat);
    rightWall.position.set(8.2, 2.75, 0);
    this.scene.add(rightWall);

    // Baseboards
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x4a7c88, roughness: 0.6 });
    for (const [wx, wz, ry, len] of [[0, -6.02, 0, 16], [-8.02, 0, Math.PI / 2, 12], [8.02, 0, Math.PI / 2, 12]]) {
      const bb = new THREE.Mesh(new THREE.BoxGeometry(len, 0.15, 0.06), baseboardMat);
      bb.position.set(wx, 0.08, wz);
      bb.rotation.y = ry;
      this.scene.add(bb);
    }

    // Reception counter
    const counterMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.15, 1.4), counterMat);
    counterTop.position.set(0, 1.15, -4.5);
    counterTop.castShadow = true;
    this.scene.add(counterTop);
    const counterBody = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.1, 1.3), new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.5 }));
    counterBody.position.set(0, 0.55, -4.5);
    counterBody.castShadow = true;
    this.scene.add(counterBody);

    const cakeGroup = new THREE.Group();
    cakeGroup.position.set(0, 1.34, -4.35);
    const cakeMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.75 });
    const frostingMat = new THREE.MeshStandardMaterial({ color: 0xfff8e1, roughness: 0.8 });
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.28, 32), cakeMat);
    cake.castShadow = true;
    cakeGroup.add(cake);
    const frosting = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.69, 0.06, 32), frostingMat);
    frosting.position.y = 0.17;
    cakeGroup.add(frosting);
    const bananaMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.6 });
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * TAU;
      const banana = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.34, 6, 12), bananaMat);
      banana.rotation.z = Math.PI / 2;
      banana.rotation.y = angle;
      banana.position.set(Math.cos(angle) * 0.34, 0.25, Math.sin(angle) * 0.23);
      cakeGroup.add(banana);
    }
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8f00 });
    for (const x of [-0.22, 0, 0.22]) {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 10), candleMat);
      candle.position.set(x, 0.38, 0.02);
      cakeGroup.add(candle);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 10), flameMat);
      flame.position.set(x, 0.57, 0.02);
      cakeGroup.add(flame);
    }
    this.scene.add(cakeGroup);

    const noteCanvas = document.createElement('canvas');
    noteCanvas.width = 256;
    noteCanvas.height = 128;
    const noteCtx = noteCanvas.getContext('2d');
    noteCtx.fillStyle = '#fffde7';
    noteCtx.fillRect(0, 0, 256, 128);
    noteCtx.fillStyle = '#5d4037';
    noteCtx.font = 'bold 36px sans-serif';
    noteCtx.textAlign = 'center';
    noteCtx.textBaseline = 'middle';
    noteCtx.fillText('配合演出', 128, 64);
    const noteTex = new THREE.CanvasTexture(noteCanvas);
    const note = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.4),
      new THREE.MeshBasicMaterial({ map: noteTex })
    );
    note.rotation.x = -Math.PI / 2;
    note.rotation.z = -0.15;
    note.position.set(1.2, 1.25, -4.05);
    this.scene.add(note);

    // Queue number display
    const display = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    display.position.set(0, 2.4, -6.0);
    this.scene.add(display);
    const displayGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshBasicMaterial({ color: 0xffa726 }));
    displayGlow.position.set(0, 2.4, -5.95);
    this.scene.add(displayGlow);

    // Waiting chairs
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, roughness: 0.6 });
    for (const cx of [-5, -3, 3, 5]) {
      const chairGroup = new THREE.Group();
      chairGroup.position.set(cx, 0, 2.5);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.9), chairMat);
      seat.position.y = 0.45;
      chairGroup.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.1), chairMat);
      back.position.set(0, 0.8, 0.42);
      chairGroup.add(back);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0x78909c }));
      leg.position.y = 0.225;
      chairGroup.add(leg);
      this.scene.add(chairGroup);
    }

    // Queue rope stanchions
    const stanchionMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, metalness: 0.5, roughness: 0.3 });
    for (const sx of [-2.5, 2.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), stanchionMat);
      post.position.set(sx, 0.55, -2.5);
      this.scene.add(post);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12), stanchionMat);
      base.position.set(sx, 0.03, -2.5);
      this.scene.add(base);
    }
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 5.0, 8), new THREE.MeshStandardMaterial({ color: 0xb71c1c }));
    rope.rotation.z = Math.PI / 2;
    rope.position.set(0, 0.95, -2.5);
    this.scene.add(rope);

    // Potted plant
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.45, 12), new THREE.MeshStandardMaterial({ color: 0xd2691e, roughness: 0.8 }));
    pot.position.set(6.5, 0.23, -3.5);
    pot.castShadow = true;
    this.scene.add(pot);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), foliageMat);
      leaf.position.set(6.5 + Math.cos(i * 1.3) * 0.18, 0.55 + i * 0.14, -3.5 + Math.sin(i * 1.3) * 0.18);
      this.scene.add(leaf);
    }

    // Ceiling lights
    for (const lx of [-3, 0, 3]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 1.0), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      panel.position.set(lx, 5.4, 0);
      this.scene.add(panel);
      const light = new THREE.PointLight(0xffffff, 0.5, 8);
      light.position.set(lx, 5.1, 0);
      this.scene.add(light);
    }

    // Lighting
    for (const light of this.lights) {
      if (light.isDirectionalLight) {
        light.intensity = 0.8;
        light.position.set(2, 10, 6);
        light.castShadow = true;
      }
      if (light.isAmbientLight) light.intensity = 0.45;
    }

    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 0.8, -4.5), size: new THREE.Vector3(5.6, 1.4, 1.5) });
    return this.scene;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Redesigned episode scenes — variety show, obstacle course, award stage
// ─────────────────────────────────────────────────────────────────────────────

class VarietyStageScene extends SceneBase {
  constructor() {
    super('ERScene');
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x101725);
    this.scene.fog = new THREE.Fog(0x101725, 16, 42);

    const floorTex = createCheckerTexture('#ffe45e', '#38d0c8');
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 22),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.72, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(28, 10, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x172034, roughness: 0.82 })
    );
    backWall.position.set(0, 5, -7.6);
    this.scene.add(backWall);

    const curtainMat = new THREE.MeshStandardMaterial({ color: 0xd13f4a, roughness: 0.92 });
    for (const sx of [-12.4, 12.4]) {
      const curtain = new THREE.Mesh(new THREE.BoxGeometry(2.1, 9.4, 0.5), curtainMat);
      curtain.position.set(sx, 4.7, -7.28);
      curtain.castShadow = true;
      this.scene.add(curtain);
      for (let i = 0; i < 5; i++) {
        const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9.2, 12), curtainMat);
        fold.position.set(sx - 0.7 + i * 0.35, 4.7, -6.95);
        fold.castShadow = true;
        this.scene.add(fold);
      }
    }

    addTextPlane(this.scene, '猴王不许笑', {
      position: [0, 5.05, -7.28],
      width: 6.0,
      height: 1.25,
      texture: { width: 768, height: 180, background: '#0b1020', color: '#ffef73', accent: '#ff4f86', fontSize: 74 },
    });
    addTextPlane(this.scene, ['严肃一秒', '扣三分'], {
      position: [-6.3, 3.2, -7.24],
      width: 2.3,
      height: 1.28,
      texture: { background: '#1f2937', color: '#ffffff', accent: '#38d0c8', fontSize: 44 },
    });
    addTextPlane(this.scene, ['笑场', '也扣三分'], {
      position: [6.3, 3.2, -7.24],
      width: 2.3,
      height: 1.28,
      texture: { background: '#2b1838', color: '#ffffff', accent: '#ffe45e', fontSize: 44 },
    });

    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(5.4, 5.7, 0.45, 72),
      new THREE.MeshStandardMaterial({ color: 0x2a2f45, roughness: 0.64 })
    );
    stage.position.set(0, 0.23, -1.4);
    stage.castShadow = true;
    stage.receiveShadow = true;
    this.scene.add(stage);

    const runway = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.08, 6.6),
      new THREE.MeshStandardMaterial({ color: 0xff77a8, roughness: 0.7 })
    );
    runway.position.set(0, 0.51, 1.8);
    runway.castShadow = true;
    runway.receiveShadow = true;
    this.scene.add(runway);

    const podiumColors = [0xffffff, 0xffb347, 0x63d2ff, 0x9b5de5, 0xb8d4e3];
    const labels = ['白', '闻', '力', '凶', '猕'];
    for (let i = 0; i < 5; i++) {
      const x = -4.8 + i * 2.4;
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.68, 0.12, 32),
        new THREE.MeshStandardMaterial({ color: podiumColors[i], roughness: 0.55 })
      );
      disc.position.set(x, 0.62, 0.6);
      disc.castShadow = true;
      disc.receiveShadow = true;
      this.scene.add(disc);
      const buzzer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.25, 0.16, 20),
        new THREE.MeshStandardMaterial({ color: 0xff365d, roughness: 0.45 })
      );
      buzzer.position.set(x, 0.86, -0.3);
      buzzer.castShadow = true;
      this.scene.add(buzzer);
      addTextPlane(this.scene, labels[i], {
        position: [x, 0.93, 0.6],
        rotation: [-Math.PI / 2, 0, 0],
        width: 0.58,
        height: 0.32,
        texture: { width: 160, height: 96, background: '#111827', color: '#ffffff', accent: '#111827', fontSize: 56, border: false },
      });
    }

    const trophyBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.7, 0.72, 32),
      new THREE.MeshStandardMaterial({ color: 0x3b2f1f, roughness: 0.58 })
    );
    trophyBase.position.set(0, 0.86, -4.45);
    trophyBase.castShadow = true;
    this.scene.add(trophyBase);
    const goldBanana = createBananaProp(0.78, 0xffd700);
    goldBanana.position.set(0, 1.38, -4.45);
    goldBanana.rotation.y = 0.25;
    this.scene.add(goldBanana);
    addTextPlane(this.scene, '金香蕉', {
      position: [0, 0.95, -3.84],
      width: 1.15,
      height: 0.34,
      texture: { width: 256, height: 92, background: '#3b2f1f', color: '#ffef73', accent: '#3b2f1f', fontSize: 42, border: false },
    });

    const cameraGroup = new THREE.Group();
    cameraGroup.position.set(7.0, 0.6, 2.1);
    const cameraBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.45, 0.55), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 }));
    cameraBody.castShadow = true;
    cameraGroup.add(cameraBody);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.34, 20), new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.35 }));
    lens.rotation.x = Math.PI / 2;
    lens.position.z = -0.42;
    lens.castShadow = true;
    cameraGroup.add(lens);
    for (const sx of [-0.3, 0.3]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      leg.rotation.z = sx * 0.22;
      leg.position.set(sx, -0.7, 0.1);
      cameraGroup.add(leg);
    }
    cameraGroup.rotation.y = -0.7;
    this.scene.add(cameraGroup);

    for (const [x, z, c] of [[-7.5, 2.7, 0xffe45e], [-6.7, 4.0, 0x38d0c8], [6.7, 4.0, 0xff77a8], [7.6, 2.8, 0x9b5de5]]) {
      const prop = createBananaProp(0.36, c);
      prop.position.set(x, 0.55, z);
      prop.rotation.y = x > 0 ? -0.8 : 0.8;
      this.scene.add(prop);
    }

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x2f3548, roughness: 0.4, metalness: 0.35 });
    for (const [x, color] of [[-4.5, 0xffe45e], [0, 0x38d0c8], [4.5, 0xff77a8]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.14), trussMat);
      bar.position.set(x, 5.75, 2.7);
      this.scene.add(bar);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshBasicMaterial({ color }));
      bulb.position.set(x, 5.35, 0.6);
      this.scene.add(bulb);
    }

    for (const light of this.lights) {
      if (light.isDirectionalLight) {
        light.intensity = 0.7;
        light.position.set(4, 10, 8);
        light.castShadow = true;
      }
      if (light.isAmbientLight) light.intensity = 0.35;
    }
    for (const [x, color] of [[-4, 0xffe45e], [0, 0xffffff], [4, 0xff77a8]]) {
      const spot = new THREE.SpotLight(color, 2.2, 24, Math.PI / 5, 0.45, 1.1);
      spot.position.set(x, 7.2, 4.5);
      spot.target.position.set(x * 0.25, 1, -1.0);
      spot.castShadow = true;
      this.scene.add(spot);
      this.scene.add(spot.target);
    }

    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 0.6, -1.4), size: new THREE.Vector3(11.0, 0.7, 11.0) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 1.0, -4.45), size: new THREE.Vector3(1.6, 1.3, 1.4) });
    return this.scene;
  }
}

class BananaObstacleScene extends SceneBase {
  constructor() {
    super('HospitalCorridorScene');
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x8fd7ff);
    this.scene.fog = new THREE.Fog(0x8fd7ff, 22, 54);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 9),
      new THREE.MeshStandardMaterial({ color: 0x262a3f, roughness: 0.72 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const lane = new THREE.Mesh(
      new THREE.BoxGeometry(34, 0.08, 3.5),
      new THREE.MeshStandardMaterial({ color: 0xffe45e, roughness: 0.7 })
    );
    lane.position.set(0, 0.06, 0);
    lane.receiveShadow = true;
    this.scene.add(lane);

    for (let x = -14; x <= 14; x += 4) {
      addTextPlane(this.scene, '>>>', {
        position: [x, 0.12, 0],
        rotation: [-Math.PI / 2, 0, 0],
        width: 1.4,
        height: 0.52,
        texture: { width: 256, height: 96, background: '#ffe45e', color: '#222222', accent: '#ffe45e', fontSize: 54, border: false },
      });
    }

    const railMat = new THREE.MeshStandardMaterial({ color: 0xff77a8, roughness: 0.55 });
    for (const z of [-2.15, 2.15]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(34, 0.2, 0.18), railMat);
      rail.position.set(0, 0.55, z);
      rail.castShadow = true;
      this.scene.add(rail);
      for (let x = -16; x <= 16; x += 4) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 12), railMat);
        post.position.set(x, 0.45, z);
        post.castShadow = true;
        this.scene.add(post);
      }
    }

    for (const [x, text, color] of [[-13.7, '入口', 0x38d0c8], [13.7, '出口', 0xff77a8]]) {
      const archMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
      for (const z of [-2.2, 2.2]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.9, 0.32), archMat);
        pillar.position.set(x, 1.45, z);
        pillar.castShadow = true;
        this.scene.add(pillar);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 4.8), archMat);
      beam.position.set(x, 2.85, 0);
      beam.castShadow = true;
      this.scene.add(beam);
      addTextPlane(this.scene, text, {
        position: [x + (x < 0 ? 0.24 : -0.24), 2.92, 0],
        rotation: [0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0],
        width: 1.18,
        height: 0.42,
        texture: { width: 256, height: 96, background: '#111827', color: '#ffffff', accent: '#111827', fontSize: 44, border: false },
      });
    }

    addTextPlane(this.scene, ['香蕉滑道', '摔得优雅加分'], {
      position: [-6.2, 3.1, -2.82],
      width: 3.8,
      height: 1.05,
      texture: { background: '#0b1020', color: '#ffef73', accent: '#38d0c8', fontSize: 48 },
    });
    addTextPlane(this.scene, ['禁止解释', '越解释越滑'], {
      position: [5.8, 3.1, 2.82],
      rotation: [0, Math.PI, 0],
      width: 3.35,
      height: 1.05,
      texture: { background: '#341b45', color: '#ffffff', accent: '#ff77a8', fontSize: 48 },
    });

    for (const [x, z, c, label] of [
      [-9.5, 0.9, 0x38d0c8, '慢'],
      [-5.8, -0.9, 0xff77a8, '稳'],
      [-1.8, 1.1, 0x9b5de5, '别'],
      [2.6, -1.0, 0x65d46e, '慌'],
      [7.0, 0.95, 0xffa43b, '冲'],
    ]) {
      addFoamBumper(this.scene, x, z, c, label);
    }

    for (const [x, z, s, rot] of [[-7.2, -0.25, 0.75, 0.4], [-3.4, 0.65, 0.62, -0.6], [1.0, -0.3, 0.82, 0.1], [5.1, 0.55, 0.68, -0.35], [10.2, -0.4, 0.9, 0.5]]) {
      const banana = createBananaProp(s, 0xffdf3d);
      banana.position.set(x, 0.68, z);
      banana.rotation.y = rot;
      this.scene.add(banana);
    }

    const hoopMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
    for (const [x, color] of [[-4.2, 0x38d0c8], [4.2, 0xff77a8]]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.055, 12, 36), hoopMat);
      hoop.position.set(x, 1.25, 0);
      hoop.rotation.y = Math.PI / 2;
      hoop.castShadow = true;
      this.scene.add(hoop);
      const ringLight = new THREE.PointLight(color, 0.6, 5);
      ringLight.position.set(x, 1.5, 0);
      this.scene.add(ringLight);
    }

    const fanGroup = new THREE.Group();
    fanGroup.position.set(11.2, 1.15, 2.75);
    fanGroup.rotation.y = Math.PI;
    const fanBody = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.22, 32), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 }));
    fanBody.rotation.x = Math.PI / 2;
    fanGroup.add(fanBody);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.035), new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.4 }));
      blade.position.y = 0.22;
      blade.rotation.z = i * Math.PI / 2;
      fanGroup.add(blade);
    }
    this.scene.add(fanGroup);

    for (const light of this.lights) {
      if (light.isDirectionalLight) {
        light.intensity = 1.0;
        light.position.set(-4, 11, 7);
        light.castShadow = true;
      }
      if (light.isAmbientLight) light.intensity = 0.55;
    }

    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 0.3, 0), size: new THREE.Vector3(34, 0.3, 3.5) });
    return this.scene;
  }
}

class GoldenBananaAwardScene extends SceneBase {
  constructor() {
    super('ReceptionScene');
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0x22182f);
    this.scene.fog = new THREE.Fog(0x22182f, 16, 40);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 15),
      new THREE.MeshStandardMaterial({ color: 0x1b2434, roughness: 0.68 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const carpet = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.05, 10),
      new THREE.MeshStandardMaterial({ color: 0xff4f86, roughness: 0.8 })
    );
    carpet.position.set(0, 0.04, 0.4);
    carpet.receiveShadow = true;
    this.scene.add(carpet);

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(20, 8.5, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x141827, roughness: 0.85 })
    );
    backWall.position.set(0, 4.25, -6.6);
    this.scene.add(backWall);
    const curtainMat = new THREE.MeshStandardMaterial({ color: 0x7b2cbf, roughness: 0.92 });
    for (let i = 0; i < 9; i++) {
      const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8.3, 16), curtainMat);
      fold.position.set(-8 + i * 2, 4.2, -6.48);
      fold.castShadow = true;
      this.scene.add(fold);
    }

    addTextPlane(this.scene, ['最佳翻车奖', '全员冠军'], {
      position: [0, 5.0, -6.18],
      width: 5.8,
      height: 1.55,
      texture: { width: 768, height: 240, background: '#0b1020', color: '#ffef73', accent: '#ff77a8', fontSize: 64 },
    });
    addTextPlane(this.scene, ['获奖感言', '禁止说香蕉'], {
      position: [-6.2, 3.0, -6.12],
      width: 2.9,
      height: 1.2,
      texture: { background: '#23324a', color: '#ffffff', accent: '#38d0c8', fontSize: 44 },
    });
    addTextPlane(this.scene, ['当前违规', '五次'], {
      position: [6.2, 3.0, -6.12],
      width: 2.7,
      height: 1.2,
      texture: { background: '#3b1735', color: '#ffffff', accent: '#ffe45e', fontSize: 44 },
    });

    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 5.0, 0.5, 72),
      new THREE.MeshStandardMaterial({ color: 0x2f4057, roughness: 0.58 })
    );
    stage.position.set(0, 0.25, -1.5);
    stage.castShadow = true;
    stage.receiveShadow = true;
    this.scene.add(stage);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.78, 0.9, 32),
      new THREE.MeshStandardMaterial({ color: 0xf7c948, roughness: 0.42, metalness: 0.18 })
    );
    pedestal.position.set(0, 0.95, -3.7);
    pedestal.castShadow = true;
    this.scene.add(pedestal);
    const mic = createBananaProp(0.88, 0xffdf3d);
    mic.position.set(0, 1.6, -3.7);
    mic.rotation.y = -0.25;
    this.scene.add(mic);
    const micHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.38 })
    );
    micHandle.position.set(0.55, 1.37, -3.7);
    micHandle.rotation.z = 0.9;
    micHandle.castShadow = true;
    this.scene.add(micHandle);

    const podiumMats = [
      [-4.6, -0.2, '#ffffff', '冷面'],
      [-2.2, 0.35, '#ffb347', '鼻子'],
      [0.0, 0.65, '#63d2ff', '大力'],
      [2.2, 0.35, '#9b5de5', '眼神'],
      [4.6, -0.2, '#b8d4e3', '尖叫'],
    ];
    for (const [x, z, color, text] of podiumMats) {
      const block = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.82, 0.25, 28),
        new THREE.MeshStandardMaterial({ color, roughness: 0.64 })
      );
      block.position.set(x, 0.62, z);
      block.castShadow = true;
      block.receiveShadow = true;
      this.scene.add(block);
      addTextPlane(this.scene, text, {
        position: [x, 0.78, z],
        rotation: [-Math.PI / 2, 0, 0],
        width: 0.9,
        height: 0.34,
        texture: { width: 256, height: 96, background: '#111827', color: '#ffffff', accent: '#111827', fontSize: 40, border: false },
      });
    }

    const confettiColors = [0xffe45e, 0xff77a8, 0x38d0c8, 0x9b5de5, 0xffffff];
    for (let i = 0; i < 70; i++) {
      const piece = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.025, 0.18),
        new THREE.MeshBasicMaterial({ color: confettiColors[i % confettiColors.length] })
      );
      piece.position.set(-8 + Math.random() * 16, 1.4 + Math.random() * 5.4, -5.2 + Math.random() * 8.5);
      piece.rotation.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU);
      this.scene.add(piece);
    }

    for (const [x, z, color] of [[-7.2, 2.6, 0x38d0c8], [7.2, 2.6, 0xff77a8], [-6.6, -3.4, 0xffe45e], [6.6, -3.4, 0x9b5de5]]) {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 18, 18),
        new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 })
      );
      ball.position.set(x, 0.35, z);
      ball.castShadow = true;
      this.scene.add(ball);
    }

    for (const light of this.lights) {
      if (light.isDirectionalLight) {
        light.intensity = 0.75;
        light.position.set(4, 10, 6);
        light.castShadow = true;
      }
      if (light.isAmbientLight) light.intensity = 0.38;
    }
    for (const [x, color] of [[-4, 0x38d0c8], [0, 0xffffff], [4, 0xff77a8]]) {
      const spot = new THREE.SpotLight(color, 2.5, 24, Math.PI / 5.5, 0.45, 1.0);
      spot.position.set(x, 7.5, 5.2);
      spot.target.position.set(x * 0.18, 1.0, -1.5);
      spot.castShadow = true;
      this.scene.add(spot);
      this.scene.add(spot.target);
    }

    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 0.6, -1.5), size: new THREE.Vector3(10.0, 0.7, 9.6) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 1.2, -3.7), size: new THREE.Vector3(1.8, 1.8, 1.8) });
    return this.scene;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MonkeyCharacter base — expressive monkey rig
// ─────────────────────────────────────────────────────────────────────────────

class MonkeyCharacter extends CharacterBase {
  static get furColor() { return 0x888888; }
  static get skinColor() { return 0xdca982; }
  static get suitColor() { return 0x556677; }
  static get height() { return 1.35; }
  static get armScale() { return 1.0; }
  static get shoulderWidth() { return 1.0; }
  static get bellyScale() { return 1.0; }
  static get hasTail() { return true; }
  static get legScale() { return 1.0; }

  constructor(name) {
    super(name);
    this.archetypes = ['humanoid', 'monkey', 'round'];
    this.boundingRadius = 0.55;
    this.baseY = 0.01;
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'LookAround', 'PointForward', 'CrossArms',
      'Nod', 'WaveHand', 'HandsOnHips', 'Celebrate', 'ReachOut',
      'TurnAround', 'Bow', 'FightingStance', 'Crouch',
      'Sniff', 'NoseTwitch', 'Intimidate', 'Flex', 'Facepalm',
      'OpenFridge', 'HoldBelly', 'Confess', 'ShakeFist', 'SweatDrop',
      'Gasp', 'Stare', 'StepBack', 'SlowNod', 'SniffWalk',
      'OrangutanWalk', 'MandrillStrut', 'HatTip', 'MagnifyInspect',
      'DramaticPose', 'PanicWave', 'Shrug', 'NervousLaugh',
      'MonkeyWave', 'ScratchBelly', 'JumpExcited', 'InspectGlass', 'TailFlick',
      'MonkeyCross',
    ]);
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.leftPupil) {
      this.leftPupil.position.x = this.leftPupil.userData.baseX ?? 0;
      this.leftPupil.position.y = this.leftPupil.userData.baseY ?? 0;
    }
    if (this.rightPupil) {
      this.rightPupil.position.x = this.rightPupil.userData.baseX ?? 0;
      this.rightPupil.position.y = this.rightPupil.userData.baseY ?? 0;
    }
  }

  // Subtle idle motion so monkeys don't freeze into statues between animations.
  _updateIdle(time) {
    const t = time * 2.0;
    if (this.mesh) {
      this.mesh.position.y = this.baseY + Math.sin(t) * 0.004;
    }
    if (this.leftClavicle) {
      this.leftClavicle.rotation.z = Math.sin(t * 0.7 + 0.5) * 0.02;
    }
    if (this.rightClavicle) {
      this.rightClavicle.rotation.z = Math.sin(t * 0.7 + 2.5) * 0.02;
    }
    // Arms hang slightly forward and outward so they don't clip into the round belly.
    if (this.rightArm && !this._actionMatrix?.currentAction) {
      this.rightArm.rotation.x = -0.25 + Math.sin(t * 0.55 + 0.3) * 0.04;
      this.rightArm.rotation.y = 0.10 + Math.sin(t * 0.45 + 0.2) * 0.03;
    }
    if (this.leftArm && !this._actionMatrix?.currentAction) {
      this.leftArm.rotation.x = -0.25 + Math.sin(t * 0.55 + 0.3) * 0.04;
      this.leftArm.rotation.y = -0.10 - Math.sin(t * 0.45 + 0.2) * 0.03;
    }
    if (this.tail) {
      this.tail.rotation.y = Math.sin(time * 1.8) * 0.18;
      this.tail.rotation.z = Math.sin(time * 2.4 + 1.0) * 0.06;
    }
    if (this.headGroup) {
      this.headGroup.rotation.x = Math.sin(t * 0.6) * 0.015;
      this.headGroup.rotation.y = Math.sin(t * 0.35) * 0.03;
    }
  }

  // 屏蔽调试关节标记，避免渲染出漂浮的黄点
  createJointMarkers() {
    this.removeJointMarkers();
  }

  // Override engine eye tracking with much smaller pupil shifts so the pupil never
  // leaves the sclera and never looks like a floating dot.
  updateEyeTracking(time, delta = 0.016) {
    if (!this.headGroup) return;

    // Hide the eyes when the camera is looking at the back of the head.
    // This prevents eyeballs from appearing to float in the sky when a character
    // turns away from the camera.
    const cam = (typeof window !== 'undefined' && window.__dulaCamera) ? window.__dulaCamera : null;
    if (cam) {
      const headPos = new THREE.Vector3();
      this.headGroup.getWorldPosition(headPos);
      const toCam = new THREE.Vector3().subVectors(cam.position, headPos).normalize();
      const headForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.headGroup.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const facingCamera = toCam.dot(headForward) > 0.05;
      if (this.leftEyeGroup) this.leftEyeGroup.visible = facingCamera;
      if (this.rightEyeGroup) this.rightEyeGroup.visible = facingCamera;
    }

    // Return to neutral when not actively tracking.
    if (!this.eyeTracking.active || time < this.eyeTracking.startTime || time > this.eyeTracking.endTime) {
      const returnSpeed = 4 * delta;
      this.headGroup.rotation.y += (0 - this.headGroup.rotation.y) * returnSpeed;
      this.headGroup.rotation.x += (0 - this.headGroup.rotation.x) * returnSpeed;
      if (Math.abs(this.headGroup.rotation.y) < 0.002) this.headGroup.rotation.y = 0;
      if (Math.abs(this.headGroup.rotation.x) < 0.002) this.headGroup.rotation.x = 0;
      return;
    }

    const headWorldPos = new THREE.Vector3();
    this.headGroup.getWorldPosition(headWorldPos);
    const target = this.eyeTracking.target;

    const dx = target.x - headWorldPos.x;
    const dy = target.y - headWorldPos.y;
    const dz = target.z - headWorldPos.z;

    const distXZ = Math.sqrt(dx * dx + dz * dz);
    let yaw = Math.atan2(dx, dz) - this.mesh.rotation.y;
    let pitch = -Math.atan2(dy, distXZ);

    while (yaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw < -Math.PI) yaw += Math.PI * 2;

    const maxYaw = 0.5;
    const maxPitch = 0.3;
    const targetYaw = Math.max(-maxYaw, Math.min(maxYaw, yaw));
    const targetPitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

    const smooth = 6 * delta;
    this.headGroup.rotation.y += (targetYaw - this.headGroup.rotation.y) * smooth;
    this.headGroup.rotation.x += (targetPitch - this.headGroup.rotation.x) * smooth;

    // Very small pupil shift so the black dot stays well inside the white eye.
    const maxShiftX = 0.009;
    const maxShiftY = 0.006;
    const pupilShiftX = Math.max(-maxShiftX, Math.min(maxShiftX, yaw * 0.015));
    const pupilShiftY = Math.max(-maxShiftY, Math.min(maxShiftY, pitch * 0.012));

    if (this.leftPupil) {
      const baseX = this.leftPupil.userData.baseX ?? 0;
      const baseY = this.leftPupil.userData.baseY ?? 0;
      this.leftPupil.position.x = baseX + pupilShiftX;
      this.leftPupil.position.y = baseY + pupilShiftY;
    }
    if (this.rightPupil) {
      const baseX = this.rightPupil.userData.baseX ?? 0;
      const baseY = this.rightPupil.userData.baseY ?? 0;
      this.rightPupil.position.x = baseX + pupilShiftX;
      this.rightPupil.position.y = baseY + pupilShiftY;
    }
  }

  // Override engine blink so the flattened pupil keeps its Z scale and never
  // pops out as a sphere during/after a blink.
  _applyBlink(factor) {
    const baseScale = this.leftPupil?.userData.baseScale;
    const sx = baseScale ? baseScale.x : 1;
    const sy = baseScale ? baseScale.y : 1;
    const sz = baseScale ? baseScale.z : 1;
    const shrink = 1 - factor * 0.25;

    if (this.leftEyelid) {
      this.leftEyelid.visible = factor >= 0.05;
      if (this.leftEyelid.visible) this.leftEyelid.scale.y = 1 - factor * 0.95;
    }
    if (this.rightEyelid) {
      this.rightEyelid.visible = factor >= 0.05;
      if (this.rightEyelid.visible) this.rightEyelid.scale.y = 1 - factor * 0.95;
    }
    if (this.leftPupil) {
      this.leftPupil.scale.set(sx * shrink, sy * shrink, sz * shrink);
    }
    if (this.rightPupil) {
      this.rightPupil.scale.set(sx * shrink, sy * shrink, sz * shrink);
    }
  }

  build() {
    const furColor = this.constructor.furColor;
    const skinColor = this.constructor.skinColor;
    const suitColor = this.constructor.suitColor;
    const h = this.constructor.height;
    const armScale = this.constructor.armScale;
    const shoulderWidth = this.constructor.shoulderWidth;
    const bellyScale = this.constructor.bellyScale;
    const legScale = this.constructor.legScale;

    const furMat = createFurMaterial(furColor);
    const skinMat = createSkinMaterial(skinColor);
    const clothMat = createClothMaterial(suitColor);

    // Torso: pear-shaped sphere for organic monkey body
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.29 * bellyScale, 24, 24), furMat);
    torso.scale.set(shoulderWidth * 0.9, 1.12, 0.82);
    torso.position.y = h * 0.52;
    torso.castShadow = true;
    this.mesh.add(torso);
    this.torso = torso;

    // Belly patch (lighter, rounded)
    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(0.24 * bellyScale, 20, 20),
      skinMat
    );
    belly.scale.set(1, 1.22, 0.55);
    belly.position.set(0, h * 0.47, 0.16 * bellyScale);
    this.mesh.add(belly);

    // Rounded lab coat / vest wrap — soft ellipsoid instead of open cylinder
    const coat = new THREE.Mesh(
      new THREE.SphereGeometry(0.28 * Math.max(shoulderWidth, bellyScale), 24, 24),
      clothMat
    );
    coat.scale.set(shoulderWidth * 0.82, 0.58, 0.68);
    coat.position.set(0, h * 0.63, 0.02);
    coat.castShadow = true;
    this.mesh.add(coat);

    // Coat buttons / detail
    for (let b = 0; b < 2; b++) {
      const button = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0.3 })
      );
      button.position.set(0, h * (0.58 + b * 0.08), 0.27 * bellyScale);
      this.mesh.add(button);
    }

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12), skinMat);
    neck.position.y = h * 0.78;
    this.mesh.add(neck);

    // Head group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, h * 0.86, 0);
    this.mesh.add(this.headGroup);

    this.buildHead(this.headGroup, furMat, skinMat, clothMat);

    // Arms and legs
    this.addArms(furMat, skinMat, clothMat, h, armScale, shoulderWidth);
    this.addLegs(furMat, skinMat, clothMat, h, legScale);

    // Tail
    if (this.constructor.hasTail) {
      this.tail = this._createTail(furMat, h);
    }

    this._captureFaceBaseState();
  }

  addArms(furMat, skinMat, clothMat, h, armScale, shoulderWidth) {
    const upperLen = 0.28 * armScale;
    const lowerLen = 0.26 * armScale;

    const addArm = (clavicleX, clavicleY, clavicleZ, shoulderX, shoulderY, shoulderZ, isRight) => {
      const clavicleGroup = new THREE.Group();
      clavicleGroup.position.set(clavicleX, clavicleY, clavicleZ);

      const shoulderGroup = new THREE.Group();
      shoulderGroup.position.set(shoulderX, shoulderY, shoulderZ);
      clavicleGroup.add(shoulderGroup);

      const armPivot = new THREE.Group();
      armPivot.rotation.x = Math.PI / 2;
      shoulderGroup.add(armPivot);

      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.095 * armScale, upperLen, 8, 12),
        furMat
      );
      upperArm.rotation.x = -Math.PI / 2;
      upperArm.position.z = upperLen / 2;
      upperArm.castShadow = true;
      armPivot.add(upperArm);

      // Rounded sleeve cuff instead of open-ended cylinder
      const sleeve = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.11 * armScale, upperLen * 0.25, 8, 12),
        clothMat
      );
      sleeve.rotation.x = -Math.PI / 2;
      sleeve.position.z = upperLen * 0.16;
      sleeve.castShadow = true;
      armPivot.add(sleeve);

      // Fur tuft at shoulder to break hard edge
      const shoulderTuft = new THREE.Mesh(
        new THREE.SphereGeometry(0.09 * armScale, 10, 10),
        furMat
      );
      shoulderTuft.scale.set(1, 0.8, 0.7);
      shoulderTuft.position.set(0, 0, -0.04);
      armPivot.add(shoulderTuft);

      const elbowGroup = new THREE.Group();
      elbowGroup.position.z = upperLen + 0.01;
      armPivot.add(elbowGroup);

      const elbowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.075 * armScale, 10, 10), furMat);
      elbowGroup.add(elbowMesh);

      const elbowTwistGroup = new THREE.Group();
      elbowGroup.add(elbowTwistGroup);

      const forearm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.085 * armScale, lowerLen, 8, 12),
        skinMat
      );
      forearm.rotation.x = -Math.PI / 2;
      forearm.position.z = lowerLen / 2;
      forearm.castShadow = true;
      elbowTwistGroup.add(forearm);

      const wristGroup = new THREE.Group();
      wristGroup.position.z = lowerLen + 0.03;
      elbowTwistGroup.add(wristGroup);

      // Rounded paw hand
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 * armScale, 12, 12),
        skinMat
      );
      hand.scale.set(1.1, 0.8, 1.3);
      hand.position.z = 0.04;
      hand.castShadow = true;
      wristGroup.add(hand);

      // Fingers
      for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.014 * armScale, 0.06 * armScale, 4, 8),
          skinMat
        );
        const fAngle = (f - 1.5) * 0.3;
        finger.position.set(Math.sin(fAngle) * 0.045, -0.02, 0.09 + Math.cos(fAngle) * 0.02);
        finger.rotation.x = Math.PI / 2;
        finger.rotation.y = fAngle;
        wristGroup.add(finger);
      }

      this.mesh.add(clavicleGroup);
      if (isRight) {
        this.rightClavicle = clavicleGroup;
        this.rightArm = shoulderGroup;
        this.rightElbow = elbowGroup;
        this.rightElbowTwist = elbowTwistGroup;
        this.rightWrist = wristGroup;
        this.rightArmLength = upperLen + lowerLen;
      } else {
        this.leftClavicle = clavicleGroup;
        this.leftArm = shoulderGroup;
        this.leftElbow = elbowGroup;
        this.leftElbowTwist = elbowTwistGroup;
        this.leftWrist = wristGroup;
        this.leftArmLength = upperLen + lowerLen;
      }
    };

    // Wider shoulder placement to reduce clipping
    const sx = 0.22 * shoulderWidth;
    addArm(-sx * 0.4, h * 0.74, 0.04, -sx, -0.04, -0.04, false);
    addArm(sx * 0.4, h * 0.74, 0.04, sx, -0.04, -0.04, true);
  }

  addLegs(furMat, skinMat, clothMat, h, legScale) {
    const thighLen = 0.22 * legScale;
    const shinLen = 0.22 * legScale;
    for (const side of [-1, 1]) {
      const hipGroup = new THREE.Group();
      hipGroup.position.set(side * 0.13, h * 0.34, 0);

      const thigh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.105, thighLen, 8, 12),
        furMat
      );
      thigh.position.y = -thighLen / 2;
      thigh.castShadow = true;
      hipGroup.add(thigh);

      // Rounded shorts / pants cuff instead of open cylinder
      const pants = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.115, thighLen * 0.35, 8, 12),
        clothMat
      );
      pants.position.y = -thighLen * 0.22;
      pants.castShadow = true;
      hipGroup.add(pants);

      // Fur tuft at hip
      const hipTuft = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 10),
        furMat
      );
      hipTuft.scale.set(0.8, 0.6, 0.8);
      hipTuft.position.set(side * 0.08, -0.02, -0.05);
      hipGroup.add(hipTuft);

      const kneeGroup = new THREE.Group();
      kneeGroup.position.set(0, -thighLen, 0.03);
      hipGroup.add(kneeGroup);

      const kneeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), furMat);
      kneeMesh.scale.set(1, 0.7, 0.6);
      kneeGroup.add(kneeMesh);

      const shin = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.085, shinLen, 8, 12),
        furMat
      );
      shin.position.y = -shinLen / 2;
      shin.castShadow = true;
      kneeGroup.add(shin);

      const ankleGroup = new THREE.Group();
      ankleGroup.position.y = -shinLen;
      kneeGroup.add(ankleGroup);

      // Rounded monkey foot
      const foot = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        skinMat
      );
      foot.scale.set(1, 0.55, 1.6);
      foot.position.set(0, -0.03, 0.06);
      foot.castShadow = true;
      ankleGroup.add(foot);

      this.mesh.add(hipGroup);
      if (side === -1) {
        this.leftLeg = hipGroup;
        this.leftKnee = kneeGroup;
        this.leftAnkle = ankleGroup;
      } else {
        this.rightLeg = hipGroup;
        this.rightKnee = kneeGroup;
        this.rightAnkle = ankleGroup;
      }
    }
  }

  _createTail(furMat, h) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.05, -0.25),
      new THREE.Vector3(0, 0.25, -0.45),
      new THREE.Vector3(0, 0.15, -0.55),
    ]);
    const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.04, 8, false), furMat);
    tailMesh.position.set(0, h * 0.45, -0.22);
    tailMesh.castShadow = true;
    this.mesh.add(tailMesh);
    return tailMesh;
  }

  // Common expressive face builder; subclasses override head shape & markings
  buildHead(headGroup, furMat, skinMat) {
    const faceColor = this.constructor.skinColor;
    const faceMat = createSkinMaterial(faceColor);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), createHeadMaterial(furMat));
    head.castShadow = true;
    headGroup.add(head);

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 24), faceMat);
    face.scale.set(0.95, 1.05, 0.6);
    face.position.set(0, -0.02, 0.1);
    headGroup.add(face);
    face.userData.isFace = true;

    this._addEyes(headGroup);
    this._addEyebrows(headGroup);
    this._addNose(headGroup);
    this._addMouth(headGroup);
    this._addEars(headGroup, furMat);
  }

  _addEyes(headGroup, pupilColor = 0x1a1008) {
    // Draw the eyes as flat discs that sit flush on the facial surface.
    // Spherical eyeballs bulge out and read as “flying” off the head, especially
    // for small or front-facing characters.
    const eyeScale = this.constructor.eyeScale ?? 1.0;
    const eyeRadius = 0.032 * eyeScale;
    const pupilRadius = 0.012 * eyeScale;
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });
    const pupilMat = new THREE.MeshStandardMaterial({ color: pupilColor, roughness: 0.6, metalness: 0.0, side: THREE.DoubleSide });

    // Locate the largest head sphere to use as a safety bound.
    let headRadius = 0.22;
    for (const child of headGroup.children) {
      if (child.geometry && child.geometry.type === 'SphereGeometry') {
        const r = child.geometry.parameters.radius * Math.max(child.scale.x, child.scale.y, child.scale.z);
        if (r > headRadius) headRadius = r;
      }
    }

    const eyeX = this.constructor.eyeX ?? 0.074;
    const eyeY = this.constructor.eyeY ?? 0.028;
    const fallbackZ = headRadius * 0.88;
    const faceZ = computeFaceSurfaceZ(headGroup, eyeX, eyeY, fallbackZ);
    const eyeZ = Math.max(faceZ + 0.003, headRadius * 0.65);

    const pupilZ = 0.002;
    const highlightZ = pupilZ + 0.001;
    const eyelidZ = 0.001;

    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * eyeX, eyeY, eyeZ);

      // Fur-colored socket ring around the eye
      const socketMat = createFurMaterial(this.constructor.furColor);
      const socket = new THREE.Mesh(
        new THREE.TorusGeometry(eyeRadius * 1.08, 0.012, 8, 24),
        socketMat
      );
      socket.position.set(0, 0, -0.001);
      eyeGroup.add(socket);

      // Flat sclera disc
      const eyeWhite = new THREE.Mesh(new THREE.CircleGeometry(eyeRadius, 24), eyeWhiteMat);
      eyeWhite.position.z = 0;
      eyeGroup.add(eyeWhite);

      // Flat pupil disc
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(pupilRadius, 16), pupilMat);
      pupil.position.set(0, 0, pupilZ);
      pupil.userData.baseX = 0;
      pupil.userData.baseY = 0;
      pupil.userData.baseScale = new THREE.Vector3(1, 1, 1);
      pupil.userData.eyeRadius = eyeRadius;
      eyeGroup.add(pupil);

      // Tiny highlight
      const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      const highlight = new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), highlightMat);
      highlight.position.set(0.009, 0.009, highlightZ);
      eyeGroup.add(highlight);

      // Curved eyelid for blinks
      const eyelidGeo = new THREE.SphereGeometry(eyeRadius * 1.15, 20, 20, 0, TAU, 0, Math.PI * 0.55);
      const eyelidMat = createFurMaterial(this.constructor.furColor);
      const eyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
      eyelid.scale.set(1.15, 1, 0.18);
      eyelid.position.set(0, 0.004, eyelidZ);
      eyelid.visible = false;
      eyeGroup.add(eyelid);

      if (side === -1) {
        this.leftPupil = pupil;
        this.leftEyelid = eyelid;
        this.leftEyeWhite = eyeWhite;
        this.leftEyeGroup = eyeGroup;
      } else {
        this.rightPupil = pupil;
        this.rightEyelid = eyelid;
        this.rightEyeWhite = eyeWhite;
        this.rightEyeGroup = eyeGroup;
      }

      headGroup.add(eyeGroup);
    }
  }

  _addEyebrows(headGroup, browColor = 0x221100) {
    const browMat = new THREE.MeshStandardMaterial({ color: browColor, roughness: 0.9 });
    const browGeo = new THREE.CapsuleGeometry(0.012, 0.12, 4, 8);
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.rotation.z = Math.PI / 2;
      brow.position.set(side * 0.095, 0.13, 0.23);
      headGroup.add(brow);
      if (side === -1) this.leftEyebrow = brow;
      else this.rightEyebrow = brow;
    }
  }

  _addNose(headGroup, noseColor = 0x111111) {
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshStandardMaterial({ color: noseColor })
    );
    nose.position.set(0, -0.03, 0.23);
    headGroup.add(nose);
  }

  _addMouth(headGroup, mouthColor = 0x552222) {
    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 16),
      new THREE.MeshStandardMaterial({ color: mouthColor, roughness: 0.6 })
    );
    mouth.position.set(0, -0.11, 0.2);
    mouth.scale.set(1.3, 0.55, 0.8);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1.3;
    this.mouthBaseScaleY = 0.55;
    this.mouthBaseScaleZ = 0.8;
  }

  _addEars(headGroup, furMat) {
    const skinMat = createSkinMaterial(this.constructor.skinColor);
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.22, 0.02, -0.02);
      earGroup.rotation.z = side * 0.2;

      const outer = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), furMat);
      outer.scale.set(1, 1.35, 0.55);
      earGroup.add(outer);

      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), skinMat);
      inner.scale.set(0.8, 1.1, 0.4);
      inner.position.set(side * 0.01, 0, 0.02);
      earGroup.add(inner);

      headGroup.add(earGroup);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Monkey variety-show cast
// ─────────────────────────────────────────────────────────────────────────────

class Bai extends MonkeyCharacter {
  static get furColor() { return 0x151515; }
  static get skinColor() { return 0xf5f5f5; }
  static get suitColor() { return 0xffffff; }
  static get height() { return 1.45; }
  static get armScale() { return 1.05; }
  static get shoulderWidth() { return 0.95; }
  static get bellyScale() { return 0.92; }

  constructor() {
    super('Bai');
    this.displayName = '白冷森';
    this.bio = '白冷森，白面僧面猴，综艺严肃担当。越想保持体面，越容易被节目规则针对。';
  }

  buildHead(headGroup, furMat, skinMat) {
    // White face mask
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 24), createHeadMaterial(furMat));
    head.castShadow = true;
    headGroup.add(head);

    const maskMat = createSkinMaterial(0xf5f5f5);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), maskMat);
    face.scale.set(0.9, 1.15, 0.7);
    face.position.set(0, 0, 0.13);
    headGroup.add(face);
    face.userData.isFace = true;

    // Doctor glasses
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.4 });
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16), frameMat);
      lens.position.set(side * 0.055, 0.04, 0.24);
      headGroup.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), frameMat);
    bridge.position.set(0, 0.04, 0.24);
    headGroup.add(bridge);

    // Fur tufts around face
    for (const side of [-1, 1]) {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), furMat);
      tuft.scale.set(1, 1.5, 0.6);
      tuft.position.set(side * 0.24, -0.05, 0.02);
      headGroup.add(tuft);
    }

    this._addEyes(headGroup, 0x1a1a1a);
    this._addEyebrows(headGroup, 0x111111);
    this._addNose(headGroup, 0x111111);

    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x331111 })
    );
    mouth.position.set(0, -0.1, 0.24);
    mouth.scale.set(1.2, 0.5, 0.8);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1.2;
    this.mouthBaseScaleY = 0.5;
    this.mouthBaseScaleZ = 0.8;

    this._addEars(headGroup, furMat);
  }
}

class Wen extends MonkeyCharacter {
  static get furColor() { return 0x8b5a3c; }
  static get skinColor() { return 0xd2a679; }
  static get suitColor() { return 0xffffff; }
  static get height() { return 1.32; }
  static get bellyScale() { return 1.25; }
  static get armScale() { return 0.92; }
  static get shoulderWidth() { return 1.05; }
  static get legScale() { return 0.88; }

  constructor() {
    super('Wen');
    this.displayName = '闻多多';
    this.bio = '闻多多，长鼻猴，气味担当。号称能闻到胜利，实际经常先闻到零食。';
  }

  buildHead(headGroup, furMat, skinMat) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 24), createHeadMaterial(furMat));
    head.castShadow = true;
    headGroup.add(head);

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), skinMat);
    face.scale.set(0.95, 1.05, 0.6);
    face.position.set(0, -0.02, 0.1);
    headGroup.add(face);
    face.userData.isFace = true;

    // Long signature nose
    const noseMat = createSkinMaterial(0xeeb888);
    const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.36, 8, 16), noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.05, 0.34);
    nose.castShadow = true;
    headGroup.add(nose);
    this.nose = nose;

    this._addEyes(headGroup, 0x221100);
    this._addEyebrows(headGroup, 0x221100);

    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x442222 })
    );
    mouth.position.set(0, -0.14, 0.22);
    mouth.scale.set(1.25, 0.55, 0.8);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1.25;
    this.mouthBaseScaleY = 0.55;
    this.mouthBaseScaleZ = 0.8;

    this._addEars(headGroup, furMat);
  }
}

class Cheng extends MonkeyCharacter {
  static get furColor() { return 0xc65d26; }
  static get skinColor() { return 0xe8b896; }
  static get suitColor() { return 0x4a90a4; }
  static get height() { return 1.42; }
  static get armScale() { return 1.25; }
  static get shoulderWidth() { return 1.05; }
  static get bellyScale() { return 0.95; }
  static get hasTail() { return false; }
  static get eyeScale() { return 1.38; }
  static get eyeX() { return 0.088; }
  static get eyeY() { return 0.048; }

  constructor() {
    super('Cheng');
    this.displayName = '橙大力';
    this.bio = '橙大力，红猩猩，体能担当。擅长把简单关卡搬成大型事故。';
  }

  build() {
    super.build();
    const furMat = createFurMaterial(this.constructor.furColor);
    for (const side of [-1, 1]) {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), furMat);
      tuft.scale.set(1.5, 1, 0.8);
      tuft.position.set(side * 0.35, this.constructor.height * 0.74, 0);
      this.mesh.add(tuft);
    }
  }

  buildHead(headGroup, furMat, skinMat) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), createHeadMaterial(furMat));
    head.castShadow = true;
    headGroup.add(head);

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), skinMat);
    face.scale.set(1.15, 1.15, 0.6);
    face.position.set(0, -0.02, 0.12);
    headGroup.add(face);
    face.userData.isFace = true;

    // Cheek pads
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), skinMat);
      cheek.scale.set(1, 1.2, 0.6);
      cheek.position.set(side * 0.16, -0.1, 0.08);
      headGroup.add(cheek);
    }

    this._addEyes(headGroup, 0x221100);
    this._addEyebrows(headGroup, 0x221100);
    this._addNose(headGroup, 0x332211);

    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x442222 })
    );
    mouth.position.set(0, -0.14, 0.2);
    mouth.scale.set(1.35, 0.6, 0.8);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1.35;
    this.mouthBaseScaleY = 0.6;
    this.mouthBaseScaleZ = 0.8;

    this._addEars(headGroup, furMat);
  }
}

class Lan extends MonkeyCharacter {
  static get furColor() { return 0x2e1a47; }
  static get skinColor() { return 0x4a3b78; }
  static get suitColor() { return 0xffffff; }
  static get height() { return 1.38; }
  static get shoulderWidth() { return 1.1; }
  static get armScale() { return 1.15; }
  static get bellyScale() { return 1.05; }

  constructor() {
    super('Lan');
    this.displayName = '蓝凶凶';
    this.bio = '蓝凶凶，山魈，气氛压制担当。长得像反派，本猴只是在认真营业。';
  }

  buildHead(headGroup, furMat, skinMat) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 24), createHeadMaterial(furMat));
    head.castShadow = true;
    headGroup.add(head);

    const faceMat = createSkinMaterial(0x4a3b78);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), faceMat);
    face.scale.set(1, 1.05, 0.6);
    face.position.set(0, -0.02, 0.12);
    headGroup.add(face);
    face.userData.isFace = true;

    // Red nose ridge
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 });
    const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.22, 8, 12), noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.04, 0.24);
    headGroup.add(nose);

    // Blue cheeks
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0x457b9d, roughness: 0.5 });
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), cheekMat);
      cheek.scale.set(0.8, 1.2, 0.5);
      cheek.position.set(side * 0.12, -0.07, 0.18);
      headGroup.add(cheek);
    }

    // Yellow brow ridges
    const browRidgeMat = new THREE.MeshStandardMaterial({ color: 0xf4d03f, roughness: 0.5 });
    for (const side of [-1, 1]) {
      const ridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.1, 4, 8), browRidgeMat);
      ridge.rotation.z = Math.PI / 2;
      ridge.position.set(side * 0.08, 0.09, 0.2);
      headGroup.add(ridge);
    }

    // White tusks
    const tuskGeo = new THREE.ConeGeometry(0.025, 0.11, 8);
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfffff0 });
    for (const side of [-1, 1]) {
      const tusk = new THREE.Mesh(tuskGeo, tuskMat);
      tusk.rotation.z = side * Math.PI / 4;
      tusk.position.set(side * 0.07, -0.2, 0.17);
      headGroup.add(tusk);
    }

    // 山魈眼睛用深琥珀色瞳孔，避免亮黄色像漂浮光点
    this._addEyes(headGroup, 0x3e2723);
    this._addEyebrows(headGroup, 0x111111);

    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x331111 })
    );
    mouth.position.set(0, -0.16, 0.21);
    mouth.scale.set(1.45, 0.65, 0.8);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1.45;
    this.mouthBaseScaleY = 0.65;
    this.mouthBaseScaleZ = 0.8;

    this._addEars(headGroup, furMat);
  }
}

class XiaoMi extends MonkeyCharacter {
  static get furColor() { return 0x8b7355; }
  static get skinColor() { return 0xe8c8a0; }
  static get suitColor() { return 0xb8d4e3; }
  static get height() { return 1.25; }
  static get bellyScale() { return 0.9; }
  static get armScale() { return 0.9; }
  static get shoulderWidth() { return 0.9; }

  constructor() {
    super('XiaoMi');
    this.displayName = '毛小猕';
    this.bio = '毛小猕，普通猕猴，临场导演兼尖叫担当。规则写得很短，临场改得很长。';
  }

  buildHead(headGroup, furMat, skinMat) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), createHeadMaterial(furMat));
    head.castShadow = true;
    headGroup.add(head);

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 24), skinMat);
    face.scale.set(0.95, 1.0, 0.6);
    face.position.set(0, -0.02, 0.1);
    headGroup.add(face);
    face.userData.isFace = true;

    // Small bandage on forehead
    const bandage = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.08, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
    );
    bandage.position.set(0, 0.12, 0.18);
    bandage.rotation.x = -0.1;
    headGroup.add(bandage);

    this._addEyes(headGroup, 0x221100);
    this._addEyebrows(headGroup, 0x221100);
    this._addNose(headGroup, 0x332211);

    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x442222 })
    );
    mouth.position.set(0, -0.1, 0.2);
    mouth.scale.set(1.15, 0.55, 0.8);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1.15;
    this.mouthBaseScaleY = 0.55;
    this.mouthBaseScaleZ = 0.8;

    this._addEars(headGroup, furMat);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Custom monkey animations
// ─────────────────────────────────────────────────────────────────────────────

class Sniff extends AnimationBase {
  constructor(options = {}) {
    super('Sniff', positiveNumber(options.duration, 2.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = Math.sin(t * TAU * 3) * 0.08;
    pose.headGroup = { rx: e, pz: 0.05 * Math.sin(t * TAU * 2) };
    pose.mesh = { rx: 0.1 };
    return pose;
  }
}

class NoseTwitch extends AnimationBase {
  constructor(options = {}) {
    super('NoseTwitch', positiveNumber(options.duration, 1.0));
  }
  update(t, character) {
    if (!character.headGroup) return;
    character.headGroup.rotation.y = Math.sin(t * TAU * 6) * 0.1;
    if (character.nose) {
      character.nose.rotation.z = Math.sin(t * TAU * 8) * 0.05;
    }
  }
}

class Intimidate extends AnimationBase {
  constructor(options = {}) {
    super('Intimidate', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = easeInOut(Math.min(1, t * 2));
    pose.mesh = { z: -0.3 * e, rx: 0.15 * e };
    pose.headGroup = { rx: -0.2 * e };
    pose.leftShoulder = { rx: -0.2 * e, rz: -0.5 * e };
    pose.rightShoulder = { rx: -0.2 * e, rz: 0.5 * e };
    pose.leftElbow = { rx: -0.5 * e };
    pose.rightElbow = { rx: -0.5 * e };
    return pose;
  }
}

class Flex extends AnimationBase {
  constructor(options = {}) {
    super('Flex', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = Math.sin(t * TAU * 2) * 0.5 + 0.5;
    pose.leftShoulder = { rx: -0.2 * e, rz: -2.0 * e };
    pose.rightShoulder = { rx: -0.2 * e, rz: 2.0 * e };
    pose.leftElbow = { rx: -1.4 * e };
    pose.rightElbow = { rx: -1.4 * e };
    return pose;
  }
}

class Facepalm extends AnimationBase {
  constructor(options = {}) {
    super('Facepalm', positiveNumber(options.duration, 1.5));
  }
  update(t, character) {
    const e = easeInOut(Math.min(1, t * 2));
    if (character.rightArm) {
      character.rightArm.rotation.set(-0.5 * e, -0.3 * e, 0.3 * e);
    }
    if (character.rightElbow) {
      character.rightElbow.rotation.x = -1.8 * e;
    }
    if (character.rightWrist) {
      character.rightWrist.rotation.x = -0.5 * e;
    }
  }
}

class OpenFridge extends AnimationBase {
  constructor(options = {}) {
    super('OpenFridge', positiveNumber(options.duration, 2.5));
  }
  update(t, character) {
    const e = easeInOut(Math.min(1, t * 1.5));
    if (character.rightArm) {
      character.rightArm.rotation.set(-0.8 * e, -0.5 * e, 0.2 * e);
    }
    if (character.rightElbow) {
      character.rightElbow.rotation.x = -1.2 * e;
    }
    const scene = character.mesh && character.mesh.parent;
    if (scene && scene.fridgeDoor) {
      scene.fridgeDoor.rotation.y = 1.2 * e;
    }
  }
}

class HoldBelly extends AnimationBase {
  constructor(options = {}) {
    super('HoldBelly', positiveNumber(options.duration, 2.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = Math.sin(t * TAU * 2) * 0.3 + 0.7;
    pose.leftShoulder = { rx: -0.5 * e, rz: -0.4 * e };
    pose.rightShoulder = { rx: -0.5 * e, rz: 0.4 * e };
    pose.leftElbow = { rx: -1.2 * e };
    pose.rightElbow = { rx: -1.2 * e };
    pose.mesh = { rz: 0.05 * Math.sin(t * TAU * 4) };
    return pose;
  }
}

class Confess extends AnimationBase {
  constructor(options = {}) {
    super('Confess', positiveNumber(options.duration, 2.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = easeInOut(Math.min(1, t * 2));
    pose.mesh = { y: -0.25 * e, rx: 0.2 * e };
    pose.headGroup = { rx: 0.4 * e };
    pose.leftShoulder = { rx: 0.2 * e, rz: -0.3 * e };
    pose.rightShoulder = { rx: 0.2 * e, rz: 0.3 * e };
    return pose;
  }
}

class ShakeFist extends AnimationBase {
  constructor(options = {}) {
    super('ShakeFist', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = Math.sin(t * TAU * 5) * 0.5 + 0.5;
    pose.rightShoulder = { rx: -0.2, rz: 0.5 + e * 0.3 };
    pose.rightElbow = { rx: -0.8 };
    pose.rightWrist = { rx: -0.3 * e };
    return pose;
  }
}

class SweatDrop extends AnimationBase {
  constructor(options = {}) {
    super('SweatDrop', positiveNumber(options.duration, 1.5));
  }
  update(t, character) {
    if (!character.headGroup) return;
    character.headGroup.rotation.z = 0.05 * Math.sin(t * TAU * 2);
    if (!character.sweatDrop) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.8 })
      );
      drop.position.set(0.18, 0.25, 0.15);
      character.headGroup.add(drop);
      character.sweatDrop = drop;
    }
    character.sweatDrop.visible = true;
    character.sweatDrop.position.y = 0.25 - t * 0.35;
    character.sweatDrop.scale.setScalar(1 - t * 0.5);
  }
}

class Gasp extends AnimationBase {
  constructor(options = {}) {
    super('Gasp', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = Math.sin(t * TAU * 1.5) * 0.5 + 0.5;
    pose.headGroup = { rx: -0.25 * e };
    pose.leftShoulder = { rx: -0.5 * e, rz: -0.3 * e };
    pose.rightShoulder = { rx: -0.5 * e, rz: 0.3 * e };
    pose.leftElbow = { rx: -1.0 * e };
    pose.rightElbow = { rx: -1.0 * e };
    return pose;
  }
}

class Stare extends AnimationBase {
  constructor(options = {}) {
    super('Stare', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    pose.headGroup = { ry: Math.sin(t * TAU * 0.5) * 0.03 };
    return pose;
  }
}

class StepBack extends AnimationBase {
  constructor(options = {}) {
    super('StepBack', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = easeInOut(Math.min(1, t * 2));
    pose.mesh = { z: 0.25 * e };
    return pose;
  }
}

class SlowNod extends AnimationBase {
  constructor(options = {}) {
    super('SlowNod', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    pose.headGroup = { rx: Math.sin(t * TAU * 1.5) * 0.12 };
    return pose;
  }
}

class LookAround extends AnimationBase {
  constructor(options = {}) {
    super('LookAround', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    pose.headGroup = { ry: Math.sin(t * TAU * 2) * 0.25 };
    return pose;
  }
}

class SniffWalk extends AnimationBase {
  constructor(options = {}) {
    super('SniffWalk', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const phase = t * TAU * 4;
    const gait = Math.sin(phase);
    pose.headGroup = { rx: 0.15 + Math.sin(t * TAU * 6) * 0.05 };
    pose.leftShoulder = { rx: -gait * 0.4 };
    pose.rightShoulder = { rx: gait * 0.4 };
    pose.leftHip = { rx: -gait * 0.35 };
    pose.rightHip = { rx: gait * 0.35 };
    pose.leftKnee = { rx: Math.max(0, gait) * 0.25 + 0.08 };
    pose.rightKnee = { rx: Math.max(0, -gait) * 0.25 + 0.08 };
    pose.mesh = { y: Math.abs(gait) * 0.03 };
    return pose;
  }
}

class OrangutanWalk extends AnimationBase {
  constructor(options = {}) {
    super('OrangutanWalk', positiveNumber(options.duration, 1.4));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const phase = t * TAU * 3;
    const gait = Math.sin(phase);
    pose.leftShoulder = { rx: -gait * 0.55, rz: -0.1 };
    pose.rightShoulder = { rx: gait * 0.55, rz: 0.1 };
    pose.leftElbow = { rx: -0.3 };
    pose.rightElbow = { rx: -0.3 };
    pose.leftHip = { rx: -gait * 0.35 };
    pose.rightHip = { rx: gait * 0.35 };
    pose.leftKnee = { rx: Math.max(0, gait) * 0.25 + 0.08 };
    pose.rightKnee = { rx: Math.max(0, -gait) * 0.25 + 0.08 };
    pose.mesh = { y: Math.abs(gait) * 0.04, rz: Math.sin(phase) * 0.04 };
    return pose;
  }
}

class MandrillStrut extends AnimationBase {
  constructor(options = {}) {
    super('MandrillStrut', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const phase = t * TAU * 3.5;
    const gait = Math.sin(phase);
    pose.leftShoulder = { rx: gait * 0.25, rz: -0.15 };
    pose.rightShoulder = { rx: -gait * 0.25, rz: 0.15 };
    pose.leftHip = { rx: -gait * 0.35 };
    pose.rightHip = { rx: gait * 0.35 };
    pose.leftKnee = { rx: Math.max(0, gait) * 0.22 + 0.08 };
    pose.rightKnee = { rx: Math.max(0, -gait) * 0.22 + 0.08 };
    pose.headGroup = { rx: -0.08 };
    pose.mesh = { y: Math.abs(gait) * 0.025 };
    return pose;
  }
}

class HatTip extends AnimationBase {
  constructor(options = {}) {
    super('HatTip', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    let e = 0;
    if (t < 0.3) e = t / 0.3;
    else if (t < 0.7) e = 1;
    else e = 1 - (t - 0.7) / 0.3;
    pose.headGroup = { rx: 0.25 * e, ry: -0.1 * e };
    pose.rightShoulder = { rx: -0.8 * e, rz: 0.4 * e };
    pose.rightElbow = { rx: -1.2 * e };
    pose.rightWrist = { rx: -0.4 * e };
    return pose;
  }
}

class MagnifyInspect extends AnimationBase {
  constructor(options = {}) {
    super('MagnifyInspect', positiveNumber(options.duration, 2.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = Math.sin(t * TAU * 1.5) * 0.5 + 0.5;
    pose.headGroup = { rx: 0.15 * e, ry: 0.1 * Math.sin(t * TAU * 2) };
    pose.rightShoulder = { rx: -0.9 * e, rz: 0.2 * e };
    pose.rightElbow = { rx: -1.0 * e };
    pose.rightWrist = { rx: -0.3 * e, ry: 0.5 * Math.sin(t * TAU * 3) };
    pose.leftShoulder = { rx: -0.2 * e, rz: -0.3 * e };
    return pose;
  }
}

class DramaticPose extends AnimationBase {
  constructor(options = {}) {
    super('DramaticPose', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = easeInOut(Math.min(1, t * 1.5));
    pose.mesh = { rx: -0.05 * e };
    pose.leftShoulder = { rx: -0.3 * e, rz: -0.6 * e };
    pose.rightShoulder = { rx: -0.3 * e, rz: 0.6 * e };
    pose.leftElbow = { rx: -0.6 * e };
    pose.rightElbow = { rx: -0.6 * e };
    pose.headGroup = { rx: -0.1 * e };
    return pose;
  }
}

class PanicWave extends AnimationBase {
  constructor(options = {}) {
    super('PanicWave', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = Math.sin(t * TAU * 6) * 0.5 + 0.5;
    pose.headGroup = { rx: -0.1 * e, ry: 0.1 * Math.sin(t * TAU * 8) };
    pose.leftShoulder = { rx: -0.6, rz: -0.8 - e * 0.3 };
    pose.rightShoulder = { rx: -0.6, rz: 0.8 + e * 0.3 };
    pose.leftElbow = { rx: -1.2 };
    pose.rightElbow = { rx: -1.2 };
    pose.mesh = { z: 0.1 * e };
    return pose;
  }
}

class Shrug extends AnimationBase {
  constructor(options = {}) {
    super('Shrug', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    let e = 0;
    if (t < 0.3) e = t / 0.3;
    else if (t < 0.7) e = 1;
    else e = 1 - (t - 0.7) / 0.3;
    pose.leftClavicle = { rz: 0.25 * e };
    pose.rightClavicle = { rz: -0.25 * e };
    pose.leftShoulder = { rz: -0.4 * e };
    pose.rightShoulder = { rz: 0.4 * e };
    pose.headGroup = { rx: -0.08 * e };
    return pose;
  }
}

class NervousLaugh extends AnimationBase {
  constructor(options = {}) {
    super('NervousLaugh', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = Math.sin(t * TAU * 4) * 0.5 + 0.5;
    pose.headGroup = { rx: 0.1 * e, ry: 0.1 * Math.sin(t * TAU * 6) };
    pose.leftShoulder = { rx: -0.3 * e, rz: -0.2 * e };
    pose.rightShoulder = { rx: -0.3 * e, rz: 0.2 * e };
    pose.leftElbow = { rx: -0.6 * e };
    pose.rightElbow = { rx: -0.6 * e };
    return pose;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Richer face expressions (override dula-assets defaults with monkey-tuned ones)
// ─────────────────────────────────────────────────────────────────────────────

class FaceProud extends AnimationBase {
  constructor() { super('FaceProud', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.02, rz: -ease * 0.2 }, right: { py: ease * 0.02, rz: ease * 0.2 } };
    pose.eyelids = { left: { visible: false, sy: 0 }, right: { visible: false, sy: 0 } };
    pose.mouth = { tension: 0.1, sx: ease * 0.15, sy: ease * 0.1 };
    pose.headGroup = { rx: -ease * 0.06, rz: -ease * 0.04 };
    return pose;
  }
}

class FaceWorried extends AnimationBase {
  constructor() { super('FaceWorried', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.025, rz: -ease * 0.45 }, right: { py: ease * 0.025, rz: ease * 0.45 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.35 }, right: { visible: true, sy: -ease * 0.35 } };
    pose.pupils = { left: { py: -ease * 0.01 }, right: { py: -ease * 0.01 } };
    pose.mouth = { tension: 0.0, sx: -ease * 0.1, sy: -ease * 0.15 };
    pose.headGroup = { rx: ease * 0.08 };
    return pose;
  }
}

class FaceScared extends AnimationBase {
  constructor() { super('FaceScared', 0.35); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.25 ? t / 0.25 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.045, rz: -ease * 0.25 }, right: { py: ease * 0.045, rz: ease * 0.25 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.2 }, right: { visible: true, sy: -ease * 0.2 } };
    pose.pupils = { left: { sx: -ease * 0.35, sy: -ease * 0.35, sz: -ease * 0.35 }, right: { sx: -ease * 0.35, sy: -ease * 0.35, sz: -ease * 0.35 } };
    pose.mouth = { tension: -0.15, sx: ease * 0.25, sy: ease * 0.5 };
    pose.headGroup = { rx: -ease * 0.12, ry: ease * 0.05 };
    return pose;
  }
}

class FaceCry extends AnimationBase {
  constructor() { super('FaceCry', 0.45); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.03, rz: -ease * 0.6 }, right: { py: ease * 0.03, rz: ease * 0.6 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.5 }, right: { visible: true, sy: -ease * 0.5 } };
    pose.pupils = { left: { py: -ease * 0.015 }, right: { py: -ease * 0.015 } };
    pose.mouth = { tension: -0.1, sx: -ease * 0.1, sy: ease * 0.35 };
    pose.headGroup = { rx: ease * 0.15 };
    return pose;
  }
}

class FaceGrin extends AnimationBase {
  constructor() { super('FaceGrin', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.02, rz: -ease * 0.35 }, right: { py: ease * 0.02, rz: ease * 0.35 } };
    pose.eyelids = { left: { visible: false, sy: 0 }, right: { visible: false, sy: 0 } };
    pose.mouth = { tension: 0.0, sx: ease * 0.3, sy: ease * 0.25 };
    pose.headGroup = { rx: -ease * 0.05 };
    return pose;
  }
}

class FaceRelaxed extends AnimationBase {
  constructor() { super('FaceRelaxed', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: 0, rz: 0 }, right: { py: 0, rz: 0 } };
    pose.eyelids = { left: { visible: false, sy: 0 }, right: { visible: false, sy: 0 } };
    pose.pupils = { left: { px: 0, py: 0 }, right: { px: 0, py: 0 } };
    pose.mouth = { tension: 0.0, sx: ease * 0.08, sy: 0 };
    pose.headGroup = { rx: -ease * 0.03 };
    return pose;
  }
}

class FaceDisgusted extends AnimationBase {
  constructor() { super('FaceDisgusted', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.015, rz: ease * 0.2 }, right: { py: ease * 0.015, rz: -ease * 0.2 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.25 }, right: { visible: true, sy: -ease * 0.25 } };
    pose.mouth = { tension: 0.15, sx: -ease * 0.1, sy: -ease * 0.1 };
    pose.headGroup = { rx: ease * 0.08, ry: -ease * 0.05 };
    return pose;
  }
}

class FaceSly extends AnimationBase {
  constructor() { super('FaceSly', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.02, rz: -ease * 0.15 }, right: { py: -ease * 0.01, rz: ease * 0.2 } };
    pose.eyelids = { left: { visible: false, sy: 0 }, right: { visible: true, sy: -ease * 0.2 } };
    pose.mouth = { tension: 0.25, sx: ease * 0.1, sy: ease * 0.1 };
    pose.headGroup = { rz: -ease * 0.07, rx: -ease * 0.03 };
    return pose;
  }
}

class FaceAnnoyed extends AnimationBase {
  constructor() { super('FaceAnnoyed', 0.35); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: -ease * 0.015, rz: ease * 0.25 }, right: { py: ease * 0.005, rz: -ease * 0.35 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.15 }, right: { visible: false, sy: 0 } };
    pose.pupils = { left: { px: ease * 0.01 }, right: { px: ease * 0.01 } };
    pose.mouth = { tension: 0.15, sx: -ease * 0.15, sy: 0 };
    pose.headGroup = { rx: ease * 0.05, ry: -ease * 0.04 };
    return pose;
  }
}

class FaceShocked extends AnimationBase {
  constructor() { super('FaceShocked', 0.3); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.25 ? t / 0.25 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.05, rz: -ease * 0.2 }, right: { py: ease * 0.05, rz: ease * 0.2 } };
    pose.eyelids = { left: { visible: false, sy: 0 }, right: { visible: false, sy: 0 } };
    pose.pupils = { left: { sx: -ease * 0.2, sy: -ease * 0.2, sz: -ease * 0.2 }, right: { sx: -ease * 0.2, sy: -ease * 0.2, sz: -ease * 0.2 } };
    pose.mouth = { tension: -0.25, sx: ease * 0.35, sy: ease * 0.55 };
    pose.headGroup = { rx: -ease * 0.1 };
    return pose;
  }
}

class FaceExcited extends AnimationBase {
  constructor() { super('FaceExcited', 0.35); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.03, rz: -ease * 0.25 }, right: { py: ease * 0.03, rz: ease * 0.25 } };
    pose.eyelids = { left: { visible: false, sy: 0 }, right: { visible: false, sy: 0 } };
    pose.pupils = { left: { sy: ease * 0.1 }, right: { sy: ease * 0.1 } };
    pose.mouth = { tension: 0.0, sx: ease * 0.35, sy: ease * 0.3 };
    pose.headGroup = { rx: -ease * 0.06 };
    return pose;
  }
}

class FaceBored extends AnimationBase {
  constructor() { super('FaceBored', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: -ease * 0.01, rz: 0 }, right: { py: -ease * 0.01, rz: 0 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.35 }, right: { visible: true, sy: -ease * 0.35 } };
    pose.pupils = { left: { py: -ease * 0.012 }, right: { py: -ease * 0.012 } };
    pose.mouth = { tension: 0.0, sx: ease * 0.05, sy: -ease * 0.1 };
    pose.headGroup = { rx: ease * 0.04 };
    return pose;
  }
}

class FaceSuspicious extends AnimationBase {
  constructor() { super('FaceSuspicious', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: -ease * 0.005, rz: ease * 0.3 }, right: { py: -ease * 0.005, rz: -ease * 0.3 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.2 }, right: { visible: true, sy: -ease * 0.2 } };
    pose.pupils = { left: { px: -ease * 0.008 }, right: { px: ease * 0.008 } };
    pose.mouth = { tension: 0.2, sx: -ease * 0.05, sy: -ease * 0.05 };
    pose.headGroup = { ry: -ease * 0.06 };
    return pose;
  }
}

class FaceEmbarrassed extends AnimationBase {
  constructor() { super('FaceEmbarrassed', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.015, rz: -ease * 0.3 }, right: { py: ease * 0.015, rz: ease * 0.3 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.25 }, right: { visible: true, sy: -ease * 0.25 } };
    pose.pupils = { left: { py: -ease * 0.01 }, right: { py: -ease * 0.01 } };
    pose.mouth = { tension: 0.0, sx: ease * 0.1, sy: ease * 0.05 };
    pose.headGroup = { rx: ease * 0.08, rz: ease * 0.04 };
    return pose;
  }
}

class FacePleading extends AnimationBase {
  constructor() { super('FacePleading', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.03, rz: -ease * 0.5 }, right: { py: ease * 0.03, rz: ease * 0.5 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.15 }, right: { visible: true, sy: -ease * 0.15 } };
    pose.pupils = { left: { py: -ease * 0.015 }, right: { py: -ease * 0.015 } };
    pose.mouth = { tension: -0.1, sx: -ease * 0.1, sy: ease * 0.25 };
    pose.headGroup = { rx: ease * 0.06 };
    return pose;
  }
}

// 剧情直接使用的标准表情（与引擎 FaceEmotionMap 对齐）
class FaceHappy extends AnimationBase {
  constructor() { super('FaceHappy', 0.35); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.025, rz: -ease * 0.3 }, right: { py: ease * 0.025, rz: ease * 0.3 } };
    pose.eyelids = { left: { visible: false, sy: 0 }, right: { visible: false, sy: 0 } };
    pose.pupils = { left: { sy: ease * 0.05 }, right: { sy: ease * 0.05 } };
    pose.mouth = { tension: 0.0, sx: ease * 0.35, sy: ease * 0.25 };
    pose.headGroup = { rx: -ease * 0.04 };
    return pose;
  }
}

class FaceSad extends AnimationBase {
  constructor() { super('FaceSad', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.025, rz: -ease * 0.55 }, right: { py: ease * 0.025, rz: ease * 0.55 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.4 }, right: { visible: true, sy: -ease * 0.4 } };
    pose.pupils = { left: { py: -ease * 0.015 }, right: { py: -ease * 0.015 } };
    pose.mouth = { tension: -0.05, sx: -ease * 0.12, sy: ease * 0.25 };
    pose.headGroup = { rx: ease * 0.08 };
    return pose;
  }
}

class FaceAngry extends AnimationBase {
  constructor() { super('FaceAngry', 0.35); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: -ease * 0.02, rz: ease * 0.45 }, right: { py: -ease * 0.02, rz: -ease * 0.45 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.25 }, right: { visible: true, sy: -ease * 0.25 } };
    pose.pupils = { left: { px: ease * 0.01 }, right: { px: ease * 0.01 } };
    pose.mouth = { tension: 0.25, sx: -ease * 0.12, sy: 0 };
    pose.headGroup = { rx: ease * 0.06, ry: -ease * 0.03 };
    return pose;
  }
}

class FaceSurprised extends AnimationBase {
  constructor() { super('FaceSurprised', 0.3); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.25 ? t / 0.25 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.05, rz: -ease * 0.15 }, right: { py: ease * 0.05, rz: ease * 0.15 } };
    pose.eyelids = { left: { visible: false, sy: 0 }, right: { visible: false, sy: 0 } };
    pose.pupils = { left: { sx: -ease * 0.25, sy: -ease * 0.25, sz: -ease * 0.25 }, right: { sx: -ease * 0.25, sy: -ease * 0.25, sz: -ease * 0.25 } };
    pose.mouth = { tension: -0.25, sx: ease * 0.3, sy: ease * 0.5 };
    pose.headGroup = { rx: -ease * 0.1 };
    return pose;
  }
}

class FaceDetermined extends AnimationBase {
  constructor() { super('FaceDetermined', 0.35); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: -ease * 0.015, rz: ease * 0.35 }, right: { py: -ease * 0.015, rz: -ease * 0.35 } };
    pose.eyelids = { left: { visible: false, sy: 0 }, right: { visible: false, sy: 0 } };
    pose.pupils = { left: { py: ease * 0.01 }, right: { py: ease * 0.01 } };
    pose.mouth = { tension: 0.15, sx: ease * 0.05, sy: -ease * 0.05 };
    pose.headGroup = { rx: -ease * 0.06, ry: ease * 0.03 };
    return pose;
  }
}

class FaceSmirk extends AnimationBase {
  constructor() { super('FaceSmirk', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.015, rz: -ease * 0.25 }, right: { py: -ease * 0.01, rz: ease * 0.2 } };
    pose.eyelids = { left: { visible: false, sy: 0 }, right: { visible: true, sy: -ease * 0.2 } };
    pose.mouth = { tension: 0.25, sx: ease * 0.15, sy: ease * 0.1 };
    pose.headGroup = { rz: -ease * 0.06, rx: -ease * 0.03 };
    return pose;
  }
}

class FaceConfused extends AnimationBase {
  constructor() { super('FaceConfused', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.02, rz: -ease * 0.4 }, right: { py: -ease * 0.005, rz: ease * 0.15 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.2 }, right: { visible: false, sy: 0 } };
    pose.pupils = { left: { px: -ease * 0.012 }, right: { px: ease * 0.008 } };
    pose.mouth = { tension: 0.0, sx: -ease * 0.08, sy: -ease * 0.05 };
    pose.headGroup = { rz: ease * 0.06, rx: ease * 0.04 };
    return pose;
  }
}

class FaceLaugh extends AnimationBase {
  constructor() { super('FaceLaugh', 0.35); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.02, rz: -ease * 0.4 }, right: { py: ease * 0.02, rz: ease * 0.4 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.35 }, right: { visible: true, sy: -ease * 0.35 } };
    pose.pupils = { left: { sy: ease * 0.05 }, right: { sy: ease * 0.05 } };
    pose.mouth = { tension: 0.1, sx: ease * 0.45, sy: ease * 0.35 };
    pose.headGroup = { rx: -ease * 0.08 };
    return pose;
  }
}

class FaceDisappointed extends AnimationBase {
  constructor() { super('FaceDisappointed', 0.4); this.usePoseMatrix = true; }
  getPoseMatrix(t) {
    const ease = t < 0.3 ? t / 0.3 : 1;
    const pose = new PoseMatrix();
    pose.eyebrows = { left: { py: ease * 0.015, rz: ease * 0.3 }, right: { py: ease * 0.015, rz: -ease * 0.3 } };
    pose.eyelids = { left: { visible: true, sy: -ease * 0.25 }, right: { visible: true, sy: -ease * 0.25 } };
    pose.mouth = { tension: -0.15, sx: -ease * 0.18, sy: ease * 0.1 };
    pose.headGroup = { rx: ease * 0.1 };
    return pose;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Zoo monkey park scenes
// ─────────────────────────────────────────────────────────────────────────────

class ZooMonkeyHillScene extends SceneBase {
  constructor() {
    super('ERScene');
  }

  build() {
    super.build();
    this.scene.background = new THREE.Color(0xaedff2);
    this.scene.fog = new THREE.Fog(0xaedff2, 24, 58);

    const grass = addTexturedGround(this.scene, 30, 24, 0x76b65b, 10, 8);
    grass.position.z = -1.0;

    const pathTex = createCheckerTexture('#d8c39a', '#c7ad7f');
    const visitorPath = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.05, 3.4),
      new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.82 })
    );
    visitorPath.position.set(0, 0.02, 5.0);
    visitorPath.receiveShadow = true;
    this.scene.add(visitorPath);

    const water = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.04, 1.25),
      new THREE.MeshStandardMaterial({ color: 0x5cb6d6, roughness: 0.38, metalness: 0.02, transparent: true, opacity: 0.78 })
    );
    water.position.set(0, 0.045, 2.85);
    water.receiveShadow = true;
    this.scene.add(water);

    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(5.8, 6.6, 0.38, 72),
      new THREE.MeshStandardMaterial({ color: 0x8bb75e, roughness: 0.9 })
    );
    island.position.set(0, 0.19, -0.65);
    island.castShadow = true;
    island.receiveShadow = true;
    this.scene.add(island);

    addHabitatTree(this.scene, -7.8, -4.8, 1.35, 0x765132, 0x3e8f43);
    addHabitatTree(this.scene, 7.6, -4.7, 1.28, 0x6f4c31, 0x4d9c4a);
    addHabitatTree(this.scene, -3.7, -5.7, 0.9, 0x7b5536, 0x5fae51);
    addHabitatTree(this.scene, 4.2, -5.8, 0.95, 0x75502e, 0x3e8f43);

    addHabitatLog(this.scene, -3.2, 0.85, 2.8, 0.3, 1.0);
    addHabitatLog(this.scene, 3.0, -0.2, 3.1, -0.4, 1.05);
    addRock(this.scene, -1.1, -1.3, 1.15);
    addRock(this.scene, 1.6, -1.9, 0.9, 0x9d9f96);
    addRock(this.scene, -5.0, 1.1, 0.72, 0x7f837b);
    addRock(this.scene, 5.3, 0.9, 0.78, 0x8d9087);

    // Distant background trees and hills so the horizon is not empty
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 11 + Math.random() * 5;
      addHabitatTree(this.scene, Math.cos(angle) * dist, Math.sin(angle) * dist - 2, 0.7 + Math.random() * 0.6, 0x6f4c31, 0x3e8f43);
    }
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x6aa85a, roughness: 0.95 });
    for (const [hx, hz, hr] of [[-14, -8, 4], [14, -6, 5], [0, -16, 6]]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(hr, 24, 16), hillMat);
      hill.position.set(hx, -hr * 0.55, hz);
      this.scene.add(hill);
    }

    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.86 });
    addCylinderBetween(this.scene, [-3.3, 1.55, -2.4], [3.3, 1.55, -2.25], 0.035, ropeMat);
    addCylinderBetween(this.scene, [-3.3, 1.35, -2.0], [3.3, 1.35, -1.85], 0.026, ropeMat);
    for (let i = 0; i < 9; i++) {
      const x = -2.8 + i * 0.7;
      addCylinderBetween(this.scene, [x, 1.52, -2.35], [x, 1.34, -1.95], 0.012, ropeMat);
    }

    addViewingRail(this.scene, 4.05, -12.5, 12.5, 0x35564f);

    // Main interactive human characters (13-joint rig) are spawned by the script via {Position:...}
    // Distant zoo buildings / pavilions on the horizon
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.85 });
    for (const [bx, bz, bw, bd, bh] of [[-18, -10, 5, 4, 3], [16, -12, 6, 5, 4], [-8, -18, 4, 3, 2.5]]) {
      const building = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), buildingMat);
      building.position.set(bx, bh / 2, bz);
      building.castShadow = true;
      this.scene.add(building);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.75, 1.5, 4), roofMat);
      roof.position.set(bx, bh + 0.75, bz);
      roof.rotation.y = Math.PI / 4;
      this.scene.add(roof);
    }

    addTextPlane(this.scene, '动物园猴山', {
      position: [0, 5.05, -6.75],
      width: 5.5,
      height: 1.05,
      texture: { width: 768, height: 180, background: '#2d4f35', color: '#fff8c7', accent: '#cdeba7', fontSize: 72 },
    });
    addTextPlane(this.scene, ['游客请保持可爱', '猴子正在反向观察'], {
      position: [-6.4, 1.8, 3.72],
      width: 3.25,
      height: 1.05,
      texture: { background: '#fff5cc', color: '#2d3a2c', accent: '#5a8f40', fontSize: 42 },
    });
    addTextPlane(this.scene, ['请勿投喂游客', '他们会拍照发朋友圈'], {
      position: [6.3, 1.85, 3.72],
      width: 3.45,
      height: 1.08,
      texture: { background: '#fff1e6', color: '#4a2b20', accent: '#e76f51', fontSize: 40 },
    });
    addTextPlane(this.scene, '人类观察记录：开园中', {
      position: [0, 2.38, -5.35],
      width: 3.8,
      height: 0.55,
      texture: { width: 640, height: 120, background: '#243b2f', color: '#ffffff', accent: '#81c784', fontSize: 44 },
    });

    for (const light of this.lights) {
      if (light.isDirectionalLight) {
        light.intensity = 1.05;
        light.position.set(-4, 10, 6);
        light.castShadow = true;
      }
      if (light.isAmbientLight) light.intensity = 0.58;
    }
    const sun = new THREE.HemisphereLight(0xeaf7ff, 0x4e6f36, 0.5);
    this.scene.add(sun);

    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 0.35, -0.65), size: new THREE.Vector3(13.2, 0.7, 8.8) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 0.7, 4.05), size: new THREE.Vector3(25, 1.4, 0.4) });
    return this.scene;
  }
}

class ZooGlassViewingScene extends SceneBase {
  constructor() {
    super('HospitalCorridorScene');
    this.backgroundVisitors = [];
  }

  build() {
    super.build();
    this.backgroundVisitors = [];
    this.scene.background = new THREE.Color(0xd6eef2);
    this.scene.fog = new THREE.Fog(0xd6eef2, 22, 48);

    const habitat = addTexturedGround(this.scene, 30, 12, 0x6dae56, 9, 5);
    habitat.position.z = -2.0;

    const walkwayTex = createCheckerTexture('#c7d3d8', '#b0c0c6');
    const walkway = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.06, 4.2),
      new THREE.MeshStandardMaterial({ map: walkwayTex, roughness: 0.7 })
    );
    walkway.position.set(0, 0.03, 3.35);
    walkway.receiveShadow = true;
    this.scene.add(walkway);

    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 5.0, 0.34), new THREE.MeshStandardMaterial({ color: 0xe8f3f0, roughness: 0.82 }));
    wall.position.set(0, 2.5, 8.0);
    this.scene.add(wall);

    addGlassPanel(this.scene, 0, 1.52, 23.5, 3.15, 1.7);
    addTextPlane(this.scene, ['请勿敲玻璃', '里面也有人在看你'], {
      position: [-5.8, 3.35, 1.58],
      width: 3.45,
      height: 1.0,
      texture: { background: '#fffef0', color: '#263238', accent: '#2a9d8f', fontSize: 42 },
    });
    addTextPlane(this.scene, ['猴山综艺厅', '今日嘉宾：会拍照的人类'], {
      position: [5.6, 3.35, 1.58],
      width: 4.05,
      height: 1.0,
      texture: { background: '#243b2f', color: '#fff8c7', accent: '#81c784', fontSize: 40 },
    });

    // Background: glass-roof structure beams and distant greenery
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x8a9a9a, roughness: 0.7 });
    for (const bx of [-12, -6, 0, 6, 12]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 6.5, 0.2), beamMat);
      pillar.position.set(bx, 3.25, 7.6);
      this.scene.add(pillar);
    }
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const dist = 13 + Math.random() * 4;
      addHabitatTree(this.scene, Math.cos(angle) * dist, Math.sin(angle) * dist - 3, 0.8 + Math.random() * 0.5, 0x6f4c31, 0x3e8f43);
    }

    const benchMat = new THREE.MeshStandardMaterial({ color: 0x7b5636, roughness: 0.8 });
    for (const x of [-8.4, 8.4]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.46), benchMat);
      bench.position.set(x, 0.48, 4.7);
      bench.castShadow = true;
      this.scene.add(bench);
      for (const sx of [-0.75, 0.75]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), benchMat);
        leg.position.set(x + sx, 0.23, 4.7);
        leg.castShadow = true;
        this.scene.add(leg);
      }
    }

    addHabitatTree(this.scene, -10.8, -3.2, 1.05, 0x765132, 0x3e8f43);
    addHabitatTree(this.scene, 10.6, -3.0, 1.1, 0x7b5536, 0x4d9c4a);
    addHabitatLog(this.scene, -4.6, -0.35, 3.4, 0.55, 0.95);
    addHabitatLog(this.scene, 4.3, -0.9, 3.0, -0.35, 0.95);
    addRock(this.scene, -1.6, -2.1, 1.0);
    addRock(this.scene, 2.0, -2.35, 1.25, 0x8f9288);

    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x9c6b3c, roughness: 0.9 });
    addCylinderBetween(this.scene, [-8.0, 2.2, -3.2], [-3.0, 1.45, -1.2], 0.035, ropeMat);
    addCylinderBetween(this.scene, [3.0, 1.45, -1.2], [8.0, 2.2, -3.2], 0.035, ropeMat);
    addCylinderBetween(this.scene, [-1.2, 1.75, -2.4], [1.2, 1.75, -2.4], 0.04, ropeMat);

    addTextPlane(this.scene, ['人类观察笔记', '敲玻璃：以为这是门铃'], {
      position: [0, 1.15, -4.35],
      width: 4.5,
      height: 1.1,
      texture: { background: '#fff8dc', color: '#3d2b1f', accent: '#b88746', fontSize: 42 },
    });

    for (const light of this.lights) {
      if (light.isDirectionalLight) {
        light.intensity = 0.95;
        light.position.set(3, 10, 7);
        light.castShadow = true;
      }
      if (light.isAmbientLight) light.intensity = 0.62;
    }
    for (const x of [-8, -3, 3, 8]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      panel.position.set(x, 4.95, 2.5);
      this.scene.add(panel);
      const light = new THREE.PointLight(0xffffff, 0.42, 8);
      light.position.set(x, 4.75, 2.5);
      this.scene.add(light);
    }

    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 1.7, 1.52), size: new THREE.Vector3(23.5, 3.2, 0.18) });
    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);
    for (const v of this.backgroundVisitors) {
      if (v && v.update) v.update(time, delta);
    }
  }
}

class ZooHumanExhibitScene extends SceneBase {
  constructor() {
    super('ReceptionScene');
    this.backgroundVisitors = [];
  }

  build() {
    super.build();
    this.backgroundVisitors = [];
    this.scene.background = new THREE.Color(0xb9e2f5);
    this.scene.fog = new THREE.Fog(0xb9e2f5, 22, 52);

    const grass = addTexturedGround(this.scene, 28, 22, 0x78b65e, 8, 7);
    grass.position.z = -0.5;

    const deckMat = new THREE.MeshStandardMaterial({ color: 0x8a623c, roughness: 0.82 });
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.8, 0.34, 48), deckMat);
    deck.position.set(0, 0.17, -0.55);
    deck.castShadow = true;
    deck.receiveShadow = true;
    this.scene.add(deck);
    for (let i = 0; i < 18; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 10.2), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x765132 : 0x906640, roughness: 0.86 }));
      plank.position.set(-4.2 + i * 0.5, 0.36, -0.55);
      plank.rotation.y = 0.04 * Math.sin(i);
      plank.receiveShadow = true;
      this.scene.add(plank);
    }

    addHabitatTree(this.scene, -8.5, -4.5, 1.42, 0x765132, 0x3f8f43);
    addHabitatTree(this.scene, 8.4, -4.4, 1.45, 0x6f4c31, 0x4d9c4a);
    addHabitatTree(this.scene, -7.8, 2.2, 1.0, 0x7b5536, 0x5fae51);
    addHabitatTree(this.scene, 7.7, 2.3, 1.0, 0x75502e, 0x3e8f43);

    addViewingRail(this.scene, 4.2, -12.0, 12.0, 0x3d5a50);
    // Background: observation deck roof, distant pavilion, more trees
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x6d4c2f, roughness: 0.8 });
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.12, 48), roofMat);
    roof.position.set(0, 5.8, 4.5);
    this.scene.add(roof);
    for (const rx of [-8.5, 8.5]) {
      const support = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5.8, 12), new THREE.MeshStandardMaterial({ color: 0x8a623c }));
      support.position.set(rx, 2.9, 4.5);
      this.scene.add(support);
    }
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0xf0e6d2, roughness: 0.9 });
    for (const [bx, bz, bw, bd, bh] of [[-16, -10, 5, 4, 3.5], [15, -11, 6, 5, 4.5]]) {
      const building = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), buildingMat);
      building.position.set(bx, bh / 2, bz);
      building.castShadow = true;
      this.scene.add(building);
    }

    for (const light of this.lights) {
      if (light.isDirectionalLight) {
        light.intensity = 1.0;
        light.position.set(-5, 11, 7);
        light.castShadow = true;
      }
      if (light.isAmbientLight) light.intensity = 0.6;
    }
    const warm = new THREE.PointLight(0xfff0b3, 0.65, 12);
    warm.position.set(0, 5.6, -2.2);
    this.scene.add(warm);

    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 0.35, -0.55), size: new THREE.Vector3(11.2, 0.7, 11.2) });
    this.registerCameraObstacle({ type: 'box', center: new THREE.Vector3(0, 0.7, 4.2), size: new THREE.Vector3(24, 1.4, 0.4) });
    return this.scene;
  }

  update(time, delta) {
    super.update(time, delta);
    for (const v of this.backgroundVisitors) {
      if (v && v.update) v.update(time, delta);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// HumanCharacter — 幽游白书风格的高关节人类角色
// ─────────────────────────────────────────────────────────────────────────────

class HumanCharacter extends CharacterBase {
  static get skinColor() { return 0xf1c7a5; }
  static get hairColor() { return 0x2d2018; }
  static get shirtColor() { return 0xffffff; }
  static get pantsColor() { return 0x263238; }
  static get height() { return 1.72; }
  static get shoulderWidth() { return 1.0; }
  static get build() { return 'slim'; } // slim / athletic / bulky

  constructor(name) {
    super(name);
    this.archetypes = ['humanoid', 'teenager', 'fighter'];
    this.boundingRadius = 0.5;
    this.baseY = 0.01;
    this.allowedBodyAnimations = new Set([
      'Walk', 'Run', 'LookAround', 'PointForward', 'CrossArms',
      'Nod', 'WaveHand', 'HandsOnHips', 'Celebrate', 'ReachOut',
      'TurnAround', 'Bow', 'FightingStance', 'Crouch',
      'TakePhoto', 'KnockGlass', 'SelfiePose', 'EatPopcorn',
      'Laugh', 'Surprised', 'AngryShake', 'Shrug',
      'Facepalm', 'Stare', 'StepBack', 'SlowNod',
      'HandsUp', 'BowDeep', 'PointLeft', 'PointRight',
      'SpreadArms', 'Stomp', 'FacepalmHuman', 'Cheer', 'Peek',
      'ExcitedGesture', 'ShrugDeep', 'HandsOnHipsHuman', 'LeanForward', 'DoublePoint', 'NervousFidget',
    ]);
  }

  build() {
    const skinColor = this.constructor.skinColor;
    const hairColor = this.constructor.hairColor;
    const shirtColor = this.constructor.shirtColor;
    const pantsColor = this.constructor.pantsColor;
    const h = this.constructor.height;
    const shoulderWidth = this.constructor.shoulderWidth;
    const build = this.constructor.build;

    const skinMat = createSkinMaterial(skinColor);
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.72, metalness: 0.02 });
    const shirtMat = createClothMaterial(shirtColor);
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.82 });

    const torsoScale = build === 'bulky' ? 1.12 : build === 'athletic' ? 1.05 : 0.94;

    // Upper torso / chest & shoulders — one smooth rounded mass
    const torsoRadius = 0.18 * torsoScale;
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(torsoRadius, 0.48, 10, 18),
      shirtMat
    );
    torso.scale.set(1.30 * shoulderWidth, 1.0, 0.76);
    torso.position.y = h * 0.58;
    torso.castShadow = true;
    this.mesh.add(torso);
    this.torso = torso;

    // Abdomen / waist — slightly narrower than chest
    const waist = new THREE.Mesh(
      new THREE.CapsuleGeometry(torsoRadius * 0.86, 0.34, 8, 14),
      shirtMat
    );
    waist.scale.set(1.08 * shoulderWidth, 1.0, 0.72);
    waist.position.y = h * 0.42;
    waist.castShadow = true;
    this.mesh.add(waist);

    // Pelvis / hips (rounded lower body in pants)
    const pelvis = new THREE.Mesh(
      new THREE.CapsuleGeometry(torsoRadius * 0.88, 0.2, 8, 14),
      pantsMat
    );
    pelvis.scale.set(1.08 * shoulderWidth, 1.0, 0.76);
    pelvis.position.y = h * 0.28;
    pelvis.castShadow = true;
    this.mesh.add(pelvis);

    // Subtle belt / shirt hem line
    const hem = new THREE.Mesh(
      new THREE.CylinderGeometry(
        torsoRadius * 0.92 * shoulderWidth,
        torsoRadius * 0.94 * shoulderWidth,
        0.05,
        16
      ),
      shirtMat
    );
    hem.position.y = h * 0.34;
    hem.castShadow = true;
    this.mesh.add(hem);

    // Small deltoid caps so arms don't just stick out of the torso
    const shoulderY = h * 0.74;
    const shoulderX = 0.255 * shoulderWidth * torsoScale;
    for (const side of [-1, 1]) {
      const deltoid = new THREE.Mesh(
        new THREE.SphereGeometry(0.042 * torsoScale, 14, 10),
        shirtMat
      );
      deltoid.scale.set(1.0, 0.8, 0.7);
      deltoid.position.set(side * shoulderX, shoulderY, 0.015);
      deltoid.castShadow = true;
      this.mesh.add(deltoid);
    }

    // Neck — shorter and embedded into the torso so it doesn't float
    const neckHeight = 0.085;
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048 * torsoScale, 0.058 * torsoScale, neckHeight, 12),
      skinMat
    );
    neck.position.y = h * 0.83;
    this.mesh.add(neck);

    // Shirt collar around the neck base to hide any remaining seam
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.062 * torsoScale, 0.012, 8, 16),
      shirtMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, h * 0.83 - neckHeight * 0.35, 0);
    this.mesh.add(collar);

    // Head group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, h * 0.92, 0);
    this.mesh.add(this.headGroup);

    this.buildHead(this.headGroup, skinMat, hairMat);

    // Arms and legs with full 13-joint hierarchy
    this.addArms(skinMat, shirtMat, h, shoulderWidth, torsoScale);
    this.addLegs(skinMat, pantsMat, h);

    this._captureFaceBaseState();
  }

  buildHead(headGroup, skinMat, hairMat) {
    // Face — slightly tapered chin, not a perfect sphere
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 24, 20), skinMat);
    head.scale.set(0.88, 1.05, 0.92);
    head.castShadow = true;
    headGroup.add(head);

    // Jaw taper (subtle lower face)
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 14), skinMat);
    jaw.scale.set(1, 1.2, 0.85);
    jaw.position.set(0, -0.075, 0.03);
    headGroup.add(jaw);

    // Default short hair cap — subclasses add stylised locks
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.138, 20, 14), hairMat);
    hairCap.scale.set(0.9, 0.52, 0.95);
    hairCap.position.y = 0.095;
    headGroup.add(hairCap);

    this._addEyes(headGroup, 0x2a1a10);
    this._addEyebrows(headGroup, 0x1a1a1a);
    this._addNose(headGroup, 0xc48a6e);
    this._addMouth(headGroup, 0x6e3a3a);
    this._addEars(headGroup, skinMat);
  }

  _addEyes(headGroup, color) {
    // Bulging cartoon eyes that read clearly even on pale skin and from a distance.
    // A shallow hemisphere sits in front of the face so it never z-fights with
    // the head sphere, and the dark socket ring gives the face clear definition.
    const eyeRadius = 0.062;
    const pupilRadius = 0.024;
    const eyeX = 0.060;
    const eyeY = -0.002; // lower on the face, clear of bangs
    const eyeZ = 0.158; // well in front of hair and face surface
    const irisZ = eyeRadius * 0.55;
    const pupilZ = irisZ + 0.001;
    const highlightZ = pupilZ + 0.001;

    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xaaaaaa,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e18,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    const pupilMat = new THREE.MeshBasicMaterial({
      color: 0x050505,
      side: THREE.DoubleSide,
    });
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    const eyelidMat = new THREE.MeshStandardMaterial({
      color: this.constructor.skinColor,
      roughness: 0.65,
    });
    // Dark socket shadow ring for clear facial definition
    const socketMat = new THREE.MeshStandardMaterial({
      color: 0x5a3a2e,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    // Thick black outline ring to make eyes pop against pale skin
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x050505,
      side: THREE.DoubleSide,
    });

    for (const side of [-1, 1]) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * eyeX, eyeY, eyeZ);
      headGroup.add(eyeGroup);

      // Socket shadow ring
      const socket = new THREE.Mesh(
        new THREE.TorusGeometry(eyeRadius * 1.05, 0.008, 6, 28),
        socketMat
      );
      socket.position.z = -0.004;
      eyeGroup.add(socket);

      // Thick black outline ring
      const outline = new THREE.Mesh(
        new THREE.TorusGeometry(eyeRadius * 1.18, 0.010, 6, 28),
        outlineMat
      );
      outline.position.z = irisZ + 0.0005;
      eyeGroup.add(outline);

      // Bulging sclera hemisphere (rounded front, flat back sits near face)
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(eyeRadius, 26, 18, 0, TAU, 0, Math.PI * 0.55),
        eyeWhiteMat
      );
      eyeWhite.rotation.x = -Math.PI / 2;
      eyeWhite.position.z = 0;
      eyeGroup.add(eyeWhite);

      // Iris disc on the hemisphere tip
      const iris = new THREE.Mesh(
        new THREE.CircleGeometry(eyeRadius * 0.62, 20),
        irisMat
      );
      iris.position.z = irisZ;
      eyeGroup.add(iris);

      // Pupil disc
      const pupil = new THREE.Mesh(
        new THREE.CircleGeometry(pupilRadius, 18),
        pupilMat
      );
      pupil.position.z = pupilZ;
      pupil.userData.baseX = 0;
      pupil.userData.baseY = 0;
      pupil.userData.baseScale = new THREE.Vector3(1, 1, 1);
      pupil.userData.eyeRadius = eyeRadius;
      eyeGroup.add(pupil);

      // Highlight
      const highlight = new THREE.Mesh(
        new THREE.CircleGeometry(eyeRadius * 0.18, 12),
        highlightMat
      );
      highlight.position.set(eyeRadius * 0.24, eyeRadius * 0.26, highlightZ);
      eyeGroup.add(highlight);

      // Upper eyelid for blinks/emotion
      const eyelidGeo = new THREE.SphereGeometry(eyeRadius * 1.12, 20, 16, 0, TAU, 0, Math.PI * 0.55);
      const eyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
      eyelid.rotation.x = -Math.PI / 2;
      eyelid.scale.set(1.05, 1.0, 0.28);
      eyelid.position.set(0, 0.002, 0.001);
      eyelid.visible = false;
      eyeGroup.add(eyelid);

      if (side === -1) {
        this.leftEyeGroup = eyeGroup;
        this.leftPupil = pupil;
        this.leftEyelid = eyelid;
        this.leftEyeWhite = eyeWhite;
      } else {
        this.rightEyeGroup = eyeGroup;
        this.rightPupil = pupil;
        this.rightEyelid = eyelid;
        this.rightEyeWhite = eyeWhite;
      }
    }
  }

  _addEyebrows(headGroup, color) {
    const browMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
    for (const side of [-1, 1]) {
      const browGroup = new THREE.Group();
      browGroup.position.set(side * 0.052, 0.060, 0.125);
      headGroup.add(browGroup);

      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.040, 4, 8), browMat);
      brow.position.set(0, 0, 0);
      brow.rotation.z = side * 0.08;
      brow.rotation.x = 0.1;
      browGroup.add(brow);

      if (side === -1) this.leftEyebrow = browGroup;
      else this.rightEyebrow = browGroup;
    }
  }

  _addNose(headGroup, color) {
    const noseMat = createSkinMaterial(color);
    // Nose tip
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 10), noseMat);
    nose.position.set(0, 0.006, 0.132);
    nose.scale.set(0.85, 0.9, 0.72);
    headGroup.add(nose);
    // Nostrils as two small spheres
    for (const side of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), noseMat);
      nostril.position.set(side * 0.010, -0.004, 0.134);
      nostril.scale.set(1, 0.7, 1);
      headGroup.add(nostril);
    }
    // Subtle nose bridge shadow line
    const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.020, 4, 6), noseMat);
    bridge.position.set(0, 0.018, 0.126);
    bridge.rotation.x = 0.1;
    headGroup.add(bridge);
  }

  _addMouth(headGroup, color) {
    const mouthMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.65 });
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.044, 0.122);
    headGroup.add(mouthGroup);

    // Curved upper lip
    const upperLip = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0045, 0.026, 4, 8),
      mouthMat
    );
    upperLip.rotation.z = Math.PI / 2;
    upperLip.position.set(0, 0.004, 0);
    upperLip.scale.set(1, 1, 0.85);
    mouthGroup.add(upperLip);

    // Curved lower lip
    const lowerLip = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0040, 0.024, 4, 8),
      mouthMat
    );
    lowerLip.rotation.z = Math.PI / 2;
    lowerLip.position.set(0, -0.005, -0.001);
    lowerLip.scale.set(1, 0.85, 0.8);
    mouthGroup.add(lowerLip);

    this.mouth = mouthGroup;
    this.mouthBaseScaleX = 1;
    this.mouthBaseScaleY = 1;
    this.mouthBaseScaleZ = 1;
    this.mouthBasePosX = 0;
    this.mouthBasePosY = -0.044;
    this.mouthBasePosZ = 0.122;
  }

  _addEars(headGroup, skinMat) {
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), skinMat);
      ear.position.set(side * 0.125, -0.005, 0.01);
      ear.scale.set(0.55, 1.05, 0.5);
      ear.rotation.z = side * 0.15;
      headGroup.add(ear);
    }
  }

  addArms(skinMat, shirtMat, h, shoulderWidth, torsoScale = 1.0) {
    const upperLen = 0.28;
    const lowerLen = 0.26;
    const armWidth = 0.052;

    const addArm = (clavicleX, shoulderX, isRight) => {
      const clavicleGroup = new THREE.Group();
      clavicleGroup.position.set(clavicleX, h * 0.735, 0.065);

      const shoulderGroup = new THREE.Group();
      shoulderGroup.position.set(shoulderX - clavicleX, 0, 0);
      clavicleGroup.add(shoulderGroup);

      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(armWidth, upperLen, 8, 10),
        skinMat
      );
      upperArm.position.y = -upperLen / 2;
      upperArm.castShadow = true;
      shoulderGroup.add(upperArm);

      // Sleeve
      const sleeve = new THREE.Mesh(
        new THREE.CapsuleGeometry(armWidth * 1.08, upperLen * 0.4, 8, 10),
        shirtMat
      );
      sleeve.position.y = -upperLen * 0.24;
      shoulderGroup.add(sleeve);

      const elbowGroup = new THREE.Group();
      elbowGroup.position.y = -upperLen;
      shoulderGroup.add(elbowGroup);

      const elbowTwistGroup = new THREE.Group();
      elbowGroup.add(elbowTwistGroup);

      const forearm = new THREE.Mesh(
        new THREE.CapsuleGeometry(armWidth * 0.86, lowerLen, 8, 10),
        skinMat
      );
      forearm.position.y = -lowerLen / 2;
      forearm.castShadow = true;
      elbowTwistGroup.add(forearm);

      const wristGroup = new THREE.Group();
      wristGroup.position.y = -lowerLen;
      elbowTwistGroup.add(wristGroup);

      // Hand with simple fingers
      const handGroup = new THREE.Group();
      handGroup.position.y = -0.04;
      wristGroup.add(handGroup);

      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.04, 0.012), skinMat);
      handGroup.add(palm);

      for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.0055, 0.024, 4, 6),
          skinMat
        );
        const fAngle = (f - 1.5) * 0.28;
        finger.position.set(Math.sin(fAngle) * 0.015, -0.024, 0.005);
        finger.rotation.x = Math.PI / 2;
        finger.rotation.y = fAngle;
        handGroup.add(finger);
      }
      // Thumb
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.019, 4, 6), skinMat);
      thumb.position.set(isRight ? -0.016 : 0.016, -0.017, 0.008);
      thumb.rotation.z = isRight ? -0.6 : 0.6;
      thumb.rotation.x = Math.PI / 2;
      handGroup.add(thumb);

      this.mesh.add(clavicleGroup);
      if (isRight) {
        this.rightClavicle = clavicleGroup;
        this.rightArm = shoulderGroup;
        this.rightElbow = elbowGroup;
        this.rightElbowTwist = elbowTwistGroup;
        this.rightWrist = wristGroup;
        this.rightArmLength = upperLen + lowerLen;
      } else {
        this.leftClavicle = clavicleGroup;
        this.leftArm = shoulderGroup;
        this.leftElbow = elbowGroup;
        this.leftElbowTwist = elbowTwistGroup;
        this.leftWrist = wristGroup;
        this.leftArmLength = upperLen + lowerLen;
      }
    };

    const sx = 0.255 * shoulderWidth * torsoScale;
    addArm(-sx * 0.5, -sx, false);
    addArm(sx * 0.5, sx, true);
  }

  // Pin pupils after CharacterBase update so eye-tracking never drags them off the sclera.
  // During active eye-tracking (dialogue), leave the engine-driven pupil shift in place
  // so the character really appears to look at the other speaker.
  update(time, delta) {
    super.update(time, delta);
    if (this.leftEyeGroup) this.leftEyeGroup.visible = false;
    if (this.rightEyeGroup) this.rightEyeGroup.visible = false;
    if (this.leftPupil) {
      this.leftPupil.position.x = this.leftPupil.userData.baseX ?? 0;
      this.leftPupil.position.y = this.leftPupil.userData.baseY ?? 0;
    }
    if (this.rightPupil) {
      this.rightPupil.position.x = this.rightPupil.userData.baseX ?? 0;
      this.rightPupil.position.y = this.rightPupil.userData.baseY ?? 0;
    }
  }

  // Subtle idle motion so humans keep breathing and shifting weight when not animating.
  _updateIdle(time) {
    const t = time * 1.8;
    if (this.mesh) {
      this.mesh.position.y = this.baseY + Math.sin(t) * 0.0025;
    }
    if (this.leftClavicle) {
      this.leftClavicle.rotation.z = Math.sin(t * 0.6 + 0.3) * 0.012;
    }
    if (this.rightClavicle) {
      this.rightClavicle.rotation.z = -Math.sin(t * 0.6 + 0.3) * 0.012;
    }
    // Keep arms slightly abducted in idle so they don't clip through the torso.
    if (this.rightArm && !this._actionMatrix?.currentAction) {
      this.rightArm.rotation.z = 0.16 + Math.sin(t * 0.5 + 0.2) * 0.02;
    }
    if (this.leftArm && !this._actionMatrix?.currentAction) {
      this.leftArm.rotation.z = -0.16 - Math.sin(t * 0.5 + 0.2) * 0.02;
    }
    if (this.headGroup) {
      this.headGroup.rotation.x = Math.sin(t * 0.5) * 0.008;
      this.headGroup.rotation.y = Math.sin(t * 0.3) * 0.015;
    }
  }

  // Smaller head turn / eye hiding when facing away, to stop eyes from floating in space
  updateEyeTracking(time, delta = 0.016) {
    if (!this.headGroup) return;

    const cam = (typeof window !== 'undefined' && window.__dulaCamera) ? window.__dulaCamera : null;
    if (cam) {
      const headPos = new THREE.Vector3();
      this.headGroup.getWorldPosition(headPos);
      const toCam = new THREE.Vector3().subVectors(cam.position, headPos).normalize();
      const headForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.headGroup.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const facingCamera = toCam.dot(headForward) > 0.05;
      if (this.leftEyeGroup) this.leftEyeGroup.visible = facingCamera;
      if (this.rightEyeGroup) this.rightEyeGroup.visible = facingCamera;
    }

    if (!this.eyeTracking.active || time < this.eyeTracking.startTime || time > this.eyeTracking.endTime) {
      const returnSpeed = 4 * delta;
      this.headGroup.rotation.y += (0 - this.headGroup.rotation.y) * returnSpeed;
      this.headGroup.rotation.x += (0 - this.headGroup.rotation.x) * returnSpeed;
      if (Math.abs(this.headGroup.rotation.y) < 0.002) this.headGroup.rotation.y = 0;
      if (Math.abs(this.headGroup.rotation.x) < 0.002) this.headGroup.rotation.x = 0;
      return;
    }

    const headWorldPos = new THREE.Vector3();
    this.headGroup.getWorldPosition(headWorldPos);
    const target = this.eyeTracking.target;

    const dx = target.x - headWorldPos.x;
    const dy = target.y - headWorldPos.y;
    const dz = target.z - headWorldPos.z;

    const distXZ = Math.sqrt(dx * dx + dz * dz);
    let yaw = Math.atan2(dx, dz) - this.mesh.rotation.y;
    let pitch = -Math.atan2(dy, distXZ);

    while (yaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw < -Math.PI) yaw += Math.PI * 2;

    const maxYaw = 0.45;
    const maxPitch = 0.25;
    const targetYaw = Math.max(-maxYaw, Math.min(maxYaw, yaw));
    const targetPitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

    const smooth = 6 * delta;
    this.headGroup.rotation.y += (targetYaw - this.headGroup.rotation.y) * smooth;
    this.headGroup.rotation.x += (targetPitch - this.headGroup.rotation.x) * smooth;
  }

  // Keep pupil scale stable during blinks so the flat iris/pupil never pops out as a sphere
  _applyBlink(factor) {
    const baseScale = this.leftPupil?.userData.baseScale;
    const sx = baseScale ? baseScale.x : 1;
    const sy = baseScale ? baseScale.y : 1;
    const sz = baseScale ? baseScale.z : 1;
    const shrink = 1 - factor * 0.25;

    if (this.leftEyelid) {
      this.leftEyelid.visible = factor >= 0.05;
      if (this.leftEyelid.visible) this.leftEyelid.scale.y = 1 - factor * 0.95;
    }
    if (this.rightEyelid) {
      this.rightEyelid.visible = factor >= 0.05;
      if (this.rightEyelid.visible) this.rightEyelid.scale.y = 1 - factor * 0.95;
    }
    if (this.leftPupil) {
      this.leftPupil.scale.set(sx * shrink, sy * shrink, sz * shrink);
    }
    if (this.rightPupil) {
      this.rightPupil.scale.set(sx * shrink, sy * shrink, sz * shrink);
    }
  }

  addLegs(skinMat, pantsMat, h) {
    // Calibrate leg segments so the sole sits exactly on the ground (y ≈ 0).
    const thighLen = 0.25;
    const shinLen = 0.275;
    const legWidth = 0.05;
    const footLen = 0.20;
    const footHeight = 0.06;
    const footWidth = 0.085;

    for (const side of [-1, 1]) {
      const hipGroup = new THREE.Group();
      hipGroup.position.set(side * 0.095, h * 0.32, 0);

      const thigh = new THREE.Mesh(
        new THREE.CapsuleGeometry(legWidth, thighLen, 8, 10),
        pantsMat
      );
      thigh.position.y = -thighLen / 2;
      thigh.castShadow = true;
      hipGroup.add(thigh);

      const kneeGroup = new THREE.Group();
      kneeGroup.position.y = -thighLen;
      hipGroup.add(kneeGroup);

      const kneeTwistGroup = new THREE.Group();
      kneeGroup.add(kneeTwistGroup);

      const shin = new THREE.Mesh(
        new THREE.CapsuleGeometry(legWidth * 0.86, shinLen, 8, 10),
        pantsMat
      );
      shin.position.y = -shinLen / 2;
      shin.castShadow = true;
      kneeTwistGroup.add(shin);

      const ankleGroup = new THREE.Group();
      ankleGroup.position.y = -shinLen;
      kneeTwistGroup.add(ankleGroup);

      // Shoe/foot group — visibly rests on the ground instead of sinking
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -footHeight / 2, footLen * 0.12);
      ankleGroup.add(shoeGroup);

      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.75 });
      const soleMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.9 });

      // Main shoe body
      const shoeBody = new THREE.Mesh(
        new THREE.BoxGeometry(footWidth, footHeight * 0.8, footLen),
        shoeMat
      );
      shoeBody.position.y = footHeight * 0.1;
      shoeBody.castShadow = true;
      shoeGroup.add(shoeBody);

      // Toe cap
      const toe = new THREE.Mesh(
        new THREE.SphereGeometry(footWidth * 0.52, 12, 10),
        shoeMat
      );
      toe.scale.set(1, 0.55, 1.25);
      toe.position.set(0, footHeight * 0.05, footLen * 0.42);
      toe.castShadow = true;
      shoeGroup.add(toe);

      // Heel
      const heel = new THREE.Mesh(
        new THREE.BoxGeometry(footWidth * 0.9, footHeight * 0.55, footLen * 0.35),
        shoeMat
      );
      heel.position.set(0, -footHeight * 0.15, -footLen * 0.28);
      shoeGroup.add(heel);

      // Sole
      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(footWidth * 1.05, footHeight * 0.18, footLen * 1.05),
        soleMat
      );
      sole.position.set(0, -footHeight * 0.42, 0);
      shoeGroup.add(sole);

      this.mesh.add(hipGroup);
      if (side === 1) {
        this.rightLeg = hipGroup;
        this.rightKnee = kneeGroup;
        this.rightKneeTwist = kneeTwistGroup;
        this.rightAnkle = ankleGroup;
      } else {
        this.leftLeg = hipGroup;
        this.leftKnee = kneeGroup;
        this.leftKneeTwist = kneeTwistGroup;
        this.leftAnkle = ankleGroup;
      }
    }
  }
}

// 幽助风格：热血少年，黑发刺猬头，绿校服裤
class 阿翔 extends HumanCharacter {
  static get hairColor() { return 0x1a1a1a; }
  static get shirtColor() { return 0xf5f5f5; }
  static get pantsColor() { return 0x2e7d4a; }
  static get height() { return 1.68; }
  static get build() { return 'slim'; }

  buildHead(headGroup, skinMat, hairMat) {
    super.buildHead(headGroup, skinMat, hairMat);
    // Dense spiky flame-like hair, kept high so it doesn't drape over the eyes
    for (let ring = 0; ring < 4; ring++) {
      const count = 7 + ring * 2;
      const radius = 0.07 + ring * 0.03;
      const yBase = 0.14 + ring * 0.04;
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * Math.PI * 2 + ring * 0.4;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018 - ring * 0.002, 0.12 + Math.random() * 0.04, 5), hairMat);
        spike.position.set(Math.cos(angle) * radius, yBase, Math.sin(angle) * radius);
        spike.rotation.x = -0.35 + (Math.random() - 0.5) * 0.4;
        spike.rotation.z = (Math.random() - 0.5) * 0.5;
        spike.rotation.y = angle;
        headGroup.add(spike);
      }
    }
    // Two short stray locks at front, swept up to keep eyes visible
    for (const side of [-1, 1]) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 4, 6), hairMat);
      lock.position.set(side * 0.06, 0.07, 0.11);
      lock.rotation.x = -0.75;
      lock.rotation.z = side * 0.3;
      headGroup.add(lock);
    }
  }
}

// 藏马风格：红发优雅少年，拿相机
class 小红 extends HumanCharacter {
  static get hairColor() { return 0xb83c3c; }
  static get shirtColor() { return 0xf0f0f0; }
  static get pantsColor() { return 0x3d4f8f; }
  static get height() { return 1.76; }
  static get build() { return 'slim'; }

  buildHead(headGroup, skinMat, hairMat) {
    super.buildHead(headGroup, skinMat, hairMat);
    // Layered long locks — multiple thin strands per side
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.012 - i * 0.0005, 0.16 + i * 0.02, 4, 8), hairMat);
        lock.position.set(side * (0.1 + i * 0.006), -0.04 - i * 0.012, 0.02 + i * 0.008);
        lock.rotation.z = side * (0.1 + i * 0.025);
        lock.rotation.x = 0.08 + i * 0.015;
        headGroup.add(lock);
      }
    }
    // Soft top volume
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), hairMat);
    top.scale.set(1.05, 0.42, 0.95);
    top.position.y = 0.13;
    headGroup.add(top);
    // Forehead strands, kept high and short so they don't drape over the eyes
    for (let i = 0; i < 5; i++) {
      const strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.04, 4, 6), hairMat);
      strand.position.set((i - 2) * 0.030, 0.12, 0.11);
      strand.rotation.x = -0.65;
      strand.rotation.z = (i - 2) * 0.08;
      headGroup.add(strand);
    }
  }
}

// 飞影风格：黑衣冷面，短发向后飞扬
class 小黑 extends HumanCharacter {
  static get hairColor() { return 0x111111; }
  static get skinColor() { return 0xf5d0c5; }
  static get shirtColor() { return 0x1a1a1a; }
  static get pantsColor() { return 0x1a1a1a; }
  static get height() { return 1.58; }
  static get build() { return 'slim'; }

  buildHead(headGroup, skinMat, hairMat) {
    super.buildHead(headGroup, skinMat, hairMat);
    // Short swept-back spikes
    for (let i = 0; i < 16; i++) {
      const t = i / 16;
      const angle = -0.7 + t * 1.4;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1 + Math.random() * 0.04, 5), hairMat);
      spike.position.set(Math.sin(angle) * 0.09, 0.12, Math.cos(angle) * 0.07 - 0.02);
      spike.rotation.x = -0.85;
      spike.rotation.z = angle * 0.6;
      spike.rotation.y = angle * 0.3;
      headGroup.add(spike);
    }
    // White headband to break up the black silhouette
    const bandanaMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.8 });
    const bandana = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.096, 0.035, 16), bandanaMat);
    bandana.position.set(0, 0.06, 0.06);
    bandana.rotation.x = 0.2;
    headGroup.add(bandana);
    // Headband knot at back
    const knot = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), bandanaMat);
    knot.rotation.z = Math.PI / 2;
    knot.position.set(0, 0.055, -0.08);
    headGroup.add(knot);
  }
}

// 桑原风格：金发飞机头，健壮
class 阿金 extends HumanCharacter {
  static get hairColor() { return 0xd4a863; }
  static get shirtColor() { return 0x264653; }
  static get pantsColor() { return 0x5c4033; }
  static get height() { return 1.8; }
  static get build() { return 'bulky'; }

  buildHead(headGroup, skinMat, hairMat) {
    super.buildHead(headGroup, skinMat, hairMat);
    // Tall pompadour with upward-pointing cones
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const angle = -0.6 + t * 1.2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.14 + Math.random() * 0.04, 5), hairMat);
      spike.position.set(Math.sin(angle) * 0.07, 0.16, Math.cos(angle) * 0.05);
      spike.rotation.x = -0.45 - Math.random() * 0.25;
      spike.rotation.z = angle * 0.5;
      spike.rotation.y = angle * 0.3;
      headGroup.add(spike);
    }
    // Front curl
    const curl = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.08, 4, 6), hairMat);
    curl.position.set(0, 0.14, 0.09);
    curl.rotation.x = -0.5;
    headGroup.add(curl);
    // Short sideburns
    for (const side of [-1, 1]) {
      const sideburn = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.1, 4, 6), hairMat);
      sideburn.position.set(side * 0.12, -0.02, 0.04);
      sideburn.rotation.z = side * 0.1;
      headGroup.add(sideburn);
    }
  }
}

// 萤子风格：棕发马尾少女
class 小美 extends HumanCharacter {
  static get hairColor() { return 0x5c3a2a; }
  static get skinColor() { return 0xf5d0c5; }
  static get shirtColor() { return 0xe8b4b4; }
  static get pantsColor() { return 0x4a6fa5; }
  static get height() { return 1.58; }
  static get build() { return 'slim'; }

  buildHead(headGroup, skinMat, hairMat) {
    super.buildHead(headGroup, skinMat, hairMat);
    // Ponytail with volume
    const ponytail = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.32, 8, 10), hairMat);
    ponytail.position.set(0, -0.02, -0.13);
    ponytail.rotation.x = -0.45;
    headGroup.add(ponytail);
    // Hair tie
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 16), new THREE.MeshStandardMaterial({ color: 0xe8b4b4, roughness: 0.7 }));
    tie.position.set(0, 0.06, -0.12);
    tie.rotation.x = Math.PI / 2;
    headGroup.add(tie);
    // Side locks
    for (const side of [-1, 1]) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.14, 5, 8), hairMat);
      lock.position.set(side * 0.11, -0.03, 0.04);
      lock.rotation.z = side * 0.18;
      headGroup.add(lock);
    }
    // Short airy bangs, swept up to reveal eyes
    for (let i = 0; i < 4; i++) {
      const bang = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.04, 4, 6), hairMat);
      bang.position.set((i - 1.5) * 0.032, 0.075, 0.11);
      bang.rotation.x = -0.55;
      bang.rotation.z = (i - 1.5) * 0.18;
      headGroup.add(bang);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Human animations
// ─────────────────────────────────────────────────────────────────────────────

class TakePhoto extends AnimationBase {
  constructor(options = {}) {
    super('TakePhoto', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const raise = Math.min(1, t * 3) * (1 - Math.max(0, t - 0.7) * 3.3);
    pose.rightShoulder = { rx: -1.25 * raise, ry: 0.12 * raise, rz: 0.32 * raise };
    pose.rightElbow = { rx: -0.85 * raise };
    pose.rightWrist = { ry: -0.3 * raise, rz: 0.12 * raise };
    pose.headGroup = { rx: -0.15 * raise, ry: 0.1 * raise };
    return pose;
  }
}

class KnockGlass extends AnimationBase {
  constructor(options = {}) {
    super('KnockGlass', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const cycle = Math.sin(t * Math.PI * 6) * Math.exp(-t * 2);
    pose.rightShoulder = { rx: -0.82, ry: -0.18, rz: 0.30 };
    pose.rightElbow = { rx: -1.08 };
    pose.rightWrist = { rx: cycle * 0.25, rz: 0.10 };
    pose.headGroup = { rx: -0.1 };
    return pose;
  }
}

class SelfiePose extends AnimationBase {
  constructor(options = {}) {
    super('SelfiePose', positiveNumber(options.duration, 1.8));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const hold = Math.min(1, t * 2);
    pose.rightShoulder = { rx: -1.45 * hold, ry: 0.35 * hold, rz: 0.34 * hold };
    pose.rightElbow = { rx: -0.55 * hold };
    pose.rightWrist = { ry: -0.5 * hold, rz: 0.10 * hold };
    pose.leftShoulder = { rx: -0.25 * hold, ry: -0.12 * hold, rz: -0.18 * hold };
    pose.headGroup = { rx: -0.2 * hold, ry: -0.15 * hold };
    return pose;
  }
}

class EatPopcorn extends AnimationBase {
  constructor(options = {}) {
    super('EatPopcorn', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const scoop = (t % 0.5) / 0.5;
    pose.rightShoulder = { rx: -0.75 - scoop * 0.26, ry: 0.14, rz: 0.28 };
    pose.rightElbow = { rx: -1.15 - scoop * 0.22 };
    pose.rightWrist = { rx: -0.4 * Math.sin(scoop * Math.PI), rz: 0.10 };
    pose.headGroup = { rx: 0.05 * Math.sin(scoop * Math.PI) };
    return pose;
  }
}

class Surprised extends AnimationBase {
  constructor(options = {}) {
    super('Surprised', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const amp = Math.exp(-t * 2);
    pose.headGroup = { rx: -0.25 * amp, ry: 0 };
    pose.rightShoulder = { rx: -0.4 * amp, ry: 0.24 * amp, rz: 0.35 * amp };
    pose.leftShoulder = { rx: -0.4 * amp, ry: -0.24 * amp, rz: -0.35 * amp };
    pose.rightElbow = { rx: -0.8 * amp };
    pose.leftElbow = { rx: -0.8 * amp };
    return pose;
  }
}

class AngryShake extends AnimationBase {
  constructor(options = {}) {
    super('AngryShake', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const shake = Math.sin(t * Math.PI * 10) * 0.08 * (1 - t);
    pose.headGroup = { ry: shake, rx: 0.05 };
    pose.rightShoulder = { rx: -0.5, ry: -0.28, rz: 0.34 };
    pose.rightElbow = { rx: -1.0 };
    pose.rightWrist = { ry: shake * 2 };
    return pose;
  }
}

class HandsUp extends AnimationBase {
  constructor(options = {}) {
    super('HandsUp', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const amp = Math.sin(t * Math.PI) * 0.9;
    pose.rightShoulder = { rx: -2.45 * amp, ry: 0.18 * amp, rz: 0.34 * amp };
    pose.leftShoulder = { rx: -2.45 * amp, ry: -0.18 * amp, rz: -0.34 * amp };
    pose.rightElbow = { rx: -0.3 * amp };
    pose.leftElbow = { rx: -0.3 * amp };
    pose.headGroup = { rx: -0.1 * amp };
    return pose;
  }
}

class BowDeep extends AnimationBase {
  constructor(options = {}) {
    super('BowDeep', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const bend = Math.sin(t * Math.PI) * 0.6;
    pose.mesh = { rx: bend };
    pose.headGroup = { rx: -bend * 0.5 };
    pose.rightShoulder = { rx: -0.2 * bend, rz: 0.16 * bend };
    pose.leftShoulder = { rx: -0.2 * bend, rz: -0.16 * bend };
    return pose;
  }
}

class PointLeft extends AnimationBase {
  constructor(options = {}) {
    super('PointLeft', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const amp = Math.min(1, t * 3);
    pose.rightShoulder = { rx: -0.95 * amp, ry: -0.5 * amp, rz: 0.30 * amp };
    pose.rightElbow = { rx: -0.2 * amp };
    pose.rightWrist = { ry: 0.1 * amp };
    pose.headGroup = { ry: -0.25 * amp };
    return pose;
  }
}

class PointRight extends AnimationBase {
  constructor(options = {}) {
    super('PointRight', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const amp = Math.min(1, t * 3);
    pose.leftShoulder = { rx: -0.95 * amp, ry: 0.5 * amp, rz: -0.30 * amp };
    pose.leftElbow = { rx: -0.2 * amp };
    pose.leftWrist = { ry: -0.1 * amp };
    pose.headGroup = { ry: 0.25 * amp };
    return pose;
  }
}

class SpreadArms extends AnimationBase {
  constructor(options = {}) {
    super('SpreadArms', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const amp = Math.min(1, t * 2.5);
    pose.rightShoulder = { rx: -0.2 * amp, ry: -1.3 * amp, rz: 0.3 * amp };
    pose.leftShoulder = { rx: -0.2 * amp, ry: 1.3 * amp, rz: -0.3 * amp };
    pose.rightElbow = { rx: -0.3 * amp };
    pose.leftElbow = { rx: -0.3 * amp };
    pose.headGroup = { rx: -0.08 * amp, rz: Math.sin(t * Math.PI * 2) * 0.03 * amp };
    return pose;
  }
}

class Stomp extends AnimationBase {
  constructor(options = {}) {
    super('Stomp', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const stomp = Math.sin(t * Math.PI * 6) * Math.exp(-t * 2) * 0.15;
    pose.mesh = { y: Math.abs(stomp) * 0.06 };
    pose.rightLeg = { rx: stomp };
    pose.rightShoulder = { rx: -0.4, ry: -0.22, rz: 0.28 };
    pose.rightElbow = { rx: -0.8 };
    pose.rightWrist = { ry: stomp * 2 };
    pose.headGroup = { rx: 0.05 };
    return pose;
  }
}

class TurnAround extends AnimationBase {
  constructor(options = {}) {
    super('TurnAround', positiveNumber(options.duration, 1.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const ease = t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1;
    pose.mesh = { ry: Math.sin(t * Math.PI) * Math.PI * 0.95 };
    pose.headGroup = { rx: -0.08 * ease };
    return pose;
  }
}

class Cheer extends AnimationBase {
  constructor(options = {}) {
    super('Cheer', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const pump = Math.sin(t * Math.PI * 4);
    pose.rightShoulder = { rx: -2.35, ry: 0.24, rz: 0.34 };
    pose.leftShoulder = { rx: -2.35, ry: -0.24, rz: -0.34 };
    pose.rightElbow = { rx: -0.3 + pump * 0.1 };
    pose.leftElbow = { rx: -0.3 + pump * 0.1 };
    pose.mesh = { y: Math.abs(pump) * 0.03 };
    pose.headGroup = { rx: -0.1 };
    return pose;
  }
}

class Peek extends AnimationBase {
  constructor(options = {}) {
    super('Peek', positiveNumber(options.duration, 1.4));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const amp = Math.sin(t * Math.PI) * 0.6;
    // Lean out to the side, but don't twist the whole body like a pendulum
    pose.mesh = { x: amp * 0.22, y: Math.abs(amp) * 0.06 };
    pose.headGroup = { ry: -amp * 0.7, rx: -0.05 * Math.abs(amp) };
    pose.rightShoulder = { rx: -0.3 * amp, rz: 0.18 * Math.abs(amp) };
    return pose;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Overrides for default/common animations that clip into the body
// ─────────────────────────────────────────────────────────────────────────────

class CrossArms extends AnimationBase {
  constructor(options = {}) {
    super('CrossArms', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    let p = 0;
    if (t < 0.3) p = t / 0.3;
    else if (t < 0.7) p = 1;
    else p = 1 - (t - 0.7) / 0.3;
    const e = easeInOut(p);

    // Human-style arms-crossed: upper arms forward and across, forearms cross in front of chest
    pose.rightShoulder = { rx: -0.78 * e, ry: -0.42 * e, rz: 0.32 * e };
    pose.leftShoulder = { rx: -0.78 * e, ry: 0.42 * e, rz: -0.32 * e };
    pose.rightElbow = { rx: -1.12 * e };
    pose.leftElbow = { rx: -1.12 * e };
    pose.rightWrist = { ry: -0.2 * e, rz: -0.1 * e };
    pose.leftWrist = { ry: 0.2 * e, rz: 0.1 * e };
    pose.rightClavicle = { rz: 0.08 * e };
    pose.leftClavicle = { rz: -0.08 * e };
    pose.mesh = { rx: -0.04 * e };
    return pose;
  }
}

class MonkeyCross extends AnimationBase {
  constructor(options = {}) {
    super('MonkeyCross', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    let p = 0;
    if (t < 0.3) p = t / 0.3;
    else if (t < 0.7) p = 1;
    else p = 1 - (t - 0.7) / 0.3;
    const e = easeInOut(p);

    // Monkey arm-pivot coordinates: rx raises the arm, ry swings it across the body
    pose.rightShoulder = { rx: -0.85 * e, ry: 0.35 * e, rz: 0.25 * e };
    pose.leftShoulder = { rx: -0.85 * e, ry: -0.35 * e, rz: -0.25 * e };
    pose.rightElbow = { rx: -1.4 * e };
    pose.leftElbow = { rx: -1.4 * e };
    pose.rightWrist = { ry: -0.2 * e };
    pose.leftWrist = { ry: 0.2 * e };
    pose.mesh = { rx: -0.05 * e };
    return pose;
  }
}

class FacepalmHuman extends AnimationBase {
  constructor(options = {}) {
    super('FacepalmHuman', positiveNumber(options.duration, 1.3));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const amp = Math.min(1, t * 2.5);
    // Arm up to face, but elbow stays in front of the torso so the hand doesn't sink into the body
    pose.rightShoulder = { rx: -1.45 * amp, ry: 0.20 * amp, rz: 0.28 * amp };
    pose.rightElbow = { rx: -1.2 * amp };
    pose.rightWrist = { rx: -0.2 * amp, ry: 0.3 * amp };
    pose.headGroup = { rx: 0.12 * amp, ry: -0.08 * amp };
    return pose;
  }
}

class Laugh extends AnimationBase {
  constructor(options = {}) {
    super('Laugh', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const bounce = Math.sin(t * Math.PI * 4);
    const amp = 0.04 * (1 - t * 0.3);
    pose.mesh = { y: Math.abs(bounce) * amp };
    // Arms held loosely away from the torso so they don't clip through the body
    pose.leftShoulder = { rx: -0.25, ry: -0.15, rz: -0.25 };
    pose.rightShoulder = { rx: -0.25, ry: 0.15, rz: 0.25 };
    pose.leftElbow = { rx: -0.55 };
    pose.rightElbow = { rx: -0.55 };
    pose.leftWrist = { ry: -0.15 };
    pose.rightWrist = { ry: 0.15 };
    pose.headGroup = { rx: -0.12 + bounce * 0.06 };
    return pose;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Enhanced body-language animations using the full 13-joint hierarchy
// (headGroup, clavicles, shoulders, elbows, wrists, hips, knees, ankles + mesh)
// ─────────────────────────────────────────────────────────────────────────────

class MonkeyWave extends AnimationBase {
  constructor(options = {}) {
    super('MonkeyWave', positiveNumber(options.duration, 1.6));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const wave = Math.sin(t * TAU * 3);
    const amp = Math.sin(t * TAU * 0.5) * 0.5 + 0.5;
    // Right arm waves high, elbow bends naturally
    pose.rightShoulder = { rx: -2.6, ry: 0.2, rz: 0.4 };
    pose.rightElbow = { rx: -0.6 + wave * 0.25 };
    pose.rightWrist = { ry: wave * 0.5 };
    // Left arm hangs loosely
    pose.leftShoulder = { rx: -0.1, rz: -0.15 };
    pose.leftElbow = { rx: -0.25 };
    // Hips/knees bounce to the wave rhythm
    pose.mesh = { y: Math.abs(wave) * 0.025, rz: Math.sin(t * TAU) * 0.04 };
    pose.rightHip = { rx: wave * 0.08 };
    pose.leftHip = { rx: -wave * 0.08 };
    pose.rightKnee = { rx: Math.abs(wave) * 0.1 };
    pose.leftKnee = { rx: Math.abs(wave) * 0.1 };
    // Head bobs cheerfully
    pose.headGroup = { rx: -0.05 * amp, ry: 0.08 * Math.sin(t * TAU * 1.5) };
    return pose;
  }
}

class ScratchBelly extends AnimationBase {
  constructor(options = {}) {
    super('ScratchBelly', positiveNumber(options.duration, 2.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const scratch = Math.sin(t * TAU * 4);
    const e = easeInOut(Math.min(1, t * 2));
    // Both hands on belly, scratching motion
    pose.rightShoulder = { rx: -0.8 * e, rz: 0.5 * e };
    pose.rightElbow = { rx: -1.5 * e };
    pose.rightWrist = { rx: scratch * 0.2 * e, ry: 0.3 * e };
    pose.leftShoulder = { rx: -0.9 * e, rz: -0.4 * e };
    pose.leftElbow = { rx: -1.4 * e };
    pose.leftWrist = { rx: scratch * 0.15 * e, ry: -0.3 * e };
    // Shift weight side to side
    pose.mesh = { x: Math.sin(t * TAU) * 0.03 * e, ry: Math.sin(t * TAU) * 0.06 * e };
    pose.rightHip = { rx: Math.sin(t * TAU * 2) * 0.06 * e };
    pose.leftKnee = { rx: Math.abs(Math.sin(t * TAU * 2)) * 0.08 * e };
    // Happy/confused face
    pose.headGroup = { rx: 0.05 * e, ry: 0.1 * Math.sin(t * TAU) };
    return pose;
  }
}

class JumpExcited extends AnimationBase {
  constructor(options = {}) {
    super('JumpExcited', positiveNumber(options.duration, 1.2));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    // Two small hops
    const hop = Math.abs(Math.sin(t * TAU * 2));
    const armsUp = Math.sin(t * TAU * 1.5) * 0.5 + 0.5;
    pose.mesh = { y: hop * 0.12 };
    pose.rightShoulder = { rx: -2.6 * armsUp, ry: 0.3 };
    pose.leftShoulder = { rx: -2.6 * armsUp, ry: -0.3 };
    pose.rightElbow = { rx: -0.3 };
    pose.leftElbow = { rx: -0.3 };
    // Knees bend on landing
    pose.rightKnee = { rx: hop * 0.35 };
    pose.leftKnee = { rx: hop * 0.35 };
    pose.rightAnkle = { rx: -hop * 0.15 };
    pose.leftAnkle = { rx: -hop * 0.15 };
    pose.headGroup = { rx: -0.1 * armsUp };
    return pose;
  }
}

class InspectGlass extends AnimationBase {
  constructor(options = {}) {
    super('InspectGlass', positiveNumber(options.duration, 2.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = easeInOut(Math.min(1, t * 2));
    const scan = Math.sin(t * TAU * 1.5);
    // Lean forward onto glass
    pose.mesh = { rx: 0.18 * e, z: 0.18 * e };
    // Right hand pressed to glass
    pose.rightShoulder = { rx: -0.6 * e, ry: -0.2 * e };
    pose.rightElbow = { rx: -1.4 * e };
    pose.rightWrist = { rx: -0.3 * e, ry: scan * 0.1 };
    // Left hand on hip
    pose.leftShoulder = { rx: -0.3 * e, rz: -0.4 * e };
    pose.leftElbow = { rx: -1.0 * e };
    // Eyes follow movement
    pose.headGroup = { ry: scan * 0.2 * e, rx: 0.08 * e };
    // Tail stiff with curiosity
    pose.rightHip = { rx: 0.05 * e };
    pose.leftKnee = { rx: 0.1 * e };
    return pose;
  }
}

class TailFlick extends AnimationBase {
  constructor(options = {}) {
    super('TailFlick', positiveNumber(options.duration, 1.4));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t, elapsed, duration, time) {
    const pose = new PoseMatrix();
    const flick = Math.sin(t * TAU * 4);
    // Tail flick is handled by the monkey's tail mesh if available;
    // here we add a body bounce and excited arm motion.
    pose.mesh = { y: Math.abs(flick) * 0.015, rz: flick * 0.04 };
    pose.rightShoulder = { rx: -0.4, rz: 0.3 };
    pose.leftShoulder = { rx: -0.4, rz: -0.3 };
    pose.rightElbow = { rx: -0.8 + flick * 0.1 };
    pose.leftElbow = { rx: -0.8 - flick * 0.1 };
    pose.headGroup = { ry: flick * 0.08 };
    // Keep knees soft
    pose.rightKnee = { rx: 0.08 };
    pose.leftKnee = { rx: 0.08 };
    return pose;
  }
}

class ExcitedGesture extends AnimationBase {
  constructor(options = {}) {
    super('ExcitedGesture', positiveNumber(options.duration, 1.6));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const bounce = Math.sin(t * TAU * 3);
    const amp = Math.sin(t * TAU * 0.5) * 0.5 + 0.5;
    // Both hands gesture outward with energy
    pose.rightShoulder = { rx: -1.0, rz: 0.7 };
    pose.leftShoulder = { rx: -1.0, rz: -0.7 };
    pose.rightElbow = { rx: -0.8 + bounce * 0.15 };
    pose.leftElbow = { rx: -0.8 - bounce * 0.15 };
    pose.rightWrist = { ry: bounce * 0.3 };
    pose.leftWrist = { ry: -bounce * 0.3 };
    // Body bounces and sways
    pose.mesh = { y: Math.abs(bounce) * 0.03, rz: bounce * 0.05 };
    pose.rightHip = { rx: bounce * 0.08 };
    pose.leftHip = { rx: -bounce * 0.08 };
    pose.headGroup = { rx: -0.05 * amp, ry: bounce * 0.08 };
    return pose;
  }
}

class ShrugDeep extends AnimationBase {
  constructor(options = {}) {
    super('ShrugDeep', positiveNumber(options.duration, 1.4));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = Math.sin(t * TAU * 1.5) * 0.5 + 0.5;
    // Shoulders up, hands open
    pose.rightClavicle = { rz: 0.35 * e };
    pose.leftClavicle = { rz: -0.35 * e };
    pose.rightShoulder = { rx: -0.2, ry: -0.08 * e, rz: 0.58 * e };
    pose.leftShoulder = { rx: -0.2, ry: 0.08 * e, rz: -0.58 * e };
    pose.rightElbow = { rx: -1.1 * e };
    pose.leftElbow = { rx: -1.1 * e };
    pose.rightWrist = { rz: -0.3 * e };
    pose.leftWrist = { rz: 0.3 * e };
    // Slight knee bend
    pose.mesh = { y: -0.02 * e, rx: 0.03 * e };
    pose.rightKnee = { rx: 0.12 * e };
    pose.leftKnee = { rx: 0.12 * e };
    pose.headGroup = { rx: 0.05 * e, ry: 0.04 * Math.sin(t * TAU * 2) };
    return pose;
  }
}

class HandsOnHipsHuman extends AnimationBase {
  constructor(options = {}) {
    super('HandsOnHipsHuman', positiveNumber(options.duration, 2.0));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = easeInOut(Math.min(1, t * 2));
    const sway = Math.sin(t * TAU) * 0.5 + 0.5;
    // Hands planted on hips
    pose.rightShoulder = { rx: -0.18 * e, ry: -0.10 * e, rz: 0.78 * e };
    pose.rightElbow = { rx: -1.10 * e };
    pose.rightWrist = { rx: -0.2 * e, ry: 0.3 * e };
    pose.leftShoulder = { rx: -0.18 * e, ry: 0.10 * e, rz: -0.78 * e };
    pose.leftElbow = { rx: -1.10 * e };
    pose.leftWrist = { rx: -0.2 * e, ry: -0.3 * e };
    // Weight shift
    pose.mesh = { x: Math.sin(t * TAU) * 0.02 * e, rz: Math.sin(t * TAU) * 0.03 * e };
    pose.rightHip = { rx: sway * 0.06 * e };
    pose.leftHip = { rx: (1 - sway) * 0.06 * e };
    pose.headGroup = { ry: Math.sin(t * TAU * 0.7) * 0.06 * e };
    return pose;
  }
}

class LeanForward extends AnimationBase {
  constructor(options = {}) {
    super('LeanForward', positiveNumber(options.duration, 1.5));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = easeInOut(Math.min(1, t * 2));
    // Torso leans toward subject
    pose.mesh = { rx: 0.12 * e, z: 0.12 * e };
    // Pointing hand
    pose.rightShoulder = { rx: -0.68 * e, ry: -0.16 * e, rz: 0.28 * e };
    pose.rightElbow = { rx: -0.48 * e };
    pose.rightWrist = { rx: -0.2 * e };
    // Other hand back for balance
    pose.leftShoulder = { rx: -0.2 * e, ry: 0.05 * e, rz: -0.34 * e };
    pose.leftElbow = { rx: -0.4 * e };
    // Knees bend slightly to support lean
    pose.rightKnee = { rx: 0.15 * e };
    pose.leftKnee = { rx: 0.1 * e };
    pose.headGroup = { rx: 0.06 * e, ry: 0.05 * e };
    return pose;
  }
}

class DoublePoint extends AnimationBase {
  constructor(options = {}) {
    super('DoublePoint', positiveNumber(options.duration, 1.4));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const e = easeInOut(Math.min(1, t * 2));
    const pulse = Math.sin(t * TAU * 2.5);
    // Both index fingers point forward
    pose.rightShoulder = { rx: -0.78 * e, ry: -0.12 * e, rz: 0.30 * e };
    pose.rightElbow = { rx: -0.6 * e };
    pose.rightWrist = { rx: -0.3 * e + pulse * 0.05 };
    pose.leftShoulder = { rx: -0.78 * e, ry: 0.12 * e, rz: -0.30 * e };
    pose.leftElbow = { rx: -0.6 * e };
    pose.leftWrist = { rx: -0.3 * e + pulse * 0.05 };
    // Small bounce
    pose.mesh = { y: Math.abs(pulse) * 0.015 * e };
    pose.headGroup = { rx: -0.04 * e };
    return pose;
  }
}

class NervousFidget extends AnimationBase {
  constructor(options = {}) {
    super('NervousFidget', positiveNumber(options.duration, 1.8));
    this.usePoseMatrix = true;
  }
  getPoseMatrix(t) {
    const pose = new PoseMatrix();
    const fidget = Math.sin(t * TAU * 5);
    const shift = Math.sin(t * TAU * 1.2);
    // Rub hands together
    pose.rightShoulder = { rx: -0.38, ry: -0.08, rz: 0.42 };
    pose.rightElbow = { rx: -1.3 };
    pose.rightWrist = { ry: fidget * 0.4, rx: -0.3 };
    pose.leftShoulder = { rx: -0.38, ry: 0.08, rz: -0.42 };
    pose.leftElbow = { rx: -1.3 };
    pose.leftWrist = { ry: -fidget * 0.4, rx: -0.3 };
    // Shift weight nervously
    pose.mesh = { x: shift * 0.025, y: Math.abs(fidget) * 0.008 };
    pose.rightHip = { rx: shift * 0.06 };
    pose.leftKnee = { rx: Math.abs(shift) * 0.1 };
    pose.headGroup = { ry: shift * 0.06, rx: 0.04 };
    return pose;
  }
}

// Registration
// ─────────────────────────────────────────────────────────────────────────────

registerScene('ERScene', ZooMonkeyHillScene);
registerScene('HospitalCorridorScene', ZooGlassViewingScene);
registerScene('ReceptionScene', ZooHumanExhibitScene);

registerCharacter('Bai', Bai);
registerCharacter('Wen', Wen);
registerCharacter('Cheng', Cheng);
registerCharacter('Lan', Lan);
registerCharacter('XiaoMi', XiaoMi);

registerCharacter('阿翔', 阿翔);
registerCharacter('小红', 小红);
registerCharacter('小黑', 小黑);
registerCharacter('阿金', 阿金);
registerCharacter('小美', 小美);

registerAnimation('Sniff', Sniff);
registerAnimation('NoseTwitch', NoseTwitch);
registerAnimation('Intimidate', Intimidate);
registerAnimation('Flex', Flex);
registerAnimation('Facepalm', Facepalm);
registerAnimation('OpenFridge', OpenFridge);
registerAnimation('HoldBelly', HoldBelly);
registerAnimation('Confess', Confess);
registerAnimation('ShakeFist', ShakeFist);
registerAnimation('SweatDrop', SweatDrop);
registerAnimation('Gasp', Gasp);
registerAnimation('Stare', Stare);
registerAnimation('StepBack', StepBack);
registerAnimation('SlowNod', SlowNod);
registerAnimation('LookAround', LookAround);
registerAnimation('SniffWalk', SniffWalk);
registerAnimation('OrangutanWalk', OrangutanWalk);
registerAnimation('MandrillStrut', MandrillStrut);
registerAnimation('HatTip', HatTip);
registerAnimation('MagnifyInspect', MagnifyInspect);
registerAnimation('DramaticPose', DramaticPose);
registerAnimation('PanicWave', PanicWave);
registerAnimation('Shrug', Shrug);
registerAnimation('NervousLaugh', NervousLaugh);

// 13-joint enhanced monkey & human body-language animations
registerAnimation('CrossArms', CrossArms);
registerAnimation('MonkeyCross', MonkeyCross);

registerAnimation('MonkeyWave', MonkeyWave);
registerAnimation('ScratchBelly', ScratchBelly);
registerAnimation('JumpExcited', JumpExcited);
registerAnimation('InspectGlass', InspectGlass);
registerAnimation('TailFlick', TailFlick);

registerAnimation('ExcitedGesture', ExcitedGesture);
registerAnimation('ShrugDeep', ShrugDeep);
registerAnimation('HandsOnHipsHuman', HandsOnHipsHuman);
registerAnimation('LeanForward', LeanForward);
registerAnimation('DoublePoint', DoublePoint);
registerAnimation('NervousFidget', NervousFidget);

registerAnimation('TakePhoto', TakePhoto);
registerAnimation('KnockGlass', KnockGlass);
registerAnimation('SelfiePose', SelfiePose);
registerAnimation('EatPopcorn', EatPopcorn);
registerAnimation('Laugh', Laugh);
registerAnimation('Surprised', Surprised);
registerAnimation('AngryShake', AngryShake);
registerAnimation('HandsUp', HandsUp);
registerAnimation('BowDeep', BowDeep);
registerAnimation('PointLeft', PointLeft);
registerAnimation('PointRight', PointRight);
registerAnimation('SpreadArms', SpreadArms);
registerAnimation('Stomp', Stomp);
registerAnimation('TurnAround', TurnAround);
registerAnimation('FacepalmHuman', FacepalmHuman);
registerAnimation('Cheer', Cheer);
registerAnimation('Peek', Peek);

registerAnimation('FaceProud', FaceProud);
registerAnimation('FaceWorried', FaceWorried);
registerAnimation('FaceScared', FaceScared);
registerAnimation('FaceCry', FaceCry);
registerAnimation('FaceGrin', FaceGrin);
registerAnimation('FaceRelaxed', FaceRelaxed);
registerAnimation('FaceDisgusted', FaceDisgusted);
registerAnimation('FaceSly', FaceSly);
registerAnimation('FaceAnnoyed', FaceAnnoyed);
registerAnimation('FaceShocked', FaceShocked);
registerAnimation('FaceExcited', FaceExcited);
registerAnimation('FaceBored', FaceBored);
registerAnimation('FaceSuspicious', FaceSuspicious);
registerAnimation('FaceEmbarrassed', FaceEmbarrassed);
registerAnimation('FacePleading', FacePleading);

registerAnimation('FaceHappy', FaceHappy);
registerAnimation('FaceSad', FaceSad);
registerAnimation('FaceAngry', FaceAngry);
registerAnimation('FaceSurprised', FaceSurprised);
registerAnimation('FaceDetermined', FaceDetermined);
registerAnimation('FaceSmirk', FaceSmirk);
registerAnimation('FaceConfused', FaceConfused);
registerAnimation('FaceLaugh', FaceLaugh);
registerAnimation('FaceDisappointed', FaceDisappointed);
