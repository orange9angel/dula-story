/**
 * Star Travelers S1E1 — First Contact
 * Bootstrap: registers all assets and custom camera moves
 */
import { registerAll } from 'dula-assets';
import { registerCameraMove, registerTransition, TransitionBase } from 'dula-engine';
import { CameraSmoothMove } from '/node_modules/dula-engine/camera/CameraSmoothMove.js';
import * as THREE from 'three';

// Register all official assets (includes new aliens + scenes)
registerAll();

// Register smooth camera move
registerCameraMove('Smooth', CameraSmoothMove);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Custom Transitions ──
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Warp transition — star streak effect for space travel
 */
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
