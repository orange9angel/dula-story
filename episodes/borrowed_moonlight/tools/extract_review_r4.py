"""Select affected-shot evidence from the delivered MP4 using the shared decoder."""
from pathlib import Path
import json,subprocess,sys
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
b=json.loads((EP/'storyboard/cinema_r4/acting/report.json').read_text())['blinkTimes']
e=next(t for t in b['Eileen'] if 35<t<43);a=next(t for t in b['Alder'] if 117<t<126);m=next(t for t in b['LadyMoon'] if 300<t<307)
g={
 'room_space':{'times':[95,104,110,134,151,156,163,172,178.5,181],'width':640,'columns':2},
 'girl_room_mouth':{'times':[109.6,109.8,110,110.2,111,112],'crop':[850,295,1010,425],'width':160,'columns':3},
 'elder_room_mouth':{'times':[118,118.2,118.4,119.2,a-.05,a+.1],'crop':[500,120,720,320],'width':220,'columns':3},
 'hero_blink':{'times':[e-.05,e+.05,e+.12,e+.28],'crop':[420,200,830,530],'width':410,'columns':2},
 'hero_expression':{'times':[352.1,354,356,358,360,362],'crop':[420,200,830,530],'width':410,'columns':3},
 'body_dialogue':{'times':[214,214.2,215,332,332.2,333],'crop':[530,30,780,280],'width':250,'columns':3},
 'moon_blink':{'times':[m-.05,m+.1,m+.28],'crop':[430,150,850,450],'width':420,'columns':3},
 'cuts_and_effects':{'times':[199.9666667,200,200.0333333,235.5,238,241,369.5,370.5,374,435.8,465],'width':640,'columns':2}}
c=EP/'config/cinema_r4_final_review.json';c.write_text(json.dumps({'groups':g},indent=2))
subprocess.run([sys.executable,str(WORK/'dula-skills/character-attention-review/scripts/extract_review_frames.py'),'--source',str(EP/'output/borrowed_moonlight_cinema_r4_final.mp4'),'--config',str(c),'--output',str(EP/'storyboard/cinema_r4/final_review')],check=True)
