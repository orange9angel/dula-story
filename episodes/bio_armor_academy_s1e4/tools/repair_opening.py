"""Replace the opening card at its existing keyframe cut; copy picture and audio after it."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import zipfile

import numpy as np
from PIL import Image

EP = Path(__file__).resolve().parents[1]
WORK = EP / 'tmp/opening_visible'
PUBLIC = EP / 'storyboard/episode_current'
ARCHIVE = EP / 'output/archive/before_visible_opening.zip'
CURRENT = EP / 'output/current.mp4'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def run(*args):
    return subprocess.run(list(map(str, args)), check=True, capture_output=True).stdout


def video_info(p):
    return json.loads(run('ffprobe', '-v', 'error', '-select_streams', 'v:0',
                          '-show_entries', 'stream=width,height,nb_frames,duration,r_frame_rate,start_time',
                          '-of', 'json', p))['streams'][0]


def audio_hash(p):
    return run('ffmpeg', '-v', 'error', '-i', p, '-map', '0:a:0', '-c', 'copy',
               '-f', 'hash', '-hash', 'sha256', '-').decode().strip()


def decoded_hashes(p):
    rows = run('ffmpeg', '-v', 'error', '-i', p, '-map', '0:v:0', '-an',
               '-f', 'framemd5', '-').decode().splitlines()
    return [line.rsplit(',', 1)[1].strip() for line in rows if line and not line.startswith('#')]


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    baseline = json.loads((WORK / 'baseline.json').read_text())
    with zipfile.ZipFile(ARCHIVE) as z:
        source = WORK / 'original.mp4'
        source.write_bytes(z.read('output/current.mp4'))
    assert sha(source) == baseline['output/current.mp4']
    current_before = sha(CURRENT)
    prior_report = PUBLIC / 'opening_fix.json'
    allowed = {baseline['output/current.mp4']}
    if prior_report.exists():
        allowed.add(json.loads(prior_report.read_text(encoding='utf-8'))['outputSha256'])
    assert current_before in allowed, 'A newer current video exists; do not replace it with this baseline'
    manifest = json.loads((EP / 'config/cards.json').read_text(encoding='utf-8'))
    opening = next(c for c in manifest['cards'] if c['id'] == 'open')
    assert opening['start'] == 0 and opening['inMode'] == 'image'
    end, fps = opening['end'], opening['fps']
    count = round(end * fps)
    old_info = video_info(source)
    assert old_info['r_frame_rate'] == f'{fps}/1'
    keyframes = json.loads(run('ffprobe', '-v', 'error', '-skip_frame', 'nokey',
                              '-select_streams', 'v:0', '-show_entries',
                              'frame=best_effort_timestamp_time', '-of', 'json', source))['frames']
    assert any(abs(float(f['best_effort_timestamp_time']) - end) < 1e-6 for f in keyframes)
    changed_cards = [n for n, digest in baseline.items() if n.startswith('cards/') and sha(EP / n) != digest]
    assert changed_cards == [f'cards/open/f_{i:03d}.png' for i in range(5)], changed_cards
    prefix, tail = WORK / 'opening.mp4', WORK / 'remainder.mp4'
    run('ffmpeg', '-y', '-v', 'error', '-framerate', fps, '-i', EP / 'cards/open/f_%03d.png',
        '-frames:v', count, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', 18,
        '-pix_fmt', 'yuv420p', '-video_track_timescale', 15360, prefix)
    run('ffmpeg', '-y', '-v', 'error', '-ss', end, '-i', source, '-map', '0:v:0',
        '-an', '-c:v', 'copy', tail)
    listing = WORK / 'concat.txt'
    listing.write_text(f"file 'opening.mp4'\nduration {end}\nfile 'remainder.mp4'\n", encoding='utf-8')
    candidate = WORK / 'candidate.mp4'
    run('ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', 0, '-i', listing,
        '-i', source, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', candidate)
    new_info = video_info(candidate)
    assert old_info == new_info, (old_info, new_info)
    before, after = decoded_hashes(source), decoded_hashes(candidate)
    assert len(before) == len(after) == int(new_info['nb_frames'])
    assert before[count:] == after[count:], 'Picture after the opening changed'
    old_audio, new_audio = audio_hash(source), audio_hash(candidate)
    assert old_audio == new_audio, 'Encoded audio changed'
    decoded = WORK / 'first_frame.png'
    run('ffmpeg', '-y', '-v', 'error', '-i', candidate, '-frames:v', 1, decoded)
    arr = np.asarray(Image.open(decoded).convert('RGB'))
    white = float(np.all(arr >= 250, axis=2).mean())
    assert white < .95 and float(arr.std()) > 5, 'Opening still blank'
    assert sha(CURRENT) == current_before, 'Current video changed during validation'
    report = {
        'passed': True, 'scope': 'Opening card only; character trials not integrated',
        'sourceSha256': sha(source), 'outputSha256': sha(candidate), 'rollback': str(ARCHIVE.relative_to(EP)),
        'cardsSha256': sha(EP / 'config/cards.json'), 'changedCardFrames': changed_cards,
        'reencodedWindow': [0, end], 'copiedDecodedFrames': len(after) - count,
        'pictureAfterOpeningIdentical': True, 'audioPacketsIdentical': True, 'audioSha256': new_audio,
        'video': new_info, 'firstFrameWhiteFraction': white,
        'generatorSha256': manifest['generatorSha256'],
    }
    shutil.copy2(candidate, CURRENT)
    shutil.copy2(decoded, PUBLIC / 'opening_first_frame.png')
    (PUBLIC / 'opening_fix.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
