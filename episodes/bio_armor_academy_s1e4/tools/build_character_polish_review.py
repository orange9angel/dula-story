"""Compose V2 comparisons from untouched renderer outputs."""
from pathlib import Path
import json
import hashlib
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps

ep = Path(__file__).resolve().parents[1]
root = ep/'storyboard/hybrid_character'
old = root/'direct_paint_v1/render_final'
out = root/'direct_paint_v2'
new = out/'final'
approved = root/'direct_paint_v1/render_r2'
font = lambda n: ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', n)


def panel(sheet, path, x, y, label, size=600, crop=None):
    im = Image.open(path).convert('RGB')
    if crop:
        im = im.crop(crop)
    im = ImageOps.contain(im, (size, size), Image.Resampling.LANCZOS)
    sheet.paste(im, (x+(size-im.width)//2, y+34+(size-im.height)//2))
    ImageDraw.Draw(sheet).text((x+12, y+4), label, font=font(23), fill='#293c36')


sheet = Image.new('RGB', (1200, 1294), '#e7e1d6')
for row, state in enumerate(['neutral', 'talk']):
    panel(sheet, approved/f'aoi_{state}.png', 0, row*634, '用户认可 · R2 '+state)
    panel(sheet, new/f'aoi_{state}.png', 600, row*634, '后续修订 · '+state)
ImageDraw.Draw(sheet).text((12, 1270), '认可范围：R2 正面造型与展示表情；不等于所有角度和后续修订均已确认。', font=font(18), fill='#75413e')
sheet.save(out/'front_target_comparison.jpg', quality=94)

for file, pairs in [
    ('comparison.jpg', [('neutral', '正面：内眼角、脸颊与下颌'), ('right', '转面：下半脸与颈口')]),
    ('hair_comparison.jpg', [('profile_left', '马尾侧面'), ('back', '后脑与后发')]),
    ('clothing_comparison.jpg', [('direct_body', '袖口、手臂与裙摆'), ('neutral', '上身：领口、肩袖与配色')]),
]:
    sheet = Image.new('RGB', (1200, 1294), '#e7e1d6')
    for row, (state, title) in enumerate(pairs):
        crop = (230, 230, 670, 650) if file == 'clothing_comparison.jpg' and state == 'direct_body' else None
        panel(sheet, old/f'aoi_{state}.png', 0, row*634, '上次 · '+title, crop=crop)
        panel(sheet, new/f'aoi_{state}.png', 600, row*634, '本次 · '+title, crop=crop)
    ImageDraw.Draw(sheet).text((12, 1270), '同机位修订对照；侧后发贴合与领口仍有可见接缝，审美待用户复看。', font=font(18), fill='#75413e')
    sheet.save(out/file, quality=94)

states = ['neutral', 'left', 'right', 'profile_left', 'profile', 'back', 'listen', 'half_blink', 'closed']
sheet = Image.new('RGB', (1200, 1302), '#e7e1d6')
for i, state in enumerate(states):
    panel(sheet, new/f'aoi_{state}.png', i%3*400, i//3*434, state, size=400)
sheet.save(out/'views.jpg', quality=94)

video = ep/'output/direct_paint_aoi_v2.mp4'
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video)]))
(out/'video_probe.json').write_text(json.dumps(probe, indent=2), encoding='utf8')
sheet = Image.new('RGB', (1280, 770), '#e7e1d6')
for i, t in enumerate([.2, 1.1, 2., 3.3]):
    dest = out/'video'/f'decoded_{t}.png'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(t), '-i', str(video), '-frames:v', '1', str(dest)], check=True)
    sheet.paste(Image.open(dest).resize((640, 360)), (i%2*640, i//2*385+25))
    ImageDraw.Draw(sheet).text((i%2*640+12, i//2*385), f'{11.5+t:.1f}s', font=font(18), fill='#293c36')
sheet.save(out/'decoded_clip.jpg', quality=94)
evidence = ['front_target_comparison.jpg', 'comparison.jpg', 'hair_comparison.jpg', 'clothing_comparison.jpg', 'views.jpg', 'decoded_clip.jpg', 'final/report.json', 'video/render_build.json']
manifest = {'status': 'revision_candidate_not_user_approved', 'source_art': '../direct_paint_v1/manifest.json',
    'approved_baseline': {'path': '../direct_paint_v1/render_r2', 'scope': 'front appearance and displayed neutral/talk/firm expressions',
        'user_feedback': ['这张就很不错了', '哇，你越做越好了'],
        'sha256': {f'aoi_{state}.png': hashlib.sha256((approved/f'aoi_{state}.png').read_bytes()).hexdigest() for state in ['neutral', 'talk', 'firm']}},
    'changes': ['rounder nasal eye aperture in neutral and gaze states', 'fuller cheeks and posterior jaw with coordinated UV', 'thin painted hair surfaces over closed ponytail locks', 'anatomical clothing constraints for sleeves and neckline'],
    'known_limits': ['frontal hair/posterior-cap seams remain at extreme yaw', 'posterior strands are less detailed than the frontal painting', 'small neck/collar fragments remain', 'no new wrist or contact repair'],
    'sha256': {name: hashlib.sha256((out/name).read_bytes()).hexdigest() for name in evidence},
    'video_sha256': hashlib.sha256(video.read_bytes()).hexdigest(),
    'review': 'screenshots and decoded dialogue frames inspected; not a claimed full real-time subjective review'}
(out/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({'duration': probe['format']['duration'], 'sheets': 6}))
