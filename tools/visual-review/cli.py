#!/usr/bin/env python3
"""
Visual Review CLI - 命令行入口

Usage:
    python -m visual_review.cli <episode_path> [options]
    
Examples:
    # 审核单个 episode
    python -m visual_review.cli ./episodes/she_ra
    
    # 指定维度
    python -m visual_review.cli ./episodes/she_ra --dimensions character_detail lighting
    
    # 只收集关键帧（不调用 AI）
    python -m visual_review.cli ./episodes/she_ra --collect-only
"""

import sys
import argparse
import asyncio
from pathlib import Path

# 添加父目录到路径，支持直接运行
sys.path.insert(0, str(Path(__file__).parent))

from visual_review_engine import VisualReviewEngine
from screenshot_collector import ScreenshotCollector


def create_parser() -> argparse.ArgumentParser:
    """创建参数解析器"""
    parser = argparse.ArgumentParser(
        description='Visual Review for Dula Story episodes',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Authentication:
    自动从 kimi-cli 登录凭证读取 access_token，无需手动配置 API key。
    如未登录，请先运行: kimi login

Dimensions:
    character_detail    角色外观细节
    scene_detail        场景丰富度
    cinematography      运镜质量
    lighting            光效氛围
        """
    )
    
    parser.add_argument('episode_path', help='Path to episode directory')
    
    parser.add_argument(
        '--dimensions', '-d',
        nargs='+',
        choices=['character_detail', 'scene_detail', 'cinematography', 'lighting'],
        help='Dimensions to review (default: all)'
    )
    
    parser.add_argument(
        '--provider', '-p',
        choices=['kimi'],
        help='AI vision provider (default: kimi)'
    )
    
    parser.add_argument(
        '--output', '-o',
        help='Output directory for reports (default: <episode>/visual_review)'
    )
    
    parser.add_argument(
        '--collect-only',
        action='store_true',
        help='Only collect keyframes, do not run AI review'
    )
    
    parser.add_argument(
        '--max-frames',
        type=int,
        default=10,
        help='Maximum frames per dimension (default: 10)'
    )
    
    parser.add_argument(
        '--version', '-v',
        action='version',
        version='%(prog)s 0.1.0'
    )
    
    return parser


def main():
    """主入口"""
    parser = create_parser()
    args = parser.parse_args()
    
    episode_path = Path(args.episode_path)
    
    if not episode_path.exists():
        print(f"Error: Episode path not found: {episode_path}", file=sys.stderr)
        sys.exit(1)
    
    if args.collect_only:
        # 只收集关键帧
        print(f"Collecting keyframes from: {episode_path}")
        collector = ScreenshotCollector(str(episode_path))
        
        try:
            keyframes = collector.collect_keyframes()
            print(f"\nFound {len(keyframes)} keyframes:")
            
            for kf in keyframes:
                print(f"  [{kf.frame_type}] t={kf.timestamp:.2f}s entry={kf.entry_index} {kf.frame_path}")
            
            # 导出清单
            manifest_path = episode_path / 'keyframes_manifest.json'
            collector.export_manifest(keyframes, str(manifest_path))
            print(f"\nManifest saved to: {manifest_path}")
            
        except FileNotFoundError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
    
    else:
        # 运行完整审核
        engine = VisualReviewEngine(
            str(episode_path),
            provider=args.provider
        )
        
        # 修改最大帧数
        engine.DEFAULT_DIMENSIONS = {
            k: {**v, 'max_frames': args.max_frames}
            for k, v in engine.DEFAULT_DIMENSIONS.items()
        }
        
        report = asyncio.run(engine.run_review(
            dimensions=args.dimensions,
            output_dir=args.output
        ))
        
        # 打印摘要
        print(f"\n{'='*60}")
        print(f"Visual Review Complete: {report.episode}")
        print(f"Overall Score: {report.summary['overall_score']}/10")
        print(f"Frames Reviewed: {report.summary['total_frames_reviewed']}")
        print(f"Issues Found: {report.summary['total_issues_found']}")
        print(f"{'='*60}")
        
        # 维度分数
        print("\nDimension Scores:")
        for dim, score in report.summary['dimension_scores'].items():
            bar = '█' * int(score) + '░' * (10 - int(score))
            print(f"  {dim:20s} [{bar}] {score}/10")


if __name__ == '__main__':
    main()
