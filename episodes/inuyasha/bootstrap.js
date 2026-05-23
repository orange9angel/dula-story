/**
 * Inuyasha — Story Bootstrap
 * Registers official Dula assets plus episode-local characters, scene, and actions.
 */
import { registerAll } from 'dula-assets';
import { registerAnimation, registerCharacter, registerScene, TransitionBase, registerTransition } from 'dula-engine';
import * as THREE from 'three';

import { Inuyasha } from './characters/Inuyasha.js';
import { Kagome } from './characters/Kagome.js';
import { Yokai } from './characters/Yokai.js';
import { FeudalForestScene } from './scenes/FeudalForestScene.js';
import { ArcheryAim } from './animations/ArcheryAim.js';
import { DrawTessaiga } from './animations/DrawTessaiga.js';
import { GuardStance } from './animations/GuardStance.js';
import { WindScar } from './animations/WindScar.js';

registerAll();

registerCharacter('Inuyasha', Inuyasha);
registerCharacter('Yokai', Yokai);
registerCharacter('Kagome', Kagome);
registerScene('FeudalForestScene', FeudalForestScene);
registerAnimation('ArcheryAim', ArcheryAim);
registerAnimation('DrawTessaiga', DrawTessaiga);
registerAnimation('GuardStance', GuardStance);
registerAnimation('WindScar', WindScar);

class Flash extends TransitionBase {
  constructor(options = {}) {
    super(options);
    this.duration = options.duration ?? 0.45;
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
          float flash = exp(-pow((uProgress - 0.25) * 6.0, 2.0));
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
