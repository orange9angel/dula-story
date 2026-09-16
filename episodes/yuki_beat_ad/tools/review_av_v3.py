"""Send only the completed episode to an audio-visual review model."""
from pathlib import Path
import base64
import json
import os
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
video=ROOT/'output/yuki_beat_ad_v3.mp4'
prompt='''请观看并聆听这支短视频。它的目标是：在音乐主要重音处，Q版女孩突然换一个可爱表情、戴墨镜或换衣服，形成可爱/装酷的反差。请做严格的视听评审，直接指出缺点，不需要夸奖。
仅根据视频中实际看到和听到的内容判断：音乐是连续背景铺陈还是有清晰落点与轻重停顿？你能数出哪些明显造型、配饰或表情变化？这些变化主观上是否与音乐合拍？是否有新造型被闪光/字幕挡住、衣服穿模、配饰遮错地方、旋转丢人物等问题？这是否有“等到那一下，人物忽然变样”的感觉？哪里仍显得普通？
不需要精确毫秒判断，模型无法逐帧确认的项目应明说。输出中文，字段 music_observation, observed_looks, sync_impression, visual_defects, remaining_weaknesses, fit_score_out_of_10。'''
payload={'model':'qwen3-omni-flash','modalities':['text'],'stream':True,
 'messages':[{'role':'user','content':[{'type':'video_url','video_url':{'url':'data:video/mp4;base64,'+base64.b64encode(video.read_bytes()).decode()}},{'type':'text','text':prompt}]}]}
request=urllib.request.Request('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',data=json.dumps(payload).encode(),
 headers={'Authorization':'Bearer '+os.environ['DASHSCOPE_API_KEY'],'Content-Type':'application/json'})
answer=''
with urllib.request.urlopen(request,timeout=180) as response:
    for line in response:
        if not line.startswith(b'data:'):continue
        data=line[5:].strip()
        if data==b'[DONE]':break
        for c in json.loads(data).get('choices',[]):answer+=c.get('delta',{}).get('content') or ''
(ROOT/'storyboard/v3/model_av_review.txt').write_text(answer,encoding='utf-8')
print(answer)
