import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

export class Kagome extends CharacterBase {
  constructor() {
    super('Kagome');
    this.boundingRadius = 0.42;
  }

  build() {
    const toonGradient = this._toonGradient();
    const skinMat = new THREE.MeshToonMaterial({ color: 0xffd9c8, gradientMap: toonGradient });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xff9ba9, transparent: true, opacity: 0.24 });
    const hairMat = new THREE.MeshToonMaterial({ color: 0x111016, gradientMap: toonGradient });
    const hairHiMat = new THREE.MeshToonMaterial({ color: 0x2a2630, gradientMap: toonGradient });
    const blouseMat = new THREE.MeshToonMaterial({ color: 0xf6f1dc, gradientMap: toonGradient });
    const greenMat = new THREE.MeshToonMaterial({ color: 0x1f6a4d, gradientMap: toonGradient });
    const darkGreenMat = new THREE.MeshToonMaterial({ color: 0x134730, gradientMap: toonGradient });
    const redMat = new THREE.MeshToonMaterial({ color: 0xd0443d, gradientMap: toonGradient });
    const sockMat = new THREE.MeshToonMaterial({ color: 0xf8f2dc, gradientMap: toonGradient });
    const shoeMat = new THREE.MeshToonMaterial({ color: 0x3a2118, gradientMap: toonGradient });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf6f1e8 });
    const irisMat = new THREE.MeshBasicMaterial({ color: 0x4b2f2a });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x120b0a });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x9a3440 });
    const bowWoodMat = new THREE.MeshToonMaterial({ color: 0x7b4f2b, gradientMap: toonGradient });
    const arrowMat = new THREE.MeshToonMaterial({ color: 0xe0c796, gradientMap: toonGradient });
    const metalMat = new THREE.MeshToonMaterial({ color: 0xe9e6dc, gradientMap: toonGradient });

    this._buildHead({ skinMat, blushMat, hairMat, hairHiMat, eyeWhiteMat, irisMat, pupilMat, mouthMat });
    this._buildUniform({ skinMat, blouseMat, greenMat, darkGreenMat, redMat, sockMat, shoeMat });
    this._buildBow({ bowWoodMat, arrowMat, metalMat, redMat });
  }

  _toonGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 4, 0);
    g.addColorStop(0, '#777');
    g.addColorStop(0.45, '#aaa');
    g.addColorStop(0.72, '#ddd');
    g.addColorStop(1, '#fff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  _buildHead(mats) {
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.6;

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.255, 32, 24), mats.skinMat);
    face.scale.set(0.92, 1.08, 0.86);
    face.castShadow = true;
    headGroup.add(face);

    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14), mats.skinMat);
    chin.position.set(0, -0.19, 0.07);
    chin.scale.set(1.0, 0.72, 0.74);
    headGroup.add(chin);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.285, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.56),
      mats.hairMat
    );
    cap.position.set(0, 0.08, -0.02);
    cap.scale.set(1.07, 0.92, 0.92);
    headGroup.add(cap);

    const backHair = new THREE.Group();
    backHair.position.set(0, -0.18, -0.16);
    const locks = [
      [-0.16, -0.17, 0.02, 0.48],
      [-0.08, -0.25, -0.01, 0.66],
      [0.0, -0.27, -0.02, 0.72],
      [0.08, -0.25, -0.01, 0.66],
      [0.16, -0.17, 0.02, 0.48],
    ];
    for (const [x, y, z, length] of locks) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, length, 5, 12), mats.hairMat);
      lock.position.set(x, y, z);
      lock.rotation.z = -x * 0.75;
      lock.scale.z = 0.58;
      backHair.add(lock);
    }
    headGroup.add(backHair);
    this.backHair = backHair;

    const bangSpecs = [
      [-0.17, 0.15, 0.2, 0.2, 0.2],
      [-0.08, 0.17, 0.23, 0.0, 0.24],
      [0.02, 0.17, 0.235, -0.1, 0.25],
      [0.12, 0.15, 0.21, -0.25, 0.2],
    ];
    for (const [x, y, z, rz, len] of bangSpecs) {
      const bang = new THREE.Mesh(new THREE.ConeGeometry(0.04, len, 5), mats.hairHiMat);
      bang.position.set(x, y, z);
      bang.rotation.x = -0.55;
      bang.rotation.z = Math.PI + rz;
      bang.scale.set(0.68, 1, 0.55);
      headGroup.add(bang);
    }

    for (const side of [-1, 1]) {
      const sideLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.36, 5, 12), mats.hairMat);
      sideLock.position.set(side * 0.21, -0.09, 0.02);
      sideLock.rotation.z = side * 0.12;
      sideLock.scale.z = 0.56;
      headGroup.add(sideLock);

      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), mats.eyeWhiteMat);
      eyeWhite.position.set(side * 0.085, 0.018, 0.229);
      eyeWhite.scale.set(1.0, 1.28, 0.28);
      headGroup.add(eyeWhite);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.023, 12, 10), mats.irisMat);
      iris.position.set(side * 0.085, 0.018, 0.246);
      iris.scale.set(0.9, 1.25, 0.25);
      headGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), mats.pupilMat);
      pupil.position.set(side * 0.085, 0.017, 0.258);
      pupil.userData.baseX = pupil.position.x;
      if (side === -1) this.leftPupil = pupil;
      else this.rightPupil = pupil;
      headGroup.add(pupil);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.01, 0.01), mats.hairMat);
      brow.position.set(side * 0.084, 0.1, 0.214);
      brow.rotation.z = side * -0.12;
      headGroup.add(brow);

      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), mats.blushMat);
      blush.position.set(side * 0.13, -0.043, 0.225);
      blush.scale.set(1.25, 0.46, 0.18);
      headGroup.add(blush);
    }

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.038, 5), mats.skinMat);
    nose.position.set(0, -0.025, 0.247);
    nose.rotation.x = -Math.PI / 2;
    headGroup.add(nose);

    const smile = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.036, -0.105, 0.236),
      new THREE.Vector3(0, -0.125, 0.251),
      new THREE.Vector3(0.036, -0.105, 0.236)
    );
    const mouth = new THREE.Mesh(new THREE.TubeGeometry(smile, 12, 0.0038, 8, false), mats.mouthMat);
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1;
    this.mouthBaseScaleY = 1;
    this.mouthBaseScaleZ = 1;

    this.headGroup = headGroup;
    this.mesh.add(headGroup);
  }

  _buildUniform(mats) {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.048, 0.1, 14), mats.skinMat);
    neck.position.y = 1.39;
    this.mesh.add(neck);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.46, 20), mats.blouseMat);
    torso.position.y = 1.16;
    torso.scale.z = 0.68;
    torso.castShadow = true;
    this.mesh.add(torso);

    const sailorFront = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 3), mats.greenMat);
    sailorFront.position.set(0, 1.28, 0.2);
    sailorFront.rotation.z = Math.PI;
    sailorFront.scale.set(1.4, 0.95, 0.35);
    this.mesh.add(sailorFront);

    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.035), mats.greenMat);
    collar.position.set(0, 1.36, 0.17);
    this.mesh.add(collar);

    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mats.redMat);
    bowCenter.position.set(0, 1.24, 0.23);
    bowCenter.scale.set(1.15, 0.8, 0.55);
    this.mesh.add(bowCenter);
    for (const side of [-1, 1]) {
      const bow = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 3), mats.redMat);
      bow.position.set(side * 0.055, 1.24, 0.23);
      bow.rotation.z = side * -Math.PI / 2;
      bow.scale.set(1.2, 0.82, 0.42);
      this.mesh.add(bow);
    }

    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.34, 28, 1, true), mats.greenMat);
    skirt.position.y = 0.84;
    skirt.scale.z = 0.75;
    this.mesh.add(skirt);

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.3, 0.012), mats.darkGreenMat);
      fold.position.set(Math.cos(angle) * 0.225, 0.81, Math.sin(angle) * 0.16);
      fold.rotation.y = -angle;
      this.mesh.add(fold);
    }

    this._addArm(-0.245, 1.23, 0, -0.36, 0.88, 0.05, false, mats);
    this._addArm(0.245, 1.23, 0, 0.36, 0.88, 0.05, true, mats);

    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.095, 0.67, 0);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.42, 5, 12), mats.skinMat);
      leg.position.y = -0.25;
      legGroup.add(leg);
      const sock = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.16, 5, 10), mats.sockMat);
      sock.position.y = -0.52;
      legGroup.add(sock);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), mats.shoeMat);
      shoe.position.set(0, -0.63, 0.036);
      shoe.scale.set(1, 0.42, 1.52);
      legGroup.add(shoe);
      this.mesh.add(legGroup);
    }
  }

  _addArm(sx, sy, sz, hx, hy, hz, isRight, mats) {
    const group = new THREE.Group();
    group.position.set(sx, sy, sz);
    group.lookAt(hx, hy, hz);
    group.rotateX(-Math.PI / 2);

    const len = Math.sqrt((hx - sx) ** 2 + (hy - sy) ** 2 + (hz - sz) ** 2);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, Math.max(0.01, len - 0.12), 5, 12), mats.blouseMat);
    sleeve.position.y = -len / 2;
    group.add(sleeve);

    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 8, 14), mats.greenMat);
    cuff.position.y = -len + 0.07;
    cuff.rotation.x = Math.PI / 2;
    group.add(cuff);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.043, 12, 10), mats.skinMat);
    hand.position.y = -len;
    group.add(hand);

    this.mesh.add(group);
    if (isRight) {
      this.rightArm = group;
      this.rightArmLength = len;
      this.rightArmBaseZ = group.rotation.z;
    } else {
      this.leftArm = group;
      this.leftArmLength = len;
      this.leftArmBaseZ = group.rotation.z;
    }
  }

  _buildBow(mats) {
    this.bowGroup = new THREE.Group();
    this.bowGroup.visible = false;

    const bowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, -0.58, 0),
      new THREE.Vector3(0.1, -0.26, 0),
      new THREE.Vector3(0.08, 0, 0),
      new THREE.Vector3(0.1, 0.26, 0),
      new THREE.Vector3(0.02, 0.58, 0),
    ]);
    this.bowGroup.add(new THREE.Mesh(new THREE.TubeGeometry(bowCurve, 22, 0.016, 8), mats.bowWoodMat));

    const string = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.02, -0.55, 0),
        new THREE.Vector3(-0.04, 0, 0),
        new THREE.Vector3(0.02, 0.55, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0xf7eed6 })
    );
    this.bowGroup.add(string);

    this.arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.82, 8), mats.arrowMat);
    shaft.rotation.z = Math.PI / 2;
    this.arrow.add(shaft);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.075, 8), mats.metalMat);
    tip.position.x = 0.44;
    tip.rotation.z = -Math.PI / 2;
    this.arrow.add(tip);

    for (const side of [-1, 1]) {
      const feather = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.017, 0.01), mats.redMat);
      feather.position.set(-0.39, side * 0.018, 0);
      feather.rotation.z = side * 0.35;
      this.arrow.add(feather);
    }
    this.arrow.position.set(-0.13, 0, 0.025);
    this.bowGroup.add(this.arrow);

    this.bowGroup.position.set(-0.01, -this.leftArmLength + 0.02, 0.05);
    this.bowGroup.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    this.leftArm.add(this.bowGroup);
  }

  setArcheryPose(active = true) {
    if (this.bowGroup) this.bowGroup.visible = active;
    if (this.leftArm) {
      const baseZ = this.leftArmBaseZ || this.leftArm.rotation.z;
      this.leftArm.rotation.z = baseZ + 1.08;
      this.leftArm.rotation.x = -1.02;
    }
    if (this.rightArm) {
      const baseZ = this.rightArmBaseZ || this.rightArm.rotation.z;
      this.rightArm.rotation.z = baseZ - 1.05;
      this.rightArm.rotation.x = -0.9;
    }
  }

  update(time, delta) {
    super.update(time, delta);
    if (this.backHair) {
      this.backHair.rotation.x = Math.sin(time * 1.2) * 0.018;
      this.backHair.rotation.z = Math.sin(time * 0.9) * 0.014;
    }
    if (this.bowGroup?.visible && this.arrow) {
      this.arrow.position.x = -0.13 + Math.sin(time * 4.2) * 0.012;
    }
  }
}
