"""Compose review evidence; generated production textures are never modified."""
from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps

ep = Path(__file__).resolve().parents[1]
work = ep.parents[2]
root = ep / 'storyboard/hybrid_character'
out = root / 'direct_paint_v1'
renders = out / 'render_final'
assets = work / 'dula-assets/characters/bioarmor/textures'
font = lambda size: ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', size)


def tile(sheet, source, box):
    im = source if isinstance(source, Image.Image) else Image.open(source)
    im = im.convert('RGBA')
    fitted = ImageOps.contain(im, (box[2], box[3]), Image.Resampling.LANCZOS)
    sheet.paste(fitted, (box[0] + (box[2]-fitted.width)//2,
                         box[1] + (box[3]-fitted.height)//2), fitted)


sheet = Image.new('RGB', (1600, 650), '#e7e1d6')
d = ImageDraw.Draw(sheet)
panels = [
    ('已确认原画 · 原始斜角', Image.open(root/'face_design_v1/face_target.png').crop((0, 0, 835, 941))),
    ('生成生产图 · 正面', out/'aoi_production_front.png'),
    ('原程序绘制 V5 · 正面', root/'anime_v5/aoi_neutral.png'),
    ('生成纹理曲面模型 · 正面', renders/'aoi_neutral.png'),
]
for i, (title, source) in enumerate(panels):
    d.text((i*400+10, 16), title, font=font(21), fill='#283c36')
    tile(sheet, source, (i*400, 60, 400, 500))
d.text((18, 584), '原画与生产图角度不同；生产图也有身份漂移。两版模型使用同一正面机位。', font=font(22), fill='#283c36')
d.text((18, 618), '直接使用生成图保留了绘画细节；侧面、发束体积和领口仍需修正，尚未获最终认可。', font=font(21), fill='#7b4140')
sheet.save(out/'comparison.jpg', quality=94)

angles = [('profile_left', '左侧：检查发层厚度'), ('left', '左转：约 43°'), ('neutral', '正面'),
          ('right', '右转：约 43°'), ('profile', '右侧：接缝仍可见'), ('back_right', '后侧：纹理仍有拉伸'),
          ('down', '低头'), ('up', '抬头'), ('back', '背面')]
sheet = Image.new('RGB', (1200, 1310), '#e7e1d6')
d = ImageDraw.Draw(sheet)
for i, (name, label) in enumerate(angles):
    x, y = i % 3 * 400, i // 3 * 425
    d.text((x+10, y+3), label, font=font(20), fill='#283c36')
    tile(sheet, renders/f'aoi_{name}.png', (x, y+25, 400, 400))
d.text((12, 1280), '实际模型截图；用于暴露边界，不能作为独立参考来证明还原成功。', font=font(20), fill='#7b4140')
sheet.save(out/'aoi_views.jpg', quality=94)

sheet = Image.new('RGB', (1440, 390), '#e7e1d6')
d = ImageDraw.Draw(sheet)
for i, name in enumerate(['listen', 'talk', 'half_blink', 'closed']):
    d.text((i*360+10, 3), name, font=font(20), fill='#283c36')
    tile(sheet, renders/f'aoi_{name}.png', (i*360, 28, 360, 360))
sheet.save(out/'expressions.jpg', quality=94)

video = ep/'output/direct_paint_aoi_v1.mp4'
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video)]))
(out/'video_probe.json').write_text(json.dumps(probe, indent=2), encoding='utf8')
sheet = Image.new('RGB', (1280, 770), '#e7e1d6')
d = ImageDraw.Draw(sheet)
for i, t in enumerate([0.2, 1.1, 2.0, 3.3]):
    dest = out/'video'/f'decoded_{t}.png'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(t), '-i', str(video), '-frames:v', '1', str(dest)], check=True)
    x, y = i % 2 * 640, i // 2 * 385
    d.text((x+10, y+2), f'原对白时间 {11.5+t:.1f}s', font=font(19), fill='#283c36')
    tile(sheet, dest, (x, y+25, 640, 360))
sheet.save(out/'decoded_clip.jpg', quality=94)


def record(file, role, parent=None, generation=None):
    result = {'path': file.relative_to(work).as_posix(), 'role': role,
              'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
    if parent:
        result['parent'] = parent
    if generation:
        result['generated_file'] = generation
    if file.suffix == '.png':
        with Image.open(file) as im:
            result.update(size=list(im.size), mode=im.mode)
    return result


manifest = {
    'status': 'working_direct_texture_trial_not_final_art_approval',
    'provider': 'built-in image_gen',
    'master': record(root/'face_design_v1/face_target.png', 'user-approved identity and drawing target'),
    'assets': [
        record(out/'aoi_production_front.png', 'generated frontal production master; not a simplified redraw', 'approved master', 'exec-0fc6ab01-386e-4010-b9b8-52e4f62a9547.png'),
        record(assets/'aoi-painted-face-v1.png', 'runtime curved-face base colour', 'aoi_production_front.png', 'exec-42bd8a0e-0935-47a7-a685-ce753284aa94.png'),
        record(assets/'aoi-painted-hair-v1.png', 'runtime front hair curved shell colour and alpha', 'aoi_production_front.png', 'exec-f90117b0-2f71-48dc-b835-407878c7ff67.png'),
        record(assets/'aoi-painted-back-v1.png', 'runtime posterior hair colour', 'aoi_production_front.png', 'exec-be93949b-7178-4312-a6f4-796ecec2a176.png'),
    ],
    'prompts': [record(out/name, 'actual generation prompt') for name in ['production_prompt.txt', 'layer_prompts.txt', 'back_prompt.txt']],
    'evidence': [record(out/name, 'review evidence') for name in ['comparison.jpg', 'aoi_views.jpg', 'expressions.jpg', 'decoded_clip.jpg', 'render_final/report.json', 'video/render_build.json']] + [record(video, '3.6s original dialogue close-up')],
    'known_limits': [
        'Generated extraction requested pixel locking but changed feature positions; front layers need separate alignment.',
        'No assistant-redrawn intermediate design. The optional nine-view reference is not a runtime texture.',
        'Original master is three-quarter, production master is frontal: the illustration comparison is not same-camera.',
        'Front drawing detail is retained; profile shells, crown joins and posterior mapping are not production approved.',
        'Hair follows the head rigidly; independent tail lag is not yet implemented in this trial.',
        'Tripo collar segmentation and wrist/contact problems are outside this face/hair trial.',
        'Video inspected through decoded frames, not a claimed full real-time perceptual review.',
    ],
}
(out/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({'sheets': 4, 'video_duration': probe['format']['duration'], 'streams': [s['codec_name'] for s in probe['streams']], 'manifest': str(out/'manifest.json')}))
