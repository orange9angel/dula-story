"""Episode binding for the shared multi-window repair assembler."""
from pathlib import Path
import json,hashlib,subprocess
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
source='output/borrowed_moonlight_cinema_r3.mp4'
cfg={'source':source,'source_sha256':hashlib.sha256((EP/source).read_bytes()).hexdigest(),'output':'output/borrowed_moonlight_cinema_r3_final.mp4','base_config':'hybrid/config/cinema_r3_full.json','patches':[{'config':f'hybrid/config/cinema_r3b_patch_{i}.json'} for i in range(5)],'report':'storyboard/cinema_r3b/assembly.json','crf':17}
p=EP/'hybrid/config/cinema_r3b_assembly.json';p.write_text(json.dumps(cfg,indent=2),encoding='utf-8')
subprocess.run(['python',str(WORK/'dula-skills/draw-over-animation/scripts/replace_windows.py'),'--episode',str(EP),'--config','hybrid/config/cinema_r3b_assembly.json'],check=True)
