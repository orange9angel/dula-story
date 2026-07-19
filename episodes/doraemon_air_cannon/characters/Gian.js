import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';
import { attachPropTo, detachPropFrom } from './props.js';

/**
 * Gian（胖虎）— 孩子王，高大壮实，黑发平头，橙棕配色。
 * 结构与 dula-assets/characters/Nobita.js 对齐：同为孩子体型，
 * 暴露相同的面部表情挂点（瞳孔/眼睑/眉毛/嘴巴/headGroup），
 * 保证 common 组的 Face* 表情动画与 TTS 口型可以直接驱动。
 *
 * 辨识度要点：宽壮躯干短腿、更宽下颌与招牌大嘴、高挺锯齿发际线、
 * 下压粗眉、三白眼、略深肤色。
 * 道具：支持 'comic'（漫画书，挂右手）。
 */
export class Gian extends CharacterBase {
  constructor() {
    super('Gian');
    this.boundingRadius = 0.75;
    // 壮实体型，出拳/冲刺类动作使用 fighter 关节约束预设
    this.archetypes = ['humanoid', 'fighter'];
  }

  attachProp(type) {
    attachPropTo(this, type);
  }

  detachProp(type) {
    detachPropFrom(this, type);
  }

  build() {
    const toonGradient = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 4; canvas.height = 1;
      const ctx = canvas.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 4, 0);
      g.addColorStop(0, '#aaa'); g.addColorStop(0.4, '#ccc'); g.addColorStop(0.7, '#eee'); g.addColorStop(1, '#fff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 1);
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    })();

    const skinMat = new THREE.MeshToonMaterial({ color: 0xe9bb90, gradientMap: toonGradient }); // 略深肤色（晒黑感）
    const shirtMat = new THREE.MeshToonMaterial({ color: 0xe86a1c, gradientMap: toonGradient }); // 橙色上衣
    const collarMat = new THREE.MeshToonMaterial({ color: 0xb34812, gradientMap: toonGradient }); // 棕橙领口
    const pantsMat = new THREE.MeshToonMaterial({ color: 0x4a3728, gradientMap: toonGradient }); // 深棕裤子
    const shoeMat = new THREE.MeshToonMaterial({ color: 0x6b4423, gradientMap: toonGradient });
    const hairMat = new THREE.MeshToonMaterial({ color: 0x141414, gradientMap: toonGradient });
    const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient });
    const blackMat = new THREE.MeshToonMaterial({ color: 0x111111, gradientMap: toonGradient });

    // ========== HEAD GROUP ==========
    const headGroup = new THREE.Group();
    headGroup.position.y = 2.24; // 第三轮：整体更高（Nobita 1.95）

    // Face base: 大脸盘
    const faceGeo = new THREE.SphereGeometry(0.36, 32, 32);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.scale.set(1.05, 1.0, 0.98);
    face.position.y = 0.02;
    face.castShadow = true;
    headGroup.add(face);

    // ========== EARS ==========
    const earGeo = new THREE.SphereGeometry(0.055, 16, 16);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.385, 0.03, 0.03);
    leftEar.scale.set(0.45, 1.0, 0.55);
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.385, 0.03, 0.03);
    rightEar.scale.set(0.45, 1.0, 0.55);
    headGroup.add(rightEar);

    // ========== HAIR (黑色平头 / 板寸) ==========
    // 半球短发贴头皮
    const buzzGeo = new THREE.SphereGeometry(0.385, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const buzzHair = new THREE.Mesh(buzzGeo, hairMat);
    buzzHair.position.set(0, 0.10, -0.03);
    buzzHair.scale.set(1.04, 0.82, 0.95);
    headGroup.add(buzzHair);

    // 标志性平顶
    const flatTopGeo = new THREE.CylinderGeometry(0.28, 0.31, 0.10, 24);
    const flatTop = new THREE.Mesh(flatTopGeo, hairMat);
    flatTop.position.set(0, 0.335, -0.02);
    headGroup.add(flatTop);

    // 前额锯齿发际线（第三轮：加高加挺，剪影可辨）
    const toothGeo = new THREE.ConeGeometry(0.05, 1, 4);
    const hairlineTeeth = [
      { x: -0.19, h: 0.14 },
      { x: -0.065, h: 0.18 },
      { x: 0.06, h: 0.12 },
      { x: 0.185, h: 0.17 },
    ];
    for (const t of hairlineTeeth) {
      const tooth = new THREE.Mesh(toothGeo, hairMat);
      tooth.scale.y = t.h;
      tooth.rotation.x = Math.PI; // 尖朝下，悬挂在发际线上
      tooth.position.set(t.x, 0.10 + t.h / 2, 0.352);
      headGroup.add(tooth);
    }

    // ========== EYES (大三白眼：眼白多、瞳孔小且偏高) ==========
    const eyeGeo = new THREE.SphereGeometry(0.055, 16, 16);
    const pupilGeo = new THREE.SphereGeometry(0.018, 16, 16);
    const hlGeo = new THREE.SphereGeometry(0.008, 8, 8);

    const createEye = (side) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.13, 0.05, 0.335);

      const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      eye.scale.set(1.15, 1.0, 0.42);
      eyeGroup.add(eye);

      const pupil = new THREE.Mesh(pupilGeo, blackMat);
      pupil.position.set(0, 0.006, 0.022); // 偏高，下方露白
      pupil.userData.baseX = 0;
      pupil.userData.baseY = 0.006;
      eyeGroup.add(pupil);
      if (side === -1) this.leftPupil = pupil;
      else this.rightPupil = pupil;

      // Catchlight
      const highlight = new THREE.Mesh(hlGeo, eyeWhiteMat);
      highlight.position.set(side * 0.01, 0.018, 0.04);
      eyeGroup.add(highlight);

      // Eyelid (skin-toned half-sphere, hidden when open)
      const eyelid = new THREE.Mesh(
        new THREE.SphereGeometry(0.058, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
        skinMat
      );
      eyelid.scale.set(1.15, 1.0, 0.42);
      eyelid.visible = false;
      eyeGroup.add(eyelid);
      if (side === -1) this.leftEyelid = eyelid;
      else this.rightEyelid = eyelid;

      headGroup.add(eyeGroup);
      if (side === -1) this.leftEyeGroup = eyeGroup;
      else this.rightEyeGroup = eyeGroup;
    };
    createEye(-1);
    createEye(1);

    // ========== EYEBROWS (加粗下压斜眉，默认带凶相；Face* 仍以 rz 增量驱动) ==========
    const browGeo = new THREE.CapsuleGeometry(0.017, 0.115, 4, 8);
    const leftBrow = new THREE.Mesh(browGeo, blackMat);
    leftBrow.position.set(-0.135, 0.135, 0.355); // 前移出发壳前缘，避免被头发埋住
    leftBrow.rotation.z = Math.PI / 2 + 0.25; // 内侧端下压
    headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, blackMat);
    rightBrow.position.set(0.135, 0.135, 0.355);
    rightBrow.rotation.z = Math.PI / 2 - 0.25;
    headGroup.add(rightBrow);
    this.leftEyebrow = leftBrow;
    this.rightEyebrow = rightBrow;

    // ========== NOSE (大圆鼻) ==========
    const noseGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, -0.03, 0.355);
    nose.scale.set(1.1, 0.9, 1.1);
    headGroup.add(nose);

    // ========== JAW (第三轮：更宽下颌，剪影厚重) ==========
    const jowlGeo = new THREE.SphereGeometry(0.24, 24, 24);
    const jowl = new THREE.Mesh(jowlGeo, skinMat);
    jowl.scale.set(1.42, 0.72, 0.92);
    jowl.position.set(0, -0.25, 0.10);
    headGroup.add(jowl);

    // ========== MOUTH (第三轮：招牌大嘴；嘴角下拉的 ∩ 弧线) ==========
    // 弧线面朝 +Z，Face*/口型只做 scale/position 驱动（与 FaceSmirk 注释一致），形状安全。
    const mouthGeo = new THREE.TorusGeometry(0.06, 0.013, 8, 20, Math.PI * 0.7);
    const mouth = new THREE.Mesh(mouthGeo, blackMat);
    mouth.position.set(0, -0.205, 0.318);
    mouth.rotation.z = Math.PI / 2 - Math.PI * 0.35; // 弧心置于上方 → 两端下垂
    mouth.rotation.x = -0.12; // 顶部略微贴向脸部曲面
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = mouth.scale.x;
    this.mouthBaseScaleY = mouth.scale.y;
    this.mouthBaseScaleZ = mouth.scale.z;
    this.mouthBaseY = mouth.position.y;

    this.headGroup = headGroup;
    this.mesh.add(headGroup);

    // ========== NECK ==========
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.18, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.83;
    this.mesh.add(neck);

    // ========== BODY (第三轮：更宽更壮的魁梧躯干) ==========
    const bodyGeo = new THREE.CylinderGeometry(0.42, 0.51, 0.85, 32);
    const body = new THREE.Mesh(bodyGeo, shirtMat);
    body.position.y = 1.32;
    body.castShadow = true;
    this.mesh.add(body);

    // 棕橙领口
    const collarGeo = new THREE.TorusGeometry(0.21, 0.045, 8, 16);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.78;
    this.mesh.add(collar);

    // 肚皮横向条纹（胖虎标志配色）
    const stripeGeo = new THREE.TorusGeometry(0.49, 0.028, 8, 32);
    const stripe = new THREE.Mesh(stripeGeo, collarMat);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = 1.14;
    this.mesh.add(stripe);

    // Puff sleeves
    const sleeveGeo = new THREE.SphereGeometry(0.125, 16, 16);
    const leftSleeve = new THREE.Mesh(sleeveGeo, shirtMat);
    leftSleeve.position.set(-0.49, 1.65, 0);
    leftSleeve.scale.set(1, 0.85, 1);
    this.mesh.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, shirtMat);
    rightSleeve.position.set(0.49, 1.65, 0);
    rightSleeve.scale.set(1, 0.85, 1);
    this.mesh.add(rightSleeve);

    // ========== PANTS ==========
    const pantsGeo = new THREE.CylinderGeometry(0.52, 0.53, 0.42, 32);
    const pants = new THREE.Mesh(pantsGeo, pantsMat);
    pants.position.y = 0.60;
    this.mesh.add(pants);

    // ========== ARMS + HANDS (第三轮：更粗手臂，大拳头) ==========
    const handGeo = new THREE.SphereGeometry(0.11, 16, 16);

    const addArm = (sx, sy, sz, hx, hy, hz, isRight) => {
      const group = new THREE.Group();
      group.position.set(sx, sy, sz);
      group.lookAt(hx, hy, hz);
      group.rotateX(-Math.PI / 2);

      const len = Math.sqrt((hx - sx) ** 2 + (hy - sy) ** 2 + (hz - sz) ** 2);
      const capLen = Math.max(0.01, len - 0.18);
      const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, capLen, 4, 16), skinMat);
      armMesh.position.y = -len / 2;
      group.add(armMesh);

      const handMesh = new THREE.Mesh(handGeo, skinMat);
      handMesh.position.y = -len;
      group.add(handMesh);

      this.mesh.add(group);
      if (isRight) {
        this.rightArm = group;
        this.rightArmLength = len;
        this.rightArmBaseZ = group.rotation.z;
      } else {
        this.leftArm = group;
        this.leftArmBaseZ = group.rotation.z;
      }
    };

    addArm(-0.50, 1.60, 0, -0.66, 0.72, 0, false);
    addArm(0.50, 1.60, 0, 0.66, 0.72, 0, true);

    // ========== LEGS + SHOES (第三轮：腿略缩短，衬得躯干更大) ==========
    const legGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.38, 16);
    const shoeGeo = new THREE.SphereGeometry(0.13, 16, 16);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.21, 0.50, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, skinMat);
    leftLegMesh.position.y = -0.19;
    leftLegGroup.add(leftLegMesh);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.38, 0.05);
    leftShoe.scale.set(1, 0.6, 1.5);
    leftLegGroup.add(leftShoe);
    this.mesh.add(leftLegGroup);
    this.leftLeg = leftLegGroup;

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.21, 0.50, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, skinMat);
    rightLegMesh.position.y = -0.19;
    rightLegGroup.add(rightLegMesh);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.38, 0.05);
    rightShoe.scale.set(1, 0.6, 1.5);
    rightLegGroup.add(rightShoe);
    this.mesh.add(rightLegGroup);
    this.rightLeg = rightLegGroup;
  }
}
