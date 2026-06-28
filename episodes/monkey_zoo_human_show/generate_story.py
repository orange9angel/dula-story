#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate script.story for monkey_zoo_human_show with real human-animal interaction."""
import pathlib


def fmt_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds % 1) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def anim(name, character):
    return f"{{Animation:{name}|character={character}}}"


def face(name, character):
    return anim(name, character)


def srt_block(idx, start, end, scene, speaker, speaker_anim, dialogue, actions=None, camera=None, sfx=None):
    actions = actions or []
    out = []
    out.append(str(idx))
    out.append(f"{fmt_time(start)} --> {fmt_time(end)}")
    if scene:
        out.append(f"@{scene}")
    if camera:
        out.append(camera)
    if sfx:
        if isinstance(sfx, list):
            out.extend(sfx)
        else:
            out.append(sfx)
    if speaker and dialogue:
        if speaker_anim:
            out.append(f"[{speaker}]{{{speaker_anim}}}{dialogue}")
        else:
            out.append(f"[{speaker}]{dialogue}")
    for a in actions:
        out.append(a)
    return "\n".join(out) + "\n\n"


def main():
    out = []
    idx = 1

    # ===== SCENE 1: Monkey Hill (ERScene) =====
    out.append(srt_block(idx, 0.0, 5.0, "ERScene",
        "VisitorYusuke", "PointForward", "快看！那只橙毛的家伙在瞪我！",
        actions=[
            "{Music:Play|name=office_theme|fadeIn=0.8|baseVolume=0.28|endTime=125.0}",
            "{SFX:Play|name=zoo_crowd|startTime=0|endTime=125.0|baseVolume=0.14}",
            "{SFX:Play|name=jungle_birds|startTime=0|endTime=125.0|baseVolume=0.08}",
            "{Position:Bai|x=-3.05|y=0.01|z=0.55|face=VisitorKurama}",
            "{Position:Wen|x=2.95|y=0.01|z=0.62|face=VisitorKeiko}",
            "{Position:Cheng|x=-5.25|y=0.01|z=0.78|face=VisitorYusuke}",
            "{Position:Lan|x=5.25|y=0.01|z=0.82|face=VisitorHiei}",
            "{Position:XiaoMi|x=0.25|y=0.01|z=0.92|face=VisitorKuwabara}",
            "{Position:VisitorYusuke|x=-5.85|y=0.01|z=2.18|face=Cheng}",
            "{Position:VisitorKurama|x=-3.45|y=0.01|z=2.35|face=Bai}",
            "{Position:VisitorKuwabara|x=-0.65|y=0.01|z=2.28|face=XiaoMi}",
            "{Position:VisitorKeiko|x=3.35|y=0.01|z=2.32|face=Wen}",
            "{Position:VisitorHiei|x=5.95|y=0.01|z=2.12|face=Lan}",
            "{Camera:TwoShot|characterA=VisitorYusuke|characterB=Cheng|distance=3.8|height=1.9|bias=0}",
            anim("Stare", "Cheng"),
            face("FaceAnnoyed", "Cheng"),
            face("FaceRelaxed", "Bai"),
            anim("CrossArms", "Bai"),
        ]))
    idx += 1

    out.append(srt_block(idx, 5.5, 10.0, None,
        "VisitorYusuke", "PointForward", "你过来啊！比划比划！",
        camera="{Camera:OverShoulder|target=VisitorYusuke|shooter=Cheng|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            anim("TakePhoto", "VisitorKurama"),
            face("FaceAngry", "Cheng"),
            anim("Flex", "Cheng"),
        ]))
    idx += 1

    out.append(srt_block(idx, 10.5, 15.5, None,
        "VisitorKurama", "TakePhoto", "别吵，这只白脸的很上镜。",
        camera="{Camera:OverShoulder|target=VisitorKurama|shooter=Bai|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            face("FaceProud", "Bai"),
            anim("SlowNod", "Bai"),
            anim("CrossArms", "VisitorYusuke"),
        ]))
    idx += 1

    out.append(srt_block(idx, 16.0, 21.0, None,
        "VisitorKuwabara", "SelfiePose", "来，跟我合个影，记得笑！",
        camera="{Camera:OverShoulder|target=VisitorKuwabara|shooter=XiaoMi|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            face("FaceGrin", "XiaoMi"),
            anim("PanicWave", "XiaoMi"),
            anim("Laugh", "VisitorKeiko"),
        ]))
    idx += 1

    out.append(srt_block(idx, 21.5, 27.0, None,
        "VisitorKeiko", "EatPopcorn", "你们想吃吗？可惜玻璃隔着呢。",
        camera="{Camera:OverShoulder|target=VisitorKeiko|shooter=Wen|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            face("FaceExcited", "Wen"),
            anim("NoseTwitch", "Wen"),
            anim("CrossArms", "VisitorHiei"),
        ]))
    idx += 1

    out.append(srt_block(idx, 27.5, 33.0, None,
        "VisitorHiei", "Stare", "……那只蓝的，眼神还行。",
        camera="{Camera:OverShoulder|target=VisitorHiei|shooter=Lan|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            face("FaceSmirk", "Lan"),
            anim("MandrillStrut", "Lan"),
            anim("Surprised", "VisitorYusuke"),
        ]))
    idx += 1

    out.append(srt_block(idx, 33.5, 38.0, None,
        "VisitorYusuke", "Laugh", "呜叽叽！我学得像不像？",
        camera="{Camera:Static|position=0,3.2,7.8|lookAt=0,1.2,0.0}",
        actions=[
            face("FaceConfused", "Cheng"),
            anim("OrangutanWalk", "Cheng"),
            face("FaceFacepalm", "Bai"),
            anim("Facepalm", "Bai"),
            anim("Laugh", "VisitorKeiko"),
        ]))
    idx += 1

    out.append(srt_block(idx, 38.5, 43.0, None,
        "VisitorKurama", "TakePhoto", "三、二、一——",
        camera="{Camera:Static|position=0,3.0,8.5|lookAt=0,1.2,0.0}",
        actions=[
            face("FaceHappy", "Bai"),
            anim("CrossArms", "Bai"),
            face("FaceHappy", "Wen"),
            anim("NoseTwitch", "Wen"),
            face("FaceHappy", "Cheng"),
            anim("Flex", "Cheng"),
            face("FaceSmirk", "Lan"),
            anim("Stare", "Lan"),
            face("FaceExcited", "XiaoMi"),
            anim("Celebrate", "XiaoMi"),
            anim("SelfiePose", "VisitorKuwabara"),
            "{SFX:Play|name=camera_shutter|volume=0.42}",
        ]))
    idx += 1

    # ===== SCENE 2: Glass Viewing (HospitalCorridorScene) =====
    out.append(srt_block(idx, 43.0, 46.0, "HospitalCorridorScene",
        "VisitorYusuke", "KnockGlass", "喂！里面听得见吗？",
        camera="{Camera:Static|position=0,3.0,7.0|lookAt=0,1.2,0.0}",
        actions=[
            "{Music:Play|name=tension_theme|fadeIn=0.7|baseVolume=0.26|endTime=125.0}",
            "{Position:Bai|x=-3.05|y=0.01|z=0.55|face=VisitorKurama}",
            "{Position:Wen|x=2.95|y=0.01|z=0.62|face=VisitorKeiko}",
            "{Position:Cheng|x=-5.25|y=0.01|z=0.78|face=VisitorYusuke}",
            "{Position:Lan|x=5.25|y=0.01|z=0.82|face=VisitorHiei}",
            "{Position:XiaoMi|x=0.25|y=0.01|z=0.92|face=VisitorKuwabara}",
            "{Position:VisitorYusuke|x=-5.85|y=0.01|z=2.18|face=Cheng}",
            "{Position:VisitorKurama|x=-3.45|y=0.01|z=2.35|face=Bai}",
            "{Position:VisitorKuwabara|x=-0.65|y=0.01|z=2.28|face=XiaoMi}",
            "{Position:VisitorKeiko|x=3.35|y=0.01|z=2.32|face=Wen}",
            "{Position:VisitorHiei|x=5.95|y=0.01|z=2.12|face=Lan}",
            face("FaceAngry", "Cheng"),
            anim("ShakeFist", "Cheng"),
        ]))
    idx += 1

    out.append(srt_block(idx, 46.5, 51.0, None,
        "Cheng", "ShakeFist", "再敲，我把你写进黑名单。",
        camera="{Camera:OverShoulder|target=Cheng|shooter=VisitorYusuke|distance=9.0|height=1.55|lookAtHeight=1.35|shoulderOffset=2.0|fov=19}",
        actions=[
            anim("Surprised", "VisitorYusuke"),
            anim("CrossArms", "VisitorHiei"),
        ]))
    idx += 1

    out.append(srt_block(idx, 51.5, 56.0, None,
        "VisitorKuwabara", "Laugh", "比肌肉？我可没输过！",
        camera="{Camera:OverShoulder|target=VisitorKuwabara|shooter=XiaoMi|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            face("FaceDetermined", "Cheng"),
            anim("Flex", "Cheng"),
            anim("Laugh", "VisitorKeiko"),
        ]))
    idx += 1

    out.append(srt_block(idx, 56.5, 61.5, None,
        "VisitorKurama", "TakePhoto", "你好像……在思考什么。",
        camera="{Camera:OverShoulder|target=VisitorKurama|shooter=Bai|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            face("FaceSly", "Bai"),
            anim("MagnifyInspect", "Bai"),
            anim("SlowNod", "VisitorKurama"),
        ]))
    idx += 1

    out.append(srt_block(idx, 62.0, 67.0, None,
        "VisitorKeiko", "WaveHand", "你好呀，小猴子。",
        camera="{Camera:OverShoulder|target=VisitorKeiko|shooter=Wen|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            face("FaceHappy", "XiaoMi"),
            anim("WaveHand", "XiaoMi"),
            anim("Stare", "VisitorHiei"),
        ]))
    idx += 1

    out.append(srt_block(idx, 67.5, 72.0, None,
        "VisitorHiei", "CrossArms", "……有点意思。",
        camera="{Camera:OverShoulder|target=VisitorHiei|shooter=Lan|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            face("FaceAngry", "Lan"),
            anim("Stare", "Lan"),
            anim("Laugh", "VisitorYusuke"),
        ]))
    idx += 1

    out.append(srt_block(idx, 72.5, 77.0, None,
        "VisitorYusuke", "KnockGlass", "一起喊，它们会理我们吗？",
        camera="{Camera:Static|position=0,3.0,7.0|lookAt=0,1.2,0.0}",
        actions=[
            anim("KnockGlass", "VisitorKuwabara"),
            anim("KnockGlass", "VisitorKeiko"),
            face("FaceAnnoyed", "Bai"),
            anim("CrossArms", "Bai"),
            face("FaceDisgusted", "Wen"),
            anim("Sniff", "Wen"),
            face("FaceAngry", "Cheng"),
            anim("ShakeFist", "Cheng"),
            face("FaceAngry", "Lan"),
            anim("Stare", "Lan"),
            face("FaceAnnoyed", "XiaoMi"),
            anim("HandsOnHips", "XiaoMi"),
            "{SFX:Play|name=visitor_laugh|volume=0.28}",
        ]))
    idx += 1

    out.append(srt_block(idx, 77.5, 82.0, None,
        "Bai", "TurnAround", "人类，幼稚。",
        camera="{Camera:Static|position=0,3.0,6.5|lookAt=0,1.2,0.0}",
        actions=[
            face("FaceBored", "Bai"),
            face("FaceDisgusted", "Wen"),
            anim("TurnAround", "Wen"),
            face("FaceAnnoyed", "Cheng"),
            anim("TurnAround", "Cheng"),
            face("FaceAngry", "Lan"),
            anim("TurnAround", "Lan"),
            face("FaceSly", "XiaoMi"),
            anim("TurnAround", "XiaoMi"),
            anim("Surprised", "VisitorYusuke"),
            anim("Surprised", "VisitorKeiko"),
        ]))
    idx += 1

    out.append(srt_block(idx, 82.5, 87.0, None,
        "VisitorKeiko", "WaveHand", "对不起对不起，我们不敲了。",
        camera="{Camera:OverShoulder|target=VisitorKeiko|shooter=Wen|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            anim("Shrug", "VisitorYusuke"),
            anim("SlowNod", "VisitorKurama"),
        ]))
    idx += 1

    out.append(srt_block(idx, 87.5, 92.0, None,
        "VisitorYusuke", "ReachOut", "喏，香蕉，赔罪。",
        camera="{Camera:OverShoulder|target=VisitorYusuke|shooter=Cheng|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            face("FaceHappy", "Cheng"),
            anim("TurnAround", "Cheng"),
            face("FaceExcited", "XiaoMi"),
            anim("TurnAround", "XiaoMi"),
            face("FaceHappy", "Wen"),
            anim("NoseTwitch", "Wen"),
            face("FaceSmirk", "Bai"),
            anim("SlowNod", "Bai"),
            face("FaceSmirk", "Lan"),
            anim("Stare", "Lan"),
        ]))
    idx += 1

    # ===== SCENE 3: Human Exhibit (ReceptionScene) =====
    out.append(srt_block(idx, 92.0, 95.0, "ReceptionScene",
        "XiaoMi", "DramaticPose", "现在，轮到我们观察人类了。",
        camera="{Camera:Static|position=0,3.3,8.0|lookAt=0,1.25,-0.5}",
        actions=[
            "{Music:Play|name=ending_theme|fadeIn=0.8|baseVolume=0.28|endTime=125.0}",
            "{SFX:Play|name=monkey_applause|volume=0.32}",
            "{Position:Bai|x=-3.05|y=0.01|z=-0.55|face=VisitorKurama}",
            "{Position:Wen|x=2.95|y=0.01|z=-0.62|face=VisitorKeiko}",
            "{Position:Cheng|x=-5.25|y=0.01|z=-0.35|face=VisitorYusuke}",
            "{Position:Lan|x=5.25|y=0.01|z=-0.42|face=VisitorHiei}",
            "{Position:XiaoMi|x=0.25|y=0.01|z=-0.28|face=VisitorKuwabara}",
            "{Position:VisitorYusuke|x=-5.85|y=0.01|z=2.25|face=Cheng}",
            "{Position:VisitorKurama|x=-3.45|y=0.01|z=2.45|face=Bai}",
            "{Position:VisitorKuwabara|x=-0.65|y=0.01|z=2.35|face=XiaoMi}",
            "{Position:VisitorKeiko|x=3.35|y=0.01|z=2.48|face=Wen}",
            "{Position:VisitorHiei|x=5.95|y=0.01|z=2.22|face=Lan}",
            face("FaceProud", "XiaoMi"),
            anim("Surprised", "VisitorYusuke"),
        ]))
    idx += 1

    out.append(srt_block(idx, 95.5, 98.5, None,
        "Bai", "CrossArms", "这个黑头发的，情绪最不稳重。",
        camera="{Camera:OverShoulder|target=Bai|shooter=VisitorKurama|distance=9.0|height=1.55|lookAtHeight=1.35|shoulderOffset=2.0|fov=19}",
        actions=[
            face("FaceSmirk", "Bai"),
            anim("SlowNod", "VisitorKurama"),
        ]))
    idx += 1

    out.append(srt_block(idx, 98.5, 101.0, None,
        "VisitorYusuke", "AngryShake", "你说谁不稳重！",
        camera="{Camera:OverShoulder|target=VisitorYusuke|shooter=Cheng|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            anim("Laugh", "VisitorKuwabara"),
        ]))
    idx += 1

    out.append(srt_block(idx, 101.0, 104.0, None,
        "Wen", "NoseTwitch", "这个金毛的，身上有爆米花香和一点点慌。",
        camera="{Camera:OverShoulder|target=Wen|shooter=VisitorKeiko|distance=9.0|height=1.55|lookAtHeight=1.35|shoulderOffset=2.0|fov=19}",
        actions=[
            face("FaceProud", "Wen"),
            anim("Laugh", "VisitorKeiko"),
        ]))
    idx += 1

    out.append(srt_block(idx, 104.0, 106.5, None,
        "VisitorKuwabara", "Surprised", "你、你闻得出来？",
        camera="{Camera:OverShoulder|target=VisitorKuwabara|shooter=XiaoMi|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            anim("Laugh", "VisitorKeiko"),
        ]))
    idx += 1

    out.append(srt_block(idx, 106.5, 109.5, None,
        "Cheng", "Flex", "那个小姑娘最礼貌，我给四颗香蕉。",
        camera="{Camera:OverShoulder|target=Cheng|shooter=VisitorYusuke|distance=9.0|height=1.55|lookAtHeight=1.35|shoulderOffset=2.0|fov=19}",
        actions=[
            face("FaceHappy", "Cheng"),
            anim("CrossArms", "VisitorHiei"),
        ]))
    idx += 1

    out.append(srt_block(idx, 109.5, 112.0, None,
        "VisitorKeiko", "WaveHand", "谢谢……？",
        camera="{Camera:OverShoulder|target=VisitorKeiko|shooter=Wen|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            anim("SlowNod", "VisitorKurama"),
        ]))
    idx += 1

    out.append(srt_block(idx, 112.0, 115.0, None,
        "Lan", "Stare", "黑衣小子，你刚才瞪我？",
        camera="{Camera:OverShoulder|target=Lan|shooter=VisitorHiei|distance=9.0|height=1.55|lookAtHeight=1.35|shoulderOffset=2.0|fov=19}",
        actions=[
            face("FaceAngry", "Lan"),
            anim("CrossArms", "VisitorHiei"),
        ]))
    idx += 1

    out.append(srt_block(idx, 115.0, 117.5, None,
        "VisitorHiei", "CrossArms", "……是你在瞪我。",
        camera="{Camera:OverShoulder|target=VisitorHiei|shooter=Lan|distance=1.9|height=1.6|lookAtHeight=1.5|shoulderOffset=1.0}",
        actions=[
            anim("Laugh", "VisitorYusuke"),
        ]))
    idx += 1

    out.append(srt_block(idx, 117.5, 123.0, None,
        "VisitorKurama", "TakePhoto", "最后一张，茄子。",
        camera="{Camera:Static|position=0,3.0,8.0|lookAt=0,1.2,0.0}",
        actions=[
            face("FaceHappy", "XiaoMi"),
            anim("Celebrate", "XiaoMi"),
            face("FaceHappy", "Bai"),
            anim("CrossArms", "Bai"),
            face("FaceGrin", "Wen"),
            anim("NoseTwitch", "Wen"),
            face("FaceHappy", "Cheng"),
            anim("Flex", "Cheng"),
            face("FaceSmirk", "Lan"),
            anim("Stare", "Lan"),
            anim("Laugh", "VisitorYusuke"),
            anim("SelfiePose", "VisitorKuwabara"),
            anim("WaveHand", "VisitorKeiko"),
            anim("Stare", "VisitorHiei"),
            "{SFX:Play|name=camera_shutter|volume=0.45}",
        ]))
    idx += 1

    story_path = pathlib.Path('dula-story/episodes/monkey_zoo_human_show/script.story')
    story_path.write_text("".join(out), encoding='utf-8', newline='')
    print(f"Wrote {idx - 1} entries to {story_path}")


if __name__ == '__main__':
    main()
