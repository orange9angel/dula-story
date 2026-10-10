"""Assemble matched-camera portraits and final-video excerpts for look review."""
from pathlib import Path
from PIL import Image, ImageDraw
import subprocess
import argparse

episode=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--board',default='storyboard/character_look_r16')
parser.add_argument('--before',default='storyboard/character_look_r16/before')
parser.add_argument('--video',default='craft3d_full_r16.mp4')
parser.add_argument('--before-video',default='craft3d_full_r15.mp4')
parser.add_argument('--before-label',default='R15')
parser.add_argument('--label',default='R16')
parser.add_argument('--out',default='character_look_r16_compare.mp4')
parser.add_argument('--portraits',nargs='+',default=['lei_threequarter','hong_front'])
parser.add_argument('--portrait-out',default='portrait_comparison.jpg')
args=parser.parse_args()
if any(not label.replace('_','').isalnum() for label in (args.label,args.before_label)):
    parser.error('Labels accept only letters, numbers and underscores')
board=episode/args.board
board.mkdir(parents=True,exist_ok=True)
sheet=Image.new('RGB',(1536,456*len(args.portraits)),'#171a22')
draw=ImageDraw.Draw(sheet)
for row,name in enumerate(args.portraits):
    for col,version in enumerate(['before','after']):
        directory=episode/args.before if version=='before' else board/version
        im=Image.open(directory/(name+'.jpg')).resize((768,432),Image.Resampling.LANCZOS)
        x,y=col*768,row*456
        sheet.paste(im,(x,y+24));draw.text((x+12,y+6),f'{version.upper()} / {name}',fill='white')
sheet.save(board/args.portrait_out,quality=94)
poses=['turn_left','turn_right','look_down','look_up','half_blink','closed']
sheet=Image.new('RGB',(1920,768),'#171a22');draw=ImageDraw.Draw(sheet)
for row,actor in enumerate(['lei','hong']):
    for col,pose in enumerate(poses):
        im=Image.open(board/'after'/f'{actor}_{pose}.jpg')
        im=im.crop((330,0,950,650)).resize((320,360),Image.Resampling.LANCZOS)
        x,y=col*320,row*384;sheet.paste(im,(x,y+24));draw.text((x+8,y+6),f'{actor} / {pose}',fill='white')
sheet.save(board/'head_motion_checks.jpg',quality=94)
output=episode/'output'/args.out
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',
    '-ss','17.5','-t','10','-i',str(episode/'output'/args.before_video),
    '-ss','17.5','-t','10','-i',str(episode/'output'/args.video),
    '-filter_complex',
    f'[0:v]scale=640:360,pad=640:388:0:28:color=0x171a22,drawtext=text={args.before_label}:x=12:y=5:fontsize=18:fontcolor=white[a];'
    f'[1:v]scale=640:360,pad=640:388:0:28:color=0x171a22,drawtext=text={args.label}:x=12:y=5:fontsize=18:fontcolor=white[b];'
    '[a][b]hstack=inputs=2[v]',
    '-map','[v]','-map','1:a:0','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a','192k','-t','10','-movflags','+faststart',str(output)],check=True)
print(output)
