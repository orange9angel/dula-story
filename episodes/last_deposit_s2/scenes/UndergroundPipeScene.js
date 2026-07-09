/**
 * UndergroundPipeScene — 旧城区地下管道
 *
 * 环境叙事重点：
 *   - 昏暗、狭窄、潮湿的废弃管道
 *   - 蓝色/青色霓虹灯管提供主光源
 *   - 远处通风扇缓慢旋转
 *   - 地面水洼反射
 *   - 可随 MoodDirector 切换的警报灯（alert/combat 变红闪烁）
 */

import * as THREE from 'three';
import { SceneBase } from 'dula-engine';

export class UndergroundPipeScene extends SceneBase {
  constructor() {
    super('UndergroundPipeScene');
    this.time = 0;
    this.alertLights = [];
    this.neonTubes = [];
    this.dripEmitters = [];
    this.fans = [];
  }

  build() {
    super.build();

    // 深冷色调背景
    this.scene.background = new THREE.Color(0x030308);
    this.scene.fog = new THREE.FogExp2(0x030308, 0.022);

    // 提升环境光，避免角色埋没在黑暗中
    this.lights.forEach((l) => {
      if (l.isAmbientLight) {
        l.intensity = 3.00;
        l.color.setHex(0x3a4a5d);
      }
      if (l.isDirectionalLight) {
        l.intensity = 2.60;
        l.color.setHex(0x6688aa);
        l.position.set(0, 8, 10);
      }
    });

    // 正面补光：确保特写时面部五官可见
    const faceFill = new THREE.DirectionalLight(0xddeeff, 7.0);
    faceFill.position.set(0, 4, 12);
    this.scene.add(faceFill);

    // 背面隧道轮廓光：避免背景完全死黑
    const backFill = new THREE.DirectionalLight(0x557799, 2.0);
    backFill.position.set(0, 4, -20);
    this.scene.add(backFill);

    // 隧道尽头出口光：照亮远端管壁，提供纵深
    const exitLight = new THREE.PointLight(0x66aaff, 2.5, 45, 1.4);
    exitLight.position.set(0, 4, -36);
    this.scene.add(exitLight);

    // 侧壁补光：避免角色身后管壁完全死黑
    for (const z of [-25, -10, 5]) {
      for (const x of [-1, 1]) {
        const sideLight = new THREE.PointLight(0x335577, 1.8, 18, 1.6);
        sideLight.position.set(x * 5, 5, z);
        this.scene.add(sideLight);
      }
    }

    // 后壁补光：直接照亮隧道远端管壁，提供纵深
    for (const z of [-18, -30]) {
      for (const x of [-1, 1]) {
        const backWallLight = new THREE.PointLight(0x446688, 2.6, 22, 1.4);
        backWallLight.position.set(x * 8, 6, z);
        this.scene.add(backWallLight);
      }
    }

    // 低角度辅光：照亮下半身在霓虹逆光中的轮廓
    const lowFill = new THREE.DirectionalLight(0x5577aa, 1.8);
    lowFill.position.set(0, 0.5, 8);
    this.scene.add(lowFill);

    // 半球光：补充间接漫反射，让暗部不死黑
    const hemiLight = new THREE.HemisphereLight(0x405060, 0x18181c, 1.0);
    this.scene.add(hemiLight);

    // 角色主光：从斜上方照亮全身，弥补顶部霓虹远距离衰减
    const keyLight = new THREE.DirectionalLight(0x99bbdd, 1.5);
    keyLight.position.set(4, 7, 8);
    this.scene.add(keyLight);

    // ═══════════════════════════════════════════════════════════════════
    // 管道外壳：半圆柱隧道
    // ═══════════════════════════════════════════════════════════════════
    const tunnelGeo = new THREE.CylinderGeometry(12, 12, 80, 32, 1, true, 0, Math.PI);
    const tunnelMat = new THREE.MeshStandardMaterial({
      color: 0x353550,
      roughness: 0.85,
      metalness: 0.35,
      emissive: 0x252540,
      emissiveIntensity: 1.2,
      side: THREE.BackSide,
    });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.rotation.z = Math.PI / 2;
    tunnel.position.set(0, 6, -10);
    this.scene.add(tunnel);

    // 地面：湿滑混凝土 + 水洼反射
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d');
    fctx.fillStyle = '#08080c';
    fctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8000; i++) {
      fctx.fillStyle = Math.random() > 0.6 ? '#101015' : '#050508';
      fctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(16, 8);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.25,
      metalness: 0.55,
      color: 0x333340,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 24), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 水洼（反射面片）
    const puddleGeo = new THREE.PlaneGeometry(3, 8);
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x112233,
      roughness: 0.05,
      metalness: 0.9,
      transparent: true,
      opacity: 0.75,
    });
    for (let z = -20; z < 20; z += 12) {
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set((Math.random() - 0.5) * 6, 0.005, z);
      this.scene.add(puddle);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 霓虹灯管：沿管道顶部排列，提供主光
    // ═══════════════════════════════════════════════════════════════════
    const tubeColors = [0x55ffff, 0x55aaff, 0x8866ff];
    for (let z = -35; z < 25; z += 8) {
      const color = tubeColors[(Math.abs(z) % 3)];
      const tubeGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 12);
      const tubeMat = new THREE.MeshBasicMaterial({ color });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(0, 10.5, z);
      this.scene.add(tube);
      this.neonTubes.push(tube);

      // 实际光源
      const light = new THREE.PointLight(color, 3.5, 30, 1.3);
      light.position.set(0, 9.8, z);
      this.scene.add(light);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 警报灯（可随 Mood 变红闪烁）
    // ═══════════════════════════════════════════════════════════════════
    for (const z of [-28, -10, 8, 22]) {
      const alertGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const alertMat = new THREE.MeshBasicMaterial({ color: 0x331111 });
      const alertMesh = new THREE.Mesh(alertGeo, alertMat);
      alertMesh.position.set(4.5, 9.2, z);
      this.scene.add(alertMesh);

      const alertLight = new THREE.PointLight(0xff0000, 0, 12, 1.5);
      alertLight.position.set(4.5, 8.8, z);
      this.scene.add(alertLight);

      this.alertLights.push({ mesh: alertMesh, light: alertLight, phase: Math.random() * Math.PI * 2 });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 通风扇
    // ═══════════════════════════════════════════════════════════════════
    for (const z of [-18, 14]) {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(0, 5.5, z);
      this.scene.add(fanGroup);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.4, 0.08, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.5 })
      );
      fanGroup.add(rim);

      const bladeGeo = new THREE.BoxGeometry(2.4, 0.08, 0.25);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 });
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.rotation.z = (i / 4) * Math.PI * 2;
        fanGroup.add(blade);
      }
      this.fans.push(fanGroup);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 远景管道口 / 光雾
    // ═══════════════════════════════════════════════════════════════════
    const exitGlowGeo = new THREE.PlaneGeometry(8, 8);
    const exitGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const exitGlow = new THREE.Mesh(exitGlowGeo, exitGlowMat);
    exitGlow.position.set(0, 4, -38);
    this.scene.add(exitGlow);

    // 前景遮挡物：粗管道
    const pipeGeo = new THREE.CylinderGeometry(0.6, 0.6, 20, 16);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a20, metalness: 0.6, roughness: 0.6 });
    for (const x of [-5, 5]) {
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(x * 0.8, 3.5, 10);
      this.scene.add(pipe);
    }

    return this.scene;
  }

  /**
   * MoodDirector 调用：设置环境警报等级
   * level: 0=关闭, 1=慢闪 alert, 2=快闪 combat
   */
  setAlertLevel(level, color = 0xff0000) {
    this.alertLevel = level;
    this.alertColor = new THREE.Color(color);
    for (const alert of this.alertLights) {
      alert.mesh.material.color.setHex(level > 0 ? color : 0x331111);
    }
  }

  update(time, delta) {
    super.update(time, delta);

    this.time = time;

    // 霓虹灯管轻微闪烁
    this.neonTubes.forEach((tube, i) => {
      const flicker = 0.85 + 0.15 * Math.sin(time * 8 + i);
      tube.material.opacity = flicker;
    });

    // 通风扇旋转
    this.fans.forEach((fan) => {
      fan.rotation.z -= delta * 0.8;
    });

    // 警报灯
    if (this.alertLevel > 0) {
      const speed = this.alertLevel === 2 ? 12 : 4;
      for (const alert of this.alertLights) {
        const intensity = Math.max(0, Math.sin(time * speed + alert.phase));
        alert.light.intensity = intensity * 1.5;
        alert.mesh.material.color.setHex(intensity > 0.5 ? this.alertColor.getHex() : 0x331111);
      }
    }
  }
}
