"""Comparable face crops and neutral-image invariance for the expression pass."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json
EP=Path(__file__).resolve().parents[1];W=EP/'tmp/romcom_revision'
report={}
for actor in ['lei','aoi']:
    board=Image.new('RGB',(1200,600),'#e4e5e3');d=ImageDraw.Draw(board)
    for col,name in enumerate(['neutral','smile','tease','surprise']):
        for row,phase in enumerate(['before','after']):
            p=W/phase/f'{actor}_0_{name}.png';im=Image.open(p).convert('RGB')
            if name=='neutral':report[f'{actor}_{phase}']=np.array(im)
            im.thumbnail((300,270));board.paste(im,(col*300,row*300+30));d.text((col*300+5,row*300+5),phase+' '+name,fill='black')
    board.save(W/f'{actor}_expression_comparison.jpg')
    angles=Image.new('RGB',(1200,1200),'#e4e5e3');ad=ImageDraw.Draw(angles)
    for col,angle in enumerate([0,45,70]):
        for row,(phase,expression) in enumerate([('before','neutral'),('after','neutral'),('before','smile'),('after','smile')]):
            im=Image.open(W/phase/f'{actor}_{angle}_{expression}.png').convert('RGB')
            im=im.crop((190,280,710,730)).resize((346,270))
            angles.paste(im,(col*400+27,row*300+30));ad.text((col*400+8,row*300+8),f'{phase} {angle} {expression}',fill='black')
    angles.save(W/f'{actor}_angle_comparison.jpg')
    for angle in [0,45,70]:
        a=np.array(Image.open(W/'before'/f'{actor}_{angle}_neutral.png')).astype(int)
        b=np.array(Image.open(W/'after'/f'{actor}_{angle}_neutral.png')).astype(int)
        report[f'{actor}_{angle}_neutral_pixels_changed']=int(np.count_nonzero(np.any(a!=b,axis=2)))
out={k:v for k,v in report.items() if not isinstance(v,np.ndarray)}
(W/'neutral_invariance.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out))
