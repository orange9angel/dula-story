"""Compatibility entry for the shared skill packager."""
from pathlib import Path
import subprocess
import sys
root=Path(__file__).resolve().parents[1]
script=root.parents[2]/"dula-skills/draw-over-animation/scripts/package_pilot.py"
subprocess.run([sys.executable,str(script),"--episode",str(root),"--config","config/art_pass_r2_pipeline.json"],check=True)
