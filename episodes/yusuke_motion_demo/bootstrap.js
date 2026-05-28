/**
 * Yusuke Motion Demo — 幽助通用动作演示 + 关节点标记
 * 展示 40+ 种通用动作，开启关节可视化标记
 */
import { registerAll } from 'dula-assets';
import { TransitionBase, registerTransition } from 'dula-engine';
import * as THREE from 'three';

registerAll();

/**
 * Simple fade-to-black transition between demo segments
 */
class FadeToBlack extends TransitionBase {
  constructor(options = {}) {
    super(options);
    this.duration = options.duration ?? 0.4;
  }
  createOverlayMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { uProgress: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
      fragmentShader: `uniform float uProgress; varying vec2 vUv; void main(){ float a=1.0-abs(uProgress*2.0-1.0); gl_FragColor=vec4(0.0,0.0,0.0,a); }`,
      transparent: true, depthTest: false, depthWrite: false,
    });
  }
  update(t) {
    if (this.overlay?.material?.uniforms?.uProgress) {
      this.overlay.material.uniforms.uProgress.value = t;
    }
  }
}

registerTransition('FadeToBlack', FadeToBlack);
