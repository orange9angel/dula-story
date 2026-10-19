"""Diagnostic layouts only: preserve source pixels and aspect ratios."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json
EP=Path(__file__).resolve().parents[1];BOARD=EP/'storyboard/palace_r25'
FONT=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',24)
def board(items,out,labels,cell=(480,380)):
    w,h=cell;canvas=Image.new('RGB',(w*len(items),h+62),'#111b29');d=ImageDraw.Draw(canvas)
    for i,(im,label) in enumerate(zip(items,labels)):
        im=ImageOps.contain(im,(w-18,h-8),Image.Resampling.LANCZOS)
        canvas.paste(im,(i*w+(w-im.width)//2,62+(h-im.height)//2))
        d.text((i*w+12,18),label,font=FONT,fill='#f3ddb7')
    canvas.save(BOARD/out,quality=94)
ref=Path('C:/Users/orang/AppData/Local/Temp')
specs=[
 ('eyes','IM2Cl3',(102,333,292,443),'hero_front',(215,290,510,453)),
 ('hair','IM2Cl3',(70,286,301,480),'hero_quarter',(170,90,540,520)),
 ('metal','uZH2R6',(0,0,319,214),'hero_metal',(140,110,640,700)),
 ('arm','l9I8Ib',(0,0,666,403),'enemy_guard',(110,76,655,530)),
]
record=[]
for name,key,rc,ab,ac in specs:
    reference=Image.open(ref/f'codex-clipboard-{key}.png').convert('RGB').crop(rc)
    pair=Image.open(BOARD/f'{ab}.jpg').convert('RGB');x0,y0,x1,y1=ac
    board([reference,pair.crop(ac),pair.crop((x0+720,y0,x1+720,y1))],f'reference_{name}.jpg',['用户参考 · 风格关系','R24 · 基线','R25 · 候选'])
    record.append({'region':name,'reference':str(ref/f'codex-clipboard-{key}.png'),'referenceCrop':rc,'baselineCandidate':f'{ab}.jpg','crop':ac,'limit':'Style/structural comparison, not calibrated matching poses. Uniform contain scaling; no shape warping.'})
imgs=[]
for name in ['hero_speaking','hero_pain','hero_worry','enemy_surprise','hero_call','enemy_blink']:
    imgs.append(Image.open(BOARD/f'{name}.jpg').crop((720,48,1440,720)))
canvas=Image.new('RGB',(1440,960),'#111b29');d=ImageDraw.Draw(canvas)
for i,(im,label) in enumerate(zip(imgs,['说话','受击','担忧','惊讶','喊招','闭眼'])):
    im=ImageOps.contain(im,(470,426),Image.Resampling.LANCZOS);x=(i%3)*480;y=(i//3)*480
    canvas.paste(im,(x+(480-im.width)//2,y+46));d.text((x+20,y+10),label,font=FONT,fill='#f3ddb7')
canvas.save(BOARD/'expression_board.jpg',quality=94)
(BOARD/'reference_regions.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print('4 reference region boards and 1 expression board')
