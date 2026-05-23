import { CameraMoveBase } from 'dula-engine';
import * as THREE from 'three';

/**
 * DramaticLowAngle - 极低角度仰拍
 * 强调角色的气势和英雄感
 */
export class DramaticLowAngle extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 3.0 });
    this.targetPos = this._parseVec(options.targetPos, new THREE.Vector3(0, 1.2, 0));
    this.startDistance = options.startDistance ?? 4.5;
    this.endDistance = options.endDistance ?? 3.0;
    this.height = options.height ?? 0.3;
    this.startAngle = options.startAngle ?? -0.6;
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
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out

    const angle = this.startAngle + (this.endAngle - this.startAngle) * ease;
    const dist = this.startDistance + (this.endDistance - this.startDistance) * ease;

    const x = this.targetPos.x + Math.sin(angle) * dist;
    const y = this.height + Math.sin(ease * Math.PI * 0.3) * 0.2;
    const z = this.targetPos.z + Math.cos(angle) * dist;

    camera.position.set(x, y, z);
    camera.lookAt(this.targetPos.x, this.targetPos.y + 0.3, this.targetPos.z);

    // 轻微镜头晃动（手持感）
    const shake = Math.sin(t * Math.PI * 8) * 0.008 * (1 - ease);
    camera.position.y += shake;
  }
}
