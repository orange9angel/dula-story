/**
 * Yu Yu Hakusho — Story Bootstrap
 * Registers official assets from dula-assets (includes Yusuke, Kuwabara, SarayashikiRoofScene)
 */
import { registerAll } from 'dula-assets';
import { TransitionBase, registerTransition, registerCameraMove } from 'dula-engine';
import { CameraSmoothMove } from '/node_modules/dula-engine/camera/CameraSmoothMove.js';
import * as THREE from 'three';

// Register all official assets
registerAll();

// Register smooth camera move
registerCameraMove('Smooth', CameraSmoothMove);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Custom Transitions ──
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Flash transition — bright flash for spirit energy effects
 */
class Flash extends TransitionBase {
  constructor(options = {}) {
    super(options);
    this.duration = options.duration ?? 0.5;
    this.flashColor = options.flashColor || 0xffffff;
  }

  createOverlayMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uFlashColor: { value: new THREE.Color(this.flashColor) },
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
        uniform vec3 uFlashColor;
        varying vec2 vUv;
        void main() {
          float flash = exp(-pow((uProgress - 0.3) * 6.0, 2.0));
          gl_FragColor = vec4(uFlashColor, flash);
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

registerTransition('Flash', Flash);
