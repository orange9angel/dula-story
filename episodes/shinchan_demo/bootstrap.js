import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import {
  AnimationBase,
  CharacterBase,
  registerAnimation,
  registerCharacter,
  registerScene,
  SceneBase,
} from 'dula-engine';

registerAll();

function makeToonGradient() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 4, 0);
  g.addColorStop(0, '#666');
  g.addColorStop(0.5, '#bbb');
  g.addColorStop(1, '#fff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

// ═════════════════════════════════════════════════════════════════════════════
// 蜡笔小新 — 简单几何版
// ═════════════════════════════════════════════════════════════════════════════

class ShinChan extends CharacterBase {
  constructor() {
    super('ShinChan');
    this.boundingRadius = 0.35;
    this.trustedBodyAnimations = ['WaveHand', 'Nod', 'Celebrate', 'FaceHappy', 'FaceGrin'];
    this.allowedBodyAnimations = new Set(this.trustedBodyAnimations);
  }

  build() {
    const gradient = makeToonGradient();
    const skinMat = new THREE.MeshToonMaterial({ color: 0xffdfc4, gradientMap: gradient });
    const hairMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: gradient });
    const shirtMat = new THREE.MeshToonMaterial({ color: 0xe60033, gradientMap: gradient });
    const shortsMat = new THREE.MeshToonMaterial({ color: 0xffcc00, gradientMap: gradient });
    const shoeMat = new THREE.MeshToonMaterial({ color: 0xffeebb, gradientMap: gradient });
    const blackMat = new THREE.MeshToonMaterial({ color: 0x111111, gradientMap: gradient });
    const whiteMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: gradient });
    const browMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: gradient });

    // ── Head group ──
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.25;

    // Potato-shaped face (sphere scaled)
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 32), skinMat);
    face.scale.set(1.15, 0.95, 1.05);
    face.castShadow = true;
    headGroup.add(face);

    // Hair (short, simple cap)
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.285, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.scale.set(1.15, 1, 1.05);
    hair.position.set(0, 0.04, -0.02);
    headGroup.add(hair);

    // Thick eyebrows (Shin-chan signature)
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.02), browMat);
      brow.position.set(side * 0.09, 0.08, 0.26);
      brow.rotation.z = side * 0.15;
      headGroup.add(brow);
    }

    // Small eyes
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), blackMat);
      eye.position.set(side * 0.08, 0.0, 0.27);
      eye.scale.set(1, 1, 0.5);
      headGroup.add(eye);
    }

    // Cheeky "o" mouth
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), new THREE.MeshToonMaterial({ color: 0xcc5555, gradientMap: gradient }));
    mouth.position.set(0, -0.12, 0.26);
    mouth.scale.set(1.2, 0.6, 0.5);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = mouth.scale.x;
    this.mouthBaseScaleY = mouth.scale.y;
    this.mouthBaseScaleZ = mouth.scale.z;

    // Blush dots
    for (const side of [-1, 1]) {
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshToonMaterial({ color: 0xffaaaa, gradientMap: gradient }));
      blush.position.set(side * 0.18, -0.05, 0.22);
      blush.scale.set(1, 0.6, 0.5);
      headGroup.add(blush);
    }

    this.headGroup = headGroup;
    this.mesh.add(headGroup);

    // ── Body ──
    // Red shirt (box)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.22), shirtMat);
    torso.position.y = 0.78;
    torso.castShadow = true;
    this.mesh.add(torso);

    // Yellow shorts
    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.24), shortsMat);
    shorts.position.y = 0.52;
    this.mesh.add(shorts);

    // Arms
    const addArm = (side) => {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 12), skinMat);
      arm.position.set(side * 0.22, 0.78, 0);
      arm.rotation.z = side * 0.3;
      this.mesh.add(arm);
      if (side === -1) this.leftArm = arm;
      else this.rightArm = arm;
    };
    addArm(-1);
    addArm(1);

    // Legs
    const addLeg = (side) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.18, 4, 12), skinMat);
      leg.position.set(side * 0.1, 0.32, 0);
      this.mesh.add(leg);

      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), shoeMat);
      shoe.position.set(side * 0.1, 0.16, 0.03);
      shoe.scale.set(1, 0.7, 1.4);
      this.mesh.add(shoe);
    };
    addLeg(-1);
    addLeg(1);

    this._captureFaceBaseState();
  }

  update(time, delta) {
    super.update(time, delta);
    // Subtle idle sway
    if (this.headGroup) {
      this.headGroup.rotation.y = Math.sin(time * 2) * 0.05;
      this.headGroup.rotation.z = Math.sin(time * 1.5) * 0.03;
    }
  }
}

registerCharacter('ShinChan', ShinChan);

// ═════════════════════════════════════════════════════════════════════════════
// 简单挥手动画
// ═════════════════════════════════════════════════════════════════════════════

class ShinChanWave extends AnimationBase {
  constructor(options = {}) {
    super('ShinChanWave', Number(options.duration) || 2.0);
  }

  update(t, character) {
    if (character.rightArm) {
      character.rightArm.rotation.z = -0.3 + Math.sin(t * Math.PI * 6) * 0.4;
    }
  }
}

registerAnimation('ShinChanWave', ShinChanWave);

// ═════════════════════════════════════════════════════════════════════════════
// 简单纯色场景
// ═════════════════════════════════════════════════════════════════════════════

class ShinChanScene extends SceneBase {
  constructor() {
    super();
    this.name = 'ShinChanScene';
  }

  build() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // sky blue

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x90ee90, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Soft ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    // Directional key light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(3, 6, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    this.scene = scene;
    this.lights = [ambient, dirLight];
    return scene;
  }
}

registerScene('ShinChanScene', ShinChanScene);
