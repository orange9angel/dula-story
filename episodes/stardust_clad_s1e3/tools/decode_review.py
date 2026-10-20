"""Decode timestamped contact sheets from the delivered MP4, not the viewer."""
import argparse,hashlib,io,json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
EP=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--out',required=True);p.add_argument('--offset',type=float,default=0);p.add_argument('--windows',nargs='+',required=True)
a=p.parse_args();source=EP/a.source;out=EP/a.out;out.mkdir(parents=True,exist_ok=True)
manifest={'source':a.source,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'method':'ordered_frames','offset':a.offset,'boards':[]}
for window in a.windows:
 name,start,end,step=window.split(':');start,end,step=map(float,[start,end,step])
 times=[round(start+i*step,4) for i in range(round((end-start)/step)+1)]
 for n in range(0,len(times),12):
  batch=times[n:n+12];board=Image.new('RGB',(1440,math_rows:=((len(batch)+2)//3)*294),'#111b23');draw=ImageDraw.Draw(board)
  for i,t in enumerate(batch):
   raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t-a.offset),'-i',str(source),'-frames:v','1','-f','image2pipe','-vcodec','png','-'])
   frame=Image.open(io.BytesIO(raw)).convert('RGB').resize((480,270));x=i%3*480;y=i//3*294
   board.paste(frame,(x,y+24));draw.text((x+8,y+5),f'{t:.3f}s',fill='white')
  name2=f'{name}_{n//12+1:02}.jpg';board.save(out/name2,quality=92)
  manifest['boards'].append({'path':name2,'at':batch,'sha256':hashlib.sha256((out/name2).read_bytes()).hexdigest()})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'boards':len(manifest['boards']),'source':a.source}))
