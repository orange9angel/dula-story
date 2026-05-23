import { CameraMoveBase } from 'dula-engine';
import * as THREE from 'three';

/**
 * QuickCutZoom - 快速推近+震动
 * 配合打击感使用
 */
export class QuickCutZoom extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 1.5 });
    this.targetPos = this._parseVec(options.targetPos, new THREE.Vector3(0, 1.2, 0));
    this.startDistance = options.startDistance ?? 5.0;
    this.endDistance = options.endDistance ?? 2.0;
    this.impactTime = options.impactTime ?? 0.6;
    this.shakeIntensity = options.shakeIntensity ?? 0.15;
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
    this.impactTriggered = false;
  }

  update(t, camera, context) {
    // 快速推近：先慢后快
    const zoomEase = t < 0.3 ? t / 0.3 * 0.2 : 0.2 + (t - 0.3) / 0.7 * 0.8;
    const dist = this.startDistance + (this.endDistance - this.startDistance) * zoomEase;

    // 基础位置
    const angle = -0.4;
    const x = this.targetPos.x + Math.sin(angle) * dist;
    const z = this.targetPos.z + Math.cos(angle) * dist;
    const y = 1.2 + (1 - zoomEase) * 0.3;

    camera.position.set(x, y, z);
    camera.lookAt(this.targetPos.x, this.targetPos.y + 0.2, this.targetPos.z);

    // 冲击时刻的剧烈震动
    if (t >= this.impactTime && t < this.impactTime + 0.3) {
      const impactT = (t - this.impactTime) / 0.3;
      const decay = 1 - impactT;
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * decay;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * decay;
      const shakeZ = (Math.random() - 0.5) * this.shakeIntensity * decay * 0.5;
      camera.position.x += shakeX;
      camera.position.y += shakeY;
      camera.position.z += shakeZ;
    }
  }
}
