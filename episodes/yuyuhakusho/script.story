1
00:00:00,000 --> 00:00:03,000
@SarayashikiRoofScene{Music:Play|name=roof_tension|fadeIn=2.0|baseVolume=0.15|endTime=120}
{Position:Yusuke|x=-3.0|y=0.01|z=0|face=Kuwabara}
{Position:Kuwabara|x=3.0|y=0.01|z=0|face=Yusuke}
{Transition:Iris|duration=1.0}

2
00:00:04,000 --> 00:00:08,000
[Kuwabara]{CrossArms}{FaceDetermined}{Camera:Static|position=4,2.5,6|lookAt=3,1.2,0} 幽助！这次我一定要打败你！我的灵力已经提升很多了！

3
00:00:09,000 --> 00:00:13,000
[Yusuke]{Shrug}{FaceSmirk}{Camera:Static|position=-4,2.5,6|lookAt=-3,1.2,0} 又是你啊桑原。我说了多少次，我没空陪你打架。

4
00:00:14,000 --> 00:00:17,000
[Kuwabara]{PointForward}{FaceAngry}{Camera:TwoShot|characterA=Yusuke|characterB=Kuwabara|distance=10} 少废话！看招！灵剑！

5
00:00:17,000 --> 00:00:21,000
[Kuwabara]{SpiritSwordDraw}{FaceDetermined}{FXChargeGlow}{Camera:LowAngle|distance=5|height=1.2} 哈！

6
00:00:21,000 --> 00:00:24,500
{Event:Move|character=Kuwabara|x=1.5|y=0.01|z=0|duration=0.4|action=DashForward}
[Kuwabara]{DashForward}{FaceAngry}{FXDustKick}{FXSpeedLines}{Camera:Static|position=2,2,4|lookAt=0,1.2,0} 接招！
{SFX:Play|name=dash_whoosh}

7
00:00:24,000 --> 00:00:28,000
[Yusuke]{FaceReset}{Dodge}{FaceDetermined}{FXAfterImage}{Camera:Static|position=-2,2,4|lookAt=0,1.2,0} 太慢了！
{SFX:Play|name=dash_whoosh}

8
00:00:28,000 --> 00:00:31,500
{Event:Move|character=Yusuke|x=-1.0|y=0.01|z=0|duration=0.3|action=DashForward}
[Yusuke]{FaceReset}{Punch}{FaceAngry}{FXSpeedLines}{Camera:Static|position=-1,2,4|lookAt=0,1.2,0} 吃我一拳！
{SFX:Play|name=punch_hit}

9
00:00:31,000 --> 00:00:34,500
[Kuwabara]{FaceReset}{Block}{FaceAngry}{FXHitSpark}{Camera:Static|position=2,2,4|lookAt=1,1.2,0} 还没完！
{SFX:Play|name=impact_thud}
{Hitstop|duration=0.08|shake=0.2}

10
00:00:34,500 --> 00:00:38,000
[Kuwabara]{FaceDetermined}{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 让你见识一下我的灵剑斩击！

11
00:00:38,000 --> 00:00:42,000
{Event:Move|character=Kuwabara|x=0.5|y=0.01|z=0|duration=0.3|action=DashForward}
[Kuwabara]{FaceReset}{SpiritSwordSwing}{FaceAngry}{FXTrailSwipe}{FXDustKick}{Camera:Static|position=3,2,4|lookAt=0,1.2,0} 灵剑斩！
{SFX:Play|name=sword_slash}

12
00:00:41,500 --> 00:00:45,500
[Yusuke]{FaceReset}{Dodge}{FaceSmirk}{FXAfterImage}{Camera:Static|position=-2,2,4|lookAt=0,1.2,0} 就这种程度？让你见识一下真正的力量。
{SFX:Play|name=dash_whoosh}

13
00:00:45,500 --> 00:00:49,500
[Yusuke]{FaceReset}{SpiritGunCharge}{FaceDetermined}{FXChargeGlow}{Camera:SpiritGunCloseUp|characterName=Yusuke} 灵丸...蓄力！

14
00:00:49,500 --> 00:00:53,000
{Transition:Flash|duration=0.2|flashColor=0x88ccff}
[Yusuke]{FaceReset}{SpiritGunFire}{FaceAngry}{FXTrailSwipe}{Camera:Static|position=-4,2,4|lookAt=0,1.2,0} 发射！
{SFX:Play|name=energy_blast}

15
00:00:52,500 --> 00:00:56,500
[Kuwabara]{FaceReset}{HitStagger}{FacePain}{FXHitSpark}{FXScreenShake}{Camera:ReactionShot|characterName=Kuwabara|distance=3} 什么！？这种威力...太夸张了吧！
{SFX:Play|name=impact_thud}
{Hitstop|duration=0.12|shake=0.35}

16
00:00:56,500 --> 00:01:00,000
[Yusuke]{FaceReset}{FaceSmirk}{Camera:Static|position=-3,2.5,5|lookAt=-1,1.2,0} 怎么样，认输了吧？

17
00:01:00,000 --> 00:01:04,000
[Kuwabara]{FaceReset}{Block}{FaceAngry}{Camera:Static|position=2,2.5,5|lookAt=2,1.2,0} 还没完！我桑原和真是不会放弃的！

18
00:01:04,000 --> 00:01:08,500
{Event:SetWeather|type=fog}
{Position:Yokai|x=0|y=0.01|z=-6|face=Yusuke}
{Event:Move|character=Yokai|x=0|y=0.01|z=-3|duration=2.0|action=Walk}
[Yokai]{Tremble}{Camera:LowAngle|distance=8|height=0.5} 嘎...嘎...

19
00:01:08,500 --> 00:01:12,500
[Yusuke]{FaceReset}{LookAround}{FaceSurprised}{Camera:Static|position=0,3,8|lookAt=0,1.2,0} 等等...这气息...有妖怪！桑原，小心！

20
00:01:12,500 --> 00:01:16,500
[Kuwabara]{FaceReset}{SpiritSwordDraw}{FaceDetermined}{Camera:TwoShot|characterA=Yusuke|characterB=Kuwabara|distance=10} 幽助！我们联手吧！先解决这个妖怪！

21
00:01:16,500 --> 00:01:20,000
[Yusuke]{FaceReset}{Nod}{FaceDetermined}{Camera:BackToBack|characterA=Yusuke|characterB=Kuwabara} 哼...好吧，就这一次。别拖我后腿。

22
00:01:20,000 --> 00:01:23,500
{Event:Move|character=Yokai|x=0|y=0.01|z=-1|duration=0.8|action=DashForward}
[Yokai]{FaceReset}{FlailArms}{Camera:Shake|intensity=0.3|duration=0.8} 嘎啊啊啊！
{SFX:Play|name=dash_whoosh}

23
00:01:23,500 --> 00:01:27,000
[Yusuke]{FaceReset}{Dodge}{FaceDetermined}{FXAfterImage}{Camera:LowAngle|distance=6|height=1} 来吧桑原！让它见识一下我们的厉害！
{SFX:Play|name=dash_whoosh}

24
00:01:27,000 --> 00:01:30,500
[Kuwabara]{FaceReset}{Dodge}{FaceAngry}{FXAfterImage}{Camera:BackToBack|characterA=Yusuke|characterB=Kuwabara} 正合我意！上吧，幽助！灵剑斩击！
{SFX:Play|name=dash_whoosh}

25
00:01:30,500 --> 00:01:34,500
{Event:Move|character=Kuwabara|x=0|y=0.01|z=-1|duration=0.4|action=DashForward}
[Kuwabara]{FaceReset}{JumpAttack}{SpiritSwordSwing}{FaceAngry}{FXTrailSwipe}{FXDustKick}{Camera:Static|position=3,2,4|lookAt=0,1.2,0} 灵剑跳斩！
{SFX:Play|name=sword_slash}
{SFX:Play|name=dash_whoosh|offset=0.2}

26
00:01:34,000 --> 00:01:38,000
[Yokai]{FaceReset}{HitStagger}{FacePain}{FXHitSpark}{FXBloodSpurt}{Camera:Shake|intensity=0.4|duration=0.6} 嘎啊！
{SFX:Play|name=kick_impact}
{Hitstop|duration=0.10|shake=0.3}

27
00:01:38,000 --> 00:01:42,000
{Event:Move|character=Yusuke|x=-0.5|y=0.01|z=0|duration=0.3|action=DashForward}
[Yusuke]{FaceReset}{ComboPunch}{FaceAngry}{FXTrailSwipe}{FXSpeedLines}{Camera:Static|position=-4,2,5|lookAt=0,1.2,0} 吃我这套！
{SFX:Play|name=punch_hit}

28
00:01:41,500 --> 00:01:45,500
[Yokai]{FaceReset}{Knockdown}{FacePain}{FXHitSpark}{FXShockwave}{FXScreenShake}{Camera:Shake|intensity=0.5|duration=1.0} 嘎啊啊啊！！
{SFX:Play|name=impact_thud}
{Hitstop|duration=0.15|shake=0.4}

29
00:01:45,500 --> 00:01:49,500
{Event:Move|character=Yokai|x=0|y=0.01|z=-6|duration=0.8|action=RunAway}
{Transition:Flash|duration=1.0|flashColor=0xffffff}
[Kuwabara]{FaceReset}{Celebrate}{FaceHappy}{Camera:Static|position=0,2.5,8|lookAt=0,1.2,0} 成功了！我们配合得不错嘛，幽助！

30
00:01:49,500 --> 00:01:53,500
[Yusuke]{FaceReset}{CrossArms}{FaceSmirk}{Camera:TwoShot|characterA=Yusuke|characterB=Kuwabara|distance=8} 哼...别得意忘形了。下次可不会帮你了。

31
00:01:53,500 --> 00:01:58,000
[Kuwabara]{FaceReset}{WaveHand}{FaceHappy}{Camera:Static|position=3,2.5,6|lookAt=3,1.2,0} 哈哈哈！你就是嘴硬！下次我们再比试比试！
