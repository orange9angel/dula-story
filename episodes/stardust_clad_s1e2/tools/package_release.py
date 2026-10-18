"""Apply story-authored edits to the source master, then assemble the TV release."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import numpy as np
import soundfile as sf

EP = Path(__file__).resolve().parents[1]
BOARD = EP / 'storyboard/serial_r18'
MASTER = EP / 'output/stardust_clad_s1e2_master_r18.mp4'
BODY = EP / 'output/stardust_clad_s1e2_r18.mp4'
OPENING = EP.parent / 'stardust_clad_op/output/craft3d_full_subtitled_2026_10_18.mp4'
TV = EP / 'output/stardust_clad_s1e2_tv_r18.mp4'
RELEASE_WAV = EP / 'assets3d/release_r18.wav'


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def probe(path, duration):
    data = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)
    ]))
    video = next(s for s in data['streams'] if s['codec_type'] == 'video')
    audio = next(s for s in data['streams'] if s['codec_type'] == 'audio')
    assert (video['width'], video['height'], video['r_frame_rate']) == (1280, 720, '30/1')
    assert abs(float(data['format']['duration']) - duration) < .06
    assert int(video['nb_frames']) == round(duration * 30)
    assert audio['sample_rate'] == '48000' and audio['channels'] == 2
    subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(path), '-f', 'null', '-'], check=True)
    return {'path': str(path), 'duration': float(data['format']['duration']),
            'frames': int(video['nb_frames']), 'sha256': digest(path),
            'video': video['codec_name'], 'audio': audio['codec_name'], 'decodePassed': True}


def prepare_edit():
    plan = read(EP/'config/editorial_cuts.json')
    assert plan['source_sha256'] == digest(EP/'script.story')
    voices = read(EP/'config/voice_envs.json')['lines']
    cues = read(EP/'config/event_times.json')
    cuts = plan['cuts']
    for cut in cuts:
        for line in voices:
            assert line['t0']+line['dur']+.06 <= cut['start'] or line['t0'] >= cut['end'], f"Cut intersects voice: {line['id']}"
        assert not any(cut['start'] <= t < cut['end'] for t in cues.values())
    spans, start = [], 0
    for cut in cuts:
        spans.append([start, cut['start']]); start = cut['end']
    spans.append([start, plan['sourceDuration']])
    pcm, sr = sf.read(EP/'assets3d/mixed.wav', dtype='float32', always_2d=True)
    voice_pcm, voice_sr = sf.read(EP/'assets3d/stems_r17/voice.wav', dtype='float32', always_2d=True)
    assert sr == voice_sr
    chunks = []
    for i, (a, b) in enumerate(spans):
        chunk = pcm[round(a*sr):round(b*sr)].copy()
        # Five-millisecond edge fades affect background only; voice protection above.
        n = round(.005*sr)
        a_sample, b_sample = round(a*sr), round(b*sr)
        if i: assert np.max(np.abs(voice_pcm[a_sample:a_sample+n])) < 1e-7, 'fade intersects voice onset'
        if i < len(spans)-1: assert np.max(np.abs(voice_pcm[b_sample-n:b_sample])) < 1e-7, 'fade intersects voice tail'
        if i: chunk[:n] *= np.linspace(0,1,n,dtype=np.float32)[:,None]
        if i < len(spans)-1: chunk[-n:] *= np.linspace(1,0,n,dtype=np.float32)[:,None]
        chunks.append(chunk)
    release = np.concatenate(chunks)
    assert len(release) == round(plan['duration']*sr)
    assert np.max(np.abs(release)) < .8
    sf.write(RELEASE_WAV, release, sr, subtype='PCM_16')
    def at(t):
        return round(t-sum(max(0,min(t,c['end'])-c['start']) for c in cuts), 6)
    plan['keptSourceSpans'] = spans
    plan['releaseCues'] = {k:at(t) for k,t in cues.items()}
    plan['releaseVoices'] = [{'id':v['id'],'sourceStart':v['t0'],'start':at(v['t0']),'duration':v['dur']} for v in voices]
    plan['wavSha256'] = digest(RELEASE_WAV)
    plan['peak'] = float(np.max(np.abs(release)))
    return plan


def edit_picture(plan):
    spans = plan['keptSourceSpans']
    split = '[0:v]split='+str(len(spans))+''.join(f'[s{i}]' for i in range(len(spans)))+';'
    trims = ''.join(f'[s{i}]trim=start_frame={round(a*30)}:end_frame={round(b*30)},setpts=PTS-STARTPTS[v{i}];' for i,(a,b) in enumerate(spans))
    cat = ''.join(f'[v{i}]' for i in range(len(spans)))+f'concat=n={len(spans)}:v=1:a=0[v]'
    subprocess.run(['ffmpeg','-y','-v','warning','-i',str(MASTER),'-i',str(RELEASE_WAV),
        '-filter_complex',split+trims+cat,'-map','[v]','-map','1:a:0',
        '-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-r','30',
        '-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(BODY)],check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--publish-aliases', action='store_true', help='After picture review, archive old aliases and copy the verified release.')
    args = parser.parse_args()
    for path in [BOARD/'locked_physics/contact_validation.json', BOARD/'locked_physics/seek_check.json',
                 BOARD/'pixel_seek/seek_check.json', EP/'assets3d/audio_sync_report.json']:
        assert read(path)['passed'], f'Failed validation: {path}'
    build = read(BOARD/'final_render/render_build.json')
    for name, expected in build['sourceSha256'].items():
        assert digest(EP/name) == expected, f'Changed since render: {name}'
    for source in read(BOARD/'final_render/trace.json')['build']['inputs']:
        assert digest(Path(source['path'])) == source['sha256'], f"Changed shared input: {source['path']}"
    master = probe(MASTER, 434)
    opening = probe(OPENING, 49.2)
    report_path = BOARD/'delivery_report.json'
    previous = read(report_path) if report_path.exists() else {}
    edit = prepare_edit()
    reuse_body = (BODY.exists() and previous.get('master',{}).get('sha256') == master['sha256']
        and previous.get('edit',{}).get('source_sha256') == edit['source_sha256']
        and previous.get('body',{}).get('sha256') == digest(BODY))
    if not reuse_body:
        edit_picture(edit)
    body = probe(BODY, edit['duration'])
    reuse = (TV.exists() and previous.get('body', {}).get('sha256') == body['sha256']
             and previous.get('opening', {}).get('sha256') == opening['sha256'])
    if not reuse:
        filters = (
            '[0:v]trim=duration=49.2,setpts=PTS-STARTPTS,setsar=1[v0];'
            f"[1:v]trim=duration={edit['duration']},setpts=PTS-STARTPTS,setsar=1[v1];"
            '[0:a]atrim=duration=49.2,asetpts=PTS-STARTPTS[a0];'
            f"[2:a]atrim=duration={edit['duration']},asetpts=PTS-STARTPTS[a1];"
            '[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]'
        )
        subprocess.run(['ffmpeg', '-y', '-v', 'warning', '-i', str(OPENING), '-i', str(BODY),
            '-i', str(RELEASE_WAV), '-filter_complex', filters, '-map', '[v]', '-map', '[a]',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', str(TV)], check=True)
    television = probe(TV, round(49.2+edit['duration'],3))
    report = {'version': 'r18', 'master': master, 'edit': edit, 'body': body, 'opening': opening, 'tv': television,
              'mixedWavSha256': digest(EP/'assets3d/mixed.wav'), 'bodyStartsInTv': 49.2,
              'pictureReview': previous.get('pictureReview', 'pending decoded-frame review'),
              'limits': 'Technical checks and documented model-assisted listening; not a human full-film quality approval.',
              'aliasesPublished': False}
    if args.publish_aliases:
        assert isinstance(report['pictureReview'], dict), 'Record actual decoded-picture review before publishing aliases.'
        archive = EP/'output/archive/pre_r18'
        archive.mkdir(parents=True, exist_ok=True)
        for source, alias in [(BODY, 'craft3d_full.mp4'), (TV, 'craft3d_tv_s1e2.mp4')]:
            target = EP/'output'/alias
            if target.exists() and digest(target) != digest(source):
                backup = archive/alias
                if backup.exists():
                    assert digest(backup) == digest(target), f'Different existing archive: {backup}'
                else:
                    shutil.copy2(target, backup)
            shutil.copy2(source, target)
            assert digest(source) == digest(target)
        report['aliasesPublished'] = True
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'bodySeconds': body['duration'], 'tvSeconds': television['duration'],
                      'aliasesPublished': report['aliasesPublished']}))


if __name__ == '__main__':
    main()
