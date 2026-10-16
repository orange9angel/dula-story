"""Audit rendered joints after retargeting, clearance, and prop constraints."""
import json
import math
import sys
from pathlib import Path

trace_path = Path(sys.argv[1]).resolve()
trace = json.loads(trace_path.read_text(encoding='utf-8'))
frames, fps = trace['frames'], trace['fps']
errors, peaks, initial_lengths, contacts = [], {}, {}, {}


def observe(key, value, t, limit):
    if not math.isfinite(value):
        errors.append(f'{key}: nonfinite at {t}')
        return
    if key not in peaks or value > peaks[key]['value']:
        peaks[key] = {'value': value, 'time': t, 'limit': limit}


def quaternion_angle(a, b):
    norm = math.sqrt(sum(v*v for v in a) * sum(v*v for v in b))
    return math.degrees(2*math.acos(min(1, abs(sum(x*y for x, y in zip(a, b)))/norm)))


if fps < 30 or len(frames) != round(trace['duration']*fps):
    errors.append('Incomplete timeline or insufficient sample rate')
previous = {}
for index, frame in enumerate(frames):
    t = frame['t']
    if abs(t-index/fps) > .00051:
        errors.append(f'Nonuniform timestamp: {index}')
    for actor in ['lei', 'aoi']:
        for side in ['left', 'right']:
            key = f'{actor}.{side}'
            j = frame.get('importedSurface', {}).get('actors', {}).get(actor, {}).get('joints', {}).get(side)
            if not j:
                errors.append(f'Missing {key} at {t}')
                continue
            initial_lengths.setdefault(key, j['lengths'])
            observe(key+'.wristBendDegrees', j['wristBend'], t, 60)
            observe(key+'.backwardKneeM', max(0, -j['kneeForward']), t, .00001)
            observe(key+'.boneLengthChangeM', max(abs(a-b) for a, b in zip(j['lengths'], initial_lengths[key])), t, .00001)
            if key in previous:
                old = previous[key]
                for part in ['elbow', 'wrist']:
                    observe(key+'.'+part+'SpeedMps', math.dist(j[part], old[part])*fps, t, 1.95)
                observe(key+'.wristDegreesPerSecond', quaternion_angle(j['wristQuaternion'], old['wristQuaternion'])*fps, t, 720)
            previous[key] = j
            if j['stance']:
                contact = (key, j['contact'])
                anchor = contacts.setdefault(contact, j)
                observe(key+'.stanceDriftM', math.hypot(j['ankle'][0]-anchor['ankle'][0], j['ankle'][2]-anchor['ankle'][2]), t, .002)
                # Current foot roll is zero; full quaternion comparison is valid.
                observe(key+'.stanceRotationDegrees', quaternion_angle(j['footQuaternion'], anchor['footQuaternion']), t, .5)
for key, metric in peaks.items():
    if metric['value'] > metric['limit']:
        errors.append(f'{key}: {metric["value"]:.6f} at {metric["time"]}')
seek = trace_path.with_name('seek_check.json')
if not seek.is_file() or not json.loads(seek.read_text())['passed']:
    errors.append('Numeric seek check missing or failed')
report = {'status': 'sampled-motion-pass' if not errors else 'fail', 'fps': fps, 'frames': len(frames),
          'coverage': 'Final rendered wrist/elbow/knee/ankle transforms, bone lengths, and support contacts at output frame rate',
          'not_covered': ['elbow skin volume', 'complete self-collision', 'unsampled time', 'artistic acting quality'],
          'maxima': peaks, 'errors': errors[:40], 'error_count': len(errors)}
out = trace_path.with_name('imported_motion_report.json')
out.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'status': report['status'], 'frames': len(frames), 'errors': errors[:15], 'report': str(out)}))
raise SystemExit(bool(errors))
