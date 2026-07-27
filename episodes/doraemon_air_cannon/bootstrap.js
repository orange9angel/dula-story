import { registerAll } from 'dula-assets';
import { SceneRegistry, registerScene, registerCharacter, registerAnimation, CharacterRegistry, sketchify, BoilSystem } from 'dula-engine';

import { Gian } from './characters/Gian.js';
import { Suneo } from './characters/Suneo.js';
import { attachPropTo, detachPropFrom } from './characters/props.js';
import { VacantLotScene } from './scenes/VacantLotScene.js';
import { FXAirBlast } from './animations/FXAirBlast.js';

registerAll();

// ── 手绘水墨风格：全员素描描边 + 角色 12fps 沸腾线（场景描边保持静态） ──────
const INK_CHARACTER = 0x2a2320; // 暖黑（角色）
const INK_SCENE = 0x2a2a32;     // 冷黑（场景）

/**
 * 角色素描变体：build 后 sketchify 全身并注册沸腾线；
 * update 里推进 BoilSystem（同一重绘 tick 幂等，多角色调用安全）。
 * 道具在 build 之后才挂到手骨上，因此在 attachProp 时补描边。
 */
function sketchCharacter(Base, seed, { prepare = null, propWidth = 0.008 } = {}) {
  class SketchCharacter extends Base {
    build() {
      super.build();
      if (prepare) prepare(this);
      sketchify(this.mesh, {
        color: INK_CHARACTER,
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

    attachProp(type) {
      if (super.attachProp) super.attachProp(type);
      const prop = this._episodeProps && this._episodeProps[type];
      if (prop && !prop.userData._sketched) {
        prop.userData._sketched = true;
        sketchify(prop, { color: INK_CHARACTER, width: propWidth, threshold: 35, seed: seed + 100 });
        BoilSystem.add(prop, { amplitude: 0.003, fps: 12 });
      }
    }
  }
  return SketchCharacter;
}

/**
 * 场景素描变体：只描一次、不沸腾（同手绘动画背景）。
 * 开放平面（地面/天空/管口圆片）与超大背景件不描（反转壳不适用）。
 */
function sketchScene(Base, { width = 0.02, seed = 5 } = {}) {
  class SketchScene extends Base {
    build() {
      const scene = super.build();
      sketchify(scene, {
        color: INK_SCENE,
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

// ── 场景 ─────────────────────────────────────────────────────────────
// Alias the default RoomScene as NobitaRoom for this episode.
class NobitaRoom extends SceneRegistry.RoomScene {
  constructor() {
    super();
    this.name = 'NobitaRoom';
  }
}

registerScene('NobitaRoom', sketchScene(NobitaRoom, { width: 0.016, seed: 5 }));
registerScene('VacantLotScene', sketchScene(VacantLotScene, { width: 0.022, seed: 13 }));

// ── 角色 ─────────────────────────────────────────────────────────────
// 哆啦A梦：胡须是 0.003 半径的细圆柱，本身就是"画出来的线"，
// 再上反转壳会糊成粗黑条——标 noSketch 保持干净。
function protectWhiskers(char) {
  char.mesh.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.geometry.type !== 'CylinderGeometry') return;
    const p = o.geometry.parameters;
    if (p && Math.max(p.radiusTop, p.radiusBottom) <= 0.005) o.userData.noSketch = true;
  });
}

registerCharacter('Doraemon', sketchCharacter(CharacterRegistry.Doraemon, 11, { prepare: protectWhiskers }));

// 大雄：眼镜框/鼻梁/镜片本身就是细线或透明片，上反转壳会糊成厚重"护目镜"——
// 标 noSketch 保持 CG 细框（镜片为 CircleGeometry，角色其他部位不用）。
function protectGlasses(char) {
  char.mesh.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    const p = g.parameters || {};
    if (g.type === 'TorusGeometry' && p.tube <= 0.006) o.userData.noSketch = true;      // 眼镜细框
    else if (g.type === 'CylinderGeometry' && Math.max(p.radiusTop, p.radiusBottom) <= 0.006) o.userData.noSketch = true; // 鼻梁
    else if (g.type === 'CircleGeometry') o.userData.noSketch = true;                    // 镜片
  });
}

// 大雄增强版：支持漫画/空气炮道具挂载（子类化官方 Nobita，同名覆盖注册）
// 素描处理必须包在 NobitaEx 外层，否则道具挂载方法丢失。
class NobitaEx extends CharacterRegistry.Nobita {
  attachProp(type) {
    // 漫画拿左手，空气炮拿右手，避免两件道具在同一只手穿插
    attachPropTo(this, type, type === 'comic' ? 'left' : 'right');
  }

  detachProp(type) {
    detachPropFrom(this, type);
  }
}

registerCharacter('Nobita', sketchCharacter(NobitaEx, 23, { prepare: protectGlasses }));

// 本集新角色：胖虎与小夫（剧集本地建模，不入官方资产库）
registerCharacter('Gian', sketchCharacter(Gian, 37));
registerCharacter('Suneo', sketchCharacter(Suneo, 7));

// 本集自定义特效：空气炮发射
registerAnimation('FXAirBlast', FXAirBlast);
