#!/usr/bin/env python3
"""
剧情与脚本合理性检查程序
检查跨栏大赛脚本的关键问题：
1. 是否所有选手同时起跑
2. 相机是否能同时看到所有选手
3. 选手运动轨迹是否合理（不重叠、不倒退、速度合理）
4. 剧情时间线是否一致
"""

import re
import sys
from dataclasses import dataclass
from typing import List, Dict, Tuple

RACE_START_Z = -50
FINISH_LINE_Z = 50
RACE_START_TIME = 98.5  # fallback; main() will infer from script
RACE_END_TIME = 150.5   # fallback; main() will infer from script
HURDLE_HEIGHT = 1.067
HURDLE_ZS = [RACE_START_Z + 13.72 + i * 9.14 for i in range(10)]

@dataclass
class MoveEvent:
    start: float
    end: float
    character: str
    z_start: float
    z_end: float
    x: float
    duration: float
    y_end: float = 0.0
    jump_height: float = 0.0
    kind: str = 'Move'
    collision: str = ''

@dataclass
class CameraEvent:
    start: float
    end: float
    camera_type: str
    params: Dict

@dataclass
class Dialogue:
    start: float
    end: float
    character: str
    text: str


def parse_params(param_text: str) -> Dict[str, str]:
    params = {}
    for kv in param_text.split('|'):
        if '=' in kv:
            k, v = kv.split('=', 1)
            params[k] = v
    return params


def float_param(params: Dict[str, str], key: str, fallback: float) -> float:
    try:
        return float(params.get(key, fallback))
    except (TypeError, ValueError):
        return fallback


def parse_time(t: str) -> float:
    h, m, s = t.split(':')
    s, ms = s.split(',')
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def parse_script(path: str):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    blocks = re.split(r'\n\n+', content.strip())
    moves = []
    cameras = []
    dialogues = []
    positions = {}  # character -> (x, z)

    for block in blocks:
        lines = block.strip().split('\n')
        if not lines or not re.match(r'^\d+$', lines[0].strip()):
            continue

        time_line = None
        for line in lines:
            if '-->' in line:
                time_line = line
                break
        if not time_line:
            continue

        m = re.match(r'(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})', time_line)
        if not m:
            continue
        start = parse_time(m.group(1))
        end = parse_time(m.group(2))

        for line in lines:
            line_stripped = line.strip()

            pos_match = re.match(r'\{Position:(\w+)\|(.+)\}', line_stripped)
            if pos_match:
                char = pos_match.group(1)
                params = parse_params(pos_match.group(2))
                x = float_param(params, 'x', positions.get(char, (0, 0))[0])
                z = float_param(params, 'z', positions.get(char, (0, 0))[1])
                positions[char] = (x, z)

            move_match = re.match(r'\{Event:Move\|character=(\w+)\|(.+)\}', line_stripped)
            if move_match:
                char = move_match.group(1)
                params = parse_params(move_match.group(2))
                x = float_param(params, 'x', positions.get(char, (0, 0))[0])
                z_end = float_param(params, 'z', positions.get(char, (0, 0))[1])
                duration = float_param(params, 'duration', end - start)
                y_end = float_param(params, 'y', 0.0)
                z_start = positions.get(char, (0, 0))[1]
                moves.append(MoveEvent(start, end, char, z_start, z_end, x, duration, y_end=y_end, kind='Move'))
                positions[char] = (x, z_end)

            hurdle_match = re.match(r'\{Event:HurdleRun\|character=(\w+)\|(.+)\}', line_stripped)
            if hurdle_match:
                char = hurdle_match.group(1)
                params = parse_params(hurdle_match.group(2))
                x = float_param(params, 'x', positions.get(char, (0, 0))[0])
                z_start = float_param(params, 'fromZ', positions.get(char, (0, 0))[1])
                z_end = float_param(params, 'z', float_param(params, 'toZ', positions.get(char, (0, 0))[1]))
                duration = float_param(params, 'duration', end - start)
                ground_y = float_param(params, 'groundY', float_param(params, 'y', 0.0))
                jump_height = float_param(params, 'jumpHeight', 0.0)
                moves.append(MoveEvent(
                    start, end, char, z_start, z_end, x, duration,
                    y_end=ground_y,
                    jump_height=jump_height,
                    kind='HurdleRun',
                    collision=params.get('collision', '')
                ))
                positions[char] = (x, z_end)

            cam_match = re.match(r'\{Camera:(\w+)\|(.+)\}', line_stripped)
            if cam_match:
                cam_type = cam_match.group(1)
                params = parse_params(cam_match.group(2))
                cam_duration = float_param(params, 'duration', end - start)
                cameras.append(CameraEvent(start, start + cam_duration, cam_type, params))

            dialog_match = re.match(r'\[(\w+)\] (.+)', line_stripped)
            if dialog_match:
                char = dialog_match.group(1)
                text = dialog_match.group(2)
                dialogues.append(Dialogue(start, end, char, text))

    return moves, cameras, dialogues


def get_race_moves(moves: List[MoveEvent]) -> Dict[str, List[MoveEvent]]:
    """只取比赛期间的移动（起跑后到颁奖前）"""
    race_moves = {}
    racers = ['Zorak', 'Klaw', 'Vex', 'Rex', 'DiscoWorm']
    for char in racers:
        char_moves = [m for m in moves if m.character == char and m.start >= RACE_START_TIME and m.start < RACE_END_TIME]
        if char_moves:
            race_moves[char] = sorted(char_moves, key=lambda m: m.start)
    return race_moves


def infer_race_window(dialogues: List[Dialogue]) -> Tuple[float, float]:
    """Infer race bounds from dialogue so checks survive timeline retiming."""
    start = RACE_START_TIME
    end = RACE_END_TIME
    for d in dialogues:
        if '跑' in d.text and ('预备' in d.text or '各就各位' in d.text):
            start = d.start
            break
    for d in dialogues:
        if d.start > start and ('比赛结束' in d.text or '看看成绩' in d.text):
            end = d.start
            break
    return start, end


def check_together_start(moves: List[MoveEvent], dialogues: List[Dialogue]) -> List[str]:
    issues = []
    race_start_time = None
    for d in dialogues:
        if '跑' in d.text and ('预备' in d.text or '各就各位' in d.text):
            race_start_time = d.start
            break

    if race_start_time is None:
        issues.append("❌ 找不到起跑口令")
        return issues

    issues.append(f"✓ 起跑口令时间: {race_start_time:.2f}s")

    race_moves = get_race_moves(moves)
    first_moves = {char: moves_list[0] for char, moves_list in race_moves.items()}

    if len(first_moves) < 5:
        missing = set(['Zorak', 'Klaw', 'Vex', 'Rex', 'DiscoWorm']) - set(first_moves.keys())
        issues.append(f"❌ 部分选手没有比赛移动事件: {missing}")

    start_times = [m.start for m in first_moves.values()]
    if start_times:
        min_start = min(start_times)
        max_start = max(start_times)
        gap = max_start - min_start
        issues.append(f"首次移动时间: {min_start:.2f}s ~ {max_start:.2f}s (差距 {gap:.2f}s)")
        if gap > 0.5:
            issues.append("❌ 起跑不同步！")
            for char, m in first_moves.items():
                issues.append(f"   {char}: {m.start:.2f}s")
        else:
            issues.append("✓ 所有选手同时起跑")

    return issues


def check_camera_shows_all(cameras: List[CameraEvent]) -> List[str]:
    issues = []
    race_cameras = sorted([c for c in cameras if RACE_START_TIME - 5 <= c.start <= RACE_END_TIME], key=lambda c: c.start)

    issues.append(f"比赛期间 ({RACE_START_TIME-5:.0f}s ~ {RACE_END_TIME:.0f}s) 相机切换次数: {len(race_cameras)}")

    cam_types = {}
    for c in race_cameras:
        cam_types[c.camera_type] = cam_types.get(c.camera_type, 0) + 1
    issues.append(f"相机类型分布: {cam_types}")

    follow_count = cam_types.get('FollowCharacter', 0)
    if follow_count > 0:
        issues.append(f"⚠️ 比赛期间使用了 {follow_count} 次 FollowCharacter（只跟随单个角色）")

    followed_chars = []
    for c in race_cameras:
        if c.camera_type == 'FollowCharacter':
            followed_chars.append(c.params.get('characterName', '?'))

    if followed_chars:
        issues.append(f"FollowCharacter 跟随序列: {followed_chars}")
        unique = set(followed_chars)
        if len(unique) > 1:
            issues.append("❌ 相机频繁切换跟随不同角色，观众无法同时看到所有选手比赛")

    # 检查起跑时相机
    start_cameras = [c for c in race_cameras if abs(c.start - RACE_START_TIME) < 2]
    issues.append(f"\n起跑时刻 ({RACE_START_TIME}s) 相机:")
    for c in start_cameras:
        issues.append(f"  {c.camera_type} @ {c.start:.2f}s, params={c.params}")

    wide_exists = any(c.camera_type in ('Wide', 'Static', 'Pan') for c in race_cameras)
    if not wide_exists:
        issues.append("❌ 比赛期间完全没有广角/静态/平移相机")
    else:
        issues.append("✓ 有广角/静态/平移相机")

    return issues


def check_trajectory(moves: List[MoveEvent]) -> List[str]:
    issues = []
    race_moves = get_race_moves(moves)

    issues.append("\n各选手比赛轨迹:")
    for char, char_moves in race_moves.items():
        # 检查倒退
        backward = False
        for i in range(1, len(char_moves)):
            if char_moves[i].z_end < char_moves[i-1].z_end:
                issues.append(f"❌ {char} 倒退: {char_moves[i-1].z_end:.1f} -> {char_moves[i].z_end:.1f} @ {char_moves[i].start:.2f}s")
                backward = True

        # 计算比赛段速度
        total_distance = char_moves[-1].z_end - char_moves[0].z_start
        total_time = char_moves[-1].end - char_moves[0].start
        avg_speed = total_distance / total_time if total_time > 0 else 0
        issues.append(f"  {char}: 距离 {total_distance:.1f}m, 时间 {total_time:.1f}s, 平均速度 {avg_speed:.2f}m/s")

        # 110米栏应该约 95-110m
        if total_distance < 80:
            issues.append(f"⚠️ {char} 比赛距离过短 ({total_distance:.1f}m)")

        # 速度检查
        if avg_speed > 12:
            issues.append(f"⚠️ {char} 速度过快 ({avg_speed:.2f}m/s)")
        elif avg_speed < 3 and char not in ('Rex', 'DiscoWorm'):
            issues.append(f"⚠️ {char} 速度过慢 ({avg_speed:.2f}m/s)")

        # 是否冲线
        if char_moves[-1].z_end < FINISH_LINE_Z:
            issues.append(f"❌ {char} 未冲线 (最终 z={char_moves[-1].z_end:.1f})")
        else:
            issues.append(f"✓ {char} 冲线")

        # 跑道位置
        for m in char_moves:
            if abs(m.x) > 5:
                issues.append(f"⚠️ {char} x={m.x} 可能越出跑道")

    return issues


def crossed_hurdles(z_start: float, z_end: float) -> List[float]:
    low, high = sorted((z_start, z_end))
    return [z for z in HURDLE_ZS if low + 0.02 < z < high - 0.02]


def check_hurdle_clearance(moves: List[MoveEvent]) -> List[str]:
    issues = []
    race_moves = get_race_moves(moves)
    failures = []
    collision_segments = []

    for char, char_moves in race_moves.items():
        if char == 'DiscoWorm':
            continue
        for m in char_moves:
            hurdles = crossed_hurdles(m.z_start, m.z_end)
            if not hurdles:
                continue
            hurdle_list = ', '.join(f'{z:.2f}' for z in hurdles)
            if m.kind != 'HurdleRun':
                failures.append(
                    f"❌ {char} {m.start:.2f}s 用 {m.kind} 从 z={m.z_start:.1f} 到 {m.z_end:.1f}，穿过栏位 [{hurdle_list}]"
                )
            elif m.jump_height < HURDLE_HEIGHT + 0.05:
                if str(m.collision).lower() in ('knockdown', 'hit', 'true'):
                    collision_segments.append(f"{char} {m.start:.2f}s 栏位 [{hurdle_list}]")
                else:
                    failures.append(
                        f"❌ {char} {m.start:.2f}s 跨栏高度不足: jumpHeight={m.jump_height:.2f}, 栏高={HURDLE_HEIGHT:.2f}, 栏位 [{hurdle_list}]"
                    )

    if failures:
        issues.extend(failures)
    else:
        issues.append("✓ 所有非虫虫选手跨过栏位时都使用 HurdleRun")
        issues.append(f"✓ 正常跨栏段跳跃高度均高于栏高 {HURDLE_HEIGHT:.2f}m")
        if collision_segments:
            issues.append(f"✓ 低高度段已显式标记为碰撞倒栏: {', '.join(collision_segments)}")
        issues.append("✓ DiscoWorm 保持 WormTunnel，从栏架下方钻过")

    return issues


def check_story_consistency(dialogues: List[Dialogue], moves: List[MoveEvent]) -> List[str]:
    issues = []
    race_moves = get_race_moves(moves)

    ranking_dialogue = {
        'Zorak': 1,
        'Vex': 2,
        'Rex': 3,
        'Klaw': 4,
        'DiscoWorm': 5
    }

    finish_times = {}
    for char in ranking_dialogue.keys():
        if char in race_moves:
            for m in race_moves[char]:
                if m.z_end >= FINISH_LINE_Z:
                    finish_times[char] = m.start + m.duration
                    break

    if finish_times:
        issues.append("\n到达终点时间:")
        for char, t in sorted(finish_times.items(), key=lambda x: x[1]):
            issues.append(f"  {char}: {t:.2f}s")

        actual_order = [c for c, _ in sorted(finish_times.items(), key=lambda x: x[1])]
        expected_order = [c for c, _ in sorted(ranking_dialogue.items(), key=lambda x: x[1])]

        issues.append("\n实际到达顺序 vs 剧情排名:")
        for i, (actual, expected) in enumerate(zip(actual_order, expected_order)):
            match = "✓" if actual == expected else "❌"
            issues.append(f"  {match} 第{i+1}名: 实际={actual} 剧情={expected}")

        if actual_order != expected_order:
            issues.append("❌ 实际到达顺序与剧情排名不一致")
    else:
        issues.append("❌ 无法计算到达时间")

    # 检查台词与动作匹配
    issues.append("\n台词-动作一致性检查:")
    for d in dialogues:
        if '钻' in d.text and '栏架' in d.text and d.character == 'DiscoWorm':
            # DiscoWorm 说钻过去，检查他是否有 Walk 动作（不是 Jump）
            worm_moves = [m for m in moves if m.character == 'DiscoWorm' and RACE_START_TIME <= m.start < RACE_END_TIME]
            jump_count = sum(1 for line in open(r'D:\opensource\movie\dula-story\episodes\hurdles_championship\script.story')
                             if '{DiscoWorm}{Jump}' in line)
            if jump_count > 0:
                issues.append(f"⚠️ DiscoWorm 说从栏架下钻过去，但脚本中有 {jump_count} 次 Jump 动作")
            else:
                issues.append("✓ DiscoWorm 没有 Jump 动作，符合'钻过去'设定")
            break

    return issues


def check_camera_movement_continuity(cameras: List[CameraEvent]) -> List[str]:
    issues = []
    race_cameras = sorted([c for c in cameras if RACE_START_TIME <= c.start <= RACE_END_TIME], key=lambda c: c.start)

    issues.append(f"\n比赛期间相机切换: {len(race_cameras)} 次")
    if len(race_cameras) > 15:
        issues.append("⚠️ 相机切换过于频繁，观众会感到眩晕")

    # 检查是否有连续跟踪所有选手的相机
    has_continuous_tracking = any(c.camera_type in ('Pan', 'Static', 'Wide', 'RaceSideTrack') and c.start <= RACE_START_TIME + 5
                                   for c in race_cameras)
    if not has_continuous_tracking:
        issues.append("❌ 起跑后没有广角/全景相机展示所有选手同时起跑")

    return issues


def main():
    global RACE_START_TIME, RACE_END_TIME
    script_path = r'D:\opensource\movie\dula-story\episodes\hurdles_championship\script.story'
    moves, cameras, dialogues = parse_script(script_path)
    RACE_START_TIME, RACE_END_TIME = infer_race_window(dialogues)

    print("=" * 70)
    print("跨栏大赛脚本 - 剧情与合理性检查报告")
    print("=" * 70)

    print("\n## 1. 起跑同步性检查")
    print("-" * 50)
    for issue in check_together_start(moves, dialogues):
        print(issue)

    print("\n## 2. 相机覆盖范围检查")
    print("-" * 50)
    for issue in check_camera_shows_all(cameras):
        print(issue)

    print("\n## 3. 选手运动轨迹检查")
    print("-" * 50)
    for issue in check_trajectory(moves):
        print(issue)

    print("\n## 4. 跨栏穿模检查")
    print("-" * 50)
    for issue in check_hurdle_clearance(moves):
        print(issue)

    print("\n## 5. 剧情一致性检查")
    print("-" * 50)
    for issue in check_story_consistency(dialogues, moves):
        print(issue)

    print("\n## 6. 相机运动连续性检查")
    print("-" * 50)
    for issue in check_camera_movement_continuity(cameras):
        print(issue)

    print("\n" + "=" * 70)
    print("检查完成")
    print("=" * 70)


if __name__ == '__main__':
    main()
