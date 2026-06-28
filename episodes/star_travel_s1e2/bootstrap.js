/**
 * Star Travelers S1E2 — 太空相遇（Monkey Spaceship Encounter）
 * Bootstrap: registers official assets, monkey characters, custom ships & deep-space scene.
 */
import { registerAll } from 'dula-assets';
import {
  registerCameraMove,
  registerCharacter,
  registerScene,
  registerTransition,
  TransitionBase,
} from 'dula-engine';
import { CameraSmoothMove } from '/node_modules/dula-engine/camera/CameraSmoothMove.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import Bai, { Cheng } from './characters/Bai.js';
import { Command } from './characters/Command.js';
import { PurpleShip, MonkeyShip } from './characters/ships.js';
import { DeepSpaceScene } from './scenes/DeepSpaceScene.js';
import { BrightSpaceStationScene } from './scenes/BrightSpaceStationScene.js';

// ── Pre-load CC0 spaceship GLB models so ships can be built synchronously ──
const loader = new GLTFLoader();
async function preloadShipModels() {
  const [purpleGltf, monkeyGltf] = await Promise.all([
    loader.loadAsync('/episode/assets/models/purple_ship.glb'),
    loader.loadAsync('/episode/assets/models/monkey_ship.glb'),
  ]);
  window.__dulaShipModels = {
    purple: purpleGltf.scene,
    monkey: monkeyGltf.scene,
  };
  console.log('[Bootstrap] Ship models pre-loaded:', Object.keys(window.__dulaShipModels));
}
await preloadShipModels();

// ── Official assets ──
registerAll();

// ── Episode-specific characters / ships ──
registerCharacter('Bai', Bai);
registerCharacter('Cheng', Cheng);
registerCharacter('Command', Command);
registerCharacter('PurpleShip', PurpleShip);
registerCharacter('MonkeyShip', MonkeyShip);

// ── Episode-specific scene ──
registerScene('DeepSpaceScene', DeepSpaceScene);
registerScene('BrightSpaceStationScene', BrightSpaceStationScene);

// ── Camera moves ──
registerCameraMove('Smooth', CameraSmoothMove);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Custom Transition: Warp（星流跃迁）──
// ═══════════════════════════════════════════════════════════════════════════════

class Warp extends TransitionBase {
  constructor(options = {}) {
    super(options);
    this.duration = options.duration ?? 1.0;
  }

  createOverlayMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(0x44aaff) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float streaks = sin(vUv.y * 50.0 + uProgress * 10.0) * 0.5 + 0.5;
          float alpha = streaks * (1.0 - abs(uProgress - 0.5) * 2.0) * 0.5;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  update(t) {
    if (this.overlay?.material?.uniforms?.uProgress) {
      this.overlay.material.uniforms.uProgress.value = t;
    }
  }
}

registerTransition('Warp', Warp);
