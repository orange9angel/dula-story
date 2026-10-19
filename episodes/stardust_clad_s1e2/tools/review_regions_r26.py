"""Local-only, aspect-preserving reference / baseline / candidate region boards."""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont
EP=Path(__file__).resolve().parents[1];BOARD=EP/'storyboard/palace_r26';TEMP=Path('C:/Users/orang/AppData/Local/Temp')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
regions=[
 ('发束流向与细丝','ZJ4cK8',(0,0,159,93),'hero_front',(160,70,550,365)),
 ('侧面发根与吹起轮廓','yGdsoI',(0,0,140,96),'hero_quarter',(150,70,610,500)),
 ('脸部明暗与五官','IM2Cl3',(121,115,266,248),'hero_front',(235,302,484,545)),
 ('肩胸连续关系','6YRFIf',(16,52,205,205),'hero_metal',(40,95,697,710)),
 ('用户指出的胯部斜切口','tPrm2z',(0,0,423,235),'hero_hips_front',(147,178,559,545)),
 ('用户指出的大腿鼓包','k0OCwh',(0,0,243,137),'hero_hips_quarter',(137,210,586,665)),
]
record=[]
for title,ref,crop,shot,box in regions:
 source=TEMP/f'codex-clipboard-{ref}.png';pair=Image.open(BOARD/f'{shot}.jpg').convert('RGB')
 original=Image.open(source).convert('RGB');crop=(crop[0],crop[1],min(crop[2],original.width),min(crop[3],original.height))
 images=[original.crop(crop),pair.crop(box),pair.crop((box[0]+720,box[1],box[2]+720,box[3]))]
 canvas=Image.new('RGB',(1230,410),'#18202c');draw=ImageDraw.Draw(canvas);draw.text((16,8),title,font=font,fill='#ffffff')
 for i,(im,label) in enumerate(zip(images,['用户参考（姿态不同）','R25 保留基线','R26 当前候选'])):
  scale=min(390/im.width,330/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS);canvas.paste(im,(i*410+(410-im.width)//2,66+(330-im.height)//2));draw.text((i*410+14,37),label,font=font,fill='#e9d09f')
 name=f'region_{shot}_{ref}.jpg';canvas.save(BOARD/'references'/name,quality=94)
 record.append({'region':title,'source':str(source),'sourceCrop':crop,'pair':f'{shot}.jpg','baselineCrop':box,'candidateOffsetX':720,'outputLocalOnly':f'references/{name}','method':'Independent uniform scaling; no warp; style/structure reference, not same-pose calibration.'})
(BOARD/'reference_regions.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print('Saved',len(record),'local reference boards')
