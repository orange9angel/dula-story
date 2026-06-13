#!/usr/bin/env python3
"""
SmartScheduler - 智能配音与视频时间线调度组件

功能：
1. 分析脚本中的动作事件（HurdleRun、Move、Animation等），计算实际完成时间
2. 分析对话音频时长，防止重叠
3. 自动调整时间线，确保对话不会出现在动作完成之前
4. 输出调整后的 script.story 和更新后的 manifest

用法：
    python tools/smart_scheduler.py [episode_path]

输出：
    - script.story.scheduled（调整后的脚本，可直接替换原脚本）
    - scheduling_report.json（调度报告，包含所有调整原因）
"""

import json
import os
import re
import sys
import subprocess
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

# Resolve episode path
EPISODE = sys.argv[1] if len(sys.argv) > 1 else "."
if not os.path.isabs(EPISODE):
    EPISODE = os.path.join(os.getcwd(), EPISODE)

STORY_PATH = os.path.join(EPISODE, "script.story")
MANIFEST_PATH = os.path.join(EPISODE, "assets", "audio", "manifest.json")
REPORT_PATH = os.path.join(EPISODE, "scheduling_report.json")
OUTPUT_STORY_PATH = os.path.join(EPISODE, "script.story.scheduled")


@dataclass
class StoryEntry:
    """脚本条目"""
    index: int
    start_time: float
    end_time: float
    content: str
    character: Optional[str] = None
    dialogue: Optional[str] = None
    scene: Optional[str] = None
    events: List[Dict] = field(default_factory=list)
    animations: List[Dict] = field(default_factory=list)
    camera: Optional[Dict] = None
    music: Optional[Dict] = None
    sfx: Optional[Dict] = None
    positions: List[Dict] = field(default_factory=list)
    transition: Optional[Dict] = None


@dataclass
class ActionEvent:
    """动作事件（需要计算完成时间的）"""
    entry_index: int
    event_type: str  # "HurdleRun", "Move", "Animation", etc.
    start_time: float
    duration: float
    params: Dict
    
    @property
    def end_time(self) -> float:
        return self.start_time + self.duration


@dataclass
class DialogueEvent:
    """对话事件"""
    entry_index: int
    character: str
    dialogue: str
    start_time: float
    end_time: float
    audio_duration: Optional[float] = None
    
    @property
    def audio_end_time(self) -> float:
        if self.audio_duration:
            return self.start_time + self.audio_duration
        return self.end_time


@dataclass
class ScheduleAdjustment:
    """调度调整记录"""
    entry_index: int
    reason: str
    old_start: float
    new_start: float
    shift: float
    details: str


def parse_story(text: str) -> List[StoryEntry]:
    """解析 script.story 文件"""
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    entries = []
    i = 0
    
    while i < len(lines):
        if lines[i].strip() == "":
            i += 1
            continue
        
        # 读取索引
        try:
            index = int(lines[i].strip())
        except ValueError:
            i += 1
            continue
        i += 1
        
        if i >= len(lines):
            break
        
        # 读取时间行
        time_line = lines[i].strip()
        i += 1
        m = re.match(
            r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})",
            time_line,
        )
        if not m:
            continue
        
        start = (
            int(m.group(1)) * 3600
            + int(m.group(2)) * 60
            + int(m.group(3))
            + int(m.group(4)) / 1000
        )
        end = (
            int(m.group(5)) * 3600
            + int(m.group(6)) * 60
            + int(m.group(7))
            + int(m.group(8)) / 1000
        )
        
        # 读取内容行
        content_lines = []
        while i < len(lines) and lines[i].strip() != "":
            content_lines.append(lines[i].rstrip())
            i += 1
        
        content = "\n".join(content_lines)
        
        # 解析内容
        entry = StoryEntry(index=index, start_time=start, end_time=end, content=content)
        
        # 场景切换
        scene_match = re.search(r"^@(\w+)", content, re.MULTILINE)
        if scene_match:
            entry.scene = scene_match.group(1)
        
        # 角色和对话
        char_match = re.search(r"\[(\w+)\]", content)
        if char_match:
            entry.character = char_match.group(1)
        
        # 提取对话文本（清理标签后的）
        dialogue = content
        dialogue = re.sub(r"^@\w+\s*", "", dialogue, flags=re.MULTILINE)
        dialogue = re.sub(r"\[\w+\]\s*", "", dialogue)
        dialogue = re.sub(r"\{Camera:[^}]+\}\s*", "", dialogue)
        dialogue = re.sub(r"\{Music:[^}]+\}\s*", "", dialogue)
        dialogue = re.sub(r"\{Voice:[^}]+\}\s*", "", dialogue)
        dialogue = re.sub(r"\{SFX:[^}]+\}\s*", "", dialogue)
        dialogue = re.sub(r"\{Transition:[^}]+\}\s*", "", dialogue)
        dialogue = re.sub(r"\{Position:[^}]+\}\s*", "", dialogue)
        dialogue = re.sub(r"\{\w+\}\{\w+(?:\|[^}]+)?\}\s*", "", dialogue)
        dialogue = re.sub(r"\{\w+\|[^}]+\}\s*", "", dialogue)
        dialogue = re.sub(r"\{(?!\w+:)[\w]+\}\s*", "", dialogue).strip()
        entry.dialogue = dialogue if dialogue else None
        
        # 解析 Event 标签
        event_matches = re.findall(r"\{Event:([^}]+)\}", content)
        for ev in event_matches:
            parts = [p.strip() for p in ev.split("|")]
            event_type = parts[0]
            params = {}
            for p in parts[1:]:
                if "=" in p:
                    k, v = p.split("=", 1)
                    try:
                        params[k.strip()] = float(v.strip())
                    except ValueError:
                        params[k.strip()] = v.strip()
            entry.events.append({"type": event_type, "params": params})
        
        # 解析 Animation 标签（带角色的）
        anim_matches = re.findall(r"\{(\w+)\}\{(\w+)(?:\|([^}]+))?\}", content)
        for char, anim_name, anim_params in anim_matches:
            params = {"character": char, "name": anim_name}
            if anim_params:
                for p in anim_params.split("|"):
                    if "=" in p:
                        k, v = p.split("=", 1)
                        try:
                            params[k.strip()] = float(v.strip())
                        except ValueError:
                            params[k.strip()] = v.strip()
            entry.animations.append(params)
        
        # 解析 Camera 标签
        cam_match = re.search(r"\{Camera:([^}]+)\}", content)
        if cam_match:
            parts = [p.strip() for p in cam_match.group(1).split("|")]
            cam_type = parts[0]
            params = {"type": cam_type}
            for p in parts[1:]:
                if "=" in p:
                    k, v = p.split("=", 1)
                    try:
                        params[k.strip()] = float(v.strip())
                    except ValueError:
                        params[k.strip()] = v.strip()
            entry.camera = params
        
        # 解析 Music 标签
        music_match = re.search(r"\{Music:([^}]+)\}", content)
        if music_match:
            parts = [p.strip() for p in music_match.group(1).split("|")]
            action = parts[0]
            params = {"action": action}
            for p in parts[1:]:
                if "=" in p:
                    k, v = p.split("=", 1)
                    try:
                        params[k.strip()] = float(v.strip())
                    except ValueError:
                        params[k.strip()] = v.strip()
            entry.music = params
        
        # 解析 SFX 标签
        sfx_match = re.search(r"\{SFX:([^}]+)\}", content)
        if sfx_match:
            parts = [p.strip() for p in sfx_match.group(1).split("|")]
            action = parts[0]
            params = {"action": action}
            for p in parts[1:]:
                if "=" in p:
                    k, v = p.split("=", 1)
                    try:
                        params[k.strip()] = float(v.strip())
                    except ValueError:
                        params[k.strip()] = v.strip()
            entry.sfx = params
        
        # 解析 Position 标签
        pos_matches = re.findall(r"\{Position:([^}]+)\}", content)
        for pos in pos_matches:
            parts = [p.strip() for p in pos.split("|")]
            char = parts[0]
            params = {"character": char}
            for p in parts[1:]:
                if "=" in p:
                    k, v = p.split("=", 1)
                    try:
                        params[k.strip()] = float(v.strip())
                    except ValueError:
                        params[k.strip()] = v.strip()
            entry.positions.append(params)
        
        # 解析 Transition 标签
        trans_match = re.search(r"\{Transition:([^}]+)\}", content)
        if trans_match:
            parts = [p.strip() for p in trans_match.group(1).split("|")]
            trans_type = parts[0]
            params = {"type": trans_type}
            for p in parts[1:]:
                if "=" in p:
                    k, v = p.split("=", 1)
                    try:
                        params[k.strip()] = float(v.strip())
                    except ValueError:
                        params[k.strip()] = v.strip()
            entry.transition = params
        
        entries.append(entry)
    
    return entries


def load_manifest(manifest_path: str) -> Dict:
    """加载音频 manifest"""
    if not os.path.exists(manifest_path):
        return {"entries": []}
    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_action_events(entries: List[StoryEntry]) -> List[ActionEvent]:
    """从脚本条目中提取需要计算完成时间的动作事件"""
    actions = []
    
    for entry in entries:
        # HurdleRun 事件
        for ev in entry.events:
            if ev["type"] == "HurdleRun":
                params = ev["params"]
                duration = params.get("duration", 5.0)
                actions.append(ActionEvent(
                    entry_index=entry.index,
                    event_type="HurdleRun",
                    start_time=entry.start_time,
                    duration=duration,
                    params=params
                ))
            elif ev["type"] == "Move":
                params = ev["params"]
                duration = params.get("duration", 2.0)
                actions.append(ActionEvent(
                    entry_index=entry.index,
                    event_type="Move",
                    start_time=entry.start_time,
                    duration=duration,
                    params=params
                ))
        
        # 动画事件（计算自然持续时间）
        for anim in entry.animations:
            anim_name = anim.get("name", "")
            duration = anim.get("duration", 1.0)
            # 某些动画有自然持续时间，不应该被拉伸
            natural_anims = ["Punch", "Kick", "SpinKick", "CrouchJump", "Hook", "Uppercut"]
            if anim_name in natural_anims:
                actions.append(ActionEvent(
                    entry_index=entry.index,
                    event_type="Animation",
                    start_time=entry.start_time,
                    duration=duration,
                    params=anim
                ))
    
    return actions


def extract_dialogue_events(entries: List[StoryEntry], manifest: Dict) -> List[DialogueEvent]:
    """提取对话事件，关联音频时长"""
    dialogues = []
    manifest_entries = {e["index"]: e for e in manifest.get("entries", [])}
    
    for entry in entries:
        if entry.character and entry.dialogue:
            audio_duration = None
            if entry.index in manifest_entries:
                audio_duration = manifest_entries[entry.index].get("audioDuration")
            
            dialogues.append(DialogueEvent(
                entry_index=entry.index,
                character=entry.character,
                dialogue=entry.dialogue,
                start_time=entry.start_time,
                end_time=entry.end_time,
                audio_duration=audio_duration
            ))
    
    return dialogues


def find_blocking_actions(
    dialogue: DialogueEvent,
    actions: List[ActionEvent],
    entries: List[StoryEntry]
) -> List[ActionEvent]:
    """
    找出一个对话条目之前所有未完成的动作事件。
    规则：如果对话发生在某个动作完成之前，则该动作会"阻塞"对话。
    """
    blocking = []
    
    for action in actions:
        # 只考虑在对话开始之前的动作
        if action.start_time < dialogue.start_time:
            # 如果动作在对话开始后仍未完成
            if action.end_time > dialogue.start_time:
                blocking.append(action)
    
    return blocking


def find_scene_blocking(
    dialogue: DialogueEvent,
    entries: List[StoryEntry],
    actions: List[ActionEvent]
) -> Optional[Dict]:
    """
    检测场景切换导致的阻塞。
    
    例如：
    - Entry 18: HurdleRun 在 StadiumScene 从 60.9s 跑到 66.8s
    - Entry 19: @LockerRoomScene 在 66.8s 切换场景
    - Entry 20: "比赛结束" 在 68.8s 开始
    
    问题：Entry 20 的"比赛结束"发生在场景切换后，但动作在场景切换前。
    如果"比赛结束"是对比赛结果的评论，它必须在 HurdleRun 完成后才能开始。
    """
    dialogue_entry = None
    for e in entries:
        if e.index == dialogue.entry_index:
            dialogue_entry = e
            break
    
    if not dialogue_entry:
        return None
    
    # 找这个对话之前的场景切换
    prev_scene_entry = None
    for e in entries:
        if e.scene and e.start_time < dialogue.start_time:
            # 找到离这个对话最近的场景切换
            if prev_scene_entry is None or e.start_time > prev_scene_entry.start_time:
                prev_scene_entry = e
    
    if not prev_scene_entry:
        return None
    
    # 找场景切换之前的动作事件
    scene_blocking_actions = []
    for action in actions:
        # 动作在场景切换之前开始
        if action.start_time < prev_scene_entry.start_time:
            # 动作在场景切换时或之后完成
            if action.end_time > prev_scene_entry.start_time:
                scene_blocking_actions.append(action)
    
    if not scene_blocking_actions:
        return None
    
    # 计算这些动作的实际完成时间
    latest_action_end = max(a.end_time for a in scene_blocking_actions)
    
    # 如果对话开始时间早于动作完成时间，则存在阻塞
    if dialogue.start_time < latest_action_end + 0.5:  # 0.5s 缓冲
        return {
            "type": "scene_transition",
            "scene_entry_index": prev_scene_entry.index,
            "scene_name": prev_scene_entry.scene,
            "blocking_actions": scene_blocking_actions,
            "latest_action_end": latest_action_end,
        }
    
    return None


def find_scene_transition_before(
    dialogue: DialogueEvent,
    entries: List[StoryEntry]
) -> Optional[StoryEntry]:
    """找出一个对话之前的场景切换事件"""
    for entry in entries:
        if entry.scene and entry.start_time < dialogue.start_time:
            # 检查这个场景切换和对话之间是否有动作事件
            pass
    return None


def calculate_required_start_time(
    dialogue: DialogueEvent,
    actions: List[ActionEvent],
    all_dialogues: List[DialogueEvent],
    entries: List[StoryEntry],
    min_gap: float = 0.5
) -> Tuple[float, List[str]]:
    """
    计算一个对话条目最早可以开始的时间。
    
    考虑因素：
    1. 之前未完成的动作必须在对话开始前完成
    2. 前一条对话的音频必须在对话开始前结束（加间隔）
    3. 场景切换导致的动作-对话依赖
    
    返回: (最早开始时间, 原因列表)
    """
    required = dialogue.start_time
    reasons = []
    
    # 1. 检查阻塞动作（同一场景内）
    blocking = find_blocking_actions(dialogue, actions, [])
    for action in blocking:
        action_end = action.end_time + min_gap
        if action_end > required:
            required = action_end
            reasons.append(f"{action.event_type}完成于{action.end_time:.2f}s")
    
    # 2. 检查场景切换阻塞
    scene_block = find_scene_blocking(dialogue, entries, actions)
    if scene_block:
        latest_end = scene_block["latest_action_end"]
        scene_entry_idx = scene_block["scene_entry_index"]
        if latest_end + min_gap > required:
            required = latest_end + min_gap
            reasons.append(
                f"场景切换前动作完成于{latest_end:.2f}s (Entry {scene_entry_idx})"
            )
    
    # 3. 检查前一条对话的音频结束时间
    prev_dialogues = [d for d in all_dialogues if d.audio_end_time < dialogue.start_time]
    if prev_dialogues:
        last_prev = max(prev_dialogues, key=lambda d: d.audio_end_time)
        audio_end = last_prev.audio_end_time + min_gap
        if audio_end > required:
            required = audio_end
            reasons.append(f"前对话音频结束于{last_prev.audio_end_time:.2f}s")
    
    return required, reasons


def schedule_entries(
    entries: List[StoryEntry],
    manifest: Dict,
    min_gap: float = 0.5,
    action_buffer: float = 0.3
) -> Tuple[List[StoryEntry], List[ScheduleAdjustment]]:
    """
    智能调度所有条目。
    
    返回：
        (调整后的条目列表, 调整记录列表)
    """
    actions = extract_action_events(entries)
    dialogues = extract_dialogue_events(entries, manifest)
    adjustments = []
    
    # 按时间排序的对话
    sorted_dialogues = sorted(dialogues, key=lambda d: d.start_time)
    
    # 计算每个对话的最早开始时间
    dialogue_shifts = {}  # entry_index -> new_start_time
    
    for i, dialogue in enumerate(sorted_dialogues):
        required_start, reasons = calculate_required_start_time(
            dialogue, actions, sorted_dialogues[:i], entries, min_gap
        )
        
        if required_start > dialogue.start_time + 0.01:
            shift = required_start - dialogue.start_time
            dialogue_shifts[dialogue.entry_index] = required_start
            
            adjustments.append(ScheduleAdjustment(
                entry_index=dialogue.entry_index,
                reason="; ".join(reasons) if reasons else "时间线压缩",
                old_start=dialogue.start_time,
                new_start=required_start,
                shift=shift,
                details=f"对话'{dialogue.dialogue[:30]}...'需要延后{shift:.2f}s"
            ))
    
    # 应用调整：移动对话条目及其后续条目
    adjusted_entries = []
    cumulative_shift = 0.0
    last_shifted_index = 0
    
    for entry in entries:
        new_entry = StoryEntry(
            index=entry.index,
            start_time=entry.start_time,
            end_time=entry.end_time,
            content=entry.content,
            character=entry.character,
            dialogue=entry.dialogue,
            scene=entry.scene,
            events=entry.events,
            animations=entry.animations,
            camera=entry.camera,
            music=entry.music,
            sfx=entry.sfx,
            positions=entry.positions,
            transition=entry.transition,
        )
        
        # 如果这个条目是对话且需要调整
        if entry.index in dialogue_shifts:
            target_start = dialogue_shifts[entry.index]
            shift = target_start - entry.start_time
            
            # 如果这个对话条目需要延后，且比之前任何调整都晚
            if shift > cumulative_shift:
                cumulative_shift = shift
                last_shifted_index = entry.index
        
        # 应用累积的偏移
        if entry.index >= last_shifted_index:
            new_entry.start_time += cumulative_shift
            new_entry.end_time += cumulative_shift
        
        adjusted_entries.append(new_entry)
    
    return adjusted_entries, adjustments


def format_time(seconds: float) -> str:
    """将秒数格式化为 SRT 时间格式"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_story_file(entries: List[StoryEntry]) -> str:
    """生成 script.story 格式的文本"""
    lines = []
    
    for entry in entries:
        lines.append(str(entry.index))
        lines.append(f"{format_time(entry.start_time)} --> {format_time(entry.end_time)}")
        lines.append(entry.content)
        lines.append("")
    
    return "\n".join(lines)


def generate_report(adjustments: List[ScheduleAdjustment], output_path: str):
    """生成调度报告"""
    report = {
        "total_adjustments": len(adjustments),
        "total_shift_time": sum(a.shift for a in adjustments),
        "adjustments": [
            {
                "entry_index": a.entry_index,
                "reason": a.reason,
                "old_start": round(a.old_start, 3),
                "new_start": round(a.new_start, 3),
                "shift": round(a.shift, 3),
                "details": a.details,
            }
            for a in adjustments
        ]
    }
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    return report


def main():
    print("=" * 60)
    print("SmartScheduler - 智能时间线调度")
    print("=" * 60)
    
    # 1. 读取脚本
    if not os.path.exists(STORY_PATH):
        print(f"错误: 找不到脚本文件 {STORY_PATH}")
        sys.exit(1)
    
    with open(STORY_PATH, "r", encoding="utf-8") as f:
        story_text = f.read()
    
    entries = parse_story(story_text)
    print(f"\n📄 已解析 {len(entries)} 个脚本条目")
    
    # 2. 加载音频 manifest
    manifest = load_manifest(MANIFEST_PATH)
    manifest_entries = manifest.get("entries", [])
    print(f"🎵 已加载 {len(manifest_entries)} 个音频条目")
    
    # 3. 提取动作事件
    actions = extract_action_events(entries)
    print(f"\n🏃 发现 {len(actions)} 个动作事件:")
    for a in actions:
        print(f"   Entry {a.entry_index}: {a.event_type} [{a.start_time:.2f}s - {a.end_time:.2f}s]")
    
    # 4. 提取对话事件
    dialogues = extract_dialogue_events(entries, manifest)
    print(f"\n💬 发现 {len(dialogues)} 个对话事件:")
    for d in dialogues:
        audio_info = f" (音频{d.audio_duration:.2f}s)" if d.audio_duration else ""
        print(f"   Entry {d.entry_index}: [{d.character}] {d.dialogue[:40]}...{audio_info}")
    
    # 5. 执行调度
    print(f"\n{'=' * 60}")
    print("开始智能调度...")
    print(f"{'=' * 60}")
    
    adjusted_entries, adjustments = schedule_entries(entries, manifest)
    
    # 6. 输出结果
    if adjustments:
        print(f"\n⚠️  发现 {len(adjustments)} 处需要调整:")
        for adj in adjustments:
            print(f"\n   Entry {adj.entry_index}:")
            print(f"   原因: {adj.reason}")
            print(f"   调整: {adj.old_start:.2f}s -> {adj.new_start:.2f}s (+{adj.shift:.2f}s)")
            print(f"   详情: {adj.details}")
        
        # 生成调整后的脚本
        new_story = generate_story_file(adjusted_entries)
        with open(OUTPUT_STORY_PATH, "w", encoding="utf-8") as f:
            f.write(new_story)
        
        # 生成报告
        report = generate_report(adjustments, REPORT_PATH)
        
        print(f"\n{'=' * 60}")
        print("✅ 调度完成!")
        print(f"{'=' * 60}")
        print(f"\n输出文件:")
        print(f"  📄 调整后脚本: {OUTPUT_STORY_PATH}")
        print(f"  📊 调度报告: {REPORT_PATH}")
        print(f"\n总调整次数: {report['total_adjustments']}")
        print(f"总延后时间: {report['total_shift_time']:.2f}s")
        print(f"\n使用方式:")
        print(f"  1. 检查 {OUTPUT_STORY_PATH} 确认调整是否符合预期")
        print(f"  2. 用调整后的脚本替换原脚本:")
        print(f"     copy {OUTPUT_STORY_PATH} {STORY_PATH}")
        print(f"  3. 重新生成音频: python tools/generate_audio.py {EPISODE}")
        print(f"  4. 重新渲染视频")
    else:
        print(f"\n✅ 时间线无需调整，所有对话和动作都已正确对齐!")
    
    return adjustments


if __name__ == "__main__":
    main()
