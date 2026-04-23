import * as THREE from 'three';
import { CharacterBase } from 'dula-engine';

/**
 * Skyler — 街头篮球少年
 * 反戴棒球帽、宽松球衣23号、短裤、高帮球鞋
 */
export class Skyler extends CharacterBase {
  constructor() {
    super('Skyler');
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

    const skinMat = new THREE.MeshToonMaterial({ color: 0x8d5524, gradientMap: toonGradient });
    const hairMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });
    const jerseyMat = new THREE.MeshToonMaterial({ color: 0xff4500, gradientMap: toonGradient });
    const jerseyDarkMat = new THREE.MeshToonMaterial({ color: 0xcc3300, gradientMap: toonGradient });
    const shortsMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a, gradientMap: toonGradient });
    const shoeMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient });
    const shoeAccentMat = new THREE.MeshToonMaterial({ color: 0xff4500, gradientMap: toonGradient });
    const whiteMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient });
    const blackMat = new THREE.MeshToonMaterial({ color: 0x111111, gradientMap: toonGradient });

    // ========== HEAD GROUP ==========
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.55;

    // Face
    const faceGeo = new THREE.SphereGeometry(0.28, 32, 32);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.scale.set(1.0, 1.1, 0.95);
    face.castShadow = true;
    headGroup.add(face);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.28, 0.02, 0.02);
    leftEar.scale.set(0.5, 1.0, 0.6);
    headGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.28, 0.02, 0.02);
    rightEar.scale.set(0.5, 1.0, 0.6);
    headGroup.add(rightEar);

    // Hair
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const hairGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(Math.cos(angle) * 0.22, 0.15, Math.sin(angle) * 0.22);
      headGroup.add(hair);
    }
    const topHair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), hairMat);
    topHair.position.set(0, 0.18, 0);
    topHair.scale.set(1.1, 0.6, 1.0);
    headGroup.add(topHair);

    // Baseball cap (backwards)
    const capMat = new THREE.MeshToonMaterial({ color: 0x222222, gradientMap: toonGradient });
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
    capDome.position.set(0, 0.16, 0.02);
    capDome.scale.set(1.05, 0.7, 1.05);
    headGroup.add(capDome);
    const brimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16, 1, false, 0, Math.PI);
    const brim = new THREE.Mesh(brimGeo, capMat);
    brim.position.set(0, 0.12, 0.18);
    brim.rotation.x = 0.3;
    headGroup.add(brim);
    // Cap logo
    const logoGeo = new THREE.CircleGeometry(0.06, 16);
    const logoMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.position.set(0, 0.30, -0.22);
    logo.rotation.x = Math.PI;
    headGroup.add(logo);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.055, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, whiteMat);
    leftEye.position.set(-0.10, 0.05, 0.25);
    leftEye.scale.set(1.1, 1.0, 0.5);
    headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, whiteMat);
    rightEye.position.set(0.10, 0.05, 0.25);
    rightEye.scale.set(1.1, 1.0, 0.5);
    headGroup.add(rightEye);

    const pupilGeo = new THREE.SphereGeometry(0.03, 16, 16);
    const leftPupil = new THREE.Mesh(pupilGeo, blackMat);
    leftPupil.position.set(-0.10, 0.05, 0.27);
    headGroup.add(leftPupil);
    this.leftPupil = leftPupil;
    const rightPupil = new THREE.Mesh(pupilGeo, blackMat);
    rightPupil.position.set(0.10, 0.05, 0.27);
    headGroup.add(rightPupil);
    this.rightPupil = rightPupil;

    // Eyebrows
    const browGeo = new THREE.CapsuleGeometry(0.012, 0.08, 4, 8);
    const leftBrow = new THREE.Mesh(browGeo, blackMat);
    leftBrow.position.set(-0.10, 0.13, 0.26);
    leftBrow.rotation.z = Math.PI / 2 + 0.1;
    headGroup.add(leftBrow);
    const rightBrow = new THREE.Mesh(browGeo, blackMat);
    rightBrow.position.set(0.10, 0.13, 0.26);
    rightBrow.rotation.z = Math.PI / 2 - 0.1;
    headGroup.add(rightBrow);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.016, 16, 16);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, -0.02, 0.27);
    nose.scale.set(1, 0.8, 1.2);
    headGroup.add(nose);

    // Mouth (confident smirk)
    const mouthCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.08, 0, 0),
      new THREE.Vector3(0, -0.015, 0),
      new THREE.Vector3(0.08, 0.005, 0)
    );
    const mouthGeo = new THREE.TubeGeometry(mouthCurve, 16, 0.006, 8, false);
    const mouth = new THREE.Mesh(mouthGeo, blackMat);
    mouth.position.set(0, -0.12, 0.25);
    headGroup.add(mouth);
    this.mouth = mouth;

    this.headGroup = headGroup;
    this.mesh.add(headGroup);

    // ========== NECK ==========
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.12, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.35;
    this.mesh.add(neck);

    // ========== BODY: Baggy jersey ==========
    const torsoGeo = new THREE.CylinderGeometry(0.26, 0.30, 0.55, 32);
    const torso = new THREE.Mesh(torsoGeo, jerseyMat);
    torso.position.y = 0.95;
    torso.castShadow = true;
    this.mesh.add(torso);

    // Jersey number "23" using CanvasTexture
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 128; numCanvas.height = 128;
    const numCtx = numCanvas.getContext('2d');
    numCtx.fillStyle = '#ff4500';
    numCtx.fillRect(0, 0, 128, 128);
    numCtx.fillStyle = '#ffffff';
    numCtx.font = 'bold 80px Arial';
    numCtx.textAlign = 'center';
    numCtx.textBaseline = 'middle';
    numCtx.fillText('23', 64, 64);
    const numTex = new THREE.CanvasTexture(numCanvas);
    const numMat2 = new THREE.MeshBasicMaterial({ map: numTex, transparent: true });
    const numberPatch = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.20), numMat2);
    numberPatch.position.set(0, 1.02, 0.30);
    this.mesh.add(numberPatch);

    // Jersey trim
    const trimGeo = new THREE.TorusGeometry(0.29, 0.015, 8, 32);
    const trim = new THREE.Mesh(trimGeo, jerseyDarkMat);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 1.22;
    this.mesh.add(trim);

    // ========== ARMS ==========
    const handGeo = new THREE.SphereGeometry(0.075, 16, 16);

    const addArm = (sx, sy, sz, hx, hy, hz, isRight) => {
      const group = new THREE.Group();
      group.position.set(sx, sy, sz);
      group.lookAt(hx, hy, hz);
      group.rotateX(-Math.PI / 2);

      const len = Math.sqrt((hx - sx) ** 2 + (hy - sy) ** 2 + (hz - sz) ** 2);
      const capLen = Math.max(0.01, len - 0.12);
      const upperLen = capLen * 0.45;
      const lowerLen = capLen * 0.45;

      // Upper arm
      const upperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.075, upperLen, 4, 16),
        skinMat
      );
      upperArm.position.y = -upperLen / 2;
      group.add(upperArm);

      // Lower arm
      const lowerArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.07, lowerLen, 4, 16),
        skinMat
      );
      lowerArm.position.y = -upperLen - lowerLen / 2 - 0.02;
      group.add(lowerArm);

      // Wrist band
      const wristBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16),
        jerseyMat
      );
      wristBand.position.y = -upperLen - lowerLen - 0.02;
      group.add(wristBand);

      // Hand
      const handMesh = new THREE.Mesh(handGeo, skinMat);
      handMesh.position.y = -len;
      group.add(handMesh);

      this.mesh.add(group);
      if (isRight) {
        this.rightArm = group;
        this.rightArmLength = len;
      } else {
        this.leftArm = group;
        this.leftArmLength = len;
      }
    };

    addArm(-0.32, 1.15, 0, -0.50, 0.65, 0, false);
    addArm(0.32, 1.15, 0, 0.50, 0.65, 0, true);

    // ========== LEGS ==========
    const footGeo = new THREE.SphereGeometry(0.11, 16, 16);

    const addLeg = (x, isRight) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(x, 0.62, 0);

      // Shorts
      const shortsGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.28, 16);
      const shorts = new THREE.Mesh(shortsGeo, shortsMat);
      shorts.position.y = -0.14;
      legGroup.add(shorts);

      // Thigh
      const thighGeo = new THREE.CylinderGeometry(0.09, 0.085, 0.22, 16);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.38;
      legGroup.add(thigh);

      // Shin
      const shinGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.20, 16);
      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -0.59;
      legGroup.add(shin);

      // Sock
      const sockGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.12, 16);
      const sock = new THREE.Mesh(sockGeo, whiteMat);
      sock.position.y = -0.73;
      legGroup.add(sock);

      // High-top shoe
      const shoe = new THREE.Mesh(footGeo, shoeMat);
      shoe.position.set(0, -0.82, 0.04);
      shoe.scale.set(1.1, 0.7, 1.8);
      legGroup.add(shoe);
      const shoeAccent = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, 0.14),
        shoeAccentMat
      );
      shoeAccent.position.set(0, -0.78, 0.08);
      legGroup.add(shoeAccent);

      this.mesh.add(legGroup);
      if (isRight) {
        this.rightLeg = legGroup;
      } else {
        this.leftLeg = legGroup;
      }
    };

    addLeg(-0.13, false);
    addLeg(0.13, true);

    // ========== WAIST (bridges torso and legs) ==========
    const waistGeo = new THREE.SphereGeometry(0.20, 16, 16);
    const waist = new THREE.Mesh(waistGeo, shortsMat);
    waist.position.y = 0.58;
    waist.scale.set(1.15, 0.85, 0.95);
    this.mesh.add(waist);

    // ========== BASKETBALL ==========
    const ballGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const ballMat = new THREE.MeshToonMaterial({ color: 0xff6600, gradientMap: toonGradient });
    this.basketball = new THREE.Mesh(ballGeo, ballMat);
    // Black seam lines
    for (let i = 0; i < 2; i++) {
      const seamGeo = new THREE.TorusGeometry(0.18, 0.008, 4, 24);
      const seam = new THREE.Mesh(seamGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
      seam.rotation.x = (i === 0) ? 0 : Math.PI / 2;
      this.basketball.add(seam);
    }
    this.basketball.visible = false;
    this.mesh.add(this.basketball);

    // Scale up for realistic basketball player proportions
    this.mesh.scale.set(0.85, 0.85, 0.85);
  }

  update(time, delta) {
    super.update(time, delta);
  }
}
