"""
Dula Inspect Team — 闭环迭代工作流引擎

用法:
    # 运行完整检查
    python tools/inspect_team_workflow.py ./episodes/she_ra

    # 只检查指定维度
    python tools/inspect_team_workflow.py ./episodes/she_ra --dimensions D1,D2,D7,D8

    # 生成修复计划
    python tools/inspect_team_workflow.py ./episodes/she_ra --plan

工作流:
    1. 运行 dula-inspect-team 获取检查报告
    2. 解析报告，按优先级分类问题
    3. 生成修复任务列表
    4. 输出可执行的修复建议
"""

import json, os, sys, subprocess, re, argparse
from datetime import datetime

# 维度配置：检查器 → 修复策略映射
DIMENSION_CONFIG = {
    "D1": {
        "name": "Scene",
        "inspectors": ["SceneInspector"],
        "fixable": False,  # 需要人工决策
        "priority": "P0",
    },
    "D2": {
        "name": "Character/Visual",
        "inspectors": ["CharacterInspector", "VisualInspector"],
        "fixable": True,
        "priority": "P0",
    },
    "D3": {
        "name": "Animation",
        "inspectors": ["AnimationInspector"],
        "fixable": True,
        "priority": "P1",
    },
    "D4": {
        "name": "Camera",
        "inspectors": ["CameraInspector"],
        "fixable": True,
        "priority": "P0",
    },
    "D5": {
        "name": "Effect/Narrative",
        "inspectors": ["EffectInspector", "NarrativeInspector"],
        "fixable": True,
        "priority": "P1",
    },
    "D7": {
        "name": "Audio",
        "inspectors": ["AudioInspector"],
        "fixable": True,
        "priority": "P0",
    },
    "D8": {
        "name": "AudioBalance",
        "inspectors": ["AudioBalanceInspector"],
        "fixable": True,
        "priority": "P0",
    },
    "D9": {
        "name": "StoryQuality/LipSync",
        "inspectors": ["StoryQualityInspector", "LipSyncInspector"],
        "fixable": True,
        "priority": "P1",
    },
    "D10": {
        "name": "CameraSubject",
        "inspectors": ["CameraSubjectInspector"],
        "fixable": True,
        "priority": "P1",
    },
    "D11": {
        "name": "Transition",
        "inspectors": ["TransitionInspector"],
        "fixable": True,
        "priority": "P0",
    },
    "D12": {
        "name": "MusicFit",
        "inspectors": ["MusicFitInspector"],
        "fixable": True,
        "priority": "P1",
    },
}

# 修复策略库
FIX_STRATEGIES = {
    "character_not_visible": {
        "description": "角色在画面外或不可见",
        "fixes": [
            "检查 {Position:...} 坐标",
            "调整 Camera position/lookAt",
            "增加场景 fill light",
        ],
    },
    "characters_overlap": {
        "description": "角色位置重叠",
        "fixes": [
            "调整 {Position:...} x/z 坐标",
            "使用 spot 语义化站位",
        ],
    },
    "audio_too_quiet": {
        "description": "TTS 音量太小",
        "fixes": [
            "增加 voice_config.json 中 volume",
            "检查 edge-tts volume 参数",
        ],
    },
    "audio_too_loud": {
        "description": "TTS 音量太大/削波",
        "fixes": [
            "降低 voice_config.json 中 volume",
            "降低 BGM baseVolume",
        ],
    },
    "bgm_too_loud": {
        "description": "BGM 盖过对白",
        "fixes": [
            "降低 script.story 中 baseVolume",
            "增加 ducking depth",
        ],
    },
    "bgm_too_quiet": {
        "description": "BGM 几乎听不见",
        "fixes": [
            "增加 script.story 中 baseVolume",
            "检查 BGM 文件本身响度",
        ],
    },
    "camera_back_of_head": {
        "description": "相机拍到角色后脑勺",
        "fixes": [
            "调整 camera lookAt 到角色面部",
            "使用 {Camera:...} 明确指定角度",
        ],
    },
    "transition_teleport": {
        "description": "角色瞬移/无退场动画",
        "fixes": [
            "添加 {Event:Move} 退场",
            "使用 {Transition:...} 转场",
        ],
    },
    "lip_sync_mismatch": {
        "description": "嘴型与台词不匹配",
        "fixes": [
            "检查台词时长 vs 时间窗口",
            "调整 script.story 时间戳",
        ],
    },
}


def run_inspect_team(episode_dir, dimensions=None):
    """运行 dula-inspect-team 并解析输出"""
    cmd = ["npx", "dula-inspect-team", episode_dir]
    if dimensions:
        cmd.extend(["--dimensions", dimensions])
    
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    
    # 尝试解析 JSON 报告
    report = {"stdout": result.stdout, "stderr": result.stderr, "issues": []}
    
    # 解析文本输出中的问题
    lines = result.stdout.split('\n')
    current_inspector = None
    for line in lines:
        # 检测 Inspector 名称
        m = re.search(r'\[(\w+)\]', line)
        if m and 'Inspector' in m.group(1):
            current_inspector = m.group(1)
        
        # 检测问题行
        if 'FAIL' in line or 'ERROR' in line or 'WARN' in line:
            report["issues"].append({
                "inspector": current_inspector,
                "message": line.strip(),
            })
    
    return report


def classify_issues(report):
    """将问题分类为 P0/P1/P2"""
    p0 = []  # 必须修复（阻塞渲染）
    p1 = []  # 建议修复（影响体验）
    p2 = []  # 可优化（锦上添花）
    
    for issue in report.get("issues", []):
        msg = issue["message"]
        inspector = issue.get("inspector", "")
        
        # P0: 角色不可见、音频缺失、相机后脑勺、瞬移
        if any(k in msg for k in ["not visible", "missing audio", "back of head", "teleport", "overlap"]):
            p0.append(issue)
        # P0: Audio 相关
        elif "Audio" in inspector and ("missing" in msg or "not found" in msg):
            p0.append(issue)
        # P1: 音量平衡、动画、嘴型
        elif any(k in msg for k in ["volume", "loudness", "duck", "animation", "lip"]):
            p1.append(issue)
        # P2: 其他
        else:
            p2.append(issue)
    
    return {"P0": p0, "P1": p1, "P2": p2}


def generate_fix_plan(classified, episode_dir):
    """生成修复计划"""
    plan = []
    
    for priority in ["P0", "P1", "P2"]:
        issues = classified.get(priority, [])
        if not issues:
            continue
        
        plan.append(f"\n## {priority} Issues ({len(issues)})")
        
        for issue in issues:
            msg = issue["message"]
            inspector = issue.get("inspector", "Unknown")
            
            # 匹配修复策略
            matched_fixes = []
            for key, strategy in FIX_STRATEGIES.items():
                if any(k in msg.lower() for k in key.split("_")):
                    matched_fixes.extend(strategy["fixes"])
            
            plan.append(f"\n- [{inspector}] {msg}")
            if matched_fixes:
                plan.append("  Fix:")
                for fix in matched_fixes[:3]:
                    plan.append(f"    - {fix}")
    
    return '\n'.join(plan)


def main():
    parser = argparse.ArgumentParser(description="Dula Inspect Team Workflow")
    parser.add_argument("episode_dir", help="Episode directory path")
    parser.add_argument("--dimensions", help="Comma-separated dimension IDs (e.g., D1,D2,D7)")
    parser.add_argument("--plan", action="store_true", help="Generate fix plan only")
    args = parser.parse_args()
    
    # 运行检查
    report = run_inspect_team(args.episode_dir, args.dimensions)
    
    # 分类问题
    classified = classify_issues(report)
    
    total_issues = sum(len(v) for v in classified.values())
    print(f"\n{'='*60}")
    print(f"Inspect Team Report: {args.episode_dir}")
    print(f"Total Issues: {total_issues} (P0: {len(classified['P0'])}, P1: {len(classified['P1'])}, P2: {len(classified['P2'])})")
    print(f"{'='*60}")
    
    # 生成修复计划
    plan = generate_fix_plan(classified, args.episode_dir)
    print(plan)
    
    # 保存报告
    report_path = os.path.join(args.episode_dir, "inspect_report.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "episode": args.episode_dir,
            "classified": classified,
            "plan": plan,
        }, f, ensure_ascii=False, indent=2)
    print(f"\nReport saved to: {report_path}")
    
    # 返回码
    if classified["P0"]:
        print("\nP0 issues found! Fix before rendering.")
        sys.exit(1)
    else:
        print("\nNo P0 issues. Safe to render.")
        sys.exit(0)


if __name__ == '__main__':
    main()
