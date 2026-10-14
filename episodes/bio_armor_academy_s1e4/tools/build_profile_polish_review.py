"""Compare generated profile art and untouched renderer outputs."""
from pathlib import Path
import json
import hashlib
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageChops, ImageStat

ep = Path(__file__).resolve().parents[1]
root = ep/'storyboard/hybrid_character'
out = root/'profile_polish_v3'
font = lambda n: ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', n)
reference = root/'face_design_turnaround_v1/aoi_nine_views.png'


def panel(sheet, source, x, y, text, crop=None, size=450):
    im = Image.open(source).convert('RGB')
    if crop:
        im = im.crop(crop)
    im = ImageOps.contain(im, (size, size), Image.Resampling.LANCZOS)
    sheet.paste(im, (x+(size-im.width)//2, y+34+(size-im.height)//2))
    ImageDraw.Draw(sheet).text((x+12, y+5), text, font=font(21), fill='#2f3c39')


sheet = Image.new('RGB', (1350, 1000), '#e7e1d6')
for row in range(2):
    panel(sheet, reference, 0, row*484, '生成侧面参考', (440, 402, 870, 790) if row == 0 else (620, 515, 830, 725))
    for col, (folder, label) in enumerate([('before', '修前模型'), ('final', '修后模型')], 1):
        panel(sheet, out/folder/'turn_90.png', col*450, row*484, label, (140, 100, 665, 690) if row == 0 else (310, 340, 630, 635))
ImageDraw.Draw(sheet).text((12, 974), '生成图用于定性造型参考，非严格正交测量；模型修前/修后为同机位。', font=font(19), fill='#75413e')
sheet.save(out/'profile_comparison.jpg', quality=95)

sheet = Image.new('RGB', (1350, 510), '#e7e1d6')
for col, (source, label) in enumerate([
    (root/'direct_paint_v1/render_r2/aoi_neutral.png', '用户认可的 R2 正面'),
    (out/'before/front.png', '本轮修前正面'),
    (out/'final/front.png', '本轮修后正面'),
]):
    panel(sheet, source, col*450, 0, label)
sheet.save(out/'front_preservation.jpg', quality=95)

sheet = Image.new('RGB', (1200, 868), '#e7e1d6')
for i, state in enumerate(['front', 'turn_45', 'turn_65', 'turn_90', 'turn_minus65', 'turn_minus90']):
    panel(sheet, out/'final'/f'{state}.png', i%3*400, i//3*434, state, size=400)
sheet.save(out/'turns.jpg', quality=95)

roi = (310, 340, 580, 560)
diff = ImageChops.difference(Image.open(out/'before/front.png').convert('RGB').crop(roi), Image.open(out/'final/front.png').convert('RGB').crop(roi))
front_metric = {'roi': roi, 'mean_abs_rgb_difference_0_255': ImageStat.Stat(diff).mean,
                'meaning': 'same-camera inner-face pixel difference, not an aesthetic score or proof of likeness'}
old_default = json.loads((root/'direct_paint_v2/default_regression/report.json').read_text())
new_default = json.loads((out/'default_regression/report.json').read_text())
default_same = all(old_default['actors'][a][s]['sha256'] == v['sha256'] for a, states in new_default['actors'].items() for s, v in states.items())

video = ep/'output/aoi_profile_polish_v3.mp4'
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video)]))
(out/'video_probe.json').write_text(json.dumps(probe, indent=2), encoding='utf8')
sheet = Image.new('RGB', (1200, 434), '#e7e1d6')
for i, t in enumerate([.4, 2.15, 4.95]):
    dest = out/f'decoded_{t}.png'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(t), '-i', str(video), '-frames:v', '1', str(dest)], check=True)
    panel(sheet, dest, i*400, 0, f'视频解码 {t:.2f}s', size=400)
sheet.save(out/'decoded_turn.jpg', quality=95)

dialogue = ep/'output/aoi_profile_dialogue_v3.mp4'
dialogue_probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(dialogue)]))
(out/'dialogue_probe.json').write_text(json.dumps(dialogue_probe, indent=2), encoding='utf8')
sheet = Image.new('RGB', (1280, 385), '#e7e1d6')
for i, t in enumerate([1.1, 2.0]):
    dest = out/'dialogue'/f'decoded_{t}.png'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(t), '-i', str(dialogue), '-frames:v', '1', str(dest)], check=True)
    sheet.paste(Image.open(dest).resize((640, 360)), (i*640, 25))
    ImageDraw.Draw(sheet).text((i*640+12, 0), f'原对白 {11.5+t:.1f}s', font=font(18), fill='#2f3c39')
sheet.save(out/'decoded_dialogue.jpg', quality=95)

evidence = ['profile_comparison.jpg', 'front_preservation.jpg', 'turns.jpg', 'decoded_turn.jpg', 'decoded_dialogue.jpg', 'final/report.json', 'expressions/report.json', 'default_regression/report.json', 'turn_video_build.json', 'dialogue/render_build.json']
manifest = {'status': 'profile_revision_candidate_not_user_approved',
    'reference': {'file': '../face_design_turnaround_v1/aoi_nine_views.png', 'sha256': hashlib.sha256(reference.read_bytes()).hexdigest(), 'new_generation_this_revision': False},
    'changes': ['soft median forehead-nose-lip-chin contour with restrained chin projection', 'curved cheek and flatter iris-bearing surface while preserving frontal UV coordinates', 'temple locks wrap back to reveal the profile eye', 'ear placement and independent generated-art UV', 'continuous head chart seams and face-boundary clipping for live edits'],
    'front_pixel_check': front_metric, 'default_30_face_images_identical_to_v2': default_same,
    'limits': ['posterior hair cap and ponytail seams remain', 'neck/collar fragments remain at large relative head turns', 'single frontal painting still limits large profile expressions', 'turn video is a silent geometry review; dialogue excerpt is separately preserved; no new contact acceptance'],
    'sha256': {n: hashlib.sha256((out/n).read_bytes()).hexdigest() for n in evidence}, 'video_sha256': hashlib.sha256(video.read_bytes()).hexdigest(), 'dialogue_sha256': hashlib.sha256(dialogue.read_bytes()).hexdigest()}
(out/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({'duration': probe['format']['duration'], 'front_pixel_check': front_metric, 'default_faces_unchanged': default_same}))
