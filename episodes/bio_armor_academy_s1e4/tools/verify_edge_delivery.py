"""Verify the final raster/card revision before replacing current.mp4."""
from pathlib import Path
import hashlib
import json
import subprocess
import zipfile

EP = Path(__file__).resolve().parents[1]
WORK = EP / 'tmp/edge_stability'
FINAL = WORK / 'final'
VIDEO = EP / 'output/edge_candidate.mp4'
if not VIDEO.exists():
    VIDEO = EP / 'output/current.mp4'
BASE = EP / 'output/archive/before_edge_stability.mp4'
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

build = read(FINAL / 'render_build.json')
for item in build['build']['inputs']:
    assert sha(Path(item['path'])) == item['sha256'], f'Stale build: {item["path"]}'
motion = read(FINAL / 'imported_motion_report.json')
contact = read(FINAL / 'imported_contact_report.json')
seek = read(FINAL / 'seek_check.json')
assert motion['error_count'] == contact['error_count'] == 0 and seek['passed']
assert motion['frames'] == contact['frames'] == 2460
assert build['runtimeProfile']['edgeQuality'] == 'stable'
assert build['runtimeProfile']['renderSize'] == [2560, 1440]
assert build['runtimeProfile']['outputSize'] == [1280, 720]
assert build['runtimeProfile']['imageFormat'] == 'png'
assert build['runtimeProfile']['titleCards'] == 'series-ink'
assert not build['runtimeProfile']['alphaToCoverage']

with zipfile.ZipFile(EP / 'output/archive/before_edge_stability.zip') as z:
    previous = json.loads(z.read('storyboard/episode_current/verification.json'))
    assert sha(BASE) == previous['videoSha256']
    old = json.loads(z.read('storyboard/episode_current/render_build.json'))
    old_inputs = {v['path']: v['sha256'] for v in old['build']['inputs']}
    allowed = {str((EP / p).resolve()) for p in ['viewer.js', 'render.mjs', 'tools/audit_inputs.mjs']}
    current_inputs = {v['path']: v['sha256'] for v in build['build']['inputs']}
    preserved = []
    for name, digest in old_inputs.items():
        if name in allowed:
            continue
        assert name in current_inputs and current_inputs[name] == digest, f'Unrequested change: {name}'
        preserved.append(name)

def packets(video):
    data = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'a:0',
        '-show_packets', '-show_data_hash', 'sha256', '-show_entries',
        'packet=pts,dts,duration,size,data_hash,side_data_list', '-of', 'json', str(video)])
    return json.loads(data)['packets']
old_audio, new_audio = packets(BASE), packets(VIDEO)
assert old_audio == new_audio, 'AAC packet/timestamp changes'
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
    'format=duration,size:stream=codec_name,codec_type,width,height,avg_frame_rate,start_time,duration,nb_frames',
    '-of', 'json', str(VIDEO)]))
v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
a = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
assert (v['width'], v['height'], v['nb_frames'], v['avg_frame_rate']) == (1280, 720, '2460', '30/1')
assert float(probe['format']['duration']) == 82 and float(v['start_time']) == float(a['start_time']) == 0
subprocess.run(['ffmpeg', '-v', 'error', '-i', str(VIDEO), '-f', 'null', '-'], check=True)
cards = read(WORK / 'cards/report.json')
edges = read(WORK / 'comparison.json')
assert cards['passed'] and edges['identicalMotionStates'] and edges['fixedTimeRepeat']['stable']
report = {
    'status': 'technical-checks-passed; visual refinement awaits user review',
    'video': 'output/current.mp4', 'renderedCandidate': 'output/edge_candidate.mp4',
    'videoSha256': sha(VIDEO), 'probe': probe, 'fullDecode': 'passed',
    'rollback': {'archive': 'output/archive/before_edge_stability.zip',
                 'video': 'output/archive/before_edge_stability.mp4', 'videoSha256': sha(BASE)},
    'runtimeProfile': build['runtimeProfile'], 'motion': motion['status'], 'contact': contact['status'],
    'seekPassed': True, 'seekCount': len(seek['checks']), 'renderedFrames': 2460,
    'traceSha256': sha(FINAL / 'trace.json'), 'preservedInputCount': len(preserved),
    'preservedAssetInputs': len([p for p in preserved if '\\dula-assets\\' in p]),
    'preservedRuntime': ['script.story', 'performance_remake.js', 'performance_tripo.js', 'scenes/BiologyRoomRemakeScene.js'],
    'audio': {'source': str(BASE.relative_to(EP)), 'packetPayloadsAndTimestampsIdentical': True,
              'packets': len(new_audio), 'maleSpeaker': previous['maleSpeaker'],
              'footsteps': previous['footsteps'], 'mixSha256': previous['audioSourceSha256']},
    'titleCards': {'source': 'config/cards.json', 'frameCheckCount': len(cards['checks']),
                   'missingFrameRejected': cards['missingRejected'], 'generator': 'title-card'},
    'rasterReview': edges,
    'visualEvidence': {'edgeComparison': 'storyboard/episode_current/edge_comparison.png',
                       'clip': 'storyboard/episode_current/edge_comparison.mp4',
                       'cards': 'storyboard/episode_current/title_cards.png',
                       'normalSpeedWholeEpisodeViewedByModel': False,
                       'limits': 'Raster sampling improved in matched crops. Static male regions in the short diagnostic window do not establish temporal quality. Numeric residuals are not perceived-flicker scores; no claim of eliminating every edge artifact.'},
}
(FINAL / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'passed': True, 'videoSha256': report['videoSha256'], 'audioPacketsUnchanged': len(new_audio),
                  'preservedInputs': len(preserved), 'preservedAssets': report['preservedAssetInputs'], 'seekCount': len(seek['checks'])}))
