"""Optional audiovisual review. Does not count as user acceptance."""
from pathlib import Path
import os,json,base64,urllib.request,subprocess
ROOT=Path(__file__).resolve().parents[1]
def main():
    key=os.environ.get('DASHSCOPE_API_KEY')
    if not key:raise SystemExit('DASHSCOPE_API_KEY is required')
    video=ROOT/'output/yuki_fish_musical.mp4';compact=ROOT/'output/_review.mp4'
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(video),'-vf','scale=360:640','-r','24','-c:v','libx264','-crf','26','-c:a','aac','-b:a','96k',str(compact)],check=True)
    prompt='''正常速度观看并听完这部46秒音乐喜剧。不要根据字幕推断听到的内容。
请给出 JSON：heard_dialogue（实际听到的五句对白）、heard_song_summary（两段歌词内容）、
story_readability（空盘、嘴边碎屑、狡辩、洗碗结尾是否在画面成立）、
voice_and_mix（对白、两段歌声是否可辨、突兀切断/残留双人声/机械音情况）、
lip_sync（分别评小雪、猫，可辨问题举时间段，不要编精确毫秒）、
visual_issues、blocking_issues（确切看到的问题）、limitations。不要因为任务已完成而夸奖。
这只是程序角色样片，诚实指出不足，不要给出音色相似度分数。'''
    payload={'model':'qwen3-omni-flash','modalities':['text'],'stream':True,'messages':[{'role':'user','content':[
        {'type':'video_url','video_url':{'url':'data:video/mp4;base64,'+base64.b64encode(compact.read_bytes()).decode()}},
        {'type':'text','text':prompt}]}]}
    req=urllib.request.Request('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',data=json.dumps(payload).encode(),
        headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
    answer=''
    with urllib.request.urlopen(req,timeout=160) as response:
        for line in response:
            if not line.startswith(b'data:'):continue
            data=line[5:].strip()
            if data==b'[DONE]':break
            for c in json.loads(data).get('choices',[]):answer+=c.get('delta',{}).get('content') or ''
    (ROOT/'storyboard/model_av_review.txt').write_text(answer,encoding='utf-8');print(answer)
if __name__=='__main__':main()
