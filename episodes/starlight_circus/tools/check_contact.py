"""Full-episode gate entry. The R0 pilot is not a configured full contact gate."""
from pathlib import Path
import subprocess
import sys
import json

EP = Path(__file__).resolve().parents[1]
SCRIPT = EP.parents[2] / 'dula-skills/direct-animation-craft/scripts/contact_probe.py'
CONTRACT = EP / 'config/contact_contract.json'

if len(sys.argv) < 2:
    print(__doc__)
    raise SystemExit(2)
if json.loads(CONTRACT.read_text(encoding='utf-8')).get('status') == 'pilot_only_full_episode_gate_not_configured':
    print('Full episode contact gate is not configured. R0 evidence covers only the 178-200s pilot.')
    raise SystemExit(2)
r = subprocess.run([sys.executable, str(SCRIPT), sys.argv[1],
                    '--contract', str(CONTRACT), *sys.argv[2:]])
sys.exit(r.returncode)
