import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

export class Inuyasha extends CharacterBase {
  constructor() {
    super('Inuyasha');
    this.boundingRadius = 0.58;
  }

  build() {
    const toonGradient = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 4, 0);
      g.addColorStop(0, '#777');
      g.addColorStop(0.42, '#aaa');
      g.addColorStop(0.72, '#ddd');
      g.addColorStop(1, '#fff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 1);
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    })();

    const skinMat = new THREE.MeshToonMaterial({ color: 0xffd9bf, gradientMap: toonGradient });
    const hairMat = new THREE.MeshToonMaterial({ color: 0xf4f0df, gradientMap: toonGradient });
    const hairShadowMat = new THREE.MeshToonMaterial({ color: 0xd6d0bc, gradientMap: toonGradient });
    const robeMat = new THREE.MeshToonMaterial({ color: 0xc01818, gradientMap: toonGradient });
    const robeDarkMat = new THREE.MeshToonMaterial({ color: 0x7f1216, gradientMap: toonGradient });
    const beadMat = new THREE.MeshToonMaterial({ color: 0xf7f4dd, gradientMap: toonGradient });
    const clawMat = new THREE.MeshToonMaterial({ color: 0xf5f0dd, gradientMap: toonGradient });
    const eyeMat = new THREE.MeshToonMaterial({ color: 0xd1a23a, gradientMap: toonGradient });
    const pupilMat = new THREE.MeshToonMaterial({ color: 0x1d1204, gradientMap: toonGradient });
    const blackMat = new THREE.MeshToonMaterial({ color: 0x1b1010, gradientMap: toonGradient });
    const swordMat = new THREE.MeshToonMaterial({
      color: 0xe9e5d0,
      gradientMap: toonGradient,
      emissive: 0xffdd88,
      emissiveIntensity: 0.12,
    });
    const hiltMat = new THREE.MeshToonMaterial({ color: 0x5d3b22, gradientMap: toonGradient });

    const headGroup = new THREE.Group();
    headGroup.position.y = 1.78;

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 28), skinMat);
    face.scale.set(1.0, 1.12, 0.92);
    face.castShadow = true;
    headGroup.add(face);

    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 20), skinMat);
    chin.position.set(0, -0.2, 0.11);
    chin.scale.set(0.95, 0.68, 0.82);
    headGroup.add(chin);

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 28, 28, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCap.position.set(0, 0.08, -0.03);
    hairCap.scale.set(1.08, 1, 0.92);
    headGroup.add(hairCap);

    const backHair = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.98, 6, 18), hairMat);
    backHair.position.set(0, -0.42, -0.25);
    backHair.scale.set(1.15, 1, 0.6);
    headGroup.add(backHair);
    this.backHair = backHair;

    const bangSpecs = [
      [-0.2, 0.19, 0.22, 0.42],
      [-0.1, 0.2, 0.27, 0.15],
      [0.02, 0.19, 0.29, -0.12],
      [0.14, 0.2, 0.24, -0.34],
    ];
    for (const [x, y, z, rz] of bangSpecs) {
      const bang = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28, 5), hairMat);
      bang.position.set(x, y, z);
      bang.rotation.x = -0.5;
      bang.rotation.z = Math.PI + rz;
      bang.scale.set(0.75, 1.2, 0.55);
      headGroup.add(bang);
    }

    for (const side of [-1, 1]) {
      const sideLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.74, 6, 16), hairMat);
      sideLock.position.set(side * 0.25, -0.25, -0.08);
      sideLock.rotation.z = side * 0.2;
      sideLock.scale.set(0.72, 1, 0.6);
      headGroup.add(sideLock);

      const earGroup = new THREE.Group();
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 4), hairMat);
      ear.position.y = 0.11;
      ear.rotation.y = Math.PI / 4;
      earGroup.add(ear);

      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 4), skinMat);
      inner.position.set(0, 0.12, 0.016);
      inner.rotation.y = Math.PI / 4;
      earGroup.add(inner);

      earGroup.position.set(side * 0.17, 0.32, 0.02);
      earGroup.rotation.z = side * 0.28;
      headGroup.add(earGroup);
      if (!this.ears) this.ears = [];
      this.ears.push(earGroup);
    }

    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), beadMat);
      eyeWhite.position.set(side * 0.1, 0.04, 0.25);
      eyeWhite.scale.set(1.05, 1.25, 0.5);
      headGroup.add(eyeWhite);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.047, 14, 14), eyeMat);
      iris.position.set(side * 0.1, 0.038, 0.29);
      iris.scale.set(1, 1.25, 0.45);
      headGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), pupilMat);
      pupil.position.set(side * 0.1, 0.038, 0.315);
      pupil.userData.baseX = pupil.position.x;
      if (side === -1) this.leftPupil = pupil;
      else this.rightPupil = pupil;
      headGroup.add(pupil);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.012), hairShadowMat);
      brow.position.set(side * 0.1, 0.15, 0.27);
      brow.rotation.z = side * -0.22;
      headGroup.add(brow);
    }

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 5), skinMat);
    nose.position.set(0, -0.025, 0.3);
    nose.rotation.x = -Math.PI / 2;
    headGroup.add(nose);

    const mouthCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.035, -0.105, 0.292),
      new THREE.Vector3(0, -0.122, 0.31),
      new THREE.Vector3(0.038, -0.103, 0.292)
    );
    const mouthGeo = new THREE.TubeGeometry(mouthCurve, 10, 0.004, 8, false);
    const mouth = new THREE.Mesh(
      mouthGeo,
      new THREE.MeshToonMaterial({ color: 0x9a3a3a, gradientMap: toonGradient })
    );
    headGroup.add(mouth);
    this.mouth = mouth;
    this.mouthBaseScaleX = 1;
    this.mouthBaseScaleY = 1;
    this.mouthBaseScaleZ = 1;

    this.headGroup = headGroup;
    this.mesh.add(headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.12, 16), skinMat);
    neck.position.y = 1.58;
    this.mesh.add(neck);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.32, 0.58, 20), robeMat);
    torso.position.y = 1.28;
    torso.scale.z = 0.75;
    torso.castShadow = true;
    this.mesh.add(torso);

    const robeFront = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.68, 0.035), robeDarkMat);
    robeFront.position.set(0, 1.22, 0.22);
    robeFront.rotation.z = -0.08;
    this.mesh.add(robeFront);

    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.33), hiltMat);
    sash.position.set(0, 1.02, 0.03);
    this.mesh.add(sash);

    const hakama = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.72, 24, 1, true), robeMat);
    hakama.position.y = 0.63;
    hakama.scale.z = 0.76;
    hakama.castShadow = true;
    this.mesh.add(hakama);
    this.hakama = hakama;

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.64, 0.014), robeDarkMat);
      fold.position.set(Math.cos(angle) * 0.27, 0.62, Math.sin(angle) * 0.21);
      fold.rotation.y = -angle;
      this.mesh.add(fold);
    }

    const beadCount = 16;
    for (let i = 0; i < beadCount; i++) {
      const a = (i / beadCount) * Math.PI * 2;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(i % 4 === 0 ? 0.035 : 0.025, 10, 10), beadMat);
      bead.position.set(Math.cos(a) * 0.17, 1.47 + Math.sin(a) * 0.08, 0.2 + Math.sin(a) * 0.025);
      this.mesh.add(bead);
    }

    const addArm = (sx, sy, sz, hx, hy, hz, isRight) => {
      const group = new THREE.Group();
      group.position.set(sx, sy, sz);
      group.lookAt(hx, hy, hz);
      group.rotateX(-Math.PI / 2);

      const len = Math.sqrt((hx - sx) ** 2 + (hy - sy) ** 2 + (hz - sz) ** 2);
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, Math.max(0.01, len - 0.14), 5, 16), robeMat);
      sleeve.position.y = -len / 2;
      group.add(sleeve);

      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 8, 16), robeDarkMat);
      cuff.position.y = -len + 0.08;
      cuff.rotation.x = Math.PI / 2;
      group.add(cuff);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 14), skinMat);
      hand.position.y = -len;
      group.add(hand);

      for (let i = 0; i < 4; i++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 5), clawMat);
        claw.position.set((i - 1.5) * 0.017, -len - 0.035, 0.018);
        claw.rotation.x = Math.PI;
        group.add(claw);
      }

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

    addArm(-0.31, 1.36, 0, -0.42, 0.84, 0.05, false);
    addArm(0.31, 1.36, 0, 0.42, 0.84, 0.05, true);

    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.13, 0.52, 0);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.36, 5, 12), robeDarkMat);
      leg.position.y = -0.22;
      legGroup.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 14), blackMat);
      foot.position.set(0, -0.46, 0.05);
      foot.scale.set(1, 0.48, 1.45);
      legGroup.add(foot);
      this.mesh.add(legGroup);
      if (side === -1) this.leftLeg = legGroup;
      else this.rightLeg = legGroup;
    }

    this.swordGroup = new THREE.Group();
    this.swordGroup.visible = false;

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.18, 0.055), swordMat);
    blade.position.y = 0.55;
    blade.scale.x = 0.72;
    this.swordGroup.add(blade);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.24, 5), swordMat);
    tip.position.y = 1.26;
    tip.rotation.z = Math.PI;
    tip.scale.z = 0.45;
    this.swordGroup.add(tip);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.06), hiltMat);
    guard.position.y = -0.04;
    this.swordGroup.add(guard);

    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 10), hiltMat);
    hilt.position.y = -0.23;
    this.swordGroup.add(hilt);

    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.0, depthWrite: false })
    );
    aura.position.y = 0.62;
    this.swordGroup.add(aura);
    this.swordAura = aura;

    if (this.rightArm) {
      this.swordGroup.position.set(0.015, -this.rightArmLength + 0.08, 0.045);
      this.swordGroup.rotation.set(Math.PI, 0, 0);
      this.rightArm.add(this.swordGroup);
    } else {
      this.swordGroup.position.set(0.4, 0.9, 0.18);
      this.mesh.add(this.swordGroup);
    }
  }

  attachSword() {
    if (this.swordGroup) this.swordGroup.visible = true;
  }

  detachSword() {
    if (this.swordGroup) this.swordGroup.visible = false;
  }

  showSwordAura() {
    this.attachSword();
    this._swordAuraActive = true;
  }

  hideSwordAura() {
    this._swordAuraActive = false;
    if (this.swordAura) this.swordAura.material.opacity = 0;
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.backHair) {
      this.backHair.rotation.x = Math.sin(time * 1.4) * 0.02;
      this.backHair.rotation.z = Math.sin(time * 1.1) * 0.015;
    }
    if (this.hakama) {
      this.hakama.rotation.z = Math.sin(time * 1.25) * 0.012;
    }
    if (this.ears) {
      for (let i = 0; i < this.ears.length; i++) {
        this.ears[i].rotation.x = Math.sin(time * 3 + i) * 0.02;
      }
    }
    if (this.swordAura) {
      const active = this._swordAuraActive || this.swordGroup?.visible;
      this.swordAura.material.opacity = active ? 0.11 + Math.sin(time * 5) * 0.04 : 0;
      this.swordAura.scale.setScalar(1 + Math.sin(time * 4) * 0.12);
    }
  }
}
