"""
Audio Balance Checker — 检查 BGM vs TTS 音量平衡

用法:
    python tools/audio_balance_check.py ./episodes/she_ra

检查项:
    1. BGM 响度一致性（各场景 BGM RMS 差异 < 3dB）
    2. TTS 响度一致性（同角色音量差异 < 3dB）
    3. BGM vs TTS 比例（TTS 应比 BGM 高 6-12dB）
    4. 混合后峰值（不应超过 -1dB）
    5. 静音检测（不应有 >0.5s 的绝对静音）

输出:
    - 通过/失败状态
    - 具体测量值
    - 修复建议
"""

import wave, os, json, sys, subprocess
import numpy as np

# 目标标准
TARGETS = {
    'bgm_lufs': -16,           # BGM 目标响度
    'bgm_tolerance': 3,        # BGM 间最大差异 (dB)
    'tts_lufs': -10,           # TTS 目标响度
    'tts_tolerance': 3,        # TTS 间最大差异 (dB)
    'tts_bgm_gap': (6, 12),    # TTS 应比 BGM 高多少 dB
    'peak_max': -1,            # 混合后峰值上限 (dB)
    'silence_threshold': 100,  # 静音阈值 (16-bit)
    'silence_max_duration': 0.5,  # 最大允许静音 (秒)
}

def analyze_wav(path):
    """分析 WAV 文件的响度指标"""
    with wave.open(path, 'rb') as w:
        frames = w.readframes(w.getnframes())
        data = np.frombuffer(frames, dtype=np.int16)
        rms = np.sqrt(np.mean(data.astype(np.float64)**2))
        peak = np.max(np.abs(data))
        lufs = 20 * np.log10(max(rms, 1) / 32768)
        peak_db = 20 * np.log10(max(peak, 1) / 32768)
        
        # 检测静音段
        silence_mask = np.abs(data) < TARGETS['silence_threshold']
        silent_regions = []
        in_silence = False
        start = 0
        for i, is_silent in enumerate(silence_mask):
            if is_silent and not in_silence:
                start = i
                in_silence = True
            elif not is_silent and in_silence:
                duration = (i - start) / w.getframerate()
                if duration > 0.1:
                    silent_regions.append((start / w.getframerate(), duration))
                in_silence = False
        
        return {
            'rms': rms,
            'rms_percent': rms / 32768 * 100,
            'lufs': lufs,
            'peak': peak,
            'peak_db': peak_db,
            'silent_regions': silent_regions,
            'duration': w.getnframes() / w.getframerate(),
        }

def analyze_mp3(path):
    """通过 ffmpeg 将 MP3 转为临时 WAV 后分析"""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        tmp_path = tmp.name
    subprocess.run(['ffmpeg', '-y', '-i', path, '-ar', '48000', '-ac', '1', tmp_path],
                   capture_output=True)
    result = analyze_wav(tmp_path)
    os.unlink(tmp_path)
    return result

def check_episode(episode_dir):
    audio_dir = os.path.join(episode_dir, 'assets', 'audio')
    if not os.path.exists(audio_dir):
        print(f"ERROR: Audio directory not found: {audio_dir}")
        return False
    
    issues = []
    checks_passed = 0
    checks_total = 0
    
    print("=" * 60)
    print(f"Audio Balance Check: {episode_dir}")
    print("=" * 60)
    
    # 1. 检查 BGM 一致性
    print("\n[1] BGM Loudness Consistency")
    music_dir = os.path.join(audio_dir, 'music')
    bgm_results = {}
    if os.path.exists(music_dir):
        for f in sorted(os.listdir(music_dir)):
            if f.endswith('.wav'):
                path = os.path.join(music_dir, f)
                result = analyze_wav(path)
                bgm_results[f] = result
                print(f"  {f}: LUFS={result['lufs']:.1f}dB, RMS={result['rms_percent']:.1f}%")
        
        if len(bgm_results) > 1:
            lufs_values = [r['lufs'] for r in bgm_results.values()]
            max_diff = max(lufs_values) - min(lufs_values)
            checks_total += 1
            if max_diff <= TARGETS['bgm_tolerance']:
                print(f"  PASS: BGM diff = {max_diff:.1f}dB (<= {TARGETS['bgm_tolerance']}dB)")
                checks_passed += 1
            else:
                print(f"  FAIL: BGM diff = {max_diff:.1f}dB (> {TARGETS['bgm_tolerance']}dB)")
                issues.append(f"BGM loudness inconsistent: {max_diff:.1f}dB diff. "
                             f"Adjust baseVolume in script.story or normalize BGM files.")
    
    # 2. 检查 TTS 一致性
    print("\n[2] TTS Loudness Consistency")
    manifest_path = os.path.join(audio_dir, 'manifest.json')
    tts_results = {}
    if os.path.exists(manifest_path):
        manifest = json.load(open(manifest_path))
        entries = manifest.get('entries', [])
        for item in entries:
            fname = item.get('file', '')
            char = item.get('character', '?')
            if fname and os.path.exists(os.path.join(audio_dir, fname)):
                path = os.path.join(audio_dir, fname)
                if fname.endswith('.mp3'):
                    result = analyze_mp3(path)
                else:
                    result = analyze_wav(path)
                tts_results[fname] = {**result, 'character': char}
                print(f"  {fname} ({char}): LUFS={result['lufs']:.1f}dB")
        
        # 按角色分组检查
        chars = {}
        for fname, data in tts_results.items():
            char = data['character']
            chars.setdefault(char, []).append(data['lufs'])
        
        for char, lufs_list in chars.items():
            if len(lufs_list) > 1:
                max_diff = max(lufs_list) - min(lufs_list)
                checks_total += 1
                if max_diff <= TARGETS['tts_tolerance']:
                    print(f"  PASS ({char}): diff = {max_diff:.1f}dB")
                    checks_passed += 1
                else:
                    print(f"  FAIL ({char}): diff = {max_diff:.1f}dB")
                    issues.append(f"TTS loudness inconsistent for {char}: {max_diff:.1f}dB diff. "
                                 f"Check voice_config.json volume settings.")
    
    # 3. 检查混合后音频
    print("\n[3] Mixed Audio Check")
    mixed_path = os.path.join(audio_dir, 'mixed.wav')
    if os.path.exists(mixed_path):
        result = analyze_wav(mixed_path)
        print(f"  Mixed: LUFS={result['lufs']:.1f}dB, Peak={result['peak_db']:.1f}dB")
        
        # 峰值检查
        checks_total += 1
        if result['peak_db'] <= TARGETS['peak_max']:
            print(f"  PASS: Peak = {result['peak_db']:.1f}dB (<= {TARGETS['peak_max']}dB)")
            checks_passed += 1
        else:
            print(f"  FAIL: Peak = {result['peak_db']:.1f}dB (> {TARGETS['peak_max']}dB)")
            issues.append(f"Mixed audio peak too high: {result['peak_db']:.1f}dB. "
                         f"Reduce TTS volume or BGM baseVolume.")
        
        # 静音检查（排除开头的正常场景设置静音）
        long_silences = [s for s in result['silent_regions'] 
                        if s[1] > TARGETS['silence_max_duration'] and s[0] > 1.0]
        checks_total += 1
        if not long_silences:
            print(f"  PASS: No silence > {TARGETS['silence_max_duration']}s (after 1s head)")
            checks_passed += 1
        else:
            print(f"  FAIL: Found {len(long_silences)} silence regions > {TARGETS['silence_max_duration']}s")
            for start, dur in long_silences[:3]:
                print(f"    at {start:.1f}s, duration={dur:.1f}s")
            issues.append(f"Long silence detected in mixed audio. Check audio gaps.")
    else:
        print("  SKIPPED: mixed.wav not found")
    
    # 4. BGM vs TTS 比例（测量混合后的实际轨道，应用 audio_mix.json 增益）
    print("\n[4] BGM vs TTS Level Ratio (mixed tracks)")
    dialogue_path = os.path.join(audio_dir, '_temp_dialogue.wav')
    bgm_track_path = os.path.join(audio_dir, '_temp_bgm.wav')
    
    # Load audio mix config to apply volume adjustments
    mix_cfg = {}
    episode_dir = os.path.dirname(audio_dir)  # assets
    episode_dir = os.path.dirname(episode_dir)  # episode root
    audio_mix_path = os.path.join(episode_dir, 'config', 'audio_mix.json')
    if os.path.exists(audio_mix_path):
        with open(audio_mix_path, 'r', encoding='utf-8') as f:
            mix_cfg = json.load(f)
    dialogue_vol = mix_cfg.get('dialogueVolume', 2.5)
    bgm_vol = mix_cfg.get('bgmVolume', 1.0)
    
    if os.path.exists(dialogue_path) and os.path.exists(bgm_track_path):
        dialogue_result = analyze_wav(dialogue_path)
        bgm_track_result = analyze_wav(bgm_track_path)
        # Apply volume adjustments in dB
        dialogue_lufs = dialogue_result['lufs'] + 20 * np.log10(max(dialogue_vol, 0.001))
        bgm_lufs = bgm_track_result['lufs'] + 20 * np.log10(max(bgm_vol, 0.001))
        gap = dialogue_lufs - bgm_lufs
        checks_total += 1
        if TARGETS['tts_bgm_gap'][0] <= gap <= TARGETS['tts_bgm_gap'][1]:
            print(f"  PASS: Dialogue track {gap:.1f}dB louder than BGM track (target: {TARGETS['tts_bgm_gap'][0]}-{TARGETS['tts_bgm_gap'][1]}dB)")
            checks_passed += 1
        else:
            print(f"  FAIL: Dialogue track {gap:.1f}dB louder than BGM track (target: {TARGETS['tts_bgm_gap'][0]}-{TARGETS['tts_bgm_gap'][1]}dB)")
            if gap < TARGETS['tts_bgm_gap'][0]:
                issues.append(f"Dialogue too quiet vs BGM (gap={gap:.1f}dB). "
                             f"Increase dialogueVolume in audio_mix.json or decrease BGM baseVolume.")
            else:
                issues.append(f"Dialogue too loud vs BGM (gap={gap:.1f}dB). "
                             f"Decrease dialogueVolume or increase BGM baseVolume.")
    elif bgm_results and tts_results:
        # Fallback: estimate from raw files
        avg_bgm = np.mean([r['lufs'] for r in bgm_results.values()])
        avg_tts = np.mean([r['lufs'] for r in tts_results.values()])
        gap = avg_tts - avg_bgm
        checks_total += 1
        if TARGETS['tts_bgm_gap'][0] <= gap <= TARGETS['tts_bgm_gap'][1]:
            print(f"  PASS (estimate): TTS {gap:.1f}dB louder than BGM")
            checks_passed += 1
        else:
            print(f"  FAIL (estimate): TTS {gap:.1f}dB louder than BGM")
            issues.append(f"TTS/BGM ratio may be off (estimated gap={gap:.1f}dB).")
    
    # 总结
    print("\n" + "=" * 60)
    print(f"Result: {checks_passed}/{checks_total} checks passed")
    if issues:
        print(f"\nIssues found ({len(issues)}):")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
    else:
        print("\nAll checks passed!")
    print("=" * 60)
    
    return len(issues) == 0

if __name__ == '__main__':
    episode_dir = sys.argv[1] if len(sys.argv) > 1 else './episodes/she_ra'
    success = check_episode(episode_dir)
    sys.exit(0 if success else 1)
