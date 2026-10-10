"""Validate hand/prop contact distances for S1E3 (contact anti-clipping probe).

Reads a render trace (node render.mjs --check --trace <file>：每帧 state.contact
含双手/门板角/签尖/嘴/便当盒世界坐标)。断言：
1. 开门窗口（13.4–16.5s）：轰刚双手到门板扫掠面的最小距离 > 0.06m
2. 坐姿段（22–68s）：每只手到本角色躯干轴的 XZ 距离在 [0.09, 0.60]m（不插进躯干、不悬浮）
3. 咬下窗口（47.9–48.4s）：签尖到雷晓嘴部距离至少一帧 < 0.09m（证明真送到嘴）
4. 端盒窗口（雷晓 7.2–11.2s / 轰刚 14.2–21.5s）：手-盒 XZ 距离 < 0.16m 且手不高过盒顶

门板几何（RooftopNoonScene.doorA 注释同款）：铰链 (-6.975, *, -7.96)，长 .95，
rotation.y=a 时局部 +x → (cos a, 0, -sin a)。
"""
import argparse
import json
import math
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('trace', type=Path)
args = parser.parse_args()
data = json.loads(args.trace.read_text())

HINGE = (-6.975, -7.96)
DOOR_LEN = .95


def pt_seg2d(p, a, b):
    ax, az = a; bx, bz = b; px, pz = p
    dx, dz = bx - ax, bz - az
    u = max(0, min(1, ((px - ax) * dx + (pz - az) * dz) / max(dx * dx + dz * dz, 1e-12)))
    return math.hypot(px - (ax + dx * u), pz - (az + dz * u))


def door_dist(hand, angle):
    dx, dz = math.cos(angle), -math.sin(angle)
    return pt_seg2d((hand[0], hand[2]), HINGE,
                    (HINGE[0] + dx * DOOR_LEN, HINGE[1] + dz * DOOR_LEN))


def torso_dist(hand, root):
    return math.hypot(hand[0] - root[0], hand[2] - root[1])


failures = []
stats = {'door_min': 99., 'bite_min': 99., 'carry_max_xz': 0., 'seated_min': 99., 'seated_max': 0.}
for frame in data['frames']:
    t = frame['t']
    c = frame.get('contact')
    if not c:
        continue
    # 1. 开门窗口：轰刚双手 vs 门板
    if 13.4 <= t <= 16.5:
        for hand in c['hands']['hong'].values():
            d = door_dist(hand, c['doorA'])
            stats['door_min'] = min(stats['door_min'], d)
            if d < .06:
                failures.append(f"door clip: hong hand {d:.3f}m @t={t:.2f}")
    # 2. 坐姿段：手-躯干轴 XZ 距离窗口
    if 22.0 <= t <= 68.0:
        for actor, root in (('lei', frame.get('leiRoot')), ('hong', frame.get('hongRoot'))):
            if not root:
                continue
            for hand in c['hands'][actor].values():
                d = torso_dist(hand, root)
                stats['seated_min'] = min(stats['seated_min'], d)
                stats['seated_max'] = max(stats['seated_max'], d)
                if d < .09:
                    failures.append(f"hand in torso: {actor} {d:.3f}m @t={t:.2f}")
                if d > .60:
                    failures.append(f"hand floating: {actor} {d:.3f}m @t={t:.2f}")
    # 3. 咬下窗口：签尖-嘴
    if 47.9 <= t <= 48.4 and c.get('skewerTip'):
        d = math.dist(c['skewerTip'], c['mouthLei'])
        stats['bite_min'] = min(stats['bite_min'], d)
    # 4. 端盒窗口：最近手-盒贴合（另一只手可能挥手/拿签，不查）
    for actor, win, key in (('lei', (7.2, 11.2), 'leiBento'), ('hong', (14.2, 21.0), 'hongBoxA')):
        box = c.get(key)
        if not box or not (win[0] <= t <= win[1]):
            continue
        best = min(math.hypot(hand[0] - box[0], hand[2] - box[2])
                   for hand in c['hands'][actor].values())
        stats['carry_max_xz'] = max(stats['carry_max_xz'], best)
        hand = min(c['hands'][actor].values(),
                   key=lambda h: math.hypot(h[0] - box[0], h[2] - box[2]))
        dy = hand[1] - box[1]
        if best > .16 or dy > .08 or dy < -.08:  # 手掌可落在盒盖上沿（托盒/扣沿）
            failures.append(f"carry off-box: {actor} xz={best:.3f} dy={dy:.3f} @t={t:.2f}")

if stats['bite_min'] > .09:
    failures.append(f"skewer never reaches mouth: min {stats['bite_min']:.3f}m")

print(json.dumps(stats, indent=1))
if failures:
    print(f"FAIL {len(failures)} contact violations")
    for f in failures[:20]:
        print(' ', f)
    raise SystemExit(2)
print('contact check: all assertions passed')
