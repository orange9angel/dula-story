"""《迟到的一拍》POV 探针（episode 本地）：第一排 POV 纪律数值断言。

读 --check trace（每帧 state.pov）：相机永不越台唇平面（z>0.3）、
坐姿眼高（y∈[1.1,1.35]）、仰角在 3-14°（谱面目标 5-12°，留余量）。
用法：python tools/check_pov.py <trace.json>
"""
import json
import sys

fails = []
frames = json.load(open(sys.argv[1]))['frames']
n = 0
for fr in frames:
    pov = fr.get('pov')
    if not pov:
        continue
    n += 1
    t = fr['t']
    if not pov['z'] > 0.3:
        fails.append(f"camera crosses apron plane: z={pov['z']:.2f} @t={t:.2f}")
    if not (1.1 <= pov['y'] <= 1.35):
        fails.append(f"eye height off: y={pov['y']:.3f} @t={t:.2f}")
    if not (3 <= pov['pitchDeg'] <= 14):
        fails.append(f"pitch out of band: {pov['pitchDeg']:.1f}° @t={t:.2f}")
print(f"pov frames: {n}")
if n < 1000:
    fails.append('pov probe too sparse')
if fails:
    print('FAIL', len(fails))
    for f in fails[:10]:
        print(' ', f)
    sys.exit(2)
print('pov check: all frames within first-row discipline')
