import { CameraMoveBase } from 'dula-engine';
import * as THREE from 'three';

/**
 * GoldenReveal - 从地面仰拍金色光芒中降临的角色
 * 极低角度，强调神圣感和压迫感
 */
export class GoldenReveal extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 4.0 });
    this.targetPos = this._parseVec(options.targetPos, new THREE.Vector3(0, 1.5, 0));
    this.startDistance = options.startDistance ?? 8.0;
    this.endDistance = options.endDistance ?? 3.5;
    this.startHeight = options.startHeight ?? 0.2;
    this.endHeight = options.endHeight ?? 1.0;
    this.startAngle = options.startAngle ?? -0.9;
    this.endAngle = options.endAngle ?? -0.3;
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
    this.startPos = camera.position.clone();
  }

  update(t, camera, context) {
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const angle = this.startAngle + (this.endAngle - this.startAngle) * ease;
    const dist = this.startDistance + (this.endDistance - this.startDistance) * ease;
    const height = this.startHeight + (this.endHeight - this.startHeight) * ease;

    const x = this.targetPos.x + Math.sin(angle) * dist;
    const z = this.targetPos.z + Math.cos(angle) * dist;
    const y = height;

    camera.position.set(x, y, z);
    camera.lookAt(this.targetPos.x, this.targetPos.y + 0.2, this.targetPos.z);

    // Subtle lens flare shake
    const shake = Math.sin(t * Math.PI * 6) * 0.006 * (1 - ease);
    camera.position.y += shake;
  }
}
