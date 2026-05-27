1
00:00:00,000 --> 00:00:03,500
@SarayashikiRoofScene{Music:Play|name=roof_tension|fadeIn=2.0|baseVolume=0.15|endTime=150}
{Combat:Setup|charA=Yusuke|charB=Kuwabara|centerX=0|centerZ=0|distance=5}
{Position:Yokai|x=0|y=0.01|z=-10|face=Yusuke}
{Transition:Iris|duration=1.0}

2
00:00:03,500 --> 00:00:07,500
[Kuwabara]{CrossArms}{FaceDetermined}{Camera:Static|position=6,2.5,6|lookAt=2,1.2,0} 幽助！这次我一定要打败你！我的灵力已经提升很多了！

3
00:00:07,500 --> 00:00:11,500
[Yusuke]{Shrug}{FaceSmirk}{Camera:Static|position=-6,2.5,6|lookAt=-2,1.2,0} 又是你啊桑原。我说了多少次，我没空陪你打架。

4
00:00:11,500 --> 00:00:15,000
[Kuwabara]{PointForward}{FaceDetermined}{Camera:TwoShot|characterA=Yusuke|characterB=Kuwabara|distance=10} 少废话！看招！灵剑！

5
00:00:15,000 --> 00:00:19,000
[Kuwabara]{SpiritSwordDraw}{FaceDetermined}{FXChargeGlow}{Camera:LowAngle|distance=5|height=1.2} 哈！
{SFX:Play|name=energy_charge}

6
00:00:19,000 --> 00:00:22,500
{Combat:Combo|attacker=Kuwabara|defender=Yusuke|sequence=dash_punch}
[Kuwabara]{DashForward}{FaceAngry}{FXDustKick}{FXSpeedLines}{Camera:FightFollow} 接招！
{SFX:Play|name=dash_whoosh}

7
00:00:22,500 --> 00:00:26,000
{Combat:Combo|attacker=Yusuke|defender=Kuwabara|sequence=dodge_counter}
[Yusuke]{FaceReset}{Dodge}{FaceDetermined}{FXAfterImage}{Camera:FightFollow} 太慢了！
{SFX:Play|name=dash_whoosh}

8
00:00:26,000 --> 00:00:29,500
{Combat:Combo|attacker=Yusuke|defender=Kuwabara|sequence=heavy_combo}
[Yusuke]{FaceReset}{Punch}{FaceAngry}{FXHitSpark}{FXSpeedLines}{Camera:FightImpact} 吃我一拳！
{SFX:Play|name=punch_hit}

9
00:00:29,500 --> 00:00:33,000
{Combat:Combo|attacker=Kuwabara|defender=Yusuke|sequence=block_counter}
[Kuwabara]{FaceReset}{Block}{FaceAngry}{FXHitSpark}{Camera:FightSide} 还没完！
{SFX:Play|name=impact_thud}

10
00:00:33,000 --> 00:00:37,000
[Kuwabara]{FaceDetermined}{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 让你见识一下我的灵剑斩击！

11
00:00:37,000 --> 00:00:41,500
{Combat:Combo|attacker=Kuwabara|defender=Yusuke|sequence=spirit_sword_combo}
[Kuwabara]{FaceReset}{SpiritSwordSwing}{FaceAngry}{FXTrailSwipe}{FXDustKick}{Camera:FightImpact} 灵剑斩！
{SFX:Play|name=sword_slash}

12
00:00:41,500 --> 00:00:45,000
{Combat:Combo|attacker=Yusuke|defender=Kuwabara|sequence=mobility_combo}
[Yusuke]{FaceReset}{Dodge}{FaceSmirk}{FXAfterImage}{Camera:FightFollow} 就这种程度？让你见识一下真正的力量。
{SFX:Play|name=dash_whoosh}

13
00:00:45,000 --> 00:00:49,000
{Combat:Emotion|type=closeUp|character=Yusuke|hold=1.5}
[Yusuke]{FaceReset}{SpiritGunCharge}{FaceDetermined}{FXChargeGlow}{FXEnergyAura} 灵丸...蓄力！
{SFX:Play|name=energy_charge}

14
00:00:49,000 --> 00:00:53,500
{Combat:BulletTime|start=0.2|duration=2.0|scale=0.12|easeIn=0.15|easeOut=0.25}
{Combat:Override|camera=FightBulletTimeTrack|duration=2.0|characterA=Yusuke|characterB=Kuwabara|radius=5|height=2.5}
{Combat:Combo|attacker=Yusuke|defender=Kuwabara|sequence=spirit_gun|noAutoCamera=true}
{Transition:Flash|duration=0.2|flashColor=0x88ccff}
[Yusuke]{FaceReset}{SpiritGunFire}{FaceAngry}{FXTrailSwipe} 发射！
{SFX:Play|name=energy_blast}

15
00:00:53,500 --> 00:00:57,500
[Kuwabara]{FaceReset}{HitStagger}{FacePain}{FXHitSpark}{FXScreenShake}{Camera:ReactionShot|characterName=Kuwabara|distance=3} 什么！？这种威力...太夸张了吧！
{SFX:Play|name=impact_thud}
{Hitstop|duration=0.15|shake=0.4}

16
00:00:57,500 --> 00:01:01,000
[Yusuke]{FaceReset}{FaceSmirk}{Camera:Static|position=-4,2.5,5|lookAt=-1,1.2,0} 怎么样，认输了吧？

17
00:01:01,000 --> 00:01:05,000
[Kuwabara]{FaceReset}{Block}{FaceAngry}{FXHitSpark}{Camera:Static|position=4,2.5,5|lookAt=2,1.2,0} 还没完！我桑原和真是不会放弃的！

18
00:01:05,000 --> 00:01:09,500
{Event:SetWeather|type=fog}
{Event:Move|character=Yokai|x=0|y=0.01|z=-2.5|duration=2.0|action=Walk}
[Yokai]{Tremble}{Camera:LowAngle|distance=8|height=0.5} 嘎...嘎...
{SFX:Play|name=monster_growl}

19
00:01:09,500 --> 00:01:13,500
[Yusuke]{FaceReset}{LookAround}{FaceSurprised}{Camera:Static|position=0,3,8|lookAt=0,1.2,0} 等等...这气息...有妖怪！桑原，小心！

20
00:01:13,500 --> 00:01:17,500
[Kuwabara]{FaceReset}{SpiritSwordDraw}{FaceDetermined}{Camera:TwoShot|characterA=Yusuke|characterB=Kuwabara|distance=10} 幽助！我们联手吧！先解决这个妖怪！

21
00:01:17,500 --> 00:01:21,000
[Yusuke]{FaceReset}{Nod}{FaceDetermined}{Camera:BackToBack|characterA=Yusuke|characterB=Kuwabara} 哼...好吧，就这一次。别拖我后腿。

22
00:01:21,000 --> 00:01:24,500
[Yokai]{FaceReset}{FlailArms}{Camera:Shake|intensity=0.3|duration=0.8} 嘎啊啊啊！
{SFX:Play|name=monster_roar}

23
00:01:24,500 --> 00:01:28,500
{Combat:Staging|type=pincer|chars=Yusuke,Kuwabara|target=Yokai|duration=1.0|radius=4}
{Combat:Combo|attacker=Yusuke|defender=Yokai|sequence=dash_spinkick}
[Yusuke]{FaceReset}{DashForward}{FaceDetermined}{FXAfterImage}{Camera:FightFollow} 来吧桑原！让它见识一下我们的厉害！
{SFX:Play|name=dash_whoosh}

24
00:01:28,500 --> 00:01:32,500
{Combat:Combo|attacker=Kuwabara|defender=Yokai|sequence=spirit_sword_combo}
[Kuwabara]{FaceReset}{SpiritSwordSwing}{FaceAngry}{FXTrailSwipe}{FXDustKick}{Camera:FightImpact} 正合我意！上吧，幽助！灵剑斩击！
{SFX:Play|name=sword_slash}

25
00:01:32,500 --> 00:01:36,500
{Combat:Combo|attacker=Yokai|defender=Kuwabara|sequence=classic_4hit}
[Yokai]{FaceReset}{Punch}{HitStagger}{FaceAngry}{FXHitSpark}{Camera:FightSide} 嘎！
{SFX:Play|name=punch_hit}

26
00:01:36,500 --> 00:01:39,000
{Combat:Emotion|type=closeUp|character=Kuwabara|hold=1.0}
[Kuwabara]{FaceReset}{HitStagger}{FacePain}{FXBloodSpurt}{FXShockwave}{Camera:FightDramatic} 呜...可恶...
{SFX:Play|name=kick_impact}
{Hitstop|duration=0.12|shake=0.35}

27
00:01:39,000 --> 00:01:43,000
[Yusuke]{FaceReset}{FaceAngry}{Camera:Static|position=-2,2.5,4|lookAt=0,1.2,0} 桑原！你这家伙...竟敢伤我兄弟！

28
00:01:44,000 --> 00:01:48,500
{Combat:Override|camera=FightOverhead|duration=2.5}
{Combat:Combo|attacker=Yusuke|defender=Yokai|sequence=triple_kick}
[Yusuke]{FaceReset}{Kick}{FaceAngry}{FXHitSpark}{Camera:FightImpact} 吃我这套！
{SFX:Play|name=kick_impact}

29
00:01:48,500 --> 00:01:53,000
{Combat:BulletTime|start=0|duration=1.5|scale=0.15|easeIn=0.1|easeOut=0.4}
{Combat:Emotion|type=reveal|character=Yusuke|hold=1.5}
{Combat:Combo|attacker=Yusuke|defender=Yokai|sequence=uppercut_jump|noAutoCamera=true}
[Yokai]{FaceReset}{Knockdown}{FacePain}{FXHitSpark}{FXShockwave}{FXScreenShake} 嘎啊啊啊！！
{SFX:Play|name=impact_thud}
{Hitstop|duration=0.18|shake=0.5}

30
00:01:53,000 --> 00:01:57,500
{Combat:Override|camera=FightDramaticReveal|duration=2.0}
{Event:Move|character=Yokai|x=0|y=0.01|z=-6|duration=1.0|action=RunAway}
{Transition:Flash|duration=0.5|flashColor=0x6600ff}
[Yusuke]{FaceReset}{HeroLanding}{FaceDetermined}{FXDustKick} ...结束了。
{Event:Animate|character=Yokai|action=GetUp}
{SFX:Play|name=impact_thud}

31
00:01:57,500 --> 00:02:01,500
[Kuwabara]{FaceReset}{GetUp}{FaceHappy}{Camera:Static|position=0,2.5,8|lookAt=0,1.2,0} 成功了！我们配合得不错嘛，幽助！

32
00:02:01,500 --> 00:02:05,500
[Yusuke]{FaceReset}{CrossArms}{FaceSmirk}{Camera:TwoShot|characterA=Yusuke|characterB=Kuwabara|distance=8} 哼...别得意忘形了。下次可不会帮你了。

33
00:02:05,500 --> 00:02:10,000
[Kuwabara]{FaceReset}{WaveHand}{FaceHappy}{Camera:Static|position=4,2.5,6|lookAt=3,1.2,0} 哈哈哈！你就是嘴硬！下次我们再比试比试！
