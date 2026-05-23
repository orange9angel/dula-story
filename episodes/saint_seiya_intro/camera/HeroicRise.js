import { CameraMoveBase } from 'dula-engine';
import * as THREE from 'three';

/**
 * HeroicRise - 跟随角色从低到高的仰拍
 * 角色站起时相机同步上升，强调英雄崛起
 */
export class HeroicRise extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 3.0 });
    this.targetPos = this._parseVec(options.targetPos, new THREE.Vector3(0, 1.0, 0));
    this.startHeight = options.startHeight ?? 0.5;
    this.endHeight = options.endHeight ?? 1.8;
    this.distance = options.distance ?? 3.5;
    this.angle = options.angle ?? -0.5;
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
    // 上升曲线：先快后慢（ease-out）
    const ease = 1 - Math.pow(1 - t, 3);

    const height = this.startHeight + (this.endHeight - this.startHeight) * ease;

    const x = this.targetPos.x + Math.sin(this.angle) * this.distance;
    const z = this.targetPos.z + Math.cos(this.angle) * this.distance;

    camera.position.set(x, height, z);

    // 看向角色，随上升略微调整
    const lookY = this.targetPos.y + 0.5 + ease * 0.3;
    camera.lookAt(this.targetPos.x, lookY, this.targetPos.z);

    // 轻微推近
    const pushIn = ease * 0.5;
    const dist = this.distance - pushIn;
    camera.position.x = this.targetPos.x + Math.sin(this.angle) * dist;
    camera.position.z = this.targetPos.z + Math.cos(this.angle) * dist;
  }
}
