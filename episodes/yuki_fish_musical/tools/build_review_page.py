from pathlib import Path
import json,hashlib,html
ROOT=Path(__file__).resolve().parents[1]
def main():
    tl=json.loads((ROOT/'config/timeline.json').read_text(encoding='utf-8'))
    chapter=[('开场质问',0),('年糕的狡辩歌',tl['songA']['start']),('嘴角的物证',19.004),('小雪的判决歌',tl['songB']['start']),('本日洗碗员',44.522)]
    buttons=''.join(f'<button onclick="film.currentTime={t};film.play()">{html.escape(label)}</button>' for label,t in chapter)
    page=f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>谁动了我的小鱼干</title><style>body{{margin:0;background:#221826;color:#fff0e2;font:16px/1.7 system-ui}}main{{max-width:920px;margin:32px auto;padding:0 20px}}h1{{font-size:30px}}video{{display:block;max-height:76vh;max-width:100%;margin:auto;border-radius:18px}}button{{background:#f3ce88;border:0;border-radius:20px;padding:10px 16px;margin:8px 5px;cursor:pointer;color:#40273a}}a{{color:#ffd688}}p{{color:#dbbdc9}}img{{max-width:100%}}</style>
<main><h1>谁动了我的小鱼干</h1><p>小雪 × 年糕 · 46 秒音乐喜剧试播版</p>
<video id="film" controls preload="metadata" src="yuki_fish_musical.mp4"></video>
<div>{buttons}</div><p>年糕越唱越无辜，嘴角却一直在出卖它。</p>
<p><a href="yuki_fish_musical.mp4">打开 MP4</a> · <a href="../storyboard/review_sheet.jpg">查看分镜</a></p></main></html>'''
    (ROOT/'output/review.html').write_text(page,encoding='utf-8')
    files=['assets/audio/song_v1.wav','assets/audio/song_master.wav','assets/audio/mixed.wav','assets/audio/voice_bus.wav',
           'assets/audio/voice_ref/yuki_reference.wav','assets/audio/voice_ref/mochi_reference.wav']
    files +=[str(p.relative_to(ROOT)).replace('\\','/') for p in sorted((ROOT/'assets/audio/voice_vc').glob('*.wav'))]
    files +=[str(p.relative_to(ROOT)).replace('\\','/') for p in sorted((ROOT/'assets/audio/dialogue').glob('*.mp3'))]
    provenance={'reference_episode':'yuki_morning_battle','yuki_reference_lines':[7,9,11,13],'mochi_reference_lines':[10,12,17],
        'voice_identity_accepted':False,'files':[{'path':p,'sha256':hashlib.sha256((ROOT/p).read_bytes()).hexdigest()} for p in files]}
    (ROOT/'config/source_provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
    print('output/review.html and source provenance written')
if __name__=='__main__':main()
