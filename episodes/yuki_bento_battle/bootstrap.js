import { registerAll } from 'dula-assets';
import { CharacterRegistry, SceneRegistry, registerCharacter, registerScene, registerAnimation, sketchify, BoilSystem, AnimationBase, PoseMatrix } from 'dula-engine';
import * as THREE from 'three';
import { YukiRoomScene } from './scenes/YukiRoomScene.js';

registerAll();

// ── 角色：手绘描边 + 12fps 沸腾线 ──────────────────────────────────────
function sketchVariant(name, seed) {
  const Base = CharacterRegistry[name];
  class SketchVariant extends Base {
    build() {
      super.build();
      sketchify(this.mesh, {
        color: 0x2a2320,
        width: 0.012,
        threshold: 40,
        seed,
      });
      BoilSystem.add(this.mesh, { amplitude: 0.004, fps: 12 });
    }

    update(time, delta) {
      super.update(time, delta);
      BoilSystem.update(time);
    }
  }
  return SketchVariant;
}

// 小雪 Q 版腿部的最终形态（前几个版本的教训见下）：
// 原资产是 腿胶囊 + 袜圆柱 + 扁圆球鞋 三段独立网格，轴心不一致，
// 跑步摆动时鞋和小腿错位、袜鞋描边互相戳出，各种角度都像"断腿"。
// 现在：摘掉圆球鞋，换成与腿同轴的靴子胶囊（不可能错位）；
// 所有修改在 sketchify 描边之前完成，靴子也有手绘轮廓。
// 裙子加长（scale.y 1.4）盖住安全裤，任何角度不漏。
//
// 平躺睡姿的攻防记录（别再踩坑）：
// - pose 矩阵写 mesh.rx 会被 JointLimits 硬夹 ±30°（躺不平）；
// - legacy 动画 update 里置标志位的方案也不行——_actionMatrix 不存在时
//   SceneBase 会另建一套约束系统，照样夹掉；
// - 所以 LieSleep 注册为矩阵动画（让 Yuki 提前拥有 _actionMatrix +
//   约束系统），update 里关掉硬限制并直接写 rx。
class ShoeFixedYuki extends CharacterRegistry['Yuki'] {
  build() {
    super.build();
    for (const legGroup of [this.leftLeg, this.rightLeg]) {
      if (!legGroup) continue;
      for (const child of [...legGroup.children]) {
        const type = child.geometry?.type;
        if (type === 'SphereGeometry') {
          legGroup.remove(child); // 摘掉扁圆球鞋
        } else if (type === 'CylinderGeometry') {
          child.position.y = -0.42; // 袜子（小腿中部白色袜圈）
          child.scale.set(1.12, 1.0, 1.12);
        }
      }
      // 与腿同轴的靴子胶囊：顶接袜底、底与原鞋同高，摆动时永不错位
      const boot = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.066, 0.02, 4, 12),
        new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.85 })
      );
      boot.position.set(0, -0.545, 0.005);
      boot.castShadow = true;
      legGroup.add(boot);
    }
    // 裙子：加长盖住裙底，引用留给躺窗收裙用
    this._skirt = null;
    this._skirtHem = null;
    for (const child of this.mesh.children) {
      if (child.geometry?.type === 'CylinderGeometry') {
        if (Math.abs(child.position.y - 0.72) < 0.01) this._skirt = child;
        if (Math.abs(child.position.y - 0.845) < 0.01) this._skirtHem = child;
      }
    }
    if (this._skirt) {
      // 裙摆是开口圆锥（openEnded），内侧会看穿：改双面渲染
      this._skirt.material.side = THREE.DoubleSide;
      this._skirt.scale.set(1.06, 1.4, 1.06); // 加长盖住安全裤
      this._skirt.position.y = 0.69;
      // 安全裤（深蓝椭球包住髋部），被加长裙摆完全遮住
      const bloomers = new THREE.Mesh(
        new THREE.SphereGeometry(0.145, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.9 })
      );
      bloomers.scale.set(1.05, 0.72, 0.95);
      bloomers.position.y = 0.62;
      this.mesh.add(bloomers);
    }
    // 手绘描边 + 沸腾线（与 sketchVariant 同款参数，靴子也参与）
    sketchify(this.mesh, { color: 0x2a2320, width: 0.012, threshold: 40, seed: 11 });
    BoilSystem.add(this.mesh, { amplitude: 0.004, fps: 12 });
    // this.mesh 是 Group，onBeforeRender 只在真正可渲染的 Mesh 上触发，
    // 随便挑一个子 Mesh 挂钩子，回调里改的是根 Group 的旋转。
    let hookMesh = null;
    this.mesh.traverse((o) => { if (!hookMesh && o.isMesh) hookMesh = o; });
    if (hookMesh) hookMesh.onBeforeRender = () => this.applyLyingBeforeRender();
  }

  _tuckSkirt(lying) {
    if (!this._skirt) return;
    if (lying) {
      // 躺下时裙子顺腿放下盖住大腿（睡裙感），避免掀裙走光
      this._skirt.rotation.x = 1.35;
      this._skirt.scale.set(1.2, 2.0, 1.35);
      this._skirt.position.y = 0.66;
    } else {
      this._skirt.rotation.x = 0;
      this._skirt.scale.set(1.06, 1.4, 1.06);
      this._skirt.position.y = 0.69;
    }
  }

  update(time, delta) {
    this._lastUpdateTime = time;
    super.update(time, delta);
    BoilSystem.update(time);
    const am = this._actionMatrix;
    if (!am) return;
    const cs = am._constraintSystem;
    if (cs) {
      if (cs._config.enableJointLimits) cs._config.enableJointLimits = false;
      if (cs._config.enableVelocitySmooth) cs._config.enableVelocitySmooth = false;
    }
    const lying = am._matrixAnims.some(
      a => a.name === 'LieSleep' && time >= a.startTime && time <= a.endTime
    );
    if (lying && this.mesh) {
      // 仰面躺平（头朝 -z 枕方向）+ 呼吸起伏 + 裙子顺腿放下
      this._wasLying = true;
      this.mesh.rotation.x = -Math.PI / 2 * 0.96 + Math.sin(time * 1.6) * 0.012;
      this._tuckSkirt(true);
    } else if (this._wasLying && this.mesh) {
      this._wasLying = false;
      this.mesh.rotation.x = 0;
      this._tuckSkirt(false);
      // 躺平期间若有 Position 瞬移，teleportBaselineToCurrent 会把 rx=-86°
      // 捕获进动画基线，导致之后所有 mesh.rx 姿势（如 Run 的前倾）都叠加在
      // 躺平值上（人躺着跑）。躺窗结束时把基线 rx 修回 0。
      if (am._baselinePose?.mesh) am._baselinePose.mesh.rx = 0;
    }
    // 防翻个儿：走位 lookAt 与矩阵姿势的 rx 恢复叠加，欧拉角可能落在
    // rz=±π 的翻转解上（人倒立进地板、只剩鞋露在外面）。非躺平状态下
    // rz 归零、rx 收在正常范围内。
    if (!lying && this.mesh) {
      if (Math.abs(this.mesh.rotation.z) > 0.6) this.mesh.rotation.z = 0;
      if (this.mesh.rotation.x > 0.6) this.mesh.rotation.x = 0.1;
      else if (this.mesh.rotation.x < -0.6) this.mesh.rotation.x = -0.1;
    }
  }

  // onBeforeRender 是帧内最后机会：任何后置约束/复位都跑完了。
  // 仰卧旋转在这里兜底再写一次，保证渲染出来的就是躺平姿态。
  applyLyingBeforeRender() {
    const t = this._lastUpdateTime ?? 0;
    const am = this._actionMatrix;
    if (!am || !this.mesh) return;
    const lying = am._matrixAnims.some(
      a => a.name === 'LieSleep' && t >= a.startTime && t <= a.endTime
    );
    if (lying) {
      this.mesh.rotation.x = -Math.PI / 2 * 0.96 + Math.sin(t * 1.6) * 0.012;
    }
  }
}

registerCharacter('Yuki', ShoeFixedYuki);
registerCharacter('Mochi', sketchVariant('Mochi', 23));
registerCharacter('Kenta', sketchVariant('Kenta', 37));
registerCharacter('Gulu', sketchVariant('Gulu', 7));
registerCharacter('Flash', sketchVariant('Flash', 41));
registerCharacter('Dodo', sketchVariant('Dodo', 53));

// ── LieSleep：平躺睡姿时间窗标记（矩阵动画，空姿势；实际平躺旋转由
//    ShoeFixedYuki.update 在这个窗口内直接写 mesh.rotation.x） ────────────
class LieSleep extends AnimationBase {
  constructor(options = {}) {
    super('LieSleep', Number(options.duration) || 1.0);
    this.usePoseMatrix = true;
    this.tags = { requires: [], suits: ['humanoid'] };
  }

  getPoseMatrix(t) {
    return new PoseMatrix(); // 空姿势：关节保持基线
  }
}

registerAnimation('LieSleep', LieSleep);

// ── 场景：静态水墨描边（背景如手绘动画一样只画一次，不沸腾） ──────────────
// 地面/水面/天空等平面与超大件不描边（反转壳不适用开放平面）
function sketchSceneVariant(name, { width = 0.02, seed = 5 } = {}) {
  const Base = SceneRegistry[name];
  class SketchScene extends Base {
    build() {
      const scene = super.build();
      sketchify(scene, {
        color: 0x2a2a32,
        width,
        threshold: 45,
        seed,
        filter: (mesh) => {
          if (!mesh.geometry) return false;
          const type = mesh.geometry.type;
          if (type === 'PlaneGeometry' || type === 'CircleGeometry' || type === 'SkyGeometry') return false;
          mesh.geometry.computeBoundingSphere?.();
          const r = mesh.geometry.boundingSphere ? mesh.geometry.boundingSphere.radius : 0;
          if (r > 4) return false; // 超大背景件
          return true;
        },
      });
      return scene;
    }
  }
  return SketchScene;
}

registerScene('RoomScene', sketchSceneVariant('RoomScene', { width: 0.016, seed: 5 }));
registerScene('ParkScene', sketchSceneVariant('ParkScene', { width: 0.022, seed: 13 }));

// ── 小雪家：episode 自定义场景 + 同款静态水墨描边 ──────────────────────
class SketchYukiRoomScene extends YukiRoomScene {
  build() {
    const scene = super.build();
    sketchify(scene, {
      color: 0x2a2a32,
      width: 0.016,
      threshold: 45,
      seed: 29,
      filter: (mesh) => {
        if (!mesh.geometry) return false;
        const type = mesh.geometry.type;
        if (type === 'PlaneGeometry' || type === 'CircleGeometry' || type === 'SkyGeometry') return false;
        mesh.geometry.computeBoundingSphere?.();
        const r = mesh.geometry.boundingSphere ? mesh.geometry.boundingSphere.radius : 0;
        if (r > 4) return false; // 超大背景件
        return true;
      },
    });
    return scene;
  }
}

registerScene('YukiRoomScene', SketchYukiRoomScene);
