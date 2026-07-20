import { registerAll } from 'dula-assets';
import { CharacterRegistry, registerCharacter, sketchify, BoilSystem } from 'dula-engine';

registerAll();

// 手绘版咕噜：在程序化角色的基础上叠加水墨描边 + 沸腾线
const BaseGulu = CharacterRegistry.Gulu;

class SketchGulu extends BaseGulu {
  build() {
    super.build();
    sketchify(this.mesh, {
      color: 0x25222a,  // 暖黑墨水
      width: 0.013,     // 轮廓线宽（局部单位）
      threshold: 40,    // 硬边细节笔触
      seed: 7,
    });
    BoilSystem.add(this.mesh, { amplitude: 0.0045, fps: 12 });
  }

  update(time, delta) {
    super.update(time, delta);
    BoilSystem.update(time);
  }
}

registerCharacter('Gulu', SketchGulu);
