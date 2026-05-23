import { CameraMoveBase } from 'dula-engine';
import * as THREE from 'three';

/**
 * SlowMotionOrbit - 慢动作环绕镜头
 * 配合pose使用，营造史诗感
 */
export class SlowMotionOrbit extends CameraMoveBase {
  constructor(options = {}) {
    super({ duration: options.duration ?? 4.0 });
    this.targetPos = this._parseVec(options.targetPos, new THREE.Vector3(0, 1.3, 0));
    this.radius = options.radius ?? 3.5;
    this.height = options.height ?? 1.4;
    this.startAngle = (options.startAngle ?? 0) * Math.PI;
    this.endAngle = (options.endAngle ?? 1) * Math.PI;
    this.tilt = options.tilt ?? 0.1;
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
    // 慢动作感：使用非常平滑的缓动
    const ease = t * t * (3 - 2 * t); // smoothstep

    const angle = this.startAngle + (this.endAngle - this.startAngle) * ease;

    const x = this.targetPos.x + Math.cos(angle) * this.radius;
    const z = this.targetPos.z + Math.sin(angle) * this.radius;
    const y = this.height + Math.sin(ease * Math.PI) * this.tilt;

    camera.position.set(x, y, z);

    // 始终看向角色，但带有轻微仰视
    const lookY = this.targetPos.y + 0.15 + Math.sin(ease * Math.PI) * 0.1;
    camera.lookAt(this.targetPos.x, lookY, this.targetPos.z);

    // 极轻微的镜头漂移（模拟电影感）
    const drift = Math.sin(t * Math.PI * 2) * 0.005;
    camera.position.y += drift;
  }
}
