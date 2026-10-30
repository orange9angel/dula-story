"""样帧球内裁区拼图：python tools/ball_sheet.py <board> <out.png>"""
import sys,glob,os
from PIL import Image,ImageDraw,ImageFont
b,out=sys.argv[1],sys.argv[2];fs=sorted(glob.glob(f'{b}/t*.png'),key=lambda f:float(os.path.basename(f)[1:-4].replace('_','.')))
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18);cw,ch=360,380;cols=5
sh=Image.new('RGB',(cols*cw,((len(fs)+cols-1)//cols)*ch),'black');d=ImageDraw.Draw(sh)
for k,f in enumerate(fs):
    im=Image.open(f).convert('RGB');im=im.crop((640-210,40,640+210,480)).resize((cw-4,ch-28))
    x,y=(k%cols)*cw,(k//cols)*ch;sh.paste(im,(x,y+26));d.text((x+4,y+2),os.path.basename(f)[1:-4].replace('_','.'),fill='white',font=font)
sh.save(out)
