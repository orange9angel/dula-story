"""Episode review windows; capture uses the shared production runner."""
from pathlib import Path
import json,subprocess
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
cfg=json.loads((EP/'hybrid/config/cinema_r3_full.json').read_text())
cfg['pilot'].update(board='storyboard/cinema_r3/motion',output='output/cinema_r3_motion_review.mp4',samples=[28+i/8 for i in range(12)]+[85,86,87,88,90]+[234.9,236,238,240,241]+[262+i/6 for i in range(12)]+[365.9,366.5,368.5,369.5,370.5,470])
out=EP/'hybrid/config/cinema_motion_review.json';out.write_text(json.dumps(cfg,indent=2),encoding='utf-8')
subprocess.run(['node',str(WORK/'dula-skills/draw-over-animation/scripts/pipeline.mjs'),'--episode',str(EP),'--config','hybrid/config/cinema_motion_review.json','--step','render'],check=True)
from PIL import Image,ImageDraw
board=EP/'storyboard/cinema_r3/motion'
for title,times,rect in [
 ('walk_contact',[28+i/8 for i in range(12)],[560,350,880,720]),
 ('climb_contact',[262+i/6 for i in range(12)],[430,0,860,580]),
 ('door',[85,86,87,88,90],[480,240,800,650]),
 ('tear',[365.9,366.5,368.5,369.5,370.5],[440,130,900,510])]:
 w=rect[2]-rect[0];h=rect[3]-rect[1];sheet=Image.new('RGB',(w*4,(h+24)*((len(times)+3)//4)),(15,20,25));g=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  im=Image.open(board/f"t{str(t).removesuffix('.0').replace('.','_')}.png").crop(rect)
  x=i%4*w;y=i//4*(h+24);sheet.paste(im,(x,y+24));g.text((x+5,y+5),f'{t:.3f}s',fill='white')
 sheet.save(board/f'{title}.jpg',quality=94)
print('Native crops and ordered phase sheets saved')
