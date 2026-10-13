"""Use the canonical skill gate with this episode's declared coverage."""
from pathlib import Path
import subprocess, sys
EP=Path(__file__).resolve().parents[1]
checker=EP.parents[2]/'dula-skills/direct-animation-craft/scripts/contact_probe.py'
code=subprocess.call([sys.executable,str(checker),*sys.argv[1:],'--contract',str(EP/'config/contact_contract.json')])
if code:raise SystemExit(code)
from check_story_motion import check
check(sys.argv[1],EP)
