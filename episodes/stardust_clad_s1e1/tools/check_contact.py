"""星屑战壳 S1E1 薄包装：skill 级通用探针 + 本集 config/contact_contract.json。

断言定义全部在 contract 里（断言库与契约文档见
dula-skills/direct-animation-craft/scripts/contact_probe.py 与
references/physics-gate.md）。保留原用法：
  python tools/check_contact.py <trace.json> [--door-only]

R2.6 增补：`clad_fit` 段（甲件贴身探针）由本包装在 skill 探针通过后本地执行
（不改共享探针）：读 trace 每帧 contact.metrics[key]，窗口内采样数 ≥frame_min
且全部值 ∈ [min,max]，悬空>上限/嵌入<0 即报警。结果写 <trace 旁>/clad_fit_validation.json。
"""
from pathlib import Path
import json
import subprocess
import sys

EP = Path(__file__).resolve().parents[1]
SCRIPT = EP.parents[2] / 'dula-skills/direct-animation-craft/scripts/contact_probe.py'
CONTRACT = EP / 'config/contact_contract.json'

if len(sys.argv) < 2:
    print(__doc__)
    raise SystemExit(2)
trace = Path(sys.argv[1])
r = subprocess.run([sys.executable, str(SCRIPT), sys.argv[1],
                    '--contract', str(CONTRACT), *sys.argv[2:]])
if r.returncode != 0:
    sys.exit(r.returncode)

# ── clad_fit：甲件贴身探针（episode 本地段）──
contract = json.loads(CONTRACT.read_text(encoding='utf-8'))
CF = contract.get('clad_fit')

# ── contacts_local：额外套路接触断言（共享探针 bite/pinch 各只一段，本集三个接触帧；
# 多出的走本地段，与 clad_fit 同模式）──
CL = contract.get('contacts_local') or []
if CL:
    import math
    data = json.loads(trace.read_text(encoding='utf-8'))
    cl_fail = []
    for e in CL:
        vals = []
        for f in data['frames']:
            if not (e['window'][0] <= f['t'] <= e['window'][1]):
                continue
            c = f.get('contact') or {}
            a, b = c.get(e['a']), c.get(e['b'])
            if a and b:
                vals.append((f['t'], math.dist(a, b)))
        if not vals:
            cl_fail.append(f"contacts_local {e['a']}-{e['b']}: 窗口内无采样")
            continue
        m = min(v for _, v in vals)
        if m > e['max']:
            cl_fail.append(f"contacts_local {e['a']}-{e['b']}: min {m:.3f} > {e['max']}")
        print(f"contacts_local {e['a']}-{e['b']}: min {m:.3f}m (max {e['max']})")
    if cl_fail:
        for f in cl_fail:
            print(' ', f)
        sys.exit(2)

if CF:
    data = json.loads(trace.read_text(encoding='utf-8'))
    failures, stats = [], {}
    for e in CF['entries']:
        vals = []
        for f in data['frames']:
            if not (e['window'][0] <= f['t'] <= e['window'][1]):
                continue
            v = ((f.get('contact') or {}).get('metrics') or {}).get(e['key'])
            if isinstance(v, (int, float)):
                vals.append((f['t'], v))
        if len(vals) < CF.get('frame_min', 20):
            failures.append(f"clad_fit {e['key']}: 窗口内采样不足（{len(vals)} < {CF.get('frame_min', 20)}）")
            continue
        lo = min(v for _, v in vals)
        hi = max(v for _, v in vals)
        stats[e['key']] = {'min': round(lo, 4), 'max': round(hi, 4), 'frames': len(vals)}
        if lo < e['min'] or hi > e['max']:
            worst_t = max(vals, key=lambda x: abs(x[1] - (e['min'] + e['max']) / 2))[0]
            failures.append(f"clad_fit {e['key']}: [{lo:.4f},{hi:.4f}] 超出 [{e['min']},{e['max']}] @t={worst_t:.2f}")
    out = trace.with_name('clad_fit_validation.json')
    out.write_text(json.dumps({'passed': not failures, 'stats': stats, 'failures': failures},
                              ensure_ascii=False, indent=1), encoding='utf-8')
    if failures:
        print(f"FAIL {len(failures)} clad_fit violations")
        for f in failures[:10]:
            print(' ', f)
        sys.exit(2)
    print(f"clad_fit: {len(CF['entries'])} entries all in range")
