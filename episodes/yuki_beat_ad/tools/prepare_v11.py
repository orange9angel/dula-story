"""Author lyric-specific performance beats without changing V10 audio/visemes."""
from pathlib import Path
import hashlib
import json
import shutil
from prepare_v2 import stamp

ROOT = Path(__file__).resolve().parents[1]


def main():
    music = json.loads((ROOT/'config/music_analysis_v10.json').read_text(encoding='utf-8'))
    chars, lines = music['lyric_chars'], music['lyric_lines']
    def at(li, text):
        i = lines[li]['text'].replace(' ', '').index(text)
        return chars[lines[li]['char0']+i]['start']
    # Starts are song observations; performance intention is authored explicitly.
    specs = [
        (0, 'beckon', 0, 'inviting', 'audience', 'none', at(0,'拍'), 'medium', '手掌向观众招两下，眉毛上挑，点头请你跟拍'),
        (at(0,'跟我'), 'come_along', 0, 'cheeky', 'audience', 'none', at(0,'来'), 'wide', '两手向自己招呼，侧身碎步，回头邀请'),
        (at(1,'迈'), 'tiny_steps', 1, 'playful', 'feet', 'footsteps', at(1,'步'), 'wide', '低头看脚，轻快踏两小步，抬头得意'),
        (at(1,'快乐'), 'joy_expand', 1, 'delight', 'hands', 'joy', at(1,'大'), 'medium', '双手胸前捧住快乐，屈膝蓄势，在大字张臂放大'),
        (at(2,'转'), 'twirl', 2, 'playful', 'audience', 'orbit', at(2,'圈'), 'wide', '手臂先收后打开，完整转圈，膝盖软着陆'),
        (at(2,'世界'), 'light_world', 2, 'wonder', 'hands', 'starlight', at(2,'光'), 'medium', '眼神追随手掌，捧光向上展开，惊喜睁眼'),
        (at(3,'小雪'), 'introduce', 3, 'proud', 'audience', 'none', at(3,'登'), 'medium', '指向自己，抬下巴，俏皮眨眼后亮相'),
        (at(3,'心'), 'heart', 3, 'tender', 'hands', 'heart', at(3,'跳'), 'medium', '两手护在心口，心形随胸口起伏'),
        (at(3,'打'), 'clap', 3, 'joyful', 'hands', 'clap', at(3,'拍'), 'medium', '从心口张手再合掌打拍，肩膀和膝盖同拍回弹'),
        (at(4,'左'), 'step_left', 4, 'mischief', 'left', 'footsteps', at(4,'步'), 'wide', '先看左方再移步，左手领路，右肩反向摆'),
        (at(4,'右'), 'step_right', 4, 'mischief', 'right', 'footsteps', at(4,'右')+.18, 'wide', '眼神换到右方，再右移并收脚，动作做成呼应'),
        (at(4,'节奏'), 'air_drums', 4, 'focused', 'hands', 'rhythm', at(4,'奏'), 'wide', '左右手交替敲虚拟鼓点，配合膝盖律动'),
        (at(4,'自己'), 'take_control', 4, 'confident', 'audience', 'rhythm', at(4,'握'), 'medium', '先指自己再握拳收回，挑眉表示节奏由我掌握'),
        (at(5,'跳'), 'hop', 5, 'excited', 'audience', 'landing', at(5,'跳'), 'wide', '先蹲再轻快跳起，手臂上扬，落在鼓点'),
        (at(5,'转'), 'twirl', 5, 'cheeky', 'audience', 'orbit', at(5,'转'), 'wide', '接跳跃收势转一整圈，甩开双臂亮相'),
        (at(5,'每'), 'sparkle', 5, 'delight', 'hands', 'sparkles', at(5,'闪'), 'wide', '左右斜上方交替点星，身体反向摆，眼睛随手追光'),
        (at(6,'跟'), 'beckon', 6, 'inviting', 'audience', 'none', at(6,'拍'), 'medium', '主动探身邀请，再用点头把观众带回拍子'),
        (at(6,'把'), 'sing_joy', 6, 'belting', 'audience', 'notes', at(6,'唱'), 'close', '手从胸前向外送出快乐，抬眉唱出，再闭眼陶醉'),
        (at(7,'下'), 'count_in', 7, 'expectant', 'audience', 'none', at(7,'拍'), 'medium', '竖起手指提醒下一拍，歪头等观众接棒'),
        (at(7,'你'), 'your_stage', 7, 'warm', 'right', 'spotlight', at(7,'登'), 'wide', '向左侧让位，双手把右侧空舞台介绍给观众'),
        (at(7,'和'), 'together', 7, 'joyful', 'audience', 'joy', at(7,'我'), 'wide', '伸手拉近观众，再回到中心做两拍摇摆'),
        (at(7,'起'), 'cheer', 7, 'triumph', 'audience', 'landing', at(7,'嗨'), 'wide', '蹲下蓄势，嗨字举手跃起，落地后笑着收势'),
        (28.485, 'finale', 7, 'warm', 'audience', 'none', 28.68, 'medium', '手掌挥别，眨眼，停在开心的闭嘴笑'),
    ]
    outfits=['original','sailor','sailor','princess','sunny','sunny','bunny','original']
    scenes=['diva','diva','star','diva','neon','neon','star','diva']
    cues,blocks=[],[]
    for i,(start,move,li,emotion,focus,motif,hit,shot,intent) in enumerate(specs):
        end=specs[i+1][0] if i+1<len(specs) else music['duration']
        assert end-start>.1
        role='chorus' if li in (4,5) else 'outro' if move=='finale' else 'bridge' if li==6 else 'verse'
        contacts=[b for b in music['beat_grid']['beats'] if start+.12<b<end-.045]
        land=min(contacts,key=lambda b:abs(b-(start+.25))) if contacts else end-.06
        if move=='cheer':land=28.305
        cue=dict(start=round(start,3),end=round(end,3),move=move,line=li,emotion=emotion,focus=focus,
                 motif=motif,hit=round(hit,3),land=round(land,3),shot=shot,intent=intent,
                 outfit=outfits[li],scene=scenes[li],role=role)
        cues.append(cue)
        opts=dict(pose='finale' if move=='finale' else 'hello',duration=f'{end-start:.3f}',
                  expression='smile',emotion=emotion,focus=focus,motif=motif,hit=cue['hit'],land=cue['land'],
                  edit='hold',outfit=outfits[li],accessory='none',gesture='ta_da',move=move,
                  outgoing='none',scene=scenes[li],snap=0,card='安可' if move=='finale' else 'none',
                  swipe='none',ghost=0,shot=shot,line=li,role=role)
        prefix=('@BeatStudioScene\n{Position:Yuki|x=0|y=-0.03|z=0|face=forward}\n'
                f'{{Music:Play|name=mixed_v11|endTime={music["duration"]}|baseVolume=1|fadeIn=0|fadeOut=0}}\n') if i==0 else ''
        tags='|'.join(f'{k}={v}' for k,v in opts.items())
        blocks.append(f'{i+1}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
                      f'{{Event:Animate|character=Yuki|action=AdPose|{tags}}}\n{{Camera:AdCamera|shot=hello}}')
    (ROOT/'script_v11.story').write_text('\n\n'.join(blocks)+'\n',encoding='utf-8')
    source=ROOT/'assets/audio/mixed_v10.wav'
    assert hashlib.sha256(source.read_bytes()).hexdigest()==music['master_sha256']
    shutil.copyfile(source,ROOT/'assets/audio/mixed_v11.wav')
    shutil.copyfile(source,ROOT/'assets/audio/music/mixed_v11.wav')
    plan=dict(audio_analysis='config/music_analysis_v10.json',master_sha256=music['master_sha256'],
              duration=music['duration'],timeline_source='script_v11.story',cues=cues,
              sections=[dict(start=c['start'],end=c['end'],label=c['role'],energy=1) for c in cues],
              review_limit='Authored expressiveness and semantic gestures require user playback review.')
    (ROOT/'config/performance_plan_v11.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'V11: {len(cues)} performance phrases; identical V10 audio and lip alignment')
    for c in cues:print(f"{c['start']:6.3f} {c['move']:14s} {c['emotion']:10s} {c['intent']}")


if __name__=='__main__':main()
