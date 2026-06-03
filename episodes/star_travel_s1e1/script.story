1
00:00:00,000 --> 00:00:03,500
@SpaceStationScene
{Music:Play|name=space_ambient|fadeIn=2.0|baseVolume=0.3|endTime=30.0}
{Position:Zorak|x=-1.2|y=0.01|z=0.5|face=right}
{Position:Klaw|x=1.8|y=0.01|z=-0.3|face=left}
{Position:Vex|x=0.3|y=0.01|z=1.5|face=back}
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Zorak}{Nod}
[Zorak] 信号确认。坐标X-7749，未知星系边缘。
{Camera:Static|position=0,1.8,5|lookAt=0,1.0,0}

2
00:00:03,800 --> 00:00:06,800
[Klaw] 扫描显示...有生命反应。
{Klaw}{FaceSurprised}
{Klaw}{FaceBlink}
{Klaw}{LookAround}
{Camera:TwoShot|position=0,1.6,4|lookAt=0,1.0,0}

3
00:00:07,100 --> 00:00:10,100
[Vex] 能量读数很奇怪。不像任何已知文明。
{Vex}{FaceConfused}
{Vex}{FaceBlink}
{Vex}{Shrug}
{Camera:Static|position=2,1.5,3|lookAt=0,1.0,0}

4
00:00:10,400 --> 00:00:13,400
[Zorak] 准备登陆。我们是探险队，不是征服者。
{Zorak}{PointForward}
{Zorak}{FaceDetermined}
{Camera:CloseUp|target=Zorak|distance=2.5|height=1.6}

5
00:00:13,700 --> 00:00:16,200
[Klaw] 如果那些家伙不友好呢？
{Klaw}{CrossArms}
{Klaw}{FaceConfused}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.5}

6
00:00:16,500 --> 00:00:19,000
[Vex] 那我们就跑。我的翅膀可不是摆设。
{Vex}{Shrug}
{Vex}{FaceSmirk}
{Vex}{FaceBlink}
{Camera:Static|position=-2,1.5,3|lookAt=0,1.0,0}

7
00:00:19,300 --> 00:00:23,000
{Zorak}{Walk}
{Klaw}{Walk}
{Vex}{Walk}
{Event:Move|character=Zorak|x=-8|z=0|duration=3.0}
{Event:Move|character=Klaw|x=8|z=0|duration=3.0}
{Event:Move|character=Vex|x=0|z=-5|duration=3.0}
{Transition:Fade|duration=1.0}
{Camera:Pan|from=-5,2,8|to=5,2,8|duration=3.0}

8
00:00:23,300 --> 00:00:26,300
@AlienPlanetScene
{Music:Play|name=alien_world|fadeIn=1.5|baseVolume=0.25|endTime=90.0}
{Position:Zorak|x=-1.8|y=0.01|z=0.8|face=right}
{Position:Klaw|x=2.2|y=0.01|z=-0.5|face=left}
{Position:Vex|x=0.5|y=0.01|z=1.8|face=back}
{Zorak} 空气可呼吸。重力0.92标准值。
{Zorak}{FaceBlink}
{Camera:Static|position=0,1.8,6|lookAt=0,1.0,0}

9
00:00:26,600 --> 00:00:29,600
[Klaw] 这些植物...在发光？
{Klaw}{LookAround}
{Klaw}{FaceSurprised}
{Klaw}{FaceBlink}
{Camera:LowAngle|target=Klaw|distance=4|height=0.5}

10
00:00:29,900 --> 00:00:32,900
[Vex] 生物荧光。和泽拉克深海生物类似。
{Vex}{HandsOnHips}
{Vex}{FaceHappy}
{Vex}{FaceBlink}
{Camera:Static|position=-3,1.5,4|lookAt=0,1.0,0}

11
00:00:33,200 --> 00:00:36,200
[Zorak] 等等。有动静。
{Zorak}{FightingStance}
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Position:Rex|x=0.5|y=0.01|z=-4|face=forward}
{Rex}{Crouch|depth=0.55|lean=0.2|arms=none|duration=9.5}
{Camera:FightDramatic|target=Zorak|distance=4|height=1.2}

12
00:00:36,500 --> 00:00:39,500
{Event:Move|character=Zorak|x=-1|z=0|duration=0.8}
{Zorak}{Run}
{Event:Move|character=Klaw|x=1|z=0|duration=0.8}
{Klaw}{Run}
{Event:Move|character=Vex|x=0|z=-1|duration=0.8}
{Vex}{Run}
{SFX:Play|name=dash_whoosh}
{Camera:FightWide|distance=6|height=2}

13
00:00:39,800 --> 00:00:42,800
[Zorak] 从岩石后面出来！我们知道你在那儿！
{Zorak}{PointForward}
{Zorak}{FaceAngry}
{Zorak}{FaceBlink}
{Camera:Static|position=0,1.6,5|lookAt=0,1.0,0}

14
00:00:43,100 --> 00:00:46,600
[Rex] ...你们是谁？
{Rex}{CrossArms}
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Camera:FightDramaticReveal|target=Rex|distance=5|height=1.0}

15
00:00:46,900 --> 00:00:49,900
[Klaw] 是晶体生物！这里居然有晶体生物！
{Klaw}{SurprisedJump}
{Klaw}{FaceSurprised}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.5}

16
00:00:50,200 --> 00:00:53,700
[Rex] 我叫Rex。你们这些外星人，来我的星球干嘛？
{Rex}{HandsOnHips}
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{Camera:Static|position=3,1.6,4|lookAt=0,1.0,0}

17
00:00:54,000 --> 00:00:57,000
[Zorak] 我们是星际探险队。我叫泽拉克，这是克劳和维克斯。
{Zorak}{Bow}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Camera:TwoShot|position=0,1.6,4|lookAt=0,1.0,0}

18
00:00:57,300 --> 00:00:60,000
[Vex] 我们没有敌意。只是在探索未知星系。
{Vex}{WaveHand}
{Vex}{FaceHappy}
{Vex}{FaceBlink}
{Camera:Static|position=-2,1.5,4|lookAt=0,1.0,0}

19
00:01:00,300 --> 00:01:03,800
[Rex] 探索？哼。你们最好小心点。这颗星球可不止有植物。
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Rex}{CrossArms}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}

20
00:01:04,100 --> 00:01:06,600
[Klaw] 什么意思？有什么危险的？
{Klaw}{ScratchHead}
{Klaw}{FaceConfused}
{Klaw}{FaceBlink}
{Camera:Static|position=2,1.5,4|lookAt=0,1.0,0}

21
00:01:06,900 --> 00:01:10,400
[Rex] 意思是...最危险的，是看起来最普通的。
{Rex}{PointForward}
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{Camera:FightDramatic|target=Rex|distance=4|height=1.2}

22
00:01:10,700 --> 00:01:13,700
{Zorak}{FightingStance}
{Klaw}{FightingStance}
{Vex}{FightingStance}
[Zorak] 你在威胁我们？
{Zorak}{FaceAngry}
{Zorak}{FaceBlink}
{Camera:FightWide|distance=7|height=2}

23
00:01:14,000 --> 00:01:17,000
[Rex] 不。我在警告你们。
{Rex}{FightingStance}
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{SFX:Play|name=energy_charge}
{FXPlasmaBolt|character=Rex}
{FXCrystalShards|character=Rex}
{Camera:FightDramatic|target=Rex|distance=3|height=1.0}

24
00:01:17,300 --> 00:01:20,300
[Vex] 他的能量读数...在飙升！
{Vex}{FaceSurprised}
{Vex}{FaceBlink}
{Vex}{Shrug}
{FXBioluminescentPulse|character=Vex}
{Camera:ReactionShot|target=Vex|distance=2.5|height=1.4}

25
00:01:20,600 --> 00:01:23,600
[Zorak] 等等！我们没有要战斗的意思！
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Zorak}{HandsUp}
{Camera:Static|position=0,1.6,5|lookAt=0,1.0,0}

26
00:01:23,900 --> 00:01:26,900
[Rex] ...那就证明给我看。
{Rex}{DashForward}
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:FightFollow|target=Rex|distance=4|height=1.2}

27
00:01:27,200 --> 00:01:29,700
{Zorak}{Dodge}
{Zorak}{FaceBlink}
{SFX:Play|name=whoosh_fast}
{Camera:FightImpact|distance=3|height=1.0}

28
00:01:30,000 --> 00:01:32,500
[Rex] 反应不错，紫晶。
{Rex}{LeftPunch}
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{SFX:Play|name=punch_light}
{Camera:FightSide|distance=4|height=1.2}

29
00:01:32,800 --> 00:01:35,300
{Zorak}{Block}
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{SFX:Play|name=block_guard}
{Camera:FightImpact|distance=2.5|height=1.0}

30
00:01:35,600 --> 00:01:38,100
[Klaw] 嘿！二打一不公平！
{Klaw}{Run}
{Klaw}{FaceAngry}
{Klaw}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:FightWide|distance=6|height=2}

31
00:01:38,400 --> 00:01:40,900
{Klaw}{LeftPunch}
{Rex}{Dodge}
{Rex}{FaceBlink}
{SFX:Play|name=whoosh_fast}
{Camera:FightFollow|target=Rex|distance=4|height=1.2}

32
00:01:41,200 --> 00:01:43,700
[Rex] 哈！鳞甲也来凑热闹？
{Rex}{RightPunch}
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{SFX:Play|name=punch_hit}
{Camera:FightImpact|distance=2.5|height=1.0}

33
00:01:44,000 --> 00:01:46,500
{Klaw}{HitStagger}
{Klaw}{FacePain}
{Klaw}{FaceBlink}
{SFX:Play|name=impact_thud}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.5}

34
00:01:46,800 --> 00:01:49,800
[Vex] 够了！我们不是来打架的！
{Vex}{DashForward}
{Vex}{FaceAngry}
{Vex}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:Static|position=0,1.6,6|lookAt=0,1.0,0}

35
00:01:50,100 --> 00:01:52,600
{Vex}{Block}
{Rex}{Kick}
{Rex}{FaceBlink}
{SFX:Play|name=kick_impact}
{Vex}{HitStagger}
{Vex}{FacePain}
{Camera:FightImpact|distance=2.5|height=1.0}

36
00:01:52,900 --> 00:01:55,900
[Rex] 三个人一起上？有意思。
{Rex}{FightingStance}
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{SFX:Play|name=energy_charge}
{Camera:FightDramatic|target=Rex|distance=3|height=1.0}

37
00:01:56,200 --> 00:01:59,200
{Zorak}{FightingStance}
{Klaw}{FightingStance}
{Vex}{FightingStance}
[Zorak] 停手！我们真的不想战斗！
{Zorak}{FaceDetermined}
{Zorak}{FaceBlink}
{Camera:FightWide|distance=8|height=2.5}

38
00:01:59,500 --> 00:02:02,500
{Zorak}{Walk}
{Event:Move|character=Zorak|x=0|z=0|duration=1.5}
[Zorak] 看，我放下手。我们是和平的。
{Zorak}{CrossArms}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Camera:Static|position=0,1.6,5|lookAt=0,1.0,0}

39
00:02:02,800 --> 00:02:05,800
[Rex] ...哼。
{Rex}{FaceSmirk}
{Rex}{CrossArms}
{Rex}{FaceBlink}
{SFX:Play|name=wind_gentle}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}

40
00:02:06,100 --> 00:02:09,100
[Rex] 你们三个...挺有意思的。好吧，我暂时相信你们。
{Rex}{Nod}
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Camera:TwoShot|position=0,1.6,5|lookAt=0,1.0,0}

41
00:02:09,400 --> 00:02:12,400
[Klaw] 所以...不打了吗？
{Klaw}{ScratchHead}
{Klaw}{FaceConfused}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.4}

42
00:02:12,700 --> 00:02:15,700
[Rex] 暂时。但如果你们敢伤害这颗星球...
{Rex}{PointForward}
{Rex}{FaceDetermined}
{Rex}{FaceBlink}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}

43
00:02:16,000 --> 00:02:19,000
[Vex] 我们发誓！我们只是探险家！
{Vex}{WaveHand}
{Vex}{FaceHappy}
{Vex}{FaceBlink}
{Camera:Static|position=-2,1.5,5|lookAt=0,1.0,0}

44
00:02:19,300 --> 00:02:22,300
[Zorak] 也许...我们可以互相帮助。你熟悉这里，我们有飞船和技术。
{Zorak}{ReachOut}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Camera:TwoShot|position=0,1.6,5|lookAt=0,1.0,0}

45
00:02:22,600 --> 00:02:25,600
[Rex] 互相帮助？
{Rex}{Think}
{Rex}{FaceConfused}
{Rex}{FaceBlink}
{Camera:Static|position=3,1.6,4|lookAt=0,1.0,0}

46
00:02:25,900 --> 00:02:28,900
[Rex] ...好吧。但有一个条件。
{Rex}{HandsOnHips}
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Camera:CloseUp|target=Rex|distance=2.5|height=1.5}

47
00:02:29,200 --> 00:02:32,200
[Zorak] 什么条件？
{Zorak}{Nod}
{Zorak}{FaceConfused}
{Zorak}{FaceBlink}
{Camera:Static|position=0,1.6,5|lookAt=0,1.0,0}

48
00:02:32,500 --> 00:02:35,500
[Rex] 教我开你们的飞船。
{Rex}{FaceSmirk}
{Rex}{FaceBlink}
{Rex}{LookAround}
{SFX:Play|name=wind_gentle}
{Camera:FightDramatic|target=Rex|distance=3|height=1.0}

49
00:02:35,800 --> 00:02:38,800
[Klaw] 什么？！让晶体生物开飞船？
{Klaw}{FaceSurprised}
{Klaw}{SurprisedJump}
{Klaw}{FaceBlink}
{Camera:ReactionShot|target=Klaw|distance=3|height=1.4}

50
00:02:39,100 --> 00:02:42,100
[Vex] 我觉得...挺有趣的。
{Vex}{FaceHappy}
{Vex}{FaceBlink}
{Vex}{Shrug}
{Camera:Static|position=-2,1.5,4|lookAt=0,1.0,0}

51
00:02:42,400 --> 00:02:45,400
[Zorak] ...成交。欢迎来到星际探险队，Rex。
{Zorak}{ReachOut}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Camera:TwoShot|position=0,1.6,5|lookAt=0,1.0,0}

52
00:02:45,700 --> 00:02:48,700
[Rex] 叫我Rex就行。星际探险队...听起来挺酷的。
{Rex}{WaveHand}
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{Camera:Static|position=0,1.6,6|lookAt=0,1.0,0}

53
00:02:49,000 --> 00:02:52,000
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

54
00:02:52,300 --> 00:02:55,300
[Zorak] 那么，Rex。带我们去看看你的星球吧。
{Zorak}{PointForward}
{Zorak}{FaceHappy}
{Zorak}{FaceBlink}
{Camera:Static|position=0,2,8|lookAt=0,1.0,0}

55
00:02:55,600 --> 00:02:58,600
[Rex] 跟紧了，外星人们。旅程才刚刚开始。
{Rex}{Run}
{Rex}{FaceHappy}
{Rex}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Camera:FightFollow|target=Rex|distance=5|height=1.5}

56
00:02:58,900 --> 00:03:01,900
{Zorak}{Run}
{Klaw}{Run}
{Vex}{Run}
{Zorak}{FaceBlink}
{Klaw}{FaceBlink}
{Vex}{FaceBlink}
{SFX:Play|name=dash_whoosh}
{Music:Play|name=space_ambient|fadeIn=1.0|baseVolume=0.2|endTime=45.0}
{Camera:Pan|from=0,3,10|to=0,5,15|duration=3.0}

57
00:03:02,200 --> 00:03:04,700
{Transition:Fade|duration=2.0}
{Camera:Static|position=0,5,20|lookAt=0,0,0}

58
00:03:05,000 --> 00:03:07,500
{FXCrystalShards|character=Rex}
{SFX:Play|name=energy_charge}
{Camera:Static|position=0,3,15|lookAt=0,1,0}
