import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

/**
 * Suneo（小夫）— 瘦小男孩，狐狸脸尖嘴，上翘尖发，绿黄配色。
 * 结构与 dula-assets/characters/Nobita.js 对齐：同为孩子体型，
 * 暴露相同的面部表情挂点（瞳孔/眼睑/眉毛/嘴巴/headGroup），
 * 保证 common 组的 Face* 表情动画与 TTS 口型可以直接驱动。
 *
 * 辨识度要点：加长上翘的尖吻与明显鼻尖、上挑细长眼、加大挺立的三撮尖发、
 * 默认带得意微笑的宽嘴。
 */
export class Suneo extends CharacterBase {
  constructor() {
    super('Suneo');
    this.boundingRadius = 0.5;
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

    const skinMat = new THREE.MeshToonMaterial({ color: 0xffdfc4, gradientMap: toonGradient });
    const shirtMat = new THREE.MeshToonMaterial({ color: 0x37a05a, gradientMap: toonGradient }); // 绿色上衣
    const accentMat = new THREE.MeshToonMaterial({ color: 0xffd94d, gradientMap: toonGradient }); // 黄色领口/袖口
    const shortsMat = new THREE.MeshToonMaterial({ color: 0xd8c060, gradientMap: toonGradient }); // 卡其短裤
    const shoeMat = new THREE.MeshToonMaterial({ color: 0x8a5a2a, gradientMap: toonGradient });
    const hairMat = new THREE.MeshToonMaterial({ color: 0x2b1a12, gradientMap: toonGradient }); // 深棕尖发
    const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient });
    const blackMat = new THREE.MeshToonMaterial({ color: 0x111111, gradientMap: toonGradient });

    // ========== HEAD GROUP ==========
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.72; // 明显低于 Nobita(1.95)

    // Face base: 小脸盘
    const faceGeo = new THREE.SphereGeometry(0.30, 32, 32);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.scale.set(0.95, 1.0, 0.95);
    face.position.y = 0.02;
    face.castShadow = true;
    headGroup.add(face);

    // ========== FOX SNOUT (加长略上翘的狐狸尖吻) ==========
    // 大圆锥朝前偏上，侧面轮廓挺拔，正面靠鼻尖黑点读出口吻位置
    const snoutGeo = new THREE.ConeGeometry(0.10, 0.30, 16);
    const snout = new THREE.Mesh(snoutGeo, skinMat);
    snout.rotation.x = Math.PI / 2 - 0.22; // 朝前，略向下压使侧面更挺
    snout.position.set(0, -0.085, 0.29);
    headGroup.add(snout);

    // 鼻尖黑点（加大，正面也能读出狐狸鼻）
    const noseTipGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const noseTip = new THREE.Mesh(noseTipGeo, blackMat);
    noseTip.position.set(0, -0.052, 0.44);
    headGroup.add(noseTip);

    // ========== EARS (尖长耳) ==========
    const earGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.30, 0.08, 0.02);
    leftEar.scale.set(0.45, 1.35, 0.45);
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.30, 0.08, 0.02);
    rightEar.scale.set(0.45, 1.35, 0.45);
    headGroup.add(rightEar);

    // ========== HAIR (加大挺立的上翘尖发) ==========
    // 底帽
    const capGeo = new THREE.SphereGeometry(0.32, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const capHair = new THREE.Mesh(capGeo, hairMat);
    capHair.position.set(0, 0.06, -0.03);
    capHair.scale.set(1.02, 0.85, 0.95);
    headGroup.add(capHair);

    // 三根上翘发锥：加大加高，中间一根朝前上方翘，两侧分开
    const spikeGeo = new THREE.ConeGeometry(0.10, 0.44, 12);
    const midSpike = new THREE.Mesh(spikeGeo, hairMat);
    midSpike.position.set(0, 0.36, 0.10);
    midSpike.rotation.x = -0.6;
    headGroup.add(midSpike);

    const leftSpike = new THREE.Mesh(spikeGeo, hairMat);
    leftSpike.position.set(-0.17, 0.31, 0.05);
    leftSpike.rotation.x = -0.45;
    leftSpike.rotation.z = 0.42;
    headGroup.add(leftSpike);

    const rightSpike = new THREE.Mesh(spikeGeo, hairMat);
    rightSpike.position.set(0.17, 0.31, 0.05);
    rightSpike.rotation.x = -0.45;
    rightSpike.rotation.z = -0.42;
    headGroup.add(rightSpike);

    // ========== EYES (上挑细长眼，谄媚狡黠) ==========
    const eyeGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const pupilGeo = new THREE.SphereGeometry(0.021, 16, 16);
    const hlGeo = new THREE.SphereGeometry(0.008, 8, 8);

    const createEye = (side) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.105, 0.05, 0.27);
      eyeGroup.rotation.z = side * 0.14; // 外眼角上挑

      const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      eye.scale.set(1.05, 0.9, 0.42); // 细长
      eyeGroup.add(eye);

      const pupil = new THREE.Mesh(pupilGeo, blackMat);
      pupil.position.set(0, -0.008, 0.022);
      pupil.userData.baseX = 0;
      pupil.userData.baseY = -0.008;
      eyeGroup.add(pupil);
      if (side === -1) this.leftPupil = pupil;
      else this.rightPupil = pupil;

      // Catchlight
      const highlight = new THREE.Mesh(hlGeo, eyeWhiteMat);
      highlight.position.set(side * 0.01, 0.016, 0.04);
      eyeGroup.add(highlight);

      // Eyelid (skin-toned half-sphere, hidden when open)
      const eyelid = new THREE.Mesh(
        new THREE.SphereGeometry(0.053, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
        skinMat
      );
      eyelid.scale.set(1.05, 0.9, 0.42);
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

    // ========== EYEBROWS (细眉，略带得意弧度；前移出发帽前缘避免被埋) ==========
    const browGeo = new THREE.CapsuleGeometry(0.007, 0.055, 4, 8);
    const leftBrow = new THREE.Mesh(browGeo, blackMat);
    leftBrow.position.set(-0.105, 0.145, 0.285);
    leftBrow.rotation.z = Math.PI / 2 + 0.15;
    headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, blackMat);
    rightBrow.position.set(0.105, 0.145, 0.285);
    rightBrow.rotation.z = Math.PI / 2 - 0.15;
    headGroup.add(rightBrow);
    this.leftEyebrow = leftBrow;
    this.rightEyebrow = rightBrow;

    // ========== MOUTH (得意微笑的宽 ∪ 弧线，挂在尖吻下方) ==========
    // 弧线面朝 +Z，Face*/口型只做 scale/position 驱动，形状安全。
    const mouthGeo = new THREE.TorusGeometry(0.062, 0.009, 8, 20, Math.PI * 0.7);
    const mouth = new THREE.Mesh(mouthGeo, blackMat);
    mouth.position.set(0, -0.155, 0.30);
    mouth.rotation.z = -Math.PI / 2 - Math.PI * 0.35; // 弧心置于下方 → 两端上翘
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = mouth.scale.x;
    this.mouthBaseScaleY = mouth.scale.y;
    this.mouthBaseScaleZ = mouth.scale.z;
    this.mouthBaseY = mouth.position.y;

    this.headGroup = headGroup;
    this.mesh.add(headGroup);

    // ========== NECK ==========
    const neckGeo = new THREE.CylinderGeometry(0.05, 0.055, 0.13, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.40;
    this.mesh.add(neck);

    // ========== BODY (瘦削绿色上衣) ==========
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.62, 32);
    const body = new THREE.Mesh(bodyGeo, shirtMat);
    body.position.y = 1.06;
    body.castShadow = true;
    this.mesh.add(body);

    // 黄色领口
    const collarGeo = new THREE.TorusGeometry(0.13, 0.03, 8, 16);
    const collar = new THREE.Mesh(collarGeo, accentMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.38;
    this.mesh.add(collar);

    // Puff sleeves
    const sleeveGeo = new THREE.SphereGeometry(0.075, 16, 16);
    const leftSleeve = new THREE.Mesh(sleeveGeo, shirtMat);
    leftSleeve.position.set(-0.28, 1.28, 0);
    leftSleeve.scale.set(1, 0.85, 1);
    this.mesh.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, shirtMat);
    rightSleeve.position.set(0.28, 1.28, 0);
    rightSleeve.scale.set(1, 0.85, 1);
    this.mesh.add(rightSleeve);

    // ========== SHORTS ==========
    const shortsGeo = new THREE.CylinderGeometry(0.28, 0.29, 0.35, 32);
    const shorts = new THREE.Mesh(shortsGeo, shortsMat);
    shorts.position.y = 0.55;
    this.mesh.add(shorts);

    // ========== ARMS + HANDS (细手臂) ==========
    const handGeo = new THREE.SphereGeometry(0.075, 16, 16);

    const addArm = (sx, sy, sz, hx, hy, hz, isRight) => {
      const group = new THREE.Group();
      group.position.set(sx, sy, sz);
      group.lookAt(hx, hy, hz);
      group.rotateX(-Math.PI / 2);

      const len = Math.sqrt((hx - sx) ** 2 + (hy - sy) ** 2 + (hz - sz) ** 2);
      const capLen = Math.max(0.01, len - 0.14);
      const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, capLen, 4, 16), skinMat);
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

    addArm(-0.30, 1.26, 0, -0.42, 0.62, 0, false);
    addArm(0.30, 1.26, 0, 0.42, 0.62, 0, true);

    // ========== LEGS + SHOES ==========
    const legGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.38, 16);
    const shoeGeo = new THREE.SphereGeometry(0.095, 16, 16);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.12, 0.44, 0);
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
    rightLegGroup.position.set(0.12, 0.44, 0);
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
