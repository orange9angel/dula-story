import { AnimationBase } from 'dula-engine';

/**
 * VehicleDrive — 载具形态行驶动画
 *
 * 仅作用于 vehicleGroup：
 *   - 车身随路面轻微颠簸 / 侧倾
 *   - 圆柱形车轮绕自身轴心旋转
 *
 * 参数（通过 {Event:Animate|...|speed=...|bob=...|roll=...} 传入 options）：
 *   - duration: 动画时长（秒），默认 1.0
 *   - speed: 颠簸频率（Hz），默认 2.4
 *   - bob: 垂直颠簸幅度，默认 0.025
 *   - roll: 侧倾幅度，默认 0.015
 *   - wheelSpeed: 车轮转速（rad/s），默认 12.0
 */
export class VehicleDrive extends AnimationBase {
  constructor(options = {}) {
    super('VehicleDrive', Number(options.duration) || 1.0);
    this.tags = {
      requires: ['vehicleGroup'],
      suits: ['vehicle'],
      notSuits: [],
      minHeight: 0,
      maxHeight: Infinity,
    };

    this.speed = Number(options.speed) || 2.4;
    this.bob = Number(options.bob) || 0.025;
    this.roll = Number(options.roll) || 0.015;
    this.wheelSpeed = Number(options.wheelSpeed) || 12.0;
  }

  update(t, character) {
    if (!character.vehicleGroup || character.currentMode !== 'vehicle') return;

    const group = character.vehicleGroup;

    // 记录载具基准姿态：等变形完成后再采样，避免把 mid-transform 偏移当作基准。
    const transformDone = character.transformProgress === undefined || character.transformProgress >= 0.95;
    if (transformDone && !group.userData.vehicleDriveBase) {
      group.userData.vehicleDriveBase = {
        y: group.position.y,
        rx: group.rotation.x,
        ry: group.rotation.y,
        rz: group.rotation.z,
      };
    }
    const base = group.userData.vehicleDriveBase;
    if (!base) return;

    const elapsed = t * this.duration;

    // 车身颠簸 + 侧倾（非周期性重置，避免突兀跳变）
    group.position.y = base.y + Math.sin(elapsed * this.speed) * this.bob;
    group.rotation.z = base.rz + Math.sin(elapsed * this.speed * 0.7 + 1.0) * this.roll;

    // 车轮旋转：找出 vehicleGroup 下所有圆柱形网格，沿本地 X 轴滚动
    group.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      if (child.geometry.type !== 'CylinderGeometry') return;

      if (child.userData.vehicleDriveWheelBase === undefined) {
        child.userData.vehicleDriveWheelBase = child.rotation.x;
      }
      child.rotation.x = child.userData.vehicleDriveWheelBase + elapsed * this.wheelSpeed;
    });
  }
}
