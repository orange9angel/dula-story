import { CameraMoveBase } from 'dula-engine';
import * as THREE from 'three';

/**
 * ArrowFollow - 跟随箭矢射出的轨迹镜头
 * 快速推进，模拟箭矢飞射的视角
 */
export class ArrowFollow extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 2.5 });
    this.targetPos = this._parseVec(options.targetPos, new THREE.Vector3(0, 1.3, 0));
    this.startDistance = options.startDistance ?? 5.0;
    this.endDistance = options.endDistance ?? 12.0;
    this.height = options.height ?? 1.5;
    this.angle = options.angle ?? 0.2;
    this.shakeIntensity = options.shakeIntensity ?? 0.06;
  }

  _parseVec(v, defaultVec) {
    if (!v) return defaultVec;
    if (Array.isArray(v)) return new THREE.Vector3(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
    if (v instanceof THREE.Vector3) return v.clone();
    if (typeof v === 'object' && (v.x !== undefined || v.y !== undefined || v.z !== undefined)) {
      return new THREE.Vector3(v.x ?? 0, v.y ?? 0, v.z ?? 0);
    }
    if (typeof v === 'string') {
      const parts = v.split(',').map(Number);
      return new THREE.Vector3(parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0);
    }
    return defaultVec;
  }

  start(camera, context) {
    super.start(camera, context);
  }

  update(t, camera, context) {
    // Fast acceleration then coast
    const ease = t < 0.3 ? t * t * 5.56 : 0.5 + (t - 0.3) * 0.71;

    const dist = this.startDistance + (this.endDistance - this.startDistance) * ease;

    const x = this.targetPos.x + Math.sin(this.angle) * dist;
    const z = this.targetPos.z + Math.cos(this.angle) * dist;
    const y = this.height + Math.sin(ease * Math.PI * 0.5) * 0.3;

    camera.position.set(x, y, z);
    camera.lookAt(this.targetPos.x, this.targetPos.y, this.targetPos.z);

    // Intense shake during acceleration
    const shake = this.shakeIntensity * (1 - ease * 0.5);
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
  }
}
