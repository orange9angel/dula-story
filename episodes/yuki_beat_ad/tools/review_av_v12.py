"""Optional model-assisted playback review, using the existing episode provider.

Version labels and algorithm claims are removed from the submitted comparison.
This cannot replace human listening or measure millisecond offsets.
"""
from pathlib import Path
import base64
import json
import os
import subprocess
import urllib.request

ROOT=Path(__file__).resolve().parents[1]

def main():
    key=os.environ.get('DASHSCOPE_API_KEY')
    if not key:raise SystemExit('DASHSCOPE_API_KEY is required for optional audiovisual review.')
    video=ROOT/'output/yuki_lips_v11_v12_compare.mp4'
    compact=ROOT/'output/_review_lips_v12.mp4'
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(video),'-vf','crop=960:640:0:60,scale=720:480',
        '-r','30','-c:v','libx264','-crf','25','-c:a','aac','-b:a','128k',str(compact)],check=True)
    prompt='''请正常速度观看并聆听这段约10秒、同一歌曲、左右并排的Q版角色唱歌对比。
两列的动作、镜头相同，可能有口型差异，也可能没有明显可辨差异。请不猜版本或作者预期。
只评价嘴部开闭与听见的歌声是否对应：人声开始、停顿、长元音、闭唇动作是否自然。
分别指出左右可观察的问题；如果两者难以分辨就明确说“证据不足”，不要勉强选。
无需给毫秒误差，你无法据此精确计时。歌曲字幕可以参考，但不能以字幕匹配代替听声。
输出JSON: heard_lyrics_excerpt, left_observation, right_observation,
preferred(left/right/indistinguishable), confidence(low/medium/high),
remaining_issues, limitation。避免夸奖。'''
    payload={'model':'qwen3-omni-flash','modalities':['text'],'stream':True,
        'messages':[{'role':'user','content':[{'type':'video_url','video_url':{'url':'data:video/mp4;base64,'+base64.b64encode(compact.read_bytes()).decode()}},
                                            {'type':'text','text':prompt}]}]}
    request=urllib.request.Request('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        data=json.dumps(payload).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
    answer=''
    with urllib.request.urlopen(request,timeout=150) as response:
        for line in response:
            if not line.startswith(b'data:'):continue
            data=line[5:].strip()
            if data==b'[DONE]':break
            for choice in json.loads(data).get('choices',[]):answer+=choice.get('delta',{}).get('content') or ''
    (ROOT/'storyboard/v12/model_av_review.txt').write_text(answer,encoding='utf-8')
    print(answer)

if __name__=='__main__':main()
