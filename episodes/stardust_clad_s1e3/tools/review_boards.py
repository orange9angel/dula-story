from pathlib import Path
from PIL import Image,ImageDraw
import json,sys
EP=Path(__file__).resolve().parents[1]
folder=EP/(sys.argv[1] if len(sys.argv)>1 else 'storyboard/r3/check')
trace=json.loads((folder/'craft3d_trace.json').read_text(encoding='utf-8'))
shots=trace['shots']
for start in range(0,len(shots),8):
 batch=shots[start:start+8];out=Image.new('RGB',(1280,4*384),'#111b23');d=ImageDraw.Draw(out)
 for i,s in enumerate(batch):
  img=Image.open(folder/s['filename']).resize((640,360));x=i%2*640;y=i//2*384;out.paste(img,(x,y+24));d.text((x+8,y+5),f"{s['t']:.3f}s  {s['filename']}",fill='white')
 out.save(folder/f'board_{start//8+1}.jpg',quality=90)
