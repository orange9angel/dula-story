"""Validate hand/prop contact distances for S1E3 (contact anti-clipping probe).

Reads a render trace (node render.mjs --check --trace <file>：每帧 state.contact
含双手/门板角/签尖/嘴/便当盒世界坐标)。断言：
1. 两次出门（6.8–22s）：实际全身及便当网格 vs 实际门/门框/墙体，含 15mm 余量
2. 坐姿段（22–68s）：每只手到本角色躯干轴的 XZ 距离在 [0.09, 0.60]m（不插进躯干、不悬浮）
3. 咬下窗口（47.9–48.4s）：签尖到雷晓嘴部距离至少一帧 < 0.09m（证明真送到嘴）
4. 端盒窗口（雷晓 7.2–11.2s / 轰刚 14.2–21.0s）：手-盒 XZ 距离 < 0.16m 且手不高过盒顶
5. 便当网格（7–68s，需 --q '&probe-bento=1'）：白名单仅放行托盘手与自己托的盒底
   （lei rightHand↔leiBento_base / hong leftHand↔hongBoxA_base），其余命中即失败
6. 铁丝网净空（同 probe-bento）：道具/身体任何网格碰网面薄板代理即失败
7. 食物握持：签尖-炸鸡球心 ≤0.025m（签尖插进球内）；指骨-球心 ≥0.016m（手指不穿心）

渲染需加 --q '&probe-door=1&probe-bento=1'，局部门检可加 --door-only；缺帧/缺主体/缺障碍物即失败。
"""
import argparse
import json
import math
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('trace', type=Path)
parser.add_argument('--door-only', action='store_true')
args = parser.parse_args()
data = json.loads(args.trace.read_text())

def torso_dist(hand, root):
    return math.hypot(hand[0] - root[0], hand[2] - root[1])


failures = []
fps=data.get('fps',0)
door_frames=[f for f in data['frames'] if 6.8 <= f['t'] < 22.0]
stats = {'door_frames':len(door_frames), 'door_collision_frames':0,
         'bite_min': 99., 'carry_max_xz': 0., 'seated_min': 99., 'seated_max': 0.}
if fps < 30:
    failures.append('door coverage: sampling must be at least 30Hz')
step=1/max(1,fps)
if not door_frames or door_frames[0]['t']>6.8+.001 or door_frames[-1]['t']<22-step-.001:
    failures.append('door coverage: require the complete 6.8–22s window')
if any(b['t']-a['t']>step+.001 or b['t']<=a['t'] for a,b in zip(door_frames,door_frames[1:])):
    failures.append('door coverage: missing or nonmonotonic samples')
required={'door','door_frame_l','door_frame_r','door_frame_t','hut_wall_w','hut_wall_e',
          'hut_wall_back','hut_front_l','hut_front_r','hut_lintel'}
for frame in door_frames:
    t=frame['t'];probe=frame.get('doorway')
    if not probe:
        failures.append(f'door probe missing @t={t}');continue
    if not required.issubset(probe['obstacles']) or probe['margin']<.015:
        failures.append(f'door obstacle coverage/margin incomplete @t={t}')
    for subject,start in [('lei',7),('leiBento',7),('hong',14),('hongBoxA',14),('hongBoxB',14)]:
        if t>=start and not probe['counts'].get(subject):
            failures.append(f'door subject missing: {subject} @t={t}')
        if t>=start and subject in ('lei','hong') and probe.get('skinnedCounts',{}).get(subject,0)<2:
            failures.append(f'door skinned-hand coverage missing: {subject} @t={t}')
    if probe['hits']:
        stats['door_collision_frames']+=1
        failures.append(f'door collision @t={t}: {probe["hits"][:3]}')

for frame in data['frames']:
    if args.door_only:
        break
    t = frame['t']
    c = frame.get('contact')
    if not c:
        continue
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
    # 5. 便当网格探针（state.bento，需 --q '&probe-bento=1'）：
    #    白名单只放行托盘手与自己托的盒底，且仅限托盒窗口
    #    （雷晓右手托盒 6.9–51.4s 含放下过渡；轰刚左手托盒 14.0s 起到结尾）。
    b = frame.get('bento')
    if not b:
        continue
    stats.setdefault('bento_frames', 0)
    stats['bento_frames'] += 1
    stats.setdefault('bento_tray_contacts', 0)
    for hit in b['hits']:
        allowed = ((hit['subject'] == 'lei' and hit['mesh'] == 'rightHand' and
                    hit['obstacle'] == 'leiBento_base' and 6.9 <= t <= 51.4) or
                   (hit['subject'] == 'hong' and hit['mesh'] == 'leftHand' and
                    hit['obstacle'] == 'hongBoxA_base' and t >= 13.9))
        if allowed:
            stats['bento_tray_contacts'] += 1
        else:
            stats['bento_bad'] = stats.get('bento_bad', 0) + 1
            failures.append(f"bento clip @t={t}: {hit['subject']} {hit['mesh']} vs {hit['obstacle']}")

    # 6. 铁丝网净空（state.env，随 probe-bento 一起）：道具/身体任何网格碰网即失败
    env = frame.get('env')
    if env:
        stats['env_frames'] = stats.get('env_frames', 0) + 1
        for hit in env['hits']:
            stats['env_bad'] = stats.get('env_bad', 0) + 1
            failures.append(f"fence clip @t={t}: {hit['subject']} {hit['mesh']} vs {hit['obstacle']}")
    # 7. 食物握持：签尖-球心 ≤.025m（签尖插进球内）；指骨-球心 ≥.016m（手指不穿心）
    if c.get('nug'):
        stats['nug_frames'] = stats.get('nug_frames', 0) + 1
        if c.get('skewerTip'):
            d = math.dist(c['skewerTip'], c['nug'])
            stats['nug_tip_max'] = max(stats.get('nug_tip_max', 0), d)
            if d > .025:
                failures.append(f"skewer tip outside nugget: {d:.3f}m @t={t:.2f}")
        if c.get('nugBoneMin', 99) < .016:
            stats['nug_bone_min'] = min(stats.get('nug_bone_min', 99), c['nugBoneMin'])
            failures.append(f"finger through nugget: {c['nugBoneMin']:.3f}m @t={t:.2f}")
        else:
            stats['nug_bone_min'] = min(stats.get('nug_bone_min', 99), c['nugBoneMin'])

if not args.door_only:
    if stats.get('bento_frames', 0) < 100:
        failures.append('bento probe missing or too sparse: run render with --q "&probe-bento=1"')
    if stats.get('env_frames', 0) < 100:
        failures.append('fence probe missing: run render with --q "&probe-bento=1"')
    if stats.get('nug_frames', 0) < 10:
        failures.append('food probe missing: skewer window not sampled')

if not args.door_only and stats['bite_min'] > .09:
    failures.append(f"skewer never reaches mouth: min {stats['bite_min']:.3f}m")

if args.door_only:
    stats={k:v for k,v in stats.items() if k.startswith('door_')}
report={'passed':not failures,'stats':stats,'failures':failures,
        'scope':'Visible solid meshes vs rendered hut OBBs, triangle intersections with 15mm inflation; sampled collision audit, not continuous physics or artistic approval.'}
args.trace.with_name('contact_validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(stats, indent=1))
if failures:
    print(f"FAIL {len(failures)} contact violations")
    for f in failures[:20]:
        print(' ', f)
    raise SystemExit(2)
print('contact check: all assertions passed')
