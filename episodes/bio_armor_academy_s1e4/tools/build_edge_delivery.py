"""Extract review evidence from the actual encoded candidate and saved baseline."""
from pathlib import Path
import io
import subprocess
from PIL import Image, ImageDraw, ImageFont

EP = Path(__file__).resolve().parents[1]
OUT = EP/'tmp/edge_stability/delivery'; OUT.mkdir(parents=True, exist_ok=True)
BASE = EP/'output/archive/before_edge_stability.mp4'
VIDEO = EP/'output/edge_candidate.mp4'
if not VIDEO.exists():
    VIDEO = EP/'output/current.mp4'
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 23)
def frame(video, t):
    data = subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(video),'-frames:v','1','-f','image2pipe','-c:v','png','-'])
    return Image.open(io.BytesIO(data)).convert('RGB')

# Native 720p video decoding first, then identical local enlargement for both.
sheet = Image.new('RGB',(1280,816),'#eeeee9'); d=ImageDraw.Draw(sheet)
parts = [('男主头发',(40,155,220,315)),('女主头发',(515,195,730,385)),
         ('男主衣服',(35,305,310,490)),('女主袖口',(640,360,790,465))]
for i,(video,label) in enumerate([(BASE,'修改前'),(VIDEO,'本次')]):
    im=frame(video,21)
    for j,(part,box) in enumerate(parts):
        tile=im.crop(box); factor=min(620/tile.width,164/tile.height)
        tile=tile.resize((round(tile.width*factor),round(tile.height*factor)),Image.Resampling.NEAREST)
        x=i*640+(640-tile.width)//2;y=j*204
        d.text((i*640+16,y+5),label+' · '+part+' · 成片 21s',font=font,fill='#243830');sheet.paste(tile,(x,y+36))
sheet.save(OUT/'edge_comparison.png')

card_times=[0.1666667,.6,1.2,2.3666667,79.1666667,79.6,80.2,81.9666667]
sheet=Image.new('RGB',(1280,420),'#eeeee9');d=ImageDraw.Draw(sheet)
for i,t in enumerate(card_times):
    x=i%4*320;y=i//4*210;sheet.paste(frame(VIDEO,t).resize((320,180)),(x,y+30))
    d.text((x+8,y+2),f'{t:.3f}s',font=font,fill='#243830')
sheet.save(OUT/'title_cards.png')

# Three seconds of the same actual motion. At native crop scale both performers'
# hair and sleeves remain visible; this is a review crop, not a different camera.
label_font="fontfile='C\\:/Windows/Fonts/arial.ttf':"
filters=f'[0:v]crop=800:480:20:120,drawbox=x=0:y=0:w=iw:h=30:color=black@0.7:t=fill,drawtext={label_font}text=BEFORE:x=12:y=5:fontsize=20:fontcolor=white[a];[1:v]crop=800:480:20:120,drawbox=x=0:y=0:w=iw:h=30:color=black@0.7:t=fill,drawtext={label_font}text=AFTER:x=12:y=5:fontsize=20:fontcolor=white[b];[a][b]hstack[v]'
subprocess.run(['ffmpeg','-y','-v','error','-ss','20','-t','3','-i',str(BASE),'-ss','20','-t','3','-i',str(VIDEO),
    '-filter_complex',filters,'-map','[v]','-an','-c:v','libx264','-crf','16','-pix_fmt','yuv420p',str(OUT/'edge_comparison.mp4')],check=True)

# Consecutive frames around moving hair/sleeve, to inspect temporal discontinuity.
strip=Image.new('RGB',(1280,592),'#eeeee9');d=ImageDraw.Draw(strip)
for row,video in enumerate([BASE,VIDEO]):
    for i in range(8):
        im=frame(video,21+i/30).crop((525,200,745,450));im.thumbnail((160,264))
        x=i*160;y=row*296;strip.paste(im,(x,y+28));d.text((x+4,y+2),f'{21+i/30:.3f}',font=font,fill='#243830')
strip.save(OUT/'consecutive.png')
print('Actual encoded-video evidence ready: '+str(OUT))
