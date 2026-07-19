import { AnimationBase } from 'dula-engine';
import * as THREE from 'three';

/**
 * FXAirBlast — 空气炮发射特效（剧集本地）
 * 从角色右手位置沿角色面朝方向（网格本地 +Z）射出压缩空气：
 *   1. 0.00-0.125  炮口白色闪光（小球放大淡出）
 *   2. 0.06-0.75   空气环（Torus 横放）+ 速度线，飞行约 2.2 单位并逐渐放大
 *   3. 0.75-1.00   终点爆散（环放大到 1.5 倍淡出 + 小尘球）
 * Duration: 0.8s（t 为归一化进度 0..1，与 CharacterBase 的 progress 一致）
 *
 * Tags:
 *   requires: [mesh]
 *   suits: [humanoid]
 */
export class FXAirBlast extends AnimationBase {
  constructor() {
    super('FXAirBlast', 0.8);
    this.tags = {
      requires: ['mesh'],
      suits: ['humanoid'],
      notSuits: [],
      minHeight: 0.3,
      maxHeight: 4.0,
    };
  }

  update(t, character) {
    const mesh = character.mesh;
    if (!mesh) return;

    let fxGroup = character.effectGroups?.airBlast;
    if (!fxGroup) {
      fxGroup = new THREE.Group();
      fxGroup.name = 'airBlast';

      const mkMat = (color, opacity) => new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });

      // 1) 炮口闪光
      const flash = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), mkMat(0xffffff, 0));
      fxGroup.add(flash);
      fxGroup.userData.flash = flash;

      // 2) 空气环（Torus 默认躺在 XY 平面、面朝 +Z，正好横截飞行方向）
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.045, 10, 24), mkMat(0xeeffff, 0));
      fxGroup.add(ring);
      fxGroup.userData.ring = ring;

      // 3) 速度线 3 条（沿飞行方向的细长盒）
      const streaks = [];
      const streakOffsets = [
        [0.10, 0.06], [-0.10, 0.02], [0.0, -0.09],
      ];
      for (const [ox, oy] of streakOffsets) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.55), mkMat(0xffffff, 0));
        s.userData.ox = ox;
        s.userData.oy = oy;
        fxGroup.add(s);
        streaks.push(s);
      }
      fxGroup.userData.streaks = streaks;

      // 4) 终点爆散尘球 6 颗
      const puffs = [];
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mkMat(0xffffff, 0));
        p.userData.angle = (i / 6) * Math.PI * 2;
        p.userData.lift = 0.3 + Math.random() * 0.5;
        fxGroup.add(p);
        puffs.push(p);
      }
      fxGroup.userData.puffs = puffs;

      mesh.add(fxGroup);
      if (!character.effectGroups) character.effectGroups = {};
      character.effectGroups.airBlast = fxGroup;
    }

    fxGroup.visible = true;

    // 起点：右手前方（网格本地坐标；PointForward 时手约在此高度前方）
    const ox = 0.30, oy = 1.30, oz = 0.55;
    const flightLen = 2.2;

    const flashT = Math.min(1, t / 0.125);                       // 0.00-0.125
    const flightT = t > 0.0625 ? Math.min(1, (t - 0.0625) / 0.6875) : 0; // 0.0625-0.75
    const burstT = t > 0.75 ? Math.min(1, (t - 0.75) / 0.25) : 0;        // 0.75-1.00

    const { flash, ring, streaks, puffs } = fxGroup.userData;

    // 1) 闪光：迅速放大并淡出
    flash.position.set(ox, oy, oz);
    flash.scale.setScalar(0.5 + flashT * 1.8);
    flash.material.opacity = (t <= 0.125 ? 0.9 * (1 - flashT) : 0);

    // 2) 空气环：飞行 + 逐渐放大，尾段保持，爆散时交棒
    const ringZ = oz + flightT * flightLen;
    ring.position.set(ox, oy, ringZ);
    const ringGrow = 1 + flightT * 0.9 + burstT * 0.6;
    ring.scale.setScalar(ringGrow);
    ring.material.opacity = flightT <= 0 ? 0 : Math.min(0.85, 0.3 + flightT * 0.8) * (1 - burstT);

    // 3) 速度线：同程飞行，略微超前环体，透明度先起后落
    for (const s of streaks) {
      const ahead = 0.25;
      s.position.set(ox + s.userData.ox, oy + s.userData.oy, oz + flightT * flightLen + ahead);
      const fade = flightT < 0.15 ? flightT / 0.15 : 1 - Math.max(0, (flightT - 0.6) / 0.4);
      s.material.opacity = (flightT > 0 ? 0.7 * Math.max(0, fade) : 0) * (1 - burstT);
    }

    // 4) 爆散尘球：终点向外飞散 + 淡出
    for (const p of puffs) {
      const r = burstT * 0.7;
      p.position.set(
        ox + Math.cos(p.userData.angle) * r,
        oy + Math.sin(p.userData.angle) * r * 0.6 + burstT * p.userData.lift * 0.3,
        oz + flightLen + Math.sin(p.userData.angle) * r * 0.4
      );
      p.scale.setScalar(0.6 + burstT * 1.2);
      p.material.opacity = burstT > 0 ? 0.55 * (1 - burstT) : 0;
    }

    if (t >= 0.99) {
      fxGroup.visible = false;
      flash.material.opacity = 0;
      ring.material.opacity = 0;
      for (const s of streaks) s.material.opacity = 0;
      for (const p of puffs) p.material.opacity = 0;
    }
  }
}
