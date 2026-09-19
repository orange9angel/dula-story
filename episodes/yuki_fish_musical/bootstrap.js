import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import { CharacterRegistry, registerCharacter, registerScene, registerAnimation, registerCameraMove, sketchify, BoilSystem } from 'dula-engine';
import { BeatStudioScene } from './scenes/BeatStudioScene.js';
import { AdPose, AdCamera } from './performance.js';

registerAll();
const BaseYuki = CharacterRegistry.Yuki;
class StudioYuki extends BaseYuki {
  build() {
    super.build();
    // The asset exposes pupils and lids, but not whole-eye group handles.
    this.leftEye = this.leftPupil.parent;
    this.rightEye = this.rightPupil.parent;
    this.leftEye.userData.adBaseScaleY = this.leftEye.scale.y;
    const materials = new Map();
    this.mesh.traverse(object => {
      if (!object.isMesh || !object.material?.isMeshToonMaterial) return;
      const old = object.material;
      if (!materials.has(old)) materials.set(old,new THREE.MeshStandardMaterial({color:old.color,roughness:0.7,metalness:0}));
      object.material = materials.get(old);
    });
  }
}
registerCharacter('Yuki', StudioYuki);
// StudioMochi (V16): the cat gains the eye-group handles the shared AdPose
// stage animation writes to (pupil parents, same trick as StudioYuki), so
// {Event:Animate|action=AdPose} entries for Mochi cannot crash. The V16 viewer
// re-poses the cat every frame.
// V17: hand-drawn detail restored (same recipe as yuki_morning_battle's
// sketchVariant) — sketchify ink hulls/edge strokes + 12fps boil. BoilSystem
// is tick-seeded from the storyboard time passed to update(), so renderAt(t)
// stays deterministic. The toon fur/cream materials washed out to near-white
// under the stage rig (hemi 1.2 + key 2.4 + rim 1.5 over-saturates the toon
// gradient); like StudioYuki they are converted to MeshStandardMaterial, with
// the fur deepened toward morning_battle's #e8a050 reading.
const BaseMochi = CharacterRegistry.Mochi;
if (BaseMochi) {
  class StudioMochi extends BaseMochi {
    build() {
      super.build();
      this.leftEye = this.leftPupil.parent;
      this.rightEye = this.rightPupil.parent;
      this.leftEye.userData.adBaseScaleY = this.leftEye.scale.y;
      this.rightEye.userData.adBaseScaleY = this.rightEye.scale.y;
      const materials = new Map();
      this.mesh.traverse(object => {
        if (!object.isMesh || !object.material?.isMeshToonMaterial) return;
        const old = object.material;
        if (!materials.has(old)) {
          const color = old.color.clone();
          if (color.getHex() === 0xe8a050) color.setHex(0xd98a3c); // deep orange, survives stage wash
          materials.set(old, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0 }));
        }
        object.material = materials.get(old);
      });
      sketchify(this.mesh, { color: 0x2a2320, width: 0.006, threshold: 40, seed: 23 });
      BoilSystem.add(this.mesh, { amplitude: 0.0012, fps: 12 });
    }
    update(time, delta) {
      super.update(time, delta);
      BoilSystem.update(time);
    }
  }
  registerCharacter('Mochi', StudioMochi);
}
registerScene('BeatStudioScene', BeatStudioScene);
registerAnimation('AdPose', AdPose);
registerCameraMove('AdCamera', AdCamera);
