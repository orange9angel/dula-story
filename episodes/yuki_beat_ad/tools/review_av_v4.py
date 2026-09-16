"""Send only the completed episode to an audio-visual review model."""
from pathlib import Path
import base64
import json
import os
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
video=ROOT/'output/yuki_beat_ad_v4.mp4'
prompt='''请观看并聆听这支短视频。它的目标是：在音乐主要重音处，Q版女孩突然换装、换表情、戴墨镜，并加入转圈、跳跃、摆手等俏皮舞蹈动作；背景是随服装换色的糖果色舞台，带渐变、彩纸、星星和光束。请做严格的视听评审，直接指出缺点，不需要夸奖。
仅根据视频中实际看到和听到的内容判断：音乐是连续背景铺陈还是有清晰落点与轻重停顿？你能数出哪些明显造型、配饰、表情或舞蹈动作变化？这些变化主观上是否与音乐合拍？转圈和跳跃是否踩点、是否自然？彩纸/星星/光束是否增强气氛还是显得杂乱？是否有穿模、遮挡、丢人物等问题？音乐是否俏皮可爱？哪里仍显得普通？
不需要精确毫秒判断，模型无法逐帧确认的项目应明说。输出中文，字段 music_observation, observed_looks, observed_moves, sync_impression, background_impression, visual_defects, remaining_weaknesses, fit_score_out_of_10。'''
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
(ROOT/'storyboard/v4/model_av_review.txt').write_text(answer,encoding='utf-8')
print(answer)
