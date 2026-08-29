#!/usr/bin/env python3
"""Rebuild walk segments in config/keyframe_timeline.json.

Thin shim kept for muscle memory: delegates to
dula-skills/walk-director/scripts/build_walk_timeline.py, driven by
config/walk_segments.json. The old hardcoded version (static camera,
magic time ranges) was retired — rerunning it would have reverted the
walk_follow/motionGroup work from V11.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
SKILL_SCRIPT = (
    EP.parents[2] / "dula-skills" / "walk-director" / "scripts" / "build_walk_timeline.py"
)

if not SKILL_SCRIPT.is_file():
    print(f"ERROR: skill script not found: {SKILL_SCRIPT}", file=sys.stderr)
    raise SystemExit(2)

raise SystemExit(subprocess.call([sys.executable, str(SKILL_SCRIPT), str(EP)] + sys.argv[1:]))
