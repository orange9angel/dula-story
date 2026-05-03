"""
ScreenshotCollector - 从 storyboard/frames 提取关键帧用于视觉审核

提取策略：
- 场景切换：首帧 + 尾帧
- 角色特写：每句台词中间帧
- 动作序列：关键姿势帧
- 运镜变化：运镜开始和结束帧
"""

import os
import json
import re
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional, Tuple
from datetime import datetime


@dataclass
class StoryEntry:
    """剧本条目解析结果"""
    index: int
    start_time: float  # seconds
    end_time: float
    duration: float
    scene: Optional[str] = None
    character: Optional[str] = None
    dialogue: Optional[str] = None
    actions: List[str] = None
    camera: Optional[str] = None
    is_transition: bool = False
    is_position: bool = False
    is_event: bool = False


@dataclass
class KeyFrame:
    """关键帧信息"""
    frame_path: str
    timestamp: float
    entry_index: int
    frame_type: str  # 'scene_start', 'scene_end', 'dialogue_mid', 'action_peak', 'camera_change'
    context: dict


class StoryParser:
    """解析 .story 文件"""
    
    TIME_RE = re.compile(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})')
    SCENE_RE = re.compile(r'@(\w+)')
    CHAR_RE = re.compile(r'\[(\w+)\]')
    ACTION_RE = re.compile(r'\{(\w+)\}')
    CAMERA_RE = re.compile(r'\{Camera:(\w+)\|?([^}]*)\}')
    
    @classmethod
    def parse_time(cls, time_str: str) -> float:
        """将 SRT 时间格式转换为秒"""
        match = cls.TIME_RE.match(time_str.strip())
        if match:
            h, m, s, ms = map(int, match.groups())
            return h * 3600 + m * 60 + s + ms / 1000.0
        return 0.0
    
    @classmethod
    def parse_story(cls, story_path: str) -> List[StoryEntry]:
        """解析剧本文件"""
        with open(story_path, 'r', encoding='utf-8') as f:
            lines = [line.rstrip() for line in f.readlines()]
        
        entries = []
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue
            
            # 尝试解析条目编号
            try:
                index = int(line)
            except ValueError:
                i += 1
                continue
            
            # 读取时间轴
            if i + 1 >= len(lines):
                break
            time_line = lines[i + 1]
            if '-->' not in time_line:
                i += 1
                continue
            
            start_str, end_str = time_line.split('-->')
            start_time = cls.parse_time(start_str)
            end_time = cls.parse_time(end_str)
            
            # 读取内容（可能跨多行）
            content_lines = []
            j = i + 2
            while j < len(lines) and lines[j].strip():
                content_lines.append(lines[j])
                j += 1
            
            content = ' '.join(content_lines)
            
            # 解析各元素
            scene = None
            scene_match = cls.SCENE_RE.search(content)
            if scene_match:
                scene = scene_match.group(1)
            
            character = None
            char_match = cls.CHAR_RE.search(content)
            if char_match:
                character = char_match.group(1)
            
            actions = cls.ACTION_RE.findall(content)
            
            camera = None
            cam_match = cls.CAMERA_RE.search(content)
            if cam_match:
                camera = f"{cam_match.group(1)}|{cam_match.group(2)}"
            
            # 判断条目类型
            is_transition = 'Transition:' in content
            is_position = 'Position:' in content
            is_event = 'Event:' in content
            
            # 提取对白
            dialogue = None
            if character:
                # 去掉所有标签，保留纯文本
                text = content
                text = cls.SCENE_RE.sub('', text)
                text = cls.CHAR_RE.sub('', text)
                text = cls.ACTION_RE.sub('', text)
                text = cls.CAMERA_RE.sub('', text)
                text = re.sub(r'\{[^}]+\}', '', text)
                text = text.strip()
                if text:
                    dialogue = text
            
            entries.append(StoryEntry(
                index=index,
                start_time=start_time,
                end_time=end_time,
                duration=end_time - start_time,
                scene=scene,
                character=character,
                dialogue=dialogue,
                actions=actions,
                camera=camera,
                is_transition=is_transition,
                is_position=is_position,
                is_event=is_event
            ))
            
            i = j
        
        return entries


class ScreenshotCollector:
    """从 storyboard/frames 提取关键帧"""
    
    def __init__(self, episode_path: str):
        self.episode_path = Path(episode_path)
        self.frames_dir = self.episode_path / 'storyboard'
        self.story_path = self.episode_path / 'script.story'
        
    def _find_frame_at_time(self, timestamp: float) -> Optional[str]:
        """在指定时间戳附近找到最接近的帧文件"""
        if not self.frames_dir.exists():
            return None
        
        # 支持多种帧文件命名格式:
        # - frame_0001.png, frame_0002.png (帧号)
        # - frame_001250.png (时间戳毫秒)
        # - check_shot_01.jpg, check_shot_02.jpg (shot编号)
        # - frame_001250.jpg (渲染帧)
        frames = list(self.frames_dir.glob('*.png')) + list(self.frames_dir.glob('*.jpg'))
        
        if not frames:
            return None
        
        # 尝试从文件名解析时间戳
        best_frame = None
        best_diff = float('inf')
        
        for frame in frames:
            stem = frame.stem.lower()
            frame_time = None
            
            # 格式1: frame_001250 -> 1.25s (毫秒时间戳)
            match = re.search(r'frame_(\d{6,})', stem)
            if match:
                num_str = match.group(1)
                frame_time = int(num_str) / 1000.0
            
            # 格式2: frame_0001 -> 帧号 (30fps)
            if frame_time is None:
                match = re.search(r'frame_(\d{1,5})', stem)
                if match:
                    frame_time = int(match.group(1)) / 30.0
            
            # 格式3: check_shot_01 -> shot编号，假设每个shot约2秒
            if frame_time is None:
                match = re.search(r'check_shot_(\d+)', stem)
                if match:
                    frame_time = (int(match.group(1)) - 1) * 2.0
            
            # 格式4: 任意数字序列
            if frame_time is None:
                match = re.search(r'(\d+)', stem)
                if match:
                    num = int(match.group(1))
                    if num > 1000:
                        # 可能是毫秒
                        frame_time = num / 1000.0
                    else:
                        # 可能是帧号
                        frame_time = num / 30.0
            
            if frame_time is not None:
                diff = abs(frame_time - timestamp)
                if diff < best_diff:
                    best_diff = diff
                    best_frame = str(frame)
        
        return best_frame
    
    def _get_frame_by_pattern(self, pattern: str) -> Optional[str]:
        """通过模式匹配查找帧"""
        if not self.frames_dir.exists():
            return None
        
        frames = sorted(self.frames_dir.glob(pattern))
        return str(frames[0]) if frames else None
    
    def collect_keyframes(self, fps: int = 30) -> List[KeyFrame]:
        """
        提取关键帧列表
        
        Args:
            fps: 视频帧率，用于帧号到时间的转换
        
        Returns:
            关键帧列表
        """
        if not self.story_path.exists():
            raise FileNotFoundError(f"Story file not found: {self.story_path}")
        
        entries = StoryParser.parse_story(str(self.story_path))
        keyframes = []
        
        current_scene = None
        scene_start_entry = None
        
        for i, entry in enumerate(entries):
            # 1. 场景切换 - 记录场景开始和结束
            if entry.scene:
                # 上一个场景的结束帧
                if current_scene and scene_start_entry:
                    end_frame = self._find_frame_at_time(entry.start_time - 0.1)
                    if end_frame:
                        keyframes.append(KeyFrame(
                            frame_path=end_frame,
                            timestamp=entry.start_time - 0.1,
                            entry_index=scene_start_entry.index,
                            frame_type='scene_end',
                            context={'scene': current_scene, 'reason': 'scene_transition'}
                        ))
                
                # 新场景的开始帧
                start_frame = self._find_frame_at_time(entry.start_time)
                if start_frame:
                    keyframes.append(KeyFrame(
                        frame_path=start_frame,
                        timestamp=entry.start_time,
                        entry_index=entry.index,
                        frame_type='scene_start',
                        context={'scene': entry.scene, 'reason': 'scene_entrance'}
                    ))
                
                current_scene = entry.scene
                scene_start_entry = entry
            
            # 2. 角色对白 - 取中间帧
            if entry.character and entry.dialogue:
                mid_time = (entry.start_time + entry.end_time) / 2
                mid_frame = self._find_frame_at_time(mid_time)
                if mid_frame:
                    keyframes.append(KeyFrame(
                        frame_path=mid_frame,
                        timestamp=mid_time,
                        entry_index=entry.index,
                        frame_type='dialogue_mid',
                        context={
                            'character': entry.character,
                            'dialogue': entry.dialogue[:50],  # 截断避免过长
                            'actions': entry.actions
                        }
                    ))
            
            # 3. 运镜变化 - 开始和结束帧
            if entry.camera:
                # 运镜开始帧
                cam_start = self._find_frame_at_time(entry.start_time + 0.5)
                if cam_start:
                    keyframes.append(KeyFrame(
                        frame_path=cam_start,
                        timestamp=entry.start_time + 0.5,
                        entry_index=entry.index,
                        frame_type='camera_change',
                        context={'camera': entry.camera, 'phase': 'start'}
                    ))
                
                # 运镜结束帧
                cam_end = self._find_frame_at_time(entry.end_time - 0.5)
                if cam_end:
                    keyframes.append(KeyFrame(
                        frame_path=cam_end,
                        timestamp=entry.end_time - 0.5,
                        entry_index=entry.index,
                        frame_type='camera_change',
                        context={'camera': entry.camera, 'phase': 'end'}
                    ))
            
            # 4. 动作序列 - 取峰值帧（假设在动作中间）
            if entry.actions and not entry.character:  # 纯动作条目
                for action in entry.actions:
                    peak_time = (entry.start_time + entry.end_time) / 2
                    peak_frame = self._find_frame_at_time(peak_time)
                    if peak_frame:
                        keyframes.append(KeyFrame(
                            frame_path=peak_frame,
                            timestamp=peak_time,
                            entry_index=entry.index,
                            frame_type='action_peak',
                            context={'action': action}
                        ))
        
        # 去重并按时间排序
        seen = set()
        unique_frames = []
        for kf in sorted(keyframes, key=lambda x: x.timestamp):
            if kf.frame_path not in seen:
                seen.add(kf.frame_path)
                unique_frames.append(kf)
        
        return unique_frames
    
    def export_manifest(self, keyframes: List[KeyFrame], output_path: str):
        """导出关键帧清单为 JSON"""
        manifest = {
            'episode': str(self.episode_path.name),
            'generated_at': datetime.now().isoformat(),
            'total_frames': len(keyframes),
            'frames': [
                {
                    'path': kf.frame_path,
                    'timestamp': round(kf.timestamp, 3),
                    'entry_index': kf.entry_index,
                    'type': kf.frame_type,
                    'context': kf.context
                }
                for kf in keyframes
            ]
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        
        return manifest


def main():
    """CLI 入口"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python screenshot_collector.py <episode_path> [output_manifest.json]")
        sys.exit(1)
    
    episode_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'keyframes_manifest.json'
    
    collector = ScreenshotCollector(episode_path)
    
    print(f"Collecting keyframes from: {episode_path}")
    keyframes = collector.collect_keyframes()
    print(f"Found {len(keyframes)} keyframes")
    
    manifest = collector.export_manifest(keyframes, output_path)
    print(f"Manifest saved to: {output_path}")
    
    # 打印摘要
    type_counts = {}
    for kf in keyframes:
        type_counts[kf.frame_type] = type_counts.get(kf.frame_type, 0) + 1
    
    print("\nFrame type distribution:")
    for ft, count in sorted(type_counts.items()):
        print(f"  {ft}: {count}")


if __name__ == '__main__':
    main()
