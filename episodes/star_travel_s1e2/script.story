1
00:00:00,000 --> 00:00:06,048
@AlienPlanetScene
{Music:Play|name=alien_calm_loop|fadeIn=2.0|baseVolume=0.25|endTime=35.0}
{SceneDirector:Formation|type=diamond|center=0,0,0|radius=2|focus=Zorak}
{SceneDirector:Gaze|mode=auto}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Zorak}{Walk}
[Zorak] 这里的空气比昨天更清新了。Rex，你确定这条路对吗？
{Camera:Static|position=0,1.8,6|lookAt=0,1.0,0}


2
00:00:06,548 --> 00:00:11,228
[Rex] 当然。我在这颗星球上生活了三百年。
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Rex}{HandsOnHips}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}


3
00:00:11,728 --> 00:00:15,016
[Klaw] 三百年？！你看起来像个孩子！
{Klaw}{FaceSurprised}
{Klaw}{SurprisedJump}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.4}


4
00:00:15,516 --> 00:00:22,740
[Rex] 晶体生物的老化速度和你们不一样。三百年，对我们来说只是少年。
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{Rex}{Shrug}
{Camera:TwoShot|position=0,1.6,4|lookAt=0,1.0,0}


5
00:00:23,240 --> 00:00:27,104
[Vex] 前面有能量反应。很强的能量反应。
{Vex}{FaceConfused}
{Vex}{FaceBlink}
{Vex}{LookAround}
{Camera:Static|position=-2,1.5,4|lookAt=0,1.0,0}


6
00:00:27,604 --> 00:00:31,060
[Zorak] 多强？比Rex还强吗？
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Zorak}{CrossArms}
{Camera:Static|position=2,1.5,4|lookAt=0,1.0,0}


7
00:00:31,560 --> 00:00:42,960
[Vex] 不一样。Rex的能量是温暖的，像阳光。但这个...是冰冷的，像深渊。
{Vex}{FaceSad}
{Vex}{FaceBlink}
{Vex}{Shrug}
{FXBioluminescentPulse|character=Vex}
{Camera:CloseUp|target=Vex|distance=2.5|height=1.4}


8
00:00:43,460 --> 00:00:48,332
[Rex] 那是禁地。我们晶体生物从不靠近那里。
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{Rex}{FightingStance}
{Camera:FightDramatic|target=Rex|distance=4|height=1.2}


9
00:00:48,832 --> 00:00:53,152
[Klaw] 禁地？听起来很刺激！我们去看看吧！
{Klaw}{FaceHappy}
{Klaw}{FaceBlink}
{Klaw}{Run}
{Camera:Static|position=2,1.5,4|lookAt=0,1.0,0}


10
00:00:53,652 --> 00:00:56,844
[Rex] 等等！那里真的很危险！
{Rex}{FaceAngry}
{Rex}{FaceBlink}
{Rex}{PointForward}
{SFX:Play|name=wind_strong}
{Camera:FightWide|distance=6|height=2}


11
00:00:57,344 --> 00:01:01,344
{Zorak}{Walk}
{Klaw}{Walk}
{Vex}{Walk}
{Rex}{Walk}
{Event:Move|character=Zorak|x=-2|z=-3|duration=2.5}
{Event:Move|character=Klaw|x=2|z=-3|duration=2.5}
{Event:Move|character=Vex|x=0|z=-4|duration=2.5}
{Event:Move|character=Rex|x=0|z=-2|duration=2.5}
{Transition:Fade|duration=1.5}
{Camera:Pan|from=0,2,8|to=0,2,2|duration=3.0}


12
00:00:57,344 --> 00:01:00,152
@CrystalCaveScene
{Music:Play|name=alien_mystery|fadeIn=1.5|baseVolume=0.3|endTime=20.0}
{SceneDirector:Formation|type=line|center=0,0,-1|radius=1.5|spacing=1.5|face=back}
{SceneDirector:Gaze|mode=auto}
{Zorak}{FaceSurprised}
{Zorak}{FaceBlink}
{Zorak}{LookAround}
[Zorak] 这是...水晶洞穴？
{Camera:Static|position=0,1.8,6|lookAt=0,1.0,0}


13
00:01:00,652 --> 00:01:06,844
[Klaw] 哇！这些水晶比Rex还漂亮！
{Klaw}{FaceHappy}
{Klaw}{FaceBlink}
{Klaw}{ClapHands}
{FXCrystalShards|character=Klaw}
{Camera:LowAngle|target=Klaw|distance=4|height=0.5}


14
00:01:07,344 --> 00:01:14,904
[Vex] 小心！这些水晶在吸收我们的能量！
{Vex}{FaceSurprised}
{Vex}{FaceBlink}
{Vex}{Shrug}
{FXEnergyAura|character=Vex}
{Camera:ReactionShot|target=Vex|distance=2.5|height=1.4}


15
00:01:15,404 --> 00:01:18,692
[Zorak] 快退后！这些水晶不对劲！
{Zorak}{FaceAngry}
{Zorak}{FaceBlink}
{Zorak}{PointForward}
{Rex}{FaceDetermined}
{Rex}{FightingStance}
{SFX:Play|name=energy_charge}
{Camera:FightDramatic|target=Zorak|distance=4|height=1.2}


16
00:01:19,192 --> 00:01:23,192
{Event:Move|character=Zorak|x=0|z=2|duration=1.0}
{Zorak}{Run}
{Event:Move|character=Klaw|x=0|z=2|duration=1.0}
{Klaw}{Run}
{Event:Move|character=Vex|x=0|z=2|duration=1.0}
{Vex}{Run}
{Event:Move|character=Rex|x=0|z=2|duration=1.0}
{Rex}{Run}
{SFX:Play|name=dash_whoosh}
{Camera:FightWide|distance=8|height=2.5}


17
00:01:19,192 --> 00:01:24,448
[Klaw] 怎么回事？！我动不了了！
{Klaw}{FacePain}
{Klaw}{FaceBlink}
{Klaw}{FlailArms}
{FXEnergyAura|character=Klaw}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.5}


18
00:01:24,948 --> 00:01:33,084
[Vex] 水晶在束缚我们！它们在...在读取我们的记忆！
{Vex}{FaceSurprised}
{Vex}{FaceBlink}
{Vex}{FacePain}
{FXBioluminescentPulse|character=Vex}
{Camera:CloseUp|target=Vex|distance=2.5|height=1.4}


19
00:01:33,584 --> 00:01:37,472
[Zorak] Rex！你知道怎么对付这些水晶吗？
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Zorak}{FightingStance}
{Camera:Static|position=0,1.6,5|lookAt=0,1.0,0}


20
00:01:37,972 --> 00:01:46,804
[Rex] 只有一种方法...用纯净的能量冲击它们的核心。
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{Rex}{CrossArms}
{SFX:Play|name=energy_charge}
{FXPlasmaBolt|character=Rex}
{Camera:FightDramaticReveal|character=Rex|side=right|startDistance=6|endDistance=2.5|startHeight=0.4|endHeight=1.2}


21
00:01:47,304 --> 00:01:49,968
[Zorak] 怎么做？告诉我们！
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Zorak}{HandsUp}
{Camera:TwoShot|position=0,1.6,4|lookAt=0,1.0,0}


22
00:01:50,468 --> 00:01:58,988
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{Rex}{PointForward}
{Music:Play|name=battle_intense|fadeIn=1.0|baseVolume=0.35|endTime=40.0}
[Rex] 把你们的手放在我身上。我会引导你们的能量。
{FXChargeGlow|character=Rex}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}


23
00:01:59,488 --> 00:02:02,988
{Zorak}{Walk}
{Klaw}{Walk}
{Vex}{Walk}
{Event:Move|character=Zorak|x=-0.5|z=-0.5|duration=1.0}
{Event:Move|character=Klaw|x=0.5|z=-0.5|duration=1.0}
{Event:Move|character=Vex|x=0|z=-0.8|duration=1.0}
{SceneDirector:Formation|type=triangle|center=0,0,-0.5|radius=1|focus=Rex}
{SFX:Play|name=wind_gentle}
{Camera:FightWide|distance=5|height=2}


24
00:01:59,488 --> 00:02:01,360
[Zorak] 准备好了吗？
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Zorak}{Nod}
{Camera:Static|position=0,1.6,4|lookAt=0,1.0,0}


25
00:02:01,860 --> 00:02:05,676
[Klaw] 来吧！让我看看这些水晶有多厉害！
{Klaw}{FaceDetermined}
{Klaw}{FaceBlink}
{Klaw}{FightingStance}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.4}


26
00:02:06,176 --> 00:02:13,760
[Vex] 能量同步中...百分之七十...九十...百分之百！
{Vex}{FaceDetermined}
{Vex}{FaceBlink}
{Vex}{HandsOnHips}
{FXEnergyAura|character=Vex}
{Camera:CloseUp|target=Vex|distance=2.5|height=1.4}


27
00:02:14,260 --> 00:02:17,760
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{Rex}{FightingStance}
{SFX:Play|name=energy_blast}
{FXShockwave|character=Rex}
{FXCrystalShards|character=Rex}
{Camera:FightDramatic|target=Rex|distance=3|height=1.0}


28
00:02:18,260 --> 00:02:21,760
{Event:Move|character=Zorak|x=0|z=3|duration=0.5}
{Zorak}{Run}
{Event:Move|character=Klaw|x=0|z=3|duration=0.5}
{Klaw}{Run}
{Event:Move|character=Vex|x=0|z=3|duration=0.5}
{Vex}{Run}
{Event:Move|character=Rex|x=0|z=3|duration=0.5}
{Rex}{Run}
{SFX:Play|name=impact_thud}
{FXScreenShake|intensity=0.8|duration=1.0}
{Camera:FightWide|distance=10|height=3}


29
00:02:14,260 --> 00:02:17,548
[Klaw] 成功了！水晶停止发光了！
{Klaw}{FaceHappy}
{Klaw}{Celebrate}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.4}


30
00:02:18,048 --> 00:02:25,776
[Vex] 不对...它们不是在停止...它们是在...转变？
{Vex}{FaceConfused}
{Vex}{FaceBlink}
{Vex}{LookAround}
{FXBioluminescentPulse|character=Vex}
{Camera:Static|position=-2,1.5,4|lookAt=0,1.0,0}


31
00:02:26,276 --> 00:02:28,988
[Zorak] 它们在变成...蓝色？
{Zorak}{FaceSurprised}
{Zorak}{FaceBlink}
{Zorak}{LookAround}
{Rex}{FaceSurprised}
{Rex}{LookAround}
{SFX:Play|name=wind_gentle}
{Camera:TwoShot|position=0,1.6,4|lookAt=0,1.0,0}


32
00:02:29,488 --> 00:02:40,048
[Rex] 纯净的能量...净化了它们。这些水晶曾经被黑暗力量腐蚀了。
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{Rex}{HandsOnHips}
{FXCrystalShards|character=Rex}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}


33
00:02:40,548 --> 00:02:45,396
[Zorak] 黑暗力量？这颗星球上还有别的威胁吗？
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Zorak}{CrossArms}
{Camera:Static|position=0,1.6,5|lookAt=0,1.0,0}


34
00:02:45,896 --> 00:02:52,784
[Rex] ...有。而且它比你们想象的更强大。但那是另一个故事了。
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Rex}{CrossArms}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}


35
00:02:53,284 --> 00:02:55,804
[Klaw] 嘿！别吊胃口啊！
{Klaw}{FaceConfused}
{Klaw}{ScratchHead}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.4}


36
00:02:56,304 --> 00:03:00,576
[Vex] 至少我们现在知道，团队合作可以创造奇迹。
{Vex}{FaceHappy}
{Vex}{FaceBlink}
{Vex}{WaveHand}
{Camera:Static|position=-2,1.5,4|lookAt=0,1.0,0}


37
00:03:01,076 --> 00:03:05,372
[Zorak] 说得对。Rex，谢谢你信任我们。
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Zorak}{ReachOut}
{Camera:TwoShot|position=0,1.6,4|lookAt=0,1.0,0}


38
00:03:05,872 --> 00:03:11,056
[Rex] 别客气。你们...比我想象的外星人要好得多。
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{Rex}{WaveHand}
{Camera:Static|position=0,1.6,6|lookAt=0,1.0,0}


39
00:03:11,556 --> 00:03:15,556
{Music:Play|name=resolution|fadeIn=2.0|baseVolume=0.3|endTime=60.0}
{Zorak}{Walk}
{Klaw}{Walk}
{Vex}{Walk}
{Rex}{Walk}
{Event:Move|character=Zorak|x=-3|z=2|duration=2.5}
{Event:Move|character=Klaw|x=3|z=2|duration=2.5}
{Event:Move|character=Vex|x=0|z=3|duration=2.5}
{Event:Move|character=Rex|x=0|z=1|duration=2.5}
{Transition:Fade|duration=2.0}
{Camera:Pan|from=-5,2,8|to=5,2,8|duration=3.0}


40
00:03:11,556 --> 00:03:14,364
[Zorak] 那么，接下来去哪里？
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Zorak}{PointForward}
{Camera:Static|position=0,2,8|lookAt=0,1.0,0}


41
00:03:14,864 --> 00:03:19,712
[Rex] 跟我来。我带你们去看这颗星球最美的日落。
{Rex}{Run}
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:FightFollow|target=Rex|distance=5|height=1.5}


42
00:03:20,212 --> 00:03:24,212
{Zorak}{Run}
{Klaw}{Run}
{Vex}{Run}
{Zorak}{FaceBlink}
{Klaw}{FaceBlink}
{Vex}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:Pan|from=0,3,10|to=0,5,15|duration=3.0}


43
00:03:24,712 --> 00:03:27,712
{Transition:Fade|duration=2.0}
{Camera:Static|position=0,5,20|lookAt=0,0,0}


44
00:03:28,212 --> 00:03:31,212
{FXCrystalShards|character=Rex}
{FXBioluminescentPulse|character=Vex}
{FXEnergyAura|character=Zorak}
{Camera:Static|position=0,5,20|lookAt=0,0,0}


