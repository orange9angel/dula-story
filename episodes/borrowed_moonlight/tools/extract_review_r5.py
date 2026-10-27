from pathlib import Path
import json,subprocess,sys
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
c=json.loads((EP/'config/cinema_r5_baseline_review.json').read_text());g=c['groups']
g['end_girl']['times']=[435.6,435.8,436,436.2,436.4,437,438,440]
g['room_respond']={'times':[163,163.2,164.033333,164.1,164.166667,164.3],'crop':[450,145,730,380],'width':280,'columns':3}
g['goodnight']={'times':[464.6,464.8,465,465.2],'crop':[500,0,780,245],'width':280,'columns':2}
g['long_line']={'times':[315.8,320,325.5,328,329,330],'width':640,'columns':2}
# Short blink sequence spans every phase and reopens with the original spectacles.
g['roof_alder']['times']=[241.233333,241.266667,241.3,241.333333,241.366667,241.4,241.433333,241.466667]
out=EP/'config/cinema_r5_final_review.json';out.write_text(json.dumps(c,indent=2))
subprocess.run([sys.executable,str(WORK/'dula-skills/character-attention-review/scripts/extract_review_frames.py'),'--source',str(EP/'output/borrowed_moonlight_cinema_r5_final.mp4'),'--config',str(out),'--output',str(EP/'storyboard/cinema_r5/final_review')],check=True)
