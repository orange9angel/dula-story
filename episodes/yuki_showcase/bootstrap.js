import { registerAll } from 'dula-assets';
import { CharacterRegistry, registerCharacter, sketchify, BoilSystem } from 'dula-engine';

registerAll();

// 手绘版小雪：程序化几何 + 水墨描边 + 沸腾线
const BaseYuki = CharacterRegistry.Yuki;

class SketchYuki extends BaseYuki {
  build() {
    super.build();
    sketchify(this.mesh, {
      color: 0x2a2320,  // 暖黑墨水，配棕发
      width: 0.012,
      threshold: 40,
      seed: 11,
    });
    BoilSystem.add(this.mesh, { amplitude: 0.004, fps: 12 });
  }

  update(time, delta) {
    super.update(time, delta);
    BoilSystem.update(time);
  }
}

registerCharacter('Yuki', SketchYuki);
