"""Layout real renderer outputs for review; never retouch the rendered character."""
from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageChops, ImageStat

ep = Path(__file__).resolve().parents[1]
root = ep / 'storyboard/hybrid_character'
out = root / 'profile_polish_v4'
font = lambda n: ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', n)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def panel(sheet, source, x, y, label, size=450, crop=None):
    im = Image.open(source).convert('RGB')
    if crop:
        im = im.crop(crop)
    im = ImageOps.contain(im, (size, size), Image.Resampling.LANCZOS)
    sheet.paste(im, (x+(size-im.width)//2, y+36+(size-im.height)//2))
    ImageDraw.Draw(sheet).text((x+10, y+4), label, font=font(21), fill='#304039')


sheet = Image.new('RGB', (1350, 972), '#e7e1d6')
for i, (state, label) in enumerate([('front','正面'),('turn_45','45°'),('turn_65','65°'),('turn_90','90°'),('turn_minus65','另一侧 65°'),('turn_minus90','另一侧 90°')]):
    panel(sheet, out/'final'/f'{state}.png', i%3*450, i//3*486, label+' · V4 待复看')
sheet.save(out/'turns.jpg', quality=95)

sheet = Image.new('RGB', (1800, 1000), '#e7e1d6')
for row, (folder, label) in enumerate([(root/'profile_polish_v3/final', '修前 V3'), (out/'final', '当前 V4')]):
    for col, state in enumerate(['front','turn_45','turn_65','turn_90']):
        panel(sheet, folder/f'{state}.png', col*450, row*486, label+' · '+state)
ImageDraw.Draw(sheet).text((12,975), '同机位模型截图；技术检查通过不等于审美通过。', font=font(19), fill='#75413e')
sheet.save(out/'before_after.jpg', quality=95)

reference = root/'face_design_turnaround_v1/aoi_nine_views.png'
sheet = Image.new('RGB', (1350,1000), '#e7e1d6')
for col, (crop, state, label) in enumerate([((875,0,1310,400),'front','正面'),((0,400,435,795),'turn_45','斜面'),((440,400,870,795),'turn_90','侧面')]):
    panel(sheet, reference, col*450, 0, '既有生成图 · '+label, crop=crop)
    panel(sheet, out/'final'/f'{state}.png', col*450,486,'实际模型 · '+label)
ImageDraw.Draw(sheet).text((12,975),'生成图仅作造型参考，角度与透视并非严格测量；没有把生成图当模型截图。',font=font(18),fill='#75413e')
sheet.save(out/'reference_comparison.jpg',quality=95)

sheet = Image.new('RGB',(1350,486),'#e7e1d6')
for i,(p,label) in enumerate([(root/'direct_paint_v1/render_r2/aoi_neutral.png','用户认可 R2'),(root/'profile_polish_v3/final/front.png','修前 V3'),(out/'final/front.png','当前 V4')]):
    panel(sheet,p,i*450,0,label)
sheet.save(out/'front_preservation.jpg',quality=95)

times=[.4,.9,1.1,1.3,1.5,2.15,3.85,4.05,4.25,4.95]
video=ep/'output/aoi_profile_polish_v4.mp4'
sheet=Image.new('RGB',(1800,792),'#e7e1d6')
for i,t in enumerate(times):
    dest=out/f'decoded_{t}.png'
    subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(video),'-frames:v','1',str(dest)],check=True)
    panel(sheet,dest,i%5*360,i//5*396,f'解码 {t:.2f}s',size=360)
sheet.save(out/'decoded_turn.jpg',quality=95)
dialogue=ep/'output/aoi_profile_dialogue_v4.mp4'
sheet=Image.new('RGB',(1280,396),'#e7e1d6')
for i,t in enumerate([1.1,2.0]):
    dest=out/'dialogue'/f'decoded_{t}.png'
    subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(dialogue),'-frames:v','1',str(dest)],check=True)
    sheet.paste(Image.open(dest).resize((640,360)),(i*640,36))
    ImageDraw.Draw(sheet).text((i*640+10,4),f'原对白 {11.5+t:.1f}s',font=font(21),fill='#304039')
sheet.save(out/'decoded_dialogue.jpg',quality=95)
probes={}
for name,p in [('turn',video),('dialogue',dialogue)]:
    probes[name]=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
    subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],check=True)
    (out/(name+'_probe.json')).write_text(json.dumps(probes[name],indent=2),encoding='utf8')

old=json.loads((root/'profile_polish_v3/default_regression/report.json').read_text())
new=json.loads((out/'default_regression/report.json').read_text())
same=all(old['actors'][a][s]['sha256']==v['sha256'] for a,states in new['actors'].items() for s,v in states.items())
scene_same=all(old['scene']['frames'][t]['sha256']==v['sha256'] for t,v in new['scene']['frames'].items())
roi=(320,350,575,550)
diff=ImageChops.difference(Image.open(root/'profile_polish_v3/final/front.png').convert('RGB').crop(roi),Image.open(out/'final/front.png').convert('RGB').crop(roi))
evidence=['turns.jpg','before_after.jpg','reference_comparison.jpg','front_preservation.jpg','decoded_turn.jpg','decoded_dialogue.jpg','final/report.json','expression_r13/report.json','default_regression/report.json','turn_video_build.json','dialogue/render_build.json','rejected_variants.zip','hair_generation_prompt.txt']
atlas=ep.parents[2]/'dula-assets/characters/bioarmor/textures/aoi-profile-hair-atlas-v1.png'
manifest={
 'status':'V4 candidate, awaiting user visual review',
 'reference':{'path':str(reference),'sha256':sha(reference),'original_reference_unchanged':True},
 'generated_asset':{'path':str(atlas),'sha256':sha(atlas),'purpose':'transparent hair-only extraction from existing nine-view reference','provider':'image_gen','prompt':'hair_generation_prompt.txt','generation_id':'01a13a20-dfd0-7b11-9650-1b3341952284'},
 'representation':'fixed bone-bound curved surfaces and closed ponytail volumes; static scalp projection; directional tail color/alpha correction; not camera-facing face cards or a recovered physical hairstyle',
 'validation':{'profile_views':25,'expression_views':15,'direct_scene_frames':5,'default_faces':30,'default_faces_identical_to_v3':same,'default_scene_frames_identical_to_v3':scene_same,'reverse_seek_identical':True,'videos_fully_decode':True},
 'front_difference':{'roi':roi,'mean_abs_rgb_0_255':ImageStat.Stat(diff).mean,'meaning':'pixel drift diagnostic, not beauty or likeness score'},
 'limits':['45/65 hair still has a swept sculptural fringe and imperfect layer join','near-side ponytail thickness, crown texture under pitch, and rear nape remain below the painting target','small neck/collar fragments remain','angle-weighted alpha may expose silhouette transition; do not claim arbitrary-camera hair reconstruction','hands, contact and secondary hair motion were not improved in this revision'],
 'evidence_sha256':{p:sha(out/p) for p in evidence},'video_sha256':sha(video),'dialogue_sha256':sha(dialogue)
}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'default_faces_same':same,'default_scenes_same':scene_same,'durations':{k:v['format']['duration'] for k,v in probes.items()}},ensure_ascii=False))
