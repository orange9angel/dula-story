import { registerAll } from 'dula-assets';
import { CharacterRegistry, SceneRegistry, registerCharacter, registerScene, sketchify, BoilSystem } from 'dula-engine';

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

registerCharacter('Yuki', sketchVariant('Yuki', 11));
registerCharacter('Mochi', sketchVariant('Mochi', 23));
registerCharacter('Kenta', sketchVariant('Kenta', 37));
registerCharacter('Gulu', sketchVariant('Gulu', 7));

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
