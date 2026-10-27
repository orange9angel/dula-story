"""Lossless crop bookkeeping plus reference enlargement, no semantic painting."""
from pathlib import Path
from PIL import Image
import json
EP=Path(__file__).resolve().parents[1];A=EP/'hybrid/assets';O=A/'cinema_r5';O.mkdir(exist_ok=True)
targets=[('room_attend','cinema_r4/alder_attend_base.png',[150,20,160,160]),('room_respond','cinema_r4/alder_respond_base.png',[120,15,160,160]),('shocked','faces/alder_expr_shocked.png',[390,190,520,520]),('relieved','faces/alder_expr_relieved.png',[390,190,520,520])]
atlas=Image.new('RGBA',(1200,1200));mapping=[]
for i,(key,file,rect) in enumerate(targets):
 x,y,w,h=rect;im=Image.open(A/file).convert('RGBA');crop=im.crop((x,y,x+w,y+h));crop.save(O/f'{key}_native.png');ox=(i%2)*600;oy=(i//2)*600
 atlas.alpha_composite(crop.resize((600,600),Image.Resampling.LANCZOS),(ox,oy));mapping.append({'id':key,'source':file,'crop':rect,'atlas':[ox,oy,600,600]})
atlas.save(O/'alder_eye_targets.png');(O/'alder_eye_targets.json').write_text(json.dumps({'size':[1200,1200],'targets':mapping},indent=2))
print(O/'alder_eye_targets.png')
