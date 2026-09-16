"""Send only the completed episode to an audio-visual review model."""
from pathlib import Path
import base64
import json
import os
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
video=ROOT/'output/yuki_beat_ad_v6.mp4'
# Upload a compact review copy: the full 60fps base64 payload can time out on
# slow uplinks; the review model only needs to see/hear the edit.
import subprocess
compact=ROOT/'output/_review_v6.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-i',str(video),'-vf','scale=360:640','-r','30','-c:v','libx264','-crf','30','-preset','fast','-c:a','aac','-b:a','96k',str(compact)],check=True)
prompt='''请观看并聆听这支短视频。它的目标是：在音乐主要重音处，Q版女孩突然换装、换表情、戴墨镜，并加入转圈、跳跃、摆手等俏皮舞蹈动作。V6 新增：糖果舞台→霓虹夜街→星空云海三段场景跳切（人物站位不变）、重音处的快速推近回弹（snap zoom）、三张 kinetic 字卡（「下一拍」「萌力全开」「你登场」）、场景切换处的色块擦过转场、dance 段的延迟残影分身。请做严格的视听评审，直接指出缺点，不需要夸奖。
仅根据视频中实际看到和听到的内容判断：场景跳切是否清晰可读、是否踩在重音上？snap zoom 是否增强节奏感还是显得突兀？字卡是否挡脸、停留是否够读？擦过转场方向是否自然？残影分身是否可辨、是否杂乱？是否有穿模、遮挡、丢人物等问题？哪里仍显得普通？
不需要精确毫秒判断，模型无法逐帧确认的项目应明说。输出中文，字段 music_observation, observed_scenes, observed_elements, sync_impression, card_readability, ghost_impression, visual_defects, remaining_weaknesses, fit_score_out_of_10。'''
payload={'model':'qwen3-omni-flash','modalities':['text'],'stream':True,
 'messages':[{'role':'user','content':[{'type':'video_url','video_url':{'url':'data:video/mp4;base64,'+base64.b64encode(compact.read_bytes()).decode()}},{'type':'text','text':prompt}]}]}
request=urllib.request.Request('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',data=json.dumps(payload).encode(),
 headers={'Authorization':'Bearer '+os.environ['DASHSCOPE_API_KEY'],'Content-Type':'application/json'})
answer=''
with urllib.request.urlopen(request,timeout=180) as response:
    for line in response:
        if not line.startswith(b'data:'):continue
        data=line[5:].strip()
        if data==b'[DONE]':break
        for c in json.loads(data).get('choices',[]):answer+=c.get('delta',{}).get('content') or ''
(ROOT/'storyboard/v6/model_av_review.txt').write_text(answer,encoding='utf-8')
print(answer)
