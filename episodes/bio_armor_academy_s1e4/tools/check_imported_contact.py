"""Validate declared imported-mesh coverage; do not run old procedural probes."""
import hashlib
import json
import math
import sys
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
trace_path = Path(sys.argv[1]).resolve()
contract = json.loads((EP / 'config/imported_contact_contract.json').read_text())
trace = json.loads(trace_path.read_text())
frames = trace['frames']
errors, maxima = [], {}

def require(ok, message):
    if not ok:
        errors.append(message)

def observe(key, value, t, limit):
    if not isinstance(value, (int, float)) or not math.isfinite(value):
        errors.append(f'{key}: missing/nonfinite at {t}')
        return
    if key not in maxima or value > maxima[key]['value']:
        maxima[key] = {'value': value, 'time': t, 'limit': limit}

fps = trace['fps']
require(fps >= contract['minimum_fps'], 'insufficient sample rate')
require(trace['duration'] == contract['duration'], 'wrong episode duration')
require(len(frames) == round(contract['duration'] * fps), 'incomplete full timeline')
for i, frame in enumerate(frames):
    t = frame['t']
    require(abs(t - i/fps) <= .00051, f'nonuniform sample time at index {i}')
    actors = frame.get('importedSurface', {}).get('actors', {})
    for actor in contract['actors']:
        metrics = actors.get(actor, {})
        for part in contract['required_parts']:
            require(metrics.get('counts', {}).get(part, 0) > 0, f'missing {actor}.{part} samples at {t}')
            values = metrics.get('parts', {}).get(part, {})
            for metric in ['tableDepth', 'jarDepth']:
                observe(f'{actor}.{part}.{metric}', values.get(metric), t, contract['max_surface_penetration_m'])
            if part.endswith('Foot'):
                y = values.get('minY')
                observe(f'{actor}.{part}.floorDepth', max(0, -y) if y is not None else None, t, contract['max_foot_floor_penetration_m'])
        if frame['jarOwner'] == actor:
            grip = metrics.get('parts', {}).get(contract['grip_hands'][actor], {})
            observe(f'{actor}.heldJarGap', grip.get('jarSurfaceGap'), t, contract['max_held_jar_surface_gap_m'])
    if i:
        distance = math.dist(frame['jarPosition'], frames[i-1]['jarPosition'])
        observe('jarSpeed', distance*fps, t, contract['max_jar_step_speed_mps'])
for key, metric in maxima.items():
    require(metric['value'] <= metric['limit'], f'{key}: {metric["value"]:.6f} at {metric["time"]}')
inputs = trace.get('build', {}).get('inputs', [])
require(bool(inputs), 'missing build fingerprint')
for source in inputs:
    path = Path(source['path'])
    require(path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == source['sha256'], f'stale input: {path}')
seek_path = trace_path.with_name('seek_check.json')
require(seek_path.is_file() and json.loads(seek_path.read_text()).get('passed') is True, 'seek check absent or failed')
report = {
    'status': 'sampled-contact-pass' if not errors else 'fail',
    'trace': str(trace_path), 'frames': len(frames), 'fps': fps,
    'coverage': contract['coverage'], 'not_covered': contract['not_covered'],
    'maxima': maxima, 'errors': errors[:40], 'error_count': len(errors),
    'trace_sha256': hashlib.sha256(trace_path.read_bytes()).hexdigest(),
    'contract_sha256': hashlib.sha256((EP / 'config/imported_contact_contract.json').read_bytes()).hexdigest()
}
out = trace_path.with_name('imported_contact_report.json')
out.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'status': report['status'], 'frames': len(frames), 'errors': errors[:12], 'report': str(out)}, ensure_ascii=False))
raise SystemExit(bool(errors))
