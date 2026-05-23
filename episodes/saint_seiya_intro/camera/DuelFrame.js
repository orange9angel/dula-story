import { CameraMoveBase } from 'dula-engine';
import * as THREE from 'three';

/**
 * DuelFrame - 双人构图镜头
 * 同时框住两个角色，营造对峙或并肩感
 */
export class DuelFrame extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 4.0 });
    this.targetPos = this._parseVec(options.targetPos, new THREE.Vector3(0, 1.3, 0));
    this.distance = options.distance ?? 6.0;
    this.height = options.height ?? 1.6;
    this.angle = options.angle ?? 0.4;
    this.tilt = options.tilt ?? 0.08;
    this.driftAmount = options.driftAmount ?? 0.3;
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
    const ease = t * t * (3 - 2 * t);

    // Slow drift from side to center
    const drift = Math.sin(ease * Math.PI) * this.driftAmount;
    const currentAngle = this.angle + drift * 0.5;

    const x = this.targetPos.x + Math.sin(currentAngle) * this.distance;
    const z = this.targetPos.z + Math.cos(currentAngle) * this.distance;
    const y = this.height + Math.sin(ease * Math.PI) * this.tilt;

    camera.position.set(x, y, z);

    // Look at midpoint between characters with slight height adjustment
    const lookY = this.targetPos.y + 0.1 + Math.sin(ease * Math.PI) * 0.08;
    camera.lookAt(this.targetPos.x, lookY, this.targetPos.z);

    // Very subtle breathing drift
    const breathe = Math.sin(t * Math.PI * 1.5) * 0.004;
    camera.position.y += breathe;
  }
}
