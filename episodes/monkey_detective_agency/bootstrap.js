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
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('BANANA', 128, 220);
  ctx.font = '20px sans-serif';
  ctx.fillText('Protect at all costs', 128, 260);
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
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NO', 128, 240);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('RUNNING', 128, 290);
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

// ─────────────────────────────────────────────────────────────────────────────
// Scene: ERScene — 猴子急诊室
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
    for (const [sx, text] of [[-8, '急诊室'], [0, '挂号处'], [8, '收费处']]) {
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
    ]);
  }

  update(time, delta) {
    super.update(time, delta);
    // Pin pupils to the centre of the eye after all animations/tracking have run.
    // This prevents pose-based pupil offsets and eye-tracking from making the
    // black dots wander off the face and look like floating objects.
    if (this.leftPupil) {
      this.leftPupil.position.x = this.leftPupil.userData.baseX ?? 0;
      this.leftPupil.position.y = this.leftPupil.userData.baseY ?? 0;
    }
    if (this.rightPupil) {
      this.rightPupil.position.x = this.rightPupil.userData.baseX ?? 0;
      this.rightPupil.position.y = this.rightPupil.userData.baseY ?? 0;
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
      const facingCamera = toCam.dot(headForward) > -0.25;
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
    const eyeRadius = 0.032;
    const pupilRadius = 0.012;
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

    const eyeX = 0.074;
    const eyeY = 0.028;
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
// Monkey ER cast
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
    this.displayName = '白医生';
    this.bio = '白冷森，白面僧面猴，急诊室主治医师。冷面逻辑怪，信奉“先检查钱包，再检查病人”。';
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
    this.displayName = '闻医生';
    this.bio = '闻多多，长鼻猴，嗅诊医师。棕色毛、大肚、长鼻子。笑点：诊断靠闻，但闻完总想吃。';
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

    // Doctor head mirror
    const mirrorBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.4, roughness: 0.3 })
    );
    mirrorBand.position.set(0, 0.22, 0);
    headGroup.add(mirrorBand);
    const mirrorDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.2 })
    );
    mirrorDisc.rotation.x = Math.PI / 2;
    mirrorDisc.position.set(0.12, 0.22, 0.05);
    headGroup.add(mirrorDisc);

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

  constructor() {
    super('Cheng');
    this.displayName = '橙护士';
    this.bio = '橙大力，红猩猩，急诊室护士/理疗师。红橙毛、无尾、手臂极长，力气大到能把病人甩飞。';
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

    // Nurse cap
    const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.22), capMat);
    cap.position.set(0, 0.25, 0);
    headGroup.add(cap);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.02), new THREE.MeshStandardMaterial({ color: 0xe63946 }));
    crossV.position.set(0, 0.25, 0.11);
    headGroup.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), new THREE.MeshStandardMaterial({ color: 0xe63946 }));
    crossH.position.set(0, 0.25, 0.11);
    headGroup.add(crossH);

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
    this.displayName = '蓝医生';
    this.bio = '蓝凶凶，山魈，瞪眼疗法医师。蓝脸红鼻、白獠牙，长得凶但治疗方案只有一个：瞪。';
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
    this.displayName = '毛小病';
    this.bio = '毛小病，普通猕猴，急诊室常客预备役。本次病因：踩到香蕉皮，尾巴“没知觉”。';
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

// ─────────────────────────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────────────────────────

registerScene('ERScene', ERScene);
registerScene('HospitalCorridorScene', HospitalCorridorScene);
registerScene('ReceptionScene', ReceptionScene);

registerCharacter('Bai', Bai);
registerCharacter('Wen', Wen);
registerCharacter('Cheng', Cheng);
registerCharacter('Lan', Lan);
registerCharacter('XiaoMi', XiaoMi);

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
