"""Restore the existing series ink-title recipe inside the locked story windows."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

EP = Path(__file__).resolve().parents[1]
GEN = EP.parents[2] / 'dula-skills/title-card/scripts/make_title_card.py'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
timeline = json.loads((EP / 'config/timeline.json').read_text(encoding='utf-8'))
fps = 30
cards = []
for card_id, entry, title, subtitle, mode in [
    ('open', 1, '9章', '残卷 · 其四  /  别再试了', 'white'),
    ('close', 19, '残卷', '其四 · 终', 'black'),
]:
    seg = next(s for s in timeline['segments'] if s['entry'] == entry)
    duration = seg['end'] - seg['start']
    bg = EP / f'cards/{card_id}_background.png'
    out = EP / f'cards/{card_id}'
    command = [sys.executable, str(GEN), '--bg', str(bg), '--title', title,
               '--subtitle', subtitle, '--duration', str(duration), '--fps', str(fps),
               '--reveal', '0.18,0.62', '--out-mode', mode, '--out-dir', str(out)]
    subprocess.run(command, check=True)
    frames = [f'cards/{card_id}/f_{i:03d}.png' for i in range(round(duration * fps))]
    cards.append({'id': card_id, 'entry': entry, 'start': seg['start'], 'end': seg['end'],
                  'fps': fps, 'title': title, 'subtitle': subtitle, 'outMode': mode,
                  'background': str(bg.relative_to(EP)).replace('\\', '/'),
                  'backgroundSha256': sha(bg), 'frames': frames,
                  'frameSha256': [sha(EP / f) for f in frames]})
manifest = {'version': 1, 'recipe': 'existing series title-card / ink erosion + light sweep + bokeh',
            'generator': '../../../dula-skills/title-card/scripts/make_title_card.py',
            'generatorSha256': sha(GEN), 'timelineSha256': sha(EP / 'config/timeline.json'),
            'cards': cards}
(EP / 'config/cards.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'cards': [(c['id'], len(c['frames'])) for c in cards], 'timelineUnchanged': True}))
