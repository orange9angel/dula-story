import * as THREE from 'three';
import { registerAll } from 'dula-assets';
import { CharacterRegistry, registerCharacter, registerScene, registerAnimation, registerCameraMove } from 'dula-engine';
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
// StudioMochi (V16): the cat keeps its pure toon look (no sketchify) and only
// gains the eye-group handles the shared AdPose stage animation writes to
// (pupil parents, same trick as StudioYuki), so {Event:Animate|action=AdPose}
// entries for Mochi cannot crash. The V16 viewer re-poses the cat every frame.
const BaseMochi = CharacterRegistry.Mochi;
if (BaseMochi) {
  class StudioMochi extends BaseMochi {
    build() {
      super.build();
      this.leftEye = this.leftPupil.parent;
      this.rightEye = this.rightPupil.parent;
      this.leftEye.userData.adBaseScaleY = this.leftEye.scale.y;
      this.rightEye.userData.adBaseScaleY = this.rightEye.scale.y;
    }
  }
  registerCharacter('Mochi', StudioMochi);
}
registerScene('BeatStudioScene', BeatStudioScene);
registerAnimation('AdPose', AdPose);
registerCameraMove('AdCamera', AdCamera);
