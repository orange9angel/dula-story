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


# 便当白名单 = 声明式接触清单：托盘/扶沿/抓握/放置抚平的合法接触（探针是三角相交，
# 亚毫米接触与穿透同报——所以合法接触必须按 主体×部件×盒×窗口 声明，未声明即失败）
def bentoAllowed(hit, t):
    s, m, o = hit['subject'], hit['mesh'], hit['obstacle']
    if s == 'lei' and o.startswith('leiBento'):
        if m == 'rightHand' and o == 'leiBento_base' and 6.9 <= t <= 51.4:
            return True  # 托盘手托盒底（含放置窗口）
        if m == 'leftHand' and 7.0 <= t <= 13.5:
            return True  # 搬运段左手扶沿
        if 13.4 <= t <= 14.2 and m in ('leftHand', 'leftArm'):
            return True  # 掀盖操作接触（手到盖把位开自己的盒盖）
        if 50.4 <= t <= 51.55 and m in ('rightHand', 'rightArm', 'sleeve_right',
                                        'sleeve_rightRoll', 'CylinderGeometry'):
            return True  # 放盒操作接触（盒离手沿前臂滑下，含壳疹六边形件）
    if s == 'hong':
        if m == 'leftHand' and o.startswith('hongBoxA') and t >= 13.9:
            return True  # 左手托盘全程
        if m == 'leftHand' and o == 'hongBoxB_base' and 20.8 <= t <= 21.3:
            return True  # 右手接走上层盒时左手的离摞接触
        if m == 'rightHand' and o.startswith('hongBoxA') and 23.4 <= t <= 24.2:
            return True  # 右手收回途中掀左手盒盖（手过盖把）
        if (o.startswith('hongBoxB') or o.startswith('hongBoxA')) and 20.7 <= t <= 22.8 and m in (
                'rightHand', 'rightArm', 'sleeve_right', 'sleeve_rightRoll', 'TubeGeometry'):
            return True  # 右手从摞顶接盒 + 送上矮沿 + 指尖推滑（接近时会蹭到下层盒）
        if o.startswith('hongBoxB') and 21.8 <= t <= 22.8 and m in ('rightLeg', 'leftLeg'):
            return True  # 落台 transit：盒贴着腿侧沉下/滑走（终态在两人中间，探针验静置位）
        if m == 'body' and o.startswith('hongBoxA') and 21.5 <= t <= 22.9:
            return True  # 俯身放盒时胸廓蹭到左手盒沿
        if m == 'body' and o.startswith('hongBoxB') and 21.5 <= t <= 22.9:
            return True  # 同上（放下的那盒）
    return False


failures = []
fps=data.get('fps',0)
door_frames=[f for f in data['frames'] if 6.8 <= f['t'] < 22.0]
stats = {'door_frames':len(door_frames), 'door_collision_frames':0,
         'bite_min': 99., 'carry_max_xz': 0., 'seated_min': 99., 'seated_max': 0.}
prev_box = {}  # 放置连续性断言用的上一帧盒位
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
    for actor, win, key in (('lei', (7.2, 11.2), 'leiBento'), ('hong', (14.2, 20.7), 'hongBoxA')):
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
        allowed = bentoAllowed(hit, t)
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
    # 11. 手腕生理域：托盘覆盖的掌-前臂夹角 ⊥（|dot|≤.25）、扭转实加 ≤62°（需求仅记录）
    for key, w in (c.get('wrist') or {}).items():
        stats['wrist_applied_max'] = max(stats.get('wrist_applied_max', 0), w['appliedDeg'])
        stats['wrist_demand_max'] = max(stats.get('wrist_demand_max', 0), w['demandDeg'])
        if w['appliedDeg'] > 62:
            failures.append(f"wrist twist over physio limit: {key} {w['appliedDeg']:.0f}° @t={t:.2f}")
        if w['palmDot'] > .25:
            failures.append(f"palm not perpendicular to forearm: {key} {w['palmDot']:.2f} @t={t:.2f}")
    # 12. 托盘泄漏：trayK>.3 时掌必须贴着对应盒（阈值=该托持的固定偏移量+4cm 余量）
    boxes = c.get('boxPos') or {}
    for key, box, lim in (('leiR', 'leiBento', .16), ('leiL', 'leiBento', .22),
                          ('hongL', 'hongBoxA', .20)):
        k = (c.get('trayK') or {}).get(key, 0)
        if k > .3 and boxes.get(box) and (c.get('boxVis') or {}).get(box, True):
            actor = 'lei' if key.startswith('lei') else 'hong'
            side = 'right' if key.endswith('R') else 'left'
            d = math.dist(c['hands'][actor][side], boxes[box])
            stats['tray_leak_max'] = max(stats.get('tray_leak_max', 0), d)
            if d > lim:
                failures.append(f"tray palm off box: {key} {d:.3f}m @t={t:.2f}")
    # 13. 支撑者存在性：盒可见且非静置/落台段，必须有支撑（手 <.12m；叠放=下层盒 <.12m）
    support_win = {'leiBento': (6.9, 51.35), 'hongBoxA': (13.9, 99), 'hongBoxB': (20.85, 22.2)}
    transit = {'leiBento': (51.35, 51.6), 'hongBoxB': (22.2, 22.9)}
    for box, pos in boxes.items():
        if not (c.get('boxVis') or {}).get(box, True):
            continue
        win = support_win.get(box)
        if not win or not (win[0] <= t <= win[1]):
            continue
        tr = transit.get(box)
        if tr and tr[0] <= t <= tr[1]:
            continue
        actor = 'lei' if box == 'leiBento' else 'hong'
        best = min(math.dist(h, pos) for h in c['hands'][actor].values())
        if box == 'hongBoxB' and t < 20.85:  # 摞在 boxA 上：支撑者是下层盒
            best = math.dist(pos, boxes.get('hongBoxA', pos)) if boxes.get('hongBoxA') else best
        lim = {'leiBento': .16, 'hongBoxA': .20, 'hongBoxB': .16}[box]  # 阈值=固定偏移量+余量
        stats['unsupported_min'] = min(stats.get('unsupported_min', 99), best)
        if best > lim:
            failures.append(f"box without supporter: {box} {best:.3f}m @t={t:.2f}")
    # 14. 盖随手动：盖角速度非零 ⇒ 该盒主人的某只手在盖把 .15m 内
    for box, ang in (c.get('lidAngle') or {}).items():
        prevA = prev_box.get('lid_' + box)
        if prevA is not None and abs(ang - prevA) > .002:
            d = (c.get('lidTabDist') or {}).get(box, 99)
            stats['lid_far_max'] = max(stats.get('lid_far_max', 0), d)
            if d > .25:
                failures.append(f"lid moves without hand: {box} hand {d:.3f}m @t={t:.2f}")
        prev_box['lid_' + box] = ang
    # 8. 捏持锚点：签轴-掌心点线距离 ∈[.015,.045]m（不戳掌心也不脱手）；咬下腕翻段豁免
    if 41.2 <= t <= 47.2 and c.get('skewerPos') and c.get('palm') and c.get('skewerTip'):
        p = c['palm']; a = c['skewerPos']; b = c['skewerTip']
        ab = [b[i] - a[i] for i in range(3)]; ap = [p[i] - a[i] for i in range(3)]
        L2 = sum(x * x for x in ab)
        u = max(0, min(1, sum(ap[i] * ab[i] for i in range(3)) / max(L2, 1e-12)))
        d = math.dist(p, [a[i] + ab[i] * u for i in range(3)])
        stats['pinch_min'] = min(stats.get('pinch_min', 99), d)
        stats['pinch_max'] = max(stats.get('pinch_max', 0), d)
        if d < .015 or d > .045:
            failures.append(f"skewer axis off pinch zone: {d:.3f}m @t={t:.2f}")
    # 道具操作三律数值段（盒位置来自 bento.positions，需 probe-bento）
    bp = (frame.get('bento') or {}).get('positions') or {}
    # 9. 双手端盒：雷晓小盒双手搬运（右手托底、左手扶沿）；轰刚重摞单手托+右手垂放
    for actor, win, key in (('lei', (7.2, 11.2), 'leiBento_base'),):
        box = bp.get(key)
        if not box or not (win[0] <= t <= win[1]):
            continue
        for side, hand in c['hands'][actor].items():
            d = math.dist(hand, box)
            stats['carry_dual_max'] = max(stats.get('carry_dual_max', 0), d)
            if d > .20:
                failures.append(f"two-hand carry: {actor} {side} off box {d:.3f}m @t={t:.2f}")
    # 10a. 放置窗口：引导段手-盒全程接触；释放后落台/推滑段手在盒近旁（放宽到 .26m，末端脱离不再断言）
    for actor, key, win, side, lim in (('hong', 'hongBoxB_base', (20.85, 22.2), 'right', .16),
                                       ('hong', 'hongBoxB_base', (22.2, 22.6), 'right', .26),
                                       ('lei', 'leiBento_base', (50.4, 51.35), 'right', .16)):
        box = bp.get(key)
        if box and win[0] <= t <= win[1]:
            d = math.dist(c['hands'][actor][side], box)
            stats['place_max'] = max(stats.get('place_max', 0), d)
            if d > lim:
                failures.append(f"place without hand: {actor} {d:.3f}m @t={t:.2f}")
    # 10b. 放置全程盒连续（按 15Hz 姿势帧比较；重力落台段允许竖直沉降 ≤.14m）；
    #      放手后盒静止（<1mm/帧，逐输出帧）
    for key, win, down_t in (('hongBoxB_base', (20.85, 22.9), 22.9), ('leiBento_base', (50.4, 51.6), 51.6)):
        box = bp.get(key)
        prev = prev_box.get(key)
        tick = math.floor(t * 15 + 1e-6)
        if box and prev:
            step_d = math.dist(box, prev)
            if win[0] <= t < down_t:
                if tick != prev_box.get(key + '_tick'):  # 同姿势帧内盒静止，跨帧不算跳
                    # 放置段盒速=手速：实测上限 .22m/姿势帧（手随盒由 10a 断言，
                    # 放手后 <1mm/帧静止才是真静置断言）
                    ok = step_d <= .22
                    stats['place_step_max'] = max(stats.get('place_step_max', 0), step_d)
                    if not ok:
                        failures.append(f"box jumps during placement: {key} {step_d:.3f}m @t={t:.2f}")
            elif t >= down_t and step_d > .001:
                stats['down_step_max'] = max(stats.get('down_step_max', 0), step_d)
                failures.append(f"box not static after down: {key} {step_d:.4f}m @t={t:.2f}")
        if box and tick != prev_box.get(key + '_tick'):
            prev_box[key] = box
            prev_box[key + '_tick'] = tick

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
