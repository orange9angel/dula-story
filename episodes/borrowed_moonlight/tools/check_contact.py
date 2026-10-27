"""S1E3 薄包装：skill 级通用探针 + 本集 config/contact_contract.json。

断言定义全部在 contract 里（断言库与契约文档见
dula-skills/direct-animation-craft/scripts/contact_probe.py 与
references/physics-gate.md）。保留原用法：
  python tools/check_contact.py <trace.json> [--door-only]
等效验证：与旧硬编码版报告逐字段一致（NOTES.md P10 节）。
"""
from pathlib import Path
import subprocess
import sys

EP = Path(__file__).resolve().parents[1]
SCRIPT = EP.parents[2] / 'dula-skills/direct-animation-craft/scripts/contact_probe.py'
CONTRACT = EP / 'config/contact_contract.json'

if len(sys.argv) < 2:
    print(__doc__)
    raise SystemExit(2)
r = subprocess.run([sys.executable, str(SCRIPT), sys.argv[1],
                    '--contract', str(CONTRACT), *sys.argv[2:]])
sys.exit(r.returncode)
