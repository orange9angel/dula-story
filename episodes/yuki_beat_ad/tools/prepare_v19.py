"""V19: full re-analysis of the new song + lyric choreography (Yuki lane).

Chain (v9/v10/v11/v12/v14 methods, V19 paths; earlier-version files untouched):
  beat grid + musical sections   (prepare_v9 beat_grid/detect_sections, librosa)
  -> drum-attack grid refinement (prepare_v10 drum_grid method)
  -> Whisper DTW alignment       (align_v19, lyric text asserted (diva_lyrics_v19))
  -> vocal_data                  (prepare_v10 method on stems_v19)
  -> spectral-flux calibration   (calibrate_v19; audio_start/audio_end per char)
  -> anti-vibrato vocal features (prepare_v14 method -> vocal_features_v19.json)
  -> V11 semantic performance cues re-timed to the new alignment
Outputs: script_v19.story (Yuki lane only; Mochi lane is appended by
prepare_v19_mochi.py), config/music_analysis_v19.json,
config/performance_plan_v19.json, config/vocal_features_v19.json.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d, maximum_filter1d, gaussian_filter1d
from scipy.signal import butter, sosfiltfilt, find_peaks, stft, resample_poly
from pypinyin import lazy_pinyin, Style
import librosa
from prepare_v2 import load, onsets, stamp, SR
from prepare_v5 import kicks
from prepare_v9 import beat_grid, detect_sections
from align_v19 import main as align
from calibrate_v19 import calibrate

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / 'assets/audio/mixed_v19.wav'
STEM = ROOT / 'assets/audio/stems_v19/vocals.wav'
ANA_SR = 22050


def vocal_data():
    """prepare_v10 vocal_data on the V19 stem/alignment."""
    aligned = json.loads((ROOT / 'config/lyrics_forced_alignment_v19.json').read_text(encoding='utf-8'))
    y, sr = sf.read(STEM, always_2d=True)
    mono = y.mean(axis=1)
    hop = round(sr * .01)
    n = len(mono) // hop
    rms = np.sqrt(np.mean(mono[:n*hop].reshape(n, hop) ** 2, axis=1))
    env = uniform_filter1d(rms, 3)
    times = (np.arange(n) + .5) * hop / sr
    ref = np.quantile(env, .90)
    floor = max(ref * .085, 1e-5)
    active = maximum_filter1d((env > floor).astype(float), 5) > 0
    chars = []
    for i, item in enumerate(aligned['chars']):
        c = dict(item)
        c['raw_start'], c['raw_end'] = c['start'], c['end']
        # DTW can assign a previous held vowel + a long rest to the next word.
        # Split on a sustained quiet island; retain the preceding vowel tail.
        local_ids = np.flatnonzero((times >= c['start']) & (times < c['end']))
        quiet = env[local_ids] < max(floor, env[local_ids].max() * .14)
        padded = np.r_[False, quiet, False].astype(int)
        begins, ends = np.flatnonzero(np.diff(padded) == 1), np.flatnonzero(np.diff(padded) == -1)
        gaps = [(a, b) for a, b in zip(begins, ends) if b-a >= 15 and b < len(local_ids)-8]
        if gaps:
            a, b = gaps[-1]
            if chars and times[local_ids[a]] > c['start']:
                chars[-1]['end'] = round(float(times[local_ids[a]]), 3)
            c['start'] = round(float(times[local_ids[b]])-.01, 3)
        ids = np.flatnonzero((times >= c['start']) & (times < c['end']) & active)
        if not len(ids):
            raise ValueError(f'No audible vocal in character {i}: {c}')
        c['start'] = round(max(c['start'], times[ids[0]] - .015), 3)
        c['end'] = round(min(c['end'], times[ids[-1]] + .015), 3)
        if c['end'] - c['start'] < .035:
            raise ValueError(f'Unusable character span {i}: {c}')
        chars.append(c)
    # 逐字锚定：把每个字的起始吸附到邻近的人声起音沿，并预留 30ms 口型提前量。
    nov = np.maximum(np.diff(env, prepend=env[0]), 0)
    nov_thr = np.quantile(nov, .85) * .5
    anchored = 0
    for i, c in enumerate(chars):
        lo = np.searchsorted(times, c['start'] - .15)
        hi = np.searchsorted(times, c['start'] + .10)
        if hi <= lo:
            continue
        j = lo + int(np.argmax(nov[lo:hi]))
        if nov[j] > nov_thr:
            new_start = round(float(times[j]) - .03, 3)
            prev_mid = (chars[i-1]['start'] + chars[i-1]['end']) / 2 if i else -1
            if new_start > prev_mid and new_start < c['end'] - .035:
                if abs(new_start - c['start']) > .02:
                    anchored += 1
                c['dtw_start'] = c['start']
                c['start'] = new_start
                c['onset_anchored'] = True
    print(f'Onset anchoring: {anchored}/{len(chars)} chars re-anchored')
    text = ''.join(c['ch'] for c in chars)
    for c, initial, final, syllable in zip(chars,
            lazy_pinyin(text, style=Style.INITIALS, strict=False),
            lazy_pinyin(text, style=Style.FINALS, strict=False), lazy_pinyin(text)):
        c.update(initial=initial, final=final, pinyin=syllable)
    original = [s.strip() for s in (ROOT / 'config/diva_lyrics_v19.txt').read_text(encoding='utf-8').splitlines() if s.strip()]
    lines, index = [], 0
    for li, line in enumerate(original):
        count = len(line.replace(' ', ''))
        group = chars[index:index+count]
        lines.append({'text': line, 'start': group[0]['start'], 'end': group[-1]['end'],
                      'char0': index, 'n_chars': count, 'line': li})
        for c in group:
            c['line'] = li
        index += count
    assert index == len(chars), f'歌词覆盖断言失败: {index} != {len(chars)}'
    envelope = [{'t': round(float(t), 3), 'level': round(float(np.clip((e-floor)/(ref-floor), 0, 1)), 3)}
                for t, e in zip(times, env)]
    return chars, lines, envelope, {'floor': float(floor), 'reference_rms': float(ref),
        'method': '30ms smoothed separated-vocal RMS; trim inaudible edges, preserve DTW internal timing',
        'raw_alignment': 'config/lyrics_forced_alignment_v19.json',
        'limits': 'DTW characters and pinyin visemes, not measured phonemes; singing alignment needs listening review'}


def drum_grid(grid, old_beats_key='beats'):
    """prepare_v10 drum_grid: refine the fresh librosa grid to drum attacks."""
    y, sr = sf.read(ROOT / 'assets/audio/stems_v19/drums.wav', always_2d=True)
    low = sosfiltfilt(butter(3, 160, fs=sr, output='sos'), y.mean(axis=1))
    hop = round(sr * .005)
    n = len(low) // hop
    env = np.sqrt(np.mean(low[:n*hop].reshape(n, hop)**2, axis=1))
    peaks, _ = find_peaks(env, distance=round(.25*sr/hop), prominence=np.quantile(env, .9)*.25)
    attacks = []
    for peak in peaks:
        left = max(0, peak - round(.06*sr/hop))
        crossing = np.flatnonzero(env[left:peak+1] >= .32*env[peak])
        attacks.append((left + int(crossing[0])) * hop / sr)
    beats = []
    for b in grid['beats']:
        nearest = min(attacks, key=lambda p: abs(p-b)) if attacks else b
        beats.append(round(nearest if abs(nearest-b) < .12 else b, 3))
    assert all(a < b for a, b in zip(beats, beats[1:]))
    db = [min(beats, key=lambda b: abs(b-d)) for d in grid['downbeats']]
    return {**grid, 'beats': beats, 'downbeats': db,
            'method': 'V19 librosa grid refined to isolated-drum attack within 120ms',
            'kick_attacks': [round(a, 3) for a in attacks]}


def vocal_features():
    """prepare_v14 anti-vibrato amplitude envelope on the V19 vocal stem."""
    HOP = .01
    y, sr = sf.read(STEM, always_2d=True)
    x = resample_poly(y.mean(axis=1), 16000, sr)
    hop = 160; size = 320
    n = int(np.ceil(len(x) / hop)); padded = np.pad(x, (size // 2, size))
    rms = np.array([np.sqrt(np.mean(padded[i*hop:i*hop+size]**2)) for i in range(n)])
    rms = gaussian_filter1d(rms, .7)
    a = 1-np.exp(-HOP/.020); r = 1-np.exp(-HOP/.250)
    env = np.empty_like(rms); prev = 0.0
    for i, v in enumerate(rms):
        prev = v + (prev-v) * (r if v < prev else a); env[i] = prev
    env = gaussian_filter1d(env, .100/HOP)
    reference = float(np.quantile(env, .99)); floor = reference*.026
    amplitude = np.clip((env-floor)/(reference-floor), 0, 1)**.58
    gate = np.clip((rms-floor)/(floor*2), 0, 1)
    freq, tt, z = stft(x, 16000, nperseg=512, noverlap=352, boundary='zeros')
    power = abs(z)**2
    noise = power[(freq > 2500) & (freq < 7000)].sum(axis=0) / (power[(freq > 120) & (freq < 7000)].sum(axis=0) + 1e-12)
    features = [{'t': round(i*.01, 3), 'rms': round(float(rms[i]), 6), 'amplitude': round(float(amplitude[i]), 4),
                 'gate': round(float(gate[i]), 4), 'high_ratio': round(float(np.interp(i*.01, tt, noise)), 4)} for i in range(n)]
    report = {'method': '20ms centered RMS / 10ms hop -> asymmetric envelope (20ms attack / 250ms release) -> ~100ms low-pass, 99th-percentile reference, dynamic amplitude; high-band ratio for consonant support',
        'source': 'assets/audio/stems_v19/vocals.wav',
        'source_sha256': hashlib.sha256(STEM.read_bytes()).hexdigest(),
        'sample_step': .01, 'rms_floor': floor, 'rms_reference': reference, 'frames': features,
        'limits': 'Audio controls aperture; pinyin still approximates vowel/closure identity, not measured phonemes.'}
    (ROOT / 'config/vocal_features_v19.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'V19 vocal features: {n} frames; saturation {sum(amplitude >= .999)/n:.1%}')


def choreography(music, grid, duration):
    """V11 semantic performance cues, re-timed to the V19 alignment."""
    chars, lines = music['lyric_chars'], music['lyric_lines']
    def at(li, text):
        i = lines[li]['text'].replace(' ', '').index(text)
        return chars[lines[li]['char0']+i]['start']
    finale_start = lines[-1]['end']
    specs = [
        (0, 'tiny_steps', 0, 'playful', 'feet', 'footsteps', at(0,'尖'), 'wide', '踮起脚尖立住，低头看脚再抬头，悬念起手'),
        (at(0,'听'), 'count_in', 0, 'expectant', 'audience', 'rhythm', at(0,'门'), 'medium', '侧耳歪头听节拍，敲门处竖指点头'),
        (at(1,'张'), 'joy_expand', 1, 'delight', 'hands', 'joy', at(1,'臂'), 'medium', '双手胸前蓄力，在臂字张臂展开'),
        (at(1,'把'), 'light_world', 1, 'wonder', 'hands', 'starlight', at(1,'亮'), 'medium', '捧起星光向上点亮，惊喜睁眼'),
        (at(2,'跟'), 'beckon', 2, 'inviting', 'audience', 'none', at(2,'拍'), 'medium', '手掌向观众招两下，眉毛上挑，点头请你跟拍'),
        (at(2,'跟我'), 'come_along', 2, 'cheeky', 'audience', 'none', at(2,'来'), 'wide', '两手向自己招呼，侧身碎步，回头邀请'),
        (at(3,'左'), 'step_left', 3, 'mischief', 'left', 'footsteps', at(3,'步'), 'wide', '先看左方再移步，左手领路，右肩反向摆'),
        (at(3,'右'), 'step_right', 3, 'mischief', 'right', 'footsteps', at(3,'右')+.18, 'wide', '眼神换到右方，再右移并收脚，动作做成呼应'),
        (at(3,'节奏'), 'air_drums', 3, 'focused', 'hands', 'rhythm', at(3,'奏'), 'wide', '左右手交替敲虚拟鼓点，配合膝盖律动'),
        (at(3,'自己'), 'take_control', 3, 'confident', 'audience', 'rhythm', at(3,'握'), 'medium', '先指自己再握拳收回，挑眉表示节奏由我掌握'),
        (at(4,'跳'), 'hop', 4, 'excited', 'audience', 'landing', at(4,'跳'), 'wide', '先蹲再轻快跳起，手臂上扬，落在鼓点'),
        (at(4,'转'), 'twirl', 4, 'cheeky', 'audience', 'orbit', at(4,'转'), 'wide', '接跳跃收势转一整圈，甩开双臂亮相'),
        (at(4,'每'), 'sparkle', 4, 'delight', 'hands', 'sparkles', at(4,'闪'), 'wide', '左右斜上方交替点星，身体反向摆，眼睛随手追光'),
        (at(5,'小雪'), 'introduce', 5, 'proud', 'audience', 'none', at(5,'登'), 'medium', '指向自己，抬下巴，俏皮眨眼后亮相'),
        (at(5,'心'), 'heart', 5, 'tender', 'hands', 'heart', at(5,'跳'), 'medium', '两手护在心口，心形随胸口起伏'),
        (at(5,'打'), 'clap', 5, 'joyful', 'hands', 'clap', at(5,'拍'), 'medium', '从心口张手再合掌打拍，肩膀和膝盖同拍回弹'),
        (at(6,'世界'), 'together', 6, 'warm', 'audience', 'joy', at(6,'我'), 'wide', '张臂把世界拉近，慢速摇摆带上观众'),
        (at(6,'一起'), 'light_world', 6, 'wonder', 'hands', 'starlight', at(6,'光'), 'medium', '缓速张臂，掌心捧光向上，一起发光'),
        (at(7,'下'), 'count_in', 7, 'expectant', 'audience', 'none', at(7,'拍'), 'medium', '竖起手指提醒下一拍，歪头等观众接棒'),
        (at(7,'你'), 'your_stage', 7, 'warm', 'right', 'spotlight', at(7,'登'), 'wide', '向左侧让位，双手把右侧空舞台介绍给观众'),
        (at(7,'和'), 'cheer', 7, 'triumph', 'audience', 'landing', at(7,'嗨'), 'wide', '和我一起嗨，嗨字举手跃起，落地收势'),
        (finale_start, 'finale', 7, 'warm', 'audience', 'none', round(finale_start+.195, 3), 'medium', '手掌挥别，眨眼，停在开心的闭嘴笑'),
    ]
    assert all(a[0] < b[0] for a, b in zip(specs, specs[1:])), '编舞锚点顺序随新歌乱序'
    outfits = ['original','sailor','sailor','sunny','sunny','princess','bunny','original']
    scenes = ['diva','star','diva','neon','neon','diva','star','diva']
    cues, blocks = [], []
    for i, (start, move, li, emotion, focus, motif, hit, shot, intent) in enumerate(specs):
        end = specs[i+1][0] if i+1 < len(specs) else duration
        assert end-start > .1, f'{move} 时长 {end-start:.3f}s 过短'
        role = 'chorus' if li in (3, 4) else 'outro' if move == 'finale' else 'bridge' if li == 6 else 'verse'
        contacts = [b for b in grid['beats'] if start+.12 < b < end-.045]
        land = min(contacts, key=lambda b: abs(b-(start+.25))) if contacts else end-.06
        cue = dict(start=round(start, 3), end=round(end, 3), move=move, line=li, emotion=emotion, focus=focus,
                   motif=motif, hit=round(hit, 3), land=round(float(land), 3), shot=shot, intent=intent,
                   outfit=outfits[li], scene=scenes[li], role=role)
        cues.append(cue)
        opts = dict(pose='finale' if move == 'finale' else 'hello', duration=f'{end-start:.3f}',
                    expression='smile', emotion=emotion, focus=focus, motif=motif, hit=cue['hit'], land=cue['land'],
                    edit='hold', outfit=outfits[li], accessory='none', gesture='ta_da', move=move,
                    outgoing='none', scene=scenes[li], snap=0, card='安可' if move == 'finale' else 'none',
                    swipe='none', ghost=0, shot=shot, line=li, role=role)
        prefix = ('@BeatStudioScene\n{Position:Yuki|x=0|y=-0.03|z=0|face=forward}\n'
                  f'{{Music:Play|name=mixed_v19|endTime={duration}|baseVolume=1|fadeIn=0|fadeOut=0}}\n') if i == 0 else ''
        tags = '|'.join(f'{k}={v}' for k, v in opts.items())
        blocks.append(f'{i+1}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
                      f'{{Event:Animate|character=Yuki|action=AdPose|{tags}}}\n{{Camera:AdCamera|shot=hello}}')
    return cues, '\n\n'.join(blocks)+'\n'


def main():
    assert MASTER.exists(), '先运行 finish_v19_voice.py 生成 mixed_v19.wav'
    duration = round(sf.info(MASTER).duration, 3)
    base_duration = round(sf.info(ROOT / 'assets/audio/mixed_v19_base.wav').duration, 3)
    assert abs(duration - base_duration) < .01, '成品与基带时长不一致'

    ya = librosa.load(str(MASTER), sr=ANA_SR, mono=True)[0]
    assert abs(len(ya)/ANA_SR - duration) < 0.05, '分析流与母带时长不一致'
    bpm, beats, downbeats, beat_diag = beat_grid(ya, ANA_SR)
    musical_sections = detect_sections(ya, ANA_SR, beats, downbeats, duration)
    grid = {'bpm': round(bpm, 2), 'beats': [round(float(b), 3) for b in beats],
            'downbeats': [round(float(d), 3) for d in downbeats], 'diagnostics': beat_diag}
    grid = drum_grid(grid)
    # The measured grid dies with the last drum hit, but the quiet finale tail
    # still needs snap targets (Mochi paw taps, outro freeze anchor). Extend by
    # the median beat period and mark where measurement ends.
    period = float(np.median(np.diff(grid['beats'])))
    measured_last = grid['beats'][-1]
    while grid['beats'][-1] + period <= duration + .1:
        grid['beats'].append(round(grid['beats'][-1] + period, 3))
    while grid['downbeats'][-1] + 4 * period <= duration + .1:
        grid['downbeats'].append(round(grid['downbeats'][-1] + 4 * period, 3))
    grid['extrapolated'] = {'from': measured_last, 'period': round(period, 4),
                            'added_beats': sum(1 for b in grid['beats'] if b > measured_last)}

    align()  # writes config/lyrics_forced_alignment_v19.json (80-char text asserted)
    chars, lines, envelope, align_meta = vocal_data()

    provisional = {'lyric_chars': chars, 'lyric_lines': lines, 'vocal_envelope': envelope,
                   'duration': duration}
    chars, lines, cal_report = calibrate(provisional)
    (ROOT / 'config/lipsync_calibration_v19.json').write_text(
        json.dumps(cal_report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"calibration: anchored {cal_report['anchored_characters']}/{len(chars)}, "
          f"global offset {cal_report['global']['applied_ms']}ms ({cal_report['global']['reason']})")

    cues, story = choreography({'lyric_chars': chars, 'lyric_lines': lines}, grid, duration)
    (ROOT / 'script_v19.story').write_text(story, encoding='utf-8')

    y_master = load(MASTER)
    report = dict(source='assets/audio/music/v19/candidate_d.wav',
        master_sha256=hashlib.sha256(MASTER.read_bytes()).hexdigest(),
        duration=duration, fps=60, onsets=onsets(y_master),
        kicks=kicks(y_master), beat_grid=grid,
        musical_sections=musical_sections,
        sections=[dict(start=c['start'], end=c['end'], label=c['role'], energy=1) for c in cues],
        lyric_chars=chars, lyric_lines=lines, vocal_envelope=envelope, lyric_align=align_meta,
        choreography=cues, timeline_source='script_v19.story',
        performance_plan='config/performance_plan_v19.json',
        review_limit='Model-assisted checks, no human playback acceptance or exact phoneme-sync claim')
    (ROOT / 'config/music_analysis_v19.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    plan = dict(audio_analysis='config/music_analysis_v19.json', master_sha256=report['master_sha256'],
                duration=duration, timeline_source='script_v19.story', cues=cues,
                sections=report['sections'],
                review_limit='Authored expressiveness and semantic gestures require user playback review.')
    (ROOT / 'config/performance_plan_v19.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf-8')
    vocal_features()
    print(f'V19: {duration}s, BPM {grid["bpm"]}, {len(chars)} aligned characters, {len(cues)} performance phrases')
    for c in cues:
        print(f"{c['start']:6.3f}-{c['end']:6.3f} {c['move']:14s} {c['role']}")


if __name__ == '__main__':
    main()
