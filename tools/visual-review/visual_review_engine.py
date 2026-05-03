"""
VisualReviewEngine - 视觉审核主引擎

整合 ScreenshotCollector 和 AIVisionClient，提供完整的视觉审核流程。
"""

import os
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

from screenshot_collector import ScreenshotCollector, StoryParser
from ai_vision_client import AIVisionClient, VisionReviewResult


@dataclass
class VisualReviewReport:
    """视觉审核报告"""
    episode: str
    generated_at: str
    summary: Dict
    results: List[Dict]
    
    def to_dict(self) -> dict:
        return {
            'episode': self.episode,
            'generated_at': self.generated_at,
            'summary': self.summary,
            'results': self.results
        }


class VisualReviewEngine:
    """视觉审核引擎"""
    
    # 默认审核维度配置
    DEFAULT_DIMENSIONS = {
        'character_detail': {
            'frame_types': ['dialogue_mid', 'scene_start'],
            'description': '角色外观细节审核'
        },
        'scene_detail': {
            'frame_types': ['scene_start', 'scene_end'],
            'description': '场景丰富度审核'
        },
        'cinematography': {
            'frame_types': ['camera_change', 'dialogue_mid'],
            'description': '运镜质量审核'
        },
        'lighting': {
            'frame_types': ['scene_start', 'scene_end'],
            'description': '光效氛围审核'
        }
    }
    
    def __init__(self, episode_path: str, provider: str = None):
        self.episode_path = Path(episode_path)
        self.episode_name = self.episode_path.name
        
        self.collector = ScreenshotCollector(episode_path)
        self.vision_client = AIVisionClient(provider=provider) if provider else None
        
    def collect_frames(self, dimensions: List[str] = None) -> Dict[str, List[Dict]]:
        """
        按维度收集关键帧
        
        Args:
            dimensions: 要审核的维度列表，None 表示全部
        
        Returns:
            维度 -> 帧列表 的映射
        """
        dimensions = dimensions or list(self.DEFAULT_DIMENSIONS.keys())
        
        # 收集所有关键帧
        all_keyframes = self.collector.collect_keyframes()
        
        # 按维度分组
        frames_by_dimension = {}
        for dim in dimensions:
            config = self.DEFAULT_DIMENSIONS.get(dim, {})
            target_types = config.get('frame_types', [])
            
            # 筛选符合该维度的帧
            filtered_frames = []
            for kf in all_keyframes:
                if kf.frame_type in target_types:
                    filtered_frames.append({
                        'path': kf.frame_path,
                        'timestamp': kf.timestamp,
                        'entry_index': kf.entry_index,
                        'type': kf.frame_type,
                        'context': kf.context
                    })
            
            # 限制每维度的帧数，控制成本
            max_frames = 10  # 每维度最多审核10帧
            if len(filtered_frames) > max_frames:
                # 均匀采样
                step = len(filtered_frames) // max_frames
                filtered_frames = filtered_frames[::step][:max_frames]
            
            frames_by_dimension[dim] = filtered_frames
        
        return frames_by_dimension
    
    async def review_dimension(self, dimension: str, frames: List[Dict]) -> List[VisionReviewResult]:
        """
        审核单个维度
        
        Args:
            dimension: 审核维度
            frames: 帧列表
        
        Returns:
            审核结果列表
        """
        if not self.vision_client:
            print(f"Warning: No vision client configured, skipping {dimension}")
            return []
        
        print(f"Reviewing {dimension}: {len(frames)} frames...")
        
        results = []
        for i, frame in enumerate(frames):
            print(f"  [{i+1}/{len(frames)}] {Path(frame['path']).name}...", end=' ')
            
            try:
                result = await self.vision_client.review_image(
                    frame['path'],
                    dimension,
                    frame.get('context', {})
                )
                results.append(result)
                print(f"Score: {result.score}/10")
                
            except Exception as e:
                print(f"Error: {e}")
                results.append(VisionReviewResult(
                    dimension=dimension,
                    score=0,
                    issues=[{"error": str(e)}],
                    suggestions=[],
                    raw_response=str(e)
                ))
        
        return results
    
    async def run_review(self, dimensions: List[str] = None, output_dir: str = None) -> VisualReviewReport:
        """
        运行完整的视觉审核
        
        Args:
            dimensions: 要审核的维度列表
            output_dir: 报告输出目录
        
        Returns:
            审核报告
        """
        dimensions = dimensions or list(self.DEFAULT_DIMENSIONS.keys())
        output_dir = Path(output_dir or self.episode_path / 'visual_review')
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n{'='*60}")
        print(f"Visual Review: {self.episode_name}")
        print(f"Dimensions: {', '.join(dimensions)}")
        print(f"{'='*60}\n")
        
        # 1. 收集关键帧
        print("Step 1: Collecting keyframes...")
        frames_by_dimension = self.collect_frames(dimensions)
        
        for dim, frames in frames_by_dimension.items():
            print(f"  {dim}: {len(frames)} frames")
        
        # 2. 逐维度审核
        print("\nStep 2: Running AI vision review...")
        all_results = []
        dimension_scores = {}
        
        for dim in dimensions:
            frames = frames_by_dimension.get(dim, [])
            if not frames:
                print(f"  {dim}: No frames found, skipping")
                continue
            
            results = await self.review_dimension(dim, frames)
            all_results.extend(results)
            
            # 计算维度平均分
            if results:
                avg_score = sum(r.score for r in results) / len(results)
                dimension_scores[dim] = round(avg_score, 2)
        
        # 3. 生成报告
        print("\nStep 3: Generating report...")
        
        summary = {
            'total_frames_reviewed': sum(len(frames_by_dimension.get(d, [])) for d in dimensions),
            'total_issues_found': sum(len(r.issues) for r in all_results),
            'dimension_scores': dimension_scores,
            'overall_score': round(sum(dimension_scores.values()) / len(dimension_scores), 2) if dimension_scores else 0
        }
        
        results_data = []
        for r in all_results:
            results_data.append({
                'dimension': r.dimension,
                'score': r.score,
                'issues': r.issues,
                'suggestions': r.suggestions
            })
        
        report = VisualReviewReport(
            episode=self.episode_name,
            generated_at=datetime.now().isoformat(),
            summary=summary,
            results=results_data
        )
        
        # 4. 保存报告
        report_path = output_dir / 'visual_review_report.json'
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report.to_dict(), f, ensure_ascii=False, indent=2)
        
        # 生成 Markdown 报告
        md_path = output_dir / 'visual_review_report.md'
        self._generate_markdown_report(report, md_path)
        
        print(f"\nReport saved to:")
        print(f"  JSON: {report_path}")
        print(f"  Markdown: {md_path}")
        
        return report
    
    def _generate_markdown_report(self, report: VisualReviewReport, output_path: Path):
        """生成 Markdown 格式的报告"""
        lines = [
            f"# Visual Review Report: {report.episode}",
            f"",
            f"Generated: {report.generated_at}",
            f"",
            f"## Summary",
            f"",
            f"- **Overall Score**: {report.summary['overall_score']}/10",
            f"- **Frames Reviewed**: {report.summary['total_frames_reviewed']}",
            f"- **Issues Found**: {report.summary['total_issues_found']}",
            f"",
            f"### Dimension Scores",
            f"",
            "| Dimension | Score |",
            "|-----------|-------|",
        ]
        
        for dim, score in report.summary['dimension_scores'].items():
            lines.append(f"| {dim} | {score}/10 |")
        
        lines.extend([
            f"",
            f"## Detailed Results",
            f"",
        ])
        
        # 按维度分组
        dim_results = {}
        for r in report.results:
            dim = r['dimension']
            if dim not in dim_results:
                dim_results[dim] = []
            dim_results[dim].append(r)
        
        for dim, results in dim_results.items():
            lines.extend([
                f"### {dim}",
                f"",
            ])
            
            for i, r in enumerate(results):
                lines.extend([
                    f"#### Frame {i+1} - Score: {r['score']}/10",
                    f"",
                ])
                
                if r['issues']:
                    lines.extend([
                        f"**Issues:**",
                        f"",
                    ])
                    for issue in r['issues']:
                        if isinstance(issue, dict):
                            severity = issue.get('severity', 'minor')
                            desc = issue.get('description', str(issue))
                            lines.append(f"- [{severity.upper()}] {desc}")
                        else:
                            lines.append(f"- {issue}")
                    lines.append(f"")
                
                if r['suggestions']:
                    lines.extend([
                        f"**Suggestions:**",
                        f"",
                    ])
                    for suggestion in r['suggestions']:
                        lines.append(f"- {suggestion}")
                    lines.append(f"")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))


def main():
    """CLI 入口"""
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Visual Review Engine')
    parser.add_argument('episode_path', help='Path to episode directory')
    parser.add_argument('--dimensions', nargs='+', 
                       choices=['character_detail', 'scene_detail', 'cinematography', 'lighting'],
                       help='Dimensions to review')
    parser.add_argument('--provider', choices=['openai', 'anthropic', 'local'],
                       help='AI vision provider')
    parser.add_argument('--output', help='Output directory for reports')
    
    args = parser.parse_args()
    
    engine = VisualReviewEngine(args.episode_path, provider=args.provider)
    
    report = asyncio.run(engine.run_review(
        dimensions=args.dimensions,
        output_dir=args.output
    ))
    
    print(f"\n{'='*60}")
    print(f"Review Complete!")
    print(f"Overall Score: {report.summary['overall_score']}/10")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
